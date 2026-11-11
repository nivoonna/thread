import { db } from "../data";
import type { Row, Asset, Consumer } from "./models";
export const NOW = "2026-10-29T00:00:00Z";

export const rows: Row[] = db.groups.map((g) => ({
  group_id: g.id,
  completed: db.orders.some(
    (o) => o.groupId === g.id && o.status === "confirmed",
  ),
  payment_failed: db.payments.some(
    (p) => p.groupId === g.id && p.result === "declined",
  ),
  eligible: true,
  created_at: g.createdAt,
  payment_method: g.paymentType,
  app_version: g.release,
  period: Number(g.createdAt.slice(8, 10)) > 14 ? "recent" : "previous",
}));

const fields = {
  group_id: "string",
  completed: "boolean",
  payment_failed: "boolean",
  eligible: "boolean",
  created_at: "timestamp",
  payment_method: "string",
  app_version: "string",
  period: "string",
};

export const assets: Asset[] = [
  {
    id: "group_order_events",
    type: "event",
    domain: "Group Orders",
    owner: "Marketplace instrumentation",
    status: "Available",
    description: "Group creation and ordered journey events.",
    fields: { group_id: "string", created_at: "timestamp" },
    dependencies: [],
    fresh: true,
    completeness: 1,
    access: "Internal",
  },
  {
    id: "group_order_payment_attempts",
    type: "event",
    domain: "Payments",
    owner: "Payments engineering",
    status: "Available",
    description: "Authored payment records; not every group attempted payment.",
    fields: { group_id: "string", result: "string" },
    dependencies: [],
    fresh: true,
    completeness: 1,
    access: "Restricted",
  },
  {
    id: "order_transactions",
    type: "dataset",
    domain: "Group Orders",
    owner: "Commerce data",
    status: "Available",
    description:
      "Independent order status; correlation IDs alone do not confirm a transaction.",
    fields: { group_id: "string", status: "string" },
    dependencies: [],
    fresh: true,
    completeness: 1,
    access: "Internal",
  },
  {
    id: "payment_outcomes",
    type: "dataset",
    domain: "Payments",
    owner: "Payments data",
    status: "Available",
    description: "Authorized, declined and not-attempted payment outcomes.",
    fields: { group_id: "string", result: "string" },
    dependencies: ["group_order_payment_attempts"],
    fresh: true,
    completeness: 1,
    access: "Restricted",
  },
  {
    id: "group_orders",
    type: "product",
    domain: "Group Orders",
    owner: "Marketplace data",
    status: "Certified",
    description:
      "One row per created Gather group, joined to independently confirmed orders. All fixture groups are eligible terminal cohorts.",
    fields,
    dependencies: [
      "group_order_events",
      "order_transactions",
      "payment_outcomes",
    ],
    fresh: true,
    completeness: 1,
    access: "Internal",
  },
];

export const consumers: Consumer[] = [
  "Product dashboard",
  "Internal AI agent",
  "Thread investigation",
].map((label, i) => ({
  id: String(i),
  label,
  metric: "group_order_completion_rate",
  version: 1,
}));
