# Builder Studio review guide

Builder Studio extends Thread's existing investigation app with a local governed measurement workflow. It does not replace Gather, introduce a backend, deploy a Grab integration, or claim enterprise security.

## Walkthrough (designed for approximately three minutes)

Start a fresh app session with `npm run dev` or `npm run build && npm run preview`. Open `/thread/#page=builder&builderView=overview`. No setup or sign-in is required beyond the existing development dependencies.

1. Choose **Find Group Orders data**, search for `group_orders`, and open the modeled product. Inspect schema, ownership, lineage and the certified reuse notice.
2. Choose **Create metric**. Keep the default completion definition and owners. Continue through source/calculation and dimensions; choose **Calculate preview**. The recent cohort is 468 confirmed / 755 eligible groups, approximately 61.99%, calculated from the existing fixtures.
3. Choose **Validate draft**, **Test legacy field reference**, then **Run validation**. The missing `order_completed` field genuinely blocks publishing.
4. Choose **Use completed field**, rerun validation and publish v2. A warning transparently identifies simulated approval. The required checks pass against the corrected definition.
5. Choose **Query published metric**, select v2, and **Run Query**. Inspect counts, unit, grain, UTC boundaries, quality, source IDs and stable query timestamp. Copy request/response. The three existing consumer examples remain pinned to v1.
6. Choose **Investigate in Thread**. Journey Analysis opens with the existing investigation filters and selected session context preserved. This is an aggregate journey handoff; no per-session attribution is claimed.

Alternative reuse: Catalog → `group_order_completion_rate` → **Use existing metric**. Alternative revision: Validation & Publishing → **New draft from v1** → change the creation cohort → review impact → validate/publish v2. Deprecation discourages new use while retaining queries for pinned integrations.

The automated golden path completes these actions from a clean browser context. The approximately three-minute duration is a walkthrough target, not a measured human usability study.

## Boundaries

- `src/builder/models.ts`: assets, draft and version contracts, query options, validation results and consumers.
- `src/builder/fixtures.ts`: deterministic modeled rows, source metadata and pinned consumer metadata. Existing `src/data.ts` is unchanged.
- `src/builder/services.ts`: discovery, dependency validation, calculation, publication, immutable snapshots, lifecycle transitions, change impact and local query service.
- `Builder.tsx`, `Author.tsx`, `Governance.tsx`, `Playground.tsx`: five connected views and app-session state. `Help.tsx` supplies hover/focus/tap help with Escape dismissal and a portal to avoid clipping.
- `src/App.tsx`: narrow workspace/hash-route integration. Existing page names, investigation state and Pages base are preserved.

Creation cohorts use UTC, inclusive start and exclusive end. All fixture groups are eligible terminal cohorts, counted once by `group_id`. Completion requires an independently confirmed order; an order correlation ID alone never establishes completion. Payment Failure Rate counts eligible groups with a declined payment, not failed attempts divided by attempted payments. Payment method means single/split payment mode. Group release is exposed as app version. Market/platform are intentionally unavailable.

Preview, published queries, dashboard and structured AI evidence use the same calculation service and data. AI output is structured fixture evidence, without an LLM call. Query timestamps and source-health evaluation use October 29, 2026 as the stable demo clock. Quality metadata describes synthetic fixture contracts, not live monitoring.

A draft is editable and becomes Validated only after blocking checks pass. Publish revalidates and creates an immutable snapshot. Editing requires explicit version ancestry for an existing identifier; a different identifier starts a separate contract. Edits invalidate validation. Deprecation preserves the original definition. Existing consumers never automatically move to a new version.

State is deliberately in memory. Workspace switching retains drafts and versions; refresh resets them to seeded v1 metrics. No browser storage is read, so empty/corrupt storage cannot break initialization. There is no real persistence, service identity, authorization boundary, live endpoint or approval system.

## Verification evidence

Baseline at upstream `3802f8b`: 15 unit tests, 10 browser tests and production build passed. Upstream was checked with `git ls-remote` before development; the checkout was clean. No pre-existing test failure was observed.

Executed in the cloud checkout:

| Command                                             | Actual result                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `npm test`                                          | 27 tests passed in 4 files                                            |
| `npm run build`                                     | TypeScript and Vite production build passed, `/thread/` base retained |
| `npm run test:e2e`                                  | 13 browser tests passed against production preview                    |
| `npx playwright test tests/browser/builder.spec.ts` | 3 Builder tests passed after final metadata refinements               |
| `git diff --check`                                  | No whitespace errors                                                  |

