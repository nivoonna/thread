import { Blocks, Search } from "lucide-react";
export type Workspace = "investigate" | "builder";
export function WorkspaceNavigation({
  value,
  onChange,
}: {
  value: Workspace;
  onChange: (workspace: Workspace) => void;
}) {
  return (
    <nav className="workspace-navigation" aria-label="Workspaces">
      {(
        [
          { id: "investigate", label: "Investigate", Icon: Search },
          { id: "builder", label: "Builder Studio", Icon: Blocks },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={value === id}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          <Icon size={17} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
