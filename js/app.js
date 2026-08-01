// ==================== 三店联动 · 前端交互逻辑 ====================
// 无需微信公众号，填手机号即可领取红包
// 核销方式：到店出示二维码 → 店员扫码核销

let currentRestaurantId = null;
let currentUserId = null;

// 页面加载
document.addEventListener('DOMContentLoaded', async () => {
  try {
    recordScan();  // 异步但无需等待

    // 恢复用户身份
    let phone = null;
    try { phone = localStorage.getItem('s3_user_phone'); } catch(e) {}
    if (phone) {
      currentUserId = phone;
      await updateUserUI();
    }

    renderCardList();
  } catch(e) {
    console.error('页面初始化失败:', e);
    try { renderCardList(); } catch(e2) {
      const container = document.getElementById('cardList');
      if (container) {
        container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#C0392B;"><p style="font-size:16px;font-weight:700;margin-bottom:8px;">⚠️ 页面加载异常</p><p style="font-size:13px;color:#888;">请长按页面刷新重试</p></div>';
      }
    }
  }
});

// ===== Toast =====
function showToast(msg, duration = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, duration);
}

// ===== 更新用户UI =====
async function updateUserUI() {
  if (!currentUserId) return;
  document.getElementById('myRedpacketsBtn').classList.add('visible');
  const all = await getMyRedpackets(currentUserId);
  document.getElementById('myRedpacketsBtn').querySelector('.count').textContent = all.length;
}

// ===== 渲染餐厅列表 =====
function renderCardList() {
  const container = document.getElementById('cardList');
  container.innerHTML = RESTAURANTS.map(r => `
    <div class="restaurant-card" onclick="openDetail(${r.id})">
      <div class="card-header">
        ${r.cover ? `<div class="card-cover" style="background-image:url('${r.cover}')"></div>` : ''}
        <div class="card-logo" style="background:${r.colorLight};">${r.logo}</div>
        <div class="card-info">
          <div class="card-name">${r.name}</div>
          <div class="card-subtitle">${r.subtitle}</div>
          <span class="card-category" style="background:${r.colorLight};color:${r.color};">
            ${r.category}
          </span>
        </div>
        <div class="card-dp" style="color:${r.color};font-size:12px;">
          ⭐${r.dianping.rating} ${r.dianping.avgPrice}
        </div>
        <div class="card-arrow">›</div>
      </div>
      <div class="card-footer">
        <div class="card-footer-item">📍 ${r.info.address.slice(0, 15)}...</div>
        <div class="card-footer-item">🕐 ${r.info.hours.slice(0, 12)}...</div>
        <div class="card-footer-item">🧧 ¥${r.redpacket.amount}红包</div>
      </div>
    </div>
  `).join('');
}

