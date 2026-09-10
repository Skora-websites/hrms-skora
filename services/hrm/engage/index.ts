import "server-only";
import {
  postsService,
  commentsService,
  reactionsService,
  pollsService,
  pollVotesService,
} from "@/lib/hrm/firestore";
import type {
  Post,
  Comment,
  Reaction,
  Poll,
  PollVote,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Engage (Social Feed) Service
// ══════════════════════════════════════════════════════════════════

// ── Posts ──────────────────────────────────────────────

export async function getPosts(
  tenantId: string,
  options: {
    userId?: string;
    status?: Post["status"];
    limitCount?: number;
  } = {}
): Promise<Post[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];
  if (options.userId) where.push({ field: "userId", op: "==", value: options.userId });
  if (options.status) where.push({ field: "status", op: "==", value: options.status });

  return postsService.findManyInTenant(tenantId, {
    where,
    orderByField: "createdAt",
    orderByDirection: "desc",
    limitCount: options.limitCount || 50,
  });
}

export async function getPostById(id: string): Promise<Post | null> {
  return postsService.findById(id);
}

export async function createPost(
  tenantId: string,
  data: {
    userId: string;
    content: string;
    mediaURLs?: string[];
    tags?: string[];
  }
): Promise<Post> {
  return postsService.create({
    ...data,
    mediaURLs: data.mediaURLs || [],
    tags: data.tags || [],
    likes: 0,
    comments: 0,
    isPinned: false,
    status: "published",
    tenantId,
  } as any);
}

export async function updatePost(id: string, data: Partial<Post>): Promise<Post | null> {
  return postsService.update(id, data as any);
}

export async function deletePost(id: string): Promise<boolean> {
  // Delete associated comments and reactions
  const comments = await commentsService.findMany({
    where: [{ field: "postId", op: "==", value: id }],
  });
  for (const c of comments) {
    await commentsService.delete(c.id);
  }

  const reactions = await reactionsService.findMany({
    where: [{ field: "postId", op: "==", value: id }],
  });
  for (const r of reactions) {
    await reactionsService.delete(r.id);
  }

  return postsService.delete(id);
}

export async function togglePinPost(id: string, isPinned: boolean): Promise<Post | null> {
  return postsService.update(id, { isPinned } as any);
}

// ── Comments ───────────────────────────────────────────

export async function getComments(postId: string): Promise<Comment[]> {
  return commentsService.findMany({
    where: [{ field: "postId", op: "==", value: postId }],
    orderByField: "createdAt",
    orderByDirection: "asc",
  });
}

export async function createComment(
  tenantId: string,
  data: {
    postId: string;
    userId: string;
    content: string;
    parentCommentId?: string;
  }
): Promise<Comment> {
  const comment = await commentsService.create({
    ...data,
    likes: 0,
    tenantId,
  } as any);

  // Increment comment count on post
  const post = await postsService.findById(data.postId);
  if (post) {
    await postsService.update(data.postId, { comments: (post.comments || 0) + 1 } as any);
  }

  return comment;
}

export async function deleteComment(id: string): Promise<boolean> {
  const comment = await commentsService.findById(id);
  if (!comment) return false;

  // Decrement comment count on post
  const post = await postsService.findById(comment.postId);
  if (post) {
    await postsService.update(comment.postId, { comments: Math.max(0, (post.comments || 0) - 1) } as any);
  }

  return commentsService.delete(id);
}

// ── Reactions ──────────────────────────────────────────

export async function getReactions(targetId: string, type: "post" | "comment"): Promise<Reaction[]> {
  const field = type === "post" ? "postId" : "commentId";
  return reactionsService.findMany({
    where: [{ field, op: "==", value: targetId }],
  });
}

