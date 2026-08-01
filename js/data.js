// ==================== 三店联动 · 餐厅数据配置 ====================
// 无需微信公众号，顾客填手机号即可领取红包
// 核销方式：顾客出示二维码 → 店员扫码核销

const RESTAURANTS = [
  {
    id: 1,
    name: "意葡 La Taverna",
    subtitle: "励骏庞都店",
    category: "意式·葡式料理",
    key: "italian",
    logo: "🍝",
    cover: "",
    color: "#C0392B",
    colorLight: "#FADBD8",
    dianping: { rating: "4.2", avgPrice: "¥121/人", rank: "珠海提拉米苏第10名", dishes: 137 },
    redpacket: {
      amount: 15, minSpend: 150, total: 300, validDays: 30,
      desc: "满¥150可用，有效期30天"
    },
    info: {
      address: "横琴粤澳深度合作区琴政路44号励骏庞都广场AL-105号商铺",
      phone: "0756-8800576",
      phone2: "15919156700",
      hours: "周一至五 11:00-23:00 | 周末 11:00-23:30",
      lat: 22.1380,
      lng: 113.5310,
    },
    description: "意葡餐厅自2019年珠海横琴中央汇店起步，2023年进驻横琴励骏庞都店，秉承「零添加剂，健康饮食」的宗旨。以地中海美食为主题，涵盖意大利、葡萄牙、西班牙菜。2021-2024年连续四年获评放心消费承诺单位及诚信店，2023年荣登大湾区杂志专访，获评珠海市「唐家肴」美食大赛银奖。大众点评4.2分，137道网友推荐菜，提拉米苏位列珠海第10名。",
    highlight: "大众点评4.2分 · 珠海提拉米苏TOP10 · 连续四年诚信店 · 唐家肴银奖",
    dishes: [
      { name: "葡式柠檬花甲", price: 68, desc: "网友推荐TOP1，新鲜花甲配柠檬白酒", emoji: "🍋", dpRank: 1, img: "" },
      { name: "提拉米苏", price: 38, desc: "珠海第10名，经典意式手工甜品", emoji: "🍰", dpRank: 2, img: "" },
      { name: "意式千层面", price: 78, desc: "网友推荐TOP3，多层手工面皮", emoji: "🧀", dpRank: 3, img: "" },
      { name: "美味鹅肝牛柳扒", price: 188, desc: "进口牛柳配鹅肝，奢华之选", emoji: "🥩", dpRank: 4, img: "" },
      { name: "意式萨拉米披萨", price: 88, desc: "经典萨拉米，石炉现烤薄底", emoji: "🍕", dpRank: 5, img: "" },
      { name: "招牌海虾黑面", price: 78, desc: "墨鱼汁意面配大虾，招牌必点", emoji: "🦐", dpRank: 6, img: "" }
    ],
    combos: [
      { name: "双人浪漫套餐", content: "萨拉米披萨×1 + 千层面×1 + 鹅肝牛柳扒×1 + 饮品×2 + 提拉米苏×2", originalPrice: 538, price: 388, tag: "立省¥150" },
      { name: "四人欢聚套餐", content: "披萨×2 + 千层面×2 + 柠檬花甲×1 + 烤鸡×1 + 饮品×4", originalPrice: 678, price: 498, tag: "立省¥180" },
      { name: "六人派对套餐", content: "牛柳扒×2 + 披萨×2 + 千层面×3 + 花甲×2 + 饮品×6 + 提拉米苏×3", originalPrice: 1288, price: 888, tag: "立省¥400" }
    ],
    gallery: []
  },
  {
    id: 2,
    name: "西贡码头·越南餐厅",
    subtitle: "横琴口岸店",
    category: "地道越南料理",
    key: "saigon",
    logo: "🍜",
    cover: "img/saigon/storefront.jpg",
    color: "#2E7D32",
    colorLight: "#D5F5E3",
    dianping: { rating: "4.3", avgPrice: "¥72/人", rank: "横琴口岸热门越南菜", dishes: 86 },
    redpacket: {
      amount: 10, minSpend: 100, total: 400, validDays: 30,
      desc: "满¥100可用，有效期30天"
    },
    info: {
      address: "横琴粤澳深度合作区环岛东路2050号横琴口岸C区408号铺",
      phone: "0756-8800117",
      phone2: "13128568852",
      hours: "周一至四 10:30-22:30 | 周五至日 10:30-23:00",
      lat: 22.1210,
      lng: 113.5430,
    },
    description: "西贡厨房，跨越四十载的越南味觉史诗。由英越传奇主厨Ailee Dang与跨界企业家Mary Tang共同主理。主厨Ailee拥有逾40年辉煌履历——从伯明翰街角起步到创立德比郡首家日式铁板烧餐厅，将半生淬炼的厨艺哲学倾注于越南料理。澳门日报、今日头条等多家媒体报道，被誉为「横琴最值得打卡的越南餐厅」。",
    highlight: "大众点评4.3分 · 澳门日报推荐 · 四十年传奇主厨 · 口岸C位",
    dishes: [
      { name: "火车头牛肉河粉", price: 48, desc: "进口阿根廷牛肉，整鸡整骨熬汤", emoji: "🍜", dpRank: 1, img: "img/saigon/pho.jpg" },
      { name: "西贡青柠鱼", price: 88, desc: "新鲜鲈鱼配青柠，一秒到湄公河", emoji: "🐟", dpRank: 2, img: "img/saigon/lime_fish.jpg" },
      { name: "香茅蜂蜜猪颈肉", price: 58, desc: "香茅提香蜂蜜滋润，层次分明", emoji: "🐷", dpRank: 3, img: "img/saigon/pork_neck.jpg" },
      { name: "鲜虾米纸卷", price: 38, desc: "整只鲜虾裹透明米纸，清新满足", emoji: "🦐", dpRank: 4, img: "img/saigon/spring_rolls.jpg" },
      { name: "冷盘牛扒", price: 108, desc: "嫩滑牛柳配自制蒜蓉辣椒酱", emoji: "🥩", dpRank: 5, img: "img/saigon/beef_salad.jpg" },
      { name: "越式菠萝海鲜炒饭", price: 58, desc: "整颗菠萝盛装，视觉味觉双享受", emoji: "🍍", dpRank: 6, img: "img/saigon/snacks.jpg" }
    ],
    combos: [
      { name: "双人品鲜套餐", content: "火车头河粉×2 + 米纸卷×1 + 青柠鱼×1 + 饮品×2", originalPrice: 316, price: 238, tag: "立省¥78" },
      { name: "四人越式盛宴", content: "河粉×2 + 青柠鱼×1 + 猪颈肉×1 + 冷盘牛扒×1 + 菠萝饭×1 + 饮品×4", originalPrice: 540, price: 398, tag: "立省¥142" },
      { name: "六人聚会套餐", content: "河粉×4 + 青柠鱼×2 + 猪颈肉×2 + 牛扒×1 + 菠萝饭×2 + 米纸卷×2 + 饮品×6", originalPrice: 966, price: 688, tag: "立省¥278" }
    ],
    gallery: [
      "img/saigon/storefront.jpg",
      "img/saigon/hero.jpg",
      "img/saigon/env_dining.jpg"
    ]
  },
  {
    id: 3,
    name: "西贡码头·融合餐厅",
    subtitle: "横琴彩虹苑店",
    category: "越南融合创意菜",
    key: "fusion",
    logo: "🍲",
    cover: "img/saigon/env_dining.jpg",
    color: "#E67E22",
    colorLight: "#FDEBD0",
    dianping: { rating: "4.1", avgPrice: "¥58/人", rank: "彩虹苑亲民越南菜", dishes: 42 },
    redpacket: {
      amount: 8, minSpend: 80, total: 350, validDays: 30,
      desc: "满¥80可用，有效期30天"
    },
    info: {
      address: "横琴粤澳深度合作区子期南道120号彩虹苑122-2号商铺",
      phone: "18688153210",
      phone2: "",
      hours: "11:00 - 22:00",
      lat: 22.1310,
      lng: 113.5260,
    },
    description: "西贡码头·融合餐厅延续西贡厨房的越南味觉传承，在传统越南料理基础上融入更多创意元素。同样由英越传奇主厨Ailee Dang与Mary Tang主理，彩虹苑店更贴近社区，价格亲民，主打中越融合创意菜，深受周边居民和上班族喜爱。",
    highlight: "社区温暖用餐 · 中越融合创意 · 亲民好味道 · 人均¥58",
    dishes: [
      { name: "西贡码头招牌河粉", price: 38, desc: "每日鲜熬汤底，越南街边经典", emoji: "🍜", dpRank: 1, img: "img/saigon/pho.jpg" },
      { name: "香茅鸡大虾檬粉", price: 58, desc: "香茅鸡配大虾，招牌组合", emoji: "🍗", dpRank: 2, img: "img/saigon/pork_neck.jpg" },
      { name: "冷盘牛扒", price: 98, desc: "越式冷盘做法，清爽不腻", emoji: "🥩", dpRank: 3, img: "img/saigon/beef_salad.jpg" },
      { name: "鲜虾芒果青木瓜沙律", price: 38, desc: "鲜虾芒果配青木瓜，酸甜清爽", emoji: "🥗", dpRank: 4, img: "img/saigon/spring_rolls.jpg" },
      { name: "越式海鲜菠萝炒饭", price: 48, desc: "菠萝的甜与海鲜的鲜完美融合", emoji: "🍍", dpRank: 5, img: "img/saigon/snacks.jpg" },
      { name: "桂林米粉", price: 28, desc: "中越融合特色，地道桂林风味", emoji: "🍲", dpRank: 6, img: "img/saigon/pho.jpg" }
    ],
    combos: [
      { name: "双人温馨套餐", content: "招牌河粉×2 + 鸡肉串烧×1 + 青木瓜沙律×1 + 饮品×2", originalPrice: 196, price: 138, tag: "立省¥58" },
      { name: "四人欢乐套餐", content: "河粉×2 + 桂林米粉×2 + 香茅鸡×1 + 菠萝饭×1 + 沙律×1 + 饮品×4", originalPrice: 376, price: 278, tag: "立省¥98" },
      { name: "六人团聚套餐", content: "河粉×3 + 米粉×2 + 牛扒×1 + 香茅鸡×2 + 菠萝饭×2 + 沙律×2 + 饮品×6", originalPrice: 668, price: 488, tag: "立省¥180" }
    ],
    gallery: [
      "img/saigon/storefront.jpg",
      "img/saigon/hero.jpg",
      "img/saigon/env_dining.jpg"
    ]
  }
];

