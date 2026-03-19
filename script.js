import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

const ERA_META = {
  ancient: {
    label: "古代源流",
    short: "古代",
    range: "4-5 世纪",
    color: "#8ad4ff",
    description: "卷轴叙事与人物气韵为东方视觉开场，绘画开始拥有连续的时间。",
  },
  song: {
    label: "宋元山水",
    short: "宋元",
    range: "10-14 世纪",
    color: "#6fe1c4",
    description: "山水从自然变成世界观，画面像一座能容纳行旅与云雾的宇宙剧场。",
  },
  renaissance: {
    label: "文艺复兴",
    short: "文艺复兴",
    range: "15-16 世纪",
    color: "#f2c26d",
    description: "人体、透视与科学观察联手，绘画重新学习怎样组织现实。",
  },
  baroque: {
    label: "巴洛克光焰",
    short: "巴洛克",
    range: "17 世纪",
    color: "#ee8c74",
    description: "戏剧性的明暗与情绪张力，让观者第一次被画面正面撞击。",
  },
  nineteenth: {
    label: "19 世纪转折",
    short: "19 世纪",
    range: "18-19 世纪",
    color: "#79d9ee",
    description: "版画、风景与光色实验汇流，现代视觉的通道开始打开。",
  },
  modern: {
    label: "现代主义裂变",
    short: "现代主义",
    range: "19-20 世纪",
    color: "#f0a360",
    description: "形体被拆解，抽象被发明，个人经验开始成为新的宇宙中心。",
  },
  contemporary: {
    label: "当代沉浸",
    short: "当代",
    range: "20-21 世纪",
    color: "#91dea8",
    description: "空间、装置与日常视角继续扩张绘画与观看的边界。",
  },
};

const RELATION_META = {
  lineage: {
    label: "师承",
    color: "#f1bb63",
    description: "同一条视觉血脉里的继承与延展。",
  },
  influence: {
    label: "影响",
    color: "#70def1",
    description: "跨时代发生作用的显性推动。",
  },
  dialogue: {
    label: "对话",
    color: "#ef8e7b",
    description: "不同画家在形式或观念上的相互照面。",
  },
  motif: {
    label: "共振",
    color: "#89d38b",
    description: "题材、构图、表面处理上的远距离回响。",
  },
};

const POSITION_SCALE = [1.34, 1.18, 1.42];
const ERA_POSITION_OFFSETS = {
  ancient: [-92, 14, -28],
  song: [-46, 26, 92],
  renaissance: [-58, -24, -108],
  baroque: [18, 12, -136],
  nineteenth: [78, -10, 12],
  modern: [126, 18, -24],
  contemporary: [158, 20, 112],
};

const SUPPLEMENTAL_LAYOUTS = {
  ancient: { center: [-256, 26, -8], radiusX: 168, radiusY: 92, radiusZ: 146 },
  song: { center: [-122, 94, 186], radiusX: 154, radiusY: 82, radiusZ: 132 },
  renaissance: { center: [-96, -82, -164], radiusX: 164, radiusY: 94, radiusZ: 152 },
  baroque: { center: [26, 58, -174], radiusX: 148, radiusY: 88, radiusZ: 156 },
  nineteenth: { center: [112, 18, 22], radiusX: 166, radiusY: 92, radiusZ: 154 },
  modern: { center: [248, 34, -36], radiusX: 158, radiusY: 104, radiusZ: 164 },
  contemporary: { center: [298, 26, 154], radiusX: 166, radiusY: 102, radiusZ: 142 },
};

const SUPPLEMENTAL_PAINTER_SEEDS = {
  ancient: [
    { name: "陆探微", latin: "Lu Tanwei", birth: 400, death: 450, region: "中国·南朝", movement: "人物画 / 南朝笔法", works: ["人物故事图", "古贤图稿"] },
    { name: "张僧繇", latin: "Zhang Sengyao", birth: 500, death: 550, region: "中国·南朝梁", movement: "佛教壁画 / 人物画", works: ["梁武帝像", "五星二十八宿神形图"] },
    { name: "展子虔", latin: "Zhan Ziqian", birth: 545, death: 618, region: "中国·隋", movement: "青绿山水 / 早期山水画", works: ["游春图", "山水图稿"] },
    { name: "阎立本", latin: "Yan Liben", birth: 600, death: 673, region: "中国·唐", movement: "人物画 / 宫廷图像", works: ["步辇图", "历代帝王图"] },
    { name: "李思训", latin: "Li Sixun", birth: 651, death: 716, region: "中国·唐", movement: "青绿山水 / 金碧山水", works: ["江帆楼阁图", "山水楼阁图"] },
    { name: "李昭道", latin: "Li Zhaodao", birth: 670, death: 730, region: "中国·唐", movement: "青绿山水 / 山水楼观", works: ["明皇幸蜀图", "春山行旅图"] },
    { name: "王维", latin: "Wang Wei", birth: 699, death: 759, region: "中国·唐", movement: "诗画合一 / 水墨山水", works: ["辋川图", "雪溪图"] },
    { name: "韩干", latin: "Han Gan", birth: 706, death: 783, region: "中国·唐", movement: "鞍马画", works: ["照夜白图", "牧马图"] },
    { name: "周昉", latin: "Zhou Fang", birth: 730, death: 800, region: "中国·唐", movement: "仕女画", works: ["簪花仕女图", "挥扇仕女图"] },
    { name: "张萱", latin: "Zhang Xuan", birth: 713, death: 755, region: "中国·唐", movement: "宫廷仕女图", works: ["虢国夫人游春图", "捣练图"] },
    { name: "顾闳中", latin: "Gu Hongzhong", birth: 910, death: 980, region: "中国·五代南唐", movement: "人物长卷 / 宫廷生活", works: ["韩熙载夜宴图", "宫宴图卷"] },
    { name: "黄筌", latin: "Huang Quan", birth: 903, death: 965, region: "中国·五代后蜀", movement: "工笔花鸟", works: ["写生珍禽图", "花竹图"] },
    { name: "徐熙", latin: "Xu Xi", birth: 886, death: 975, region: "中国·五代南唐", movement: "没骨花鸟 / 野逸花卉", works: ["雪竹图", "玉堂富贵图"] },
    { name: "荆浩", latin: "Jing Hao", birth: 850, death: 911, region: "中国·五代", movement: "北方山水 / 笔法论", works: ["匡庐图", "笔法记"] },
    { name: "关仝", latin: "Guan Tong", birth: 906, death: 960, region: "中国·五代", movement: "关陕山水", works: ["关山行旅图", "秋山晚翠图"] },
    { name: "董源", latin: "Dong Yuan", birth: 934, death: 962, region: "中国·五代南唐", movement: "江南山水", works: ["潇湘图", "夏景山口待渡图"] },
    { name: "巨然", latin: "Juran", birth: 960, death: 995, region: "中国·北宋", movement: "江南僧人山水", works: ["层岩丛树图", "秋山问道图"] },
    { name: "李成", latin: "Li Cheng", birth: 919, death: 967, region: "中国·北宋", movement: "寒林平远山水", works: ["读碑窠石图", "晴峦萧寺图"] },
  ],
  song: [
    { name: "李公麟", latin: "Li Gonglin", birth: 1049, death: 1106, region: "中国·北宋", movement: "白描人物 / 古画研究", works: ["五马图", "维摩演教图"] },
    { name: "米芾", latin: "Mi Fu", birth: 1051, death: 1107, region: "中国·北宋", movement: "米点山水 / 书画鉴藏", works: ["珊瑚帖", "多景楼诗帖"] },
    { name: "米友仁", latin: "Mi Youren", birth: 1074, death: 1153, region: "中国·南宋", movement: "米家云山", works: ["潇湘奇观图", "云山图"] },
    { name: "赵佶", latin: "Emperor Huizong of Song", birth: 1082, death: 1135, region: "中国·北宋", movement: "院体花鸟 / 瘦金体", works: ["瑞鹤图", "听琴图"] },
    { name: "马远", latin: "Ma Yuan", birth: 1160, death: 1225, region: "中国·南宋", movement: "边角山水", works: ["踏歌图", "寒江独钓图"] },
    { name: "夏圭", latin: "Xia Gui", birth: 1180, death: 1224, region: "中国·南宋", movement: "水墨山水", works: ["溪山清远图", "山水十二景"] },
    { name: "梁楷", latin: "Liang Kai", birth: 1140, death: 1210, region: "中国·南宋", movement: "减笔人物 / 禅画", works: ["泼墨仙人图", "六祖截竹图"] },
    { name: "陈容", latin: "Chen Rong", birth: 1200, death: 1266, region: "中国·南宋", movement: "墨龙图", works: ["九龙图", "云龙图"] },
    { name: "钱选", latin: "Qian Xuan", birth: 1235, death: 1305, region: "中国·元", movement: "花鸟与山水 / 文人画", works: ["王羲之观鹅图", "浮玉山居图"] },
    { name: "倪瓒", latin: "Ni Zan", birth: 1301, death: 1374, region: "中国·元", movement: "疏林平远 / 元四家", works: ["容膝斋图", "渔庄秋霁图"] },
    { name: "吴镇", latin: "Wu Zhen", birth: 1280, death: 1354, region: "中国·元", movement: "渔父题材 / 墨竹山水", works: ["渔父图", "双桧平远图"] },
    { name: "王蒙", latin: "Wang Meng", birth: 1308, death: 1385, region: "中国·元", movement: "密体山水 / 元四家", works: ["青卞隐居图", "葛稚川移居图"] },
    { name: "唐棣", latin: "Tang Di", birth: 1296, death: 1364, region: "中国·元", movement: "文人山水", works: ["携琴访友图", "秋林读书图"] },
    { name: "王诜", latin: "Wang Shen", birth: 1036, death: 1093, region: "中国·北宋", movement: "青绿山水 / 文人士大夫画", works: ["烟江叠嶂图", "渔村小雪图"] },
    { name: "李唐", latin: "Li Tang", birth: 1066, death: 1150, region: "中国·南宋", movement: "院体山水 / 斧劈皴", works: ["万壑松风图", "采薇图"] },
    { name: "苏汉臣", latin: "Su Hanchen", birth: 1094, death: 1172, region: "中国·南宋", movement: "儿童题材 / 风俗画", works: ["秋庭戏婴图", "五瑞图"] },
  ],
  renaissance: [
    { name: "马萨乔", latin: "Masaccio", birth: 1401, death: 1428, region: "意大利", movement: "早期文艺复兴 / 透视与体积", works: ["圣三位一体", "逐出伊甸园"] },
    { name: "安杰利科修士", latin: "Fra Angelico", birth: 1395, death: 1455, region: "意大利", movement: "宗教壁画 / 早期文艺复兴", works: ["天使报喜", "圣马可修道院壁画"] },
    { name: "皮耶罗·德拉·弗朗切斯卡", latin: "Piero della Francesca", birth: 1415, death: 1492, region: "意大利", movement: "几何透视 / 静穆人物", works: ["基督受洗", "基督鞭笞"] },
    { name: "保罗·乌切洛", latin: "Paolo Uccello", birth: 1397, death: 1475, region: "意大利", movement: "透视实验 / 战争场面", works: ["圣罗马诺之战", "夜猎图"] },
    { name: "安德烈亚·曼特尼亚", latin: "Andrea Mantegna", birth: 1431, death: 1506, region: "意大利", movement: "透视缩短 / 古典主义", works: ["死去的基督", "婚礼室壁画"] },
    { name: "乔瓦尼·贝利尼", latin: "Giovanni Bellini", birth: 1430, death: 1516, region: "意大利·威尼斯", movement: "威尼斯画派先驱", works: ["众神的盛宴", "圣弗朗西斯在沙漠中"] },
    { name: "扬·凡·艾克", latin: "Jan van Eyck", birth: 1390, death: 1441, region: "尼德兰", movement: "北方文艺复兴 / 油画", works: ["阿尔诺芬尼夫妇像", "根特祭坛画"] },
    { name: "阿尔布雷希特·丢勒", latin: "Albrecht Durer", birth: 1471, death: 1528, region: "德意志", movement: "版画 / 北方文艺复兴", works: ["兔子", "忧郁 I"] },
    { name: "乔尔乔内", latin: "Giorgione", birth: 1477, death: 1510, region: "意大利·威尼斯", movement: "诗意风景 / 威尼斯画派", works: ["暴风雨", "沉睡的维纳斯"] },
    { name: "科雷乔", latin: "Correggio", birth: 1489, death: 1534, region: "意大利", movement: "柔光人体 / 穹顶幻象", works: ["牧羊人朝拜", "木星与伊俄"] },
    { name: "丁托列托", latin: "Tintoretto", birth: 1518, death: 1594, region: "意大利·威尼斯", movement: "晚期威尼斯画派 / 动势构图", works: ["天堂", "最后的晚餐"] },
    { name: "埃尔·格列柯", latin: "El Greco", birth: 1541, death: 1614, region: "西班牙", movement: "样式主义 / 拉长人体", works: ["奥尔加斯伯爵的葬礼", "拉奥孔"] },
    { name: "小汉斯·荷尔拜因", latin: "Hans Holbein the Younger", birth: 1497, death: 1543, region: "德意志 / 英国", movement: "宫廷肖像", works: ["大使们", "亨利八世像"] },
    { name: "佩鲁吉诺", latin: "Perugino", birth: 1446, death: 1523, region: "意大利", movement: "乌姆布里亚画派", works: ["把钥匙交给圣彼得", "圣塞巴斯蒂安"] },
    { name: "韦罗基奥", latin: "Andrea del Verrocchio", birth: 1435, death: 1488, region: "意大利", movement: "工作坊传统 / 人物画", works: ["基督受洗", "抱花圣母"] },
  ],
  baroque: [
    { name: "彼得·保罗·鲁本斯", latin: "Peter Paul Rubens", birth: 1577, death: 1640, region: "佛兰德斯", movement: "巴洛克 / 动势与肉身", works: ["劫夺留西帕斯的女儿", "玛丽·德·美第奇组画"] },
    { name: "安东尼·凡·戴克", latin: "Anthony van Dyck", birth: 1599, death: 1641, region: "佛兰德斯 / 英国", movement: "宫廷肖像", works: ["查理一世骑马像", "自画像"] },
    { name: "迭戈·委拉斯开兹", latin: "Diego Velazquez", birth: 1599, death: 1660, region: "西班牙", movement: "宫廷肖像 / 空间观看", works: ["宫娥", "教皇英诺森十世肖像"] },
    { name: "弗兰斯·哈尔斯", latin: "Frans Hals", birth: 1582, death: 1666, region: "荷兰", movement: "肖像画 / 笔触活力", works: ["笑骑士", "圣乔治市民卫队宴会"] },
    { name: "阿尔泰米西亚·真蒂莱斯基", latin: "Artemisia Gentileschi", birth: 1593, death: 1653, region: "意大利", movement: "巴洛克 / 女性英雄题材", works: ["朱迪斯斩杀赫罗弗尼斯", "自画像作为绘画寓言"] },
    { name: "尼古拉·普桑", latin: "Nicolas Poussin", birth: 1594, death: 1665, region: "法国", movement: "古典巴洛克 / 历史画", works: ["阿卡迪亚的牧人", "萨宾妇女被掳"] },
    { name: "克劳德·洛兰", latin: "Claude Lorrain", birth: 1600, death: 1682, region: "法国 / 罗马", movement: "理想风景", works: ["海港日出", "与以撒和利百加的婚礼风景"] },
    { name: "何塞·德·里贝拉", latin: "Jusepe de Ribera", birth: 1591, death: 1652, region: "西班牙 / 那不勒斯", movement: "暗色写实 / 宗教苦难", works: ["圣巴多罗买殉难", "跛童"] },
    { name: "乔治·德·拉·图尔", latin: "Georges de La Tour", birth: 1593, death: 1652, region: "法国", movement: "烛光场景 / 静夜宗教画", works: ["新生儿", "抹大拉的马利亚与夜灯"] },
    { name: "巴托洛梅·牟利罗", latin: "Bartolome Esteban Murillo", birth: 1617, death: 1682, region: "西班牙", movement: "宗教与街头儿童", works: ["无原罪受胎", "吃葡萄和甜瓜的孩子"] },
    { name: "安尼巴莱·卡拉奇", latin: "Annibale Carracci", birth: 1560, death: 1609, region: "意大利", movement: "博洛尼亚学院派", works: ["吃豆子的人", "法尔内塞画廊壁画"] },
    { name: "圭多·雷尼", latin: "Guido Reni", birth: 1575, death: 1642, region: "意大利", movement: "理想化宗教人物", works: ["无辜者的屠杀", "阿塔兰塔与希波墨涅斯"] },
    { name: "萨尔瓦托尔·罗萨", latin: "Salvator Rosa", birth: 1615, death: 1673, region: "意大利", movement: "风暴风景 / 浪漫先声", works: ["巫术", "海湾景色"] },
    { name: "扬·斯汀", latin: "Jan Steen", birth: 1626, death: 1679, region: "荷兰", movement: "风俗画", works: ["圣尼古拉斯节", "欢乐家庭"] },
    { name: "拉谢尔·鲁伊施", latin: "Rachel Ruysch", birth: 1664, death: 1750, region: "荷兰", movement: "花卉静物", works: ["花束静物", "桌上花卉"] },
    { name: "朱塞佩·阿尔钦博托", latin: "Giuseppe Arcimboldo", birth: 1526, death: 1593, region: "意大利", movement: "怪诞肖像 / 四季主题", works: ["四季", "图书管理员"] },
    { name: "威廉·霍加斯", latin: "William Hogarth", birth: 1697, death: 1764, region: "英国", movement: "叙事组画 / 讽刺画", works: ["时髦婚姻", "妓女生涯"] },
  ],
  nineteenth: [
    { name: "欧仁·德拉克罗瓦", latin: "Eugene Delacroix", birth: 1798, death: 1863, region: "法国", movement: "浪漫主义 / 色彩激情", works: ["自由引导人民", "萨达纳帕卢斯之死"] },
    { name: "泰奥多尔·籍里柯", latin: "Theodore Gericault", birth: 1791, death: 1824, region: "法国", movement: "浪漫主义 / 动荡现实", works: ["梅杜萨之筏", "军官猎骑图"] },
    { name: "安格尔", latin: "Jean-Auguste-Dominique Ingres", birth: 1780, death: 1867, region: "法国", movement: "新古典主义 / 线条", works: ["大宫女", "土耳其浴室"] },
    { name: "让-弗朗索瓦·米勒", latin: "Jean-Francois Millet", birth: 1814, death: 1875, region: "法国", movement: "巴比松派 / 农民题材", works: ["拾穗者", "晚钟"] },
    { name: "古斯塔夫·库尔贝", latin: "Gustave Courbet", birth: 1819, death: 1877, region: "法国", movement: "现实主义", works: ["石工", "画室"] },
    { name: "卡米耶·柯罗", latin: "Camille Corot", birth: 1796, death: 1875, region: "法国", movement: "风景画 / 巴比松派", works: ["莫特枫丹的回忆", "蓝衣女子"] },
    { name: "爱德华·马奈", latin: "Edouard Manet", birth: 1832, death: 1883, region: "法国", movement: "现代生活 / 印象派前驱", works: ["草地上的午餐", "奥林匹亚"] },
    { name: "埃德加·德加", latin: "Edgar Degas", birth: 1834, death: 1917, region: "法国", movement: "舞者 / 都市视角", works: ["舞蹈课", "苦艾酒"] },
    { name: "贝尔特·莫里索", latin: "Berthe Morisot", birth: 1841, death: 1895, region: "法国", movement: "印象派 / 女性与家庭", works: ["摇篮", "夏日"] },
    { name: "玛丽·卡萨特", latin: "Mary Cassatt", birth: 1844, death: 1926, region: "美国 / 法国", movement: "印象派 / 母子题材", works: ["浴后的孩子", "蓝色扶手椅中的小女孩"] },
    { name: "卡米耶·毕沙罗", latin: "Camille Pissarro", birth: 1830, death: 1903, region: "法国", movement: "印象派 / 城市与乡村", works: ["蒙马特大道", "红屋顶"] },
    { name: "阿尔弗雷德·西斯莱", latin: "Alfred Sisley", birth: 1839, death: 1899, region: "法国 / 英国", movement: "风景印象派", works: ["塞纳河畔洪水", "卢浮西安雪景"] },
    { name: "乔治·修拉", latin: "Georges Seurat", birth: 1859, death: 1891, region: "法国", movement: "点彩派", works: ["大碗岛星期天的下午", "马戏团"] },
    { name: "保罗·西涅克", latin: "Paul Signac", birth: 1863, death: 1935, region: "法国", movement: "新印象主义 / 色点航海", works: ["马赛港口", "圣特罗佩松树"] },
    { name: "詹姆斯·惠斯勒", latin: "James McNeill Whistler", birth: 1834, death: 1903, region: "美国 / 英国", movement: "唯美主义 / 夜曲", works: ["灰与黑的安排：画家之母", "黑与金的夜曲"] },
  ],
  modern: [
    { name: "爱德华·蒙克", latin: "Edvard Munch", birth: 1863, death: 1944, region: "挪威", movement: "表现主义 / 心理图像", works: ["呐喊", "病中的孩子"] },
    { name: "阿梅代奥·莫迪利阿尼", latin: "Amedeo Modigliani", birth: 1884, death: 1920, region: "意大利 / 法国", movement: "肖像与裸女 / 细长造型", works: ["扶手椅上的裸女", "珍妮·艾布特恩像"] },
    { name: "卡济米尔·马列维奇", latin: "Kazimir Malevich", birth: 1879, death: 1935, region: "俄罗斯", movement: "至上主义 / 几何抽象", works: ["黑方块", "白上之白"] },
    { name: "皮特·蒙德里安", latin: "Piet Mondrian", birth: 1872, death: 1944, region: "荷兰", movement: "新造型主义", works: ["百老汇爵士乐", "红黄蓝构成"] },
    { name: "保罗·克利", latin: "Paul Klee", birth: 1879, death: 1940, region: "瑞士 / 德国", movement: "抽象诗性 / 包豪斯", works: ["推拿索斯山", "金鱼"] },
    { name: "埃贡·席勒", latin: "Egon Schiele", birth: 1890, death: 1918, region: "奥地利", movement: "表现主义 / 身体线条", works: ["抱膝的自画像", "死神与少女"] },
    { name: "胡安·米罗", latin: "Joan Miro", birth: 1893, death: 1983, region: "西班牙", movement: "超现实主义 / 符号抽象", works: ["哈勒昆的狂欢", "蓝色三联作"] },
    { name: "马克·夏加尔", latin: "Marc Chagall", birth: 1887, death: 1985, region: "白俄罗斯 / 法国", movement: "梦境叙事 / 色彩象征", works: ["我与村庄", "生日"] },
    { name: "爱德华·霍普", latin: "Edward Hopper", birth: 1882, death: 1967, region: "美国", movement: "都市孤独 / 现实场景", works: ["夜游者", "早晨的阳光"] },
    { name: "费尔南·莱热", latin: "Fernand Leger", birth: 1881, death: 1955, region: "法国", movement: "机械时代 / 立体主义后续", works: ["城市", "三个女人"] },
  ],
  contemporary: [
    { name: "杰克逊·波洛克", latin: "Jackson Pollock", birth: 1912, death: 1956, region: "美国", movement: "抽象表现主义 / 滴画", works: ["秋韵", "第 5 号"] },
    { name: "威廉·德·库宁", latin: "Willem de Kooning", birth: 1904, death: 1997, region: "荷兰 / 美国", movement: "抽象表现主义 / 女性系列", works: ["女人 I", "挖掘"] },
    { name: "马克·罗斯科", latin: "Mark Rothko", birth: 1903, death: 1970, region: "美国", movement: "色域绘画", works: ["橙与黄", "罗斯科礼拜堂组画"] },
    { name: "弗朗西斯·培根", latin: "Francis Bacon", birth: 1909, death: 1992, region: "英国", movement: "形体扭曲 / 存在焦虑", works: ["教皇英诺森十世后的习作", "三联画"] },
    { name: "卢西安·弗洛伊德", latin: "Lucian Freud", birth: 1922, death: 2011, region: "英国", movement: "厚涂肖像 / 肉身观察", works: ["睡着的救济金管理员", "艺术家的母亲"] },
    { name: "安迪·沃霍尔", latin: "Andy Warhol", birth: 1928, death: 1987, region: "美国", movement: "波普艺术 / 图像复制", works: ["金宝汤罐头", "玛丽莲双联画"] },
    { name: "罗伊·利希滕斯坦", latin: "Roy Lichtenstein", birth: 1923, death: 1997, region: "美国", movement: "波普艺术 / 漫画语言", works: ["Whaam!", "沉睡的女孩"] },
    { name: "格哈德·里希特", latin: "Gerhard Richter", birth: 1932, death: null, region: "德国", movement: "照片绘画 / 抽象刮擦", works: ["贝蒂", "抽象画 809-4"] },
    { name: "赛·托姆布雷", latin: "Cy Twombly", birth: 1928, death: 2011, region: "美国", movement: "书写性抽象", works: ["勒达与天鹅", "无题黑板画"] },
    { name: "让-米歇尔·巴斯奎特", latin: "Jean-Michel Basquiat", birth: 1960, death: 1988, region: "美国", movement: "街头语言 / 新表现主义", works: ["无题（头骨）", "角斗士"] },
    { name: "奈良美智", latin: "Yoshitomo Nara", birth: 1959, death: null, region: "日本", movement: "当代绘画 / 孤独童像", works: ["刀背后的女孩", "梦游室"] },
    { name: "村上隆", latin: "Takashi Murakami", birth: 1962, death: null, region: "日本", movement: "超扁平 / 流行图像", works: ["727", "花球"] },
    { name: "曾梵志", latin: "Zeng Fanzhi", birth: 1964, death: null, region: "中国", movement: "面具系列 / 当代人物画", works: ["面具系列", "最后的晚餐"] },
    { name: "刘小东", latin: "Liu Xiaodong", birth: 1963, death: null, region: "中国", movement: "现场绘画 / 现实人物", works: ["三峡移民", "温床"] },
    { name: "刘野", latin: "Liu Ye", birth: 1964, death: null, region: "中国", movement: "童话冷感 / 平面肖像", works: ["北京圣母", "蓝衣人"] },
    { name: "塞西莉·布朗", latin: "Cecily Brown", birth: 1969, death: null, region: "英国 / 美国", movement: "动作绘画 / 感官图像", works: ["The Girl Who Had Everything", "Saboteur Four Times"] },
    { name: "彼得·多伊格", latin: "Peter Doig", birth: 1959, death: null, region: "苏格兰 / 加拿大", movement: "当代风景 / 记忆图像", works: ["白独木舟", "沼泽中的建筑"] },
  ],
};

