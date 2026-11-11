import type { Definition, Dimension } from "./models";
export const periodLabels: Record<Definition["window"], string> = {
  recent: "October 15–28, 2026",
  previous: "October 1–14, 2026",
  all: "October 1–28, 2026",
};
export const dimensionLabels: Record<Dimension, string> = {
  payment_method: "Payment mode",
  app_version: "App version",
  period: "Period",
};
export const calculationText = (definition: Definition) =>
  definition.kind === "completion"
    ? "Confirmed eligible groups ÷ started eligible groups × 100"
    : "Eligible groups with a declined payment ÷ started eligible groups × 100";
export const numeratorLabel = (definition: Definition) =>
  definition.kind === "completion"
    ? "Completed"
    : "Groups with declined payment";
