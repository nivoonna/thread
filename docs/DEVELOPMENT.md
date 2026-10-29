# Development notes

Use Node 24 (`.nvmrc`). The Vite base is `/thread/`; routes live in the URL hash so Pages refreshes work without a server rewrite. Fonts and original food illustrations are bundled locally. No screenshot attachments are shipped.

## Design decisions

All 13 supplied references were inspected locally. They informed compact filters, persistent analytical context, session tables, categorized event timelines, event-to-replay synchronization, and business-event drill-down. No dedicated segmentation screen or full funnel screenshot was supplied. THREAD uses its own layout, typography, colors and assets.

The interface follows an 8-point spacing rhythm, Inter typography, neutral surfaces, restrained green selections and amber outcomes. `src/styles.css` defines shared tokens and responsive panel layouts. Radix provides focus-managed dialogs; native controls and labelled buttons cover other interactions. The product deliberately has three primary destinations.

## Data contract

`src/data.ts` generates 1,500 groups from seed 42819, in an October 1–28, 2026 fixture. A group is the funnel unit, counted at most once per ordered step. Completion is confirmed groups divided by groups created in the selected creation cohort. Recent and previous periods are October 15–28 and October 1–14. Curated fixtures move five groups into the recent period; period counts are therefore 755 and 745, not 750 each.

Session → participant → group → order → payment records are independently identified. A `not_created` order record represents the absence of a submitted business order; its ID is a correlation target, not proof of acceptance. “Submission attempted” counts checkout attempts, independently of confirmation. Detailed sessions belong to five real aggregate fixture groups; all 23 members have authored replays, including all five people in GO-1042. The original six sessions retain their event identifiers and scenarios. These reconstructions are illustrative, not representative samples. Group outcomes are simulated recorded labels, not causal proof. “Repeated checkout interactions” describes repeat visits without a submit request; customer motivation remains unknown.

`src/investigator.ts` calls metric, segment, funnel, session and business-outcome calculations and produces a trace plus a five-part finding. The UI progressively reveals the completed local analysis trace. There is no remote model or open-ended chat. Comparison cohorts are independent and can overlap. Final business records are explicitly separated from playhead-time events.

## Validation and deployment

`npm test` checks referential integrity, reproducibility, disjoint cohort partitions, funnel conservation, replay/payment consistency, filter-sensitive findings and evidence membership. `npm run test:e2e` launches the production build with Playwright and exercises the central investigation and narrow layout. Locally it uses `/usr/bin/chromium` when available; otherwise install Playwright Chromium. Screenshots are generated under ignored `test-results/`.

The Pages workflow validates, builds, runs browser checks, and uploads `dist`. In GitHub repository Settings → Pages, set Source to **GitHub Actions**. Push to `main` or dispatch **Validate and deploy THREAD**. Verify the successful deployment commit matches the tested commit and open the published URL before claiming it is live. The Vite build emits `version.json` with the build commit for this check.

## Shared journey time

`src/replay.ts` resolves screens and business state at an absolute UTC moment. Only events explicitly marked `rendered` supply reconstructed screen state. Backend records are separate from authored screen observations, even when their timestamps match. A held screen retains its observation timestamp; before-start and ended-session states are explicit. Payment authorization is distinct from a confirmed order.

Hash routes preserve the selected session, absolute `moment`, optional selected event `record`, filters, funnel stage/mode and both comparison definitions. Legacy `event` indices for the original six sessions map to their original times. Playback and seeks replace history entries; navigation pushes them. The originating investigation is carried in the comparable-journey route. Findings remain available during unchanged-scope navigation, and are cleared when the group, filters or question changes. Reload restores replay/analysis context; findings must be rerun. Brief links use the current host and exact evidence timestamps.

## Whole-group presentation and decision brief

GO-1042 offers opt-in **Play whole group**: `groupPlayback` merges every original session event in chronological order, folds paired screen-render records into the same moment, compares the host and declined participant at the blocked timestamp, and finishes on the shared order outcome. All five people appear automatically. This is event-by-event presentation with quiet gaps skipped, not continuous video. Pace is one, two or four seconds per moment. Automatic focus changes replace the URL history entry; manual selection, navigation or reload stops the presentation. Opening a brief pauses it. The shared clock and screen-observation timestamps retain their meanings.

`decisionBrief.ts` organizes the same filtered evidence into five connected sections: what happened, what the evidence means, how broadly it applies, what to investigate next, and when to make a product change. A single structured document powers the reading view and plain-text export. Chronology precedes interpretation, and the cohort context precedes the recommended action. Evidence links and participant identifiers sit in an expandable appendix. The brief modal keeps its heading and copy control visible while the document scrolls; a plain-text toggle provides an alternate view. Failure prevalence is not treated as recovery potential or expected uplift. Linked counterexamples must belong to the selected cohort. The brief links each participant’s observed screen, the blocked host event and any matching successful case. Proposed owners and experiment work are explicitly not production assignments.
