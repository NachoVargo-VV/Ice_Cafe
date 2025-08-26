// БАЗОВЫЕ НАСТРОЙКИ API
// Укажите адрес вашего backend (Cloudflare Worker) — см. шаги деплоя ниже.
const API_BASE = 'https://YOUR_WORKER_SUBDOMAIN.workers.dev'; // замените на свой

// Всё, что ниже — ваш исходный код, с точечными правками для сервера (POST/GET/PUT/DELETE заявок)

const STORAGE_KEYS = {
  items: 'iceCafe_items',
  admin: 'iceCafe_adminUnlocked',
  adminAdvanced: 'iceCafe_adminAdvancedUnlocked',
  users: 'iceCafe_users',
  currentUserId: 'iceCafe_currentUserId',
  orders: 'iceCafe_orders',
  blacklist: 'iceCafe_blacklist',
  schedule: 'iceCafe_schedule',
  footerContacts: 'iceCafe_footerContacts',
  footerVacancies: 'iceCafe_footerVacancies',

  tgStaffBotToken: 'iceCafe_tgStaffBotToken',
  tgStaffChatId: 'iceCafe_tgStaffChatId',
  tgStaffLastUpdateId: 'iceCafe_tgStaffLastUpdateId',
  tgMsgMap: 'iceCafe_tgMsgMap',
  tgRoles: 'iceCafe_tgRoles',

  tgClientBotToken: 'iceCafe_tgClientBotToken',
  tgClientLastUpdateId: 'iceCafe_tgClientLastUpdateId',
  tgClients: 'iceCafe_tgClients',
  tgClientCarts: 'iceCafe_tgClientCarts',

  nextOrderNumber: 'iceCafe_nextOrderNumber',

  brandLogo: 'iceCafe_brandLogo',
  themeVars: 'iceCafe_themeVars',
  customCategories: 'iceCafe_customCategories',
  hiddenCategories: 'iceCafe_hiddenCategories'
};

const defaultSchedule = 'Ежедневно 10:00–22:00';
const defaultContacts = 'Тел: +7 (000) 000-00-00<br/>Адрес: г. Ваш город, Ул. Вкусная, 1';
const defaultVacancies = 'Сейчас открытых вакансий нет.';

function cryptoRandomId(){ if (window.crypto?.getRandomValues){ const b=new Uint8Array(16); crypto.getRandomValues(b); return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join(''); } return 'id-'+Math.random().toString(36).slice(2); }

const defaultItems = [
  { id: cryptoRandomId(), name: 'Куриное филе гриль', category: 'Горячее', pricePer100: 190, image: '', available: true, byWeight: true },
  { id: cryptoRandomId(), name: 'Пюре картофельное', category: 'Горячее', pricePer100: 70, image: '', available: true, byWeight: true },
  { id: cryptoRandomId(), name: 'Окрошка', category: 'Холодное', pricePer100: 120, image: '', available: true, byWeight: true },
  { id: cryptoRandomId(), name: 'Салат Греческий', category: 'Салаты', pricePer100: 150, image: '', available: true, byWeight: true },
  { id: cryptoRandomId(), name: 'Чизкейк (кусок)', category: 'Десерты', pricePer100: 220, image: '', available: true, byWeight: false },
  { id: cryptoRandomId(), name: 'Морс клюквенный (0.5л)', category: 'Напитки', pricePer100: 60, image: '', available: true, byWeight: false },

  { id: cryptoRandomId(), name: 'Ложка', category: 'Комплект', pricePer100: 5, image: '', available: true, byWeight: false },
  { id: cryptoRandomId(), name: 'Вилка', category: 'Комплект', pricePer100: 5, image: '', available: true, byWeight: false },
  { id: cryptoRandomId(), name: 'Салфетки (пачка)', category: 'Комплект', pricePer100: 20, image: '', available: true, byWeight: false },
  { id: cryptoRandomId(), name: 'Контейнер', category: 'Комплект', pricePer100: 15, image: '', available: true, byWeight: false }
];

const ORDER_STATUSES = ['Новый','Принят','В доставке','Отменён'];
const EDIT_ALLOWED = new Set([]); // редактирование в «Мои заказы» отключено

let state = {
  items: [],
  cart: [],
  selectedCategory: 'Все',
  adminUnlocked: false,
  adminAdvancedUnlocked: false,
  users: [],
  currentUser: null,
  orders: [],
  blacklist: [],
  adminTab: 'items',
  adminItemsCategory: 'Все',
  schedule: '',
  footerContacts: '',
  footerVacancies: '',

  tgStaffBotToken: '',
  tgStaffChatId: '',
  tgStaffLastUpdateId: 0,
  tgMsgMap: {},
  tgRoles: {},

  tgClientBotToken: '',
  tgClientLastUpdateId: 0,
  tgClients: [],
  tgClientCarts: {},

  staffPollingTimer: null,
  clientPollingTimer: null,

  currentEditingOrderId: null,
  nextOrderNumber: 1,

  themeVars: {},
  brandLogo: '',

  customCategories: [],
  hiddenCategories: []
};

