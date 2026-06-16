// ── LANGUAGE ──
function setLang(lang) {
  document.body.className = 'lang-' + lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.lang-btn[onclick="setLang('${lang}')"]`).forEach(b => b.classList.add('active'));
  document.querySelectorAll('img[data-idx]').forEach(img => {
    const photo = galleryPhotos[parseInt(img.dataset.idx)];
    if (photo && photo[lang]) img.alt = photo[lang] + ' – Casa das Árvores, Ilha Armona Algarve';
  });
  renderCalendar();
  if (typeof computeNextAvailable === 'function') computeNextAvailable();
  if (typeof updateWizard === 'function') updateWizard();
  if (typeof updateContactCaptcha === 'function') updateContactCaptcha();
}
function currentLang() { return document.body.className.replace('lang-',''); }

// ── MOBILE MENU ──
function toggleMobileMenu() {
  const m = document.getElementById('mobileMenu');
  const h = document.getElementById('hamburger');
  const open = m.classList.toggle('open');
  h.classList.toggle('open', open);
  m.style.display = open ? 'flex' : 'none';
  document.body.style.overflow = open ? 'hidden' : '';
}
function closeMobileMenu() {
  const m = document.getElementById('mobileMenu');
  const h = document.getElementById('hamburger');
  m.classList.remove('open'); m.style.display = 'none';
  h.classList.remove('open');
  document.body.style.overflow = '';
}

// ── UNIFIED SCROLL HANDLER ──
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroBg = document.querySelector('.hero-bg');
const scrollInd = document.getElementById('scrollIndicator');
const btt = document.getElementById('backToTop');
const progressBar = document.getElementById('scrollProgress');
const parallaxImgs = document.querySelectorAll('.parallax-img');
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  // scroll progress
  if (progressBar) {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  }
  // scroll indicator + back to top
  if (scrollInd) scrollInd.classList.toggle('hidden', y > 10);
  if (btt) btt.classList.toggle('visible', y > 400);
  if (!prefersReducedMotion) {
    if (heroBg) heroBg.style.transform = `scale(1.05) translateY(${y * 0.15}px)`;
    // image parallax (only when near viewport)
    parallaxImgs.forEach(img => {
      const r = img.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        const speed = parseFloat(img.dataset.speed || '0.05');
        const offset = (r.top - window.innerHeight / 2) * -speed;
        img.style.transform = `translateY(${offset}px) scale(1.06)`;
      }
    });
  }
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
}, {passive: true});
onScroll();

// ── HERO TAG CHAR SPLIT ──
(function splitHeroTag(){
  const tag = document.getElementById('heroTag');
  if (!tag || prefersReducedMotion) return;
  const text = tag.textContent;
  tag.innerHTML = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? ' ' : ch;
    s.style.animationDelay = (0.5 + i * 0.03) + 's';
    tag.appendChild(s);
  });
})();

// ── MAGNETIC BUTTONS ──
if (!prefersReducedMotion && window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('.hero-cta').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${mx * 0.15}px, ${my * 0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

// ── SCROLL REVEAL ──
if (!prefersReducedMotion) {
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); } });
  }, {threshold: 0.12});
  document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));
}

// ── COUNT-UP STATS ──
function countUp(el) {
  const target = parseInt(el.dataset.count, 10);
  if (prefersReducedMotion || isNaN(target)) { el.textContent = target; return; }
  const dur = 1200, start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const countObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); countObs.unobserve(e.target); } });
}, {threshold: 0.5});
document.querySelectorAll('.stat-number[data-count]').forEach(el => countObs.observe(el));

// ── ACTIVE NAV ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
const sectionObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      navLinks.forEach(a => { if (a.getAttribute('href') === '#' + e.target.id) a.classList.add('active'); });
    }
  });
}, {threshold: 0.3, rootMargin: '-80px 0px 0px 0px'});
sections.forEach(s => sectionObs.observe(s));

// ── CALENDAR ──
let calYear, calMonth;
let bookedDates = new Set();

// ── BOOKING WIZARD CONFIG ──
const PRICING = {
  nightlyRate: 130,
  cleaningFee: 75,
  serviceFeeRate: 0.14,
  minStay: 2,
  maxGuests: 6,
};
const ROOM_URL = 'https://www.airbnb.nl/rooms/27625624';
let sel = { checkin: null, checkout: null, adults: 2, children: 0 };
try {
  const saved = JSON.parse(sessionStorage.getItem('cda_booking') || 'null');
  if (saved) sel = Object.assign(sel, saved);
} catch(e) {}
function saveSel() { try { sessionStorage.setItem('cda_booking', JSON.stringify(sel)); } catch(e) {} }
const MONTH_NAMES = {
  nl: ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
};

function showCalSkeleton() {
  ['cal-grid','cal-grid-2'].forEach(id => {
    const g = document.getElementById(id);
    if (g) { let h = ''; for(let i=0;i<35;i++) h += '<div class="cal-skel-day"></div>'; g.innerHTML = '<div class="cal-skeleton">' + h + '</div>'; }
  });
}

function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  showCalSkeleton();
  updateWizard();
  loadIcal();
}

async function loadIcal() {
  const statusEl = document.getElementById('cal-status');
  let loaded = false;
  bookedDates = new Set();

  try {
    const res = await fetch('calendar.ics?cb=' + Math.floor(Date.now() / 3600000), { cache: 'no-cache' });
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.includes('BEGIN:VCALENDAR')) { parseIcal(txt); loaded = true; }
    }
  } catch (e) { }

  if (!loaded) {
    const icalUrls = [
      'https://www.airbnb.nl/calendar/ical/27625624.ics?t=99e49cb78fc546b3974647ad8552c337',
      'https://www.airbnb.com/calendar/ical/27625624.ics?t=99e49cb78fc546b3974647ad8552c337',
    ];
    const proxyFns = [
      u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
      u => 'https://api.allorigins.win/get?url='  + encodeURIComponent(u),
      u => 'https://corsproxy.io/?' + encodeURIComponent(u),
      u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
      u => 'https://thingproxy.freeboard.io/fetch/' + u,
    ];
    const tryFetch = async (proxyUrl) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      try {
        const res = await fetch(proxyUrl, { cache: 'no-cache', signal: ctrl.signal });
        if (!res.ok) throw new Error('not ok');
        const raw = await res.text();
        let icalText = raw;
        if (raw.trimStart().startsWith('{')) {
          try { const j = JSON.parse(raw); if (j.contents) icalText = j.contents; } catch {}
        }
        if (!icalText || !icalText.includes('BEGIN:VCALENDAR')) throw new Error('not ical');
        return icalText;
      } finally { clearTimeout(timer); }
    };
    const racers = [];
    for (const u of icalUrls) for (const fn of proxyFns) racers.push(tryFetch(fn(u)));
    try { const t = await Promise.any(racers); parseIcal(t); loaded = true; } catch (e) { }
  }

  if (loaded) {
    if (statusEl) statusEl.textContent = '';
  } else {
    const lang = currentLang();
    if (statusEl) {
      statusEl.className = 'cal-error';
      statusEl.innerHTML = (lang==='nl' ? '⚠ Agenda kon niet worden geladen. ' : lang==='en' ? '⚠ Calendar could not be loaded. ' : '⚠ Calendário não carregou. ')
        + `<button class="cal-retry-btn" onclick="loadIcal()">${lang==='nl'?'Opnieuw proberen':lang==='en'?'Try again':'Tentar novamente'}</button>`;
    }
  }
  if (sel.checkin && (bookedDates.has(sel.checkin) || sel.checkin < new Date().toISOString().slice(0,10))) { sel.checkin = null; sel.checkout = null; saveSel(); }
  if (sel.checkin && sel.checkout && crossesBooked(sel.checkin, sel.checkout)) { sel.checkout = null; saveSel(); }
  renderCalendar();
  updateWizard();
  if (loaded) computeNextAvailable();
}
function parseIcal(text) {
  if (!text) return;
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  let inEvent = false, dtStart = null, dtEnd = null;
  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) { inEvent = true; dtStart = null; dtEnd = null; }
    if (!inEvent) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).split(';')[0];
    const val = line.slice(colonIdx + 1).trim();
    if (key === 'DTSTART' && val) dtStart = parseIcalDate(val);
    if (key === 'DTEND'   && val) dtEnd   = parseIcalDate(val);
    if (line.startsWith('END:VEVENT') && dtStart && dtEnd) {
      let cur = new Date(dtStart);
      while (cur < dtEnd) { bookedDates.add(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }
      inEvent = false;
    }
  }
}

function parseIcalDate(str) {
  const s = str.replace(/[TZ]/g,'');
  return new Date(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T00:00:00`);
}

