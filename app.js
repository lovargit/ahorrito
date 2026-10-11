'use strict';

/* =========================================================
   Ahorrito — metas de ahorro con mascota motivadora
   Todos los datos se guardan en el teléfono (localStorage).
   ========================================================= */

// Link de tu servidor de recordatorios (Cloudflare Worker). Si lo pones aquí,
// ya no tienes que pegarlo en Ajustes. Ej: 'https://ahorrito-recordatorios.tu-usuario.workers.dev'
const DEFAULT_SERVER = '';

const STORE_KEY = 'ahorrito.v1';
const SYNC_KEY = 'ahorrito.sync';
const FREQS = {
  semanal:   { label: 'Semanal',   unit: 'semana',   units: 'semanas',   esta: 'esta semana',   pasada: 'la semana pasada',   nueva: 'Nueva semana',   ultimo: 'Último día de la semana' },
  quincenal: { label: 'Quincenal', unit: 'quincena', units: 'quincenas', esta: 'esta quincena', pasada: 'la quincena pasada', nueva: 'Nueva quincena', ultimo: 'Último día de la quincena' },
  mensual:   { label: 'Mensual',   unit: 'mes',      units: 'meses',     esta: 'este mes',      pasada: 'el mes pasado',      nueva: 'Nuevo mes',      ultimo: 'Último día del mes' },
};
const EMOJIS = ['✈️', '🗾', '🏖️', '🏠', '🚗', '🎓', '💍', '🎮', '💻', '📱', '🐶', '🎁', '🩺', '💰'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

let state = load();
let orderMode = false;
let draft = null; // formulario en edición

/* ---------- Guardado ---------- */
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* datos corruptos: empezamos de cero */ }
  return withDefaults(s && Array.isArray(s.goals) ? s : { version: 1, goals: [] });
}
function withDefaults(s) {
  const def = { pet: 'chihuahua', customImg: null, reminders: { enabled: false, hour: '10:00', start: true, last: true, server: DEFAULT_SERVER } };
  s.settings = { ...def, ...(s.settings || {}) };
  s.settings.reminders = { ...def.reminders, ...(s.settings.reminders || {}) };
  return s;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('No se pudo guardar 😟'); }
  scheduleSync();
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const findGoal = id => state.goals.find(g => g.id === id);

/* ---------- Fechas ---------- */
const pad = n => String(n).padStart(2, '0');
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parseISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function today() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const halfIndex = d => (d.getFullYear() * 12 + d.getMonth()) * 2 + (d.getDate() > 15 ? 1 : 0);
const monthIndex = d => d.getFullYear() * 12 + d.getMonth();
const fmtDate = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const fmtShort = d => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

// Número de periodo (0, 1, 2…) en que cae `d`, contando desde `base`.
// Semanas: bloques de 7 días desde el inicio. Quincenas: 1–15 y 16–fin de mes. Meses: calendario.
function periodIdx(freq, base, d) {
  if (freq === 'semanal') return Math.floor(daysBetween(base, d) / 7);
  if (freq === 'quincenal') return halfIndex(d) - halfIndex(base);
  return monthIndex(d) - monthIndex(base);
}
const periodsInclusive = (freq, from, to) => Math.max(0, periodIdx(freq, from, to) + 1);

function periodEnd(freq, base, idx) {
  if (freq === 'semanal') { const d = new Date(base); d.setDate(d.getDate() + idx * 7 + 6); return d; }
  if (freq === 'quincenal') {
    const h = halfIndex(base) + idx, m = Math.floor(h / 2);
    const y = Math.floor(m / 12), mo = m % 12;
    return h % 2 === 0 ? new Date(y, mo, 15) : new Date(y, mo + 1, 0);
  }
  const m = monthIndex(base) + idx;
  return new Date(Math.floor(m / 12), (m % 12) + 1, 0);
}

// Tiempo de hoy a `end` en meses de calendario + días ("5 meses y 3 días").
function timeLeftText(end) {
  const t = today(), days = daysBetween(t, end);
  if (days <= 0) return 'hoy';
  let months = (end.getFullYear() - t.getFullYear()) * 12 + end.getMonth() - t.getMonth();
  const addMonths = n => new Date(t.getFullYear(), t.getMonth() + n, Math.min(t.getDate(), new Date(t.getFullYear(), t.getMonth() + n + 1, 0).getDate()));
  if (addMonths(months) > end) months--;
  const rest = daysBetween(addMonths(months), end);
  if (months <= 0) return `${days} día${days === 1 ? '' : 's'}`;
  return `${months} mes${months === 1 ? '' : 'es'}${rest ? ` y ${rest} día${rest === 1 ? '' : 's'}` : ''}`;
}

/* ---------- Dinero ---------- */
const moneyFmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2, minimumFractionDigits: 0 });
const money = n => moneyFmt.format(Math.round((n || 0) * 100) / 100);
const parseMoney = s => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; };
const round2 = n => Math.round(n * 100) / 100;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Cálculos de cada meta ---------- */
function stats(g) {
  const t = today(), start = parseISO(g.start), end = parseISO(g.deadline);
  const F = FREQS[g.freq];
  const saved = round2((+g.initial || 0) + g.deposits.reduce((s, d) => s + d.amount, 0));
  const cur = periodIdx(g.freq, start, t);
  const last = periodIdx(g.freq, start, end);
  const done = new Set(g.deposits.map(d => periodIdx(g.freq, start, parseISO(d.date))));
  const ended = t > end;
  const daysLeft = Math.max(0, daysBetween(t, end));
  const doneCur = done.has(cur);

  // Racha: periodos seguidos con depósito, terminando en el actual (o el anterior si aún no toca).
  let k = doneCur ? cur : cur - 1, streak = 0;
  while (k >= 0 && done.has(k)) { streak++; k--; }
  const lost = !ended && cur >= 1 && !doneCur && !done.has(cur - 1);

  const periodsLeft = Math.max(0, last - cur + 1 - (doneCur ? 1 : 0));
  const curEnd = periodEnd(g.freq, start, cur);
  let target, suggested, expected = null;
  if (g.type === 'meta') {
    target = g.target;
    const rem = Math.max(0, target - saved);
    suggested = rem ? Math.ceil(rem / Math.max(1, periodsLeft)) : 0;
  } else {
    target = round2((+g.initial || 0) + g.amount * (last + 1));
    suggested = g.amount;
    expected = round2((+g.initial || 0) + g.amount * (Math.min(cur, last) + 1));
  }
  const remaining = Math.max(0, round2(target - saved));
  const completed = saved >= target && target > 0;
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  let mood = 'idle';
  if (completed || doneCur) mood = 'happy';
  else if (lost) mood = 'sad';

  return { F, saved, target, remaining, completed, pct, cur, last, done, doneCur, ended, daysLeft,
           streak, lost, periodsLeft, suggested, expected, curEnd, end, mood };
}

