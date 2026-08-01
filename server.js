// ==================== 三店联动 · Node.js 服务端 v3.0 ====================
// 静态文件服务 + REST API + 操作日志 + 内容管理 + 图片上传
// 数据存储在 data/ 目录下的 JSON 文件中，所有设备共享同一份数据
// 启动: node server.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ====== 配置区 ======
const WECHAT_APPID = process.env.WECHAT_APPID || '';
const WECHAT_SECRET = process.env.WECHAT_SECRET || '';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 管理员 Token 管理（内存）
const adminTokens = new Map(); // token -> { username, createdAt }

// 确保数据目录存在
[DATA_DIR, UPLOAD_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ====== 数据文件路径 ======
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const CLAIMED_FILE = path.join(DATA_DIR, 'claimed.json');
const RESTAURANTS_FILE = path.join(DATA_DIR, 'restaurants.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

// ====== 文件锁 ======
let writeLock = false;
const writeQueue = [];

function queueWrite(filePath, data, callback) {
  writeQueue.push({ filePath, data, callback });
  processWriteQueue();
}

function processWriteQueue() {
  if (writeLock || writeQueue.length === 0) return;
  writeLock = true;
  const { filePath, data, callback } = writeQueue.shift();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    callback(null);
  } catch (e) { callback(e); }
  finally { writeLock = false; processWriteQueue(); }
}

function readJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) { console.error('Read error:', filePath, e.message); }
  return defaultValue;
}

