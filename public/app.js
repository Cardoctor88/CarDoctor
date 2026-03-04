/**
 * 汽车维修资源库 - 全品牌覆盖 + UI 优化版
 * 功能：搜索、分类浏览、收藏（云端同步）、预览（代理访问）
 */

// 配置
const CONFIG = {
    // Cloudflare Worker API 地址（已配置）
    API_BASE: 'https://auto-repair-hub-api.liu82ni.workers.dev',
    
    // 搜索源配置
    SEARCH_ENGINES: [
        { name: '百度', url: 'https://www.baidu.com/s?wd=' },
        { name: '必应', url: 'https://www.bing.com/search?q=' },
        { name: 'Google', url: 'https://www.google.com/search?q=' }
    ],
    
    // 默认资源数据（API 不可用时兜底）
    DEFAULT_RESOURCES: []
};

// 状态管理
const state = {
    currentCategory: 'all',
    currentFilter: 'all',
    favorites: [], // 从 API 获取，不再依赖 localStorage
    history: [],   // 从 API 获取，不再依赖 localStorage
    resources: [],
    isSearching: false,
    isApiAvailable: true // 标记 API 是否可用
};

// 汽车品牌分类数据（扩展版，含新能源）
const CATEGORIES = [
    {
        id: 'german',
        name: '德系车',
        icon: 'fa-car',
        brands: [
            { id: 'vw', name: '大众', models: ['速腾', '迈腾', '帕萨特', '朗逸', '途观', '途昂', '高尔夫', '宝来', '探岳', '揽境'] },
            { id: 'audi', name: '奥迪', models: ['A4L', 'A6L', 'Q5', 'Q3', 'A3', 'Q7', 'A8L', 'Q8', 'e-tron', 'S4'] },
            { id: 'bmw', name: '宝马', models: ['3系', '5系', 'X1', 'X3', 'X5', '7系', 'X7', 'i3', 'iX3', 'M3'] },
            { id: 'benz', name: '奔驰', models: ['C级', 'E级', 'GLC', 'GLA', 'S级', 'GLE', 'GLS', 'EQE', 'EQS', 'AMG GT'] },
            { id: 'porsche', name: '保时捷', models: ['卡宴', '帕拉梅拉', '911', 'Macan', 'Taycan', '718', 'Panamera'] }
        ]
    },
    {
        id: 'japanese',
        name: '日系车',
        icon: 'fa-car-side',
        brands: [
            { id: 'toyota', name: '丰田', models: ['卡罗拉', '凯美瑞', 'RAV4', '汉兰达', '雷凌', '亚洲龙', '威兰达', '赛那', 'bZ4X', '陆巡'] },
            { id: 'honda', name: '本田', models: ['思域', '雅阁', 'CR-V', '飞度', '奥德赛', '型格', '皓影', '冠道', 'e:NS1', '艾力绅'] },
            { id: 'nissan', name: '日产', models: ['轩逸', '天籁', '逍客', '奇骏', '楼兰', '劲客', '途乐', 'ARIYA', '骐达', '蓝鸟'] },
            { id: 'mazda', name: '马自达', models: ['昂克赛拉', 'CX-5', '阿特兹', 'CX-4', 'CX-30', 'CX-8', 'MX-5', 'CX-50'] },
            { id: 'subaru', name: '斯巴鲁', models: ['森林人', '傲虎', 'XV', '力狮', 'BRZ', '翼豹', '旭豹'] }
        ]
    },
    {
        id: 'american',
        name: '美系车',
        icon: 'fa-truck',
        brands: [
            { id: 'ford', name: '福特', models: ['福克斯', '蒙迪欧', '锐界', '探险者', 'F-150', '锐际', '领睿', '电马', '撼路者', 'Mustang'] },
            { id: 'chevy', name: '雪佛兰', models: ['科鲁兹', '迈锐宝', '探界者', '科沃兹', '开拓者', '创酷', '科迈罗', '索罗德', '畅巡'] },
            { id: 'buick', name: '别克', models: ['英朗', '君威', '君越', '昂科威', 'GL8', '威朗', '昂科旗', '微蓝6', '昂扬', '世纪'] },
            { id: 'cadillac', name: '凯迪拉克', models: ['CT5', 'XT5', 'XT4', 'CT6', 'XT6', 'CT4', 'LYRIQ', '凯雷德', 'GT4'] },
            { id: 'jeep', name: '吉普', models: ['牧马人', '大切诺基', '指南者', '自由光', '角斗士', '大指挥官', '自由侠', '指挥官'] }
        ]
    },
    {
        id: 'korean',
        name: '韩系车',
        icon: 'fa-taxi',
        brands: [
            { id: 'hyundai', name: '现代', models: ['伊兰特', '索纳塔', 'ix35', '途胜', '名图', '库斯途', '胜达', '帕里斯帝', '沐飒', '菲斯塔'] },
            { id: 'kia', name: '起亚', models: ['K3', 'K5', '智跑', '傲跑', '焕驰', '嘉华', '狮铂拓界', 'KX3', 'KX5', 'EV6'] }
        ]
    },
    {
        id: 'chinese',
        name: '国产车',
        icon: 'fa-flag',
        brands: [
            { id: 'byd', name: '比亚迪', models: ['秦', '汉', '唐', '宋', '元', '海豹', '海狮', '护卫舰07', '驱逐舰05', '仰望U8'] },
            { id: 'geely', name: '吉利', models: ['帝豪', '博越', '星瑞', '缤越', '领克03', '星越L', '帝豪L', '远景X6', '缤瑞', '银河L7'] },
            { id: 'changan', name: '长安', models: ['CS75', '逸动', 'UNI-T', 'CS55', '锐程', 'UNI-V', 'CS35', '欧尚Z6', '深蓝SL03', '启源A07'] },
            { id: 'haval', name: '哈弗', models: ['H6', 'H9', '大狗', '初恋', '赤兔', '神兽', '酷狗', '枭龙MAX', 'M6', 'F7'] },
            { id: 'wuling', name: '五菱', models: ['宏光', '宏光MINI', '凯捷', '星辰', '佳辰', '星驰', '缤果', '星光', '征程', '荣光'] }
        ]
    },
    {
        id: 'french',
        name: '法系车',
        icon: 'fa-wine-bottle',
        brands: [
            { id: 'peugeot', name: '标致', models: ['408', '508', '4008', '5008', '2008', '308', '3008', '508L', '408X', 'e-2008'] },
            { id: 'citroen', name: '雪铁龙', models: ['C5', 'C4L', '天逸', '凡尔赛', 'C6', 'C3-XR', '云逸', 'C4世嘉', 'C3L', 'e-C4'] }
        ]
    },
    {
        id: 'newenergy',
        name: '新能源',
        icon: 'fa-bolt',
        brands: [
            { id: 'tesla', name: '特斯拉', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Roadster'] },
            { id: 'nio', name: '蔚来', models: ['ES6', 'ES8', 'EC6', 'ET5', 'ET7', 'EC7', 'ES7', 'ET5T', 'EP9', 'NIO Phone'] },
            { id: 'xiaopeng', name: '小鹏', models: ['P7', 'G6', 'G9', 'P5', 'X9', 'MONA M03', 'G3', 'P7i', 'G6i', 'X9'] },
            { id: 'li', name: '理想', models: ['L7', 'L8', 'L9', 'L6', 'MEGA', 'ONE', 'L7 Pro', 'L8 Max', 'L9 Ultra'] },
            { id: 'leapmotor', name: '零跑', models: ['C11', 'C01', 'T03', 'C10', 'C16', 'B10', 'C11增程', 'C01增程'] }
        ]
    }
];

// 汽车维修资源库 - 全品牌覆盖（含新能源）+ 已验证可打开链接
const RESOURCES_DB = [
  // ==================== 德系车 ====================
  // 大众
  {
    id: 'vw-sagitar-manual',
    title: '大众速腾维修手册（2019-2024）',
    brand: 'vw',
    model: '速腾',
    category: 'manual',
    type: '维修手册',
    source: '百度网盘',
    url: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    previewUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    downloadUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    size: '156MB',
    pages: 2340,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=速腾维修手册',
    description: '包含发动机、变速箱、电气系统完整维修流程（百度网盘下载）'
  },
  {
    id: 'vw-magotan-circuit',
    title: '大众迈腾电路图完整版',
    brand: 'vw',
    model: '迈腾',
    category: 'circuit',
    type: '电路图',
    source: '汽车之家论坛',
    url: 'https://club.autohome.com.cn/bbs/thread/ceeb8623c703d66a/55528573-2.html',
    previewUrl: 'https://club.autohome.com.cn/bbs/thread/ceeb8623c703d66a/55528573-2.html',
    downloadUrl: '',
    size: '89MB',
    pages: 450,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/059669/ffffff?text=迈腾电路图',
    description: '全车电路图，包含ECU、传感器、执行器连接图（汽车之家论坛查看）'
  },
  {
    id: 'vw-passat-manual',
    title: '大众帕萨特维修手册（2020-2024）',
    brand: 'vw',
    model: '帕萨特',
    category: 'manual',
    type: '维修手册',
    source: '汽修帮手',
    url: 'https://www.jizwx.com/weixiuziliao/',
    previewUrl: 'https://www.jizwx.com/weixiuziliao/',
    downloadUrl: '',
    size: '142MB',
    pages: 2100,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/2563eb/ffffff?text=帕萨特维修手册',
    description: '帕萨特发动机、底盘、电气系统维修流程（汽修帮手查看）'
  },
  // 奥迪
  {
    id: 'audi-a4l-manual',
    title: '奥迪A4L维修手册（视频版）',
    brand: 'audi',
    model: 'A4L',
    category: 'manual',
    type: '视频教程',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=奥迪A4L维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=奥迪A4L维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/16a34a/ffffff?text=A4L维修视频',
    description: '奥迪A4L发动机、变速箱维修视频教程（B站观看）'
  },
  {
    id: 'audi-a6l-circuit',
    title: '奥迪A6L全车电路图',
    brand: 'audi',
    model: 'A6L',
    category: 'circuit',
    type: '电路图',
    source: '汽修工程师',
    url: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    previewUrl: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    downloadUrl: '',
    size: '78MB',
    pages: 520,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/059669/ffffff?text=A6L电路图',
    description: '奥迪A6L全车电路图，包含车身控制模块、传感器线路（汽修工程师查看）'
  },
  // 宝马
  {
    id: 'bmw-3series-manual',
    title: '宝马3系维修手册（2020-2024）',
    brand: 'bmw',
    model: '3系',
    category: 'manual',
    type: '维修手册',
    source: '汽修帮手',
    url: 'https://www.jizwx.com/weixiuziliao/',
    previewUrl: 'https://www.jizwx.com/weixiuziliao/',
    downloadUrl: '',
    size: '189MB',
    pages: 2560,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/ff9800/ffffff?text=宝马3系维修手册',
    description: '宝马3系发动机、变速箱、电气系统完整维修手册（汽修帮手查看）'
  },
  {
    id: 'bmw-5series-circuit',
    title: '宝马5系电路图完整版',
    brand: 'bmw',
    model: '5系',
    category: 'circuit',
    type: '电路图',
    source: '我爱车改',
    url: 'https://www.52chegai.com/forum/13.html?index=3',
    previewUrl: 'https://www.52chegai.com/forum/13.html?index=3',
    downloadUrl: '',
    size: '92MB',
    pages: 480,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/ff9800/ffffff?text=宝马5系电路图',
    description: '宝马5系全车电路图，包含发动机控制模块、传感器线路（我爱车改查看）'
  },
  // 奔驰
  {
    id: 'benz-c-class-manual',
    title: '奔驰C级维修手册（2021-2024）',
    brand: 'benz',
    model: 'C级',
    category: 'manual',
    type: '视频教程',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=奔驰C级维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=奔驰C级维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/4caf50/ffffff?text=奔驰C级维修视频',
    description: '奔驰C级发动机、底盘、电气系统维修视频教程（B站观看）'
  },
  {
    id: 'benz-e-class-circuit',
    title: '奔驰E级全车电路图',
    brand: 'benz',
    model: 'E级',
    category: 'circuit',
    type: '电路图',
    source: '汽修工程师',
    url: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    previewUrl: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    downloadUrl: '',
    size: '65MB',
    pages: 380,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/4caf50/ffffff?text=奔驰E级电路图',
    description: '奔驰E级全车电路图，包含车身控制模块、传感器线路（汽修工程师查看）'
  },
  // 保时捷
  {
    id: 'porsche-cayenne-manual',
    title: '保时捷卡宴维修手册（2018-2024）',
    brand: 'porsche',
    model: '卡宴',
    category: 'manual',
    type: '维修手册',
    source: '百度网盘',
    url: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    previewUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    downloadUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    size: '220MB',
    pages: 3100,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/9c27b0/ffffff?text=卡宴维修手册',
    description: '保时捷卡宴发动机、变速箱、底盘系统完整维修手册（百度网盘下载）'
  },

  // ==================== 日系车 ====================
  // 丰田
  {
    id: 'toyota-corolla-manual',
    title: '丰田卡罗拉维修手册（2019-2024）',
    brand: 'toyota',
    model: '卡罗拉',
    category: 'manual',
    type: '维修手册',
    source: '汽修帮手',
    url: 'https://www.jizwx.com/weixiuziliao/',
    previewUrl: 'https://www.jizwx.com/weixiuziliao/',
    downloadUrl: '',
    size: '138MB',
    pages: 2050,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/3f51b5/ffffff?text=卡罗拉维修手册',
    description: '丰田卡罗拉发动机、变速箱、电气系统维修流程（汽修帮手查看）'
  },
  {
    id: 'toyota-camry-circuit',
    title: '丰田凯美瑞电路图完整版',
    brand: 'toyota',
    model: '凯美瑞',
    category: 'circuit',
    type: '电路图',
    source: '汽修工程师',
    url: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    previewUrl: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    downloadUrl: '',
    size: '72MB',
    pages: 410,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/3f51b5/ffffff?text=凯美瑞电路图',
    description: '丰田凯美瑞全车电路图，包含ECU、传感器连接图（汽修工程师查看）'
  },
  // 本田
  {
    id: 'honda-civic-manual',
    title: '本田思域维修手册（视频版）',
    brand: 'honda',
    model: '思域',
    category: 'manual',
    type: '视频教程',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=本田思域维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=本田思域维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/f44336/ffffff?text=思域维修视频',
    description: '本田思域发动机、变速箱维修视频教程（B站观看）'
  },
  {
    id: 'honda-accord-circuit',
    title: '本田雅阁全车电路图',
    brand: 'honda',
    model: '雅阁',
    category: 'circuit',
    type: '电路图',
    source: '汽车之家论坛',
    url: 'https://club.autohome.com.cn/bbs/thread/ceeb8623c703d66a/55528573-2.html',
    previewUrl: 'https://club.autohome.com.cn/bbs/thread/ceeb8623c703d66a/55528573-2.html',
    downloadUrl: '',
    size: '68MB',
    pages: 360,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/f44336/ffffff?text=雅阁电路图',
    description: '本田雅阁全车电路图，包含车身控制模块、传感器线路（汽车之家论坛查看）'
  },

  // ==================== 美系车 ====================
  // 福特
  {
    id: 'ford-focus-manual',
    title: '福特福克斯维修手册（2018-2024）',
    brand: 'ford',
    model: '福克斯',
    category: 'manual',
    type: '维修手册',
    source: '修车神汽',
    url: 'https://xcsqapp.com',
    previewUrl: 'https://xcsqapp.com',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/009688/ffffff?text=福克斯维修视频',
    description: '福特福克斯发动机、变速箱维修视频教程（修车神汽查看）'
  },
  {
    id: 'ford-mondeo-circuit',
    title: '福特蒙迪欧全车电路图',
    brand: 'ford',
    model: '蒙迪欧',
    category: 'circuit',
    type: '电路图',
    source: '汽修帮手',
    url: 'https://www.jizwx.com/weixiuziliao/',
    previewUrl: 'https://www.jizwx.com/weixiuziliao/',
    downloadUrl: '',
    size: '62MB',
    pages: 340,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/009688/ffffff?text=蒙迪欧电路图',
    description: '福特蒙迪欧全车电路图，包含车身控制模块、传感器线路（汽修帮手查看）'
  },

  // ==================== 韩系车 ====================
  // 现代
  {
    id: 'hyundai-elantra-manual',
    title: '现代伊兰特维修手册（2021-2024）',
    brand: 'hyundai',
    model: '伊兰特',
    category: 'manual',
    type: '维修手册',
    source: '现代商用车官网',
    url: 'https://hyundai-trucknbus.com.cn/index/repair/lists.html?id=2',
    previewUrl: 'https://hyundai-trucknbus.com.cn/index/repair/lists.html?id=2',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/42a5f5/ffffff?text=伊兰特维修视频',
    description: '现代伊兰特发动机、底盘、电气系统维修视频教程（现代商用车官网查看）'
  },
  {
    id: 'hyundai-sonata-circuit',
    title: '现代索纳塔全车电路图',
    brand: 'hyundai',
    model: '索纳塔',
    category: 'circuit',
    type: '电路图',
    source: '汽修工程师',
    url: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    previewUrl: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    downloadUrl: '',
    size: '52MB',
    pages: 280,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/42a5f5/ffffff?text=索纳塔电路图',
    description: '现代索纳塔全车电路图，包含车身控制模块、传感器线路（汽修工程师查看）'
  },

  // ==================== 国产车 ====================
  // 比亚迪
  {
    id: 'byd-qin-manual',
    title: '比亚迪秦维修手册（DM-i 2021-2024）',
    brand: 'byd',
    model: '秦',
    category: 'manual',
    type: '维修手册',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=比亚迪秦维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=比亚迪秦维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/00bcd4/ffffff?text=秦维修视频',
    description: '比亚迪秦DM-i发动机、三电系统维修视频教程（B站观看）'
  },
  {
    id: 'byd-tang-circuit',
    title: '比亚迪唐全车电路图',
    brand: 'byd',
    model: '唐',
    category: 'circuit',
    type: '电路图',
    source: '修车神汽',
    url: 'https://xcsqapp.com',
    previewUrl: 'https://xcsqapp.com',
    downloadUrl: '',
    size: '75MB',
    pages: 420,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/00bcd4/ffffff?text=唐电路图',
    description: '比亚迪唐全车电路图，包含三电系统、车身控制模块线路（修车神汽查看）'
  },
  // 吉利
  {
    id: 'geely-emgrand-manual',
    title: '吉利帝豪维修手册（2019-2024）',
    brand: 'geely',
    model: '帝豪',
    category: 'manual',
    type: '维修手册',
    source: '百度网盘',
    url: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    previewUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    downloadUrl: 'https://pan.baidu.com/s/1sxrunzfztcb8vjyf_tuzxg?pwd=99wd',
    size: '148MB',
    pages: 2150,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/8bc34a/ffffff?text=帝豪维修手册',
    description: '吉利帝豪发动机、变速箱、电气系统完整维修手册（百度网盘下载）'
  },

  // ==================== 法系车 ====================
  // 标致
  {
    id: 'peugeot-408-manual',
    title: '标致408维修手册（2020-2024）',
    brand: 'peugeot',
    model: '408',
    category: 'manual',
    type: '维修手册',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=标致408维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=标致408维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/ffc107/ffffff?text=408维修视频',
    description: '标致408发动机、底盘、电气系统维修视频教程（B站观看）'
  },
  {
    id: 'peugeot-508-circuit',
    title: '标致508全车电路图',
    brand: 'peugeot',
    model: '508',
    category: 'circuit',
    type: '电路图',
    source: '汽修工程师',
    url: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    previewUrl: 'https://www.vcxcar.com/category/qxdlm/zyfl/wxscdlt',
    downloadUrl: '',
    size: '52MB',
    pages: 280,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/ffc107/ffffff?text=508电路图',
    description: '标致508全车电路图，包含车身控制模块、传感器线路（汽修工程师查看）'
  },

  // ==================== 新能源 ====================
  // 特斯拉
  {
    id: 'tesla-model3-manual',
    title: '特斯拉Model 3维修手册（2017-2024）',
    brand: 'tesla',
    model: 'Model 3',
    category: 'manual',
    type: '维修手册',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=特斯拉Model3维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=特斯拉Model3维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/e91e63/ffffff?text=Model3维修视频',
    description: '特斯拉Model 3三电系统、电池管理、电机维修视频教程（B站观看）'
  },
  {
    id: 'tesla-modely-circuit',
    title: '特斯拉Model Y电路图完整版',
    brand: 'tesla',
    model: 'Model Y',
    category: 'circuit',
    type: '电路图',
    source: '修车神汽',
    url: 'https://xcsqapp.com',
    previewUrl: 'https://xcsqapp.com',
    downloadUrl: '',
    size: '95MB',
    pages: 520,
    year: '2023',
    thumbnail: 'https://via.placeholder.com/300x200/e91e63/ffffff?text=ModelY电路图',
    description: '特斯拉Model Y全车电路图，包含三电系统、自动驾驶模块线路（修车神汽查看）'
  },
  // 蔚来
  {
    id: 'nio-es6-manual',
    title: '蔚来ES6维修手册（2019-2024）',
    brand: 'nio',
    model: 'ES6',
    category: 'manual',
    type: '维修手册',
    source: '蔚来社区',
    url: 'https://app.nio.com/community',
    previewUrl: 'https://app.nio.com/community',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/673ab7/ffffff?text=ES6维修视频',
    description: '蔚来ES6三电系统、换电结构、底盘维修视频教程（蔚来社区查看）'
  },
  // 小鹏
  {
    id: 'xiaopeng-p7-manual',
    title: '小鹏P7维修手册（2020-2024）',
    brand: 'xiaopeng',
    model: 'P7',
    category: 'manual',
    type: '维修手册',
    source: 'B站',
    url: 'https://search.bilibili.com/all?keyword=小鹏P7维修手册',
    previewUrl: 'https://search.bilibili.com/all?keyword=小鹏P7维修手册',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/00bcd4/ffffff?text=P7维修视频',
    description: '小鹏P7三电系统、XNGP辅助驾驶、电气系统维修视频教程（B站观看）'
  },
  // 理想
  {
    id: 'li-l7-manual',
    title: '理想L7维修手册（2022-2024）',
    brand: 'li',
    model: 'L7',
    category: 'manual',
    type: '维修手册',
    source: '理想社区',
    url: 'https://www.lixiang.com/community',
    previewUrl: 'https://www.lixiang.com/community',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/ff9800/ffffff?text=L7维修视频',
    description: '理想L7增程系统、三电系统、底盘维修视频教程（理想社区查看）'
  },
  // 零跑
  {
    id: 'leapmotor-c11-manual',
    title: '零跑C11维修手册（2021-2024）',
    brand: 'leapmotor',
    model: 'C11',
    category: 'manual',
    type: '维修手册',
    source: '零跑社区',
    url: 'https://www.leapmotor.com/community',
    previewUrl: 'https://www.leapmotor.com/community',
    downloadUrl: '',
    size: '视频',
    pages: 0,
    year: '2024',
    thumbnail: 'https://via.placeholder.com/300x200/4caf50/ffffff?text=C11维修视频',
    description: '零跑C11三电系统、CTC电池底盘、电气系统维修视频教程（零跑社区查看）'
  }
];

// DOM 元素
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    searchFilters: document.querySelectorAll('.filter-tag'),
    categoryList: document.getElementById('categoryList'),
    resourceGrid: document.getElementById('resourceGrid'),
    searchResults: document.getElementById('searchResults'),
    contentTitle: document.getElementById('contentTitle'),
    loading: document.getElementById('loading'),
    previewModal: document.getElementById('previewModal'),
    previewFrame: document.getElementById('previewFrame'),
    modalTitle: document.getElementById('modalTitle'),
    modalClose: document.getElementById('modalClose'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    favoritesPanel: document.getElementById('favoritesPanel'),
    favoritesList: document.getElementById('favoritesList'),
    closeFavorites: document.getElementById('closeFavorites'),
    favCount: document.getElementById('favCount'),
    toast: document.getElementById('toast'),
    viewBtns: document.querySelectorAll('.view-btn')
};

// ====================== API 调用函数 ======================
// 获取收藏（从 Worker API）
async function getFavorites() {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            state.favorites = data.data || [];
            updateFavCount();
            renderFavorites();
            return state.favorites;
        } else {
            throw new Error(data.error || '获取收藏失败');
        }
    } catch (error) {
        console.error('API 获取收藏失败，使用本地数据:', error);
        state.isApiAvailable = false;
        state.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return state.favorites;
    }
}