// Cuánto tocaría ahorrar desde hoy con cada frecuencia (para metas).
function equivalents(remaining, deadline) {
  const t = today(), end = parseISO(deadline);
  return Object.keys(FREQS).map(f => {
    const n = Math.max(1, periodsInclusive(f, t, end));
    return { f, n, per: Math.ceil(remaining / n) };
  });
}

/* ---------- Mascota ---------- */
// Una mascota es { id, img }: id = chihuahua | pug | dino | gato | custom; img = imagen si es custom.
const defaultPet = () => ({ id: state.settings.pet, img: state.settings.customImg });
// Cada meta puede tener su propia mascota; si no tiene, usa la predeterminada.
const petOf = g => g && g.pet ? { id: g.pet, img: g.petImg || state.settings.customImg } : defaultPet();
const petInfo = (pet = defaultPet()) => (pet.id === 'custom' && pet.img) ? CUSTOM_PET : (PETS[pet.id] || PETS.chihuahua);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function petStage(mood, size = '', extra = '', pet = defaultPet()) {
  const inner = pet.id === 'custom' && pet.img
    ? `<div class="pet custom"><img src="${pet.img}" alt=""></div>`
    : (PETS[pet.id] || PETS.chihuahua).svg();
  return `<div class="pet-stage ${size} mood-${mood} ${extra}"><div class="pet-shadow"></div><div class="pet-jumper">${inner}</div></div>`;
}

/* ---------- Router ---------- */
const app = document.getElementById('app');
window.addEventListener('hashchange', render);

function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

function render() {
  const [view, id] = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  draft = null;
  if (view === 'meta' && findGoal(id)) return renderDetail(findGoal(id));
  if (view === 'nueva') return renderForm(null);
  if (view === 'editar' && findGoal(id)) return renderForm(findGoal(id));
  if (view === 'ajustes') return renderSettings();
  renderList();
}

/* ---------- Lista de metas ---------- */
function renderList() {
  const goals = state.goals;
  if (goals.length < 1) orderMode = false;
  const total = goals.reduce((s, g) => s + stats(g).saved, 0);
  const anyHappy = goals.some(g => stats(g).mood === 'happy');

  app.innerHTML = `
    <div class="header">
      <div><h1>Ahorrito</h1><p>${goals.length ? `${goals.length} meta${goals.length > 1 ? 's' : ''} activa${goals.length > 1 ? 's' : ''}` : 'Tu mascota del ahorro'}</p></div>
      <div class="header-actions">
        ${goals.length ? `<button class="pill-btn ${orderMode ? 'on' : ''}" data-action="toggle-order">${orderMode ? 'Listo' : 'Ordenar'}</button>` : ''}
        <button class="icon-btn" data-action="settings" aria-label="Ajustes">⚙️</button>
      </div>
    </div>
    ${installTip()}
    ${goals.length ? `
      <div class="card summary">
        ${petStage(anyHappy ? 'happy' : 'idle', 'small')}
        <div><div class="label">Total ahorrado</div><div class="big">${money(total)}</div></div>
      </div>
      ${goals.map((g, i) => goalCard(g, i)).join('')}
    ` : `
      <div class="card empty">
        ${petStage('idle')}
        <h2>¡Hola! 🐾</h2>
        <p>Crea tu primera meta y yo te echo porras cada vez que ahorres.</p>
        <button class="btn salmon" data-action="new">Crear mi primera meta</button>
      </div>
    `}
    ${goals.length && !orderMode ? `<button class="fab" data-action="new">＋ Nueva meta</button>` : ''}
  `;
}

function goalCard(g, i) {
  const s = stats(g);
  let todo, cls = '';
  if (s.completed) { todo = '🎉 ¡Meta cumplida!'; cls = 'done'; }
  else if (s.ended) { todo = 'Llegó la fecha'; }
  else if (s.doneCur) { todo = `✓ Listo ${s.F.esta}`; cls = 'done'; }
  else if (s.lost) { todo = `Te toca ${money(s.suggested)} · racha perdida`; cls = 'lost'; }
  else { todo = `Te toca ${money(s.suggested)} ${s.F.esta}`; }

  const typeLabel = g.type === 'meta' ? `<b>Meta</b>` : `<b>Puedo ahorrar</b>`;
  return `
    <article class="card goal" ${orderMode ? '' : `data-action="open" data-id="${g.id}"`}>
      <div class="goal-top">
        <div class="emoji">${esc(g.emoji || '💰')}</div>
        <div class="goal-info">
          <h3>${esc(g.name)}</h3>
          <span class="badge ${g.type === 'meta' ? '' : 'cap'}">${typeLabel} · ${s.F.label} · ${fmtShort(s.end)}</span>
        </div>
        ${petStage(s.mood, 'mini', '', petOf(g))}
      </div>
      <div class="progress ${g.type === 'meta' ? '' : 'cap'}"><div style="width:${s.pct}%"></div></div>
      <div class="goal-nums"><span><b>${money(s.saved)}</b> de ${money(s.target)}</span><span>${Math.floor(s.pct)}%</span></div>
      ${orderMode ? `
        <div class="order-tools">
          <button data-action="up" data-id="${g.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
          <button data-action="down" data-id="${g.id}" ${i === state.goals.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
          <button class="del" data-action="delete" data-id="${g.id}" aria-label="Borrar">🗑</button>
        </div>` : `
        <div class="goal-foot">
          <span class="todo ${cls}">${todo}</span>
          <span class="streak ${s.streak ? '' : 'off'}">🔥 ${s.streak}</span>
        </div>`}
    </article>`;
}

function installTip() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let hidden = false;
  try { hidden = localStorage.getItem('ahorrito.tip') === '1'; } catch (e) {}
  if (!ios || standalone || hidden) return '';
  return `<div class="install-tip"><span>📲</span><span>Instálame: toca <b>Compartir</b> <span aria-hidden="true">⬆️</span> y luego <b>“Agregar a inicio”</b>.</span><button data-action="hide-tip" aria-label="Cerrar">×</button></div>`;
}

