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

/* Fields captured at the simple entry point: one main description box plus an
 * optional, collapsed context block (organisation, role, constraints/background).
 * Everything else — including objective, problem, scope, deliverables — is asked
 * for adaptively in Step 3 only after maturity screening. */
const BASIC_FIELD_IDS = ["initialDescription", "companyContext", "userRole", "limitations"];

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
  resources:        { label: "Required roles / resources / access", group: "context", fields: ["requiredRoles", "requiredExpertise", "tools", "documents"], weight: 2, question: "Which roles, expertise, tools, data, or access are required?" },
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
    note: "Well-defined assignments are evaluated on precise deliverables, definition of done, dependencies, out-of-scope activities, budget/workload, required roles/resources, acceptance criteria, validation logic, and approval owner.",
    categories: ["deliverables", "definitionOfDone", "dependencies", "outOfScope", "budget", "resources", "acceptance", "validation", "approvalOwner"],
  },
};

/* =================================================================
 * THESIS TAXONOMY (11 fixed categories) — used by the evaluation panel.
 * -----------------------------------------------------------------
 * Independent of the maturity-specific completeness above. Each category
 * is scored automatically (Captured = 1, Weak = 0.5, Missing = 0) by the
 * rule-based heuristic in scoreTaxonomyCategory(): word count + vague
 * wording + a category-specific "concrete signal" regex. `needsConcrete`
 * categories (timeline, budget, success) require a concrete number/date/
 * measure to count as Captured. `match` terms link a category to related
 * consistency warnings for the scoring table.
 * ================================================================= */
const WEAK_PHRASES = [
  "soon", "later", "to be discussed", "to be decided", "to be defined",
  "to be determined", "tba", "as needed", "as required", "flexible",
  "ongoing", "when possible", "if needed", "to follow",
];
const TAXONOMY = [
  { key: "objective", label: "Objective / purpose", fields: ["objective"], needsConcrete: false,
    concrete: /\d/, question: "State the core objective in one specific sentence (what outcome, for whom).", match: ["objective"] },
  { key: "problem", label: "Problem statement / business context", fields: ["problem"], needsConcrete: false,
    concrete: /\d|manual|slow|error|scattered|inefficient|cost|delay|bottleneck|compliance|lack of/, question: "What problem or business need drives this assignment, and why now?", match: ["problem", "context"] },
  { key: "scope", label: "Scope / included activities", fields: ["scope", "includedActivities"], needsConcrete: false,
    concrete: /[,;•\n]|process|analy|build|design|implement|integrat|develop|configur|visuali|migrat|extract/, question: "What is included in scope, and what are the main activities?", match: ["scope"] },
  { key: "deliverables", label: "Deliverables / definition of done", fields: ["deliverables", "definitionOfDone"], needsConcrete: false,
    concrete: /[,;•\n]|report|dashboard|tool|module|document|plan|model|prototype|guide|system|analysis|template/, question: "Which concrete deliverables are expected, and what defines 'done'?", match: ["deliverable", "definition of done", "milestone"] },
  { key: "timeline", label: "Timeline / duration / milestones", fields: ["timeline", "milestones"], needsConcrete: true,
    concrete: /\d|week|month|day|quarter|q[1-4]|year|deadline|milestone/, question: "What is the expected timeline, duration, or key milestones (with dates)?", match: ["timeline"] },
  { key: "budget", label: "Budget expectations", fields: ["budget", "workload"], needsConcrete: true,
    concrete: /\d|[€$£]|eur|usd|\bk\b|hour|fte|per week|day rate/, question: "What budget, rate, or workload (e.g. hours per week) is expected?", match: ["budget", "workload"] },
  { key: "roles", label: "Required roles / expertise", fields: ["requiredRoles", "requiredExpertise"], needsConcrete: false,
    concrete: /engineer|developer|analyst|manager|designer|consultant|specialist|lead|architect|expert|scientist|officer|coordinator|owner|trainer|researcher|senior|junior/, question: "Which roles or expertise (and seniority) are required?", match: ["role", "expertise", "responsibilit"] },
  { key: "resourcesAccess", label: "Resources / access / materials", fields: ["tools", "documents"], needsConcrete: false,
    concrete: /api|system|dataset|\bdata\b|access|tool|document|platform|database|\bfile|software|repository|environment|material|template|licen/, question: "What tools, systems, data, access, or materials are available or required?", match: ["resource", "access"] },
  { key: "context", label: "Company / industry / team context", fields: ["companyContext", "industryContext", "teamContext", "userRole"], needsConcrete: false,
    concrete: /\d|industry|sector|company|team|department|organi[sz]ation|saas|manufactur|retail|healthcare|finance|public|government|b2b|logistics|education/, question: "What company, industry, or team context is relevant?", match: ["context", "stakeholder"] },
  { key: "outOfScope", label: "Out-of-scope / limitations / dependencies", fields: ["outOfScope", "limitations", "dependencies", "assumptions", "risks"], needsConcrete: false,
    concrete: /[,;•\n]|not includ|out of scope|exclud|assum|depend|limitation|constraint|\brisk|without/, question: "What is explicitly out of scope, and what limitations or dependencies apply?", match: ["out-of-scope", "out of scope", "conflict", "dependenc", "limitation"] },
  { key: "success", label: "Success criteria / validation logic", fields: ["successCriteria", "acceptanceCriteria", "validationLogic"], needsConcrete: true,
    concrete: /\d|%|kpi|metric|target|\brate\b|accuracy|reduce|increase|fewer|within|measur|criteri|accept|validat|sign/, question: "How will success be measured and validated (measurable acceptance criteria)?", match: ["success", "measurable", "not aligned", "acceptance", "validation"] },
];

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

