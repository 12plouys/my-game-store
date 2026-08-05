let allGames = [];
const CART_KEY = 'game_cart';

function loadCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cartItems)); }

let cartItems = loadCart();

function toggleCart(game) {
  const i = cartItems.indexOf(game.id);
  if (i >= 0) cartItems.splice(i, 1);
  else cartItems.push(game.id);
  saveCart();
  renderCartBadge();
  renderCart();
  // 刷新所有卡片的 + 状态
  const btn = document.querySelector(`.card-add[data-id="${CSS.escape(game.id)}"]`);
  if (btn) { btn.classList.toggle('added', i < 0); btn.textContent = i < 0 ? '✓' : '+'; }
}

function renderCartBadge() {
  const badge = document.getElementById('cart-badge');
  const prev = badge.hidden ? 0 : parseInt(badge.textContent, 10) || 0;
  badge.hidden = cartItems.length === 0;
  badge.textContent = cartItems.length;
  // 数量变化时弹跳
  if (cartItems.length !== prev) {
    badge.classList.remove('bounce');
    void badge.offsetWidth; // 重启动画
    badge.classList.add('bounce');
  }
}

function renderCart() {
  const list = document.getElementById('cart-list');
  const empty = document.getElementById('cart-empty');
  const totalEl = document.getElementById('cart-total');
  list.innerHTML = '';
  const items = cartItems.map(id => allGames.find(g => g.id === id)).filter(Boolean);
  empty.hidden = items.length !== 0;
  let total = 0;
  items.forEach(g => {
    total += parseFloat(String(g.price).replace(/[^0-9.]/g, '')) || 0;
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      ${g.cover && isSafeImageUrl(g.cover)
        ? `<img src="${g.cover}" alt="">`
        : '<span class="ci-placeholder">图</span>'}
      <span class="ci-name">${escapeHtml(g.name)}</span>
      <span class="ci-price">${escapeHtml(g.price)}</span>
      <button class="ci-del" data-id="${escapeHtml(g.id)}" aria-label="移除">&times;</button>`;
    li.querySelector('.ci-del').addEventListener('click', () => toggleCart(g));
    list.appendChild(li);
  });
  totalEl.textContent = '¥' + total.toFixed(total % 1 ? 2 : 0);
  const hasItems = items.length > 0;
  document.getElementById('btn-clear-cart').disabled = !hasItems;
  document.getElementById('btn-checkout').disabled = !hasItems;
}

function renderCartContact() {
  const contact = (window._siteData && window._siteData.contact) || {};
  const el = document.getElementById('cart-contact');
  if (contact.wechat || contact.qq) {
    el.innerHTML = `想买这些？加我<strong>微信：${escapeHtml(contact.wechat || '—')}</strong> / <strong>QQ：${escapeHtml(contact.qq || '—')}</strong>`;
    el.hidden = false;
  } else {
    el.hidden = true;
  }
}

function openCart() {
  renderCart();
  renderCartContact();
  document.getElementById('cart-drawer').hidden = false;
}
function closeCart() {
  document.getElementById('cart-drawer').hidden = true;
}

// 通用页面内弹窗
let dialogOkHandler = null;
function showDialog(title, msgHtml, { okText = '确定', cancelText = null, onOk = null } = {}) {
  document.getElementById('dialog-title').textContent = title;
  document.getElementById('dialog-msg').innerHTML = msgHtml;
  const okBtn = document.getElementById('dialog-ok');
  const cancelBtn = document.getElementById('dialog-cancel');
  okBtn.textContent = okText;
  okBtn.style.display = '';
  cancelBtn.style.display = cancelText ? '' : 'none';
  if (cancelText) cancelBtn.textContent = cancelText;
  // 保存 onOk 到临时属性（每次弹窗覆盖）
  dialogOkHandler = onOk;
  document.getElementById('app-dialog').hidden = false;
}
function closeDialog() {
  document.getElementById('app-dialog').hidden = true;
  dialogOkHandler = null;
}
document.getElementById('dialog-ok').addEventListener('click', () => {
  if (dialogOkHandler) dialogOkHandler();
  closeDialog();
});
document.getElementById('dialog-cancel').addEventListener('click', closeDialog);
document.getElementById('dialog-backdrop').addEventListener('click', closeDialog);

function clearCart() {
  showDialog('清空购物车', '确定要清空购物车里的所有商品吗？', {
    okText: '清空', cancelText: '取消',
    onOk: () => {
      cartItems = [];
      saveCart();
      renderCartBadge();
      renderCart();
    }
  });
}

function placeOrder() {
  const total = document.getElementById('cart-total').textContent;
  const itemCount = cartItems.length;
  showDialog('确认下单', `已选 <strong>${escapeHtml(String(itemCount))}</strong> 件商品，合计 <strong>${escapeHtml(total)}</strong>。<br><br>请对当前购物车清单<strong>截图保存</strong>，然后联系卖家完成交易。`);
}

document.getElementById('btn-clear-cart').addEventListener('click', clearCart);
document.getElementById('btn-checkout').addEventListener('click', placeOrder);

// 悬浮购物车按钮：点击 + 拖拽吸附
const cartFab = document.getElementById('cart-fab');
const FAB_POS_KEY = 'cart_fab_pos';
let fabDragging = false, fabMoved = false, fabStartX = 0, fabStartY = 0, fabOriginLeft = 0, fabOriginTop = 0;

function applyFabPos(left, top) {
  cartFab.style.left = left + 'px';
  cartFab.style.top = top + 'px';
  cartFab.style.right = 'auto';
  cartFab.style.bottom = 'auto';
}
function snapFab() {
  const w = window.innerWidth, fabW = cartFab.offsetWidth;
  const left = cartFab.getBoundingClientRect().left;
  const top = cartFab.getBoundingClientRect().top;
  const snapped = left < w / 2 ? 16 : w - fabW - 16;
  const clampedTop = Math.max(16, Math.min(top, window.innerHeight - cartFab.offsetHeight - 16));
  applyFabPos(snapped, clampedTop);
  localStorage.setItem(FAB_POS_KEY, JSON.stringify({ left: snapped, top: clampedTop }));
}
function loadFabPos() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAB_POS_KEY));
    if (saved && typeof saved.left === 'number') { applyFabPos(saved.left, saved.top); snapFab(); return; }
  } catch {}
  // 默认右下角
  cartFab.style.right = '20px';
  cartFab.style.bottom = '20px';
}

cartFab.addEventListener('pointerdown', (e) => {
  fabDragging = true;
  fabMoved = false;
  const rect = cartFab.getBoundingClientRect();
  fabStartX = e.clientX; fabStartY = e.clientY;
  fabOriginLeft = rect.left; fabOriginTop = rect.top;
  cartFab.classList.add('dragging');
  cartFab.setPointerCapture(e.pointerId);
});
cartFab.addEventListener('pointermove', (e) => {
  if (!fabDragging) return;
  const dx = e.clientX - fabStartX, dy = e.clientY - fabStartY;
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) fabMoved = true;
  if (fabMoved) applyFabPos(fabOriginLeft + dx, fabOriginTop + dy);
});
function endFabDrag(e) {
  if (!fabDragging) return;
  fabDragging = false;
  cartFab.classList.remove('dragging');
  if (fabMoved) { snapFab(); }
  else { cartFab.classList.remove('clicked'); void cartFab.offsetWidth; cartFab.classList.add('clicked'); openCart(); }
  try { cartFab.releasePointerCapture(e.pointerId); } catch {}
}
cartFab.addEventListener('pointerup', endFabDrag);
cartFab.addEventListener('pointercancel', endFabDrag);

loadFabPos();
document.getElementById('cart-close').addEventListener('click', closeCart);
document.getElementById('cart-backdrop').addEventListener('click', closeCart);

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 校验图片 URL：仅允许 site 内 images/ 或 http(s):// 开头，且不能含用于逃逸 src 属性的引号
function isSafeImageUrl(url) {
  if (typeof url !== 'string') return false;
  if (/["']/.test(url) || /\s/.test(url)) return false;
  return /^(images\/|https?:\/\/)/i.test(url);
}

let currentSection = '全部';
let currentCategory = '全部';
let currentPage = 1;

function renderSections() {
  const sections = (window._siteData.sections || []);
  const bar = document.getElementById('section-bar');
  bar.innerHTML = '';
  bar.appendChild(makeSectionTab('全部', true));
  sections.forEach(s => bar.appendChild(makeSectionTab(s, false)));
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.section-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSection = tab.dataset.section;
      currentCategory = '全部';
      currentPage = 1;
      renderCategories(currentSection);
      applyFilter();
    });
  });
}

function makeSectionTab(label, active) {
  const b = document.createElement('button');
  b.className = 'section-tab' + (active ? ' active' : '');
  b.textContent = label;
  b.dataset.section = label;
  return b;
}

function renderCategories(section) {
  const bar = document.getElementById('category-bar');
  if (section === '全部') {
    bar.hidden = true;
    currentCategory = '全部';
    return;
  }
  bar.hidden = false;
  const cats = [...new Set(allGames.filter(g => (g.section || '').trim() === section).map(g => (g.category || '').trim()).filter(Boolean))];
  bar.innerHTML = '';
  bar.appendChild(makeCategoryTab('全部', true));
  cats.forEach(c => bar.appendChild(makeCategoryTab(c, false)));
  document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.dataset.cat;
      currentPage = 1;
      applyFilter();
    });
  });
}

function makeCategoryTab(label, active) {
  const b = document.createElement('button');
  b.className = 'category-tab' + (active ? ' active' : '');
  b.textContent = label;
  b.dataset.cat = label;
  return b;
}

function getFilteredList() {
  const kw = document.getElementById('search-box').value.trim().toLowerCase();
  let list = allGames;
  if (currentSection !== '全部') list = list.filter(g => (g.section || '').trim() === currentSection);
  if (currentCategory !== '全部') list = list.filter(g => (g.category || '').trim() === currentCategory);
  if (kw) list = list.filter(g => (g.name + g.description).toLowerCase().includes(kw));
  return list;
}

function paginate(list) {
  const pageSize = parseInt((window._siteData && window._siteData.pageSize), 10) || 12;
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  return { pageItems: list.slice(start, start + pageSize), totalPages };
}

function renderGames(list) {
  const { pageItems, totalPages } = paginate(list);
  const grid = document.getElementById('game-grid');
  grid.innerHTML = '';
  const tip = document.getElementById('empty-tip');
  if (!list.length) { tip.hidden = false; document.getElementById('pagination').hidden = true; return; }
  tip.hidden = true;
  pageItems.forEach(g => grid.appendChild(buildCard(g)));
  renderPagination(list.length, totalPages);
}

function renderPagination(total, totalPages) {
  const p = document.getElementById('pagination');
  if (totalPages <= 1) { p.hidden = true; return; }
  p.hidden = false;
  p.innerHTML = '';
  const btn = (label, page, opts = {}) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (opts.disabled) b.disabled = true;
    if (opts.active) b.className = 'active';
    if (!opts.disabled) b.addEventListener('click', () => { currentPage = page; applyFilter(); });
    return b;
  };
  p.appendChild(btn('‹', currentPage - 1, { disabled: currentPage === 1 }));
  // 页码窗口：显示 1, ..., 当前页-1, 当前页, 当前页+1, ..., 末页（窄窗口省略）
  const pageWindow = 2;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= pageWindow) pages.push(i);
  }
  let last = 0;
  pages.forEach(i => {
    if (last && i - last > 1) {
      const el = document.createElement('span');
      el.className = 'page-ellipsis';
      el.textContent = '…';
      p.appendChild(el);
    }
    p.appendChild(btn(String(i), i, { active: i === currentPage }));
    last = i;
  });
  p.appendChild(btn('›', currentPage + 1, { disabled: currentPage === totalPages }));
}

function buildCard(game) {
  const card = document.createElement('div');
  card.className = 'game-card';
  const coverHtml = game.cover && isSafeImageUrl(game.cover)
    ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}" loading="lazy">`
    : escapeHtml(game.name.charAt(0));
  const inCart = cartItems.includes(game.id);
  card.innerHTML = `
    <div class="card-cover">${coverHtml}</div>
    <div class="card-body">
      <div class="card-name">${escapeHtml(game.name)}</div>
      <div class="card-meta">
        <span class="card-price">${escapeHtml(game.price)}</span>
        <button class="card-add${inCart ? ' added' : ''}" data-id="${escapeHtml(game.id)}" aria-label="加入购物车">${inCart ? '✓' : '+'}</button>
      </div>
      <div class="card-tags">
        <span class="card-section">${escapeHtml(game.section || '')}</span>
        <span class="card-category">${escapeHtml(game.category || '')}</span>
      </div>
    </div>`;
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-add')) return;
    openDetail(game);
  });
  const addBtn = card.querySelector('.card-add');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCart(game);
  });
  return card;
}

