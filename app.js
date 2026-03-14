// ============================================
// app.js — Ana Uygulama Mantığı
// ============================================

// ── Sabitler ───────────────────────────────
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const PA_COLORS = ['#f5c842','#2ecc8a','#4f8ef7','#9b72f5','#22d3ee','#e8503a','#f97316'];

// ── Uygulama Durumu ─────────────────────────
let STATE = {
  user: null,
  cfg: { isim: 'YÖNETİM PANELİ', icon: '🎵', accent: '#f5c842', tabs: {} },
  g: [], kz: [], u: [], ay: [], gi: [], p: [],
  kmRows: [],
  kzTip: 1,
  kzEditId: null,
  charts: {},
  loading: false
};

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================
const fmt = v => '₺' + (+v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const gv = id => parseFloat(document.getElementById(id)?.value) || 0;
const gs = id => (document.getElementById(id)?.value || '').trim();
const sv = (id, v) => { const e = document.getElementById(id); if (e) e.value = v ?? ''; };
const today = () => new Date().toISOString().slice(0, 10);
const chip = (t, c) => `<span class="chip ${c}">${t}</span>`;
const stChip = s => { const m = { Tamamlandı: 'cg', Planlandı: 'cb', Kesinleşti: 'cy', İptal: 'cr' }; return chip(s, m[s] || 'cb'); };

function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', 3000);
}

