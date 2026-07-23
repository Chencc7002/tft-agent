# 下一阶段开发文档：LLM 证据增强结论生成

更新时间：2026-07-14  
状态：待开发

## 1. 背景与目标

TFTAgent 已经完成了以结构化数据为核心的局内决策链路：解析用户问题、查询 MetaTFT 数据、本地过滤当前版本装备、计算名次指标并确定性排序。当前文本结论主要由模板生成，准确且可验证，但对“为什么推荐”“不同打法如何取舍”“下一步如何选择”等问题的表达仍较机械。

下一阶段的目标是在**不改变数据与排序事实来源**的前提下，引入 LLM 作为受控的结论生成层，使回答更贴近真实玩家在局内的决策语言。

目标能力：

1. 基于已验证的推荐、装备比较和阵容榜证据，生成简洁、自然、可操作的中文结论。
2. 根据用户明确表达的偏好（如“求稳”“想吃鸡”“样本要大”）解释对应的取舍。
3. 在多轮对话中总结“本轮变化了什么”，但不修改已经校验过的查询条件和统计结果。
4. LLM 不可用、超时或输出不合规时，自动回退到当前模板化 `text` 与 `answer`，不影响核心查询功能。

## 2. 产品边界

### 2.1 LLM 可以做什么

- 将推荐卡、比较卡和阵容榜中的既有统计证据组织为自然语言结论。
- 解释第一推荐、备选方案、风险提示和用户偏好之间的关系。
- 给出下一步可执行建议，例如“已有羊刀时，优先补齐剩余两件”或“若更看重吃鸡，可选择另一方案”。
- 对无结果、低样本、数据过期、条件歧义等状态做友好的说明与追问建议。

### 2.2 LLM 不可以做什么

- 编造未出现在证据包中的版本、数值、装备效果、阵容强度或胜率。
- 修改英雄、装备、羁绊、星级、段位、时间范围、样本阈值等结构化查询条件。
- 重新计算前四率、登顶率、平均名次或自行选出统计意义上的“最优”方案。
- 绕过当前版本装备可用性、样本门槛、实体澄清、数据时效和比较胜出规则。
- 将相关性统计描述为因果结论，例如“该装备导致胜率提升”。

结论权责应保持如下分层：

```text
规则/目录：实体合法性、版本可用性、样本与风险边界
数据服务：原始对局统计、缓存与数据来源
本地算法：过滤、指标计算、排序、比较胜负
LLM：仅基于证据的解释、总结、行动建议
UI：展示结构化证据、LLM 结论来源和降级状态
```

## 3. 现有基础与接入位置

当前 `recommendForInput` 已返回结构化结果，包括：

- `query`：已验证的英雄、装备、羁绊、样本、排序等条件及其来源；
- `rankedBuilds` / `itemRankings` / `comparison`：本地计算出的推荐、单装备排行或装备比较结果；
- `decision`、`clarification`、`warnings`：低样本、数据过期、澄清和拒绝推荐等安全状态；
- `source`、`cache`：数据端点、更新时间及缓存状态；
- `text`：当前确定性模板文本，可作为永久回退。

接入应位于推荐服务完成本地计算之后、HTTP 序列化之前：

```text
POST /api/recommend
  → parseQuery / 可选结构化解析
  → catalog 校验与条件澄清
  → MetaTFT 查询与缓存
  → 本地过滤、统计、排序、比较
  → 构建 LLM evidence pack              [新增]
  → LLM 生成 conclusion JSON            [新增，可失败]
  → conclusion 校验、拒绝或降级          [新增]
  → serializeRecommendation / 小窗渲染
```

不得把 LLM 接在查询前替代 `QueryValidator`，也不得让 LLM 直接发起 MetaTFT 请求。

## 4. 结论类型与首期范围

首期仅支持已有稳定结构化结果的四类回答：

| 类型 | 当前结果 | LLM 应生成的内容 |
|---|---|---|
| 三件套推荐 | `unit_build_rankings` | 推荐理由、备选差异、已有装备下的补齐建议 |
| 装备比较 | `unit_item_comparison` | 胜出/不判胜原因、指标权衡、代表三件套说明 |
| 单装备排行 | `unit_item_rankings` | 第一名说明、样本覆盖与特殊装备口径提醒 |
| 阵容排行榜 | `comp_rankings` | 榜首摘要、指标含义、不同偏好的选择建议 |