// ===== 打开详情页 =====
function openDetail(id) {
  const r = RESTAURANTS.find(x => x.id === id);
  if (!r) return;
  currentRestaurantId = id;

  const page = document.getElementById('detailPage');
  page.style.setProperty('--accent', r.color);
  document.getElementById('detailName').textContent = r.name;
  document.getElementById('detailSubtitle').textContent = r.subtitle + ' · ' + r.category;
  document.getElementById('detailDianping').textContent =
    `⭐${r.dianping.rating}  |  ${r.dianping.avgPrice}  |  ${r.dianping.rank}`;

  const hero = document.getElementById('detailHero');
  hero.style.background = r.cover
    ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.7)), url('${r.cover}') center/cover no-repeat`
    : `linear-gradient(135deg, ${r.color} 0%, ${r.color}88 100%)`;

  document.getElementById('detailInfo').innerHTML = `
    <div class="info-item">📍 <span>${r.info.address}</span></div>
    <div class="info-item">
      📞 <span><a href="tel:${r.info.phone}" style="color:${r.color};">${r.info.phone}</a>${r.info.phone2 ? ' / ' + r.info.phone2 : ''}</span>
    </div>
    <div class="info-item">🕐 <span>${r.info.hours}</span></div>
    <div class="info-item">🏷️ <span>${r.category} · ${r.dianping.avgPrice}</span></div>
  `;

  document.getElementById('detailDesc').textContent = r.description;
  document.getElementById('detailHighlight').textContent = r.highlight;

  // 环境图集
  const gallery = document.getElementById('detailGallery');
  if (gallery) {
    if (r.gallery && r.gallery.length > 0) {
      gallery.innerHTML = `
        <div class="section-title section-accent" style="--accent:${r.color}">店铺环境</div>
        <div class="gallery-row">
          ${r.gallery.map(src => `<img src="${src}" alt="店铺环境" loading="lazy">`).join('')}
        </div>
      `;
    } else {
      gallery.innerHTML = '';
    }
  }

  document.getElementById('detailDishes').innerHTML = r.dishes.map(d => `
    <div class="dish-card">
      ${d.img ? `<div class="dish-img" style="background-image:url('${d.img}')"></div>` : `<div class="dish-emoji">${d.emoji}</div>`}
      <div class="dish-name">${d.name}</div>
      <div class="dish-desc">${d.desc}</div>
      <div class="dish-price">¥${d.price}</div>
    </div>
  `).join('');

  document.getElementById('detailCombos').innerHTML = r.combos.map(c => `
    <div class="combo-card">
      <div class="combo-tag">${c.tag}</div>
      <div class="combo-name">${c.name}</div>
      <div class="combo-content">${c.content}</div>
      <div class="combo-price-row">
        <span class="combo-price">¥${c.price}</span>
        <span class="combo-original">¥${c.originalPrice}</span>
      </div>
    </div>
  `).join('');

  document.getElementById('mapPlaceholder').style.background =
    `linear-gradient(135deg, ${r.color}33 0%, ${r.color}11 100%)`;

  const nav = getNavUrl(r);
  document.getElementById('navButtons').innerHTML = `
    <a class="nav-btn nav-btn-amap" href="${nav.amap}" target="_blank">🗺️ 高德导航</a>
    <a class="nav-btn nav-btn-bmap" href="${nav.bmap}" target="_blank">📍 百度导航</a>
  `;

  updateDetailRedpacketBar(r);

  page.classList.add('active');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { page.scrollTop = 0; }, 50);
}

// ===== 底部红包栏 =====
async function updateDetailRedpacketBar(r) {
  const bar = document.getElementById('detailRedpacketBar');
  const info = document.getElementById('detailRedpacketInfo');

  if (currentUserId) {
    const existing = await getRedpacketForRestaurant(currentUserId, r.id);
    if (existing) {
      if (existing.used) {
        info.innerHTML = '✅ 已核销使用';
        bar.style.background = '#27AE60';
        bar.onclick = () => showMyRedpackets();
      } else {
        info.innerHTML = `🎫 已领取 ¥${r.redpacket.amount} 红包<br><small>PIN: ${existing.pin} · 到店出示二维码核销</small>`;
        bar.style.background = `linear-gradient(135deg, ${r.color}, ${r.color}cc)`;
        bar.onclick = () => showMyRedpackets();
      }
    } else {
      info.innerHTML = `🧧 领取本店 ¥${r.redpacket.amount} 消费红包<br><small>${r.redpacket.desc}</small>`;
      bar.style.background = `linear-gradient(135deg, #FF4D4F, #FF7875)`;
      bar.onclick = () => showClaimModal(r);
    }
  } else {
    info.innerHTML = `🧧 领取本店 ¥${r.redpacket.amount} 消费红包<br><small>${r.redpacket.desc}</small>`;
    bar.style.background = `linear-gradient(135deg, #FF4D4F, #FF7875)`;
    bar.onclick = () => showClaimModal(r);
  }

  bar.classList.add('visible');
}