const elements = {
  scheduleDisplay: document.getElementById('scheduleDisplay'),
  adminSecret: document.getElementById('adminSecret'),

  categories: document.getElementById('categories'),
  grid: document.getElementById('grid'),
  resultInfo: document.getElementById('resultInfo'),

  cartEmpty: document.getElementById('cartEmpty'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  cartCount: document.getElementById('cartCount'),
  clearCartBtn: document.getElementById('clearCartBtn'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  openCartBtn: document.getElementById('openCartBtn'),

  adminPanel: document.getElementById('adminPanel'),
  adminTabs: document.getElementById('adminTabs'),
  adminCloseBtn: document.getElementById('adminCloseBtn'),
  adminAdvancedSecret: document.getElementById('adminAdvancedSecret'),

  adminCategories: document.getElementById('adminCategories'),
  adminItems: document.getElementById('adminItems'),
  adminAddForm: document.getElementById('adminAddForm'),
  addName: document.getElementById('addName'),
  addCategory: document.getElementById('addCategory'),
  addPrice100: document.getElementById('addPrice100'),
  addImage: document.getElementById('addImage'),
  addByWeight: document.getElementById('addByWeight'),

  adminOrders: document.getElementById('adminOrders'),

  staffTgForm: document.getElementById('staffTgForm'),
  staffTgBotToken: document.getElementById('staffTgBotToken'),
  staffTgChatId: document.getElementById('staffTgChatId'),

  clientTgForm: document.getElementById('clientTgForm'),
  clientTgBotToken: document.getElementById('clientTgBotToken'),

  rolesForm: document.getElementById('rolesForm'),
  roleUserId: document.getElementById('roleUserId'),
  roleType: document.getElementById('roleType'),
  rolesList: document.getElementById('rolesList'),

  tgClientsList: document.getElementById('tgClientsList'),

  blacklistForm: document.getElementById('blacklistForm'),
  blacklistPhone: document.getElementById('blacklistPhone'),
  adminBlacklist: document.getElementById('adminBlacklist'),

  scheduleForm: document.getElementById('scheduleForm'),
  scheduleText: document.getElementById('scheduleText'),
  footerForm: document.getElementById('footerForm'),
  footerContacts: document.getElementById('footerContacts'),
  footerVacancies: document.getElementById('footerVacancies'),
  footerContactsView: document.getElementById('footerContactsView'),
  footerVacanciesView: document.getElementById('footerVacanciesView'),

  myOrdersBtn: document.getElementById('myOrdersBtn'),
  ordersModal: document.getElementById('ordersModal'),
  ordersModalClose: document.getElementById('ordersModalClose'),
  ordersList: document.getElementById('ordersList'),

  modal: document.getElementById('modal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  copyOrderBtn: document.getElementById('copyOrderBtn'),
  clientName: document.getElementById('clientName'),
  clientPhone: document.getElementById('clientPhone'),
  clientAddress: document.getElementById('clientAddress'),
  clientNote: document.getElementById('clientNote'),
  orderSummary: document.getElementById('orderSummary'),
  submitOrderBtn: document.getElementById('submitOrderBtn'),
  orderWarning: document.getElementById('orderWarning'),

  tabItems: document.getElementById('tab-items'),
  tabOrders: document.getElementById('tab-orders'),
  tabBots: document.getElementById('tab-bots'),
  tabSettings: document.getElementById('tab-settings'),
  tabBlacklist: document.getElementById('tab-blacklist'),
  tabSchedule: document.getElementById('tab-schedule'),
  tabFooter: document.getElementById('tab-footer'),
  tabCategories: document.getElementById('tab-categories'),

  imageModal: document.getElementById('imageModal'),
  imageModalImg: document.getElementById('imageModalImg'),
  imageModalTitle: document.getElementById('imageModalTitle'),
  imageModalCaption: document.getElementById('imageModalCaption'),
  imageModalClose: document.getElementById('imageModalClose'),

  categoryManager: document.getElementById('categoryManager'),
  addCategoryForm: document.getElementById('addCategoryForm'),
  addCategoryName: document.getElementById('addCategoryName'),
};

function bind(el, ev, fn){ if(el) el.addEventListener(ev, fn); }
function toCurrency(n){ try{ return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n);}catch{ return Math.round(n)+' ₽'; } }
function getPlaceholderImage(name){ const initial=(name||'B').trim().charAt(0).toUpperCase(); const bg1=encodeURIComponent('#ffd4c2'); const bg2=encodeURIComponent('#ff9aa2'); const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='600' height='372'>\n<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${bg1}'/><stop offset='100%' stop-color='${bg2}'/></linearGradient></defs>\n<rect width='100%' height='100%' fill='url(#g)'/>\n<text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Segoe UI, Arial' font-size='160' fill='rgba(255,255,255,0.9)' font-weight='700'>${initial}</text></svg>`; return 'data:image/svg+xml;utf8,'+svg; }
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const load=(k,fallback)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):fallback; }catch{ return fallback; } };
const normalizePhone=p=>(p||'').replace(/[^\d+]/g,'').replace(/^8/,'+7').replace(/^7/,'+7');

// API helpers
async function apiFetch(path, opts={}){
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...opts, headers: { 'Content-Type':'application/json', ...(opts.headers||{}) } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return await res.json();
}
async function apiGetOrders(){ return apiFetch('/api/orders'); }
async function apiCreateOrder(payload){ return apiFetch('/api/orders', { method:'POST', body: JSON.stringify(payload) }); }
async function apiUpdateOrder(id, payload){ return apiFetch(`/api/orders/${encodeURIComponent(id)}`, { method:'PUT', body: JSON.stringify(payload) }); }
async function apiDeleteOrder(id){ return apiFetch(`/api/orders/${encodeURIComponent(id)}`, { method:'DELETE' }); }

function loadItems(){
  const items=load(STORAGE_KEYS.items);
  if (Array.isArray(items)&&items.length) return items;
  const withPh=defaultItems.map(it=>({...it,image:getPlaceholderImage(it.name)}));
  save(STORAGE_KEYS.items,withPh); return withPh;
}
function saveItems(){ save(STORAGE_KEYS.items,state.items); }

const DEFAULT_CATEGORY_SET = ['Горячее','Холодное','Салаты','Десерты','Напитки','Комплект'];
function loadCustomCategories(){ return load(STORAGE_KEYS.customCategories,[])||[]; }
function saveCustomCategories(){ save(STORAGE_KEYS.customCategories,state.customCategories); }
function loadHiddenCategories(){ return load(STORAGE_KEYS.hiddenCategories,[])||[]; }
function saveHiddenCategories(){ save(STORAGE_KEYS.hiddenCategories,state.hiddenCategories); }
function allCategoriesForAdd(){ const set = new Set([...DEFAULT_CATEGORY_SET, ...state.customCategories]); return Array.from(set); }
function renderAddCategoryOptions(){
  const current = elements.addCategory.value;
  elements.addCategory.innerHTML = '';
  allCategoriesForAdd().forEach(cat=>{
    const o=document.createElement('option'); o.value=cat; o.textContent=cat; elements.addCategory.appendChild(o);
  });
  if(current && allCategoriesForAdd().includes(current)) elements.addCategory.value=current;
}

function visibleForClients(cat){
  return !(state.hiddenCategories||[]).includes(cat);
}

function renderCategories(){
  const fromItems   = new Set(state.items.map(i=>i.category));
  const fromCustom  = new Set(state.customCategories||[]);
  const fromDefault = new Set(DEFAULT_CATEGORY_SET);
  let cats = Array.from(new Set(['Все', ...fromDefault, ...fromCustom, ...fromItems]));
  cats = cats.filter(c => c==='Все' || visibleForClients(c));

  elements.categories.innerHTML='';
  cats.forEach(cat=>{
    const b=document.createElement('button');
    b.className='category-btn'+(state.selectedCategory===cat?' active':'');
    b.textContent=cat;
    b.addEventListener('click',()=>{ state.selectedCategory=cat; renderProducts(); });
    elements.categories.appendChild(b);
  });
}

function createCard(item){
  const card=document.createElement('article'); card.className='card';
  const imgWrap=document.createElement('div'); imgWrap.className='card-img';
  const img=document.createElement('img'); img.alt=item.name; img.src=item.image||getPlaceholderImage(item.name); imgWrap.appendChild(img);
  imgWrap.addEventListener('click',()=> openImageModal(img.src, item.name, `${toCurrency(item.pricePer100)} ${item.byWeight?'за 100 г':'за шт'}`));

  const body=document.createElement('div'); body.className='card-body';
  const title=document.createElement('h3'); title.className='title'; title.textContent=item.name;
  const price100=document.createElement('div'); price100.className='price-per-100'; price100.textContent=toCurrency(item.pricePer100)+' '+(item.byWeight?'за 100 г':'за шт');
  if(item.byWeight){
    const minNote=document.createElement('div'); minNote.className='min-note'; minNote.textContent='Минимум 100 г';
    body.appendChild(title); body.appendChild(price100); body.appendChild(minNote);
  } else {
    body.appendChild(title); body.appendChild(price100);
  }

  const controlRow=document.createElement('div'); controlRow.className='control-row';
  const inputBox=document.createElement('label'); inputBox.className='grams-input';
  const input=document.createElement('input'); input.type='number'; input.inputMode='numeric'; input.ariaLabel=item.byWeight?'Граммы':'Штуки';
  if(item.byWeight){ input.min='100'; input.step='50'; input.value='200'; }
  else { input.min='1'; input.step='1'; input.value='1'; }
  inputBox.appendChild(input);
  const suffix=document.createElement('span'); suffix.textContent=item.byWeight?'г':'шт'; inputBox.appendChild(suffix);
  const addBtn=document.createElement('button'); addBtn.className='btn-add'; addBtn.textContent='Добавить'; addBtn.disabled=!item.available;

  input.addEventListener('input',()=>{
    const v=Math.max(0,Number(input.value)||0);
    if(item.byWeight) addBtn.disabled=!item.available||v<100; else addBtn.disabled=!item.available||v<1;
  });
  addBtn.addEventListener('click',()=>{
    const v=Math.max(0,Number(input.value)||0);
    if(item.byWeight){ if(v<100) return alert('Минимальный заказ 100 г'); addToCartWeight(item.id,v); }
    else { if(v<1) return; addToCartUnits(item.id, v); }
  });

  const extras = state.items.filter(x=>x.category==='Комплект' && x.available);
  if(extras.length){
    const extrasRow=document.createElement('div'); extrasRow.className='extras-row';
    const extrasSel=document.createElement('select');
    extras.forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=`${x.name} — ${toCurrency(x.pricePer100)}/шт`; extrasSel.appendChild(o); });
    const extrasQty=document.createElement('input'); extrasQty.type='number'; extrasQty.min='1'; extrasQty.step='1'; extrasQty.value='1';
    const extrasBtn=document.createElement('button'); extrasBtn.className='btn btn-ghost'; extrasBtn.type='button'; extrasBtn.textContent='+ Комплект';
    extrasBtn.addEventListener('click',()=>{
      const pid=extrasSel.value; const qty=Math.max(1, Number(extrasQty.value)||1);
      addToCartUnits(pid, qty);
    });
    extrasRow.appendChild(extrasSel); extrasRow.appendChild(extrasQty); extrasRow.appendChild(extrasBtn);
    body.appendChild(extrasRow);
  }

  const controlWrap=document.createElement('div'); controlWrap.className='control-row';
  controlWrap.appendChild(inputBox); controlWrap.appendChild(addBtn);
  body.appendChild(controlWrap);
  card.appendChild(imgWrap); card.appendChild(body);
  return card;
}

