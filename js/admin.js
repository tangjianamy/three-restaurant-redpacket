// ==================== 管理后台逻辑 v3.0 ====================
// 内容管理 · 图片上传 · 操作日志 · 双语支持

let currentTab = 'dashboard';
let editingRestaurants = [];
let html5QrScanner = null;
let adminToken = null;

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
  adminToken = localStorage.getItem('s3_admin_token');
  if (adminToken) {
    const valid = await checkAuth();
    if (!valid) { adminToken = null; localStorage.removeItem('s3_admin_token'); }
  }
  if (!adminToken) { showLogin(); return; }
  showMain();
  updateSidebarUser();
  await loadStats();
  // 从服务端加载餐厅数据
  const res = await adminLoadRestaurants();
  if (res.success) {
    editingRestaurants = JSON.parse(JSON.stringify(res.data));
    // 同步到 RESTAURANTS
    res.data.forEach((r, i) => { if (RESTAURANTS[i]) Object.assign(RESTAURANTS[i], r); });
  } else {
    editingRestaurants = JSON.parse(JSON.stringify(RESTAURANTS));
  }
  switchTab('dashboard');
});

// ===== Toast =====
function adminToast(msg, type) {
  type = type || '';
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  toast.style.display = 'block';
  setTimeout(function() { toast.style.display = 'none'; }, 2500);
}

// ===== 管理员登录/鉴权 =====
function showLogin() {
  document.getElementById('loginOverlay').style.display = 'flex';
  document.querySelector('.admin-layout').style.display = 'none';
  document.getElementById('mobileTopbar').style.display = 'none';
  document.getElementById('mobileBottomNav').style.display = 'none';
}

function showMain() {
  document.getElementById('loginOverlay').style.display = 'none';
  document.querySelector('.admin-layout').style.display = 'flex';
  document.getElementById('mobileTopbar').style.display = '';
  document.getElementById('mobileBottomNav').style.display = '';
}

function updateSidebarUser() {
  var el = document.getElementById('sidebarUser');
  if (el) el.textContent = '👤 admin';
}

