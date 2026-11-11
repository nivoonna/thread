export const dimensions = ["payment_method", "app_version", "period"] as const;
export type Dimension = (typeof dimensions)[number];

export interface Row {
  group_id: string;
  completed: boolean;
  payment_failed: boolean;
  eligible: boolean;
  created_at: string;
  payment_method: string;
  app_version: string;
  period: string;
}

export interface Asset {
  id: string;
  type: "event" | "dataset" | "product" | "metric";
  domain: string;
  owner: string;
  status: "Certified" | "Available";
  description: string;
  fields: Record<string, string>;
  dependencies: string[];
  fresh: boolean;
  completeness: number;
  access: "Internal" | "Restricted";
}

export interface Definition {
  id: string;
  name: string;
  description: string;
  businessOwner: string;
  maintainer: string;
  intendedUse: string;
  source: string;
  numerator: string;
  denominator: string;
  grain: string;
  timeField: string;
  dimensions: Dimension[];
  window: "all" | "recent" | "previous";
  kind: "completion" | "failure";
}

export interface Draft extends Definition {
  baseVersion?: number;
  state: "Draft" | "Validated";
}

export interface Version {
  readonly definition: Definition;
  readonly version: number;
  readonly state: "Published" | "Deprecated";
  readonly publishedAt: string;
}

export interface Consumer {
  id: string;
  label: string;
  metric: string;
  version: number;
}

export interface Check {
  name: string;
  status: "pass" | "warning" | "error";
  detail: string;
}

export interface Query {
  dimension?: string;
  payment?: string;
  window?: string;
  authorized?: boolean;
}
