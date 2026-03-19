import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";

const SPECIMENS = [
  {
    id: "thylacine",
    name: "袋狼",
    latin: "Thylacinus cynocephalus",
    extinctionYear: "1936 年",
    origin: "塔斯马尼亚 / 澳大利亚",
    anchor: { lat: -42.1, lon: 146.8 },
    tier: "近代样本",
    status: "基因拼接中",
    alert: "中度争议",
    revivalReason: "验证有袋类复活路径",
    habitatBadge: "灌丛与稀疏林地模拟",
    summary:
      "袋狼最适合当这颗地球上的第一批复活候选，因为它灭绝得够晚、样本够新，又带着一种演化错位感: 明明像狼，却来自完全不同的支线。",
    note:
      "真正棘手的不是把袋狼做出来，而是把它放回哪里。技术最容易吸引人，生态方案却永远最慢。",
    warning:
      "现存近缘代孕链条不稳定，幼体袋内发育阶段仍是整条实验链最脆弱的一环。",
    traits: ["夜行", "伏击捕食", "有袋类", "岛屿生态", "条纹皮毛"],
    colors: { body: 0xb68b5d, accent: 0x3d2d22, dark: 0x241c17, horn: 0xf0d8be },
    markerRotation: 0.2,
    viewerScale: 0.96,
    scores: [
      { label: "复活成功率", value: 78, tone: "amber" },
      { label: "基因完整度", value: 84, tone: "cyan" },
      { label: "生态位准备度", value: 61, tone: "olive" },
      { label: "行为失控风险", value: 42, tone: "red" },
    ],
    pipeline: [
      {
        name: "样本解封",
        detail: "从皮张、牙本质和酒精标本中提取高质量 DNA 片段，先把防腐剂噪声剥离出去。",
      },
      {
        name: "基因缺口缝补",
        detail: "用袋鼬等近缘有袋类对断裂位点进行定向补全，避免只拼出一副“像狼的外壳”。",
      },
      {
        name: "胚胎代理",
        detail: "建立多阶段代孕链路，先解决胚胎成活，再解决育幼袋阶段的持续发育。",
      },
      {
        name: "行为回灌",
        detail: "在封闭环境里重建猎食、巡游和夜间活动，不让复活个体只剩姿态没有本能。",
      },
    ],
    activeStage: "基因缺口缝补",
    anatomy: [
      { label: "头骨咬合", value: 82, note: "犬形外观稳定，但下颌肌群参数仍需修正。" },
      { label: "条纹皮毛", value: 91, note: "表型重现概率高，但也最容易造成“只是看起来像了”的幻觉。" },
      { label: "后肢步态", value: 68, note: "有袋类骨盆与负重方式让运动表现很难完全复原。" },
      { label: "幼体发育", value: 47, note: "真正的黑箱仍是育幼袋阶段。" },
    ],
    habitat: ["夜行", "稀疏林地", "干燥灌丛", "低密度领地", "伏击捕食", "封闭保护区优先"],
    reintroduction:
      "优先考虑封闭岛屿或大型围栏保护区，先验证夜行性、领地性和食谱是否与历史记录一致，再讨论更开放的回归。",
    ethics:
      "支持者把袋狼视为近代灭绝修复的象征；反对者担心它会占用本该投向现存濒危物种的资金与注意力。",
    proxies: [
      { name: "袋鼬", role: "近缘参考", note: "用于填补基因断口与评估有袋类代孕可行性。" },
      { name: "塔斯马尼亚恶魔", role: "行为参照", note: "帮助估算岛屿肉食性有袋类的竞争关系。" },
      { name: "灰狼", role: "生态对照", note: "只用于比较捕食位，不参与生殖链路。" },
    ],
    incidents: [
      {
        title: "夜间奔跑模型失真",
        time: "03:14",
        detail: "脊柱弹性参数过高，个体奔跑姿态更接近我们想象中的“狼”，而非真实袋狼。",
      },
      {
        title: "代孕窗口过短",
        time: "05:42",
        detail: "近缘母体激素曲线与目标胚胎发育节奏不匹配，排异概率飙升。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "猎杀、栖息地压缩、疾病争议" },
      { label: "公众印象", value: "最像“明天就能回来”的灭绝动物" },
      { label: "实验室评级", value: "A 级候选" },
      { label: "最大悖论", value: "复活技术比放归方案更容易想象" },
    ],
  },
  {
    id: "mammoth",
    name: "猛犸象",
    latin: "Mammuthus primigenius",
    extinctionYear: "约公元前 2000 年",
    origin: "欧亚北部 / 北美寒带",
    anchor: { lat: 67.5, lon: 100.0 },
    tier: "冰原巨型",
    status: "表型回推中",
    alert: "高资源占用",
    revivalReason: "气候工程与冻原恢复",
    habitatBadge: "苔原与寒原系统",
    summary:
      "猛犸象是这颗地球上最有神话感的复活项目。难点不只是基因，而是我们是否还拥有一片真正属于它的冰原。",
    note:
      "做出一头多毛大象和做回猛犸象不是同一件事。后者需要整套气候、食性与群体行为一起回来。",
    warning:
      "亚洲象代孕链路伦理阻力极高，任何一次失败都会在公共视野里被无限放大。",
    traits: ["冰原巨型", "迁徙群体", "耐寒毛层", "象牙防御", "高资源工程"],
    colors: { body: 0x6f5d49, accent: 0x2b231c, dark: 0x14100d, horn: 0xf2dec4 },
    markerRotation: -0.35,
    viewerScale: 1.02,
    scores: [
      { label: "复活成功率", value: 66, tone: "amber" },
      { label: "基因完整度", value: 76, tone: "cyan" },
      { label: "生态位准备度", value: 54, tone: "olive" },
      { label: "行为失控风险", value: 37, tone: "red" },
    ],
    pipeline: [
      {
        name: "冻土样本提取",
        detail: "从牙髓、骨骼和冻存软组织里筛选保存度最高的片段。",
      },
      {
        name: "亚洲象对位编辑",
        detail: "把耐寒脂肪、毛发和生理调温位点嵌入近缘基因组。",
      },
      {
        name: "胚胎放大",
        detail: "处理大型胎儿生长风险，避免中后期出现器官比例失衡。",
      },
      {
        name: "冰原行为训练",
        detail: "在群体环境里重建迁徙、挖雪与觅食，不只复制出一张古老皮毛。",
      },
    ],
    activeStage: "亚洲象对位编辑",
    anatomy: [
      { label: "耐寒毛层", value: 88, note: "表层毛发容易模拟，真正关键的是底层隔热结构。" },
      { label: "脂肪分布", value: 73, note: "脂肪组织决定寒冷适应，而不只是好看的毛发。" },
      { label: "象牙弯曲", value: 79, note: "几何形态可重建，但磨损方式仍需长期观察。" },
      { label: "群体行为", value: 49, note: "没有猛犸母群，幼体很难学会怎样“成为猛犸”。" },
    ],
    habitat: ["寒原", "厚积雪", "低矮植被", "群居迁徙", "大型食草", "封闭气候区"],
    reintroduction:
      "较现实的路径是高纬封闭实验区，用踩踏和取食行为测试冻原恢复效果，而不是立刻把它投回野外。",
    ethics:
      "支持者把它当成气候修复工程旗舰；反对者认为我们可能只是在制造一种只能活在围栏里的巨型奇观动物。",
    proxies: [
      { name: "亚洲象", role: "基因与代孕核心", note: "现存亲缘最近，也带来最大的伦理压力。" },
      { name: "麝牛", role: "寒地行为对照", note: "用于参考寒带群居草食动物的聚集策略。" },
      { name: "驯鹿", role: "迁徙生态参照", note: "估算大型食草动物对冻原植被的压力。" },
    ],
    incidents: [
      {
        title: "毛层模型过热",
        time: "08:05",
        detail: "试验表型散热曲线异常，说明当前设计仍停留在视觉复原层面。",
      },
      {
        title: "巨胎风险红线",
        time: "11:18",
        detail: "后期生长过快，母体安全阈值不足以支撑连续实验。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "气候变化与人类压力叠加" },
      { label: "公众印象", value: "复活项目里的超级明星" },
      { label: "实验室评级", value: "A- 级候选" },
      { label: "最大悖论", value: "最壮观，也最像大型工程秀" },
    ],
  },
  {
    id: "dodo",
    name: "渡渡鸟",
    latin: "Raphus cucullatus",
    extinctionYear: "17 世纪末",
    origin: "毛里求斯",
    anchor: { lat: -20.2, lon: 57.5 },
    tier: "岛屿回响",
    status: "生态重演中",
    alert: "公众误判高",
    revivalReason: "岛屿生态修复示范",
    habitatBadge: "岛屿无天敌系统",
    summary:
      "渡渡鸟不是笑话，它只是太容易被画成笑话。越适合传播的物种，越容易在复活叙事里被做成吉祥物。",
    note:
      "真正的问题不是技术，而是我们会不会又把它放回一个被老鼠、猪与人类彻底改变过的岛屿。",
    warning:
      "过度拟人化传播正在抬升项目风险，公众正在把它想成温顺、笨拙、可爱的固定角色。",
    traits: ["岛屿鸟类", "地面筑巢", "低速扩散", "高传播性", "无大型天敌"],
    colors: { body: 0xd4d1c8, accent: 0x7384a8, dark: 0x2a2927, horn: 0xe3bd72 },
    markerRotation: 0.15,
    viewerScale: 0.9,
    scores: [
      { label: "复活成功率", value: 74, tone: "amber" },
      { label: "基因完整度", value: 69, tone: "cyan" },
      { label: "生态位准备度", value: 72, tone: "olive" },
      { label: "行为失控风险", value: 19, tone: "red" },
    ],
    pipeline: [
      {
        name: "骨骼与近缘校对",
        detail: "结合骨架、图像记录和近缘鸠鸽类，重建姿态与肌群。",
      },
      {
        name: "羽毛与喙型回推",
        detail: "把夸张化的历史图像剥离出去，先纠正我们脑中的卡通版本。",
      },
      {
        name: "繁殖地搭建",
        detail: "恢复地面筑巢安全区，再讨论群体繁殖行为。",
      },
      {
        name: "入侵种清场",
        detail: "没有这一环，复活本身没有意义。",
      },
    ],
    activeStage: "入侵种清场",
    anatomy: [
      { label: "喙部结构", value: 77, note: "图像记录丰富，但夸张画法会误导比例。" },
      { label: "步态重建", value: 83, note: "通过骨架与肌群模型可得到相对稳定结果。" },
      { label: "繁殖行为", value: 58, note: "历史记录零散，巢位选择仍有大量空白。" },
      { label: "天敌应对", value: 36, note: "缺乏天敌记忆的岛屿鸟类对现代风险极其脆弱。" },
    ],
    habitat: ["海岛林地", "地面筑巢", "果实摄食", "无大型天敌", "高雏鸟风险", "入侵种清理"],
    reintroduction:
      "必须与岛屿入侵物种清除工程同步推进。没有食物网和繁殖安全区，任何放归都只是短命奇迹。",
    ethics:
      "它最适合做公众教育，但也因此最容易被商业包装。实验室内部对是否允许公开展出始终分歧严重。",
    proxies: [
      { name: "尼科巴鸠鸽", role: "近缘参照", note: "帮助校准羽毛、头骨和姿态细节。" },
      { name: "陆龟", role: "种子传播对照", note: "估算渡渡鸟在岛屿植物传播中的潜在作用。" },
      { name: "野猪", role: "风险对照", note: "模拟入侵哺乳动物对巢位的破坏强度。" },
    ],
    incidents: [
      {
        title: "历史图像偏差",
        time: "07:03",
        detail: "多幅流传最广的形象被判定含有过度喂养状态，体态模型因此整体修瘦。",
      },
      {
        title: "巢位安全崩溃",
        time: "09:57",
        detail: "模拟显示只要保留少量入侵鼠类，雏鸟存活率就会迅速跌破阈值。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "航海时代猎杀与入侵物种" },
      { label: "公众印象", value: "最有名的“消失笑话”" },
      { label: "实验室评级", value: "A 级候选" },
      { label: "最大悖论", value: "最适合传播，也最容易被误读" },
    ],
  },
  {
    id: "quagga",
    name: "斑驴",
    latin: "Equus quagga quagga",
    extinctionYear: "1883 年",
    origin: "南非草原",
    anchor: { lat: -29.0, lon: 24.0 },
    tier: "表型争议",
    status: "表型纠偏中",
    alert: "定义争议",
    revivalReason: "检验表型回推极限",
    habitatBadge: "半干旱草原系统",
    summary:
      "斑驴站在“复活”和“回推”的模糊边界上。你到底是在复活一个灭绝亚种，还是造出一只看起来很像它的新斑马？",
    note:
      "它越容易成功，越容易遭遇质疑。最难的部分不是做出条纹，而是回答“这算不算真的回来”。",
    warning:
      "项目最脆弱处不是生物学，而是定义学。一旦命名失守，整条实验线都会被嘲讽成高端选育。",
    traits: ["草原群居", "高移动性", "表型回推", "条纹争议", "定义难题"],
    colors: { body: 0x7b5d3f, accent: 0x1f1915, dark: 0x120e0b, horn: 0xe6cfb0 },
    markerRotation: -0.25,
    viewerScale: 0.95,
    scores: [
      { label: "复活成功率", value: 82, tone: "amber" },
      { label: "基因完整度", value: 88, tone: "cyan" },
      { label: "生态位准备度", value: 79, tone: "olive" },
      { label: "行为失控风险", value: 23, tone: "red" },
    ],
    pipeline: [
      {
        name: "表型记录清洗",
        detail: "排除标本褪色和图像风格造成的假差异。",
      },
      {
        name: "近缘群体回选",
        detail: "从现存平原斑马中筛选更接近历史条纹分布的个体。",
      },
      {
        name: "基因编辑验证",
        detail: "对色素和条纹边界位点做精细校准，避免只是“看上去对了”。",
      },
      {
        name: "定义审查",
        detail: "确保项目不是视觉欺骗，而是有清晰遗传学依据的回推。",
      },
    ],
    activeStage: "基因编辑验证",
    anatomy: [
      { label: "条纹前躯", value: 92, note: "最具辨识度，也最容易成为误导性的成功指标。" },
      { label: "后躯褐色", value: 86, note: "颜色层次相对可控。" },
      { label: "群体行为", value: 81, note: "可直接参考现存斑马。" },
      { label: "分类清晰度", value: 41, note: "越成功，争议越大。" },
    ],
    habitat: ["草原", "群居", "高移动性", "食草", "开阔视野", "现代保护区可承接"],
    reintroduction:
      "如果定义上得到共识，它最容易回到现代保护区，因为草原载体仍在，行为模板也能从现存斑马群体中部分借用。",
    ethics:
      "核心争议不在风险，而在命名权。科学界与公众对“这算不算真正回来”可能永远不会完全一致。",
    proxies: [
      { name: "平原斑马", role: "主要近缘", note: "基因与行为基础都依赖它。" },
      { name: "野马", role: "体态对照", note: "用于校正躯干比例和奔跑表现。" },
      { name: "角马", role: "草原共居物种", note: "评估回归后的群体竞争关系。" },
    ],
    incidents: [
      {
        title: "条纹过度成功",
        time: "02:46",
        detail: "公众评审过早把项目当作“已复活”，迫使团队提前发布分类说明。",
      },
      {
        title: "命名争议升级",
        time: "06:28",
        detail: "多位外部顾问要求把项目从“复活”改称为“回推表型计划”。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "殖民时代猎杀与竞争" },
      { label: "公众印象", value: "像半只斑马被擦掉了后半身" },
      { label: "实验室评级", value: "S- 级候选" },
      { label: "最大悖论", value: "越容易成功，越容易被说不算" },
    ],
  },
  {
    id: "moa",
    name: "恐鸟",
    latin: "Dinornithiformes",
    extinctionYear: "15 世纪",
    origin: "新西兰",
    anchor: { lat: -43.8, lon: 170.5 },
    tier: "巨体地栖",
    status: "骨架映射中",
    alert: "表型未知区大",
    revivalReason: "地栖巨鸟生态实验",
    habitatBadge: "无大型哺乳动物岛屿",
    summary:
      "恐鸟像岛屿进化最后的一次夸张冲刺。它巨大、安静、无翼，也因此最容易被我们误写成一只来自史前的神话巨鸟。",
    note:
      "越想把恐鸟做得震撼，越要警惕自己是在用几根骨头补写幻想，而不是重建一个真实物种。",
    warning:
      "骨架足够戏剧化，但软组织、羽毛、叫声和社会行为几乎都带着巨大盲区。",
    traits: ["巨型地栖", "长腿承重", "岛屿演化", "羽毛盲区", "围栏风险"],
    colors: { body: 0x86755c, accent: 0x42382d, dark: 0x1c1714, horn: 0xe3c99d },
    markerRotation: 0.28,
    viewerScale: 1.06,
    scores: [
      { label: "复活成功率", value: 58, tone: "amber" },
      { label: "基因完整度", value: 63, tone: "cyan" },
      { label: "生态位准备度", value: 57, tone: "olive" },
      { label: "行为失控风险", value: 33, tone: "red" },
    ],
    pipeline: [
      {
        name: "亚类分型",
        detail: "不同体型与谱系的恐鸟需要先拆分，不存在单一标准模板。",
      },
      {
        name: "骨盆与长腿映射",
        detail: "校准承重与步频，避免生成一副骨架正确、行动错误的庞大躯体。",
      },
      {
        name: "羽毛复原",
        detail: "通过蛋壳、微结构和近缘鸟类线索推测覆盖方式。",
      },
      {
        name: "围栏压力测试",
        detail: "评估巨型鸟类与现代植被、人类设施和地面巢位的冲突强度。",
      },
    ],
    activeStage: "骨盆与长腿映射",
    anatomy: [
      { label: "腿骨承重", value: 74, note: "骨架信息强，但肌腱和步态仍不稳定。" },
      { label: "躯干体量", value: 62, note: "体量容易做大，难的是做对。" },
      { label: "羽毛覆盖", value: 48, note: "视觉复原极易滑向戏剧化幻想。" },
      { label: "叫声与社交", value: 34, note: "几乎是彻底黑区。" },
    ],
    habitat: ["岛屿森林", "高大植食", "地面筑巢", "超大体型", "现代冲突高", "隔离区优先"],
    reintroduction:
      "必须在高度隔离生态区内进行，因为现代新西兰已不是它离开时的那个世界，冲突面会远大于渡渡鸟。",
    ethics:
      "支持者认为巨型鸟类回归能重建独特生态功能；反对者担心现代环境无法承受一个近乎陌生的大型植食动物。",
    proxies: [
      { name: "几维鸟", role: "远缘行为参照", note: "只能提供极少量鸟类生态信息。" },
      { name: "食火鸡", role: "体态对照", note: "帮助估算大型地栖鸟的环境冲击。" },
      { name: "鸸鹋", role: "运动学对照", note: "模拟长腿高速移动的稳定区间。" },
    ],
    incidents: [
      {
        title: "高度估算漂移",
        time: "01:32",
        detail: "两版体高模型相差近 20%，公众熟悉的“巨型恐鸟”图像并不可靠。",
      },
      {
        title: "围栏碰撞警报",
        time: "10:44",
        detail: "模拟显示受惊状态下对设施破坏值极高，现有围栏标准不足。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "人类抵达后的集中猎杀" },
      { label: "公众印象", value: "像从史前误入现代的巨大鸟影" },
      { label: "实验室评级", value: "B 级候选" },
      { label: "最大悖论", value: "越神秘，越容易被想象绑架" },
    ],
  },
  {
    id: "aurochs",
    name: "原牛",
    latin: "Bos primigenius",
    extinctionYear: "1627 年",
    origin: "欧洲 / 西亚 / 北非",
    anchor: { lat: 51.6, lon: 19.2 },
    tier: "祖先回归",
    status: "野性参数重构中",
    alert: "设施冲撞风险",
    revivalReason: "重建大型草食者扰动",
    habitatBadge: "温带林缘草地",
    summary:
      "原牛不像猛犸那样梦幻，它更像一头你真有可能在围栏里遇到的危险祖先。越接近成功，它就越不该像家牛那样温顺。",
    note:
      "最难的不是把它做大、把角做长，而是把被驯化历史磨平的野性重新找回来。",
    warning:
      "一旦行为驯化退场，项目会迅速从复活工程变成围栏工程与公共安全工程。",
    traits: ["祖先回归", "大型食草", "围栏冲撞", "林缘草地", "野性恢复"],
    colors: { body: 0x47372b, accent: 0x16120f, dark: 0x090706, horn: 0xefd7b0 },
    markerRotation: -0.1,
    viewerScale: 0.98,
    scores: [
      { label: "复活成功率", value: 71, tone: "amber" },
      { label: "基因完整度", value: 81, tone: "cyan" },
      { label: "生态位准备度", value: 77, tone: "olive" },
      { label: "行为失控风险", value: 64, tone: "red" },
    ],
    pipeline: [
      {
        name: "古 DNA 对照",
        detail: "从骨骼里提取祖先片段，与现代牛种进行大范围比对。",
      },
      {
        name: "育种与编辑混合",
        detail: "同时结合表型回推和精准编辑，减少“只是像外形”的风险。",
      },
      {
        name: "角与骨架强化",
        detail: "验证大型头部结构是否连带改变颈椎与肩部负荷。",
      },
      {
        name: "野性压力测试",
        detail: "评估个体对围栏、噪声和人类接近的应激与攻击性。",
      },
    ],
    activeStage: "野性压力测试",
    anatomy: [
      { label: "体高与肩峰", value: 84, note: "可通过古骨骼相对稳定校准。" },
      { label: "角型与角鞘", value: 79, note: "外观可重建，但撞击行为不确定。" },
      { label: "繁殖稳定", value: 86, note: "近缘资源丰富，链路相对成熟。" },
      { label: "野性恢复", value: 52, note: "行为不会自动从外形里长出来。" },
    ],
    habitat: ["林缘草地", "大型食草", "季节迁移", "冲撞能力强", "群体结构明显", "与农业冲突高"],
    reintroduction:
      "它最可能用于大型再野化项目，但这也意味着必须处理与农业、游客、道路系统的持续冲突。",
    ethics:
      "支持者强调原牛回归能恢复林缘草地动态；反对者提醒我们可能只是把一种更难管理的大型牲畜送回现代乡村。",
    proxies: [
      { name: "高地牛", role: "体态对照", note: "估算大型牛形体在现代气候下的表现。" },
      { name: "欧洲野牛", role: "行为参照", note: "参考大型野牛类对围栏与游客的反应。" },
      { name: "斗牛品系", role: "风险对照", note: "估计攻击性阈值，但不直接参与回推。" },
    ],
    incidents: [
      {
        title: "围栏冲撞超标",
        time: "04:11",
        detail: "模拟个体在惊吓状态下的冲撞力超出现有再野化设施建议值。",
      },
      {
        title: "过度家畜化残留",
        time: "12:03",
        detail: "早期样本对人类接近容忍度过高，被判定更像“怪异家牛”而非原牛。",
      },
    ],
    facts: [
      { label: "灭绝诱因", value: "狩猎、栖息地缩减与驯化替代" },
      { label: "公众印象", value: "牛祖宗，但不该被温顺想象" },
      { label: "实验室评级", value: "A- 级候选" },
      { label: "最大悖论", value: "越像原牛，越不适合普通展示" },
    ],
  },
];

const GENERATED_GROUP_PROFILES = {
  avian: {
    tier: "鸟类回响",
    status: "羽层复算中",
    alert: "巢位脆弱",
    habitatBadge: "岛屿与迁飞鸟类系统",
    reasonLabel: "种子传播与警戒声场",
    anatomy: [
      ["喙部结构", "取食界面容易推断，但真正关键的是细小比例。"] ,
      ["羽层覆盖", "颜色不是最难的，最难的是覆盖方式与季节变化。"] ,
      ["巢位行为", "巢位一旦失去保护，复活只会重演旧结局。"] ,
      ["雏鸟成活", "幼鸟阶段仍是整条链路里最脆弱的一环。"],
    ],
    pipeline: ["骨架校对", "羽层回推", "繁殖地搭建", "放归声场模拟"],
    proxies: [
      ["生态对照", "帮助估算岛屿或迁飞鸟类的空间占位。"] ,
      ["行为参照", "用于回填繁殖、巡游与群体警戒动作。"],
    ],
    baseScores: [67, 72, 64, 26],
    modelFamily: "bird",
    viewerScale: 0.9,
  },
  mammal: {
    tier: "陆地缺位",
    status: "骨架拼装中",
    alert: "围栏风险",
    habitatBadge: "陆地食物网回归",
    reasonLabel: "大型陆地食物网接口",
    anatomy: [
      ["骨架比例", "大体型个体最容易在负重与步态环节露出破绽。"] ,
      ["表皮与毛层", "视觉最容易先成功，但也最容易停留在视觉层。"] ,
      ["行为模板", "没有成体示范，幼体很难学会怎样成为它自己。"] ,
      ["繁殖链路", "代孕与早期成活率仍是复活工程的基本门槛。"],
    ],
    pipeline: ["古 DNA 清洗", "近缘缺口补写", "胚胎代理", "放归行为压测"],
    proxies: [
      ["生态对照", "用于估算它回归后的竞争和扰动范围。"] ,
      ["行为参照", "帮助实验室校准奔跑、觅食和警戒模板。"],
    ],
    baseScores: [63, 70, 62, 38],
    modelFamily: "mammal",
    viewerScale: 0.98,
  },
  marine: {
    tier: "海域消失者",
    status: "水下重演中",
    alert: "食物网空洞",
    habitatBadge: "近海与寒海系统",
    reasonLabel: "海域食物网与迁游链",
    anatomy: [
      ["流线体型", "表面轮廓容易恢复，真正难的是水下效率。"] ,
      ["脂层与皮层", "保温结构决定它能否在现代海域稳定活动。"] ,
      ["群游行为", "海洋个体没有群体模板时会迅速失去方向。"] ,
      ["捕食接口", "食谱变化会直接改写整片海域的反馈。"],
    ],
    pipeline: ["样本封存解码", "体表结构拟合", "水槽行为训练", "海湾回归模拟"],
    proxies: [
      ["生态对照", "帮助评估近海浮游与海草系统的恢复张力。"] ,
      ["行为参照", "用于补足群游和换气节奏的水下模板。"],
    ],
    baseScores: [58, 66, 60, 29],
    modelFamily: "marine",
    viewerScale: 0.96,
  },
  reptile: {
    tier: "爬行断层",
    status: "角质层映射中",
    alert: "温度窗口敏感",
    habitatBadge: "岛屿与湿地爬行系统",
    reasonLabel: "岛屿控制与湿地扰动",
    anatomy: [
      ["鳞甲结构", "鳞甲图案能回来，但保温和磨损未必同步。"] ,
      ["四肢与尾部", "支撑点一旦失真，整体动作会立刻显得不对。"] ,
      ["温度适应", "现代温湿条件未必还容得下旧有节奏。"] ,
      ["巢位与孵化", "高温或病原波动都会让孵化链条崩掉。"],
    ],
    pipeline: ["标本剥噪", "角质层回写", "温箱孵化", "岛屿围栏压测"],
    proxies: [
      ["生态对照", "用于推演回归后对植被和地表猎物的压力。"] ,
      ["行为参照", "帮助校准伏击、巡游和晒背节奏。"],
    ],
    baseScores: [55, 62, 57, 33],
    modelFamily: "reptile",
    viewerScale: 0.94,
  },
  amphibian: {
    tier: "湿地断层",
    status: "微环境复建中",
    alert: "病原极敏",
    habitatBadge: "云雾林与溪流微气候",
    reasonLabel: "微湿地和昆虫调节链",
    anatomy: [
      ["皮肤透水", "看上去最薄弱的部分，往往也是最关键的器官。"] ,
      ["微环境依赖", "温度、湿度和真菌风险必须一起被控制。"] ,
      ["繁殖窗口", "少一段雨季节奏，整条链就会断掉。"] ,
      ["病原抵抗", "旧环境消失后，现代病原会成为最大阻力。"],
    ],
    pipeline: ["组织剥离", "微环境复建", "孵化链调试", "溪流回放模拟"],
    proxies: [
      ["生态对照", "帮助评估昆虫波动和水体反馈。"] ,
      ["行为参照", "用于拟合鸣叫、伏藏与繁殖窗口。"],
    ],
    baseScores: [49, 58, 46, 24],
    modelFamily: "amphibian",
    viewerScale: 0.82,
  },
};

const GENERATED_COLOR_PALETTES = {
  bird: [
    { body: 0xcfd7de, accent: 0x748295, dark: 0x2f3846, horn: 0xf0c98d },
    { body: 0xe2d6c8, accent: 0x8c7257, dark: 0x33261d, horn: 0xe8be74 },
    { body: 0xd3d1e4, accent: 0x7181a7, dark: 0x2c3242, horn: 0xf1ca84 },
  ],
  mammal: [
    { body: 0x9d866b, accent: 0x5b4534, dark: 0x271d16, horn: 0xe6cfb0 },
    { body: 0x8d745f, accent: 0x48392d, dark: 0x1a130f, horn: 0xddc5a7 },
    { body: 0xb0a08e, accent: 0x66584d, dark: 0x2e2722, horn: 0xf0d7bc },
  ],
  marine: [
    { body: 0x8ea2b2, accent: 0x4e6677, dark: 0x1f2f3f, horn: 0xdfe6ed },
    { body: 0x7b95a8, accent: 0x456274, dark: 0x1b2e3d, horn: 0xd7e2eb },
    { body: 0x9db3c0, accent: 0x577283, dark: 0x263443, horn: 0xe6edf2 },
  ],
  reptile: [
    { body: 0x8d9672, accent: 0x5a6547, dark: 0x293021, horn: 0xd9d1a7 },
    { body: 0xa0ab85, accent: 0x697456, dark: 0x333a2b, horn: 0xe1dab2 },
    { body: 0x8b977f, accent: 0x5f6b55, dark: 0x2b3124, horn: 0xd7d1ae },
  ],
  amphibian: [
    { body: 0xb6c79f, accent: 0x6d8156, dark: 0x31402a, horn: 0xe4eab7 },
    { body: 0xa5c0a6, accent: 0x648565, dark: 0x2c4331, horn: 0xdce7c0 },
    { body: 0xc6cf8d, accent: 0x7a8750, dark: 0x3a4126, horn: 0xecefbb },
  ],
};

const EXTRA_SPECIMEN_SEEDS = [
  { id: "great-auk", name: "大海雀", latin: "Pinguinus impennis", extinctionYear: "1844 年", origin: "北大西洋 / 冰岛", anchor: { lat: 64.9, lon: -22.6 }, group: "avian", traits: ["寒海潜鸟", "群栖繁殖", "海崖巢位"], cause: "过度捕猎与标本采集", reason: "补回寒海海鸟链", proxy: "海雀" },
  { id: "passenger-pigeon", name: "旅鸽", latin: "Ectopistes migratorius", extinctionYear: "1914 年", origin: "北美东部", anchor: { lat: 39.9, lon: -84.5 }, group: "avian", traits: ["超大群飞", "森林取食", "远距离迁飞"], cause: "商业捕猎与栖息地砍伐", reason: "重建群飞扰动层", proxy: "斑尾林鸽" },
  { id: "carolina-parakeet", name: "卡罗莱纳长尾鹦鹉", latin: "Conuropsis carolinensis", extinctionYear: "1918 年", origin: "美国东南部", anchor: { lat: 33.7, lon: -84.4 }, group: "avian", traits: ["果林群栖", "高噪声群叫", "河谷活动"], cause: "森林清理与猎杀", reason: "恢复亚热带果林传播", proxy: "锥尾鹦鹉" },
  { id: "heath-hen", name: "石南松鸡", latin: "Tympanuchus cupido cupido", extinctionYear: "1932 年", origin: "马萨诸塞沿海", anchor: { lat: 41.4, lon: -70.6 }, group: "avian", traits: ["草地求偶", "地面筑巢", "低空短飞"], cause: "栖息地破碎与火灾", reason: "恢复海岸草地求偶场", proxy: "草原松鸡" },
  { id: "labrador-duck", name: "拉布拉多鸭", latin: "Camptorhynchus labradorius", extinctionYear: "19 世纪末", origin: "加拿大东岸", anchor: { lat: 53.1, lon: -60.4 }, group: "avian", traits: ["寒海潜食", "沿岸越冬", "甲壳类取食"], cause: "海岸开发与采集压力", reason: "补回寒海岸线取食位", proxy: "绒鸭" },
  { id: "dusky-seaside-sparrow", name: "暗色海滨雀", latin: "Ammodramus maritimus nigrescens", extinctionYear: "1987 年", origin: "佛罗里达海岸", anchor: { lat: 28.5, lon: -80.7 }, group: "avian", traits: ["盐沼潜伏", "低矮灌丛", "地面巢位"], cause: "盐沼排水与农药", reason: "修复盐沼鸣禽层", proxy: "海滨雀" },
  { id: "laughing-owl", name: "笑鸮", latin: "Sceloglaux albifacies", extinctionYear: "20 世纪初", origin: "新西兰南岛", anchor: { lat: -45.0, lon: 170.5 }, group: "avian", traits: ["夜行伏击", "地面活动", "洞穴栖居"], cause: "捕食者引入与猎杀", reason: "重建岛屿夜行鸟位", proxy: "鹰鸮" },
  { id: "huia", name: "垂耳鸦", latin: "Heteralocha acutirostris", extinctionYear: "1907 年", origin: "新西兰北岛", anchor: { lat: -39.3, lon: 175.6 }, group: "avian", traits: ["林冠取食", "两性喙差", "夫妻协作"], cause: "羽饰贸易与森林清理", reason: "恢复林冠取食接口", proxy: "钟鹊" },
  { id: "stephens-island-wren", name: "斯蒂芬岛异鹪鹩", latin: "Traversia lyalli", extinctionYear: "1890 年代", origin: "斯蒂芬岛 / 新西兰", anchor: { lat: -40.67, lon: 174.0 }, group: "avian", traits: ["岛屿小型鸟", "近地层活动", "短距离跳飞"], cause: "外来捕食者引入", reason: "补回近地层虫食位", proxy: "鹪鹩" },
  { id: "broad-billed-parrot", name: "宽嘴鹦鹉", latin: "Lophopsittacus mauritianus", extinctionYear: "17 世纪", origin: "毛里求斯", anchor: { lat: -20.2, lon: 57.5 }, group: "avian", traits: ["岛屿鹦鹉", "硬果开壳", "古林取食"], cause: "人类登陆与森林破坏", reason: "恢复古林硬果传播", proxy: "鹦哥" },
  { id: "rodrigues-solitaire", name: "罗德里格斯孤鸽", latin: "Pezophaps solitaria", extinctionYear: "18 世纪", origin: "罗德里格斯岛", anchor: { lat: -19.7, lon: 63.4 }, group: "avian", traits: ["岛屿地栖", "性别体型差", "开阔林缘"], cause: "捕猎与外来动物", reason: "重建孤岛地栖鸟位", proxy: "鸠鸽" },
  { id: "elephant-bird", name: "象鸟", latin: "Aepyornis maximus", extinctionYear: "17 世纪", origin: "马达加斯加", anchor: { lat: -19.9, lon: 46.8 }, group: "avian", traits: ["巨型地栖", "超大鸟蛋", "低地林缘"], cause: "猎杀与栖息地缩减", reason: "测试巨型鸟类生态位", proxy: "鸵鸟" },
  { id: "reunion-ibis", name: "留尼汪朱鹭", latin: "Threskiornis solitarius", extinctionYear: "18 世纪", origin: "留尼汪岛", anchor: { lat: -21.1, lon: 55.5 }, group: "avian", traits: ["湿地涉禽", "火山岛迁移", "浅滩觅食"], cause: "人类开发与捕猎", reason: "补回火山岛湿地涉禽层", proxy: "朱鹭" },
  { id: "moa-nalo", name: "恐雁", latin: "Moa-nalo", extinctionYear: "约 1000 年前", origin: "夏威夷群岛", anchor: { lat: 21.3, lon: -157.8 }, group: "avian", traits: ["大型植食鸟", "岛屿灌丛", "无飞行能力"], cause: "人类到来后猎杀", reason: "恢复岛屿植食空位", proxy: "雁鸭类" },
  { id: "kauai-oo", name: "考艾吸蜜鸟", latin: "Moho braccatus", extinctionYear: "1987 年", origin: "考艾岛", anchor: { lat: 22.1, lon: -159.5 }, group: "avian", traits: ["花蜜取食", "高冠层鸣叫", "林谷活动"], cause: "疾病传播与栖息地变化", reason: "修补花蜜传粉链", proxy: "吸蜜鸟" },
  { id: "hoopoe-starling", name: "戴冠椋鸟", latin: "Fregilupus varius", extinctionYear: "1850 年代", origin: "留尼汪岛", anchor: { lat: -21.1, lon: 55.5 }, group: "avian", traits: ["林缘群居", "杂食取食", "高适应鸣禽"], cause: "猎捕与森林改变", reason: "恢复岛屿杂食鸟层", proxy: "椋鸟" },
  { id: "cuban-macaw", name: "古巴红鹦鹉", latin: "Ara tricolor", extinctionYear: "19 世纪", origin: "古巴", anchor: { lat: 22.0, lon: -79.5 }, group: "avian", traits: ["热带鹦鹉", "果核散播", "林缘群飞"], cause: "贸易捕捉与森林损失", reason: "恢复加勒比种子散播", proxy: "金刚鹦鹉" },
  { id: "imperial-woodpecker", name: "帝啄木鸟", latin: "Campephilus imperialis", extinctionYear: "20 世纪中期", origin: "墨西哥西马德雷山脉", anchor: { lat: 27.2, lon: -106.5 }, group: "avian", traits: ["巨型林栖", "啄木取食", "老龄林依赖"], cause: "森林砍伐与猎杀", reason: "重建老龄林虫食层", proxy: "黑啄木鸟" },
  { id: "poouli", name: "普奥利鸟", latin: "Melamprosops phaeosoma", extinctionYear: "2004 年", origin: "毛伊岛", anchor: { lat: 20.8, lon: -156.3 }, group: "avian", traits: ["高山雨林", "稀有鸣禽", "蜗牛取食"], cause: "疾病与外来捕食者", reason: "修复高山雨林微网", proxy: "蜜雀" },
  { id: "alaotra-grebe", name: "阿劳特拉鸊鷉", latin: "Tachybaptus rufolavatus", extinctionYear: "2010 年前后", origin: "马达加斯加阿劳特拉湖", anchor: { lat: -17.5, lon: 48.5 }, group: "avian", traits: ["湖泊潜鸟", "芦苇湿地", "低飞短迁"], cause: "渔网缠绕与外来鱼", reason: "恢复湖泊潜食环节", proxy: "小鸊鷉" },
  { id: "stellers-sea-cow", name: "斯特勒海牛", latin: "Hydrodamalis gigas", extinctionYear: "1768 年", origin: "科曼多尔群岛", anchor: { lat: 55.0, lon: 166.0 }, group: "marine", traits: ["冷海巨体", "海草取食", "近岸缓游"], cause: "过度捕猎", reason: "恢复寒海海草啃食链", proxy: "儒艮" },
  { id: "sea-mink", name: "海貂", latin: "Neogale macrodon", extinctionYear: "1880 年前后", origin: "缅因湾海岸", anchor: { lat: 44.8, lon: -67.0 }, group: "mammal", traits: ["海岸捕食", "岩岸洞穴", "夜行巡游"], cause: "毛皮猎杀", reason: "补回岩岸小型捕食位", proxy: "美洲水貂" },
  { id: "japanese-sea-lion", name: "日本海狮", latin: "Zalophus japonicus", extinctionYear: "1970 年代", origin: "日本海 / 朝鲜半岛沿岸", anchor: { lat: 35.4, lon: 139.8 }, group: "marine", traits: ["沿岸群游", "礁岩上岸", "鱼群追猎"], cause: "渔业冲突与猎捕", reason: "重建近海顶级摄食层", proxy: "加州海狮" },
  { id: "caribbean-monk-seal", name: "加勒比僧海豹", latin: "Neomonachus tropicalis", extinctionYear: "20 世纪中叶", origin: "加勒比海", anchor: { lat: 21.5, lon: -79.5 }, group: "marine", traits: ["珊瑚海域", "沙滩上岸", "浅海巡游"], cause: "猎杀与旅游开发", reason: "恢复热海海豹位", proxy: "夏威夷僧海豹" },
  { id: "falkland-wolf", name: "福克兰狼", latin: "Dusicyon australis", extinctionYear: "1876 年", origin: "福克兰群岛", anchor: { lat: -51.7, lon: -59.0 }, group: "mammal", traits: ["岛屿犬科", "海岸巡游", "低密度捕食"], cause: "殖民猎杀", reason: "恢复岛屿犬科占位", proxy: "鬃狼" },
  { id: "bluebuck", name: "蓝马羚", latin: "Hippotragus leucophaeus", extinctionYear: "约 1800 年", origin: "南非开普", anchor: { lat: -34.0, lon: 19.6 }, group: "mammal", traits: ["草原羚羊", "开阔迁移", "群体警戒"], cause: "殖民猎杀与牧场挤压", reason: "补回开普草地食草层", proxy: "黑斑羚" },
  { id: "pyrenean-ibex", name: "比利牛斯野山羊", latin: "Capra pyrenaica pyrenaica", extinctionYear: "2000 年", origin: "比利牛斯山", anchor: { lat: 42.6, lon: -0.2 }, group: "mammal", traits: ["山地攀援", "高坡取食", "角争斗"], cause: "过度狩猎与种群缩小", reason: "修补山地草灌层", proxy: "西班牙野山羊" },
  { id: "western-black-rhino", name: "西部黑犀牛", latin: "Diceros bicornis longipes", extinctionYear: "2011 年宣告灭绝", origin: "中非草灌地", anchor: { lat: 11.4, lon: 16.2 }, group: "mammal", traits: ["大型草食", "灌丛开道", "低密度领地"], cause: "偷猎与保护崩塌", reason: "重建大型食草扰动", proxy: "黑犀牛" },
  { id: "schomburgks-deer", name: "熊氏鹿", latin: "Rucervus schomburgki", extinctionYear: "1938 年", origin: "泰国中部平原", anchor: { lat: 14.0, lon: 100.6 }, group: "mammal", traits: ["季节草地", "湿地边缘", "角型夸张"], cause: "湿地改造与猎杀", reason: "恢复平原湿地食草层", proxy: "泽鹿" },
  { id: "syrian-wild-ass", name: "叙利亚野驴", latin: "Equus hemionus hemippus", extinctionYear: "1927 年", origin: "叙利亚荒原", anchor: { lat: 33.5, lon: 38.3 }, group: "mammal", traits: ["荒漠奔行", "高温耐受", "稀疏草食"], cause: "猎杀与战争压力", reason: "补回荒原食草速度层", proxy: "亚洲野驴" },
  { id: "tarpan", name: "塔潘野马", latin: "Equus ferus ferus", extinctionYear: "1909 年", origin: "东欧草原", anchor: { lat: 49.0, lon: 31.0 }, group: "mammal", traits: ["草原奔群", "高机动性", "低矮牧食"], cause: "驯化替代与猎杀", reason: "测试野马回归模式", proxy: "普氏野马" },
  { id: "barbary-lion", name: "巴巴里狮", latin: "Panthera leo leo", extinctionYear: "野外约 1960 年代", origin: "北非阿特拉斯", anchor: { lat: 31.8, lon: -7.1 }, group: "mammal", traits: ["山地顶级掠食", "低密度巡领", "大型体型"], cause: "猎杀与栖息地退缩", reason: "重建山地顶级捕食位", proxy: "非洲狮" },
  { id: "caspian-tiger", name: "里海虎", latin: "Panthera tigris virgata", extinctionYear: "20 世纪中期", origin: "中亚河谷", anchor: { lat: 45.0, lon: 60.0 }, group: "mammal", traits: ["河岸丛林", "大型伏击", "低地巡游"], cause: "猎杀与河谷开垦", reason: "恢复河谷顶级掠食", proxy: "东北虎" },
  { id: "javan-tiger", name: "爪哇虎", latin: "Panthera tigris sondaica", extinctionYear: "1970 年代", origin: "爪哇岛", anchor: { lat: -7.4, lon: 110.0 }, group: "mammal", traits: ["热带林地", "岛屿掠食", "隐蔽伏击"], cause: "农业扩张与猎杀", reason: "重建岛屿掠食位", proxy: "苏门答腊虎" },
  { id: "bali-tiger", name: "巴厘虎", latin: "Panthera tigris balica", extinctionYear: "1937 年", origin: "巴厘岛", anchor: { lat: -8.5, lon: 115.2 }, group: "mammal", traits: ["岛屿猫科", "小尺度领地", "林缘伏击"], cause: "猎杀与土地开发", reason: "补回小岛顶级猎手位", proxy: "苏门答腊虎" },
  { id: "zanzibar-leopard", name: "桑给巴尔豹", latin: "Panthera pardus adersi", extinctionYear: "20 世纪末", origin: "桑给巴尔岛", anchor: { lat: -6.2, lon: 39.3 }, group: "mammal", traits: ["岛屿豹类", "夜行伏击", "红树林边缘"], cause: "清剿与迷信猎杀", reason: "重建岛屿猫科位", proxy: "豹" },
  { id: "hokkaido-wolf", name: "北海道狼", latin: "Canis lupus hattai", extinctionYear: "1889 年", origin: "北海道", anchor: { lat: 43.1, lon: 142.8 }, group: "mammal", traits: ["寒地犬科", "群体巡游", "鹿群追猎"], cause: "毒杀与殖民扩张", reason: "补回寒地犬科压力", proxy: "灰狼" },
  { id: "mexican-grizzly", name: "墨西哥灰熊", latin: "Ursus arctos nelsoni", extinctionYear: "1964 年", origin: "墨西哥北部", anchor: { lat: 29.0, lon: -108.5 }, group: "mammal", traits: ["山地杂食", "大范围游荡", "季节性取食"], cause: "清除式捕杀", reason: "恢复山地杂食巨兽位", proxy: "棕熊" },
  { id: "christmas-island-pipistrelle", name: "圣诞岛伏翼", latin: "Pipistrellus murrayi", extinctionYear: "2009 年", origin: "圣诞岛", anchor: { lat: -10.5, lon: 105.7 }, group: "mammal", traits: ["夜间食虫", "洞穴栖息", "岛屿飞行"], cause: "入侵物种与病害", reason: "修补岛屿夜空食虫层", proxy: "伏翼" },
  { id: "malagasy-hippo", name: "马达加斯加河马", latin: "Hippopotamus lemerlei", extinctionYear: "约 1000 年前", origin: "马达加斯加西部", anchor: { lat: -18.9, lon: 47.5 }, group: "mammal", traits: ["湿地巨体", "河滩活动", "草食扰动"], cause: "猎杀与湿地变迁", reason: "测试湿地巨型草食回归", proxy: "河马" },
  { id: "irish-elk", name: "巨角鹿", latin: "Megaloceros giganteus", extinctionYear: "约 7700 年前", origin: "欧亚草原", anchor: { lat: 53.1, lon: -7.7 }, group: "mammal", traits: ["超大角型", "开阔草原", "季节迁移"], cause: "气候变化与猎压", reason: "重建史前开阔草地表型", proxy: "黇鹿" },
  { id: "cave-bear", name: "洞熊", latin: "Ursus spelaeus", extinctionYear: "约 24000 年前", origin: "中欧山区", anchor: { lat: 47.5, lon: 13.4 }, group: "mammal", traits: ["洞穴越冬", "大型杂食", "山区活动"], cause: "气候变化与人类竞争", reason: "测试洞穴巨兽生态位", proxy: "棕熊" },
  { id: "cave-lion", name: "洞狮", latin: "Panthera spelaea", extinctionYear: "约 14000 年前", origin: "欧亚北部", anchor: { lat: 52.5, lon: 15.2 }, group: "mammal", traits: ["寒地猫科", "群体协作", "大型猎物"], cause: "猎物下降与环境变化", reason: "重建寒地猫科压力", proxy: "狮" },
  { id: "american-lion", name: "美洲拟狮", latin: "Panthera atrox", extinctionYear: "约 11000 年前", origin: "北美西部", anchor: { lat: 36.2, lon: -112.0 }, group: "mammal", traits: ["巨型猫科", "开阔伏击", "大型草食猎取"], cause: "末次冰期后猎物崩塌", reason: "测试史前猫科空位", proxy: "狮" },
  { id: "smilodon", name: "剑齿虎", latin: "Smilodon fatalis", extinctionYear: "约 10000 年前", origin: "北美西海岸", anchor: { lat: 34.1, lon: -118.3 }, group: "mammal", traits: ["夸张犬齿", "伏击掠食", "重体格"], cause: "猎物变化与气候震荡", reason: "重建史前伏击压力", proxy: "虎" },
  { id: "dire-wolf", name: "恐狼", latin: "Aenocyon dirus", extinctionYear: "约 10000 年前", origin: "北美西部", anchor: { lat: 34.1, lon: -118.3 }, group: "mammal", traits: ["群体追猎", "高骨密度", "大型猎物依赖"], cause: "猎物网崩塌", reason: "测试史前犬科回归", proxy: "灰狼" },
  { id: "giant-beaver", name: "巨河狸", latin: "Castoroides ohioensis", extinctionYear: "约 10000 年前", origin: "北美湿地", anchor: { lat: 45.4, lon: -75.7 }, group: "mammal", traits: ["湿地巨体", "缓流水域", "岸线改造"], cause: "气候变化与湿地收缩", reason: "恢复大型啮齿湿地扰动", proxy: "河狸" },
  { id: "giant-ground-sloth", name: "大地懒", latin: "Megatherium americanum", extinctionYear: "约 10000 年前", origin: "南美草原", anchor: { lat: -38.0, lon: -57.5 }, group: "mammal", traits: ["巨型植食", "直立取食", "低速迁移"], cause: "猎杀与环境转换", reason: "测试巨型植食干扰", proxy: "树懒" },
  { id: "glyptodon", name: "雕齿兽", latin: "Glyptodon clavipes", extinctionYear: "约 10000 年前", origin: "南美平原", anchor: { lat: -34.6, lon: -58.4 }, group: "mammal", traits: ["装甲巨兽", "草地低头取食", "慢速巡游"], cause: "猎杀与气候变化", reason: "恢复装甲巨型草食位", proxy: "犰狳" },
  { id: "doedicurus", name: "雕尾兽", latin: "Doedicurus clavicaudatus", extinctionYear: "约 10000 年前", origin: "南美南部", anchor: { lat: -34.6, lon: -58.4 }, group: "mammal", traits: ["重尾武器", "低地草食", "超重体型"], cause: "环境变化与猎压", reason: "补回重装草食层", proxy: "犰狳" },
  { id: "short-faced-bear", name: "短面熊", latin: "Arctodus simus", extinctionYear: "约 11000 年前", origin: "阿拉斯加 / 北美", anchor: { lat: 61.2, lon: -149.9 }, group: "mammal", traits: ["高腿巨熊", "长距离巡游", "高位杂食"], cause: "猎物与气候联动崩塌", reason: "测试极地巨型杂食位", proxy: "棕熊" },
  { id: "diprotodon", name: "袋貘", latin: "Diprotodon optatum", extinctionYear: "约 25000 年前", origin: "澳大利亚内陆", anchor: { lat: -27.5, lon: 135.5 }, group: "mammal", traits: ["巨型有袋类", "内陆草灌", "缓慢迁徙"], cause: "干旱化与人类压力", reason: "恢复古澳巨型植食位", proxy: "袋熊" },
  { id: "thylacoleo", name: "袋狮", latin: "Thylacoleo carnifex", extinctionYear: "约 46000 年前", origin: "澳大利亚西南", anchor: { lat: -31.9, lon: 115.9 }, group: "mammal", traits: ["有袋掠食", "强力前肢", "伏击爬援"], cause: "猎物网改写与环境波动", reason: "测试古澳掠食位", proxy: "袋獾" },
  { id: "megalania", name: "巨蜥", latin: "Varanus priscus", extinctionYear: "约 40000 年前", origin: "澳大利亚北部", anchor: { lat: -19.3, lon: 146.8 }, group: "reptile", traits: ["巨型蜥蜴", "伏击掠食", "热地活动"], cause: "气候变化与猎物衰退", reason: "恢复古澳爬行动物压力", proxy: "科莫多巨蜥" },
  { id: "quinkana", name: "昆卡纳鳄", latin: "Quinkana fortirostrum", extinctionYear: "约 40000 年前", origin: "澳大利亚东北", anchor: { lat: -16.9, lon: 145.8 }, group: "reptile", traits: ["陆栖鳄类", "强力咬合", "湿地边缘"], cause: "环境变化与猎物衰减", reason: "测试陆栖鳄类空位", proxy: "鳄鱼" },
  { id: "pinta-island-tortoise", name: "平塔岛象龟", latin: "Chelonoidis abingdonii", extinctionYear: "2012 年", origin: "加拉帕戈斯平塔岛", anchor: { lat: 0.58, lon: -90.75 }, group: "reptile", traits: ["岛屿巨龟", "慢速取食", "高龄寿命"], cause: "外来山羊与采捕", reason: "恢复火山岛慢速植食层", proxy: "加拉帕戈斯象龟" },
  { id: "floreana-tortoise", name: "弗洛雷纳象龟", latin: "Chelonoidis niger", extinctionYear: "19 世纪", origin: "加拉帕戈斯弗洛雷纳岛", anchor: { lat: -1.3, lon: -90.45 }, group: "reptile", traits: ["火山岛巨龟", "种子传播", "缓慢迁移"], cause: "航海采捕与外来动物", reason: "重建火山岛种子搬运", proxy: "象龟" },
  { id: "chinese-paddlefish", name: "白鲟", latin: "Psephurus gladius", extinctionYear: "2020 年宣告灭绝", origin: "长江流域", anchor: { lat: 30.7, lon: 111.3 }, group: "marine", traits: ["江河巨鱼", "长距离洄游", "顶级掠食"], cause: "大坝阻隔与过度捕捞", reason: "检验大江洄游链修复", proxy: "匙吻鲟" },
  { id: "golden-toad", name: "金蟾蜍", latin: "Incilius periglenes", extinctionYear: "1989 年", origin: "哥斯达黎加云雾林", anchor: { lat: 10.3, lon: -84.8 }, group: "amphibian", traits: ["云雾林", "短暂繁殖窗", "高湿依赖"], cause: "气候波动与真菌病", reason: "修补云雾林微湿地链", proxy: "蟾蜍" },
  { id: "gastric-brooding-frog", name: "胃育蛙", latin: "Rheobatrachus silus", extinctionYear: "1980 年代", origin: "澳大利亚昆士兰", anchor: { lat: -25.4, lon: 152.8 }, group: "amphibian", traits: ["溪流湿地", "奇异育幼", "高病原敏感"], cause: "真菌病与水体变化", reason: "测试极端繁殖策略恢复", proxy: "溪蛙" },
];

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreVariant(base, index, step) {
  return clampValue(base + ((index * step) % 11) - 5, 24, 94);
}

function getGeneratedPalette(group, index) {
  const family = GENERATED_GROUP_PROFILES[group]?.modelFamily ?? "mammal";
  const pool = GENERATED_COLOR_PALETTES[family] ?? GENERATED_COLOR_PALETTES.mammal;
  return pool[index % pool.length];
}

function getGeneratedRating(success) {
  if (success >= 80) return "A 级候选";
  if (success >= 72) return "A- 级候选";
  if (success >= 64) return "B+ 级候选";
  if (success >= 56) return "B 级候选";
  return "C 级候选";
}

function buildGeneratedScores(profile, index) {
  const [successBase, genomeBase, habitatBase, riskBase] = profile.baseScores;
  return [
    { label: "复活成功率", value: scoreVariant(successBase, index, 7), tone: "amber" },
    { label: "基因完整度", value: scoreVariant(genomeBase, index, 5), tone: "cyan" },
    { label: "生态位准备度", value: scoreVariant(habitatBase, index, 3), tone: "olive" },
    { label: "行为失控风险", value: scoreVariant(riskBase, index, 9), tone: "red" },
  ];
}

function buildGeneratedAnatomy(seed, profile, index) {
  return profile.anatomy.map(([label, note], anatomyIndex) => ({
    label,
    value: scoreVariant(60 + anatomyIndex * 6, index + anatomyIndex, 4),
    note: note.replace("它", seed.name),
  }));
}

function buildGeneratedPipeline(seed, profile) {
  return profile.pipeline.map((name, pipelineIndex) => ({
    name,
    detail:
      pipelineIndex === 0
        ? `先把 ${seed.name} 的历史样本噪声剥干净，确认留给我们的到底是什么层级的遗传线索。`
        : pipelineIndex === 1
          ? `围绕 ${seed.reason} 重新拟合身体与表层特征，避免只是做出一个“像它”的外壳。`
          : pipelineIndex === 2
            ? `用近缘物种去补足早期成活与发育窗口，确保 ${seed.name} 不只停留在胚胎阶段。`
            : `在 ${seed.origin} 的模拟环境里反复推演放归后果，看它能否真正接回现代生态。`,
  }));
}

function buildGeneratedProxies(seed, profile) {
  return [
    { name: seed.proxy, role: "近缘参考", note: `帮助实验室校准 ${seed.name} 的骨架比例与基础行为。` },
    { name: `${seed.name} 生态对照组`, role: profile.proxies[0][0], note: profile.proxies[0][1] },
    { name: `${seed.name} 行为模板组`, role: profile.proxies[1][0], note: profile.proxies[1][1] },
  ];
}

function createGeneratedSpecimen(seed, index) {
  const profile = GENERATED_GROUP_PROFILES[seed.group] ?? GENERATED_GROUP_PROFILES.mammal;
  const colors = getGeneratedPalette(seed.group, index);
  const scores = buildGeneratedScores(profile, index);
  const pipeline = buildGeneratedPipeline(seed, profile);
  const anatomy = buildGeneratedAnatomy(seed, profile, index);

  return {
    id: seed.id,
    name: seed.name,
    latin: seed.latin,
    extinctionYear: seed.extinctionYear,
    origin: seed.origin,
    anchor: seed.anchor,
    tier: profile.tier,
    status: profile.status,
    alert: profile.alert,
    revivalReason: seed.reason,
    habitatBadge: profile.habitatBadge,
    summary: `${seed.name} 在这颗地球上留下的不是单一物种的空白，而是 ${seed.reason} 的整段断层。`,
    note: `对 ${seed.name} 的复活更像一次生态接口修补实验，我们真正想确认的是现代环境还接不接得住它。`,
    warning: `${seed.cause} 说明 ${seed.name} 最脆弱的从来不只是身体本身，还有支撑它的整块环境。`,
    traits: seed.traits,
    habitat: [...seed.traits, profile.habitatBadge, "封闭回归评估", "多阶段监测"],
    reintroduction: `如果要把 ${seed.name} 放回 ${seed.origin}，首先要修补 ${seed.cause} 留下的断层，再谈个体放归。`,
    ethics: `支持者把 ${seed.name} 视为检验 ${seed.reason} 的试纸；反对者提醒，我们仍可能在同一片环境里重演旧有的清除机制。`,
    proxies: buildGeneratedProxies(seed, profile),
    incidents: [
      {
        title: `${seed.name} 样本噪声过高`,
        time: `${String((index * 3) % 24).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}`,
        detail: `实验室在清理 ${seed.name} 的样本污染时反复遇到断裂区，说明留存材料远没有名字听上去那么完整。`,
      },
      {
        title: `${seed.name} 放归窗口过窄`,
        time: `${String((index * 5 + 7) % 24).padStart(2, "0")}:${String((index * 13 + 9) % 60).padStart(2, "0")}`,
        detail: `${seed.origin} 的现代环境与旧生态节奏差距过大，放归模型显示窗口比预期更短。`,
      },
    ],
    facts: [
      { label: "灭绝诱因", value: seed.cause },
      { label: "原生区域", value: seed.origin },
      { label: "实验室评级", value: getGeneratedRating(scores[0].value) },
      { label: "复活动机", value: seed.reason },
    ],
    colors,
    modelFamily: profile.modelFamily,
    markerRotation: ((index % 5) - 2) * 0.12,
    viewerScale: profile.viewerScale,
    scores,
    pipeline,
    activeStage: pipeline[(index + 1) % pipeline.length].name,
    anatomy,
  };
}

function buildExpandedSpecimens() {
  return EXTRA_SPECIMEN_SEEDS.map((seed, index) => createGeneratedSpecimen(seed, index));
}

SPECIMENS.push(...buildExpandedSpecimens());

const SCORE_GRADIENTS = {
  amber: "linear-gradient(90deg, rgba(255, 180, 107, 0.88), rgba(255, 225, 170, 0.98))",
  cyan: "linear-gradient(90deg, rgba(123, 227, 223, 0.92), rgba(184, 249, 245, 0.98))",
  olive: "linear-gradient(90deg, rgba(173, 192, 110, 0.88), rgba(225, 240, 179, 0.96))",
  red: "linear-gradient(90deg, rgba(255, 124, 107, 0.9), rgba(255, 194, 181, 0.98))",
};

const ASSET_MANIFEST_URL = "./assets/specimens/manifest.json";
const MODEL_HEIGHTS = {
  marker: 0.62,
  viewer: 2.8,
};

const els = {
  specimenCount: document.getElementById("specimenCount"),
  selectedNameStat: document.getElementById("selectedNameStat"),
  topSuccessRate: document.getElementById("topSuccessRate"),
  globalAlertLabel: document.getElementById("globalAlertLabel"),
  telemetryPanel: document.getElementById("telemetryPanel"),
  telemetryGrid: document.getElementById("telemetryGrid"),
  telemetryToggle: document.getElementById("telemetryToggle"),
  selectedAnchorLabel: document.getElementById("selectedAnchorLabel"),
  overlayName: document.getElementById("overlayName"),
  overlayMeta: document.getElementById("overlayMeta"),
  overlayRegion: document.getElementById("overlayRegion"),
  overlayExtinction: document.getElementById("overlayExtinction"),
  focusPanel: document.getElementById("focusPanel"),
  focusToggle: document.getElementById("focusToggle"),
  focusPanelBody: document.getElementById("focusPanelBody"),
  markerLegend: document.getElementById("markerLegend"),
  heroName: document.getElementById("heroName"),
  heroStatusChip: document.getElementById("heroStatusChip"),
  heroLatin: document.getElementById("heroLatin"),
  heroSummary: document.getElementById("heroSummary"),
  originZone: document.getElementById("originZone"),
  revivalReason: document.getElementById("revivalReason"),
  tierBadge: document.getElementById("tierBadge"),
  extinctionYear: document.getElementById("extinctionYear"),
  traitChips: document.getElementById("traitChips"),
  scoreSummary: document.getElementById("scoreSummary"),
  scoreGrid: document.getElementById("scoreGrid"),
  warningText: document.getElementById("warningText"),
  currentPipelineLabel: document.getElementById("currentPipelineLabel"),
  pipelineSteps: document.getElementById("pipelineSteps"),
  anatomyBars: document.getElementById("anatomyBars"),
  habitatBadge: document.getElementById("habitatBadge"),
  habitatChips: document.getElementById("habitatChips"),
  reintroductionText: document.getElementById("reintroductionText"),
  ethicsText: document.getElementById("ethicsText"),
  proxyGrid: document.getElementById("proxyGrid"),
  incidentList: document.getElementById("incidentList"),
  detailFacts: document.getElementById("detailFacts"),
  globeCanvas: document.getElementById("globeCanvas"),
  openViewerButton: document.getElementById("openViewerButton"),
  viewerModal: document.getElementById("viewerModal"),
  viewerCanvas: document.getElementById("viewerCanvas"),
  closeViewerButton: document.getElementById("closeViewerButton"),
  viewerName: document.getElementById("viewerName"),
  viewerLatin: document.getElementById("viewerLatin"),
  viewerStatus: document.getElementById("viewerStatus"),
  viewerAnchor: document.getElementById("viewerAnchor"),
  viewerNote: document.getElementById("viewerNote"),
  viewerWarning: document.getElementById("viewerWarning"),
  viewerTraits: document.getElementById("viewerTraits"),
};

const state = {
  selectedId: SPECIMENS[0].id,
  hoveredId: null,
  viewerOpen: false,
  telemetryCollapsed: false,
  focusCollapsed: false,
};

const globeState = {
  ready: false,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  oceanFlowLayer: null,
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2(),
  markers: new Map(),
  interactive: [],
  clockOffset: 0,
};

const viewerState = {
  ready: false,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  stage: null,
  model: null,
  mountToken: 0,
  scanRingOuter: null,
  scanRingInner: null,
  scanBeam: null,
  shadowDisc: null,
};

const assetState = {
  manifest: null,
  loader: new GLTFLoader(),
  sceneCache: new Map(),
  loadingTasks: new Map(),
};

const clock = new THREE.Clock();

function getSpecimenById(id) {
  return SPECIMENS.find((item) => item.id === id) ?? SPECIMENS[0];
}

function getSelectedSpecimen() {
  return getSpecimenById(state.selectedId);
}

function formatAnchor(specimen) {
  return `${specimen.origin} · ${Math.abs(specimen.anchor.lat).toFixed(1)}°${specimen.anchor.lat >= 0 ? "N" : "S"} / ${Math.abs(
    specimen.anchor.lon
  ).toFixed(1)}°${specimen.anchor.lon >= 0 ? "E" : "W"}`;
}

async function loadAssetManifest() {
  try {
    const response = await fetch(ASSET_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    assetState.manifest = await response.json();
  } catch (error) {
    console.warn("Unable to load specimen asset manifest.", error);
  }
}

function getAssetEntry(specimenId) {
  return assetState.manifest?.specimens?.[specimenId] ?? null;
}

function hasGeneratedAsset(specimenId) {
  return Boolean(getAssetEntry(specimenId)?.localModel);
}

function getStatusLabel(specimen) {
  return hasGeneratedAsset(specimen.id) ? `${specimen.status} · 已接入贴图 3D` : `${specimen.status} · 实验白模`;
}

function normalizeImportedRoot(root, targetHeight) {
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) {
    return;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= bounds.min.y;

  const scale = targetHeight / size.y;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
}

function cloneImportedMaterial(material, usage, fallbackMaterial) {
  if (Array.isArray(material)) {
    return material.map((item) => cloneImportedMaterial(item, usage, fallbackMaterial));
  }

  if (usage !== "viewer") {
    return fallbackMaterial.clone();
  }

  const next = material?.clone ? material.clone() : fallbackMaterial.clone();

  if ("side" in next) {
    next.side = THREE.FrontSide;
  }

  if ("metalness" in next && typeof next.metalness === "number") {
    next.metalness = Math.min(next.metalness, 0.32);
  }

  if ("roughness" in next && typeof next.roughness === "number") {
    next.roughness = Math.max(0.3, next.roughness * 0.92);
  }

  if ("envMapIntensity" in next && typeof next.envMapIntensity === "number") {
    next.envMapIntensity = Math.max(next.envMapIntensity, 1.15);
  }

  if ("transparent" in next && next.opacity === 0) {
    next.transparent = false;
    next.opacity = 1;
  }

  next.needsUpdate = true;
  return next;
}

function createImportedModel(sourceScene, usage, specimen) {
  const clone = cloneSkeleton(sourceScene);
  const wrapper = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const meshes = [];

  clone.traverse((child) => {
    if (child.isLight || child.isCamera) {
      child.visible = false;
      return;
    }

    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      meshes.push(child);
    }
  });

  meshes.forEach((mesh) => {
    mesh.material = cloneImportedMaterial(mesh.material, usage, mats.shell);
  });

  wrapper.add(clone);
  normalizeImportedRoot(clone, MODEL_HEIGHTS[usage]);
  wrapper.rotation.y = specimen.markerRotation || 0;
  wrapper.userData.importedAsset = true;
  return wrapper;
}

async function loadSpecimenAsset(specimenId) {
  const asset = getAssetEntry(specimenId);
  if (!asset?.localModel) {
    return null;
  }

  if (assetState.sceneCache.has(specimenId)) {
    return assetState.sceneCache.get(specimenId);
  }

  if (assetState.loadingTasks.has(specimenId)) {
    return assetState.loadingTasks.get(specimenId);
  }

  const task = new Promise((resolve) => {
    const assetUrl = new URL(asset.localModel, window.location.href);
    if (asset.lastGeneratedAt) {
      assetUrl.searchParams.set("v", asset.lastGeneratedAt);
    }

    assetState.loader.load(
      assetUrl.href,
      (gltf) => {
        const source = gltf.scene ?? gltf.scenes?.[0] ?? null;
        if (source) {
          assetState.sceneCache.set(specimenId, source);
        }
        resolve(source);
      },
      undefined,
      (error) => {
        console.warn(`Unable to load specimen asset for ${specimenId}.`, error);
        resolve(null);
      }
    );
  });

  assetState.loadingTasks.set(specimenId, task);
  const source = await task;
  assetState.loadingTasks.delete(specimenId);
  return source;
}

function replaceMarkerModel(marker, nextModel) {
  if (!marker.userData.model) {
    return;
  }

  const previous = marker.userData.model;
  const baseY = previous.userData.baseY ?? 0.23;
  const offset = previous.userData.offset ?? 0;
  marker.remove(previous);

  nextModel.position.y = baseY;
  nextModel.userData.baseY = baseY;
  nextModel.userData.offset = offset;
  marker.add(nextModel);

  marker.userData.model = nextModel;
  marker.userData.baseScale = 1;
  updateMarkerStates();
}

async function upgradeMarkerToAsset(marker, specimen) {
  const source = await loadSpecimenAsset(specimen.id);
  if (!source) {
    return;
  }

  const imported = createImportedModel(source, "marker", specimen);
  replaceMarkerModel(marker, imported);
}

function renderStats() {
  const selected = getSelectedSpecimen();
  const topSpecimen = [...SPECIMENS].sort((a, b) => b.scores[0].value - a.scores[0].value)[0];

  els.specimenCount.textContent = String(SPECIMENS.length);
  els.selectedNameStat.textContent = selected.name;
  els.topSuccessRate.textContent = `${topSpecimen.scores[0].value}% ${topSpecimen.name}`;
  els.globalAlertLabel.textContent = selected.alert;
}

function renderOverlayStates() {
  els.telemetryPanel?.classList.toggle("is-collapsed", state.telemetryCollapsed);
  els.telemetryToggle?.setAttribute("aria-expanded", String(!state.telemetryCollapsed));
  if (els.telemetryToggle) {
    els.telemetryToggle.textContent = state.telemetryCollapsed ? "封闭测试区 · 展开" : "封闭测试区 · 收起";
  }

  els.focusPanel?.classList.toggle("is-collapsed", state.focusCollapsed);
  els.focusToggle?.setAttribute("aria-expanded", String(!state.focusCollapsed));
  const hint = document.querySelector(".focus-collapse-hint");
  if (hint) {
    hint.textContent = state.focusCollapsed ? "展开" : "收起";
  }
}

function buildMarkerLegend() {
  els.markerLegend.innerHTML = "";

  SPECIMENS.forEach((specimen) => {
    const hasAsset = hasGeneratedAsset(specimen.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "marker-chip";
    button.dataset.id = specimen.id;
    button.innerHTML = `
      <span class="marker-dot" style="background:${new THREE.Color(specimen.colors.accent).getStyle()}"></span>
      <span class="marker-chip-text">
        <span class="marker-chip-label-row">
          <span class="marker-chip-label">${specimen.name}</span>
          ${hasAsset ? '<span class="marker-chip-badge">贴图</span>' : ""}
        </span>
        <span class="marker-chip-meta">${specimen.extinctionYear}${hasAsset ? " · 已接入贴图" : ""}</span>
      </span>
    `;
    button.addEventListener("click", () => setSelectedSpecimen(specimen.id));
    els.markerLegend.append(button);
  });
}

function renderSelection(specimen) {
  els.selectedAnchorLabel.textContent = formatAnchor(specimen);
  els.overlayName.textContent = specimen.name;
  els.overlayMeta.textContent = specimen.summary;
  els.overlayRegion.textContent = specimen.origin;
  els.overlayExtinction.textContent = specimen.extinctionYear;

  els.heroName.textContent = specimen.name;
  els.heroStatusChip.textContent = getStatusLabel(specimen);
  els.heroLatin.textContent = specimen.latin;
  els.heroSummary.textContent = specimen.summary;
  els.originZone.textContent = specimen.origin;
  els.revivalReason.textContent = specimen.revivalReason;
  els.tierBadge.textContent = specimen.tier;
  els.extinctionYear.textContent = specimen.extinctionYear;
  els.openViewerButton.textContent = hasGeneratedAsset(specimen.id) ? "打开贴图 3D 样本仓" : "打开实验白模样本仓";

  els.traitChips.innerHTML = "";
  specimen.traits.forEach((trait) => {
    const chip = document.createElement("span");
    chip.className = "trait-chip";
    chip.textContent = trait;
    els.traitChips.append(chip);
  });
}

function renderScores(specimen) {
  els.scoreSummary.textContent = `${specimen.scores[0].value}% 成功率`;
  els.warningText.textContent = specimen.warning;
  els.scoreGrid.innerHTML = "";

  specimen.scores.forEach((score) => {
    const card = document.createElement("article");
    card.className = "score-card";
    card.innerHTML = `
      <span>${score.label}</span>
      <strong>${score.value}%</strong>
      <div class="score-bar">
        <div class="score-fill" style="width:${score.value}%; background:${SCORE_GRADIENTS[score.tone]}"></div>
      </div>
    `;
    els.scoreGrid.append(card);
  });
}

function renderPipeline(specimen) {
  els.currentPipelineLabel.textContent = specimen.activeStage;
  els.pipelineSteps.innerHTML = "";

  specimen.pipeline.forEach((step, index) => {
    const card = document.createElement("article");
    card.className = `pipeline-step${step.name === specimen.activeStage ? " active" : ""}`;
    card.innerHTML = `
      <div class="step-index">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <strong>${step.name}</strong>
        <p class="body-copy">${step.detail}</p>
      </div>
    `;
    els.pipelineSteps.append(card);
  });
}

function renderAnatomy(specimen) {
  els.anatomyBars.innerHTML = "";

  specimen.anatomy.forEach((item) => {
    const card = document.createElement("article");
    card.className = "anatomy-item";
    card.innerHTML = `
      <div class="anatomy-head">
        <strong>${item.label}</strong>
        <span class="micro-label">${item.value}%</span>
      </div>
      <div class="anatomy-track">
        <div class="anatomy-fill" style="width:${item.value}%; background:${SCORE_GRADIENTS.cyan}"></div>
      </div>
      <p class="subline">${item.note}</p>
    `;
    els.anatomyBars.append(card);
  });
}

function renderHabitat(specimen) {
  els.habitatBadge.textContent = specimen.habitatBadge;
  els.habitatChips.innerHTML = "";
  specimen.habitat.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = tag;
    els.habitatChips.append(chip);
  });

  els.reintroductionText.textContent = specimen.reintroduction;
  els.ethicsText.textContent = specimen.ethics;

  els.proxyGrid.innerHTML = "";
  specimen.proxies.forEach((proxy) => {
    const card = document.createElement("article");
    card.className = "proxy-card";
    card.innerHTML = `
      <span>${proxy.role}</span>
      <strong>${proxy.name}</strong>
      <p class="subline">${proxy.note}</p>
    `;
    els.proxyGrid.append(card);
  });
}

function renderIncidents(specimen) {
  els.incidentList.innerHTML = "";
  specimen.incidents.forEach((incident) => {
    const card = document.createElement("article");
    card.className = "incident-card";
    card.innerHTML = `
      <div class="incident-card-head">
        <strong>${incident.title}</strong>
        <span class="incident-time">${incident.time}</span>
      </div>
      <p class="body-copy">${incident.detail}</p>
    `;
    els.incidentList.append(card);
  });
}

function renderFacts(specimen) {
  els.detailFacts.innerHTML = "";
  specimen.facts.forEach((fact) => {
    const card = document.createElement("article");
    card.className = "fact-card";
    card.innerHTML = `
      <span>${fact.label}</span>
      <strong>${fact.value}</strong>
    `;
    els.detailFacts.append(card);
  });
}

function syncSelectionState() {
  document.querySelectorAll(".marker-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.id === state.selectedId);
  });
}

function renderViewerCopy(specimen) {
  els.viewerName.textContent = specimen.name;
  els.viewerLatin.textContent = specimen.latin;
  els.viewerStatus.textContent = getStatusLabel(specimen);
  els.viewerAnchor.textContent = formatAnchor(specimen);
  els.viewerNote.textContent = specimen.note;
  els.viewerWarning.textContent = specimen.warning;
  els.viewerTraits.innerHTML = "";

  specimen.traits.forEach((trait) => {
    const chip = document.createElement("span");
    chip.className = "trait-chip";
    chip.textContent = trait;
    els.viewerTraits.append(chip);
  });
}

function render() {
  const specimen = getSelectedSpecimen();
  renderStats();
  renderSelection(specimen);
  renderScores(specimen);
  renderPipeline(specimen);
  renderAnatomy(specimen);
  renderHabitat(specimen);
  renderIncidents(specimen);
  renderFacts(specimen);
  renderViewerCopy(specimen);
  renderOverlayStates();
  syncSelectionState();
  updateMarkerStates();

  if (viewerState.ready && state.viewerOpen) {
    mountViewerModel(specimen);
  }
}

function setSelectedSpecimen(id, options = {}) {
  if (state.selectedId === id && !options.openViewer) {
    return;
  }

  state.selectedId = id;
  render();

  if (options.openViewer) {
    openViewer();
  }
}

function openViewer() {
  ensureViewerScene();
  state.viewerOpen = true;
  document.body.classList.add("viewer-open");
  els.viewerModal.classList.remove("hidden");
  els.viewerModal.setAttribute("aria-hidden", "false");
  mountViewerModel(getSelectedSpecimen());
  resizeViewer();
}

function closeViewer() {
  state.viewerOpen = false;
  document.body.classList.remove("viewer-open");
  els.viewerModal.classList.add("hidden");
  els.viewerModal.setAttribute("aria-hidden", "true");
}

function bindEvents() {
  els.openViewerButton.addEventListener("click", openViewer);
  els.closeViewerButton.addEventListener("click", closeViewer);
  els.telemetryToggle?.addEventListener("click", () => {
    state.telemetryCollapsed = !state.telemetryCollapsed;
    renderOverlayStates();
  });
  els.focusToggle?.addEventListener("click", () => {
    state.focusCollapsed = !state.focusCollapsed;
    renderOverlayStates();
  });
  els.focusToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      state.focusCollapsed = !state.focusCollapsed;
      renderOverlayStates();
    }
  });

  els.viewerModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.closeViewer === "true") {
      closeViewer();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.viewerOpen) {
      closeViewer();
    }
  });
}