以下情况首期不调用生成模型，直接使用现有确定性结果：

- 缺英雄、实体冲突、低置信实体、缺比较项等澄清状态；
- 当前版本不可用装备的本地裁决；
- 无可用数据且没有推荐卡；
- 有 `stale_evidence`、关键指标缺失或比较规则明确拒绝胜出时；
- 用户未启用“结论增强”或运行时未配置模型。

对低样本结果可以调用模型，但 prompt 与 validator 必须要求使用“仅供参考”“不能视为稳定推荐”等限定表述。

## 5. 证据包契约

### 5.1 设计原则

证据包是 LLM 唯一允许引用的事实集合。它必须由服务端构建，禁止把原始 MetaTFT 大响应、API Key、内部缓存路径、用户未确认候选别名或完整会话原文发送给模型。

字段应使用稳定 API 名和已展示中文名双轨输出；模型输出只能引用 `evidenceId` 中存在的条目。

### 5.2 建议 schema（v1）

```json
{
  "schemaVersion": "llm_conclusion_evidence.v1",
  "locale": "zh-CN",
  "request": {
    "intent": "unit_build_rankings",
    "userGoal": "top4_first",
    "inputSummary": "霞已有羊刀，剩下两件怎么带"
  },
  "query": {
    "unit": { "apiName": "TFT17_Xayah", "name": "霞" },
    "starLevels": [2],
    "itemPolicy": "ordinary_only",
    "lockedItems": [{ "apiName": "TFT_Item_GuinsoosRageblade", "name": "羊刀" }],
    "excludedItems": [],
    "days": 3,
    "rankFilter": ["PLATINUM", "EMERALD", "DIAMOND"],
    "minSamples": 100,
    "assumptions": ["星级默认 2 星", "统计范围为近 3 天"]
  },
  "recommendations": [
    {
      "evidenceId": "build:1",
      "rank": 1,
      "items": ["羊刀", "无尽", "正义之手"],
      "stats": { "games": 1248, "top4Rate": 0.612, "winRate": 0.183, "avgPlacement": 3.86 },
      "stable": true,
      "lowSample": false
    }
  ],
  "comparison": null,
  "warnings": [],
  "dataStatus": { "provider": "MetaTFT", "cache": "fresh", "updatedAt": "..." },
  "generationRules": {
    "factsMustComeFromEvidence": true,
    "forbidCausalClaims": true,
    "mustMentionLowSample": false,
    "mustMentionStaleData": false
  }
}
```

数值建议以原始数字传入，由模型按固定格式展示；不要仅传入格式化后的百分号字符串，以便 validator 能进行一致性核验。

### 5.3 最小化与脱敏

- 默认只传前 1 个推荐和最多 2 个备选，比较场景只传用户指定项。
- 只传当前轮可展示的会话摘要，不传完整聊天记录。
- 不传 `OPENAI_API_KEY`、服务 endpoint、完整 headers、文件路径、缓存原始内容。
- 对用户输入先限制长度；对 evidence pack 设置大小上限并进行字段白名单序列化。

## 6. LLM 输出契约与校验

### 6.1 生成输出 schema（v1）

模型必须返回严格 JSON，不返回 Markdown 或自由前后缀：

```json
{
  "schemaVersion": "llm_conclusion.v1",
  "status": "ok",
  "headline": "推荐用羊刀、无尽和正义之手补齐。",
  "summary": "在当前统计范围内，该组合的前四率最高，且样本达到稳定展示门槛。",
  "reasons": [
    {
      "evidenceIds": ["build:1"],
      "text": "该组合前四率为 61.2%，样本为 1248 场。"
    }
  ],
  "alternatives": [
    {
      "evidenceIds": ["build:2"],
      "text": "若更重视登顶率，可参考备选方案。"
    }
  ],
  "nextAction": "优先围绕已持有的羊刀补齐输出与续航装备。",
  "riskNotice": null
}
```

`status` 只允许 `ok` 或 `insufficient_evidence`。后者用于模型无法根据给定证据形成自然语言结论，不等同于请求失败。

