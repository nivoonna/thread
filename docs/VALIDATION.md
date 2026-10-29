# Validation record

Validated locally in the cloud workspace on October 29, 2026. Public deployment is a separate, unverified step.

- **Production build:** TypeScript and Vite pass. Chart dependencies are split into a separate chunk. All fonts and illustrations are served from the application.
- **Data / analysis:** 8 Vitest tests pass, covering fixed-seed reproduction, unique IDs and relationships, cohort partitions, funnel conservation, distinct abandonment outcomes, six replay records, business/payment timestamps, filter-sensitive findings and source membership.
- **Production browser:** 4 Playwright scenarios pass against `vite preview`, using Chromium. They exercise the six-step demo, group/payment/outcome/period filters, two-cohort comparison, host/participant switching, play/pause/step/scrub, all three investigator prompts, repeat evidence seeks, funnel and comparison links, brief generation and clipboard contents, deadline/hesitation/success outcomes, architecture, empty cohorts, and restored navigation context.
- **Responsive review:** Rendered screenshots inspected at 1440×1000, 1280×800 and 390×844. Fixed text contrast and sizing, mobile timeline overflow, and repeated event-link navigation. Generated screenshots remain in the ignored `test-results` directory.
- **Development server:** Started the documented Vite command and used Chromium to load Overview, navigate into the filtered funnel and find GO-1042 without browser errors.
- **Repository hygiene:** Only original application assets and synthetic data are included. None of the supplied references, private identifiers or screenshot content are published.

## Deployment boundary

The GitHub HTTPS proxy supports repository reads and push dry-run. The environment egress proxy returned `403 Forbidden` to CONNECT requests for `api.github.com` and `nivoonna.github.io`, preventing GitHub Pages configuration, workflow-status inspection and public-site verification. Both domains were added to the environment configuration draft; a saved draft is not an applied network change.

After those destinations are enabled, configure this repository's Pages source as GitHub Actions, run or rerun **Validate and deploy THREAD**, and verify `/thread/version.json` matches the deployed `main` commit. Then repeat the production browser journey at the public URL. Until then, the Pages URL is a deployment target, not a verified live site.