/* ---------- Detalle de una meta ---------- */
function renderDetail(g) {
  const s = stats(g);
  const F = s.F;
  let title, msg;
  if (s.completed) {
    title = '¡Lo lograste! 🎉';
    msg = `Juntaste <strong>${money(s.saved)}</strong>. ¡${cap(petInfo(petOf(g)).the)} está feliz de la vida!`;
  } else if (s.ended) {
    title = 'Llegó la fecha';
    msg = `Ahorraste <strong>${money(s.saved)}</strong> de ${money(s.target)}. Puedes editar la meta para darte más tiempo.`;
  } else if (s.lost) {
    title = 'Se perdió la racha…';
    msg = `No apartaste nada ${F.pasada}. Aparta <strong>${money(s.suggested)}</strong> ${F.esta} para animar a ${petInfo(petOf(g)).the}.`;
  } else if (s.doneCur) {
    title = `¡Cumpliste ${F.esta}!`;
    msg = s.periodsLeft
      ? `Próximo apartado: <strong>${money(s.suggested)}</strong> a partir del ${fmtShort(new Date(s.curEnd.getTime() + 86400000))}.`
      : 'Ya no quedan más periodos. ¡Excelente!';
  } else {
    title = `Te toca ${money(s.suggested)}`;
    msg = `Aparta ${F.esta}; tienes hasta el <strong>${fmtShort(s.curEnd)}</strong>.`;
  }

  // Animar la caída a gris solo la primera vez que se ve la racha perdida en este periodo.
  const animateSad = s.lost && g.sadSeen !== s.cur;
  if (animateSad) { g.sadSeen = s.cur; save(); }

  let plan;
  if (g.type === 'meta') {
    const eq = equivalents(s.remaining, g.deadline);
    plan = s.completed ? '' : `
      <div class="card">
        <p class="section-title">Para llegar a tiempo, desde hoy</p>
        ${eq.map(e => `
          <div class="plan-row ${e.f === g.freq ? 'sel' : ''}">
            <span>${FREQS[e.f].label}<small>${e.n} ${e.n === 1 ? FREQS[e.f].unit : FREQS[e.f].units}</small></span>
            <b>${money(e.per)}</b>
          </div>`).join('')}
        <p class="note">Faltan ${money(s.remaining)} y ${timeLeftText(s.end)} (${fmtDate(s.end)}).</p>
      </div>`;
  } else {
    const diff = round2(s.saved - s.expected);
    plan = `
      <div class="card">
        <p class="section-title">Tu plan</p>
        <div class="plan-row sel"><span>Apartas ${F.label.toLowerCase()}<small>${s.last + 1} ${s.last === 0 ? F.unit : F.units} en total</small></span><b>${money(g.amount)}</b></div>
        <div class="plan-row"><span>El ${fmtDate(s.end)} tendrás</span><b>${money(s.target)}</b></div>
        ${s.ended ? '' : diff >= 0
          ? `<p class="note good">${diff > 0 ? `Vas adelantado ${money(diff)} 🚀` : 'Vas al corriente ✓'}</p>`
          : `<p class="note bad">Vas ${money(-diff)} atrás de tu plan.</p>`}
      </div>`;
  }

  const deps = [...g.deposits].sort((a, b) => b.ts - a.ts);
  app.innerHTML = `
    <div class="topbar">
      <button class="link-btn" data-action="home">‹ Metas</button>
      <button class="link-btn" data-action="edit" data-id="${g.id}">Editar</button>
    </div>
    <div class="card hero">
      <div style="font-size:15px;color:var(--muted);font-weight:600">${esc(g.emoji || '💰')} ${esc(g.name)}</div>
      ${petStage(animateSad ? 'idle' : s.mood, '', 'detail-pet', petOf(g))}
      <h2>${title}</h2>
      <p class="msg">${msg}</p>
      <span class="streak ${s.streak ? '' : 'off'}" style="display:inline-block;margin-top:12px">🔥 Racha: ${s.streak} ${s.streak === 1 ? F.unit : F.units}</span>
    </div>
    <div class="card">
      <div class="stats">
        <div class="stat"><div class="k">Ahorrado</div><div class="v">${money(s.saved)}</div></div>
        <div class="stat"><div class="k">${g.type === 'meta' ? 'Meta' : 'Al final'}</div><div class="v">${money(s.target)}</div></div>
        <div class="stat"><div class="k">Falta</div><div class="v">${money(s.remaining)}</div></div>
        <div class="stat"><div class="k">Tiempo</div><div class="v">${s.ended ? '—' : timeLeftText(s.end)}</div></div>
      </div>
      <div class="progress ${g.type === 'meta' ? '' : 'cap'}"><div style="width:${s.pct}%"></div></div>
      <div class="goal-nums"><span>${Math.floor(s.pct)}% completado</span><span>${fmtDate(s.end)}</span></div>
    </div>
    ${plan}
    ${s.ended && !s.completed ? '' : `<button class="btn ${s.doneCur ? 'soft' : 'salmon'}" data-action="deposit" data-id="${g.id}">${s.doneCur ? '＋ Apartar extra' : '✓ Ya lo aparté'}</button>`}
    <div class="card" style="margin-top:14px">
      <p class="section-title">Historial</p>
      ${deps.length ? `<ul class="history">${deps.map(d => `
        <li><div><div class="amt">+ ${money(d.amount)}</div><div class="date">${fmtDate(parseISO(d.date))}</div></div>
        <button class="x" data-action="del-dep" data-id="${g.id}" data-dep="${d.id}" aria-label="Borrar apartado">×</button></li>`).join('')}</ul>`
        : `<p class="note" style="margin:0">Aún no hay apartados. ¡El primero es el más importante!</p>`}
      ${g.initial ? `<p class="note">Incluye ${money(g.initial)} que ya tenías ahorrado.</p>` : ''}
    </div>
    <button class="btn danger" data-action="delete" data-id="${g.id}">Borrar meta</button>
  `;

  if (animateSad) {
    setTimeout(() => {
      const st = app.querySelector('.detail-pet');
      if (st) { st.classList.remove('mood-idle'); st.classList.add('mood-sad'); }
    }, 700);
  }
}