function renderOneMonth(gridId, labelId, year, month) {
  const lang = currentLang();
  const grid = document.getElementById(gridId);
  const label = document.getElementById(labelId);
  if (!grid) return;
  if (label) label.textContent = (MONTH_NAMES[lang]||MONTH_NAMES.nl)[month] + ' ' + year;
  let startPad = new Date(year, month, 1).getDay() - 1;
  if (startPad < 0) startPad = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0,10);
  const nowStr = new Date().toISOString().slice(0,10);
  let html = '';
  for (let i = 0; i < startPad; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isPast = dateStr < nowStr;
    const isBooked = bookedDates.has(dateStr);
    const classes = ['cal-day'];
    if (isPast) classes.push('past');
    else if (isBooked) classes.push('booked');
    else classes.push('available');
    if (dateStr === todayStr) classes.push('today');
    if (sel.checkin && dateStr === sel.checkin) classes.push('range-start');
    if (sel.checkout && dateStr === sel.checkout) classes.push('range-end');
    if (sel.checkin && sel.checkout && dateStr > sel.checkin && dateStr < sel.checkout) classes.push('in-range');
    if (sel.checkin && !sel.checkout && !isPast && !isBooked) {
      if (dateStr <= sel.checkin || crossesBooked(sel.checkin, dateStr)) classes.push('range-disabled');
    }
    const clickable = !isPast && !isBooked;
    const attr = clickable ? ` onclick="pickDate('${dateStr}')"` : '';
    html += `<div class="${classes.join(' ')}" data-date="${dateStr}"${attr}>${d}</div>`;
  }
  grid.innerHTML = html;
}

