# Builder Studio: demo and technical guide

Builder Studio extends Thread with a local governed measurement workflow: discover trusted data, define a metric, validate and publish a version, then reuse it across consumers and investigate the underlying cohort. Gather remains the fictional marketplace. GrabFood Group Payments v2 is an illustrative scenario.

## Walkthrough (approximately three minutes)

Start a fresh session at `/thread/#page=builder&builderView=overview`. No credentials or services are needed. Use the arrow beside Gather to switch workspaces.

1. **Find Group Orders data** opens Data Catalog. Inspect `group_orders`; ownership, schema and lineage are available on demand. **Use existing metric** reuses the certified contract immediately.
2. For the authoring path, choose **Create new version**. Keep or edit the definition and ownership. Continue to source/calculation, choose a UTC creation cohort, and continue to dimensions/preview. **Calculate preview** uses the shared fixture service: the recent cohort is 468 confirmed / 755 eligible groups (61.99%). All October is 1,021 / 1,500 (68.07%).
3. **Validate draft → Run validation** checks the actual definition and dependencies. To demonstrate a recoverable failure, expand **Demo checks → Test legacy field reference → Run validation**. The missing `order_completed` field blocks publishing. **Use completed field → Run validation** corrects the reference and verifies it. Optional error demonstrations stay outside the ordinary workflow.
4. Review change impact against the draft’s actual base version. **Publish version** creates an immutable v2 snapshot. The screen retains its Published state until an explicit edit starts a draft.
5. **Query published metric → Run Query** selects exactly that identity, version and definition’s default cohort. Inspect the result and grouped counts. Expand **Request and response** for the copyable local API contract; expand the developer quickstart or consumer examples only if useful.
6. **Investigate this cohort** opens Journey Analysis with the query’s period and payment mode. Size and outcome are unrestricted to match the metric population. Existing replay/session/timeline context is retained without claiming that a particular session caused the aggregate result.

The normal flow has valid version and dimension options only. API error demonstrations (missing version, unsupported dimension, simulated unauthorized access) live under **Demo checks** and execute against the real local query service. A normal **Run Query** recovers from a demonstrated error once access is enabled.

The approximately three-minute duration is a walkthrough target, not a measured usability study.

## What each view does

- **Overview:** explains Builder Studio, directs the visitor to Group Orders data, lists published metrics and shows an active draft only after real edits.
- **Data Catalog:** searches and filters common asset metadata; reveals source schema, ownership, lineage, consumers and existing definitions. Reuse is primary; revisions are clearly labelled.
- **Metric Builder:** edits one session draft through definition, calculation and preview. Advanced ownership and calculation semantics are expandable. Supported dimensions become queryable; a separate preview selector makes the displayed breakdown explicit.
- **Validation & Publishing:** shows blockers and warnings, with passed checks expandable; publishes snapshots, compares proposed changes with the base version and lists pinned consumers. Version history supports editing older versions and confirmed deprecation.
- **API Playground:** selects a published contract, queries a cohort and shows readable results. Technical request/response, documentation, pinned consumer examples and error checks are expandable.

## Workspace and route compatibility

Investigate retains its Overview, Journey Analysis and Investigation Studio. Builder has its own five-item sidebar and landing page. The brand link returns to the active workspace’s Overview; compact layouts use the same workspace selector above content.

Existing `page=studio` links still mean Investigation Studio. Builder uses `page=builder&builderView=overview|catalog|metric|validation|api`, under the existing `/thread/` base. Workspace switching preserves draft and investigation context. Refresh and browser history reconstruct workspace navigation from the URL; refresh resets in-memory demo publications.

Only the explicit **Investigate this cohort** handoff updates investigation filters to match the query. It preserves selected session, event, moment and other route context. It makes no session-level attribution claim.

## Models, calculations and lifecycle

- `src/builder/models.ts`: assets, drafts, immutable version references, dimensions, queries and consumers.
- `fixtures.ts`: modeled rows derived from existing `src/data.ts` groups/orders/payments, source metadata and explicit consumer pins.
- `services.ts`: discovery, validation, calculation, publication, lifecycle, version selection, change impact and local queries.
- `investigation.ts`: query-cohort to existing investigation-filter mapping.
- `Builder.tsx`, `Author.tsx`, `Governance.tsx`, `Playground.tsx`: the five views and app-session state. `Results.tsx` shares readable preview/query output; `labels.ts` shares calculation and field labels. `Help.tsx` supports hover, focus, tap and Escape via a portal.
- `src/App.tsx`: narrow hash-route/workspace integration; existing data, deployment configuration and investigation views remain intact.

Creation cohorts use UTC, inclusive start and exclusive end. All fixture groups are eligible terminal cohorts, counted once by `group_id`. Completion requires an independently confirmed order, not merely an order correlation ID. Payment Failure Rate counts eligible groups with a declined payment, not failed attempts divided by payment attempts. The wire dimension `payment_method` means single/split payment mode. App version is the existing group release. Market and platform are unavailable.

Preview, published queries and consumer examples use one calculation service and dataset. Examples are filtered to the selected metric and use the same cohort/payment filters while retaining their explicit version pins. The AI example contains structured evidence without an LLM call. Query timestamps and quality evaluation use the stable October 29, 2026 demo clock; quality metadata is synthetic, not live monitoring.

Edits invalidate validation. Publishing rechecks all blockers and snapshots the definition. Revising an existing identity requires an explicit base version. Published definitions never change; later versions never upgrade consumer pins automatically. Adding supported dimensions is compatible; removing dimensions or changing calculation/time semantics is flagged as potentially breaking. Change impact always compares the exact base version, including v1 after v2 exists.

Discovery and new queries prefer the newest active Published version. Explicitly selected Deprecated versions remain queryable with a warning. Deprecation requires confirmation and discourages new use; it preserves the definition and historical pins.

## State and limitations

One draft is saved automatically for the current app session. Starting another from the catalog or history prompts only if unpublished changes would be replaced. Continue, dismiss with Escape, or explicitly discard. Untouched and just-published definitions do not create a false “needs attention” item.

All state is in memory. Refresh starts a clean demo with seeded v1 metrics; no browser storage is read. There is no persistence, live API endpoint, enterprise identity, authorization boundary, approval service, Grab integration or production monitoring. Permission and approval checks are clearly labelled local simulations.

## Verification

Run `npm test`, `npm run build` (includes TypeScript) and `npm run test:e2e`. There is no lint task. Browser tests serve the production output at `/thread/`, including direct routes, refresh, history, keyboard/help interaction and desktop/tablet/mobile overflow checks. Screenshots are written under ignored `test-results/` and uploaded by PR CI as `browser-evidence`.

The suite covers the full publish/query/investigate path, genuine validation failure/recovery, exact metric/version handoff, older-version impact and consumer pins, deprecation, draft replacement safety, catalog filtering, accessible form controls and query-cohort consistency. Existing regression coverage protects landing, journey/funnel analysis, comparisons/segments, filters, sessions, replay/autoplay, evidence/brief links and navigation history.

Chromium and emulated touch checks do not constitute a complete cross-browser or screen-reader audit. A passing cloud build does not prove the live release changed: a PR must be reviewed, merged and successfully deployed separately. Builder’s **Publish version** changes only local metric state.

See [the GitHub guide](GITHUB_GUIDE.md) for workflow names, status meanings and the original incremental development history.
