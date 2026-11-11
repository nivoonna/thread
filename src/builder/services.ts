import { assets, rows, consumers, NOW } from "./fixtures";
import {
  dimensions,
  type Dimension,
  type Row,
  type Asset,
  type Draft,
  type Definition,
  type Version,
  type Check,
  type Query,
} from "./models";

export function newDraft(): Draft {
  return {
    id: "group_order_completion_rate",
    name: "Group Order Completion Rate",
    description:
      "Confirmed eligible groups divided by started eligible groups.",
    businessOwner: "Group Orders PM",
    maintainer: "Marketplace data",
    intendedUse: "Evaluate Group Payments v2",
    source: "group_orders",
    numerator: "completed",
    denominator: "eligible",
    grain: "group_id",
    timeField: "created_at",
    dimensions: ["payment_method"],
    window: "recent",
    kind: "completion",
    state: "Draft",
  };
}
export function catalog(
  versions: readonly Version[],
  search = "",
  type = "",
  domain = "",
  status = "",
): Asset[] {
  const metrics = versions
    .filter(
      (v, i, a) =>
        !a.slice(i + 1).some((x) => x.definition.id === v.definition.id),
    )
    .map((v) => ({
      ...assets[4],
      id: v.definition.id,
      type: "metric" as const,
      owner: v.definition.maintainer,
      description: v.definition.description,
      status:
        v.state === "Published"
          ? ("Certified" as const)
          : ("Available" as const),
      dependencies: [v.definition.source],
    }));
  return [...assets, ...metrics].filter(
    (a) =>
      (a.id + " " + a.description)
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!type || a.type === type) &&
      (!domain || a.domain === domain) &&
      (!status || a.status === status),
  );
}

export function dependenciesAvailable(
  id: string,
  sourceAssets = assets,
  seen = new Set<string>(),
): boolean {
  const asset = sourceAssets.find((a) => a.id === id);
  if (!asset || seen.has(id)) return false;
  const next = new Set(seen).add(id);
  return asset.dependencies.every((dependency) =>
    dependenciesAvailable(dependency, sourceAssets, next),
  );
}
export function validate(
  d: Draft,
  versions: readonly Version[],
  sourceAssets = assets,
  canPublish = true,
): Check[] {
  const source = sourceAssets.find((a) => a.id === d.source);
  const check = (name: string, ok: boolean, detail: string): Check => ({
    name,
    status: ok ? "pass" : "error",
    detail,
  });
  return [
    check(
      "Business definition",
      !!(
        d.name.trim() &&
        d.description.trim() &&
        d.businessOwner.trim() &&
        d.maintainer.trim() &&
        d.intendedUse.trim()
      ),
      "Name, description, owners and intended use are required.",
    ),
    check(
      "Identifier",
      /^[a-z][a-z0-9_]+$/.test(d.id) &&
        (!versions.some((v) => v.definition.id === d.id) ||
          versions.some(
            (v) =>
              v.definition.id === d.id &&
              v.version === d.baseVersion &&
              v.definition.kind === d.kind,
          )),
      "Use a stable unique identifier; revisions retain the same contract identity.",
    ),
    check(
      "Approved source",
      source?.type === "product" && source.status === "Certified",
      "Select the certified modeled group_orders product.",
    ),
    check(
      "Calculation fields",
      source?.fields[d.numerator] === "boolean" &&
        source.fields[d.denominator] === "boolean" &&
        d.numerator ===
          (d.kind === "completion" ? "completed" : "payment_failed") &&
        d.denominator === "eligible",
      "Numerator must match the business definition; denominator must be eligible.",
    ),
    check(
      "Entity and event time",
      source?.fields[d.grain] === "string" &&
        d.grain === "group_id" &&
        source.fields[d.timeField] === "timestamp" &&
        d.timeField === "created_at" &&
        ["all", "recent", "previous"].includes(d.window),
      "Distinct group_id with created_at cohort time is required.",
    ),
    check(
      "Dimensions",
      d.dimensions.every((x) => dimensions.includes(x) && !!source?.fields[x]),
      "Only fields backed by the modeled product are supported; market and platform are unavailable.",
    ),
    check(
      "Freshness",
      source?.fresh === true,
      "Freshness evaluated against the stable demo clock, not current wall time.",
    ),
    check(
      "Completeness",
      (source?.completeness ?? 0) >= 0.99,
      "Required source completeness ≥99%.",
    ),
    check(
      "Dependencies",
      !!source && dependenciesAvailable(source.id, sourceAssets),
      "All modeled dependencies must be available.",
    ),
    check(
      "Publish permission",
      canPublish,
      "Simulated builder permission required.",
    ),
    {
      name: "Approval simulation",
      status: "warning",
      detail:
        "Local role simulation; no enterprise authorization or approval service.",
    },
  ];
}
export function validated(d: Draft, versions: readonly Version[]): Draft {
  if (validate(d, versions).some((c) => c.status === "error"))
    throw Error("VALIDATION_FAILED");
  return { ...d, state: "Validated" };
}
export function publish(
  d: Draft,
  versions: readonly Version[],
  permission = true,
): Version {
  if (
    d.state !== "Validated" ||
    validate(d, versions, assets, permission).some((c) => c.status === "error")
  )
    throw Error("PUBLISH_BLOCKED");
  const {
    state: _,
    baseVersion: _baseVersion,
    ...definition
  } = structuredClone(d);
  Object.freeze(definition.dimensions);
  Object.freeze(definition);
  return Object.freeze({
    definition,
    version:
      Math.max(
        0,
        ...versions
          .filter((v) => v.definition.id === d.id)
          .map((v) => v.version),
      ) + 1,
    state: "Published",
    publishedAt: NOW,
  });
}
export function edit(v: Version): Draft {
  return {
    ...structuredClone(v.definition),
    baseVersion: v.version,
    state: "Draft",
  };
}
export function deprecate(v: Version, permission = true): Version {
  if (!permission || v.state !== "Published") throw Error("INVALID_TRANSITION");
  return Object.freeze({ ...v, state: "Deprecated" });
}
export function draftImpact(
  draft: Draft,
  versions: readonly Version[],
  links = consumers,
) {
  const base = versions.find(
    (v) => v.definition.id === draft.id && v.version === draft.baseVersion,
  );
  return base ? { base, ...impact(base, draft, links) } : undefined;
}
export function impact(old: Version, d: Draft, links = consumers) {
  const changed = (
    [
      "source",
      "numerator",
      "denominator",
      "grain",
      "timeField",
      "window",
      "dimensions",
    ] as const
  ).filter((k) => JSON.stringify(old.definition[k]) !== JSON.stringify(d[k]));
  return {
    changed,
    breaking: changed.length > 0,
    consumers: links.filter(
      (c) => c.metric === old.definition.id && c.version === old.version,
    ),
  };
}