function renderProducts(){
  elements.resultInfo.textContent='';
  elements.grid.innerHTML='';

  if(state.selectedCategory==='Все'){
    const cats = Array.from(new Set([
      ...DEFAULT_CATEGORY_SET,
      ...(state.customCategories||[]),
      ...state.items.map(i=>i.category)
    ])).filter(c => visibleForClients(c));

    if(!cats.length){ elements.resultInfo.textContent='Категорий пока нет.'; return; }

    cats.forEach(cat=>{
      const h=document.createElement('div'); h.className='category-title'; h.textContent=cat;
      elements.grid.appendChild(h);
      const list = state.items.filter(i=>i.available && i.category===cat);
      if(!list.length){
        const note=document.createElement('div'); note.className='admin-note'; note.style.gridColumn='span 12'; note.textContent='Пока нет блюд в этой категории';
        elements.grid.appendChild(note);
      } else {
        list.forEach(item=>elements.grid.appendChild(createCard(item)));
      }
    });
    return;
  }

  const list = state.items.filter(i=>{
    if(state.selectedCategory==='Все') return i.available;
    if(!visibleForClients(state.selectedCategory)) return false;
    return i.available && i.category===state.selectedCategory;
  });

  if(!list.length){
    elements.resultInfo.textContent='В этой категории пока нет блюд.';
    return;
  }
  list.forEach(item=>elements.grid.appendChild(createCard(item)));
}

function addToCartWeight(id,grams){ const ex=state.cart.find(c=>c.id===id && !('units' in c)); if(ex) ex.grams+=grams; else state.cart.push({id,grams}); renderCart(); }
function addToCartUnits(id,units){ const ex=state.cart.find(c=>c.id===id && 'units' in c); if(ex) ex.units+=units; else state.cart.push({id,units}); renderCart(); }
function removeFromCart(id,isUnits){ state.cart=state.cart.filter(c=> !(c.id===id && (!!isUnits === ('units' in c)))); renderCart(); }
function updateCartGrams(id,grams){ const it=state.cart.find(c=>c.id===id && !('units' in c)); if(!it) return; it.grams=Math.max(0,grams); if(it.grams===0) removeFromCart(id,false); renderCart(); }
function updateCartUnits(id,units){ const it=state.cart.find(c=>c.id===id && 'units' in c); if(!it) return; it.units=Math.max(0,units); if(it.units===0) removeFromCart(id,true); renderCart(); }

function getCartTotal(){
  return state.cart.reduce((s,c)=>{
    const it=state.items.find(i=>i.id===c.id); if(!it) return s;
    if('units' in c) return s + (c.units * it.pricePer100);
    return s + (c.grams * it.pricePer100)/100;
  },0);
}

function renderCart(){
  elements.cartItems.innerHTML='';
  if(!state.cart.length){ elements.cartEmpty.style.display=''; elements.cartCount.textContent=''; }
  else { elements.cartEmpty.style.display='none'; elements.cartCount.textContent=`(${state.cart.length})`; }

  state.cart.forEach(row=>{
    const p=state.items.find(i=>i.id===row.id); if(!p) return;
    const isUnits = 'units' in row;
    const cost = isUnits ? (row.units*p.pricePer100) : (row.grams*p.pricePer100)/100;

    const line=document.createElement('div'); line.className='cart-item';
    const left=document.createElement('div');
    const title=document.createElement('div'); title.className='cart-item-title'; title.textContent=p.name;
    const sub=document.createElement('div'); sub.className='cart-item-sub'; sub.textContent=isUnits?`${row.units} шт • ${toCurrency(cost)}`:`${row.grams} г • ${toCurrency(cost)}`;
    left.appendChild(title); left.appendChild(sub);

    const controls=document.createElement('div'); controls.className='cart-controls';
    const input=document.createElement('input'); input.type='number';
    if(isUnits){ input.min='1'; input.step='1'; input.value=String(row.units); }
    else { input.min='100'; input.step='50'; input.value=String(row.grams); }
    input.addEventListener('input',()=>{
      const v=Number(input.value)||0;
      if(isUnits){ if(v>0&&v<1) input.value='1'; updateCartUnits(row.id, Number(input.value)||0); }
      else { if(v>0&&v<100) input.value='100'; updateCartGrams(row.id, Number(input.value)||0); }
    });
    const removeBtn=document.createElement('button'); removeBtn.className='btn btn-ghost'; removeBtn.textContent='Удалить';
    removeBtn.addEventListener('click',()=> removeFromCart(row.id, isUnits));

    controls.appendChild(input); controls.appendChild(removeBtn);
    line.appendChild(left); line.appendChild(controls);
    elements.cartItems.appendChild(line);
  });
  elements.cartTotal.textContent=toCurrency(getCartTotal());
}

function openImageModal(src, title, caption){ elements.imageModalImg.src=src; elements.imageModalTitle.textContent=title||'Просмотр'; elements.imageModalCaption.textContent=caption||''; elements.imageModal.style.display='flex'; }
function closeImageModal(){ elements.imageModal.style.display='none'; }

(function setupAdminSecret(){
  let clicks=0,t=null;
  elements.adminSecret.addEventListener('click',()=>{
    clicks++; clearTimeout(t); t=setTimeout(()=>{clicks=0;},1200);
    if(clicks>=3){
      clicks=0;
      const pass=prompt('Авторизация администратора. Введите пароль (подсказка: 1234)');
      if(pass==='1234'){ state.adminUnlocked=true; localStorage.setItem(STORAGE_KEYS.admin,'1'); elements.adminPanel.style.display='block'; renderAdmin(); alert('Админка открыта'); void refreshOrdersFromServer(); }
      else { alert('Неверный пароль'); }
    }
  });
})();
(function setupAdminAdvanced(){
  let clicks=0,t=null;
  document.getElementById('adminAdvancedSecret').addEventListener('click',()=>{
    clicks++; clearTimeout(t); t=setTimeout(()=>{clicks=0;},1200);
    if(clicks>=3){
      clicks=0;
      state.adminAdvancedUnlocked = !state.adminAdvancedUnlocked;
      localStorage.setItem(STORAGE_KEYS.adminAdvanced, state.adminAdvancedUnlocked?'1':'0');
      renderAdminTabs();
      alert(state.adminAdvancedUnlocked?'Скрытые вкладки открыты':'Скрытые вкладки скрыты');
    }
  });
})();
function closeAdmin(){
  state.adminUnlocked=false;
  localStorage.removeItem(STORAGE_KEYS.admin);
  elements.adminPanel.style.display='none';
}

