import { describe, expect, it } from "vitest";
import {
  db,
  metrics,
  selectGroups,
  FOCUS_FILTERS,
  funnel,
  stageGroups,
} from "../src/data";
import {
  snapshot,
  participantStatus,
  connectedEvidence,
  joinedParticipants,
} from "../src/replay";
import { investigate } from "../src/investigator";
const group = db.groups.find((g) => g.id === "GO-1042")!;
const at = (seconds: number) => Date.parse(group.createdAt) + seconds * 1000;
describe("Shared journey evidence", () => {
  it("conserves funnels across every filter dimension and reporting period", () => {
    for (const size of ["all", "small", "large"] as const)
      for (const payment of ["all", "single", "split"] as const)
        for (const outcome of ["all", "completed", "abandoned"] as const)
          for (const period of ["recent", "previous", "all"] as const) {
            const groups = selectGroups({ size, payment, outcome, period });
            const steps = funnel(groups);
            expect(steps[6].count).toBe(metrics(groups).confirmed);
            for (const step of steps) {
              expect(stageGroups(groups, step.index, "reached")).toHaveLength(
                step.count,
              );
              expect(stageGroups(groups, step.index, "abandoned")).toHaveLength(
                step.drop,
              );
            }
          }
  });
  it("preserves the aggregate denominators and curated coverage only", () => {
    expect(metrics(selectGroups(FOCUS_FILTERS))).toEqual({
      total: 296,
      confirmed: 111,
      rate: (111 / 296) * 100,
    });
    expect(
      metrics(selectGroups({ ...FOCUS_FILTERS, period: "previous" })).confirmed,
    ).toBe(191);
    expect(selectGroups({ ...FOCUS_FILTERS, period: "previous" })).toHaveLength(
      269,
    );
    expect(
      selectGroups(FOCUS_FILTERS).filter((g) => g.outcome === "payment_failed"),
    ).toHaveLength(68);
    const groups = db.groups.filter((g) =>
      g.sessionIds.some((id) => db.sessions.find((s) => s.id === id)?.detailed),
    );
    expect(groups).toHaveLength(5);
    for (const g of groups)
      for (const id of g.sessionIds) {
        const s = db.sessions.find((s) => s.id === id)!;
        expect(s.detailed).toBe(true);
        expect(s.events.length).toBeGreaterThan(3);
        expect(new Set(s.events.map((e) => e.id)).size).toBe(s.events.length);
        for (const e of s.events.filter((e) => e.kind === "Backend"))
          expect(e.rendered).toBe(false);
        const payment = db.payments.find(
          (p) => p.participantId === s.participantId,
        )!;
        if (payment.result !== "not_attempted") {
          expect(
            s.events.some(
              (e) =>
                e.kind === "Backend" &&
                e.at === payment.at &&
                /authoriz/i.test(e.label),
            ),
          ).toBe(true);
        }
      }
  });
  it("aligns distinct participant experiences, payment and order records at one time", () => {
    const sessions = db.sessions.filter((s) => s.groupId === group.id);
    expect(snapshot(sessions[1], at(98)).screen?.screen).toBe("failed");
    expect(snapshot(sessions[0], at(100)).screen?.screen).toBe("loading");
    expect(snapshot(sessions[0], at(102)).screen?.screen).toBe("waiting");
    expect(snapshot(sessions[1], at(102)).screen?.screen).toBe("failed");
    expect(participantStatus(sessions[2], at(102))).toBe("Share authorized");
    expect(participantStatus(sessions[4], at(102))).toBe(
      "Payment not authorized",
    );
    expect(db.orders.find((o) => o.groupId === group.id)?.status).toBe(
      "incomplete",
    );
    expect(snapshot(sessions[1], at(29)).boundary).toBe(
      "Session has not started.",
    );
    expect(snapshot(sessions[2], at(140)).boundary).toBe(
      "Session ended; last recorded state shown.",
    );
    expect(
      snapshot(
        {
          ...sessions[1],
          events: sessions[1].events.map((e) => ({ ...e, rendered: false })),
        },
        at(90),
      ).boundary,
    ).toBe("No recorded screen at this time.");
    expect(joinedParticipants(group, at(12))).toHaveLength(1);
    expect(joinedParticipants(group, at(25))).toHaveLength(2);
    expect(joinedParticipants(group, at(40))).toHaveLength(5);
    const chain = connectedEvidence(group);
    expect(
      chain.find((r) => r.event.label === "Authorization declined")?.payment.at,
    ).toBe(new Date(at(98)).toISOString());
    expect(
      chain.find((r) => r.event.label === "Submission blocked")?.session.id,
    ).toBe("S-1042-0");
    expect(chain.some((r) => r.event.label === "Order confirmed")).toBe(false);
  });
  it("links brief evidence to exact records with explicit scope and uncertainty", () => {
    for (const q of [0, 1, 2]) {
      const f = investigate(
        FOCUS_FILTERS,
        q,
        group.id,
        "http://localhost/thread/",
      );
      expect(f.business).toContain("111/296");
      expect(f.brief).toContain("Oct 15–28, 2026");
      expect(f.brief).toContain("P-1042-4");
      const links = f.brief.match(/http[^\s]+/g) || [];
      expect(links.length).toBeGreaterThanOrEqual(8);
      for (const link of links) {
        const params = new URLSearchParams(new URL(link).hash.slice(1));
        if (params.get("page") === "studio") {
          const s = db.sessions.find((s) => s.id === params.get("session"))!;
          const e = s.events.find((e) => e.id === params.get("record"))!;
          expect(Date.parse(e.at)).toBe(Number(params.get("moment")));
        }
      }
    }
    expect(investigate(FOCUS_FILTERS, 0, group.id).uncertain).toContain(
      "whether different messaging",
    );
    expect(investigate(FOCUS_FILTERS, 0, "GO-1186").possible).not.toContain(
      "Inconsistent payment status",
    );
  });
});