// ===== 红包领取弹窗（纯手机号，无需微信） =====
function showClaimModal(r) {
  document.getElementById('claimModal').classList.add('active');
  document.getElementById('claimRestaurantName').textContent = r.name;
  document.getElementById('claimAmount').textContent = '¥' + r.redpacket.amount;
  document.getElementById('claimDesc').textContent = r.redpacket.desc;

  // 隐藏微信相关提示（如果存在），只显示手机号输入
  const wechatHint = document.getElementById('wechatHint');
  if (wechatHint) wechatHint.style.display = 'none';
  const phoneGroup = document.getElementById('phoneGroup');
  if (phoneGroup) phoneGroup.style.display = 'block';
  document.getElementById('claimBtn').textContent = '立即领取';
  document.getElementById('claimBtn').onclick = doClaim;
  document.getElementById('phoneInput').value = currentUserId || '';

  document.getElementById('claimForm').style.display = 'block';
  document.getElementById('claimSuccess').classList.remove('active');
  document.querySelector('#claimModal .modal-footer').style.display = 'block';

  document.body.style.overflow = 'hidden';
}

async function doClaim() {
  const phone = document.getElementById('phoneInput').value.trim();

  if (!phone) { showToast('请输入手机号码'); return; }
  if (!/^1[3-9]\d{9}$/.test(phone)) { showToast('请输入正确的手机号码'); return; }
  if (!currentRestaurantId) { showToast('请先选择餐厅'); return; }

  // 保存手机号
  localStorage.setItem('s3_user_phone', phone);
  currentUserId = phone;

  const r = RESTAURANTS.find(x => x.id === currentRestaurantId);
  const result = await claimRedpacket(phone, currentRestaurantId);

  if (!result.success) {
    showToast(result.message);
    const existing = await getRedpacketForRestaurant(phone, currentRestaurantId);
    if (existing && r) {
      await updateDetailRedpacketBar(r);
      closeClaimModal();
    }
    return;
  }

  // 成功！显示二维码 + 短PIN
  const rp = result.redpacket;

  document.getElementById('claimForm').style.display = 'none';
  document.getElementById('claimSuccess').classList.add('active');
  document.querySelector('#claimModal .modal-footer').style.display = 'none';

  // 显示短PIN码 + 二维码（本地生成，确保唯一）
  document.getElementById('rpPIN').textContent = rp.pin;
  const qrImg = document.getElementById('rpQRImg');
  renderRedpacketQRImg(rp, qrImg);
  document.getElementById('rpCode').textContent = '到店出示二维码核销';
  document.getElementById('rpExpire').textContent = '有效期至：' + new Date(rp.expireAt).toLocaleDateString('zh-CN');
  document.getElementById('rpStore').textContent =
    (RESTAURANTS.find(x => x.id === currentRestaurantId) || {}).name || '';

  // 隐藏旧的长券码显示
  document.getElementById('rpCode').style.background = 'transparent';
  document.getElementById('rpCode').style.fontSize = '14px';
  document.getElementById('rpCode').style.color = '#888';

  await updateUserUI();
}

function closeClaimModal() {
  document.getElementById('claimModal').classList.remove('active');
  document.body.style.overflow = '';
  if (currentRestaurantId) {
    const r = RESTAURANTS.find(x => x.id === currentRestaurantId);
    if (r) updateDetailRedpacketBar(r);
  }
}

