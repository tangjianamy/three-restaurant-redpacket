// ==================== 管理后台逻辑 ====================

let currentTab = 'dashboard';
let editingRestaurants = [];
let html5QrScanner = null;  // 扫码器实例

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  editingRestaurants = JSON.parse(JSON.stringify(RESTAURANTS));
  switchTab('dashboard');
});

// ===== Toast =====
function adminToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

// ===== 切换标签页 =====
function switchTab(tab) {
  currentTab = tab;

  // 关闭之前可能打开的扫码器
  stopScanner();

  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.sidebar-nav a[onclick*="${tab}"]`);
  if (link) link.classList.add('active');

  const main = document.getElementById('mainContent');
  switch (tab) {
    case 'dashboard': renderDashboard(main); break;
    case 'restaurant': renderRestaurant(main); break;
    case 'redpacket': renderRedpacket(main); break;
    case 'records': renderRecords(main); break;
    case 'scan': renderScanPage(main); break;
    case 'qrcode': renderQRCode(main); break;
  }
}

// ===== 停止扫码器 =====
function stopScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().catch(() => {});
    html5QrScanner = null;
  }
}

// ===== 1. 数据看板 =====
async function renderDashboard(main) {
  await loadStats();
  const totalRedpackets = RESTAURANTS.reduce((sum, r) => sum + r.redpacket.total, 0);
  main.innerHTML = `
    <div class="main-header">
      <h1>📊 数据看板</h1>
      <p>实时监控活动数据</p>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background:#EBF5FB;color:#2980B9;">📱</div>
        <div><div class="stat-value">${STATS.scanCount}</div><div class="stat-label">扫码人次</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FEF9E7;color:#F39C12;">🧧</div>
        <div><div class="stat-value">${STATS.redpacketClaimed}</div><div class="stat-label">红包领取</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#E8F8F5;color:#27AE60;">✅</div>
        <div><div class="stat-value">${STATS.redpacketUsed}</div><div class="stat-label">红包核销</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:#FDEDEC;color:#E74C3C;">📈</div>
        <div><div class="stat-value">${STATS.redpacketClaimed > 0 ? Math.round(STATS.redpacketUsed / STATS.redpacketClaimed * 100) : 0}%</div><div class="stat-label">核销率</div></div>
      </div>
    </div>
    <div class="content-card">
      <div class="card-header"><h3>活动概况</h3></div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
          <div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;">
            <div style="font-size:14px;color:#888;">剩余红包</div>
            <div style="font-size:28px;font-weight:800;color:#F39C12;">${totalRedpackets - STATS.redpacketClaimed}</div>
            <div style="font-size:11px;color:#AAA;">/ ${totalRedpackets} 个</div>
          </div>
          <div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;">
            <div style="font-size:14px;color:#888;">红包面额</div>
            <div style="font-size:28px;font-weight:800;color:#E74C3C;">¥${RESTAURANTS.map(r => r.redpacket.amount).join('/¥')}</div>
            <div style="font-size:11px;color:#AAA;">各店不同</div>
          </div>
          <div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;">
            <div style="font-size:14px;color:#888;">有效期</div>
            <div style="font-size:28px;font-weight:800;color:#2980B9;">${RESTAURANTS[0].redpacket.validDays}</div>
            <div style="font-size:11px;color:#AAA;">天</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== 2. 餐厅管理 =====
function renderRestaurant(main) {
  main.innerHTML = `
    <div class="main-header"><h1>🍽️ 餐厅信息管理</h1><p>修改餐厅基础信息、菜品和套餐</p></div>
    <div class="content-card"><div class="card-body" id="restaurantEditors"></div></div>
  `;
  renderRestaurantEditors();
}

function renderRestaurantEditors() {
  const container = document.getElementById('restaurantEditors');
  container.innerHTML = editingRestaurants.map((r, idx) => `
    <div class="restaurant-editor">
      <div class="editor-header">
        <h4><span class="color-dot" style="background:${r.color};"></span>${r.name} · ${r.subtitle}</h4>
        <span class="tab-badge" style="background:${r.colorLight};color:${r.color};">${r.category}</span>
      </div>
      <div class="form-row three">
        <div class="form-group"><label>店名</label><input value="${escHtml(r.name)}" onchange="updateRestaurant(${idx},'name',this.value)"></div>
        <div class="form-group"><label>分店</label><input value="${escHtml(r.subtitle)}" onchange="updateRestaurant(${idx},'subtitle',this.value)"></div>
        <div class="form-group"><label>分类</label><input value="${escHtml(r.category)}" onchange="updateRestaurant(${idx},'category',this.value)"></div>
      </div>
      <div class="form-group"><label>地址</label><input value="${escHtml(r.info.address)}" onchange="updateRestaurantNested(${idx},'info','address',this.value)"></div>
      <div class="form-row">
        <div class="form-group"><label>电话</label><input value="${r.info.phone}" onchange="updateRestaurantNested(${idx},'info','phone',this.value)"></div>
        <div class="form-group"><label>营业时间</label><input value="${r.info.hours}" onchange="updateRestaurantNested(${idx},'info','hours',this.value)"></div>
      </div>
      <div class="form-group"><label>餐厅简介</label><textarea onchange="updateRestaurant(${idx},'description',this.value)">${escHtml(r.description)}</textarea></div>
      <div class="form-group"><label>亮点标签</label><input value="${escHtml(r.highlight)}" onchange="updateRestaurant(${idx},'highlight',this.value)"></div>
      <div style="margin-top:16px;">
        <h5 style="font-size:13px;margin-bottom:8px;">招牌菜品 (${r.dishes.length}道)</h5>
        <table class="sub-table">
          <thead><tr><th>菜名</th><th>描述</th><th>价格</th><th>Emoji</th></tr></thead>
          <tbody>${r.dishes.map((d, di) => `
            <tr>
              <td><input value="${escHtml(d.name)}" onchange="updateDish(${idx},${di},'name',this.value)"></td>
              <td><input value="${escHtml(d.desc)}" onchange="updateDish(${idx},${di},'desc',this.value)"></td>
              <td><input value="${d.price}" onchange="updateDish(${idx},${di},'price',this.value)" style="width:70px;"></td>
              <td><input value="${d.emoji}" onchange="updateDish(${idx},${di},'emoji',this.value)" style="width:50px;"></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div style="margin-top:16px;">
        <h5 style="font-size:13px;margin-bottom:8px;">优惠套餐 (${r.combos.length}个)</h5>
        <table class="sub-table">
          <thead><tr><th>套餐名</th><th>内容</th><th>原价</th><th>活动价</th><th>标签</th></tr></thead>
          <tbody>${r.combos.map((c, ci) => `
            <tr>
              <td><input value="${escHtml(c.name)}" onchange="updateCombo(${idx},${ci},'name',this.value)"></td>
              <td><input value="${escHtml(c.content)}" onchange="updateCombo(${idx},${ci},'content',this.value)"></td>
              <td><input value="${c.originalPrice}" onchange="updateCombo(${idx},${ci},'originalPrice',this.value)" style="width:70px;"></td>
              <td><input value="${c.price}" onchange="updateCombo(${idx},${ci},'price',this.value)" style="width:70px;"></td>
              <td><input value="${c.tag}" onchange="updateCombo(${idx},${ci},'tag',this.value)" style="width:80px;"></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
      <div style="margin-top:16px;text-align:right;"><button class="btn btn-outline btn-sm" onclick="resetRestaurant(${idx})">恢复默认</button></div>
    </div>
  `).join('') + `
    <div style="margin-top:20px;text-align:right;"><button class="btn btn-primary" onclick="saveAllRestaurants()">💾 保存所有修改</button></div>
  `;
}

function updateRestaurant(idx, field, value) { editingRestaurants[idx][field] = value; }
function updateRestaurantNested(idx, parent, field, value) { editingRestaurants[idx][parent][field] = value; }
function updateDish(idx, di, field, value) { editingRestaurants[idx].dishes[di][field] = value; }
function updateCombo(idx, ci, field, value) { editingRestaurants[idx].combos[ci][field] = value; }
function resetRestaurant(idx) {
  editingRestaurants[idx] = JSON.parse(JSON.stringify(RESTAURANTS[idx]));
  renderRestaurantEditors();
  adminToast('已恢复默认数据', 'toast-success');
}
function saveAllRestaurants() {
  editingRestaurants.forEach((r, i) => { RESTAURANTS[i] = JSON.parse(JSON.stringify(r)); });
  localStorage.setItem('s3_restaurants', JSON.stringify(RESTAURANTS));
  adminToast('✅ 餐厅信息已保存！', 'toast-success');
}

// ===== 3. 红包设置 =====
function renderRedpacket(main) {
  main.innerHTML = `
    <div class="main-header"><h1>🧧 红包活动设置</h1><p>每家餐厅独立设置红包</p></div>
    ${RESTAURANTS.map((r, idx) => `
    <div class="content-card" style="margin-bottom:16px;">
      <div class="card-header"><h3>${r.logo} ${r.name}</h3></div>
      <div class="card-body">
        <div class="setting-row three-col">
          <div class="setting-group"><label>面额（元）</label><input type="number" id="rpAmount_${idx}" value="${r.redpacket.amount}"></div>
          <div class="setting-group"><label>门槛（元）</label><input type="number" id="rpMinSpend_${idx}" value="${r.redpacket.minSpend}"></div>
          <div class="setting-group"><label>发放总数</label><input type="number" id="rpTotal_${idx}" value="${r.redpacket.total}"></div>
        </div>
        <div class="setting-row">
          <div class="setting-group"><label>有效期（天）</label><input type="number" id="rpValidDays_${idx}" value="${r.redpacket.validDays}"></div>
          <div class="setting-group"><label>说明</label><input type="text" id="rpDesc_${idx}" value="${escHtml(r.redpacket.desc)}"></div>
        </div>
      </div>
    </div>
    `).join('')}
    <div style="text-align:right;"><button class="btn btn-primary" onclick="saveAllRedpacketConfig()">💾 保存所有红包设置</button></div>
  `;
}

function saveAllRedpacketConfig() {
  RESTAURANTS.forEach((r, idx) => {
    r.redpacket.amount = parseInt(document.getElementById('rpAmount_' + idx).value) || r.redpacket.amount;
    r.redpacket.minSpend = parseInt(document.getElementById('rpMinSpend_' + idx).value) || r.redpacket.minSpend;
    r.redpacket.total = parseInt(document.getElementById('rpTotal_' + idx).value) || r.redpacket.total;
    r.redpacket.validDays = parseInt(document.getElementById('rpValidDays_' + idx).value) || r.redpacket.validDays;
    r.redpacket.desc = document.getElementById('rpDesc_' + idx).value || r.redpacket.desc;
  });
  localStorage.setItem('s3_redpacket_config', JSON.stringify(RESTAURANTS.map(r => ({ id: r.id, redpacket: r.redpacket }))));
  adminToast('✅ 红包设置已保存！', 'toast-success');
}

// ===== 4. 📱 扫码核销（主要核销方式） =====
function renderScanPage(main) {
  main.innerHTML = `
    <div class="main-header">
      <h1>📱 扫码核销</h1>
      <p>用摄像头扫描顾客二维码，一键核销</p>
    </div>

    <div class="content-card">
      <div class="card-header"><h3>🔍 扫描顾客红包二维码</h3></div>
      <div class="card-body">
        <div id="qrScannerContainer" style="width:100%;max-width:400px;margin:0 auto;border-radius:12px;overflow:hidden;">
          <div id="qrReader" style="width:100%;"></div>
        </div>
        <div style="text-align:center;margin-top:12px;">
          <button class="btn btn-primary btn-lg" id="btnStartScan" onclick="startQRScanner()">📷 开始扫描</button>
          <button class="btn btn-outline btn-lg" id="btnStopScan" onclick="stopQRScanner()" style="display:none;">⏹ 停止扫描</button>
        </div>
        <div id="scanResult" style="margin-top:16px;"></div>
      </div>
    </div>

    <!-- 手动核销备用 -->
    <div class="content-card" style="margin-top:16px;">
      <div class="card-header"><h3>⌨️ 手动核销（备用）</h3></div>
      <div class="card-body">
        <p style="font-size:13px;color:#888;margin-bottom:12px;">
          让顾客在「我的红包」中点<b>「📋 复制核销链接」</b>发给你，粘贴到下方即可核销。
        </p>
        <div class="quick-verify-row">
          <input type="text" id="manualCodeInput" class="verify-input" placeholder="粘贴顾客发来的核销链接，或输入4位PIN码" autocomplete="off">
          <button class="btn btn-success btn-lg" onclick="manualVerify()" style="flex-shrink:0;">🔍 核销</button>
        </div>
        <div id="manualResult" style="margin-top:12px;"></div>
        <div style="margin-top:8px;font-size:11px;color:#AAA;">
          💡 提示：顾客分享的链接以 verify.html 开头；直接扫码更快更准确
        </div>
      </div>
    </div>
  `;
}

// 启动扫码器
function startQRScanner() {
  const readerEl = document.getElementById('qrReader');
  const btnStart = document.getElementById('btnStartScan');
  const btnStop = document.getElementById('btnStopScan');
  const resultDiv = document.getElementById('scanResult');

  resultDiv.innerHTML = '';

  if (typeof Html5Qrcode === 'undefined') {
    resultDiv.innerHTML = '<div class="verify-error">⚠️ 扫码库加载失败，请刷新页面重试或使用手动输入</div>';
    return;
  }

  html5QrScanner = new Html5Qrcode("qrReader");

  html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      // 扫描成功
      handleScannedData(decodedText, resultDiv);
      stopQRScanner();
      btnStart.style.display = 'inline-block';
      btnStop.style.display = 'none';
    },
    (errorMessage) => {
      // 扫描中...忽略错误
    }
  ).then(() => {
    btnStart.style.display = 'none';
    btnStop.style.display = 'inline-block';
    resultDiv.innerHTML = '<div style="text-align:center;color:#888;padding:16px;">📷 将二维码对准取景框...</div>';
  }).catch(err => {
    resultDiv.innerHTML = '<div class="verify-error">⚠️ 无法启动摄像头，请确保已授权相机权限，或使用手动输入</div>';
    console.error('Scanner error:', err);
  });
}

function stopQRScanner() {
  stopScanner();
  const btnStart = document.getElementById('btnStartScan');
  const btnStop = document.getElementById('btnStopScan');
  if (btnStart) btnStart.style.display = 'inline-block';
  if (btnStop) btnStop.style.display = 'none';
}

// 处理扫码结果
function handleScannedData(decodedText, resultDiv) {
  // 先检查是否是核销分享链接（verify.html?...）
  if (decodedText.includes('verify.html')) {
    handleVerifyUrl(decodedText, resultDiv);
    return;
  }

  let data;
  try {
    data = JSON.parse(decodedText);
  } catch (e) {
    resultDiv.innerHTML = '<div class="verify-error">❌ 无效的二维码，请确认是红包二维码</div>';
    return;
  }

  if (!data.i || !data.n || !data.r) {
    resultDiv.innerHTML = '<div class="verify-error">❌ 二维码数据不完整</div>';
    return;
  }

  // 缓存到管理员本地（便于后续PIN查找）
  cacheRedpacketData(data);

  // 检查是否已核销（管理员本地记录）
  const usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  if (usedCodes.includes(data.i)) {
    resultDiv.innerHTML = `
      <div class="verify-result-card used">
        <div class="vrc-icon">⚠️</div>
        <div class="vrc-title">该红包已核销</div>
        <div class="vrc-detail">
          ${data.r} · ¥${data.a} · ${data.p}<br>
          此红包之前已被核销，不可重复使用
        </div>
      </div>`;
    return;
  }

  // 检查是否过期
  const expireDate = new Date(data.e);
  if (expireDate < new Date()) {
    resultDiv.innerHTML = `
      <div class="verify-result-card expired">
        <div class="vrc-icon">⏰</div>
        <div class="vrc-title">红包已过期</div>
        <div class="vrc-detail">
          ${data.r} · ¥${data.a}<br>
          有效期至 ${data.e}，已过期
        </div>
      </div>`;
    return;
  }

  // 可核销！
  resultDiv.innerHTML = `
    <div class="verify-result-card active">
      <div class="vrc-icon">✅</div>
      <div class="vrc-title">验证通过，可核销</div>
      <div class="vrc-detail">
        <div class="vrc-amount">¥${data.a}</div>
        <div class="vrc-store">${data.r}</div>
        <div class="vrc-info">满¥${data.m}可用 · 有效期�� ${data.e}</div>
        <div class="vrc-user">用户: ${data.p} · 确认码: ${data.n}</div>
      </div>
      <button class="btn btn-success btn-lg" onclick="doScanVerify('${data.i}')" style="width:100%;margin-top:12px;">
        ✅ 确认核销 ¥${data.a}
      </button>
    </div>`;
}

// 处理核销分享链接（扫码扫到了 verify.html URL 或手动粘贴）
function handleVerifyUrl(url, resultDiv) {
  try {
    const urlObj = new URL(url);
    const d = urlObj.searchParams.get('d');
    if (!d) {
      resultDiv.innerHTML = '<div class="verify-error">❌ 链接中未包含红包数据</div>';
      return;
    }
    const json = decodeURIComponent(escape(atob(decodeURIComponent(d))));
    const data = JSON.parse(json);
    if (!data.i) {
      resultDiv.innerHTML = '<div class="verify-error">❌ 链接数据不完整</div>';
      return;
    }
    // 缓存 + 展示
    cacheRedpacketData(data);
    const fakeResult = { innerHTML: '' };
    Object.defineProperty(fakeResult, 'innerHTML', {
      set(val) { resultDiv.innerHTML = val; },
      get() { return resultDiv.innerHTML; }
    });

    // 模拟扫码结果展示
    const usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
    if (usedCodes.includes(data.i)) {
      resultDiv.innerHTML = `
        <div class="verify-result-card used">
          <div class="vrc-icon">⚠️</div>
          <div class="vrc-title">该红包已核销</div>
          <div class="vrc-detail">${data.r} · ¥${data.a}<br>此红包之前已被核销</div>
        </div>`;
      return;
    }
    const expireDate = new Date(data.e);
    if (expireDate < new Date()) {
      resultDiv.innerHTML = `
        <div class="verify-result-card expired">
          <div class="vrc-icon">⏰</div>
          <div class="vrc-title">红包已过期</div>
          <div class="vrc-detail">${data.r} · ¥${data.a}<br>有效期至 ${data.e}</div>
        </div>`;
      return;
    }
    resultDiv.innerHTML = `
      <div class="verify-result-card active">
        <div class="vrc-icon">✅</div>
        <div class="vrc-title">验证通过，可核销</div>
        <div class="vrc-detail">
          <div class="vrc-amount">¥${data.a}</div>
          <div class="vrc-store">${data.r}</div>
          <div class="vrc-info">满¥${data.m}可用 · 有效期至 ${data.e}</div>
          <div class="vrc-user">用户: ${data.p} · 确认码: ${data.n}</div>
        </div>
        <button class="btn btn-success btn-lg" onclick="doScanVerify('${data.i}')" style="width:100%;margin-top:12px;">
          ✅ 确认核销 ¥${data.a}
        </button>
      </div>`;
  } catch (e) {
    resultDiv.innerHTML = '<div class="verify-error">❌ 链接解析失败，请确认链接完整</div>';
  }
}

// 缓存扫码获得的红包数据到管理员本地（便于后续PIN查找）
function cacheRedpacketData(data) {
  const cache = JSON.parse(localStorage.getItem('s3_admin_rp_cache') || '[]');
  const exists = cache.find(c => c.i === data.i);
  if (!exists) {
    cache.push(data);
    localStorage.setItem('s3_admin_rp_cache', JSON.stringify(cache));
  }
}

// 扫码后确认核销
async function doScanVerify(id) {
  if (!confirm('确定核销此红包吗？核销后不可撤销。')) return;

  await useRedpacket(id);

  const usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  usedCodes.push(id);
  localStorage.setItem('s3_admin_verified', JSON.stringify(usedCodes));

  document.getElementById('scanResult').innerHTML = `
    <div class="verify-result-card used">
      <div class="vrc-icon">🎉</div>
      <div class="vrc-title" style="color:#27AE60;">核销成功！</div>
      <div class="vrc-detail">结账时直接抵扣对应金额</div>
    </div>`;

  adminToast('✅ 红包已核销！', 'toast-success');
}

// 手动核销（支持粘贴分享链接、PIN码、券码）
async function manualVerify() {
  const code = document.getElementById('manualCodeInput').value.trim();
  const resultDiv = document.getElementById('manualResult');

  if (!code) {
    resultDiv.innerHTML = '<div class="verify-error">⚠️ 请粘贴核销链接或输入PIN码</div>';
    return;
  }

  // 1. 如果是核销分享链接（verify.html?d=...）
  if (code.includes('verify.html')) {
    handleVerifyUrl(code, resultDiv);
    return;
  }

  // 2. 尝试解析为 JSON（直接粘贴了二维码数据）
  try {
    const data = JSON.parse(code);
    if (data.i && data.n) {
      cacheRedpacketData(data);
      handleCachedVerify(data, resultDiv);
      return;
    }
  } catch (e) { /* 不是 JSON */ }

  // 3. 从服务器搜索红包（替换原来的 localStorage 两个步骤）
  await getAllRedpackets();

  let rp = claimedRedpackets.find(r => r.id.toUpperCase() === code.toUpperCase());

  // 4. 按PIN查找
  if (!rp) {
    rp = claimedRedpackets.find(r => r.pin === code);
  }

  if (!rp) {
    resultDiv.innerHTML = `
      <div class="verify-error" style="padding:20px;">
        <div style="font-size:24px;margin-bottom:8px;">🔍</div>
        <div style="font-weight:600;margin-bottom:8px;">未找到该红包</div>
        <div style="font-size:13px;color:#888;line-height:1.8;">
          可能的原因：<br>
          1. 顾客尚未领取红包<br>
          2. 红包ID或PIN码输入有误<br><br>
          💡 <b>解决方法：</b><br>
          · 让顾客在「我的红包」中点<b>「📋 复制核销链接」</b><br>
          · 将链接粘贴到上方输入框即可核销
        </div>
      </div>`;
    return;
  }

  // localStorage 中找到了（同设备）
  const now = new Date();
  const expired = new Date(rp.expireAt) < now;

  if (rp.used) {
    resultDiv.innerHTML = `
      <div class="verify-result-card used">
        <div class="vrc-icon">⚠️</div>
        <div class="vrc-title">该红包已核销</div>
        <div class="vrc-detail">${rp.restaurantName} · ¥${rp.amount} · ${rp.phoneMasked}</div>
      </div>`;
    return;
  }

  if (expired) {
    resultDiv.innerHTML = `
      <div class="verify-result-card expired">
        <div class="vrc-icon">⏰</div>
        <div class="vrc-title">红包已过期</div>
        <div class="vrc-detail">有效期至 ${new Date(rp.expireAt).toLocaleDateString('zh-CN')}</div>
      </div>`;
    return;
  }

  resultDiv.innerHTML = `
    <div class="verify-result-card active">
      <div class="vrc-icon">✅</div>
      <div class="vrc-title">验证通过，可核销</div>
      <div class="vrc-detail">
        <div class="vrc-amount">¥${rp.amount}</div>
        <div class="vrc-store">${rp.restaurantName}</div>
        <div class="vrc-info">满¥${rp.minSpend}可用 · ${new Date(rp.expireAt).toLocaleDateString('zh-CN')}前有效</div>
        <div class="vrc-user">用户: ${rp.phoneMasked} · PIN: ${rp.pin}</div>
      </div>
      <button class="btn btn-success btn-lg" onclick="doScanVerify('${rp.id}')" style="width:100%;margin-top:12px;">
        ✅ 确认核销 ¥${rp.amount}
      </button>
    </div>`;
}

// 从缓存数据中展示验证结果
function handleCachedVerify(data, resultDiv) {
  const usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  if (usedCodes.includes(data.i)) {
    resultDiv.innerHTML = `
      <div class="verify-result-card used">
        <div class="vrc-icon">⚠️</div>
        <div class="vrc-title">该红包已核销</div>
        <div class="vrc-detail">${data.r} · ¥${data.a} · ${data.p}</div>
      </div>`;
    return;
  }
  const expireDate = new Date(data.e);
  if (expireDate < new Date()) {
    resultDiv.innerHTML = `
      <div class="verify-result-card expired">
        <div class="vrc-icon">⏰</div>
        <div class="vrc-title">红包已过期</div>
        <div class="vrc-detail">${data.r} · ¥${data.a} · 有效期至 ${data.e}</div>
      </div>`;
    return;
  }
  resultDiv.innerHTML = `
    <div class="verify-result-card active">
      <div class="vrc-icon">✅</div>
      <div class="vrc-title">验证通过，可核销</div>
      <div class="vrc-detail">
        <div class="vrc-amount">¥${data.a}</div>
        <div class="vrc-store">${data.r}</div>
        <div class="vrc-info">满¥${data.m}可用 · 有效期至 ${data.e}</div>
        <div class="vrc-user">用户: ${data.p} · 确认码: ${data.n}</div>
      </div>
      <button class="btn btn-success btn-lg" onclick="doScanVerify('${data.i}')" style="width:100%;margin-top:12px;">
        ✅ 确认核销 ¥${data.a}
      </button>
    </div>`;
}

// ===== 5. 红包记录 =====
async function renderRecords(main) {
  await getAllRedpackets();
  main.innerHTML = `
    <div class="main-header">
      <h1>📋 红包记录</h1>
      <p>查看所有红包明细 · 共 ${claimedRedpackets.length} 条</p>
    </div>
    <div class="content-card">
      <div class="card-body" style="overflow-x:auto;">
        ${claimedRedpackets.length === 0 ? '<p style="text-align:center;color:#AAA;padding:40px;">暂无红包记录</p>' : `
        <table class="data-table">
          <thead>
            <tr><th>PIN</th><th>用户</th><th>餐厅</th><th>面额</th><th>领取时间</th><th>有效期至</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            ${[...claimedRedpackets].sort((a,b)=>new Date(b.claimedAt)-new Date(a.claimedAt)).map(rp => {
              const now = new Date();
              const expired = new Date(rp.expireAt) < now;
              let status = rp.used ? 'used' : (expired ? 'expired' : 'active');
              let statusText = rp.used ? '已核销' : (expired ? '已过期' : '可使用');
              return `
                <tr>
                  <td style="font-weight:700;font-size:16px;">${rp.pin}</td>
                  <td>${rp.phoneMasked}</td>
                  <td>${rp.restaurantName}</td>
                  <td style="font-weight:600;color:#E74C3C;">¥${rp.amount}</td>
                  <td>${new Date(rp.claimedAt).toLocaleString('zh-CN')}</td>
                  <td>${new Date(rp.expireAt).toLocaleDateString('zh-CN')}</td>
                  <td><span class="status-badge status-${status}">${statusText}</span></td>
                  <td>
                    ${!rp.used && !expired ? `<button class="btn btn-success btn-sm" onclick="markAsUsed('${rp.id}')">核销</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        `}
      </div>
    </div>
  `;
}

async function markAsUsed(id) {
  if (confirm('确定核销此红包吗？')) {
    await useRedpacket(id);
    const usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
    if (!usedCodes.includes(id)) { usedCodes.push(id); }
    localStorage.setItem('s3_admin_verified', JSON.stringify(usedCodes));
    adminToast('✅ 红包已核销！', 'toast-success');
    renderRecords(document.getElementById('mainContent'));
  }
}

// ===== 6. 活动二维码 =====
function renderQRCode(main) {
  const currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  main.innerHTML = `
    <div class="main-header"><h1>📱 活动二维码</h1><p>顾客扫码进入活动页面</p></div>
    <div class="content-card">
      <div class="card-body">
        <div class="qr-display">
          <div class="qr-code" id="qrContainer"><span style="font-size:14px;color:#AAA;">生成中...</span></div>
          <h4 style="margin-bottom:8px;">扫一扫，查看三店信息 · 领红包</h4>
          <div class="qr-tip">打印张贴在店内，微信和大众点评扫码均可打开。</div>
          <div class="qr-url">活动链接：<span id="qrUrl">${currentUrl}</span></div>
          <div style="margin-top:16px;">
            <button class="btn btn-primary" onclick="copyQRUrl()">📋 复制链接</button>
            <button class="btn btn-outline" onclick="downloadQR()" style="margin-left:8px;">💾 下载二维码</button>
          </div>
        </div>
      </div>
    </div>
  `;
  setTimeout(generateQR, 100);
}

function generateQR() {
  const container = document.getElementById('qrContainer');
  const currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;
  container.innerHTML = `<img src="${qrUrl}" alt="活动二维码" style="width:200px;height:200px;border-radius:8px;">`;
}

function copyQRUrl() {
  const currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  navigator.clipboard.writeText(currentUrl).then(() => {
    adminToast('✅ 链接已复制', 'toast-success');
  }).catch(() => adminToast('复制失败，请手动复制', 'toast-error'));
}

function downloadQR() {
  const img = document.querySelector('#qrContainer img');
  if (img) {
    const link = document.createElement('a');
    link.download = '三店联动活动二维码.png';
    link.href = img.src;
    link.click();
  }
}

// ===== 工具函数 =====
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== 清除所有数据 =====
async function clearAllDataAdmin() {
  if (!confirm('⚠️ 确定要清除所有历史数据吗？\n\n这将删除：\n· 所有红包领取记录\n· 扫码统计\n· 核销记录\n· 缓存数据\n\n餐厅信息和红包设置不会受影响。\n\n此操作不可撤销！')) return;
  
  if (!confirm('再次确认：真的要清除所有数据吗？')) return;

  await clearAllData();
  adminToast('✅ 所有历史数据已清除', 'toast-success');
  
  // 刷新当前页面
  setTimeout(() => { switchTab(currentTab); }, 500);
}

// 初始化加载保存的数据
(function() {
  const saved = localStorage.getItem('s3_restaurants');
  if (saved) {
    const parsed = JSON.parse(saved);
    parsed.forEach((r, i) => { if (RESTAURANTS[i]) Object.assign(RESTAURANTS[i], r); });
  }
  const savedRPC = localStorage.getItem('s3_redpacket_config');
  if (savedRPC) {
    const parsed = JSON.parse(savedRPC);
    parsed.forEach(item => {
      const r = RESTAURANTS.find(x => x.id === item.id);
      if (r) Object.assign(r.redpacket, item.redpacket);
    });
  }
})();