function crossesBooked(a, b) {
  let cur = new Date(a + 'T00:00:00');
  const end = new Date(b + 'T00:00:00');
  cur.setDate(cur.getDate() + 1);
  while (cur < end) {
    if (bookedDates.has(cur.toISOString().slice(0,10))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

function renderCalendar(animate) {
  renderOneMonth('cal-grid', 'cal-month-label', calYear, calMonth);
  const nextM = calMonth === 11 ? 0 : calMonth + 1;
  const nextY = calMonth === 11 ? calYear + 1 : calYear;
  renderOneMonth('cal-grid-2', 'cal-month-label-2', nextY, nextM);
  if (animate && !prefersReducedMotion) {
    ['cal-grid','cal-grid-2'].forEach(id => {
      const g = document.getElementById(id);
      if (g) { g.classList.remove('swap-in'); void g.offsetWidth; g.classList.add('swap-in'); }
    });
  }
}

function computeNextAvailable() {
  const el = document.getElementById('calNextAvail');
  const txt = document.getElementById('calNextAvailText');
  if (!el || !txt) return;
  const lang = currentLang();
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const ds = d.toISOString().slice(0,10);
    if (!bookedDates.has(ds)) {
      const dn = d.getDate();
      const mn = (MONTH_NAMES[lang]||MONTH_NAMES.nl)[d.getMonth()];
      const label = lang==='nl' ? `Eerstvolgende vrije dag: ${dn} ${mn}`
                  : lang==='en' ? `Next available day: ${dn} ${mn}`
                  : `Próximo dia livre: ${dn} ${mn}`;
      txt.textContent = label;
      el.style.display = 'flex';
      return;
    }
  }
  el.style.display = 'none';
}

function prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(true); }
function nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(true); }

// ── BOOKING WIZARD LOGIC ──
function changeGuests(type, delta) {
  const total = sel.adults + sel.children;
  if (delta > 0 && total >= PRICING.maxGuests) { flashGuestMax(); return; }
  if (type === 'adults')   sel.adults   = Math.min(PRICING.maxGuests, Math.max(1, sel.adults + delta));
  if (type === 'children') sel.children = Math.min(PRICING.maxGuests - 1, Math.max(0, sel.children + delta));
  while (sel.adults + sel.children > PRICING.maxGuests) {
    if (type === 'adults' && sel.children > 0) sel.children--; else break;
  }
  saveSel();
  updateWizard();
}
function flashGuestMax() {
  const h = document.getElementById('guestMaxHint');
  if (h) { h.style.display = 'block'; clearTimeout(h._t); h._t = setTimeout(() => h.style.display = 'none', 2500); }
}

function pickDate(dateStr) {
  if (!sel.checkin || (sel.checkin && sel.checkout)) {
    sel.checkin = dateStr; sel.checkout = null;
  } else {
    if (dateStr <= sel.checkin) { sel.checkin = dateStr; sel.checkout = null; }
    else if (crossesBooked(sel.checkin, dateStr)) { sel.checkin = dateStr; sel.checkout = null; }
    else {
      const nights = nightsBetween(sel.checkin, dateStr);
      if (nights < PRICING.minStay) { showMinStayWarning(); return; }
      sel.checkout = dateStr;
    }
  }
  saveSel();
  renderCalendar();
  updateWizard();
}

function resetDates() {
  sel.checkin = null; sel.checkout = null;
  saveSel();
  renderCalendar();
  updateWizard();
}

function nightsBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function showMinStayWarning() {
  const lang = currentLang();
  const h = document.getElementById('dateHint');
  if (!h) return;
  h.classList.add('warn');
  h.dataset.warn = '1';
  h.innerHTML = lang==='nl' ? `Minimaal ${PRICING.minStay} nachten verblijf.`
              : lang==='en' ? `Minimum stay is ${PRICING.minStay} nights.`
              : `Estadia mínima de ${PRICING.minStay} noites.`;
  clearTimeout(h._t); h._t = setTimeout(() => { h.classList.remove('warn'); delete h.dataset.warn; updateWizard(); }, 2800);
}

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00');
  const dayNames = {
    nl: ['zo','ma','di','wo','do','vr','za'],
    en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    pt: ['dom','seg','ter','qua','qui','sex','sáb']
  };
  const dn = (dayNames[lang]||dayNames.nl)[d.getDay()];
  const mn = (MONTH_NAMES[lang]||MONTH_NAMES.nl)[d.getMonth()].slice(0,3).toLowerCase();
  return `${dn} ${d.getDate()} ${mn}`;
}

function fmtEuro(n) {
  return '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function buildAirbnbUrl() {
  let url = ROOM_URL;
  const params = [];
  if (sel.checkin)  params.push('check_in='  + sel.checkin);
  if (sel.checkout) params.push('check_out=' + sel.checkout);
  params.push('adults=' + sel.adults);
  if (sel.children > 0) params.push('children=' + sel.children);
  params.push('guests=' + (sel.adults + sel.children));
  return url + (params.length ? '?' + params.join('&') : '');
}

function updateWizard() {
  const lang = currentLang();
  const ac = document.getElementById('adultsCount'); if (ac) ac.textContent = sel.adults;
  const cc = document.getElementById('childrenCount'); if (cc) cc.textContent = sel.children;
  const total = sel.adults + sel.children;
  const atMax = total >= PRICING.maxGuests;
  const ap = document.getElementById('adultsPlus'); if (ap) ap.disabled = atMax;
  const cp = document.getElementById('childrenPlus'); if (cp) cp.disabled = atMax || sel.children >= PRICING.maxGuests - 1;
  const am = document.getElementById('adultsMinus'); if (am) am.disabled = sel.adults <= 1;
  const cm = document.getElementById('childrenMinus'); if (cm) cm.disabled = sel.children <= 0;

  const ci = document.getElementById('checkinDisplay');
  const co = document.getElementById('checkoutDisplay');
  if (ci) {
    if (sel.checkin) { ci.textContent = formatDate(sel.checkin, lang); ci.classList.remove('placeholder'); }
    else { ci.innerHTML = `<span data-lang="nl">Selecteer</span><span data-lang="en">Select</span><span data-lang="pt">Selecionar</span>`; ci.classList.add('placeholder'); }
  }
  if (co) {
    if (sel.checkout) { co.textContent = formatDate(sel.checkout, lang); co.classList.remove('placeholder'); }
    else { co.innerHTML = `<span data-lang="nl">Selecteer</span><span data-lang="en">Select</span><span data-lang="pt">Selecionar</span>`; co.classList.add('placeholder'); }
  }
  const reset = document.getElementById('dateReset');
  if (reset) reset.style.display = (sel.checkin || sel.checkout) ? 'block' : 'none';

  const hint = document.getElementById('dateHint');
  if (hint && !hint.dataset.warn) {
    hint.classList.remove('warn');
    if (!sel.checkin) hint.innerHTML = `<span data-lang="nl">Klik eerst op je aankomstdag, daarna op je vertrekdag. Minimaal 2 nachten.</span><span data-lang="en">Click your arrival day first, then your departure day. Minimum 2 nights.</span><span data-lang="pt">Clique primeiro no dia de chegada, depois no de partida. Mínimo 2 noites.</span>`;
    else if (!sel.checkout) hint.innerHTML = `<span data-lang="nl">Kies nu je vertrekdag.</span><span data-lang="en">Now choose your departure day.</span><span data-lang="pt">Agora escolha o dia de partida.</span>`;
    else { const n = nightsBetween(sel.checkin, sel.checkout); hint.innerHTML = `<span data-lang="nl">${n} ${n===1?'nacht':'nachten'} geselecteerd.</span><span data-lang="en">${n} ${n===1?'night':'nights'} selected.</span><span data-lang="pt">${n} ${n===1?'noite':'noites'} selecionadas.</span>`; }
  }

  const card = document.getElementById('priceCard');
  if (sel.checkin && sel.checkout) {
    const nights = nightsBetween(sel.checkin, sel.checkout);
    const nightsTotal = PRICING.nightlyRate * nights;
    const subtotal = nightsTotal + PRICING.cleaningFee;
    const service = Math.round(subtotal * PRICING.serviceFeeRate);
    const total = subtotal + service;
    document.getElementById('priceNightsLabel').textContent = `${fmtEuro(PRICING.nightlyRate)} × ${nights} ${nights===1?(lang==='en'?'night':lang==='pt'?'noite':'nacht'):(lang==='en'?'nights':lang==='pt'?'noites':'nachten')}`;
    document.getElementById('priceNightsTotal').textContent = fmtEuro(nightsTotal);
    document.getElementById('priceCleaning').textContent = fmtEuro(PRICING.cleaningFee);
    document.getElementById('priceService').textContent = fmtEuro(service);
    document.getElementById('priceTotal').textContent = fmtEuro(total);
    card.classList.add('show');
  } else if (card) {
    card.classList.remove('show');
  }

  const btn = document.getElementById('wizardBookBtn');
  if (btn) btn.href = buildAirbnbUrl();

  const guests = (sel.adults || 2) + (sel.children || 0);
  const fci = document.getElementById('formCheckin');
  const fco = document.getElementById('formCheckout');
  const fps = document.getElementById('formPersons');
  if (fci) fci.value = sel.checkin || '';
  if (fco) fco.value = sel.checkout || '';
  if (fps) fps.value = guests;

  const rci = document.getElementById('recapCheckin');
  const rco = document.getElementById('recapCheckout');
  const rg  = document.getElementById('recapGuests');
  const dash = `<span data-lang="nl">—</span><span data-lang="en">—</span><span data-lang="pt">—</span>`;
  if (rci) {
    if (sel.checkin) { rci.textContent = formatDate(sel.checkin, lang); rci.classList.remove('placeholder'); }
    else { rci.innerHTML = dash; rci.classList.add('placeholder'); }
  }
  if (rco) {
    if (sel.checkout) { rco.textContent = formatDate(sel.checkout, lang); rco.classList.remove('placeholder'); }
    else { rco.innerHTML = dash; rco.classList.add('placeholder'); }
  }
  if (rg) rg.textContent = guests;
}

