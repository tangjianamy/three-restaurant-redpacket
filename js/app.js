// ==================== 三店联动 · 前端交互逻辑 v3.0 ====================
// 中英双语支持 · 无需微信公众号
// 核销方式：到店出示二维码 → 店员扫码核销

let currentRestaurantId = null;
let currentUserId = null;

// 语言切换监听 + Hero 更新
document.addEventListener('langChange', function(e) {
  updateHeroLang(e.detail);
  // 刷新当前内容
  if (document.getElementById('detailPage').classList.contains('active')) {
    var r = RESTAURANTS.find(function(x) { return x.id === currentRestaurantId; });
    if (r) { refreshDetailTexts(r); }
  }
  renderCardList();
  updateLangBtns(e.detail);
});

function updateLangBtns(lang) {
  var btnZh = document.getElementById('langBtnZh');
  var btnEn = document.getElementById('langBtnEn');
  if (!btnZh || !btnEn) return;
  if (lang === 'zh') {
    btnZh.style.background = 'rgba(255,255,255,0.35)';
    btnZh.style.fontWeight = '700';
    btnEn.style.background = 'rgba(255,255,255,0.15)';
    btnEn.style.fontWeight = 'normal';
  } else {
    btnEn.style.background = 'rgba(255,255,255,0.35)';
    btnEn.style.fontWeight = '700';
    btnZh.style.background = 'rgba(255,255,255,0.15)';
    btnZh.style.fontWeight = 'normal';
  }
}

function updateHeroLang(lang) {
  var heroTag = document.getElementById('heroTag');
  var heroTitle = document.getElementById('heroTitle');
  var heroSub = document.getElementById('heroSub');
  if (heroTag) heroTag.textContent = lang === 'en' ? 'Hengqin Food Alliance' : '横琴美食联盟';
  if (heroTitle) heroTitle.textContent = lang === 'en' ? '3-Restaurant Red Packet Event' : '三店联动';
  if (heroSub) heroSub.textContent = lang === 'en' ? 'Claim a red packet at each restaurant!' : '每家店都有专属红包，逛哪家领哪家';
}

// 数据库数据加载完成后的回调 — 重新渲染卡片
window._onDataReady = function() {
  try { renderCardList(); } catch(e) {}
};

// 页面加载
document.addEventListener('DOMContentLoaded', async function() {
  try {
    recordScan().catch(function(){});
    var phone = null;
    try { phone = localStorage.getItem('s3_user_phone'); } catch(e) {}
    if (phone) { currentUserId = phone; try { await updateUserUI(); } catch(e) {} }
    try { renderCardList(); } catch(e) {}
    updateLangBtns(currentLang);
    updateHeroLang(currentLang);
  } catch(e) {
    console.error('Init error:', e);
    try { renderCardList(); } catch(e2) {
      var c = document.getElementById('cardList');
      if (c) c.innerHTML = '<div style="text-align:center;padding:40px;"><p style="font-size:16px;color:#C0392B;">⚠️ Page load error</p><p style="font-size:13px;color:#888;">Please refresh</p></div>';
    }
  }
});

// ===== Toast =====
function showToast(msg, duration) {
  duration = duration || 2000;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(function() { t.style.display = 'none'; }, duration);
}

// ===== 更新用户UI =====
async function updateUserUI() {
  if (!currentUserId) return;
  document.getElementById('myRedpacketsBtn').classList.add('visible');
  var all = await getMyRedpackets(currentUserId);
  document.getElementById('myRedpacketsBtn').querySelector('.count').textContent = all.length;
}

