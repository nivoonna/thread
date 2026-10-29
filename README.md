# THREAD

_AI-native journey intelligence_

**What it is**

THREAD is an interactive product concept for investigating customer journeys in Gather, a fictional food-delivery marketplace. Three connected screens take a product manager from a completion decline to the people, sessions, and transactions behind it.

**The idea**

A session replay shows what someone experienced. THREAD connects that experience to what happened in the business. One group order can involve several participants and sessions; a checkout tap is not an order confirmation. The interface keeps those distinctions visible throughout an investigation.

**What to explore**

- Follow a seven-stage funnel, change the cohort, and compare completion across segments.
- Switch between a waiting host and a participant whose payment failed, preserving their shared order context.
- Run an evidence-grounded investigation, follow its sources, and copy a brief that separates observations, hypotheses, and uncertainty.

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

Deployment target: https://nivoonna.github.io/thread/ — publication pending verification.

All 1,500 groups are synthetic and reproducible. Six sessions use deterministic UI reconstruction. The investigator runs local analysis, not a live LLM. No authentication, backend, paid API, or real customer data is required.
