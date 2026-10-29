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
