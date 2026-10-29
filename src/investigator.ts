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
  PERIOD_LABEL,
  type Filters,
  type Group,
  type Outcome,
} from "./data";
import { decisionBrief, type DecisionBrief } from "./decisionBrief";
import { snapshot, utc } from "./replay";
export const QUESTIONS = [
  "What happened in this shared order?",
  "Which customer segments are most affected?",
  "What should we validate before changing checkout?",
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
  business: string;
  possible: string;
  uncertain: string;
  next: string;
  evidence: Evidence[];
  trace: { label: string; result: string }[];
  brief: string;
  briefDocument: DecisionBrief;
}
export function investigate(
  filters: Filters,
  question: number,
  activeGroupId: string,
  baseUrl = "https://nivoonna.github.io/thread/",
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
  const comparisons = SEGMENTS.slice(0, 6)
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
  const order = db.orders.find((o) => o.groupId === selected?.id);
  const people = db.participants.filter((p) => p.groupId === selected?.id);
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
      eventId:
        preferred.events.find((e) => e.label === "Authorization declined")
          ?.id || preferred.events[0].id,
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
  const participants = people
    .map((p) => `${p.name} (${p.role}, ${p.id})`)
    .join(", ");
  const linked = selected
    ? db.sessions.filter((s) => s.groupId === selected.id && s.detailed)
    : [];
  const block = linked
    .flatMap((s) => s.events)
    .find((e) => e.label === "Submission blocked");
  const decline = linked
    .flatMap((s) => s.events)
    .find((e) => e.label === "Authorization declined");
  const host = linked.find(
    (s) =>
      db.participants.find((p) => p.id === s.participantId)?.role === "Host",
  );
  const payer = linked.find((s) => s.events.some((e) => e.id === decline?.id));
  const mismatch =
    block &&
    host &&
    payer &&
    snapshot(host, Date.parse(block.at)).screen?.screen === "waiting" &&
    snapshot(host, Date.parse(block.at)).screen?.pendingParticipantId ===
      payer.participantId &&
    snapshot(payer, Date.parse(block.at)).screen?.screen === "failed";
  const caseObservation = selected
    ? `${selected.id}: ${selected.size} participants, ${selected.paymentType} payment. ${mismatch ? `At ${utc(block!.at)}, the participant’s recorded screen shows a decline while the host’s recorded screen shows pending payment. Authorization declined at ${utc(decline!.at)}; checkout was blocked at ${utc(block!.at)}.` : `Linked records show ${OUTCOME_LABEL[selected.outcome].toLowerCase()}. Review individual screens separately from business responses.`}`
    : "No detailed replay is available for this cohort.";
  const statuses = selected
    ? people
        .map((person) => {
          const payment = db.payments.find(
            (p) => p.participantId === person.id,
          )!;
          return `${person.name}: ${payment.result.replaceAll("_", " ")}${payment.at ? ` at ${utc(payment.at)}` : ""}`;
        })
        .join("; ")
    : "";
  const business = `${selected ? `${selected.id} / ${order?.id}: final status ${order?.status.replaceAll("_", " ")}. ${order?.confirmedAt ? `Confirmed ${utc(order.confirmedAt)}.` : "No order confirmation recorded."} ` : ""}Final participant payment records: ${statuses || "No detailed case selected"}. Comparable cohort: ${current.confirmed}/${current.total} confirmed (${pct(current.rate)}), ${failures.length} non-completing; ${causes.find((c) => c.outcome === "payment_failed")!.count} recorded authorization failures. ${filters.period === "recent" ? `Previous period: ${previous.confirmed}/${previous.total} (${pct(previous.rate)}).` : ""} ${new Set(samples.map((s) => s.groupId)).size} curated orders have authored replays. Failure counts do not measure messaging mismatch prevalence.`;
  if (question === 0) observed = `${caseObservation} ${observed}`;
  if (selected && question === 0 && !mismatch) {
    if (selected.outcome === "confirmed") {
      possible =
        "This order is a successful counterexample. It does not establish why comparable orders failed.";
      next =
        "Compare payment authorizations, timing and participant coordination with an incomplete order before prioritizing a change.";
    } else if (selected.outcome === "deadline_expired") {
      possible =
        "Coordination or insufficient time may have contributed; the records show deadline expiry without a submission, not an authorization decline.";
      next =
        "Validate time remaining, invitation-to-join delays and payment readiness against completed orders before testing deadline reminders.";
    } else if (selected.outcome === "checkout_confusion") {
      possible =
        "Repeated visits to the payment explanation may indicate uncertainty. The recordings cannot establish intent or motivation.";
      next =
        "Review comparable completed sessions and validate understanding with customer research before changing the payment explanation.";
    }
  }
  if (mismatch && question !== 1) {
    possible =
      "Inconsistent payment status may make recovery harder in this order. The observed mismatch does not establish the cause of the aggregate decline.";
    uncertain =
      "We do not know whether different messaging or a retry path would recover this order. Decline reasons, retry attempts, recovery rates and comparable successful cases need validation. Curated authored replays are not a representative sample; release timing and experiment assignment do not establish causation.";
    next =
      "Investigate issuer decline reasons, retries and recovery rates across experiment variants before changing checkout messaging or recovery behavior. Validate a recovery hypothesis with a controlled experiment; measure confirmed orders after a decline and guard against duplicate charges or orders.";
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
  const briefDocument = decisionBrief({
    filters,
    question: QUESTIONS[question],
    questionIndex: question,
    selected,
    baseUrl,
    observed,
    next,
    evidence,
  });
  return {
    observed,
    business,
    possible,
    uncertain,
    next,
    evidence,
    trace,
    brief: briefDocument.text,
    briefDocument,
  };
}
export function outcomeCounts(groups: Group[]) {
  return Object.entries(OUTCOME_LABEL).map(([key, label]) => ({
    key,
    label,
    count: groups.filter((g) => g.outcome === key).length,
  }));
}
