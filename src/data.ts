export const STAGES = [
  "Group created",
  "Invitation shared",
  "Participant joined",
  "Items added",
  "Checkout opened",
  "Order submitted",
  "Order confirmed",
] as const;
export type PaymentType = "split" | "single";
export type Outcome =
  | "confirmed"
  | "payment_failed"
  | "deadline_expired"
  | "checkout_confusion"
  | "left_early";
export type EventKind =
  "Intent" | "Interaction" | "Application" | "Backend" | "Outcome";
export type Screen =
  | "restaurant"
  | "invite"
  | "cart"
  | "checkout"
  | "pay"
  | "loading"
  | "failed"
  | "waiting"
  | "expired"
  | "confused"
  | "success";
export interface JourneyEvent {
  id: string;
  at: string;
  label: string;
  kind: EventKind;
  stage?: number;
  screen: Screen;
  detail: string;
  tap?: boolean;
}
export interface Participant {
  id: string;
  groupId: string;
  name: string;
  role: "Host" | "Participant";
}
export interface Session {
  id: string;
  participantId: string;
  groupId: string;
  detailed: boolean;
  events: JourneyEvent[];
}
export interface Group {
  id: string;
  createdAt: string;
  size: number;
  paymentType: PaymentType;
  variant: "Control" | "Payment clarity";
  release: string;
  outcome: Outcome;
  stageEvents: JourneyEvent[];
  participantIds: string[];
  sessionIds: string[];
  orderId: string;
}
export interface Order {
  id: string;
  groupId: string;
  status: "confirmed" | "incomplete" | "not_created";
  submittedAt?: string;
  confirmedAt?: string;
  backendEvent: string;
}
export interface Payment {
  id: string;
  groupId: string;
  orderId: string;
  participantId: string;
  result: "authorized" | "declined" | "not_attempted";
  at?: string;
}
export interface Dataset {
  groups: Group[];
  participants: Participant[];
  sessions: Session[];
  orders: Order[];
  payments: Payment[];
}
export interface Filters {
  size: "all" | "small" | "large";
  payment: "all" | PaymentType;
  outcome: "all" | "completed" | "abandoned";
  period: "recent" | "previous" | "all";
}
export const DEFAULT_FILTERS: Filters = {
  size: "all",
  payment: "all",
  outcome: "all",
  period: "recent",
};
export const FOCUS_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  size: "large",
  payment: "split",
};
export const OUTCOME_LABEL: Record<Outcome, string> = {
  confirmed: "Order confirmed",
  payment_failed: "Authorization failed",
  deadline_expired: "Deadline expired",
  checkout_confusion: "Checkout hesitation",
  left_early: "Left before checkout",
};
const names = ["Alex", "Sam", "Maya", "Leo", "Jo", "Rae"];
const offsets = [0, 12, 25, 44, 70, 100, 120];
const stageScreens: Screen[] = [
  "restaurant",
  "invite",
  "invite",
  "cart",
  "checkout",
  "loading",
  "success",
];
const at = (start: string, seconds: number) =>
  new Date(Date.parse(start) + seconds * 1000).toISOString();
