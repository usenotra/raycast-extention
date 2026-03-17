import { List } from "@raycast/api";
import { CONTENT_TYPE_OPTIONS } from "../schemas";
import type { ContentTypeFilter } from "../types";

export function ContentTypeDropdown({ onChange }: { onChange: (value: ContentTypeFilter) => void }) {
  return (
    <List.Dropdown
      tooltip="Filter by Content Type"
      defaultValue="all"
      storeValue
      onChange={(value) => onChange(value as ContentTypeFilter)}
    >
      {CONTENT_TYPE_OPTIONS.map((option) => (
        <List.Dropdown.Item key={option.value} title={option.title} value={option.value} icon={option.icon} />
      ))}
    </List.Dropdown>
  );
}
