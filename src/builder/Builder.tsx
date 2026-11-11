import { Modal } from "../components/Shared";
import { Help } from "./Help";
import { Playground } from "./Playground";
import { Governance } from "./Governance";
import { Author } from "./Author";
import { useState } from "react";
import {
  assets,
  catalog,
  consumers,
  initialVersions,
  edit,
  hasDraftChanges,
  type Asset,
  type Draft,
  type Version,
  type MetricReference,
} from "./domain";
import "./builder.css";
export const views = [
  "overview",
  "catalog",
  "metric",
  "validation",
  "api",
] as const;
export type View = (typeof views)[number];
export const builderLabels: Record<View, string> = {
  overview: "Overview",
  catalog: "Data Catalog",
  metric: "Metric Builder",
  validation: "Validation & Publishing",
  api: "API Playground",
};
export function Builder({
  view,
  go,
  investigate,
}: {
  view: View;
  go: (v: View) => void;
  investigate: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>(initialVersions),
    [draft, setDraft] = useState<Draft>(() => edit(versions[0])),
    [pendingDraft, setPendingDraft] = useState<Draft>(),
    [querySelection, setQuerySelection] = useState<MetricReference>(),
    [selected, setSelected] = useState("group_orders"),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [domain, setDomain] = useState(""),
    [status, setStatus] = useState("");
  const list = catalog(versions, search, type, domain, status),
    all = catalog(versions),
    asset = list.find((a) => a.id === selected),
    contract = versions.filter((v) => v.definition.id === selected).at(-1);
  function openQuery(version: Version) {
    setQuerySelection({
      metricId: version.definition.id,
      version: version.version,
    });
    go("api");
  }
  function openAsset(id: string) {
    setSelected(id);
    setSearch("");
    setType("");
    setDomain("");
    setStatus("");
  }
  function requestDraft(next: Draft) {
    if (hasDraftChanges(draft, versions)) {
      setPendingDraft(next);
    } else {
      setDraft(next);
      go("metric");
    }
  }
  function create(a: Asset) {
    requestDraft({
      ...edit(
        versions
          .filter((v) => v.definition.id === "group_order_completion_rate")
          .at(-1)!,
      ),
      source: a.id,
    });
  }
  return (
    <section className="builder" aria-label="Builder Studio">
      <Modal
        open={!!pendingDraft}
        onClose={() => setPendingDraft(undefined)}
        title="Keep or replace your draft?"
        description={`${draft.name || "Untitled metric"} has unpublished changes saved for this session. Starting a new draft will discard them.`}
      >
        <div className="builder-actions">
          <button
            className="button"
            onClick={() => {
              setPendingDraft(undefined);
              go("metric");
            }}
          >
            Continue current draft
          </button>
          <button
            className="button"
            onClick={() => {
              if (pendingDraft) {
                setDraft(pendingDraft);
                setPendingDraft(undefined);
                go("metric");
              }
            }}
          >
            Discard and start new draft
          </button>
        </div>
      </Modal>
      <header className="builder-heading">
        <div>
          <div className="eyebrow">MEASUREMENT WORKSPACE</div>
          <h1>{builderLabels[view]}</h1>
          <p>
            Gather synthetic data · GrabFood Group Payments v2 is an
            illustrative use case.
          </p>
        </div>
        <span>Local simulation</span>
      </header>
      {view === "overview" && (
        <>
          <div className="builder-intro">
            <h2>Build a metric for Group Orders</h2>
            <p>
              Builder Studio is where teams turn shared data into trusted,
              reusable metrics. Define a measurement once, validate it, and
              publish a version for dashboards, applications and AI agents to
              use consistently. This demo connects those measurements to
              customer journeys in Thread.
            </p>
            <button
              className="button primary"
              onClick={() => {
                openAsset("group_orders");
                go("catalog");
              }}
            >
              Find Group Orders data
            </button>
          </div>
          <dl className="builder-stats">
            <div>
              <dt>Certified metrics</dt>
              <dd>
                {
                  all.filter(
                    (a) => a.type === "metric" && a.status === "Certified",
                  ).length
                }
              </dd>
            </div>
            <div>
              <dt>Discoverable assets</dt>
              <dd>{all.length}</dd>
            </div>
            <div>
              <dt>Consuming applications</dt>
              <dd>{consumers.length}</dd>
            </div>
            <div>
              <dt>Healthy sources</dt>
              <dd>
                {assets.filter((a) => a.fresh && a.completeness >= 0.99).length}{" "}
                / {assets.length}
              </dd>
            </div>
          </dl>
          <div className="builder-grid">
            <section className="builder-panel">
              <h2>Recent versions</h2>
              {versions.map((v) => (
                <button
                  className="builder-row"
                  key={v.definition.id + v.version}
                  onClick={() => {
                    openAsset(v.definition.id);
                    go("catalog");
                  }}
                >
                  <span>
                    {v.definition.name}
                    <small>
                      {v.definition.maintainer} · {v.publishedAt.slice(0, 10)}
                    </small>
                  </span>
                  <span>
                    v{v.version} · {v.state}
                  </span>
                </button>
              ))}
            </section>
            <section className="builder-panel">
              <h2>Needs attention</h2>
              <p>
                {draft.name} · {draft.state}
              </p>
              <button className="button" onClick={() => go("metric")}>
                Continue draft
              </button>
              <details>
                <summary>Platform responsibilities</summary>
                <p>
                  Producers own source contracts. Builders maintain metric
                  definitions. Consumers pin published versions. This local demo
                  complements conceptual catalog, quality and identity services.
                </p>
              </details>
            </section>
          </div>
        </>
      )}
      {view === "catalog" && (
        <>
          <div className="builder-filters">
            <label>
              Search assets
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or description"
              />
            </label>
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All types</option>
                {["event", "dataset", "product", "metric"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Domain
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                <option value="">All domains</option>
                <option>Group Orders</option>
                <option>Payments</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option>Certified</option>
                <option>Available</option>
              </select>
            </label>
          </div>
          <div className="builder-table-wrap">
            <table>
              <caption>Discoverable data · {list.length} assets</caption>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Type / domain</th>
                  <th>Owner</th>
                  <th>
                    Status{" "}
                    <Help label="About certified assets">
                      A reviewed definition available for reuse in this
                      synthetic demo.
                    </Help>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} aria-selected={selected === a.id}>
                    <td>
                      <button
                        className="builder-link"
                        onClick={() => setSelected(a.id)}
                      >
                        {a.id}
                      </button>
                    </td>
                    <td>
                      {a.type}
                      <small>{a.domain}</small>
                    </td>
                    <td>{a.owner}</td>
                    <td>{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <p role="status">
                No assets match these filters. Clear search or choose All types.
              </p>
            )}
          </div>
          {asset && (
            <section
              className="builder-panel asset-detail"
              aria-label="Asset details"
            >
              <div className="builder-heading">
                <div>
                  <h2>{asset.id}</h2>
                  <p>{asset.description}</p>
                </div>
                {asset.type === "product" ? (
                  <button
                    className="button primary"
                    onClick={() => create(asset)}
                  >
                    Create metric
                  </button>
                ) : asset.type === "metric" ? (
                  <button
                    className="button primary"
                    onClick={() => openQuery(contract!)}
                  >
                    Use existing metric
                  </button>
                ) : (
                  <button
                    className="button"
                    onClick={() => openAsset("group_orders")}
                  >
                    Inspect compatible modeled source
                  </button>
                )}
              </div>
              <dl className="builder-meta">
                <div>
                  <dt>Owner</dt>
                  <dd>{asset.owner}</dd>
                </div>
                <div>
                  <dt>Access</dt>
                  <dd>{asset.access} · simulated</dd>
                </div>
                <div>
                  <dt>
                    Freshness{" "}
                    <Help label="About freshness">
                      Source health is evaluated at the fixed demo clock,
                      October 29, 2026.
                    </Help>
                  </dt>
                  <dd>
                    {asset.fresh ? "Fresh" : "Stale"} ·{" "}
                    {Math.round(asset.completeness * 100)}% complete
                  </dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>
                    {versions
                      .filter((v) => v.definition.id === asset.id)
                      .map((v) => "v" + v.version + " " + v.state)
                      .join(", ") || "Source schema v1"}
                  </dd>
                </div>
              </dl>
              {asset.type === "product" && (
                <p className="builder-notice">
                  A certified group_order_completion_rate already exists.{" "}
                  <button
                    className="builder-link"
                    onClick={() => {
                      openAsset("group_order_completion_rate");
                    }}
                  >
                    Inspect and reuse it
                  </button>
                  , or create a new version of that contract.
                </p>
              )}
              <details>
                <summary>Schema and business definition</summary>
                {contract && (
                  <p>
                    Business owner: {contract.definition.businessOwner} ·
                    Technical maintainer: {contract.definition.maintainer}.
                    Calculation: {contract.definition.numerator} ÷{" "}
                    {contract.definition.denominator} × 100; distinct{" "}
                    {contract.definition.grain}, {contract.definition.timeField}{" "}
                    UTC creation cohort. The fields below describe the modeled
                    source.
                  </p>
                )}
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(asset.fields).map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
              <details>
                <summary>Lineage and consumers</summary>
                <p>
                  {asset.dependencies.length
                    ? asset.dependencies.join(" + ") + " → "
                    : ""}
                  {asset.id} →{" "}
                  {asset.type === "metric"
                    ? consumers
                        .filter((c) => c.metric === asset.id)
                        .map((c) => c.label + " (v" + c.version + ")")
                        .join(" · ") || "No pinned consumers"
                    : all
                        .filter((a) => a.dependencies.includes(asset.id))
                        .map((a) => a.id)
                        .join(" · ") || "No downstream assets"}
                </p>
                <p>
                  Dependencies retain producer ownership. Published consumers
                  remain pinned.
                </p>
              </details>
            </section>
          )}
        </>
      )}
      {view === "metric" && (
        <Author
          draft={draft}
          setDraft={setDraft}
          versions={versions}
          next={() => go("validation")}
        />
      )}
      {view === "validation" && (
        <Governance
          draft={draft}
          setDraft={setDraft}
          versions={versions}
          setVersions={setVersions}
          go={go}
          onQuery={openQuery}
          onNewDraft={(version) => requestDraft(edit(version))}
        />
      )}
      {view === "api" && (
        <Playground
          key={
            querySelection
              ? `${querySelection.metricId}:${querySelection.version}`
              : "default"
          }
          selection={querySelection}
          versions={versions}
          investigate={investigate}
        />
      )}
    </section>
  );
}