export function generateData(seed = 42819): Dataset {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const data: Dataset = {
    groups: [],
    participants: [],
    sessions: [],
    orders: [],
    payments: [],
  };
  for (let i = 0; i < 1500; i++) {
    const id = `GO-${1000 + i}`;
    let day = Math.floor(i / 750) * 14 + Math.floor(random() * 14) + 1;
    let size = 2 + Math.floor(random() * 5);
    let paymentType: PaymentType = random() < 0.6 ? "split" : "single";
    let variant: Group["variant"] =
      random() < 0.5 ? "Control" : "Payment clarity";
    const r = random(),
      largeSplit = size >= 4 && paymentType === "split";
    const successRate = day > 14 && largeSplit ? 0.38 : 0.75;
    let outcome: Outcome =
      r < successRate
        ? "confirmed"
        : r < successRate + (1 - successRate) * 0.42
          ? "payment_failed"
          : r < successRate + (1 - successRate) * 0.65
            ? "deadline_expired"
            : r < successRate + (1 - successRate) * 0.85
              ? "checkout_confusion"
              : "left_early";
    const curated: Record<number, Outcome> = {
      42: "payment_failed",
      96: "deadline_expired",
      128: "checkout_confusion",
      186: "confirmed",
      234: "confirmed",
    };
    const detailed = i in curated;
    if (detailed) {
      day = 22;
      size = i === 234 ? 3 : 5;
      paymentType = i === 234 ? "single" : "split";
      outcome = curated[i];
      variant = "Payment clarity";
    }
    const createdAt = new Date(
      Date.UTC(
        2026,
        9,
        day,
        detailed ? 12 : 9 + Math.floor(random() * 10),
        detailed ? 30 : Math.floor(random() * 60),
      ),
    ).toISOString();
    const maxStage =
      outcome === "confirmed"
        ? 6
        : outcome === "payment_failed"
          ? 5
          : outcome === "left_early"
            ? Math.floor(random() * 4)
            : 4;
    const orderId = `ORD-${1000 + i}`;
    const group: Group = {
      id,
      createdAt,
      size,
      paymentType,
      variant,
      release: day > 14 ? "iOS 4.8.0" : "iOS 4.7.2",
      outcome,
      participantIds: [],
      sessionIds: [],
      orderId,
      stageEvents: STAGES.slice(0, maxStage + 1).map((label, stage) => ({
        id: `${id}-stage-${stage}`,
        at: at(createdAt, offsets[stage]),
        label,
        stage,
        kind:
          stage === 6 ? "Outcome" : stage === 5 ? "Application" : "Interaction",
        screen: stageScreens[stage],
        detail:
          stage === 5
            ? "Checkout submission received; confirmation is a separate backend event."
            : stage === 6
              ? "orders.confirmed — all required payments authorized."
              : `${label} recorded for ${id}.`,
      })),
    };
    data.groups.push(group);
    data.orders.push({
      id: orderId,
      groupId: id,
      status:
        maxStage === 6
          ? "confirmed"
          : maxStage === 5
            ? "incomplete"
            : "not_created",
      submittedAt: maxStage >= 5 ? at(createdAt, 100) : undefined,
      confirmedAt: maxStage === 6 ? at(createdAt, 120) : undefined,
      backendEvent:
        outcome === "payment_failed"
          ? "checkout.blocked: payment_authorization_failed"
          : outcome === "deadline_expired"
            ? "group.deadline_expired"
            : outcome === "confirmed"
              ? "orders.confirmed"
              : outcome === "checkout_confusion"
                ? "session.ended: no_submit_request"
                : "session.ended: before_checkout",
    });
    for (let p = 0; p < size; p++) {
      const participantId = `P-${1000 + i}-${p}`,
        sessionId = `S-${1000 + i}-${p}`;
      group.participantIds.push(participantId);
      group.sessionIds.push(sessionId);
      data.participants.push({
        id: participantId,
        groupId: id,
        name: names[p],
        role: p === 0 ? "Host" : "Participant",
      });
      const result: Payment["result"] =
        outcome === "confirmed" && (paymentType === "split" || p === 0)
          ? "authorized"
          : outcome === "payment_failed" &&
              p === (paymentType === "split" ? 1 : 0)
            ? "declined"
            : "not_attempted";
      data.payments.push({
        id: `PAY-${1000 + i}-${p}`,
        groupId: id,
        orderId,
        participantId,
        result,
        at:
          result === "not_attempted"
            ? undefined
            : at(createdAt, result === "declined" ? 98 : 115),
      });
      data.sessions.push({
        id: sessionId,
        participantId,
        groupId: id,
        detailed: false,
        events: p === 0 ? [...group.stageEvents] : [],
      });
    }
    if (detailed) {
      const host = data.sessions.find((s) => s.id === `S-${1000 + i}-0`)!;
      host.detailed = true;
      const ev = (
        second: number,
        label: string,
        kind: EventKind,
        screen: Screen,
        detail: string,
        tap = false,
      ): JourneyEvent => ({
        id: `${host.id}-e${second}`,
        at: at(createdAt, second),
        label,
        kind,
        screen,
        detail,
        tap,
      });
      host.events = [
        ev(
          0,
          "Start a team lunch",
          "Intent",
          "restaurant",
          "The host begins a shared meal. Intent alone does not create an order.",
        ),
        ev(
          12,
          "Share invitation",
          "Interaction",
          "invite",
          `Invitation shared for ${id}.`,
          true,
        ),
        ev(
          25,
          "Participants join",
          "Backend",
          "invite",
          `${size} linked participants are now in the shared group.`,
        ),
        ev(
          44,
          "Add items to cart",
          "Interaction",
          "cart",
          "cart.items_added — shared cart updated.",
          true,
        ),
        ev(
          70,
          "Open checkout",
          "Interaction",
          "checkout",
          `Checkout opened with ${paymentType === "split" ? "split payment" : "one payer"}.`,
          true,
        ),
      ];
      if (outcome === "payment_failed")
        host.events.push(
          ev(
            100,
            "Tap Place order",
            "Interaction",
            "loading",
            "Tap captured. It is not an order confirmation.",
            true,
          ),
          ev(
            102,
            "Submission blocked",
            "Backend",
            "waiting",
            "checkout.blocked — one participant authorization declined.",
          ),
          ev(
            145,
            "Group remains incomplete",
            "Outcome",
            "waiting",
            "No orders.confirmed event exists for this group.",
          ),
        );
      if (outcome === "deadline_expired")
        host.events.push(
          ev(
            110,
            "Wait for the group",
            "Application",
            "waiting",
            "No checkout submission sent; participant payment is still pending.",
          ),
          ev(
            150,
            "Group deadline expires",
            "Backend",
            "expired",
            "group.deadline_expired — the group closes without an order.",
          ),
        );
      if (outcome === "checkout_confusion")
        host.events.push(
          ev(
            80,
            "Tap payment explanation",
            "Interaction",
            "confused",
            "Opens the split-payment explanation.",
            true,
          ),
          ev(
            95,
            "Return to checkout",
            "Interaction",
            "checkout",
            "Returns without submitting the order.",
          ),
          ev(
            108,
            "Reopen payment explanation",
            "Interaction",
            "confused",
            "Repeated visit suggests hesitation; motivation is unknown.",
            true,
          ),
          ev(
            140,
            "Leave checkout",
            "Outcome",
            "confused",
            "Session ends. No submission request or payment error was recorded.",
          ),
        );
      if (outcome === "confirmed")
        host.events.push(
          ev(
            100,
            "Tap Place order",
            "Interaction",
            "loading",
            "checkout.submit requested; payment authorization is pending.",
            true,
          ),
          ev(
            115,
            "Payment authorized",
            "Backend",
            "loading",
            "payments.authorized — all required payers authorized.",
          ),
          ev(
            120,
            "Order confirmed",
            "Outcome",
            "success",
            `orders.confirmed — ${orderId} accepted by the restaurant.`,
          ),
        );
      if (outcome === "payment_failed") {
        const participant = data.sessions.find(
          (s) => s.id === `S-${1000 + i}-1`,
        )!;
        participant.detailed = true;
        participant.events = [
          ev(
            30,
            "Join Alex’s order",
            "Intent",
            "invite",
            "Participant joins the same shared group.",
          ),
          ev(
            55,
            "Add lunch to cart",
            "Interaction",
            "cart",
            "Participant cart contribution persisted.",
            true,
          ),
          ev(
            76,
            "Review your share",
            "Interaction",
            "pay",
            "Participant sees their $16.80 share.",
          ),
          ev(
            96,
            "Tap Pay my share",
            "Interaction",
            "pay",
            "A payment tap is an interaction, not authorization.",
            true,
          ),
          ev(
            97,
            "Request authorization",
            "Application",
            "loading",
            "payments.authorize sent for this participant.",
          ),
          ev(
            98,
            "Authorization declined",
            "Backend",
            "failed",
            "payments.declined — issuer_declined. No charge was made.",
          ),
          ev(
            145,
            "Leave payment incomplete",
            "Outcome",
            "failed",
            "Participant does not retry; shared order remains incomplete.",
          ),
        ].map((e) => ({ ...e, id: e.id.replace(host.id, participant.id) }));
      }
    }
  }
  return data;
}
export const db = generateData();
export function selectGroups(filters: Filters, source = db.groups) {
  return source.filter(
    (g) =>
      (filters.size === "all" ||
        (filters.size === "large" ? g.size >= 4 : g.size < 4)) &&
      (filters.payment === "all" || g.paymentType === filters.payment) &&
      (filters.outcome === "all" ||
        (filters.outcome === "completed"
          ? g.outcome === "confirmed"
          : g.outcome !== "confirmed")) &&
      (filters.period === "all" ||
        (filters.period === "recent"
          ? Number(g.createdAt.slice(8, 10)) > 14
          : Number(g.createdAt.slice(8, 10)) <= 14)),
  );
}
export const percentage = (n: number, total: number) =>
  total ? (100 * n) / total : 0;