function buildSupplementalPainters() {
  return Object.entries(SUPPLEMENTAL_PAINTER_SEEDS).flatMap(([eraId, seeds]) =>
    seeds.map((seed, index) => createSupplementalPainter(seed, eraId, index, seeds.length))
  );
}

function createSupplementalPainter(seed, eraId, index, total) {
  const position = generateSupplementalPosition(eraId, index, total);
  const displayWorks = (seed.works || ["代表作待补充"]).slice(0, 2).map((work) =>
    typeof work === "string"
      ? {
          title: work,
          year: `${seed.birth}-${seed.death ?? "至今"} 年间`,
          museum: "馆藏待补",
          note: `${seed.name} 的代表作品条目，后续可以继续补充作品页与高清图像。`,
        }
      : {
          title: work.title,
          pageTitle: work.pageTitle,
          year: work.year || `${seed.birth}-${seed.death ?? "至今"} 年间`,
          museum: work.museum || "馆藏待补",
          note:
            work.note ||
            `${seed.name} 的代表作品条目，后续可以继续补充作品页与高清图像。`,
        }
  );

  return {
    id: slugifyPainterId(seed.latin || seed.name),
    name: seed.name,
    latin: seed.latin,
    wikiTitle: seed.latin || seed.name,
    birth: seed.birth,
    death: seed.death,
    eraId,
    region: seed.region,
    movement: seed.movement,
    position,
    blurb:
      seed.blurb ||
      `${seed.name}把 ${seed.movement.replace(/\s*\/\s*/g, "与")} 带进了这条时代支流，让这颗星在 ${seed.region} 的轨道上持续发亮。`,
    curatorNote:
      seed.curatorNote ||
      `这位画家是 ${seed.region} 这条支线里的关键节点，能把 ${seed.movement.replace(/\s*\/\s*/g, "、")} 串进更大的艺术网络。`,
    aliases: [seed.region, seed.movement, ...displayWorks.map((work) => work.title)],
    works: displayWorks,
  };
}

function generateSupplementalPosition(eraId, index, total) {
  const layout = SUPPLEMENTAL_LAYOUTS[eraId];
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + (index % 3) * 0.18;
  const ring = 0.58 + ((index % 5) / 5) * 0.52;
  const verticalWave = Math.sin(angle * 1.7 + index * 0.35);

  return [
    layout.center[0] + Math.cos(angle) * layout.radiusX * ring,
    layout.center[1] + verticalWave * layout.radiusY + (index % 4) * 5 - 8,
    layout.center[2] + Math.sin(angle) * layout.radiusZ * ring,
  ];
}