function latLonToVector3(radius, lat, lon) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createWorldTexture(geojson) {
  const canvas = document.createElement("canvas");
  const width = 2048;
  const height = 1024;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f7fb";
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.52, height * 0.48, 0, width * 0.52, height * 0.48, width * 0.45);
  glow.addColorStop(0, "rgba(126, 182, 255, 0.22)");
  glow.addColorStop(1, "rgba(126, 182, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(94, 120, 168, 0.18)";
  ctx.lineWidth = 1.4;
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#fcfdff";
  ctx.strokeStyle = "rgba(108, 136, 186, 0.48)";
  ctx.lineWidth = 2.2;

  geojson.features.forEach((feature) => drawGeometry(ctx, feature.geometry, width, height));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createOceanMaskTexture(geojson) {
  const canvas = document.createElement("canvas");
  const width = 2048;
  const height = 1024;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  geojson.features.forEach((feature) => drawGeometry(ctx, feature.geometry, width, height));

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createOceanFlowTexture() {
  const canvas = document.createElement("canvas");
  const width = 1024;
  const height = 512;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  const fill = ctx.createLinearGradient(0, 0, width, height);
  fill.addColorStop(0, "rgba(173, 208, 255, 0.02)");
  fill.addColorStop(0.45, "rgba(132, 187, 255, 0.12)");
  fill.addColorStop(1, "rgba(255, 255, 255, 0.03)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);

  for (let row = -1; row < 8; row += 1) {
    const y = row * 84;
    ctx.beginPath();
    ctx.moveTo(-60, y + 30);
    ctx.bezierCurveTo(width * 0.18, y - 18, width * 0.42, y + 68, width * 0.7, y + 22);
    ctx.bezierCurveTo(width * 0.86, y - 4, width * 0.96, y + 50, width + 60, y + 12);
    ctx.strokeStyle = "rgba(124, 171, 244, 0.26)";
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-80, y + 54);
    ctx.bezierCurveTo(width * 0.16, y + 12, width * 0.46, y + 102, width * 0.78, y + 42);
    ctx.bezierCurveTo(width * 0.9, y + 16, width * 1.02, y + 74, width + 90, y + 30);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  for (let i = 0; i < 24; i += 1) {
    const x = (i * 97) % width;
    const y = (i * 43) % height;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 34);
    glow.addColorStop(0, "rgba(255,255,255,0.2)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 34, y - 34, 68, 68);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.9, 1.15);
  texture.needsUpdate = true;
  return texture;
}

function drawGeometry(ctx, geometry, width, height) {
  if (!geometry) {
    return;
  }

  if (geometry.type === "Polygon") {
    drawPolygon(ctx, geometry.coordinates, width, height);
    return;
  }

  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) => drawPolygon(ctx, polygon, width, height));
  }
}

function drawPolygon(ctx, polygon, width, height) {
  ctx.beginPath();
  polygon.forEach((ring) => drawRing(ctx, ring, width, height));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawRing(ctx, ring, width, height) {
  let previousX = null;

  ring.forEach(([lon, lat], index) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;

    if (index === 0) {
      ctx.moveTo(x, y);
      previousX = x;
      return;
    }

    if (previousX !== null && Math.abs(x - previousX) > width * 0.5) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    previousX = x;
  });
}

async function loadGlobeTextures() {
  try {
    const response = await fetch("./assets/world.json");
    const geojson = await response.json();
    return {
      surface: createWorldTexture(geojson),
      oceanMask: createOceanMaskTexture(geojson),
      oceanFlow: createOceanFlowTexture(),
    };
  } catch (error) {
    const fallbackCanvas = document.createElement("canvas");
    fallbackCanvas.width = 1024;
    fallbackCanvas.height = 512;
    const ctx = fallbackCanvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, fallbackCanvas.width, fallbackCanvas.height);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(1, "#eef3fa");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
    const texture = new THREE.CanvasTexture(fallbackCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = 1024;
    maskCanvas.height = 512;
    const maskCtx = maskCanvas.getContext("2d");
    maskCtx.fillStyle = "#ffffff";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    const oceanMask = new THREE.CanvasTexture(maskCanvas);
    oceanMask.needsUpdate = true;
    return {
      surface: texture,
      oceanMask,
      oceanFlow: createOceanFlowTexture(),
    };
  }
}

function mixTowardWhite(hex, amount) {
  return new THREE.Color(hex).lerp(new THREE.Color(0xffffff), amount);
}

function getDisplayProfile(usage = "viewer") {
  const viewer = usage === "viewer";
  return {
    shellOpacity: viewer ? 0.92 : 0.95,
    transmission: viewer ? 0.18 : 0.04,
    lineOpacity: viewer ? 0.2 : 0.08,
    coreOpacity: viewer ? 0.44 : 0.18,
    emissive: viewer ? 0.16 : 0.05,
    bandOpacity: viewer ? 0.24 : 0.1,
  };
}

function createMaterialSet(specimen, usage = "viewer") {
  const profile = getDisplayProfile(usage);
  const accent = mixTowardWhite(specimen.colors.accent, 0.6);
  const softAccent = accent.clone().lerp(new THREE.Color(0xffffff), 0.45);
  const shellColor = new THREE.Color(0xf8fbff);
  const secondaryColor = mixTowardWhite(specimen.colors.body, 0.78);

  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: shellColor,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      transparent: true,
      opacity: profile.shellOpacity,
      transmission: profile.transmission,
      thickness: 0.56,
      sheen: 0.24,
      sheenColor: softAccent,
    }),
    shellSecondary: new THREE.MeshPhysicalMaterial({
      color: secondaryColor,
      roughness: 0.2,
      metalness: 0.04,
      clearcoat: 0.92,
      clearcoatRoughness: 0.22,
      transparent: true,
      opacity: profile.shellOpacity - 0.04,
      transmission: profile.transmission * 0.7,
      thickness: 0.48,
    }),
    core: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      emissive: softAccent,
      emissiveIntensity: profile.emissive,
      transparent: true,
      opacity: profile.coreOpacity,
      roughness: 0.24,
      metalness: 0.08,
    }),
    bone: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xecf3ff),
      emissive: accent,
      emissiveIntensity: profile.emissive * 0.85,
      roughness: 0.26,
      metalness: 0.12,
    }),
    wire: new THREE.MeshBasicMaterial({
      color: softAccent,
      wireframe: true,
      transparent: true,
      opacity: profile.lineOpacity,
      depthWrite: false,
    }),
    band: new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: profile.bandOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    tusk: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf9f5ea),
      roughness: 0.24,
      metalness: 0.04,
      clearcoat: 0.5,
    }),
    detail: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xd7e1ee),
      emissive: softAccent,
      emissiveIntensity: profile.emissive * 0.66,
      roughness: 0.3,
      metalness: 0.08,
    }),
  };
}