function setLoading(show) {
  STATE.loading = show;
  const el = document.getElementById('globalLoader');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ============================================
// AUTH
// ============================================
async function handleLogin() {
  const email = gs('loginEmail');
  const pw = gs('loginPw');
  const errEl = document.getElementById('loginErr');
  if (!email || !pw) { errEl.textContent = '❌ E-posta ve şifre gerekli'; return; }
  try {
    document.getElementById('loginBtn').textContent = 'Giriş yapılıyor...';
    await Auth.signIn(email, pw);
    // onAuthChange tetiklenecek
  } catch (e) {
    errEl.textContent = '❌ ' + (e.message === 'Invalid login credentials' ? 'Hatalı e-posta veya şifre' : e.message);
    document.getElementById('loginBtn').textContent = 'Giriş Yap';
  }
}

async function handleLogout() {
  await Auth.signOut();
}

Auth.onAuthChange(async (user) => {
  STATE.user = user;
  if (user) {
    document.getElementById('lock').style.display = 'none';
    document.getElementById('appShell').style.display = 'block';
    await init();
  } else {
    document.getElementById('lock').style.display = 'flex';
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('loginBtn').textContent = 'Giriş Yap';
    document.getElementById('loginErr').textContent = '';
    document.getElementById('loginPw').value = '';
  }
});

// ============================================
// BAŞLATMA
// ============================================
async function init() {
  setLoading(true);
  try {
    document.getElementById('topDate').textContent = new Date().toLocaleDateString('tr-TR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    sv('g_t', today()); sv('kz_t', today()); sv('gi_t', today());

    // Config yükle
    const savedCfg = await Ayarlar.get('config');
    if (savedCfg) STATE.cfg = Object.assign(STATE.cfg, savedCfg);
    applyTheme();
    loadSettingsUI();

    // Konser kalemleri yükle
    STATE.kmRows = await KonserKalemler.getAll();
    kmRenderRows();

    // Tüm veriyi yükle
    await loadAllData();

    // Realtime subscriptions
    setupRealtime();

    // Otomatik yedek kontrol
    OtomatikYedek.check();

    renderAll();
  } catch (e) {
    console.error('Init hatası:', e);
    showToast('❌ Bağlantı hatası: ' + e.message, 'err');
  } finally {
    setLoading(false);
  }
}

async function loadAllData() {
  const [g, kz, u, ay, gi, p] = await Promise.all([
    GunlukSatis.getAll(),
    Konserler.getAll(),
    Urunler.getAll(),
    AylikOzet.getAll(),
    Giderler.getAll(),
    Personel.getAll()
  ]);
  STATE.g = g; STATE.kz = kz; STATE.u = u;
  STATE.ay = ay; STATE.gi = gi; STATE.p = p;
}

function renderAll() {
  rAna(); rG(); rKZ(); rU(); rAy(); rGi(); rP();
}

// ============================================
// REALTIME
// ============================================
function setupRealtime() {
  GunlukSatis.subscribe(async () => {
    STATE.g = await GunlukSatis.getAll();
    rG(); rAna();
  });
  Konserler.subscribe(async () => {
    STATE.kz = await Konserler.getAll();
    rKZ(); rAna();
  });
}

// ============================================
// TEMA & AYARLAR
// ============================================
function applyTheme() {
  const { isim, icon, accent, tabs } = STATE.cfg;
  document.documentElement.style.setProperty('--acc', accent);
  document.documentElement.style.setProperty('--acc-a', accent + '26');
  document.getElementById('topTxt').textContent = isim;
  document.getElementById('topIcon').textContent = icon || '🎵';
  document.getElementById('loginTitle').textContent = isim;
  document.title = isim + ' — Panel';
  const tDef = { ana:'Ana Panel', gunluk:'Günlük Satış', km:'Konser Maliyet', kz:'Konser Kar/Zarar', urun:'Ürün Karlılığı', aylik:'Aylık Özet', gider:'Giderler', personel:'Personel', grafik:'Grafikler', rapor:'Raporlar' };
  Object.entries(tDef).forEach(([k, d]) => {
    const e = document.getElementById('tn-' + k);
    if (e) e.textContent = tabs[k] || d;
  });
}

function loadSettingsUI() {
  sv('st_is', STATE.cfg.isim);
  sv('st_ic', STATE.cfg.icon);
  const tDef = { ana:'Ana Panel', gunluk:'Günlük Satış', km:'Konser Maliyet', kz:'Konser Kar/Zarar', urun:'Ürün Karlılığı', aylik:'Aylık Özet', gider:'Giderler', personel:'Personel', grafik:'Grafikler', rapor:'Raporlar' };
  Object.entries(tDef).forEach(([k, d]) => sv('sn_' + k, STATE.cfg.tabs[k] || d));
}

function setClr(c, id) {
  document.querySelectorAll('.cb2').forEach(e => e.classList.remove('sel'));
  document.getElementById(id)?.classList.add('sel');
  STATE.cfg.accent = c;
  applyTheme();
}

async function stSave() {
  STATE.cfg.isim = gs('st_is') || STATE.cfg.isim;
  STATE.cfg.icon = gs('st_ic') || STATE.cfg.icon;
  const tKeys = ['ana','gunluk','km','kz','urun','aylik','gider','personel','grafik','rapor'];
  tKeys.forEach(k => { const v = gs('sn_' + k); if (v) STATE.cfg.tabs[k] = v; });
  try {
    await Ayarlar.set('config', STATE.cfg);
    applyTheme();
    showToast('✅ Ayarlar kaydedildi');
  } catch (e) {
    showToast('❌ Kaydedilemedi: ' + e.message, 'err');
  }
}

// ============================================
// TABS
// ============================================
function goTab(id) {
  document.querySelectorAll('.pg').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  const pg = document.getElementById('pg-' + id);
  if (pg) pg.classList.add('on');
  const tab = document.querySelector('.tab[data-pg="' + id + '"]');
  if (tab) tab.classList.add('on');
  if (id === 'ana') rAna();
  if (id === 'grafik') rGrafik();
  if (id === 'rapor') rRapor();
}

// ============================================
// GÜNLÜK SATIŞ
// ============================================
function gLive() {
  const c = gv('g_c'), m = gv('g_um') + gv('g_im'), k = c - m, p = c ? (k / c * 100).toFixed(1) : 0;
  if (c || m) {
    document.getElementById('gLB').style.display = 'block';
    document.getElementById('gL_c').textContent = fmt(c);
    document.getElementById('gL_m').textContent = fmt(m);
    const ke = document.getElementById('gL_k'); ke.textContent = fmt(k); ke.style.color = k >= 0 ? 'var(--gr)' : 'var(--rd)';
    const pe = document.getElementById('gL_p'); pe.textContent = '%' + p; pe.style.color = p >= 30 ? 'var(--gr)' : p >= 15 ? 'var(--acc)' : 'var(--rd)';
  }
}

async function gAdd() {
  const row = {
    tarih: gs('g_t'), ciro: gv('g_c'), nakit: gv('g_n'), pos: gv('g_p'),
    bira: gv('g_b'), alkol: gv('g_a'), alkolsuz: gv('g_al'), yiyecek: gv('g_y'),
    cerez: gv('g_ce'), bilet: gv('g_bi'), urun_maliyet: gv('g_um'), ikram_maliyet: gv('g_im'),
    not_alani: gs('g_no')
  };
  if (!row.tarih) { showToast('❌ Tarih seçin', 'err'); return; }
  try {
    setLoading(true);
    const saved = await GunlukSatis.add(row);
    STATE.g.unshift(saved);
    rG(); rAna(); gClr();
    showToast('✅ Kaydedildi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

function gClr() {
  ['g_c','g_n','g_p','g_b','g_a','g_al','g_y','g_ce','g_bi','g_um','g_im','g_no'].forEach(id => sv(id, ''));
  sv('g_t', today());
  document.getElementById('gLB').style.display = 'none';
}

async function gDel(id) {
  if (!confirm('Bu kaydı sil?')) return;
  try {
    await GunlukSatis.delete(id);
    STATE.g = STATE.g.filter(r => r.id !== id);
    rG(); rAna();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rG() {
  const cnt = document.getElementById('gCnt');
  if (cnt) cnt.textContent = STATE.g.length ? '(' + STATE.g.length + ')' : '';
  const tb = document.getElementById('gBody');
  if (!STATE.g.length) { tb.innerHTML = '<tr><td colspan="13" class="empty-row">📅 Kayıt yok</td></tr>'; return; }
  tb.innerHTML = STATE.g.map(r => {
    const m = (r.urun_maliyet || 0) + (r.ikram_maliyet || 0);
    const k = (r.ciro || 0) - m;
    const p = r.ciro ? (k / r.ciro * 100).toFixed(1) : 0;
    return `<tr>
      <td class="tnum">${r.tarih}</td><td class="tnum">${fmt(r.ciro)}</td>
      <td class="tnum">${fmt(r.nakit)}</td><td class="tnum">${fmt(r.pos)}</td>
      <td class="tnum">${fmt(r.bira)}</td><td class="tnum">${fmt(r.alkol)}</td>
      <td class="tnum">${fmt(r.yiyecek)}</td><td class="tnum">${fmt(r.bilet)}</td>
      <td class="tnum tneg">${fmt(m)}</td>
      <td class="${k >= 0 ? 'tpos' : 'tneg'}">${fmt(k)}</td>
      <td>${chip('%' + p, p >= 30 ? 'cg' : p >= 15 ? 'cy' : 'cr')}</td>
      <td class="tmut">${r.not_alani || '—'}</td>
      <td><button class="btn bd bsm" onclick="gDel('${r.id}')">✕</button></td>
    </tr>`;
  }).join('');
}

// ============================================
// KONSER MALİYET PLANLAYICI
// ============================================
function kmRenderRows() {
  const c = document.getElementById('kmRows'); if (!c) return;
  c.innerHTML = STATE.kmRows.map((r, i) => `
    <div class="dyn-row">
      <span class="dyn-lbl">${r.etiket}</span>
      <input type="number" placeholder="0" class="dyn-val" data-idx="${i}" oninput="kmCalc()">
      <span class="dyn-unit">₺</span>
    </div>`).join('');
}

async function kmAddRow() {
  const n = prompt('Kalem adı:');
  if (!n?.trim()) return;
  try {
    const saved = await KonserKalemler.add(n.trim());
    STATE.kmRows.push(saved);
    kmRenderRows(); kmCalc();
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function kmTotal() {
  return Array.from(document.querySelectorAll('.dyn-val')).reduce((s, el) => s + (parseFloat(el.value) || 0), 0);
}

function kmCalc() {
  const sb = kmTotal(), bf = gv('km_bf'), bm = gv('km_bm'), dg = gv('km_dg');
  const kap = gv('km_kap') || 500, hk = gv('km_hk'), ba = gv('km_ba');
  const res = document.getElementById('kmRes');
  if (!bf) { res.innerHTML = '<div class="card nm"><div class="empty-state">⚖️ Bilet fiyatını girin</div></div>'; document.getElementById('kmTbl').innerHTML = ''; return; }
  const net = bf - bm;
  if (net <= 0) { res.innerHTML = '<div class="alert a-r">⚠️ Bilet fiyatı maliyetten düşük!</div>'; return; }
  const be = Math.ceil((sb - dg) / net), dol = (be / kap * 100).toFixed(0), maxK = kap * net + dg - sb;
  const hBilet = hk ? Math.ceil((sb + hk - dg) / net) : null;
  let h = be <= kap
    ? `<div class="alert a-g">✅ Ulaşılabilir — kapasitenin %${dol}'ini doldurun yeterli.</div>`
    : `<div class="alert a-r">⚠️ Break-even için kapasite yetersiz! (${be} bilet gerekli)</div>`;
  h += `<div class="rbox rbox-y">
    <div class="rbox-label">Break-Even Noktası</div>
    <div class="rbox-num">${be.toLocaleString('tr-TR')} BİLET</div>
    <div class="rbox-sub">Kapasitenin %${dol}'i — bu noktadan sonra kâr</div>
    <div class="rbox-grid">
      <div><div class="rs-l">Toplam Gider</div><div class="rs-v" style="color:var(--rd)">${fmt(sb)}</div></div>
      <div><div class="rs-l">Bilet Başı Net</div><div class="rs-v" style="color:var(--gr)">${fmt(net)}</div></div>
      <div><div class="rs-l">Tam Kap. Kârı</div><div class="rs-v" style="color:var(--acc)">${fmt(maxK)}</div></div>
    </div>
  </div>`;
  if (ba) {
    const g = ba * bf + dg, gi = sb + ba * bm, k = g - gi;
    h += `<div class="rbox ${k >= 0 ? 'rbox-g' : 'rbox-r'}">
      <div class="rbox-label">Tahmini (${ba} bilet)</div>
      <div class="rbox-num" style="font-size:30px">${fmt(k)}</div>
      <div class="rbox-sub">${k >= 0 ? 'Kâr' : 'Zarar'} — %${g ? (Math.abs(k) / g * 100).toFixed(1) : 0} marj</div>
    </div>`;
  }
  if (hBilet) h += `<div class="info-box"><div class="ib-label">🎯 Hedef Kâr İçin</div><div class="ib-num">${hBilet} BİLET</div><div class="ib-sub">%${(hBilet / kap * 100).toFixed(0)} doluluk → ${fmt(hk)} kâr</div></div>`;
  const pct = Math.min(dol, 100);
  h += `<div class="card" style="background:var(--s2);border-color:var(--b2)">
    <div class="pb-l"><span>Break-even doluluk</span><span style="font-family:var(--fm);color:var(--acc)">${dol}%</span></div>
    <div class="pb-bar"><div class="pb-fill" style="width:${pct}%;background:${dol < 60 ? 'var(--gr)' : dol < 85 ? 'var(--acc)' : 'var(--rd)'}"></div></div>
  </div>`;
  res.innerHTML = h;
  const steps = [0, .1, .2, .3, .4, .5, .6, .7, .75, .8, .85, .9, .95, 1].map(p => Math.round(kap * p));
  document.getElementById('kmTbl').innerHTML = steps.map(a => {
    const bg = a * bf, bgi = a * bm, g = bg + dg, gi = sb + bgi, k = g - gi;
    const isB = Math.abs(a - be) < Math.ceil(kap * .06);
    return `<tr style="${isB ? 'background:rgba(245,200,66,.06)' : ''}">
      <td class="tnum">${a}${isB ? ' 🎯' : ''}</td><td class="tnum">${(a / kap * 100).toFixed(0)}%</td>
      <td class="tnum">${fmt(bg)}</td><td class="tnum">${fmt(g)}</td>
      <td class="tnum tneg">${fmt(gi)}</td>
      <td class="${k >= 0 ? 'tpos' : 'tneg'}">${fmt(k)}</td>
      <td>${chip(k >= 0 ? 'KÂR' : 'ZARAR', k >= 0 ? 'cg' : 'cr')}</td>
    </tr>`;
  }).join('');
}

// ============================================
// KONSER KAR/ZARAR
// ============================================
function kzSetTip(t) {
  STATE.kzTip = t;
  document.getElementById('kzT1').className = 'tip-btn' + (t === 1 ? ' sel' : '');
  document.getElementById('kzT2').className = 'tip-btn' + (t === 2 ? ' sel' : '');
  document.getElementById('kzG1').style.display = t === 1 ? '' : 'none';
  document.getElementById('kzG2').style.display = t === 2 ? '' : 'none';
  document.getElementById('kzDestek').style.display = t === 2 ? '' : 'none';
  const info = document.getElementById('kzTipInfo');
  if (t === 1) { info.innerHTML = '<b>Tip 1:</b> Kaşeyi ve masrafları biz karşılıyoruz, bileti biz satıyoruz.'; info.className = 'alert a-b'; }
  else { info.innerHTML = '<b>Tip 2 — Kapı Destek:</b> Merkez turne, biz belirlenen destek tutarını + masrafları karşılıyoruz.'; info.className = 'alert a-y'; }
  document.getElementById('kzKaseLbl').textContent = t === 2 ? 'Sanatçı Kaşesi (varsa) ₺' : 'Sanatçı Kaşesi ₺';
  kzLive();
}

function kzGetGelir() {
  if (STATE.kzTip === 1) return (gv('kz_ba') * gv('kz_bf')) + gv('kz_bc') + gv('kz_bic') + gv('kz_sp') + gv('kz_dg');
  return gv('kz2_bc') + gv('kz2_dg');
}
function kzGetGider() {
  const base = gv('kz_ka') + gv('kz_ko') + gv('kz_ek') + gv('kz_gu') + gv('kz_ex') + gv('kz_kp') + gv('kz_ik') + gv('kz_um') + gv('kz_bm') + gv('kz_re') + gv('kz_ul') + gv('kz_di');
  return base + (STATE.kzTip === 2 ? gv('kz2_de') : 0);
}

function kzLive() {
  const g = kzGetGelir(), gi = kzGetGider(), k = g - gi, m = g ? (k / g * 100).toFixed(1) : 0;
  if (g || gi) {
    document.getElementById('kzLB').style.display = 'block';
    document.getElementById('kzL_g').textContent = fmt(g);
    document.getElementById('kzL_gi').textContent = fmt(gi);
    const ke = document.getElementById('kzL_k'); ke.textContent = fmt(k); ke.style.color = k >= 0 ? 'var(--gr)' : 'var(--rd)';
    const me = document.getElementById('kzL_m'); me.textContent = '%' + m; me.style.color = m >= 20 ? 'var(--gr)' : m >= 5 ? 'var(--acc)' : 'var(--rd)';
  }
}

async function kzSave() {
  const gelir = kzGetGelir(), gider = kzGetGider();
  const row = {
    tip: STATE.kzTip, sanatci: gs('kz_s'), tarih: gs('kz_t'), durum: gs('kz_d'), not_alani: gs('kz_n'),
    bilet_adet: gv('kz_ba'), bilet_fiyat: gv('kz_bf'),
    bar_ciro: STATE.kzTip === 1 ? gv('kz_bc') : gv('kz2_bc'),
    bilet_ciro: gv('kz_bic'), sponsor: gv('kz_sp'),
    diger_gelir: STATE.kzTip === 1 ? gv('kz_dg') : gv('kz2_dg'),
    destek_tutari: gv('kz2_de'),
    kase: gv('kz_ka'), konser_diger_gider: gv('kz_ko'), ekipman: gv('kz_ek'), guvenlik: gv('kz_gu'),
    ekstra_personel: gv('kz_ex'), kadrolu_personel: gv('kz_kp'), ikram_maliyet: gv('kz_ik'),
    urun_maliyet: gv('kz_um'), bilet_maliyet: gv('kz_bm'), reklam: gv('kz_re'),
    ulasim: gv('kz_ul'), diger_gider: gv('kz_di'),
    toplam_gelir: gelir, toplam_gider: gider, net_kar: gelir - gider
  };
  if (!row.sanatci) { showToast('❌ Sanatçı adı girin', 'err'); return; }
  try {
    setLoading(true);
    if (STATE.kzEditId) {
      const saved = await Konserler.update(STATE.kzEditId, row);
      const idx = STATE.kz.findIndex(r => r.id === STATE.kzEditId);
      if (idx >= 0) STATE.kz[idx] = saved;
    } else {
      const saved = await Konserler.add(row);
      STATE.kz.unshift(saved);
    }
    rKZ(); rAna(); kzClr();
    showToast('✅ Kaydedildi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

function kzClr() {
  STATE.kzEditId = null;
  document.getElementById('kzEB').style.display = 'none';
  document.getElementById('kzFormLbl').textContent = '➕ Konser Girişi';
  document.getElementById('kzSBtn').textContent = '✓ Kaydet';
  const fields = ['kz_s','kz_ba','kz_bf','kz_bc','kz_bic','kz_sp','kz_dg','kz2_bc','kz2_dg','kz2_de','kz_ka','kz_ko','kz_ek','kz_gu','kz_ex','kz_kp','kz_ik','kz_um','kz_bm','kz_re','kz_ul','kz_di','kz_n'];
  fields.forEach(id => sv(id, ''));
  sv('kz_t', today());
  document.getElementById('kzLB').style.display = 'none';
  kzSetTip(1);
}

function kzEdit(id) {
  const r = STATE.kz.find(x => x.id === id); if (!r) return;
  STATE.kzEditId = id;
  kzSetTip(r.tip || 1);
  sv('kz_s', r.sanatci); sv('kz_t', r.tarih); sv('kz_d', r.durum); sv('kz_n', r.not_alani || '');
  sv('kz_ba', r.bilet_adet || ''); sv('kz_bf', r.bilet_fiyat || '');
  sv('kz_bic', r.bilet_ciro || ''); sv('kz_sp', r.sponsor || '');
  if (r.tip === 2) { sv('kz2_bc', r.bar_ciro || ''); sv('kz2_dg', r.diger_gelir || ''); sv('kz2_de', r.destek_tutari || ''); }
  else { sv('kz_bc', r.bar_ciro || ''); sv('kz_dg', r.diger_gelir || ''); }
  sv('kz_ka', r.kase || ''); sv('kz_ko', r.konser_diger_gider || ''); sv('kz_ek', r.ekipman || '');
  sv('kz_gu', r.guvenlik || ''); sv('kz_ex', r.ekstra_personel || ''); sv('kz_kp', r.kadrolu_personel || '');
  sv('kz_ik', r.ikram_maliyet || ''); sv('kz_um', r.urun_maliyet || ''); sv('kz_bm', r.bilet_maliyet || '');
  sv('kz_re', r.reklam || ''); sv('kz_ul', r.ulasim || ''); sv('kz_di', r.diger_gider || '');
  document.getElementById('kzEB').style.display = 'flex';
  document.getElementById('kzEBTxt').textContent = 'Düzenleniyor: ' + r.sanatci;
  document.getElementById('kzFormLbl').textContent = '✏️ Düzenleme: ' + r.sanatci;
  document.getElementById('kzSBtn').textContent = '✓ Güncelle';
  kzLive();
  document.getElementById('pg-kz').scrollTop = 0;
}

async function kzDel(id) {
  if (!confirm('Bu konser kaydını sil?')) return;
  try {
    await Konserler.delete(id);
    STATE.kz = STATE.kz.filter(r => r.id !== id);
    rKZ(); rAna();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rKZ() {
  const tb = document.getElementById('kzBody');
  if (!STATE.kz.length) { tb.innerHTML = '<tr><td colspan="13" class="empty-row">🎤 Konser kaydı yok</td></tr>'; return; }
  tb.innerHTML = STATE.kz.map(r => {
    const m = r.toplam_gelir ? (r.net_kar / r.toplam_gelir * 100).toFixed(1) : 0;
    return `<tr>
      <td><b>${r.sanatci || '—'}</b></td>
      <td>${r.tip === 2 ? chip('Kapı Destek', 'co') : chip('Kaşe+Bilet', 'cb')}</td>
      <td class="tnum">${r.tarih}</td><td>${stChip(r.durum)}</td>
      <td class="tnum">${r.bilet_adet || '—'}</td>
      <td class="tnum">${fmt(r.bar_ciro)}</td>
      <td class="tnum">${r.tip === 2 ? '—' : fmt(r.bilet_ciro)}</td>
      <td class="tnum tpos">${fmt(r.toplam_gelir)}</td>
      <td class="tnum tneg">${fmt(r.toplam_gider)}</td>
      <td class="${r.net_kar >= 0 ? 'tpos' : 'tneg'}">${fmt(r.net_kar)}</td>
      <td>${chip('%' + m, m >= 20 ? 'cg' : m >= 5 ? 'cy' : 'cr')}</td>
      <td class="tmut">${r.not_alani || '—'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn bb bsm" onclick="kzEdit('${r.id}')">✏️</button>
          <button class="btn bd bsm" onclick="kzDel('${r.id}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ============================================
// ÜRÜN KARLILIĞI
// ============================================
function uLive() {
  const s = gv('u_sf'), m = gv('u_ml'), a = gv('u_ad2');
  if (!s) { document.getElementById('uLB').style.display = 'none'; return; }
  const bk = s - m, mj = s ? (bk / s * 100).toFixed(1) : 0;
  document.getElementById('uLB').style.display = 'block';
  document.getElementById('uL_b').textContent = fmt(bk);
  document.getElementById('uL_m').textContent = '%' + mj;
  document.getElementById('uL_c').textContent = fmt(s * a);
  document.getElementById('uL_k').textContent = fmt(bk * a);
}

async function uAdd() {
  const row = { ad: gs('u_ad'), kategori: gs('u_kt'), satis_fiyati: gv('u_sf'), maliyet: gv('u_ml'), aylik_adet: gv('u_ad2') };
  if (!row.ad) { showToast('❌ Ürün adı girin', 'err'); return; }
  try {
    setLoading(true);
    const saved = await Urunler.add(row);
    STATE.u.push(saved);
    rU(); rAna();
    ['u_ad', 'u_sf', 'u_ml', 'u_ad2'].forEach(id => sv(id, ''));
    document.getElementById('uLB').style.display = 'none';
    showToast('✅ Ürün eklendi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function uDel(id) {
  try {
    await Urunler.delete(id);
    STATE.u = STATE.u.filter(r => r.id !== id);
    rU();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rU() {
  const tb = document.getElementById('uBody');
  if (!STATE.u.length) { tb.innerHTML = '<tr><td colspan="10" class="empty-row">🍺 Ürün eklenmedi</td></tr>'; return; }
  const sorted = [...STATE.u].sort((a, b) => (b.satis_fiyati - b.maliyet) * b.aylik_adet - (a.satis_fiyati - a.maliyet) * a.aylik_adet);
  const maxK = Math.max(...sorted.map(r => (r.satis_fiyati - r.maliyet) * r.aylik_adet), 1);
  tb.innerHTML = sorted.map(r => {
    const bk = r.satis_fiyati - r.maliyet, m = r.satis_fiyati ? (bk / r.satis_fiyati * 100).toFixed(1) : 0;
    const ak = bk * r.aylik_adet, bw = Math.round(ak / maxK * 100);
    return `<tr>
      <td><b>${r.ad}</b></td><td class="tmut">${r.kategori}</td>
      <td class="tnum">${fmt(r.satis_fiyati)}</td><td class="tnum tneg">${fmt(r.maliyet)}</td>
      <td class="tnum tpos">${fmt(bk)}</td>
      <td>${chip('%' + m, m >= 50 ? 'cg' : m >= 30 ? 'cy' : 'cr')}</td>
      <td class="tnum">${r.aylik_adet}</td><td class="tnum tpos">${fmt(ak)}</td>
      <td><div class="bar-wrap"><div class="bar-inner" style="width:${bw}%"></div><span>${bw}%</span></div></td>
      <td><button class="btn bd bsm" onclick="uDel('${r.id}')">✕</button></td>
    </tr>`;
  }).join('');
  const el = document.getElementById('anaUL');
  if (el) el.innerHTML = sorted.slice(0, 6).map(r => {
    const m = r.satis_fiyati ? ((r.satis_fiyati - r.maliyet) / r.satis_fiyati * 100).toFixed(0) : 0;
    return `<div class="pb"><div class="pb-l"><span>${r.ad} <span class="tmut">${r.kategori}</span></span><span style="font-family:var(--fm);color:${m >= 50 ? 'var(--gr)' : m >= 30 ? 'var(--acc)' : 'var(--rd)'}">${m}%</span></div><div class="pb-bar"><div class="pb-fill" style="width:${m}%;background:${m >= 50 ? 'var(--gr)' : m >= 30 ? 'var(--acc)' : 'var(--rd)'}"></div></div></div>`;
  }).join('') || '<div class="empty-state">🍺 Ürün eklenmedi</div>';
}

// ============================================
// AYLIK ÖZET
// ============================================
const AY_IDS = ['ay_kp','ay_sg','ay_ep','ay_gv','ay_mz','ay_ki','ay_su','ay_el','ay_dg','ay_ba','ay_mu','ay_kg','ay_kr','ay_il','ay_ai','ay_ig','ay_no','ay_bg','ay_rc','ay_at','ay_bk','ay_bp','ay_tm','ay_my','ay_kv','ay_di'];

async function ayAdd() {
  const ci = gv('ay_ci'), um = gv('ay_um'), ik = gv('ay_ik');
  const g = AY_IDS.reduce((s, id) => s + gv(id), 0);
  const gider_detay = {};
  AY_IDS.forEach(id => { gider_detay[id] = gv(id); });
  const tg = um + ik + g, bk = ci - um - ik, nk = ci - tg;
  const row = {
    ay: parseInt(gs('ay_ay')), yil: parseInt(gs('ay_yl')) || 2026,
    ciro: ci, urun_maliyet: um, ikram_maliyet: ik, diger_giderler: g,
    toplam_gider: tg, brut_kar: bk, net_kar: nk,
    brut_marj: ci ? bk / ci : 0, net_marj: ci ? nk / ci : 0,
    gider_detay
  };
  try {
    setLoading(true);
    const saved = await AylikOzet.upsert(row);
    const idx = STATE.ay.findIndex(r => r.ay === row.ay && r.yil === row.yil);
    if (idx >= 0) STATE.ay[idx] = saved; else STATE.ay.unshift(saved);
    rAy(); rAna();
    showToast('✅ Kaydedildi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function ayDel(id) {
  if (!confirm('Sil?')) return;
  try {
    await AylikOzet.delete(id);
    STATE.ay = STATE.ay.filter(r => r.id !== id);
    rAy(); rAna();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rAy() {
  const tb = document.getElementById('ayBody');
  if (!STATE.ay.length) { tb.innerHTML = '<tr><td colspan="10" class="empty-row">📊 Kayıt yok</td></tr>'; return; }
  tb.innerHTML = [...STATE.ay].sort((a, b) => b.yil - a.yil || b.ay - a.ay).map(r => {
    const bp = (r.brut_marj * 100).toFixed(1), np = (r.net_marj * 100).toFixed(1);
    const gc = r.ciro ? (r.toplam_gider / r.ciro * 100).toFixed(0) : 0;
    return `<tr>
      <td><b>${AYLAR[r.ay]} ${r.yil}</b></td>
      <td class="tnum">${fmt(r.ciro)}</td><td class="tnum tneg">${fmt(r.urun_maliyet + r.ikram_maliyet)}</td>
      <td class="tnum tneg">${fmt(r.toplam_gider)}</td>
      <td class="${r.net_kar >= 0 ? 'tpos' : 'tneg'}">${fmt(r.net_kar)}</td>
      <td>${chip('%' + bp, bp >= 60 ? 'cg' : bp >= 50 ? 'cy' : 'cr')}</td>
      <td>${chip('%' + np, np >= 10 ? 'cg' : np >= 5 ? 'cy' : 'cr')}</td>
      <td class="tnum">%${gc}</td>
      <td>${chip(r.net_kar >= 0 ? 'KÂR' : 'ZARAR', r.net_kar >= 0 ? 'cg' : 'cr')}</td>
      <td><button class="btn bd bsm" onclick="ayDel('${r.id}')">✕</button></td>
    </tr>`;
  }).join('');
}

// ============================================
// GİDERLER
// ============================================
async function giAdd() {
  const row = { tarih: gs('gi_t'), kategori: gs('gi_k'), aciklama: gs('gi_a'), tutar: gv('gi_tu'), odeme_yontemi: gs('gi_o') };
  if (!row.tarih) { showToast('❌ Tarih seçin', 'err'); return; }
  try {
    setLoading(true);
    const saved = await Giderler.add(row);
    STATE.gi.unshift(saved);
    rGi(); sv('gi_a', ''); sv('gi_tu', '');
    showToast('✅ Gider eklendi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function giDel(id) {
  try {
    await Giderler.delete(id);
    STATE.gi = STATE.gi.filter(r => r.id !== id);
    rGi();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rGi() {
  const tb = document.getElementById('giBody');
  if (!STATE.gi.length) { tb.innerHTML = '<tr><td colspan="6" class="empty-row">💸 Kayıt yok</td></tr>'; return; }
  tb.innerHTML = STATE.gi.map(r => `<tr>
    <td class="tnum">${r.tarih}</td><td>${r.kategori}</td>
    <td class="tmut">${r.aciklama || '—'}</td>
    <td class="tnum tneg">${fmt(r.tutar)}</td><td>${r.odeme_yontemi}</td>
    <td><button class="btn bd bsm" onclick="giDel('${r.id}')">✕</button></td>
  </tr>`).join('');
}

// ============================================
// PERSONEL
// ============================================
async function pAdd() {
  const row = { ad_soyad: gs('p_ad'), pozisyon: gs('p_pz'), tur: gs('p_tr'), aylik_maas: gv('p_ma'), sgk: gv('p_sg'), telefon: gs('p_te') };
  if (!row.ad_soyad) { showToast('❌ Ad soyad girin', 'err'); return; }
  try {
    setLoading(true);
    const saved = await Personel.add(row);
    STATE.p.push(saved);
    rP(); ['p_ad', 'p_ma', 'p_sg', 'p_te'].forEach(id => sv(id, ''));
    showToast('✅ Personel eklendi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function pDel(id) {
  if (!confirm('Sil?')) return;
  try {
    await Personel.delete(id);
    STATE.p = STATE.p.filter(r => r.id !== id);
    rP();
    showToast('✅ Silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
}

function rP() {
  const el = document.getElementById('pListe');
  if (!STATE.p.length) { el.innerHTML = '<div class="empty-state">👥 Personel eklenmedi</div>'; document.getElementById('pMaas').innerHTML = ''; return; }
  el.innerHTML = STATE.p.map((r, i) => {
    const c = PA_COLORS[i % PA_COLORS.length], ini = (r.ad_soyad || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="pc"><div class="pa" style="background:${c}22;color:${c}">${ini}</div>
      <div class="pi"><div class="pi-n">${r.ad_soyad}</div><div class="pi-r">${r.pozisyon} · ${r.tur}</div></div>
      <div class="pr">${r.telefon ? `<span class="tmut" style="font-family:var(--fm)">${r.telefon}</span>` : ''}
        ${chip(fmt(r.aylik_maas), 'cg')}
        <button class="btn bd bsm" onclick="pDel('${r.id}')">✕</button>
      </div></div>`;
  }).join('');
  const tm = STATE.p.reduce((s, r) => s + (r.aylik_maas || 0), 0);
  const ts = STATE.p.reduce((s, r) => s + (r.sgk || 0), 0);
  const byT = {};
  STATE.p.forEach(r => { byT[r.tur] = (byT[r.tur] || 0) + (r.aylik_maas || 0); });
  document.getElementById('pMaas').innerHTML = `
    <div style="margin-bottom:14px"><div class="lv-l">Toplam Aylık Maaş</div><div style="font-family:var(--fm);font-size:22px;font-weight:700;color:var(--gr);margin-top:3px">${fmt(tm)}</div></div>
    <div style="margin-bottom:14px"><div class="lv-l">Toplam SGK</div><div style="font-family:var(--fm);font-size:18px;font-weight:700;color:var(--or);margin-top:3px">${fmt(ts)}</div></div>
    <div class="dv"></div>
    ${Object.entries(byT).map(([t, v]) => `<div class="pb"><div class="pb-l"><span>${t}</span><span style="font-family:var(--fm)">${fmt(v)}</span></div><div class="pb-bar"><div class="pb-fill" style="width:${tm ? (v / tm * 100).toFixed(0) : 0}%;background:var(--acc)"></div></div></div>`).join('')}
    <div class="dv"></div>
    <div class="tmut">👥 ${STATE.p.length} çalışan • Ort. ${fmt(STATE.p.length ? tm / STATE.p.length : 0)}</div>`;
}

// ============================================
// ANA PANEL
// ============================================
function rAna() {
  const tc = STATE.g.reduce((s, r) => s + (r.ciro || 0), 0);
  const tm = STATE.g.reduce((s, r) => s + ((r.urun_maliyet || 0) + (r.ikram_maliyet || 0)), 0);
  const bk = tc - tm;
  const kk = STATE.kz.reduce((s, r) => s + (r.net_kar || 0), 0);
  const latAy = [...STATE.ay].sort((a, b) => b.yil - a.yil || b.ay - a.ay)[0];
  const kpis = [
    { l: 'Toplam Ciro', v: fmt(tc), c: 'var(--bl)', f: STATE.g.length + ' gün kayıtlı' },
    { l: 'Brüt Kar', v: fmt(bk), c: bk >= 0 ? 'var(--gr)' : 'var(--rd)', f: tc ? chip('%' + (bk / tc * 100).toFixed(1), bk >= 0 ? 'cg' : 'cr') : '—' },
    { l: 'Konser Net Kar', v: fmt(kk), c: kk >= 0 ? 'var(--gr)' : 'var(--rd)', f: STATE.kz.length + ' konser' },
    { l: 'Aktif Personel', v: STATE.p.length, c: 'var(--pu)', f: fmt(STATE.p.reduce((s, r) => s + (r.aylik_maas || 0), 0)) + '/ay' },
    { l: 'Kayıtlı Ürün', v: STATE.u.length, c: 'var(--cy)', f: '' },
    ...(latAy ? [{ l: AYLAR[latAy.ay] + ' Net Marj', v: '%' + (latAy.net_marj * 100).toFixed(1), c: latAy.net_marj >= .1 ? 'var(--gr)' : latAy.net_marj >= 0 ? 'var(--acc)' : 'var(--rd)', f: AYLAR[latAy.ay] + ' ' + latAy.yil }] : [])
  ];
  document.getElementById('anaKpis').innerHTML = kpis.map(k =>
    `<div class="kc"><div class="kc-t" style="background:${k.c}"></div><div class="kc-l">${k.l}</div><div class="kc-v" style="color:${k.c}">${k.v}</div><div class="kc-f">${k.f}</div></div>`
  ).join('');
  const s7 = [...STATE.g].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 7).reverse();
  mkChart('cA7', 'bar', { labels: s7.map(r => r.tarih.slice(5)), datasets: [{ label: 'Ciro', data: s7.map(r => r.ciro), backgroundColor: STATE.cfg.accent + '44', borderColor: STATE.cfg.accent, borderWidth: 2, borderRadius: 4 }] });
  const aS = [...STATE.ay].sort((a, b) => a.yil - b.yil || a.ay - b.ay);
  if (aS.length) mkChart('cAT', 'bar', { labels: aS.map(r => AYLAR[r.ay].slice(0, 3)), datasets: [{ label: 'Ciro', data: aS.map(r => r.ciro), backgroundColor: STATE.cfg.accent + '33', borderColor: STATE.cfg.accent, borderWidth: 1.5, borderRadius: 3 }, { label: 'Net Kar', data: aS.map(r => r.net_kar), backgroundColor: r => r.raw >= 0 ? 'rgba(46,204,138,.4)' : 'rgba(232,80,58,.4)', borderColor: r => r.raw >= 0 ? '#2ecc8a' : '#e8503a', borderWidth: 1.5, borderRadius: 3 }] });
  else clrChart('cAT', 'Aylık veri girin');
  const kEl = document.getElementById('anaKL');
  if (STATE.kz.length) {
    kEl.innerHTML = `<table><thead><tr><th>Sanatçı</th><th>Tip</th><th>Tarih</th><th>Kar/Zarar</th></tr></thead><tbody>` +
      [...STATE.kz].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 5).map(r => {
        const m = r.toplam_gelir ? (r.net_kar / r.toplam_gelir * 100).toFixed(0) : 0;
        return `<tr><td><b>${r.sanatci || '—'}</b></td><td>${r.tip === 2 ? chip('Kapı', 'co') : chip('Kaşe', 'cb')}</td><td class="tnum tmut">${r.tarih}</td><td class="${r.net_kar >= 0 ? 'tpos' : 'tneg'}">${fmt(r.net_kar)}</td></tr>`;
      }).join('') + '</tbody></table>';
  } else kEl.innerHTML = '<div class="empty-state">🎤 Konser kaydı yok</div>';
  rU();
}

// ============================================
// GRAFİKLER
// ============================================
function rGrafik() {
  const aS = [...STATE.ay].sort((a, b) => a.yil - b.yil || a.ay - b.ay);
  const lbl = aS.map(r => AYLAR[r.ay].slice(0, 3) + ' ' + String(r.yil).slice(2));
  if (aS.length) {
    mkChart('cTr', 'bar', { labels: lbl, datasets: [{ label: 'Ciro', data: aS.map(r => r.ciro), backgroundColor: STATE.cfg.accent + '44', borderColor: STATE.cfg.accent, borderWidth: 2, borderRadius: 4 }, { label: 'Net Kar', data: aS.map(r => r.net_kar), backgroundColor: r => r.raw >= 0 ? 'rgba(46,204,138,.4)' : 'rgba(232,80,58,.4)', borderColor: r => r.raw >= 0 ? '#2ecc8a' : '#e8503a', borderWidth: 2, borderRadius: 4 }] });
    mkChart('cMj', 'line', { labels: lbl, datasets: [{ label: 'Brüt %', data: aS.map(r => +(r.brut_marj * 100).toFixed(1)), borderColor: '#2ecc8a', backgroundColor: 'rgba(46,204,138,.1)', fill: true, tension: .4, pointRadius: 4 }, { label: 'Net %', data: aS.map(r => +(r.net_marj * 100).toFixed(1)), borderColor: STATE.cfg.accent, backgroundColor: STATE.cfg.accent + '18', fill: true, tension: .4, pointRadius: 4 }] });
  } else { clrChart('cTr', 'Aylık veri yok'); clrChart('cMj', 'Aylık veri yok'); }
  if (STATE.gi.length) {
    const cm = {}; STATE.gi.forEach(g => { cm[g.kategori] = (cm[g.kategori] || 0) + (g.tutar || 0); });
    const cats = Object.entries(cm).sort((a, b) => b[1] - a[1]).slice(0, 8);
    mkChart('cGD', 'doughnut', { labels: cats.map(c => c[0]), datasets: [{ data: cats.map(c => c[1]), backgroundColor: ['#f5c842','#2ecc8a','#4f8ef7','#9b72f5','#e8503a','#22d3ee','#f97316','#94a3b8'], borderColor: 'transparent', hoverOffset: 8 }] }, { plugins: { legend: { position: 'right', labels: { color: '#8e90a8', font: { size: 11 }, padding: 8, boxWidth: 10 } } } });
  } else clrChart('cGD', 'Gider kaydı yok');
  if (STATE.kz.length) {
    const ks = [...STATE.kz].sort((a, b) => a.tarih.localeCompare(b.tarih));
    mkChart('cKB', 'bar', { labels: ks.map(r => r.sanatci || '?'), datasets: [{ label: 'Gelir', data: ks.map(r => r.toplam_gelir), backgroundColor: 'rgba(46,204,138,.45)', borderColor: '#2ecc8a', borderWidth: 2, borderRadius: 4 }, { label: 'Gider', data: ks.map(r => r.toplam_gider), backgroundColor: 'rgba(232,80,58,.45)', borderColor: '#e8503a', borderWidth: 2, borderRadius: 4 }, { label: 'Net Kar', data: ks.map(r => r.net_kar), backgroundColor: r => r.raw >= 0 ? 'rgba(245,200,66,.6)' : 'rgba(232,80,58,.3)', borderColor: r => r.raw >= 0 ? STATE.cfg.accent : '#e8503a', borderWidth: 2, borderRadius: 4 }] });
  } else clrChart('cKB', 'Konser kaydı yok');
  if (STATE.u.length) {
    const us = [...STATE.u].sort((a, b) => (b.satis_fiyati - b.maliyet) * b.aylik_adet - (a.satis_fiyati - a.maliyet) * a.aylik_adet).slice(0, 10);
    mkChart('cUB', 'bar', { labels: us.map(u => u.ad), datasets: [{ label: 'Aylık Ciro', data: us.map(u => u.satis_fiyati * u.aylik_adet), backgroundColor: 'rgba(79,142,247,.45)', borderColor: '#4f8ef7', borderWidth: 2, borderRadius: 4 }, { label: 'Aylık Kar', data: us.map(u => (u.satis_fiyati - u.maliyet) * u.aylik_adet), backgroundColor: 'rgba(46,204,138,.45)', borderColor: '#2ecc8a', borderWidth: 2, borderRadius: 4 }] });
  } else clrChart('cUB', 'Ürün kaydı yok');
  const s14 = [...STATE.g].sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 14).reverse();
  if (s14.length) mkChart('cG14', 'line', { labels: s14.map(r => r.tarih.slice(5)), datasets: [{ label: 'Ciro', data: s14.map(r => r.ciro), borderColor: STATE.cfg.accent, backgroundColor: STATE.cfg.accent + '18', fill: true, tension: .4, pointRadius: 3 }, { label: 'Brüt Kar', data: s14.map(r => (r.ciro || 0) - ((r.urun_maliyet || 0) + (r.ikram_maliyet || 0))), borderColor: '#2ecc8a', backgroundColor: 'rgba(46,204,138,.1)', fill: true, tension: .4, pointRadius: 3 }] });
  else clrChart('cG14', 'Günlük veri yok');
}

// ============================================
// RAPORLAR
// ============================================
function rRapor() {
  const latAy = [...STATE.ay].sort((a, b) => b.yil - a.yil || b.ay - a.ay)[0];
  const kk = STATE.kz.reduce((s, r) => s + (r.net_kar || 0), 0);
  const uk = STATE.u.reduce((s, r) => s + (r.satis_fiyati - r.maliyet) * r.aylik_adet, 0);
  const pm = STATE.p.reduce((s, r) => s + (r.aylik_maas || 0) + (r.sgk || 0), 0);
  document.getElementById('raporIc').innerHTML = `
  <div class="card"><div class="ct"><div class="ct-l">📊 Genel Durum</div></div>
  <div class="g4">
    <div class="kc"><div class="kc-t" style="background:var(--bl)"></div><div class="kc-l">Kayıtlı Ciro</div><div class="kc-v" style="color:var(--bl);font-size:17px">${fmt(STATE.g.reduce((s, r) => s + (r.ciro || 0), 0))}</div></div>
    <div class="kc"><div class="kc-t" style="background:${kk >= 0 ? 'var(--gr)' : 'var(--rd)'}"></div><div class="kc-l">Konser Net Kar</div><div class="kc-v" style="color:${kk >= 0 ? 'var(--gr)' : 'var(--rd)'};font-size:17px">${fmt(kk)}</div></div>
    <div class="kc"><div class="kc-t" style="background:var(--acc)"></div><div class="kc-l">Ürün Aylık Kar Pot.</div><div class="kc-v" style="color:var(--acc);font-size:17px">${fmt(uk)}</div></div>
    <div class="kc"><div class="kc-t" style="background:var(--pu)"></div><div class="kc-l">Aylık Personel</div><div class="kc-v" style="color:var(--pu);font-size:17px">${fmt(pm)}</div></div>
  </div></div>
  ${latAy ? `<div class="card"><div class="ct"><div class="ct-l">📅 ${AYLAR[latAy.ay]} ${latAy.yil}</div></div>
  <div class="g3" style="margin-bottom:14px">
    <div><div class="lv-l">Ciro</div><div style="font-family:var(--fm);font-size:20px;font-weight:700;color:var(--bl);margin-top:3px">${fmt(latAy.ciro)}</div></div>
    <div><div class="lv-l">Net Kar/Zarar</div><div style="font-family:var(--fm);font-size:20px;font-weight:700;color:${latAy.net_kar >= 0 ? 'var(--gr)' : 'var(--rd)'};margin-top:3px">${fmt(latAy.net_kar)}</div></div>
    <div><div class="lv-l">Gider/Ciro</div><div style="font-family:var(--fm);font-size:20px;font-weight:700;color:var(--acc);margin-top:3px">%${latAy.ciro ? (latAy.toplam_gider / latAy.ciro * 100).toFixed(1) : 0}</div></div>
  </div>
  <div class="pb"><div class="pb-l"><span>Brüt Marj</span><span>${(latAy.brut_marj * 100).toFixed(1)}% ${latAy.brut_marj >= .6 ? '✅ Çok iyi' : latAy.brut_marj >= .5 ? '⚠️ Normal' : '❌ Düşük'}</span></div><div class="pb-bar"><div class="pb-fill" style="width:${Math.min(latAy.brut_marj * 100, 100)}%;background:${latAy.brut_marj >= .6 ? 'var(--gr)' : latAy.brut_marj >= .5 ? 'var(--acc)' : 'var(--rd)'}"></div></div></div>
  <div class="pb"><div class="pb-l"><span>Net Marj</span><span>${(latAy.net_marj * 100).toFixed(1)}% ${latAy.net_marj >= .1 ? '✅ İyi' : latAy.net_marj >= .05 ? '⚠️ Normal' : '❌ Düşük'}</span></div><div class="pb-bar"><div class="pb-fill" style="width:${Math.min(Math.abs(latAy.net_marj * 100), 100)}%;background:${latAy.net_marj >= .1 ? 'var(--gr)' : latAy.net_marj >= 0 ? 'var(--acc)' : 'var(--rd)'}"></div></div></div>
  </div>` : ''}
  ${STATE.kz.length ? `<div class="card"><div class="ct"><div class="ct-l">🎤 Konser Özet</div></div>
  <div class="tw"><table><thead><tr><th>Sanatçı</th><th>Tip</th><th>Tarih</th><th>Gelir</th><th>Gider</th><th>Kar/Zarar</th><th>Marj</th></tr></thead><tbody>
  ${[...STATE.kz].sort((a, b) => b.net_kar - a.net_kar).map(r => { const m = r.toplam_gelir ? (r.net_kar / r.toplam_gelir * 100).toFixed(1) : 0; return `<tr><td><b>${r.sanatci}</b></td><td>${r.tip === 2 ? chip('Kapı', 'co') : chip('Kaşe', 'cb')}</td><td class="tnum tmut">${r.tarih}</td><td class="tnum tpos">${fmt(r.toplam_gelir)}</td><td class="tnum tneg">${fmt(r.toplam_gider)}</td><td class="${r.net_kar >= 0 ? 'tpos' : 'tneg'}">${fmt(r.net_kar)}</td><td>${chip('%' + m, m >= 20 ? 'cg' : m >= 5 ? 'cy' : 'cr')}</td></tr>`; }).join('')}
  </tbody></table></div></div>` : ''}
  <div class="alert a-b" style="margin-top:0"><b>💡 Referans:</b> Brüt marj %60+ çok iyi, %50-60 normal. Net marj %10+ hedef.</div>`;
}

// ============================================
// CHART HELPERS
// ============================================
function mkChart(id, type, data, extra = {}) {
  if (STATE.charts[id]) { STATE.charts[id].destroy(); delete STATE.charts[id]; }
  const cv = document.getElementById(id); if (!cv) return;
  STATE.charts[id] = new Chart(cv, {
    type, data, options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8e90a8', font: { size: 11 }, padding: 7, boxWidth: 10 } },
        tooltip: { backgroundColor: '#181926', titleColor: '#dde0f0', bodyColor: '#8e90a8', borderColor: '#2c2e48', borderWidth: 1, padding: 9, callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.raw)}` } }
      },
      scales: type === 'doughnut' ? {} : {
        x: { grid: { color: 'rgba(44,46,72,.4)' }, ticks: { color: '#52546a', font: { size: 11 } } },
        y: { grid: { color: 'rgba(44,46,72,.4)' }, ticks: { color: '#52546a', font: { size: 11 }, callback: v => fmt(v) } }
      },
      ...extra
    }
  });
}

function clrChart(id, msg) {
  if (STATE.charts[id]) { STATE.charts[id].destroy(); delete STATE.charts[id]; }
  const cv = document.getElementById(id); if (!cv) return;
  cv.parentElement.innerHTML = `<div class="empty-state" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:24px;opacity:.3;margin-bottom:8px">📊</div>${msg}</div>`;
}

// ============================================
// YEDEK İŞLEMLERİ
// ============================================
async function handleYedekAl() {
  try {
    setLoading(true);
    await Yedek.indir();
    showToast('✅ Yedek indirildi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function handleYedekYukle(event) {
  const f = event.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async ev => {
    try {
      setLoading(true);
      await Yedek.yukle(ev.target.result);
      await loadAllData();
      renderAll();
      document.getElementById('yMsg').innerHTML = '<span style="color:var(--gr)">✅ Yedek yüklendi!</span>';
      showToast('✅ Yedek başarıyla yüklendi');
    } catch (e) {
      document.getElementById('yMsg').innerHTML = '<span style="color:var(--rd)">❌ ' + e.message + '</span>';
      showToast('❌ ' + e.message, 'err');
    } finally { setLoading(false); }
  };
  r.readAsText(f);
}

async function handleVerileriSifirla() {
  if (!confirm('TÜM VERİLER SİLİNECEK!') || !confirm('Bu işlem geri alınamaz. Son onay:')) return;
  try {
    setLoading(true);
    const tables = ['gunluk_satis','konserler','urunler','aylik_ozet','giderler','personel'];
    for (const t of tables) {
      await sb.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    STATE.g = []; STATE.kz = []; STATE.u = []; STATE.ay = []; STATE.gi = []; STATE.p = [];
    renderAll();
    showToast('✅ Tüm veriler silindi');
  } catch (e) { showToast('❌ ' + e.message, 'err'); }
  finally { setLoading(false); }
}
