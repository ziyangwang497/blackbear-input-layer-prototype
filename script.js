/* =================================================================
 * Adaptive Input Layer for SoW Generation — rule-based model
 * -----------------------------------------------------------------
 * One rule-based adaptive flow:
 *
 *   Initial assignment input
 *     → Rule-based maturity screening
 *       → Maturity-specific input requirements
 *         → Adaptive follow-up questions
 *           → Completeness, relevance & consistency checks
 *             → Structured input package for later SoW generation
 *
 * The artifact evaluates input along FOUR thesis dimensions, all with
 * simple, transparent local rules (NO AI, NO truth-checking):
 *   - completeness            (is the required info present & meaningful?)
 *   - consistency             (do the parts contradict each other?)
 *   - contextual relevance    (is the info category-relevant & useful for
 *                              THIS assignment context?)
 *   - maturity appropriateness(are we asking for the right things for the
 *                              detected maturity level?)
 *
 * IMPORTANT: "relevant" here does NOT mean semantic truth verification.
 * The prototype only checks that input is meaningful, category-relevant,
 * and contextually useful for structuring an assignment — it never tries
 * to verify whether a business claim is factually true.
 *
 * Blocks: 1 Configuration · 2 Field assessment · 3 Maturity ·
 *         4 Completeness · 5 Contextual relevance · 6 Consistency ·
 *         7 Adaptive questions · 8 Package + UI.
 * ================================================================= */

"use strict";

/* =================================================================
 * 1. CONFIGURATION
 * ================================================================= */

/* Every field the model knows about (id → label). */
const FIELDS = {
  initialDescription: "Initial assignment description",
  objective: "Objective",
  problem: "Problem statement / business context",
  companyContext: "Organisation / context",
  userRole: "Your role",
  scope: "Scope",
  includedActivities: "Included activities",
  outOfScope: "Out-of-scope activities",
  deliverables: "Deliverables",
  definitionOfDone: "Definition of done",
  timeline: "Timeline",
  milestones: "Milestones",
  budget: "Budget expectations",
  workload: "Workload expectations",
  requiredRoles: "Required roles",
  requiredExpertise: "Required expertise",
  tools: "Tools, systems, or access",
  documents: "Documents or data available",
  industryContext: "Industry context",
  teamContext: "Team / department context",
  stakeholders: "Stakeholder groups",
  assumptions: "Assumptions",
  dependencies: "Dependencies",
  risks: "Risks",
  limitations: "Constraints / limitations",
  successCriteria: "Success criteria",
  acceptanceCriteria: "Acceptance criteria",
  validationLogic: "Validation logic",
  approvalOwner: "Approval owner",
  uncertainty: "Known uncertainties / open questions",
};
const ALL_FIELD_IDS = Object.keys(FIELDS);

/* Fields shown in the simple Initial intake form. */
const BASIC_FIELD_IDS = ["initialDescription", "objective", "problem", "companyContext", "userRole"];

/* Input categories (the unit completeness scoring and questions use).
 * `group` records which RELEVANT INPUT CATEGORY family it belongs to —
 * one of the thesis families: core SoW information, contextual
 * information, or maturity indicators. */
const CATEGORIES = {
  objective:        { label: "Objective",                 group: "core",       fields: ["objective"],                                        weight: 3, question: "Can you state the core objective in one clear sentence?" },
  problem:          { label: "Problem context",           group: "core",       fields: ["problem"],                                          weight: 2, question: "What problem or business need is driving this assignment?" },
  stakeholders:     { label: "Stakeholders",              group: "context",    fields: ["stakeholders"],                                     weight: 2, question: "Who are the key stakeholders involved or affected?" },
  availableInfo:    { label: "Available information / data", group: "context",  fields: ["documents", "tools"],                              weight: 2, question: "What information, data, or systems do you already have access to?" },
  uncertainty:      { label: "Known uncertainties",       group: "maturity",   fields: ["uncertainty"],                                      weight: 1, question: "What is still uncertain or undecided at this stage?" },
  scope:            { label: "Scope",                      group: "core",       fields: ["scope", "includedActivities"],                      weight: 3, question: "What is included in scope, and where is the boundary?" },
  deliverables:     { label: "Deliverables",              group: "core",       fields: ["deliverables"],                                     weight: 3, question: "Which concrete deliverables are expected?" },
  timeline:         { label: "Timeline / milestones",     group: "core",       fields: ["timeline", "milestones"],                           weight: 2, question: "What is the expected timeline or what are the key milestones?" },
  constraints:      { label: "Constraints / dependencies", group: "core",      fields: ["assumptions", "dependencies", "risks", "limitations"], weight: 2, question: "What assumptions, dependencies, or constraints apply?" },
  success:          { label: "Success criteria",          group: "core",       fields: ["successCriteria"],                                  weight: 3, question: "How will success be measured?" },
  definitionOfDone: { label: "Definition of done",        group: "core",       fields: ["definitionOfDone"],                                 weight: 3, question: "What precisely defines 'done' for each deliverable?" },
  dependencies:     { label: "Dependencies",              group: "core",       fields: ["dependencies"],                                     weight: 2, question: "Which external dependencies must be in place?" },
  outOfScope:       { label: "Out-of-scope activities",   group: "core",       fields: ["outOfScope"],                                       weight: 3, question: "What is explicitly out of scope?" },
  acceptance:       { label: "Acceptance criteria",       group: "core",       fields: ["acceptanceCriteria"],                               weight: 3, question: "What acceptance criteria will be used to sign off?" },
  validation:       { label: "Validation logic",          group: "core",       fields: ["validationLogic"],                                  weight: 2, question: "How will the result be validated or tested?" },
  approvalOwner:    { label: "Approval owner",            group: "context",    fields: ["approvalOwner"],                                    weight: 2, question: "Who is the approval owner that signs off?" },
  /* Budget/workload is a first-class field in real SoW intake (rate, hours/
   * week, cost). Weight 2 so missing budget lowers the score moderately,
   * not punitively. */
  budget:           { label: "Budget / workload",         group: "context",    fields: ["budget", "workload"],                               weight: 2, question: "What budget, rate, or workload (e.g. hours per week) is expected?" },
};

