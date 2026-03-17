import { List } from "@raycast/api";
import { useState } from "react";
import { ContentTypeDropdown } from "./components/ContentTypeDropdown";
import { PostListItem } from "./components/PostListItem";
import { usePosts } from "./hooks/usePosts";
import type { ContentTypeFilter } from "./types";

export default function Command() {
  const [contentType, setContentType] = useState<ContentTypeFilter>("all");
  const { data: posts, isLoading, pagination, revalidate } = usePosts(contentType);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search posts..."
      searchBarAccessory={<ContentTypeDropdown onChange={setContentType} />}
    >
      <List.EmptyView title="No Posts Found" description="Try changing the content type filter." />
      {posts?.map((post) => (
        <PostListItem key={post.id} post={post} onPostMutated={revalidate} />
      ))}
    </List>
  );
}