function applyFilter() {
  const list = getFilteredList();
  renderGames(list);
}

async function loadGames() {
  try {
    const res = await fetch('games.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    allGames = data.games.filter(g => g.published);
    document.getElementById('site-name').textContent = data.site.name;
    document.getElementById('announcement').textContent = data.site.announcement;
    document.getElementById('footer-disclaimer').textContent = data.site.footer || '';
    window._siteData = data.site;
    renderSections();
    renderCategories('全部');
    applyFilter();
    renderCartBadge();
    renderCart();
  } catch (err) {
    document.getElementById('empty-tip').textContent = '数据加载失败，请稍后重试';
    document.getElementById('empty-tip').hidden = false;
    console.error(err);
  }
}

let galleryShots = [];
let galleryIndex = 0;

function openDetail(game) {
  const modal = document.getElementById('detail-modal');
  const infoEl = document.getElementById('modal-info');
  const safeShots = (game.screenshots || []).filter(isSafeImageUrl).slice(0, 10);
  galleryShots = safeShots;
  galleryIndex = 0;
  const imgEl = document.getElementById('gallery-main');
  const emptyEl = document.getElementById('gallery-empty');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');
  if (safeShots.length) {
    imgEl.hidden = false;
    emptyEl.hidden = true;
    prevBtn.hidden = safeShots.length < 2;
    nextBtn.hidden = safeShots.length < 2;
    renderThumbs();
    showGalleryImage();
  } else {
    imgEl.hidden = true;
    emptyEl.hidden = false;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    document.getElementById('gallery-thumbs').hidden = true;
  }
  infoEl.innerHTML = `
    <div class="modal-title"><span>${escapeHtml(game.name)}</span><span class="modal-price">${escapeHtml(game.price)}</span></div>
    <span class="modal-category">${escapeHtml(game.category || '')}</span>
    <p class="modal-desc">${escapeHtml(game.description || '暂无简介')}</p>`;
  const addBtn = document.getElementById('detail-add-btn');
  addBtn.classList.toggle('added', cartItems.includes(game.id));
  addBtn.textContent = cartItems.includes(game.id) ? '已在购物车 ✓' : '加入购物车';
  addBtn.onclick = () => {
    toggleCart(game);
    addBtn.classList.toggle('added', cartItems.includes(game.id));
    addBtn.textContent = cartItems.includes(game.id) ? '已在购物车 ✓' : '加入购物车';
  };
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function galleryNav(dir) {
  if (!galleryShots.length) return;
  galleryIndex = (galleryIndex + dir + galleryShots.length) % galleryShots.length;
  showGalleryImage();
}

function renderThumbs() {
  const thumbs = document.getElementById('gallery-thumbs');
  if (galleryShots.length <= 1) { thumbs.hidden = true; return; }
  thumbs.hidden = false;
  thumbs.innerHTML = '';
  galleryShots.forEach((src, i) => {
    const img = document.createElement('img');
    img.className = 'gallery-thumb' + (i === galleryIndex ? ' active' : '');
    img.src = src;
    img.alt = '截图 ' + (i + 1);
    img.addEventListener('click', () => {
      galleryIndex = i;
      showGalleryImage();
    });
    thumbs.appendChild(img);
  });
}

function showGalleryImage() {
  const imgEl = document.getElementById('gallery-main');
  imgEl.src = galleryShots[galleryIndex];
  imgEl.classList.remove('gallery-fade');
  void imgEl.offsetWidth;
  imgEl.classList.add('gallery-fade');
  // 同步缩略图 active
  document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === galleryIndex);
  });
}

document.getElementById('gallery-prev').addEventListener('click', () => galleryNav(-1));
document.getElementById('gallery-next').addEventListener('click', () => galleryNav(1));

function closeDetail() {
  document.getElementById('detail-modal').hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeDetail);
document.getElementById('modal-backdrop').addEventListener('click', closeDetail);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });
document.getElementById('search-box').addEventListener('input', () => { currentPage = 1; applyFilter(); });

loadGames();