/* MATURITY-SPECIFIC input requirements (what is evaluated per level). */
const MATURITY_REQUIREMENTS = {
  low: {
    note: "Exploratory assignments are evaluated mainly on problem context, objective, stakeholders, available information, and known uncertainty — not on detailed scoping.",
    categories: ["problem", "objective", "stakeholders", "availableInfo", "uncertainty"],
  },
  medium: {
    note: "Partially defined assignments are evaluated on objective, scope, deliverables, timeline, budget/workload, constraints, stakeholders, and success criteria.",
    categories: ["objective", "scope", "deliverables", "timeline", "budget", "constraints", "stakeholders", "success"],
  },
  high: {
    note: "Well-defined assignments are evaluated on precise deliverables, definition of done, dependencies, out-of-scope activities, budget/workload, acceptance criteria, validation logic, and approval owner.",
    categories: ["deliverables", "definitionOfDone", "dependencies", "outOfScope", "budget", "acceptance", "validation", "approvalOwner"],
  },
};

/* CONTEXTUAL RELEVANCE signals (thesis dimension). These are checked for
 * ALL maturity levels: is the captured information useful for the
 * SPECIFIC assignment context? `domain: true` is auto-detected from text. */
const CONTEXT_SIGNALS = [
  { key: "company",  label: "Company context",      fields: ["companyContext"] },
  { key: "industry", label: "Industry context",     fields: ["industryContext"] },
  { key: "teamUser", label: "Team / user context",  fields: ["teamContext", "userRole"] },
  { key: "budget",   label: "Budget expectations",  fields: ["budget", "workload"] },
  { key: "domain",   label: "Domain / specialism",  domain: true },
];

/* The 8 maturity indicators used by the classifier. */
const MATURITY_INDICATORS = [
  { key: "objective",   label: "Objective clarity",        fields: ["objective"] },
  { key: "scope",       label: "Scope clarity",            fields: ["scope", "outOfScope"] },
  { key: "deliverable", label: "Deliverable clarity",      fields: ["deliverables", "definitionOfDone"] },
  { key: "timeline",    label: "Timeline clarity",         fields: ["timeline", "milestones"] },
  { key: "resource",    label: "Resource clarity",         fields: ["requiredRoles", "requiredExpertise", "tools"] },
  { key: "constraint",  label: "Constraint clarity",       fields: ["assumptions", "dependencies", "risks", "limitations"] },
  { key: "success",     label: "Success-criteria clarity", fields: ["successCriteria", "acceptanceCriteria", "validationLogic"] },
  { key: "stakeholder", label: "Stakeholder clarity",      fields: ["stakeholders", "approvalOwner"] },
];

const EXPLORATORY_QUESTIONS = [
  "What business problem are you trying to solve?",
  "What outcome would make this project successful?",
  "Who will use the final output?",
  "What decision or process should this project support?",
  "What information or materials do you already have?",
];
const VALIDATION_QUESTIONS = [
  "Does the timeline match the expected deliverables?",
  "Are the success and acceptance criteria measurable?",
  "Are assumptions and dependencies confirmed?",
  "Are out-of-scope boundaries explicit for this complexity?",
  "Are there contradictions between scope, budget, and timeline?",
];

/* Domain detection: keyword → curated follow-up questions. */
const DOMAINS = [
  { key: "Market research / strategy", keywords: ["market research", "strategic assessment", "competitor", "segment", "go-to-market"], questions: ["Which regions, segments, or customer groups are in scope?", "What data sources are available, and are expert interviews required?"] },
  { key: "Policy / compliance / ESG", keywords: ["policy", "compliance", "esg", "regulation", "regulatory", "framework", "sustainability"], questions: ["Which standards or frameworks must the output align with?", "Who reviews or approves the final output?"] },
  { key: "Data migration / quality", keywords: ["data migration", "data quality", "data entry", "dataset", "records", "database", "cleansing", "migrate"], questions: ["Which systems and datasets are in scope?", "What quality benchmark or final validation is required, and who validates it?"] },
  { key: "Software / technical implementation", keywords: ["software", "implementation", "integration", "api", "module", "application", "platform"], questions: ["Which module or system is in scope, and what must it integrate with?", "What testing and acceptance process will be used?"] },
  { key: "Change management / transformation", keywords: ["change management", "transformation", "adoption", "organisational", "organizational", "behaviour", "behavior"], questions: ["Which stakeholder groups must change behaviour, and how is adoption measured?", "Is the work limited to diagnosis/design, or does it include implementation?"] },
  { key: "Tender / procurement", keywords: ["tender", "procurement", "rfp", "supplier selection", "vendor"], questions: ["What procurement output and selection criteria are required?", "Which stakeholders decide, and are legal checks included or excluded?"] },
  { key: "Certification / audit / QHSE", keywords: ["certification", "audit", "qhse", "iso", "accreditation"], questions: ["Which certification or standard, and which sites/countries are included?", "Who are the local contact points, and how is readiness reported?"] },
];

/* Phrases that signal a field was "filled" but is vague → WEAK. */
const VAGUE_MARKERS = [
  "unknown", "not sure", "not yet", "not specified", "not defined", "not fully",
  "unclear", "tbd", "to be determined", "n/a", "none yet", "maybe", "explore",
  "exploring", "don't know", "dont know", "?",
];
const MIN_STRONG_LENGTH = 4;

/* Placeholder / keyboard-mash tokens → treated as INVALID (meaningless). */
const PLACEHOLDER_WORDS = new Set(
  ("test testing asdf asdfg asdfgh asdfghjkl qwerty qwertyuiop zxcv zxcvbn lorem ipsum " +
   "foo bar baz foobar xxx xxxx yyy zzz blah dummy sample placeholder abc abcd abcde " +
   "aaa bbb ccc qwe wer asd sdf dfg dfgh hjkl jkl").split(" ")
);
/* Generic filler words that, alone, convey no assignment information →
 * content made only of these is WEAK (not complete). */
const GENERIC_WORDS = new Set(
  ("good bad nice stuff thing things etc misc yes okay fine something anything " +
   "everything whatever normal standard general generic blah none various several").split(" ")
);

