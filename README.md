# Present Value Visual Calculator

**[Click Here to Launch the Interactive Activity](https://financeprofessormckee.github.io/Present-Value-Calculator-Activity/)**

> **This branch:** proposed learning-lab alternative; see [REVIEW.md](REVIEW.md) for findings, features, checks, and limitations.

> **Status of upstream v1:** v1 prototype under review with David Friedman. Not yet accessibility-audited
> for teaching release.

Make discounting and the addition of dated cash flows visible. Students edit receipts and outflows, move payments earlier or later, and change the annual rate. Outlined bars show face amounts; hatched bars show present values. A table, signed totals, and a worked formula give the same results numerically.

## Educator Guide: Classroom Integration

This activity is a browser adaptation of Proposal 24 in David Friedman's
[Living Paper](http://daviddfriedman.com/Living_Paper/living_paper.htm) catalog of teaching programs
([original program descriptions](http://daviddfriedman.com/Living_Paper/Program_Descriptions/program_descriptions.htm)).

### The Economic Model

* **Discounting:** PV = amount / (1 + r)^year, whole years 0–30, annual rates 0–25%.
* **Cash flows:** 1–12 signed payments; totals use full precision.
* **Self-checks:** four optional prompts, no score.

The full model, its adaptations from Friedman's description, and acceptance cases are in
[SPECIFICATION.md](SPECIFICATION.md). The recorded source brief is in [DESIGN.md](DESIGN.md).

### Running it locally

Open `index.html` in a browser. There's no build step, installation, or server, and
everything is local. Model and experiment-tool tests run with `npm test` (no install needed for those tests). Optional browser checks use `npm ci`, `npx playwright install chromium`, then `npm run test:browser`.

### License and Citation

The source code for this web application is licensed under the [MIT License](LICENSE). You
are free to use, modify, and distribute the software, consistent with the Living Paper's
request that code based on Friedman's proposals remain open source.

The economic concepts are David Friedman's. The West Texas A&M University name, seal, and
branding assets are not covered by the license and do not imply institutional endorsement
of derivative works. If you use or adapt this activity, please cite this repository.

---
*Economic concepts: [David Friedman](http://daviddfriedman.com/Living_Paper/living_paper.htm). Development: [Eric McKee](https://github.com/financeprofessormckee),
Paul and Virginia Engler College of Business, West Texas A&M University.*
