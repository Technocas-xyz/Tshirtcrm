// ─── State ───────────────────────────────────────────────────────────────────
const catalog = { styles: [], colors: [], sizes: [] };
let newOrderItems = [];        // [{title,styleCode,styleName,colorCode,colorName,sizeCode,sizeName,craftType,num,printUrl,mockupUrl,printCode,mockupCode}]
let activeOrderOid = null;

// ─── Utils ───────────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);

// ─── Chinese to English Translation ─────────────────────────────────────────
const ZH_EN_MAP = {
  // Garment styles
  '休闲短裤': 'Casual Shorts',
  '水洗纯棉棒球帽': 'Washed Cotton Baseball Cap',
  '带帽无袖裙子': 'Hooded Sleeveless Dress',
  '斜肩女T': 'Off-Shoulder Women\'s Tee',
  '高弹力露脐女T': 'Crop Top Stretch Women\'s Tee',
  '女款连帽夹克': 'Women\'s Hooded Jacket',
  '女款立领夹克': 'Women\'s Stand Collar Jacket',
  '男款大码连帽夹克': 'Men\'s Plus Size Hooded Jacket',
  '男款大码立领夹克': 'Men\'s Plus Size Stand Collar Jacket',
  '男款连帽夹克': 'Men\'s Hooded Jacket',
  '男款立领夹克': 'Men\'s Stand Collar Jacket',
  '棒球帽': 'Baseball Cap',
  '长款爬服': 'Long Romper',
  '吉尔丹': 'Gildan',
  '圆领短袖T恤': 'Crew Neck Short Sleeve T-Shirt',
  '圆领': 'Crew Neck',
  '短袖T恤': 'Short Sleeve T-Shirt',
  '长袖T恤': 'Long Sleeve T-Shirt',
  '连帽卫衣': 'Hooded Sweatshirt',
  '圆领卫衣': 'Crew Neck Sweatshirt',
  '拉链卫衣': 'Zip Hoodie',
  '背心': 'Tank Top',
  '短裤': 'Shorts',
  '长裤': 'Long Pants',
  '帽子': 'Hat',
  '围裙': 'Apron',
  '抱枕': 'Pillow',
  '帆布袋': 'Canvas Bag',
  '手机壳': 'Phone Case',
  '马克杯': 'Mug',
  '鼠标垫': 'Mouse Pad',
  '婴儿连体衣': 'Baby Onesie',
  '儿童T恤': 'Kids T-Shirt',
  '女款T恤': 'Women\'s T-Shirt',
  '男款T恤': 'Men\'s T-Shirt',
  '宽松T恤': 'Oversized T-Shirt',
  '修身T恤': 'Slim Fit T-Shirt',
  'V领T恤': 'V-Neck T-Shirt',
  'POLO衫': 'Polo Shirt',
  'polo衫': 'Polo Shirt',

  // Craft types
  '烫画': 'Heat Transfer',
  '直喷': 'Direct-to-Garment',
  '数码直喷': 'Digital DTG',
  '丝网印刷': 'Screen Printing',
  '刺绣': 'Embroidery',
  '热升华': 'Sublimation',

  // Colors
  '黑色': 'Black', '白色': 'White', '红色': 'Red', '蓝色': 'Blue',
  '绿色': 'Green', '黄色': 'Yellow', '灰色': 'Gray', '粉色': 'Pink',
  '紫色': 'Purple', '橙色': 'Orange', '棕色': 'Brown', '米色': 'Beige',
  '藏青色': 'Navy', '藏青': 'Navy', '深蓝色': 'Dark Blue', '深蓝': 'Dark Blue',
  '浅蓝色': 'Light Blue', '浅蓝': 'Light Blue', '深灰色': 'Dark Gray', '深灰': 'Dark Gray',
  '浅灰色': 'Light Gray', '浅灰': 'Light Gray', '酒红色': 'Burgundy', '酒红': 'Burgundy',
  '军绿色': 'Army Green', '军绿': 'Army Green', '卡其色': 'Khaki', '卡其': 'Khaki',
  '天蓝色': 'Sky Blue', '天蓝': 'Sky Blue', '宝蓝色': 'Royal Blue', '宝蓝': 'Royal Blue',
  '墨绿色': 'Dark Green', '墨绿': 'Dark Green', '花灰': 'Heather Gray',
  '杏色': 'Apricot', '驼色': 'Camel', '咖啡色': 'Coffee', '咖啡': 'Coffee',
  '玫红': 'Hot Pink', '玫红色': 'Hot Pink', '荧光绿': 'Neon Green',
  '荧光黄': 'Neon Yellow', '荧光粉': 'Neon Pink', '荧光橙': 'Neon Orange',
  '深紫': 'Dark Purple', '浅紫': 'Light Purple', '浅粉': 'Light Pink',
  '深红': 'Dark Red', '桃红': 'Peach', '湖蓝': 'Lake Blue',
  '米白': 'Off-White', '本白': 'Natural White', '漂白': 'Bleached White',
  '麻灰': 'Linen Gray', '铁灰': 'Iron Gray', '炭灰': 'Charcoal',
  '烟灰': 'Smoke Gray', '银灰': 'Silver Gray',
  '翠绿': 'Emerald', '草绿': 'Grass Green', '果绿': 'Apple Green',
  '橄榄绿': 'Olive Green', '森林绿': 'Forest Green',
  '砖红': 'Brick Red', '枣红': 'Maroon', '暗红': 'Dark Red',
  '粉红': 'Pink', '桔色': 'Orange', '金色': 'Gold', '银色': 'Silver',

  // Sizes
  '均码': 'One Size', '加大': 'Plus Size', '大码': 'Large', '小码': 'Small',

  // Statuses
  '待推送': 'Pending Push', '待推审': 'Pending Review', '审核中': 'Under Review',
  '店铺审核': 'Store Audit', '工厂审核': 'Factory Audit', '生产中': 'In Production',
  '已发货': 'Shipped', '已关闭': 'Closed', '退款中': 'Refunding', '已退款': 'Refunded',
  '已拒绝': 'Rejected', '拒绝': 'Rejected', '未发货': 'Not Shipped',
  '待付款': 'Pending Payment', '已付款': 'Paid', '取消': 'Cancelled', '完成': 'Completed',

  // General
  '订单': 'Order', '商品': 'Item', '数量': 'Quantity', '颜色': 'Color',
  '尺码': 'Size', '款式': 'Style', '备注': 'Notes', '电话': 'Phone',
  '地址': 'Address', '快递': 'Courier', '物流': 'Logistics',
  '运单号': 'Tracking Number', '收件人': 'Recipient', '收货人': 'Recipient',
};

function translateChinese(value) {
  if (typeof value !== 'string') return value;
  if (!/[\u4e00-\u9fff]/.test(value)) return value;

  // Try exact match first
  if (ZH_EN_MAP[value]) return ZH_EN_MAP[value];

  // Try replacing known substrings (longer keys first)
  let translated = value;
  const sortedKeys = Object.keys(ZH_EN_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (translated.includes(key)) {
      translated = translated.split(key).join(ZH_EN_MAP[key]);
    }
  }
  return translated;
}