// ===== 渲染餐厅列表 =====
function renderCardList() {
  var container = document.getElementById('cardList');
  container.innerHTML = RESTAURANTS.map(function(r) {
    return '<div class="restaurant-card" onclick="openDetail(' + r.id + ')">' +
      '<div class="card-header">' +
        (r.cover ? '<div class="card-cover" style="background-image:url(\'' + r.cover + '\')"></div>' : '') +
        '<div class="card-logo" style="background:' + r.colorLight + ';">' + r.logo + '</div>' +
        '<div class="card-info">' +
          '<div class="card-name">' + L(r.name, r.nameEn) + '</div>' +
          '<div class="card-subtitle">' + L(r.subtitle, r.subtitleEn) + '</div>' +
          '<span class="card-category" style="background:' + r.colorLight + ';color:' + r.color + ';">' + L(r.category, r.categoryEn) + '</span>' +
        '</div>' +
        '<div class="card-dp" style="color:' + r.color + ';font-size:12px;">⭐' + r.dianping.rating + ' ' + L(r.dianping.avgPrice, r.dianping.avgPriceEn) + '</div>' +
        '<div class="card-arrow">›</div>' +
      '</div>' +
      '<div class="card-footer">' +
        '<div class="card-footer-item">📍 ' + L(r.info.address, r.info.addressEn).slice(0, 15) + '...</div>' +
        '<div class="card-footer-item">🕐 ' + L(r.info.hours, r.info.hoursEn).slice(0, 12) + '...</div>' +
        '<div class="card-footer-item">🧧 ¥' + r.redpacket.amount + ' ' + L('红包', 'Red Packet') + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  document.getElementById('loadingHint').style.display = 'none';
}

// ===== 打开详情页 =====
function openDetail(id) {
  var r = RESTAURANTS.find(function(x) { return x.id === id; });
  if (!r) return;
  currentRestaurantId = id;

  var page = document.getElementById('detailPage');
  page.style.setProperty('--accent', r.color);
  document.getElementById('detailName').textContent = L(r.name, r.nameEn);
  document.getElementById('detailSubtitle').textContent = L(r.subtitle, r.subtitleEn) + ' · ' + L(r.category, r.categoryEn);
  document.getElementById('detailDianping').textContent =
    '⭐' + r.dianping.rating + '  |  ' + L(r.dianping.avgPrice, r.dianping.avgPriceEn) + '  |  ' + L(r.dianping.rank, r.dianping.rankEn);

  var hero = document.getElementById('detailHero');
  hero.style.background = r.cover
    ? 'linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.7)), url(\'' + r.cover + '\') center/cover no-repeat'
    : 'linear-gradient(135deg, ' + r.color + ' 0%, ' + r.color + '88 100%)';

  document.getElementById('detailInfo').innerHTML =
    '<div class="info-item">📍 <span>' + L(r.info.address, r.info.addressEn) + '</span></div>' +
    '<div class="info-item">📞 <span><a href="tel:' + r.info.phone + '" style="color:' + r.color + ';">' + r.info.phone + '</a>' + (r.info.phone2 ? ' / ' + r.info.phone2 : '') + '</span></div>' +
    '<div class="info-item">🕐 <span>' + L(r.info.hours, r.info.hoursEn) + '</span></div>' +
    '<div class="info-item">🏷️ <span>' + L(r.category, r.categoryEn) + ' · ' + L(r.dianping.avgPrice, r.dianping.avgPriceEn) + '</span></div>';

  document.getElementById('detailDesc').textContent = L(r.description, r.descriptionEn);
  document.getElementById('detailHighlight').textContent = L(r.highlight, r.highlightEn);

  // 环境图集
  var gallery = document.getElementById('detailGallery');
  if (gallery) {
    if (r.gallery && r.gallery.length > 0) {
      gallery.innerHTML =
        '<div class="section-title section-accent" style="--accent:' + r.color + '">' + L('店铺环境', 'Gallery') + '</div>' +
        '<div class="gallery-row">' + r.gallery.map(function(src) { return '<img src="' + src + '" alt="' + L('店铺环境', 'Gallery') + '" loading="lazy">'; }).join('') + '</div>';
    } else { gallery.innerHTML = ''; }
  }

  document.getElementById('detailDishes').innerHTML = r.dishes.map(function(d) {
    return '<div class="dish-card">' +
      (d.img ? '<div class="dish-img" style="background-image:url(\'' + d.img + '\')"></div>' : '<div class="dish-emoji">' + d.emoji + '</div>') +
      '<div class="dish-name">' + L(d.name, d.nameEn) + '</div>' +
      '<div class="dish-desc">' + L(d.desc, d.descEn) + '</div>' +
      '<div class="dish-price">¥' + d.price + '</div>' +
    '</div>';
  }).join('');

  document.getElementById('detailCombos').innerHTML = r.combos.map(function(c) {
    return '<div class="combo-card">' +
      '<div class="combo-tag">' + L(c.tag, c.tagEn) + '</div>' +
      '<div class="combo-name">' + L(c.name, c.nameEn) + '</div>' +
      '<div class="combo-content">' + L(c.content, c.contentEn) + '</div>' +
      '<div class="combo-price-row">' +
        '<span class="combo-price">¥' + c.price + '</span>' +
        '<span class="combo-original">¥' + c.originalPrice + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  document.getElementById('mapPlaceholder').style.background =
    'linear-gradient(135deg, ' + r.color + '33 0%, ' + r.color + '11 100%)';

  var nav = getNavUrl(r);
  document.getElementById('navButtons').innerHTML =
    '<a class="nav-btn nav-btn-amap" href="' + nav.amap + '" target="_blank">🗺️ ' + L('高德导航', 'Amap Nav') + '</a>' +
    '<a class="nav-btn nav-btn-bmap" href="' + nav.bmap + '" target="_blank">📍 ' + L('百度导航', 'Baidu Nav') + '</a>';

  updateDetailRedpacketBar(r);

  page.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(function() { page.scrollTop = 0; }, 50);
}

// ===== 刷新详情页文本（语言切换时） =====
function refreshDetailTexts(r) {
  if (!r) return;
  document.getElementById('detailName').textContent = L(r.name, r.nameEn);
  document.getElementById('detailSubtitle').textContent = L(r.subtitle, r.subtitleEn) + ' · ' + L(r.category, r.categoryEn);
  document.getElementById('detailDianping').textContent = '⭐' + r.dianping.rating + '  |  ' + L(r.dianping.avgPrice, r.dianping.avgPriceEn) + '  |  ' + L(r.dianping.rank, r.dianping.rankEn);
  document.getElementById('detailDesc').textContent = L(r.description, r.descriptionEn);
  document.getElementById('detailHighlight').textContent = L(r.highlight, r.highlightEn);
  document.getElementById('detailInfo').innerHTML =
    '<div class="info-item">📍 <span>' + L(r.info.address, r.info.addressEn) + '</span></div>' +
    '<div class="info-item">📞 <span><a href="tel:' + r.info.phone + '" style="color:' + r.color + ';">' + r.info.phone + '</a>' + (r.info.phone2 ? ' / ' + r.info.phone2 : '') + '</span></div>' +
    '<div class="info-item">🕐 <span>' + L(r.info.hours, r.info.hoursEn) + '</span></div>' +
    '<div class="info-item">🏷️ <span>' + L(r.category, r.categoryEn) + ' · ' + L(r.dianping.avgPrice, r.dianping.avgPriceEn) + '</span></div>';
}

// ===== 底部红包栏 =====
async function updateDetailRedpacketBar(r) {
  var bar = document.getElementById('detailRedpacketBar');
  var info = document.getElementById('detailRedpacketInfo');
  if (currentUserId) {
    var existing = await getRedpacketForRestaurant(currentUserId, r.id);
    if (existing) {
      if (existing.used) {
        info.innerHTML = '✅ ' + L('已核销使用', 'Used');
        bar.style.background = '#27AE60';
        bar.onclick = function() { showMyRedpackets(); };
      } else {
        info.innerHTML = '🎫 ' + L('已领取', 'Claimed') + ' ¥' + r.redpacket.amount + ' ' + L('红包', '') + '<br><small>PIN: ' + existing.pin + ' · ' + L('到店出示二维码核销', 'Show QR code to verify') + '</small>';
        bar.style.background = 'linear-gradient(135deg, ' + r.color + ', ' + r.color + 'cc)';
        bar.onclick = function() { showMyRedpackets(); };
      }
    } else {
      info.innerHTML = '🧧 ' + L('领取本店', 'Claim') + ' ¥' + r.redpacket.amount + ' ' + L('消费红包', 'Red Packet') + '<br><small>' + L(r.redpacket.desc, r.redpacket.descEn) + '</small>';
      bar.style.background = 'linear-gradient(135deg, #FF4D4F, #FF7875)';
      bar.onclick = function() { showClaimModal(r); };
    }
  } else {
    info.innerHTML = '🧧 ' + L('领取本店', 'Claim') + ' ¥' + r.redpacket.amount + ' ' + L('消费红包', 'Red Packet') + '<br><small>' + L(r.redpacket.desc, r.redpacket.descEn) + '</small>';
    bar.style.background = 'linear-gradient(135deg, #FF4D4F, #FF7875)';
    bar.onclick = function() { showClaimModal(r); };
  }
  bar.classList.add('visible');
}

// ===== 红包领取弹窗 =====
function showClaimModal(r) {
  document.getElementById('claimModal').classList.add('active');
  document.getElementById('claimRestaurantName').textContent = L(r.name, r.nameEn);
  document.getElementById('claimAmount').textContent = '¥' + r.redpacket.amount;
  document.getElementById('claimDesc').textContent = L(r.redpacket.desc, r.redpacket.descEn);
  var wechatHint = document.getElementById('wechatHint');
  if (wechatHint) wechatHint.style.display = 'none';
  var phoneGroup = document.getElementById('phoneGroup');
  if (phoneGroup) phoneGroup.style.display = 'block';
  document.getElementById('claimBtn').textContent = L('立即领取', 'Claim Now');
  document.getElementById('claimBtn').onclick = doClaim;
  document.getElementById('phoneInput').value = currentUserId || '';
  document.getElementById('claimForm').style.display = 'block';
  document.getElementById('claimSuccess').classList.remove('active');
  document.querySelector('#claimModal .modal-footer').style.display = 'block';
  document.body.style.overflow = 'hidden';
}

async function doClaim() {
  var phone = document.getElementById('phoneInput').value.trim();
  if (!phone) { showToast(L('请输入手机号码', 'Please enter phone number')); return; }
  if (!/^1[3-9]\d{9}$/.test(phone)) { showToast(L('请输入正确的手机号码', 'Invalid phone number')); return; }
  if (!currentRestaurantId) { showToast(L('请先选择餐厅', 'Please select a restaurant')); return; }

  localStorage.setItem('s3_user_phone', phone);
  currentUserId = phone;

  var r = RESTAURANTS.find(function(x) { return x.id === currentRestaurantId; });
  var result = await claimRedpacket(phone, currentRestaurantId);

  if (!result.success) {
    showToast(result.messageZh || result.message);
    var existing = await getRedpacketForRestaurant(phone, currentRestaurantId);
    if (existing && r) { await updateDetailRedpacketBar(r); closeClaimModal(); }
    return;
  }

  var rp = result.redpacket;
  document.getElementById('claimForm').style.display = 'none';
  document.getElementById('claimSuccess').classList.add('active');
  document.querySelector('#claimModal .modal-footer').style.display = 'none';

  document.getElementById('rpPIN').textContent = rp.pin;
  var qrImg = document.getElementById('rpQRImg');
  renderRedpacketQRImg(rp, qrImg);
  document.getElementById('rpCode').textContent = L('到店出示二维码核销', 'Show QR code to staff to verify');
  document.getElementById('rpExpire').textContent = (currentLang === 'en' ? 'Valid until: ' : '有效期至：') + new Date(rp.expireAt).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'zh-CN');
  document.getElementById('rpStore').textContent = L(rp.restaurantName, (RESTAURANTS.find(function(x) { return x.id === currentRestaurantId; }) || {}).nameEn || '');
  document.getElementById('rpCode').style.background = 'transparent';
  document.getElementById('rpCode').style.fontSize = '14px';
  document.getElementById('rpCode').style.color = '#888';
  await updateUserUI();
}

function closeClaimModal() {
  document.getElementById('claimModal').classList.remove('active');
  document.body.style.overflow = '';
  if (currentRestaurantId) {
    var r = RESTAURANTS.find(function(x) { return x.id === currentRestaurantId; });
    if (r) updateDetailRedpacketBar(r);
  }
}

// ===== 我的红包页面 =====
async function showMyRedpackets() {
  if (!currentUserId) { showToast(L('请先领取红包', 'Please claim a red packet first')); return; }
  closeDetail(); closeClaimModal();

  var page = document.getElementById('myRedpacketsPage');
  var list = document.getElementById('myRpList');
  var all = await getMyRedpackets(currentUserId);
  var sorted = [].concat(all).sort(function(a, b) { return new Date(b.claimedAt) - new Date(a.claimedAt); });

  if (sorted.length === 0) {
    list.innerHTML = '<div class="empty-state"><div style="font-size:56px;">🎫</div><div style="font-size:16px;color:#888;margin:12px 0;">' + L('暂无红包', 'No red packets') + '</div><div style="font-size:13px;color:#AAA;">' + L('浏览餐厅即可领取专属红包', 'Browse restaurants to claim red packets') + '</div></div>';
  } else {
    list.innerHTML = sorted.map(function(rp) {
      var r = RESTAURANTS.find(function(x) { return x.id === rp.restaurantId; });
      var expired = new Date(rp.expireAt) < new Date();
      var statusClass, statusText;
      if (rp.used) { statusClass = 'used'; statusText = L('已核销', 'Used'); }
      else if (expired) { statusClass = 'expired'; statusText = L('已过期', 'Expired'); }
      else { statusClass = 'active'; statusText = L('可使用', 'Active'); }

      var qrUrl = getRedpacketQRUrl(rp);
      return '<div class="myrp-card' + (rp.used ? ' used' : '') + (expired && !rp.used ? ' expired' : '') + '">' +
        '<div class="myrp-left" style="border-left-color:' + (r ? r.color : '#CCC') + ';">' +
          '<div class="myrp-store">' + L(rp.restaurantName, r ? r.nameEn : '') + '</div>' +
          '<div class="myrp-amount">¥' + rp.amount + '</div>' +
          '<div class="myrp-rule">' + L('满', 'Min.') + '¥' + rp.minSpend + L('可用', '') + '</div>' +
          '<div class="myrp-status ' + statusClass + '">' + statusText + '</div>' +
        '</div>' +
        '<div class="myrp-right">' +
          (rp.used ?
            '<div style="text-align:center;padding:10px;"><div style="font-size:28px;">✅</div><div style="font-size:12px;color:#888;">' + L('已核销', 'Used') + '</div></div>' :
          (expired ?
            '<div style="text-align:center;padding:10px;"><div style="font-size:28px;">⏰</div><div style="font-size:12px;color:#888;">' + L('已过期', 'Expired') + '</div></div>' :
            '<div class="myrp-qr-wrap"><img src="' + qrUrl + '" alt="' + L('核销二维码', 'Verify QR') + '" class="myrp-qr-img" onerror="this.parentElement.innerHTML=\'<div class=myrp-qr-fallback>📱<br><small>' + L('二维码加载中', 'Loading QR...') + '</small></div>\'"></div>' +
            '<div class="myrp-pin-row"><span class="myrp-pin-label">' + L('确认码', 'PIN') + '</span><span class="myrp-pin-num">' + rp.pin + '</span></div>' +
            '<div class="myrp-date">' + new Date(rp.expireAt).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'zh-CN') + L('前有效', '') + '</div>' +
            '<button class="myrp-share-btn" onclick="event.stopPropagation(); copyVerifyLink(\'' + rp.id + '\')">📋 ' + L('复制核销链接', 'Copy Verify Link') + '</button>'
          )) +
        '</div></div>';
    }).join('');

    list.innerHTML += '<div class="usage-guide"><div class="usage-title">💡 ' + L('如何使用红包？', 'How to use?') + '</div>' +
      '<div class="usage-steps">' +
        '<div class="usage-step"><div class="step-num">1</div><div>' + L('到店消费时，向店员出示上方的<b>二维码</b>', 'Show the <b>QR code</b> above to staff') + '</div></div>' +
        '<div class="usage-step"><div class="step-num">2</div><div>' + L('店员扫码后确认红包信息��点击核销', 'Staff scans and confirms, then verifies') + '</div></div>' +
        '<div class="usage-step"><div class="step-num">3</div><div>' + L('结账时直接抵扣红包金额', 'Amount deducted at checkout') + '</div></div>' +
      '</div></div>';
  }
  page.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMyRedpackets() {
  document.getElementById('myRedpacketsPage').classList.remove('active');
  document.body.style.overflow = '';
}

function closeDetail() {
  document.getElementById('detailPage').classList.remove('active');
  document.getElementById('detailRedpacketBar').classList.remove('visible');
  document.body.style.overflow = '';
  currentRestaurantId = null;
}

function copyVerifyLink(rpId) {
  var rp = claimedRedpackets.find(function(r) { return r.id === rpId; });
  if (!rp) { showToast(L('红包信息未找到', 'Red packet not found')); return; }
  var url = getVerifyShareUrl(rp);
  var text = '[' + rp.restaurantName + '] ' + L('红包', 'Red Packet') + ' ¥' + rp.amount + '\n' + L('确认码', 'PIN') + '：' + rp.pin + '\n' + L('核销链接', 'Verify Link') + '：' + url + '\n' + L('有效期至', 'Valid until') + '：' + new Date(rp.expireAt).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'zh-CN');
  navigator.clipboard.writeText(text).then(function() {
    showToast('✅ ' + L('核销链接已复制，可发送给店员', 'Verify link copied, send to staff'));
  }).catch(function() {
    prompt(L('请手动复制以下核销链接发给店��：', 'Please copy this link manually:'), url);
  });
}

// 弹窗遮罩关闭
document.getElementById('claimModal').addEventListener('click', function(e) {
  if (e.target === this) closeClaimModal();
});
