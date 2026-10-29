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
