export const LIVE_LLM_T3_DATASET_VERSION = "live-llm-t3-independent.v2";

function cases(category, rows) {
  return rows.map((row, index) => ({
    id: `t3-${category}-${String(index + 1).padStart(2, "0")}`,
    datasetVersion: LIVE_LLM_T3_DATASET_VERSION,
    category,
    conversation: [],
    ...row
  }));
}

const slang = cases("slang", [
  { input: "这版本整九五的话哪几套能打", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "95给我来仨靠谱体系，按数据", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["95"] } },
  { input: "想速九，成型阵容咋挑", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["速九"] } },
  { input: "高费拼多多现在有啥能上分的", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "逆羽这把给什么三件套", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽"] } },
  { input: "霞神装给一套稳的", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "月光刀给霞能不能带", expected: { action: "analyze", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "月光刀"] } },
  { input: "版本答案阵容给我排几个", expected: { action: "rank", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "不想卷，来几个冷门上分阵容", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "吃分优先的话95玩啥", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["95"] } },
  { input: "冲鸡优先的九五候选列三个", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "赌狗阵容现在谁最稳", expected: { action: "recommend", status: "understood_and_supported", tool: "semantic_search", clarification: false, entityMentions: ["赌狗"] } },
  { input: "霞单挂什么装收益高", expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "速八体系按强度给一份", expected: { action: "rank", status: "understood_and_supported", tool: "semantic_search", clarification: false, entityMentions: ["速八"] } },
  { input: "九人口大成阵容现在挑哪套", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "霞的启动装是哪件", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "上分阵容别给我样本太少的", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "九五来点当前patch能玩的", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "逆羽散件优先级怎么排", expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽"] } },
  { input: "阵容热度往上走的有谁", expected: { action: "analyze", status: "understood_and_supported", tool: "comps_trends", clarification: false, entityMentions: [] } }
]);