export async function toggleReaction(
  tenantId: string,
  data: {
    postId?: string;
    commentId?: string;
    userId: string;
    type: Reaction["type"];
  }
): Promise<{ liked: boolean }> {
  // Check if reaction exists
  const where: { field: string; op: "=="; value: unknown }[] = [
    { field: "userId", op: "==", value: data.userId },
  ];
  if (data.postId) where.push({ field: "postId", op: "==", value: data.postId });
  if (data.commentId) where.push({ field: "commentId", op: "==", value: data.commentId });

  const existing = await reactionsService.findMany({ where, limitCount: 1 });

  if (existing.length > 0) {
    // Remove reaction
    await reactionsService.delete(existing[0].id);

    if (data.postId) {
      const post = await postsService.findById(data.postId);
      if (post) {
        await postsService.update(data.postId, { likes: Math.max(0, (post.likes || 0) - 1) } as any);
      }
    }

    return { liked: false };
  }

  // Add reaction
  await reactionsService.create({
    ...data,
    tenantId,
  } as any);

  if (data.postId) {
    const post = await postsService.findById(data.postId);
    if (post) {
      await postsService.update(data.postId, { likes: (post.likes || 0) + 1 } as any);
    }
  }

  return { liked: true };
}

// ── Polls ──────────────────────────────────────────────

export async function getPoll(postId: string): Promise<Poll | null> {
  const polls = await pollsService.findMany({
    where: [{ field: "postId", op: "==", value: postId }],
    limitCount: 1,
  });
  return polls[0] || null;
}

export async function createPoll(
  tenantId: string,
  data: {
    postId: string;
    question: string;
    options: string[];
    expiresAt: Date;
    isMultipleChoice?: boolean;
  }
): Promise<Poll> {
  return pollsService.create({
    postId: data.postId,
    question: data.question,
    options: data.options.map((text, i) => ({
      id: `opt_${i}_${Date.now()}`,
      text,
      votes: 0,
    })),
    expiresAt: data.expiresAt,
    isMultipleChoice: data.isMultipleChoice || false,
    tenantId,
  } as any);
}

export async function castVote(
  tenantId: string,
  pollId: string,
  optionId: string,
  userId: string
): Promise<Poll> {
  const poll = await pollsService.findById(pollId);
  if (!poll) throw new Error("Poll not found");

  // Check if already voted
  const existingVotes = await pollVotesService.findMany({
    where: [
      { field: "pollId", op: "==", value: pollId },
      { field: "userId", op: "==", value: userId },
    ],
  });

  if (!poll.isMultipleChoice && existingVotes.length > 0) {
    throw new Error("Already voted");
  }

  if (existingVotes.some((v) => v.optionId === optionId)) {
    throw new Error("Already voted for this option");
  }

  // Record vote
  await pollVotesService.create({
    pollId,
    optionId,
    userId,
    tenantId,
  } as any);

  // Update poll option count
  const updatedOptions = poll.options.map((opt) => {
    if (opt.id === optionId) {
      return { ...opt, votes: opt.votes + 1 };
    }
    return opt;
  });

  await pollsService.update(pollId, { options: updatedOptions } as any);

  return (await pollsService.findById(pollId))!;
}

// ── Feed ───────────────────────────────────────────────

export interface FeedItem {
  post: Post;
  user: { id: string; displayName: string; photoURL?: string };
  topComments: Comment[];
  reactionCount: number;
  userReaction?: Reaction["type"];
  poll?: Poll;
}

export async function getFeed(tenantId: string, userId: string): Promise<FeedItem[]> {
  const posts = await getPosts(tenantId, { status: "published" });

  const feedItems: FeedItem[] = [];

  for (const post of posts) {
    const [comments, reactions, poll, user] = await Promise.all([
      getComments(post.id).then((c) => c.slice(0, 3)),
      getReactions(post.id, "post"),
      getPoll(post.id),
      (async () => ({ id: post.userId, displayName: "User", photoURL: undefined }))(),
    ]);

    const userReaction = reactions.find((r) => r.userId === userId);

    feedItems.push({
      post,
      user,
      topComments: comments,
      reactionCount: reactions.length,
      userReaction: userReaction?.type,
      poll: poll || undefined,
    });
  }

  return feedItems;
}
