import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updatePost } from "../lib/notra";
import { NOTRA_APP_URL } from "../schemas";
import type { Post } from "../types";

interface EditPostFormValues {
  title: string;
  markdown: string;
}

interface EditPostFormProps {
  post: Post;
  onPostUpdated?: () => Promise<void> | void;
}

export function EditPostForm({ post, onPostUpdated }: EditPostFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: EditPostFormValues) {
    const title = values.title.trim();
    const markdown = values.markdown.trim();

    if (!title || !markdown) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title and content are required",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving post",
    });

    setIsLoading(true);

    try {
      await updatePost(post.id, {
        title,
        markdown,
        status: post.status,
      });
      await onPostUpdated?.();
      toast.style = Toast.Style.Success;
      toast.title = "Post updated";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update post";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Edit Post"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          <Action.OpenInBrowser
            title="Open in Notra"
            url={`${NOTRA_APP_URL}/content/${post.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="title" defaultValue={post.title} placeholder="Title" />
      <Form.TextArea
        id="markdown"
        defaultValue={post.markdown}
        placeholder="Content"
      />
    </Form>
  );
}
