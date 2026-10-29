import {
  db,
  selectGroups,
  metrics,
  detailedSessions,
  filterLabel,
  PERIOD_LABEL,
  pct,
  type Filters,
  type Group,
} from "./data";
import { journeyEnd, snapshot, utc } from "./replay";
import type { Evidence } from "./investigator";

interface Input {
  filters: Filters;
  question: string;
  selected?: Group;
  baseUrl: string;
  observed: string;
  business: string;
  possible: string;
  uncertain: string;
  next: string;
  evidence: Evidence[];
}
/** A decision memo, with proposed validation work distinguished from measured facts. */
export function decisionBrief(input: Input) {
  const {
    filters,
    selected,
    baseUrl,
    observed,
    possible,
    uncertain,
    next,
    evidence,
  } = input;
  const groups = selectGroups(filters),
    current = metrics(groups);
  const failures = groups.filter((g) => g.outcome !== "confirmed");
  const paymentFailures = groups.filter(
    (g) => g.outcome === "payment_failed",
  ).length;
  const sessions = selected ? detailedSessions([selected]) : [];
  const payments = db.payments.filter((p) => p.groupId === selected?.id);
  const block = sessions
    .flatMap((s) => s.events)
    .find((e) => e.label === "Submission blocked");
  const at = block ? Date.parse(block.at) : selected ? journeyEnd(selected) : 0;
  const order = db.orders.find((o) => o.groupId === selected?.id);
  const previous = metrics(selectGroups({ ...filters, period: "previous" }));
  const people = db.participants.filter((p) => p.groupId === selected?.id);
  const unattempted = payments.filter(
    (p) =>
      p.result === "not_attempted" &&
      (selected?.paymentType === "split" ||
        people.find((x) => x.id === p.participantId)?.role === "Host"),
  );
  const success = groups.find(
    (g) =>
      g.outcome === "confirmed" &&
      g.id !== selected?.id &&
      detailedSessions([g]).length,
  );
  const recommendation = !groups.length
    ? "Broaden the selection: there is no evidence to prioritize an intervention."
    : !selected
      ? "Validate the cohort signal and retrieve missing participant evidence before selecting a solution."
      : selected.outcome === "payment_failed"
        ? "Prioritize a joint Group Orders and Payments diagnosis of recovery. Validate technical declines, group readiness and status visibility before committing to a messaging or retry change."
        : selected.outcome === "confirmed"
          ? "Use this completed order as a counterexample. Compare it with incomplete journeys before prioritizing a change."
          : selected.outcome === "deadline_expired"
            ? "Investigate coordination and time-to-readiness before testing deadline reminders or extending the order window."
            : "Validate what repeated checkout interactions mean before redesigning the explanation or checkout.";
  const participantLines = people.map((p) => {
    const session = sessions.find((s) => s.participantId === p.id);
    const screen = session && snapshot(session, at).screen;
    const payment = payments.find((x) => x.participantId === p.id)!;
    const result =
      payment.at && Date.parse(payment.at) <= at
        ? payment.result
        : "not authorized at this moment";
    return `- ${p.name} · ${p.role} · ${p.id}: ${selected?.paymentType === "single" && p.role !== "Host" ? "host pays" : result}. ${screen ? `Screen: ${screen.screen}, recorded ${utc(screen.at)}` : "No recorded screen"}.`;
  });
  const readiness =
    selected?.outcome === "payment_failed" && unattempted.length
      ? `${unattempted.map((p) => people.find((x) => x.id === p.participantId)!.name).join(", ")} also has no recorded payment attempt. Resolving the declined participant’s message alone would not establish that the group was ready to complete.`
      : "Individual readiness and final group confirmation must be assessed separately.";
  const alternatives =
    selected?.outcome === "payment_failed"
      ? `Issuer/payment failure: the decline is recorded; recoverability is unknown. Coordination: ${unattempted.length} required payer(s) have no recorded attempt. Experience: a status mismatch may obstruct recovery, but its effect is unmeasured. The app release and experiment assignment are not causal evidence.`
      : selected?.outcome === "deadline_expired"
        ? "Invitation delays, payment readiness and insufficient time are competing explanations. A deadline expiry alone does not identify which intervention would help."
        : selected?.outcome === "confirmed"
          ? "Successful completion is evidence of a working pathway, not proof that its messaging or experiment variant caused success."
          : "Repeated visits can reflect uncertainty, information seeking or interruption. Recorded interactions do not establish motivation.";
  const owners =
    selected?.outcome === "payment_failed"
      ? [
          "Payments + Data: classify decline reasons and retry eligibility; measure attempts and confirmed recovery by group, issuer and experiment variant. Deliver the recoverable population and baseline before selecting a retry treatment.",
          "Group Orders + Design: verify host/participant status disagreement at the same moment and other members’ readiness. Compare completed and incomplete groups; test comprehension before choosing messaging.",
          "PM + Experimentation: if a material, recoverable cohort is verified, define a minimum worthwhile effect and sample size, then randomize at group level so participants in one order receive a consistent treatment. Hold rollout if safety guardrails regress.",
        ]
      : [
          `Group Orders + Data: ${next}`,
          "Design + Research: test the proposed mechanism against successful counterexamples and customer understanding; do not infer motivation from clicks alone.",
          "PM + Experimentation: establish the baseline and minimum worthwhile effect before a group-level experiment. Review safety and operational guardrails before rollout.",
        ];
  const primary =
    selected?.outcome === "payment_failed"
      ? "Recovery rate = distinct groups confirmed before the group deadline after a first authorization decline / distinct groups with a first authorization decline. This baseline is unavailable: final failure labels omit recovered declines and do not measure retry eligibility."
      : "Group completion = distinct confirmed orders / distinct groups created in the eligible cohort. Track time-to-readiness as a diagnostic; compare like-for-like cohorts before attributing change.";
  const sources: Evidence[] = [...evidence];
  for (const session of sessions) {
    const event = snapshot(session, at).screen;
    if (event)
      sources.push({
        type: "session",
        label: `${people.find((p) => p.id === session.participantId)!.name} · screen recorded ${utc(event.at)}`,
        sessionId: session.id,
        eventId: event.id,
        groupId: session.groupId,
      });
  }
  if (block) {
    const host = sessions.find((s) => s.events.includes(block))!;
    sources.push({
      type: "business",
      label: "Host checkout blocked",
      sessionId: host.id,
      eventId: block.id,
      groupId: host.groupId,
    });
  }
  if (success) {
    const session = detailedSessions([success])[0];
    const event = session.events.find((e) => e.label === "Order confirmed")!;
    sources.push({
      type: "session",
      label: `${success.id} · successful counterexample in this cohort`,
      sessionId: session.id,
      eventId: event.id,
      groupId: success.id,
    });
  }
  const unique = sources.filter(
    (e, i) =>
      sources.findIndex(
        (x) =>
          x.type === e.type &&
          x.sessionId === e.sessionId &&
          x.eventId === e.eventId &&
          x.stage === e.stage,
      ) === i,
  );
  const url = (e: Evidence) => {
    const session = db.sessions.find((s) => s.id === e.sessionId);
    const event =
      session?.events.find((x) => x.id === e.eventId) || session?.events[0];
    return `${baseUrl}#${new URLSearchParams({ page: session ? "studio" : "journey", ...filters, ...(session ? { session: session.id, moment: String(Date.parse(event!.at)), record: event!.id } : { stage: String(e.stage ?? 0), mode: e.type === "funnel" ? "abandoned" : "reached", compare: String(e.type === "comparison") }) })}`;
  };
  return [
    "THREAD · Group Orders decision brief",
    "Synthetic data · authored Gather reconstructions · deterministic analysis. Proposed work below is not an assigned production plan.",
    `Decision requested\n${recommendation}`,
    `Scope\nSelected order: ${selected?.id || "No curated order"}. ${filterLabel(filters)} · ${PERIOD_LABEL[filters.period]} (${current.total} groups).\nInvestigation question: ${input.question}`,
    `Observed evidence\n${observed}`,
    `Business outcome and scale\n${selected ? `${selected.id}: ${order?.status.replaceAll("_", " ")}; ${order?.confirmedAt ? `confirmed ${utc(order.confirmedAt)}` : "no confirmation recorded"}. ` : ""}${current.confirmed}/${current.total} confirmed (${pct(current.rate)}). ${filters.period === "recent" ? `Previous: ${previous.confirmed}/${previous.total} (${pct(previous.rate)}). ` : ""}\nAuthorization failures: ${paymentFailures}/${current.total} of all selected groups (${pct(current.total ? (paymentFailures / current.total) * 100 : 0)}); ${failures.length ? `${paymentFailures}/${failures.length} of non-completing groups.` : "No non-completing groups in this selection."} These are recorded failure outcomes, not a recoverable-order estimate or messaging-mismatch prevalence. Lost revenue and expected uplift are not estimated.`,
    `People and shared outcome${at ? ` · ${utc(at)}` : ""}\n${participantLines.join("\n") || "No detailed participant evidence available."}\n${selected ? readiness : "Participant evidence must be retrieved before diagnosing the mechanism."}`,
    `Hypothesis and competing explanations\n${possible}\n${alternatives}`,
    `Evidence strength and missing evidence\nLinked fixture records support the case observations; causal confidence and generalization remain unproven.\n${uncertain}\n${success ? `${success.id} is a curated successful counterexample in this same cohort; it is not a matched control.` : "No curated successful counterexample is available in this selection. Broaden filters or retrieve additional evidence before comparing mechanisms."}`,
    `Recommended validation · proposed owners\n${owners.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    `Success criteria and guardrails · proposed\n${primary}\nSecondary: time to recovery and participant readiness. Guardrails: duplicate charges or orders, checkout latency, cancellations/refunds and support contacts. Guardrail baselines, targets and experiment sample size are not supplied by this prototype.`,
    "Next decision gate\nBring back the eligible affected population, recovery/readiness baseline, evidence coverage and a successful counterexample. If the mechanism is unsupported, improve instrumentation or investigate alternatives. If supported and material, propose a bounded group-level experiment; do not promise uplift from this case alone.",
    `Supporting evidence\n${unique.map((e) => `${e.label}\n${url(e)}`).join("\n\n") || "No matching records"}`,
  ].join("\n\n");
}