export const pct = (n: number) => `${n.toFixed(1)}%`;
export function metrics(groups: Group[]) {
  const confirmed = groups.filter((g) => g.outcome === "confirmed").length;
  return {
    total: groups.length,
    confirmed,
    rate: percentage(confirmed, groups.length),
  };
}
export function funnel(groups: Group[]) {
  return STAGES.map((label, index) => {
    const count = groups.filter((g) =>
      g.stageEvents.some((e) => e.stage === index),
    ).length;
    const next =
      index < 6
        ? groups.filter((g) => g.stageEvents.some((e) => e.stage === index + 1))
            .length
        : count;
    const previous = index
      ? groups.filter((g) => g.stageEvents.some((e) => e.stage === index - 1))
          .length
      : count;
    return {
      label,
      index,
      count,
      drop: count - next,
      rate: percentage(count, groups.length),
      stepRate: percentage(count, previous),
    };
  });
}
export function stageGroups(
  groups: Group[],
  stage: number,
  mode: "reached" | "abandoned",
) {
  return groups.filter(
    (g) =>
      g.stageEvents.some((e) => e.stage === stage) &&
      (mode === "reached" ||
        (stage < 6 && !g.stageEvents.some((e) => e.stage === stage + 1))),
  );
}
export function detailedSessions(groups: Group[]) {
  const ids = new Set(groups.map((g) => g.id));
  return db.sessions.filter((s) => s.detailed && ids.has(s.groupId));
}
export function filterLabel(f: Filters) {
  return [
    f.size === "all"
      ? "All group sizes"
      : f.size === "large"
        ? "4+ participants"
        : "2–3 participants",
    f.payment === "all"
      ? "All payments"
      : f.payment === "split"
        ? "Split payment"
        : "Single payer",
    ...(f.outcome === "all"
      ? []
      : [f.outcome === "completed" ? "Completed" : "Abandoned"]),
  ].join(" · ");
}
export const PERIOD_LABEL: Record<Filters["period"], string> = {
  recent: "Oct 15–28, 2026",
  previous: "Oct 1–14, 2026",
  all: "Oct 1–28, 2026",
};
export const SEGMENTS: {
  id: string;
  label: string;
  filter: Partial<Filters>;
}[] = [
  {
    id: "large-split",
    label: "Large groups · split",
    filter: { size: "large", payment: "split" },
  },
  {
    id: "small",
    label: "Small groups",
    filter: { size: "small", payment: "all" },
  },
  {
    id: "large",
    label: "Large groups",
    filter: { size: "large", payment: "all" },
  },
  {
    id: "split",
    label: "Split payment",
    filter: { size: "all", payment: "split" },
  },
  {
    id: "single",
    label: "Single payer",
    filter: { size: "all", payment: "single" },
  },
  {
    id: "completed",
    label: "Completed orders",
    filter: { size: "all", payment: "all", outcome: "completed" },
  },
  {
    id: "abandoned",
    label: "Abandoned orders",
    filter: { size: "all", payment: "all", outcome: "abandoned" },
  },
];
export function trend() {
  return Array.from({ length: 14 }, (_, i) => {
    const day = i + 15;
    const groups = db.groups.filter(
      (g) => Number(g.createdAt.slice(8, 10)) === day,
    );
    return {
      day: `Oct ${day}`,
      all: metrics(groups).rate,
      focus: metrics(selectGroups({ ...FOCUS_FILTERS, period: "all" }, groups))
        .rate,
    };
  });
}
