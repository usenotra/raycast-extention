import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { EditPostForm } from "./EditPostForm";
import { usePost } from "../hooks/usePost";
import { deletePost, updatePost } from "../lib/notra";
import { CONTENT_TYPE_LABELS, NOTRA_APP_URL } from "../schemas";

export function PostDetail({ postId, onPostMutated }: { postId: string; onPostMutated?: () => Promise<void> | void }) {
  const { pop } = useNavigation();
  const { data, isLoading, revalidate } = usePost(postId);
  const post = data?.post;
  const organization = data?.organization;

  const markdown = post ? `# ${post.title}\n\n${post.markdown}` : "";

  async function refreshPostState() {
    await revalidate();
    await onPostMutated?.();
  }

  async function handleStatusChange() {
    if (!post) {
      return;
    }

    const nextStatus = post.status === "published" ? "draft" : "published";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: nextStatus === "published" ? "Publishing post" : "Moving post to draft",
    });

    try {
      await updatePost(post.id, {
        title: post.title,
        markdown: post.markdown,
        status: nextStatus,
      });
      await refreshPostState();
      toast.style = Toast.Style.Success;
      toast.title = nextStatus === "published" ? "Post published" : "Post moved to draft";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update post";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleDelete() {
    if (!post) {
      return;
    }

    const confirmed = await confirmAlert({
      title: "Delete post?",
      message: `This will permanently delete "${post.title}".`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting post",
    });

    try {
      await deletePost(post.id);
      await onPostMutated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Post deleted";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete post";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        post ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={post.status === "published" ? "Published" : "Draft"}
                color={post.status === "published" ? Color.Green : Color.Orange}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Organization" text={organization?.name ?? "-"} />
            <Detail.Metadata.Label title="Type" text={CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType} />
            <Detail.Metadata.Label title="Created" text={new Date(post.createdAt).toLocaleDateString()} />
            <Detail.Metadata.Label title="Updated" text={new Date(post.updatedAt).toLocaleDateString()} />
          </Detail.Metadata>
        ) : null
      }
      actions={
        post ? (
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Pencil}
                title="Edit Post"
                target={<EditPostForm post={post} onPostUpdated={refreshPostState} />}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                icon={post.status === "published" ? Icon.Pencil : Icon.Upload}
                title={post.status === "published" ? "Move to Draft" : "Publish Post"}
                onAction={handleStatusChange}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
              <Action
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                title="Delete Post"
                onAction={handleDelete}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action.OpenInBrowser
                url={
                  organization
                    ? `${NOTRA_APP_URL}/${organization.slug}/content/${post.id}`
                    : `${NOTRA_APP_URL}/content/${post.id}`
                }
                title="Open in Notra"
              />
              <Action
                icon={Icon.ArrowClockwise}
                title="Refresh"
                onAction={() => revalidate()}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action.CopyToClipboard
                content={post.markdown}
                title="Copy Markdown"
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                content={`${NOTRA_APP_URL}/content/${post.id}`}
                title="Copy Link"
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    />
  );
}