No lint task is configured; lint was not reported as passed. Browser screenshots are emitted under ignored `test-results/` (`builder-api.png` and `builder-catalog-tablet.png`); PR CI uploads browser evidence as an artifact. Browser verification exercises Chromium, not a complete cross-browser or screen-reader audit.

Coverage includes the golden flow and genuine error recovery; immutable version edits, impact and deprecation; explicit version/unsupported dimension/authorization errors; clipboard controls; all five Builder routes with refresh; history; keyboard help and Escape; desktop/tablet overflow; and existing landing, journey, funnel, segments/comparison, filters, curated sessions, replay, autoplay, evidence/brief navigation and narrow layouts. The supplied `S-1042-0` deep link is exercised, with all investigation parameters asserted after handoff.

Initial browser test attempts exposed an overly strict native-select label locator; it was corrected to its accessible combobox role. A separate overlapping test-run preview-server shutdown was resolved by running suites sequentially. A temporary test-fixture typing error was caught by TypeScript and corrected before commit. No assertions were suppressed or tests skipped.

## Release state

Feature branch: `feature/builder-studio`. Logical commits cover workspace, domain, catalog, authoring, governance, consumption, handoff, tests/hardening and documentation. The existing deployment workflow is unchanged; added pull-request CI only validates. Main and the live GitHub Pages deployment are not changed by this feature branch. Local built-output verification is not proof of deployed feature behavior. Review and explicit approval are required before merging or deploying.

## Review fixes after PR #1

PR #1 was merged before this review. The follow-up remains on `feature/builder-studio` for review; these fixes do not merge main or trigger deployment.

- Publishing and catalog reuse now hand the API Playground an explicit metric ID and immutable version, independently of catalog selection. Publishing Payment Failure Rate or a new metric identifier opens that exact contract. Query filter defaults remain unchanged.
- Change impact resolves the draft's metric ID and `baseVersion`. Editing v1 after v2 exists compares against v1 and lists its pinned consumers. Missing ancestry and new identifiers are not silently compared against the latest unrelated version.
- Payment Failure Rate's preview numerator column reads **Groups with declined payment**; completion keeps **Completed**.

Four browser regressions reproduced the defects on the pre-fix build. They cover stale catalog/query selection, both seeded metrics, a new metric identifier, the exact request/response version, and editing/querying an older base with pinned consumers. Unit coverage also protects base-version resolution, unavailable ancestry and metric identity isolation. Local verification: 30 unit tests and 17 browser tests passed, including all existing investigation regressions; production build, standalone TypeScript, formatting and whitespace checks passed. No lint script exists.

PR #1's GitHub validation was investigated separately: its workflow is active, but the run remains queued with zero jobs/check runs, no error annotations and no available logs. Earlier deployment attempts reported GitHub's internal startup error before any application job. Remote validation is not counted as passed. A follow-up PR requests validation of the fix commit without deploying it.

## UX fixes after the live walkthrough

The live PR #2 release was walked through in Chromium on desktop/tablet and with emulated touch. The main workflow completed correctly with consistent calculations and no console/network errors, but exposed silent draft replacement, stale details in filtered catalogs and a first-tap help defect.

This follow-up protects the single active session draft before either catalog creation or a version-history action replaces it. Only unpublished definition changes trigger the existing accessible modal: continue the current draft, dismiss with Escape, or explicitly discard and start the requested draft. Unchanged and just-published snapshots need no prompt. This adds no persistent storage or multi-draft collection; refresh still starts a clean demo.

Catalog details/actions now appear only when the selected asset matches current search/type/domain/status filters. Clearing filters restores the selection. Explicit links to a modeled source or reusable metric clear incompatible filters, keeping their destination visible. Help separates pointer-induced focus from keyboard focus, opens on the first touch tap, and supports second-tap, outside-tap, blur and Escape dismissal while retaining mouse hover.

Regression evidence: four new browser cases failed against the pre-fix build; the existing hover/focus behavior passed. All five focused cases pass after correction. Unit coverage protects draft change detection across metadata, calculations, lifecycle-only state, older versions and new identifiers. Verification: 33 unit tests, 22 browser tests, production build, standalone TypeScript, formatting and whitespace checks. The changes remain on `feature/builder-studio` for review; they are not merged or deployed by this follow-up.