function slugifyPainterId(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PAINTERS = [
  {
    id: "gu-kaizhi",
    name: "顾恺之",
    latin: "Gu Kaizhi",
    wikiTitle: "Gu Kaizhi",
    birth: 344,
    death: 406,
    eraId: "ancient",
    region: "中国·东晋",
    movement: "人物长卷 / 早期文人绘画",
    position: [-210, 72, -126],
    blurb: "他用游丝般的线条，让人物、叙事与心理节奏在一张长卷里同时发生，是东方绘画宇宙里极早的起点。",
    curatorNote: "如果把这张星图看作一条河，顾恺之是最早让河水带着人物情绪一起流动的人。",
    aliases: ["东晋", "人物画", "长卷", "Admonitions Scroll"],
    works: [
      {
        title: "女史箴图",
        pageTitle: "Admonitions Scroll",
        year: "4-5 世纪摹本",
        museum: "大英博物馆",
        note: "把道德叙事变成流动的镜头语言，线条像呼吸一样轻。",
      },
      {
        title: "洛神赋图",
        pageTitle: "Nymph of the Luo River",
        year: "东晋题材",
        museum: "北京故宫博物院藏摹本",
        note: "人物与山水被排成一段连续运动的诗。",
      },
      {
        title: "列女仁智图",
        pageTitle: "Wise and Benevolent Women",
        year: "东晋题材",
        museum: "故宫博物院",
        note: "女性德行故事被处理成安静而复杂的目光系统。",
      },
    ],
  },
  {
    id: "fan-kuan",
    name: "范宽",
    latin: "Fan Kuan",
    wikiTitle: "Fan Kuan",
    birth: 950,
    death: 1032,
    eraId: "song",
    region: "中国·北宋",
    movement: "巨碑山水",
    position: [-168, 112, 34],
    blurb: "他的山不是景，而是秩序本身。人在画里只是一个尺度单位，宇宙才是真正的主角。",
    curatorNote: "范宽把山水画从观看对象，推成一种足以吞没人类的空间结构。",
    aliases: ["北宋", "山水", "Travelers among Mountains and Streams"],
    works: [
      {
        title: "溪山行旅图",
        pageTitle: "Travelers among Mountains and Streams",
        year: "约 1000 年",
        museum: "台北故宫博物院",
        note: "近乎垂直拔起的山体，把观看变成仰望。",
      },
      {
        title: "雪景寒林图",
        pageTitle: "Snow Scene",
        year: "传为北宋",
        museum: "待补馆藏",
        note: "寒林与雪气把距离感拉成一层又一层气候。",
      },
    ],
  },
  {
    id: "guo-xi",
    name: "郭熙",
    latin: "Guo Xi",
    wikiTitle: "Guo Xi",
    birth: 1000,
    death: 1090,
    eraId: "song",
    region: "中国·北宋",
    movement: "三远法 / 宫廷山水",
    position: [-138, 58, 126],
    blurb: "他把山水拆成高远、深远、平远三种观看法，像在给空间写一套新的语法。",
    curatorNote: "郭熙的价值，不只是画山，而是重新定义观者如何在画中移动。",
    aliases: ["Early Spring", "北宋", "三远法", "山水"],
    works: [
      {
        title: "早春图",
        pageTitle: "Early Spring (painting)",
        year: "1072 年",
        museum: "台北故宫博物院",
        note: "春气被绘成一种刚刚苏醒的湿润空气。",
      },
      {
        title: "树色平远图",
        pageTitle: "Old Trees, Level Distance",
        year: "北宋",
        museum: "大都会艺术博物馆",
        note: "远景不靠透视，而靠气脉与层次递进。",
      },
    ],
  },
  {
    id: "leonardo",
    name: "列奥纳多·达·芬奇",
    latin: "Leonardo da Vinci",
    wikiTitle: "Leonardo da Vinci",
    birth: 1452,
    death: 1519,
    eraId: "renaissance",
    region: "意大利",
    movement: "高文艺复兴 / 科学观察",
    position: [-120, -72, -96],
    blurb: "达·芬奇把绘画、解剖、机械和光学塞进同一个头脑，画面因此有了科学的厚度。",
    curatorNote: "他让绘画不只解释肉眼，而是解释世界是如何被看见的。",
    aliases: ["Mona Lisa", "The Last Supper", "文艺复兴", "解剖"],
    works: [
      {
        title: "蒙娜丽莎",
        pageTitle: "Mona Lisa",
        year: "约 1503-1506 年",
        museum: "卢浮宫",
        note: "暧昧的表情和烟雾般的过渡，改写了肖像画的心理密度。",
      },
      {
        title: "最后的晚餐",
        pageTitle: "The Last Supper (Leonardo)",
        year: "1495-1498 年",
        museum: "圣玛利亚感恩修道院",
        note: "透视、戏剧与瞬间情绪，被压缩到一张长桌上。",
      },
      {
        title: "维特鲁威人",
        pageTitle: "Vitruvian Man",
        year: "约 1490 年",
        museum: "威尼斯学院美术馆",
        note: "人体与几何重新建立契约，成为文艺复兴的视觉宣言。",
      },
    ],
  },
  {
    id: "michelangelo",
    name: "米开朗基罗",
    latin: "Michelangelo",
    wikiTitle: "Michelangelo",
    birth: 1475,
    death: 1564,
    eraId: "renaissance",
    region: "意大利",
    movement: "高文艺复兴 / 巨构人体",
    position: [-94, -18, -154],
    blurb: "他的身体像被岩石雕出来，哪怕出现在壁画里，也始终带着雕塑般的重量。",
    curatorNote: "米开朗基罗把人体推到近乎宇宙尺度，使身体本身成为一种建筑。",
    aliases: ["The Creation of Adam", "David", "西斯廷礼拜堂"],
    works: [
      {
        title: "创造亚当",
        pageTitle: "The Creation of Adam",
        year: "约 1512 年",
        museum: "西斯廷礼拜堂",
        note: "一个手指的距离，撑开了整部西方艺术史最著名的张力。",
      },
      {
        title: "大卫",
        pageTitle: "David (Michelangelo)",
        year: "1501-1504 年",
        museum: "佛罗伦萨学院美术馆",
        note: "理想人体被雕成一种临战前的心理状态。",
      },
      {
        title: "最后的审判",
        pageTitle: "The Last Judgment (Michelangelo)",
        year: "1536-1541 年",
        museum: "西斯廷礼拜堂",
        note: "人体涌成风暴，整面墙都在失重。",
      },
    ],
  },
  {
    id: "raphael",
    name: "拉斐尔",
    latin: "Raphael",
    wikiTitle: "Raphael",
    birth: 1483,
    death: 1520,
    eraId: "renaissance",
    region: "意大利",
    movement: "高文艺复兴 / 和谐构图",
    position: [-70, 54, -68],
    blurb: "他善于把复杂思想整理成清晰、优雅且具有公共性的视觉空间。",
    curatorNote: "拉斐尔的天赋，是让观念在构图中看起来像天生就该如此。",
    aliases: ["The School of Athens", "Sistine Madonna", "圣母像"],
    works: [
      {
        title: "雅典学院",
        pageTitle: "The School of Athens",
        year: "1509-1511 年",
        museum: "梵蒂冈宫",
        note: "思想史被编排成一个完美对称而持续流动的大厅。",
      },
      {
        title: "西斯廷圣母",
        pageTitle: "Sistine Madonna",
        year: "1512-1513 年",
        museum: "德累斯顿历代大师画廊",
        note: "神圣感与亲近感被压缩到一幅几乎悬浮的圣母像里。",
      },
      {
        title: "基督变容",
        pageTitle: "Transfiguration (Raphael)",
        year: "1516-1520 年",
        museum: "梵蒂冈博物馆",
        note: "上下两段场景彼此点燃，像一幅将临界爆发的剧场。",
      },
    ],
  },
  {
    id: "caravaggio",
    name: "卡拉瓦乔",
    latin: "Caravaggio",
    wikiTitle: "Caravaggio",
    birth: 1571,
    death: 1610,
    eraId: "baroque",
    region: "意大利",
    movement: "巴洛克 / 明暗对照法",
    position: [-26, 100, -124],
    blurb: "他让光像刀一样切进黑暗，使宗教题材突然拥有街头和现实的温度。",
    curatorNote: "卡拉瓦乔把神迹从天上拽到桌边，巴洛克由此变得危险而真实。",
    aliases: ["The Calling of St Matthew", "Judith Beheading Holofernes", "明暗对照"],
    works: [
      {
        title: "圣马太蒙召",
        pageTitle: "The Calling of St Matthew",
        year: "1599-1600 年",
        museum: "圣路易吉教堂",
        note: "一道斜射光，把凡俗场景直接翻译成神启。",
      },
      {
        title: "朱迪斯斩首霍洛费尔内斯",
        pageTitle: "Judith Beheading Holofernes (Caravaggio)",
        year: "约 1599 年",
        museum: "罗马国立古代艺术美术馆",
        note: "血、布料和面部表情同时进入最戏剧化的临界点。",
      },
      {
        title: "水果篮",
        pageTitle: "Basket of Fruit (Caravaggio)",
        year: "约 1599 年",
        museum: "安博罗斯美术馆",
        note: "静物被画出即将腐败的时间感。",
      },
    ],
  },
  {
    id: "rembrandt",
    name: "伦勃朗",
    latin: "Rembrandt",
    wikiTitle: "Rembrandt",
    birth: 1606,
    death: 1669,
    eraId: "baroque",
    region: "荷兰",
    movement: "巴洛克 / 光影心理学",
    position: [10, 22, -172],
    blurb: "他的光从来不只是照亮对象，而是在揭开人物的内心重量。",
    curatorNote: "伦勃朗把明暗变成一种心理学，让肖像不再只是面孔。",
    aliases: ["The Night Watch", "The Return of the Prodigal Son", "荷兰黄金时代"],
    works: [
      {
        title: "夜巡",
        pageTitle: "The Night Watch",
        year: "1642 年",
        museum: "阿姆斯特丹国立博物馆",
        note: "群像被打散成运动中的光影事件。",
      },
      {
        title: "杜普医生的解剖课",
        pageTitle: "The Anatomy Lesson of Dr. Nicolaes Tulp",
        year: "1632 年",
        museum: "毛里茨之家",
        note: "知识与表演在一张解剖台旁相遇。",
      },
      {
        title: "浪子回头",
        pageTitle: "The Return of the Prodigal Son (Rembrandt)",
        year: "约 1669 年",
        museum: "冬宫博物馆",
        note: "光被压得很低，情感却被推得很深。",
      },
    ],
  },
  {
    id: "hokusai",
    name: "葛饰北斋",
    latin: "Katsushika Hokusai",
    wikiTitle: "Hokusai",
    birth: 1760,
    death: 1849,
    eraId: "nineteenth",
    region: "日本",
    movement: "浮世绘 / 风景版画",
    position: [26, -116, 18],
    blurb: "北斋用版画把海浪、风和山峰变成可以大规模传播的视觉节奏，改变了西方现代绘画的眼睛。",
    curatorNote: "他既属于江户，也属于巴黎。很多现代绘画的敏感度，都从北斋这里获得过一次重新校准。",
    aliases: ["The Great Wave off Kanagawa", "浮世绘", "富岳三十六景"],
    works: [
      {
        title: "神奈川冲浪里",
        pageTitle: "The Great Wave off Kanagawa",
        year: "约 1831 年",
        museum: "多馆藏",
        note: "浪尖像爪子一样弯下去，富士山被压成远处的一枚钉子。",
      },
      {
        title: "凯风快晴",
        pageTitle: "Fine Wind, Clear Morning",
        year: "约 1831 年",
        museum: "多馆藏",
        note: "一座山在不同天气里拥有不同性格。",
      },
      {
        title: "甲州石班泽",
        pageTitle: "Kajikazawa in Kai Province",
        year: "约 1830-1832 年",
        museum: "多馆藏",
        note: "人物与自然被织进同一条版画曲线。",
      },
    ],
  },
  {
    id: "turner",
    name: "透纳",
    latin: "J. M. W. Turner",
    wikiTitle: "J. M. W. Turner",
    birth: 1775,
    death: 1851,
    eraId: "nineteenth",
    region: "英国",
    movement: "浪漫主义 / 光色风景",
    position: [58, -44, -30],
    blurb: "他不断把对象溶解进气候和光里，直到风景几乎只剩运动的痕迹。",
    curatorNote: "透纳是印象派之前那道真正的闪电，很多后来者都是在他的眩光里睁眼。",
    aliases: ["The Fighting Temeraire", "Rain, Steam and Speed", "浪漫主义"],
    works: [
      {
        title: "战舰无畏号的最后航程",
        pageTitle: "The Fighting Temeraire",
        year: "1839 年",
        museum: "英国国家美术馆",
        note: "工业时代拖走了旧海军时代的荣光。",
      },
      {
        title: "雨、蒸汽与速度",
        pageTitle: "Rain, Steam and Speed – The Great Western Railway",
        year: "1844 年",
        museum: "英国国家美术馆",
        note: "速度第一次被画成一种近乎抽象的气团。",
      },
      {
        title: "奴隶船",
        pageTitle: "The Slave Ship",
        year: "1840 年",
        museum: "波士顿美术馆",
        note: "风暴般的颜色里埋着一段极度暴烈的历史。",
      },
    ],
  },
  {
    id: "monet",
    name: "克劳德·莫奈",
    latin: "Claude Monet",
    wikiTitle: "Claude Monet",
    birth: 1840,
    death: 1926,
    eraId: "nineteenth",
    region: "法国",
    movement: "印象派",
    position: [96, 84, 118],
    blurb: "莫奈不是在画物，而是在画光如何短暂停留在物上。于是世界在他的画布上变成了连续变化的气候。",
    curatorNote: "在莫奈这里，视觉第一次真正接受了‘不稳定’这个事实。",
    aliases: ["Impression, Sunrise", "Water Lilies", "印象派"],
    works: [
      {
        title: "印象·日出",
        pageTitle: "Impression, Sunrise",
        year: "1872 年",
        museum: "马蒙丹莫奈美术馆",
        note: "整个印象派的名字，从这一片雾气里长出来。",
      },
      {
        title: "睡莲",
        pageTitle: "Water Lilies",
        year: "1890 年代至 1920 年代",
        museum: "多馆藏",
        note: "池面被拉成无边无际的色块宇宙。",
      },
      {
        title: "干草堆",
        pageTitle: "Haystacks (Monet series)",
        year: "1890-1891 年",
        museum: "多馆藏",
        note: "同一对象在不同光线下像不同时空的证据。",
      },
    ],
  },
  {
    id: "cezanne",
    name: "保罗·塞尚",
    latin: "Paul Cezanne",
    wikiTitle: "Paul Cezanne",
    birth: 1839,
    death: 1906,
    eraId: "modern",
    region: "法国",
    movement: "后印象派 / 结构观察",
    position: [116, 16, 58],
    blurb: "塞尚把印象派松散的光，重新压回结构与体积，于是现代主义有了几何骨架。",
    curatorNote: "很多 20 世纪绘画都像从塞尚的桌面和山体里拆出来的零件。",
    aliases: ["Mont Sainte-Victoire", "The Card Players", "后印象派"],
    works: [
      {
        title: "玩纸牌者",
        pageTitle: "The Card Players",
        year: "1890-1895 年",
        museum: "多馆藏",
        note: "静止人物被组织成近乎雕塑式的稳定平衡。",
      },
      {
        title: "圣维克多山",
        pageTitle: "Mont Sainte-Victoire",
        year: "1880-1906 年间系列",
        museum: "多馆藏",
        note: "一座山被反复拆解成色面与体块。",
      },
      {
        title: "大浴女",
        pageTitle: "The Large Bathers",
        year: "1898-1905 年",
        museum: "费城艺术博物馆",
        note: "人物与风景几乎被缝成同一块结构织体。",
      },
    ],
  },
  {
    id: "van-gogh",
    name: "文森特·梵高",
    latin: "Vincent van Gogh",
    wikiTitle: "Vincent van Gogh",
    birth: 1853,
    death: 1890,
    eraId: "modern",
    region: "荷兰 / 法国",
    movement: "后印象派 / 表现性色彩",
    position: [140, -78, 84],
    blurb: "梵高把色彩和笔触都推到情绪强度的边缘，使画面像会直接发热一样。",
    curatorNote: "梵高让色彩从‘描述’转向‘表达’，这是现代绘画最深的一次升温。",
    aliases: ["The Starry Night", "Sunflowers", "The Bedroom", "后印象派"],
    works: [
      {
        title: "星月夜",
        pageTitle: "The Starry Night",
        year: "1889 年",
        museum: "纽约现代艺术博物馆",
        note: "夜空像被情绪卷动，笔触成为气流本身。",
      },
      {
        title: "向日葵",
        pageTitle: "Sunflowers (Van Gogh series)",
        year: "1888-1889 年",
        museum: "多馆藏",
        note: "黄色被推成一种近乎精神性的发光体。",
      },
      {
        title: "卧室",
        pageTitle: "The Bedroom",
        year: "1888 年",
        museum: "多馆藏",
        note: "透视被轻轻扭曲，让一间普通房间拥有不安的心理震颤。",
      },
    ],
  },
  {
    id: "klimt",
    name: "古斯塔夫·克里姆特",
    latin: "Gustav Klimt",
    wikiTitle: "Gustav Klimt",
    birth: 1862,
    death: 1918,
    eraId: "modern",
    region: "奥地利",
    movement: "维也纳分离派 / 装饰象征主义",
    position: [172, 44, 164],
    blurb: "他让金箔、图案与身体纠缠在一起，把画面表面推进成一种极度迷人的装饰深渊。",
    curatorNote: "克里姆特擅长把肉身裹进图案，让装饰不再是背景，而是欲望本身。",
    aliases: ["The Kiss", "Portrait of Adele Bloch-Bauer I", "Vienna Secession"],
    works: [
      {
        title: "吻",
        pageTitle: "The Kiss (Klimt)",
        year: "1907-1908 年",
        museum: "美景宫",
        note: "身体几乎溶进图案，亲密关系像被镀上了宗教光辉。",
      },
      {
        title: "阿黛尔·布洛赫-鲍尔肖像一号",
        pageTitle: "Portrait of Adele Bloch-Bauer I",
        year: "1907 年",
        museum: "新画廊",
        note: "肖像与装饰完全缝合成一面闪耀的屏风。",
      },
      {
        title: "朱迪斯一号",
        pageTitle: "Judith and the Head of Holofernes",
        year: "1901 年",
        museum: "奥地利美术馆",
        note: "危险的凝视，被处理成华丽而冰冷的表面。",
      },
    ],
  },
  {
    id: "kandinsky",
    name: "瓦西里·康定斯基",
    latin: "Wassily Kandinsky",
    wikiTitle: "Wassily Kandinsky",
    birth: 1866,
    death: 1944,
    eraId: "modern",
    region: "俄罗斯 / 德国 / 法国",
    movement: "抽象艺术 / 表现主义",
    position: [196, -18, 28],
    blurb: "康定斯基让绘画摆脱再现义务，颜色、线条和节奏第一次可以独立发声。",
    curatorNote: "他把‘画什么’替换成‘如何让颜色与形状直接发音’。",
    aliases: ["Composition VIII", "Yellow-Red-Blue", "抽象"],
    works: [
      {
        title: "构成第八号",
        pageTitle: "Composition VIII",
        year: "1923 年",
        museum: "古根海姆博物馆",
        note: "几何元素像一套开始自我运转的宇宙系统。",
      },
      {
        title: "黄-红-蓝",
        pageTitle: "Yellow-Red-Blue",
        year: "1925 年",
        museum: "蓬皮杜中心",
        note: "颜色不再附着对象，而是直接组织感受。",
      },
      {
        title: "数个圆圈",
        pageTitle: "Several Circles",
        year: "1926 年",
        museum: "古根海姆博物馆",
        note: "圆成为自由漂浮的声音粒子。",
      },
    ],
  },
  {
    id: "picasso",
    name: "巴勃罗·毕加索",
    latin: "Pablo Picasso",
    wikiTitle: "Pablo Picasso",
    birth: 1881,
    death: 1973,
    eraId: "modern",
    region: "西班牙 / 法国",
    movement: "立体主义 / 现代主义",
    position: [226, 62, -72],
    blurb: "毕加索像一个持续爆炸的中心，不断重新定义人物、空间和观看的方式。",
    curatorNote: "他最强的一点，不是风格，而是把风格本身当成可以反复拆装的机器。",
    aliases: ["Guernica", "Les Demoiselles d'Avignon", "立体主义"],
    works: [
      {
        title: "亚维农少女",
        pageTitle: "Les Demoiselles d'Avignon",
        year: "1907 年",
        museum: "纽约现代艺术博物馆",
        note: "空间和身体被切开成现代主义最危险的一道口子。",
      },
      {
        title: "格尔尼卡",
        pageTitle: "Guernica",
        year: "1937 年",
        museum: "索菲娅王后国家艺术中心",
        note: "战争被压成黑白色的尖叫。",
      },
      {
        title: "镜前少女",
        pageTitle: "Girl before a Mirror",
        year: "1932 年",
        museum: "纽约现代艺术博物馆",
        note: "同一个身体被拆成彼此对峙的多个自我。",
      },
    ],
  },
  {
    id: "frida-kahlo",
    name: "弗里达·卡罗",
    latin: "Frida Kahlo",
    wikiTitle: "Frida Kahlo",
    birth: 1907,
    death: 1954,
    eraId: "modern",
    region: "墨西哥",
    movement: "自画像 / 超现实倾向",
    position: [250, -88, -16],
    blurb: "她把受伤的身体和私人记忆变成了极其直接的图像，疼痛第一次这样正面地成为图像结构。",
    curatorNote: "在弗里达这里，自画像不再是形象管理，而是肉身档案。",
    aliases: ["The Two Fridas", "The Wounded Deer", "Self-Portrait"],
    works: [
      {
        title: "两个弗里达",
        pageTitle: "The Two Fridas",
        year: "1939 年",
        museum: "现代艺术博物馆（墨西哥城）",
        note: "双身像像一场将裂未裂的自我审判。",
      },
      {
        title: "带荆棘项链和蜂鸟的自画像",
        pageTitle: "Self-Portrait with Thorn Necklace and Hummingbird",
        year: "1940 年",
        museum: "尼克拉斯·穆雷收藏 / 哈里·兰瑟姆中心",
        note: "自画像被处理成受难图式般的私人图腾。",
      },
      {
        title: "受伤的鹿",
        pageTitle: "The Wounded Deer",
        year: "1946 年",
        museum: "私人收藏",
        note: "动物身体和自我意象被缝成同一种创伤。",
      },
    ],
  },
  {
    id: "dali",
    name: "萨尔瓦多·达利",
    latin: "Salvador Dali",
    wikiTitle: "Salvador Dali",
    birth: 1904,
    death: 1989,
    eraId: "modern",
    region: "西班牙",
    movement: "超现实主义",
    position: [276, -12, -126],
    blurb: "达利让梦境拥有极高的清晰度，越逼真，越让人觉得现实正在松动。",
    curatorNote: "超现实主义在达利手里像镜面，越光滑越让人不安。",
    aliases: ["The Persistence of Memory", "Metamorphosis of Narcissus", "超现实主义"],
    works: [
      {
        title: "记忆的永恒",
        pageTitle: "The Persistence of Memory",
        year: "1931 年",
        museum: "纽约现代艺术博物馆",
        note: "柔软的钟表像时间本身开始融化。",
      },
      {
        title: "那喀索斯的变形",
        pageTitle: "Metamorphosis of Narcissus",
        year: "1937 年",
        museum: "泰特现代美术馆",
        note: "神话被重写成镜像与复制的心理迷宫。",
      },
      {
        title: "天鹅映象大象",
        pageTitle: "Swans Reflecting Elephants",
        year: "1937 年",
        museum: "私人收藏",
        note: "图像在倒影中完成另一重身份变换。",
      },
    ],
  },
  {
    id: "yayoi-kusama",
    name: "草间弥生",
    latin: "Yayoi Kusama",
    wikiTitle: "Yayoi Kusama",
    birth: 1929,
    death: null,
    eraId: "contemporary",
    region: "日本",
    movement: "沉浸式装置 / 波点宇宙",
    position: [320, 108, 84],
    blurb: "草间弥生把重复推到眩晕的边界，波点、镜像和无限空间一起变成可步入的幻觉。",
    curatorNote: "她几乎把绘画从平面带到了房间内部，让观者自己变成画面的一部分。",
    aliases: ["Infinity Mirrored Room", "Pumpkin", "Phalli's Field", "波点"],
    works: [
      {
        title: "无限镜屋",
        pageTitle: "Infinity Mirrored Room",
        year: "1965 年至今的系列",
        museum: "多馆藏",
        note: "镜像把有限空间扩成没有边界的感官深井。",
      },
      {
        title: "阳具原野",
        pageTitle: "Phalli's Field",
        year: "1965 年",
        museum: "常设回顾展与图录",
        note: "重复不是装饰，而是一种把现实推向异常的策略。",
      },
      {
        title: "南瓜",
        pageTitle: "Pumpkin (Yayoi Kusama)",
        year: "1994 年",
        museum: "多地公共艺术与馆藏",
        note: "可爱的外形包裹着近乎强迫性的重复逻辑。",
      },
    ],
  },
  {
    id: "hockney",
    name: "大卫·霍克尼",
    latin: "David Hockney",
    wikiTitle: "David Hockney",
    birth: 1937,
    death: null,
    eraId: "contemporary",
    region: "英国",
    movement: "当代绘画 / 数字图像",
    position: [352, -46, 152],
    blurb: "霍克尼能把泳池、室内与风景都画成轻盈的观看装置，同时又持续追问新媒介怎样改变视觉。",
    curatorNote: "他像当代宇宙里最轻快的一颗星，把现代主义遗产转译成日常风景与新技术。",
    aliases: ["A Bigger Splash", "Portrait of an Artist", "泳池", "数字绘画"],
    works: [
      {
        title: "更大的水花",
        pageTitle: "A Bigger Splash",
        year: "1967 年",
        museum: "泰特不列颠",
        note: "爆开的水花成了画面里最短暂却最显眼的事件。",
      },
      {
        title: "克拉克夫妇与珀西",
        pageTitle: "Mr and Mrs Clark and Percy",
        year: "1970-1971 年",
        museum: "泰特不列颠",
        note: "时尚、亲密与室内空间被组织成极具当代感的平面。",
      },
      {
        title: "艺术家肖像（泳池与两个人物）",
        pageTitle: "Portrait of an Artist (Pool with Two Figures)",
        year: "1972 年",
        museum: "私人收藏",
        note: "透亮的泳池与冷静的目光，让情感悬停在水面上。",
      },
    ],
  },
  {
    id: "wu-daozi",
    name: "吴道子",
    latin: "Wu Daozi",
    wikiTitle: "Wu Daozi",
    birth: 680,
    death: 759,
    eraId: "ancient",
    region: "中国·唐",
    movement: "壁画 / 宗教与人物图像",
    position: [-246, 18, -18],
    blurb: "吴道子把线条从描摹推向奔涌，人物与佛教图像因此获得了一种像风一样掠过墙面的速度。",
    curatorNote: "如果顾恺之是把人物唤醒的人，吴道子就是让他们真正动起来的人。",
    aliases: ["八十七神仙卷", "送子天王图", "唐代壁画"],
    works: [
      {
        title: "八十七神仙卷",
        year: "传为唐代稿本",
        museum: "徐悲鸿纪念馆旧藏系统",
        note: "线条像气流一样贯穿整卷，人物几乎在纸面上行走。",
      },
      {
        title: "送子天王图",
        year: "后世摹本",
        museum: "大阪市立美术馆系统",
        note: "宗教题材被处理成极具节奏感的人物队列。",
      },
    ],
  },
  {
    id: "zhao-mengfu",
    name: "赵孟頫",
    latin: "Zhao Mengfu",
    wikiTitle: "Zhao Mengfu",
    birth: 1254,
    death: 1322,
    eraId: "song",
    region: "中国·元",
    movement: "书画合一 / 元代文人画",
    position: [-118, 142, 186],
    blurb: "赵孟頫让书法性的用笔重新回到山水和人物中，文人画因此找到了更自觉的语言。",
    curatorNote: "他重新把“写”带回画里，让笔墨本身成为画面的骨骼。",
    aliases: ["鹊华秋色图", "人骑图", "元代文人画"],
    works: [
      {
        title: "鹊华秋色图",
        year: "1295 年",
        museum: "台北故宫博物院",
        note: "地景不靠雄浑压人，而是靠笔墨秩序慢慢展开。",
      },
      {
        title: "人骑图",
        year: "元代",
        museum: "故宫博物院",
        note: "人物和马匹都被写得像一段极简却稳定的书法。",
      },
    ],
  },
  {
    id: "huang-gongwang",
    name: "黄公望",
    latin: "Huang Gongwang",
    wikiTitle: "Huang Gongwang",
    birth: 1269,
    death: 1354,
    eraId: "song",
    region: "中国·元",
    movement: "浅绛山水 / 元四家",
    position: [-86, 124, 236],
    blurb: "黄公望把山水从巨碑式崇高转向可游、可居、可慢慢读的笔墨宇宙。",
    curatorNote: "他的山水不是突然压来的高峰，而是一口气缓缓铺开的世界。",
    aliases: ["富春山居图", "九峰雪霁图", "元四家"],
    works: [
      {
        title: "富春山居图",
        pageTitle: "Dwelling in the Fuchun Mountains",
        year: "1347-1350 年",
        museum: "浙江省博物馆 / 台北故宫博物院分藏",
        note: "长卷像时间一样缓慢展开，把山水变成可进入的呼吸系统。",
      },
      {
        title: "九峰雪霁图",
        year: "元代",
        museum: "故宫博物院",
        note: "雪后的静气被笔墨组织成层层递进的空间。",
      },
    ],
  },
  {
    id: "botticelli",
    name: "桑德罗·波提切利",
    latin: "Sandro Botticelli",
    wikiTitle: "Sandro Botticelli",
    birth: 1445,
    death: 1510,
    eraId: "renaissance",
    region: "意大利",
    movement: "早期文艺复兴 / 神话叙事",
    position: [-184, -118, -58],
    blurb: "波提切利让神话人物拥有飘浮的优雅，他的线条比肉身更先抵达情绪。",
    curatorNote: "在波提切利这里，文艺复兴不只是在研究人体，也在重新发明优雅。",
    aliases: ["The Birth of Venus", "Primavera", "文艺复兴"],
    works: [
      {
        title: "维纳斯的诞生",
        pageTitle: "The Birth of Venus",
        year: "1480s",
        museum: "乌菲兹美术馆",
        note: "海风、长发和姿态一起构成了神话诞生的视觉模板。",
      },
      {
        title: "春",
        pageTitle: "Primavera (Botticelli)",
        year: "1482 年前后",
        museum: "乌菲兹美术馆",
        note: "人物像被春天气流串起来，整幅画是一场柔软的秩序。",
      },
    ],
  },
  {
    id: "titian",
    name: "提香",
    latin: "Titian",
    wikiTitle: "Titian",
    birth: 1488,
    death: 1576,
    eraId: "renaissance",
    region: "意大利·威尼斯",
    movement: "威尼斯画派 / 色彩绘画",
    position: [-72, -124, -214],
    blurb: "提香把色彩从填充物变成主角，画面像由光和血肉一层层染出来。",
    curatorNote: "很多后来关于色彩的讨论，都能在提香这里找到早期的火种。",
    aliases: ["Venus of Urbino", "Assumption of the Virgin", "威尼斯画派"],
    works: [
      {
        title: "乌尔比诺的维纳斯",
        pageTitle: "Venus of Urbino",
        year: "1538 年",
        museum: "乌菲兹美术馆",
        note: "肉身和床榻在暖色里慢慢发光，亲密感因此变得具体。",
      },
      {
        title: "圣母升天",
        pageTitle: "Assumption of the Virgin (Titian)",
        year: "1516-1518 年",
        museum: "威尼斯圣母荣耀教堂",
        note: "红色像火焰一样托举整幅祭坛画向上腾起。",
      },
    ],
  },
  {
    id: "vermeer",
    name: "约翰内斯·维米尔",
    latin: "Johannes Vermeer",
    wikiTitle: "Johannes Vermeer",
    birth: 1632,
    death: 1675,
    eraId: "baroque",
    region: "荷兰",
    movement: "荷兰黄金时代 / 室内光线",
    position: [12, 84, -218],
    blurb: "维米尔把最普通的室内光线处理成近乎神圣的安静，时间像被锁在一束窗光里。",
    curatorNote: "他不是画戏剧，而是把日常里的静止提炼到极致。",
    aliases: ["Girl with a Pearl Earring", "The Milkmaid", "室内光线"],
    works: [
      {
        title: "戴珍珠耳环的少女",
        pageTitle: "Girl with a Pearl Earring",
        year: "约 1665 年",
        museum: "海牙莫瑞泰斯皇家美术馆",
        note: "眼神和耳环一起，让肖像像刚刚转过身来。",
      },
      {
        title: "倒牛奶的女仆",
        pageTitle: "The Milkmaid (Vermeer)",
        year: "约 1658-1661 年",
        museum: "阿姆斯特丹国立博物馆",
        note: "光把一个普通动作慢慢酿成了永恒。",
      },
    ],
  },
  {
    id: "goya",
    name: "弗朗西斯科·戈雅",
    latin: "Francisco Goya",
    wikiTitle: "Francisco Goya",
    birth: 1746,
    death: 1828,
    eraId: "nineteenth",
    region: "西班牙",
    movement: "宫廷肖像 / 黑色绘画",
    position: [58, -136, -114],
    blurb: "戈雅一面描绘权力，一面逼近噩梦，他让现代人的不安第一次如此直接地出现在绘画里。",
    curatorNote: "他像站在古典和现代之间的断层上，往两边都看得很清楚。",
    aliases: ["The Third of May 1808", "Saturn Devouring His Son", "黑色绘画"],
    works: [
      {
        title: "1808 年 5 月 3 日",
        pageTitle: "The Third of May 1808",
        year: "1814 年",
        museum: "普拉多博物馆",
        note: "枪决场面被画成现代政治暴力最早的视觉原型之一。",
      },
      {
        title: "农神吞噬其子",
        pageTitle: "Saturn Devouring His Son",
        year: "1819-1823 年",
        museum: "普拉多博物馆",
        note: "神话被拖进黑暗，画面像直接从噩梦里切下来的碎片。",
      },
    ],
  },
  {
    id: "renoir",
    name: "皮埃尔-奥古斯特·雷诺阿",
    latin: "Pierre-Auguste Renoir",
    wikiTitle: "Pierre-Auguste Renoir",
    birth: 1841,
    death: 1919,
    eraId: "nineteenth",
    region: "法国",
    movement: "印象派 / 人物与光感",
    position: [146, 132, 32],
    blurb: "雷诺阿让皮肤、布料和午后空气都带上柔软的震动，印象派因此有了更温暖的人际温度。",
    curatorNote: "如果莫奈在看天气，雷诺阿更像在看空气怎样落在人的脸上。",
    aliases: ["Bal du moulin de la Galette", "Luncheon of the Boating Party", "印象派"],
    works: [
      {
        title: "煎饼磨坊的舞会",
        pageTitle: "Bal du moulin de la Galette",
        year: "1876 年",
        museum: "奥赛博物馆",
        note: "阳光碎片落在人群和裙摆上，整幅画像一场被光托起来的下午。",
      },
      {
        title: "舟上的午宴",
        pageTitle: "Luncheon of the Boating Party",
        year: "1880-1881 年",
        museum: "菲利普斯收藏馆",
        note: "社交场景被组织成一种极其松弛却精密的亲密秩序。",
      },
    ],
  },
  {
    id: "matisse",
    name: "亨利·马蒂斯",
    latin: "Henri Matisse",
    wikiTitle: "Henri Matisse",
    birth: 1869,
    death: 1954,
    eraId: "modern",
    region: "法国",
    movement: "野兽派 / 色彩平面",
    position: [248, 158, 18],
    blurb: "马蒂斯把色彩从再现中彻底解放出来，让平面本身就能制造空间、节奏和愉悦。",
    curatorNote: "他总能把最复杂的视觉组织，做得像一次轻松的呼吸。",
    aliases: ["The Dance", "The Red Studio", "野兽派"],
    works: [
      {
        title: "舞蹈",
        pageTitle: "Dance (Matisse)",
        year: "1910 年",
        museum: "埃尔米塔日博物馆",
        note: "人物被极简化之后，节奏反而变得更猛烈。",
      },
      {
        title: "红色工作室",
        pageTitle: "The Red Studio",
        year: "1911 年",
        museum: "纽约现代艺术博物馆",
        note: "房间和色块合并成一个几乎没有重力的内部宇宙。",
      },
    ],
  },
  {
    id: "georgia-okeeffe",
    name: "乔治亚·欧姬芙",
    latin: "Georgia O'Keeffe",
    wikiTitle: "Georgia O'Keeffe",
    birth: 1887,
    death: 1986,
    eraId: "modern",
    region: "美国",
    movement: "现代主义 / 花与荒原",
    position: [314, -138, 28],
    blurb: "欧姬芙把花朵、骨骼和荒漠都放大到近乎抽象，让观看在亲密与辽阔之间来回摇摆。",
    curatorNote: "她像把显微镜和望远镜放在同一只眼睛里。",
    aliases: ["Black Iris III", "Cow's Skull: Red, White, and Blue", "美国现代主义"],
    works: [
      {
        title: "黑鸢尾 III",
        pageTitle: "Black Iris III",
        year: "1926 年",
        museum: "大都会艺术博物馆",
        note: "局部放大之后，花朵开始逼近抽象与身体经验。",
      },
      {
        title: "牛头骨：红白蓝",
        pageTitle: "Cow's Skull: Red, White, and Blue",
        year: "1931 年",
        museum: "大都会艺术博物馆",
        note: "荒原意象被压成强烈而克制的国家寓言。",
      },
    ],
  },
  {
    id: "qi-baishi",
    name: "齐白石",
    latin: "Qi Baishi",
    wikiTitle: "Qi Baishi",
    birth: 1864,
    death: 1957,
    eraId: "modern",
    region: "中国",
    movement: "写意花鸟 / 金石趣味",
    position: [176, 12, 232],
    blurb: "齐白石把虾、蟹、花果都画得像刚刚有了生命，笔墨在他手里带着极强的民间活气。",
    curatorNote: "他把大写意从文人案头拉回日常世界，既亲切又极有锋芒。",
    aliases: ["虾", "花鸟", "写意"],
    works: [
      {
        title: "群虾图",
        year: "20 世纪",
        museum: "北京画院等系统收藏",
        note: "几笔透明的墨色，就把水感和生命感一起提起来。",
      },
      {
        title: "蛙声十里出山泉",
        year: "20 世纪",
        museum: "中国美术馆系统",
        note: "声音、泉水和想象被一起安放进了画面空白里。",
      },
    ],
  },
  {
    id: "zhang-daqian",
    name: "张大千",
    latin: "Zhang Daqian",
    wikiTitle: "Zhang Daqian",
    birth: 1899,
    death: 1983,
    eraId: "contemporary",
    region: "中国",
    movement: "泼彩山水 / 传统转译",
    position: [286, 74, 198],
    blurb: "张大千一端连着古典山水，一端又把泼彩推向近乎抽象的壮阔，传统因此被再次点亮。",
    curatorNote: "他很像一颗横跨古今的行星，把旧笔墨和现代视觉撞在一起。",
    aliases: ["庐山图", "泼彩", "山水"],
    works: [
      {
        title: "庐山图",
        year: "1981 年",
        museum: "台北故宫博物院",
        note: "晚年巨制像把记忆、山川和笔墨一起压进一张长卷里。",
      },
      {
        title: "泼彩山水",
        year: "20 世纪晚期",
        museum: "多馆藏",
        note: "色块与云气相互覆盖，传统山水被推向近乎宇宙化的尺度。",
      },
    ],
  },
  ...buildSupplementalPainters(),
];

const ARTWORK_PAGE_TITLE_PATCHES = {
  "alfred-sisley": {
    "塞纳河畔洪水": "The Flood at Port-Marly",
    "卢浮西安雪景": "Snow at Louveciennes",
  },
  "amedeo-modigliani": {
    "扶手椅上的裸女": "Nu couche",
    "珍妮·艾布特恩像": "Jeanne Hebuterne",
  },
  "artemisia-gentileschi": {
    "朱迪斯斩杀赫罗弗尼斯": "Judith Slaying Holofernes (Artemisia Gentileschi, Naples)",
    "自画像作为绘画寓言": "Self-Portrait as the Allegory of Painting",
  },
  "andy-warhol": {
    "金宝汤罐头": "Campbell's Soup Cans",
    "玛丽莲双联画": "Marilyn Diptych",
  },
  "anthony-van-dyck": {
    "查理一世骑马像": "Charles I at the Hunt",
  },
  "andrea-mantegna": {
    "死去的基督": "Lamentation of Christ (Mantegna)",
    "婚礼室壁画": "Camera degli Sposi",
  },
  "annibale-carracci": {
    "法尔内塞画廊壁画": "Farnese Gallery",
  },
  "bartolome-esteban-murillo": {
    "吃葡萄和甜瓜的孩子": "The Young Beggar",
  },
  "berthe-morisot": {
    "夏日": "Summer's Day",
  },
  "camille-pissarro": {
    "红屋顶": "The Red Roofs",
  },
  "camille-corot": {
    "莫特枫丹的回忆": "Souvenir of Mortefontaine",
  },
  "claude-lorrain": {
    "与以撒和利百加的婚礼风景": "Landscape with the Marriage of Isaac and Rebecca (The Mill)",
  },
  "correggio": {
    "牧羊人朝拜": "Adoration of the Shepherds (Correggio)",
    "木星与伊俄": "Jupiter and Io",
  },
  "diego-velazquez": {
    "宫娥": "Las Meninas",
    "教皇英诺森十世肖像": "Portrait of Innocent X",
  },
  "edgar-degas": {
    "舞蹈课": "The Dance Class",
    "苦艾酒": "L'Absinthe",
  },
  "edvard-munch": {
    "呐喊": "The Scream",
    "病中的孩子": "The Sick Child",
  },
  "edouard-manet": {
    "草地上的午餐": "Le Déjeuner sur l'herbe",
    "奥林匹亚": "Olympia (Manet)",
  },
  "egon-schiele": {
    "死神与少女": "Death and the Maiden (Schiele)",
  },
  "el-greco": {
    "奥尔加斯伯爵的葬礼": "The Burial of the Count of Orgaz",
    "拉奥孔": "Laocoön (El Greco)",
  },
  "eugene-delacroix": {
    "自由引导人民": "Liberty Leading the People",
  },
  "fra-angelico": {
    "天使报喜": "Annunciation (Fra Angelico, San Marco)",
  },
  "frans-hals": {
    "笑骑士": "The Laughing Cavalier",
    "圣乔治市民卫队宴会": "The Banquet of the Officers of the St George Militia Company in 1627",
  },
  "georges-de-la-tour": {
    "新生儿": "The Newborn Child",
  },
  "giovanni-bellini": {
    "众神的盛宴": "The Feast of the Gods (Bellini)",
    "圣弗朗西斯在沙漠中": "St. Francis in the Desert",
  },
  "giuseppe-arcimboldo": {
    "图书管理员": "The Librarian",
    "四季": "The Four Seasons (Arcimboldo)",
  },
  "gustave-courbet": {
    "石工": "The Stone Breakers",
    "画室": "The Painter's Studio",
  },
  "hans-holbein-the-younger": {
    "大使们": "The Ambassadors (Holbein)",
  },
  "jackson-pollock": {
    "秋韵": "Autumn Rhythm (Number 30)",
    "第 5 号": "No. 5, 1948",
  },
  "james-mcneill-whistler": {
    "灰与黑的安排：画家之母": "Arrangement in Grey and Black No. 1",
    "黑与金的夜曲": "Nocturne in Black and Gold – The Falling Rocket",
  },
  "jean-francois-millet": {
    "拾穗者": "The Gleaners",
    "晚钟": "The Angelus (Millet)",
  },
  "kazimir-malevich": {
    "黑方块": "Black Square",
    "白上之白": "White on White",
  },
  "li-gonglin": {
    "五马图": "Five Horses",
  },
  "liang-kai": {
    "泼墨仙人图": "Immortal in Splashed Ink",
  },
  "lucian-freud": {
    "睡着的救济金管理员": "Benefits Supervisor Sleeping",
  },
  "mary-cassatt": {
    "浴后的孩子": "The Child's Bath",
    "蓝色扶手椅中的小女孩": "Little Girl in a Blue Armchair",
  },
  "mark-rothko": {
    "橙与黄": "Orange and Yellow",
    "罗斯科礼拜堂组画": "Rothko Chapel",
  },
  "nicolas-poussin": {
    "阿卡迪亚的牧人": "Et in Arcadia ego",
    "萨宾妇女被掳": "The Abduction of the Sabine Women",
  },
  "peter-doig": {
    "白独木舟": "White Canoe",
  },
  "peter-paul-rubens": {
    "劫夺留西帕斯的女儿": "The Rape of the Daughters of Leucippus",
    "玛丽·德·美第奇组画": "Marie de' Medici cycle",
  },
  "perugino": {
    "把钥匙交给圣彼得": "Delivery of the Keys",
  },
  "piero-della-francesca": {
    "基督受洗": "The Baptism of Christ (Piero della Francesca)",
    "基督鞭笞": "The Flagellation of Christ",
  },
  "paolo-uccello": {
    "圣罗马诺之战": "The Battle of San Romano",
    "夜猎图": "The Hunt in the Forest",
  },
  "willem-de-kooning": {
    "女人 I": "Woman I",
    "挖掘": "Excavation (de Kooning)",
  },
  "zhang-xuan": {
    "捣练图": "Court Ladies Preparing Newly Woven Silk",
  },
  "zhou-fang": {
    "簪花仕女图": "Court Ladies Wearing Flowered Headdresses",
  },
  "emperor-huizong-of-song": {
    "瑞鹤图": "Auspicious Cranes",
  },
};

applyArtworkPageTitlePatches();

function applyArtworkPageTitlePatches() {
  PAINTERS.forEach((painter) => {
    const patchMap = ARTWORK_PAGE_TITLE_PATCHES[painter.id];
    if (!patchMap) {
      return;
    }

    painter.works.forEach((work) => {
      const patchedPageTitle = patchMap[work.title];
      if (patchedPageTitle && !work.pageTitle) {
        work.pageTitle = patchedPageTitle;
      }
    });
  });
}

function getArtworkLookupCandidates(painter, artwork) {
  const patchMap = ARTWORK_PAGE_TITLE_PATCHES[painter.id] || {};
  return [artwork.pageTitle, patchMap[artwork.title], artwork.title].filter(
    (value, index, list) => value && list.indexOf(value) === index
  );
}

const RELATION_SEEDS = [
  {
    source: "gu-kaizhi",
    target: "fan-kuan",
    type: "lineage",
    strength: 0.74,
    note: "从人物神采到山水精神，东方绘画的“气韵”被继续放大。",
  },
  {
    source: "fan-kuan",
    target: "guo-xi",
    type: "lineage",
    strength: 0.86,
    note: "北宋山水在尺度和空间方法上前后接力。",
  },
  {
    source: "guo-xi",
    target: "hokusai",
    type: "dialogue",
    strength: 0.44,
    note: "两人都让山与风景拥有组织观看路径的能力。",
  },
  {
    source: "leonardo",
    target: "michelangelo",
    type: "dialogue",
    strength: 0.9,
    note: "科学观察与雕塑式人体，在文艺复兴中形成双峰对峙。",
  },
  {
    source: "leonardo",
    target: "raphael",
    type: "lineage",
    strength: 0.92,
    note: "拉斐尔吸收了达·芬奇的构图智慧与柔和过渡。",
  },
  {
    source: "michelangelo",
    target: "raphael",
    type: "influence",
    strength: 0.76,
    note: "米开朗基罗的人体张力，持续推动着拉斐尔的构图升级。",
  },
  {
    source: "raphael",
    target: "caravaggio",
    type: "influence",
    strength: 0.47,
    note: "古典秩序的余波，进入巴洛克之前的剧场布置。",
  },
  {
    source: "caravaggio",
    target: "rembrandt",
    type: "influence",
    strength: 0.84,
    note: "明暗对照被伦勃朗改造成更深的心理光线。",
  },
  {
    source: "rembrandt",
    target: "van-gogh",
    type: "influence",
    strength: 0.66,
    note: "梵高从伦勃朗那里学到光能如何承担精神重量。",
  },
  {
    source: "hokusai",
    target: "monet",
    type: "influence",
    strength: 0.72,
    note: "浮世绘的构图与截景，进入法国之后彻底改变了观看方式。",
  },
  {
    source: "hokusai",
    target: "van-gogh",
    type: "influence",
    strength: 0.79,
    note: "平面色块与大胆轮廓，为梵高的笔触解放提供了参照。",
  },
  {
    source: "turner",
    target: "monet",
    type: "influence",
    strength: 0.87,
    note: "透纳的光雾几乎是印象派提前到来的天气。",
  },
  {
    source: "turner",
    target: "van-gogh",
    type: "dialogue",
    strength: 0.46,
    note: "两人的风景都在逼近‘情绪气候’而非客观再现。",
  },
  {
    source: "monet",
    target: "cezanne",
    type: "dialogue",
    strength: 0.79,
    note: "一个不断溶解对象，一个重新为对象搭骨架。",
  },
  {
    source: "monet",
    target: "hockney",
    type: "influence",
    strength: 0.63,
    note: "系列观察与水面反光，在霍克尼那里获得新的加州版本。",
  },
  {
    source: "cezanne",
    target: "picasso",
    type: "influence",
    strength: 0.95,
    note: "塞尚的体块分析，直接成为立体主义的底层引擎。",
  },
  {
    source: "cezanne",
    target: "kandinsky",
    type: "influence",
    strength: 0.67,
    note: "从结构观察到抽象秩序，中间有一条清晰的现代线索。",
  },
  {
    source: "van-gogh",
    target: "kandinsky",
    type: "influence",
    strength: 0.74,
    note: "情绪化的色彩与笔触，为抽象表现主义预热。",
  },
  {
    source: "van-gogh",
    target: "klimt",
    type: "motif",
    strength: 0.49,
    note: "表面纹理与高密度色彩，都在推动画面持续发热。",
  },
  {
    source: "klimt",
    target: "yayoi-kusama",
    type: "motif",
    strength: 0.59,
    note: "图案在表面上的无尽蔓延，最终在草间的空间中爆炸。",
  },
  {
    source: "kandinsky",
    target: "yayoi-kusama",
    type: "dialogue",
    strength: 0.53,
    note: "抽象图形与重复结构，都在追求视觉节奏的直接性。",
  },
  {
    source: "picasso",
    target: "frida-kahlo",
    type: "influence",
    strength: 0.58,
    note: "现代主义的碎裂视角，进入弗里达之后转向私人身体经验。",
  },
  {
    source: "picasso",
    target: "dali",
    type: "influence",
    strength: 0.66,
    note: "西班牙现代艺术内部的能量传递，推动达利走向自己的梦境机器。",
  },
  {
    source: "picasso",
    target: "hockney",
    type: "influence",
    strength: 0.74,
    note: "多视角与空间重组，为霍克尼的拼贴观察奠基。",
  },
  {
    source: "frida-kahlo",
    target: "dali",
    type: "dialogue",
    strength: 0.64,
    note: "梦境与私人象征在两人那里都极其锋利，但指向完全不同。",
  },
  {
    source: "dali",
    target: "yayoi-kusama",
    type: "dialogue",
    strength: 0.45,
    note: "超现实的幻觉被草间改造成可进入的现实空间。",
  },
  {
    source: "yayoi-kusama",
    target: "hockney",
    type: "motif",
    strength: 0.39,
    note: "两人都能把日常场景转成极鲜明且沉浸的视觉事件。",
  },
  {
    source: "raphael",
    target: "picasso",
    type: "dialogue",
    strength: 0.41,
    note: "古典和谐与现代拆解，在人物结构上构成远距离对谈。",
  },
];

const ERA_SEQUENCE = Object.keys(ERA_META);
const RELATIONS = [];

const STATE = {
  selectedPainterId: null,
  hoveredPainterId: null,
  relationMode: "all",
  eraFilter: "all",
  cultureFilter: "all",
  searchTerm: "",
  autoRotate: true,
  sceneEnabled: false,
  visiblePainterIds: new Set(),
  drawerOpen: false,
  focusCardCollapsed: false,
  sideDockCollapsed: false,
  compactPortrait: false,
  mobileUtilityCollapsed: false,
  artworkRequestToken: 0,
  modalImageToken: 0,
  focusAnimation: null,
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  eraFilter: document.querySelector("#eraFilter"),
  cultureFilter: document.querySelector("#cultureFilter"),
  utilityDock: document.querySelector("#utilityDock"),
  mobileUtilityToggleButton: document.querySelector("#mobileUtilityToggleButton"),
  relationCycleButton: document.querySelector("#relationCycleButton"),
  autopilotButton: document.querySelector("#autopilotButton"),
  randomJumpButton: document.querySelector("#randomJumpButton"),
  resetViewButton: document.querySelector("#resetViewButton"),
  statsGrid: document.querySelector("#statsGrid"),
  legendList: document.querySelector("#legendList"),
  legendSummary: document.querySelector("#legendSummary"),
  selectedCuratorNote: document.querySelector("#selectedCuratorNote"),
  eraTimeline: document.querySelector("#eraTimeline"),
  sceneCanvas: document.querySelector("#sceneCanvas"),
  sceneStatus: document.querySelector("#sceneStatus"),
  visibleCounter: document.querySelector("#visibleCounter"),
  hoverHint: document.querySelector("#hoverHint"),
  activeModeChip: document.querySelector("#activeModeChip"),
  focusHeroName: document.querySelector("#focusHeroName"),
  focusHeroMeta: document.querySelector("#focusHeroMeta"),
  focusSpotlight: document.querySelector(".focus-spotlight"),
  closeFocusCardButton: document.querySelector("#closeFocusCardButton"),
  spanStat: document.querySelector("#spanStat"),
  hubStat: document.querySelector("#hubStat"),
  focusStat: document.querySelector("#focusStat"),
  livingStat: document.querySelector("#livingStat"),
  rightDock: document.querySelector(".right-dock"),
  toggleDockButton: document.querySelector("#toggleDockButton"),
  detailName: document.querySelector("#detailName"),
  detailMeta: document.querySelector("#detailMeta"),
  detailTags: document.querySelector("#detailTags"),
  detailBio: document.querySelector("#detailBio"),
  openGalleryButton: document.querySelector("#openGalleryButton"),
  focusNodeButton: document.querySelector("#focusNodeButton"),
  relationCountLabel: document.querySelector("#relationCountLabel"),
  relationList: document.querySelector("#relationList"),
  workCountLabel: document.querySelector("#workCountLabel"),
  worksPreview: document.querySelector("#worksPreview"),
  chronicleStrip: document.querySelector("#chronicleStrip"),
  artworkDrawer: document.querySelector("#artworkDrawer"),
  drawerTitle: document.querySelector("#drawerTitle"),
  drawerSubtitle: document.querySelector("#drawerSubtitle"),
  closeDrawerButton: document.querySelector("#closeDrawerButton"),
  artworkGrid: document.querySelector("#artworkGrid"),
  artworkModal: document.querySelector("#artworkModal"),
  closeModalButton: document.querySelector("#closeModalButton"),
  modalArtworkImage: document.querySelector("#modalArtworkImage"),
  modalArtworkTitle: document.querySelector("#modalArtworkTitle"),
  modalArtworkMeta: document.querySelector("#modalArtworkMeta"),
  modalArtworkNote: document.querySelector("#modalArtworkNote"),
  modalArtworkLink: document.querySelector("#modalArtworkLink"),
};

const PAINTER_BY_ID = new Map();
const ARTWORK_CACHE = new Map();
const ADJACENCY = new Map();
const NODE_OBJECTS = new Map();
const LINE_OBJECTS = [];
const AMBIENT_STARS = [];
const AMBIENT_STAR_OBJECTS = [];
const AMBIENT_LINE_OBJECTS = [];
const LOCAL_ARTWORK_MANIFEST_URL = "./assets/artworks/manifest.json";
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const worldPositionBuffer = new THREE.Vector3();
const relationModes = ["all", ...Object.keys(RELATION_META)];
const scene = new THREE.Scene();
const sceneGroup = new THREE.Group();
const glowTexture = createGlowTexture();

let renderer;
let labelRenderer;
let camera;
let controls;
let backgroundStars;
let localArtworkManifestPromise;
let homeView = {
  camera: new THREE.Vector3(76, 68, 420),
  target: new THREE.Vector3(84, 12, 16),
};

document.addEventListener("DOMContentLoaded", async () => {
  syncLayoutMode();
  const localArtworkManifest = await loadLocalArtworkManifest();
  prioritizeImageReadyPainters(localArtworkManifest);
  buildGraph();
  populateEraFilter();
  renderStaticPanels();
  applyFilters();
  selectPainter(STATE.selectedPainterId, { focus: false, revealDrawer: false });
  try {
    initScene();
    STATE.sceneEnabled = true;
    updateStatusCopy();
    updateSceneVisuals();
  } catch (error) {
    console.error(error);
    renderSceneFallback(error);
  }
  bindEvents();
  if (STATE.sceneEnabled) {
    animate();
  }
});

function scorePainterImageReadiness(painter, manifest = {}) {
  let localHits = 0;
  let explicitHits = 0;

  painter.works.forEach((work) => {
    const lookupCandidates = getArtworkLookupCandidates(painter, work);
    if (lookupCandidates.some((lookupTitle) => manifest?.[`${painter.id}:${lookupTitle}`])) {
      localHits += 1;
    }
    if (work.pageTitle) {
      explicitHits += 1;
    }
  });

  return {
    localHits,
    explicitHits,
    score: localHits * 10 + explicitHits,
  };
}

function getLocalReadyWorks(painter, manifest = {}) {
  return painter.works.filter((work) => {
    const lookupCandidates = getArtworkLookupCandidates(painter, work);
    return lookupCandidates.some((lookupTitle) => manifest?.[`${painter.id}:${lookupTitle}`]);
  });
}

function prioritizeImageReadyPainters(manifest = {}) {
  const rankedPainters = PAINTERS.map((painter) => ({
    painter,
    ...scorePainterImageReadiness(painter, manifest),
  }));

  rankedPainters.forEach((entry) => {
    if (entry.localHits > 0) {
      entry.painter.works = getLocalReadyWorks(entry.painter, manifest);
    }
  });

  const preferredIds = new Set(
    rankedPainters.filter((entry) => entry.localHits > 0).map((entry) => entry.painter.id)
  );

  if (preferredIds.size < 24 || preferredIds.size >= PAINTERS.length) {
    return;
  }

  for (let index = PAINTERS.length - 1; index >= 0; index -= 1) {
    if (!preferredIds.has(PAINTERS[index].id)) {
      PAINTERS.splice(index, 1);
    }
  }
}

function buildGraph() {
  PAINTER_BY_ID.clear();
  ADJACENCY.clear();
  RELATIONS.length = 0;

  PAINTERS.forEach((painter) => {
    painter.basePosition = painter.basePosition || [...painter.position];
    painter.position = spreadPainterPosition(painter.basePosition, painter.eraId);
    painter.color = ERA_META[painter.eraId].color;
    painter.culture = /(中国|日本)/.test(painter.region) ? "east" : "west";
    painter.relations = [];
    painter.keywordTokens = buildPainterKeywordTokens(painter);
    PAINTER_BY_ID.set(painter.id, painter);
    ADJACENCY.set(painter.id, []);
  });

  buildNetworkRelations().forEach((relation) => {
    RELATIONS.push(relation);
    const source = PAINTER_BY_ID.get(relation.source);
    const target = PAINTER_BY_ID.get(relation.target);
    if (!source || !target) {
      return;
    }

    const payload = {
      ...relation,
      sourcePainter: source,
      targetPainter: target,
    };

    ADJACENCY.get(source.id).push({
      ...payload,
      neighborId: target.id,
      neighbor: target,
    });
    ADJACENCY.get(target.id).push({
      ...payload,
      neighborId: source.id,
      neighbor: source,
    });
  });

  PAINTERS.forEach((painter) => {
    painter.relationCount = ADJACENCY.get(painter.id).length;
    painter.nodeRadius = Math.min(2.35, 0.72 + painter.relationCount * 0.032);
    painter.searchIndex = [
      painter.name,
      painter.latin,
      painter.region,
      painter.movement,
      painter.eraId,
      painter.culture,
      ...painter.aliases,
    ]
      .join(" ")
      .toLowerCase();
  });

  buildAmbientConstellation();
  homeView = calculateHomeView();
}

function buildAmbientConstellation() {
  AMBIENT_STARS.length = 0;

  PAINTERS.forEach((painter) => {
    const satelliteCount = Math.max(1, Math.min(4, Math.round(1 + painter.relationCount * 0.07)));
    for (let index = 0; index < satelliteCount; index += 1) {
      const seedA = createSeedNumber(`${painter.id}:ambient:${index}:a`);
      const seedB = createSeedNumber(`${painter.id}:ambient:${index}:b`);
      const seedC = createSeedNumber(`${painter.id}:ambient:${index}:c`);
      const radius = 18 + seedA * 46 + painter.relationCount * 1.8;
      const theta = seedB * Math.PI * 2;
      const lift = (seedC - 0.5) * (24 + painter.relationCount * 3);
      const position = [
        painter.position[0] + Math.cos(theta) * radius,
        painter.position[1] + lift,
        painter.position[2] + Math.sin(theta) * radius * (0.7 + seedA * 0.65),
      ];

      const anchorIds = [painter.id, ...getNearestPainterIds(position, painter.id, 1)];
      AMBIENT_STARS.push({
        id: `ambient-${painter.id}-${index}`,
        position,
        radius: 0.2 + seedA * 0.52,
        color: new THREE.Color(painter.color).lerp(new THREE.Color(0xf8f4ef), 0.72),
        anchorIds,
      });
    }
  });
}

function spreadPainterPosition(basePosition, eraId) {
  const offset = ERA_POSITION_OFFSETS[eraId] || [0, 0, 0];
  return basePosition.map((value, index) => value * POSITION_SCALE[index] + offset[index]);
}

function calculateHomeView() {
  if (!PAINTERS.length) {
    return {
      camera: new THREE.Vector3(76, 68, 420),
      target: new THREE.Vector3(84, 12, 16),
    };
  }

  const target = PAINTERS.reduce(
    (sum, painter) => sum.add(new THREE.Vector3(...painter.position)),
    new THREE.Vector3()
  );
  target.multiplyScalar(1 / PAINTERS.length);

  const maxDistance = PAINTERS.reduce((largest, painter) => {
    const distance = new THREE.Vector3(...painter.position).distanceTo(target);
    return Math.max(largest, distance);
  }, 360);

  const cameraOffset = new THREE.Vector3(maxDistance * 0.18, maxDistance * 0.13, maxDistance * 1.22);
  return {
    camera: target.clone().add(cameraOffset),
    target,
  };
}

function getNearestPainterIds(position, excludedId, limit = 2) {
  return [...PAINTERS]
    .filter((painter) => painter.id !== excludedId)
    .map((painter) => ({
      id: painter.id,
      distance:
        (painter.position[0] - position[0]) ** 2 +
        (painter.position[1] - position[1]) ** 2 +
        (painter.position[2] - position[2]) ** 2,
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit)
    .map((item) => item.id);
}

function buildNetworkRelations() {
  const relationMap = new Map();

  RELATION_SEEDS.forEach((relation) => {
    relationMap.set(buildRelationKey(relation.source, relation.target), {
      ...relation,
      inferred: false,
    });
  });

  for (let index = 0; index < PAINTERS.length; index += 1) {
    for (let inner = index + 1; inner < PAINTERS.length; inner += 1) {
      const left = PAINTERS[index];
      const right = PAINTERS[inner];
      const key = buildRelationKey(left.id, right.id);

      if (relationMap.has(key)) {
        continue;
      }

      const inferredRelation = inferRelationBetween(left, right);
      if (inferredRelation) {
        relationMap.set(key, inferredRelation);
      }
    }
  }

  return [...relationMap.values()];
}

function inferRelationBetween(left, right) {
  const leftEraIndex = ERA_SEQUENCE.indexOf(left.eraId);
  const rightEraIndex = ERA_SEQUENCE.indexOf(right.eraId);
  const eraGap = Math.abs(leftEraIndex - rightEraIndex);
  const yearGap = Math.abs(left.birth - right.birth);
  const sameCulture = left.culture === right.culture;
  const sameRegion = left.region.split("·")[0] === right.region.split("·")[0];
  const sharedKeywords = getSharedKeywordCount(left.keywordTokens, right.keywordTokens);

  let strength = 0;
  if (sameCulture) {
    strength += 0.18;
  }
  if (sameRegion) {
    strength += 0.12;
  }
  if (eraGap === 0) {
    strength += 0.24;
  } else if (eraGap === 1) {
    strength += 0.16;
  } else if (eraGap === 2) {
    strength += 0.08;
  }
  if (yearGap <= 70) {
    strength += 0.18;
  } else if (yearGap <= 140) {
    strength += 0.12;
  } else if (yearGap <= 240) {
    strength += 0.06;
  }
  strength += Math.min(sharedKeywords * 0.08, 0.3);

  if (strength < 0.42) {
    return null;
  }

  const source = left.birth <= right.birth ? left : right;
  const target = source === left ? right : left;
  const type = inferRelationType({
    sameCulture,
    sameRegion,
    eraGap,
    yearGap,
    sharedKeywords,
  });

  return {
    source: source.id,
    target: target.id,
    type,
    strength: Math.min(0.9, Number(strength.toFixed(2))),
    note: buildInferredRelationNote(source, target, type, { sameCulture, sameRegion, eraGap, sharedKeywords }),
    inferred: true,
  };
}

function inferRelationType(metrics) {
  const scores = {
    lineage: (metrics.sameCulture ? 0.22 : 0.04) + (metrics.sameRegion ? 0.18 : 0) + (metrics.eraGap <= 1 ? 0.14 : 0),
    influence: (metrics.yearGap <= 160 ? 0.22 : 0.08) + (metrics.sharedKeywords ? 0.14 : 0.04),
    dialogue: (metrics.eraGap <= 2 ? 0.18 : 0.06) + (!metrics.sameCulture ? 0.14 : 0.05),
    motif: Math.min(metrics.sharedKeywords * 0.16, 0.34) + (metrics.sameCulture ? 0.06 : 0.02),
  };

  return Object.entries(scores).sort((left, right) => right[1] - left[1])[0][0];
}

function buildInferredRelationNote(source, target, type, metrics) {
  const bridgeText =
    metrics.sharedKeywords >= 2
      ? "共享了明显的形式关键词"
      : metrics.sameCulture
        ? "处在同一条文化脉络上"
        : "在跨文化观看方式上互相照亮";

  if (type === "lineage") {
    return `${source.name} 到 ${target.name} 之间存在一条可追踪的延续线，${bridgeText}。`;
  }
  if (type === "influence") {
    return `${source.name} 较早的视觉方法，给了 ${target.name} 一条可继续推进的路径。`;
  }
  if (type === "motif") {
    return `${source.name} 与 ${target.name} 在题材、纹理或构图上形成重复共振。`;
  }
  return `${source.name} 与 ${target.name} 在时代之间形成一场远距离对话，${bridgeText}。`;
}

function buildPainterKeywordTokens(painter) {
  return new Set(
    [painter.movement, painter.region, ...painter.aliases]
      .join(" ")
      .toLowerCase()
      .split(/[\s/·,，、()]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1)
  );
}

function getSharedKeywordCount(leftTokens, rightTokens) {
  return [...leftTokens].filter((token) => rightTokens.has(token)).length;
}

function buildRelationKey(leftId, rightId) {
  return [leftId, rightId].sort().join("::");
}

function populateEraFilter() {
  const options = [{ value: "all", label: "全部时代" }];
  Object.entries(ERA_META).forEach(([key, era]) => {
    options.push({ value: key, label: era.label });
  });

  elements.eraFilter.innerHTML = "";
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.value;
    optionElement.textContent = option.label;
    elements.eraFilter.append(optionElement);
  });
}

function renderStaticPanels() {
  renderStats();
  renderLegend();
  renderEraTimeline();
  renderChronicle();
  elements.activeModeChip.textContent = `关系模式：${getRelationLabel(STATE.relationMode)}`;
}

function renderStats() {
  const totalRelations = RELATIONS.length;
  const minBirth = Math.min(...PAINTERS.map((item) => item.birth));
  const maxYear = Math.max(...PAINTERS.map((item) => item.death || new Date().getFullYear()));
  const living = PAINTERS.filter((item) => !item.death).length;

  const stats = [
    { label: "星点总数", value: String(PAINTERS.length) },
    { label: "关系轨道", value: String(totalRelations) },
    { label: "跨越年代", value: `${maxYear - minBirth}+ 年` },
    { label: "仍在发光", value: `${living} 位` },
  ];

  elements.statsGrid.innerHTML = "";
  stats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `<span>${stat.label}</span><strong>${stat.value}</strong>`;
    elements.statsGrid.append(card);
  });
}