function addPart(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function addOrganicPart(parent, geometry, materials, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const shell = addPart(parent, geometry, options.material ?? materials.shell, position, rotation, scale);
  shell.renderOrder = 2;

  if (options.core !== false) {
    const core = new THREE.Mesh(geometry, options.coreMaterial ?? materials.core);
    const coreScale = options.coreScale ?? [0.84, 0.84, 0.84];
    if (Array.isArray(coreScale)) {
      core.scale.set(...coreScale);
    } else {
      core.scale.setScalar(coreScale);
    }
    core.renderOrder = 1;
    shell.add(core);
  }

  if (options.wire !== false) {
    const wire = new THREE.Mesh(geometry, options.wireMaterial ?? materials.wire);
    wire.scale.setScalar(options.wireScale ?? 1.006);
    wire.renderOrder = 3;
    shell.add(wire);
  }

  return shell;
}

function addCurveTube(parent, points, material, radius = 0.03, tubularSegments = 42, radialSegments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false), material);
  parent.add(mesh);
  return { curve, mesh };
}

function addVertebrae(parent, points, materials, radius = 0.026, count = 8) {
  const { curve } = addCurveTube(parent, points, materials.bone, radius, Math.max(36, count * 6), 10);
  curve.getPoints(count).forEach((point, index) => {
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(radius * (1.24 - index * 0.06), radius * 0.7), 14, 14),
      materials.detail
    );
    bead.position.copy(point);
    parent.add(bead);
  });
}