### 6.2 服务端校验规则

新增 `src/llm/conclusion-validator.js`，校验至少包括：

1. JSON 与 schema 完整性：字段类型、长度、数组上限、禁止额外高风险字段。
2. 证据引用：每个 `evidenceIds` 必须存在于 evidence pack，且不得为空。
3. 名称约束：英雄、装备、羁绊仅允许使用 evidence pack 的展示名称或 API 名。
4. 数值约束：输出中的百分比、样本数、平均名次必须能在对应证据中精确匹配或按统一精度规则匹配。
5. 安全措辞：禁止“必定”“保证”“唯一最强”等绝对化表达；禁止因果语义，如“导致胜率提高”。
6. 风险措辞：低样本、过期数据、未决胜负、缺失指标时必须携带对应风险提示；稳定结果不得被模型无依据标记为低样本。
7. 事实边界：`winner=null` 或 `decision` 非胜出时，禁止输出“更优”“胜出”等结论。
8. 长度与时延：标题、摘要、理由、下一步建议均设字符上限，避免局内小窗被长文本占满。

校验失败时不重试修复文本，记录失败原因并直接降级；只有明确的网络超时或可恢复 provider 错误可按配置重试一次。

## 7. 模块设计

建议新增以下模块，保持与已有 `structured-parser` 独立：

```text
src/llm/
  conclusion-provider.js        # provider 抽象、超时、请求日志脱敏
  conclusion-evidence.js        # 从 recommendation result 构建白名单 evidence pack
  conclusion-validator.js       # JSON、证据引用、数值与风险校验
  prompts/
    generate-conclusion.md      # 版本化 prompt 合同
src/core/
  conclusion-service.js         # 调用、重试、降级与结果封装
```

接口建议：

```js
const conclusion = await generateEvidenceBackedConclusion({
  result,
  catalog,
  config: runtime.conclusionGeneratorConfig,
  provider: runtime.conclusionProvider
});
```

返回值必须将生成状态显式写出：

```js
{
  status: "generated" | "disabled" | "skipped" | "fallback",
  content: { headline, summary, reasons, alternatives, nextAction, riskNotice } | null,
  reason: "provider_unavailable" | "invalid_output" | "unsafe_state" | null,
  model: "configured-model-name" | null,
  latencyMs: 0
}
```

`serializeRecommendation` 在现有 `answer` 下新增 `generatedConclusion` 字段；保留原有 `text`、`cards`、`comparison` 为事实展示，不以 LLM 输出替代它们。

## 8. 配置、隐私与成本控制

建议配置与现有结构化解析器保持风格一致，但独立开关：

```env
TFT_AGENT_CONCLUSION_MODE=off
TFT_AGENT_CONCLUSION_PROVIDER=openai_compatible
TFT_AGENT_CONCLUSION_MODEL=...
TFT_AGENT_CONCLUSION_ENDPOINT=...
TFT_AGENT_CONCLUSION_TIMEOUT_MS=10000
TFT_AGENT_CONCLUSION_MAX_OUTPUT_TOKENS=1600
```

- 默认 `off`，未配置 key 或模型时不得影响查询。
- 前端仅接收 provider 是否启用、模型显示名（可选）、生成状态、耗时和降级原因；不得返回 endpoint 或 key。
- 局内查询的总延迟优先：建议 LLM 超时 1.5–2.0 秒；超时立刻返回确定性结果，不阻塞用户。
- 根据 `query cache key + evidence schema version + prompt version + model` 缓存已校验的生成结果。数据缓存为 stale、用户请求刷新或 evidence 变化时必须失效。
- 对相同会话中的重复显示优先复用结论缓存，避免重复付费和语言抖动。

## 9. 分阶段实施计划

### P0：证据与契约（优先）

1. 实现 evidence pack builder 与固定 fixture。
2. 编写 `generate-conclusion.md`，明确唯一事实来源、禁止事项与 JSON schema。
3. 实现输出 validator，先用 fake provider 覆盖合法、越界、编造数值、漏风险等路径。
4. HTTP 序列化新增 `generatedConclusion`，UI 暂不展示或只展示开发标记。

