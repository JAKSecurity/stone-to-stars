# RC-044: Bump GitHub Actions off deprecated Node 20 in Pages deploy workflow

**Status**: Delivered  **Priority**: P3  **Type**: Tech Debt
**Created**: 2026-06-19  **Delivered**: 2026-06-19

## Resolution
Bumped the Pages workflow's pinned actions to their latest Node-24 majors (verified via the
GitHub releases API): checkout v4→v7, setup-node v4→v6, configure-pages v5→v6,
upload-pages-artifact v3→v5, deploy-pages v4→v5; build Node 20→22. Committed; pushed from
Jeff's terminal (the `workflow` scope the sandbox account lacks). Verified by the deploy run
completing with no Node 20 deprecation warning.

## Summary

GitHub is deprecating the Node 20 runtime for Actions. The Pages deploy workflow
pins several actions to versions that target Node 20; the runner currently forces
them onto Node 24, but that fallback is temporary and will eventually break the
deploy. Bump the pinned actions to versions that natively target Node 24.

## Context

Observed in the 2026-06-19 "Deploy to GitHub Pages" run log:

> Node.js 20 is deprecated. The following actions target Node.js 20 but are being
> forced to run on Node.js 24: actions/checkout@v4, actions/configure-pages@v5,
> actions/deploy-pages@v4, actions/setup-node@v4, actions/upload-artifact@v4.

The fix is to update the action version pins in `.github/workflows/` (the Pages
deploy workflow) to releases that target Node 24.

**Gotcha:** pushing changes under `.github/workflows/*` requires Jeff's terminal —
the sandbox `gh`/git credential (jak3676) lacks the `workflow` OAuth scope; only
the JAKSecurity account in Jeff's terminal has it. So this ticket is resolved from
Jeff's machine, not a delegated/sandbox session.

## Acceptance Criteria

- [x] Pages deploy workflow's pinned actions updated to Node 24-native versions
      (checkout v7, setup-node v6, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).
- [x] A deploy run completes with no Node 20 deprecation warning.

## References

- GitHub changelog: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/
- Workflow file: `.github/workflows/` (Pages deploy)