/* ---------- Formulario (nueva / editar) ---------- */
function renderForm(g) {
  const minDate = new Date(today()); minDate.setDate(minDate.getDate() + 1);
  const defDate = new Date(today()); defDate.setMonth(defDate.getMonth() + 6);
  const pet = petOf(g);
  draft = g ? {
    id: g.id, type: g.type, name: g.name, emoji: g.emoji || '💰', freq: g.freq, deadline: g.deadline,
    target: g.target || '', amount: g.amount || '', initial: g.initial || ''
  } : { type: 'meta', name: '', emoji: '✈️', freq: 'quincenal', deadline: toISO(defDate), target: '', amount: '', initial: '' };
  draft.pet = pet.id;
  draft.petImg = pet.id === 'custom' ? pet.img : null;

  app.innerHTML = `
    <div class="topbar">
      <button class="link-btn" data-action="${g ? 'cancel-edit' : 'home'}" ${g ? `data-id="${g.id}"` : ''}>‹ Cancelar</button>
      <b>${g ? 'Editar meta' : 'Nueva meta'}</b>
      <span style="width:70px"></span>
    </div>
    <div class="field">
      <div class="type-cards">
        <button data-type="meta"><span>🎯</span><span class="t">Meta de ahorro</span><small>Quiero juntar una cantidad para una fecha</small></button>
        <button data-type="capacidad" class="cap"><span>💪</span><span class="t">Lo que puedo ahorrar</span><small>Aparto una cantidad fija, ¿cuánto juntaré?</small></button>
      </div>
    </div>
    <div class="field">
      <label for="f-name">Nombre</label>
      <input id="f-name" class="input" maxlength="40" placeholder="Ej. Viaje a Japón" value="${esc(draft.name)}">
    </div>
    <div class="field">
      <label>Icono</label>
      <div class="emojis">${EMOJIS.map(e => `<button data-emoji="${e}">${e}</button>`).join('')}</div>
    </div>
    <div class="field">
      <label>Mascota de esta meta</label>
      <div class="pet-grid" id="f-pets"></div>
    </div>
    <div class="field" data-show="meta">
      <label for="f-target">¿Cuánto quieres juntar?</label>
      <div class="money"><span>$</span><input id="f-target" class="input" inputmode="decimal" placeholder="60,000" value="${draft.target}"></div>
    </div>
    <div class="field" data-show="capacidad">
      <label for="f-amount">¿Cuánto puedes apartar cada vez?</label>
      <div class="money"><span>$</span><input id="f-amount" class="input" inputmode="decimal" placeholder="1,500" value="${draft.amount}"></div>
    </div>
    <div class="field">
      <label>¿Cada cuánto vas a apartar?</label>
      <div class="seg">${Object.keys(FREQS).map(f => `<button data-freq="${f}">${FREQS[f].label}</button>`).join('')}</div>
    </div>
    <div class="field">
      <label for="f-date">Fecha límite</label>
      <input id="f-date" class="input" type="date" min="${toISO(minDate)}" value="${draft.deadline}">
    </div>
    <div class="field">
      <label for="f-initial">¿Ya tienes algo ahorrado? <span style="color:var(--muted);font-weight:500">(opcional)</span></label>
      <div class="money"><span>$</span><input id="f-initial" class="input" inputmode="decimal" placeholder="0" value="${draft.initial}"></div>
    </div>
    <div id="preview"></div>
    <button class="btn primary" data-action="save-goal" id="save-btn">${g ? 'Guardar cambios' : 'Crear meta'}</button>
  `;

  const bind = (id, key) => app.querySelector(id).addEventListener('input', e => { draft[key] = e.target.value; updateForm(); });
  bind('#f-name', 'name'); bind('#f-target', 'target'); bind('#f-amount', 'amount');
  bind('#f-date', 'deadline'); bind('#f-initial', 'initial');
  renderFormPets();
  app.querySelector('#f-date').addEventListener('change', e => { draft.deadline = e.target.value; updateForm(); });
  updateForm();
}

function renderFormPets() {
  const opt = (pet, label) => `
    <button class="pet-opt ${draft.pet === pet.id ? 'on' : ''}" data-gpet="${pet.id}">
      ${pet.id === 'custom' && !pet.img ? '<div class="pet-add">📷</div>' : petStage(draft.pet === pet.id ? 'happy' : 'idle', 'small', '', pet)}<span>${label}</span>
    </button>`;
  app.querySelector('#f-pets').innerHTML =
    Object.keys(PETS).map(id => opt({ id }, PETS[id].name)).join('') +
    opt({ id: 'custom', img: draft.petImg }, draft.petImg && draft.pet === 'custom' ? 'Cambiar imagen' : 'Mi imagen');
}

function chooseFormPet(id) {
  if (id !== 'custom') { draft.pet = id; renderFormPets(); return; }
  if (draft.petImg && draft.pet !== 'custom') { draft.pet = 'custom'; renderFormPets(); return; }
  pickImage(img => { draft.petImg = img; draft.pet = 'custom'; renderFormPets(); });
}