完成标准：不接真实模型也可以通过离线测试验证证据与校验边界。

### P1：Provider 与安全降级

1. 实现兼容 OpenAI Chat Completions 的 conclusion provider。
2. 加入 provider 超时、一次受控重试、日志脱敏、错误分类和 result cache。
3. 仅对稳定的三件套推荐与装备比较灰度启用。
4. 所有失败路径返回已有模板文本，主查询 HTTP 状态仍为成功。

完成标准：真实 provider 可用时获得结构化结论；断网、超时、返回非 JSON、schema 不符时均不改变当前结果。

### P2：小窗呈现与用户控制

1. 在结论区显示“数据解读”卡，始终放在结构化推荐卡之后。
2. 显示“由数据生成”“低样本/过期风险”“已使用模板回退”等状态，不把生成文本伪装为原始数据。
3. 设置中提供关闭开关；默认遵守服务端配置。
4. 为生成结论增加独立反馈类型，例如 `good_explanation` / `bad_explanation`，不得与推荐结果反馈混淆。

完成标准：360px 与 460px 下无横向溢出，关闭或失败时 UI 不留空白、不改变推荐卡。

### P3：覆盖阵容榜和多轮决策

1. 为 `comp_rankings` 构建独立 evidence pack，避免把装备推荐 schema 强行复用。
2. 增加“偏好变化摘要”：仅依据本轮与上轮已验证 query 的字段差异生成。
3. 对低样本、候选接近、指标冲突等场景产出保守建议，不创建新的事实。

完成标准：所有结论都能回链到卡片、统计字段或风险状态。

## 10. 测试与验收矩阵

| 场景 | 必须验证 |
|---|---|
| 稳定三件套推荐 | LLM 只能引用第一推荐及备选卡内指标；JSON 与 evidenceId 通过校验 |
| 装备比较胜出 | 结论与 `comparison.winner`、主指标和代表构筑一致 |
| 比较不判胜 | 不得输出胜出者或绝对推荐 |
| 低样本 | 必须出现“低样本/仅供参考”风险语义 |
| stale 数据 | 必须提示时效风险，不能标为最新版本结论 |
| 不可用装备/澄清 | 不调用 conclusion provider |
| Provider 超时/断网 | 在超时预算内回退既有 `text`；请求整体仍成功 |
| 伪造装备或数字 | validator 拒绝，记录 `invalid_output`，不展示模型文本 |
| 缓存 | 同证据命中结论缓存；数据或 prompt 版本变化后失效 |
| 隐私 | HTTP runtime 与日志不含 API key、endpoint、完整原始输入 |
| UI | 360px/460px 显示、长文本截断策略、关闭开关和回退状态正确 |

建议新增：

- `test/conclusion-evidence.test.js`
- `test/conclusion-validator.test.js`
- `test/conclusion-provider.test.js`
- `test/conclusion-service.test.js`
- `test/small-window-server.test.js` 的生成、超时与回退 HTTP 用例
- `test/small-window-ui.test.js` 的结论卡与响应式用例

## 11. 发布指标与回滚

灰度期间记录以下不含敏感内容的指标：

- 结论生成调用率、成功率、校验拒绝率、超时率、回退率；
- P50/P95 生成耗时、结论缓存命中率；
- 用户对“推荐结果”和“解释文本”的独立好/坏反馈；
- 按结果类型统计的引用校验失败原因。

若出现 provider 不稳定、成本异常、校验拒绝率显著升高或用户认为结论误导，直接将 `TFT_AGENT_CONCLUSION_MODE=off`；核心数据查询、排序和小窗均应保持可用，无需回滚已有推荐链路。

## 12. 最终验收定义

本阶段完成须同时满足：

1. LLM 结论完全由服务端 evidence pack 支撑，并通过自动化校验。
2. 排序、样本判定、装备可用性和比较胜出仍由本地确定性逻辑决定。
3. 任意 LLM 异常均可无感回退到现有模板结果，且不会扩大核心查询延迟上限。
4. 用户可以在 UI 中区分“统计事实”“数据解读”“风险提示”和“模板回退”。
5. 离线测试覆盖主要安全边界，真实 provider smoke 仅作为可选发布前检查。