function translateData(obj) {
  if (typeof obj === 'string') return translateChinese(obj);
  if (Array.isArray(obj)) return obj.map(translateData);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = translateData(v);
    }
    return out;
  }
  return obj;
}

async function api(method, path, body = null, isForm = false) {
  const opts = { method };
  if (isForm) {
    opts.body = body;
  } else {
    opts.headers = { 'Content-Type': 'application/json' };
    if (body) opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const data = await res.json();
  return translateData(data);
}

function toast(msg, type = 'success') {
  const colors = { success: 'bg-emerald-600 text-white', error: 'bg-red-600 text-white', info: 'bg-blue-600 text-white', warn: 'bg-amber-500 text-white' };
  const icons  = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
  const div = document.createElement('div');
  div.className = `toast ${colors[type] || colors.info} pointer-events-auto`;
  div.innerHTML = `<span class="font-bold">${icons[type]||'•'}</span><span>${msg}</span>`;
  el('toasts').appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function genOrderId() {
  const now = new Date();
  return 'ORD-' + now.getFullYear().toString().slice(2)
    + String(now.getMonth()+1).padStart(2,'0')
    + String(now.getDate()).padStart(2,'0')
    + String(now.getHours()).padStart(2,'0')
    + String(now.getMinutes()).padStart(2,'0')
    + String(now.getSeconds()).padStart(2,'0');
}

function nowStr() {
  const n = new Date();
  return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')
    +' '+String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');
}

// ─── Status ──────────────────────────────────────────────────────────────────
const STATUSES = {
  1:  { label:'Store Audit',    cls:'bg-slate-100 text-slate-600' },
  2:  { label:'Pending Push',   cls:'bg-amber-100 text-amber-700' },
  3:  { label:'Rejected',       cls:'bg-red-100 text-red-700' },
  4:  { label:'Factory Audit',  cls:'bg-violet-100 text-violet-700' },
  5:  { label:'In Production',  cls:'bg-blue-100 text-blue-700' },
  12: { label:'Shipped',        cls:'bg-emerald-100 text-emerald-700' },
  13: { label:'Closed',         cls:'bg-slate-200 text-slate-500' },
  14: { label:'Refunding',      cls:'bg-orange-100 text-orange-700' },
  15: { label:'Refunded',       cls:'bg-slate-100 text-slate-500' },
};

function badge(status) {
  const s = STATUSES[status] || { label: 'Unknown', cls: 'bg-slate-100 text-slate-500' };
  return `<span class="status-badge ${s.cls}">${s.label}</span>`;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
const PAGE_META = {
  dashboard:  { title:'Dashboard',  sub:'Overview of your orders' },
  orders:     { title:'Orders',     sub:'Manage and track all orders' },
  'new-order':{ title:'New Order',  sub:'Place a new T-shirt order' },
  catalog:    { title:'Catalog',    sub:'Browse available styles, colors & sizes' },
  settings:   { title:'Settings',   sub:'Configure API credentials' },
  users:      { title:'Users',      sub:'Manage user accounts (Admin only)' },
};

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  el(`view-${view}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  const meta = PAGE_META[view] || {};
  el('page-title').textContent = meta.title || view;
  el('page-sub').textContent   = meta.sub || '';
  closePanel();
  ({ dashboard: loadDashboard, orders: loadOrders, 'new-order': initNewOrder, catalog: loadCatalog, settings: loadSettings, users: loadUsers })[view]?.();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
async function loadDashboard() {
  el('page-actions').innerHTML = `<button class="btn btn-primary" onclick="navigate('new-order')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>New Order</button>`;
  el('view-dashboard').innerHTML = `<div class="text-slate-400 text-sm py-8 text-center">Loading…</div>`;
  const orders = await api('GET', '/api/orders');
  const counts = { total: orders.length, pending: 0, production: 0, shipped: 0, attention: 0 };
  orders.forEach(o => {
    if (o.supplier_status === 2) counts.pending++;
    if (o.supplier_status === 5) counts.production++;
    if (o.supplier_status === 12) counts.shipped++;
    if ([3,14].includes(o.supplier_status)) counts.attention++;
  });
  el('view-dashboard').innerHTML = `
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      ${statCard('Total Orders', counts.total, '#3b82f6', '📦')}
      ${statCard('Pending Push', counts.pending, '#f59e0b', '⏳')}
      ${statCard('In Production', counts.production, '#8b5cf6', '🏭')}
      ${statCard('Shipped', counts.shipped, '#10b981', '🚚')}
    </div>
    ${counts.attention > 0 ? `<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><span class="text-lg">⚠️</span><strong>${counts.attention} order(s)</strong> need attention (rejected or refunding).</div>` : ''}
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="font-semibold text-slate-900">Recent Orders</h3>
        <button class="text-xs text-blue-600 hover:underline font-medium" onclick="navigate('orders')">View all →</button>
      </div>
      ${ordersTable(orders.slice(0, 8))}
    </div>`;
}

function statCard(label, value, color, icon) {
  return `<div class="stat-card flex items-center gap-4">
    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style="background:${color}18">${icon}</div>
    <div><p class="text-2xl font-bold text-slate-900">${value}</p><p class="text-xs text-slate-500 font-medium mt-0.5">${label}</p></div>
  </div>`;
}

// ─── Orders ──────────────────────────────────────────────────────────────────
let ordersSearchTimer = null;

async function loadOrders(q = '', status = '') {
  el('page-actions').innerHTML = `
    <button class="btn btn-secondary" onclick="syncAll(this)"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Sync All</button>
    <button class="btn btn-secondary" onclick="openImportModal()">⬇ Import Order</button>
    <button class="btn btn-primary" onclick="navigate('new-order')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>New Order</button>`;

  el('view-orders').innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative flex-1 max-w-xs">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input id="orders-search" type="text" placeholder="Search orders…" value="${q}"
            class="form-input pl-9 text-sm" oninput="debounceSearch(this.value)">
        </div>
        <div class="flex gap-1.5 flex-wrap">
          ${[['', 'All'], ['2', 'Pending'], ['5', 'Production'], ['12', 'Shipped'], ['13', 'Closed']].map(
            ([v, l]) => `<button onclick="filterOrders('${v}')" data-sf="${v}" class="tab-btn${status===v?' active':''}">${l}</button>`
          ).join('')}
        </div>
      </div>
      <div id="orders-body"><div class="p-8 text-center text-slate-400 text-sm">Loading…</div></div>
    </div>`;

  const orders = await api('GET', `/api/orders?q=${encodeURIComponent(q)}&status=${status}`);
  el('orders-body').innerHTML = ordersTable(orders, true);
}

function ordersTable(orders, full = false) {
  if (!orders.length) return `<div class="p-10 text-center text-slate-400 text-sm">No orders found.</div>`;
  return `<div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead><tr class="border-b border-slate-100">
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Order ID</th>
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
        <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">${full ? 'Updated' : 'Created'}</th>
        <th class="px-5 py-3"></th>
      </tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr class="table-row border-b border-slate-50" onclick="openPanel('${o.platform_oid}')">
            <td class="px-5 py-3.5 font-mono text-xs text-slate-600 font-medium">${o.platform_oid}</td>
            <td class="px-5 py-3.5 font-medium text-slate-800">${o.consignee_name || '—'}</td>
            <td class="px-5 py-3.5 text-slate-500">${[o.city, o.state].filter(Boolean).join(', ') || '—'}</td>
            <td class="px-5 py-3.5 text-slate-500">${o.goods_count || 0}</td>
            <td class="px-5 py-3.5">${badge(o.supplier_status)}</td>
            <td class="px-5 py-3.5 text-slate-400 text-xs">${fmtDateTime(full ? o.updated_at : o.created_at)}</td>
            <td class="px-5 py-3.5"><svg class="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function debounceSearch(val) {
  clearTimeout(ordersSearchTimer);
  ordersSearchTimer = setTimeout(() => {
    const sf = document.querySelector('[data-sf].active');
    loadOrders(val, sf?.dataset.sf || '');
  }, 350);
}

function filterOrders(status) {
  document.querySelectorAll('[data-sf]').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-sf="${status}"]`).classList.add('active');
  const q = el('orders-search')?.value || '';
  loadOrders(q, status);
}

async function syncAll(btn) {
  btn.disabled = true;
  btn.innerHTML = `<svg class="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Syncing…`;
  const res = await api('POST', '/api/orders/sync', {});
  btn.disabled = false;
  btn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Sync All`;
  let msg = `Synced ${res.updated} order(s)`;
  if (res.removed > 0) msg += ` · removed ${res.removed} local-only order(s) not found on supplier`;
  toast(msg, res.removed > 0 ? 'warn' : 'success');
  loadOrders();
}

function openImportModal() {
  el('modal-box').innerHTML = `
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Import Order from Supplier</h3>
      <button onclick="closeModal()" class="btn btn-ghost p-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="p-6 space-y-4">
      <p class="text-sm text-slate-500">Enter the order ID exactly as it appears on the supplier portal to pull it into the CRM.</p>
      <div>
        <label class="form-label">Supplier Order ID (platformOid)</label>
        <input id="import-oid" class="form-input font-mono" placeholder="e.g. TEST1782754600" autofocus>
      </div>
      <div id="import-result" class="hidden rounded-xl p-3 text-sm"></div>
    </div>
    <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
      <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
      <button onclick="submitImport()" id="import-btn" class="btn btn-primary">Import</button>
    </div>`;
  el('modal-wrap').classList.add('open');
  setTimeout(() => el('import-oid').focus(), 50);
}

async function submitImport() {
  const oid = el('import-oid').value.trim();
  if (!oid) { toast('Enter an order ID', 'warn'); return; }
  const btn = el('import-btn');
  btn.disabled = true; btn.textContent = 'Importing…';
  const res = await api('POST', '/api/orders/import', { platformOid: oid });
  btn.disabled = false; btn.textContent = 'Import';
  const box = el('import-result');
  box.classList.remove('hidden');
  if (res.success) {
    box.className = 'rounded-xl p-3 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700';
    box.textContent = `✓ Order ${res.platform_oid} imported successfully`;
    setTimeout(() => { closeModal(); loadOrders(); }, 1200);
  } else {
    box.className = 'rounded-xl p-3 text-sm bg-red-50 border border-red-200 text-red-700';
    box.textContent = `✕ ${res.message}`;
  }
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────
async function openPanel(oid) {
  activeOrderOid = oid;
  el('order-panel').innerHTML = `<div class="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>`;
  el('order-panel').classList.add('open');
  el('panel-backdrop').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const order = await api('GET', `/api/orders/${oid}`);
  if (order.error) { toast('Could not load order', 'error'); closePanel(); return; }

  let payload = {};
  try { payload = JSON.parse(order.order_payload || '{}'); } catch {}
  const goods = payload.goodsList || [];

  el('order-panel').innerHTML = `
    <!-- Panel Header -->
    <div class="flex items-start justify-between p-5 border-b border-slate-100 flex-shrink-0">
      <div>
        <p class="font-mono text-xs text-slate-400 mb-1">ORDER ID</p>
        <h2 class="font-bold text-slate-900 text-base">${order.platform_oid}</h2>
        <div class="mt-2">${badge(order.supplier_status)}</div>
      </div>
      <button onclick="closePanel()" class="btn btn-ghost p-2 -mr-1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Panel Body -->
    <div class="flex-1 overflow-y-auto p-5 space-y-5">

      <!-- Customer -->
      <div class="bg-slate-50 rounded-xl p-4 space-y-1.5">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Recipient</p>
        <div class="flex items-center gap-2 text-sm"><span class="text-slate-400">👤</span><span class="font-medium">${order.consignee_name}</span></div>
        <div class="flex items-center gap-2 text-sm"><span class="text-slate-400">📞</span><span>${order.phone}</span></div>
        <div class="flex items-center gap-2 text-sm"><span class="text-slate-400">📍</span><span>${[order.address, order.city, order.state, order.post_code, order.country].filter(Boolean).join(', ')}</span></div>
        ${order.courier ? `<div class="flex items-center gap-2 text-sm"><span class="text-slate-400">🚚</span><span>${order.courier}</span></div>` : ''}
      </div>

      <!-- Items -->
      ${goods.length ? `
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items (${goods.length})</p>
        <div class="space-y-3">
          ${goods.map((g,i) => `
            <div class="border border-slate-100 rounded-xl p-3 bg-white">
              <p class="font-medium text-sm text-slate-800 mb-1">${g.title || 'Item '+(i+1)}</p>
              <div class="flex flex-wrap gap-1.5 text-xs">
                ${g.styleCode ? `<span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">${g.styleCode}</span>` : ''}
                ${g.colorCode ? `<span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">${g.colorName||g.colorCode}</span>` : ''}
                ${g.sizeCode  ? `<span class="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">${g.sizeCode}</span>` : ''}
                <span class="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Qty: ${g.num||1}</span>
                <span class="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">${g.craftType===2?'DTG':'Heat Transfer'}</span>
              </div>
              ${(g.imageList||[]).filter(im=>im.type===1).map(im=>`<img src="${im.imageUrl}" class="mt-2 h-20 rounded-lg object-cover border border-slate-100" onerror="this.style.display='none'" />`).join('')}
            </div>`).join('')}
        </div>
      </div>` : ''}

      <!-- Notes -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</p>
        <textarea id="panel-notes" rows="3" class="form-input text-sm resize-none" placeholder="Add a note…">${order.notes||''}</textarea>
        <button onclick="saveNotes('${oid}')" class="btn btn-secondary mt-2 text-xs">Save Notes</button>
      </div>

      <div id="panel-tracking" class="hidden">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tracking</p>
        <div id="panel-tracking-content"></div>
      </div>
    </div>

    <!-- Panel Footer -->
    <div class="p-4 border-t border-slate-100 flex-shrink-0 space-y-2">
      <div class="flex gap-2">
        <button onclick="syncOne('${oid}')" class="btn btn-secondary flex-1 text-xs justify-center">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Sync Status
        </button>
        <button onclick="getTracking('${oid}')" class="btn btn-secondary flex-1 text-xs justify-center">
          📦 Tracking
        </button>
      </div>
      <div class="flex gap-2">
        <button onclick="openUpdateModal(${JSON.stringify(order).replace(/"/g,'&quot;')})" class="btn btn-secondary flex-1 text-xs justify-center">
          ✏️ Update Shipping
        </button>
        ${![13,15].includes(order.supplier_status) ? `
        <button onclick="confirmClose('${oid}')" class="btn btn-danger flex-1 text-xs justify-center">
          ✕ Close Order
        </button>` : ''}
      </div>
    </div>`;
}

function closePanel() {
  el('order-panel').classList.remove('open');
  el('panel-backdrop').classList.add('hidden');
  document.body.style.overflow = '';
  activeOrderOid = null;
}

async function saveNotes(oid) {
  const notes = el('panel-notes').value;
  await api('PUT', `/api/orders/${oid}/notes`, { notes });
  toast('Notes saved');
}

async function syncOne(oid) {
  const res = await api('POST', '/api/orders/sync', { oids: [oid] });
  toast(`Status synced`, 'success');
  openPanel(oid);
  if (document.querySelector('#view-orders.active')) loadOrders();
}

async function getTracking(oid) {
  const res = await api('GET', `/api/orders/${oid}/delivery`);
  const data = res.data?.[0];
  const box = el('panel-tracking');
  const content = el('panel-tracking-content');
  box.classList.remove('hidden');
  if (data?.trackingNumber) {
    content.innerHTML = `
      <div class="bg-slate-50 rounded-xl p-3 text-sm space-y-1.5">
        <div class="flex items-center gap-2"><span class="text-slate-400">📬</span><span class="font-medium">${data.trackingNumber}</span></div>
        ${data.shippingTime ? `<div class="flex items-center gap-2 text-xs text-slate-500"><span>🕐</span><span>Shipped: ${fmtDateTime(data.shippingTime)}</span></div>` : ''}
        ${data.waybillDataPath ? `<a href="${data.waybillDataPath}" target="_blank" class="flex items-center gap-1 text-xs text-blue-600 hover:underline">📄 Download waybill</a>` : ''}
      </div>`;
  } else {
    content.innerHTML = `<p class="text-slate-400 text-sm">No tracking info available yet.</p>`;
  }
}

async function confirmClose(oid) {
  if (!confirm(`Close order ${oid}? This cannot be undone.`)) return;
  const res = await api('POST', `/api/orders/${oid}/close`);
  if (res.success) { toast('Order closed'); openPanel(oid); if (document.querySelector('#view-orders.active')) loadOrders(); }
  else toast(res.message || 'Failed to close order', 'error');
}

// ─── Update Order Modal ───────────────────────────────────────────────────────
function openUpdateModal(order) {
  el('modal-box').innerHTML = `
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Update Shipping — ${order.platform_oid}</h3>
      <button onclick="closeModal()" class="btn btn-ghost p-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="form-label">Full Name *</label><input id="upd-name" class="form-input" value="${order.consignee_name||''}"></div>
        <div><label class="form-label">Phone *</label><input id="upd-phone" class="form-input" value="${order.phone||''}"></div>
      </div>
      <div><label class="form-label">Address Line 1 *</label><input id="upd-addr" class="form-input" value="${order.address||''}"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="form-label">City *</label><input id="upd-city" class="form-input" value="${order.city||''}"></div>
        <div><label class="form-label">State / Province *</label><input id="upd-state" class="form-input" value="${order.state||''}"></div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div><label class="form-label">ZIP Code</label><input id="upd-zip" class="form-input" value="${order.post_code||''}"></div>
        <div><label class="form-label">Country *</label><input id="upd-country" class="form-input" value="${order.country||'US'}"></div>
        <div><label class="form-label">Carrier</label><input id="upd-courier" class="form-input" value="${order.courier||''}"></div>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
      <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
      <button onclick="submitUpdate('${order.platform_oid}')" id="upd-submit" class="btn btn-primary">Save Changes</button>
    </div>`;
  el('modal-wrap').classList.add('open');
}

function closeModal() { el('modal-wrap').classList.remove('open'); }

async function submitUpdate(oid) {
  const name = el('upd-name').value.trim();
  const phone = el('upd-phone').value.trim();
  const addr = el('upd-addr').value.trim();
  const city = el('upd-city').value.trim();
  const state = el('upd-state').value.trim();
  const country = el('upd-country').value.trim();
  if (!name || !phone || !addr || !city || !state || !country) { toast('Please fill all required fields', 'warn'); return; }

  const btn = el('upd-submit');
  btn.disabled = true; btn.textContent = 'Saving…';

  const res = await api('PUT', `/api/orders/${oid}`, {
    sourcePlatformOid: oid, platformOid: oid,
    platformOrderStatus: 'NOT_SHIPPED',
    consigneeName: name, phone, address: addr,
    receiverCity: city, receiverProvince: state,
    receiverCountry: country,
    postCode: el('upd-zip').value.trim(),
    deliveryCourier: el('upd-courier').value.trim(),
    goodsUpdateList: [],
  });

  btn.disabled = false; btn.textContent = 'Save Changes';
  if (res.success) { toast('Order updated'); closeModal(); openPanel(oid); }
  else toast(res.message || 'Update failed', 'error');
}

// ─── New Order ────────────────────────────────────────────────────────────────
async function initNewOrder() {
  newOrderItems = [];
  el('page-actions').innerHTML = '';

  // Preload catalog in background
  if (!catalog.styles.length) {
    Promise.all([
      api('GET', '/api/catalog/styles').then(d => { if (Array.isArray(d)) catalog.styles = d; }),
      api('GET', '/api/catalog/colors').then(d => { if (Array.isArray(d)) catalog.colors = d; }),
      api('GET', '/api/catalog/sizes').then(d  => { if (Array.isArray(d)) catalog.sizes  = d; }),
    ]).then(() => renderItems());
  }

  const orderId = genOrderId();
  el('view-new-order').innerHTML = `
    <div class="max-w-3xl mx-auto">
      <form id="order-form" onsubmit="submitNewOrder(event)">

        <!-- Order Info -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h3 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span class="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            Order Info
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 sm:col-span-1">
              <label class="form-label">Order ID * <span class="text-slate-400 font-normal">(must be unique)</span></label>
              <input id="f-oid" class="form-input font-mono text-sm" value="${orderId}" required>
            </div>
            <div>
              <label class="form-label">Carrier</label>
              <input id="f-courier" class="form-input" placeholder="USPS / UPS / FedEx">
            </div>
            <div class="col-span-2">
              <label class="form-label">Order Time *</label>
              <input id="f-ordertime" class="form-input" value="${nowStr()}" required>
            </div>
          </div>
        </div>

        <!-- Recipient -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <h3 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span class="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            Recipient
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="form-label">Full Name *</label><input id="f-name" class="form-input" required></div>
            <div><label class="form-label">Phone *</label><input id="f-phone" class="form-input" required></div>
            <div class="col-span-2"><label class="form-label">Address Line 1 *</label><input id="f-addr1" class="form-input" required></div>
            <div class="col-span-2"><label class="form-label">Address Line 2</label><input id="f-addr2" class="form-input"></div>
            <div><label class="form-label">City *</label><input id="f-city" class="form-input" required></div>
            <div><label class="form-label">State / Province *</label><input id="f-state" class="form-input" required></div>
            <div><label class="form-label">ZIP Code <span class="text-red-400">*</span></label><input id="f-zip" class="form-input" required></div>
            <div><label class="form-label">Country *</label><input id="f-country" class="form-input" value="US" required></div>
          </div>
        </div>

        <!-- Items -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
              <span class="w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
              Items
            </h3>
            <button type="button" onclick="addOrderItem()" class="btn btn-secondary text-xs">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
              Add Item
            </button>
          </div>
          <div id="items-container">
            <div class="text-slate-400 text-sm text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
              No items yet — click <strong>Add Item</strong> to start
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end gap-3 pb-8">
          <button type="button" onclick="navigate('orders')" class="btn btn-secondary">Cancel</button>
          <button type="submit" id="submit-btn" class="btn btn-primary px-8">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            Place Order
          </button>
        </div>
      </form>
    </div>`;

  // Event delegation for item field changes
  el('items-container').addEventListener('change', onItemFieldChange);
  el('items-container').addEventListener('input', onItemFieldChange);
}

function onItemFieldChange(e) {
  const input = e.target;
  const idx = parseInt(input.dataset.idx);
  const field = input.dataset.field;
  if (isNaN(idx) || !field || !newOrderItems[idx]) return;
  newOrderItems[idx][field] = input.value;
  // Auto-fill names from codes
  if (field === 'styleCode') {
    const s = catalog.styles.find(x => x.styleCode === input.value);
    if (s) newOrderItems[idx].styleName = s.styleName;
  }
  if (field === 'colorCode') {
    const c = catalog.colors.find(x => x.colorCode === input.value);
    if (c) newOrderItems[idx].colorName = c.colorName;
  }
  if (field === 'sizeCode') {
    const z = catalog.sizes.find(x => x.sizeCode === input.value);
    if (z) newOrderItems[idx].sizeName = z.sizeName;
  }
}

function addOrderItem() {
  const oid = el('f-oid')?.value || '';
  const idx = newOrderItems.length;
  newOrderItems.push({
    title:'', styleCode:'', styleName:'', colorCode:'', colorName:'',
    sizeCode:'', sizeName:'', craftType:1, num:1,
    printUrl:'', mockupUrl:'',
    printCode:`print_${oid}_${idx+1}`,
    mockupCode:`mockup_${oid}_${idx+1}`,
    printPosition:'', specification:'', remark:'',
  });
  renderItems();
}

function removeOrderItem(idx) {
  newOrderItems.splice(idx, 1);
  renderItems();
}

function renderItems() {
  const container = el('items-container');
  if (!container) return;
  if (!newOrderItems.length) {
    container.innerHTML = `<div class="text-slate-400 text-sm text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">No items yet — click <strong>Add Item</strong> to start</div>`;
    return;
  }
  container.innerHTML = newOrderItems.map((item, i) => renderItemCard(item, i)).join('');
}

function styleOptions(selected) {
  if (!catalog.styles.length) return `<option value="${selected}">${selected||'Loading…'}</option>`;
  return `<option value="">— Select Style —</option>` +
    catalog.styles.map(s => `<option value="${s.styleCode}" ${s.styleCode===selected?'selected':''}>${s.styleName} (${s.styleCode})</option>`).join('');
}
function colorOptions(selected) {
  if (!catalog.colors.length) return `<option value="${selected}">${selected||'Loading…'}</option>`;
  return `<option value="">— Select Color —</option>` +
    catalog.colors.map(c => `<option value="${c.colorCode}" ${c.colorCode===selected?'selected':''}>${c.colorName} (${c.colorCode})</option>`).join('');
}
function sizeOptions(selected) {
  if (!catalog.sizes.length) return `<option value="${selected}">${selected||'Loading…'}</option>`;
  return `<option value="">— Select Size —</option>` +
    catalog.sizes.map(z => `<option value="${z.sizeCode}" ${z.sizeCode===selected?'selected':''}>${z.sizeName} (${z.sizeCode})</option>`).join('');
}

function renderItemCard(item, i) {
  const printThumb  = item.printUrl  ? `<img src="${item.printUrl}"  class="mt-2 h-14 rounded-lg object-cover border border-slate-200" />` : '';
  const mockupThumb = item.mockupUrl ? `<img src="${item.mockupUrl}" class="mt-2 h-14 rounded-lg object-cover border border-slate-200" />` : '';
  return `
    <div class="item-card" id="item-card-${i}">
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-slate-700">Item #${i+1}</span>
        <button type="button" onclick="removeOrderItem(${i})" class="btn btn-ghost p-1 text-slate-400 hover:text-red-500">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="form-label">Product Title *</label>
          <input class="form-input text-sm" data-idx="${i}" data-field="title" value="${item.title}" placeholder="e.g. Custom Print T-Shirt" required>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="form-label">Style *</label>
            <select class="form-input form-select text-sm" data-idx="${i}" data-field="styleCode">${styleOptions(item.styleCode)}</select>
          </div>
          <div>
            <label class="form-label">Color *</label>
            <select class="form-input form-select text-sm" data-idx="${i}" data-field="colorCode">${colorOptions(item.colorCode)}</select>
          </div>
          <div>
            <label class="form-label">Size *</label>
            <select class="form-input form-select text-sm" data-idx="${i}" data-field="sizeCode">${sizeOptions(item.sizeCode)}</select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Craft Type *</label>
            <select class="form-input form-select text-sm" data-idx="${i}" data-field="craftType">
              <option value="1" ${item.craftType==1?'selected':''}>Heat Transfer (烫画)</option>
              <option value="2" ${item.craftType==2?'selected':''}>DTG Direct-to-Garment (直喷)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Quantity *</label>
            <input type="number" min="1" class="form-input text-sm" data-idx="${i}" data-field="num" value="${item.num}">
          </div>
        </div>
        <!-- Optional Fields -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="form-label">Print Position</label>
            <select class="form-input form-select text-sm" data-idx="${i}" data-field="printPosition">
              <option value="" ${!item.printPosition?'selected':''}>— None —</option>
              <option value="1" ${item.printPosition==='1'?'selected':''}>Front</option>
              <option value="2" ${item.printPosition==='2'?'selected':''}>Back</option>
              <option value="1,2" ${item.printPosition==='1,2'?'selected':''}>Both (Front & Back)</option>
            </select>
          </div>
          <div>
            <label class="form-label">Specification</label>
            <input class="form-input text-sm" data-idx="${i}" data-field="specification" value="${item.specification||''}" placeholder="e.g. Black/XL">
          </div>
          <div>
            <label class="form-label">Remark</label>
            <input class="form-input text-sm" data-idx="${i}" data-field="remark" value="${item.remark||''}" placeholder="Optional note">
          </div>
        </div>

        <!-- Images -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Print Image * <span class="text-slate-400 font-normal text-xs">(PNG, what gets printed)</span></label>
            <div id="upload-print-${i}" class="upload-zone${item.printUrl?' uploaded':''}" onclick="triggerUpload(${i},'print')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,${i},'print')">
              ${item.printUrl
                ? `<div class="flex flex-col items-center gap-1"><span class="text-emerald-600 text-lg">✓</span><span class="text-xs font-medium text-emerald-700">Uploaded</span>${printThumb}<button type="button" onclick="event.stopPropagation();clearImage(${i},'print')" class="text-xs text-red-500 mt-1">Remove</button></div>`
                : `<div class="flex flex-col items-center gap-1.5 text-slate-400"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span class="text-xs font-medium">Upload Print Image</span><span class="text-xs">Click or drag &amp; drop PNG</span></div>`}
            </div>
            <input type="file" id="file-print-${i}" accept="image/png,image/jpeg,image/jpg" class="hidden" onchange="handleFileSelect(event,${i},'print')">
          </div>
          <div>
            <label class="form-label">Mockup Image * <span class="text-slate-400 font-normal text-xs">(preview/effect)</span></label>
            <div id="upload-mockup-${i}" class="upload-zone${item.mockupUrl?' uploaded':''}" onclick="triggerUpload(${i},'mockup')" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event,${i},'mockup')">
              ${item.mockupUrl
                ? `<div class="flex flex-col items-center gap-1"><span class="text-emerald-600 text-lg">✓</span><span class="text-xs font-medium text-emerald-700">Uploaded</span>${mockupThumb}<button type="button" onclick="event.stopPropagation();clearImage(${i},'mockup')" class="text-xs text-red-500 mt-1">Remove</button></div>`
                : `<div class="flex flex-col items-center gap-1.5 text-slate-400"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span class="text-xs font-medium">Upload Mockup Image</span><span class="text-xs">Click or drag &amp; drop</span></div>`}
            </div>
            <input type="file" id="file-mockup-${i}" accept="image/*" class="hidden" onchange="handleFileSelect(event,${i},'mockup')">
          </div>
        </div>
      </div>
    </div>`;
}

// Image upload handlers
function triggerUpload(idx, type) { el(`file-${type}-${idx}`).click(); }

function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e, idx, type) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) uploadImage(file, idx, type);
}
function handleFileSelect(e, idx, type) {
  const file = e.target.files[0];
  if (file) uploadImage(file, idx, type);
}

async function uploadImage(file, idx, type) {
  const zone = el(`upload-${type}-${idx}`);
  zone.innerHTML = `<div class="flex flex-col items-center gap-2 text-blue-600"><svg class="spinner w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span class="text-xs font-medium">Uploading…</span></div>`;

  const formData = new FormData();
  formData.append('file', file);
  let result;
  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    result = await res.json();
  } catch (err) {
    toast('Upload failed: ' + err.message, 'error');
    renderItems(); return;
  }

  if (result.url) {
    if (type === 'print')   { newOrderItems[idx].printUrl  = result.url; newOrderItems[idx].printCode  = result.public_id || `print_${idx}`; }
    if (type === 'mockup')  { newOrderItems[idx].mockupUrl = result.url; newOrderItems[idx].mockupCode = result.public_id || `mockup_${idx}`; }
    toast('Image uploaded ✓', 'success');
    renderItems();
  } else {
    toast('Upload error: ' + (result.error || 'Unknown'), 'error');
    renderItems();
  }
}