function renderAdminTabs(){
  elements.adminTabs.querySelectorAll('.admin-tab-btn').forEach(n=>n.remove());
  const BASE_TABS=[
    {id:'items',title:'Блюда'},
    {id:'orders',title:'Заявки'},
    {id:'blacklist',title:'Чёрный список'},
  ];
  const SECURE_TABS=[
    {id:'categories',title:'Категории'},
    {id:'bots',title:'Боты'},
    {id:'settings',title:'Настройки'},
    {id:'schedule',title:'График работы'},
    {id:'footer',title:'Подвал'},
  ];
  const TABS = state.adminAdvancedUnlocked ? BASE_TABS.concat(SECURE_TABS) : BASE_TABS;
  TABS.forEach(tab=>{
    const b=document.createElement('button');
    b.className='admin-tab-btn'+(state.adminTab===tab.id?' active':'');
    b.textContent=tab.title;
    b.addEventListener('click',()=>{
      state.adminTab=tab.id; updateAdminTabVisibility();
      if (tab.id==='orders') void refreshOrdersFromServer();
    });
    elements.adminTabs.appendChild(b);
  });
  updateAdminTabVisibility();
}
function updateAdminTabVisibility(){
  const ids=['items','orders','bots','settings','blacklist','schedule','footer','categories'];
  ids.forEach(id=>{
    const el=document.getElementById('tab-'+id);
    if(!el) return;
    if(['bots','settings','schedule','footer','categories'].includes(id) && !state.adminAdvancedUnlocked){
      el.classList.remove('active');
      if(state.adminTab===id) state.adminTab='items';
    } else {
      el.classList.toggle('active', state.adminTab===id);
    }
  });
  Array.from(elements.adminTabs.querySelectorAll('.admin-tab-btn')).forEach(btn=>{
    const map={items:'Блюда',orders:'Заявки',bots:'Боты',settings:'Настройки',blacklist:'Чёрный список',schedule:'График работы',footer:'Подвал',categories:'Категории'};
    btn.classList.toggle('active', btn.textContent===map[state.adminTab]);
  });
}

function renderAdminCategories(){
  const fromItems   = new Set(state.items.map(i=>i.category));
  const fromCustom  = new Set(state.customCategories||[]);
  const fromDefault = new Set(DEFAULT_CATEGORY_SET);
  const all = Array.from(new Set(['Все', ...fromDefault, ...fromCustom, ...fromItems]));

  elements.adminCategories.innerHTML='';
  all.forEach(cat=>{
    const b=document.createElement('button');
    b.className='category-btn'+(state.adminItemsCategory===cat?' active':'');
    const hiddenMark = (cat!=='Все' && !visibleForClients(cat)) ? ' (скрыта)' : '';
    b.textContent=cat + hiddenMark;
    b.addEventListener('click',()=>{ state.adminItemsCategory=cat; renderAdminItems(); renderAdminCategories(); });
    elements.adminCategories.appendChild(b);
  });
}

function renderAdminItems(){
  elements.adminItems.innerHTML='';
  const list=state.items.filter(i=>state.adminItemsCategory==='Все'||i.category===state.adminItemsCategory);
  if(!list.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Нет блюд'; elements.adminItems.appendChild(e); return; }
  list.forEach(item=>{
    const card=document.createElement('div'); card.className='admin-card'; card.style.gridColumn='span 12';

    const r1=document.createElement('div'); r1.className='admin-row';
    const name=document.createElement('div'); name.textContent=item.name+' • '+item.category;
    const price=document.createElement('div'); price.textContent=toCurrency(item.pricePer100)+' / '+(item.byWeight?'100 г':'шт');
    r1.appendChild(name); r1.appendChild(price);

    const r2=document.createElement('div'); r2.className='admin-row';
    const left=document.createElement('div');
    const availWrap=document.createElement('label'); const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=item.available;
    chk.addEventListener('change',()=>{ item.available=chk.checked; saveItems(); renderProducts(); });
    availWrap.appendChild(chk); availWrap.appendChild(document.createTextNode(' В наличии'));
    left.appendChild(availWrap);

    const byWWrap=document.createElement('label'); byWWrap.style.marginLeft='12px';
    const byW=document.createElement('input'); byW.type='checkbox'; byW.checked=!!item.byWeight;
    byW.addEventListener('change',()=>{ item.byWeight = byW.checked; saveItems(); renderProducts(); renderAdminItems(); });
    byWWrap.appendChild(byW); byWWrap.appendChild(document.createTextNode(' По граммам (мин. 100 г)'));
    left.appendChild(byWWrap);

    const actions=document.createElement('div');
    const del=document.createElement('button'); del.className='btn btn-ghost'; del.textContent='Удалить';
    del.addEventListener('click',()=>{ if(!confirm('Удалить блюдо?')) return; state.items=state.items.filter(i=>i.id!==item.id); saveItems(); renderCategories(); renderProducts(); renderAdminItems(); renderAdminCategories(); });
    actions.appendChild(del);

    r2.appendChild(left); r2.appendChild(actions);

    const editBox=document.createElement('div'); editBox.className='admin-form'; editBox.style.marginTop='8px';
    const fPrice=document.createElement('div'); fPrice.className='field';
    const priceLbl=document.createElement('label'); priceLbl.textContent='Новая цена ('+(item.byWeight?'за 100 г':'за шт')+', ₽)';
    const priceInp=document.createElement('input'); priceInp.type='number'; priceInp.min='1'; priceInp.step='1'; priceInp.value=String(item.pricePer100);
    fPrice.appendChild(priceLbl); fPrice.appendChild(priceInp);

    const fImg=document.createElement('div'); fImg.className='field';
    const imgLbl=document.createElement('label'); imgLbl.textContent='Новое фото (опционально)';
    const imgInp=document.createElement('input'); imgInp.type='file'; imgInp.accept='image/*';
    fImg.appendChild(imgLbl); fImg.appendChild(imgInp);

    const fSave=document.createElement('div'); fSave.className='field';
    const saveBtn=document.createElement('button'); saveBtn.className='btn btn-primary'; saveBtn.type='button'; saveBtn.textContent='Сохранить изменения';
    fSave.appendChild(document.createElement('label')).innerHTML='&nbsp;'; fSave.appendChild(saveBtn);

    editBox.appendChild(fPrice); editBox.appendChild(fImg); editBox.appendChild(fSave);

    saveBtn.addEventListener('click', async ()=>{
      const newPrice = Math.max(1, Number(priceInp.value)||item.pricePer100);
      let newImage = null;
      if(imgInp.files && imgInp.files[0]){
        newImage = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(imgInp.files[0]); });
      }
      item.pricePer100 = newPrice;
      if(newImage) item.image = newImage;
      saveItems();
      renderProducts();
      renderAdminItems();
      alert('Блюдо обновлено');
    });

    card.appendChild(r1); card.appendChild(r2); card.appendChild(editBox);
    elements.adminItems.appendChild(card);
  });
}