// ===== 我的红包页面（带二维码） =====
async function showMyRedpackets() {
  if (!currentUserId) {
    showToast('请先领取红包');
    return;
  }

  closeDetail();
  closeClaimModal();

  const page = document.getElementById('myRedpacketsPage');
  const list = document.getElementById('myRpList');

  const all = await getMyRedpackets(currentUserId);
  const sorted = [...all].sort((a, b) => new Date(b.claimedAt) - new Date(a.claimedAt));

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div style="font-size:56px;">🎫</div>
        <div style="font-size:16px;color:#888;margin:12px 0;">暂无红包</div>
        <div style="font-size:13px;color:#AAA;">浏览餐厅即可领取专属红包</div>
      </div>
    `;
  } else {
    list.innerHTML = sorted.map(rp => {
      const r = RESTAURANTS.find(x => x.id === rp.restaurantId);
      const now = new Date();
      const expired = new Date(rp.expireAt) < now;
      let statusClass, statusText;
      if (rp.used) { statusClass = 'used'; statusText = '已核销'; }
      else if (expired) { statusClass = 'expired'; statusText = '已过期'; }
      else { statusClass = 'active'; statusText = '可使用'; }

      const qrUrl = getRedpacketQRUrl(rp);

      return `
        <div class="myrp-card ${rp.used ? 'used' : ''} ${expired && !rp.used ? 'expired' : ''}">
          <div class="myrp-left" style="border-left-color:${r ? r.color : '#CCC'};">
            <div class="myrp-store">${rp.restaurantName}</div>
            <div class="myrp-amount">¥${rp.amount}</div>
            <div class="myrp-rule">满¥${rp.minSpend}可用</div>
            <div class="myrp-status ${statusClass}">${statusText}</div>
          </div>
          <div class="myrp-right">
            ${rp.used ? `
              <div style="text-align:center;padding:10px;">
                <div style="font-size:28px;">✅</div>
                <div style="font-size:12px;color:#888;">已核销</div>
              </div>
            ` : expired ? `
              <div style="text-align:center;padding:10px;">
                <div style="font-size:28px;">⏰</div>
                <div style="font-size:12px;color:#888;">已过期</div>
              </div>
            ` : `
              <div class="myrp-qr-wrap">
                <img src="${qrUrl}" alt="核销二维码" class="myrp-qr-img" onerror="this.parentElement.innerHTML='<div class=myrp-qr-fallback>📱<br><small>二维码加载中...</small></div>'">
              </div>
              <div class="myrp-pin-row">
                <span class="myrp-pin-label">确认码</span>
                <span class="myrp-pin-num">${rp.pin}</span>
              </div>
              <div class="myrp-date">${new Date(rp.expireAt).toLocaleDateString('zh-CN')}前有效</div>
              <button class="myrp-share-btn" onclick="event.stopPropagation(); copyVerifyLink('${rp.id}')">📋 复制核销链接</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // 使用说明
    list.innerHTML += `
      <div class="usage-guide">
        <div class="usage-title">💡 如何使用红包？</div>
        <div class="usage-steps">
          <div class="usage-step">
            <div class="step-num">1</div>
            <div>到店消费时，向店员出示上方的<b>二维码</b></div>
          </div>
          <div class="usage-step">
            <div class="step-num">2</div>
            <div>店员扫码后确认红包信息，点击核销</div>
          </div>
          <div class="usage-step">
            <div class="step-num">3</div>
            <div>结账时直接抵扣红包金额</div>
          </div>
        </div>
      </div>
    `;
  }

  page.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMyRedpackets() {
  document.getElementById('myRedpacketsPage').classList.remove('active');
  document.body.style.overflow = '';
}

// ===== 关闭详情页 =====
function closeDetail() {
  document.getElementById('detailPage').classList.remove('active');
  document.getElementById('detailRedpacketBar').classList.remove('visible');
  document.body.style.overflow = '';
  currentRestaurantId = null;
}

// ===== 复制核销链接 =====
function copyVerifyLink(rpId) {
  const rp = claimedRedpackets.find(r => r.id === rpId);
  if (!rp) { showToast('红包信息未找到'); return; }

  const url = getVerifyShareUrl(rp);
  const text = `【${rp.restaurantName}】红包 ¥${rp.amount}\n确认码：${rp.pin}\n核销链接：${url}\n有效期至：${new Date(rp.expireAt).toLocaleDateString('zh-CN')}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ 核销链接已复制，可发送给店员');
  }).catch(() => {
    // fallback: 显示链接让用户手动复制
    prompt('请手动复制以下核销链接发给店员：', url);
  });
}

// ===== 弹窗遮罩关闭 =====
document.getElementById('claimModal').addEventListener('click', function(e) {
  if (e.target === this) closeClaimModal();
});