function addBand(parent, radius, tube, position, rotation, material, arc = Math.PI * 1.68) {
  return addPart(parent, new THREE.TorusGeometry(radius, tube, 12, 56, arc), material, position, rotation);
}

function addLegSet(parent, materials, positions, options = {}) {
  const geometry = new THREE.CapsuleGeometry(options.radius ?? 0.08, options.length ?? 0.82, 6, 14);
  positions.forEach(([x, y, z]) => {
    addOrganicPart(parent, geometry, materials, [x, y, z], options.rotation ?? [0, 0, 0], options.scale ?? [1, 1, 1], {
      material: options.material ?? materials.shellSecondary,
      core: options.core,
      coreScale: options.coreScale ?? [0.88, 0.88, 0.88],
      wire: options.wire ?? true,
    });
  });
}

function createSpecimenModel(specimen, usage = "viewer") {
  switch (specimen.id) {
    case "thylacine":
      return buildThylacine(specimen, usage);
    case "mammoth":
      return buildMammoth(specimen, usage);
    case "dodo":
      return buildDodo(specimen, usage);
    case "quagga":
      return buildQuagga(specimen, usage);
    case "moa":
      return buildMoa(specimen, usage);
    case "aurochs":
      return buildAurochs(specimen, usage);
    default:
      return buildGenericSpecimen(specimen, usage);
  }
}

