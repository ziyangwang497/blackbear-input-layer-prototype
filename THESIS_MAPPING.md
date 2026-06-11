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