// ── LIGHTBOX ──
const galleryPhotos = [
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/5d45b621-4b53-493c-9032-d01d76e19a66.jpeg', nl:'Buitenkant', en:'Exterior', pt:'Exterior'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/cf1a2966-85a7-4b53-8f0d-2b8e6bc12037.jpeg', nl:'Woonkamer', en:'Living room', pt:'Sala de estar'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/25538ba9-5912-4a55-b9d4-9b39a1eb5acd.jpeg', nl:'Keuken', en:'Kitchen', pt:'Cozinha'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/a5e48bd4-1baf-4345-94c7-1ca6c4463b1f.jpeg', nl:'Slaapkamer 1', en:'Bedroom 1', pt:'Quarto 1'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/1d1818e7-3a73-4757-be97-e8a140045fe1.jpeg', nl:'Slaapkamer 2', en:'Bedroom 2', pt:'Quarto 2'},
  {src:'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6Mjc2MjU2MjQ%3D/original/031931e9-6be8-473f-b9e3-513dd8759757.jpeg', nl:'Slaapkamer 3 met en-suite badkamer', en:'Bedroom 3 with en-suite bathroom', pt:'Quarto 3 com casa de banho privativa'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/7142ca27-9389-4ee4-8870-e3baa5dedba2.jpeg', nl:'Terras met buitenmeubilair', en:'Terrace with outdoor furniture', pt:'Terraço com mobiliário exterior'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/11f4583b-b6d4-4252-8e1f-85d2400c78bf.jpeg', nl:'Woonkamer en eethoek', en:'Living and dining area', pt:'Sala de estar e jantar'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/1463f0c2-5145-4e71-b37d-857fd1a0d0d0.jpeg', nl:'Keuken detail', en:'Kitchen detail', pt:'Detalhe da cozinha'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/16ed63ce-2ff1-4239-8202-41e267fbf1ee.jpeg', nl:'Badkamer', en:'Bathroom', pt:'Casa de banho'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/297169ca-e808-4a21-89a9-917befa9d30f.jpeg', nl:'Buitenruimte en tuin', en:'Outdoor space and garden', pt:'Espaço exterior e jardim'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/48a0619d-f13d-465e-a3a8-0b01b7a5566f.jpeg', nl:'Slaapkamer interieur', en:'Bedroom interior', pt:'Interior do quarto'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/551a134e-b5b4-44b3-8976-38711d2870c8.jpeg', nl:'Woonruimte', en:'Living space', pt:'Área de estar'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/609f6ee4-3f79-43d4-bb83-e8c09e92ed5c.jpeg', nl:'Buitenaanzicht woning', en:'Outside view of the house', pt:'Vista exterior da casa'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/64691f97-d4b4-4d9b-b51c-3e120d40ee40.jpeg', nl:'Natuur en omgeving Ilha Armona', en:'Nature and surroundings Ilha Armona', pt:'Natureza e arredores Ilha Armona'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/67cd0771-3f35-44ce-a87c-3b8f00461042.jpeg', nl:'Overdekt terras', en:'Covered terrace', pt:'Terraço coberto'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/68b0110b-2614-4fc8-91f4-a120bb4e8409.jpeg', nl:'Interieur detail', en:'Interior detail', pt:'Detalhe de interior'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/765d807e-5f89-4b4d-bf8d-bb38065f95ce.jpeg', nl:'Slaapkamer met raam', en:'Bedroom with window', pt:'Quarto com janela'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/7b0916ed-7ad4-420b-a351-de53f21514cb.jpeg', nl:'Zithoek woonkamer', en:'Sitting area', pt:'Zona de estar'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/99facd43-53b3-4f4e-9838-b1828eb81056.jpeg', nl:'Zijgevel en oprijlaan', en:'Side wall and pathway', pt:'Parede lateral e caminho'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/e0f3d405-0b0c-491e-9631-6e760d94004c.jpeg', nl:'Tuin met beplanting', en:'Garden with planting', pt:'Jardim com vegetação'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/e253b8d6-2f6a-424a-bace-0f6ec4c29765.jpeg', nl:'Eethoek en keuken', en:'Dining area and kitchen', pt:'Zona de jantar e cozinha'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/e3975754-584a-4bd7-803b-6d4f85325a6b.jpeg', nl:'Inloopdouche badkamer', en:'Walk-in shower bathroom', pt:'Duche walk-in'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/e96c2127-8c62-43f4-8ac4-b0f67ec8ec61.jpeg', nl:'Woonkamer detail', en:'Living room detail', pt:'Detalhe da sala'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/f8ed8bc9-77b7-480f-9a80-f84c7d3929fb.jpeg', nl:'Buitenterras', en:'Outdoor terrace', pt:'Terraço exterior'},
  {src:'https://a0.muscache.com/im/pictures/miso/Hosting-27625624/original/fef398a8-de20-4ed7-a882-36c995cc1726.jpeg', nl:'Eilandpad en Ria Formosa natuur', en:'Island path and Ria Formosa nature', pt:'Caminho da ilha e Ria Formosa'},
  {src:'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6Mjc2MjU2MjQ%3D/original/895ec575-6973-42ad-9446-1629f836da3e.jpeg', nl:'Slaapkamer met kast', en:'Bedroom with wardrobe', pt:'Quarto com roupeiro'},
  {src:'https://a0.muscache.com/im/pictures/hosting/Hosting-U3RheVN1cHBseUxpc3Rpbmc6Mjc2MjU2MjQ%3D/original/9dc8be7c-61a6-4604-beb2-7e4346ea28d1.jpeg', nl:'Tuin met bomen', en:'Garden with trees', pt:'Jardim com árvores'},
];
let currentPhoto = 0;
(function buildThumbs(){
  const wrap = document.getElementById('lightboxThumbs');
  if (!wrap) return;
  galleryPhotos.forEach((p, i) => {
    const t = document.createElement('img');
    t.src = p.src; t.alt = p[currentLang()]; t.loading = 'lazy';
    t.onclick = () => showPhoto(i);
    wrap.appendChild(t);
  });
})();

function updateLightboxUI() {
  const img = document.getElementById('lightboxImg');
  img.classList.add('swapping');
  setTimeout(() => {
    img.src = galleryPhotos[currentPhoto].src;
    img.alt = galleryPhotos[currentPhoto][currentLang()];
    img.classList.remove('swapping');
  }, 180);
  document.getElementById('lightboxCaption').textContent = galleryPhotos[currentPhoto][currentLang()];
  document.getElementById('lightboxCounter').textContent = (currentPhoto+1) + ' / ' + galleryPhotos.length;
  document.querySelectorAll('#lightboxThumbs img').forEach((t,i) => t.classList.toggle('active', i === currentPhoto));
}
function showPhoto(i) { currentPhoto = i; updateLightboxUI(); }
function toggleGallery() {
  const el = document.getElementById('galleryMore');
  const btn = document.getElementById('galleryToggleBtn');
  const icon = document.getElementById('galleryToggleIcon');
  const isOpen = el.classList.contains('open');
  if (isOpen) {
    el.style.height = el.scrollHeight + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.height = '0'; }));
    el.classList.remove('open');
    icon.style.transform = 'rotate(0deg)';
    btn.querySelectorAll('[data-lang="nl"]').forEach(s => s.textContent = "Bekijk alle 28 foto's");
    btn.querySelectorAll('[data-lang="en"]').forEach(s => s.textContent = 'View all 28 photos');
    btn.querySelectorAll('[data-lang="pt"]').forEach(s => s.textContent = 'Ver todas as 28 fotos');
    setTimeout(() => { const g = document.getElementById('galerij'); if(g) g.scrollIntoView({behavior:'smooth',block:'start'}); }, 100);
  } else {
    el.classList.add('open');
    el.style.height = el.scrollHeight + 'px';
    el.addEventListener('transitionend', function h() { if(el.classList.contains('open')) el.style.height = 'auto'; el.removeEventListener('transitionend', h); });
    icon.style.transform = 'rotate(180deg)';
    btn.querySelectorAll('[data-lang="nl"]').forEach(s => s.textContent = 'Minder foto\'s tonen');
    btn.querySelectorAll('[data-lang="en"]').forEach(s => s.textContent = 'Show fewer photos');
    btn.querySelectorAll('[data-lang="pt"]').forEach(s => s.textContent = 'Mostrar menos fotos');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openLightbox(i) {
  currentPhoto = i;
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  img.src = galleryPhotos[i].src; img.alt = galleryPhotos[i][currentLang()];
  document.getElementById('lightboxCaption').textContent = galleryPhotos[i][currentLang()];
  document.getElementById('lightboxCounter').textContent = (i+1) + ' / ' + galleryPhotos.length;
  document.querySelectorAll('#lightboxThumbs img').forEach((t,j) => t.classList.toggle('active', j === i));
  lb.classList.add('open');
  requestAnimationFrame(() => lb.classList.add('shown'));
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.classList.remove('shown');
  setTimeout(() => lb.classList.remove('open'), 350);
  document.body.style.overflow = '';
}
function lightboxNav(dir) {
  currentPhoto = (currentPhoto + dir + galleryPhotos.length) % galleryPhotos.length;
  updateLightboxUI();
}
document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxNav(-1);
  if (e.key === 'ArrowRight') lightboxNav(1);
});
const lbEl = document.getElementById('lightbox');
lbEl.addEventListener('click', function(e) {
  if (e.target === this) closeLightbox();
});
let touchX = null;
lbEl.addEventListener('touchstart', e => { touchX = e.changedTouches[0].clientX; }, {passive:true});
lbEl.addEventListener('touchend', e => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) lightboxNav(dx < 0 ? 1 : -1);
  touchX = null;
}, {passive:true});