/* Negative placeholder phrases meaning "no information here". A field made up
 * ONLY of these (no other usable assignment information) scores MISSING — in
 * both taxonomy scoring AND maturity screening. Longest phrases first so
 * "not clearly specified" is removed before "not specified". */
const NEGATIVE_PLACEHOLDERS = [
  "not clearly specified", "not clearly defined", "no information provided",
  "no meaningful information", "to be determined", "to be defined", "to be confirmed",
  "not yet specified", "not yet defined", "not specified", "not defined", "not provided",
  "not mentioned", "not available", "not applicable", "not sure yet", "not sure",
  "no information", "no info", "unspecified", "undefined", "unknown", "unclear",
  "n a", "tbd", "none", "not yet",
].sort((a, b) => b.length - a.length);

/* Uncertainty / limitation markers (word-boundary) that cap a field at WEAK,
 * even when other usable information is present. */
const UNCERTAINTY_RE = /\b(unclear|limited|partly|partially|not fully|however|insufficient|vague|but)\b/;

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

/* True when a field, after removing negative placeholder phrases, has NO
 * remaining usable assignment information — i.e. it only says "no info".
 * e.g. "Not clearly specified.", "Unknown", "N/A", "No information provided". */
function negativePlaceholderOnly(text) {
  let t = " " + String(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim() + " ";
  if (t.trim() === "") return false; // empty is handled as "missing" upstream
  for (const p of NEGATIVE_PLACEHOLDERS) {
    t = t.replace(new RegExp("\\s" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s", "g"), " ");
  }
  // Anything meaningful left? (drop stopwords / generic filler / very short words)
  const remaining = t.split(/\s+/).filter(Boolean)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !GENERIC_WORDS.has(w));
  return remaining.length === 0;
}

/* Four-level assessment of a single field. Used by BOTH taxonomy scoring and
 * maturity screening, so the rules stay consistent. A field is never Strong
 * just because it is non-empty. */
function fieldStatus(text) {
  const raw = (text || "").trim();
  if (raw.length === 0) return "missing";
  if (isInvalidInput(raw)) return "invalid";
  if (negativePlaceholderOnly(raw)) return "missing";        // "Not clearly specified.", "Unknown", "N/A" …
  const t = raw.toLowerCase();
  if (!/[a-z]/.test(t)) return "weak";                       // bare numbers/dates need context
  if (UNCERTAINTY_RE.test(t)) return "weak";                 // has info but dominant uncertainty/limitation
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
  // Senior / expert expertise requested but budget is missing or vague.
  if (/\b(senior|expert|lead|architect|principal|years of experience)\b/.test((state.requiredRoles + " " + state.requiredExpertise).toLowerCase())
      && bestQuality(["budget", "workload"]) !== "strong")
    push("Senior expertise required but budget unclear", "Senior or expert profiles are requested, but budget/workload is missing or vague. Confirm the budget supports the seniority required.");
  // Success criteria include a number/target but no rationale or explanation.
  const successTxt = (state.successCriteria + " " + state.acceptanceCriteria).toLowerCase();
  if (/\d|%/.test(successTxt) && meaningfulTokens(successTxt).length < 4)
    push("Success target without rationale", "The success criteria include a number or target but little explanation of how or why it is measured. Add the rationale behind the target.");
  // Scope is defined but out-of-scope boundaries are not stated.
  if (catQuality("scope") === "strong" && bestQuality(["outOfScope"]) === "missing")
    push("Scope defined but out-of-scope missing", "The scope is defined, but what is explicitly out of scope is not stated. Add out-of-scope boundaries to prevent scope creep.");
  return warnings;
}

/* =================================================================
 * 6b. TAXONOMY-BASED EVALUATION METRICS (thesis Chapters 5–6)
 * -----------------------------------------------------------------
 * Scores the 11 fixed taxonomy categories automatically and derives the
 * evaluation metrics. All rule-based and transparent — no AI/LLM.
 * Consistency warnings are counted SEPARATELY (not in the completeness
 * score). Manual reference issues never affect the prototype's scoring.
 * ================================================================= */

/* --- Strict capture signals for taxonomy scoring -----------------
 * A category is Captured ONLY when it is specific, usable, and detailed
 * enough to support SoW generation — related text alone is not enough.
 * Each detector below is a transparent rule, no AI. */
const TX_NUM = "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)";
const TX_DUR = new RegExp(`\\b${TX_NUM}\\s*[- ]?(day|days|week|weeks|month|months|year|years)\\b`); // "10 weeks", "ten-week"
const TX_DATE = /\b\d{1,2}[\/.\-]\d{1,2}([\/.\-]\d{2,4})?\b|\b(19|20)\d{2}\b/;                       // 12-05-2026, 2026
const TX_MONEY = /[€$£]\s?\d|\b\d+([.,]\d+)?\s*(k|m|eur|euro|euros|usd|dollar|dollars)\b|\b\d{3,}\b/; // €40,000 / 50000 / 40k
const TX_WORKLOAD = /\b\d+\s*(hour|hours|hrs|fte)\b|\bfte\b/;                                        // 20 hours/week, 0.5 FTE
const TX_MEASURABLE = /\d|%|\b(kpi|metric|target|rate|accuracy|reduce|increase|fewer|within|measur|benchmark|threshold)\b/;
const TX_SENIORITY = /\b(senior|junior|lead|principal|expert|experienced|years|skill|skills|proficient|knowledge|specialis|certified|domain)\b/;
const TX_ROLE = /engineer|developer|analyst|manager|designer|consultant|specialist|lead|architect|expert|scientist|officer|coordinator|owner|trainer|researcher/;
const TX_SCOPE_ACT = /[,;•\n]|process|analy|build|design|implement|integrat|develop|configur|visuali|migrat|extract|automat|create|deliver|review|coordinat|prepar|conduct/;
const TX_RESOURCE = /api|system|dataset|\bdata\b|access|tool|document|platform|database|\bfile|software|repository|environment|material|template|licen|credential|stakeholder/;
const TX_CONTEXT = /industry|sector|company|team|department|organi[sz]ation|saas|manufactur|retail|healthcare|finance|public|government|b2b|logistics|education|startup|enterprise|municipal/;
const TX_OOS = /not includ|out of scope|exclud|without|depend|limitation|constraint|\brisk|assum/;

/* Category-specific reasons (no repeated generic text). */
const TAX_REASONS = {
  objective:       { c: "A specific objective with a clear intended outcome is provided.", w: "The objective is stated but too brief or generic to be usable.", m: "No objective or purpose is stated." },
  problem:         { c: "The problem / business context is described specifically.", w: "A problem is mentioned but lacks detail or context.", m: "No problem statement or business context is provided." },
  scope:           { c: "Scope includes specific activities.", w: "Scope is mentioned but the activities are not specific enough.", m: "No scope or included activities are described." },
  deliverables:    { c: "Concrete deliverables and/or a clear definition of done are provided.", w: "Deliverables are mentioned but the definition of done is incomplete.", m: "No deliverables or definition of done are provided." },
  timeline:        { c: "A concrete project duration, deadline, or dated milestones are provided.", w: "Timeline is mentioned but lacks a concrete duration, deadline, or milestones.", m: "No timeline, duration, or milestones are provided." },
  budget:          { c: "A concrete budget amount/range or numeric workload is provided.", w: "Budget is mentioned but not specified.", m: "No budget or workload expectation is provided." },
  roles:           { c: "Roles are specified with skills, seniority, or concrete tasks.", w: "A role is named but lacks skills, seniority, or tasks.", m: "No required roles or expertise are specified." },
  resourcesAccess: { c: "Specific systems, data, tools, access, or materials are named.", w: "Resources are implied but not explicitly specified.", m: "No systems, data, tools, access, or materials are specified." },
  context:         { c: "Relevant company, industry, or team context is provided.", w: "Some context is given but it is generic.", m: "No company, industry, or team context is provided." },
  outOfScope:      { c: "Out-of-scope boundaries and/or key dependencies are explicitly stated.", w: "Limitations or dependencies are hinted at but boundaries are not explicit.", m: "No out-of-scope boundaries, limitations, or dependencies are stated." },
  success:         { c: "Measurable, verifiable success / acceptance criteria are provided.", wMeasurable: "A target is mentioned but the rationale or validation logic is unclear.", wNonMeasurable: "Success criteria are mentioned but not measurable.", m: "No success criteria or validation logic are provided." },
};

function lineItemCount(s) {
  return (s || "").split(/\n|;|•|·|^\s*[-*]/m).map((x) => x.trim()).filter(Boolean).length;
}
/* Pre-compute the per-category signals once. */
function buildTaxCtx(text, lower) {
  const present = (id) => ["weak", "strong"].includes(fieldStatus(state[id]));
  return {
    lower,
    meaningful: meaningfulTokens(text).length,
    vague: WEAK_PHRASES.some((p) => lower.includes(p)) || VAGUE_MARKERS.some((m) => lower.includes(m)) || UNCERTAINTY_RE.test(lower),
    dodStrong: fieldStatus(state.definitionOfDone) === "strong",
    multiOut: lineItemCount(state.deliverables),
    hasRole: TX_ROLE.test((state.requiredRoles + " " + state.requiredExpertise).toLowerCase()),
    roleCount: state.requiredRoles.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).length,
    hasExpertise: present("requiredExpertise"),
    senioritySkill: TX_SENIORITY.test(lower),
    oosStrong: fieldStatus(state.outOfScope) === "strong",
    constraintCount: ["limitations", "dependencies", "assumptions", "risks"].filter(present).length,
    measurable: TX_MEASURABLE.test(lower),
    validationStrong: fieldStatus(state.validationLogic) === "strong",
    acceptanceStrong: fieldStatus(state.acceptanceCriteria) === "strong",
  };
}
/* The strict Captured test, per category. */
function capturedFor(key, c) {
  switch (key) {
    case "objective": return c.meaningful >= 4;
    case "problem": return c.meaningful >= 4;
    case "scope": return c.meaningful >= 5 && TX_SCOPE_ACT.test(c.lower);
    case "deliverables": return c.dodStrong || c.multiOut >= 3;
    case "timeline": return TX_DUR.test(c.lower) || TX_DATE.test(c.lower);
    case "budget": return TX_MONEY.test(c.lower) || TX_WORKLOAD.test(c.lower);
    case "roles": return c.hasRole && (c.senioritySkill || c.hasExpertise || c.roleCount >= 2 || c.meaningful >= 6);
    case "resourcesAccess": return c.meaningful >= 3 && TX_RESOURCE.test(c.lower);
    case "context": return c.meaningful >= 4 && TX_CONTEXT.test(c.lower);
    case "outOfScope": return c.oosStrong || (c.constraintCount >= 1 && c.meaningful >= 4 && TX_OOS.test(c.lower));
    case "success": return c.measurable && (c.meaningful >= 6 || c.validationStrong || c.acceptanceStrong);
    default: return false;
  }
}

/* Score one taxonomy category: Captured (1) / Weak (0.5) / Missing (0).
 * Captured requires the strict, category-specific signal above; related
 * text that is vague, generic, or thin stays Weak. */
function scoreTaxonomyCategory(entry) {
  const text = entry.fields.map((f) => state[f]).filter((v) => v && v.trim()).join(" ").trim();
  const R = TAX_REASONS[entry.key];
  if (!text) return { status: "Missing", score: 0, reason: R.m };
  if (isInvalidInput(text)) return { status: "Missing", score: 0, reason: "Only placeholder or meaningless text was found." };
  if (negativePlaceholderOnly(text)) return { status: "Missing", score: 0, reason: R.m }; // "Not specified", "Unknown" …
  const lower = text.toLowerCase();
  const c = buildTaxCtx(text, lower);
  if (!c.vague && capturedFor(entry.key, c)) return { status: "Captured", score: 1, reason: R.c };
  let reason;
  if (entry.key === "success") reason = c.measurable ? R.wMeasurable : R.wNonMeasurable;
  else reason = R.w;
  return { status: "Weak", score: 0.5, reason };
}

/* Build the full evaluation result from the taxonomy + detected warnings. */
function computeEvaluation(warnings) {
  const rows = TAXONOMY.map((entry) => {
    const s = scoreTaxonomyCategory(entry);
    const relatedWarn = warnings.find((w) => entry.match.some((m) => w.title.toLowerCase().includes(m)));
    return {
      label: entry.label,
      status: s.status,
      score: s.score,
      reason: s.reason,
      relatedIssue: relatedWarn ? relatedWarn.title : (s.status !== "Captured" ? "Lowers baseline completeness" : "—"),
      question: s.status === "Captured" ? "—" : entry.question,
    };
  });
  const total = rows.reduce((a, r) => a + r.score, 0);
  const baselinePct = Math.round((total / TAXONOMY.length) * 100);
  const captured = rows.filter((r) => r.status === "Captured").length;
  const weak = rows.filter((r) => r.status === "Weak").length;
  const missing = rows.filter((r) => r.status === "Missing").length;

  // Diagnostic Issue Count = missing + weak taxonomy categories + consistency
  // warnings. Warnings are separate from the completeness score but included
  // in the total diagnostic issue count.
  const totalIssues = missing + weak + warnings.length;

  // Strings used only for the optional Diagnostic Coverage matching.
  const diagnosticIssues = rows.filter((r) => r.status !== "Captured").map((r) => r.label)
    .concat(warnings.map((w) => w.title));

  return { rows, total, baselinePct, captured, weak, missing, totalIssues, diagnosticIssues };
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
let lastSowPackage = null; // generation-layer SoW-schema-aligned export
let lastDiagnosticIssues = []; // prototype-detected issues, for optional coverage matching

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
  // Captured information = the fields that already hold strong, meaningful input.
  const capturedItems = pkg.confirmed.map((c) => ({ cls: "ok", tag: "Captured", text: c.label }));
  renderStatusList("captured-list", capturedItems, "Nothing specific captured yet — describe the assignment above, or fill the fields in Step 3.");
  renderStatusList("missing-list", missingItems, "No required categories are empty for this maturity level.", "improve this in Step 3");
  renderStatusList("weak-list", weakItems, "No weak (vague or thin) information detected.", "use the suggested follow-up questions in Step 3");
  renderStatusList("invalid-list", invalidItems, "No meaningless or random input detected.", "replace with meaningful input");
  renderStatusList("lowrel-list", lowRelItems, "All contextual signals are captured.", "add this context in Step 3");
  renderStatusList("warning-list", warnItems, "No consistency contradictions detected.", "address this in Step 3");

  // --- Taxonomy-based scoring & evaluation metrics (before the package) ---
  const evalResult = computeEvaluation(warnings);
  lastDiagnosticIssues = evalResult.diagnosticIssues;
  renderEvaluation(evalResult, warnings.length, questions);
  renderCoverage();

  // --- Structured input package + readiness ---
  renderPackage(pkg);
  // Simple, rule-based readiness signal (not a guarantee — just a hand-off cue).
  const qualityIssues = missingItems.length + weakItems.length + invalidItems.length;
  let readyText, readyCls;
  if (completeness.score >= 80 && warnings.length === 0 && qualityIssues === 0) {
    readyText = "Ready for hand-off to the generation layer"; readyCls = "level-high";
  } else if (completeness.score >= 50) {
    readyText = "Partially ready — resolve the follow-ups in Step 3 and rerun"; readyCls = "level-med";
  } else {
    readyText = "Early stage — more input needed before hand-off"; readyCls = "level-low";
  }
  document.getElementById("package-readiness").innerHTML = `<span class="maturity-badge ${readyCls}">${readyText}</span>`;

  // Generation-layer SoW-schema-aligned JSON (with input-layer diagnostics).
  lastSowPackage = buildSowPackage(maturity, evalResult, warnings, questions);
  document.getElementById("sow-json").textContent = JSON.stringify(lastSowPackage, null, 2);

  document.getElementById("results").hidden = false;
}

/* Render the taxonomy scoring table + evaluation metrics. */
function renderEvaluation(ev, warningCount, questions) {
  document.getElementById("baseline-score").textContent =
    `${ev.total.toFixed(1)} / ${TAXONOMY.length} (${ev.baselinePct}%)`;
  document.getElementById("eval-breakdown").innerHTML =
    `Captured: <strong>${ev.captured}</strong> · Weak: <strong>${ev.weak}</strong> · ` +
    `Missing: <strong>${ev.missing}</strong> of ${TAXONOMY.length} taxonomy categories.`;

  // Diagnostic Issue Count summary.
  document.getElementById("dic-missing").textContent = ev.missing;
  document.getElementById("dic-weak").textContent = ev.weak;
  document.getElementById("dic-warnings").textContent = warningCount;
  document.getElementById("dic-total").textContent = ev.missing + ev.weak + warningCount;

  const pillFor = (s) => s === "Captured" ? "strong" : s === "Weak" ? "weak" : "missing";
  document.getElementById("taxonomy-table").innerHTML = ev.rows.map((r) => `
    <tr>
      <td>${r.label}</td>
      <td><span class="pill ${pillFor(r.status)}">${r.status}</span></td>
      <td class="num">${r.score}</td>
      <td>${escapeHtml(r.reason)}</td>
      <td>${escapeHtml(r.relatedIssue)}</td>
      <td>${r.question === "—" ? "—" : escapeHtml(r.question)}</td>
    </tr>`).join("");

  // Follow-up Actions Generated = adaptive follow-up questions (maturity-based
  // diagnosis) + category-specific follow-up questions (taxonomy table), with
  // exact-duplicate questions counted once.
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const adaptiveQs = (questions || []).map((q) => q.text);
  const categoryQs = ev.rows.filter((r) => r.question && r.question !== "—").map((r) => r.question);
  const totalUnique = new Set([...adaptiveQs, ...categoryQs].map(norm)).size;
  document.getElementById("fa-adaptive").textContent = adaptiveQs.length;
  document.getElementById("fa-category").textContent = categoryQs.length;
  document.getElementById("fa-total").textContent = totalUnique;
}

/* Significant tokens for the optional coverage match (length ≥ 5, not generic). */
function coverageTokens(text) {
  return (text.toLowerCase().match(/[a-z]+/g) || [])
    .filter((w) => w.length >= 5 && !STOPWORDS.has(w) && !GENERIC_WORDS.has(w));
}
/* Optional Diagnostic Coverage Rate. Manual reference issues are entered by
 * the researcher and are used ONLY here — they never affect the prototype's
 * own scoring. Matching is a transparent keyword overlap, not AI. */
function renderCoverage() {
  const out = document.getElementById("coverage-output");
  if (!out) return;
  const raw = (document.getElementById("manual-issues").value || "").trim();
  if (!raw) {
    out.innerHTML = `<span class="muted">Diagnostic coverage requires manual taxonomy reference issues.</span>`;
    return;
  }
  const lines = raw.split("\n").map((s) => s.trim()).filter(Boolean);
  const issueTokenSets = lastDiagnosticIssues.map(coverageTokens);
  let covered = 0;
  const details = lines.map((line) => {
    const lt = coverageTokens(line);
    const hit = lt.length > 0 && issueTokenSets.some((it) => it.some((t) => lt.includes(t)));
    if (hit) covered++;
    return `<li class="${hit ? "ok" : "miss"}"><span class="tag">${hit ? "Detected" : "Missed"}</span><span>${escapeHtml(line)}</span></li>`;
  }).join("");
  const pct = Math.round((covered / lines.length) * 100);
  out.innerHTML =
    `<p><strong>Diagnostic Coverage Rate: ${covered} / ${lines.length} (${pct}%)</strong> ` +
    `<span class="muted">= prototype-detected reference issues ÷ manually identified reference issues</span></p>` +
    `<ul class="status-list">${details}</ul>`;
}

/* =================================================================
 * SoW-schema-aligned export for the generation layer.
 * -----------------------------------------------------------------
 * Maps the taxonomy fields onto the Creator V2 / generation-layer SoW
 * JSON schema and adds the input-layer diagnostics under
 * `inputDiagnostics`. Additive only — the taxonomy scoring panel is
 * unchanged; this is just how the final package is shaped for hand-off.
 * ================================================================= */
function sowFirstLine(s) {
  const t = (s || "").trim().split(/[.\n]/)[0].trim();
  return t.length > 90 ? t.slice(0, 90).trim() + "…" : t;
}
function sowLines(text) { // line / bullet items (keep commas inside a line)
  return (text || "").split(/\n|;|•|·|^\s*[-*]/m).map((s) => s.replace(/^[\s\-*]+/, "").trim()).filter(Boolean);
}
function sowListItems(text) { // also split on commas (roles, resources)
  return (text || "").split(/\n|;|•|·|,|^\s*[-*]/m).map((s) => s.replace(/^(\s|[-*]|and\s)+/i, "").trim()).filter(Boolean);
}
function sowNum(s) { const v = parseFloat(String(s).replace(/[,\s]/g, "")); return isNaN(v) ? null : v; }
function sowBudget() {
  const t = (state.budget + " " + state.workload).toLowerCase();
  let hourlyrate = null, costestimate = null, averageweeklyhours = null, m;
  m = t.match(/(?:€|\$|£)?\s?(\d[\d.,]*)\s*(?:\/|per\s*)?\s*(?:hour|hr)\b/); if (m) hourlyrate = sowNum(m[1]);
  m = t.match(/(\d[\d.,]*)\s*(?:hours?|hrs?)\s*(?:\/|per|a)\s*week/); if (m) averageweeklyhours = sowNum(m[1]);
  m = t.match(/(?:€|\$|£)\s?(\d[\d.,]*)\s*(k|m)?/) || t.match(/\b(\d[\d.,]{2,})\s*(k|m|eur|usd|euro|dollar)?/);
  if (m) { let v = sowNum(m[1]); const suf = (m[2] || "").toLowerCase(); if (suf === "k") v *= 1000; if (suf === "m") v *= 1000000; costestimate = v; }
  return { costestimate, hourlyrate, averageweeklyhours };
}
function sowWorkingType() {
  const t = (state.workload + " " + state.budget + " " + state.initialDescription + " " + state.companyContext).toLowerCase();
  const m = t.match(/\b(remote|hybrid|on[- ]?site|onsite|on premises?)\b/);
  return m ? m[1].replace(/\s/, "-") : "";
}
function buildSowPackage(maturity, ev, warnings, questions) {
  const v = (id) => (state[id] || "").trim();
  const join = (...ids) => ids.map(v).filter(Boolean).join("\n");
  // Follow-up actions = adaptive + category-specific questions, de-duplicated.
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const seen = new Set(); const followUpActions = [];
  [...(questions || []).map((q) => q.text), ...ev.rows.filter((r) => r.question && r.question !== "—").map((r) => r.question)]
    .forEach((q) => { const k = norm(q); if (!seen.has(k)) { seen.add(k); followUpActions.push(q); } });

  const includedActivities = sowLines(v("includedActivities")).length ? sowLines(v("includedActivities")) : sowLines(v("scope"));
  return {
    title: sowFirstLine(v("objective") || v("initialDescription")),
    purpose: v("objective"),
    definitionOfDone: join("deliverables", "definitionOfDone"),
    boundaries: {
      includedActivities,
      outOfScope: [...sowLines(v("outOfScope")), ...sowLines(v("limitations")), ...sowLines(v("dependencies"))],
    },
    mustHaveRequirements: [...sowListItems(v("requiredRoles")), ...sowListItems(v("requiredExpertise"))],
    niceToHaveRequirements: [],
    timeline: [v("timeline"), v("milestones")].filter(Boolean).join(" — "),
    budget: sowBudget(),
    resources: [...sowListItems(v("tools")), ...sowListItems(v("documents"))],
    location: { workingtype: sowWorkingType(), worklocation: null },
    language: "en",
    type: (detectDomains()[0] && detectDomains()[0].key) || "",
    isFinalized: false,
    percentage: null,
    inputDiagnostics: {
      maturityLevel: LEVEL_META[maturity.level].label,
      baselineCompletenessScore: `${ev.total.toFixed(1)} / ${TAXONOMY.length} (${ev.baselinePct}%)`,
      missingCategories: ev.rows.filter((r) => r.status === "Missing").map((r) => r.label),
      weakCategories: ev.rows.filter((r) => r.status === "Weak").map((r) => r.label),
      consistencyWarnings: warnings.map((w) => w.title),
      followUpActions,
      contextNotes: v("problem"),
      successCriteriaNotes: [v("successCriteria"), v("acceptanceCriteria"), v("validationLogic")].filter(Boolean).join(" "),
    },
  };
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

/* =================================================================
 * EVALUATION MODE — parse a labelled reconstructed input package
 * -----------------------------------------------------------------
 * Rule-based section-label matching only (NO LLM/NLP). It recognises
 * the labels below and maps the text under each to a taxonomy field,
 * then runs the existing analyze() pipeline unchanged. Used for thesis
 * Chapter 6 evaluation of reconstructed Creator V2 input packages.
 *
 * Labels that have no dedicated field (Project title, Location / work
 * mode) are still recognised as section boundaries; their text remains
 * in the pasted description, where domain / work-mode detection reads it.
 * ================================================================= */
const PKG_LABELS = [
  ["title", "project title"],
  ["objective", "purpose objective"], ["objective", "purpose"], ["objective", "objective"],
  ["problem", "problem statement business context"], ["problem", "problem statement"], ["problem", "business context"], ["problem", "problem"],
  ["scope", "scope included activities"], ["includedActivities", "included activities"], ["scope", "scope"],
  ["definitionOfDone", "deliverables definition of done"], ["definitionOfDone", "definition of done"], ["deliverables", "deliverables"],
  ["timeline", "timeline duration milestones"], ["timeline", "timeline"], ["timeline", "duration"], ["milestones", "milestones"],
  ["budget", "budget expectations"], ["budget", "budget"],
  ["requiredRoles", "required roles expertise"], ["requiredRoles", "required roles"], ["requiredExpertise", "expertise"], ["requiredRoles", "roles"],
  ["tools", "resources access materials"], ["tools", "resources"], ["tools", "access"], ["documents", "materials"],
  ["companyContext", "company industry team context"], ["companyContext", "company context"], ["industryContext", "industry context"], ["teamContext", "team context"], ["companyContext", "context"],
  ["outOfScope", "out of scope limitations dependencies"], ["outOfScope", "out of scope"], ["limitations", "limitations"], ["dependencies", "dependencies"],
  ["successCriteria", "success criteria validation logic"], ["successCriteria", "success criteria"], ["validationLogic", "validation logic"], ["acceptanceCriteria", "acceptance criteria"],
  ["location", "location work mode"], ["location", "location"], ["location", "work mode"], ["location", "working mode"],
];
function pkgNorm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
/* Decide whether a heading-portion matches a known label. */
function matchPkgLabel(head) {
  const n = pkgNorm(head);
  if (!n) return null;
  for (const [field, phrase] of PKG_LABELS) if (n === phrase) return { field, exact: true };
  for (const [field, phrase] of PKG_LABELS) if (n.startsWith(phrase + " ")) return { field, exact: false };
  return null;
}
/* Parse labelled sections → { fieldId: text }. */
function parseLabelledPackage(text) {
  const acc = {};
  let current = null;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s>#*\-•·]+/, "").replace(/\*\*/g, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    const head = colon >= 0 ? line.slice(0, colon) : line;
    const inline = colon >= 0 ? line.slice(colon + 1).trim() : "";
    const m = matchPkgLabel(head);
    if (m && (colon >= 0 || m.exact)) {              // treat as a section heading
      current = m.field;
      if (!acc[current]) acc[current] = [];
      if (inline) acc[current].push(inline);
    } else if (current) {                            // content under the current heading
      acc[current].push(line);
    }
  }
  const out = {};
  for (const f in acc) out[f] = acc[f].join("\n").trim();
  return out;
}
/* Evaluation entry point: parse the pasted package, populate the taxonomy
 * fields, and run the existing pipeline. Does NOT change the normal flow. */
function evaluatePackage() {
  const text = (document.getElementById("initialDescription").value || "").trim();
  if (!text) { flashButton("evaluate-pkg-btn", "Paste a package first"); return; }
  // Reset structured fields but keep the pasted package text.
  ALL_FIELD_IDS.forEach((id) => { if (id !== "initialDescription") state[id] = ""; });
  state.initialDescription = text;
  const parsed = parseLabelledPackage(text);
  Object.entries(parsed).forEach(([id, content]) => { if (id in state && content) state[id] = content; });
  syncBasicInputs();
  analyze();
  // Mode 2 highlights the taxonomy evaluation panel as the main result.
  document.getElementById("evaluation").scrollIntoView({ behavior: "smooth" });
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
  if (!lastSowPackage) return;
  // Export the generation-layer SoW-schema-aligned JSON.
  const blob = new Blob([JSON.stringify(lastSowPackage, null, 2)], { type: "application/json" });
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

/* =================================================================
 * WORKFLOW MODE (UI visibility only — no logic/scoring change)
 * -----------------------------------------------------------------
 * "raw"  → Screen raw assignment idea: maturity screening prominent,
 *          taxonomy panel collapsed (secondary).
 * "eval" → Evaluate reconstructed input package: maturity dashboard /
 *          normal metrics hidden, taxonomy panel + JSON prominent.
 * Both modes use the SAME underlying analyze()/scoring; only which
 * sections are emphasized changes. */
/* Mode-specific "Prototype model logic" flow shown at the top of the page.
 * UI/explanation only — it mirrors what each mode actually does. */
const MODE_FLOWS = {
  raw: {
    intro: "Mode 1 — adaptive intake and maturity screening for a rough, unstructured idea. The maturity result guides routing and follow-up questions; it is not the Chapter 6 evaluation metric.",
    steps: [
      "Raw assignment idea",
      "Rule-based maturity screening",
      "Maturity-specific input needs",
      "Suggested follow-up questions",
      "Input gap diagnosis",
      "Structured input package",
    ],
    explain: "This flow clarifies a rough idea: it screens maturity, routes the right follow-up questions, and surfaces what still needs to be provided.",
  },
  eval: {
    intro: "Mode 2 — evaluate a reconstructed / section-labelled input package against the taxonomy, then produce an improved structured input package for later SoW generation.",
    steps: [
      "Parse section-labelled input",
      "Taxonomy category mapping",
      "Baseline completeness scoring",
      "Diagnostic issue count",
      "Follow-up actions",
      "Generate structured input package",
    ],
    explain: "This flow evaluates a reconstructed or section-labelled input package against the taxonomy, identifies missing or weak areas, proposes follow-up actions, and generates a structured input package for later SoW generation.",
  },
};
function renderFlow(mode) {
  const f = MODE_FLOWS[mode] || MODE_FLOWS.raw;
  document.getElementById("flow-intro").textContent = f.intro;
  document.getElementById("flow-explain").textContent = f.explain;
  document.getElementById("flow-steps").innerHTML = f.steps.map((s, i) =>
    `<li class="flow-step${i === f.steps.length - 1 ? " final" : ""}"><span class="flow-i">${i + 1}</span>${s}</li>`).join("");
}

let currentMode = "raw";
function setMode(mode) {
  currentMode = mode;
  const eval_ = mode === "eval";
  renderFlow(mode);
  document.getElementById("mode-raw-tab").classList.toggle("active", !eval_);
  document.getElementById("mode-eval-tab").classList.toggle("active", eval_);
  document.getElementById("analyze-btn").hidden = eval_;
  document.getElementById("evaluate-pkg-btn").hidden = !eval_;
  document.getElementById("eval-parser-note").hidden = !eval_;
  document.getElementById("mode-hint").textContent = eval_
    ? "Paste a labelled reconstructed input package (from a Creator V2 conversation). The taxonomy rubric scores it for Chapter 6 evaluation."
    : "Provide a rough idea, short task request, or unstructured description. Maturity screening adapts the follow-up questions (used for adaptive routing, not as the Chapter 6 metric).";
  // Optional context block is only relevant in raw mode; eval mode pastes a full package.
  document.getElementById("optional-context").hidden = eval_;
  document.getElementById("intake-label").textContent = eval_
    ? "Paste the reconstructed input package"
    : "Describe the assignment, problem, or idea in your own words";
  document.getElementById("initialDescription").placeholder = eval_
    ? "Paste the labelled baseline input package here, including sections such as Purpose / objective, Scope / included activities, Deliverables, Timeline, Budget, Resources, and Success criteria…"
    : "e.g. We want to explore how AI could improve our intake process…";
  const results = document.getElementById("results");
  results.classList.toggle("mode-eval", eval_);
  results.classList.toggle("mode-raw", !eval_);
  // Taxonomy panel: collapsed/secondary in raw mode, expanded/prominent in eval mode.
  document.getElementById("evaluation").classList.toggle("collapsed", !eval_);
  // Switching mode clears any stale result view (avoids cross-mode confusion).
  results.hidden = true;
}

document.addEventListener("DOMContentLoaded", () => {
  bindBasicInputs();
  renderExampleButtons();
  document.getElementById("mode-raw-tab").addEventListener("click", () => setMode("raw"));
  document.getElementById("mode-eval-tab").addEventListener("click", () => setMode("eval"));
  document.getElementById("evaluation-h2").addEventListener("click", () =>
    document.getElementById("evaluation").classList.toggle("collapsed"));
  setMode("raw");
  document.getElementById("analyze-btn").addEventListener("click", () => {
    analyze();
    document.getElementById("results").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("rerun-btn").addEventListener("click", analyze);
  document.getElementById("reset-btn").addEventListener("click", clearAll);
  document.getElementById("evaluate-pkg-btn").addEventListener("click", evaluatePackage);
  document.getElementById("copy-btn").addEventListener("click", copyPackage);
  document.getElementById("download-btn").addEventListener("click", downloadPackage);
  // Optional manual reference issues → recompute Diagnostic Coverage live.
  const manual = document.getElementById("manual-issues");
  if (manual) manual.addEventListener("input", renderCoverage);
});