function updateForm() {
  app.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('on', b.dataset.type === draft.type));
  app.querySelectorAll('[data-freq]').forEach(b => b.classList.toggle('on', b.dataset.freq === draft.freq));
  app.querySelectorAll('[data-emoji]').forEach(b => b.classList.toggle('on', b.dataset.emoji === draft.emoji));
  app.querySelectorAll('[data-show]').forEach(el => { el.style.display = el.dataset.show === draft.type ? '' : 'none'; });

  const err = formError();
  app.querySelector('#save-btn').disabled = !!err;
  const box = app.querySelector('#preview');
  if (err) { box.innerHTML = `<div class="preview"><p>${err}</p></div>`; return; }

  const t = today(), end = parseISO(draft.deadline);
  const initial = parseMoney(draft.initial);
  const F = FREQS[draft.freq];
  if (draft.type === 'meta') {
    const rem = Math.max(0, parseMoney(draft.target) - initial);
    const eq = equivalents(rem, draft.deadline);
    const sel = eq.find(e => e.f === draft.freq);
    box.innerHTML = `<div class="preview">
      <p>Necesitas apartar</p>
      <div class="big">${money(sel.per)} <span style="font-size:16px;font-weight:600">por ${F.unit}</span></div>
      <p>${sel.n} ${sel.n === 1 ? F.unit : F.units} · faltan ${timeLeftText(end)}</p>
      <div class="grid">${eq.map(e => `<div class="${e.f === draft.freq ? 'sel' : ''}"><b>${money(e.per)}</b>${FREQS[e.f].label.toLowerCase()}</div>`).join('')}</div>
    </div>`;
  } else {
    const n = periodsInclusive(draft.freq, t, end);
    const total = initial + parseMoney(draft.amount) * n;
    box.innerHTML = `<div class="preview cap">
      <p>El ${fmtDate(end)} tendrás</p>
      <div class="big">${money(total)}</div>
      <p>${n} ${n === 1 ? F.unit : F.units} × ${money(parseMoney(draft.amount))}${initial ? ` + ${money(initial)} que ya tienes` : ''} · faltan ${timeLeftText(end)}</p>
    </div>`;
  }
}

function formError() {
  if (!draft.name.trim()) return 'Ponle un nombre a tu meta ✏️';
  if (draft.type === 'meta' && parseMoney(draft.target) <= 0) return '¿Cuánto quieres juntar? 💰';
  if (draft.type === 'capacidad' && parseMoney(draft.amount) <= 0) return '¿Cuánto puedes apartar cada vez? 💰';
  if (!draft.deadline) return 'Elige la fecha límite 📅';
  if (parseISO(draft.deadline) <= today()) return 'La fecha debe ser después de hoy 📅';
  if (draft.type === 'meta' && parseMoney(draft.initial) >= parseMoney(draft.target)) return '¡Ya tienes ahorrado lo de la meta! 🎉 Sube la cantidad.';
  return '';
}

function saveGoal() {
  if (formError()) return;
  const data = {
    type: draft.type, name: draft.name.trim(), emoji: draft.emoji, freq: draft.freq, deadline: draft.deadline,
    target: draft.type === 'meta' ? parseMoney(draft.target) : 0,
    amount: draft.type === 'capacidad' ? parseMoney(draft.amount) : 0,
    initial: parseMoney(draft.initial),
    pet: draft.pet,
    petImg: draft.pet === 'custom' ? draft.petImg : null,
  };
  let id = draft.id;
  if (id) Object.assign(findGoal(id), data);
  else {
    id = uid();
    state.goals.push({ id, ...data, start: toISO(today()), deposits: [], createdAt: Date.now() });
  }
  save();
  toast(draft.id ? 'Cambios guardados ✓' : '¡Meta creada! 🐾');
  draft = null;
  go(`#/meta/${id}`);
}

/* ---------- Ajustes ---------- */
function renderSettings() {
  const st = state.settings, r = st.reminders;
  const support = pushSupport();
  let status;
  if (support === 'install') status = '<span class="status warn">📲 Instala la app en tu inicio para activarlos</span>';
  else if (support === 'denied') status = '<span class="status warn">Permiso bloqueado en Ajustes del iPhone</span>';
  else if (r.enabled) status = '<span class="status ok">🔔 Activados</span>';
  else status = '<span class="status off">Desactivados</span>';
  const upcoming = r.enabled ? buildReminders().slice(0, 3) : [];

  app.innerHTML = `
    <div class="topbar">
      <button class="link-btn" data-action="home">‹ Metas</button>
      <b>Ajustes</b>
      <span style="width:70px"></span>
    </div>
    <div class="card">
      <p class="section-title">Mascota predeterminada</p>
      <p class="note" style="margin:-4px 0 12px">Para el resumen y las metas nuevas. Cada meta puede tener la suya (en Editar).</p>
      <div class="pet-grid">
        ${Object.keys(PETS).map(id => `
          <button class="pet-opt ${st.pet === id ? 'on' : ''}" data-pet="${id}">
            ${petStage(st.pet === id ? 'happy' : 'idle', 'small', '', { id })}<span>${PETS[id].name}</span>
          </button>`).join('')}
        <button class="pet-opt ${st.pet === 'custom' ? 'on' : ''}" data-pet="custom">
          ${st.customImg ? petStage(st.pet === 'custom' ? 'happy' : 'idle', 'small', '', { id: 'custom', img: st.customImg }) : '<div class="pet-add">📷</div>'}<span>Mi imagen</span>
        </button>
      </div>
      <div class="row-btns">
        ${st.customImg ? '<button class="btn soft" data-action="pick-image">🖼️ Cambiar imagen</button>' : ''}
        <button class="btn soft" data-action="playground">🤸 Ver animaciones</button>
      </div>
    </div>
    <div class="card">
      <p class="section-title">Recordatorios</p>
      ${status}
      <div class="field">
        <label for="r-server">Link del servidor</label>
        <input id="r-server" class="input" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://….workers.dev" value="${esc(r.server)}">
        <p class="hint">El link de tu Cloudflare Worker (los pasos están en LEEME.md).</p>
      </div>
      <div class="field">
        <label for="r-hour">Hora del aviso</label>
        <input id="r-hour" class="input" type="time" value="${r.hour}">
      </div>
      <div class="switch-row"><span>Al empezar cada periodo</span><button class="switch ${r.start ? 'on' : ''}" data-toggle="start" aria-label="Aviso al empezar cada periodo"></button></div>
      <div class="switch-row"><span>El último día, si aún no apartas</span><button class="switch ${r.last ? 'on' : ''}" data-toggle="last" aria-label="Aviso el último día"></button></div>
      ${r.enabled ? `
        <button class="btn soft" data-action="test-push">Enviar notificación de prueba</button>
        <button class="btn danger" data-action="disable-push">Desactivar recordatorios</button>`
      : `<button class="btn primary" data-action="enable-push">🔔 Activar recordatorios</button>`}
      ${upcoming.length ? `
        <p class="section-title" style="margin-top:16px">Próximos avisos</p>
        <ul class="upcoming">${upcoming.map(u => `<li>${esc(u.title)}<small>${fmtWhen(u.t)} · ${esc(u.body)}</small></li>`).join('')}</ul>` : ''}
    </div>
    <div class="card">
      <p class="section-title">Respaldo de datos</p>
      <p class="note" style="margin:0">Tus metas viven solo en este teléfono. Exporta un respaldo de vez en cuando.</p>
      <div class="row-btns"><button class="btn soft" data-action="export">Exportar</button><button class="btn soft" data-action="import">Importar</button></div>
    </div>
  `;

  const srv = app.querySelector('#r-server'), hour = app.querySelector('#r-hour');
  srv.addEventListener('change', () => { r.server = normalizeServer(srv.value); srv.value = r.server; save(); });
  hour.addEventListener('change', () => { if (hour.value) { r.hour = hour.value; save(); renderSettings(); } });
}