function renderLegend() {
  elements.legendList.innerHTML = "";
  elements.legendSummary.textContent = `${Object.keys(RELATION_META).length} 种关系模式`;

  Object.entries(RELATION_META).forEach(([, meta]) => {
    const item = document.createElement("article");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="legend-swatch" style="color:${meta.color}; background:${meta.color};"></div>
      <div>
        <strong>${meta.label}</strong>
        <span>${meta.description}</span>
      </div>
    `;
    elements.legendList.append(item);
  });
}

function renderEraTimeline() {
  elements.eraTimeline.innerHTML = "";
  const allChip = createEraChip("all", "全部时代", `${PAINTERS.length} 位画家`);
  elements.eraTimeline.append(allChip);

  Object.entries(ERA_META).forEach(([key, era]) => {
    const count = PAINTERS.filter((painter) => painter.eraId === key).length;
    elements.eraTimeline.append(createEraChip(key, era.short, `${count} 位画家`));
  });

  syncEraTimeline();
}

function createEraChip(value, label, meta) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "era-chip";
  button.dataset.era = value;
  button.innerHTML = `<strong>${label}</strong><small>${meta}</small>`;
  return button;
}

function renderChronicle() {
  elements.chronicleStrip.innerHTML = "";
  Object.entries(ERA_META).forEach(([key, era]) => {
    const painters = PAINTERS.filter((item) => item.eraId === key);
    const card = document.createElement("article");
    card.className = "chronicle-card";
    card.dataset.era = key;
    const names = painters.slice(0, 4).map((item) => item.name).join(" · ");
    card.innerHTML = `
      <span class="eyebrow">${era.range}</span>
      <strong>${era.label}</strong>
      <p>${era.description}</p>
      <p>${names}</p>
      <button type="button" data-chronicle-era="${key}">切换到这一时代</button>
    `;
    elements.chronicleStrip.append(card);
  });
}

function initScene() {
  camera = new THREE.PerspectiveCamera(46, 1, 0.1, 2200);
  camera.position.copy(homeView.camera);

  scene.fog = new THREE.FogExp2(0x031018, 0.00185);
  scene.add(sceneGroup);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.3));
  renderer.setSize(elements.sceneCanvas.clientWidth, elements.sceneCanvas.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = "none";
  elements.sceneCanvas.append(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(elements.sceneCanvas.clientWidth, elements.sceneCanvas.clientHeight);
  labelRenderer.domElement.className = "label-overlay";
  elements.sceneCanvas.append(labelRenderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 160;
  controls.maxDistance = 980;
  controls.autoRotate = STATE.autoRotate;
  controls.autoRotateSpeed = 0.32;
  controls.target.copy(homeView.target);

  scene.add(new THREE.AmbientLight(0x7acde3, 0.95));
  scene.add(new THREE.HemisphereLight(0x9fe6ff, 0x091018, 0.9));

  const keyLight = new THREE.DirectionalLight(0xf4d79c, 1.15);
  keyLight.position.set(-120, 160, 180);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x79d9ee, 0.7);
  fillLight.position.set(180, -60, -120);
  scene.add(fillLight);

  createBackgroundStars();
  createOrbitalRings();
  createNodes();
  createRelations();
  createAmbientLinks();
  createAmbientStars();
  updateSceneVisuals();
  handleResize();
}

function createBackgroundStars() {
  const count = 2800;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const radius = THREE.MathUtils.randFloat(560, 1200);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const base = index * 3;

    positions[base] = radius * Math.sin(phi) * Math.cos(theta);
    positions[base + 1] = radius * Math.cos(phi);
    positions[base + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xd8eef8,
    size: 1.2,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: true,
    depthWrite: false,
  });

  backgroundStars = new THREE.Points(geometry, material);
  scene.add(backgroundStars);
}

function createOrbitalRings() {
  const rings = [
    { radiusX: 310, radiusY: 120, rotation: [1.18, 0.2, 0.08], color: 0x2b234f },
    { radiusX: 250, radiusY: 196, rotation: [0.48, 0.88, -0.16], color: 0x1e3554 },
    { radiusX: 360, radiusY: 160, rotation: [0.2, 1.3, 0.42], color: 0x4e2d49 },
  ];

  rings.forEach((ringConfig) => {
    const curve = new THREE.EllipseCurve(0, 0, ringConfig.radiusX, ringConfig.radiusY, 0, Math.PI * 2);
    const points = curve.getPoints(240).map((point) => new THREE.Vector3(point.x, point.y, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: ringConfig.color,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    const ring = new THREE.LineLoop(geometry, material);
    ring.rotation.set(...ringConfig.rotation);
    sceneGroup.add(ring);
  });
}

function createNodes() {
  PAINTERS.forEach((painter, index) => {
    const [x, y, z] = painter.position;
    const baseColor = new THREE.Color(painter.color);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(painter.nodeRadius, 18, 18),
      new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 1.42,
        metalness: 0.1,
        roughness: 0.34,
        transparent: true,
        opacity: 0.95,
      })
    );
    sphere.position.set(x, y, z);
    sphere.userData.painterId = painter.id;
    sphere.userData.baseScale = 1;
    sphere.userData.phase = index * 0.57;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: baseColor,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.position.copy(sphere.position);
    glow.scale.setScalar(painter.nodeRadius * 10);

    const labelButton = document.createElement("button");
    labelButton.type = "button";
    labelButton.className = "star-label";
    labelButton.innerHTML = `<span>${painter.name}</span><small>${painter.latin}</small>`;
    labelButton.addEventListener("click", () => {
      selectPainter(painter.id, { focus: true, revealDrawer: true });
    });
    labelButton.addEventListener("mouseenter", () => {
      STATE.hoveredPainterId = painter.id;
      elements.hoverHint.textContent = `${painter.name} · ${painter.movement}`;
      updateSceneVisuals();
    });
    labelButton.addEventListener("mouseleave", () => {
      STATE.hoveredPainterId = null;
      updateStatusCopy();
      updateSceneVisuals();
    });

    const label = new CSS2DObject(labelButton);
    label.position.set(0, painter.nodeRadius * 4.3, 0);
    sphere.add(label);

    sceneGroup.add(glow);
    sceneGroup.add(sphere);
    NODE_OBJECTS.set(painter.id, { painter, sphere, glow, label, labelButton });
  });
}

function createRelations() {
  RELATIONS.forEach((relation) => {
    const source = PAINTER_BY_ID.get(relation.source);
    const target = PAINTER_BY_ID.get(relation.target);
    if (!source || !target) {
      return;
    }

    const strandCount = getRelationStrandCount(relation, source, target);
    const baseColor = getRelationLineColor(relation);

    for (let strandIndex = 0; strandIndex < strandCount; strandIndex += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        buildRelationCurvePoints(source, target, relation, strandIndex, strandCount)
      );
      const material = new THREE.LineBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: relation.inferred ? 0.05 : 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geometry, material);
      line.userData = relation;
      sceneGroup.add(line);
      LINE_OBJECTS.push({
        line,
        relation,
        baseColor,
        highlightColor: new THREE.Color(source.color).lerp(new THREE.Color(target.color), 0.5),
        baseOpacity: relation.inferred ? 0.028 : 0.045,
        activeOpacity: relation.inferred ? 0.12 : 0.18,
      });
    }
  });
}

function getRelationStrandCount(relation, source, target) {
  const hubWeight = (source.relationCount + target.relationCount) * 0.05;
  const density = relation.inferred ? 1 : 2.1;
  return Math.max(1, Math.min(6, Math.round(density + relation.strength * 3.2 + hubWeight)));
}

function getRelationLineColor(relation) {
  return new THREE.Color(RELATION_META[relation.type].color).lerp(new THREE.Color(0xf5efe7), 0.76);
}

function buildRelationCurvePoints(source, target, relation, strandIndex, strandCount) {
  const start = new THREE.Vector3(...source.position);
  const end = new THREE.Vector3(...target.position);
  const direction = end.clone().sub(start);
  const distance = direction.length();
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const orbitNormal = midpoint.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const flowNormal = orbitNormal.lengthSq() < 0.001 ? up.clone() : orbitNormal.lerp(up, 0.34).normalize();
  let tangent = new THREE.Vector3().crossVectors(direction, flowNormal);
  if (tangent.lengthSq() < 0.001) {
    tangent = new THREE.Vector3(1, 0, 0);
  }
  tangent.normalize();

  const spread = strandCount <= 1 ? 0 : strandIndex / (strandCount - 1) - 0.5;
  const waveSeed = createSeedNumber(`${relation.source}:${relation.target}:${strandIndex}`);
  const twist = waveSeed > 0.5 ? 1 : -1;
  const arch = distance * (0.1 + relation.strength * 0.14) * (0.8 + waveSeed * 0.6);
  const sway = distance * (0.05 + Math.abs(spread) * 0.24);
  const drift = distance * (0.025 + waveSeed * 0.035);

  const controlA = start
    .clone()
    .lerp(end, 0.26)
    .add(flowNormal.clone().multiplyScalar(arch))
    .add(tangent.clone().multiplyScalar(sway * twist))
    .add(up.clone().multiplyScalar(drift));

  const controlB = start
    .clone()
    .lerp(end, 0.74)
    .add(flowNormal.clone().multiplyScalar(arch * 0.82))
    .add(tangent.clone().multiplyScalar(-sway * twist * 0.86))
    .add(up.clone().multiplyScalar(-drift * 0.7));

  return new THREE.CubicBezierCurve3(start, controlA, controlB, end).getPoints(18);
}

function createSeedNumber(seed) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function createAmbientStars() {
  AMBIENT_STARS.forEach((star, index) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(star.radius, 12, 12),
      new THREE.MeshStandardMaterial({
        color: star.color,
        emissive: star.color,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.92,
      })
    );
    sphere.position.set(...star.position);
    sphere.userData.phase = index * 0.43;

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: star.color,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.position.copy(sphere.position);
    glow.scale.setScalar(star.radius * 9);

    sceneGroup.add(glow);
    sceneGroup.add(sphere);
    AMBIENT_STAR_OBJECTS.push({ star, sphere, glow });
  });
}

function createAmbientLinks() {
  AMBIENT_STARS.forEach((star) => {
    star.anchorIds.forEach((anchorId, anchorIndex) => {
      const painter = PAINTER_BY_ID.get(anchorId);
      if (!painter) {
        return;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(
        buildAmbientCurvePoints(painter.position, star.position, `${star.id}:${anchorIndex}`)
      );
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(painter.color).lerp(new THREE.Color(0xf8f3ec), 0.82),
        transparent: true,
        opacity: anchorIndex === 0 ? 0.11 : 0.06,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geometry, material);
      sceneGroup.add(line);
      AMBIENT_LINE_OBJECTS.push({
        line,
        anchorId,
        star,
        baseOpacity: anchorIndex === 0 ? 0.09 : 0.048,
      });
    });
  });
}

function buildAmbientCurvePoints(startPosition, endPosition, seed) {
  const start = new THREE.Vector3(...startPosition);
  const end = new THREE.Vector3(...endPosition);
  const direction = end.clone().sub(start);
  const distance = direction.length();
  const up = new THREE.Vector3(0, 1, 0);
  let tangent = new THREE.Vector3().crossVectors(direction, up);
  if (tangent.lengthSq() < 0.001) {
    tangent = new THREE.Vector3(1, 0, 0);
  }
  tangent.normalize();

  const seedValue = createSeedNumber(seed);
  const lift = distance * (0.08 + seedValue * 0.12);
  const sway = distance * (0.06 + seedValue * 0.1);
  const twist = seedValue > 0.5 ? 1 : -1;

  const controlA = start
    .clone()
    .lerp(end, 0.34)
    .add(up.clone().multiplyScalar(lift))
    .add(tangent.clone().multiplyScalar(sway * twist));
  const controlB = start
    .clone()
    .lerp(end, 0.72)
    .add(up.clone().multiplyScalar(lift * 0.52))
    .add(tangent.clone().multiplyScalar(-sway * 0.78 * twist));

  return new THREE.CubicBezierCurve3(start, controlA, controlB, end).getPoints(12);
}

function bindEvents() {
  window.addEventListener("resize", handleResize);

  elements.searchInput.addEventListener("input", (event) => {
    STATE.searchTerm = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  elements.eraFilter.addEventListener("change", (event) => {
    STATE.eraFilter = event.target.value;
    syncEraTimeline();
    applyFilters();
  });

  elements.eraTimeline.addEventListener("click", (event) => {
    const button = event.target.closest("[data-era]");
    if (!button) {
      return;
    }
    STATE.eraFilter = button.dataset.era;
    elements.eraFilter.value = STATE.eraFilter;
    syncEraTimeline();
    applyFilters();
  });

  elements.chronicleStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chronicle-era]");
    if (!button) {
      return;
    }
    STATE.eraFilter = button.dataset.chronicleEra;
    elements.eraFilter.value = STATE.eraFilter;
    syncEraTimeline();
    applyFilters();
  });

  elements.cultureFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-culture]");
    if (!button) {
      return;
    }
    STATE.cultureFilter = button.dataset.culture;
    syncCultureButtons();
    applyFilters();
  });

  elements.relationCycleButton.addEventListener("click", () => {
    const currentIndex = relationModes.indexOf(STATE.relationMode);
    STATE.relationMode = relationModes[(currentIndex + 1) % relationModes.length];
    elements.relationCycleButton.textContent = `关系：${getRelationLabel(STATE.relationMode)}`;
    elements.activeModeChip.textContent = `关系模式：${getRelationLabel(STATE.relationMode)}`;
    applyFilters({ preserveSelection: true });
  });

  elements.autopilotButton.addEventListener("click", () => {
    if (!STATE.sceneEnabled) {
      return;
    }
    STATE.autoRotate = !STATE.autoRotate;
    controls.autoRotate = STATE.autoRotate;
    elements.autopilotButton.classList.toggle("active", STATE.autoRotate);
    elements.autopilotButton.textContent = STATE.autoRotate ? "轨道巡航开启" : "轨道巡航暂停";
  });

  elements.randomJumpButton.addEventListener("click", () => {
    const visible = getVisiblePainters();
    if (!visible.length) {
      return;
    }
    const randomPainter = visible[Math.floor(Math.random() * visible.length)];
    selectPainter(randomPainter.id, { focus: true, revealDrawer: true });
  });

  elements.resetViewButton.addEventListener("click", () => {
    if (!STATE.sceneEnabled) {
      return;
    }
    STATE.focusAnimation = {
      fromCamera: camera.position.clone(),
      toCamera: homeView.camera.clone(),
      fromTarget: controls.target.clone(),
      toTarget: homeView.target.clone(),
      start: performance.now(),
      duration: 900,
    };
  });

  elements.focusNodeButton.addEventListener("click", () => {
    if (!STATE.selectedPainterId || !STATE.sceneEnabled) {
      return;
    }
    focusPainter(STATE.selectedPainterId);
  });

  elements.openGalleryButton.addEventListener("click", () => {
    if (!STATE.selectedPainterId) {
      return;
    }
    const painter = PAINTER_BY_ID.get(STATE.selectedPainterId);
    STATE.drawerOpen = true;
    renderArtworkDrawer(painter);
  });

  elements.closeDrawerButton.addEventListener("click", () => {
    STATE.drawerOpen = false;
    elements.artworkDrawer.classList.add("hidden");
  });

  elements.focusSpotlight?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  elements.closeFocusCardButton?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  elements.closeFocusCardButton?.addEventListener("click", collapseFocusCard);

  elements.toggleDockButton?.addEventListener("click", () => {
    STATE.sideDockCollapsed = !STATE.sideDockCollapsed;
    syncRightDockState();
  });

  elements.mobileUtilityToggleButton?.addEventListener("click", () => {
    if (!STATE.compactPortrait) {
      return;
    }
    STATE.mobileUtilityCollapsed = !STATE.mobileUtilityCollapsed;
    syncMobileUtilityState();
  });

  elements.closeModalButton.addEventListener("click", closeArtworkModal);
  elements.artworkModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal='true']")) {
      closeArtworkModal();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeArtworkModal();
    }
  });

  if (renderer) {
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerleave", () => {
      STATE.hoveredPainterId = null;
      updateStatusCopy();
      updateSceneVisuals();
    });
    renderer.domElement.addEventListener("click", handleSceneClick);
  }
}

function handlePointerMove(event) {
  const intersect = pickPainter(event);
  if (!intersect) {
    if (STATE.hoveredPainterId) {
      STATE.hoveredPainterId = null;
      updateStatusCopy();
      updateSceneVisuals();
    }
    return;
  }

  const painterId = intersect.object.userData.painterId;
  if (STATE.hoveredPainterId !== painterId) {
    STATE.hoveredPainterId = painterId;
    const painter = PAINTER_BY_ID.get(painterId);
    elements.hoverHint.textContent = `${painter.name} · ${painter.movement}`;
    updateSceneVisuals();
  }
}

function handleSceneClick(event) {
  const intersect = pickPainter(event);
  if (!intersect) {
    return;
  }
  const painterId = intersect.object.userData.painterId;
  selectPainter(painterId, { focus: true, revealDrawer: true });
}

function collapseFocusCard(event) {
  event?.preventDefault();
  event?.stopPropagation();
  STATE.focusCardCollapsed = true;
  elements.focusSpotlight?.classList.remove("is-active");
  elements.focusSpotlight?.classList.add("is-hidden");
}

function pickPainter(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(
    Array.from(NODE_OBJECTS.values()).map((item) => item.sphere),
    false
  );
  return intersects[0] || null;
}

function applyFilters(options = {}) {
  const preserveSelection = options.preserveSelection ?? false;
  const visibleIds = new Set(
    PAINTERS.filter((painter) => matchesPainterFilters(painter)).map((painter) => painter.id)
  );
  STATE.visiblePainterIds = visibleIds;

  if (!preserveSelection && STATE.selectedPainterId && !visibleIds.has(STATE.selectedPainterId)) {
    const fallback = getVisiblePainters()[0];
    STATE.selectedPainterId = fallback ? fallback.id : null;
  }

  if (preserveSelection && STATE.selectedPainterId && !visibleIds.has(STATE.selectedPainterId)) {
    const fallback = getVisiblePainters()[0];
    STATE.selectedPainterId = fallback ? fallback.id : null;
  }

  syncEraTimeline();
  syncCultureButtons();
  renderSceneMetrics();
  renderChronicleHighlights();
  renderDetailPanel();
  updateStatusCopy();
  updateSceneVisuals();

  if (STATE.selectedPainterId && STATE.drawerOpen) {
    renderArtworkDrawer(PAINTER_BY_ID.get(STATE.selectedPainterId));
  } else if (!STATE.selectedPainterId) {
    elements.artworkDrawer.classList.add("hidden");
  }
}

function matchesPainterFilters(painter) {
  const matchesEra = STATE.eraFilter === "all" || painter.eraId === STATE.eraFilter;
  const matchesCulture = STATE.cultureFilter === "all" || painter.culture === STATE.cultureFilter;
  const matchesSearch = !STATE.searchTerm || painter.searchIndex.includes(STATE.searchTerm);
  return matchesEra && matchesCulture && matchesSearch;
}

function renderSceneMetrics() {
  const visiblePainters = getVisiblePainters();
  const minBirth = Math.min(...PAINTERS.map((item) => item.birth));
  const maxYear = Math.max(...PAINTERS.map((item) => item.death || new Date().getFullYear()));
  const topHub = [...PAINTERS].sort((left, right) => right.relationCount - left.relationCount)[0];
  const livingVisible = visiblePainters.filter((item) => !item.death).length;
  const cultureLabel =
    STATE.cultureFilter === "all" ? "全域" : STATE.cultureFilter === "east" ? "东方" : "西方";
  const eraLabel = STATE.eraFilter === "all" ? "全时代" : ERA_META[STATE.eraFilter].short;

  elements.visibleCounter.textContent = `${visiblePainters.length} / ${PAINTERS.length} 星点可见`;
  elements.spanStat.textContent = `${minBirth} - ${maxYear}`;
  elements.hubStat.textContent = `${topHub.name} · ${topHub.relationCount} 连线`;
  elements.focusStat.textContent = `${eraLabel} · ${cultureLabel}`;
  elements.livingStat.textContent = `${livingVisible} 位`;
}

function renderChronicleHighlights() {
  const cards = elements.chronicleStrip.querySelectorAll(".chronicle-card");
  cards.forEach((card) => {
    const active = STATE.eraFilter !== "all" && card.dataset.era === STATE.eraFilter;
    const button = card.querySelector("button");
    card.style.borderColor = active ? "rgba(112, 222, 241, 0.36)" : "rgba(255, 255, 255, 0.05)";
    button?.classList.toggle("active", active);
  });
}

function syncEraTimeline() {
  elements.eraTimeline.querySelectorAll("[data-era]").forEach((button) => {
    button.classList.toggle("active", button.dataset.era === STATE.eraFilter);
  });
}

function syncCultureButtons() {
  elements.cultureFilter.querySelectorAll("[data-culture]").forEach((button) => {
    button.classList.toggle("active", button.dataset.culture === STATE.cultureFilter);
  });
}

function selectPainter(painterId, options = {}) {
  const painter = painterId ? PAINTER_BY_ID.get(painterId) : null;
  const revealDrawer = options.revealDrawer ?? !STATE.compactPortrait;
  STATE.selectedPainterId = painter ? painter.id : null;
  STATE.focusCardCollapsed = false;
  if (STATE.compactPortrait && painter) {
    STATE.sideDockCollapsed = false;
  }
  renderDetailPanel();
  updateStatusCopy();
  updateSceneVisuals();

  if (painter && options.focus && STATE.sceneEnabled) {
    focusPainter(painter.id);
  }

  if (painter && revealDrawer) {
    STATE.drawerOpen = true;
    renderArtworkDrawer(painter);
  } else if (STATE.compactPortrait) {
    STATE.drawerOpen = false;
    elements.artworkDrawer.classList.add("hidden");
  }
}

function renderDetailPanel() {
  const painter = STATE.selectedPainterId ? PAINTER_BY_ID.get(STATE.selectedPainterId) : null;
  if (!painter) {
    elements.rightDock?.classList.add("is-hidden");
    elements.focusSpotlight?.classList.remove("is-active");
    elements.focusSpotlight?.classList.add("is-hidden");
    elements.detailName.textContent = "点击任意星点";
    elements.detailMeta.textContent = "右侧档案会在你锁定画家后展开。";
    elements.focusHeroName.textContent = "画家星图";
    elements.focusHeroMeta.textContent = "拖拽、缩放、点击任意星点，穿越一整张从古至今的画家关系网。";
    elements.detailTags.innerHTML = "";
    elements.detailBio.textContent = "先在星图中拖移、缩放与悬停，找到你想进入的那颗星。";
    elements.relationCountLabel.textContent = "0 条";
    elements.relationList.className = "relation-list empty-state";
    elements.relationList.textContent = "放宽筛选后，关系轨道会再次亮起。";
    elements.worksPreview.className = "works-preview empty-state";
    elements.worksPreview.textContent = "没有可展示的作品。";
    elements.workCountLabel.textContent = "0 幅";
    elements.selectedCuratorNote.textContent = "当前没有选中画家，宇宙处于待命状态。";
    elements.openGalleryButton.disabled = true;
    elements.focusNodeButton.disabled = true;
    return;
  }

  elements.rightDock?.classList.remove("is-hidden");
  elements.focusSpotlight?.classList.toggle("is-active", !STATE.focusCardCollapsed);
  elements.focusSpotlight?.classList.toggle("is-hidden", STATE.focusCardCollapsed);
  syncRightDockState();
  const era = ERA_META[painter.eraId];
  const activeRelations = getPainterRelations(painter.id);

  elements.detailName.textContent = painter.name;
  elements.detailMeta.textContent = `${painter.latin} · ${formatYears(painter.birth, painter.death)} · ${painter.region}`;
  elements.focusHeroName.textContent = painter.name;
  elements.focusHeroMeta.textContent = `${painter.latin} · ${painter.movement} · ${formatYears(painter.birth, painter.death)}`;
  elements.detailBio.textContent = painter.blurb;
  elements.selectedCuratorNote.textContent = painter.curatorNote;
  elements.openGalleryButton.disabled = false;
  elements.focusNodeButton.disabled = !STATE.sceneEnabled;

  elements.detailTags.innerHTML = "";
  [era.label, painter.movement, `${painter.relationCount} 条总连线`].forEach((text) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = text;
    elements.detailTags.append(tag);
  });

  renderRelationList(activeRelations);
  renderWorksPreview(painter);
}

function renderRelationList(relations) {
  elements.relationCountLabel.textContent = `${relations.length} 条`;
  elements.relationList.className = "relation-list";
  elements.relationList.innerHTML = "";

  if (!relations.length) {
    elements.relationList.className = "relation-list empty-state";
    elements.relationList.textContent = "当前模式下，这颗星点没有可见关系。";
    return;
  }

  relations
    .sort((left, right) => right.strength - left.strength)
    .slice(0, 6)
    .forEach((relation) => {
      const card = document.createElement("article");
      card.className = "relation-card";
      const meta = RELATION_META[relation.type];
      card.innerHTML = `
        <span class="relation-type-badge" style="background:${meta.color};">${meta.label}</span>
        <strong>${relation.neighbor.name}</strong>
        <div class="relation-meta">${relation.neighbor.movement} · 强度 ${Math.round(relation.strength * 100)}%</div>
        <div>${relation.note}</div>
      `;
      card.addEventListener("click", () => {
        selectPainter(relation.neighbor.id, { focus: true, revealDrawer: true });
      });
      elements.relationList.append(card);
    });

  if (relations.length > 6) {
    const tail = document.createElement("div");
    tail.className = "relation-card relation-card-muted";
    tail.textContent = `其余 ${relations.length - 6} 条隐线仍在宇宙中发光，继续拖拽或筛选可以逐步看清。`;
    elements.relationList.append(tail);
  }
}

function renderWorksPreview(painter) {
  elements.worksPreview.className = "works-preview";
  elements.worksPreview.innerHTML = "";
  elements.workCountLabel.textContent = `${painter.works.length} 幅`;

  painter.works.slice(0, 2).forEach((artwork) => {
    const chip = document.createElement("article");
    chip.className = "preview-chip";
    chip.innerHTML = `<strong>${artwork.title}</strong><span>${artwork.year} · ${artwork.museum}</span>`;
    elements.worksPreview.append(chip);
  });
}

function renderArtworkDrawer(painter) {
  if (!painter) {
    return;
  }

  elements.artworkDrawer.classList.remove("hidden");
  elements.drawerTitle.textContent = `${painter.name} 的作品舱`;
  elements.drawerSubtitle.textContent = `${painter.latin} · ${painter.movement} · 点击任意作品可放大查看`;
  elements.artworkGrid.innerHTML = "";

  const requestToken = ++STATE.artworkRequestToken;
  const cardRefs = painter.works.map((artwork) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "art-card is-loading";

    const fallbackImage = buildFallbackArtwork(painter, artwork);
    card.innerHTML = `
      <img src="${fallbackImage}" alt="${painter.name}《${artwork.title}》" loading="lazy" decoding="async" fetchpriority="low" />
      <div class="art-card-copy">
        <h3>${artwork.title}</h3>
        <div class="art-card-meta">${artwork.year} · ${artwork.museum}</div>
        <p>${artwork.note}</p>
      </div>
    `;
    elements.artworkGrid.append(card);
    return { card, artwork, fallbackImage };
  });

  Promise.all(cardRefs.map((entry) => loadArtworkMedia(entry.artwork, painter)))
    .then((assets) => {
      if (requestToken !== STATE.artworkRequestToken || STATE.selectedPainterId !== painter.id) {
        return;
      }

      assets.forEach((asset, index) => {
        const entry = cardRefs[index];
        const image = entry.card.querySelector("img");
        if (image) {
          image.src = asset.previewUrl;
        }
        entry.card.classList.remove("is-loading");
        entry.card.addEventListener("click", () => openArtworkModal(asset, painter, entry.artwork));
      });
    })
    .catch(() => {
      cardRefs.forEach((entry) => {
        entry.card.classList.remove("is-loading");
        entry.card.addEventListener("click", () =>
          openArtworkModal(
            {
              previewUrl: entry.fallbackImage,
              fullImageUrl: entry.fallbackImage,
              pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(painter.wikiTitle).replace(/%20/g, "_")}`,
            },
            painter,
            entry.artwork
          )
        );
      });
    });
}