// ==================== 红包系统 (API 版 - 所有设备共享数据) ====================
const API_BASE = window.location.origin;  // API 与静态文件在同一服务器

let STATS = { scanCount: 0, redpacketClaimed: 0, redpacketUsed: 0 };
let claimedRedpackets = [];

// API 调用封装
async function apiFetch(path, options, token) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(API_BASE + path, {
      headers,
      ...options,
    });
    return await res.json();
  } catch (e) {
    console.error('API调用失败:', path, e.message);
    return { success: false, message: '网络连接失败，请检查网络后重试' };
  }
}

// 加���统计数据
async function loadStats() {
  const res = await apiFetch('/api/stats');
  if (res.success) STATS = res.data;
}

// 记录扫码
async function recordScan() {
  const res = await apiFetch('/api/scan', { method: 'POST' });
  if (res.success) STATS = res.data;
}

// 领取红包（异步，返回 Promise）
async function claimRedpacket(phone, restaurantId) {
  const res = await apiFetch('/api/claim', {
    method: 'POST',
    body: JSON.stringify({ phone, restaurantId }),
  });
  if (res.success) {
    // 同步更新本地缓存
    claimedRedpackets.push(res.redpacket);
  }
  return res;
}

// 获取某手机号的所有红包
async function getMyRedpackets(phone) {
  const res = await apiFetch('/api/my?phone=' + encodeURIComponent(phone));
  if (res.success) {
    claimedRedpackets = res.data;
    return res.data;
  }
  return [];
}

