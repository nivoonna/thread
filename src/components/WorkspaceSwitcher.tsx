import { ChevronDown } from "lucide-react";
export type Workspace = "investigate" | "builder";
export function WorkspaceSwitcher({
  value,
  onChange,
}: {
  value: Workspace;
  onChange: (workspace: Workspace) => void;
}) {
  return (
    <span className="workspace-selector">
      <select
        aria-label="Workspace"
        value={value}
        onChange={(event) =>
          onChange(event.target.value === "builder" ? "builder" : "investigate")
        }
      >
        <option value="investigate">Investigate</option>
        <option value="builder">Builder Studio</option>
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </span>
  );
}