/* ---------- FICTIONAL demo cases (no confidential data) ----------
 * Diverse business assignments from different contexts. None of them is
 * about "writing a Statement of Work" — they are real-world assignments
 * that would later need structuring for SoW generation. */
const TEST_CASES = [
  {
    /* 1. Exploratory: vague AI / process-improvement request. */
    name: "Exploratory", subtitle: "Low maturity",
    values: {
      initialDescription: "Our customer support team feels overloaded during busy periods and we think AI might help somewhere, but we haven't worked out where to start.",
      objective: "Use AI to ease the pressure on the customer support team.",
      problem: "Support agents are overwhelmed during peak periods and response times slip.",
      companyContext: "A growing online retail company.",
      userRole: "Customer support manager.",
      uncertainty: "We are not sure whether we need a chatbot, smarter ticket routing, or just more staff training.",
    },
  },
  {
    /* 2. Partially defined: analytics dashboard with some inputs but no criteria. */
    name: "Partially defined", subtitle: "Medium maturity",
    values: {
      initialDescription: "Build a sales performance dashboard so regional managers can track their KPIs in one place instead of chasing spreadsheets.",
      objective: "Give regional managers a single dashboard to monitor sales performance.",
      problem: "Sales data is currently scattered across spreadsheets and separate reports.",
      companyContext: "A B2B software company with several regional sales teams.",
      userRole: "Sales operations analyst.",
      industryContext: "B2B software / SaaS.",
      scope: "Visualise existing sales data — revenue, pipeline, and win rate — for regional managers.",
      includedActivities: "Connect to existing CRM data and build revenue, pipeline, and win-rate views with regional filters.",
      outOfScope: "Sales forecasting models and data-quality clean-up are not part of this work.",
      deliverables: "An interactive dashboard with revenue, pipeline, and win-rate views.",
      timeline: "About 8 weeks.",
      budget: "Indicative budget agreed for an eight-week build.",
      workload: "Roughly two to three days per week.",
      requiredRoles: "A BI / dashboard developer.",
      assumptions: "The underlying sales data is already available in the CRM.",
      successCriteria: "Managers should find it useful, but the exact acceptance criteria are not yet defined.",
      stakeholders: "Regional sales managers and the sales operations team.",
    },
  },
  {
    /* 3. Well-defined: AI-assisted business tool with clear scope/deliverables/etc. */
    name: "Well-defined", subtitle: "High maturity",
    values: {
      initialDescription: "Develop an AI-assisted invoice-processing tool that extracts data from supplier invoices and flags exceptions for the finance team to review.",
      objective: "Automate supplier-invoice data entry and exception handling for the finance team.",
      problem: "Finance staff manually key in invoice data, which is slow and error-prone.",
      companyContext: "A mid-size manufacturing company with a 12-person finance department.",
      userRole: "Finance process owner.",
      industryContext: "Manufacturing.",
      scope: "Process PDF supplier invoices, extract header and line-item data, and flag exceptions for review.",
      includedActivities: "OCR extraction, validation rules, and an exceptions review queue.",
      outOfScope: "Payment execution and a full ERP migration are out of scope.",
      deliverables: "- invoice data-extraction module\n- exceptions review queue\n- integration with the existing accounting system\n- user guide",
      definitionOfDone: "The tool processes 95% of standard invoices without manual data entry and routes the rest to the exceptions queue.",
      timeline: "10 weeks with two milestones.",
      milestones: "Week 5: extraction prototype; Week 10: integrated tool.",
      budget: "Budget approved for a ten-week build.",
      workload: "Around three days per week for ten weeks.",
      dependencies: "Depends on read access to the supplier-invoice mailbox and the accounting system API.",
      requiredRoles: "AI engineer, finance analyst, and integration developer.",
      tools: "Access to the accounting system API and a sample invoice dataset.",
      stakeholders: "Finance team, IT, and the CFO as sponsor.",
      successCriteria: "Reduce manual invoice data-entry time by 70% within two months of go-live.",
      acceptanceCriteria: "Finance lead confirms 95% extraction accuracy on a test batch of 200 invoices.",
      validationLogic: "Validated against a labelled test batch of 200 invoices before go-live.",
      approvalOwner: "The CFO signs off after user acceptance testing.",
    },
  },
  {
    /* 4. Inconsistent: overly broad automation request, unrealistic timeline,
     *    missing resources. Crafted to trigger several consistency warnings. */
    name: "Inconsistent demo", subtitle: "Triggers warnings",
    values: {
      initialDescription: "We want to automate all manual processes across the entire company within one month to cut costs everywhere.",
      objective: "Not fully decided yet, but automate as much as possible to save money.",
      problem: "There is too much manual work in every department.",
      companyContext: "A large company with many departments.",
      userRole: "Operations director.",
      scope: "Automate all processes in every department across all sites, end-to-end.",
      includedActivities: "Includes finance, HR, logistics, and customer-service automation.",
      deliverables: "- automated finance workflows\n- automated HR onboarding\n- automated logistics tracking\n- automated support responses",
      timeline: "1 month.",
      budget: "Very limited budget.",
      workload: "Only a few hours per week are available.",
      successCriteria: "Save as much money as possible.",
      approvalOwner: "The board must approve the outcome.",
      milestones: "222222",
    },
  },
];

/* =================================================================
 * 2. FIELD ASSESSMENT + SINGLE SOURCE OF TRUTH
 * -----------------------------------------------------------------
 * `state` holds every field value (so a value survives even when its
 * input is off-screen). Each field is assessed into FOUR levels with
 * simple local rules — completeness counts a field only if it is
 * STRONG (meaningful), so "222222", "asdf", or "test" never count as
 * complete:
 *
 *   missing  — empty.
 *   invalid  — random/repeated characters, symbols-only, keyboard mash,
 *              or placeholder words ("test", "asdf"). Meaningless.
 *   weak     — present but vague ("unknown"), very short, bare numbers,
 *              or only generic filler ("good stuff").
 *   strong   — present and meaningful assignment information.
 * ================================================================= */
const state = {};
ALL_FIELD_IDS.forEach((id) => (state[id] = ""));