function openArtworkModal(asset, painter, artwork) {
  const token = ++STATE.modalImageToken;
  const previewUrl = asset.previewUrl || asset.fullImageUrl;
  const fullImageUrl = asset.fullImageUrl || asset.previewUrl;
  elements.modalArtworkImage.src = previewUrl;
  elements.modalArtworkImage.alt = `${painter.name}《${artwork.title}》`;
  elements.modalArtworkTitle.textContent = artwork.title;
  elements.modalArtworkMeta.textContent = `${painter.name} · ${artwork.year} · ${artwork.museum}`;
  elements.modalArtworkNote.textContent = artwork.note;
  elements.modalArtworkLink.href = asset.pageUrl;
  elements.modalArtworkLink.hidden = !asset.pageUrl;
  elements.artworkModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  if (fullImageUrl && fullImageUrl !== previewUrl) {
    const fullImage = new Image();
    fullImage.decoding = "async";
    fullImage.onload = () => {
      if (STATE.modalImageToken === token) {
        elements.modalArtworkImage.src = fullImageUrl;
      }
    };
    fullImage.src = fullImageUrl;
  }
}

function closeArtworkModal() {
  STATE.modalImageToken += 1;
  elements.artworkModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function loadLocalArtworkManifest() {
  if (!localArtworkManifestPromise) {
    localArtworkManifestPromise = fetch(LOCAL_ARTWORK_MANIFEST_URL, { cache: "force-cache" })
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}));
  }
  return localArtworkManifestPromise;
}

