"use client";

import { useCollection, useFirestoreQuery } from "./use-firestore-query";
import type { Post, Comment } from "@/types";

/**
 * Hook to fetch posts.
 */
export function usePosts(params?: Record<string, string>) {
  return useCollection<Post>("/api/hrm/v2/engage/posts", params);
}

/**
 * Hook to fetch comments for a post.
 */
export function useComments(postId: string | null) {
  return useCollection<Comment>(
    postId ? `/api/hrm/v2/engage/comments?postId=${postId}` : null
  );
}

/**
 * Hook to fetch the social feed.
 */
export function useFeed(params?: Record<string, string>) {
  return useCollection("/api/hrm/v2/engage/feed", params);
}
