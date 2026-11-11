# THREAD

_Journey intelligence for better product decisions_

**What it is**

THREAD is an interactive product concept that helps product teams turn customer-journey evidence into better decisions. It connects behavior, session replays, and business outcomes in Gather, a fictional food-delivery marketplace.

**The idea**

A replay shows what someone experienced. THREAD connects that experience to what happened in the business. Several participants can share one order; a checkout tap is not a confirmed transaction.

**The outcome**

Help product managers decide where to focus, which problems to prioritize, and what to validate next. Every investigation separates observations from hypotheses and uncertainty, supporting decisions grounded in evidence without treating correlation as proof.

**What to explore**

- Play the GO-1042 customer journey across all participants on one timeline.
- Connect customer screens to payment and order records.
- Explore comparable journeys and copy a decision brief with evidence and validation priorities.

**Built with**

React · TypeScript · Vite · Tailwind CSS · Radix UI · Recharts · Lucide

**Run locally**

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

**Demo**

[Explore the live demo](https://nivoonna.github.io/thread/)

All 1,500 groups are synthetic and reproducible. Twenty-three sessions cover every member of five curated orders using authored UI reconstruction. The investigator runs local analysis, not a live LLM.

**Builder Studio**

Use the arrow beside the Gather workspace name to choose **Investigate** or **Builder Studio**. Switching opens that workspace’s landing page and shows only its own sidebar. In Builder Studio, discover data products, author a governed metric, recover a real schema validation failure, publish an immutable version and query it locally. Existing `page=studio` links still open Investigation Studio; Builder uses `#page=builder&builderView=overview` under the same `/thread/` base.

Demo: **Data Catalog → group_orders → Create new version → Continue twice → Calculate preview → Validate draft → Run validation → Publish version → Query published metric → Run Query → Investigate this cohort**. Reuse the certified v1 directly, or publish a revision as v2; consumer pins stay unchanged. To demonstrate recovery, open **Demo checks** in Validation, select **Test legacy field reference**, validate, correct with **Use completed field**, and rerun validation before publishing.

Builder adds no credentials, network service or dependency. It maps Gather's existing deterministic group/order/payment fixtures; GrabFood Group Payments v2 is illustrative framing, not a deployed integration. Drafts and publications last for the app session; refreshing starts a clean demo. Payment mode, release and period are supported dimensions; market and platform are unavailable. Source quality, approval and permissions are explicitly simulated.

The existing commands above run the combined unit and browser suites. `npm run build` includes TypeScript checking; there is no lint script. Pull-request CI validates without deploying. See [Builder Studio: demo and technical guide](docs/BUILDER_STUDIO.md).

**GitHub and releases**

- **Check proposed changes** runs tests and builds an open pull request. It does not publish the site.
- **Test and publish live Thread site** tests main and publishes it to the [existing Thread link](https://nivoonna.github.io/thread/).
- A merged PR puts code on main. A successful deployment publishes it. An older red run is a historical failed attempt, not the status of the latest release.

See [GitHub guide: pull requests, checks and live releases](docs/GITHUB_GUIDE.md) for naming, statuses, release verification and the Builder Studio change history.
