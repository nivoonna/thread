# Validation record

Validated locally on October 29, 2026. This improvement is intentionally **not pushed or deployed**, as requested. The public site continues to serve the earlier release.

## Checks completed

- `npm test`: **12 passing tests**. Seed reproduction and relationship integrity; all 81 combinations of size/payment/outcome/period; funnel conservation for all seven stages; unchanged aggregate denominators; all 23 curated participant sessions; chronological events; payment timestamps; separate backend and rendered-screen observations; shared-time boundaries; dataset-grounded findings and exact evidence-link targets.
- `npm run build`: TypeScript and Vite pass.
- `npm run test:e2e`: **7 passing Chromium scenarios against the built production assets**, served with Vite preview. The original scenario checks were retained and updated for the intentional workflow changes; the full shared-order path replaces the former aggregate-first entry path.
- Browser coverage: Overview → GO-1042 → all five participants at one absolute moment → connected evidence → comparable journeys → return to the originating participant/time → investigator → brief. Clipboard contents are asserted against the complete brief, and every copied supporting URL is opened and its destination checked.
- Additional browser checks: every member of all five curated groups; original failure/deadline/repeated-checkout/success scenarios; all funnel stages and periods; each filter dimension; comparison definitions and reload persistence; playback, stepping, seeks and copied replay links; Back/Forward; no history entry per playback tick; event filtering; stale-finding invalidation; aggregate-only and invalid links; keyboard activation, modal focus containment/restoration and Escape; architecture disclosures; 390px and 1280px layouts.
- Page exceptions and console errors are asserted absent in the shared-journey browser suite. A separate production-browser review also reported no errors and a 390px document width at a 390px viewport.
- Rendered screenshots inspected: Overview, comparable cohort, host and participant screens, connected evidence, investigation brief, and desktop/narrow layouts. Files remain under ignored `test-results/`; supplied reference screenshots are not shipped.
- `git diff --check`: passes. README is 198 words excluding setup commands.

## Verified fixture values

GO-1042: five participants, split payment, incomplete order. Sam's decline is at 12:31:38 UTC, Alex's placement attempt at 12:31:40, blocked checkout at 12:31:42 and Sam's recorded exit at 12:32:25. At the blocked moment, Alex, Maya and Leo have authorized shares; Sam has a decline; Jo has not attempted authorization. The authored host screen shows Sam pending while Sam's screen shows a decline. No confirmation is recorded.

The recent large split-payment cohort has 111/296 confirmed orders (37.5%), versus 191/269 (71.0%) previously. There are 68 recorded authorization failures among 185 recent non-completing groups. These counts do not establish how many people saw a messaging mismatch or what caused the decline.

## Recommended demo path

1. Overview → **Investigate this journey** opens GO-1042 at 12:31:38 UTC.
2. Select Sam to inspect the decline; select Alex and seek **Submission blocked** at 12:31:42.
3. Switch through Sam, Maya, Leo and Jo without changing the journey clock. Contrast individual payment state with the incomplete shared order.
4. Select Sam → **Connected evidence**. Inspect the payment tap, authorization request/decline and the linked host attempt/block.
5. **Explore comparable journeys** → inspect cohort denominators, funnel and success/failure examples → **Return to originating order and moment**.
6. Run **Investigate this journey** → review observations, business scope, hypothesis, missing evidence and validation → **Create investigation brief** → **Copy brief**. Open supporting event links.

## Limits

All records and screens are synthetic, authored reconstructions. Only five curated groups have detailed replay evidence; the remaining aggregate groups do not. The deterministic investigator is not a live LLM. Proposed Grab integration, component versioning, capture, data pipelines and production security controls are explanatory concepts, not deployed capabilities. Curated examples do not establish prevalence or causality. Reload restores replay and comparison context; findings must be rerun after reload or changed inputs. Validation used Chromium, not a cross-browser/device matrix. No remote publication or deployment verification was attempted for this change.
