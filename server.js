// ==================== 三店联动 · Node.js 服务端 ====================
// 静态文件服务 + REST API + 微信OAuth
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
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ====== 数据文件路径 ======
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const CLAIMED_FILE = path.join(DATA_DIR, 'claimed.json');

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
  } catch (e) {
    callback(e);
  } finally {
    writeLock = false;
    processWriteQueue();
  }
}

function readJSON(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
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
};

// ====== 工具函数 ======
function sendJSON(res, data, statusCode) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

// 餐厅红包配置（与服务端同步）
const restaurantConfigs = {
  1: { name: '意葡 La Taverna', color: '#C0392B', amount: 15, minSpend: 150, validDays: 30 },
  2: { name: '西贡码头·越南餐厅', color: '#2E7D32', amount: 10, minSpend: 100, validDays: 30 },
  3: { name: '西贡码头·融合餐厅', color: '#E67E22', amount: 8, minSpend: 80, validDays: 30 },
};

// ====== API 处理 ======
async function handleAPI(req, res, pathname, query) {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // ====== POST /api/scan ======
    if (req.method === 'POST' && pathname === '/api/scan') {
      stats.scanCount++;
      await writeJSON(STATS_FILE, stats);
      return sendJSON(res, { success: true, data: stats });
    }

    // ====== GET /api/stats ======
    if (req.method === 'GET' && pathname === '/api/stats') {
      return sendJSON(res, { success: true, data: stats });
    }

    // ====== POST /api/claim ======
    if (req.method === 'POST' && pathname === '/api/claim') {
      const body = await parseBody(req);
      const { phone, restaurantId } = body || {};
      if (!phone || !restaurantId) {
        return sendJSON(res, { success: false, message: '缺少参数' }, 400);
      }

      // 检查重复领取
      const exists = claimedRedpackets.find(
        r => r.phone === phone && r.restaurantId === restaurantId
      );
      if (exists) {
        return sendJSON(res, { success: false, message: '该手机号已在本店领取过红包，每家店限领一次' });
      }

      const cfg = restaurantConfigs[restaurantId];
      if (!cfg) {
        return sendJSON(res, { success: false, message: '餐厅不存在' }, 400);
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
        used: false,
        usedAt: null,
      };

      claimedRedpackets.push(redpacket);
      stats.redpacketClaimed++;
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      await writeJSON(STATS_FILE, stats);

      return sendJSON(res, { success: true, redpacket });
    }

    // ====== GET /api/my ======
    if (req.method === 'GET' && pathname === '/api/my') {
      const phone = query.phone;
      if (!phone) return sendJSON(res, { success: false, message: '缺少手机号' }, 400);
      const mine = claimedRedpackets.filter(r => r.phone === phone);
      return sendJSON(res, { success: true, data: mine });
    }

    // ====== GET /api/list ======
    if (req.method === 'GET' && pathname === '/api/list') {
      return sendJSON(res, { success: true, data: claimedRedpackets });
    }

    // ====== POST /api/verify ======
    if (req.method === 'POST' && pathname === '/api/verify') {
      const body = await parseBody(req);
      const { id, pin } = body || {};
      if (!id) return sendJSON(res, { success: false, message: '缺少红包ID' }, 400);

      const rp = claimedRedpackets.find(r => r.id.toUpperCase() === id.toUpperCase());
      if (!rp) return sendJSON(res, { success: false, message: '红包不存在' });
      if (rp.used) return sendJSON(res, { success: false, message: '红包已被核销', used: true });

      const expired = new Date(rp.expireAt) < new Date();
      if (expired && pin !== 'admin') {
        return sendJSON(res, { success: false, message: '红包已过期' });
      }

      if (pin && rp.pin !== pin && pin !== 'admin') {
        return sendJSON(res, { success: false, message: 'PIN码不匹配' });
      }

      rp.used = true;
      rp.usedAt = new Date().toISOString();
      stats.redpacketUsed++;
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      await writeJSON(STATS_FILE, stats);

      return sendJSON(res, { success: true, message: '核销成功', redpacket: rp });
    }

    // ====== POST /api/clear ======
    if (req.method === 'POST' && pathname === '/api/clear') {
      stats = { scanCount: 0, redpacketClaimed: 0, redpacketUsed: 0 };
      claimedRedpackets = [];
      await writeJSON(STATS_FILE, stats);
      await writeJSON(CLAIMED_FILE, claimedRedpackets);
      return sendJSON(res, { success: true, message: '数据已清除' });
    }

    // ====== GET /api/health ======
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJSON(res, { success: true, time: new Date().toISOString(), version: '2.0' });
    }

    // 未知API
    return sendJSON(res, { success: false, message: '未知接口' }, 404);

  } catch (e) {
    console.error('API error:', e);
    return sendJSON(res, { success: false, message: '服务器错误: ' + e.message }, 500);
  }
}

// ====== 静态文件服务 ======
function serveStatic(req, res) {
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';

  const fullPath = path.join(__dirname, filePath);

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
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
          }
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
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
        <h2>微信授权未配置</h2><p>请在环境变量中设置 WECHAT_APPID 和 WECHAT_SECRET</p>
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
          console.error('微信OAuth错误:', body);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h2>授权失败</h2><p>${data.errmsg || '未知错误'}</p><p><a href="/">返回首页</a></p>
          </body></html>`);
        }
      } catch (e) {
        console.error('解析微信响应失败:', e);
        res.writeHead(500);
        res.end('Server Error');
      }
    });
  }).on('error', (e) => {
    console.error('请求微信API失败:', e);
    res.writeHead(500);
    res.end('Server Error');
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
  console.log(` 三店联动 系统已启动: http://localhost:${PORT}`);
  console.log(` 数据目录: ${DATA_DIR}`);
  console.log(` 扫码${stats.scanCount} | 领取${stats.redpacketClaimed} | 核销${stats.redpacketUsed}`);
  if (WECHAT_APPID) {
    console.log(` 微信OAuth已配置`);
  } else {
    console.log(` 微信OAuth未配置，红包使用手机号验证`);
  }
  console.log(` 管理后台: http://localhost:${PORT}/admin.html`);
});
