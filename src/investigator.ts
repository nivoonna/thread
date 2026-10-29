import {
  db,
  selectGroups,
  metrics,
  funnel,
  detailedSessions,
  filterLabel,
  pct,
  SEGMENTS,
  OUTCOME_LABEL,
  type Filters,
  type Group,
  type Outcome,
} from "./data";
export const QUESTIONS = [
  "Why is Group Order completion declining?",
  "Which customer segments are most affected?",
  "What evidence connects checkout friction to failed transactions?",
];
export interface Evidence {
  label: string;
  type: "funnel" | "comparison" | "session" | "business";
  stage?: number;
  sessionId?: string;
  eventId?: string;
  groupId?: string;
}
export interface Finding {
  observed: string;
  possible: string;
  uncertain: string;
  next: string;
  evidence: Evidence[];
  trace: { label: string; result: string }[];
  brief: string;
}
export function investigate(
  filters: Filters,
  question: number,
  activeGroupId: string,
): Finding {
  const groups = selectGroups(filters),
    current = metrics(groups),
    previous = metrics(selectGroups({ ...filters, period: "previous" })),
    steps = funnel(groups);
  const bottleneck = steps
    .slice(0, 6)
    .reduce((a, b) => (a.drop >= b.drop ? a : b));
  const failures = groups.filter((g) => g.outcome !== "confirmed");
  const causes = (
    [
      "payment_failed",
      "deadline_expired",
      "checkout_confusion",
      "left_early",
    ] as Outcome[]
  )
    .map((outcome) => ({
      outcome,
      count: failures.filter((g) => g.outcome === outcome).length,
    }))
    .sort((a, b) => b.count - a.count);
  const leader = causes[0];
  const comparisons = SEGMENTS.slice(0, 5)
    .map((s) => ({
      label: s.label,
      ...metrics(selectGroups({ ...filters, ...s.filter })),
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => a.rate - b.rate);
  const samples = detailedSessions(groups);
  const preferred =
    samples.find(
      (s) =>
        s.groupId === activeGroupId &&
        s.events.some(
          (e) => e.kind === "Backend" && e.label === "Authorization declined",
        ),
    ) ||
    samples.find((s) => s.groupId === activeGroupId) ||
    samples[0];
  const selected = db.groups.find((g) => g.id === preferred?.groupId);
  const backend =
    preferred?.events.find((e) => e.label === "Authorization declined") ||
    preferred?.events.find(
      (e) =>
        e.label === "Order confirmed" ||
        e.label === "Group deadline expires" ||
        e.label === "Leave checkout",
    ) ||
    preferred?.events.find((e) => e.kind === "Backend");
  const evidence: Evidence[] = [
    {
      label: `${bottleneck.label} → ${steps[bottleneck.index + 1].label}`,
      type: "funnel",
      stage: bottleneck.index,
    },
    { label: "Compare affected segments", type: "comparison" },
  ];
  if (preferred)
    evidence.push({
      label: `${preferred.id} · view replay`,
      type: "session",
      sessionId: preferred.id,
      groupId: preferred.groupId,
    });
  if (backend && preferred)
    evidence.push({
      label: backend.label,
      type: "business",
      sessionId: preferred.id,
      eventId: backend.id,
      groupId: preferred.groupId,
    });
  const delta = current.rate - previous.rate;
  const change = `${Math.abs(delta).toFixed(1)} percentage points ${delta < 0 ? "below" : "above"}`;
  let observed = `${current.confirmed} of ${current.total} groups completed (${pct(current.rate)}). ${filters.period === "recent" ? `That is ${change} the previous period (${pct(previous.rate)}). ` : ""}${bottleneck.drop} groups stopped between ${bottleneck.label.toLowerCase()} and ${steps[bottleneck.index + 1].label.toLowerCase()}.`;
  let possible = leader.count
    ? `${OUTCOME_LABEL[leader.outcome]} is the most frequent recorded outcome among non-completing groups (${leader.count} of ${failures.length}). It is a candidate contributor, not an explanation for every abandonment.`
    : "No abandoned groups occur in this selection. Broaden the segment to investigate drop-off.";
  let uncertain =
    "These are observational associations. Release timing, group composition, and experiment assignment do not establish causation. Curated replays are illustrative, not a representative sample.";
  let next =
    leader.outcome === "payment_failed"
      ? "Validate issuer decline codes and retry recovery across both experiment variants before changing checkout."
      : leader.outcome === "deadline_expired"
        ? "Compare time remaining at checkout and test a clearer shared deadline."
        : "Review additional checkout sessions and validate intent with customer research.";
  if (question === 1 && comparisons.length) {
    const low = comparisons[0];
    observed = `${low.label} has the lowest completion among the comparison cohorts: ${pct(low.rate)} (${low.confirmed}/${low.total}). Active selection: ${pct(current.rate)} from ${current.total} groups.`;
    possible = `Compare group size and payment responsibility separately to isolate the association. Cohorts overlap; their counts must not be added together.`;
    next =
      "Compare large split-payment groups with small groups, then inspect both successful and abandoned transactions.";
  }
  if (question === 2) {
    const paymentFailures = causes.find(
      (c) => c.outcome === "payment_failed",
    )!.count;
    observed = `${paymentFailures} selected groups have a recorded authorization failure; ${causes.find((c) => c.outcome === "checkout_confusion")!.count} ended after repeated checkout interactions without a submission. ${selected ? `${selected.id}: ${OUTCOME_LABEL[selected.outcome].toLowerCase()}.` : "No detailed replay is available for this cohort."}`;
    possible =
      selected?.outcome === "payment_failed"
        ? "The linked participant session records a declined authorization while the host waits. This supports a failed-payment pathway for this group; the tap itself is not a confirmed order."
        : "Interaction friction and backend failure are different evidence types. Use the linked outcome to determine whether a transaction was submitted or confirmed.";
    uncertain =
      "Repeated taps do not prove confusion, and absence of a confirmation does not identify the cause. These records cannot establish why a customer left.";
    next =
      "Inspect the linked participant and backend event, then compare recovery with a successful group.";
  }
  if (groups.length && !failures.length) {
    next =
      "Expand the selection to include abandoned groups before investigating decline.";
  }
  if (!groups.length) {
    observed = "No Group Orders match the active selection.";
    possible = "There is no evidence to form a hypothesis.";
    uncertain =
      "No metrics or causal conclusions can be drawn from an empty cohort.";
    next = "Broaden the filters or choose a different period.";
    evidence.length = 0;
  }
  const trace = [
    {
      label: "Read selected metric",
      result: `${current.confirmed}/${current.total} confirmed`,
    },
    {
      label: "Compare segments",
      result: `${comparisons.length} cohorts calculated`,
    },
    {
      label: "Locate funnel drop-off",
      result: `${bottleneck.drop} after ${bottleneck.label.toLowerCase()}`,
    },
    {
      label: "Retrieve linked sessions",
      result: `${samples.length} detailed sessions`,
    },
    {
      label: "Examine business outcomes",
      result: `${failures.length} incomplete groups`,
    },
    {
      label: "Summarize evidence",
      result: "Observations separated from hypotheses",
    },
  ];
  const brief = `THREAD · Investigation brief\nSynthetic data · ${filterLabel(filters)} · ${filters.period} period\n\nProblem\n${observed}\n\nAffected segment\n${filterLabel(filters)} (${current.total} groups)\n\nEvidence\n${evidence.map((e) => e.label).join("\n") || "No matching records"}\n\nLeading hypothesis\n${possible}\n\nUnknowns\n${uncertain}\n\nSuggested next step\n${next}`;
  return { observed, possible, uncertain, next, evidence, trace, brief };
}
export function outcomeCounts(groups: Group[]) {
  return Object.entries(OUTCOME_LABEL).map(([key, label]) => ({
    key,
    label,
    count: groups.filter((g) => g.outcome === key).length,
  }));
}
