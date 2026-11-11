import { useState } from "react";
import {
  deprecate,
  edit,
  impact,
  publish,
  validate,
  validated,
  type Check,
  type Draft,
  type Version,
} from "./domain";
export function Governance({
  draft: d,
  setDraft,
  versions,
  setVersions,
  go,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  versions: Version[];
  setVersions: (v: Version[]) => void;
  go: (v: "metric" | "api") => void;
}) {
  const [checks, setChecks] = useState<Check[] | null>(null),
    [message, setMessage] = useState(""),
    [permission, setPermission] = useState(true);
  const latest = versions.filter((v) => v.definition.id === d.id).at(-1),
    change = latest ? impact(latest, d) : undefined;
  function run() {
    const c = validate(d, versions, undefined, permission);
    setChecks(c);
    setDraft({
      ...d,
      state: c.some((x) => x.status === "error") ? "Draft" : "Validated",
    });
    setMessage(
      c.some((x) => x.status === "error")
        ? "Validation blocked. Correct the underlying definition and rerun."
        : "Required checks passed. Ready to publish.",
    );
  }
  function corrupt() {
    setDraft({ ...d, numerator: "order_completed", state: "Draft" });
    setChecks(null);
    setMessage(
      "Legacy reference selected. Run validation to check it against the real source schema.",
    );
  }
  function fix() {
    setDraft({
      ...d,
      numerator: d.kind === "completion" ? "completed" : "payment_failed",
      state: "Draft",
    });
    setChecks(null);
    setMessage(
      "Numerator restored to the supported field. Rerun validation to verify the correction.",
    );
  }
  function release() {
    try {
      const v = publish(d, versions, permission);
      setVersions([...versions, v]);
      setDraft(edit(v));
      setChecks(null);
      setMessage(
        "Published v" +
          v.version +
          ". Immutable snapshot is now discoverable and queryable.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <section className="builder-panel">
        <div className="builder-heading">
          <div>
            <h2>{d.name}</h2>
            <p>
              {d.businessOwner} · maintained by {d.maintainer}
            </p>
          </div>
          <span>{d.state}</span>
        </div>
        <p>
          Draft → Validated → Published → Deprecated. Editing a published
          contract creates a draft; published definitions remain immutable.
        </p>
        <details>
          <summary>Simulated permission and approval</summary>
          <label className="check-label">
            <input
              type="checkbox"
              checked={permission}
              onChange={(e) => {
                setPermission(e.target.checked);
                setDraft({ ...d, state: "Draft" });
                setChecks(null);
              }}
            />
            Builder may publish (local role simulation)
          </label>
          <p>
            No real enterprise identity, approval service or security boundary.
          </p>
        </details>
        <div className="builder-actions">
          <button className="button primary" onClick={run}>
            Run validation
          </button>
          <button className="button" onClick={corrupt}>
            Test legacy field reference
          </button>
          {d.numerator === "order_completed" && (
            <button className="button" onClick={fix}>
              Use {d.kind === "completion" ? "completed" : "payment_failed"}{" "}
              field
            </button>
          )}
          <button className="button" onClick={() => go("metric")}>
            Edit definition
          </button>
          <button
            className="button primary"
            disabled={d.state !== "Validated" || !permission}
            onClick={release}
          >
            Publish version
          </button>
        </div>
        <p role="status">{message}</p>
        {checks && (
          <div aria-label="Validation results">
            {checks.map((c) => (
              <div
                className={
                  "builder-check " +
                  (c.status === "error"
                    ? "error"
                    : c.status === "warning"
                      ? "warning"
                      : "")
                }
                key={c.name}
              >
                <strong>
                  {c.status === "error"
                    ? "Blocking"
                    : c.status === "warning"
                      ? "Warning"
                      : "Pass"}
                </strong>
                <div>
                  <strong>{c.name}</strong>
                  <p>{c.detail}</p>
                  {c.name === "Calculation fields" && c.status === "error" && (
                    <p>
                      Referenced “{d.numerator}”; available boolean numerator: “
                      {d.kind === "completion" ? "completed" : "payment_failed"}
                      ”.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {change && (
        <section className="builder-panel">
          <h2>Change impact vs v{latest!.version}</h2>
          <p>
            {change.breaking
              ? "Potentially breaking: " + change.changed.join(", ")
              : "Calculation contract unchanged. Metadata-only revision."}
          </p>
          <p>
            Affected consumers remain pinned to v{latest!.version}:{" "}
            {change.consumers.map((c) => c.label).join(", ") ||
              "No consumers pinned to this version."}
          </p>
          <p>Publishing never automatically upgrades consumer versions.</p>
        </section>
      )}
      <section className="builder-panel">
        <h2>Version history</h2>
        <div className="builder-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract</th>
                <th>State</th>
                <th>Owners / source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.definition.id + v.version}>
                  <td>
                    {v.definition.id}
                    <small>
                      v{v.version} · {v.publishedAt.slice(0, 10)}
                    </small>
                  </td>
                  <td>{v.state}</td>
                  <td>
                    {v.definition.businessOwner} / {v.definition.maintainer}
                    <small>{v.definition.source}</small>
                  </td>
                  <td>
                    <button
                      className="builder-link"
                      onClick={() => {
                        setDraft(edit(v));
                        setChecks(null);
                        go("metric");
                      }}
                    >
                      New draft from v{v.version}
                    </button>
                    {v.state === "Published" && (
                      <button
                        className="builder-link"
                        disabled={!permission}
                        onClick={() => {
                          setVersions(
                            versions.map((x) =>
                              x === v ? deprecate(v, permission) : x,
                            ),
                          );
                          setMessage(
                            "Deprecated v" +
                              v.version +
                              ". Existing pinned queries remain available.",
                          );
                        }}
                      >
                        Deprecate v{v.version}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="button" onClick={() => go("api")}>
          Query published metric
        </button>
      </section>
    </>
  );
}
