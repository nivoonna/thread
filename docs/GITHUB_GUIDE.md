# GitHub guide: changes, checks and live releases

Thread's source code lives in this repository. The public app lives at [nivoonna.github.io/thread](https://nivoonna.github.io/thread/). GitHub Actions connects them by testing and publishing changes.

## What the names mean

| Item              | Purpose                                           | Example                                                                         |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Feature branch    | Work being prepared for review                    | `feature/builder-studio`                                                        |
| Commit            | One recorded, focused change                      | `04769ca` protects drafts and fixes catalog/help behavior                       |
| Pull request (PR) | The proposed change, explanation, diff and review | **Builder Studio: protect drafts and improve catalog and touch help**           |
| Workflow          | An automated process in the Actions tab           | **Check proposed changes**                                                      |
| Run               | One attempt to execute that process               | **Check PR #3: Builder Studio: …**                                              |
| Job               | A group of steps inside a run                     | `verify` runs the PR checks; `build` and `deploy` prepare and publish a release |

PR titles describe the resulting behavior and start with the feature name. Descriptions state what changed, why it matters, how it was verified and whether it has shipped. Commits keep a short technical prefix such as `feat(builder)`, `fix(builder)` or `docs(github)` and describe one logical change. Published commit messages/hashes are preserved; renaming them would rewrite history.

## The two automated workflows

| Workflow                              | When it runs                                               | What it does                                                                                             | Publishes the live site?  |
| ------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Check proposed changes**            | An open PR is created or updated against main              | Installs dependencies, runs unit tests, checks TypeScript, builds, runs browser tests and saves evidence | No                        |
| **Test and publish live Thread site** | Main is updated, or someone explicitly starts a manual run | Runs the same checks, packages the site and publishes to GitHub Pages                                    | Yes, after checks succeed |

Future PR runs use **Check PR #number: title**. Future release runs use **Publish live site #number (main updated)** or **(manual request)**. Job IDs, triggers, permissions, commands and deployment destination are unchanged by this naming update. Existing historical runs may retain their original labels, including **Validate pull request** and **Validate and deploy THREAD**.

## Reading the status

- **Queued:** GitHub has accepted the run; inspect the jobs to see whether execution has started.
- **In progress:** At least part of the workflow is executing.
- **Green / success:** That particular run completed successfully. A green PR check verifies proposed code; it does not deploy it.
- **Red / failure:** That attempt failed. Open it and inspect its failing step or annotations. Failure before any job starts can be a GitHub service error.
- **Cancelled:** That attempt stopped, often because a newer release superseded it.

A red older attempt does not undo a newer green deployment. A queued older row is not evidence that the latest release is missing. Use the latest release commit and the live version to establish what users are receiving.

## Confirming that a change is live

1. Confirm the intended PR is merged into main.
2. Open the corresponding **Test and publish live Thread site** run and confirm both `build` and `deploy` succeeded.
3. Open [the live version metadata](https://nivoonna.github.io/thread/version.json). Its `commit` must match the intended release commit on main.
4. Open the app and exercise the changed flow. Refresh with **Ctrl+Shift+R** if an already-open browser tab has cached the old page.

The application's **Publish version** button is different: it creates a simulated metric version inside the current app session. It does not publish website code or change GitHub Pages.

## Builder Studio change history

This is a dated review snapshot from November 11, 2026, not a substitute for checking current PR and Actions status.

| PR                                              | Change                                                                                                                                | Status at this update                | Verification                                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [#1](https://github.com/nivoonna/thread/pull/1) | Add the measurement workspace: discovery, authoring, governance and API reuse                                                         | Merged; included in the live release | Original implementation: 27 unit / 13 browser tests locally                                                                               |
| [#2](https://github.com/nivoonna/thread/pull/2) | Query the correct published version; compare against draft ancestry; correct failure labels                                           | Merged and deployed as `1d0d0ae`     | 30 unit / 17 browser tests; GitHub validation and deployment succeeded; 17 tests also passed against the live site                        |
| [#3](https://github.com/nivoonna/thread/pull/3) | Protect edited drafts, keep catalog details consistent with filters and repair first-tap help; clarify GitHub names and documentation | Open for review; not deployed        | Product fixes: 33 unit / 22 browser tests and GitHub validation passed; the added documentation/workflow labels request another check run |

Earlier GitHub startup failures are retained in Actions history. They happened before application jobs; subsequent PR #2 validation and deployment succeeded. See each run's own status rather than treating the old failure as the current release status.

## The original implementation commits

| Commit    | Milestone                                               |
| --------- | ------------------------------------------------------- |
| `346b871` | Add the Builder Studio workspace and navigation         |
| `47fe1ce` | Establish measurement models and deterministic fixtures |
| `1089d79` | Add data catalog discovery                              |
| `4431de2` | Add metric authoring and calculated previews            |
| `d034742` | Add validation and version publication                  |
| `e56a43c` | Add reusable metric queries and the API Playground      |
| `b12447d` | Connect Builder Studio to investigation                 |
| `0f3d578` | Verify workflows and regressions                        |
| `476ae45` | Document the module                                     |

Follow-up commit `99eca28` fixes metric/version handoffs and impact analysis. Commit `04769ca` addresses the live walkthrough's draft, catalog and touch-help findings. Later documentation commits explain these changes without renaming or squashing the existing history.