// 获取某手机号在某餐厅的红包
async function getRedpacketForRestaurant(phone, restaurantId) {
  const res = await apiFetch('/api/my?phone=' + encodeURIComponent(phone));
  if (res.success) {
    return res.data.find(r => r.restaurantId === restaurantId) || null;
  }
  return null;
}

// 导出红包二维码数据（紧凑JSON，店员扫码后解析）
function getRedpacketQRData(rp) {
  return JSON.stringify({
    i: rp.id,
    n: rp.pin,
    r: rp.restaurantName,
    a: rp.amount,
    m: rp.minSpend,
    e: new Date(rp.expireAt).toISOString().slice(0, 10),
    p: rp.phoneMasked
  });
}

// 返回红包二维码图片URL（本地生成，不依赖外部API）
function getRedpacketQRUrl(rp) {
  const data = getRedpacketQRData(rp);
  if (typeof QRCodeLib !== 'undefined' && QRCodeLib.toDataURL) {
    try {
      return QRCodeLib.toDataURL(data, 200, 2);
    } catch (e) {
      console.error('QR生成失败:', e);
    }
  }
  return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data);
}

// 渲染红包二维码到img元素
function renderRedpacketQRImg(rp, imgElement) {
  const url = getRedpacketQRUrl(rp);
  imgElement.src = url;
  imgElement.style.display = 'block';
}