function statusClass(s){
  if(s==='Новый') return 'status-new';
  if(s==='Принят') return 'status-accepted';
  if(s==='В доставке') return 'status-delivery';
  if(s==='Отменён') return 'status-cancel';
  return '';
}
function calcOrderTotal(order){
  return order.items.reduce((sum,it)=>{
    if(it.units) return sum + (it.units * it.pricePer100);
    return sum + Math.round((it.grams*it.pricePer100)/100);
  },0);
}
function renderAdminOrders(){
  elements.adminOrders.innerHTML='';
  if(!state.orders.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Заявок пока нет'; elements.adminOrders.appendChild(e); return; }
  const extras = state.items.filter(i=>i.category==='Комплект' && i.available);
  state.orders.slice().sort((a,b)=>b.createdAt-a.createdAt).forEach(order=>{
    const card=document.createElement('div'); card.className='order-card '+statusClass(order.status); card.style.gridColumn='span 12';

    const head=document.createElement('div'); head.className='order-head';
    const left=document.createElement('div'); left.innerHTML=`<strong>#${order.orderNumber}</strong> • ${new Date(order.createdAt).toLocaleString('ru-RU')}`;
    const right=document.createElement('div'); right.innerHTML=`<strong>${toCurrency(order.total)}</strong>`;
    head.appendChild(left); head.appendChild(right);

    const info=document.createElement('div'); info.className='admin-note';
    const source = order.source === 'tg' ? 'Telegram' : 'Сайт';
    const userPart=order.user?`Тел: ${order.user.phone || '—'}${order.user.name?' • '+order.user.name:''}${order.user.tg?' • @'+order.user.tg:''}`:'Гость';
    const addrPart=order.address?` • Адрес: ${order.address}`:'';
    info.textContent=`Источник: ${source} • ${userPart}${addrPart}`;

    const items=document.createElement('div'); items.className='order-items';
    items.textContent=order.items.map((it,i)=>{
      const isUnits = !!it.units;
      const lineTotal = isUnits ? (it.units * it.pricePer100) : Math.round((it.grams*it.pricePer100)/100);
      return `${i+1}. ${it.name} — ${isUnits? (it.units+' шт') : (it.grams+' г')} — ${toCurrency(lineTotal)}`;
    }).join('\n');

    const controls=document.createElement('div'); controls.className='order-controls';
    const statusSel=document.createElement('select');
    ORDER_STATUSES.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; if(s===order.status) o.selected=true; statusSel.appendChild(o); });
    statusSel.addEventListener('change', async ()=>{
      order.status=statusSel.value;
      try{
        await apiUpdateOrder(order.id, { status: order.status });
        await refreshOrdersFromServer();
      }catch(e){ alert('Ошибка обновления статуса'); }
    });

    const extraWrap=document.createElement('div');
    const extraSel=document.createElement('select');
    extras.forEach(x=>{ const o=document.createElement('option'); o.value=x.id; o.textContent=`${x.name} — ${toCurrency(x.pricePer100)}/шт`; extraSel.appendChild(o); });
    const extraQty=document.createElement('input'); extraQty.type='number'; extraQty.min='1'; extraQty.step='1'; extraQty.value='1'; extraQty.style.width='80px';
    const extraBtn=document.createElement('button'); extraBtn.className='btn btn-ghost'; extraBtn.type='button'; extraBtn.textContent='Добавить';
    extraBtn.addEventListener('click', async ()=>{
      const pid=extraSel.value; const qty=Math.max(1, Number(extraQty.value)||1);
      const p=state.items.find(i=>i.id===pid); if(!p) return;
      order.items.push({ id:p.id, name:p.name, units:qty, grams:0, pricePer100:p.pricePer100 });
      order.total = calcOrderTotal(order);
      try{
        await apiUpdateOrder(order.id, { items: order.items, total: order.total });
        await refreshOrdersFromServer();
      }catch(e){ alert('Ошибка обновления заказа'); }
    });
    extraWrap.appendChild(extraSel); extraWrap.appendChild(extraQty); extraWrap.appendChild(extraBtn);

    const delBtn=document.createElement('button'); delBtn.className='btn btn-ghost'; delBtn.textContent='Удалить заявку';
    delBtn.addEventListener('click', async ()=>{
      if(!confirm('Удалить заявку?')) return;
      try{
        await apiDeleteOrder(order.id);
        await refreshOrdersFromServer();
      }catch(e){ alert('Ошибка удаления'); }
    });

    controls.appendChild(statusSel); if(extras.length){ controls.appendChild(extraWrap); } controls.appendChild(delBtn);

    card.appendChild(head); card.appendChild(info); card.appendChild(items); card.appendChild(controls);
    elements.adminOrders.appendChild(card);
  });
}