function clearImage(idx, type) {
  if (type === 'print')  { newOrderItems[idx].printUrl = '';  newOrderItems[idx].printCode = ''; }
  if (type === 'mockup') { newOrderItems[idx].mockupUrl = ''; newOrderItems[idx].mockupCode = ''; }
  renderItems();
}

async function submitNewOrder(e) {
  e.preventDefault();
  // Validate items
  if (!newOrderItems.length) { toast('Add at least one item', 'warn'); return; }
  for (let i = 0; i < newOrderItems.length; i++) {
    const item = newOrderItems[i];
    if (!item.title)     { toast(`Item #${i+1}: title is required`, 'warn'); return; }
    if (!item.styleCode) { toast(`Item #${i+1}: style is required`, 'warn'); return; }
    if (!item.colorCode) { toast(`Item #${i+1}: color is required`, 'warn'); return; }
    if (!item.sizeCode)  { toast(`Item #${i+1}: size is required`, 'warn'); return; }
    if (!item.printUrl)  { toast(`Item #${i+1}: print image is required`, 'warn'); return; }
    if (!item.mockupUrl) { toast(`Item #${i+1}: mockup image is required`, 'warn'); return; }
  }

  const oid = el('f-oid').value.trim();
  const btn = el('submit-btn');
  btn.disabled = true;
  btn.innerHTML = `<svg class="spinner w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Placing Order…`;

  const goodsList = newOrderItems.map((item, i) => ({
    platformOid: oid,
    platformOlId: `${oid}${String(i+1).padStart(3,'0')}`,
    goodsType: 1,
    title: item.title,
    goodsStatus: 'NOT_SHIPPED',
    refundStatus: 'NO_REFUND',
    sizeCode: item.sizeCode,
    sizeName: item.sizeName || item.sizeCode,
    colorCode: item.colorCode,
    colorName: item.colorName || item.colorCode,
    styleCode: item.styleCode,
    styleName: item.styleName || item.styleCode,
    craftType: parseInt(item.craftType),
    num: parseInt(item.num) || 1,
    ...(item.printPosition ? { printPosition: item.printPosition } : {}),
    ...(item.specification ? { specification: item.specification } : {}),
    ...(item.remark ? { remark: item.remark } : {}),
    imageList: [
      { type: 1, imageUrl: item.printUrl,  imageCode: item.printCode  || `print_${oid}_${i}`,  imageName: item.printCode  || `print_${oid}_${i}` },
      { type: 2, imageUrl: item.mockupUrl, imageCode: item.mockupCode || `mockup_${oid}_${i}`, imageName: item.mockupCode || `mockup_${oid}_${i}` },
    ],
  }));

  const payload = {
    platformType: 15,
    sourcePlatformOid: oid,
    platformOrderStatus: 'NOT_SHIPPED',
    platformRefundStatus: 'NO_REFUND',
    platformOid: oid,
    consigneeName: el('f-name').value.trim(),
    phone: el('f-phone').value.trim(),
    address: el('f-addr1').value.trim(),
    addressOptional: el('f-addr2').value.trim(),
    receiverCountry: el('f-country').value.trim(),
    receiverProvince: el('f-state').value.trim(),
    receiverCity: el('f-city').value.trim(),
    postCode: el('f-zip').value.trim(),
    orderTime: el('f-ordertime').value.trim(),
    deliveryCourier: el('f-courier').value.trim(),
    goodsList,
  };

  const res = await api('POST', '/api/orders', payload);
  btn.disabled = false;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Place Order`;

  if (res.success) {
    toast(`Order ${oid} placed successfully!`, 'success');
    navigate('orders');
  } else {
    toast(res.message || 'Failed to place order', 'error');
  }
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
async function loadCatalog() {
  el('view-catalog').innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-4 border-b border-slate-100">
        <div class="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          <button class="tab-btn active" id="tab-styles"  onclick="showCatalogTab('styles')">Styles</button>
          <button class="tab-btn"        id="tab-colors"  onclick="showCatalogTab('colors')">Colors</button>
          <button class="tab-btn"        id="tab-sizes"   onclick="showCatalogTab('sizes')">Sizes</button>
        </div>
      </div>
      <div id="catalog-content" class="p-4"><div class="text-slate-400 text-sm text-center py-8">Loading…</div></div>
    </div>`;

  const [styles, colors, sizes] = await Promise.all([
    api('GET', '/api/catalog/styles'),
    api('GET', '/api/catalog/colors'),
    api('GET', '/api/catalog/sizes'),
  ]);
  if (Array.isArray(styles)) catalog.styles = styles;
  if (Array.isArray(colors)) catalog.colors = colors;
  if (Array.isArray(sizes))  catalog.sizes  = sizes;
  showCatalogTab('styles');
}

