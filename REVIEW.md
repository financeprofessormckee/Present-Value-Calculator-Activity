# Review and ambitious proposal — 2026-10-11

Reviewed upstream commit `7e38e39958e2064e8b607c6e3691279afd184e0a` and the live activity (the served HTML matched this commit). This is an independent proposed learning-lab branch, not an approved teaching release. It includes the conservative repairs plus the extensions below. The historical design brief and pending review remain in force for release decisions.

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

## Proposed learning-lab changes

- Put the cash-flow graph beside the rate and selected-payment explanation, with signed totals visible first. Preserve the institutional masthead, burgundy palette, monetary bars, hatching, and original credits.
- Fit the timeline to the payments by default (five-year minimum), with an explicit full 30-year view. Dragging keeps its starting horizon until release so the coordinate system does not jump under the pointer.
- Hold the dollar scale on request. It may expand to prevent clipping when a new amount exceeds it, but does not shrink while locked. The current range is always stated.
- Save an in-memory comparison of the full payment schedule and rate. Compare face sum, receipts, outflows, and net PV, with **current minus saved** differences. Restore or replace the snapshot explicitly.
- Undo/redo up to 100 edits, including replacing a scenario and adding/removing payments. Continuous edits in one input and a complete drag are grouped. Cancelled drags restore the original date.
- Inspect net PV across 0–25% rates with a graph sampled every 0.5 percentage point and an exact marker/table row for the current rate. The text explicitly allows nonmonotonic net PV for mixed signed flows; it does not claim that higher rates always lower net value or calculate an IRR.
- Export a local CSV with unrounded factors, cash-flow PVs, and totals, or print the current experiment as a worksheet with reflection prompts. Invalid drafts block saving, restoration, export, and the print button.
- Add prediction questions to the same four ungraded prompts. No future-value, inflation, investment recommendation, score, account, server, analytics, URL sharing, or persistent storage is introduced.

## Validation

- `npm test`: 8,302 original model checks, 15 input-type checks, and 22 experiment-tool checks pass. Additional cases cover snapshot independence, CSV precision, comparison arithmetic, and rising/turning net-PV curves for signed flows.
- `npm run test:browser`: 78 checks pass in Chromium 138.0.7204.0 with Playwright 1.62.1, directly from `file://`.
- Includes all 50 conservative checks plus fitted/full timelines, lock expansion, saved comparisons and arbitrary surviving payment IDs, undo/redo and scenario recovery, redo invalidation, live sensitivity tables, invalid-save blocking, actual CSV download, print-button dispatch, and expanded-layout reflow.
- Widths: 1280, 640, 375, 320px, including open comparison and sensitivity panels; no horizontal page overflow. Chart/table scrolling is intentional. Desktop, mobile, comparison, and sensitivity screenshots were inspected. A print PDF was generated to exercise print styling.
- axe-core 4.11.0: zero violations for tested WCAG A/AA rules with expanded panels and a hovered selected payment. This is an automated screen, not WCAG certification.
- Remaining release work: manual screen-reader and physical touch testing, Firefox/Safari checks, full institutional accessibility review, and David Friedman's review. Sibling activities are outside this PR.

## Tradeoffs and scope

This branch is an alternative to the conservative proposal, based on the same original commit; it does not depend on merging that PR. The additional interface and undo state increase maintenance surface. The full numerical table remains the alternative to the horizontally scrollable chart on phones. Comparison and history are deliberately lost on reload. A comparison can involve changed amounts, dates, and rates; the UI shows both rates and the saved schedule and does not attribute the difference to one cause.

The historical v1 specification remains available. The proposed extension below it describes these additions without implying that Friedman or the institution has approved them. No live-site deployment is included.

## Running checks

Open `index.html` directly to use the page. Developer checks: `npm ci`, `npm test`, `npx playwright install chromium`, `npm run test:browser`. `PV_TEST_CHROMIUM` and `PV_TEST_ARGS` optionally select an installed Chromium executable and a JSON array of launch arguments. `PV_TEST_ROOT` selects another checkout for regression comparison.