function buildGenericSpecimen(specimen, usage = "viewer") {
  switch (specimen.modelFamily) {
    case "bird":
      return buildGenericBird(specimen, usage);
    case "marine":
      return buildGenericMarine(specimen, usage);
    case "reptile":
      return buildGenericReptile(specimen, usage);
    case "amphibian":
      return buildGenericAmphibian(specimen, usage);
    default:
      return buildGenericMammal(specimen, usage);
  }
}

function buildGenericMammal(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const viewer = usage === "viewer";

  addOrganicPart(group, new THREE.SphereGeometry(0.58, 24, 24), mats, [0.04, 1.22, 0], [0, 0, 0], [1.62, 1.02, 0.94]);
  addOrganicPart(group, new THREE.SphereGeometry(0.4, 22, 22), mats, [-0.56, 1.18, 0], [0, 0, 0], [1.08, 0.92, 0.96], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.SphereGeometry(0.34, 20, 20), mats, [0.7, 1.3, 0], [0, 0, 0], [0.92, 1, 0.9], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.11, 0.42, 6, 14), mats, [1.06, 1.44, 0], [0, 0, -0.9], [1, 1, 1], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.SphereGeometry(0.21, 20, 20), mats, [1.38, 1.57, 0], [0, 0, 0], [1.38, 0.84, 0.9]);
  addOrganicPart(group, new THREE.CapsuleGeometry(0.055, 0.24, 4, 12), mats, [1.64, 1.52, 0], [0, 0, Math.PI / 2], [1.26, 0.82, 0.74], {
    material: mats.shellSecondary,
    coreScale: [0.82, 0.74, 0.74],
  });
  addLegSet(
    group,
    mats,
    [
      [-0.46, 0.56, -0.22],
      [0.54, 0.58, -0.22],
      [-0.46, 0.56, 0.22],
      [0.54, 0.58, 0.22],
    ],
    { radius: 0.065, length: 0.86, material: mats.shellSecondary }
  );
  addCurveTube(
    group,
    [
      [-0.88, 1.22, 0],
      [-1.18, 1.3, 0.04],
      [-1.38, 1.45, 0.06],
    ],
    mats.bone,
    0.03
  );

  if (viewer) {
    addVertebrae(
      group,
      [
        [-0.56, 1.28, 0],
        [0.06, 1.34, 0],
        [0.72, 1.42, 0],
        [1.34, 1.56, 0],
      ],
      mats,
      0.022,
      7
    );
    addBand(group, 0.52, 0.012, [0.16, 1.24, 0], [0, Math.PI / 2, 0.18], mats.band);
    addBand(group, 0.44, 0.01, [-0.2, 1.18, 0], [0, Math.PI / 2, -0.12], mats.band, Math.PI * 1.46);
  }

  return group;
}

