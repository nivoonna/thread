import { db, type Group, type Session, type JourneyEvent } from "./data";
export const utc = (at: string | number) =>
  new Date(at).toISOString().slice(11, 19) + " UTC";
export function journeyEnd(group: Group) {
  return Math.max(
    Date.parse(group.createdAt),
    ...db.sessions
      .filter((s) => s.groupId === group.id && s.detailed)
      .flatMap((s) => s.events.map((e) => Date.parse(e.at))),
  );
}
export function snapshot(session: Session, at: number) {
  const events = session.events.filter((e) => Date.parse(e.at) <= at);
  const screen = events.filter((e) => e.rendered).at(-1);
  const boundary = !session.detailed
    ? "No recorded screen at this time."
    : at < Date.parse(session.events[0]?.at)
      ? "Session has not started."
      : !screen
        ? "No recorded screen at this time."
        : at > Date.parse(session.events.at(-1)!.at)
          ? "Session ended; last recorded state shown."
          : "Last recorded screen held between events.";
  return { screen, boundary, event: events.at(-1), index: events.length - 1 };
}
export function joinedParticipants(group: Group, at: number) {
  return db.participants.filter(
    (p) =>
      p.groupId === group.id &&
      (p.role === "Host" ||
        db.sessions.some(
          (s) =>
            s.participantId === p.id &&
            s.detailed &&
            Date.parse(s.events[0]?.at) <= at,
        )),
  );
}
export function participantStatus(session: Session, at: number) {
  const state = snapshot(session, at);
  if (!session.detailed) return "Replay unavailable";
  if (at < Date.parse(session.events[0].at)) return "Not yet joined";
  const payment = db.payments.find(
    (p) => p.participantId === session.participantId,
  )!;
  if (payment.at && Date.parse(payment.at) <= at)
    return payment.result === "authorized"
      ? "Share authorized"
      : "Authorization declined";
  const group = db.groups.find((g) => g.id === session.groupId)!;
  if (
    group.paymentType === "single" &&
    db.participants.find((p) => p.id === session.participantId)?.role !== "Host"
  )
    return "Host pays";
  return state.screen?.screen === "cart"
    ? "Items added"
    : "Payment not authorized";
}
export function connectedEvidence(group: Group) {
  return db.sessions
    .filter((s) => s.groupId === group.id && s.detailed)
    .flatMap((session) =>
      session.events.map((event) => ({
        event,
        session,
        participant: db.participants.find(
          (p) => p.id === session.participantId,
        )!,
        payment: db.payments.find(
          (p) => p.participantId === session.participantId,
        )!,
        source: sourceCategory(event),
      })),
    )
    .sort((a, b) => Date.parse(a.event.at) - Date.parse(b.event.at));
}
function sourceCategory(e: JourneyEvent) {
  if (e.kind === "Interaction" || e.kind === "Intent") return "interaction";
  if (
    e.kind === "Application" ||
    /Session ended|Leave |participant joins/i.test(e.label)
  )
    return "application";
  if (/authoriz/i.test(e.label)) return "payment";
  return "order";
}

export interface GroupPlaybackStep {
  sessionId: string;
  at: number;
  eventId: string;
  title: string;
  detail: string;
}
/** One chronological stream across everyone; paired render records share the business moment. */
export function groupPlayback(group: Group): GroupPlaybackStep[] {
  const records = connectedEvidence(group).filter(
    (r) => !r.event.id.endsWith("-render"),
  );
  const steps: GroupPlaybackStep[] = [];
  for (const r of records) {
    steps.push({
      sessionId: r.session.id,
      at: Date.parse(r.event.at),
      eventId: r.event.id,
      title: `${r.participant.name} · ${r.event.label}`,
      detail: r.event.detail,
    });
    if (
      r.event.label === "Submission blocked" &&
      r.event.pendingParticipantId
    ) {
      const other = db.sessions.find(
        (s) =>
          s.groupId === group.id &&
          s.participantId === r.event.pendingParticipantId &&
          s.detailed,
      );
      const state = other && snapshot(other, Date.parse(r.event.at));
      if (other && state?.screen) {
        const person = db.participants.find(
          (p) => p.id === other.participantId,
        )!;
        steps.push({
          sessionId: other.id,
          at: Date.parse(r.event.at),
          eventId: state.screen.id,
          title: `Same moment · ${person.name}’s view`,
          detail: `The shared clock stays at ${utc(r.event.at)}. ${person.name}’s last recorded screen is from ${utc(state.screen.at)}; compare it with the host’s screen.`,
        });
      }
    }
  }
  const host = db.sessions.find(
    (s) =>
      s.groupId === group.id &&
      s.detailed &&
      db.participants.find((p) => p.id === s.participantId)?.role === "Host",
  );
  const order = db.orders.find((o) => o.id === group.orderId);
  if (host && order && steps.length)
    steps.push({
      sessionId: host.id,
      at: journeyEnd(group),
      eventId: host.events.at(-1)!.id,
      title: "Shared order outcome",
      detail: `${group.id}: ${order.status.replaceAll("_", " ")}. ${order.confirmedAt ? `Confirmed at ${utc(order.confirmedAt)}.` : "No order confirmation recorded. Individual authorization does not mean the shared order completed."}`,
    });
  return steps;
}