function writeJSON(filePath, data) {
  return new Promise((resolve, reject) => {
    queueWrite(filePath, data, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

// ====== 初始化数据 ======
let stats = readJSON(STATS_FILE, { scanCount: 0, redpacketClaimed: 0, redpacketUsed: 0 });
let claimedRedpackets = readJSON(CLAIMED_FILE, []);
let savedRestaurants = readJSON(RESTAURANTS_FILE, null);
let logs = readJSON(LOGS_FILE, []);

// 默认餐厅配置
const DEFAULT_RESTAURANTS = [
  {
    id: 1,
    name: "意葡 La Taverna", nameEn: "La Taverna",
    subtitle: "励骏庞都店", subtitleEn: "Lijun Pangdu",
    category: "意式·葡式料理", categoryEn: "Italian & Portuguese Cuisine",
    key: "italian", logo: "🍝",
    cover: "img/italian/storefront.png",
    color: "#C0392B", colorLight: "#FADBD8",
    dianping: { rating: "4.2", avgPrice: "¥121/人", avgPriceEn: "¥121/person", rank: "珠海提拉米苏第10名", rankEn: "#10 Tiramisu in Zhuhai", dishes: 137 },
    redpacket: { amount: 15, minSpend: 150, total: 300, validDays: 30, desc: "满¥150可用，有效期30天", descEn: "Min. spend ¥150, valid 30 days" },
    info: {
      address: "横琴粤澳深度合作区琴政路44号励骏庞都广场AL-105号商铺",
      addressEn: "Shop AL-105, Lijun Pangdu Plaza, No.44 Qinzheng Rd, Hengqin",
      phone: "0756-8800576", phone2: "15919156700",
      hours: "周一至五 11:00-23:00 | 周末 11:00-23:30",
      hoursEn: "Mon-Fri 11:00-23:00 | Weekends 11:00-23:30",
      lat: 22.1380, lng: 113.5310
    },
    description: "意葡餐厅自2019年珠海横琴中央汇店起步，2023年进驻横琴励骏庞都店，秉承「零添加剂，健康饮食」的宗旨。以地中海美食为主题，涵盖意大利、葡萄牙、西班牙菜。2021-2024年连续四年获评放心消费承诺单位及诚信店，2023年荣登大湾区杂志专访，获评珠海市「唐家肴」美食大赛银奖。大众点评4.2分，137道网友推荐菜，提拉米苏位列珠海第10名。",
    descriptionEn: "La Taverna started in 2019 at Hengqin Central Hub and opened its Lijun Pangdu location in 2023. Adhering to a 'zero additives, healthy dining' philosophy, it serves Mediterranean cuisine spanning Italian, Portuguese, and Spanish dishes. Awarded 'Trusted Consumer Unit' for four consecutive years (2021-2024), featured in Greater Bay Area Magazine, and won Silver at the Zhuhai 'Tangjiayao' Culinary Competition.",
    highlight: "大众点评4.2分 · 珠海提拉米苏TOP10 · 连续四年诚信店 · 唐家肴银奖",
    highlightEn: "Dianping 4.2★ · Top 10 Tiramisu · 4-Year Trusted · Silver Award",
    dishes: [
      { name: "葡式柠檬花甲", nameEn: "Portuguese Lemon Clams", price: 68, desc: "网友推荐TOP1，新鲜花甲配柠檬白酒", descEn: "Fresh clams with lemon and white wine, #1 recommended", emoji: "🍋", dpRank: 1, img: "img/italian/lemon_clams.png" },
      { name: "提拉米苏", nameEn: "Tiramisu", price: 38, desc: "珠海第10名，经典意式手工甜品", descEn: "#10 in Zhuhai, classic handmade Italian dessert", emoji: "🍰", dpRank: 2, img: "img/italian/tiramisu.png" },
      { name: "意式千层面", nameEn: "Lasagna", price: 78, desc: "网友推荐TOP3，多层手工面皮", descEn: "Multi-layer handmade pasta, #3 recommended", emoji: "🧀", dpRank: 3, img: "img/italian/lasagna.png" },
      { name: "美味鹅肝牛柳扒", nameEn: "Beef Tenderloin with Foie Gras", price: 188, desc: "进口牛柳配鹅肝，奢华之选", descEn: "Imported beef tenderloin with foie gras, luxurious choice", emoji: "🥩", dpRank: 4, img: "img/italian/beef_foie_gras.png" },
      { name: "意式萨拉米披萨", nameEn: "Salami Pizza", price: 88, desc: "经典萨拉米，石炉现烤薄底", descEn: "Classic salami, stone-fired thin crust", emoji: "🍕", dpRank: 5, img: "img/italian/salami_pizza.png" },
      { name: "招牌海虾黑面", nameEn: "Squid Ink Pasta with Prawns", price: 78, desc: "墨鱼汁意面配大虾，招牌必点", descEn: "Squid ink spaghetti with grilled prawns, signature dish", emoji: "🦐", dpRank: 6, img: "img/italian/squid_ink_pasta.png" }
    ],
    combos: [
      { name: "双人浪漫套餐", nameEn: "Romantic Dinner for Two", content: "萨拉米披萨×1 + 千层面×1 + 鹅肝牛柳扒×1 + 饮品×2 + 提拉米苏×2", contentEn: "Salami Pizza×1 + Lasagna×1 + Beef Foie Gras×1 + Drinks×2 + Tiramisu×2", originalPrice: 538, price: 388, tag: "立省¥150", tagEn: "Save ¥150" },
      { name: "四人欢聚套餐", nameEn: "Feast for Four", content: "披萨×2 + 千层面×2 + 柠檬花甲×1 + 烤鸡×1 + 饮品×4", contentEn: "Pizza×2 + Lasagna×2 + Lemon Clams×1 + Roast Chicken×1 + Drinks×4", originalPrice: 678, price: 498, tag: "立省¥180", tagEn: "Save ¥180" },
      { name: "六人派对套餐", nameEn: "Party of Six", content: "牛柳扒×2 + 披萨×2 + 千层面×3 + 花甲×2 + 饮品×6 + 提拉米苏×3", contentEn: "Beef×2 + Pizza×2 + Lasagna×3 + Clams×2 + Drinks×6 + Tiramisu×3", originalPrice: 1288, price: 888, tag: "立省¥400", tagEn: "Save ¥400" }
    ],
    gallery: ["img/italian/storefront.png", "img/italian/interior.png", "img/italian/terrace.png"]
  },
  {
    id: 2,
    name: "西贡码头·越南餐厅", nameEn: "Saigon Pier · Vietnamese",
    subtitle: "横琴口岸店", subtitleEn: "Hengqin Port",
    category: "地道越南料理", categoryEn: "Authentic Vietnamese Cuisine",
    key: "saigon", logo: "🍜",
    cover: "img/saigon/storefront.jpg",
    color: "#2E7D32", colorLight: "#D5F5E3",
    dianping: { rating: "4.3", avgPrice: "¥72/人", avgPriceEn: "¥72/person", rank: "横琴口岸热门越南菜", rankEn: "Popular Vietnamese at Hengqin Port", dishes: 86 },
    redpacket: { amount: 10, minSpend: 100, total: 400, validDays: 30, desc: "满¥100可用，有效期30天", descEn: "Min. spend ¥100, valid 30 days" },
    info: {
      address: "横琴粤澳深度合作区环岛东路2050号横琴口岸C区408号铺",
      addressEn: "Shop 408, Zone C, Hengqin Port, No.2050 Huandao East Rd, Hengqin",
      phone: "0756-8800117", phone2: "13128568852",
      hours: "周一至四 10:30-22:30 | 周五至日 10:30-23:00",
      hoursEn: "Mon-Thu 10:30-22:30 | Fri-Sun 10:30-23:00",
      lat: 22.1210, lng: 113.5430
    },
    description: "西贡厨房，跨越四十载的越南味觉史诗。由英越传奇主厨Ailee Dang与跨界企业家Mary Tang共同主理。主厨Ailee拥有逾40年辉煌履历——从伯明翰街角起步到创立德比郡首家日式铁板烧餐厅，将半生淬炼的厨艺哲学倾注于越南料理。澳门日报、今日头条等多家媒体报道，被誉为「横琴最值得打卡的越南餐厅」。",
    descriptionEn: "Saigon Kitchen, a 40-year Vietnamese culinary saga. Co-founded by legendary British-Vietnamese chef Ailee Dang and entrepreneur Mary Tang. Chef Ailee's 40-year journey spans from a Birmingham corner shop to founding Derbyshire's first Japanese Teppanyaki restaurant. Featured in Macau Daily and Toutiao, hailed as 'Hengqin's must-visit Vietnamese restaurant.'",
    highlight: "大众点评4.3分 · 澳门日报推荐 · 四十年传奇主厨 · 口岸C位",
    highlightEn: "Dianping 4.3★ · Macau Daily Featured · 40-Year Legacy Chef · Port Location",
    dishes: [
      { name: "火车头牛肉河粉", nameEn: "Pho with Beef", price: 48, desc: "进口阿根廷牛肉，整鸡整骨熬汤", descEn: "Argentine beef, whole chicken bone broth", emoji: "🍜", dpRank: 1, img: "img/saigon/pho.jpg" },
      { name: "西贡青柠鱼", nameEn: "Saigon Lime Fish", price: 88, desc: "新鲜鲈鱼配青柠，一秒到湄公河", descEn: "Fresh sea bass with lime, taste of the Mekong", emoji: "🐟", dpRank: 2, img: "img/saigon/lime_fish.jpg" },
      { name: "香茅蜂蜜猪颈肉", nameEn: "Lemongrass Honey Pork Neck", price: 58, desc: "香茅提香蜂蜜滋润，层次分明", descEn: "Lemongrass-infused, honey-glazed, layered flavor", emoji: "🐷", dpRank: 3, img: "img/saigon/pork_neck.jpg" },
      { name: "鲜虾米纸卷", nameEn: "Shrimp Rice Paper Rolls", price: 38, desc: "整只鲜虾裹透明米纸，清新满足", descEn: "Whole shrimp wrapped in translucent rice paper", emoji: "🦐", dpRank: 4, img: "img/saigon/spring_rolls.jpg" },
      { name: "冷盘牛扒", nameEn: "Cold Beef Salad", price: 108, desc: "嫩滑牛柳配自制蒜蓉辣椒酱", descEn: "Tender beef fillet with house garlic chili sauce", emoji: "🥩", dpRank: 5, img: "img/saigon/beef_salad.jpg" },
      { name: "越式菠萝海鲜炒饭", nameEn: "Pineapple Seafood Fried Rice", price: 58, desc: "整颗菠萝盛装，视觉味觉双享受", descEn: "Served in a whole pineapple, visual and taste delight", emoji: "🍍", dpRank: 6, img: "img/saigon/snacks.jpg" }
    ],
    combos: [
      { name: "双人品鲜套餐", nameEn: "Duo Tasting Set", content: "火车头河粉×2 + 米纸卷×1 + 青柠鱼×1 + 饮品×2", contentEn: "Pho×2 + Rice Paper Rolls×1 + Lime Fish×1 + Drinks×2", originalPrice: 316, price: 238, tag: "立省¥78", tagEn: "Save ¥78" },
      { name: "四人越式盛宴", nameEn: "Vietnamese Feast for 4", content: "河粉×2 + 青柠鱼×1 + 猪颈肉×1 + 冷盘牛扒×1 + 菠萝饭×1 + 饮品×4", contentEn: "Pho×2 + Lime Fish×1 + Pork Neck×1 + Beef Salad×1 + Pineapple Rice×1 + Drinks×4", originalPrice: 540, price: 398, tag: "立省¥142", tagEn: "Save ¥142" },
      { name: "六人聚会套餐", nameEn: "Gathering Set for 6", content: "河粉×4 + 青柠鱼×2 + 猪颈肉×2 + 牛扒×1 + 菠萝饭×2 + 米纸卷×2 + 饮品×6", contentEn: "Pho×4 + Lime Fish×2 + Pork Neck×2 + Beef×1 + Rice×2 + Rolls×2 + Drinks×6", originalPrice: 966, price: 688, tag: "立省¥278", tagEn: "Save ¥278" }
    ],
    gallery: ["img/saigon/storefront.jpg", "img/saigon/hero.jpg", "img/saigon/env_dining.jpg"]
  },
  {
    id: 3,
    name: "西贡码头·融合餐厅", nameEn: "Saigon Pier · Fusion",
    subtitle: "横琴彩虹苑店", subtitleEn: "Caihongyuan, Hengqin",
    category: "越南融合创意菜", categoryEn: "Vietnamese Fusion Creative",
    key: "fusion", logo: "🍲",
    cover: "img/saigon/env_dining.jpg",
    color: "#E67E22", colorLight: "#FDEBD0",
    dianping: { rating: "4.1", avgPrice: "¥58/人", avgPriceEn: "¥58/person", rank: "彩虹苑亲民越南菜", rankEn: "Affordable Vietnamese at Caihongyuan", dishes: 42 },
    redpacket: { amount: 8, minSpend: 80, total: 350, validDays: 30, desc: "满¥80可用，有效期30天", descEn: "Min. spend ¥80, valid 30 days" },
    info: {
      address: "横琴粤澳深度合作区子期南道120号彩虹苑122-2号商铺",
      addressEn: "Shop 122-2, Caihongyuan, No.120 Ziqi South Rd, Hengqin",
      phone: "18688153210", phone2: "",
      hours: "11:00 - 22:00", hoursEn: "11:00 - 22:00",
      lat: 22.1310, lng: 113.5260
    },
    description: "西贡码头·融合餐厅延续西贡厨房的越南味觉传承，在传统越南料理基础上融入更多创意元素。同样由英越传奇主厨Ailee Dang与Mary Tang主理，彩虹苑店更贴近社区，价格亲民，主打中越融合创意菜，深受周边居民和上班族喜爱。",
    descriptionEn: "Saigon Pier Fusion continues the Vietnamese culinary heritage with creative twists. Also led by Ailee Dang and Mary Tang, this community-oriented location offers affordable Chinese-Vietnamese fusion dishes, beloved by local residents and office workers.",
    highlight: "社区温暖用餐 · 中越融合创意 · 亲民好味道 · 人均¥58",
    highlightEn: "Community Dining · Sino-Viet Fusion · Great Value · Avg ¥58",
    dishes: [
      { name: "西贡码头招牌河粉", nameEn: "Signature Pho", price: 38, desc: "每日鲜熬汤底，越南街边经典", descEn: "Daily fresh broth, Vietnamese street classic", emoji: "🍜", dpRank: 1, img: "img/saigon/pho.jpg" },
      { name: "香茅鸡大虾檬粉", nameEn: "Lemongrass Chicken Prawn Noodles", price: 58, desc: "香茅鸡配大虾，招牌组合", descEn: "Lemongrass chicken with prawns, signature combo", emoji: "🍗", dpRank: 2, img: "img/saigon/pork_neck.jpg" },
      { name: "冷盘牛扒", nameEn: "Cold Beef Salad", price: 98, desc: "越式冷盘做法，清爽不腻", descEn: "Vietnamese-style cold plate, refreshing and light", emoji: "🥩", dpRank: 3, img: "img/saigon/beef_salad.jpg" },
      { name: "鲜虾芒果青木瓜沙律", nameEn: "Shrimp Mango Papaya Salad", price: 38, desc: "鲜虾芒果配青木瓜，酸甜清爽", descEn: "Shrimp, mango, papaya - sweet, sour and refreshing", emoji: "🥗", dpRank: 4, img: "img/saigon/spring_rolls.jpg" },
      { name: "越式海鲜菠萝炒饭", nameEn: "Seafood Pineapple Fried Rice", price: 48, desc: "菠萝的甜与海鲜的鲜完美融合", descEn: "Sweet pineapple meets savory seafood, perfect harmony", emoji: "🍍", dpRank: 5, img: "img/saigon/snacks.jpg" },
      { name: "桂林米粉", nameEn: "Guilin Rice Noodles", price: 28, desc: "中越融合特色，地道桂林风味", descEn: "Sino-Viet fusion, authentic Guilin style", emoji: "🍲", dpRank: 6, img: "img/saigon/pho.jpg" }
    ],
    combos: [
      { name: "双人温馨套餐", nameEn: "Cozy Duo Set", content: "招牌河粉×2 + 鸡肉串烧×1 + 青木瓜沙律×1 + 饮品×2", contentEn: "Pho×2 + Chicken Skewers×1 + Papaya Salad×1 + Drinks×2", originalPrice: 196, price: 138, tag: "立省¥58", tagEn: "Save ¥58" },
      { name: "四人欢乐套餐", nameEn: "Happy Four Set", content: "河粉×2 + 桂林米粉×2 + 香茅鸡×1 + 菠萝饭×1 + 沙律×1 + 饮品×4", contentEn: "Pho×2 + Guilin Noodles×2 + Lemongrass Chicken×1 + Rice×1 + Salad×1 + Drinks×4", originalPrice: 376, price: 278, tag: "立省¥98", tagEn: "Save ¥98" },
      { name: "六人团聚套餐", nameEn: "Reunion Six Set", content: "河粉×3 + 米粉×2 + 牛扒×1 + 香茅鸡×2 + 菠萝饭×2 + 沙律×2 + 饮品×6", contentEn: "Pho×3 + Noodles×2 + Beef×1 + Chicken×2 + Rice×2 + Salad×2 + Drinks×6", originalPrice: 668, price: 488, tag: "立省¥180", tagEn: "Save ¥180" }
    ],
    gallery: ["img/saigon/storefront.jpg", "img/saigon/hero.jpg", "img/saigon/env_dining.jpg"]
  }
];

// 加载持久化的餐厅数据，否则用默认
let restaurants = savedRestaurants || JSON.parse(JSON.stringify(DEFAULT_RESTAURANTS));

// 餐厅红包配置（用于领红包API，与 restaurants 同步）
function getRestaurantConfigs() {
  const configs = {};
  restaurants.forEach(r => {
    configs[r.id] = { name: r.name, color: r.color, amount: r.redpacket.amount, minSpend: r.redpacket.minSpend, validDays: r.redpacket.validDays };
  });
  return configs;
}

// ====== 操作日志 ======
function addLog(action, details, admin) {
  const entry = {
    id: 'LOG' + Date.now().toString(36).toUpperCase(),
    timestamp: new Date().toISOString(),
    action,
    details,
    admin: admin || 'system'
  };
  logs.unshift(entry);
  // 只保留最近1000条
  if (logs.length > 1000) logs = logs.slice(0, 1000);
  writeJSON(LOGS_FILE, logs).catch(e => console.error('日志写入失败:', e));
}

// ====== MIME 类型 ======
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

// ====== 工具函数 ======
function sendJSON(res, data, statusCode) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  res.end(json);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve(null); }
    });
  });
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

