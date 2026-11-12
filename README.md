# THREAD

THREAD is an interactive product prototype connecting customer journey evidence with trusted, reusable measurement. It uses Gather, a fictional food-delivery marketplace.

[Explore the live demo](https://nivoonna.github.io/thread/) · [Open Builder Studio](https://nivoonna.github.io/thread/#page=builder&builderView=overview)

## Explore

Choose a workspace from the left menu:

- **Investigate:** follow the GO-1042 group journey across participants, connect reconstructed screens with payment and order records, compare cohorts and create a decision brief with supporting evidence.
- **Builder Studio:** discover existing data and metrics, preview calculations, validate definitions, publish immutable versions and query them for reuse across dashboards, apps and AI agents.

Builder's demo flow is **discover → define → preview → validate → publish → query → investigate**. The [walkthrough](docs/BUILDER_STUDIO.md) covers the exact steps, validation recovery and pinned consumers.

## Run locally

Built with React, TypeScript and Vite. Use **Node.js 24**.

```sh
npm ci
npm run dev
```

Open [localhost:5173/thread/](http://localhost:5173/thread/).

## Checks

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The build includes TypeScript checking. Browser tests use the production build. No lint task is configured.

## Demo boundaries

The 1,500 groups and 23 reconstructed sessions are synthetic. GrabFood Group Payments is illustrative. Queries and agent examples run locally; permissions, source quality and approvals are simulated. Builder drafts and publications reset on refresh. No live Grab integration or LLM is connected.

## Documentation

- [Builder Studio walkthrough and architecture](docs/BUILDER_STUDIO.md)
- [Development and investigation data model](docs/DEVELOPMENT.md)
- [GitHub checks and release verification](docs/GITHUB_GUIDE.md)
- [Original investigation validation record](docs/VALIDATION.md)
