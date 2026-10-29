import { describe, it, expect } from "vitest";
import {
  db,
  generateData,
  selectGroups,
  metrics,
  funnel,
  stageGroups,
  detailedSessions,
  DEFAULT_FILTERS,
  FOCUS_FILTERS,
  STAGES,
} from "../src/data";
import { investigate } from "../src/investigator";
describe("Seeded business data", () => {
  it("is reproducible and keeps every relationship intact", () => {
    expect(generateData()).toEqual(db);
    expect(db.groups).toHaveLength(1500);
    expect(new Set(db.groups.map((g) => g.id)).size).toBe(1500);
    for (const g of db.groups) {
      expect(g.participantIds).toHaveLength(g.size);
      expect(db.orders.find((o) => o.id === g.orderId)?.groupId).toBe(g.id);
      for (const id of g.sessionIds) {
        const s = db.sessions.find((s) => s.id === id)!;
        expect(s.groupId).toBe(g.id);
        expect(
          db.participants.find((p) => p.id === s.participantId)?.groupId,
        ).toBe(g.id);
      }
      for (const p of db.payments.filter((p) => p.groupId === g.id)) {
        expect(g.participantIds).toContain(p.participantId);
        expect(p.orderId).toBe(g.orderId);
      }
    }
  });
  it("counts groups once and conserves every funnel transition", () => {
    for (const size of ["all", "small", "large"] as const)
      for (const payment of ["all", "split", "single"] as const) {
        const groups = selectGroups({ ...DEFAULT_FILTERS, size, payment });
        const f = funnel(groups);
        expect(f[0].count).toBe(groups.length);
        expect(f[6].count).toBe(metrics(groups).confirmed);
        for (let i = 0; i < 6; i++) {
          expect(f[i].count - f[i].drop).toBe(f[i + 1].count);
          expect(stageGroups(groups, i, "abandoned")).toHaveLength(f[i].drop);
          expect(f[i].rate).toBeGreaterThanOrEqual(f[i + 1].rate);
        }
      }
  });
  it("has complete non-overlapping size, payment, outcome and period partitions", () => {
    const all = selectGroups({ ...DEFAULT_FILTERS, period: "all" });
    expect(
      selectGroups(DEFAULT_FILTERS).length +
        selectGroups({ ...DEFAULT_FILTERS, period: "previous" }).length,
    ).toBe(all.length);
    for (const [key, values] of [
      ["size", ["small", "large"]],
      ["payment", ["single", "split"]],
      ["outcome", ["completed", "abandoned"]],
    ] as const) {
      const a = selectGroups({ ...DEFAULT_FILTERS, [key]: values[0] }),
        b = selectGroups({ ...DEFAULT_FILTERS, [key]: values[1] });
      expect(a.length + b.length).toBe(selectGroups(DEFAULT_FILTERS).length);
      expect(a.some((g) => b.includes(g))).toBe(false);
    }
  });
  it("shows the seeded decline without assuming all abandonments have one cause", () => {
    const current = selectGroups(FOCUS_FILTERS),
      previous = selectGroups({ ...FOCUS_FILTERS, period: "previous" });
    expect(metrics(previous).rate - metrics(current).rate).toBeGreaterThan(20);
    expect(
      new Set(
        current.filter((g) => g.outcome !== "confirmed").map((g) => g.outcome),
      ).size,
    ).toBe(4);
  });
  it("connects six detailed sessions to truthful business outcomes", () => {
    expect(db.sessions.filter((s) => s.detailed)).toHaveLength(6);
    for (const s of db.sessions.filter((s) => s.detailed)) {
      const g = db.groups.find((g) => g.id === s.groupId)!;
      const order = db.orders.find((o) => o.id === g.orderId)!;
      const stamps = s.events.map((e) => Date.parse(e.at));
      expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
      if (g.outcome === "confirmed") {
        expect(s.events.at(-1)?.screen).toBe("success");
        expect(order.confirmedAt).toBe(s.events.at(-1)?.at);
      } else expect(order.confirmedAt).toBeUndefined();
    }
    const failed = db.sessions.filter(
      (s) => s.groupId === "GO-1042" && s.detailed,
    );
    expect(failed).toHaveLength(2);
    const decline = failed[1].events.find(
      (e) => e.label === "Authorization declined",
    )!;
    expect(
      db.payments.find((p) => p.participantId === failed[1].participantId)?.at,
    ).toBe(decline.at);
    expect(failed[0].events.some((e) => e.label === "Tap Place order")).toBe(
      true,
    );
    expect(db.groups.find((g) => g.id === "GO-1042")?.stageEvents).toHaveLength(
      6,
    );
  });
  it("handles empty and terminal-stage cohorts", () => {
    expect(metrics([])).toEqual({ total: 0, confirmed: 0, rate: 0 });
    expect(funnel([])).toHaveLength(STAGES.length);
    expect(funnel([]).every((s) => s.rate === 0 && s.count === 0)).toBe(true);
    expect(stageGroups(db.groups, 6, "abandoned")).toHaveLength(0);
    expect(
      detailedSessions(selectGroups({ ...FOCUS_FILTERS, period: "previous" })),
    ).toHaveLength(0);
  });
});
describe("Evidence investigator", () => {
  it("derives findings from filters and only cites matching evidence", () => {
    const a = investigate(FOCUS_FILTERS, 0, "GO-1042"),
      b = investigate(
        { ...DEFAULT_FILTERS, size: "small", payment: "single" },
        0,
        "GO-1042",
      );
    expect(a.observed).not.toBe(b.observed);
    expect(a.brief).toContain("4+ participants · Split payment");
    const m = metrics(selectGroups(FOCUS_FILTERS));
    expect(a.observed).toContain(`${m.confirmed} of ${m.total}`);
    for (const e of a.evidence) {
      if (e.groupId)
        expect(selectGroups(FOCUS_FILTERS).map((g) => g.id)).toContain(
          e.groupId,
        );
      if (e.eventId)
        expect(
          db.sessions
            .find((s) => s.id === e.sessionId)
            ?.events.map((e) => e.id),
        ).toContain(e.eventId);
    }
    expect(
      a.evidence.some(
        (e) => e.sessionId === "S-1042-1" && e.type === "business",
      ),
    ).toBe(true);
  });
  it("supports three distinct grounded questions and honest missing replays", () => {
    const results = [0, 1, 2].map((q) =>
      investigate(FOCUS_FILTERS, q, "GO-1042"),
    );
    expect(new Set(results.map((r) => r.observed)).size).toBe(3);
    for (const r of results) {
      expect(r.trace).toHaveLength(6);
      expect(r.uncertain.length).toBeGreaterThan(20);
      expect(r.brief).toContain("Synthetic data");
    }
    const prior = investigate(
      { ...FOCUS_FILTERS, period: "previous" },
      2,
      "GO-1042",
    );
    expect(prior.evidence.some((e) => e.sessionId)).toBe(false);
    expect(prior.observed).toContain("No detailed replay");
  });
});