function requireAuth(req, res) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  if (!adminTokens.has(token)) {
    sendJSON(res, { success: false, message: '需要管理员登录' }, 401);
    return false;
  }
  return true;
}

// ====== API 处理 ======
async function handleAPI(req, res, pathname, query) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  try {
    // ====== POST /api/scan ======
    if (req.method === 'POST' && pathname === '/api/scan') {
      stats.scanCount++;
      await writeJSON(STATS_FILE, stats);
      addLog('扫码', '用户扫码进入活动页面');
      return sendJSON(res, { success: true, data: stats });
    }

    // ====== GET /api/stats ======
    if (req.method === 'GET' && pathname === '/api/stats') {
      return sendJSON(res, { success: true, data: stats });
    }

    // ====== GET /api/restaurants (公开，获取餐厅数据) ======
    if (req.method === 'GET' && pathname === '/api/restaurants') {
      return sendJSON(res, { success: true, data: restaurants });
    }

    // ====== POST /api/claim ======
    if (req.method === 'POST' && pathname === '/api/claim') {
      const body = await parseBody(req);
      const { phone, restaurantId } = body || {};
      if (!phone || !restaurantId) {
        return sendJSON(res, { success: false, message: 'Missing parameters', messageZh: '缺少参数' }, 400);
      }

      const exists = claimedRedpackets.find(r => r.phone === phone && r.restaurantId === restaurantId);
      if (exists) {
        return sendJSON(res, { success: false, message: 'Already claimed', messageZh: '该手机号已在本店领取过红包，每家店限领一次' });
      }

      const configs = getRestaurantConfigs();
      const cfg = configs[restaurantId];
      if (!cfg) {
        return sendJSON(res, { success: false, message: 'Restaurant not found', messageZh: '餐厅不存在' }, 400);
      }

      const now = new Date();
      const expireDate = new Date(now.getTime() + cfg.validDays * 24 * 60 * 60 * 1000);

      const redpacket = {
        id: 'RP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(),
        pin: String(Math.floor(1000 + Math.random() * 9000)),
        phone: phone,
        phoneMasked: phone.slice(0, 3) + '****' + phone.slice(-4),
        restaurantId: restaurantId,
        restaurantName: cfg.name,
        restaurantColor: cfg.color,
        amount: cfg.amount,
        minSpend: cfg.minSpend,
        claimedAt: now.toISOString(),
        expireAt: expireDate.toISOString(),
        used: false, usedAt: null,
      };

      claimedRedpackets.push(redpacket);
      stats.redpacketClaimed++;
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      await writeJSON(STATS_FILE, stats);
      addLog('领取红包', `${cfg.name} | ¥${cfg.amount} | ${redpacket.phoneMasked}`);

      return sendJSON(res, { success: true, redpacket });
    }

    // ====== GET /api/my ======
    if (req.method === 'GET' && pathname === '/api/my') {
      const phone = query.phone;
      if (!phone) return sendJSON(res, { success: false, message: 'Missing phone', messageZh: '缺少手机号' }, 400);
      const mine = claimedRedpackets.filter(r => r.phone === phone);
      return sendJSON(res, { success: true, data: mine });
    }

    // ====== GET /api/list ======
    if (req.method === 'GET' && pathname === '/api/list') {
      return sendJSON(res, { success: true, data: claimedRedpackets });
    }

    // ====== POST /api/verify ======
    if (req.method === 'POST' && pathname === '/api/verify') {
      if (!requireAuth(req, res)) return;
      const body = await parseBody(req);
      const { id, pin } = body || {};
      if (!id) return sendJSON(res, { success: false, message: 'Missing red packet ID', messageZh: '缺少红包ID' }, 400);

      const rp = claimedRedpackets.find(r => r.id.toUpperCase() === id.toUpperCase());
      if (!rp) return sendJSON(res, { success: false, message: 'Not found', messageZh: '红包不存在' });
      if (rp.used) return sendJSON(res, { success: false, message: 'Already used', messageZh: '红包已被核销', used: true });

      const expired = new Date(rp.expireAt) < new Date();
      if (expired && pin !== 'admin') {
        return sendJSON(res, { success: false, message: 'Expired', messageZh: '红包已过期' });
      }

      if (pin && rp.pin !== pin && pin !== 'admin') {
        return sendJSON(res, { success: false, message: 'PIN mismatch', messageZh: 'PIN码不匹配' });
      }

      rp.used = true;
      rp.usedAt = new Date().toISOString();
      stats.redpacketUsed++;
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      await writeJSON(STATS_FILE, stats);
      addLog('核销红包', `${rp.restaurantName} | ¥${rp.amount} | ${rp.phoneMasked} | PIN: ${rp.pin}`, getAdminFromToken(req));

      return sendJSON(res, { success: true, message: 'Verified', messageZh: '核销成功', redpacket: rp });
    }

    // ====== POST /api/clear ======
    if (req.method === 'POST' && pathname === '/api/clear') {
      if (!requireAuth(req, res)) return;
      const oldStats = { ...stats };
      const oldCount = claimedRedpackets.length;
      stats = { scanCount: 0, redpacketClaimed: 0, redpacketUsed: 0 };
      claimedRedpackets = [];
      await writeJSON(STATS_FILE, stats);
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      addLog('清除数据', `清除扫码${oldStats.scanCount}次 | 红包${oldCount}个`, getAdminFromToken(req));
      return sendJSON(res, { success: true, message: 'Data cleared', messageZh: '数据已清除', cleared: { scans: oldStats.scanCount, redpackets: oldCount } });
    }

    // ====== POST /api/admin/login ======
    if (req.method === 'POST' && pathname === '/api/admin/login') {
      const body = await parseBody(req);
      const { username, password } = body || {};
      if (username !== ADMIN_USER || password !== ADMIN_PASS) {
        addLog('登录失败', `账号: ${username || '(空)'} | IP: ${getClientIP(req)}`);
        return sendJSON(res, { success: false, message: 'Invalid credentials', messageZh: '账号或密码错误' }, 401);
      }
      const token = 'tk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      adminTokens.set(token, { username, createdAt: Date.now() });
      // 清理过期 token（24小时）
      const expiry = Date.now() - 24 * 60 * 60 * 1000;
      for (const [k, v] of adminTokens) { if (v.createdAt < expiry) adminTokens.delete(k); }
      addLog('登录成功', `账号: ${username} | IP: ${getClientIP(req)}`);
      return sendJSON(res, { success: true, token, username, message: 'Login successful', messageZh: '登录成功' });
    }

    // ====== GET /api/admin/check ======
    if (req.method === 'GET' && pathname === '/api/admin/check') {
      const auth = req.headers['authorization'] || '';
      const token = auth.replace('Bearer ', '');
      const valid = adminTokens.has(token);
      return sendJSON(res, { success: valid, valid, message: valid ? 'Logged in' : 'Not logged in', messageZh: valid ? '已登录' : '未登录' });
    }

    // ====== Image Upload: POST /api/admin/upload ======
    if (req.method === 'POST' && pathname === '/api/admin/upload') {
      if (!requireAuth(req, res)) return;

      // 解析 JSON body with base64 image
      let body = '';
      req.on('data', chunk => { body += chunk; });
      await new Promise(resolve => req.on('end', resolve));

      let parsed;
      try { parsed = JSON.parse(body); } catch (e) {
        return sendJSON(res, { success: false, message: 'Invalid JSON', messageZh: '请求数据格式错误' }, 400);
      }

      const { filename, data: base64Data } = parsed || {};
      if (!filename || !base64Data) {
        return sendJSON(res, { success: false, message: 'Missing filename or data', messageZh: '缺少文件名或图片数据' }, 400);
      }

      // 安全检查：只允许图片格式
      const ext = path.extname(filename).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
        return sendJSON(res, { success: false, message: 'Invalid file type', messageZh: '仅支持 PNG/JPG/GIF/WebP 格式' }, 400);
      }

      // 移除 base64 前缀 (data:image/png;base64,)
      const base64Str = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Str, 'base64');

      // 限制文件大小 5MB
      if (buffer.length > 5 * 1024 * 1024) {
        return sendJSON(res, { success: false, message: 'File too large', messageZh: '图片不能超过5MB' }, 400);
      }

      // 生成唯一文件名避免冲突
      const safeName = Date.now().toString(36) + '_' + filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(filePath, buffer);

      const urlPath = '/uploads/' + safeName;
      addLog('上传图片', `${filename} → ${urlPath}`, getAdminFromToken(req));
      return sendJSON(res, { success: true, path: urlPath, message: 'Upload successful', messageZh: '上传成功' });
    }

    // ====== GET /api/admin/restaurants (获取可编辑的餐厅数据) ======
    if (req.method === 'GET' && pathname === '/api/admin/restaurants') {
      if (!requireAuth(req, res)) return;
      return sendJSON(res, { success: true, data: restaurants, defaults: DEFAULT_RESTAURANTS });
    }

    // ====== PUT /api/admin/restaurant (保存餐厅数据) ======
    if (req.method === 'PUT' && pathname === '/api/admin/restaurant') {
      if (!requireAuth(req, res)) return;
      const body = await parseBody(req);
      const { id, data: rdata } = body || {};
      if (!id || !rdata) {
        return sendJSON(res, { success: false, message: 'Missing parameters', messageZh: '缺少参数' }, 400);
      }
      const idx = restaurants.findIndex(r => r.id === id);
      if (idx < 0) {
        return sendJSON(res, { success: false, message: 'Restaurant not found', messageZh: '餐厅不存在' }, 404);
      }
      const oldName = restaurants[idx].name;
      restaurants[idx] = rdata;
      await writeJSON(RESTAURANTS_FILE, restaurants);
      addLog('更新餐厅', `${oldName} (ID:${id})`, getAdminFromToken(req));
      return sendJSON(res, { success: true, message: 'Saved', messageZh: '保存成功' });
    }

    // ====== GET /api/admin/logs ======
    if (req.method === 'GET' && pathname === '/api/admin/logs') {
      if (!requireAuth(req, res)) return;
      const limit = parseInt(query.limit) || 200;
      return sendJSON(res, { success: true, data: logs.slice(0, limit), total: logs.length });
    }

    // ====== POST /api/admin/clear-logs ======
    if (req.method === 'POST' && pathname === '/api/admin/clear-logs') {
      if (!requireAuth(req, res)) return;
      logs = [];
      await writeJSON(LOGS_FILE, logs);
      addLog('清除日志', '操作日志已清空', getAdminFromToken(req));
      return sendJSON(res, { success: true, message: 'Logs cleared', messageZh: '操作日志已清空' });
    }

    // ====== GET /api/health ======
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJSON(res, { success: true, time: new Date().toISOString(), version: '3.0' });
    }

    // 未知API
    return sendJSON(res, { success: false, message: 'Unknown API', messageZh: '未知接口' }, 404);

  } catch (e) {
    console.error('API error:', e);
    return sendJSON(res, { success: false, message: 'Server error: ' + e.message, messageZh: '服务器错误' }, 500);
  }
}

