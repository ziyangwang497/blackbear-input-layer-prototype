# Thesis Mapping — Evaluation Dimensions

This document explains how the prototype's checks map to the **four evaluation
dimensions** of the thesis model:

1. **Completeness**
2. **Consistency**
3. **Contextual relevance**
4. **Maturity appropriateness**

All checks are **simple, transparent, local rules**. The prototype is **not** an
NLP or AI classification system, and it performs **no truth verification**. It
never tries to judge whether a user's business claim is factually true. It only
checks whether the input is **meaningful, category-relevant, and contextually
useful** for structuring an assignment before SoW generation.

---

## What "relevant" means in this prototype

In the thesis, *relevant* does **not** mean semantic truth checking. It has two
concrete, rule-based meanings:

### (a) Relevant input variables / information categories

The prototype checks whether captured information belongs to the **required
input-category families** used before SoW generation:

- **Core SoW information** — objective, problem, scope, deliverables, definition
  of done, out-of-scope, timeline, constraints, success/acceptance criteria, etc.
- **Contextual information** — company, industry, team/user context, budget,
  stakeholders, domain/specialism.
- **Maturity indicators** — the signals that drive maturity screening (e.g.
  known uncertainties, objective/scope/deliverable/success clarity).

In the code, every input field is tagged with one of these families
(`CATEGORIES[...].group = "core" | "context" | "maturity"`), so each captured
value is, by construction, mapped to a relevant input category. Information that
fits **no** relevant category would be **low contextual relevance**.

### (b) Contextual relevance

The prototype checks whether the captured information is **useful for the
specific assignment context**, by testing a small set of context signals:

- company context
- industry context
- team or user context
- budget expectations
- domain or specialism (auto-detected from the assignment text)

A signal is **captured** when its field(s) contain meaningful (non-missing,
non-invalid) content; otherwise it is reported as **low contextual relevance**.

---

## Meaningfulness rule (completeness is not "non-empty")

A field counts toward **completeness only if it is meaningful** — being
non-empty is not enough. Each field is assessed by simple local rules into four
levels (`fieldStatus()` in `script.js`):

| Level | Rule | Example |
|---|---|---|
| **Missing** | empty | `""` |
| **Invalid / meaningless** | repeated characters, symbols-only, placeholder words, or keyboard mash (long consonant run) | `222222`, `aaaaaa`, `!!!!`, `test`, `asdf`, `asdfgh` |
| **Weak** | present but vague, very short, bare numbers, or only generic filler | `unknown`, `n/a`, `AI`, `12345`, `good stuff` |
| **Strong** | present and meaningful assignment information | `Improve project intake quality.` |

Only **strong** fields count as complete (full weight); **weak** earns half;
**invalid** and **missing** earn nothing. So `222222` or `asdf` can never make a
field "complete".

---

## Dimension-by-dimension mapping

### 1. Completeness
- **Where:** `scoreCompleteness(level)` and the *Missing information* / *Weak
  information* / *Invalid / meaningless information* lists in the dashboard.
- **How:** each maturity-relevant category is scored
  `weight × factor` (strong = 1, weak = 0.5, invalid/missing = 0); the
  percentage is shown as the completeness score. Gaps are split into the
  Missing, Weak, and Invalid dashboard lists.
- **Note:** completeness is evaluated against the **maturity-specific** category
  set (see dimension 4), so a vague assignment is judged on framing, not on
  detail it could not reasonably have yet. **Budget/workload** is included in the
  Medium and High category sets (it is a first-class field in real intake) and is
  weighted moderately so a missing budget is realistic, not punitive.

### 2. Consistency
- **Where:** `checkConsistency()` and the *Consistency warnings* list.
- **How:** independent rule-based contradiction checks, e.g. broad scope vs.
  short timeline; broad scope vs. limited budget; many deliverables / complex
  scope vs. missing resources/access; **multi-country / multi-site / multi-region
  scope vs. limited time or resources**; **no approval owner on a complex
  assignment**; **scope vs. workload anomaly** (broad scope but a small available
  workload); deliverables without a definition of done; vague objective but
  specific deliverables; success criteria not aligned with the objective;
  stakeholder missing although approval is required; included activities
  conflicting with out-of-scope (incidental common words such as "data" are
  ignored); non-measurable success criteria; milestones without deliverables;
  role overload.

### 3. Contextual relevance
- **Where:** `assessContext()` / `CONTEXT_SIGNALS` and the *Low contextual
  relevance* list, plus the cross-cutting context fields rendered in the
  requirements section.
- **How:** the five context signals (company, industry, team/user, budget,
  domain/specialism) are checked for meaningful capture. Signals that are not
  captured are flagged as reducing the input's contextual usefulness. This is
  the rule-based "is it useful for THIS assignment context?" check — **not** a
  semantic or truth check.

### 4. Maturity appropriateness
- **Where:** `classifyMaturity()`, `MATURITY_REQUIREMENTS`, and the maturity
  badge + reason + indicator list.
- **How:** maturity is **derived from the information provided** (never chosen by
  the user). The *required information*, the *follow-up questions*, and the
  *completeness criteria* then adapt to the detected level:
  - **Exploratory / Low** → problem context, objective, stakeholders, available
    information, uncertainty.
  - **Partially defined / Medium** → objective, scope, deliverables, timeline,
    constraints, stakeholders, success criteria.
  - **Well-defined / High** → deliverables, definition of done, dependencies,
    out-of-scope, acceptance criteria, validation logic, approval owner.
  This ensures the prototype asks for the *right things at the right stage* —
  the "maturity appropriateness" dimension.

---

## Dashboard ↔ dimension summary

