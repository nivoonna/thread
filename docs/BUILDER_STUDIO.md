# Builder Studio: demo and technical guide

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

## Verification and review history

The original baseline at `3802f8b` passed 15 unit tests, 10 browser tests and the production build. The initial Builder implementation increased coverage to 27 unit / 13 browser tests. PR #2 then passed 30 unit / 17 browser tests and was deployed as `1d0d0ae`. All 17 browser tests also passed against the live site.

The UX fixes in open PR #3 pass 33 unit tests and 22 browser tests in the cloud checkout and GitHub validation, plus production build, standalone TypeScript, formatting and whitespace checks. They protect edited drafts before replacement, hide excluded catalog details/actions and fix first-tap help while retaining hover/keyboard behavior. The naming/documentation update is part of the same review PR and requests fresh validation. PR #3 is not deployed at this update.

New regression cases were run against pre-fix builds to reproduce the defects before correction. Coverage includes publication-to-query identity/version handoff, v1 edits after v2 publication with pinned consumers, Payment Failure Rate labels, draft preservation/explicit discard, filtered asset details, catalog links and touch/keyboard help. Existing investigation coverage protects journey/funnel analysis, comparisons/segments, filters, session identifiers, replay/autoplay, evidence/brief navigation, refresh, history and narrow layouts.

No lint task is configured. Browser evidence is emitted under ignored `test-results/` and uploaded by PR CI as `browser-evidence`. Browser verification uses Chromium with desktop/tablet layouts and emulated touch; it is not a complete cross-browser or screen-reader audit.

## Draft safety and catalog navigation

The app maintains one active draft in memory. Starting another draft from the catalog or version history prompts only when the active definition has unpublished changes. Continue the current draft, dismiss with Escape, or explicitly discard it and start the requested one. Untouched and just-published snapshots add no prompt to the normal demo. Refresh still resets app-session data; there is no multi-draft collection or persistent storage.

Asset details and actions appear only while the selected asset matches the current search/type/domain/status filters. Clearing filters restores that selection. Explicit source/reuse links clear incompatible filters to keep their destination visible.

## Releases and GitHub terminology

[PR #1](https://github.com/nivoonna/thread/pull/1) added Builder Studio. [PR #2](https://github.com/nivoonna/thread/pull/2) fixed metric/version navigation, base-version impact and failure labels; both are included in the live `1d0d0ae` release. [PR #3](https://github.com/nivoonna/thread/pull/3) contains the later UX fixes and GitHub documentation improvements for review.

A merged PR changes main; a successful GitHub Pages deployment publishes website code. Builder's **Publish version** action only snapshots a metric in the current simulated session. See [the GitHub guide](GITHUB_GUIDE.md) for readable workflow names, status meanings, release verification and the original incremental commit history.