function buildGenericBird(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const viewer = usage === "viewer";

  addOrganicPart(group, new THREE.SphereGeometry(0.54, 24, 24), mats, [0.02, 1.3, 0], [0, 0, 0], [1.1, 1.26, 0.94]);
  addOrganicPart(group, new THREE.SphereGeometry(0.36, 20, 20), mats, [-0.16, 1.06, 0], [0, 0, 0], [1.08, 0.9, 1], {
    material: mats.shellSecondary,
  });
  addCurveTube(
    group,
    [
      [0.3, 1.64, 0],
      [0.48, 1.9, 0],
      [0.72, 2.04, 0],
    ],
    mats.bone,
    0.05
  );
  addOrganicPart(group, new THREE.SphereGeometry(0.18, 18, 18), mats, [0.84, 2.08, 0], [0, 0, 0], [0.92, 0.84, 0.9]);
  addOrganicPart(group, new THREE.ConeGeometry(0.13, 0.34, 18), mats, [1.1, 2.05, 0], [0, 0, -Math.PI / 2], [1.08, 0.62, 0.76], {
    material: mats.tusk,
    core: false,
    wire: false,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.12, 0.32, 6, 12), mats, [-0.08, 1.34, -0.44], [0.2, 0.16, 0.42], [1.2, 0.54, 1.22], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.12, 0.32, 6, 12), mats, [-0.08, 1.34, 0.44], [-0.2, -0.16, 0.42], [1.2, 0.54, 1.22], {
    material: mats.shellSecondary,
  });
  addLegSet(
    group,
    mats,
    [
      [0.06, 0.58, -0.1],
      [0.18, 0.58, 0.1],
    ],
    { radius: 0.04, length: 1.02, material: mats.tusk, core: false, wire: false }
  );

  if (viewer) {
    addVertebrae(
      group,
      [
        [-0.22, 1.18, 0],
        [0.14, 1.46, 0],
        [0.48, 1.84, 0],
        [0.86, 2.08, 0],
      ],
      mats,
      0.02,
      6
    );
    addBand(group, 0.48, 0.01, [0.04, 1.32, 0], [0, Math.PI / 2, 0.12], mats.band, Math.PI * 1.44);
  }

  return group;
}