const STOPWORDS = new Set("the a an and or of to in for on with is are be will shall should must we our this that all every into from your you within across".split(" "));
/* Significant content words (length > 3, not stopwords). */
function tokens(text) {
  return (text.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}
/* Content words that actually carry assignment meaning (drop generic filler). */
function meaningfulTokens(text) {
  return tokens(text).filter((w) => !GENERIC_WORDS.has(w));
}

/* Detect meaningless / random / placeholder input (rule-based, no AI). */
function isInvalidInput(raw) {
  const t = raw.toLowerCase();
  const c = t.replace(/\s+/g, "");
  if (/^(.)\1{3,}$/.test(c)) return true;            // "aaaaaa", "222222", "...."
  if (/^[\W_]+$/.test(c)) return true;               // symbols only: "!!!", "----"
  const uniqueTokens = [...new Set(t.split(/\s+/))];  // only placeholder words
  if (uniqueTokens.every((w) => PLACEHOLDER_WORDS.has(w))) return true;
  // Keyboard mash: a single word with a run of 5+ consonants (e.g. "asdfgh").
  // A consonant run that long does not occur in normal words, so this
  // avoids false positives on real (even low-vowel) words like "things".
  if (uniqueTokens.length === 1 && /^[a-z]+$/.test(c) && /[^aeiouy]{5,}/.test(c)) return true;
  return false;
}

/* Four-level assessment of a single field. */
function fieldStatus(text) {
  const raw = (text || "").trim();
  if (raw.length === 0) return "missing";
  if (isInvalidInput(raw)) return "invalid";
  const t = raw.toLowerCase();
  if (!/[a-z]/.test(t)) return "weak";                       // bare numbers/dates need context
  if (VAGUE_MARKERS.some((m) => t.includes(m))) return "weak";
  if (raw.length < MIN_STRONG_LENGTH) return "weak";
  if (meaningfulTokens(t).length === 0) return "weak";       // only generic filler
  return "strong";
}

/* Effective quality for scoring/classification: invalid info is as
 * useless as missing, so it is treated as missing here (but still shown
 * distinctly as "invalid" in the dashboard). */
function fieldQuality(text) {
  const s = fieldStatus(text);
  return s === "invalid" ? "missing" : s;
}

const QUALITY_RANK = { missing: 0, weak: 1, strong: 2 };
function bestQuality(fieldIds) {
  let best = "missing";
  for (const id of fieldIds) {
    const q = fieldQuality(state[id]);
    if (QUALITY_RANK[q] > QUALITY_RANK[best]) best = q;
  }
  return best;
}
function catQuality(key) { return bestQuality(CATEGORIES[key].fields); }

/* Raw status of a category (keeps "invalid" distinct, for the dashboard). */
const STATUS_RANK = { missing: 0, invalid: 1, weak: 2, strong: 3 };
function categoryStatusRaw(key) {
  let best = "missing";
  for (const id of CATEGORIES[key].fields) {
    const s = fieldStatus(state[id]);
    if (STATUS_RANK[s] > STATUS_RANK[best]) best = s;
  }
  return best;
}

/* =================================================================
 * 3. RULE-BASED MATURITY SCREENING
 * ================================================================= */
function classifyMaturity() {
  const indicators = MATURITY_INDICATORS.map((ind) => ({
    key: ind.key, label: ind.label, quality: bestQuality(ind.fields),
  }));
  const strongCount = indicators.filter((i) => i.quality === "strong").length;
  const isStrong = (k) => indicators.find((i) => i.key === k).quality === "strong";
  const coreStrong = isStrong("objective") && isStrong("scope") && isStrong("deliverable") && isStrong("success");

  let level, reason;
  if (coreStrong && strongCount >= 6) {
    level = "high";
    reason = `Objective, scope, deliverables, and success criteria are all clearly stated, and ${strongCount} of ${indicators.length} maturity indicators are strong. The assignment is mostly defined, so the input layer focuses on validation, completeness, and consistency.`;
  } else if (strongCount <= 2) {
    level = "low";
    reason = `Only ${strongCount} of ${indicators.length} maturity indicators are clearly defined. The assignment is still exploratory, so the input layer asks problem-framing questions before detailed scoping.`;
  } else {
    level = "medium";
    reason = `${strongCount} of ${indicators.length} maturity indicators are strong, but at least one core area (scope, deliverables, or success criteria) is incomplete. The goal is clear enough, so the input layer asks targeted clarification questions for the weak areas.`;
  }
  return { level, reason, indicators, strongCount };
}

/* =================================================================
 * 4. MATURITY-SPECIFIC COMPLETENESS
 * -----------------------------------------------------------------
 * Scored only against the categories that matter for the detected
 * level. A field counts toward completeness ONLY if it is strong
 * (meaningful); weak earns half; invalid/missing earn nothing.
 * ================================================================= */
const QUALITY_FACTOR = { missing: 0, invalid: 0, weak: 0.5, strong: 1 };
function scoreCompleteness(level) {
  const keys = MATURITY_REQUIREMENTS[level].categories;
  let earned = 0, max = 0;
  const categories = keys.map((key) => {
    const cat = CATEGORIES[key];
    const status = categoryStatusRaw(key);      // missing | invalid | weak | strong
    earned += cat.weight * QUALITY_FACTOR[status];
    max += cat.weight;
    return { key, label: cat.label, status, weight: cat.weight };
  });
  const score = Math.round((earned / max) * 100);
  const gaps = categories.filter((c) => c.status !== "strong");
  return { score, categories, gaps };
}

/* =================================================================
 * 5. CONTEXTUAL RELEVANCE (thesis dimension)
 * -----------------------------------------------------------------
 * NOT a semantic/truth check. It asks, with simple rules: is the
 * information category-relevant and useful for THIS assignment context?
 * A context signal is "captured" when its field(s) hold meaningful
 * (non-missing, non-invalid) content, or — for domain — when a
 * specialism can be detected from the assignment text. Signals that are
 * not captured are reported as LOW contextual relevance.
 * ================================================================= */
function detectDomains() {
  const text = (state.initialDescription + " " + state.objective + " " + state.scope + " " + state.deliverables).toLowerCase();
  return DOMAINS.filter((d) => d.keywords.some((k) => text.includes(k)));
}
function assessContext() {
  const captured = [], low = [];
  CONTEXT_SIGNALS.forEach((s) => {
    let ok;
    if (s.domain) ok = detectDomains().length > 0;
    else ok = s.fields.some((f) => ["weak", "strong"].includes(fieldStatus(state[f])));
    (ok ? captured : low).push(s.label);
  });
  return { captured, low };
}

/* =================================================================
 * 6. RULE-BASED CONSISTENCY CHECKS
 * ================================================================= */
function sharedTokens(a, b) {
  const sb = new Set(tokens(b));
  return [...new Set(tokens(a).filter((w) => sb.has(w)))];
}
/* Very common business words that overlap incidentally and must NOT be
 * read as a real included-vs-out-of-scope conflict (e.g. "data"). */
const COMMON_DOMAIN_WORDS = new Set("data system systems process processes project projects projectplan information support team teams management service services report reports reporting analysis tool tools work works".split(" "));
function conflictingActivities(a, b) {
  return sharedTokens(a, b).filter((w) => !COMMON_DOMAIN_WORDS.has(w));
}
function isBroadScope() {
  const text = (state.scope + " " + state.deliverables + " " + state.initialDescription).toLowerCase();
  const broadWords = ["all ", "entire", "everything", "every ", "company-wide", "company wide",
    "organisation-wide", "organization-wide", "global", "multiple regions", "multiple sites",
    "various ", "across the", "across all", "end-to-end", "full transformation", "many "];
  if (broadWords.some((w) => text.includes(w))) return true;
  return (state.scope.match(/\band\b/gi) || []).length >= 3;
}
function timelineWeeks() {
  const t = state.timeline.toLowerCase();
  let m = t.match(/(\d+)\s*week/); if (m) return parseInt(m[1], 10);
  m = t.match(/(\d+)\s*month/); if (m) return parseInt(m[1], 10) * 4;
  return null;
}
function isShortTimeline() {
  const t = state.timeline.toLowerCase();
  if (["asap", "urgent", "quick", "soon as possible", "few weeks"].some((w) => t.includes(w))) return true;
  const w = timelineWeeks();
  return w !== null && w <= 4;
}
function isLowBudget() {
  const q = bestQuality(["budget", "workload"]);
  if (q !== "strong") return true;
  const t = (state.budget + " " + state.workload).toLowerCase();
  return ["low", "small", "limited", "minimal", "tight"].some((w) => t.includes(w));
}
function deliverableCount() {
  return state.deliverables.split(/[\n;•]|,| - |^- /m).map((s) => s.trim()).filter(Boolean).length;
}
function successIsMeasurable() {
  const t = (state.successCriteria + " " + state.acceptanceCriteria + " " + state.validationLogic).toLowerCase();
  if (fieldQuality(t) !== "strong") return false;
  return /\d|%|measur|kpi|metric|reduce|increase|fewer|more than|less than|rate|accuracy|target/.test(t);
}
function approvalRequired() {
  return bestQuality(["approvalOwner", "acceptanceCriteria"]) !== "missing" ||
    /approv|sign[- ]?off|steering committee|sign off/.test((state.validationLogic + " " + state.initialDescription).toLowerCase());
}
function tooManyRoles() {
  const t = (state.requiredRoles + " " + state.requiredExpertise).toLowerCase();
  const roleWords = ["researcher", "legal", "trainer", "project manager", "analyst", "change manager", "engineer", "designer", "auditor", "consultant", "developer"];
  if (roleWords.filter((w) => t.includes(w)).length >= 4) return true;
  return state.requiredRoles.split(",").filter((s) => s.trim()).length >= 5;
}
/* Scope that spans multiple countries / sites / regions / departments —
 * a frequent pattern in the sample (e.g. multi-country certifications,
 * multi-site operations). */
function isMultiLocation() {
  const t = (state.scope + " " + state.deliverables + " " + state.initialDescription + " " + state.includedActivities).toLowerCase();
  if (/\b(\d+|several|multiple|many|all)\s+(countr|site|region|location|department|branch)/.test(t)) return true;
  if (/across\s+(all|multiple|several|the)\s+(countr|site|region|location|department)/.test(t)) return true;
  return ["multi-country", "multi-site", "multi-region", "multiple countries", "several countries", "various sites", "every department", "all sites", "all regions"].some((w) => t.includes(w));
}
/* Workload that looks small relative to an ambitious scope (few hours/
 * week, one or two days). Used for the budget/workload anomaly check. */
function isLowWorkload() {
  const t = (state.workload + " " + state.budget + " " + state.timeline).toLowerCase();
  if (/\b(1|one|2|two)\s*(day|days)\s*(per|a)\s*week/.test(t)) return true;
  const hm = t.match(/(\d+)\s*h(?:ours)?\s*(?:\/|per|a)?\s*week/);
  if (hm && parseInt(hm[1], 10) <= 12) return true;
  return ["few hours", "couple of hours", "part-time", "part time", "limited availability"].some((w) => t.includes(w));
}
function checkConsistency() {
  const warnings = [];
  const broad = isBroadScope();
  const delivCount = deliverableCount();
  const push = (title, detail) => warnings.push({ title, detail });

  if (broad && isShortTimeline())
    push("Broad scope but short timeline", "The scope looks broad but the timeline is short. Check whether the work is realistically deliverable in time.");
  if (broad && isLowBudget())
    push("Broad scope but limited budget", "A broad scope is described, but budget or workload is low or unspecified. Ambition may exceed available effort.");
  if (catQuality("deliverables") === "strong" && catQuality("definitionOfDone") !== "strong")
    push("Deliverables without definition of done", "Deliverables are listed, but there is no clear definition of done. Define what 'complete' means for each deliverable.");
  if (catQuality("objective") !== "strong" && catQuality("deliverables") === "strong")
    push("Vague objective but specific deliverables", "Concrete deliverables are described, but the underlying objective is vague. Confirm the deliverables actually serve the goal.");
  if (catQuality("objective") === "strong" && catQuality("success") === "strong" &&
      sharedTokens(state.objective, state.successCriteria).length === 0)
    push("Success criteria not aligned with objective", "The success criteria do not appear to reference the stated objective. Check that success is measured against the actual goal.");
  if (approvalRequired() && catQuality("stakeholders") === "missing")
    push("Stakeholder group missing although approval is required", "An approval owner or acceptance step is mentioned, but no stakeholder group is identified. Name who is involved and who signs off.");
  const conflict = conflictingActivities(state.includedActivities, state.outOfScope);
  if (catQuality("scope") !== "missing" && conflict.length > 0)
    push("Included activities conflict with out-of-scope", `An activity appears in both included and out-of-scope (e.g. "${conflict[0]}"). Resolve the contradiction.`);
  if ((broad || delivCount >= 4) && bestQuality(["requiredRoles", "tools", "documents"]) !== "strong")
    push("Complex scope but missing resource/access information", "The scope is complex, but required roles, tools, or access are not clearly defined.");
  // Multi-country / multi-site / multi-region scope without local resources or with a short timeline.
  if (isMultiLocation() && (isShortTimeline() || bestQuality(["requiredRoles", "tools", "documents"]) !== "strong"))
    push("Multi-country / multi-site scope vs. limited time or resources", "The assignment spans multiple countries, sites, or regions, but the timeline is short or local resources/contacts are not clearly defined.");
  // No approval owner identified on a sizeable assignment.
  if ((broad || delivCount >= 4 || isMultiLocation()) && bestQuality(["approvalOwner"]) === "missing")
    push("No approval owner for a complex assignment", "This is a sizeable assignment, but no approval owner / sign-off is identified. Name who accepts the result.");
  // Budget / workload anomaly: broad or complex scope but a small available workload.
  if ((broad || delivCount >= 4 || isMultiLocation()) && isLowWorkload())
    push("Scope vs. workload anomaly", "The scope is broad or complex, but the available workload (hours per week or days) looks small. Check that the effort matches the ambition.");
  if (catQuality("deliverables") === "strong" && !successIsMeasurable())
    push("Success criteria not measurable", "Deliverables are stated, but success/acceptance criteria are missing or not measurable. Define how the outcome will be judged.");
  if (bestQuality(["milestones"]) === "strong" && catQuality("deliverables") !== "strong")
    push("Milestones without clear deliverables", "Milestones are mentioned, but the deliverables tied to them are not clearly defined.");
  if (tooManyRoles())
    push("Role requirements combine many responsibilities", "The required roles mix several unrelated responsibilities. Confirm this is realistic for one engagement.");
  return warnings;
}

/* =================================================================
 * 7. ADAPTIVE FOLLOW-UP QUESTIONS
 * ================================================================= */
function generateQuestions(level, completeness) {
  const questions = [];
  const seen = new Set();
  const add = (text, source) => { const k = text.toLowerCase(); if (!seen.has(k)) { seen.add(k); questions.push({ text, source }); } };
  const gapKeys = new Set(completeness.gaps.map((g) => g.key));

  if (level === "low") {
    EXPLORATORY_QUESTIONS.forEach((q) => add(q, "Exploratory"));
  } else if (level === "medium") {
    completeness.categories.forEach((c) => { if (gapKeys.has(c.key)) add(CATEGORIES[c.key].question, "Targeted clarification"); });
  } else {
    VALIDATION_QUESTIONS.forEach((q) => add(q, "Validation"));
    completeness.categories.forEach((c) => { if (gapKeys.has(c.key) && CATEGORIES[c.key].weight >= 3) add(CATEGORIES[c.key].question, "Validation gap"); });
  }
  if (level !== "high") detectDomains().forEach((d) => d.questions.forEach((q) => add(q, d.key)));
  return questions;
}

/* =================================================================
 * 8a. STRUCTURED INPUT PACKAGE
 * ================================================================= */
function buildPackage(maturity, completeness, context, issues, questions, warnings) {
  const confirmed = ALL_FIELD_IDS
    .filter((id) => fieldStatus(state[id]) === "strong")
    .map((id) => ({ label: FIELDS[id], value: state[id] }));

  const nextActions = [];
  issues.forEach((it) => {
    if (it.type === "Low relevance") nextActions.push(`Add ${it.label.toLowerCase()} to make the input contextually useful.`);
    else if (it.type === "Invalid") nextActions.push(`Replace the meaningless value in "${it.label}" with real assignment information.`);
    else nextActions.push(`Provide or strengthen "${it.label}" (currently ${it.type.toLowerCase()}).`);
  });
  warnings.forEach((w) => nextActions.push(`Resolve consistency risk: ${w.title}.`));
  if (nextActions.length === 0)
    nextActions.push("Input looks complete, relevant, and consistent for this maturity level — ready for the generation layer.");

  return {
    levelLabel: LEVEL_META[maturity.level].label,
    levelClass: LEVEL_META[maturity.level].cls,
    reason: maturity.reason,
    confirmed,
    issues,
    contextCaptured: context.captured,
    questions: questions.map((q) => q.text),
    risks: warnings.map((w) => `${w.title}: ${w.detail}`),
    nextActions,
  };
}

/* =================================================================
 * 8b. RENDERING + STATE BINDING
 * ================================================================= */
const LEVEL_META = {
  low:    { label: "Exploratory · Low maturity", short: "Low", cls: "level-low" },
  medium: { label: "Partially defined · Medium maturity", short: "Medium", cls: "level-med" },
  high:   { label: "Well-defined · High maturity", short: "High", cls: "level-high" },
};
const STATUS_META = {
  missing: { cls: "miss", tag: "Missing" },
  invalid: { cls: "miss", tag: "Invalid" },
  weak:    { cls: "weak", tag: "Weak" },
  strong:  { cls: "ok",   tag: "Strong" },
};
function escapeHtml(str) {
  return (str || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
let lastPackage = null;

function bindBasicInputs() {
  BASIC_FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", (e) => { state[id] = e.target.value; });
  });
}
function syncBasicInputs() {
  BASIC_FIELD_IDS.forEach((id) => { const el = document.getElementById(id); if (el) el.value = state[id]; });
}

/* Build one requirement/context row (basic fields shown read-only). */
function fieldRowHtml(fieldId) {
  if (BASIC_FIELD_IDS.includes(fieldId)) {
    const val = state[fieldId] ? escapeHtml(state[fieldId]) : "<em>not provided — add it in the Initial intake above</em>";
    return `<div class="req-basic">${FIELDS[fieldId]}: ${val}</div>`;
  }
  return `<textarea data-fid="${fieldId}" rows="2" placeholder="${FIELDS[fieldId]}">${escapeHtml(state[fieldId])}</textarea>`;
}

/* Render maturity-specific requirement fields + the cross-cutting
 * contextual-relevance fields. */
function renderRequirementFields(level, completeness, context) {
  const host = document.getElementById("req-fields");
  const statusByKey = {};
  completeness.categories.forEach((c) => (statusByKey[c.key] = c.status));

  const reqHtml = MATURITY_REQUIREMENTS[level].categories.map((key) => {
    const cat = CATEGORIES[key];
    const s = STATUS_META[statusByKey[key]];
    return `<div class="req-field"><div class="req-head"><span class="field-label">${cat.label}</span>
      <span class="pill ${statusByKey[key]}">${s.tag}</span></div>${cat.fields.map(fieldRowHtml).join("")}</div>`;
  }).join("");

  const lowSet = new Set(context.low);
  const ctxHtml = CONTEXT_SIGNALS.map((sig) => {
    const ok = !lowSet.has(sig.label);
    const pill = ok ? "strong" : "missing";
    const tag = ok ? "Relevant" : "Low";
    let body;
    if (sig.domain) {
      const ds = detectDomains();
      body = `<div class="req-basic">Auto-detected from the assignment text: ${ds.length ? "<em>" + ds.map((d) => d.key).join(", ") + "</em>" : "<em>no specific domain detected</em>"}</div>`;
    } else {
      body = sig.fields.map(fieldRowHtml).join("");
    }
    return `<div class="req-field"><div class="req-head"><span class="field-label">${sig.label}</span>
      <span class="pill ${pill}">${tag}</span></div>${body}</div>`;
  }).join("");

  host.innerHTML = reqHtml +
    `<div class="req-subhead">Contextual relevance — checked for all maturity levels</div>` + ctxHtml;

  host.querySelectorAll("textarea[data-fid]").forEach((el) =>
    el.addEventListener("input", (e) => { state[e.target.dataset.fid] = e.target.value; }));
}

/* Render one dashboard status list (or an OK row when empty). */
function renderStatusList(elId, items, emptyMsg, hint) {
  const el = document.getElementById(elId);
  const hintHtml = hint ? ` <span class="hint">— ${hint}</span>` : "";
  el.innerHTML = items.length
    ? items.map((it) => `<li class="${it.cls}"><span class="tag">${it.tag}</span><span>${it.text}${hintHtml}</span></li>`).join("")
    : `<li class="ok"><span class="tag">OK</span><span>${emptyMsg}</span></li>`;
}

function analyze() {
  // --- Model flow ---
  const maturity = classifyMaturity();
  const completeness = scoreCompleteness(maturity.level);
  const context = assessContext();
  const warnings = checkConsistency();
  const questions = generateQuestions(maturity.level, completeness);

  // --- Build the dashboard buckets (the five distinctions) ---
  const missingItems = completeness.gaps.filter((g) => g.status === "missing")
    .map((g) => ({ cls: "miss", tag: "Missing", text: g.label }));
  const weakItems = completeness.gaps.filter((g) => g.status === "weak")
    .map((g) => ({ cls: "weak", tag: "Weak", text: g.label }));
  // Invalid is checked across the whole form (meaningless input is bad anywhere).
  const invalidFieldIds = ALL_FIELD_IDS.filter((id) => fieldStatus(state[id]) === "invalid");
  const invalidItems = invalidFieldIds.map((id) => ({ cls: "miss", tag: "Invalid", text: `${FIELDS[id]} — "${escapeHtml(state[id].trim())}" is not meaningful input` }));
  const lowRelItems = context.low.map((label) => ({ cls: "weak", tag: "Low", text: `${label} not captured — reduces contextual usefulness for this assignment` }));
  const warnItems = warnings.map((w) => ({ cls: "weak", tag: "Warning", text: `<strong>${w.title}.</strong> ${escapeHtml(w.detail)}` }));

  // Issues list for the package (typed).
  const issues = [
    ...completeness.gaps.filter((g) => g.status === "missing").map((g) => ({ label: g.label, type: "Missing" })),
    ...completeness.gaps.filter((g) => g.status === "weak").map((g) => ({ label: g.label, type: "Weak" })),
    ...invalidFieldIds.map((id) => ({ label: FIELDS[id], type: "Invalid" })),
    ...context.low.map((label) => ({ label, type: "Low relevance" })),
  ];

  const pkg = buildPackage(maturity, completeness, context, issues, questions, warnings);
  lastPackage = pkg;

  // --- Metrics panel (the four thesis dimensions + level + questions) ---
  document.getElementById("metrics-grid").innerHTML = [
    { v: completeness.score + "%", c: "Completeness" },
    { v: missingItems.length + weakItems.length + invalidItems.length, c: "Input quality issues" },
    { v: lowRelItems.length, c: "Low contextual relevance" },
    { v: warnings.length, c: "Consistency warnings" },
    { v: questions.length, c: "Follow-up questions" },
    { v: LEVEL_META[maturity.level].short, c: "Maturity" },
  ].map((m) => `<div class="metric-tile"><div class="value">${m.v}</div><div class="caption">${m.c}</div></div>`).join("");

  // --- Maturity screening ---
  const lm = LEVEL_META[maturity.level];
  document.getElementById("maturity-summary").innerHTML = `<span class="maturity-badge ${lm.cls}">${lm.label}</span>`;
  document.getElementById("maturity-reason").textContent = maturity.reason;
  document.getElementById("maturity-indicators").innerHTML = maturity.indicators.map((i) =>
    `<div class="indicator"><span>${i.label}</span><span class="pill ${i.quality}">${i.quality}</span></div>`).join("");

  // --- Maturity-specific requirement + context fields ---
  document.getElementById("req-explanation").textContent = MATURITY_REQUIREMENTS[maturity.level].note;
  renderRequirementFields(maturity.level, completeness, context);

  // --- Adaptive follow-up questions ---
  document.getElementById("followup-intro").textContent = {
    low: "Exploratory problem-framing questions (the goal is still vague):",
    medium: "Targeted clarification questions for the weak or missing areas:",
    high: "Validation questions (the assignment is mostly defined):",
  }[maturity.level];
  document.getElementById("followup-list").innerHTML =
    questions.map((q) => `<li><span class="q-domain">${q.source}:</span> ${escapeHtml(q.text)}</li>`).join("") ||
    "<li>No follow-up questions needed.</li>";

  // --- Completeness, relevance & consistency ---
  document.getElementById("completeness-fill").style.width = completeness.score + "%";
  document.getElementById("completeness-label").textContent = completeness.score + "%";
  renderStatusList("missing-list", missingItems, "No required categories are empty for this maturity level.", "improve this in Step 3");
  renderStatusList("weak-list", weakItems, "No weak (vague or thin) information detected.", "use the suggested follow-up questions in Step 3");
  renderStatusList("invalid-list", invalidItems, "No meaningless or random input detected.", "replace with meaningful input");
  renderStatusList("lowrel-list", lowRelItems, "All contextual signals are captured.", "add this context in Step 3");
  renderStatusList("warning-list", warnItems, "No consistency contradictions detected.", "address this in Step 3");

  // --- Structured input package ---
  renderPackage(pkg);
  document.getElementById("results").hidden = false;
}

function renderPackage(pkg) {
  const block = (title, bodyHtml, empty) =>
    `<div class="pkg-block"><div class="pkg-title">${title}</div><div class="pkg-body${empty ? " empty" : ""}">${bodyHtml}</div></div>`;
  const ul = (arr) => arr.length ? `<ul>${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>` : null;
  const blocks = [];

  blocks.push(block("1 · Detected maturity level", `<span class="pkg-badge ${pkg.levelClass}">${pkg.levelLabel}</span>`));
  blocks.push(block("2 · Reason for classification", escapeHtml(pkg.reason)));
  blocks.push(block("3 · Confirmed information",
    pkg.confirmed.length ? `<dl class="kv">${pkg.confirmed.map((c) => `<dt>${c.label}</dt><dd>${escapeHtml(c.value)}</dd>`).join("")}</dl>` : "No information has been confirmed yet.",
    pkg.confirmed.length === 0));
  blocks.push(block("4 · Missing, weak, invalid, or low-relevance information",
    pkg.issues.length ? `<ul>${pkg.issues.map((it) => `<li><strong>[${it.type}]</strong> ${escapeHtml(it.label)}</li>`).join("")}</ul>` : "None — required, meaningful, and contextually relevant information is present.",
    pkg.issues.length === 0));
  blocks.push(block("5 · Adaptive follow-up questions", ul(pkg.questions) || "No follow-up questions needed.", pkg.questions.length === 0));
  blocks.push(block("6 · Consistency risks", ul(pkg.risks) || "No consistency contradictions detected.", pkg.risks.length === 0));
  blocks.push(block("7 · Recommended next-step input actions", ul(pkg.nextActions)));

  document.getElementById("package-output").innerHTML = blocks.join("");
}

/* =================================================================
 * 8c. DEMO CASES, EXPORT, WIRING
 * ================================================================= */
function renderExampleButtons() {
  const host = document.getElementById("example-buttons");
  host.innerHTML = TEST_CASES.map((tc, i) =>
    `<button class="btn" type="button" data-case="${i}">${tc.name}<small>${tc.subtitle}</small></button>`).join("");
  host.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => loadTestCase(parseInt(btn.dataset.case, 10))));
}
function loadTestCase(i) {
  clearAll();
  Object.entries(TEST_CASES[i].values).forEach(([id, val]) => { if (id in state) state[id] = val; });
  syncBasicInputs();
  analyze();
  document.getElementById("results").scrollIntoView({ behavior: "smooth" });
}
function clearAll() {
  ALL_FIELD_IDS.forEach((id) => (state[id] = ""));
  syncBasicInputs();
  document.getElementById("results").hidden = true;
}

