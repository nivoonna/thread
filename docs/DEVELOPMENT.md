# Development notes

Use Node 24 (`.nvmrc`). The Vite base is `/thread/`; routes live in the URL hash so Pages refreshes work without a server rewrite. Fonts and original food illustrations are bundled locally. No screenshot attachments are shipped.

## Design decisions

All 13 supplied references were inspected locally. They informed compact filters, persistent analytical context, session tables, categorized event timelines, event-to-replay synchronization, and business-event drill-down. No dedicated segmentation screen or full funnel screenshot was supplied. THREAD uses its own layout, typography, colors and assets.

The interface follows an 8-point spacing rhythm, Inter typography, neutral surfaces, restrained green selections and amber outcomes. `src/styles.css` defines shared tokens and responsive panel layouts. Radix provides focus-managed dialogs; native controls and labelled buttons cover other interactions. The product deliberately has three primary destinations.

## Data contract

`src/data.ts` generates 1,500 groups from seed 42819, in an October 1–28, 2026 fixture. A group is the funnel unit, counted at most once per ordered step. Completion is confirmed groups divided by groups created in the selected creation cohort. Recent and previous periods are October 15–28 and October 1–14. Curated fixtures move five groups into the recent period; period counts are therefore 755 and 745, not 750 each.

Session → participant → group → order → payment records are independently identified. A `not_created` order record represents the absence of a submitted business order. Detailed sessions belong to five real aggregate fixture groups; GO-1042 has host and participant replays. The six replays are illustrative, not representative samples. Group outcomes are simulated recorded labels, not causal proof. “Checkout hesitation” describes repeat visits without a submit request; customer motivation remains unknown.

`src/investigator.ts` calls metric, segment, funnel, session and business-outcome calculations and produces a trace plus a four-part finding. The UI progressively reveals the completed local analysis trace. There is no remote model or open-ended chat. Comparison cohorts are independent and can overlap. Final business records are explicitly separated from playhead-time events.

## Validation and deployment

`npm test` checks referential integrity, reproducibility, disjoint cohort partitions, funnel conservation, replay/payment consistency, filter-sensitive findings and evidence membership. `npm run test:e2e` launches the production build with Playwright and exercises the central investigation and narrow layout. Locally it uses `/usr/bin/chromium` when available; otherwise install Playwright Chromium. Screenshots are generated under ignored `test-results/`.

The Pages workflow validates, builds, runs browser checks, and uploads `dist`. In GitHub repository Settings → Pages, set Source to **GitHub Actions**. Push to `main` or dispatch **Validate and deploy THREAD**. Verify the successful deployment commit matches the tested commit and open the published URL before claiming it is live. The Vite build emits `version.json` with the build commit for this check.