function buildGenericMarine(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const viewer = usage === "viewer";

  addOrganicPart(group, new THREE.CapsuleGeometry(0.26, 1.3, 6, 16), mats, [0, 1.12, 0], [0, 0, Math.PI / 2], [1.58, 0.8, 0.72]);
  addOrganicPart(group, new THREE.SphereGeometry(0.22, 18, 18), mats, [1.08, 1.14, 0], [0, 0, 0], [1.12, 0.76, 0.82], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.1, 0.32, 4, 10), mats, [0.2, 0.96, -0.44], [0.2, 0.06, 1.1], [1.2, 0.5, 0.9], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.1, 0.32, 4, 10), mats, [0.2, 0.96, 0.44], [-0.2, -0.06, 1.1], [1.2, 0.5, 0.9], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.ConeGeometry(0.18, 0.42, 18), mats, [-1.26, 1.12, -0.24], [0, 0, 0.82], [1, 1.1, 1], {
    material: mats.detail,
    core: false,
    wire: false,
  });
  addOrganicPart(group, new THREE.ConeGeometry(0.18, 0.42, 18), mats, [-1.26, 1.12, 0.24], [0, 0, -0.82], [1, 1.1, 1], {
    material: mats.detail,
    core: false,
    wire: false,
  });

  if (viewer) {
    addVertebrae(
      group,
      [
        [-1.12, 1.12, 0],
        [-0.44, 1.15, 0],
        [0.26, 1.16, 0],
        [0.98, 1.14, 0],
      ],
      mats,
      0.018,
      7
    );
  }

  return group;
}

function buildGenericReptile(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const viewer = usage === "viewer";

  addOrganicPart(group, new THREE.CapsuleGeometry(0.22, 1.22, 6, 16), mats, [0, 0.96, 0], [0, 0, Math.PI / 2], [1.48, 0.74, 0.74]);
  addOrganicPart(group, new THREE.SphereGeometry(0.18, 16, 16), mats, [0.92, 1.04, 0], [0, 0, 0], [1.28, 0.72, 0.86], {
    material: mats.shellSecondary,
  });
  addCurveTube(
    group,
    [
      [-0.96, 0.98, 0],
      [-1.4, 1.08, 0.08],
      [-1.82, 1.24, 0.14],
    ],
    mats.bone,
    0.03
  );
  addLegSet(
    group,
    mats,
    [
      [-0.28, 0.52, -0.24],
      [0.42, 0.54, -0.24],
      [-0.28, 0.52, 0.24],
      [0.42, 0.54, 0.24],
    ],
    { radius: 0.04, length: 0.34, rotation: [0, 0, 0.46], material: mats.detail, core: false }
  );

  if (viewer) {
    addVertebrae(
      group,
      [
        [-1.02, 1.0, 0],
        [-0.3, 1.02, 0],
        [0.44, 1.04, 0],
        [1.02, 1.04, 0],
      ],
      mats,
      0.018,
      7
    );
  }

  return group;
}

function buildGenericAmphibian(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);
  const viewer = usage === "viewer";

  addOrganicPart(group, new THREE.SphereGeometry(0.38, 22, 22), mats, [0.02, 0.84, 0], [0, 0, 0], [1.38, 0.8, 1.02]);
  addOrganicPart(group, new THREE.SphereGeometry(0.24, 18, 18), mats, [0.46, 0.96, 0], [0, 0, 0], [1.24, 0.72, 0.92], {
    material: mats.shellSecondary,
  });
  addLegSet(
    group,
    mats,
    [
      [-0.18, 0.44, -0.3],
      [0.22, 0.42, -0.3],
      [-0.18, 0.44, 0.3],
      [0.22, 0.42, 0.3],
    ],
    { radius: 0.035, length: 0.24, rotation: [0, 0, 0.72], material: mats.detail, core: false }
  );

  if (viewer) {
    addVertebrae(
      group,
      [
        [-0.18, 0.86, 0],
        [0.08, 0.9, 0],
        [0.36, 0.96, 0],
        [0.58, 1.0, 0],
      ],
      mats,
      0.014,
      5
    );
  }

  return group;
}

function buildThylacine(specimen, usage = "viewer") {
  const group = buildGenericMammal(specimen, usage);
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.ConeGeometry(0.07, 0.18, 12), mats, [1.18, 1.86, -0.11], [-0.1, 0, -0.2], [0.8, 1, 0.8], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.ConeGeometry(0.07, 0.18, 12), mats, [1.18, 1.86, 0.11], [0.1, 0, -0.2], [0.8, 1, 0.8], {
    material: mats.shellSecondary,
  });

  if (usage === "viewer") {
    [-0.34, -0.04, 0.24, 0.5].forEach((x, index) => {
      addBand(group, 0.22, 0.008, [x, 1.14 + index * 0.02, 0], [0, Math.PI / 2, 0.1], mats.band, Math.PI * 1.1);
    });
  }

  return group;
}

function buildMammoth(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.SphereGeometry(0.7, 26, 26), mats, [0, 1.22, 0], [0, 0, 0], [1.5, 1.04, 1]);
  addOrganicPart(group, new THREE.SphereGeometry(0.5, 24, 24), mats, [0.86, 1.22, 0], [0, 0, 0], [1.02, 0.9, 0.92], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.15, 0.44, 6, 16), mats, [1.3, 0.86, 0], [0, 0, 0.26], [1.1, 1, 1], {
    material: mats.shellSecondary,
  });
  addCurveTube(
    group,
    [
      [1.38, 0.6, 0],
      [1.48, 0.16, 0.04],
      [1.32, -0.14, 0.08],
    ],
    mats.bone,
    0.1,
    36,
    14
  );
  addPart(group, new THREE.TorusGeometry(0.32, 0.028, 10, 36, Math.PI * 1.24), mats.tusk, [1.18, 0.92, -0.28], [1.12, 0.14, -0.16]);
  addPart(group, new THREE.TorusGeometry(0.32, 0.028, 10, 36, Math.PI * 1.24), mats.tusk, [1.18, 0.92, 0.28], [2.02, -0.14, 0.16]);
  addPart(group, new THREE.CircleGeometry(0.24, 22), mats.shellSecondary, [0.88, 1.22, -0.34], [0, Math.PI / 2, 0], [1.2, 1.4, 1]);
  addPart(group, new THREE.CircleGeometry(0.24, 22), mats.shellSecondary, [0.88, 1.22, 0.34], [0, -Math.PI / 2, 0], [1.2, 1.4, 1]);
  addLegSet(
    group,
    mats,
    [
      [-0.38, 0.58, -0.3],
      [0.34, 0.58, -0.3],
      [-0.38, 0.58, 0.3],
      [0.34, 0.58, 0.3],
    ],
    { radius: 0.11, length: 0.9, material: mats.shellSecondary }
  );
  addCurveTube(
    group,
    [
      [-0.9, 1.24, 0],
      [-1.06, 1.32, 0],
      [-1.18, 1.48, 0],
    ],
    mats.bone,
    0.028
  );

  if (usage === "viewer") {
    addVertebrae(
      group,
      [
        [-0.72, 1.32, 0],
        [-0.08, 1.4, 0],
        [0.58, 1.46, 0],
        [1.02, 1.34, 0],
      ],
      mats,
      0.024,
      8
    );
    addBand(group, 0.62, 0.014, [-0.04, 1.28, 0], [0, Math.PI / 2, 0.1], mats.band, Math.PI * 1.52);
  }

  return group;
}

function buildDodo(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.SphereGeometry(0.62, 26, 26), mats, [0.02, 1.26, 0], [0, 0, 0], [1.06, 1.32, 0.96]);
  addOrganicPart(group, new THREE.SphereGeometry(0.34, 22, 22), mats, [-0.2, 1.02, 0], [0, 0, 0], [1.1, 0.86, 1], {
    material: mats.shellSecondary,
  });
  addCurveTube(
    group,
    [
      [0.28, 1.62, 0],
      [0.48, 1.88, 0],
      [0.72, 2.02, 0],
    ],
    mats.bone,
    0.055
  );
  addOrganicPart(group, new THREE.SphereGeometry(0.2, 18, 18), mats, [0.84, 2.06, 0], [0, 0, 0], [0.94, 0.84, 0.9]);
  addOrganicPart(group, new THREE.ConeGeometry(0.18, 0.42, 18), mats, [1.14, 2.03, 0], [0, 0, -Math.PI / 2], [1.16, 0.58, 0.7], {
    material: mats.tusk,
    core: false,
    wire: false,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.12, 0.26, 6, 12), mats, [-0.08, 1.34, -0.42], [0.18, 0.12, 0.48], [1.12, 0.44, 1.12], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.CapsuleGeometry(0.12, 0.26, 6, 12), mats, [-0.08, 1.34, 0.42], [-0.18, -0.12, 0.48], [1.12, 0.44, 1.12], {
    material: mats.shellSecondary,
  });
  addLegSet(
    group,
    mats,
    [
      [0.06, 0.58, -0.1],
      [0.18, 0.58, 0.1],
    ],
    { radius: 0.04, length: 1.04, material: mats.tusk, core: false, wire: false }
  );
  addCurveTube(
    group,
    [
      [-0.42, 1.44, 0],
      [-0.66, 1.58, 0.08],
      [-0.84, 1.74, 0],
    ],
    mats.bone,
    0.02
  );

  if (usage === "viewer") {
    addVertebrae(
      group,
      [
        [-0.24, 1.12, 0],
        [0.04, 1.42, 0],
        [0.42, 1.76, 0],
        [0.84, 2.04, 0],
      ],
      mats,
      0.021,
      6
    );
    addBand(group, 0.46, 0.012, [0.0, 1.26, 0], [0, Math.PI / 2, 0.1], mats.band, Math.PI * 1.34);
  }

  return group;
}

function buildQuagga(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.SphereGeometry(0.56, 24, 24), mats, [0, 1.22, 0], [0, 0, 0], [1.74, 0.92, 0.76]);
  addOrganicPart(group, new THREE.CapsuleGeometry(0.11, 0.5, 6, 14), mats, [1.0, 1.56, 0], [0, 0, -0.84], [1.08, 1, 1], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.SphereGeometry(0.22, 20, 20), mats, [1.42, 1.76, 0], [0, 0, 0], [1.28, 0.8, 0.86]);
  addOrganicPart(group, new THREE.CapsuleGeometry(0.05, 0.26, 4, 12), mats, [1.72, 1.68, 0], [0, 0, Math.PI / 2], [1.4, 0.78, 0.72], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.ConeGeometry(0.07, 0.18, 12), mats, [1.48, 2.0, -0.1], [-0.08, 0, 0], [0.8, 1, 0.8], {
    material: mats.detail,
  });
  addOrganicPart(group, new THREE.ConeGeometry(0.07, 0.18, 12), mats, [1.48, 2.0, 0.1], [0.08, 0, 0], [0.8, 1, 0.8], {
    material: mats.detail,
  });
  addLegSet(
    group,
    mats,
    [
      [-0.48, 0.5, -0.18],
      [0.28, 0.52, -0.18],
      [-0.48, 0.5, 0.18],
      [0.28, 0.52, 0.18],
    ],
    { radius: 0.055, length: 1.0, material: mats.shellSecondary }
  );
  addCurveTube(
    group,
    [
      [-1.06, 1.24, 0],
      [-1.28, 1.34, 0.02],
      [-1.48, 1.48, 0.02],
    ],
    mats.bone,
    0.026
  );

  if (usage === "viewer") {
    [0.98, 0.64, 0.3, -0.02].forEach((x, index) => {
      addBand(group, 0.24, 0.008, [x, 1.28 + index * 0.04, 0], [0, Math.PI / 2, 0.1], mats.band, Math.PI * 1.08);
    });
    addPart(group, new THREE.BoxGeometry(0.06, 0.48, 0.34), mats.band, [0.7, 1.56, 0]);
  }

  return group;
}

