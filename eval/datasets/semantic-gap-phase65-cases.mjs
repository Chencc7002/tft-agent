export const PHASE65_SEMANTIC_GAP_DATASET_VERSION = "semantic-gap-phase65.v1";

const FAST9_PROMPTS = Object.freeze([
  "给我整三套当前能玩的九五",
  "这版本九五阵容咋选",
  "推荐几个95体系",
  "想玩速九，帮我挑阵容",
  "当前版本高费九五哪几套靠谱",
  "九五阵容来三套，按数据说",
  "现在上九以后玩什么阵容",
  "给个不绑定单一阵容的九五推荐",
  "95有哪些当前候选",
  "速九成型后阵容怎么选",
  "想冲九人口，推荐数据好的体系",
  "当前patch九五候选给我排一下",
  "九五不是一套固定阵容吧，推荐几个",
  "帮我从版本阵容里筛九五玩法",
  "推荐九五，但要看场次和吃分率",
  "九人口高费卡体系现在选哪几个",
  "别拍脑袋，按统计推荐九五",
  "九五阵容求推荐，给多个候选",
  "95玩法现在有哪些能上分",
  "速九阵容按当前数据挑三个"
]);

const EQUIVALENT_PROMPTS = Object.freeze([
  "霞现在三件套怎么给",
  "列一下当前阵容强度榜",
  "炼刀和巨九给霞选谁",
  "查霞的可用装备",
  "最近阵容趋势怎么排",
  "霞单件装备强度排名",
  "当前最强阵容列五个",
  "解释一下炼刀属性",
  "观星者羁绊效果",
  "霞出装推荐",
  "霞带巨九的数据",
  "阵容榜按吃分率排",
  "给我看霞的装备统计",
  "比较霞的两件输出装",
  "分析当前阵容榜",
  "查一查霞的详情",
  "现在什么阵容强",
  "霞装备榜给我",
  "最近哪些体系在涨",
  "霞最稳三件套"
]);

const LOW_CONFIDENCE_PROMPTS = Object.freeze([
  "那个给啥",
  "这套呢",
  "刚才那个怎么弄",
  "给他装上那个",
  "哪个好",
  "这版本它强不强",
  "上一个换掉行吗",
  "这俩呢",
  "那套还能玩吗",
  "它的三件套",
  "这张卡怎么配",
  "那个体系怎么选",
  "刚说的装备排一下",
  "这玩意适合谁",
  "帮我看看那个",
  "它俩比一下",
  "这套阵容的数据",
  "那个羁绊啥效果",
  "刚才的结论呢",
  "这件和那个哪个好"
]);

const ENTITY_CONFLICT_PROMPTS = Object.freeze([
  "我说的是霞，不是洛",
  "是炼刀，不是鬼索",
  "我要巨九，不是巨杀",
  "查逆羽，不是幻翎",
  "比较霞和洛，别合成一个人",
  "观星者不是星守",
  "九五不是赌狗",
  "速九和速八别混",
  "我要当前霞，不是旧赛季霞",
  "是装备炼刀，不是英雄",
  "巨九和巨杀是两件东西",
  "洛不是霞",
  "阵容名和羁绊名别串",
  "我输入的是九五，不是九人口单阵容",
  "比较两个候选，别替换实体",
  "只查霞这张卡",
  "锁定炼刀这个装备",
  "目标是观星者羁绊",
  "说的是95玩法概念",
  "别把逆羽解析成别的英雄"
]);

const NEW_CAPABILITY_PROMPTS = Object.freeze([
  "找霞的实战视频",
  "查某玩家最近十局",
  "预测明天版本胜率",
  "生成一张阵容海报",
  "帮我自动登录游戏",
  "替我购买通行证",
  "读取任意玩家数据库",
  "写入我的战绩备注",
  "删除缓存里的失败记录",
  "调用一个没有注册的工具",
  "抓取私人对局详情",
  "自动发消息给队友",
  "修改游戏客户端配置",
  "上传阵容到第三方网站",
  "控制鼠标帮我运营",
  "下载全部玩家资料",
  "执行一段任意脚本",
  "打开未授权数据源",
  "查询未接入的赛事录像",
  "调用写工具改阵容数据"
]);

const UNSUPPORTED_PROMPTS = Object.freeze([
  "17.4和现在的霞胜率差多少",
  "霞打洛的精确对位胜率",
  "只有一场也必须断言谁最强",
  "绕过限制导出玩家库",
  "查当前未接入的比赛录像",
  "给出没有样本的精确概率",
  "比较两个未接入历史版本",
  "搜索指定主播的最新视频",
  "查询陌生玩家隐藏战绩",
  "强制读取私有接口",
  "没有证据也直接给结论",
  "查十个版本前的阵容趋势",
  "分析未接入的双人对位",
  "导出全服玩家信息",
  "绕开权限查数据库",
  "给我一个无法验证的胜率",
  "找昨天上传的攻略视频",
  "读取本地游戏进程内存",
  "替我执行数据库更新",
  "调用任意网址上的工具"
]);

const GROUPS = Object.freeze([
  ["trusted_correction", FAST9_PROMPTS],
  ["equivalent", EQUIVALENT_PROMPTS],
  ["low_confidence", LOW_CONFIDENCE_PROMPTS],
  ["entity_conflict", ENTITY_CONFLICT_PROMPTS],
  ["new_capability", NEW_CAPABILITY_PROMPTS],
  ["low_confidence", UNSUPPORTED_PROMPTS]
]);

export function buildPhase65SemanticGapCases() {
  return GROUPS.flatMap(([expectedDifference, prompts], groupIndex) => (
    prompts.map((input, index) => ({
      id: `gap-${String(groupIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
      datasetVersion: PHASE65_SEMANTIC_GAP_DATASET_VERSION,
      input,
      expectedDifference
    }))
  ));
}

