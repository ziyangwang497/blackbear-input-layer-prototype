# Prototype Logic Explanation / 原型逻辑说明

This document explains **what the prototype does and why**, in plain language —
without going line by line through the JavaScript. It is written so the logic
can be described directly in the thesis. The technical implementation lives in
`script.js`; this file is the conceptual map of that file.

本文件用通俗语言解释**原型做了什么、为什么这样做**，不逐行讲解 JavaScript 代码。
其目的是让你能够在毕业论文中直接描述该逻辑。技术实现位于 `script.js`，本文件是该
文件的概念性说明。

> The prototype implements **one rule-based adaptive flow**:
> Initial assignment input → Rule-based maturity screening →
> Maturity-specific input requirements → Adaptive follow-up questions →
> Completeness & consistency checks → Structured input package.
>
> 原型实现**一个基于规则的自适应流程**：
> 初始任务输入 → 基于规则的成熟度筛查 → 成熟度专属的输入要求 →
> 自适应后续问题 → 完整度与一致性检查 → 结构化输入包。

> **Pattern tuning:** the rules were refined using **generalized patterns** from a
> small, representative sample of past assignments — used for offline inspection
> only, **not** as training data and **not** embedded in the prototype. No raw
> records, client names, costs, or dates appear anywhere.
>
> **规则调优：** 这些规则是依据一小份代表性历史任务样本中的**通用模式**进行优化的 ——
> 仅用于离线观察，**并非**训练数据，也**未**嵌入原型。任何原始记录、客户名称、费用或
> 日期都不会出现在任何位置。

---

# Part 1 — English

## 1. What input fields the prototype collects

The model collects input in **two stages**, matching the flow:

- **Stage 1 — Initial intake (deliberately simple).** The user writes a free-text
  *initial assignment description* and a few basics: *objective*, *problem
  statement / business context*, *organisation / context*, and *their role*.
  The user is **not** asked to fill a long form up front.
- **Stage 2 — Maturity-specific follow-up fields.** After screening, the
  prototype reveals **only** the detailed fields that matter for the detected
  maturity level (for example deliverables, definition of done, out-of-scope,
  acceptance criteria, approval owner, stakeholders, timeline, and so on). The
  user fills these and re-runs the analysis.

This is the key design point: the prototype is **not the same long form for
everyone**. The basic intake is small; detailed requirements are *adaptive*.

## 2. How maturity classification (screening) works

Everything is built on one simple judgement applied to each field — its
**quality**:

- **Missing** — the field is empty.
- **Weak** — the field is filled but vague (for example "unknown", "not sure",
  "not specified", "unclear", "TBD") or far too short to be meaningful.
- **Strong** — the field contains a specific, usable answer.

The prototype looks at **eight maturity indicators** (objective, scope,
deliverable, timeline, resource, constraint, success-criteria, and stakeholder
clarity); each indicator takes the **best quality** of the fields it maps to. It
counts how many indicators are **strong** and applies three transparent rules:

- **Well-defined / High maturity** — objective, scope, deliverables, and success
  criteria are all strong **and** at least 6 of the 8 indicators are strong.
- **Exploratory / Low maturity** — only 2 or fewer indicators are strong.
- **Partially defined / Medium maturity** — anything in between.

Maturity is **derived from the information provided — the user never chooses it
by hand**. The demo buttons only load fictional examples; they do not set the
level directly. The prototype also shows a written reason and the status of
each indicator, so the classification is never a black box.

## 3. How the completeness score is calculated (maturity-specific)

Completeness is **not** a single fixed checklist. It is scored **only against the
categories that matter for the detected maturity level**:

- **Exploratory (Low)** → problem context, objective, stakeholders, available
  information/data, and known uncertainty. (Detailed scoping is *not* expected
  yet, so it is not scored.)
- **Partially defined (Medium)** → objective, scope, deliverables, timeline,
  budget/workload, constraints, stakeholders, and success criteria.
- **Well-defined (High)** → precise deliverables, definition of done,
  dependencies, out-of-scope activities, budget/workload, acceptance criteria,
  validation logic, and approval owner.

(Budget/workload is a first-class field in real intake, so it is included in the
Medium and High sets, weighted moderately so a missing budget is realistic rather
than punitive.)