export function calculate(d: Definition, q: Query = {}, data = rows) {
  if (q.dimension && !d.dimensions.includes(q.dimension as Dimension))
    throw Error("UNSUPPORTED_DIMENSION");
  if (q.payment && !["all", "single", "split"].includes(q.payment))
    throw Error("INVALID_FILTER");
  const window = q.window ?? d.window;
  if (!["all", "recent", "previous"].includes(window))
    throw Error("INVALID_WINDOW");
  const checks = validate({ ...d, state: "Draft" }, []);
  if (checks.some((c) => c.status === "error"))
    throw Error("INVALID_DEFINITION");
  const unique = [
    ...new Map(
      data
        .filter(
          (r) =>
            r.eligible &&
            r.group_id &&
            Date.parse(r.created_at) >= Date.parse("2026-10-01T00:00:00Z") &&
            Date.parse(r.created_at) < Date.parse("2026-10-29T00:00:00Z") &&
            (window === "all" || r.period === window) &&
            (!q.payment ||
              q.payment === "all" ||
              r.payment_method === q.payment),
        )
        .map((r) => [r.group_id, r]),
    ).values(),
  ];
  const summarize = (rs: Row[]) => ({
    numerator: rs.filter(
      (r) =>
        (d.kind === "completion" ? r.completed : r.payment_failed) === true,
    ).length,
    denominator: rs.length,
    value: rs.length
      ? (100 *
          rs.filter(
            (r) =>
              (d.kind === "completion" ? r.completed : r.payment_failed) ===
              true,
          ).length) /
        rs.length
      : null,
  });
  const keys = q.dimension
    ? [
        ...new Set(
          unique.map((r) => String(r[q.dimension as Dimension] ?? "Unknown")),
        ),
      ]
    : ["All"];
  return {
    ...summarize(unique),
    groups: keys.map((key) => ({
      dimension: key,
      ...summarize(
        q.dimension
          ? unique.filter(
              (r) => String(r[q.dimension as Dimension] ?? "Unknown") === key,
            )
          : unique,
      ),
    })),
    period: window,
    measurement_period: {
      start:
        window === "recent" ? "2026-10-15T00:00:00Z" : "2026-10-01T00:00:00Z",
      end_exclusive:
        window === "previous" ? "2026-10-15T00:00:00Z" : "2026-10-29T00:00:00Z",
    },
    unit: "percent",
    grain: d.grain,
  };
}
export function query(
  versions: readonly Version[],
  id: string,
  version: number,
  q: Query = {},
) {
  if (q.authorized === false) throw Error("UNAUTHORIZED");
  const v = versions.find(
    (v) => v.definition.id === id && v.version === version,
  );
  if (!v) throw Error("METRIC_VERSION_NOT_FOUND");
  return {
    metric_id: id,
    version,
    ...calculate(v.definition, q),
    quality: "passed",
    lifecycle: v.state,
    source_ids: [v.definition.source],
    query_timestamp: NOW,
  };
}
export function initialVersions(): Version[] {
  const failure: Draft = {
    ...newDraft(),
    id: "payment_failure_rate",
    name: "Payment Failure Rate",
    description:
      "Eligible groups with at least one declined payment divided by all started eligible groups; group-level, not attempt-level.",
    numerator: "payment_failed",
    kind: "failure",
  };
  return [
    publish(validated(newDraft(), []), []),
    publish(validated(failure, []), []),
  ];
}