function choosePet(id) {
  if (id === 'custom' && (!state.settings.customImg || state.settings.pet === 'custom')) return pickDefaultImage();
  state.settings.pet = id;
  save(); renderSettings();
}

function pickDefaultImage() {
  pickImage(img => {
    state.settings.customImg = img;
    state.settings.pet = 'custom';
    save(); renderSettings();
  });
}

// Abre la galería y entrega la imagen ya reducida.
function pickImage(onPicked) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files[0]) return;
    try {
      onPicked(await shrinkImage(input.files[0], 320));
      toast('¡Nueva mascota! ✨');
    } catch (e) { toast('No pude abrir esa imagen 😕'); }
  };
  input.click();
}

// Reduce la imagen para que quepa en el almacenamiento. Conserva la transparencia de los stickers.
function shrinkImage(file, max) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const px = ctx.getImageData(0, 0, c.width, c.height).data;
      let alpha = false;
      for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
      resolve(alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}

function openPlayground() {
  const bd = modal(`
    <div class="reward playground">
      ${petStage('idle', '', 'pg')}
      <h2>${esc(petInfo().name)}</h2>
      <p>Así reacciona tu mascota</p>
      <div class="row-btns">
        <button class="btn salmon" data-pg="flip">Voltereta</button>
        <button class="btn soft" data-pg="happy">Feliz</button>
        <button class="btn soft" data-pg="sad">Triste</button>
      </div>
      <button class="btn primary" data-close style="margin-top:10px">Listo</button>
    </div>`, true);
  const stage = bd.querySelector('.pg');
  bd.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => {
    stage.classList.remove('flip', 'mood-idle', 'mood-happy', 'mood-sad');
    void stage.offsetWidth; // reinicia la animación
    if (b.dataset.pg === 'flip') stage.classList.add('mood-happy', 'flip');
    else stage.classList.add('mood-' + b.dataset.pg);
  });
}

/* ---------- Recordatorios (notificaciones push) ----------
   iOS no deja que una app web programe avisos por sí sola, así que la app
   le manda al servidor (Cloudflare Worker) la lista de avisos con su hora,
   y el servidor los envía cuando toca. Cada vez que cambias algo, la lista
   se actualiza (por ejemplo, al apartar se quitan los avisos de ese periodo). */
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const fmtWhen = t => { const d = new Date(t); return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function normalizeServer(s) {
  s = String(s || '').trim().replace(/\/+$/, '');
  if (s && !/^https?:\/\//i.test(s)) s = 'https://' + s;
  return s;
}

function pushSupport() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'install';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

function buildReminders() {
  const r = state.settings.reminders;
  const [hh, mm] = (r.hour || '10:00').split(':').map(Number);
  const now = Date.now(), horizon = now + 45 * 86400000;
  const slots = new Map();
  const add = (day, item) => {
    const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hh, mm).getTime();
    if (t <= now || t > horizon) return;
    const list = slots.get(t) || [];
    const same = list.find(x => x.g === item.g);
    if (same) same.kind = 'last'; else list.push(item);
    slots.set(t, list);
  };
  for (const g of state.goals) {
    const s = stats(g);
    if (s.completed || s.ended) continue;
    const start = parseISO(g.start);
    for (let i = Math.max(0, s.cur); i <= s.last; i++) {
      const pStart = i === 0 ? start : addDays(periodEnd(g.freq, start, i - 1), 1);
      if (pStart.getTime() > horizon) break;
      if (i === s.cur && s.doneCur) continue;
      const pEnd = periodEnd(g.freq, start, i) > s.end ? s.end : periodEnd(g.freq, start, i);
      if (r.start) add(pStart, { g, s, kind: 'start' });
      if (r.last) add(pEnd, { g, s, kind: 'last' });
    }
  }
  return [...slots.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 60)
    .map(([t, items]) => ({ t, ...reminderText(items), tag: 'ahorrito-' + t }));
}

function reminderText(items) {
  if (items.length === 1) {
    const { g, s, kind } = items[0], amt = money(s.suggested), pet = petInfo(petOf(g));
    if (kind === 'start') return { title: `${g.emoji || '💰'} ${s.F.nueva}: aparta ${amt}`, body: `Para “${g.name}”. ¡${cap(pet.the)} cuenta contigo!` };
    return { title: `⏰ ${s.F.ultimo}`, body: `Aparta ${amt} para “${g.name}”${s.streak ? ` y cuida tu racha de ${s.streak} 🔥` : ''}.` };
  }
  return { title: '🐾 ¡Hora de ahorrar!', body: items.map(({ g, s }) => `${g.emoji || '💰'} ${g.name}: ${money(s.suggested)}`).join(' · ') };
}

const b64uToBytes = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const bytesToB64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function currentSubscription() {
  if (pushSupport() !== 'ok') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

const postJSON = (path, data) => fetch(state.settings.reminders.server + path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
});

let syncTimer = null;
function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncReminders().catch(() => {}), 1200);
}

