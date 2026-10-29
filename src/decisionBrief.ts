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
  questionIndex: number;
  selected?: Group;
  baseUrl: string;
  observed: string;
  next: string;
  evidence: Evidence[];
}
export interface BriefSection {
  title: string;
  paragraphs: string[];
  points?: string[];
  ordered?: boolean;
}
export interface DecisionBrief {
  title: string;
  summary: string;
  scope: string;
  question: string;
  sections: BriefSection[];
  sources: { label: string; url: string }[];
  participants: string[];
  disclosure: string;
  text: string;
}
/** The reading view and clipboard export share this one ordered document. */
export function decisionBrief(input: Input): DecisionBrief {
  const { filters, selected, baseUrl, evidence } = input;
  const groups = selectGroups(filters),
    current = metrics(groups);
  const previous = metrics(selectGroups({ ...filters, period: "previous" }));
  const failures = groups.filter((g) => g.outcome !== "confirmed");
  const paymentFailures = groups.filter(
    (g) => g.outcome === "payment_failed",
  ).length;
  const sessions = selected ? detailedSessions([selected]) : [];
  const records = sessions
    .flatMap((session) => session.events.map((event) => ({ session, event })))
    .sort((a, b) => Date.parse(a.event.at) - Date.parse(b.event.at));
  const block = records.find((r) => r.event.label === "Submission blocked");
  const decline = records.find(
    (r) => r.event.label === "Authorization declined",
  );
  const attempt = records.find((r) => r.event.label === "Tap Place order");
  const order = db.orders.find((o) => o.groupId === selected?.id);
  const people = db.participants.filter((p) => p.groupId === selected?.id);
  const payments = db.payments.filter((p) => p.groupId === selected?.id);
  const at = block
    ? Date.parse(block.event.at)
    : selected
      ? journeyEnd(selected)
      : 0;
  const name = (id: string) => people.find((p) => p.id === id)?.name || id;
  const notAttempted = payments.filter(
    (p) =>
      p.result === "not_attempted" &&
      (selected?.paymentType === "split" ||
        people.find((x) => x.id === p.participantId)?.role === "Host"),
  );
  const authorized = payments.filter(
    (p) => p.result === "authorized" && p.at && Date.parse(p.at) <= at,
  );
  const payerScreen = decline && snapshot(decline.session, at).screen;
  const hostScreen = block && snapshot(block.session, at).screen;
  const mismatch = !!(
    block &&
    decline &&
    hostScreen?.pendingParticipantId === decline.session.participantId &&
    payerScreen?.screen === "failed"
  );
  const success = groups.find(
    (g) =>
      g.outcome === "confirmed" &&
      g.id !== selected?.id &&
      detailedSessions([g]).length,
  );
  const failedPayment = selected?.outcome === "payment_failed";
  const title = selected
    ? `${selected.id} · Investigation brief`
    : "Cohort investigation brief";
  const summary = !groups.length
    ? "No groups match this selection. Broaden the filters before drawing a conclusion."
    : !selected
      ? "The cohort has aggregate evidence, but no curated replay to explain an individual journey."
      : failedPayment
        ? "A declined payment blocked the shared order. Recovery and participant readiness need investigation before choosing a checkout change."
        : selected.outcome === "confirmed"
          ? "This order completed. Use it to understand a successful pathway before comparing incomplete journeys."
          : selected.outcome === "deadline_expired"
            ? "The group reached its deadline without an order. Investigate how long it took everyone to become ready."
            : "The host revisited the payment explanation and left without submitting. The reason for leaving is not recorded.";
  const scope = `${selected ? `Case: ${selected.size} participants · ${selected.paymentType === "split" ? "split payment" : "single payer"}. ` : ""}Comparable cohort: ${filterLabel(filters)} · ${PERIOD_LABEL[filters.period]} · ${current.total} comparable groups`;
  const outcome = order
    ? order.confirmedAt
      ? `The shared order was confirmed at ${utc(order.confirmedAt)}.`
      : "No order confirmation was recorded."
    : "No detailed order evidence is available in this selection.";
  let chronology: string[] = [];
  if (failedPayment && decline && attempt && block)
    chronology = [
      `${utc(decline.event.at)} — ${name(decline.session.participantId)}’s payment authorization was declined.`,
      `${utc(attempt.event.at)} — ${name(attempt.session.participantId)} attempted to place the shared order.`,
      `${utc(block.event.at)} — checkout was blocked. ${outcome}`,
    ];
  else if (selected?.outcome === "deadline_expired") {
    const expired = records.find(
      (r) => r.event.label === "Group deadline expires",
    );
    chronology = [
      expired
        ? `${utc(expired.event.at)} — the group deadline expired without a checkout submission.`
        : "The order has a recorded deadline-expiry outcome.",
      outcome,
    ];
  } else if (selected?.outcome === "confirmed") chronology = [outcome];
  else if (selected) {
    const revisits = records.filter(
      (r) =>
        r.event.label === "Tap payment explanation" ||
        r.event.label === "Reopen payment explanation" ||
        r.event.label === "Leave checkout",
    );
    chronology = revisits.map(
      (r) =>
        `${utc(r.event.at)} — ${name(r.session.participantId)}: ${r.event.label.toLowerCase()}.`,
    );
    chronology.push(outcome);
  }
  const readiness = !selected
    ? "Participant evidence is unavailable; retrieve it before diagnosing a mechanism."
    : `${authorized.length ? `${authorized.map((p) => name(p.participantId)).join(", ")} had authorized payment${authorized.length > 1 ? "s" : ""}${block ? " by the blocked checkout" : ""}. ` : ""}${notAttempted.length ? `${notAttempted.map((p) => name(p.participantId)).join(", ")} ${notAttempted.length === 1 ? "has" : "have"} no recorded payment attempt.` : selected.paymentType === "single" ? "The host pays for the other participants." : "All required shares have a recorded payment result."}`;
  const interpretation = !selected
    ? "Aggregate outcomes describe what happened across groups; they cannot establish what a particular person saw."
    : failedPayment
      ? `${mismatch ? `At ${utc(at)}, the host’s recorded screen shows pending payment while ${name(decline!.session.participantId)}’s screen shows a decline. ` : "The authorization failure is recorded. "}${notAttempted.length ? `${notAttempted.map((p) => name(p.participantId)).join(", ")} also ${notAttempted.length === 1 ? "has" : "have"} no recorded payment attempt, so resolving the decline alone would not establish that the group was ready.` : "Whether the declined payment could have been recovered is unknown."}`
      : selected.outcome === "confirmed"
        ? "This is evidence of a completed pathway. It does not prove the messaging or experiment variant caused success."
        : selected.outcome === "deadline_expired"
          ? "Invitation delays, payment readiness and time remaining are possible contributors. Expiry alone does not identify which one mattered."
          : "Repeated visits are observable. Confusion, information seeking and interruption are alternative explanations; motivation remains unknown.";
  const hypothesis = failedPayment
    ? `Hypothesis: ${mismatch ? "inconsistent payment status may make recovery harder" : "a recovery path may help eligible declines"}. Unknown: retry eligibility, recovery likelihood and whether clearer messaging would change the outcome.`
    : "Treat the proposed mechanism as a hypothesis until it is checked against more journeys and customer understanding.";
  const scale = current.total
    ? `${current.confirmed}/${current.total} comparable groups completed (${pct(current.rate)}). ${filters.period === "recent" ? `Previous period: ${previous.confirmed}/${previous.total} (${pct(previous.rate)}).` : ""}`
    : "No groups match the filters.";
  const prevalence =
    failedPayment && current.total
      ? `Authorization failures account for ${paymentFailures}/${current.total} selected groups${failures.length ? ` and ${paymentFailures}/${failures.length} non-completing groups` : ""}. This does not tell us how many saw the same messaging mismatch or could have recovered.`
      : "This curated example is not a representative sample. The cohort comparison does not establish what caused a change.";
  const counterexample = success
    ? `${success.id} completed in this same cohort. It is a useful counterexample, not a matched control.`
    : "No curated successful counterexample matches these filters; retrieve one before comparing mechanisms.";
  const actions = !groups.length
    ? ["Broaden the filters to retrieve evidence."]
    : !selected
      ? [
          "Data: retrieve linked participant screens and payment/order events for this cohort.",
          "Group Orders PM: review coverage before prioritizing an intervention.",
        ]
      : failedPayment
        ? [
            "Payments + Data: separate recoverable declines from hard declines; measure retries and eventual group confirmation by experiment variant.",
            "Group Orders + Design: check how often host and participant statuses disagree, and whether all other members are ready. Compare with successful orders.",
            "Group Orders PM: use those results to choose between payment recovery, coordination or messaging work; investigate alternatives if the mechanism is unsupported.",
          ]
        : selected.outcome === "confirmed"
          ? [
              "Group Orders + Data: compare this completed order as a counterexample with incomplete groups using the same size, payment type and period.",
              "Design + Research: validate which differences affect customer understanding; do not attribute success to the variant alone.",
            ]
          : selected.outcome === "deadline_expired"
            ? [
                "Group Orders + Data: investigate coordination and time-to-readiness, including invitation-to-join delays and time remaining at checkout.",
                "Design + Research: validate the bottleneck before proposing reminders or a longer deadline.",
              ]
            : [
                "Group Orders + Research: review more sessions and test understanding of split payment before redesigning the explanation.",
                "Data: compare submission and completion with successful journeys in the same cohort.",
              ];
  const decision = !selected
    ? "A product change is not justified by missing case evidence. Establish coverage and a baseline first."
    : "Proceed to a bounded experiment only if the mechanism is supported and the affected population is material. Randomize at group level; set a minimum worthwhile effect and sample size from the baseline.";
  const measurement = failedPayment
    ? "Primary metric: groups confirmed before the deadline after a first decline / groups with a first decline. This baseline is unavailable in the prototype; final failure labels cannot measure recovery."
    : "Primary metric: confirmed groups / groups created in the eligible cohort. Compare like-for-like groups and track time-to-readiness.";
  const sections: BriefSection[] = [
    { title: "1. What happened", paragraphs: [readiness], points: chronology },
    {
      title: "2. What the evidence means",
      paragraphs: [interpretation, hypothesis],
    },
    {
      title: "3. How broadly this applies",
      paragraphs: [
        ...(input.questionIndex === 1 ? [input.observed] : []),
        scale,
        prevalence,
        counterexample,
      ],
    },
    {
      title: "4. What to investigate next",
      paragraphs: ["Suggested responsibilities; not assigned production work."],
      points: actions,
      ordered: true,
    },
    {
      title: "5. When to make a product change",
      paragraphs: [
        decision,
        measurement,
        "Guardrails: duplicate charges or orders, checkout latency, cancellations/refunds and support contacts. Baselines and targets still need validation; expected uplift and revenue impact are not estimated.",
      ],
    },
  ];
  // Supporting records sit after the narrative, without duplicating the main text.
  const sources: Evidence[] = [...evidence];
  for (const session of sessions) {
    const event = snapshot(session, at).screen;
    if (event)
      sources.push({
        type: "session",
        label: `${name(session.participantId)} · screen recorded ${utc(event.at)}`,
        sessionId: session.id,
        eventId: event.id,
        groupId: session.groupId,
      });
  }
  if (block)
    sources.push({
      type: "business",
      label: "Host checkout blocked",
      sessionId: block.session.id,
      eventId: block.event.id,
      groupId: block.session.groupId,
    });
  if (success) {
    const session = detailedSessions([success])[0],
      event = session.events.find((e) => e.label === "Order confirmed")!;
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
  const links = unique.map((e) => {
    const session = db.sessions.find((s) => s.id === e.sessionId),
      event =
        session?.events.find((x) => x.id === e.eventId) || session?.events[0];
    return {
      label: e.label,
      url: `${baseUrl}#${new URLSearchParams({ page: session ? "studio" : "journey", ...filters, ...(session ? { session: session.id, moment: String(Date.parse(event!.at)), record: event!.id } : { stage: String(e.stage ?? 0), mode: e.type === "funnel" ? "abandoned" : "reached", compare: String(e.type === "comparison") }) })}`,
    };
  });
  const participants = people.map((p) => `${p.name} · ${p.role} · ${p.id}`);
  const disclosure =
    "Synthetic data · authored Gather screens · deterministic analysis. A case, release or experiment association does not establish causation.";
  const text = [
    `THREAD · ${title}`,
    summary,
    `Scope\n${scope}\nQuestion: ${input.question}`,
    ...sections.map(
      (section) =>
        `${section.title}\n${[...(section.points || []).map((point, i) => `${section.ordered ? `${i + 1}.` : "•"} ${point}`), ...section.paragraphs].join("\n\n")}`,
    ),
    `Supporting evidence\n${links.map((s) => `${s.label}\n${s.url}`).join("\n\n") || "No matching records"}`,
    `Participants\n${participants.join("\n") || "No detailed participant evidence"}`,
    disclosure,
  ].join("\n\n");
  return {
    title,
    summary,
    scope,
    question: input.question,
    sections,
    sources: links,
    participants,
    disclosure,
    text,
  };
}