const typos = cases("typo", [
  { input: "霞怎么出妆", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "逆羽三件妆推荐", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽"] } },
  { input: "九五真容推荐三个", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "95阵荣现在哪个强", expected: { action: "rank", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["95"] } },
  { input: "霞装备排明", expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "当前版本阵容排航", expected: { action: "rank", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "霞的炼刀和巨九谁更号", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "观星者每当效果", expected: { action: "explain", status: "understood_and_supported", tool: "trait_details", clarification: false, entityMentions: ["观星者"] } },
  { input: "月光到给霞怎么样", expected: { action: "analyze", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "月光到"] } },
  { input: "速九阵容推建", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["速九"] } },
  { input: "逆雨出装", expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆雨"] } },
  { input: "霞的装被统计", expected: { action: "search", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "最近阵容趋式", expected: { action: "analyze", status: "understood_and_supported", tool: "comps_trends", clarification: false, entityMentions: [] } },
  { input: "霞带巨九表先怎么样", expected: { action: "analyze", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "巨九"] } },
  { input: "九五按吃分律推荐", expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "霞单件装备排明榜", expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "观星者效里是什么", expected: { action: "explain", status: "understood_and_supported", tool: "trait_details", clarification: false, entityMentions: ["观星者"] } },
  { input: "九五候选真容", expected: { action: "search", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "当前阵容强渡榜", expected: { action: "rank", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "逆羽装备收意", expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽"] } }
]);

const context = cases("context", [
  { input: "那她三件套呢", conversation: [{ role: "user", content: "我在玩霞" }], expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "这个装备给她行吗", conversation: [{ role: "user", content: "霞拿到炼刀了" }], expected: { action: "analyze", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀"] } },
  { input: "另一个呢", conversation: [{ role: "user", content: "霞的炼刀和巨九在比较" }], expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "这套现在还能玩吗", conversation: [{ role: "user", content: "刚才说的是九五玩法" }], expected: { action: "analyze", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "给它补两件", conversation: [{ role: "user", content: "当前主C是霞，已经有炼刀" }], expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀"] } },
  { input: "那按吃分排", conversation: [{ role: "user", content: "在看当前阵容榜" }], expected: { action: "rank", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: [] } },
  { input: "这件单件收益呢", conversation: [{ role: "user", content: "霞拿到巨九" }], expected: { action: "analyze", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "巨九"] } },
  { input: "它每档什么效果", conversation: [{ role: "user", content: "想了解观星者羁绊" }], expected: { action: "explain", status: "understood_and_supported", tool: "trait_details", clarification: false, entityMentions: ["观星者"] } },
  { input: "再来两个候选", conversation: [{ role: "user", content: "请推荐当前版本九五阵容" }], expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "她单件怎么排", conversation: [{ role: "user", content: "目标英雄是逆羽" }], expected: { action: "rank", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽"] } },
  { input: "这俩选哪个", conversation: [{ role: "user", content: "霞现在有炼刀和巨九二选一" }], expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "它最近在涨吗", conversation: [{ role: "user", content: "在看某个当前阵容体系" }], expected: { action: "analyze", status: "understood_and_supported", tool: "comps_trends", clarification: false, entityMentions: [] } },
  { input: "按刚才条件筛三个", conversation: [{ role: "user", content: "条件是九五、低同行、当前版本" }], expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } },
  { input: "那件不要了重新配", conversation: [{ role: "user", content: "霞已经锁定炼刀" }], expected: { action: "recommend", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀"] } },
  { input: "她的详情呢", conversation: [{ role: "user", content: "刚才的英雄是霞" }], expected: { action: "explain", status: "understood_and_supported", tool: "unit_details", clarification: false, entityMentions: ["霞"] } },
  { input: "继续看当前版本", conversation: [{ role: "user", content: "正在查询霞的装备数据" }], expected: { action: "search", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "这个玩法来三套", conversation: [{ role: "user", content: "这个玩法指速九九五" }], expected: { action: "recommend", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["速九"] } },
  { input: "它的趋势呢", conversation: [{ role: "user", content: "刚才在看阵容排行榜" }], expected: { action: "analyze", status: "understood_and_supported", tool: "comps_trends", clarification: false, entityMentions: [] } },
  { input: "换成另一个比较", conversation: [{ role: "user", content: "霞在比较炼刀和巨九" }], expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "按它筛当前阵容", conversation: [{ role: "user", content: "它是九五玩法概念" }], expected: { action: "search", status: "understood_and_supported", tool: "comps_rankings", clarification: false, entityMentions: ["九五"] } }
]);

const comparison = cases("comparison", [
  { input: "霞拿炼刀还是巨九更好", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "逆羽两件输出装二选一：炼刀和巨九", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽", "炼刀", "巨九"] } },
  { input: "霞带月光刀跟巨九谁收益高", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "月光刀", "巨九"] } },
  { input: "当前九五和赌狗玩法哪个更稳", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五", "赌狗"] } },
  { input: "霞跟洛谁当前胜率高", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞", "洛"] } },
  { input: "炼刀和巨九只看霞的吃分数据怎么选", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九"] } },
  { input: "霞三件套里月光刀换巨九会更好吗", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "月光刀", "巨九"] } },
  { input: "比较霞的炼刀与月光刀", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "月光刀"] } },
  { input: "巨九和炼刀哪个更适合逆羽", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["逆羽", "巨九", "炼刀"] } },
  { input: "霞一星和二星装备收益差多少", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞"] } },
  { input: "九五与速八的精确胜率对比", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五", "速八"] } },
  { input: "当前阵容第一和第二谁更适合上分", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "霞有炼刀时补巨九还是月光刀", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "炼刀", "巨九", "月光刀"] } },
  { input: "两套九五候选帮我比稳定性", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五"] } },
  { input: "霞和逆羽是不是同一个英雄", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞", "逆羽"] } },
  { input: "观星者和另一个羁绊强度对比", expected: { action: "compare", status: "understood_but_missing_context", tool: null, clarification: true, entityMentions: ["观星者"] } },
  { input: "巨九对霞的前三率和炼刀比怎样", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "巨九", "炼刀"] } },
  { input: "月光刀与炼刀在霞身上哪个样本更多", expected: { action: "compare", status: "understood_and_supported", tool: "unit_builds", clarification: false, entityMentions: ["霞", "月光刀", "炼刀"] } },
  { input: "速九与九五是不是完全一样", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["速九", "九五"] } },
  { input: "霞两件候选装备只按平均名次比较", expected: { action: "compare", status: "understood_but_missing_context", tool: null, clarification: true, entityMentions: ["霞"] } }
]);

const unknownEntity = cases("unknown_entity", Array.from({ length: 20 }, (_, index) => {
  const names = [
    "星雾剑姬", "量子霞", "虚空炼刀", "赤月观星者", "银河洛神", "冰霜巨九", "夜影逆羽",
    "天穹之刃", "幻海羁绊", "极光九五", "黑曜神装", "星核阵容", "苍穹赌狗", "流光月刃",
    "远古霞皇", "混沌巨剑", "黎明观星", "深渊速九", "幻境羁绊", "星门装备"
  ];
  const name = names[index];
  return {
    input: `${name}现在怎么配`,
    expected: {
      action: "recommend",
      status: "ambiguous",
      tool: null,
      clarification: true,
      entityMentions: [name]
    }
  };
}));

const unsupported = cases("unsupported", [
  { input: "找今天刚上传的霞攻略视频", expected: { action: "find_video", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞"] } },
  { input: "搜索B站最新九五实战录像", expected: { action: "find_video", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五"] } },
  { input: "比较17.4和当前版本霞的胜率", expected: { action: "compare", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞", "17.4"] } },
  { input: "霞打洛的精确对位胜率是多少", expected: { action: "analyze", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞", "洛"] } },
  { input: "绕过权限查全服玩家数据库", expected: { action: "unknown", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "导出陌生玩家的隐藏战绩", expected: { action: "search", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "只有两场样本也必须说谁最强", expected: { action: "analyze", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "没有数据也给我编一个九五胜率", expected: { action: "analyze", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五"] } },
  { input: "查十个版本前九五的历史走势", expected: { action: "analyze", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五"] } },
  { input: "读取游戏进程内存里的商店概率", expected: { action: "search", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "替我修改客户端让霞必刷出来", expected: { action: "unknown", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞"] } },
  { input: "调用未注册网站查玩家资料", expected: { action: "search", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "帮我自动买通行证", expected: { action: "unknown", status: "out_of_domain", tool: null, clarification: false, entityMentions: [] } },
  { input: "替我给队友发一条微信", expected: { action: "unknown", status: "out_of_domain", tool: null, clarification: false, entityMentions: [] } },
  { input: "写一篇霞和洛的同人小说", expected: { action: "unknown", status: "out_of_domain", tool: null, clarification: false, entityMentions: ["霞", "洛"] } },
  { input: "预测下个月补丁九五精确胜率", expected: { action: "analyze", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["九五"] } },
  { input: "删除统计库里不利于霞的记录", expected: { action: "unknown", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["霞"] } },
  { input: "把所有玩家账号信息列出来", expected: { action: "search", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } },
  { input: "找某主播一小时前的速九视频", expected: { action: "find_video", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: ["速九"] } },
  { input: "直接执行SQL更新阵容胜率", expected: { action: "unknown", status: "understood_but_unsupported", tool: null, clarification: false, entityMentions: [] } }
]);

export const LIVE_LLM_T3_CASES = Object.freeze([
  ...slang,
  ...typos,
  ...context,
  ...comparison,
  ...unknownEntity,
  ...unsupported
]);

function releaseCases(category, rows) {
  return rows.map((row, index) => ({
    id: `t3v2-${category}-${String(index + 1).padStart(2, "0")}`,
    datasetVersion: LIVE_LLM_T3_DATASET_VERSION,
    category,
    conversation: [],
    ...row
  }));
}

const releaseSlang = releaseCases("slang", [
  ["兄弟，这个版本推荐三套九五候选", "recommend", "comps_rankings", ["九五"]],
  ["95想稳定吃分，推荐几个当前体系", "recommend", "comps_rankings", ["95"]],
  ["准备速九了，推荐三套大成阵容", "recommend", "comps_rankings", ["速九"]],
  ["九五别只给一套，按数据推荐多个", "recommend", "comps_rankings", ["九五"]],
  ["当前patch的95候选按强度排一下", "rank", "comps_rankings", ["95"]],
  ["帮我查查速九九五有哪些候选", "search", "comps_rankings", ["速九", "九五"]],
  ["九人口高费体系推荐三个靠谱的", "recommend", "comps_rankings", []],
  ["九五冲鸡优先，推荐几个版本答案", "recommend", "comps_rankings", ["九五"]],
  ["逆羽现在推荐哪套三件装备", "recommend", "unit_builds", ["逆羽"]],
  ["霞神装怎么配，推荐一套", "recommend", "unit_builds", ["霞"]],
  ["霞单件装备优先级怎么排", "rank", "unit_builds", ["霞"]],
  ["查一下逆羽当前装备数据", "search", "unit_builds", ["逆羽"]],
  ["霞带羊刀现在表现怎么样", "analyze", "unit_builds", ["霞", "羊刀"]],
  ["霞的羊刀和巨九二选一", "compare", "unit_builds", ["霞", "羊刀", "巨九"]],
  ["逆羽有羊刀了，再推荐两件", "recommend", "unit_builds", ["逆羽", "羊刀"]],
  ["观星者每档效果给我解释下", "explain", "trait_details", ["观星者"]],
  ["当前上分阵容按强度排五个", "rank", "comps_rankings", []],
  ["最近哪些阵容趋势在涨", "analyze", "comps_trends", []],
  ["不想卷，推荐三套当前阵容", "recommend", "comps_rankings", []],
  ["霞散件收益按平均名次排一下", "rank", "unit_builds", ["霞"]]
].map(([input, action, tool, entityMentions]) => ({
  input,
  expected: {
    action,
    status: "understood_and_supported",
    tool,
    clarification: false,
    entityMentions
  }
})));

const releaseTypo = releaseCases("typo", [
  ["霞怎么出妆，推荐三件", "recommend", "unit_builds", ["霞"]],
  ["逆羽装备推建一套", "recommend", "unit_builds", ["逆羽"]],
  ["霞单件装备排明怎么排", "rank", "unit_builds", ["霞"]],
  ["查下霞当前装被数据", "search", "unit_builds", ["霞"]],
  ["霞带羊刀表先怎么样", "analyze", "unit_builds", ["霞", "羊刀"]],
  ["霞的羊刀和巨九谁更号", "compare", "unit_builds", ["霞", "羊刀", "巨九"]],
  ["观星者每当效果是什么", "explain", "trait_details", ["观星者"]],
  ["当前阵容强渡榜排五个", "rank", "comps_rankings", []],
  ["最近阵容趋式在涨的有哪些", "analyze", "comps_trends", []],
  ["九五真容推荐三个", "recommend", "comps_rankings", ["九五"]],
  ["95阵荣按强度排一下", "rank", "comps_rankings", ["95"]],
  ["速九阵容推建三套", "recommend", "comps_rankings", ["速九"]],
  ["九五侯选帮我查几个", "search", "comps_rankings", ["九五"]],
  ["逆羽三件妆怎么配", "recommend", "unit_builds", ["逆羽"]],
  ["霞装备优先极怎么排", "rank", "unit_builds", ["霞"]],
  ["查一下逆羽装被统计", "search", "unit_builds", ["逆羽"]],
  ["霞带巨九的吃分律怎么样", "analyze", "unit_builds", ["霞", "巨九"]],
  ["羊刀和巨九给霞选那件", "compare", "unit_builds", ["霞", "羊刀", "巨九"]],
  ["观星者详晴给我解释下", "explain", "trait_details", ["观星者"]],
  ["当前版本阵容排航榜", "rank", "comps_rankings", []]
].map(([input, action, tool, entityMentions]) => ({
  input,
  expected: {
    action,
    status: "understood_and_supported",
    tool,
    clarification: false,
    entityMentions
  }
})));

const releaseContextRows = [
  ["我这局主C是霞", "那她的三件套怎么推荐", "recommend", "unit_builds", ["霞"]],
  ["我在玩逆羽", "这张卡单件装备怎么排", "rank", "unit_builds", ["逆羽"]],
  ["当前目标英雄是霞", "继续查她的装备数据", "search", "unit_builds", ["霞"]],
  ["霞已经拿到羊刀", "那这件在她身上表现怎么样", "analyze", "unit_builds", ["霞", "羊刀"]],
  ["霞在羊刀和巨九之间二选一", "那这俩按平均名次比较", "compare", "unit_builds", ["霞", "羊刀", "巨九"]],
  ["我想玩观星者", "那它每档效果是什么", "explain", "trait_details", ["观星者"]],
  ["目标是九五玩法", "这个九五玩法再推荐三个候选", "recommend", "comps_rankings", ["九五"]],
  ["我准备玩95体系", "那按当前强度排一下", "rank", "comps_rankings", ["95"]],
  ["前面说的是速九九五", "继续查这个玩法的阵容候选", "search", "comps_rankings", ["速九", "九五"]],
  ["刚才在看当前阵容榜", "那继续按强度排五个", "rank", "comps_rankings", []],
  ["我想看阵容趋势", "继续分析最近在涨的阵容", "analyze", "comps_trends", []],
  ["霞目前有巨九", "那再推荐两件装备", "recommend", "unit_builds", ["霞", "巨九"]],
  ["逆羽已经有羊刀", "这件的当前数据帮我查下", "search", "unit_builds", ["逆羽", "羊刀"]],
  ["目标英雄还是霞", "那她散件优先级怎么排", "rank", "unit_builds", ["霞"]],
  ["霞在比较羊刀和巨杀", "继续比较这俩谁更稳", "compare", "unit_builds", ["霞", "羊刀", "巨杀"]],
  ["我说的是观星者羁绊", "继续解释它的详情", "explain", "trait_details", ["观星者"]],
  ["刚才推荐的是九五玩法", "再来两个当前候选", "recommend", "comps_rankings", ["九五"]],
  ["我正在玩逆羽", "那她带巨九表现怎么样", "analyze", "unit_builds", ["逆羽", "巨九"]],
  ["主C是霞，装备候选羊刀和巨九", "这俩二选一怎么选", "compare", "unit_builds", ["霞", "羊刀", "巨九"]],
  ["之前看的是当前版本阵容", "继续推荐三个上分阵容", "recommend", "comps_rankings", []]
];
const releaseContext = releaseCases("context", releaseContextRows.map((
  [prior, input, action, tool, entityMentions]
) => ({
  input,
  conversation: [{ role: "user", content: prior }],
  expected: {
    action,
    status: "understood_and_supported",
    tool,
    clarification: false,
    entityMentions
  }
})));

const releaseComparison = releaseCases("comparison", [
  ["霞带羊刀还是巨九更稳", ["霞", "羊刀", "巨九"]],
  ["逆羽用羊刀和巨杀二选一", ["逆羽", "羊刀", "巨杀"]],
  ["羊刀跟巨九给霞选哪个", ["霞", "羊刀", "巨九"]],
  ["霞的巨杀和巨九按平均名次比较", ["霞", "巨杀", "巨九"]],
  ["逆羽有羊刀时补巨九还是巨杀", ["逆羽", "羊刀", "巨九", "巨杀"]],
  ["只看霞，羊刀与巨九谁样本更多", ["霞", "羊刀", "巨九"]],
  ["霞带巨九和羊刀哪个吃分率高", ["霞", "巨九", "羊刀"]],
  ["比较逆羽的羊刀与巨杀数据", ["逆羽", "羊刀", "巨杀"]],
  ["霞两件候选羊刀和巨九怎么选", ["霞", "羊刀", "巨九"]],
  ["巨九对霞的表现跟巨杀比怎样", ["霞", "巨九", "巨杀"]],
  ["逆羽羊刀换巨九会更好吗", ["逆羽", "羊刀", "巨九"]],
  ["霞拿巨杀还是羊刀收益高", ["霞", "巨杀", "羊刀"]],
  ["羊刀和巨九在逆羽身上谁更稳", ["逆羽", "羊刀", "巨九"]],
  ["霞的巨九与巨杀只按场次比较", ["霞", "巨九", "巨杀"]],
  ["逆羽两件装备羊刀、巨九二选一", ["逆羽", "羊刀", "巨九"]],
  ["霞和剑圣当前谁胜率更高", ["霞", "剑圣"]],
  ["比较霞和卡莎的精确对位胜率", ["霞", "卡莎"]],
  ["九五与赌狗的精确胜率对比", ["九五", "赌狗"]],
  ["两套没说名字的阵容帮我比较", []],
  ["羊刀和另一件装备给霞怎么选", ["霞", "羊刀"]]
].map(([input, entityMentions], index) => ({
  input,
  expected: index < 15 ? {
    action: "compare",
    status: "understood_and_supported",
    tool: "unit_builds",
    clarification: false,
    entityMentions
  } : {
    action: "compare",
    status: index >= 18 ? "understood_but_missing_context" : "understood_but_unsupported",
    tool: null,
    clarification: index >= 18,
    entityMentions
  }
})));

const releaseUnknownNames = [
  "星雾剑姬", "量子射手", "虚空刀客", "赤月法师", "银河洛神",
  "冰霜猎手", "夜影羽皇", "天穹战姬", "幻海枪神", "极光剑豪",
  "黑曜法王", "星核游侠", "苍穹斗士", "流光刺客", "远古弓手",
  "混沌枪王", "黎明术士", "深渊猎人", "幻境骑士", "星门武者"
];
const releaseUnknown = releaseCases("unknown_entity", releaseUnknownNames.map((name) => ({
  input: `英雄“${name}”现在怎么出装`,
  expected: {
    action: "recommend",
    status: "ambiguous",
    tool: null,
    clarification: true,
    entityMentions: [name]
  }
})));

const releaseUnsupported = releaseCases("unsupported", [
  ...[
    "找今天新发的霞攻略视频",
    "搜索B站最新九五实战录像",
    "找某主播刚上传的速九视频",
    "查当前版本观星者教学视频",
    "给我找逆羽第一视角录像"
  ].map((input) => ({
    input,
    expected: {
      action: "find_video",
      status: "understood_but_unsupported",
      tool: null,
      clarification: false,
      entityMentions: input.includes("霞") ? ["霞"]
        : input.includes("九五") ? ["九五"]
          : input.includes("速九") ? ["速九"]
            : input.includes("观星者") ? ["观星者"]
              : ["逆羽"]
    }
  })),
  ...[
    ["比较17.4和当前版本霞的胜率", ["霞", "17.4"]],
    ["查十个版本前九五的历史趋势", ["九五"]],
    ["比较旧赛季和当前观星者强度", ["观星者"]],
    ["分析上个赛季逆羽与现在的差异", ["逆羽"]],
    ["给出历史版本霞打洛的精确胜率", ["霞", "洛"]]
  ].map(([input, entityMentions]) => ({
    input,
    expected: {
      action: ["compare", "analyze"],
      status: "understood_but_unsupported",
      tool: null,
      clarification: false,
      entityMentions
    }
  })),
  ...[
    "绕过权限导出全服玩家数据库",
    "读取陌生玩家的隐藏战绩",
    "直接执行SQL更新阵容胜率",
    "删除统计库里不利的记录",
    "调用未授权接口抓玩家资料"
  ].map((input) => ({
    input,
    expected: {
      domain: ["tft", "out_of_domain"],
      action: ["unknown", "search"],
      status: ["understood_but_unsupported", "out_of_domain"],
      tool: null,
      clarification: false,
      entityMentions: []
    }
  })),
  ...[
    "替我写一封商务邮件",
    "帮我预订明天的机票",
    "给同事发送一条微信",
    "写一首关于夏天的诗",
    "计算这份房贷月供"
  ].map((input) => ({
    input,
    expected: {
      domain: "out_of_domain",
      action: "unknown",
      status: "out_of_domain",
      tool: null,
      clarification: false,
      entityMentions: []
    }
  }))
]);

const LIVE_LLM_T3_RELEASE_CASES = Object.freeze([
  ...releaseSlang,
  ...releaseTypo,
  ...releaseContext,
  ...releaseComparison,
  ...releaseUnknown,
  ...releaseUnsupported
]);

export function buildLiveLlmT3Cases() {
  return LIVE_LLM_T3_RELEASE_CASES.map((testCase) => structuredClone(testCase));
}