async function syncReminders(force = false) {
  const r = state.settings.reminders;
  if (!r.enabled || !r.server) return;
  const sub = await currentSubscription();
  if (!sub) return;
  const payload = { subscription: sub.toJSON(), reminders: buildReminders() };
  const key = JSON.stringify(payload);
  let last = null;
  try { last = localStorage.getItem(SYNC_KEY); } catch (e) {}
  if (!force && key === last) return;
  const res = await postJSON('/subscribe', payload);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  try { localStorage.setItem(SYNC_KEY, key); } catch (e) {}
}

async function enableReminders() {
  const r = state.settings.reminders;
  const support = pushSupport();
  if (support === 'install') return infoBox(`Para recibir notificaciones en iPhone:<br><br>
    1. Abre la app en <b>Safari</b>.<br>2. Toca <b>Compartir ⬆️ → Agregar a inicio</b>.<br>
    3. Abre Ahorrito desde el ícono y activa aquí los recordatorios.<br><br>
    <small style="color:var(--muted)">Requiere iOS 16.4 o más nuevo.</small>`);
  if (support === 'denied') return infoBox('Bloqueaste las notificaciones. Actívalas en <b>Ajustes del iPhone → Notificaciones → Ahorrito</b>.');
  const input = app.querySelector('#r-server');
  if (input) r.server = normalizeServer(input.value);
  if (!r.server) { toast('Primero pega el link del servidor'); return; }

  // El permiso se pide de inmediato, antes de cualquier espera (iOS lo exige).
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { toast('Sin permiso no puedo avisarte 😢'); renderSettings(); return; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch(r.server + '/vapid');
    if (!res.ok) throw new Error('vapid');
    const { publicKey } = await res.json();
    let sub = await reg.pushManager.getSubscription();
    const subKey = sub && sub.options && sub.options.applicationServerKey;
    if (sub && subKey && bytesToB64u(subKey) !== publicKey) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
    r.enabled = true;
    save();
    await syncReminders(true);
    toast('¡Recordatorios activados! 🔔');
  } catch (e) {
    r.enabled = false; save();
    toast('No pude conectar con el servidor. Revisa el link.');
  }
  renderSettings();
}

async function disableReminders() {
  const r = state.settings.reminders;
  r.enabled = false;
  save();
  try {
    const sub = await currentSubscription();
    if (sub) {
      if (r.server) await postJSON('/unsubscribe', { subscription: sub.toJSON() });
      await sub.unsubscribe();
    }
  } catch (e) { /* sin conexión: el servidor la borrará cuando falle el envío */ }
  try { localStorage.removeItem(SYNC_KEY); } catch (e) {}
  toast('Recordatorios desactivados');
  renderSettings();
}