async function checkAuth() {
  try {
    var res = await fetch(API_BASE + '/api/admin/check', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    var data = await res.json();
    return data.valid;
  } catch (e) { return false; }
}

async function doLogin(e) {
  e.preventDefault();
  var username = document.getElementById('loginUser').value.trim();
  var password = document.getElementById('loginPass').value.trim();
  var errorEl = document.getElementById('loginError');
  if (!username || !password) {
    errorEl.textContent = L('请输入账号和密码', 'Please enter username and password');
    errorEl.style.display = 'block'; return;
  }
  try {
    var res = await fetch(API_BASE + '/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });
    var data = await res.json();
    if (data.success) {
      adminToken = data.token;
      localStorage.setItem('s3_admin_token', adminToken);
      errorEl.style.display = 'none';
      showMain(); updateSidebarUser();
      await loadStats();
      var rres = await adminLoadRestaurants();
      if (rres.success) {
        editingRestaurants = JSON.parse(JSON.stringify(rres.data));
        rres.data.forEach(function(r, i) { if (RESTAURANTS[i]) Object.assign(RESTAURANTS[i], r); });
      } else {
        editingRestaurants = JSON.parse(JSON.stringify(RESTAURANTS));
      }
      switchTab('dashboard');
    } else {
      errorEl.textContent = data.messageZh || data.message || L('登录失败', 'Login failed');
      errorEl.style.display = 'block';
    }
  } catch (e) { errorEl.textContent = L('网络错误，请重试', 'Network error, please retry'); errorEl.style.display = 'block'; }
}

function doLogout() {
  if (!confirm(L('确定退出登录吗？', 'Are you sure you want to logout?'))) return;
  adminToken = null;
  localStorage.removeItem('s3_admin_token');
  stopScanner();
  document.querySelector('.admin-layout').style.display = 'none';
  document.getElementById('mobileTopbar').style.display = 'none';
  document.getElementById('mobileBottomNav').style.display = 'none';
  showLogin();
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.querySelector('.sidebar').classList.remove('open');
}

function authHeaders() {
  return adminToken ? { 'Authorization': 'Bearer ' + adminToken } : {};
}

// ===== 切换标签页 =====
function switchTab(tab) {
  currentTab = tab;
  stopScanner();
  document.querySelectorAll('.sidebar-nav a').forEach(function(a) { a.classList.remove('active'); });
  var link = document.querySelector('.sidebar-nav a[onclick*="' + tab + '"]');
  if (link) link.classList.add('active');

  document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(function(a) { a.classList.remove('active'); });
  var navItem = document.querySelector('.mobile-bottom-nav [data-tab="' + tab + '"]');
  if (navItem) navItem.classList.add('active');

  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  }

  var main = document.getElementById('mainContent');
  switch (tab) {
    case 'dashboard': renderDashboard(main); break;
    case 'content': renderContent(main); break;
    case 'redpacket': renderRedpacket(main); break;
    case 'records': renderRecords(main); break;
    case 'scan': renderScanPage(main); break;
    case 'qrcode': renderQRCode(main); break;
    case 'logs': renderLogs(main); break;
    case 'settings': renderRedpacket(main); break;
  }
}

function toggleSidebar() {
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function stopScanner() {
  if (html5QrScanner) { html5QrScanner.stop().catch(function(){}); html5QrScanner = null; }
}

// ===== 1. 数据看板 =====
async function renderDashboard(main) {
  await loadStats();
  var totalRedpackets = RESTAURANTS.reduce(function(sum, r) { return sum + r.redpacket.total; }, 0);
  main.innerHTML =
    '<div class="main-header"><h1>📊 ' + L('数据看板', 'Dashboard') + '</h1><p>' + L('实时监控活动数据', 'Real-time campaign metrics') + '</p></div>' +
    '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-icon" style="background:#EBF5FB;color:#2980B9;">📱</div><div><div class="stat-value">' + STATS.scanCount + '</div><div class="stat-label">' + L('扫码人次', 'Scans') + '</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#FEF9E7;color:#F39C12;">🧧</div><div><div class="stat-value">' + STATS.redpacketClaimed + '</div><div class="stat-label">' + L('红包领取', 'Claimed') + '</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#E8F8F5;color:#27AE60;">✅</div><div><div class="stat-value">' + STATS.redpacketUsed + '</div><div class="stat-label">' + L('红包核销', 'Used') + '</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#FDEDEC;color:#E74C3C;">📈</div><div><div class="stat-value">' + (STATS.redpacketClaimed > 0 ? Math.round(STATS.redpacketUsed / STATS.redpacketClaimed * 100) : 0) + '%</div><div class="stat-label">' + L('核销率', 'Usage Rate') + '</div></div></div>' +
    '</div>' +
    '<div class="content-card"><div class="card-header"><h3>' + L('活动概况', 'Overview') + '</h3></div>' +
    '<div class="card-body">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">' +
        '<div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;"><div style="font-size:14px;color:#888;">' + L('剩余红包', 'Remaining') + '</div><div style="font-size:28px;font-weight:800;color:#F39C12;">' + (totalRedpackets - STATS.redpacketClaimed) + '</div><div style="font-size:11px;color:#AAA;">/ ' + totalRedpackets + '</div></div>' +
        '<div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;"><div style="font-size:14px;color:#888;">' + L('红包面额', 'Amount') + '</div><div style="font-size:28px;font-weight:800;color:#E74C3C;">¥' + RESTAURANTS.map(function(r) { return r.redpacket.amount; }).join('/¥') + '</div><div style="font-size:11px;color:#AAA;">' + L('各店不同', 'Varies') + '</div></div>' +
        '<div style="text-align:center;padding:16px;background:#F8F9FA;border-radius:8px;"><div style="font-size:14px;color:#888;">' + L('有效期', 'Validity') + '</div><div style="font-size:28px;font-weight:800;color:#2980B9;">' + RESTAURANTS[0].redpacket.validDays + '</div><div style="font-size:11px;color:#AAA;">' + L('天', 'days') + '</div></div>' +
      '</div>' +
    '</div></div>';
}

// ===== 2. 内容管理（CMS） =====
function renderContent(main) {
  main.innerHTML =
    '<div class="main-header"><h1>🖼️ ' + L('内容管理', 'Content Management') + '</h1><p>' + L('修改门头图、环境图、菜品图片和信息', 'Edit storefront, gallery, dishes & combos') + '</p></div>' +
    '<div id="contentEditors"></div>';
  renderContentEditors();
}

function renderContentEditors() {
  var container = document.getElementById('contentEditors');
  var html = '';
  editingRestaurants.forEach(function(r, idx) {
    html += '<div class="restaurant-editor">' +
      '<div class="editor-header"><h4><span class="color-dot" style="background:' + r.color + '"></span>' + escHtml(r.name) + ' · ' + escHtml(r.subtitle) + '</h4><span class="tab-badge" style="background:' + r.colorLight + ';color:' + r.color + ';">' + escHtml(r.category) + '</span></div>';

    // 门头图
    html += '<div class="cms-section"><h5>' + L('门头图片', 'Storefront Image') + '</h5>' +
      '<div class="img-upload-row">' +
        '<div class="img-preview" id="coverPrev_' + idx + '">' + (r.cover ? '<img src="' + escHtml(r.cover) + '" alt="cover">' : '<span class="img-placeholder">' + L('无图片', 'No Image') + '</span>') + '</div>' +
        '<div class="img-upload-area">' +
          '<input type="file" accept="image/*" id="coverFile_' + idx + '" style="display:none;" onchange="uploadImage(' + idx + ',\'cover\',this)">' +
          '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'coverFile_' + idx + '\').click()">📷 ' + L('本地上传', 'Upload') + '</button>' +
          '<div style="margin-top:4px;"><input value="' + escHtml(r.cover) + '" onchange="updateRestaurant(' + idx + ',\'cover\',this.value)" placeholder="' + L('或手动输入URL', 'Or enter URL manually') + '" style="width:100%;font-size:11px;"></div>' +
        '</div>' +
      '</div></div>';

    // 环境图集
    html += '<div class="cms-section"><h5>' + L('店铺环境图片', 'Gallery Images') + '</h5>' +
      '<div class="gallery-editor" id="gallery_' + idx + '">';
    (r.gallery || []).forEach(function(g, gi) {
      html += '<div class="gallery-item">' +
        '<div class="img-preview img-preview-sm">' + (g ? '<img src="' + escHtml(g) + '" alt="gallery">' : '<span class="img-placeholder">' + L('无', 'N/A') + '</span>') + '</div>' +
        '<input value="' + escHtml(g) + '" onchange="updateDish(' + idx + ',' + gi + ',\'img\',this.value)" placeholder="' + L('图片URL', 'Image URL') + '" style="width:100%;font-size:11px;">' +
        '<input type="file" accept="image/*" id="galFile_' + idx + '_' + gi + '" style="display:none;" onchange="uploadImageToIdx(' + idx + ',' + gi + ',\'gallery\',this)">' +
        '<button class="btn btn-outline btn-sm" style="font-size:10px;" onclick="document.getElementById(\'galFile_' + idx + '_' + gi + '\').click()">📷</button>' +
      '</div>';
    });
    html += '<button class="btn btn-outline btn-sm" onclick="addGalleryItem(' + idx + ');setTimeout(renderContentEditors,100);">+ ' + L('添加图片', 'Add Image') + '</button>' +
      '</div></div>';

    // 招牌菜品
    html += '<div class="cms-section"><h5>' + L('招牌菜品', 'Signature Dishes') + '</h5>' +
      '<div style="overflow-x:auto;"><table class="sub-table"><thead><tr><th>' + L('中文名', 'Name (CN)') + '</th><th>English</th><th>' + L('描述', 'Desc (CN)') + '</th><th>Desc (EN)</th><th>' + L('价格', 'Price') + '</th><th>' + L('图片', 'Image') + '</th></tr></thead><tbody>';
    r.dishes.forEach(function(d, di) {
      html += '<tr>' +
        '<td><input value="' + escHtml(d.name) + '" onchange="updateDish(' + idx + ',' + di + ',\'name\',this.value)"></td>' +
        '<td><input value="' + escHtml(d.nameEn || '') + '" onchange="updateDish(' + idx + ',' + di + ',\'nameEn\',this.value)"></td>' +
        '<td><input value="' + escHtml(d.desc) + '" onchange="updateDish(' + idx + ',' + di + ',\'desc\',this.value)"></td>' +
        '<td><input value="' + escHtml(d.descEn || '') + '" onchange="updateDish(' + idx + ',' + di + ',\'descEn\',this.value)"></td>' +
        '<td><input value="' + d.price + '" onchange="updateDish(' + idx + ',' + di + ',\'price\',parseInt(this.value)||0)" style="width:60px;"></td>' +
        '<td style="min-width:120px;"><div style="display:flex;align-items:center;gap:4px;"><input value="' + escHtml(d.img) + '" onchange="updateDish(' + idx + ',' + di + ',\'img\',this.value)" style="flex:1;font-size:10px;">' +
        '<input type="file" accept="image/*" id="dishFile_' + idx + '_' + di + '" style="display:none;" onchange="uploadDishImage(' + idx + ',' + di + ',this)">' +
        '<button class="btn btn-outline btn-sm" style="font-size:10px;padding:2px 4px;" onclick="document.getElementById(\'dishFile_' + idx + '_' + di + '\').click()">📷</button></div></td>' +
      '</tr>';
    });
    html += '</tbody></table></div></div>';

    // 优惠套餐
    html += '<div class="cms-section"><h5>' + L('优惠套餐', 'Meal Packages') + '</h5>' +
      '<div style="overflow-x:auto;"><table class="sub-table"><thead><tr><th>' + L('中文名', 'Name (CN)') + '</th><th>English</th><th>' + L('内容', 'Content (CN)') + '</th><th>Content (EN)</th><th>' + L('原价', 'Orig') + '</th><th>' + L('活动价', 'Sale') + '</th><th>' + L('标签', 'Tag') + '</th><th>Tag (EN)</th></tr></thead><tbody>';
    r.combos.forEach(function(c, ci) {
      html += '<tr>' +
        '<td><input value="' + escHtml(c.name) + '" onchange="updateCombo(' + idx + ',' + ci + ',\'name\',this.value)"></td>' +
        '<td><input value="' + escHtml(c.nameEn || '') + '" onchange="updateCombo(' + idx + ',' + ci + ',\'nameEn\',this.value)"></td>' +
        '<td><input value="' + escHtml(c.content) + '" onchange="updateCombo(' + idx + ',' + ci + ',\'content\',this.value)"></td>' +
        '<td><input value="' + escHtml(c.contentEn || '') + '" onchange="updateCombo(' + idx + ',' + ci + ',\'contentEn\',this.value)"></td>' +
        '<td><input value="' + c.originalPrice + '" onchange="updateCombo(' + idx + ',' + ci + ',\'originalPrice\',parseInt(this.value)||0)" style="width:60px;"></td>' +
        '<td><input value="' + c.price + '" onchange="updateCombo(' + idx + ',' + ci + ',\'price\',parseInt(this.value)||0)" style="width:60px;"></td>' +
        '<td><input value="' + escHtml(c.tag) + '" onchange="updateCombo(' + idx + ',' + ci + ',\'tag\',this.value)" style="width:80px;"></td>' +
        '<td><input value="' + escHtml(c.tagEn || '') + '" onchange="updateCombo(' + idx + ',' + ci + ',\'tagEn\',this.value)" style="width:80px;"></td>' +
      '</tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">' +
      '<button class="btn btn-outline btn-sm" onclick="resetRestaurant(' + idx + ')">🔄 ' + L('恢复默认', 'Reset Default') + '</button>' +
      '<button class="btn btn-primary" onclick="saveSingleRestaurant(' + idx + ')">💾 ' + L('保存此餐厅', 'Save') + '</button>' +
      '</div></div>';
  });

  html += '<div style="margin-top:20px;text-align:right;"><button class="btn btn-primary btn-lg" onclick="saveAllContent()">💾 ' + L('保存所有修改', 'Save All Changes') + '</button></div>';
  container.innerHTML = html;
}

// 图片上传到指定字段
async function uploadImage(idx, field, fileInput) {
  if (!fileInput.files || !fileInput.files[0]) return;
  var file = fileInput.files[0];
  adminToast(L('上传中...', 'Uploading...'));
  var res = await adminUploadImage(file);
  if (res.success) {
    editingRestaurants[idx][field] = res.path;
    adminToast('✅ ' + L('上传成功', 'Uploaded!'), 'toast-success');
    renderContentEditors();
  } else {
    adminToast('❌ ' + (res.messageZh || res.message), 'toast-error');
  }
}

// 上传菜品图片
async function uploadDishImage(idx, di, fileInput) {
  if (!fileInput.files || !fileInput.files[0]) return;
  var file = fileInput.files[0];
  adminToast(L('上传中...', 'Uploading...'));
  var res = await adminUploadImage(file);
  if (res.success) {
    editingRestaurants[idx].dishes[di].img = res.path;
    adminToast('✅ ' + L('上传成功', 'Uploaded!'), 'toast-success');
    renderContentEditors();
  } else {
    adminToast('❌ ' + (res.messageZh || res.message), 'toast-error');
  }
}

// 上传画廊图片到指定索引
async function uploadImageToIdx(idx, gi, field, fileInput) {
  if (!fileInput.files || !fileInput.files[0]) return;
  var file = fileInput.files[0];
  adminToast(L('上传中...', 'Uploading...'));
  var res = await adminUploadImage(file);
  if (res.success) {
    editingRestaurants[idx][field][gi] = res.path;
    adminToast('✅ ' + L('上传成功', 'Uploaded!'), 'toast-success');
    renderContentEditors();
  } else {
    adminToast('❌ ' + (res.messageZh || res.message), 'toast-error');
  }
}

function addGalleryItem(idx) {
  if (!editingRestaurants[idx].gallery) editingRestaurants[idx].gallery = [];
  editingRestaurants[idx].gallery.push('');
}

function updateRestaurant(idx, field, value) { editingRestaurants[idx][field] = value; }
function updateDish(idx, di, field, value) { editingRestaurants[idx].dishes[di][field] = value; }
function updateCombo(idx, ci, field, value) { editingRestaurants[idx].combos[ci][field] = value; }

function resetRestaurant(idx) {
  editingRestaurants[idx] = JSON.parse(JSON.stringify(RESTAURANTS[idx]));
  renderContentEditors();
  adminToast(L('已恢复默认数据', 'Reset to default'), 'toast-success');
}

async function saveSingleRestaurant(idx) {
  var r = editingRestaurants[idx];
  // 同步到本地 RESTAURANTS
  Object.assign(RESTAURANTS[idx], JSON.parse(JSON.stringify(r)));
  var res = await adminSaveRestaurant(r.id, r);
  if (res.success) {
    adminToast('✅ ' + L('保存成功', 'Saved!'), 'toast-success');
  } else {
    adminToast('❌ ' + (res.messageZh || res.message), 'toast-error');
  }
}

async function saveAllContent() {
  adminToast(L('正在保存所有餐厅数据...', 'Saving all data...'));
  for (var i = 0; i < editingRestaurants.length; i++) {
    var r = editingRestaurants[i];
    Object.assign(RESTAURANTS[i], JSON.parse(JSON.stringify(r)));
    await adminSaveRestaurant(r.id, r);
  }
  adminToast('✅ ' + L('全部保存成功!', 'All saved!'), 'toast-success');
  renderContentEditors();
}

// ===== 3. 红包设置 =====
function renderRedpacket(main) {
  main.innerHTML =
    '<div class="main-header"><h1>🧧 ' + L('红包活动设置', 'Red Packet Settings') + '</h1><p>' + L('每家餐厅独立设置红包', 'Independent per restaurant') + '</p></div>' +
    RESTAURANTS.map(function(r, idx) {
      return '<div class="content-card" style="margin-bottom:16px;">' +
        '<div class="card-header"><h3>' + r.logo + ' ' + escHtml(r.name) + '</h3></div>' +
        '<div class="card-body">' +
          '<div class="setting-row three-col">' +
            '<div class="setting-group"><label>' + L('面额（元）', 'Amount (¥)') + '</label><input type="number" id="rpAmount_' + idx + '" value="' + r.redpacket.amount + '"></div>' +
            '<div class="setting-group"><label>' + L('门槛（元）', 'Min Spend (¥)') + '</label><input type="number" id="rpMinSpend_' + idx + '" value="' + r.redpacket.minSpend + '"></div>' +
            '<div class="setting-group"><label>' + L('发放总数', 'Total') + '</label><input type="number" id="rpTotal_' + idx + '" value="' + r.redpacket.total + '"></div>' +
          '</div>' +
          '<div class="setting-row">' +
            '<div class="setting-group"><label>' + L('有效期（天）', 'Valid Days') + '</label><input type="number" id="rpValidDays_' + idx + '" value="' + r.redpacket.validDays + '"></div>' +
            '<div class="setting-group"><label>' + L('中文说明', 'Description (CN)') + '</label><input type="text" id="rpDesc_' + idx + '" value="' + escHtml(r.redpacket.desc) + '"></div>' +
            '<div class="setting-group"><label>' + L('英文说明', 'Description (EN)') + '</label><input type="text" id="rpDescEn_' + idx + '" value="' + escHtml(r.redpacket.descEn || '') + '"></div>' +
          '</div>' +
        '</div></div>';
    }).join('') +
    '<div style="text-align:right;"><button class="btn btn-primary" onclick="saveAllRedpacketConfig()">💾 ' + L('保存所有红包设置', 'Save All Settings') + '</button></div>';
}

function saveAllRedpacketConfig() {
  RESTAURANTS.forEach(function(r, idx) {
    r.redpacket.amount = parseInt(document.getElementById('rpAmount_' + idx).value) || r.redpacket.amount;
    r.redpacket.minSpend = parseInt(document.getElementById('rpMinSpend_' + idx).value) || r.redpacket.minSpend;
    r.redpacket.total = parseInt(document.getElementById('rpTotal_' + idx).value) || r.redpacket.total;
    r.redpacket.validDays = parseInt(document.getElementById('rpValidDays_' + idx).value) || r.redpacket.validDays;
    r.redpacket.desc = document.getElementById('rpDesc_' + idx).value || r.redpacket.desc;
    r.redpacket.descEn = document.getElementById('rpDescEn_' + idx).value || r.redpacket.descEn || '';
  });
  // 同步红包设置到服务端
  RESTAURANTS.forEach(function(r) {
    adminSaveRestaurant(r.id, r).catch(function(){});
  });
  adminToast('✅ ' + L('红包设置已保存！', 'Settings saved!'), 'toast-success');
}

// ===== 4. 扫码核销 =====
function renderScanPage(main) {
  main.innerHTML =
    '<div class="main-header"><h1>📱 ' + L('扫码核销', 'QR Scan Verify') + '</h1><p>' + L('用摄像头扫描顾客二维码，一键核销', 'Scan customer QR code to verify') + '</p></div>' +
    '<div class="content-card">' +
      '<div class="card-header"><h3>🔍 ' + L('扫描顾客红包二维码', 'Scan QR Code') + '</h3></div>' +
      '<div class="card-body">' +
        '<div id="qrScannerContainer" style="width:100%;max-width:400px;margin:0 auto;border-radius:12px;overflow:hidden;"><div id="qrReader" style="width:100%;"></div></div>' +
        '<div style="text-align:center;margin-top:12px;">' +
          '<button class="btn btn-primary btn-lg" id="btnStartScan" onclick="startQRScanner()">📷 ' + L('开始扫描', 'Start Scan') + '</button>' +
          '<button class="btn btn-outline btn-lg" id="btnStopScan" onclick="stopQRScanner()" style="display:none;">⏹ ' + L('停止扫描', 'Stop') + '</button>' +
        '</div>' +
        '<div id="scanResult" style="margin-top:16px;"></div>' +
      '</div></div>' +
    '<div class="content-card" style="margin-top:16px;">' +
      '<div class="card-header"><h3>⌨️ ' + L('手动核销（备用）', 'Manual Verify (Backup)') + '</h3></div>' +
      '<div class="card-body">' +
        '<p style="font-size:13px;color:#888;margin-bottom:12px;">' + L('让顾客在「我的红包」中点<b>「📋 复制核销链接」</b>发给你，粘贴到下方即可。', 'Ask customer to copy the verify link from "My Red Packets" and paste it below.') + '</p>' +
        '<div class="quick-verify-row">' +
          '<input type="text" id="manualCodeInput" class="verify-input" placeholder="' + L('粘贴顾客发来的核销链接，或输入4位PIN码', 'Paste verify link or enter 4-digit PIN') + '" autocomplete="off">' +
          '<button class="btn btn-success btn-lg" onclick="manualVerify()" style="flex-shrink:0;">🔍 ' + L('核销', 'Verify') + '</button>' +
        '</div>' +
        '<div id="manualResult" style="margin-top:12px;"></div>' +
      '</div></div>';
}

// 以下扫码核销函数保持不变
function startQRScanner() {
  var readerEl = document.getElementById('qrReader');
  var btnStart = document.getElementById('btnStartScan');
  var btnStop = document.getElementById('btnStopScan');
  var resultDiv = document.getElementById('scanResult');
  resultDiv.innerHTML = '';

  if (typeof Html5Qrcode === 'undefined') {
    resultDiv.innerHTML = '<div class="verify-error">⚠️ ' + L('扫码库加载失败，请刷新页面重试', 'QR library failed to load, please refresh') + '</div>';
    return;
  }
  html5QrScanner = new Html5Qrcode("qrReader");
  html5QrScanner.start(
    { facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
    function(decodedText) {
      handleScannedData(decodedText, resultDiv);
      stopQRScanner();
      if (btnStart) btnStart.style.display = 'inline-block';
      if (btnStop) btnStop.style.display = 'none';
    },
    function() {}
  ).then(function() {
    btnStart.style.display = 'none'; btnStop.style.display = 'inline-block';
    resultDiv.innerHTML = '<div style="text-align:center;color:#888;padding:16px;">📷 ' + L('将二维码对准取景框...', 'Aim camera at QR code...') + '</div>';
  }).catch(function() {
    resultDiv.innerHTML = '<div class="verify-error">⚠️ ' + L('无法启动摄像头，请确保已授权相机权限', 'Cannot access camera, please grant permission') + '</div>';
  });
}

function stopQRScanner() {
  stopScanner();
  var btnStart = document.getElementById('btnStartScan');
  var btnStop = document.getElementById('btnStopScan');
  if (btnStart) btnStart.style.display = 'inline-block';
  if (btnStop) btnStop.style.display = 'none';
}

function handleScannedData(decodedText, resultDiv) {
  if (decodedText.indexOf('verify.html') >= 0) { handleVerifyUrl(decodedText, resultDiv); return; }
  var data;
  try { data = JSON.parse(decodedText); } catch(e) {
    resultDiv.innerHTML = '<div class="verify-error">❌ ' + L('无效的二维码', 'Invalid QR code') + '</div>'; return;
  }
  if (!data.i || !data.n || !data.r) {
    resultDiv.innerHTML = '<div class="verify-error">❌ ' + L('二维码数据不完整', 'Incomplete QR data') + '</div>'; return;
  }
  cacheRedpacketData(data);
  var usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  if (usedCodes.indexOf(data.i) >= 0) {
    resultDiv.innerHTML = '<div class="verify-result-card used"><div class="vrc-icon">⚠️</div><div class="vrc-title">' + L('该红包已核销', 'Already used') + '</div><div class="vrc-detail">' + data.r + ' · ¥' + data.a + ' · ' + data.p + '</div></div>';
    return;
  }
  var expireDate = new Date(data.e);
  if (expireDate < new Date()) {
    resultDiv.innerHTML = '<div class="verify-result-card expired"><div class="vrc-icon">⏰</div><div class="vrc-title">' + L('红包已过期', 'Expired') + '</div><div class="vrc-detail">' + data.r + ' · ¥' + data.a + '<br>' + L('有效期至', 'Valid until') + ' ' + data.e + '</div></div>';
    return;
  }
  resultDiv.innerHTML = '<div class="verify-result-card active"><div class="vrc-icon">✅</div><div class="vrc-title">' + L('验证通过，可核销', 'Verified, ready to use') + '</div><div class="vrc-detail"><div class="vrc-amount">¥' + data.a + '</div><div class="vrc-store">' + data.r + '</div><div class="vrc-info">' + L('满', 'Min.') + '¥' + data.m + L('可用 · 有效期至 ', ' · Valid until ') + data.e + '</div><div class="vrc-user">' + L('用户', 'User') + ': ' + data.p + ' · ' + L('确认码', 'PIN') + ': ' + data.n + '</div></div><button class="btn btn-success btn-lg" onclick="doScanVerify(\'' + data.i + '\')" style="width:100%;margin-top:12px;">✅ ' + L('确认核销', 'Confirm') + ' ¥' + data.a + '</button></div>';
}

function handleVerifyUrl(url, resultDiv) {
  try {
    var urlObj = new URL(url), dd = urlObj.searchParams.get('d');
    if (!dd) { resultDiv.innerHTML = '<div class="verify-error">❌ ' + L('链接中未包含红包数据', 'No data in link') + '</div>'; return; }
    var json = decodeURIComponent(escape(atob(decodeURIComponent(dd))));
    var data = JSON.parse(json);
    if (!data.i) { resultDiv.innerHTML = '<div class="verify-error">❌ ' + L('链接数据不完整', 'Incomplete link data') + '</div>'; return; }
    cacheRedpacketData(data);
    var usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
    if (usedCodes.indexOf(data.i) >= 0) {
      resultDiv.innerHTML = '<div class="verify-result-card used"><div class="vrc-icon">⚠️</div><div class="vrc-title">' + L('该红包已核销', 'Already used') + '</div><div class="vrc-detail">' + data.r + ' · ¥' + data.a + '</div></div>';
      return;
    }
    var expireDate = new Date(data.e);
    if (expireDate < new Date()) {
      resultDiv.innerHTML = '<div class="verify-result-card expired"><div class="vrc-icon">⏰</div><div class="vrc-title">' + L('红包已过期', 'Expired') + '</div><div class="vrc-detail">' + data.r + ' · ¥' + data.a + '<br>' + L('有效期至', 'Valid until') + ' ' + data.e + '</div></div>';
      return;
    }
    resultDiv.innerHTML = '<div class="verify-result-card active"><div class="vrc-icon">✅</div><div class="vrc-title">' + L('验证通过，可核销', 'Verified') + '</div><div class="vrc-detail"><div class="vrc-amount">¥' + data.a + '</div><div class="vrc-store">' + data.r + '</div><div class="vrc-info">' + L('满', 'Min.') + '¥' + data.m + L('可用 · 有效期至 ', ' · Valid until ') + data.e + '</div><div class="vrc-user">' + L('用户', 'User') + ': ' + data.p + ' · ' + L('确认码', 'PIN') + ': ' + data.n + '</div></div><button class="btn btn-success btn-lg" onclick="doScanVerify(\'' + data.i + '\')" style="width:100%;margin-top:12px;">✅ ' + L('确认核销', 'Confirm') + ' ¥' + data.a + '</button></div>';
  } catch(e) {
    resultDiv.innerHTML = '<div class="verify-error">❌ ' + L('链接解析失败', 'Link parse failed') + '</div>';
  }
}

function cacheRedpacketData(data) {
  var cache = JSON.parse(localStorage.getItem('s3_admin_rp_cache') || '[]');
  if (!cache.find(function(c) { return c.i === data.i; })) {
    cache.push(data);
    localStorage.setItem('s3_admin_rp_cache', JSON.stringify(cache));
  }
}

async function doScanVerify(id) {
  if (!confirm(L('确定核销此红包吗？核销后不可撤销。', 'Confirm use? This cannot be undone.'))) return;
  await useRedpacket(id, null, adminToken);
  var usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  usedCodes.push(id);
  localStorage.setItem('s3_admin_verified', JSON.stringify(usedCodes));
  document.getElementById('scanResult').innerHTML = '<div class="verify-result-card used"><div class="vrc-icon">🎉</div><div class="vrc-title" style="color:#27AE60;">' + L('核销成功！', 'Verified!') + '</div><div class="vrc-detail">' + L('结账时直接抵扣对应金额', 'Amount deducted at checkout') + '</div></div>';
  adminToast('✅ ' + L('红包已核销！', 'Verified!'), 'toast-success');
}

async function manualVerify() {
  var code = document.getElementById('manualCodeInput').value.trim();
  var resultDiv = document.getElementById('manualResult');
  if (!code) { resultDiv.innerHTML = '<div class="verify-error">⚠️ ' + L('请粘贴核销链接或输入PIN码', 'Please paste link or enter PIN') + '</div>'; return; }
  if (code.indexOf('verify.html') >= 0) { handleVerifyUrl(code, resultDiv); return; }
  try {
    var data = JSON.parse(code);
    if (data.i && data.n) { cacheRedpacketData(data); handleCachedVerify(data, resultDiv); return; }
  } catch(e) {}
  await getAllRedpackets();
  var rp = claimedRedpackets.find(function(r) { return r.id.toUpperCase() === code.toUpperCase(); });
  if (!rp) rp = claimedRedpackets.find(function(r) { return r.pin === code; });
  if (!rp) {
    resultDiv.innerHTML = '<div class="verify-error" style="padding:20px;"><div style="font-size:24px;">🔍</div><div style="font-weight:600;">' + L('未找到该红包', 'Not Found') + '</div><div style="font-size:13px;color:#888;">' + L('可能原因：1.未领取 2.输入有误<br>让顾客复制核销链接发给你', 'Possible: 1. Not claimed 2. Input error<br>Ask customer to share verify link') + '</div></div>';
    return;
  }
  var expired = new Date(rp.expireAt) < new Date();
  if (rp.used) { resultDiv.innerHTML = '<div class="verify-result-card used"><div class="vrc-icon">⚠️</div><div class="vrc-title">' + L('该红包已核销', 'Already used') + '</div><div class="vrc-detail">' + rp.restaurantName + ' · ¥' + rp.amount + '</div></div>'; return; }
  if (expired) { resultDiv.innerHTML = '<div class="verify-result-card expired"><div class="vrc-icon">⏰</div><div class="vrc-title">' + L('红包已过期', 'Expired') + '</div></div>'; return; }
  resultDiv.innerHTML = '<div class="verify-result-card active"><div class="vrc-icon">✅</div><div class="vrc-title">' + L('验证通过', 'Verified') + '</div><div class="vrc-detail"><div class="vrc-amount">¥' + rp.amount + '</div><div class="vrc-store">' + rp.restaurantName + '</div><div class="vrc-info">' + L('满', 'Min.') + '¥' + rp.minSpend + L('可用', '') + '</div><div class="vrc-user">' + L('用户', 'User') + ': ' + rp.phoneMasked + ' · PIN: ' + rp.pin + '</div></div><button class="btn btn-success btn-lg" onclick="doScanVerify(\'' + rp.id + '\')" style="width:100%;margin-top:12px;">✅ ' + L('确认核销', 'Confirm') + ' ¥' + rp.amount + '</button></div>';
}

function handleCachedVerify(data, resultDiv) {
  var usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
  if (usedCodes.indexOf(data.i) >= 0) { resultDiv.innerHTML = '<div class="verify-result-card used"><div class="vrc-icon">⚠️</div><div class="vrc-title">' + L('已核销', 'Used') + '</div></div>'; return; }
  if (new Date(data.e) < new Date()) { resultDiv.innerHTML = '<div class="verify-result-card expired"><div class="vrc-icon">⏰</div><div class="vrc-title">' + L('已过期', 'Expired') + '</div></div>'; return; }
  resultDiv.innerHTML = '<div class="verify-result-card active"><div class="vrc-icon">✅</div><div class="vrc-title">' + L('可核销', 'Ready') + '</div><div class="vrc-detail"><div class="vrc-amount">¥' + data.a + '</div><div class="vrc-store">' + data.r + '</div></div><button class="btn btn-success btn-lg" onclick="doScanVerify(\'' + data.i + '\')" style="width:100%;margin-top:12px;">✅ ' + L('确认核销', 'Confirm') + '</button></div>';
}

// ===== 5. 红包记录 =====
async function renderRecords(main) {
  await getAllRedpackets();
  var tP = claimedRedpackets;
  main.innerHTML =
    '<div class="main-header"><h1>📋 ' + L('红包记录', 'Red Packet Records') + '</h1><p>' + L('查看所有红包明细', 'All red packet details') + ' · ' + L('共', 'Total') + ' ' + tP.length + ' ' + L('条', '') + '</p></div>' +
    '<div class="content-card"><div class="card-body" style="overflow-x:auto;">' +
      (tP.length === 0 ? '<p style="text-align:center;color:#AAA;padding:40px;">' + L('暂无红包记录', 'No records yet') + '</p>' :
      '<table class="data-table"><thead><tr><th>PIN</th><th>' + L('用户', 'User') + '</th><th>' + L('餐厅', 'Restaurant') + '</th><th>' + L('面额', 'Amount') + '</th><th>' + L('领取时间', 'Claimed At') + '</th><th>' + L('有效期', 'Expires') + '</th><th>' + L('状态', 'Status') + '</th><th>' + L('操作', 'Action') + '</th></tr></thead>' +
      '<tbody>' + tP.sort(function(a,b){return new Date(b.claimedAt)-new Date(a.claimedAt);}).map(function(rp) {
        var expired = new Date(rp.expireAt) < new Date();
        var status = rp.used ? 'used' : (expired ? 'expired' : 'active');
        var statusText = rp.used ? L('已核销', 'Used') : (expired ? L('已过期', 'Expired') : L('可使用', 'Active'));
        return '<tr><td style="font-weight:700;">' + rp.pin + '</td><td>' + rp.phoneMasked + '</td><td>' + rp.restaurantName + '</td><td style="color:#E74C3C;">¥' + rp.amount + '</td><td>' + new Date(rp.claimedAt).toLocaleString('zh-CN') + '</td><td>' + new Date(rp.expireAt).toLocaleDateString('zh-CN') + '</td><td><span class="status-badge status-' + status + '">' + statusText + '</span></td><td>' + (!rp.used && !expired ? '<button class="btn btn-success btn-sm" onclick="markAsUsed(\'' + rp.id + '\')">' + L('核销', 'Use') + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>') +
    '</div></div>';
}

async function markAsUsed(id) {
  if (confirm(L('确定核销此红包吗？', 'Confirm?'))) {
    await useRedpacket(id, null, adminToken);
    var usedCodes = JSON.parse(localStorage.getItem('s3_admin_verified') || '[]');
    if (usedCodes.indexOf(id) < 0) usedCodes.push(id);
    localStorage.setItem('s3_admin_verified', JSON.stringify(usedCodes));
    adminToast('✅ ' + L('已核销', 'Verified'), 'toast-success');
    renderRecords(document.getElementById('mainContent'));
  }
}

// ===== 6. 活动二维码 =====
function renderQRCode(main) {
  var currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  main.innerHTML =
    '<div class="main-header"><h1>📱 ' + L('活动二维码', 'Campaign QR Code') + '</h1><p>' + L('顾客扫码进入活动页面', 'Customers scan to enter') + '</p></div>' +
    '<div class="content-card"><div class="card-body"><div class="qr-display">' +
      '<div class="qr-code" id="qrContainer"><span style="font-size:14px;color:#AAA;">' + L('生成中...', 'Generating...') + '</span></div>' +
      '<h4 style="margin-bottom:8px;">' + L('扫一扫，查看三店信息 · 领红包', 'Scan to view restaurants & claim red packets') + '</h4>' +
      '<div class="qr-tip">' + L('打印张贴在店内，微信和大众点评扫码均可打开。', 'Print and post in stores. Works with WeChat and Dianping.') + '</div>' +
      '<div class="qr-url">' + L('活动链接', 'Campaign URL') + '：<span id="qrUrl">' + currentUrl + '</span></div>' +
      '<div style="margin-top:16px;"><button class="btn btn-primary" onclick="copyQRUrl()">📋 ' + L('复制链接', 'Copy Link') + '</button> <button class="btn btn-outline" onclick="downloadQR()" style="margin-left:8px;">💾 ' + L('下载二维码', 'Download QR') + '</button></div>' +
    '</div></div></div>';
  setTimeout(generateQR, 100);
}

function generateQR() {
  var container = document.getElementById('qrContainer');
  var currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(currentUrl);
  container.innerHTML = '<img src="' + qrUrl + '" alt="QR Code" style="width:200px;height:200px;border-radius:8px;">';
}

function copyQRUrl() {
  var currentUrl = window.location.origin + window.location.pathname.replace('admin.html', 'index.html');
  navigator.clipboard.writeText(currentUrl).then(function() {
    adminToast('✅ ' + L('链接已复制', 'Link copied'), 'toast-success');
  }).catch(function() { adminToast(L('复制失败，请手动复制', 'Copy failed'), 'toast-error'); });
}

function downloadQR() {
  var img = document.querySelector('#qrContainer img');
  if (img) {
    var link = document.createElement('a');
    link.download = 'three-restaurant-qr.png';
    link.href = img.src; link.click();
  }
}

// ===== 7. 操作日志 =====
async function renderLogs(main) {
  var res = await adminGetLogs(200);
  var logData = res.success ? res.data : [];
  var total = res.total || logData.length;

  main.innerHTML =
    '<div class="main-header"><h1>📜 ' + L('操作日志', 'Operation Logs') + '</h1><p>' + L('记录所有后台操作', 'All backend operations') + ' · ' + L('共', 'Total') + ' ' + total + ' ' + L('条', '') + '</p></div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">' +
      '<button class="btn btn-outline btn-sm" onclick="refreshLogs()">🔄 ' + L('刷新', 'Refresh') + '</button>' +
      '<button class="btn btn-outline btn-sm" style="color:#E74C3C;" onclick="doClearLogs()">🗑️ ' + L('清除日志', 'Clear Logs') + '</button>' +
      '<span style="font-size:12px;color:#888;margin-left:auto;">' + L('保留最近1000条', 'Keeps latest 1000') + '</span>' +
    '</div>' +
    '<div class="content-card"><div class="card-body" style="overflow-x:auto;">' +
      (logData.length === 0 ? '<p style="text-align:center;color:#AAA;padding:40px;">' + L('暂无操作日志', 'No logs yet') + '</p>' :
      '<table class="data-table"><thead><tr><th>' + L('时间', 'Time') + '</th><th>' + L('操作', 'Action') + '</th><th>' + L('详情', 'Details') + '</th><th>' + L('操作人', 'Admin') + '</th></tr></thead><tbody>' +
      logData.map(function(log) {
        return '<tr><td>' + new Date(log.timestamp).toLocaleString('zh-CN') + '</td><td><span class="log-action">' + escHtml(log.action) + '</span></td><td style="max-width:300px;word-break:break-all;">' + escHtml(log.details || '') + '</td><td>' + escHtml(log.admin || '') + '</td></tr>';
      }).join('') + '</tbody></table>') +
    '</div></div>';
}

async function refreshLogs() {
  renderLogs(document.getElementById('mainContent'));
}

async function doClearLogs() {
  if (!confirm(L('⚠️ 确定清除所有操作日志吗？此操作不可撤销。', '⚠️ Clear all logs? This cannot be undone.'))) return;
  var res = await adminClearLogs();
  if (res.success) {
    adminToast('✅ ' + (res.messageZh || L('日志已清除', 'Logs cleared')), 'toast-success');
    refreshLogs();
  } else {
    adminToast('❌ ' + (res.messageZh || res.message), 'toast-error');
  }
}

// ===== 工具函数 =====
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== 清除所有数据 =====
async function clearAllDataAdmin() {
  var msg1 = L('⚠️ 确定要清除所有历史数据吗？\n\n这将删除：\n· 所有红包领取记录\n· 扫码统计\n· 核销记录\n· 本地缓存\n· 操作日志\n\n餐厅信息和红包设置不会受影响。\n\n此操作不可撤销！',
    '⚠️ Clear all data?\n\nThis will delete:\n· All red packet records\n· Scan stats\n· Verification records\n· Local cache\n· Operation logs\n\nRestaurant info and settings will NOT be affected.\n\nThis cannot be undone!');
  if (!confirm(msg1)) return;
  if (!confirm(L('再次确认：真的要清除所有数据吗？', 'Confirm again: really clear all data?'))) return;

  await clearAllData(adminToken);
  localStorage.removeItem('s3_admin_verified');
  localStorage.removeItem('s3_admin_rp_cache');
  localStorage.removeItem('s3_restaurants');
  localStorage.removeItem('s3_redpacket_config');
  await adminClearLogs();
  adminToast('✅ ' + L('所有历史数据已清除', 'All data cleared'), 'toast-success');
  setTimeout(function() { switchTab(currentTab); }, 500);
}

// ===== 旧版兼容：初始化加载本地保存的数据 =====
(function() {
  // 如果 localStorage 有保存的数据（旧版兼容），不覆盖服务端数据
  // 数据现在以服务端为准
})();
