import { useState } from "react";
import {
  consumerResults,
  preferredVersion,
  query,
  type Version,
  type MetricReference,
  type QueryCohort,
} from "./domain";
import { Results } from "./Results";
import { calculationText, dimensionLabels, periodLabels } from "./labels";
export function Playground({
  versions,
  investigate,
  selection,
}: {
  selection?: MetricReference;
  versions: Version[];
  investigate: (cohort: QueryCohort) => void;
}) {
  const initial = selection
    ? versions.find(
        (v) =>
          v.definition.id === selection.metricId &&
          v.version === selection.version,
      )
    : preferredVersion(versions, versions[0]?.definition.id ?? "");
  const [id, setId] = useState(
      selection?.metricId ?? initial?.definition.id ?? "",
    ),
    [version, setVersion] = useState(
      selection?.version ?? initial?.version ?? 1,
    ),
    [dimension, setDimension] = useState(""),
    [payment, setPayment] = useState<QueryCohort["payment"]>("all"),
    [window, setWindow] = useState<QueryCohort["window"]>(
      initial?.definition.window ?? "recent",
    ),
    [authorized, setAuthorized] = useState(true),
    [response, setResponse] = useState<ReturnType<typeof query> | null>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState("");
  const selected = versions.find(
      (v) => v.definition.id === id && v.version === version,
    ),
    ids = [...new Set(versions.map((v) => v.definition.id))];
  const request = `GET /v1/metrics/${id}/query?${new URLSearchParams({ version: String(version), window, payment, ...(dimension ? { dimension } : {}) })}`;
  const examples = consumerResults(versions, id, { window, payment });
  function reset() {
    setResponse(null);
    setError("");
    setCopied("");
  }
  function select(v: Version | undefined) {
    if (v) {
      setId(v.definition.id);
      setVersion(v.version);
      setWindow(v.definition.window);
      setDimension("");
      reset();
    }
  }
  function run(test?: "version" | "dimension") {
    try {
      setResponse(
        query(versions, id, test === "version" ? 999 : version, {
          dimension: test === "dimension" ? "market" : dimension,
          payment,
          window,
          authorized,
        }),
      );
      setError("");
    } catch (e) {
      setResponse(null);
      setError((e as Error).message);
    }
  }
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label + " copied.");
    } catch {
      setCopied("Clipboard unavailable. Select and copy the visible text.");
    }
  }
  return (
    <>
      <div className="builder-grid">
        <section className="builder-panel">
          <h2>Query a published metric</h2>
          <div className="builder-form">
            <label>
              Metric
              <select
                value={id}
                onChange={(e) =>
                  select(preferredVersion(versions, e.target.value))
                }
              >
                {ids.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Version
              <select
                value={version}
                onChange={(e) =>
                  select(
                    versions.find(
                      (v) =>
                        v.definition.id === id &&
                        v.version === Number(e.target.value),
                    ),
                  )
                }
              >
                {versions
                  .filter((v) => v.definition.id === id)
                  .map((v) => (
                    <option key={v.version} value={v.version}>
                      v{v.version} · {v.state}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Group by
              <select
                value={dimension}
                onChange={(e) => {
                  setDimension(e.target.value);
                  reset();
                }}
              >
                <option value="">No grouping</option>
                {selected?.definition.dimensions.map((x) => (
                  <option key={x} value={x}>
                    {dimensionLabels[x]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment mode
              <select
                value={payment}
                onChange={(e) => {
                  setPayment(e.target.value as QueryCohort["payment"]);
                  reset();
                }}
              >
                <option value="all">All</option>
                <option value="single">Single</option>
                <option value="split">Split</option>
              </select>
            </label>
            <label>
              Creation cohort (UTC)
              <select
                value={window}
                onChange={(e) => {
                  setWindow(e.target.value as QueryCohort["window"]);
                  reset();
                }}
              >
                {Object.entries(periodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selected?.state === "Deprecated" && (
            <p className="warning">
              Deprecated contract. Existing pinned queries still work; choose a
              published version for new use.
            </p>
          )}
          <div className="builder-actions">
            <button className="button primary" onClick={() => run()}>
              Run Query
            </button>
          </div>
          <p className="builder-caption">
            Local simulation · no network request is sent.
          </p>
          <details>
            <summary>Definition and developer quickstart</summary>
            {selected && (
              <>
                <p>{selected.definition.description}</p>
                <p>
                  {calculationText(selected.definition)} · distinct{" "}
                  {selected.definition.grain}
                </p>
                <p>
                  Owner: {selected.definition.businessOwner} · Maintainer:{" "}
                  {selected.definition.maintainer} · Source:{" "}
                  {selected.definition.source}
                </p>
              </>
            )}
            <ol>
              <li>Find a metric in Data Catalog.</li>
              <li>Inspect its version, source and supported dimensions.</li>
              <li>Choose a cohort and filters; run a query.</li>
              <li>Inspect the result and evidence; copy the request below.</li>
              <li>Pin the explicit version in your consumer.</li>
            </ol>
            <p>
              <strong>Parameters:</strong> version (required integer), window
              (recent / previous / all), payment (single / split / all),
              dimension (one published dimension). Cohorts use group creation
              time.
            </p>
            <p>
              <strong>Access:</strong> no credentials in this demo. A real
              service would require consumer identity and metric read
              authorization.
            </p>
            <p>
              <strong>Versioning:</strong> published definitions are immutable.
              Deprecated versions remain queryable for compatibility.
            </p>
            <p>
              <strong>Errors:</strong> UNAUTHORIZED (conceptual 403),
              METRIC_VERSION_NOT_FOUND (404), UNSUPPORTED_DIMENSION /
              INVALID_FILTER / INVALID_WINDOW (400).
            </p>
            <p>
              <strong>Response:</strong> percent value (null for zero
              denominator), grouped counts, cohort, quality, source IDs and a
              stable demo timestamp.
            </p>
          </details>
        </section>
        <section className="builder-panel" aria-live="polite">
          <h2>Result</h2>
          {error ? (
            <p role="alert" className="error">
              {error}. Review the query or demo access and run again.
            </p>
          ) : response && selected ? (
            <>
              <p>
                {selected.definition.name} · v{response.version} · Quality:{" "}
                {response.quality}
              </p>
              <Results
                result={response}
                definition={selected.definition}
                dimension={dimension}
              />
              <p>
                {periodLabels[response.period as QueryCohort["window"]]} UTC ·{" "}
                {payment === "all" ? "All payment modes" : payment + " payment"}{" "}
                · Source: {response.source_ids.join(", ")}
              </p>
              {response.lifecycle === "Deprecated" && (
                <p className="warning">
                  Deprecated version retained for pinned consumers.
                </p>
              )}
              <button
                className="button primary"
                onClick={() =>
                  investigate({
                    window: response.period as QueryCohort["window"],
                    payment,
                  })
                }
              >
                Investigate this cohort
              </button>
              <p className="builder-caption">
                Opens the same groups in Journey Analysis. Aggregate evidence
                does not identify a causal replay session.
              </p>
            </>
          ) : (
            <p>Run a query to calculate this metric for the selected cohort.</p>
          )}
          <details>
            <summary>Request and response</summary>
            <pre aria-label="API request">{request}</pre>
            <button className="button" onClick={() => copy(request, "Request")}>
              Copy request
            </button>
            {response && (
              <>
                <pre aria-label="API response">
                  {JSON.stringify(response, null, 2)}
                </pre>
                <button
                  className="button"
                  onClick={() =>
                    copy(JSON.stringify(response, null, 2), "Response")
                  }
                >
                  Copy response
                </button>
              </>
            )}
          </details>
          <p role="status">{copied}</p>
        </section>
      </div>
      <details>
        <summary>
          Consumer examples · {examples.length} pinned integrations
        </summary>
        <p>
          Same cohort and payment filter; each consumer keeps its explicit
          metric version.
        </p>
        {!examples.length && (
          <p>No consumers are pinned to this metric in the demo.</p>
        )}
        {examples.map(({ consumer: c, response: r, error: e }) => (
          <div className="builder-row" key={c.id}>
            <div>
              <strong>{c.label}</strong>
              <small>
                {c.metric} · v{c.version} · {r?.period ?? window}
              </small>
              {c.id === "1" && r && (
                <details>
                  <summary>Structured agent evidence (no LLM call)</summary>
                  <pre>
                    {JSON.stringify(
                      {
                        claim: "Eligible group completion",
                        evidence: {
                          metric_id: r.metric_id,
                          version: r.version,
                          value: r.value,
                          unit: r.unit,
                          numerator: r.numerator,
                          denominator: r.denominator,
                          source_ids: r.source_ids,
                        },
                        limitation:
                          "Aggregate evidence; no causal or individual-session claim.",
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </div>
            <span>
              {e ??
                (r?.value === null
                  ? "No eligible groups"
                  : r?.value.toFixed(2) + "%")}
            </span>
          </div>
        ))}
      </details>
      <details>
        <summary>Demo checks</summary>
        <p>
          Optional error demonstrations; the normal query options stay valid.
        </p>
        <div className="builder-actions">
          <button className="button" onClick={() => run("version")}>
            Test missing version
          </button>
          <button className="button" onClick={() => run("dimension")}>
            Test unsupported dimension
          </button>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(e) => {
              setAuthorized(e.target.checked);
              reset();
            }}
          />
          Consumer authorized (simulated)
        </label>
      </details>
    </>
  );
}