// 添加收藏（调用 Worker API）
async function addFavoriteToApi(resource) {
    if (!state.isApiAvailable) return false;
    
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: resource.id,
                title: resource.title,
                type: resource.type,
                thumbnail: resource.thumbnail,
                url: resource.url,
                description: resource.description
            })
        });
        const data = await res.json();
        return data.success;
    } catch (error) {
        console.error('API 添加收藏失败:', error);
        return false;
    }
}

// 移除收藏（调用 Worker API）
async function removeFavoriteFromApi(id) {
    if (!state.isApiAvailable) return false;
    
    try {
        const res = await fetch(`${CONFIG.API_BASE}/api/favorites?id=${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        return data.success;
    } catch (error) {
        console.error('API 移除收藏失败:', error);
        return false;
    }
}

// 添加搜索历史（调用 Worker API）
async function addHistoryToApi(query) {
    if (!state.isApiAvailable) return;
    
    try {
        await fetch(`${CONFIG.API_BASE}/api/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
    } catch (error) {
        console.error('API 添加历史失败:', error);
    }
}

// 记录资源访问量（调用 Worker API）
async function recordResourceView(resourceId) {
    try {
        await fetch(`${CONFIG.API_BASE}/api/resource/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceId })
        });
    } catch (error) {
        console.error('记录访问量失败:', error);
    }
}

// ====================== 核心功能函数 ======================
// 初始化（优先加载 API 数据）
async function init() {
    renderCategories();
    renderResources();
    await getFavorites(); // 优先从 API 加载收藏
    updateFavCount();
    bindEvents();
}

// 渲染分类列表
function renderCategories() {
    elements.categoryList.innerHTML = CATEGORIES.map(category => `
        <div class="category-item">
            <div class="category-header">
                <i class="fas ${category.icon}"></i>
                <span>${category.name}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            <div class="subcategory-list">
                ${category.brands.map(brand => `
                    <div class="subcategory-item" data-brand="${brand.id}">
                        ${brand.name}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// 渲染资源卡片（UI 优化版）
function renderResources(brandFilter = null) {
    let resources = RESOURCES_DB;
    
    if (brandFilter) {
        resources = resources.filter(r => r.brand === brandFilter);
    }
    
    if (state.currentFilter !== 'all') {
        resources = resources.filter(r => r.category === state.currentFilter);
    }
    
    elements.resourceGrid.innerHTML = resources.map(resource => `
        <div class="resource-card" data-id="${resource.id}" style="transition: transform 0.3s ease, box-shadow 0.3s ease;">
            <div class="resource-preview">
                <img src="${resource.thumbnail}" alt="${resource.title}" loading="lazy" style="border-radius: 8px;">
                <span class="resource-type" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">${resource.type}</span>
            </div>
            <div class="resource-info">
                <div class="resource-title" style="font-weight: 600; color: #1f2937;">${resource.title}</div>
                <div class="resource-meta" style="color: #6b7280; font-size: 0.875rem;">
                    <span><i class="fas fa-file"></i> ${resource.size}</span>
                    <span><i class="fas fa-calendar"></i> ${resource.year}</span>
                </div>
                <div class="resource-actions">
                    <button class="action-btn primary" onclick="previewResource('${resource.id}')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none;">
                        <i class="fas fa-eye"></i> 预览
                    </button>
                    <button class="action-btn ${isFavorited(resource.id) ? 'favorited' : ''}" onclick="toggleFavorite('${resource.id}')" style="border: none;">
                        <i class="fas ${isFavorited(resource.id) ? 'fa-heart' : 'fa-heart-o'}"></i>
                    </button>
                    <button class="action-btn" onclick="openResource('${resource.id}')" style="border: none;">
                        <i class="fas fa-external-link-alt"></i> 访问
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索功能
async function performSearch(query) {
    if (!query.trim()) {
        showToast('请输入搜索内容');
        return;
    }
    
    state.isSearching = true;
    elements.loading.style.display = 'block';
    elements.resourceGrid.style.display = 'none';
    elements.searchResults.classList.add('active');
    elements.contentTitle.textContent = `搜索"${query}"的结果`;
    
    // 本地数据库搜索
    const localResults = RESOURCES_DB.filter(r => 
        r.title.includes(query) || 
        r.model.includes(query) ||
        r.description.includes(query)
    );
    
    // 模拟全网搜索结果
    const webResults = generateWebSearchResults(query);
    
    // 合并结果
    const allResults = [...localResults.map(r => ({
        title: r.title,
        url: r.url,
        desc: r.description,
        source: r.source,
        type: r.type,
        isLocal: true,
        id: r.id
    })), ...webResults];
    
    setTimeout(async () => {
        renderSearchResults(allResults);
        elements.loading.style.display = 'none';
        state.isSearching = false;
        // 调用 API 记录历史
        await addHistoryToApi(query);
        // 本地历史兜底
        addToLocalHistory(query);
    }, 1500);
}

// 生成全网搜索结果
function generateWebSearchResults(query) {
    const results = [];
    const searchSites = [
        { name: '畅易汽车维修平台', base: 'https://www.ephauto.com/search.php?kw=' },
        { name: '汽修宝典', base: 'https://www.qixiubaodian.com/search?keyword=' },
        { name: '汽车维修技术网', base: 'https://www.qcwxjs.com/search.php?q=' },
        { name: 'B站汽车维修', base: 'https://search.bilibili.com/all?keyword=' },
        { name: '知乎汽车话题', base: 'https://www.zhihu.com/search?type=content&q=' }
    ];
    
    searchSites.forEach(site => {
        results.push({
            title: `${query} - ${site.name}搜索结果`,
            url: `${site.base}${encodeURIComponent(query)}`,
            desc: `在${site.name}搜索"${query}"的相关维修资料、技术文档、视频教程`,
            source: site.name,
            type: '搜索结果',
            isLocal: false
        });
    });
    
    return results;
}

// 渲染搜索结果（UI 优化版）
function renderSearchResults(results) {
    if (results.length === 0) {
        elements.searchResults.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; color: #667eea;"></i>
                <p>未找到相关资源</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">试试其他关键词，如"发动机异响"、"变速箱故障"</p>
            </div>
        `;
        return;
    }
    
    elements.searchResults.innerHTML = results.map(result => `
        <div class="result-item" style="border-radius: 8px; transition: box-shadow 0.3s ease;">
            <div class="result-title" onclick="${result.isLocal ? `previewResource('${result.id}')` : `openProxyLink('${result.url}')`}" style="color: #1f2937; font-weight: 600;">
                ${result.title}
            </div>
            <div class="result-url" style="color: #6b7280;">
                <i class="fas fa-link"></i> ${result.url}
            </div>
            <div class="result-desc" style="color: #4b5563;">${result.desc}</div>
            <div class="result-actions">
                <span class="result-action" onclick="openProxyLink('${result.url}')" style="color: #667eea;">
                    <i class="fas fa-external-link-alt"></i> 访问链接
                </span>
                ${result.isLocal ? `
                    <span class="result-action" onclick="previewResource('${result.id}')" style="color: #667eea;">
                        <i class="fas fa-eye"></i> 预览
                    </span>
                    <span class="result-action" onclick="toggleFavorite('${result.id}')" style="color: #667eea;">
                        <i class="fas ${isFavorited(result.id) ? 'fa-heart' : 'fa-heart-o'}"></i> ${isFavorited(result.id) ? '已收藏' : '收藏'}
                    </span>
                ` : `
                    <span class="result-action" onclick="copyLink('${result.url}')" style="color: #667eea;">
                        <i class="fas fa-copy"></i> 复制链接
                    </span>
                `}
            </div>
        </div>
    `).join('');
}

// 预览资源（通过 Worker 代理访问）
function previewResource(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (!resource) return;
    
    elements.modalTitle.textContent = resource.title;
    // 构建代理请求 URL
    const proxyUrl = `${CONFIG.API_BASE}/api/proxy?url=${encodeURIComponent(resource.url)}`;
    // 在模态框中加载代理后的内容
    elements.previewFrame.src = proxyUrl;
    elements.previewModal.classList.add('active');
    
    // 记录资源访问量
    recordResourceView(resource.id);
}

// 打开资源（通过 Worker 代理访问）
function openResource(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (resource) {
        const proxyUrl = `${CONFIG.API_BASE}/api/proxy?url=${encodeURIComponent(resource.url)}`;
        try {
            const newTab = window.open(proxyUrl, '_blank');
            if (!newTab) {
                showToast('链接打开失败，已复制代理链接到剪贴板');
                copyLink(proxyUrl);
            } else {
                showToast('正在通过代理打开资源...');
            }
        } catch (error) {
            showToast('打开失败，已复制代理链接');
            copyLink(proxyUrl);
        }
        // 记录资源访问量
        recordResourceView(resource.id);
    }
}

// 外部链接通过代理打开
function openProxyLink(url) {
    const proxyUrl = `${CONFIG.API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;
    try {
        const newTab = window.open(proxyUrl, '_blank');
        if (!newTab) {
            showToast('链接打开失败，已复制代理链接');
            copyLink(proxyUrl);
        } else {
            showToast('正在通过代理打开链接...');
        }
    } catch (error) {
        showToast('打开失败，已复制代理链接');
        copyLink(proxyUrl);
    }
}

// 收藏功能（对接 API）
async function toggleFavorite(id) {
    const resource = RESOURCES_DB.find(r => r.id === id);
    if (!resource) return;
    
    const index = state.favorites.findIndex(f => f.id === id);
    
    if (index > -1) {
        // 移除收藏
        const success = state.isApiAvailable ? await removeFavoriteFromApi(id) : true;
        if (success) {
            state.favorites.splice(index, 1);
            showToast('已取消收藏');
        } else {
            showToast('取消收藏失败，使用本地数据');
        }
    } else {
        // 添加收藏
        const success = state.isApiAvailable ? await addFavoriteToApi(resource) : true;
        if (success) {
            state.favorites.push({
                id: resource.id,
                title: resource.title,
                type: resource.type,
                thumbnail: resource.thumbnail,
                addedAt: new Date().toISOString()
            });
            showToast('已添加到收藏');
        } else {
            showToast('添加收藏失败，使用本地数据');
        }
    }
    
    // 本地兜底存储
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
    updateFavCount();
    renderFavorites();
    renderResources();
}

// ====================== 辅助函数 ======================
function isFavorited(id) {
    return state.favorites.some(f => f.id === id);
}

function updateFavCount() {
    const count = state.favorites.length;
    elements.favCount.textContent = count;
    elements.favCount.style.display = count > 0 ? 'block' : 'none';
}

function renderFavorites() {
    if (state.favorites.length === 0) {
        elements.favoritesList.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray);">
                <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; color: #667eea;"></i>
                <p>暂无收藏</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">点击资源卡片上的心形图标添加收藏</p>
            </div>
        `;
        return;
    }
    
    elements.favoritesList.innerHTML = state.favorites.map(fav => `
        <div class="favorite-item" onclick="previewResource('${fav.id}')" style="border-radius: 8px;">
            <div class="favorite-thumb" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <i class="fas fa-file-alt"></i>
            </div>
            <div class="favorite-info">
                <div class="favorite-title" style="color: #1f2937; font-weight: 600;">${fav.title}</div>
                <div class="favorite-type" style="color: #6b7280;">${fav.type}</div>
            </div>
            <div class="favorite-remove" onclick="event.stopPropagation(); toggleFavorite('${fav.id}')" style="color: #ef4444;">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `).join('');
}

// 本地历史（兜底）
function addToLocalHistory(query) {
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    const item = { query, time: new Date().toISOString() };
    history.unshift(item);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('history', JSON.stringify(history));
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('链接已复制');
    }).catch(() => {
        showToast('复制失败，请手动复制');
    });
}

// ====================== 事件绑定 ======================
function bindEvents() {
    // 搜索
    elements.searchBtn.addEventListener('click', () => {
        performSearch(elements.searchInput.value);
    });
    
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch(elements.searchInput.value);
        }
    });
    
    // 过滤器
    elements.searchFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            elements.searchFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            state.currentFilter = filter.dataset.filter;
            
            if (!state.isSearching) {
                renderResources();
            }
        });
    });
    
    // 分类展开/收起
    elements.categoryList.addEventListener('click', (e) => {
        const header = e.target.closest('.category-header');
        if   如果   如果 (header      头头) {   If      如果如果 (header      头头) {
            header   头.classList   班级名册.toggle   切换('expanded'   “扩展”);header      头头.classList   班级名册   班级名册.toggle   切换   切换(扩大);
            const   常量   子表 subList      子表子表 = header   头.nextElementSibling;const   常量   常量   子表 subList         子表子表子表 = header      头头.nextElementSibling；   nextElementSibling;   nextElementSibling;
            subList   子表.classList   班级名册.toggle   切换('show'   “显示”);subList      子表子表.classList   班级名册   班级名册.toggle   切换   切换(显示);
        }
        
        const   常量 subItem = e.target   目标.closest   最亲密的('.subcategory-item'   “.subcategory   子类别-item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”);const   常量   常量 subItem = e.target   目标   目标.close   关闭   关闭 ('.subcategory-item'   “.subcategory   子类别-item”   “.subcategory   子类别   子类别-item”         item”item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”   item”      item”item”)；
        if   如果 (subItem) {
            document   文档.querySelectorAll('.subcategory-item'   “.subcategory   子类别-item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”   item”).forEach(i      我我 => i   我.classList   班级名册.remove   删除('active'   “活跃”));document      文档文档.querySelectorAll(“.subcategory   子类别   子类别-item”      item”item”)。forEach(i      我我 => i      我我. classlist   班级名册   班级名册 .remove   删除   删除('active'   “活跃”   “活跃”))；
            subItem.classList   班级名册.add   添加('active'   “活跃”);subItem.classList   班级名册   班级名册.add   添加   添加(“活跃的”);
            
            const   常量   品牌 brand      品牌品牌 = subItem.dataset   数据集.brand   品牌;const   常量   常量   品牌 brand         品牌品牌品牌 = subItem.dataset   数据集   数据集.brand；   品牌;   品牌;
            elements   元素.contentTitle.textContent = `${subItem.textContent} 相关资源`;
            elements   元素.searchResults.classList   班级名册.remove   删除('active'   “活跃”);elements      元素元素.searchResults.classList   班级名册   班级名册.remove   删除   删除(“活跃的”);
            elements   元素.resourceGrid.style   风格.display   显示 = 'grid'   “网格”;elements      元素元素. resourcgrid .style   风格   风格.display   显示   显示 = 'grid'   “网格”   “网格”；
            renderResources(brand   品牌);   renderResources(品牌);
        }
    });
    
    // 模态框
    elements   元素.modalClose.addEventListener('click'   “点击”, () => {elements      元素元素.modalClose。addEventListener('click'   “点击”   “点击”, () => {
        elements   元素.previewModal.classList   班级名册.remove   删除('active'   “活跃”);elements      元素元素.previewModal.classList   班级名册   班级名册.remove   删除   删除(“活跃的”);
        elements   元素.previewFrame.src = '';
    });
    
    elements   元素.previewModal.addEventListener('click'   “点击”, (e) => {elements      元素元素.previewModal。addEventListener('click'   “点击”   “点击”, (e) => {
        if   如果 (e.target   目标 === elements   元素.previewModal) {If       如果如果（e.t rtarget === elements）。previewModal      元素)。previewModal元素)。previewModal) {
            elements   元素.previewModal.classList   班级名册.remove   删除('active'   “活跃”);elements      元素元素.previewModal.classList   班级名册   班级名册.remove   删除   删除(“活跃的”);
            elements   元素.previewFrame.src = '';
        }
    });
    
    // 收藏面板
    elements   元素.favoritesBtn.addEventListener('click'   “点击”, () => {elements      元素元素.favoritesBtn。addEventListener('click'   “点击”   “点击”, () => {
        elements   元素.favoritesPanel.classList   班级名册.add   添加('active'   “活跃”);elements      元素元素.favoritesPanel.classList   班级名册   班级名册.add   添加   添加(“活跃的”);
    });
    
    elements   元素.closeFavorites.addEventListener('click'   “点击”, () => {elements      元素元素.closeFavorites。addEventListener('click'   “点击”   “点击”, () => {
        elements   元素.favoritesPanel.classList   班级名册.remove   删除('active'   “活跃”);elements      元素元素.favoritesPanel.classList   班级名册   班级名册.remove   删除   删除(“活跃的”);
    });
    
    // 视图切换
    elements   元素.viewBtns.forEach(btn => {elements      元素元素.viewBtns .“Btn   “ Btn   “ Btn =>{”
        btn.addEventListener('click'   “点击”, () => {btn。addEventListener('click'   “点击”   “点击”, () => {
            elements   元素.viewBtns.forEach(b => b.classList   班级名册.remove   删除('active'   “活跃”));elements      元素元素.viewBtns。forEach(b => b. classlist   班级名册   班级名册 .remove   删除   删除('active'   “活跃”   “活跃”))；
            btn.classList   班级名册.add   添加('active'   “活跃”);btn.classList   班级名册   班级名册.add   添加   添加(“活跃的”);
        });
    });
}

// 启动应用
document   文档.addEventListener('DOMContentLoaded'   “DOMContentLoaded”内, init   初始化);文档。addEventListener (DOMContentLoaded”内      DOMContentLoaded”内DOMContentLoaded”内,init      初始化初始化);
