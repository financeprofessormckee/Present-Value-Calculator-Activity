# Review and conservative proposal — 2026-10-11

Reviewed upstream commit `7e38e39958e2064e8b607c6e3691279afd184e0a` and the live activity (the served HTML matched this commit). This is a proposed repair branch, not an approved teaching release. The historical design brief and pending review remain in force for release decisions.

## Findings

| Priority | Finding and reproduction | Proposed response |
| --- | --- | --- |
| High | Complete any learning prompt, then blank an amount. The UI still says **Done**, even though Check refuses the invalid input. | Clear completion on every input attempt, including invalid drafts. |
| High | Load one payment and enter $0.01. The graph forces a $1,000 minimum scale and a 2px minimum bar height, obscuring the economic difference between cents and zero. Zero also adds a fake stack segment. | Scale down to cents; draw true nonzero heights and an explicit zero marker; zero contributes no stack height. |
| Medium | At 320px, the 1000-unit chart shrinks to 257px: a 16-unit axis label is about 4px tall. | Preserve a 760px graph width in a labelled, keyboard-scrollable region. The page itself reflows; the table remains a complete alternative. |
| Medium | Add 12 payments at one date, including year 30. Seven-unit offsets overlap 16-unit bars and 26-unit hit targets; late bars can clip. | Separate all bars and hit targets within plot bounds. Dotted stems indicate actual dates; row order and payment identities are preserved. |
| Medium | Dragging converts an already-clamped pointer coordinate to a date; bars offset beyond either endpoint do not track correctly. Pointer cancellation commits the intermediate year. | Use fractional, unclamped pointer coordinates; clamp the resulting date instead. Cancelled drags and Escape restore the original year; ignore secondary pointers. |
| Medium | Invalid fields retain old model values, but only assistive announcements explain why the chart does not match the draft. | Add a persistent visible warning whenever any input is invalid; preserve unrelated invalid drafts through other valid edits/add/remove. |
| Medium | Hover a selected payment: the generic hover background overrides the pressed state while the text stays white, producing insufficient contrast. | Keep a dark background for the combined selected and hovered state; scan that state in the accessibility check. |
| Low | A tiny discounted outflow prints as **−$0.00**. Boolean/array values pass the public model validator. Printed rows lose their payment labels when buttons are hidden. | Normalize only display values rounding to zero, reject nonnumeric types, and retain print labels. |

## What is sound

The core formula, annual convention, signed receipts/outflows, year-zero treatment, cancellation, and full-precision aggregation are correct. All 8,302 existing model checks pass. No economic formula or permitted input range is changed. The four optional, ungraded prompts, MIT license, credits, masthead, offline operation, and no-build runtime remain.

## Validation

- `npm test`: 8,302 existing checks and 15 additional type-rejection checks pass.
- `npm run test:browser`: 50 checks pass in Chromium 138.0.7204.0 using Playwright 1.62.1, directly from `file://`.
- Browser coverage: all four prompts, invalid completion, last-valid calculations, invalid draft preservation, removal/boundary focus, add/remove limits, cents/zero, negative-zero display, 12 coincident payments at years 0 and 30, dragging/Escape/pointer cancellation, print labels, and no console exceptions.
- Widths: 1280, 640, 375, 320px; no horizontal page overflow. Chart/table scrolling is intentional. Desktop and mobile screenshots were inspected.
- axe-core 4.11.0: zero violations for the WCAG A/AA rules tested. This is an automated screen only, not WCAG certification.
- Remaining release work: manual screen-reader and physical touch testing, Firefox/Safari checks, complete institutional accessibility review, and David Friedman's review. Sibling activities are outside this PR.

## Review tradeoffs

The full thirty-year view remains deliberately unchanged. At crowded dates, stems make offsets explicit but still require reading the table for exact figures. The chart auto-rescales as totals change, so heights from separate states cannot be compared without checking the dollar axis. The more ambitious alternative addresses these teaching/workflow constraints; these PRs should be evaluated as alternatives rather than merged together unreviewed.

## Running checks

The page still opens directly from `index.html`; no dependencies are needed to use it. Developer checks: `npm ci`, `npm test`, `npx playwright install chromium`, `npm run test:browser`. `PV_TEST_CHROMIUM` and `PV_TEST_ARGS` optionally select an existing Chromium executable and a JSON array of launch arguments for constrained CI environments. `PV_TEST_ROOT` can point to another checkout for regression comparison.