function loadArtworkMedia(artwork, painter) {
  const lookupCandidates = getArtworkLookupCandidates(painter, artwork);
  const lookupTitle = lookupCandidates[0] || artwork.title;
  const cacheKey = `${painter.id}:${lookupTitle}`;
  if (ARTWORK_CACHE.has(cacheKey)) {
    return ARTWORK_CACHE.get(cacheKey);
  }

  const workPageUrl = artwork.pageTitle ? buildWikiUrl(artwork.pageTitle) : "";

  const promise = loadLocalArtworkManifest()
    .then((manifest) => {
      const localAsset =
        lookupCandidates
          .map((candidate) => manifest?.[`${painter.id}:${candidate}`])
          .find((candidate) => candidate?.previewUrl || candidate?.fullImageUrl) || null;
      if (localAsset?.previewUrl || localAsset?.fullImageUrl) {
        return {
          previewUrl: localAsset.previewUrl || localAsset.fullImageUrl || buildFallbackArtwork(painter, artwork),
          fullImageUrl: localAsset.fullImageUrl || localAsset.previewUrl || buildFallbackArtwork(painter, artwork),
          pageUrl: localAsset.pageUrl || workPageUrl,
        };
      }

      return fetchWikiMedia(lookupTitle).then((asset) => {
        const matchedArtwork = artwork.pageTitle || isArtworkPageMatch(asset.pageTitle, artwork.title);
        return {
          previewUrl:
            matchedArtwork
              ? asset.previewUrl || buildFallbackArtwork(painter, artwork)
              : buildFallbackArtwork(painter, artwork),
          fullImageUrl:
            matchedArtwork
              ? asset.fullImageUrl || asset.previewUrl || buildFallbackArtwork(painter, artwork)
              : buildFallbackArtwork(painter, artwork),
          pageUrl: matchedArtwork ? asset.pageUrl || workPageUrl : "",
        };
      });
    })
    .catch(() => ({
      previewUrl: buildFallbackArtwork(painter, artwork),
      fullImageUrl: buildFallbackArtwork(painter, artwork),
      pageUrl: workPageUrl,
    }));

  ARTWORK_CACHE.set(cacheKey, promise);
  return promise;
}