function packageToText() {
  if (!lastPackage) return "";
  const p = lastPackage;
  const sec = (t, b) => `${t}\n${"-".repeat(t.length)}\n${b}\n`;
  return "STRUCTURED INPUT PACKAGE FOR LATER SoW GENERATION\n(input layer — not a Statement of Work)\n" + "=".repeat(56) + "\n\n" +
    sec("1. Detected maturity level", p.levelLabel) +
    sec("2. Reason for classification", p.reason) +
    sec("3. Confirmed information", p.confirmed.length ? p.confirmed.map((c) => `- ${c.label}: ${c.value}`).join("\n") : "(none)") +
    sec("4. Missing / weak / invalid / low-relevance information", p.issues.length ? p.issues.map((it) => `- [${it.type}] ${it.label}`).join("\n") : "(none)") +
    sec("5. Adaptive follow-up questions", p.questions.length ? p.questions.map((q) => `- ${q}`).join("\n") : "(none)") +
    sec("6. Consistency risks", p.risks.length ? p.risks.map((r) => `- ${r}`).join("\n") : "(none)") +
    sec("7. Recommended next-step input actions", p.nextActions.map((a) => `- ${a}`).join("\n"));
}
function copyPackage() {
  navigator.clipboard.writeText(packageToText()).then(
    () => flashButton("copy-btn", "Copied!"), () => flashButton("copy-btn", "Copy failed"));
}
function downloadPackage() {
  if (!lastPackage) return;
  const blob = new Blob([JSON.stringify(lastPackage, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "sow-input-package.json"; a.click();
  URL.revokeObjectURL(url);
}
function flashButton(id, msg) {
  const btn = document.getElementById(id);
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => { btn.textContent = original; }, 1500);
}

document.addEventListener("DOMContentLoaded", () => {
  bindBasicInputs();
  renderExampleButtons();
  document.getElementById("analyze-btn").addEventListener("click", () => {
    analyze();
    document.getElementById("results").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("rerun-btn").addEventListener("click", analyze);
  document.getElementById("reset-btn").addEventListener("click", clearAll);
  document.getElementById("copy-btn").addEventListener("click", copyPackage);
  document.getElementById("download-btn").addEventListener("click", downloadPackage);
});
