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

## Two workflows (modes)

The Initial intake offers two tabs. They share the same underlying logic and scoring —
only which sections are emphasized changes — and they should **not** be read as competing
scores:

- **Screen raw assignment idea** (Mode 1) — for a rough idea or unstructured description.
  Maturity screening is shown prominently and drives the adaptive follow-up questions
  (i.e. **adaptive interaction / routing**). The taxonomy scoring panel stays collapsed
  (secondary).
- **Evaluate reconstructed input package** (Mode 2) — for thesis **Chapter 6 evaluation**
  of a labelled package reconstructed from a Creator V2 conversation. The maturity
  dashboard and normal-flow metrics are de-emphasized; the **taxonomy-based scoring**,
  Diagnostic Issue Count, Follow-up Actions Generated, and the SoW-compatible JSON are
  shown prominently. *Maturity screening is not the formal Chapter 6 evaluation metric.*

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

- **Field quality** (section 2) – the primitive every rule uses (shared by **both**
  taxonomy scoring and maturity screening): each field is classified as `missing`, `weak`,
  or `strong`. A field is **never `strong` just because it is non-empty** — a field that
  only contains a negative placeholder ("Not specified", "Not clearly specified",
  "Unknown", "N/A", "TBD", "No information provided", …) is **`missing`**, and a field
  whose content is dominated by uncertainty/limitation markers ("unclear", "limited",
  "partly", "not fully", "but", "however", "insufficient", "vague") is at most **`weak`**.
  A single `state` object is the source of truth, so a field's value survives even when its
  input is off-screen.
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

## Evaluation metrics (taxonomy scoring panel, Step 5)

A rule-based scoring panel sits before the final input package and evaluates the entered
or pasted input against the **11 fixed thesis taxonomy categories** (objective; problem /
business context; scope / included activities; deliverables / definition of done;
timeline / duration / milestones; budget expectations; required roles / expertise;
resources / access / materials; company / industry / team context; out-of-scope /
limitations / dependencies; success criteria / validation logic).

- **Per-category scoring** — each category is judged automatically as **Captured (1)**,
  **Weak (0.5)**, or **Missing (0)**. Scoring is **strict**: related text alone is not
  enough — *Captured* requires the information to be **specific, usable, and detailed**
  for that category (e.g. timeline needs a concrete duration/deadline/milestones; budget a
  concrete amount/range or numeric workload; scope specific activities; deliverables
  concrete outputs and/or a definition of done; success measurable/verifiable criteria;
  resources named systems/tools/access; roles a role *plus* skills/seniority/tasks). Vague,
  generic, or thin entries (e.g. "Improve engagement", "Build a dashboard", "Timeline:
  soon", "Budget to be discussed", "Need a developer") stay *Weak*. The table shows the
  status, score, a category-specific reason, the related detected issue, and the related
  follow-up question.
- **Baseline Completeness Score** = total category score ÷ 11 (e.g. `7.0 / 11 (64%)`).
  Consistency warnings are counted **separately**, not in this score.
- **Diagnostic Issue Count** — a summary of how many input-quality gaps the prototype
  makes visible: missing information issues + weak information issues + consistency /
  readiness warnings = **total diagnostic issues**. Warnings are separate from the
  completeness score but included in this total.
- **Follow-up Actions Generated** — counts all follow-up actions the prototype makes
  visible: **adaptive follow-up questions** (maturity-based diagnosis) + **category-specific
  follow-up questions** (taxonomy table) = **total** (exact duplicate questions counted
  once). A follow-up action is any targeted question generated to help close a missing,
  weak, or risky input category.
- **Diagnostic Coverage Rate** *(optional, evaluation only)* — if you paste manually
  identified reference issues (one per line), it reports prototype-detected ÷ manually
  identified, matched by keyword overlap. Otherwise it shows that manual reference issues
  are required. **Manual reference issues never affect the prototype's own scoring.**

The panel's main indicators are therefore: **Baseline Completeness Score · Diagnostic
Issue Count · Follow-up Actions Generated · (optional) Diagnostic Coverage Rate.** These
metrics evaluate **diagnostic visibility and actionability** before SoW generation — not
the quality of a final Statement of Work. The panel is rule-based (no AI/LLM) and works
for any pasted input package; nothing is hard-coded to specific examples.

## Evaluating reconstructed input packages (Chapter 6)

The Initial intake includes an **"Evaluate reconstructed input package"** button. Paste a
labelled baseline package (reconstructed from a Creator V2 conversation) into the main
textbox and click it: the prototype uses **rule-based section-label matching** (no LLM/NLP)
to recognise headings such as *Purpose / objective*, *Scope / included activities*,
*Deliverables / definition of done*, *Timeline / duration / milestones*, *Budget
expectations*, *Required roles / expertise*, *Resources / access / materials*,
*Company / industry / team context*, *Out-of-scope / limitations / dependencies*,
*Success criteria / validation logic*, etc., maps the content under each label to the
taxonomy fields, and then runs the existing scoring panel (Baseline Completeness Score,
Diagnostic Issue Count, Follow-up Actions Generated, and the SoW-compatible JSON with
`inputDiagnostics`). This mode is **only** for evaluation; the normal flow (initial input →
maturity screening → adaptive follow-up fields) is unchanged.

## Optional generation-layer feedback (second-pass safeguard)

After the package goes (offline) to the generation layer, the layer returns the
**remaining gaps** that still block finalization. The optional card below the structured
input package lets you **load or paste that `.followup.json` locally** (no backend, no
LLM, no live integration). It reads only the gap signals — `status`, `isFinalized`,
`percentage`, `displayMessage`, `schemaIssues`, and any SoW fields still set to
`"To be specified."` — maps them to the input-layer fields, de-duplicates, and **hides
gaps the input layer already covers**. It deliberately does **not** show the generation
layer's `followUpQuestions` (those duplicate the input-layer questions). "Refine remaining
gaps" preserves your strong input, prefills only safe non-placeholder values from the
returned SoW, switches to Mode 2, and highlights the package to refine and re-run. The
prototype never marks the SoW finalized — only the generation layer decides that. The
example feedback files are private fixtures and are not bundled or deployed.

## Generation-layer output format

The final structured input package (Step 6) also exports/displays a JSON object **aligned
with the Creator V2 / generation-layer SoW schema** (`title`, `purpose`,
`definitionOfDone`, `boundaries.{includedActivities,outOfScope}`, `mustHaveRequirements`,
`niceToHaveRequirements`, `timeline`, `budget.{costestimate,hourlyrate,averageweeklyhours}`,
`resources`, `location`, `language`, `type`, `isFinalized`, `percentage`). The input-layer
diagnostics (maturity level, baseline completeness, missing/weak categories, consistency
warnings, follow-up actions, context/success notes) are added under `inputDiagnostics`.
The taxonomy categories are mapped onto these fields with simple rules; the taxonomy
scoring panel itself is unchanged. "Download JSON" exports this object.

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
