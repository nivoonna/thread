import { describe, it, expect } from "vitest";
import { db, FOCUS_FILTERS, DEFAULT_FILTERS, selectGroups } from "../src/data";
import {
  groupPlayback,
  snapshot,
  connectedEvidence,
  journeyEnd,
} from "../src/replay";
import { investigate } from "../src/investigator";
const group = db.groups.find((g) => g.id === "GO-1042")!;
describe("Whole group autoplay", () => {
  it("covers every participant and recorded event in time order, then ends at the shared outcome", () => {
    const steps = groupPlayback(group);
    expect(new Set(steps.map((s) => s.sessionId))).toEqual(
      new Set(group.sessionIds),
    );
    expect(steps[0].at).toBe(Date.parse(group.createdAt));
    expect(steps.at(-1)?.at).toBe(journeyEnd(group));
    expect(steps.at(-1)?.sessionId).toBe("S-1042-0");
    const times = steps.map((s) => s.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    for (const r of connectedEvidence(group).filter(
      (r) => !r.event.id.endsWith("-render"),
    )) {
      expect(
        steps.some(
          (s) => s.eventId === r.event.id && s.at === Date.parse(r.event.at),
        ),
      ).toBe(true);
    }
    for (const step of steps) {
      const session = db.sessions.find((s) => s.id === step.sessionId)!;
      expect(session.groupId).toBe(group.id);
      expect(snapshot(session, step.at).screen).toBeDefined();
      expect(
        session.events.some(
          (e) => e.id === step.eventId && Date.parse(e.at) <= step.at,
        ),
      ).toBe(true);
    }
    const blocked = steps.findIndex((s) => s.eventId === "S-1042-0-e102");
    expect(steps[blocked + 1].at).toBe(steps[blocked].at);
    expect(steps[blocked + 1].sessionId).toBe("S-1042-1");
    expect(
      snapshot(
        db.sessions.find((s) => s.id === steps[blocked + 1].sessionId)!,
        steps[blocked + 1].at,
      ).screen?.screen,
    ).toBe("failed");
  });
});
describe("PM decision brief", () => {
  it("separates an investment decision, unresolved group readiness and unmeasured recovery", () => {
    const finding = investigate(FOCUS_FILTERS, 0, group.id);
    const { brief, briefDocument } = finding;
    expect(briefDocument.sections).toHaveLength(5);
    let previous = -1;
    for (const section of briefDocument.sections) {
      const start = brief.indexOf(section.title);
      expect(start).toBeGreaterThan(previous);
      previous = start;
      for (const text of [...section.paragraphs, ...(section.points || [])])
        expect(brief).toContain(text);
    }
    const chronology = briefDocument.sections[0].points!;
    expect(chronology[0]).toContain("12:31:38 UTC");
    expect(chronology[1]).toContain("12:31:40 UTC");
    expect(chronology[2]).toContain("12:31:42 UTC");
    expect(brief).toContain("Jo also has no recorded payment attempt");
    expect(brief).toContain("68/296");
    expect(brief).toContain("68/185");
    expect(brief).toContain("This baseline is unavailable");
    expect(brief).toContain("group level");
    expect(brief).toContain("duplicate charges or orders");
    expect(brief).toContain("not a matched control");
    expect(brief).toContain(
      "expected uplift and revenue impact are not estimated",
    );
    expect(brief).toContain("Payments + Data");
  });
  it("keeps counterexamples inside the cohort and adapts recommendations to other outcomes", () => {
    for (const filters of [
      FOCUS_FILTERS,
      { ...FOCUS_FILTERS, outcome: "abandoned" as const },
      {
        ...DEFAULT_FILTERS,
        size: "small" as const,
        payment: "single" as const,
      },
    ]) {
      const f = investigate(
        filters,
        0,
        filters.size === "small" ? "GO-1234" : group.id,
      );
      for (const link of f.brief.match(/https[^\s]+/g)!) {
        const p = new URLSearchParams(new URL(link).hash.slice(1));
        if (p.get("page") === "studio") {
          const s = db.sessions.find((s) => s.id === p.get("session"))!;
          expect(selectGroups(filters).some((g) => g.id === s.groupId)).toBe(
            true,
          );
        }
      }
    }
    const completed = investigate(
      { ...FOCUS_FILTERS, outcome: "completed" },
      0,
      "GO-1186",
    ).brief;
    expect(completed).not.toContain("0/0");
    expect(completed).toContain("111/111");
    expect(investigate(FOCUS_FILTERS, 0, "GO-1096").brief).toContain(
      "coordination and time-to-readiness",
    );
    expect(investigate(FOCUS_FILTERS, 0, "GO-1186").brief).toContain(
      "completed order as a counterexample",
    );
  });
});