// ── CONTACT FORM ──
const FORMSPREE_ID = 'mwvjyqrl';

let _captchaA = 0, _captchaB = 0, _captchaAnswer = 0;

function genCaptcha() {
  _captchaA = Math.floor(Math.random() * 9) + 1;
  _captchaB = Math.floor(Math.random() * 9) + 1;
  _captchaAnswer = _captchaA + _captchaB;
  updateContactCaptcha();
  const inp = document.getElementById('captchaInput');
  if (inp) inp.value = '';
}

function updateContactCaptcha() {
  const label = document.getElementById('captchaLabel');
  if (!label || !_captchaA) return;
  const lang = currentLang();
  const q = {
    nl: `Beveiligingsvraag: hoeveel is ${_captchaA} + ${_captchaB}?`,
    en: `Security check: what is ${_captchaA} + ${_captchaB}?`,
    pt: `Verificação: quanto é ${_captchaA} + ${_captchaB}?`,
  };
  label.textContent = q[lang] || q.nl;
}

(function prefillContactForm() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('cda_booking') || 'null');
    if (!saved) return;
    const ci = document.getElementById('formCheckin');
    const co = document.getElementById('formCheckout');
    const ps = document.getElementById('formPersons');
    if (ci && saved.checkin) ci.value = saved.checkin;
    if (co && saved.checkout) co.value = saved.checkout;
    const total = (saved.adults || 2) + (saved.children || 0);
    if (ps && total > 0) ps.value = total;
  } catch(e) {}
})();