async function testPush() {
  try {
    const sub = await currentSubscription();
    if (!sub) throw new Error('sin suscripción');
    const res = await postJSON('/test', { subscription: sub.toJSON() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    toast('Enviada: llega en unos segundos 📨');
  } catch (e) { toast('No se pudo enviar la prueba 😕'); }
}

/* ---------- Apartar dinero ---------- */
function openDeposit(g) {
  const s = stats(g);
  const sug = s.doneCur ? (g.type === 'capacidad' ? g.amount : Math.max(1, s.suggested)) : s.suggested || g.amount || 0;
  const chips = [...new Set([sug, 100, 500, 1000].filter(v => v > 0))];
  const root = modal(`
    <div class="sheet">
      <h3>¿Cuánto apartaste?</h3>
      <p>${s.doneCur ? 'Ya cumpliste este periodo, esto cuenta como extra 💪' : `Lo sugerido ${s.F.esta} es ${money(sug)}.`}</p>
      <div class="money"><span>$</span><input id="dep-amt" class="input" inputmode="decimal" value="${sug || ''}"></div>
      <div class="chips">${chips.map(c => `<button data-chip="${c}">${money(c)}</button>`).join('')}</div>
      <button class="btn salmon" id="dep-ok">✓ Confirmar apartado</button>
      <button class="btn soft" data-close>Cancelar</button>
    </div>`);
  const input = root.querySelector('#dep-amt');
  root.querySelectorAll('[data-chip]').forEach(b => b.onclick = () => { input.value = b.dataset.chip; });
  root.querySelector('#dep-ok').onclick = () => {
    const amt = round2(parseMoney(input.value));
    if (amt <= 0) { toast('Escribe una cantidad'); return; }
    const before = stats(g);
    g.deposits.push({ id: uid(), date: toISO(today()), ts: Date.now(), amount: amt });
    save();
    closeModal();
    celebrate(g, amt, before);
  };
}

function celebrate(g, amt, before) {
  const s = stats(g);
  const justCompleted = s.completed && !before.completed;
  const recovered = before.lost;
  const colors = ['#F29E86', '#3B82C4', '#F4B740', '#6BB0EA', '#4FB38A', '#F7C6B7'];
  const confetti = Array.from({ length: 46 }, () =>
    `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-delay:${Math.random() * .9}s;animation-duration:${1.8 + Math.random() * 1.4}s"></i>`).join('');

  const title = justCompleted ? '¡META CUMPLIDA! 🏆' : recovered ? '¡Racha recuperada! 🐾' : '¡Bien hecho! 🎉';
  modal(`
    <div class="reward">
      <div class="confetti">${confetti}</div>
      ${petStage('happy', '', 'flip', petOf(g))}
      <h2>${title}</h2>
      <p>Apartaste <b style="color:var(--text)">${money(amt)}</b> para <b style="color:var(--text)">${esc(g.name)}</b></p>
      <p>Llevas ${money(s.saved)} de ${money(s.target)}</p>
      <span class="streak">🔥 Racha: ${s.streak} ${s.streak === 1 ? s.F.unit : s.F.units}</span>
      <button class="btn primary" data-close>${petInfo(petOf(g)).cheer}</button>
    </div>`, true, () => render());
}

/* ---------- Modales y avisos ---------- */
const modalRoot = document.getElementById('modal-root');
let onModalClose = null;
function modal(html, center = false, onClose = null) {
  onModalClose = onClose;
  modalRoot.innerHTML = `<div class="backdrop ${center ? 'center' : ''}">${html}</div>`;
  const bd = modalRoot.firstElementChild;
  bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) closeModal(); });
  return bd;
}
function closeModal() {
  modalRoot.innerHTML = '';
  const cb = onModalClose; onModalClose = null;
  if (cb) cb();
}
function confirmBox(text, okLabel = 'Borrar') {
  return new Promise(resolve => {
    const bd = modal(`<div class="dialog"><p>${text}</p>
      <button class="btn danger" id="c-ok" style="background:var(--danger);color:#fff">${okLabel}</button>
      <button class="btn soft" data-close>Cancelar</button></div>`, true, () => resolve(false));
    bd.querySelector('#c-ok').onclick = () => { onModalClose = null; modalRoot.innerHTML = ''; resolve(true); };
  });
}
function infoBox(html) {
  modal(`<div class="dialog" style="text-align:left"><p>${html}</p><button class="btn primary" data-close>Entendido</button></div>`, true);
}
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Respaldo ---------- */
async function exportData() {
  const json = JSON.stringify(state, null, 2);
  const name = `ahorrito-respaldo-${toISO(today())}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Respaldo Ahorrito' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (!data || !Array.isArray(data.goals)) throw new Error();
      if (await confirmBox(`¿Reemplazar tus metas actuales con las ${data.goals.length} del respaldo?`, 'Reemplazar')) {
        const reminders = state.settings.reminders; // los avisos son de este teléfono, no del respaldo
        state = withDefaults(data); state.settings.reminders = reminders;
        save(); render(); toast('Respaldo importado ✓');
      }
    } catch (e) { toast('Ese archivo no es un respaldo válido'); }
  };
  input.click();
}

/* ---------- Clics ---------- */
app.addEventListener('click', async e => {
  const typeBtn = e.target.closest('[data-type]');
  if (typeBtn && draft) { draft.type = typeBtn.dataset.type; updateForm(); return; }
  const freqBtn = e.target.closest('[data-freq]');
  if (freqBtn && draft) { draft.freq = freqBtn.dataset.freq; updateForm(); return; }
  const emojiBtn = e.target.closest('[data-emoji]');
  if (emojiBtn && draft) { draft.emoji = emojiBtn.dataset.emoji; updateForm(); return; }
  const gpetBtn = e.target.closest('[data-gpet]');
  if (gpetBtn && draft) { chooseFormPet(gpetBtn.dataset.gpet); return; }
  const petBtn = e.target.closest('[data-pet]');
  if (petBtn) { choosePet(petBtn.dataset.pet); return; }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) { const r = state.settings.reminders; r[toggle.dataset.toggle] = !r[toggle.dataset.toggle]; save(); renderSettings(); return; }

  const el = e.target.closest('[data-action]');
  if (!el) return;
  const id = el.dataset.id, g = id && findGoal(id);
  const idx = g ? state.goals.indexOf(g) : -1;

  switch (el.dataset.action) {
    case 'home': go('#/'); break;
    case 'new': go('#/nueva'); break;
    case 'open': go(`#/meta/${id}`); break;
    case 'edit': go(`#/editar/${id}`); break;
    case 'cancel-edit': go(`#/meta/${id}`); break;
    case 'save-goal': saveGoal(); break;
    case 'toggle-order': orderMode = !orderMode; renderList(); break;
    case 'hide-tip': try { localStorage.setItem('ahorrito.tip', '1'); } catch (err) {} renderList(); break;
    case 'up':
    case 'down': {
      const to = idx + (el.dataset.action === 'up' ? -1 : 1);
      if (to < 0 || to >= state.goals.length) break;
      [state.goals[idx], state.goals[to]] = [state.goals[to], state.goals[idx]];
      save(); renderList(); break;
    }
    case 'delete':
      if (await confirmBox(`¿Borrar la meta <b>${esc(g.name)}</b> y todo su historial?`)) {
        state.goals.splice(state.goals.indexOf(g), 1); save(); toast('Meta borrada');
        if (location.hash.startsWith('#/meta')) go('#/'); else renderList();
      }
      break;
    case 'deposit': openDeposit(g); break;
    case 'del-dep': {
      const dep = g.deposits.find(d => d.id === el.dataset.dep);
      if (dep && await confirmBox(`¿Borrar el apartado de ${money(dep.amount)} del ${fmtDate(parseISO(dep.date))}?`)) {
        g.deposits = g.deposits.filter(d => d !== dep); save(); renderDetail(g);
      }
      break;
    }
    case 'settings': go('#/ajustes'); break;
    case 'pick-image': pickDefaultImage(); break;
    case 'playground': openPlayground(); break;
    case 'enable-push': enableReminders(); break;
    case 'disable-push': disableReminders(); break;
    case 'test-push': testPush(); break;
    case 'export': exportData(); break;
    case 'import': importData(); break;
  }
});

/* ---------- Arranque ---------- */
render();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
// Si la app se queda abierta y cambia el día, refrescar al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (!modalRoot.innerHTML && !draft && !location.hash.startsWith('#/ajustes')) render();
  syncReminders().catch(() => {});
});
// Al abrir, actualizar la lista de avisos en el servidor.
syncReminders().catch(() => {});
