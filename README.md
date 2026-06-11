# Adaptive Input Layer for Statement of Work Generation

A self-contained, **rule-based adaptive input-layer model** for a bachelor thesis
(AI4Business · Blackbear). It runs **before** Statement of Work (SoW) generation.

> **This is an input-layer model, not a SoW generator.** It does not write a Statement of
> Work. It collects, classifies, clarifies, checks, and structures assignment information
> into a **structured input package** that a later generation layer could consume.

**Scope note.** Although the project context is SoW generation, the input cases are
designed as **general business assignments** (e.g. a customer-support AI idea, a sales
dashboard, an invoice-processing tool, an over-broad automation request). The model
structures assignment information *before* it is passed to a later SoW generation layer —
it is **not** a tool for users to write a SoW directly.

## The model flow

The artifact implements **one** rule-based adaptive flow (shown at the top of the page):

```
Initial assignment input
  → Rule-based maturity screening
    → Maturity-specific input requirements
      → Adaptive follow-up questions
        → Completeness & consistency checks
          → Structured input package for later SoW generation
```

Maturity is **detected from the information provided — never chosen by hand**. The user
fills a short Initial intake; the prototype classifies maturity and then asks only for the
information that matters at that maturity level.

## How to run

No build step, server, or installation is required.

1. Open the project folder.
2. Double-click **`index.html`** (or right-click → *Open with* → your browser).

Everything runs locally in the browser.

- **No backend, database, API key, or external documents** are needed.
- **No machine learning, no confidential data, and no real Blackbear documents** — the
  logic is transparent rules derived from generalized, anonymized patterns, and all
  examples are fictional.

> Optional: a `.claude/launch.json` is included so the prototype can be served in a live
> preview via Python's built-in static server. It is **not** required for normal use.

## Trying it out — demo cases only

The buttons at the top **only load fictional examples**; they do not let you pick a
maturity level. They exist to illustrate how the same model behaves across maturities:

| Demo case | Result | What it shows |
|---|---|---|
| Exploratory | Low maturity | Problem-framing questions; evaluated on context/objective/stakeholders/uncertainty |
| Partially defined | Medium maturity | Targeted clarification questions; evaluated on scope/deliverables/timeline/etc. |
| Well-defined | High maturity | Validation questions; evaluated on definition of done/acceptance/approval/etc. |
| Inconsistent demo | Triggers warnings | Deliberately fires several consistency checks |

You can also fill the Initial intake manually, press **Screen maturity & analyze**, then
fill the maturity-specific follow-up fields and press **Update analysis** to refine.

## Files

| File | Purpose |
|---|---|
| `index.html` | Interface structure and section layout |
| `styles.css` | Visual styling (clean, academic, card-based) |
| `script.js` | All rule-based logic (heavily commented) |
| `README.md` | This file |
| `LOGIC_EXPLANATION.md` | Plain-English + Chinese explanation of the logic for the thesis |
| `THESIS_MAPPING.md` | Maps the checks to the four thesis dimensions (completeness, consistency, contextual relevance, maturity appropriateness) |

## How the logic works (where to look in `script.js`)

The logic is organised into commented blocks:

- **Field quality** (section 2) – the primitive every rule uses: each field is classified
  as `missing`, `weak` (present but vague/too short), or `strong`. A single `state` object
  is the source of truth, so a field's value survives even when its input is off-screen.
- **Maturity screening** (section 3) – counts strong indicators and applies threshold
  rules. *High* requires objective, scope, deliverables, and success criteria all strong
  plus ≥ 6 of 8 indicators strong; *Low* is ≤ 2 strong indicators; *Medium* is in between.
- **Maturity-specific completeness** (section 4) – completeness is scored **only against
  the categories that matter for the detected maturity level** (exploratory → problem
  context, objective, stakeholders, available information, uncertainty; partially defined →
  objective, scope, deliverables, timeline, budget/workload, constraints, stakeholders,
  success; well-defined → deliverables, definition of done, dependencies, out-of-scope,
  budget/workload, acceptance, validation, approval owner). Each category earns
  `weight × qualityFactor` (strong = 1, weak = 0.5, missing = 0); budget/workload is
  weighted moderately so a missing budget lowers the score realistically, not punitively.
- **Consistency checks** (section 5) – independent rule-based contradiction checks: broad
  scope vs. short timeline; broad scope vs. limited budget; many deliverables / complex
  scope vs. missing resources/access; multi-country / multi-site / multi-region scope vs.
  limited time or resources; no approval owner on a complex assignment; scope vs. workload
  anomaly (broad scope but a small available workload); deliverables without definition of
  done; vague objective but specific deliverables; success criteria not aligned with
  objective; stakeholder missing although approval is required; included activities
  conflicting with out-of-scope; non-measurable success criteria; milestones without
  deliverables; role overload.
- **Adaptive questions** (section 6) – Low → exploratory framing questions; Medium → one
  targeted question per weak/missing required category; High → validation questions plus
  clarifications for major gaps. Domain-specific questions are appended for Low/Medium.
- **Structured input package** (section 7) – a seven-part hand-off: (1) detected maturity
  level, (2) reason for classification, (3) confirmed information, (4) missing or weak
  information, (5) adaptive follow-up questions, (6) consistency risks, (7) recommended
  next-step input actions. Copyable as text or downloadable as JSON.

By design, the prototype **does not** include a large "baseline vs. adaptive comparison"
section — that comparison belongs in the thesis evaluation chapter after testing.

## Pattern tuning & data handling

The rules (maturity indicators, completeness categories, and consistency checks) were
refined using **generalized patterns observed in a small, representative sample** of past
assignments — for example: sparse title-only requests behave as low maturity; explicit
out-of-scope and definition-of-done are strong maturity signals; budget/workload is a
first-class field; and broad/multi-site scope frequently conflicts with short timelines or
thin resources.

**No raw records are used in the prototype.** No real client names, titles, costs, dates,
or confidential content is embedded anywhere in the website, and the sample is **not**
training data. The sample file and the tuning prompt are excluded from the publishable
folder via `.gitignore` and should be kept out of any published version.

## Scope and boundaries

This prototype is a **transparent, rule-based demonstration** and a **thesis artifact for
design and evaluation**. It is *not* a full SoW generator, a predictive machine-learning
model, a production system, or a system trained on confidential documents.
