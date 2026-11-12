import { NextRequest, NextResponse } from "next/server";
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getComments,
  createComment,
  deleteComment,
  toggleReaction,
  getFeed,
  createPoll,
  castVote,
} from "@/services/hrm/engage";
import { requireAuth, isErrorResponse } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const postId = searchParams.get("postId");
    const type = searchParams.get("type");
    const feedUserId = searchParams.get("feedUserId");

    if (type === "feed" && feedUserId) {
      const feed = await getFeed(tenantId, feedUserId);
      return NextResponse.json({ data: feed });
    }

    if (type === "comments" && postId) {
      const comments = await getComments(postId);
      return NextResponse.json({ data: comments });
    }

    if (id) {
      const post = await getPostById(id);
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({ data: post });
    }

    const posts = await getPosts(tenantId, {
      userId: userId || undefined,
    });

    return NextResponse.json({ data: posts });
  } catch (error: any) {
    console.error("GET /api/hrm/v2/engage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const tenantId = "default";

    const body = await request.json();
    const action = body.action;

    let result;

    if (action === "comment") {
      if (!body.postId || !body.content) {
        return NextResponse.json({ error: "postId and content are required" }, { status: 400 });
      }
      result = await createComment(tenantId, { ...body, userId: body.userId || auth.userId });
    } else if (action === "react") {
      if (!body.postId && !body.commentId) {
        return NextResponse.json({ error: "postId or commentId is required" }, { status: 400 });
      }
      result = await toggleReaction(tenantId, { ...body, userId: body.userId || auth.userId });
    } else if (action === "poll") {
      if (!body.question || !Array.isArray(body.options) || body.options.length === 0) {
        return NextResponse.json({ error: "question and options are required" }, { status: 400 });
      }
      result = await createPoll(tenantId, body);
    } else if (action === "vote") {
      if (!body.pollId || !body.optionId) {
        return NextResponse.json({ error: "pollId and optionId are required" }, { status: 400 });
      }
      result = await castVote(tenantId, body.pollId, body.optionId, body.userId || auth.userId);
    } else {
      if (!body.content || typeof body.content !== "string" || !body.content.trim()) {
        return NextResponse.json({ error: "content is required" }, { status: 400 });
      }
      result = await createPost(tenantId, { ...body, userId: body.userId || body.authorId || auth.userId });
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error: any) {
    if (error instanceof SyntaxError || error?.message?.includes("JSON")) {
      return NextResponse.json({ error: "Invalid or empty JSON payload" }, { status: 400 });
    }
    console.error("POST /api/hrm/v2/engage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    const body = await request.json();
    const post = await updatePost(id, body);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error: any) {
    if (error instanceof SyntaxError || error?.message?.includes("JSON")) {
      return NextResponse.json({ error: "Invalid or empty JSON payload" }, { status: 400 });
    }
    console.error("PATCH /api/hrm/v2/engage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (isErrorResponse(auth)) return auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    let deleted;
    if (type === "comment") {
      deleted = await deleteComment(id);
    } else {
      deleted = await deletePost(id);
    }

    if (!deleted) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/hrm/v2/engage error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