function buildMoa(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.SphereGeometry(0.48, 24, 24), mats, [0, 1.58, 0], [0, 0, 0], [1.04, 1.2, 0.92]);
  addCurveTube(
    group,
    [
      [0.08, 1.98, 0],
      [0.18, 2.42, 0],
      [0.28, 2.82, 0],
    ],
    mats.bone,
    0.08,
    38,
    12
  );
  addOrganicPart(group, new THREE.SphereGeometry(0.18, 18, 18), mats, [0.34, 3.06, 0], [0, 0, 0], [0.92, 0.86, 0.9]);
  addOrganicPart(group, new THREE.ConeGeometry(0.08, 0.24, 12), mats, [0.52, 3.0, 0], [0, 0, -Math.PI / 2], [1.04, 0.6, 0.72], {
    material: mats.tusk,
    core: false,
    wire: false,
  });
  addLegSet(
    group,
    mats,
    [
      [-0.12, 0.84, -0.08],
      [0.12, 0.84, 0.08],
    ],
    { radius: 0.055, length: 1.56, material: mats.tusk, core: false, wire: false }
  );

  if (usage === "viewer") {
    addVertebrae(
      group,
      [
        [-0.04, 1.72, 0],
        [0.1, 2.16, 0],
        [0.22, 2.64, 0],
        [0.34, 3.04, 0],
      ],
      mats,
      0.018,
      6
    );
  }

  return group;
}

function buildAurochs(specimen, usage = "viewer") {
  const group = new THREE.Group();
  const mats = createMaterialSet(specimen, usage);

  addOrganicPart(group, new THREE.SphereGeometry(0.6, 24, 24), mats, [0, 1.24, 0], [0, 0, 0], [1.56, 1, 0.84]);
  addOrganicPart(group, new THREE.SphereGeometry(0.32, 20, 20), mats, [0.38, 1.46, 0], [0, 0, 0], [1.2, 0.88, 0.9], {
    material: mats.shellSecondary,
  });
  addOrganicPart(group, new THREE.SphereGeometry(0.22, 18, 18), mats, [1.02, 1.42, 0], [0, 0, 0], [1.36, 0.8, 0.88]);
  addOrganicPart(group, new THREE.CapsuleGeometry(0.05, 0.26, 4, 12), mats, [1.34, 1.34, 0], [0, 0, Math.PI / 2], [1.4, 0.82, 0.76], {
    material: mats.shellSecondary,
  });
  addPart(group, new THREE.TorusGeometry(0.28, 0.026, 10, 30, Math.PI * 0.82), mats.tusk, [0.98, 1.52, -0.24], [1.04, 0.06, -0.24]);
  addPart(group, new THREE.TorusGeometry(0.28, 0.026, 10, 30, Math.PI * 0.82), mats.tusk, [0.98, 1.52, 0.24], [2.1, -0.06, 0.24]);
  addLegSet(
    group,
    mats,
    [
      [-0.4, 0.56, -0.2],
      [0.06, 0.58, -0.2],
      [-0.4, 0.56, 0.2],
      [0.06, 0.58, 0.2],
    ],
    { radius: 0.07, length: 0.94, material: mats.shellSecondary }
  );
  addCurveTube(
    group,
    [
      [-0.92, 1.24, 0],
      [-1.12, 1.34, 0.02],
      [-1.28, 1.5, 0.04],
    ],
    mats.bone,
    0.026
  );

  if (usage === "viewer") {
    addVertebrae(
      group,
      [
        [-0.66, 1.32, 0],
        [-0.04, 1.38, 0],
        [0.48, 1.46, 0],
        [1.06, 1.42, 0],
      ],
      mats,
      0.022,
      7
    );
  }

  return group;
}

function createGlobeMarker(specimen, index) {
  const marker = new THREE.Group();
  const normal = latLonToVector3(2.08, specimen.anchor.lat, specimen.anchor.lon).normalize();
  marker.position.copy(normal.clone().multiplyScalar(2.18));
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  const standMaterial = new THREE.MeshStandardMaterial({
    color: 0xf7f8fb,
    emissive: new THREE.Color(0xdfe8f6),
    roughness: 0.38,
    metalness: 0.12,
  });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xbcd8ff,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
  });

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.2, 10), standMaterial);
  stand.position.y = 0.1;
  marker.add(stand);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 10, 24), haloMaterial);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.02;
  marker.add(halo);

  const model = createSpecimenModel(specimen, "marker");
  model.scale.setScalar(0.17);
  model.position.y = 0.23;
  model.rotation.y = specimen.markerRotation || 0;
  model.userData.baseY = model.position.y;
  model.userData.offset = index * 0.9;
  marker.add(model);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 16, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.001 })
  );
  hitTarget.position.y = 0.22;
  hitTarget.userData.specimenId = specimen.id;
  marker.add(hitTarget);

  marker.userData = {
    specimenId: specimen.id,
    halo,
    stand,
    model,
    baseScale: 0.17,
  };

  globeState.interactive.push(hitTarget);
  globeState.markers.set(specimen.id, marker);
  return marker;
}

async function initGlobeScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.35, 6.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  els.globeCanvas.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 4.4;
  controls.maxDistance = 8.4;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.42;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  scene.add(new THREE.AmbientLight(0xffffff, 1.55));

  const keyLight = new THREE.DirectionalLight(0xf7fbff, 1.95);
  keyLight.position.set(4.5, 3.5, 5.5);
  scene.add(keyLight);

  const warmLight = new THREE.DirectionalLight(0xe7f0ff, 1.28);
  warmLight.position.set(-4.2, -1.2, 2.6);
  scene.add(warmLight);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const globeTextures = await loadGlobeTextures();
  globeTextures.surface.anisotropy = renderer.capabilities.getMaxAnisotropy();
  globeTextures.oceanFlow.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(2.06, 64, 64),
    new THREE.MeshStandardMaterial({
      map: globeTextures.surface,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.02,
      emissive: new THREE.Color(0xeaf2ff),
      emissiveIntensity: 0.42,
    })
  );
  globeGroup.add(globe);

  const oceanFlowLayer = new THREE.Mesh(
    new THREE.SphereGeometry(2.075, 64, 64),
    new THREE.MeshBasicMaterial({
      map: globeTextures.oceanFlow,
      alphaMap: globeTextures.oceanMask,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0x9fc6ff,
    })
  );
  globeGroup.add(oceanFlowLayer);
  globeState.oceanFlowLayer = oceanFlowLayer;

  const globeGrid = new THREE.Mesh(
    new THREE.SphereGeometry(2.08, 32, 20),
    new THREE.MeshBasicMaterial({
      color: 0x8eaedf,
      wireframe: true,
      transparent: true,
      opacity: 0.26,
    })
  );
  globeGroup.add(globeGrid);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.22, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xe6f1ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    })
  );
  globeGroup.add(atmosphere);

  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xa8c2eb,
      transparent: true,
      opacity: 0.14,
      wireframe: true,
    })
  );
  globeGroup.add(rim);

  const markerLayer = new THREE.Group();
  globeGroup.add(markerLayer);

  SPECIMENS.forEach((specimen, index) => {
    markerLayer.add(createGlobeMarker(specimen, index));
  });

  const pointerDown = { x: 0, y: 0 };

  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerDown.x = event.clientX;
    pointerDown.y = event.clientY;
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    const id = pickMarker(event, renderer, camera);
    state.hoveredId = id;
    renderer.domElement.style.cursor = id ? "pointer" : "grab";
    updateMarkerStates();
  });

  renderer.domElement.addEventListener("click", (event) => {
    const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
    if (moved > 6) {
      return;
    }

    const id = pickMarker(event, renderer, camera);
    if (id) {
      setSelectedSpecimen(id, { openViewer: true });
    }
  });

  globeState.scene = scene;
  globeState.camera = camera;
  globeState.renderer = renderer;
  globeState.controls = controls;
  globeState.ready = true;
  resizeGlobe();
}

function pickMarker(event, renderer, camera) {
  const rect = renderer.domElement.getBoundingClientRect();
  globeState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  globeState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  globeState.raycaster.setFromCamera(globeState.pointer, camera);

  const hits = globeState.raycaster.intersectObjects(globeState.interactive, false);
  return hits[0]?.object.userData.specimenId ?? null;
}

function updateMarkerStates() {
  if (!globeState.ready) {
    return;
  }

  globeState.markers.forEach((marker, id) => {
    const selected = id === state.selectedId;
    const hovered = id === state.hoveredId;
    const scale = selected ? 1.18 : hovered ? 1.08 : 1;

    marker.userData.model.scale.setScalar(marker.userData.baseScale * scale);
    marker.userData.stand.material.emissiveIntensity = selected ? 0.95 : hovered ? 0.52 : 0.22;
    marker.userData.halo.material.opacity = selected ? 0.78 : hovered ? 0.42 : 0.18;
  });
}

function ensureViewerScene() {
  if (viewerState.ready) {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.25, 5.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  els.viewerCanvas.append(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.58;
  controls.minDistance = 3.4;
  controls.maxDistance = 8;
  controls.target.set(0, 1.18, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.14));

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd9e3ef, 1.05);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xf7fbff, 1.95);
  key.position.set(4.2, 5.6, 4.8);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd7e8ff, 1.32);
  fill.position.set(-4.8, 2.6, 2.2);
  scene.add(fill);

  const rim = new THREE.PointLight(0x98c7ff, 1.86, 16, 2);
  rim.position.set(0, 4.2, -2.6);
  scene.add(rim);

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 64),
    new THREE.MeshBasicMaterial({
      color: 0xc6d6ea,
      transparent: true,
      opacity: 0.2,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.scale.set(1.2, 0.76, 1);
  shadowDisc.position.y = -0.04;
  scene.add(shadowDisc);

  const platform = new THREE.Mesh(
    new THREE.RingGeometry(0.98, 1.56, 72),
    new THREE.MeshBasicMaterial({
      color: 0xe7eff9,
      transparent: true,
      opacity: 0.76,
      side: THREE.DoubleSide,
    })
  );
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = 0.01;
  scene.add(platform);

  const scanRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(1.38, 0.016, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0xa3c9ff,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scanRingOuter.rotation.x = -Math.PI / 2;
  scanRingOuter.position.y = 0.08;
  scene.add(scanRingOuter);

  const scanRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.012, 12, 56),
    new THREE.MeshBasicMaterial({
      color: 0xd3e6ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scanRingInner.rotation.x = -Math.PI / 2;
  scanRingInner.position.y = 0.18;
  scene.add(scanRingInner);

  const scanBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.24, 1.42, 4.1, 48, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf4f9ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  scanBeam.position.y = 1.3;
  scene.add(scanBeam);

  const stage = new THREE.Group();
  scene.add(stage);

  viewerState.scene = scene;
  viewerState.camera = camera;
  viewerState.renderer = renderer;
  viewerState.controls = controls;
  viewerState.stage = stage;
  viewerState.scanRingOuter = scanRingOuter;
  viewerState.scanRingInner = scanRingInner;
  viewerState.scanBeam = scanBeam;
  viewerState.shadowDisc = shadowDisc;
  viewerState.ready = true;
  resizeViewer();
}

async function mountViewerModel(specimen) {
  if (!viewerState.ready) {
    return;
  }

  viewerState.mountToken += 1;
  const mountToken = viewerState.mountToken;

  if (viewerState.model) {
    viewerState.stage.remove(viewerState.model);
  }

  const fallbackModel = createSpecimenModel(specimen, "viewer");
  fallbackModel.scale.setScalar(specimen.viewerScale);
  fallbackModel.position.y = 0;
  fallbackModel.rotation.y = specimen.markerRotation || 0;
  viewerState.stage.add(fallbackModel);
  viewerState.model = fallbackModel;

  if (!hasGeneratedAsset(specimen.id)) {
    return;
  }

  const source = await loadSpecimenAsset(specimen.id);
  if (!source || mountToken !== viewerState.mountToken) {
    return;
  }

  const imported = createImportedModel(source, "viewer", specimen);
  viewerState.stage.remove(fallbackModel);
  viewerState.stage.add(imported);
  viewerState.model = imported;
}

function resizeGlobe() {
  if (!globeState.ready) {
    return;
  }

  const rect = els.globeCanvas.getBoundingClientRect();
  globeState.camera.aspect = rect.width / rect.height;
  globeState.camera.updateProjectionMatrix();
  globeState.renderer.setSize(rect.width, rect.height, false);
}

function resizeViewer() {
  if (!viewerState.ready) {
    return;
  }

  const rect = els.viewerCanvas.getBoundingClientRect();
  viewerState.camera.aspect = rect.width / rect.height;
  viewerState.camera.updateProjectionMatrix();
  viewerState.renderer.setSize(rect.width, rect.height, false);
}

function animate() {
  requestAnimationFrame(animate);
  const time = clock.getElapsedTime();

  if (globeState.ready) {
    globeState.controls.update();
    if (globeState.oceanFlowLayer) {
      const oceanFlowTexture = globeState.oceanFlowLayer.material.map;
      oceanFlowTexture.offset.x = (time * 0.018) % 1;
      oceanFlowTexture.offset.y = 0.035 * Math.sin(time * 0.08);
      globeState.oceanFlowLayer.rotation.y = Math.sin(time * 0.04) * 0.03;
    }
    globeState.markers.forEach((marker) => {
      const model = marker.userData.model;
      model.position.y = model.userData.baseY + Math.sin(time * 1.8 + model.userData.offset) * 0.015;
      marker.userData.halo.rotation.z += 0.006;
    });
    globeState.renderer.render(globeState.scene, globeState.camera);
  }

  if (viewerState.ready && state.viewerOpen) {
    viewerState.controls.update();
    if (viewerState.scanRingOuter) {
      viewerState.scanRingOuter.rotation.z = time * 0.24;
    }
    if (viewerState.scanRingInner) {
      viewerState.scanRingInner.rotation.z = -time * 0.3;
    }
    if (viewerState.scanBeam) {
      viewerState.scanBeam.material.opacity = 0.06 + Math.sin(time * 1.2) * 0.014;
    }
    if (viewerState.shadowDisc) {
      viewerState.shadowDisc.material.opacity = 0.18 + Math.sin(time * 1.2) * 0.02;
    }
    if (viewerState.model) {
      viewerState.model.position.y = Math.sin(time * 1.1) * 0.035;
    }
    viewerState.renderer.render(viewerState.scene, viewerState.camera);
  }
}

async function init() {
  await loadAssetManifest();
  buildMarkerLegend();
  bindEvents();
  render();
  await initGlobeScene();
  updateMarkerStates();
  window.__extinctLab = {
    state,
    globeState,
    viewerState,
    setSelectedSpecimen,
  };
  animate();
  window.addEventListener("resize", () => {
    resizeGlobe();
    resizeViewer();
  });
}

await init();
