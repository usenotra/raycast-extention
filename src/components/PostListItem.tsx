import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { Post } from "../types";
import { CONTENT_TYPE_ICONS, CONTENT_TYPE_LABELS, NOTRA_APP_URL } from "../schemas";
import { PostDetail } from "./PostDetail";

export function PostListItem({ post, onPostMutated }: { post: Post; onPostMutated?: () => Promise<void> | void }) {
  const contentTypeIcon = CONTENT_TYPE_ICONS[post.contentType] ?? Icon.Document;
  const contentTypeLabel = CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType;

  return (
    <List.Item
      icon={contentTypeIcon}
      title={post.title.length > 60 ? `${post.title.slice(0, 60)}...` : post.title}
      keywords={[post.title]}
      accessories={[
        { text: contentTypeLabel },
        {
          tag: {
            value: post.status === "published" ? "Published" : "Draft",
            color: post.status === "published" ? Color.Green : Color.Orange,
          },
        },
        { date: new Date(post.createdAt), tooltip: `Created: ${new Date(post.createdAt).toLocaleString()}` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Eye}
            title="View Post"
            target={<PostDetail postId={post.id} onPostMutated={onPostMutated} />}
          />
          <Action.OpenInBrowser url={`${NOTRA_APP_URL}/content/${post.id}`} title="Open in Notra" />
          <Action.CopyToClipboard
            content={`${NOTRA_APP_URL}/content/${post.id}`}
            title="Copy Link"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
