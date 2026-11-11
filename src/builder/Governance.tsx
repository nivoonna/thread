import { useState } from "react";
import { Modal } from "../components/Shared";
import {
  deprecate,
  draftImpact,
  hasDraftChanges,
  publish,
  validate,
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
  onQuery,
  onNewDraft,
  published,
  onPublished,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  versions: Version[];
  setVersions: (v: Version[]) => void;
  go: () => void;
  onQuery: (v: Version) => void;
  onNewDraft: (v: Version) => void;
  published?: Version;
  onPublished: (v: Version) => void;
}) {
  const [checks, setChecks] = useState<Check[] | null>(null),
    [message, setMessage] = useState(""),
    [permission, setPermission] = useState(true),
    [retiring, setRetiring] = useState<Version>();
  const change = draftImpact(d, versions),
    base = published ?? change?.base;
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
      onPublished(v);
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
  const renderCheck = (c: Check) => (
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
            {d.kind === "completion" ? "completed" : "payment_failed"}”.
          </p>
        )}
      </div>
    </div>
  );
  return (
    <>
      <Modal
        open={!!retiring}
        onClose={() => setRetiring(undefined)}
        title={`Deprecate v${retiring?.version}?`}
        description={`${retiring?.definition.name ?? "This metric"} will be discouraged for new use. Existing consumers keep their pinned version and can still query it.`}
      >
        <div className="builder-actions">
          <button className="button" onClick={() => setRetiring(undefined)}>
            Keep published
          </button>
          <button
            className="button"
            onClick={() => {
              if (retiring) {
                setVersions(
                  versions.map((v) =>
                    v === retiring ? deprecate(v, permission) : v,
                  ),
                );
                setMessage(
                  "Deprecated v" +
                    retiring.version +
                    ". Existing pinned queries remain available.",
                );
                setRetiring(undefined);
              }
            }}
          >
            Confirm deprecation
          </button>
        </div>
      </Modal>
      <section className="builder-panel">
        <div className="builder-heading">
          <div>
            <h2>{d.name}</h2>
            <p>
              {d.businessOwner} · maintained by {d.maintainer}
            </p>
          </div>
          <strong>
            {published ? `${published.state} v${published.version}` : d.state}
          </strong>
        </div>
        {published ? (
          <>
            <p>
              This version is immutable and ready to query. Further changes
              start a new draft.
            </p>
            <div className="builder-actions">
              <button
                className="button primary"
                onClick={() => onQuery(published)}
              >
                Query published metric
              </button>
              <button className="button" onClick={() => onNewDraft(published)}>
                Edit as new draft
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              Validate the definition, review its impact, then publish a version
              consumers can pin.
            </p>
            <div className="builder-actions">
              <button
                className={"button" + (d.state === "Draft" ? " primary" : "")}
                onClick={run}
              >
                Run validation
              </button>
              {d.numerator === "order_completed" && (
                <button className="button" onClick={fix}>
                  Use {d.kind === "completion" ? "completed" : "payment_failed"}{" "}
                  field
                </button>
              )}
              <button className="button" onClick={go}>
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
            {checks && (
              <div aria-label="Validation results">
                <p>
                  {checks.filter((c) => c.status === "pass").length} checks
                  passed · {checks.filter((c) => c.status === "error").length}{" "}
                  blocking ·{" "}
                  {checks.filter((c) => c.status === "warning").length} warning
                </p>
                {checks.filter((c) => c.status !== "pass").map(renderCheck)}
                <details>
                  <summary>Passed checks</summary>
                  {checks.filter((c) => c.status === "pass").map(renderCheck)}
                </details>
              </div>
            )}
            <details>
              <summary>Demo checks</summary>
              <p>
                Optional failure scenarios. These change the draft or simulated
                role; validation checks the resulting state.
              </p>
              <button className="button" onClick={corrupt}>
                Test legacy field reference
              </button>
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
            </details>
          </>
        )}
        <p role="status">
          {message ||
            (published
              ? `Published v${published.version}. Immutable snapshot is discoverable and queryable.`
              : "")}
        </p>
      </section>
      {!published && change && hasDraftChanges(d, versions) && (
        <section className="builder-panel">
          <h2>Change impact vs v{change.base.version}</h2>
          <p className={change.breaking ? "warning" : undefined}>
            {change.breaking
              ? "Potentially breaking: " + change.changed.join(", ")
              : change.changed.length
                ? "Compatible change: added dimensions. Existing queries remain valid."
                : "Calculation contract unchanged. Metadata-only revision."}
          </p>
          {change.changed.length > 0 && (
            <div className="builder-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Contract field</th>
                    <th>Published v{change.base.version}</th>
                    <th>Proposed draft</th>
                  </tr>
                </thead>
                <tbody>
                  {change.changed.map((key) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{String(change.base.definition[key]) || "None"}</td>
                      <td>{String(d[key]) || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p>
            Affected consumers remain pinned to v{change.base.version}:{" "}
            {change.consumers.map((c) => c.label).join(", ") ||
              "No consumers pinned to this version."}
          </p>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.definition.id + v.version}>
                  <td>
                    {v.definition.id}
                    <small>
                      v{v.version} · {v.publishedAt.slice(0, 10)} ·{" "}
                      {v.definition.maintainer}
                    </small>
                  </td>
                  <td>{v.state}</td>
                  <td>
                    <div className="builder-history-actions">
                      <button
                        className="builder-link"
                        onClick={() => onNewDraft(v)}
                      >
                        New draft from v{v.version}
                      </button>
                      {v.state === "Published" && (
                        <button
                          className="builder-link"
                          disabled={!permission}
                          onClick={() => setRetiring(v)}
                        >
                          Deprecate v{v.version}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!published && (
          <button
            className="button"
            disabled={!base}
            onClick={() => base && onQuery(base)}
          >
            Query published metric
          </button>
        )}
      </section>
    </>
  );
}