// ====== 从Token获取管理员名 ======
function getAdminFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '');
  const info = adminTokens.get(token);
  return info ? info.username : 'unknown';
}

// ====== 静态文件服务 ======
function serveStatic(req, res) {
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';

  const fullPath = path.join(__dirname, filePath);

  // 安全检查：防止目录遍历
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(fullPath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err2, html) => {
          if (err2) { res.writeHead(404); res.end('Not Found'); }
          else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); }
        });
      } else { res.writeHead(500); res.end('Server Error'); }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      res.end(data);
    }
  });
}

// ====== 微信 OAuth ======
function handleWechatCallback(req, res) {
  const query = url.parse(req.url, true).query;
  const code = query.code;
  const state = query.state;

  if (!code) {
    if (!WECHAT_APPID) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>WeChat Auth Not Configured / 微信授权未配置</h2>
        <p>Please set WECHAT_APPID and WECHAT_SECRET environment variables.</p>
      </body></html>`);
      return;
    }
    const redirectUri = encodeURIComponent(`https://${req.headers.host}/auth/wechat/callback`);
    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state || 'index'}#wechat_redirect`;
    res.writeHead(302, { 'Location': authUrl });
    res.end();
    return;
  }

  const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`;

  https.get(tokenUrl, (wxRes) => {
    let body = '';
    wxRes.on('data', chunk => body += chunk);
    wxRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.openid) {
          const target = state && state !== 'index'
            ? `/${state}.html?openid=${data.openid}`
            : `/?openid=${data.openid}`;
          res.writeHead(302, { 'Location': target });
          res.end();
        } else {
          console.error('WeChat OAuth error:', body);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h2>Auth Failed / 授权失败</h2><p>${data.errmsg || 'Unknown error'}</p>
            <p><a href="/">Return / 返回首页</a></p></body></html>`);
        }
      } catch (e) {
        console.error('Parse WeChat response failed:', e);
        res.writeHead(500); res.end('Server Error');
      }
    });
  }).on('error', (e) => {
    console.error('WeChat API request failed:', e);
    res.writeHead(500); res.end('Server Error');
  });
}

// ====== 路由 ======
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const query = parsed.query;

  // API 路由
  if (pathname.startsWith('/api/')) {
    return handleAPI(req, res, pathname, query);
  }

  // 微信 OAuth
  if (pathname === '/auth/wechat/callback' || pathname === '/auth/wechat') {
    return handleWechatCallback(req, res);
  }

  // 静态文件
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('🧧 三店联动 v3.0 已启动: http://localhost:' + PORT);
  console.log('📂 数据目录: ' + DATA_DIR);
  console.log('📊 扫码' + stats.scanCount + ' | 领取' + stats.redpacketClaimed + ' | 核销' + stats.redpacketUsed);
  console.log('🔐 管理后台: http://localhost:' + PORT + '/admin.html');
  if (!WECHAT_APPID) console.log('💡 微信OAuth未配置，红包使用手机号验证');
  if (!savedRestaurants) console.log('📝 餐厅数据：使用默认配置（首次运行）');
  else console.log('📝 餐厅数据：已加载自定义配置');
});