function showCatalogTab(tab) {
  document.querySelectorAll('[id^=tab-]').forEach(b => b.classList.remove('active'));
  el(`tab-${tab}`).classList.add('active');
  const content = el('catalog-content');

  if (tab === 'styles') {
    content.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      ${catalog.styles.map(s => `
        <div class="border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-semibold text-slate-800 text-sm">${s.styleName}</p>
              <p class="font-mono text-xs text-blue-600 mt-0.5">${s.styleCode}</p>
            </div>
            <div class="flex gap-1">
              ${(String(s.craftType||'').split(',').map(c => c.trim())).map(c =>
                `<span class="text-xs px-1.5 py-0.5 rounded-full ${c==='1'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}">${c==='1'?'HT':'DTG'}</span>`
              ).join('')}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
  } else if (tab === 'colors') {
    content.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      ${catalog.colors.map(c => `
        <div class="flex items-center gap-2.5 border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition">
          <div class="w-5 h-5 rounded-full border border-slate-200 flex-shrink-0 bg-slate-200"></div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800 truncate">${c.colorName}</p>
            <p class="font-mono text-xs text-slate-400">${c.colorCode}</p>
          </div>
        </div>`).join('')}
    </div>`;
  } else {
    content.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
      ${catalog.sizes.map(z => `
        <div class="border border-slate-100 rounded-xl p-3 text-center hover:bg-slate-50 transition">
          <p class="font-bold text-slate-800">${z.sizeCode}</p>
          <p class="text-xs text-slate-400 mt-0.5">${z.sizeName !== z.sizeCode ? z.sizeName : ''}</p>
        </div>`).join('')}
    </div>`;
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────
async function loadSettings() {
  const cfg = await api('GET', '/api/settings');
  el('view-settings').innerHTML = `
    <div class="max-w-2xl mx-auto space-y-4">

      <!-- Supplier -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 class="font-semibold text-slate-900 mb-1">Supplier API</h3>
        <p class="text-sm text-slate-500 mb-5">riin.com fulfillment API credentials</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Secret Key *</label>
            <input id="s-key" class="form-input font-mono text-sm" value="${cfg.secret_key||''}" placeholder="Your API secret key">
          </div>
          <div>
            <label class="form-label">Base URL</label>
            <input id="s-url" class="form-input font-mono text-sm" value="${cfg.base_url||'https://tshirt.riin.com'}">
          </div>
          <div>
            <label class="form-label">Environment</label>
            <select id="s-env" class="form-input form-select">
              <option value="prod"  ${cfg.env==='prod'? 'selected':''}>Production — https://tshirt.riin.com</option>
              <option value="test"  ${cfg.env==='test'? 'selected':''}>Test — https://tshirt-test.riin.com</option>
              <option value="custom">Custom URL (use Base URL field)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Cloudinary -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 class="font-semibold text-slate-900 mb-1">Cloudinary</h3>
        <p class="text-sm text-slate-500 mb-5">Image hosting for order print files</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Cloud Name</label>
            <input id="s-cname" class="form-input" value="${cfg.cloudinary_cloud_name||''}" placeholder="your-cloud-name">
          </div>
          <div>
            <label class="form-label">API Key</label>
            <input id="s-ckey" class="form-input font-mono text-sm" value="${cfg.cloudinary_api_key||''}">
          </div>
          <div>
            <label class="form-label">API Secret</label>
            <input id="s-csecret" type="password" class="form-input font-mono text-sm" value="${cfg.cloudinary_api_secret||''}">
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3">
        <button onclick="testConnection()" class="btn btn-secondary">Test Connection</button>
        <button onclick="saveSettings()" class="btn btn-primary">Save Settings</button>
      </div>
      <div id="test-result" class="hidden rounded-xl p-4 text-sm"></div>
    </div>`;

  // Sync base URL when env changes
  el('s-env').addEventListener('change', e => {
    if (e.target.value === 'prod')  el('s-url').value = 'https://tshirt.riin.com';
    if (e.target.value === 'test')  el('s-url').value = 'https://tshirt-test.riin.com';
  });
}

async function saveSettings() {
  const env = el('s-env').value;
  const baseUrl = env === 'custom' ? el('s-url').value.trim() : (env === 'prod' ? 'https://tshirt.riin.com' : 'https://tshirt-test.riin.com');
  const res = await api('POST', '/api/settings', {
    secret_key: el('s-key').value.trim(),
    base_url: baseUrl,
    env,
    cloudinary_cloud_name: el('s-cname').value.trim(),
    cloudinary_api_key:    el('s-ckey').value.trim(),
    cloudinary_api_secret: el('s-csecret').value.trim(),
  });
  if (res.success) {
    toast('Settings saved', 'success');
    updateEnvBadge(env);
  } else toast('Save failed', 'error');
}

async function testConnection() {
  const box = el('test-result');
  box.className = 'rounded-xl p-4 text-sm bg-slate-50 border border-slate-200';
  box.classList.remove('hidden');
  box.textContent = 'Testing connection…';
  const res = await api('GET', '/api/catalog/colors');
  if (Array.isArray(res) && res.length) {
    box.className = 'rounded-xl p-4 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700';
    box.textContent = `✓ Connected — ${res.length} colors available`;
  } else {
    box.className = 'rounded-xl p-4 text-sm bg-red-50 border border-red-200 text-red-700';
    box.textContent = '✕ Connection failed — check your API key and URL';
  }
}

function updateEnvBadge(env) {
  const badge = el('env-badge');
  if (env === 'prod') {
    badge.className = 'text-center py-1.5 px-3 rounded-lg bg-emerald-950 text-emerald-400 text-xs font-medium';
    badge.textContent = '● Production';
  } else {
    badge.className = 'text-center py-1.5 px-3 rounded-lg bg-amber-950 text-amber-400 text-xs font-medium';
    badge.textContent = '● Test Mode';
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────
async function logout() {
  await api('POST', '/api/auth/logout');
  window.location.href = '/login';
}

// ─── Users Management (Admin) ─────────────────────────────────────────────────
async function loadUsers() {
  el('page-actions').innerHTML = `<button class="btn btn-primary" onclick="openCreateUserModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>Add User</button>`;
  el('view-users').innerHTML = `<div class="text-slate-400 text-sm py-8 text-center">Loading…</div>`;
  const users = await api('GET', '/api/users');
  if (users.error) { el('view-users').innerHTML = `<div class="text-red-500 text-sm py-8 text-center">${users.error}</div>`; return; }
  el('view-users').innerHTML = `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b border-slate-100">
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Username</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th class="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
            <th class="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            ${users.map(u => `
              <tr class="border-b border-slate-50 hover:bg-slate-50">
                <td class="px-5 py-3.5 font-mono text-xs font-medium text-slate-700">${u.username}</td>
                <td class="px-5 py-3.5 text-slate-800">${u.full_name || '—'}</td>
                <td class="px-5 py-3.5">${u.is_admin ? '<span class="status-badge bg-violet-100 text-violet-700">Admin</span>' : '<span class="status-badge bg-slate-100 text-slate-600">User</span>'}</td>
                <td class="px-5 py-3.5">${u.is_active ? '<span class="status-badge bg-emerald-100 text-emerald-700">Active</span>' : '<span class="status-badge bg-red-100 text-red-700">Disabled</span>'}</td>
                <td class="px-5 py-3.5 text-slate-400 text-xs">${fmtDate(u.created_at)}</td>
                <td class="px-5 py-3.5 flex gap-1">
                  <button onclick='openEditUserModal(${JSON.stringify(u).replace(/'/g,"&#39;")})' class="btn btn-ghost text-xs p-1.5" title="Edit">✏️</button>
                  <button onclick="deleteUser(${u.id},'${u.username}')" class="btn btn-ghost text-xs p-1.5 text-red-500" title="Delete">🗑️</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Change Password Section -->
    <div class="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-md">
      <h3 class="font-semibold text-slate-800 mb-4">Change My Password</h3>
      <div class="space-y-3">
        <div><label class="form-label">Current Password</label><input id="cp-current" type="password" class="form-input"></div>
        <div><label class="form-label">New Password</label><input id="cp-new" type="password" class="form-input"></div>
        <button onclick="changeMyPassword()" class="btn btn-secondary">Update Password</button>
      </div>
    </div>`;
}

function openCreateUserModal() {
  el('modal-box').innerHTML = `
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Create New User</h3>
      <button onclick="closeModal()" class="btn btn-ghost p-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="p-6 space-y-4">
      <div><label class="form-label">Username *</label><input id="nu-user" class="form-input" placeholder="e.g. john" autofocus></div>
      <div><label class="form-label">Full Name</label><input id="nu-name" class="form-input" placeholder="e.g. John Smith"></div>
      <div><label class="form-label">Password *</label><input id="nu-pass" type="password" class="form-input" placeholder="Min 4 characters"></div>
      <div class="flex items-center gap-2">
        <input id="nu-admin" type="checkbox" class="w-4 h-4 rounded border-slate-300">
        <label for="nu-admin" class="text-sm text-slate-700">Admin privileges</label>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
      <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
      <button onclick="submitCreateUser()" class="btn btn-primary">Create User</button>
    </div>`;
  el('modal-wrap').classList.add('open');
  setTimeout(() => el('nu-user').focus(), 50);
}

async function submitCreateUser() {
  const username = el('nu-user').value.trim();
  const password = el('nu-pass').value;
  const full_name = el('nu-name').value.trim();
  const is_admin = el('nu-admin').checked;
  if (!username || !password) { toast('Username and password required', 'warn'); return; }
  const res = await api('POST', '/api/users', { username, password, full_name, is_admin });
  if (res.success) { toast('User created'); closeModal(); loadUsers(); }
  else toast(res.message || 'Failed', 'error');
}

function openEditUserModal(user) {
  el('modal-box').innerHTML = `
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 class="font-semibold text-slate-900">Edit User — ${user.username}</h3>
      <button onclick="closeModal()" class="btn btn-ghost p-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="p-6 space-y-4">
      <div><label class="form-label">Full Name</label><input id="eu-name" class="form-input" value="${user.full_name||''}"></div>
      <div><label class="form-label">New Password <span class="text-slate-400 font-normal">(leave blank to keep current)</span></label><input id="eu-pass" type="password" class="form-input" placeholder="Leave blank to keep current"></div>
      <div class="flex items-center gap-2">
        <input id="eu-admin" type="checkbox" class="w-4 h-4 rounded border-slate-300" ${user.is_admin?'checked':''}>
        <label for="eu-admin" class="text-sm text-slate-700">Admin privileges</label>
      </div>
      <div class="flex items-center gap-2">
        <input id="eu-active" type="checkbox" class="w-4 h-4 rounded border-slate-300" ${user.is_active?'checked':''}>
        <label for="eu-active" class="text-sm text-slate-700">Account active</label>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
      <button onclick="closeModal()" class="btn btn-secondary">Cancel</button>
      <button onclick="submitEditUser(${user.id})" class="btn btn-primary">Save Changes</button>
    </div>`;
  el('modal-wrap').classList.add('open');
}

async function submitEditUser(uid) {
  const data = {
    full_name: el('eu-name').value.trim(),
    is_admin: el('eu-admin').checked,
    is_active: el('eu-active').checked,
  };
  const pw = el('eu-pass').value;
  if (pw) data.password = pw;
  const res = await api('PUT', `/api/users/${uid}`, data);
  if (res.success) { toast('User updated'); closeModal(); loadUsers(); }
  else toast(res.message || 'Failed', 'error');
}

async function deleteUser(uid, username) {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
  const res = await api('DELETE', `/api/users/${uid}`);
  if (res.success) { toast('User deleted'); loadUsers(); }
  else toast(res.message || 'Failed', 'error');
}

async function changeMyPassword() {
  const current = el('cp-current').value;
  const newPw = el('cp-new').value;
  if (!current || !newPw) { toast('Fill both fields', 'warn'); return; }
  const res = await api('POST', '/api/auth/change-password', { current_password: current, new_password: newPw });
  if (res.success) { toast('Password updated'); el('cp-current').value = ''; el('cp-new').value = ''; }
  else toast(res.message || 'Failed', 'error');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
(async () => {
  // Check auth
  const me = await api('GET', '/api/auth/me');
  if (me.error) { window.location.href = '/login'; return; }

  // Show user info
  const nameEl = el('current-user-name');
  if (nameEl) nameEl.textContent = me.full_name || me.username;

  // Show Users nav for admins
  if (me.is_admin) {
    const navUsers = el('nav-users');
    if (navUsers) navUsers.style.display = '';
  }

  const cfg = await api('GET', '/api/settings');
  updateEnvBadge(cfg.env || 'prod');
  navigate('dashboard');
})();