| Dashboard item | Thesis dimension |
|---|---|
| Completeness score | Completeness |
| Missing information | Completeness |
| Weak information | Completeness (meaningfulness) |
| Invalid / meaningless information | Completeness (meaningfulness) |
| Low contextual relevance | Contextual relevance |
| Consistency warnings | Consistency |
| Maturity level + adaptive requirements/questions | Maturity appropriateness |
| Baseline Completeness Score (taxonomy, Step 5) | Completeness (diagnostic visibility) |
| Diagnostic Issue Count (missing + weak + warnings) | Diagnostic visibility |
| Follow-up Actions Generated | Actionability |
| Diagnostic Coverage Rate (optional) | Evaluation vs. manual reference |

---

## Evaluation metrics panel (Step 5)

A dedicated **taxonomy-based scoring panel** sits between the diagnosis (Step 4) and the
structured input package (Step 6). It evaluates the entered/pasted input against the
**11 fixed thesis taxonomy categories** and produces repeatable evaluation metrics for
Chapters 5–6. It is fully rule-based and transparent (no AI/LLM).

### Taxonomy-based scoring logic
Each of the 11 categories is scored **automatically** — `scoreTaxonomyCategory()` —
without any manual assignment:

- **Captured = 1** — specific, usable content.
- **Weak = 0.5** — mentioned but vague, generic, too short, or lacking detail.
- **Missing = 0** — absent or only placeholder/meaningless text.

Scoring is **strict**: related text alone is not enough. *Captured* requires the
information to be **specific, usable, and detailed** for that category, via a transparent
category-specific test — e.g. timeline needs a concrete duration/deadline/dated
milestones; budget a concrete amount/range or numeric workload; scope specific activities;
deliverables concrete outputs and/or a definition of done; success measurable/verifiable
criteria; resources named systems/tools/access; roles a role *plus* skills/seniority/
tasks; objective/problem/context enough specific detail (not a generic phrase). A
vague-wording penalty (e.g. "soon", "to be discussed", "TBD") caps a category at *Weak*.
So "Improve engagement" → Weak, while "Increase weekly active user engagement … through
automated communication" → Captured; "Timeline: soon" or "Q3" → Weak; empty budget →
Missing; "Budget to be discussed" → Weak; "Need a developer" → Weak. The panel shows a
per-category table with a **category-specific reason** for each score: **category, status,
score, reason, related detected issue, related follow-up question**.

### Baseline Completeness Score
`Baseline Completeness = total category score ÷ 11` (e.g. **7.0 / 11 (64%)**). Consistency
warnings are **counted separately** and are *not* part of this score.

### Diagnostic Issue Count
A main indicator summarising how many input-quality gaps the prototype makes visible:
`missing information issues + weak information issues + consistency / readiness warnings =
total diagnostic issues`. Warnings are separate from the completeness score but included
in this total. (e.g. an exploratory case → Missing 8, Weak 0, Warnings 0, **Total 8**.)

### Follow-up Actions Generated
Counts all follow-up actions the prototype makes visible: **adaptive follow-up questions**
(maturity-based diagnosis) + **category-specific follow-up questions** (taxonomy table) =
**total** (exact duplicate questions counted once). Replaces the earlier Action Conversion
Rate; it shows how the diagnosis turns into actionable guidance.

### Consistency / readiness risks (separate)
Counted as warnings, never folded into completeness — e.g. broad scope vs. short timeline;
senior expertise required but budget missing; success target without rationale; complex
scope but missing resources/access; scope defined but out-of-scope missing.

### Diagnostic Coverage Rate (optional, evaluation only)
If the researcher pastes **manual reference issues** (a gold-standard list, one per line),
`Diagnostic Coverage = prototype-detected reference issues ÷ manually identified reference
issues`, matched by transparent keyword overlap. If none are entered, the panel shows
*"Diagnostic coverage requires manual taxonomy reference issues."* **Manual reference
issues are used only for this metric and never affect the prototype's own scoring.**

### Generation-layer output format
The final structured input package (Step 6) is exported/displayed as a JSON object aligned
with the Creator V2 / generation-layer SoW schema (`title`, `purpose`, `definitionOfDone`,
`boundaries`, `mustHaveRequirements`, `niceToHaveRequirements`, `timeline`, `budget`,
`resources`, `location`, `language`, `type`, `isFinalized`, `percentage`), with the
input-layer diagnostics added under `inputDiagnostics`. The 11 taxonomy categories are
mapped onto these fields by simple rules; the **taxonomy scoring panel is unchanged** —
the taxonomy stays the evaluation lens, while the output package matches the
generation-layer format.

### What these metrics evaluate
They measure **diagnostic visibility and actionability** — how completely and consistently
the input is captured, how much of it is specific enough to be usable, and whether each
detected gap is turned into an actionable follow-up. They explicitly **do not** judge the
quality of a final Statement of Work; the prototype is an input-layer diagnostic, not a
generator, and does not replace Creator V2.

---

## Pattern source

The indicators, completeness categories, and consistency rules were **refined using
generalized patterns observed in a small, representative sample** of past
assignments (different sectors, varying levels of detail). The sample was used
only for offline pattern inspection — **not** as training data and **not**
embedded in the prototype. No raw records, client names, titles, costs, dates, or
confidential content appear anywhere in the website; the sample file is excluded
from the publishable folder.

## Boundaries

- **Transparent and rule-based** — every decision comes from stated rules in
  `script.js`, not a trained model, so it can be explained and reproduced.
- **No AI, no NLP classifier, no truth checking** — the relevance check supports
  the thesis model; it does not become a separate AI system.
- **Local only** — no backend, database, API key, confidential data, or real
  Blackbear documents. All examples are fictional.
- **Input layer only** — the output is a structured input package for a later
  generation layer, not a finished Statement of Work.