async function fetchWikiMedia(pageTitle) {
  if (!pageTitle) {
    throw new Error("missing page title");
  }

  for (const language of ["en", "zh"]) {
    try {
      return await fetchWikiMediaFromLanguage(pageTitle, language);
    } catch (error) {
      if (language === "zh") {
        throw error;
      }
    }
  }
  throw new Error("wiki page missing");
}

async function fetchWikiMediaFromLanguage(pageTitle, language) {
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  url.search = new URLSearchParams({
    action: "query",
    prop: "pageimages|info",
    piprop: "thumbnail|original",
    pithumbsize: "720",
    titles: pageTitle,
    inprop: "url",
    redirects: "1",
    format: "json",
    origin: "*",
  }).toString();

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("wiki request failed");
  }

  const payload = await response.json();
  const pages = Object.values(payload.query?.pages || {});
  const page = pages[0];

  if (!page || page.missing) {
    throw new Error("wiki page missing");
  }

  const previewUrl = page.thumbnail?.source || page.original?.source;
  const fullImageUrl = page.original?.source || page.thumbnail?.source;
  if (!previewUrl && !fullImageUrl) {
    throw new Error("wiki image missing");
  }

  return {
    previewUrl,
    fullImageUrl,
    pageTitle: page.title || pageTitle,
    pageUrl: page.fullurl || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pageTitle).replace(/%20/g, "_")}`,
  };
}

function isArtworkPageMatch(pageTitle, artworkTitle) {
  const normalize = (value) =>
    value
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff\u3400-\u4dbf]+/g, "");

  const normalizedPage = normalize(pageTitle || "");
  const normalizedArtwork = normalize(artworkTitle || "");
  return Boolean(normalizedArtwork) && normalizedPage.includes(normalizedArtwork);
}

function getVisiblePainters() {
  return PAINTERS.filter((painter) => STATE.visiblePainterIds.has(painter.id));
}

function getPainterRelations(painterId) {
  return (ADJACENCY.get(painterId) || []).filter((relation) => {
    const matchesMode = STATE.relationMode === "all" || relation.type === STATE.relationMode;
    const bothVisible =
      STATE.visiblePainterIds.has(relation.neighborId) && STATE.visiblePainterIds.has(painterId);
    return matchesMode && bothVisible;
  });
}

function updateStatusCopy() {
  const selected = STATE.selectedPainterId ? PAINTER_BY_ID.get(STATE.selectedPainterId) : null;
  const hovered = STATE.hoveredPainterId ? PAINTER_BY_ID.get(STATE.hoveredPainterId) : null;

  if (!STATE.sceneEnabled) {
    elements.sceneStatus.textContent = "当前环境未启用 WebGL，已切换为作品浏览模式。";
    elements.hoverHint.textContent = "继续使用搜索、筛选与作品舱浏览整张关系网";
    return;
  }

  if (hovered) {
    elements.sceneStatus.textContent = `悬停 ${hovered.name} · ${hovered.relationCount} 条总连线`;
    elements.hoverHint.textContent = `${hovered.name} · ${hovered.movement}`;
    return;
  }

  if (selected) {
    const activeRelations = getPainterRelations(selected.id);
    elements.sceneStatus.textContent = `已锁定 ${selected.name} · 当前可见 ${activeRelations.length} 条关系轨道`;
    elements.hoverHint.textContent = STATE.compactPortrait
      ? `${selected.name} · 底部档案可继续展开作品舱`
      : `${selected.name} · 点击关系卡可继续跳跃`;
    return;
  }

  elements.sceneStatus.textContent = "拖拽宇宙，寻找下一个你想点亮的画家。";
  elements.hoverHint.textContent = STATE.compactPortrait
    ? "单指拖拽 · 双指缩放 · 点击星点查看档案"
    : "拖拽旋转 · 滚轮缩放 · 点击星点展开作品";
}

function syncLayoutMode() {
  const compactPortrait = window.innerWidth <= 760 && window.innerHeight > window.innerWidth;
  const modeChanged = STATE.compactPortrait !== compactPortrait;
  STATE.compactPortrait = compactPortrait;
  document.body.classList.toggle("is-mobile-portrait", compactPortrait);

  if (compactPortrait && modeChanged) {
    STATE.drawerOpen = false;
    STATE.mobileUtilityCollapsed = true;
    elements.artworkDrawer?.classList.add("hidden");
  }

  if (!compactPortrait) {
    STATE.mobileUtilityCollapsed = false;
  }

  syncMobileUtilityState();
  syncRightDockState();
}

function syncMobileUtilityState() {
  if (!elements.utilityDock || !elements.mobileUtilityToggleButton) {
    return;
  }

  const collapsed = STATE.compactPortrait && STATE.mobileUtilityCollapsed;
  elements.utilityDock.classList.toggle("is-collapsed", collapsed);
  elements.mobileUtilityToggleButton.textContent = collapsed ? "展开检索与时间" : "收起检索与时间";
  elements.mobileUtilityToggleButton.setAttribute("aria-expanded", String(!collapsed));
}

function syncRightDockState() {
  if (!elements.rightDock || !elements.toggleDockButton) {
    return;
  }

  elements.rightDock.classList.toggle("is-collapsed", STATE.sideDockCollapsed);
  elements.toggleDockButton.textContent = STATE.sideDockCollapsed ? "展开" : "收起";
  elements.toggleDockButton.setAttribute("aria-expanded", String(!STATE.sideDockCollapsed));
}

function updateSceneVisuals() {
  if (!STATE.sceneEnabled) {
    return;
  }

  const selectedId = STATE.selectedPainterId;
  const selectedNeighbors = new Set(
    selectedId ? getPainterRelations(selectedId).map((relation) => relation.neighborId) : []
  );

  NODE_OBJECTS.forEach(({ painter, sphere, glow, labelButton }) => {
    const visible = STATE.visiblePainterIds.has(painter.id);
    const selected = painter.id === selectedId;
    const hovered = painter.id === STATE.hoveredPainterId;
    const neighbor = selectedNeighbors.has(painter.id);
    const emphasized = selected || hovered || neighbor;

    sphere.visible = visible;
    glow.visible = visible;

    if (!visible) {
      labelButton.classList.add("is-hidden");
      sphere.material.opacity = 0.08;
      glow.material.opacity = 0.04;
      return;
    }

    labelButton.classList.remove("is-hidden");
    labelButton.classList.toggle("is-active", selected || hovered);
    labelButton.classList.toggle("is-dim", Boolean(selectedId) && !emphasized);

    const opacity = !selectedId ? 0.96 : emphasized ? 0.98 : 0.62;
    sphere.material.opacity = opacity;
    sphere.material.emissiveIntensity = selected ? 2.28 : hovered ? 2.1 : neighbor ? 1.72 : 1.42;
    glow.material.opacity = selected ? 0.98 : hovered ? 0.9 : neighbor ? 0.62 : 0.44;
  });

  LINE_OBJECTS.forEach(({ line, relation, baseColor, highlightColor, baseOpacity, activeOpacity }) => {
    const matchesMode = STATE.relationMode === "all" || relation.type === STATE.relationMode;
    const sourceVisible = STATE.visiblePainterIds.has(relation.source);
    const targetVisible = STATE.visiblePainterIds.has(relation.target);
    const connectedToSelection =
      !selectedId || relation.source === selectedId || relation.target === selectedId;
    line.visible = matchesMode && sourceVisible && targetVisible;

    if (!line.visible) {
      line.material.opacity = 0;
      return;
    }

    line.material.color.copy(selectedId && connectedToSelection ? highlightColor : baseColor);
    line.material.opacity = !selectedId ? baseOpacity : connectedToSelection ? activeOpacity : baseOpacity * 0.42;
  });

  AMBIENT_STAR_OBJECTS.forEach(({ star, sphere, glow }) => {
    const visible = star.anchorIds.some((anchorId) => STATE.visiblePainterIds.has(anchorId));
    const attachedToSelection = Boolean(selectedId) && star.anchorIds.includes(selectedId);
    sphere.visible = visible;
    glow.visible = visible;

    if (!visible) {
      sphere.material.opacity = 0;
      glow.material.opacity = 0;
      return;
    }

    sphere.material.opacity = attachedToSelection ? 0.98 : selectedId ? 0.82 : 0.92;
    sphere.material.emissiveIntensity = attachedToSelection ? 2.14 : 1.68;
    glow.material.opacity = attachedToSelection ? 0.72 : selectedId ? 0.34 : 0.48;
  });

  AMBIENT_LINE_OBJECTS.forEach(({ line, anchorId, star, baseOpacity }) => {
    const visible = STATE.visiblePainterIds.has(anchorId) && star.anchorIds.some((id) => STATE.visiblePainterIds.has(id));
    const attachedToSelection = Boolean(selectedId) && star.anchorIds.includes(selectedId);
    line.visible = visible;
    line.material.opacity = !visible ? 0 : !selectedId ? baseOpacity : attachedToSelection ? baseOpacity * 1.9 : baseOpacity * 0.72;
  });
}

function focusPainter(painterId) {
  if (!STATE.sceneEnabled) {
    return;
  }

  const painter = PAINTER_BY_ID.get(painterId);
  if (!painter) {
    return;
  }

  const target = new THREE.Vector3(...painter.position);
  const offset = new THREE.Vector3(46, 28, 58).normalize().multiplyScalar(80 + painter.nodeRadius * 10);

  STATE.focusAnimation = {
    fromCamera: camera.position.clone(),
    toCamera: target.clone().add(offset),
    fromTarget: controls.target.clone(),
    toTarget: target,
    start: performance.now(),
    duration: 920,
  };
}

function animate(time = 0) {
  requestAnimationFrame(animate);

  if (backgroundStars) {
    backgroundStars.rotation.y += 0.00022;
    backgroundStars.rotation.x += 0.00004;
  }

  updateFocusAnimation(time);

  NODE_OBJECTS.forEach(({ painter, sphere, glow }) => {
    const pulse = 1 + Math.sin(time * 0.00145 + sphere.userData.phase) * 0.055;
    const selected = painter.id === STATE.selectedPainterId;
    const hovered = painter.id === STATE.hoveredPainterId;
    const boost = selected ? 1.18 : hovered ? 1.1 : 1;

    sphere.scale.setScalar(pulse * boost);
    glow.scale.setScalar(painter.nodeRadius * 10 * pulse * boost);
  });

  AMBIENT_STAR_OBJECTS.forEach(({ star, sphere, glow }, index) => {
    const pulse = 1 + Math.sin(time * 0.00115 + index * 0.61) * 0.09;
    sphere.scale.setScalar(pulse);
    glow.scale.setScalar(star.radius * 9 * pulse);
  });

  controls.update();
  updateLabelDepthFade();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function updateLabelDepthFade() {
  NODE_OBJECTS.forEach(({ sphere, labelButton }) => {
    if (!sphere.visible || labelButton.classList.contains("is-hidden")) {
      labelButton.style.opacity = "0";
      return;
    }

    sphere.getWorldPosition(worldPositionBuffer);
    const distance = camera.position.distanceTo(worldPositionBuffer);
    const distanceOpacity = THREE.MathUtils.clamp(1.22 - (distance - 120) / 620, 0.12, 1);
    const emphasisMultiplier = labelButton.classList.contains("is-active")
      ? 1
      : labelButton.classList.contains("is-dim")
        ? 0.32
        : 0.9;

    labelButton.style.opacity = String(
      THREE.MathUtils.clamp(distanceOpacity * emphasisMultiplier, 0.08, 1)
    );
  });
}

function updateFocusAnimation(time) {
  if (!STATE.focusAnimation) {
    return;
  }

  const animation = STATE.focusAnimation;
  const progress = Math.min((time - animation.start) / animation.duration, 1);
  const eased = easeInOutCubic(progress);

  camera.position.lerpVectors(animation.fromCamera, animation.toCamera, eased);
  controls.target.lerpVectors(animation.fromTarget, animation.toTarget, eased);

  if (progress >= 1) {
    STATE.focusAnimation = null;
  }
}

function handleResize() {
  syncLayoutMode();
  if (!renderer || !labelRenderer || !camera) {
    return;
  }

  const width = elements.sceneCanvas.clientWidth;
  const height = elements.sceneCanvas.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

function renderSceneFallback(error) {
  elements.sceneCanvas.innerHTML = `
    <div class="scene-fallback">
      <p class="eyebrow">3D UNAVAILABLE</p>
      <h3>当前环境没有拿到 WebGL 渲染能力。</h3>
      <p>你仍然可以通过右侧档案、作品舱、搜索和时代筛选浏览整张关系网；在支持硬件加速的桌面浏览器里，这里会自动切换成可拖拽的 3D 星图。</p>
      <p class="scene-fallback-error">${escapeHtml(error?.message || "Unknown WebGL error")}</p>
    </div>
  `;
  elements.autopilotButton.classList.remove("active");
  elements.autopilotButton.textContent = "轨道巡航不可用";
}

function buildFallbackArtwork(painter, artwork) {
  const secondary = shiftHex(painter.color, -22);
  const tertiary = shiftHex(painter.color, 24);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${painter.color}" />
          <stop offset="55%" stop-color="${secondary}" />
          <stop offset="100%" stop-color="${tertiary}" />
        </linearGradient>
      </defs>
      <rect width="960" height="720" fill="url(#g)" />
      <circle cx="760" cy="160" r="140" fill="rgba(255,255,255,0.12)" />
      <path d="M120 540 C 240 430, 320 640, 460 500 S 720 520, 840 400" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="16" stroke-linecap="round"/>
      <text x="80" y="120" fill="rgba(255,255,255,0.74)" font-size="28" font-family="Space Grotesk, sans-serif">PAINTERVERSE FALLBACK</text>
      <text x="80" y="520" fill="#f5f0e7" font-size="62" font-family="Ma Shan Zheng, Noto Serif SC, serif">${escapeSvg(artwork.title)}</text>
      <text x="80" y="590" fill="rgba(255,255,255,0.78)" font-size="34" font-family="Ma Shan Zheng, Noto Serif SC, serif">${escapeSvg(painter.name)} / ${escapeSvg(artwork.year)}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildWikiUrl(pageTitle) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle).replace(/%20/g, "_")}`;
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,255,255,0.82)");
  gradient.addColorStop(0.56, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(canvas);
}

function shiftHex(hex, amount) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const red = clamp(((value >> 16) & 255) + amount, 0, 255);
  const green = clamp(((value >> 8) & 255) + amount, 0, 255);
  const blue = clamp((value & 255) + amount, 0, 255);
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function getRelationLabel(mode) {
  return mode === "all" ? "全部" : RELATION_META[mode].label;
}

function formatYears(birth, death) {
  return death ? `${birth}-${death}` : `${birth}-至今`;
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function escapeSvg(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
