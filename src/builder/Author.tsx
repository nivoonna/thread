import { useState } from "react";
import {
  assets,
  calculate,
  dimensions,
  validate,
  type Draft,
  type Version,
} from "./domain";
import { Help } from "./Help";
export function Author({
  draft: d,
  setDraft,
  versions,
  next,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  versions: Version[];
  next: () => void;
}) {
  const [step, setStep] = useState(0),
    [preview, setPreview] = useState(false),
    [saved, setSaved] = useState(false);
  const update = (patch: Partial<Draft>) => {
    setDraft({ ...d, ...patch, state: "Draft" });
    setPreview(false);
    setSaved(false);
  };
  const issues = validate(d, versions).filter((c) => c.status === "error");
  let result: ReturnType<typeof calculate> | undefined,
    error = "";
  if (preview)
    try {
      result = calculate(d, { dimension: d.dimensions[0] });
    } catch (e) {
      error = (e as Error).message;
    }
  return (
    <>
      <nav className="builder-tabs" aria-label="Authoring steps">
        {["Definition", "Source & calculation", "Dimensions & preview"].map(
          (s, i) => (
            <button
              key={s}
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              {i + 1}. {s}
            </button>
          ),
        )}
      </nav>
      <section className="builder-panel">
        <div className="builder-heading">
          <h2>{d.name || "Untitled metric"}</h2>
          <span>{d.state} · session draft</span>
        </div>
        {versions.some((v) => v.definition.id === d.id) && (
          <p className="builder-notice">
            This identifier already has published versions. Saving and
            publishing creates the next version; existing consumers stay pinned.
          </p>
        )}
        {step === 0 && (
          <div className="builder-form">
            {(
              [
                ["name", "Metric name"],
                ["id", "Machine identifier"],
                ["description", "Business definition"],
                ["businessOwner", "Business owner"],
                ["maintainer", "Technical maintainer"],
                ["intendedUse", "Intended use"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={d[key]}
                  onChange={(e) => update({ [key]: e.target.value })}
                  required
                />
              </label>
            ))}
            <label>
              Domain
              <input value="Group Orders" readOnly />
            </label>
          </div>
        )}
        {step === 1 && (
          <>
            <div className="builder-form">
              <label>
                Modeled source
                <select
                  value={d.source}
                  onChange={(e) => update({ source: e.target.value })}
                >
                  {assets.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      disabled={a.type !== "product"}
                    >
                      {a.id}
                      {a.type !== "product" ? " · incompatible source" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Numerator field
                <select
                  value={d.numerator}
                  onChange={(e) => update({ numerator: e.target.value })}
                >
                  <option
                    value={
                      d.kind === "completion" ? "completed" : "payment_failed"
                    }
                  >
                    {d.kind === "completion"
                      ? "completed — confirmed order exists"
                      : "payment_failed — declined payment exists"}
                  </option>
                  <option value="order_completed">
                    order_completed — legacy reference (missing)
                  </option>
                </select>
              </label>
              <label>
                Denominator eligibility{" "}
                <Help label="About denominator eligibility">
                  All created fixture groups are eligible. Excluding groups
                  without an order would bias the denominator.
                </Help>
                <input value="eligible = true" readOnly />
              </label>
              <label>
                Distinct entity grain{" "}
                <Help label="About entity grain">
                  The unit counted once. Group IDs exist before submission;
                  order IDs alone do not prove a confirmed order.
                </Help>
                <input value={d.grain} readOnly />
              </label>
              <label>
                Event-time field
                <input value={d.timeField} readOnly />
              </label>
              <label>
                Creation cohort
                <select
                  value={d.window}
                  onChange={(e) =>
                    update({ window: e.target.value as Draft["window"] })
                  }
                >
                  <option value="recent">October 15–28, 2026</option>
                  <option value="previous">October 1–14, 2026</option>
                  <option value="all">October 1–28, 2026</option>
                </select>
              </label>
            </div>
            <details>
              <summary>Calculation semantics and source schema</summary>
              <p>
                Distinct matching eligible groups ÷ distinct started eligible
                groups × 100. Cohort boundaries use UTC creation time, start
                inclusive and end exclusive. Null entity IDs and ineligible rows
                are excluded; unknown dimension values form an Unknown group. An
                empty denominator returns null, never NaN.
              </p>
              <p>
                group_id: string · completed / eligible: boolean · created_at:
                timestamp · payment_method / app_version / period: string
              </p>
              <p>
                Raw producers → group_orders modeled join → metric contract.
                Data is terminal cohort data; this is not a live conversion
                attribution model.
              </p>
            </details>
          </>
        )}
        {step === 2 && (
          <>
            <fieldset>
              <legend>Supported dimensions</legend>
              {dimensions.map((x) => (
                <label className="check-label" key={x}>
                  <input
                    type="checkbox"
                    checked={d.dimensions.includes(x)}
                    onChange={(e) =>
                      update({
                        dimensions: e.target.checked
                          ? [...d.dimensions, x]
                          : d.dimensions.filter((v) => v !== x),
                      })
                    }
                  />
                  {x}
                </label>
              ))}
              <p>
                Market and platform are unavailable in Gather fixtures. Payment
                method means single / split payment mode.
              </p>
            </fieldset>
            <button className="button" onClick={() => setPreview(true)}>
              Calculate preview
            </button>
            {result && (
              <div aria-live="polite">
                <div className="builder-result">
                  {result.value === null
                    ? "No eligible groups"
                    : result.value.toFixed(2) + "%"}
                </div>
                <p>
                  {result.numerator} matching / {result.denominator} eligible ·
                  distinct {result.grain} · {result.period} UTC creation cohort
                </p>
                <div className="builder-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{d.dimensions[0] || "Group"}</th>
                        <th>Completed</th>
                        <th>Eligible</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.groups.map((g) => (
                        <tr key={g.dimension}>
                          <td>{g.dimension}</td>
                          <td>{g.numerator}</td>
                          <td>{g.denominator}</td>
                          <td>
                            {g.value === null ? "—" : g.value.toFixed(2) + "%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Preview groups by the first selected dimension. All selected
                  dimensions become queryable after publication.
                </p>
              </div>
            )}
            {error && (
              <p className="error" role="alert">
                Preview blocked: {error}. Correct calculation fields before
                previewing.
              </p>
            )}
          </>
        )}
        <div className="builder-actions">
          {step > 0 && (
            <button className="button" onClick={() => setStep(step - 1)}>
              Previous
            </button>
          )}
          {step < 2 && (
            <button
              className="button primary"
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          )}
          <button className="button" onClick={() => setSaved(true)}>
            Save draft
          </button>
          <button className="button primary" onClick={next}>
            Validate draft
          </button>
        </div>
        <p role="status">
          {saved
            ? "Draft saved for this app session. Refresh starts a fresh demo."
            : ""}
        </p>
        {issues.length > 0 && (
          <p className="error">
            {issues.length} blocking check{issues.length === 1 ? "" : "s"}{" "}
            remain. Open validation for details.
          </p>
        )}
      </section>
    </>
  );
}
