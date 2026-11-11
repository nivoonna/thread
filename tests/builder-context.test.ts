import { describe, it, expect } from "vitest";
import {
  initialVersions,
  preferredVersion,
  edit,
  validated,
  publish,
  deprecate,
  catalog,
  query,
  consumerResults,
  impact,
} from "../src/builder/domain";
import { investigationFilters } from "../src/builder/investigation";

describe("one metric context across discovery, consumption and investigation", () => {
  it("prefers the newest active version even when a newer version is deprecated", () => {
    const versions = initialVersions(),
      v1 = versions[0],
      v2 = publish(validated(edit(v1), versions), versions);
    const history = [deprecate(v2), ...versions];
    expect(preferredVersion(history, v1.definition.id)).toBe(v1);
    expect(
      catalog(history, "", "metric").find((a) => a.id === v1.definition.id)
        ?.status,
    ).toBe("Certified");
    expect(
      preferredVersion([deprecate(v1), deprecate(v2)], v1.definition.id)
        ?.version,
    ).toBe(2);
    expect(catalog([deprecate(v1)], "", "metric")[0].status).toBe("Deprecated");
    expect(query(history, v1.definition.id, 2).lifecycle).toBe("Deprecated");
  });
  it("filters consumers by metric and uses matching cohort filters without upgrading their pins", () => {
    const versions = initialVersions(),
      v1 = versions[0],
      d = edit(v1);
    d.window = "all";
    const v2 = publish(validated(d, versions), versions),
      history = [...versions, v2],
      cohort = { window: "previous", payment: "single" } as const;
    const results = consumerResults(history, v1.definition.id, cohort);
    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.consumer.version).toBe(1);
      expect(result.response?.version).toBe(1);
      expect(result.response?.period).toBe("previous");
      expect(result.response?.value).toBe(
        query(history, v1.definition.id, 1, cohort).value,
      );
    }
    expect(consumerResults(history, "payment_failure_rate", cohort)).toEqual(
      [],
    );
    expect(consumerResults(history, "new_metric", cohort)).toEqual([]);
    expect(consumerResults([], v1.definition.id, cohort)[0].error).toBe(
      "METRIC_VERSION_NOT_FOUND",
    );
  });
  it("maps the query cohort exactly while leaving replay state outside the filter bridge", () => {
    expect(
      investigationFilters({ window: "previous", payment: "single" }),
    ).toEqual({
      size: "all",
      outcome: "all",
      period: "previous",
      payment: "single",
    });
    expect(investigationFilters({ window: "all", payment: "split" })).toEqual({
      size: "all",
      outcome: "all",
      period: "all",
      payment: "split",
    });
  });
  it("treats added dimensions as compatible and removed dimensions or changed periods as potentially breaking", () => {
    const v = initialVersions()[0],
      d = edit(v);
    d.dimensions.push("app_version");
    expect(impact(v, d)).toMatchObject({
      changed: ["dimensions"],
      breaking: false,
    });
    d.dimensions = [];
    expect(impact(v, d).breaking).toBe(true);
    d.dimensions = [...v.definition.dimensions];
    d.window = "all";
    expect(impact(v, d).breaking).toBe(true);
  });
});
