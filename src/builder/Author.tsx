import { useState } from "react";
import {
  assets,
  calculate,
  dimensions,
  validate,
  type Draft,
  type Version,
  type Dimension,
} from "./domain";
import { Help } from "./Help";
import { Results } from "./Results";
import { calculationText, dimensionLabels, periodLabels } from "./labels";
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
    [breakdown, setBreakdown] = useState<Dimension | "">(d.dimensions[0] ?? "");
  const selectedBreakdown = d.dimensions.includes(breakdown as Dimension)
    ? breakdown
    : (d.dimensions[0] ?? "");
  const update = (patch: Partial<Draft>) => {
    setDraft({ ...d, ...patch, state: "Draft" });
    setPreview(false);
  };
  const issues = validate(d, versions).filter((c) => c.status === "error");
  const fields = [
    ["name", "Metric name"],
    ["description", "Business definition"],
    ["businessOwner", "Business owner"],
  ] as const;
  const technicalFields = [
    ["id", "Machine identifier"],
    ["maintainer", "Technical maintainer"],
    ["intendedUse", "Intended use"],
  ] as const;
  const definitionIncomplete = [...fields, ...technicalFields].some(
    ([key]) => !d[key].trim(),
  );
  const input = ([key, label]:
    (typeof fields)[number] | (typeof technicalFields)[number]) => (
    <div key={key}>
      <label htmlFor={`metric-${key}`}>{label}</label>
      <input
        id={`metric-${key}`}
        value={d[key]}
        onChange={(e) => update({ [key]: e.target.value })}
        required
        aria-invalid={!d[key].trim()}
        aria-describedby={!d[key].trim() ? `error-${key}` : undefined}
      />
      {!d[key].trim() && (
        <span id={`error-${key}`} className="error">
          {label} is required.
        </span>
      )}
    </div>
  );
  let result: ReturnType<typeof calculate> | undefined,
    error = "";
  if (preview)
    try {
      result = calculate(d, { dimension: selectedBreakdown });
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
          <span>
            {d.state}
            {d.baseVersion ? ` · based on v${d.baseVersion}` : ""}
          </span>
        </div>
        <p className="builder-caption">
          Changes are saved automatically for this session. Refresh starts a
          fresh demo.
        </p>
        {versions.some((v) => v.definition.id === d.id) && (
          <p className="builder-notice">
            You’re creating a new version of an existing metric. Published
            versions and consumer pins stay unchanged.
          </p>
        )}
        {step === 0 && (
          <>
            <div className="builder-form">{fields.map(input)}</div>
            <details>
              <summary>Identifier and technical ownership</summary>
              <div className="builder-form">
                {technicalFields.map(input)}
                <label>
                  Domain
                  <input value="Group Orders" readOnly />
                </label>
              </div>
            </details>
            {definitionIncomplete && (
              <p className="error" role="alert">
                Complete the definition and technical ownership before
                continuing.
              </p>
            )}
          </>
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
                  {assets
                    .filter(
                      (a) => a.type === "product" && a.status === "Certified",
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id} · certified
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Creation cohort
                <select
                  value={d.window}
                  onChange={(e) =>
                    update({ window: e.target.value as Draft["window"] })
                  }
                >
                  {Object.entries(periodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="builder-formula">{calculationText(d)}</p>
            {d.numerator !==
              (d.kind === "completion" ? "completed" : "payment_failed") && (
              <p className="error" role="alert">
                Missing numerator field: {d.numerator}. Correct it in Validation
                & Publishing.
              </p>
            )}
            <details>
              <summary>Calculation semantics and source schema</summary>
              <div className="builder-form">
                <label>
                  Numerator field
                  <input value={d.numerator} readOnly />
                </label>
                <div>
                  <label htmlFor="denominator-eligibility">
                    Denominator eligibility
                  </label>
                  <Help label="About denominator eligibility">
                    All created fixture groups are eligible. Excluding groups
                    without an order would bias the denominator.
                  </Help>
                  <input
                    id="denominator-eligibility"
                    value="eligible = true"
                    readOnly
                  />
                </div>
                <div>
                  <label htmlFor="entity-grain">Distinct entity grain</label>
                  <Help label="About entity grain">
                    The unit counted once. Group IDs exist before submission;
                    order IDs alone do not prove a confirmed order.
                  </Help>
                  <input id="entity-grain" value={d.grain} readOnly />
                </div>
                <label>
                  Event-time field
                  <input value={d.timeField} readOnly />
                </label>
              </div>
              <p>
                Distinct eligible groups; UTC creation time, start inclusive and
                end exclusive. Null group IDs and ineligible rows are excluded.
                Unknown dimensions form an Unknown group; an empty denominator
                returns null.
              </p>
              <p>
                group_id: string · completed / payment_failed / eligible:
                boolean · created_at: timestamp · payment_method / app_version /
                period: string
              </p>
              <p>
                Raw producers → group_orders modeled join → metric contract.
                Terminal cohort data; no live conversion attribution.
              </p>
            </details>
          </>
        )}
        {step === 2 && (
          <>
            <fieldset>
              <legend>Allow consumers to group by</legend>
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
                  {dimensionLabels[x]}
                </label>
              ))}
            </fieldset>
            <div className="builder-actions">
              {d.dimensions.length > 1 && (
                <label>
                  Preview breakdown
                  <select
                    value={selectedBreakdown}
                    onChange={(e) => {
                      setBreakdown(e.target.value as Dimension);
                      setPreview(false);
                    }}
                  >
                    {d.dimensions.map((x) => (
                      <option key={x} value={x}>
                        {dimensionLabels[x]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className="button" onClick={() => setPreview(true)}>
                Calculate preview
              </button>
            </div>
            {result && (
              <div aria-live="polite">
                <Results
                  result={result}
                  definition={d}
                  dimension={selectedBreakdown}
                />
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
          {step < 2 ? (
            <button
              className="button primary"
              disabled={step === 0 && definitionIncomplete}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </button>
          ) : (
            <button className="button primary" onClick={next}>
              Validate draft
            </button>
          )}
          {step < 2 && (
            <button className="button" onClick={next}>
              Validate draft
            </button>
          )}
        </div>
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