genCaptcha();

(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const lang = currentLang();
    const feedback = document.getElementById('formFeedback');
    const submitBtn = form.querySelector('.submit-btn');

    const captchaVal = parseInt(document.getElementById('captchaInput').value, 10);
    if (isNaN(captchaVal) || captchaVal !== _captchaAnswer) {
      feedback.textContent = lang==='nl' ? 'Verkeerd antwoord. Probeer het opnieuw.'
                           : lang==='en' ? 'Incorrect answer. Please try again.'
                           : 'Resposta incorreta. Por favor tente novamente.';
      feedback.className = 'form-feedback error';
      genCaptcha();
      return;
    }

    const aanhefSel = form.querySelector(`.aanhef-select[data-lang="${lang}"]`);
    const aanhef    = aanhefSel ? aanhefSel.value : '';
    const voornaam  = form.querySelector('[name="voornaam"]').value.trim();
    const achternaam = form.querySelector('[name="achternaam"]').value.trim();
    const email     = form.querySelector('[name="email"]').value.trim();
    const telefoon  = form.querySelector('[name="telefoon"]').value.trim();
    const aankomst  = form.querySelector('[name="aankomst"]').value;
    const vertrek   = form.querySelector('[name="vertrek"]').value;
    const personen  = form.querySelector('[name="personen"]').value;
    const bericht   = form.querySelector('[name="bericht"]').value.trim();

    if (!voornaam || !achternaam || !email || !bericht) {
      feedback.textContent = lang==='nl' ? 'Vul alle verplichte velden (*) in.'
                           : lang==='en' ? 'Please fill in all required fields (*).'
                           : 'Por favor preencha todos os campos obrigatórios (*).'
      feedback.className = 'form-feedback error';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      feedback.textContent = lang==='nl' ? 'Vul een geldig e-mailadres in.'
                           : lang==='en' ? 'Please enter a valid email address.'
                           : 'Por favor insira um e-mail válido.';
      feedback.className = 'form-feedback error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    feedback.className = 'form-feedback';

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          aanhef, voornaam, achternaam, email, telefoon,
          aankomst, vertrek, personen, bericht,
          _subject: `Aanvraag Casa das Árvores – ${voornaam} ${achternaam}`,
          _replyto: email,
          _autoresponse: ({
            nl: `Beste ${aanhef ? aanhef + ' ' : ''}${achternaam},\n\nBedankt voor uw bericht. We hebben uw aanvraag ontvangen en nemen zo spoedig mogelijk contact met u op.\n\nMet vriendelijke groet,\nBert Verboom\nCasa das Árvores – Ilha Armona`,
            en: `Dear ${aanhef ? aanhef + ' ' : ''}${achternaam},\n\nThank you for your message. We have received your enquiry and will be in touch as soon as possible.\n\nKind regards,\nBert Verboom\nCasa das Árvores – Ilha Armona`,
            pt: `Caro/a ${aanhef ? aanhef + ' ' : ''}${achternaam},\n\nObrigado pela sua mensagem. Recebemos o seu pedido e entraremos em contacto o mais brevemente possível.\n\nCom os melhores cumprimentos,\nBert Verboom\nCasa das Árvores – Ilha Armona`,
          })[lang] || '',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        form.innerHTML = `<div class="form-feedback success" style="display:block;">`
          + (lang==='nl' ? `Bedankt, ${voornaam}! Uw bericht is ontvangen. We nemen zo spoedig mogelijk contact met u op.`
           : lang==='en' ? `Thank you, ${voornaam}! Your message has been received. We'll be in touch soon.`
           : `Obrigado, ${voornaam}! A sua mensagem foi recebida. Entraremos em contacto em breve.`)
          + `</div>`;
        requestAnimationFrame(() => {
          form.querySelector('.form-feedback').scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        throw new Error(json.error || 'server error');
      }
    } catch(err) {
      feedback.textContent = lang==='nl'
        ? 'Er is een fout opgetreden. Probeer het later opnieuw of stuur een e-mail naar bertverboom@gmail.com.'
        : lang==='en'
        ? 'Something went wrong. Please try again or email bertverboom@gmail.com.'
        : 'Ocorreu um erro. Tente novamente ou envie um e-mail para bertverboom@gmail.com.';
      feedback.className = 'form-feedback error';
      submitBtn.disabled = false;
      submitBtn.style.opacity = '';
    }
  });
})();

// ── BEDROOM 3D TILT ──
(function initBedroomTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('.bedroom-card').forEach(card => {
    card.addEventListener('mousemove', function(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rY = ((x - cx) / cx) * 4;
      const rX = -((y - cy) / cy) * 2.5;
      card.style.transform = `perspective(1400px) rotateX(${rX}deg) rotateY(${rY}deg) scale3d(1.01,1.01,1.01)`;
      card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.08s ease, box-shadow 0.4s ease, border-color 0.4s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.45s ease, border-color 0.45s ease';
      card.style.transform = 'perspective(1400px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    });
  });
})();

// ── INIT ──
document.getElementById('footer-year').textContent = new Date().getFullYear();
initCalendar();
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
if (document.readyState !== 'loading') {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.addEventListener('load', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});
