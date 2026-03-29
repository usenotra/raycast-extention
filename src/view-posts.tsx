import { List } from "@raycast/api";
import { useState } from "react";
import { ContentTypeDropdown } from "./components/ContentTypeDropdown";
import { PostListItem } from "./components/PostListItem";
import { usePosts } from "./hooks/usePosts";
import type { ContentTypeFilter } from "./types";

export default function Command() {
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const {
    data: posts,
    isLoading,
    pagination,
    revalidate,
  } = usePosts(contentType);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarAccessory={<ContentTypeDropdown onChange={setContentType} />}
      searchBarPlaceholder="Search posts..."
    >
      <List.EmptyView
        description="Try changing the content type filter."
        title="No Posts Found"
      />
      {posts?.map((post) => (
        <PostListItem key={post.id} onPostMutated={revalidate} post={post} />
      ))}
    </List>
  );
}