// 核销红包（异步，管理员需传 token）
async function useRedpacket(id, pin, token) {
  const res = await apiFetch('/api/verify', {
    method: 'POST',
    body: JSON.stringify({ id, pin }),
  }, token);
  if (res.success) {
    // 更新本地缓存
    const idx = claimedRedpackets.findIndex(r => r.id.toUpperCase() === id.toUpperCase());
    if (idx >= 0) {
      claimedRedpackets[idx].used = true;
      claimedRedpackets[idx].usedAt = res.redpacket.usedAt;
    }
  }
  return res;
}

// 根据ID查找红包（管理员使用，异步）
async function findRedpacketById(id) {
  const res = await apiFetch('/api/list');
  if (res.success) {
    claimedRedpackets = res.data;
    return res.data.find(r => r.id.toUpperCase() === id.toUpperCase()) || null;
  }
  return null;
}

// 获取所有红包列表（异步）
async function getAllRedpackets() {
  const res = await apiFetch('/api/list');
  if (res.success) claimedRedpackets = res.data;
  return claimedRedpackets;
}

// ==================== 导航 ====================

function getNavUrl(restaurant) {
  const name = restaurant.name;
  const lat = restaurant.info.lat;
  const lng = restaurant.info.lng;
  const encodedName = encodeURIComponent(name);
  const encodedAddr = encodeURIComponent(restaurant.info.address);
  return {
    amap: `https://uri.amap.com/navigation?to=${lng},${lat},${encodedName}&mode=car&callnative=1`,
    bmap: `https://api.map.baidu.com/direction?destination=name:${encodedName}|latlng:${lat},${lng}&coord_type=gcj02&mode=driving&output=html&src=webapp.restaurant.nav`
  };
}

// ==================== 工具函数 ====================
function utf8ToBase64(str) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ==================== 分享核销链接 ====================
// 生成可分享的核销链接（跨设备可用）
function getVerifyShareUrl(rp) {
  const verifyData = {
    i: rp.id,
    n: rp.pin,
    r: rp.restaurantName,
    a: rp.amount,
    m: rp.minSpend,
    e: new Date(rp.expireAt).toISOString().slice(0, 10),
    p: rp.phoneMasked
  };
  const json = JSON.stringify(verifyData);
  const encoded = encodeURIComponent(utf8ToBase64(json));
  const base = window.location.origin + window.location.pathname.replace('index.html', '');
  return base + 'verify.html?d=' + encoded;
}

// ==================== 清除数据 ====================
async function clearAllData(token) {
  const res = await apiFetch('/api/clear', { method: 'POST' }, token);
  if (res.success) {
    STATS = { scanCount: 0, redpacketClaimed: 0, redpacketUsed: 0 };
    claimedRedpackets = [];
  }
  return res;
}

// ==================== 初始化 ====================
// 从服务器加载初始数据
(async function init() {
  await loadStats();
  try { await getAllRedpackets(); } catch (e) { /* 非关键 */ }
})();
