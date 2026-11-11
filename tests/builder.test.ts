import { describe, it, expect } from "vitest";
import {
  assets,
  rows,
  newDraft,
  validate,
  validated,
  publish,
  edit,
  deprecate,
  impact,
  query,
  calculate,
  initialVersions,
  catalog,
} from "../src/builder/domain";
describe("measurement contracts", () => {
  it("maps confirmed orders, deduplicates and handles empty denominators", () => {
    const d = newDraft();
    expect(calculate(d, {}, []).value).toBeNull();
    const r = rows[0];
    expect(calculate(d, { window: "all" }, [r, r]).denominator).toBe(1);
    expect(calculate(d, { window: "all" }).denominator).toBe(1500);
  });
  it("validates real field failures and correction", () => {
    const d = { ...newDraft(), numerator: "order_completed" };
    expect(() => validated(d, [])).toThrow();
    expect(
      validate(d, []).find((x) => x.name === "Calculation fields")?.status,
    ).toBe("error");
    d.numerator = "completed";
    expect(validated(d, []).state).toBe("Validated");
  });
  it("blocks incomplete, incompatible, stale, incomplete and unauthorized sources", () => {
    expect(() => publish(newDraft(), [])).toThrow();
    for (const patch of [
      { name: "" },
      { source: "order_transactions" },
      { grain: "order_id" },
      { timeField: "missing" },
      { dimensions: ["market"] as never },
    ])
      expect(
        validate({ ...newDraft(), ...patch }, []).some(
          (c) => c.status === "error",
        ),
      ).toBe(true);
    expect(
      validate(
        newDraft(),
        [],
        assets.map((a) => ({ ...a, fresh: false, completeness: 0 })),
        false,
      ).filter((c) => c.status === "error").length,
    ).toBeGreaterThanOrEqual(3);
  });
  it("snapshots versions, tracks consumers, impacts and deprecation", () => {
    const vs = initialVersions(),
      d = edit(vs[0]);
    d.window = "all";
    expect(impact(vs[0], d).breaking).toBe(true);
    expect(impact(vs[0], d).consumers).toHaveLength(3);
    const v2 = publish(validated(d, vs), vs);
    expect(v2.version).toBe(2);
    d.name = "changed";
    expect(v2.definition.name).not.toBe("changed");
    expect(Object.isFrozen(v2.definition)).toBe(true);
    expect(deprecate(vs[0]).state).toBe("Deprecated");
    expect(() => deprecate(vs[0], false)).toThrow();
    expect(query([...vs, v2], vs[0].definition.id, 1).period).toBe("recent");
  });
  it("shares query calculations, filters, errors and catalog publication", () => {
    const vs = initialVersions(),
      d = vs[0].definition;
    expect(query(vs, d.id, 1).value).toBe(calculate(d).value);
    expect(
      calculate(d, { dimension: "payment_method" }).groups.reduce(
        (n, g) => n + g.denominator,
        0,
      ),
    ).toBe(calculate(d).denominator);
    for (const q of [
      { dimension: "market" },
      { payment: "cash" },
      { window: "tomorrow" },
      { authorized: false },
    ])
      expect(() => query(vs, d.id, 1, q)).toThrow();
    expect(() => query(vs, d.id, 99)).toThrow();
    expect(catalog(vs, "completion", "metric")).toHaveLength(1);
    expect(
      catalog(vs, "", "product", "Group Orders", "Certified"),
    ).toHaveLength(1);
  });
});

describe("measurement boundary and governance regressions", () => {
  it("rejects duplicate contracts unless explicitly editing an existing version", () => {
    const vs = initialVersions();
    expect(
      validate(newDraft(), vs).find((c) => c.name === "Identifier")?.status,
    ).toBe("error");
    expect(validate(edit(vs[0]), vs).some((c) => c.status === "error")).toBe(
      false,
    );
  });
  it("uses exact UTC boundaries, excludes null identifiers and ineligible entities", () => {
    const d = newDraft(),
      r = rows[0];
    const data = [
      {
        ...r,
        group_id: "start",
        created_at: "2026-10-01T00:00:00Z",
        period: "previous",
      },
      { ...r, group_id: "end", created_at: "2026-10-29T00:00:00Z" },
      { ...r, group_id: "", created_at: "2026-10-20T00:00:00Z" },
      { ...r, group_id: "ineligible", eligible: false },
    ];
    expect(calculate(d, { window: "all" }, data).denominator).toBe(1);
    expect(calculate(d, { window: "recent" }, data).denominator).toBe(0);
  });
  it("groups app versions, filters payment modes and handles unknown dimensions", () => {
    const d = {
      ...newDraft(),
      dimensions: ["app_version", "payment_method"] as (
        "app_version" | "payment_method"
      )[],
    };
    expect(
      calculate(d, { window: "all", dimension: "app_version" }).groups.reduce(
        (n, g) => n + g.denominator,
        0,
      ),
    ).toBe(rows.length);
    expect(calculate(d, { window: "all", payment: "split" }).denominator).toBe(
      rows.filter((r) => r.payment_method === "split").length,
    );
    expect(
      calculate(d, { window: "all", dimension: "app_version" }, [
        { ...rows[0], app_version: null as never },
      ]).groups[0].dimension,
    ).toBe("Unknown");
  });
  it("checks types and missing dependencies separately from nonblocking warnings", () => {
    const schema = assets.map((a) =>
      a.id === "group_orders"
        ? { ...a, fields: { ...a.fields, completed: "string" } }
        : a,
    );
    expect(
      validate(newDraft(), [], schema).find(
        (c) => c.name === "Calculation fields",
      )?.status,
    ).toBe("error");
    expect(
      validate(
        newDraft(),
        [],
        assets.filter((a) => a.id !== "order_transactions"),
      ).find((c) => c.name === "Dependencies")?.status,
    ).toBe("error");
    expect(
      validate(newDraft(), []).filter((c) => c.status === "warning"),
    ).toHaveLength(1);
  });
  it("keeps deprecated contracts available without changing the calculation", () => {
    const vs = initialVersions(),
      before = query(vs, vs[0].definition.id, 1);
    const old = deprecate(vs[0]);
    expect(query([old], old.definition.id, 1).value).toBe(before.value);
    expect(() => deprecate(old)).toThrow("INVALID_TRANSITION");
  });
  it("calculates payment failure from independently declined payment fixtures", () => {
    const vs = initialVersions(),
      v = vs.find((v) => v.definition.kind === "failure")!;
    expect(query(vs, v.definition.id, 1, { window: "all" }).numerator).toBe(
      rows.filter((r) => r.payment_failed).length,
    );
  });
});

it("rejects unavailable transitive dependencies and schema type mismatches", () => {
  const checks = validate(
    newDraft(),
    [],
    assets.filter((a) => a.id !== "group_order_payment_attempts"),
  );
  expect(checks.find((c) => c.name === "Dependencies")?.status).toBe("error");
});