Within the level, each category earns **full weight** if its information is
strong, **half weight** if it is only weak/vague, and **nothing** if missing.
The score is `(points earned ÷ maximum possible points) × 100`. Any category
that is not strong is listed separately as **missing or weak information**, so
the user sees exactly which gaps matter *at their stage*.

This means a vague assignment is judged fairly — it is measured on framing, not
on detailed scoping it could not reasonably have yet.

## 4. How consistency warnings are triggered

Consistency checking captures the key insight from the source material: an input
can have many filled fields and still be weak if the parts **contradict each
other**. The prototype runs a set of independent rule-based checks; each raises a
warning only when its specific condition is true:

- **Broad scope but short timeline.**
- **Broad scope but limited budget.**
- **Complex scope but missing resource or access information.**
- **Multi-country / multi-site / multi-region scope vs. limited time or resources.**
- **No approval owner on a complex assignment.**
- **Scope vs. workload anomaly** (broad scope but a small available workload, e.g.
  a few hours per week).
- **Deliverables without a definition of done.**
- **Vague objective but specific deliverables.**
- **Success criteria not aligned with the objective** (they share no key terms).
- **Stakeholder group missing although approval is required.**
- **Included activities conflict with out-of-scope activities** (the same real
  activity appears in both; incidental common words such as "data" are ignored).
- **Success criteria not measurable** (no numbers, targets, or measurement words).
- **Milestones without clear deliverables.**
- **Role requirements combine too many responsibilities** (role overload).

"Broad scope", "short timeline", and term overlap are judged with simple,
explainable signals (keywords such as *all / entire / every / company-wide*, the
number of weeks mentioned, shared significant words), not with any AI model.

## 5. How adaptive follow-up questions are selected

The questions adapt to the maturity level and to the specific gaps:

- **Low maturity → exploratory, problem-framing questions** (for example "What
  business problem are you trying to solve?", "Who will use the final output?").
- **Medium maturity → targeted clarification questions** — one focused question
  for each required category that is still weak or missing.
- **High maturity → validation questions** (for example "Are the success and
  acceptance criteria measurable?"), plus a clarification for any high-weight
  category that is still incomplete.

In addition, the prototype detects the assignment **domain** from keywords (for
example market research, compliance/ESG, data migration, software, change
management, tender, certification) and appends a couple of domain-specific
questions for Low and Medium maturity assignments. The number of questions is
shown in the metrics panel.

## 6. How the structured input package is generated

After analysis, the prototype assembles a **structured input package for later
SoW generation** — clearly labelled as **not a finished Statement of Work**. It
has **seven components**:

1. **Detected maturity level.**
2. **Reason for classification** (the written explanation from screening).
3. **Confirmed information** — every field the user filled in specifically
   (i.e. judged *strong*), with its value. This is the captured structured data.
4. **Missing or weak information** — the gaps for this maturity level.
5. **Adaptive follow-up questions** — the questions generated above.
6. **Consistency risks** — the warnings detected above.
7. **Recommended next-step input actions** — concrete actions derived from the
   gaps and risks (for example "Provide or strengthen Out-of-scope activities",
   "Resolve consistency risk: Broad scope but short timeline").

The package can be copied as text or downloaded as JSON, entirely in the
browser. Its job is to make the input ready for a later generation layer — not
to generate the SoW.

## 7. How this prototype supports the thesis model and evaluation

The prototype is the **artifact** of the thesis: a transparent, rule-based,
taxonomy-supported input layer. It supports the research model in four ways:

- **It operationalises the input-layer model end to end.** It shows the full
  flow — initial input → screening → maturity-specific requirements → follow-up
  questions → completeness & consistency checks → structured package — which is
  exactly the process the thesis proposes.
- **It demonstrates maturity-adaptiveness (SQ2, SQ3).** The *required
  information*, the *follow-up questions*, and the *completeness criteria* all
  change with the detected maturity level, evidencing that input requirements
  vary with user maturity and that the collection process can adapt to it.
- **It makes completeness and consistency measurable (SQ1, SQ4).** The metrics
  panel — completeness score, number of missing/weak fields, number of
  consistency warnings, number of follow-up questions, and maturity level —
  gives concrete, repeatable indicators that can be recorded during testing.
- **It is transparent and reproducible.** Because every decision comes from
  stated rules (not a trained model), the behaviour can be explained, defended,
  and reproduced — appropriate for a design-and-evaluation thesis artifact.

The prototype deliberately **omits** a large "baseline vs. adaptive" comparison.
That comparison belongs in the thesis **evaluation chapter**, where the adaptive
prototype's metrics are compared against a fixed baseline form after testing.
The prototype's job is to *produce* those metrics, not to draw the conclusion.

---

# Part 2 — 中文（Chinese）

## 1. 原型收集哪些输入字段

模型分**两个阶段**收集输入，与流程对应：

- **第一阶段 —— 初始填报（刻意保持简单）。** 用户写一段自由文本的*初始任务描述*，
  以及几项基本信息：*目标*、*问题陈述／业务背景*、*组织／背景*、*你的角色*。
  一开始**不要求**用户填写一份冗长的表单。
- **第二阶段 —— 成熟度专属的后续字段。** 完成筛查后，原型**只**展示对所检测出的
  成熟度等级真正重要的详细字段（例如交付物、完成标准、范围外、验收标准、审批负责人、
  利益相关者、时间线等）。用户填写这些字段并重新运行分析。

这正是关键设计点：原型**不是对所有用户都用同一份长表单**。基本填报很小；详细要求
是*自适应的*。

## 2. 成熟度分类（筛查）如何运作

所有逻辑都建立在对每个字段的一个简单判断上 —— 它的**质量**：

- **缺失（Missing）** —— 字段为空。
- **薄弱（Weak）** —— 字段填了，但内容含糊（如"unknown／不确定／未指定／unclear／待定"），
  或太短而没有实际意义。
- **强（Strong）** —— 字段包含具体、可用的答案。

原型考察**八个成熟度指标**（目标、范围、交付物、时间线、资源、约束、成功标准、
利益相关者的清晰度）；每个指标取其对应字段中**质量最高**的一个。原型统计有多少个
指标为"强"，并应用三条透明规则：

- **定义良好 / 高成熟度** —— 目标、范围、交付物、成功标准全部为"强"，**并且**八个
  指标中至少有 6 个为"强"。
- **探索性 / 低成熟度** —— 只有 2 个或更少指标为"强"。
- **部分定义 / 中等成熟度** —— 介于两者之间。

成熟度是**根据所提供的信息推导出来的 —— 用户绝不手动选择**。演示按钮只加载虚构示例，
并不直接设定等级。原型还会给出文字理由和每个指标的状态，因此分类结果绝不是"黑箱"。

## 3. 完整度分数如何计算（成熟度专属）

完整度**不是**一份固定的清单，而是**仅针对所检测成熟度等级真正重要的类别**进行评分：

- **探索性（低）** → 问题背景、目标、利益相关者、可用信息/数据、已知的不确定性。
  （此阶段尚不要求详细范围界定，因此不计入评分。）
- **部分定义（中）** → 目标、范围、交付物、时间线、预算/工作量、约束、利益相关者、成功标准。
- **定义良好（高）** → 精确的交付物、完成标准、依赖、范围外活动、预算/工作量、验收标准、
  验证逻辑、审批负责人。

（预算/工作量是真实任务录入中的一等字段，因此被纳入中、高等级的类别集合，并给予适中
权重，使缺少预算的扣分更贴近现实，而非过度惩罚。）

在某一等级内，每个类别：信息为"强"得**全部权重**，仅"薄弱/含糊"得**一半权重**，
"缺失"得 **0 分**。分数为 `(已得分 ÷ 最大可能分) × 100`。任何未达"强"的类别都会被
单独列为**缺失或薄弱信息**，让用户清楚看到*在其所处阶段*哪些差距最重要。

这意味着一个模糊的任务会被公平评判 —— 它按"问题界定"来衡量，而不是按它此刻不可能
具备的详细范围来衡量。

## 4. 一致性警告如何触发

一致性检查体现了源材料的核心洞见：一份输入即使填满了很多字段，如果各部分**相互
矛盾**，仍然可能薄弱。原型运行一组相互独立的基于规则的检查，每条仅在其特定条件成立
时才发出警告：

- **范围广但时间线短。**
- **范围广但预算有限。**
- **范围复杂但缺少资源或访问信息。**
- **跨多个国家／多个站点／多个区域的范围，但时间或资源有限。**
- **复杂任务却没有审批负责人。**
- **范围与工作量不匹配**（范围很广，但可用工作量很小，例如每周只有几个小时）。
- **有交付物但没有完成标准。**
- **目标含糊但交付物具体。**
- **成功标准与目标不一致**（两者没有共同的关键词）。
- **需要审批，却缺少利益相关者群体。**
- **包含的活动与范围外活动相互冲突**（同一真实活动同时出现在两者中；"data"等
  偶然的常见词会被忽略）。
- **成功标准不可衡量**（没有数字、目标或衡量性词语）。
- **有里程碑但交付物不清楚。**
- **所需角色混合了过多职责**（角色过载）。

"范围广""时间线短"以及词语重叠都用简单、可解释的信号判断（如 *all / entire / every /
全公司* 等关键词、提到的周数、共同的重要词语），并不依赖任何 AI 模型。

## 5. 自适应后续问题如何选择

问题会根据成熟度等级和具体差距进行自适应：

- **低成熟度 → 探索性、问题界定类问题**（例如"你想解决什么业务问题？""谁将使用最终
  成果？"）。
- **中等成熟度 → 有针对性的澄清问题** —— 针对每个仍薄弱或缺失的必填类别提出一个
  聚焦问题。
- **高成熟度 → 验证类问题**（例如"成功标准与验收标准是否可衡量？"），并对任何仍不
  完整的高权重类别补充一个澄清问题。

此外，原型会根据关键词识别任务**领域**（如市场研究、合规/ESG、数据迁移、软件、变革
管理、招投标、认证），并为低/中成熟度任务追加几个领域专属问题。问题数量显示在指标
面板中。

## 6. 结构化输入包如何生成

分析完成后，原型组装一个**供后续 SoW 生成使用的结构化输入包** —— 并明确标注它
**不是一份完成的工作说明书**。它包含**七个组成部分**：

1. **检测出的成熟度等级。**
2. **分类理由**（来自筛查的文字说明）。
3. **已确认的信息** —— 用户具体填写的每个字段（即被判为"强"）及其内容。这就是被捕获
   的结构化数据。
4. **缺失或薄弱的信息** —— 该成熟度等级下的差距。
5. **自适应后续问题** —— 上面生成的问题。
6. **一致性风险** —— 上面检测到的警告。
7. **建议的下一步输入行动** —— 由差距和风险推导出的具体行动（例如"补充或强化：范围外
   活动""解决一致性风险：范围广但时间线短"）。

该包可在浏览器中复制为文本或下载为 JSON。它的职责是让输入为后续生成层做好准备 ——
而不是生成 SoW。

## 7. 该原型如何支撑论文模型与评估

该原型是论文的**人工制品（artifact）**：一个透明的、基于规则的、由分类法支撑的输入层。
它从四个方面支撑研究模型：

- **端到端地将输入层模型具体化。** 它展示了完整流程 —— 初始输入 → 筛查 → 成熟度专属
  要求 → 后续问题 → 完整度与一致性检查 → 结构化包 —— 这正是论文所提出的流程。
- **展示了成熟度自适应能力（SQ2、SQ3）。** *所需信息*、*后续问题*和*完整度标准*都
  随检测出的成熟度等级而变化，证明输入需求随用户成熟度而变化，且收集流程能够随之
  自适应。
- **使完整度与一致性可衡量（SQ1、SQ4）。** 指标面板 —— 完整度分数、缺失/薄弱字段数、
  一致性警告数、后续问题数、成熟度等级 —— 提供了具体、可重复的指标，可在测试中记录。
- **透明且可复现。** 由于每个决策都来自明确的规则（而非训练出来的模型），其行为可被
  解释、辩护和复现 —— 适合一个用于设计与评估的论文人工制品。

原型有意**不包含**大型的"基线 vs. 自适应"对比。该对比应放在论文的**评估章节**，
在测试之后将自适应原型的指标与固定基线表单进行比较。原型的职责是*产出*这些指标，
而不是给出结论。