function renderAdminBlacklist(){
  elements.adminBlacklist.innerHTML='';
  if(!state.blacklist.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Пока пусто'; elements.adminBlacklist.appendChild(e); return; }
  state.blacklist.forEach(phone=>{
    const row=document.createElement('div'); row.className='admin-card'; row.style.gridColumn='span 6';
    const r=document.createElement('div'); r.className='admin-row';
    const l=document.createElement('div'); l.textContent = phone;
    const rr=document.createElement('div'); const b=document.createElement('button'); b.className='btn btn-ghost'; b.textContent='Удалить';
    b.addEventListener('click',()=>{ state.blacklist=state.blacklist.filter(p=>p!==phone); save(STORAGE_KEYS.blacklist,state.blacklist); renderAdminBlacklist(); renderAuthInfo(); });
    rr.appendChild(b); r.appendChild(l); r.appendChild(rr); row.appendChild(r);
    elements.adminBlacklist.appendChild(row);
  });
}
function renderRoles(){
  elements.rolesList.innerHTML='';
  const entries=Object.entries(state.tgRoles);
  if(!entries.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Ролей нет'; elements.rolesList.appendChild(e); return; }
  entries.forEach(([uid,role])=>{
    const row=document.createElement('div'); row.className='admin-card'; row.style.gridColumn='span 6';
    const r=document.createElement('div'); r.className='admin-row';
    const l=document.createElement('div'); l.textContent=`${uid} • ${role}`;
    const rr=document.createElement('div'); const del=document.createElement('button'); del.className='btn btn-ghost'; del.textContent='Удалить';
    del.addEventListener('click',()=>{ delete state.tgRoles[uid]; save(STORAGE_KEYS.tgRoles,state.tgRoles); renderRoles(); });
    rr.appendChild(del); r.appendChild(l); r.appendChild(rr); row.appendChild(r);
    elements.rolesList.appendChild(row);
  });
}
function renderTgClients(){
  elements.tgClientsList.innerHTML='';
  if(!state.tgClients.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Пока нет клиентов'; elements.tgClientsList.appendChild(e); return; }
  state.tgClients.forEach(c=>{
    const row=document.createElement('div'); row.className='admin-card'; row.style.gridColumn='span 6';
    const r=document.createElement('div'); r.className='admin-row';
    const l=document.createElement('div'); l.textContent = `@${c.username || '—'} • ID ${c.userId} • Заказов: ${c.ordersCount||0} • Сумма: ${toCurrency(c.totalSpent||0)}`;
    const rr=document.createElement('div'); rr.textContent='';
    r.appendChild(l); r.appendChild(rr); row.appendChild(r);
    elements.tgClientsList.appendChild(row);
  });
}

function getUserByPhone(phone){ const n=normalizePhone(phone); return state.users.find(u=>normalizePhone(u.phone)===n); }
function ensureNotBlacklisted(phone){ return !state.blacklist.includes(normalizePhone(phone)); }
function setCurrentUser(user){ state.currentUser=user||null; if(user) localStorage.setItem(STORAGE_KEYS.currentUserId,user.id); else localStorage.removeItem(STORAGE_KEYS.currentUserId); renderAuthInfo(); }
function renderAuthInfo(){
  const isBl=state.currentUser&&state.blacklist.includes(normalizePhone(state.currentUser.phone));
  if(state.currentUser){
    document.getElementById('authInfo').style.display='';
    document.getElementById('authInfo').textContent=`${state.currentUser.name?state.currentUser.name+' • ':''}${state.currentUser.phone}${isBl?' (заблокирован)':''}`;
    document.getElementById('loginBtn').style.display='none'; document.getElementById('logoutBtn').style.display='';
  } else {
    document.getElementById('authInfo').style.display='none';
    document.getElementById('loginBtn').style.display=''; document.getElementById('logoutBtn').style.display='none';
  }
}

function initNextOrderNumber(){
  const stored = Number(localStorage.getItem(STORAGE_KEYS.nextOrderNumber)||'0');
  const maxExisting = state.orders.reduce((m,o)=>Math.max(m, o.orderNumber||0), 0);
  state.nextOrderNumber = Math.max(stored||1, maxExisting+1 || 1);
  localStorage.setItem(STORAGE_KEYS.nextOrderNumber, String(state.nextOrderNumber));
}
function takeNextOrderNumber(){
  const n = state.nextOrderNumber;
  state.nextOrderNumber = n + 1;
  localStorage.setItem(STORAGE_KEYS.nextOrderNumber, String(state.nextOrderNumber));
  return n;
}

function buildOrderText(orderLike){
  const itemsList = (orderLike?.items || state.cart).map((row,i)=>{
    const it = orderLike ? row : state.items.find(x=>x.id===row.id);
    const isUnits = orderLike ? !!row.units : ('units' in row);
    const gramsOrUnits = isUnits ? (row.units+' шт') : ((row.grams||0)+' г');
    const pricePer = it?.pricePer100 || 0;
    const cost = isUnits ? (row.units * pricePer) : ((row.grams||0)*pricePer)/100;
    return `${i+1}. ${it.name} — ${gramsOrUnits} — ${toCurrency(cost)}`;
  });
  const total = orderLike ? orderLike.total : getCartTotal();
  const lines=['Заказ из Айс Кафе','', ...itemsList, '—','Итого: '+toCurrency(total)];
  const name=elements.clientName.value.trim();
  const phone=elements.clientPhone.value.trim();
  const address=elements.clientAddress.value.trim();
  const note=elements.clientNote.value.trim();
  if(name||phone||address||note){
    lines.push('','Данные клиента:');
    if(name) lines.push('Имя: '+name);
    if(phone) lines.push('Телефон: '+phone);
    if(address) lines.push('Адрес: '+address);
    if(note) lines.push('Комментарий: '+note);
  }
  return lines.join('\n');
}

function buildOrderPayload(){
  const items=state.cart.map(row=>{
    const p=state.items.find(i=>i.id===row.id);
    if('units' in row) return { id:row.id, name:p?.name||'Блюдо', units:row.units, grams:0, pricePer100:p?.pricePer100||0 };
    return { id:row.id, name:p?.name||'Блюдо', grams:row.grams, pricePer100:p?.pricePer100||0 };
  });
  const phone=normalizePhone(elements.clientPhone.value.trim()||(state.currentUser?.phone||''));
  const user=phone?(getUserByPhone(phone)||{ id:cryptoRandomId(), phone, name:elements.clientName.value.trim() }):null;
  return {
    items,
    total: getCartTotal(),
    address: elements.clientAddress.value.trim(),
    note: elements.clientNote.value.trim(),
    user: user?{id:user.id, phone:user.phone, name:user.name||''}:null,
    source: 'web'
  };
}

function openCheckout(){
  elements.orderSummary.textContent = buildOrderText();
  elements.modal.style.display = 'flex';
  elements.orderWarning.style.display = 'none';
}

async function createOrderAndSendToServer(){
  if(!state.cart.length){ alert('Корзина пуста'); return false; }
  const phone = normalizePhone(elements.clientPhone.value.trim() || (state.currentUser?.phone||''));
  if(!phone){
    elements.orderWarning.textContent = 'Укажите телефон для заявки';
    elements.orderWarning.style.display = '';
    return false;
  }
  if(state.blacklist.includes(phone)){
    elements.orderWarning.textContent = 'Этот телефон в чёрном списке. Заявка недоступна.';
    elements.orderWarning.style.display = '';
    return false;
  }
  const payload = buildOrderPayload();
  // Локальная регистрация пользователя
  if(payload.user && !state.users.find(u=>normalizePhone(u.phone)===phone)){
    state.users.push(payload.user);
    save(STORAGE_KEYS.users, state.users);
    setCurrentUser(payload.user);
  }
  // Отправка на сервер
  const saved = await apiCreateOrder(payload);
  return saved; // объект заказа с id/orderNumber/etc.
}

function editExistingOrder(){
  alert('Редактирование существующего заказа отключено в этой версии');
  return false;
}

function renderMyOrdersList(){
  const uid = state.currentUser.id;
  const list = state.orders.filter(o=>o.user?.id===uid).sort((a,b)=>b.createdAt-a.createdAt);
  elements.ordersList.innerHTML='';
  if(!list.length){ const d=document.createElement('div'); d.className='admin-note'; d.textContent='Заказов пока нет'; elements.ordersList.appendChild(d); return; }
  list.forEach(order=>{
    const box=document.createElement('div'); box.className='admin-card'; box.style.gridColumn='span 12';
    const wrap=document.createElement('div'); wrap.className='admin-row';
    const left=document.createElement('div');
    left.innerHTML = `#${order.orderNumber} • ${new Date(order.createdAt).toLocaleString('ru-RU')} • Статус: ${order.status} • ${toCurrency(order.total)} • Источник: ${order.source==='tg'?'Telegram':'Сайт'}`;
    const right=document.createElement('div');
    wrap.appendChild(left); wrap.appendChild(right);
    const items=document.createElement('div'); items.className='order-items';
    items.textContent = order.items.map((it,i)=>`${i+1}. ${it.name} — ${it.units?(it.units+' шт'):(it.grams+' г')}`).join('\n');
    box.appendChild(wrap); box.appendChild(items);
    elements.ordersList.appendChild(box);
  });
}

function getAllCategoriesInItems(){
  return Array.from(new Set(state.items.map(i=>i.category)));
}

function renderCategoryManager(){
  elements.categoryManager.innerHTML='';
  const cats = Array.from(new Set([
    ...DEFAULT_CATEGORY_SET,
    ...(state.customCategories||[]),
    ...state.items.map(i=>i.category)
  ])).sort((a,b)=>a.localeCompare(b,'ru'));

  if(!cats.length){ const e=document.createElement('div'); e.className='admin-note'; e.textContent='Категорий пока нет'; elements.categoryManager.appendChild(e); return; }

  cats.forEach(cat=>{
    const count = state.items.filter(i=>i.category===cat).length;
    const row=document.createElement('div'); row.className='admin-card'; row.style.gridColumn='span 12';
    const head=document.createElement('div'); head.className='admin-row';
    const left=document.createElement('div'); left.textContent=`${cat} • ${count} шт. ${!visibleForClients(cat)?'• скрыта':''}`;
    const right=document.createElement('div');

    const renameBtn=document.createElement('button'); renameBtn.className='btn btn-ghost'; renameBtn.textContent='Переименовать';
    renameBtn.addEventListener('click',()=>{
      const nn = (prompt('Новое имя категории', cat)||'').trim();
      if(!nn || nn===cat) return;
      state.items.forEach(i=>{ if(i.category===cat) i.category=nn; });
      const lc = (s)=>s.toLowerCase();
      if(!(DEFAULT_CATEGORY_SET.map(lc).includes(lc(cat)))){
        state.customCategories = Array.from(new Set([...(state.customCategories||[]).filter(x=>x!==cat), nn]));
        saveCustomCategories();
      }
      if(state.hiddenCategories.includes(cat)){
        state.hiddenCategories = state.hiddenCategories.filter(x=>x!==cat).concat([nn]);
        saveHiddenCategories();
      }
      saveItems(); renderCategories(); renderProducts(); renderAdminCategories(); renderAdminItems(); renderCategoryManager(); renderAddCategoryOptions();
    });

    const hideBtn=document.createElement('button'); hideBtn.className='btn btn-ghost'; hideBtn.textContent=visibleForClients(cat)?'Скрыть':'Показать';
    hideBtn.addEventListener('click',()=>{
      if(visibleForClients(cat)){ state.hiddenCategories = Array.from(new Set([...(state.hiddenCategories||[]), cat])); }
      else { state.hiddenCategories = (state.hiddenCategories||[]).filter(x=>x!==cat); }
      saveHiddenCategories();
      renderCategories(); renderProducts(); renderAdminCategories(); renderCategoryManager();
    });

    const delBtn=document.createElement('button'); delBtn.className='btn btn-ghost'; delBtn.textContent='Удалить';
    delBtn.addEventListener('click',()=>{
      if(!confirm(`Удалить категорию "${cat}"? Блюда нужно перенести.`)) return;
      const targets = Array.from(new Set([
        ...DEFAULT_CATEGORY_SET.filter(x=>x!==cat),
        ...(state.customCategories||[]).filter(x=>x!==cat)
      ]));
      const to = (prompt(`Перенести блюда в категорию:\n${targets.join(', ')}`, targets[0]||'Горячее')||targets[0]||'Горячее').trim();
      state.items.forEach(i=>{ if(i.category===cat) i.category=to; });
      state.customCategories = (state.customCategories||[]).filter(x=>x!==cat);
      saveCustomCategories();
      state.hiddenCategories = (state.hiddenCategories||[]).filter(x=>x!==cat);
      saveHiddenCategories();
      saveItems(); renderCategories(); renderProducts(); renderAdminCategories(); renderAdminItems(); renderCategoryManager(); renderAddCategoryOptions();
      alert(`Категория удалена. Перенесено в "${to}".`);
    });

    right.appendChild(renameBtn); right.appendChild(hideBtn); right.appendChild(delBtn);
    head.appendChild(left); head.appendChild(right);
    row.appendChild(head);
    elements.categoryManager.appendChild(row);
  });
}

function renderSchedule(){ elements.scheduleDisplay.textContent=state.schedule||defaultSchedule; }
function renderFooter(){
  elements.footerContactsView.innerHTML=(state.footerContacts||defaultContacts);
  elements.footerVacanciesView.innerHTML=(state.footerVacancies||defaultVacancies);
}

function applyTheme(vars){
  Object.entries(vars||{}).forEach(([k,v])=>{
    if(v) document.documentElement.style.setProperty(k, v);
  });
}
function populateThemePickers(){
  const pickers = document.querySelectorAll('input[type="color"][data-var]');
  pickers.forEach(inp=>{
    const vname = inp.getAttribute('data-var');
    const saved = state.themeVars?.[vname];
    if(saved){ inp.value = saved; return; }
    const css = getComputedStyle(document.documentElement).getPropertyValue(vname).trim();
    inp.value = css ? rgbToHex(css) : '#ffffff';
  });
}
function rgbToHex(rgb){
  if(/^#/.test(rgb)) return rgb;
  const m = rgb.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if(!m) return '#ffffff';
  const h = (n)=> Number(n).toString(16).padStart(2,'0');
  return '#'+h(m[1])+h(m[2])+h(m[3]);
}
function loadSettings(){
  state.brandLogo = load(STORAGE_KEYS.brandLogo,'')||'';
  state.themeVars = load(STORAGE_KEYS.themeVars,{})||{};
  state.customCategories = loadCustomCategories();
  state.hiddenCategories = loadHiddenCategories();
  state.adminAdvancedUnlocked = localStorage.getItem(STORAGE_KEYS.adminAdvanced)==='1';
  if(state.brandLogo){
    document.getElementById('brandLogo').style.backgroundImage = `url('${state.brandLogo}')`;
    document.getElementById('brandLogo').style.backgroundSize = 'cover';
    document.getElementById('brandLogo').style.backgroundPosition = 'center';
  }
  applyTheme(state.themeVars);
}

function renderAdmin(){
  renderAdminTabs();
  renderAdminCategories();
  renderAdminItems();
  renderAdminOrders();
  renderAdminBlacklist();
  renderRoles();
  renderTgClients();
  document.getElementById('scheduleText').value=state.schedule||'';
  document.getElementById('footerContacts').value=state.footerContacts||'';
  document.getElementById('footerVacancies').value=state.footerVacancies||'';
  elements.staffTgBotToken.value=state.tgStaffBotToken||'';
  elements.staffTgChatId.value=state.tgStaffChatId||'';
  elements.clientTgBotToken.value=state.tgClientBotToken||'';
  renderAddCategoryOptions();
  renderCategoryManager();
}

function handleCreateCategorySubmit(e){
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  if (!elements || !elements.addCategoryName) {
    alert('Не найдены элементы формы категории');
    return;
  }
  const rawName = (elements.addCategoryName.value || '').trim();
  if (!rawName) {
    alert('Укажите название категории');
    return;
  }

  const name = rawName
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

  const lower = (s) => String(s || '').toLowerCase();
  const defaults = DEFAULT_CATEGORY_SET.map(lower);
  const customs  = (state.customCategories || []).map(lower);

  if (defaults.includes(lower(name)) || customs.includes(lower(name))) {
    alert('Такая категория уже есть');
    return;
  }

  state.customCategories = Array.from(new Set([...(state.customCategories || []), name]));
  save(STORAGE_KEYS.customCategories, state.customCategories);

  elements.addCategoryName.value = '';

  renderAddCategoryOptions();
  renderCategoryManager();
  renderAdminCategories();
  renderCategories();
  renderProducts();

  alert('Категория добавлена');
}

async function refreshOrdersFromServer(){
  try{
    const list = await apiGetOrders();
    state.orders = Array.isArray(list) ? list : [];
    if (state.adminUnlocked) renderAdminOrders();
  }catch(e){
    console.warn('Не удалось загрузить заявки', e);
  }
}

function wireHandlers(){
  const E = elements;

  // корзина
  bind(E.clearCartBtn, 'click', ()=>{ if(!state.cart.length) return; if(!confirm('Очистить корзину?')) return; state.cart=[]; renderCart(); });
  bind(E.checkoutBtn, 'click', ()=>{ if(!state.cart.length){ alert('Корзина пуста'); return; } state.currentEditingOrderId=null; openCheckout(); if(state.currentUser){ elements.clientPhone.value=state.currentUser.phone||''; elements.clientName.value=state.currentUser.name||''; } });
  bind(E.openCartBtn, 'click', ()=>{ document.querySelector('.cart')?.scrollIntoView({behavior:'smooth',block:'start'}); });

  // модал заказа
  bind(E.modal, 'click', (e)=>{ if(e.target===E.modal) E.modal.style.display='none'; });
  bind(E.modalCloseBtn, 'click', ()=> E.modal.style.display='none');
  bind(E.copyOrderBtn, 'click', async ()=>{ try{ await navigator.clipboard.writeText(buildOrderText()); E.copyOrderBtn.textContent='Скопировано!'; setTimeout(()=> E.copyOrderBtn.textContent='Скопировать',1200);}catch{ alert('Не удалось скопировать'); }});
  bind(E.submitOrderBtn, 'click', async ()=>{
    let order=null;
    if(state.currentEditingOrderId){ order = await editExistingOrder(); if(!order) return; alert('Заказ обновлён!'); }
    else {
      try{
        order = await createOrderAndSendToServer();
      }catch(e){
        console.error(e);
        E.orderWarning.textContent = 'Ошибка отправки заявки. Проверьте подключение к серверу.';
        E.orderWarning.style.display = '';
        return;
      }
      if(!order) return;
      alert('Заявка отправлена!');
    }
    state.cart=[]; renderCart(); E.modal.style.display='none';
    await refreshOrdersFromServer();
  });

  // авторизация
  bind(document.getElementById('loginBtn'),'click',()=> document.getElementById('authModal').style.display='flex');
  bind(document.getElementById('logoutBtn'),'click',()=> setCurrentUser(null));
  bind(document.getElementById('authCloseBtn'),'click',()=> document.getElementById('authModal').style.display='none');
  bind(document.getElementById('authModal'),'click',(e)=>{ if(e.target===document.getElementById('authModal')) document.getElementById('authModal').style.display='none'; });
  bind(document.getElementById('authSubmitBtn'),'click',()=>{
    const phone=normalizePhone(document.getElementById('authPhone').value.trim()); const name=document.getElementById('authName').value.trim();
    if(!phone){ document.getElementById('authWarning').textContent='Укажите телефон'; document.getElementById('authWarning').style.display=''; return; }
    if(!ensureNotBlacklisted(phone)){ document.getElementById('authWarning').textContent='Этот телефон в чёрном списке'; document.getElementById('authWarning').style.display=''; return; }
    let user=getUserByPhone(phone);
    if(!user){ user={id:cryptoRandomId(),phone,name}; state.users.push(user); save(STORAGE_KEYS.users,state.users); }
    else if(name&&!user.name){ user.name=name; save(STORAGE_KEYS.users,state.users); }
    setCurrentUser(user); document.getElementById('authModal').style.display='none';
  });

  // админ
  bind(E.adminCloseBtn,'click', closeAdmin);
  bind(document.getElementById('adminSelectAllBtn'),'click', ()=>{
    const list=state.items.filter(i=>state.adminItemsCategory==='Все'||i.category===state.adminItemsCategory);
    list.forEach(i=> i.available=true); saveItems(); renderProducts(); renderAdminItems();
  });
  bind(document.getElementById('adminDeselectAllBtn'),'click', ()=>{
    const list=state.items.filter(i=>state.adminItemsCategory==='Все'||i.category===state.adminItemsCategory);
    list.forEach(i=> i.available=false); saveItems(); renderProducts(); renderAdminItems();
  });

  // форма добавления блюда
  bind(E.adminAddForm,'submit', async (e)=>{
    e.preventDefault();
    const name=(E.addName.value||'').trim();
    const cat=(E.addCategory.value||'').trim();
    const price=Math.max(1, Number(E.addPrice100.value)||0);
    const byWeight=(E.addByWeight.value==='true');
    if(!name||!cat||!price) return alert('Заполните поля');
    let image='';
    if(E.addImage.files && E.addImage.files[0]){
      image = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(E.addImage.files[0]); });
    }
    state.items.push({ id:cryptoRandomId(), name, category:cat, pricePer100:price, image:image||getPlaceholderImage(name), available:true, byWeight });
    saveItems();
    E.addName.value=''; E.addPrice100.value=''; E.addImage.value='';
    renderCategories(); renderProducts(); renderAdminItems();
    alert('Блюдо добавлено');
  });

  // мои заказы
  bind(document.getElementById('myOrdersBtn'), 'click', async ()=>{
    const modal = elements.ordersModal;
    const box = elements.ordersList;
    if(!state.currentUser){
      if(box){ box.innerHTML=''; const d=document.createElement('div'); d.className='admin-note'; d.textContent='Войдите по телефону, чтобы увидеть свои заказы'; box.appendChild(d); }
      if(modal) modal.style.display='flex'; return;
    }
    await refreshOrdersFromServer();
    renderMyOrdersList(); if(modal) modal.style.display='flex';
  });
  bind(elements.ordersModalClose,'click', ()=>{ const m=elements.ordersModal; if(m) m.style.display='none'; });
  if(elements.ordersModal) elements.ordersModal.addEventListener('click',(e)=>{ if(e.target===elements.ordersModal) elements.ordersModal.style.display='none'; });

  // расписание/подвал
  bind(elements.scheduleForm,'submit',(e)=>{ e.preventDefault(); state.schedule=(elements.scheduleText.value||'').trim()||defaultSchedule; save(STORAGE_KEYS.schedule,state.schedule); renderSchedule(); alert('График сохранён'); });
  bind(elements.footerForm,'submit',(e)=>{
    e.preventDefault();
    state.footerContacts=(elements.footerContacts.value||'').trim();
    state.footerVacancies=(elements.footerVacancies.value||'').trim();
    save(STORAGE_KEYS.footerContacts,state.footerContacts);
    save(STORAGE_KEYS.footerVacancies,state.footerVacancies);
    renderFooter();
    alert('Подвал сохранён');
  });

  // бот: сохранение настроек (на клиенте они больше не используются для отправки, отправляет сервер)
  bind(elements.staffTgForm,'submit',(e)=>{
    e.preventDefault();
    state.tgStaffBotToken = (elements.staffTgBotToken.value||'').trim();
    state.tgStaffChatId   = (elements.staffTgChatId.value||'').trim();
    save(STORAGE_KEYS.tgStaffBotToken, state.tgStaffBotToken);
    save(STORAGE_KEYS.tgStaffChatId, state.tgStaffChatId);
    alert('Бот персонала сохранён (используйте эти значения в переменных окружения сервера)');
  });
  bind(elements.clientTgForm,'submit',(e)=>{
    e.preventDefault();
    state.tgClientBotToken = (elements.clientTgBotToken.value||'').trim();
    save(STORAGE_KEYS.tgClientBotToken, state.tgClientBotToken);
    alert('Бот клиентов сохранён');
  });

  // роли
  bind(elements.rolesForm,'submit',(e)=>{
    e.preventDefault();
    const uid=(elements.roleUserId.value||'').trim();
    const role=(elements.roleType.value||'picker').trim();
    if(!uid) return alert('Укажите user_id');
    state.tgRoles[uid]=role;
    save(STORAGE_KEYS.tgRoles,state.tgRoles);
    elements.roleUserId.value='';
    renderRoles();
  });

  // ЧС
  bind(elements.blacklistForm,'submit',(e)=>{
    e.preventDefault();
    const phone=normalizePhone(elements.blacklistPhone.value||'');
    if(!phone) return alert('Укажите телефон');
    if(!state.blacklist.includes(phone)) state.blacklist.push(phone);
    save(STORAGE_KEYS.blacklist,state.blacklist);
    elements.blacklistPhone.value='';
    renderAdminBlacklist(); renderAuthInfo();
    alert('Добавлено в чёрный список');
  });

  // категории: создание
  bind(elements.addCategoryForm,'submit', handleCreateCategorySubmit);

  // изображение модалки
  bind(elements.imageModal,'click',(e)=>{ if(e.target===elements.imageModal) closeImageModal(); });
  bind(elements.imageModalClose,'click', closeImageModal);

  // админ: цвет статуса обновлять сразу
  const adminOrders = elements.adminOrders;
  if (adminOrders) adminOrders.addEventListener('change', ()=>{
    setTimeout(()=>{ renderAdminOrders(); }, 0);
  });
}

function init(){
  state.items=loadItems();
  state.adminUnlocked=localStorage.getItem(STORAGE_KEYS.admin)==='1';
  state.users=load(STORAGE_KEYS.users,[]);
  state.orders=[]; // заказы теперь с сервера
  state.blacklist=load(STORAGE_KEYS.blacklist,[]);
  state.schedule=load(STORAGE_KEYS.schedule,defaultSchedule);
  state.footerContacts=load(STORAGE_KEYS.footerContacts,defaultContacts);
  state.footerVacancies=load(STORAGE_KEYS.footerVacancies,defaultVacancies);

  state.tgStaffBotToken=load(STORAGE_KEYS.tgStaffBotToken,'')||'';
  state.tgStaffChatId=load(STORAGE_KEYS.tgStaffChatId,'')||'';
  state.tgStaffLastUpdateId=load(STORAGE_KEYS.tgStaffLastUpdateId,0)||0;
  state.tgMsgMap=load(STORAGE_KEYS.tgMsgMap,{})||{};
  state.tgRoles=load(STORAGE_KEYS.tgRoles,{})||{};

  state.tgClientBotToken=load(STORAGE_KEYS.tgClientBotToken,'')||'';
  state.tgClientLastUpdateId=load(STORAGE_KEYS.tgClientLastUpdateId,0)||0;
  state.tgClients=load(STORAGE_KEYS.tgClients,[])||[];
  state.tgClientCarts=load(STORAGE_KEYS.tgClientCarts,{})||{};

  const currentUserId=localStorage.getItem(STORAGE_KEYS.currentUserId);
  state.currentUser=state.users.find(u=>u.id===currentUserId)||null;

  loadSettings();
  initNextOrderNumber();

  elements.adminPanel.style.display=state.adminUnlocked?'block':'none';
  renderCategories(); renderProducts(); renderCart(); renderAuthInfo(); renderSchedule(); renderFooter();
  renderAddCategoryOptions();
  renderAdminTabs();
  if(state.adminUnlocked){ renderAdmin(); populateThemePickers(); void refreshOrdersFromServer(); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  try { init(); wireHandlers(); } catch(e){ console.error(e); alert('Инициализация не удалась: '+(e.message||e)); }
});

(function debugWiretap(){
  const box = document.getElementById('resultInfo');
  function show(msg){ if(box){ box.style.color='#ef4444'; box.textContent='Ошибка: '+msg; } }
  window.addEventListener('error', e=> show((e.error?.message||e.message||'unknown')+' (см. консоль)'));
  window.addEventListener('unhandledrejection', e=> show((e.reason?.message||e.reason||'unknown')+' (см. консоль)'));
})();
