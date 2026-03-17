import { Cache, getPreferenceValues } from "@raycast/api";
import type { Organization, Pagination, Post, PostDetails } from "../types";

export const NOTRA_API_URL = "https://api.usenotra.com";
const cache = new Cache({ namespace: "notra" });

type ApiPost = Omit<Post, "status"> & {
  status: string;
};

type ApiOrganization = Organization;

export interface ListPostsResponse {
  organization: ApiOrganization;
  posts: ApiPost[];
  pagination: Pagination;
}

export interface GetPostResponse {
  organization: ApiOrganization;
  post: ApiPost | null;
}

export interface UpdatePostRequest {
  title: string;
  markdown: string;
  status: Post["status"];
}

export interface DeletePostResponse {
  id: string;
  organization: ApiOrganization;
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

export function getNotraRequestInit(init?: RequestInit): RequestInit {
  const { apiKey } = getPreferenceValues<{ apiKey: string }>();
  const headers = normalizeHeaders(init?.headers);

  return {
    ...init,
    headers: {
      ...headers,
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

export function mapPost(post: ApiPost): Post {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    markdown: post.markdown,
    recommendations: post.recommendations,
    contentType: post.contentType,
    sourceMetadata: post.sourceMetadata,
    status: post.status === "published" ? "published" : "draft",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function mapPostDetails(response: GetPostResponse): PostDetails {
  return {
    organization: response.organization,
    post: response.post ? mapPost(response.post) : null,
  };
}

export function getPostCacheKey(postId: string): string {
  return `post:${postId}`;
}

export function getPostsCacheKey(contentType: string): string {
  return `posts:v2:${contentType}`;
}

export function getCachedValue<T>(key: string): T | undefined {
  const value = cache.get(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    cache.remove(key);
    return undefined;
  }
}

export function setCachedValue<T>(key: string, value: T): void {
  cache.set(key, JSON.stringify(value));
}

export function removeCachedValue(key: string): boolean {
  return cache.remove(key);
}

export function clearNotraCache(): void {
  cache.clear();
}

async function notraRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${NOTRA_API_URL}${path}`, getNotraRequestInit(init));

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const error = (await response.json()) as { error?: string };
      if (error.error) {
        message = error.error;
      }
    } catch {
      // Ignore JSON parsing failures and use the default message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function updatePost(postId: string, input: UpdatePostRequest): Promise<PostDetails> {
  const response = await notraRequest<GetPostResponse>(`/v1/posts/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const details = mapPostDetails(response);
  clearNotraCache();
  setCachedValue(getPostCacheKey(postId), details);
  return details;
}

export async function deletePost(postId: string): Promise<DeletePostResponse> {
  const response = await notraRequest<DeletePostResponse>(`/v1/posts/${postId}`, {
    method: "DELETE",
  });

  clearNotraCache();
  removeCachedValue(getPostCacheKey(postId));
  return response;
}
