import { DEFAULT_FILTERS, type Filters } from "../data";
import type { QueryCohort } from "./models";

// Builder queries cover all sizes and outcomes; transfer that exact cohort.
// Session, replay moment and other investigation state remain owned by App.
export function investigationFilters(cohort: QueryCohort): Filters {
  return { ...DEFAULT_FILTERS, period: cohort.window, payment: cohort.payment };
}
