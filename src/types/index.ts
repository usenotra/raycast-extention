/** Content type values matching the Notra API */
export type ContentTypeValue = "changelog" | "linkedin_post" | "twitter_post" | "blog_post";

/** Filter includes "all" option for the UI dropdown */
export type ContentTypeFilter = ContentTypeValue | "all";

/** Post status values */
export type PostStatus = "draft" | "published";

/** A post object as returned by the Notra API */
export interface Post {
  id: string;
  title: string;
  content: string;
  markdown: string;
  recommendations: string | null;
  contentType: string;
  sourceMetadata?: unknown;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
}

/** An organization object as returned by the Notra API */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

/** A post response with organization context */
export interface PostDetails {
  post: Post | null;
  organization: Organization;
}

/** Pagination info from the Notra API */
export interface Pagination {
  limit: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  totalPages: number;
  totalItems: number;
}
