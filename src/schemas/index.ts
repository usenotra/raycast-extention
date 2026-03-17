import { Icon } from "@raycast/api";
import type { ContentTypeFilter } from "../types";

export interface ContentTypeOption {
  title: string;
  value: ContentTypeFilter;
  icon: Icon;
}

export const CONTENT_TYPE_OPTIONS: ContentTypeOption[] = [
  { title: "All Types", value: "all", icon: Icon.BulletPoints },
  { title: "Blog Post", value: "blog_post", icon: Icon.Document },
  { title: "Changelog", value: "changelog", icon: Icon.Megaphone },
  { title: "Tweet", value: "twitter_post", icon: Icon.Bird },
  { title: "LinkedIn Post", value: "linkedin_post", icon: Icon.PersonLines },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  blog_post: "Blog Post",
  changelog: "Changelog",
  twitter_post: "Tweet",
  linkedin_post: "LinkedIn",
};

export const CONTENT_TYPE_ICONS: Record<string, Icon> = {
  blog_post: Icon.Document,
  changelog: Icon.Megaphone,
  twitter_post: Icon.Bird,
  linkedin_post: Icon.PersonLines,
};

export const NOTRA_APP_URL = "https://app.usenotra.com";
