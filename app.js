"use strict";
/* SpinFlow – app.js (seluruh logika aplikasi lengkap) */

/* ===== CONFIG & CONSTANTS ===== */
const $ = s => document.querySelector(s);
const el = (t, p = {}, ...k) => {
  const e = Object.assign(document.createElement(t), p);
  e.append(...k);
  return e;
};
const KEY = 'spinflow.v1';
const PA = { top: -Math.PI / 2, right: 0, bottom: Math.PI / 2, left: Math.PI };
const TAU = Math.PI * 2;

const TH = {
  default: { n: 'Default', bg: '#f4f5f7', panel: '#ffffff', text: '#1c2430', accent: '#24456e', btn: '#24456e', btxt: '#ffffff', colors: ['#24456e', '#5f7fa6', '#2f6b70', '#8d9bab', '#3b5b85', '#6d9096', '#4b5a6e', '#b4bfcc'] },
  corporate: { n: 'Corporate', bg: '#eef2f7', panel: '#ffffff', text: '#1b2a41', accent: '#1f5fbf', btn: '#1f5fbf', btxt: '#ffffff', colors: ['#1f5fbf', '#5b8bd6', '#143d7a', '#7a8ca5', '#2c7a7b', '#4a5568', '#3182ce', '#a0aec0'] },
  dark: { n: 'Dark', bg: '#0a0a0c', panel: '#17171b', text: '#ececf1', accent: '#c9a227', btn: '#c9a227', btxt: '#111111', colors: ['#3b3b46', '#c9a227', '#56566a', '#8a6d12', '#2b2b33', '#a88a1e', '#6c6c80', '#47473a'] },
  neon: { n: 'Neon', bg: '#08011a', panel: '#140636', text: '#f4eaff', accent: '#00f0ff', btn: '#ff2bd6', btxt: '#12001f', colors: ['#ff2bd6', '#00f0ff', '#b6ff00', '#ffee00', '#8a2bff', '#ff5c1a', '#00ff9d', '#ff2b5e'] },
  minimal: { n: 'Minimal', bg: '#ffffff', panel: '#f4f4f4', text: '#111111', accent: '#111111', btn: '#111111', btxt: '#ffffff', colors: ['#111111', '#555555', '#888888', '#bbbbbb', '#333333', '#777777', '#aaaaaa', '#dddddd'] }
};

const DEF = {
  cfg: {
    theme: 'default', size: 100, dur: 6, rot: 6, rcolor: false, names: true, count: true,
    pointer: 'top', wborder: true, sborder: true, sSpin: true, sTick: true, sWin: true,
    sMusic: false, vol: 70, confetti: true, glow: false, shake: true, winners: 1,
    remove: true, mode: 'seq', dup: 'remove',
    custom: { bg: '#101820', text: '#f2f2f2', btn: '#e8505b', accent: '#f9d56e', colors: '#e8505b,#f9d56e,#14b1ab,#6a7fdb,#ff9a56,#7bd389' }
  },
  parts: [],
  winners: []
};

let S = structuredClone(DEF);
let busy = false;
let rot = 0;
let nid = Date.now();

/* ===== STORAGE ===== */
function load() {
  try {
    const r = localStorage.getItem(KEY);
    if (!r) return false;
    const d = JSON.parse(r);
    if (!Array.isArray(d.parts)) throw 0;
    S = {
      cfg: { ...DEF.cfg, ...d.cfg, custom: { ...DEF.cfg.custom, ...(d.cfg && d.cfg.custom) } },
      parts: d.parts,
      winners: Array.isArray(d.winners) ? d.winners : []
    };
    return true;
  } catch (e) {
    toast('Data corrupt – memakai pengaturan awal', 'err');
    return false;
  }
}

let sv;
function save() {
  clearTimeout(sv);
  sv = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {
      toast('Gagal menyimpan: penyimpanan penuh', 'err');
    }
  }, 120);
}

/* ===== RANDOM ===== */
const hasC = () => window.crypto && crypto.getRandomValues;
function rnd(n) {
  if (!hasC()) return Math.floor(Math.random() * n);
  const a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n;
  do { crypto.getRandomValues(a); } while (a[0] >= lim);
  return a[0] % n;
}
function rf() {
  if (!hasC()) return Math.random();
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

/* ===== UI HELPERS & MODAL ===== */
function toast(m, t) {
  const e = el('div', { className: 'toast ' + (t || ''), textContent: m });
  $('#toasts').append(e);
  setTimeout(() => e.remove(), 3800);
}

const dm = $('#dm');
function modal(body, btns, cls) {
  return new Promise(res => {
    dm.className = cls || '';
    dm.returnValue = '';
    const b = el('div', { className: 'btns' }, ...btns.map(x => el('button', {
      className: x.p ? 'pri' : '',
      textContent: x.t,
      onclick: () => dm.close(x.v)
    })));
    $('#dmb').replaceChildren(body, b);
    dm.addEventListener('close', () => res(dm.returnValue), { once: true });
    dm.showModal();
    const f = dm.querySelector('input,.pri');
    if (f) f.focus();
  });
}

const confirmBox = m => modal(el('div', {}, el('h2', { textContent: 'Konfirmasi' }), el('p', { textContent: m })), [{ t: 'Batal', v: '' }, { t: 'Ya, lanjutkan', v: 'y', p: 1 }]).then(v => v === 'y');

async function askText(title, val) {
  const i = el('input', { value: val || '', maxLength: 80 });
  const v = await modal(el('div', {}, el('h2', { textContent: title }), i), [{ t: 'Batal', v: '' }, { t: 'Simpan', v: 'ok', p: 1 }]);
  return v === 'ok' ? i.value.trim() : null;
}

function dl(name, text, mime) {
  const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: mime })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
}

/* ===== SOUND ===== */
let AC, mt;
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {}
  }
  if (AC && AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(f, d, type, v, t0, f2) {
  const a = ac();
  if (!a || S.cfg.vol <= 0) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (t0 || 0);
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime((v || .2) * S.cfg.vol / 100, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + d + .03);
}

function music() {
  clearInterval(mt);
  if (S.cfg.sMusic) {
    const sc = [261.6, 293.7, 329.6, 392, 440, 523.3];
    mt = setInterval(() => tone(sc[rnd(6)], .5, 'triangle', .07), 430);
  }
}

addEventListener('pointerdown', () => {
  if (S.cfg.sMusic) ac();
}, { once: true });

/* ===== CONFETTI ANIMATION ===== */
const fc = $('#fx'), fx = fc.getContext('2d');
let ps = [], confettiTimer;

function confetti() {
  if (!S.cfg.confetti) return;
  const was = ps.length;
  fc.width = innerWidth;
  fc.height = innerHeight;
  for (let i = 0; i < 170; i++) {
    ps.push({
      x: innerWidth / 2,
      y: innerHeight * .45,
      vx: (rf() - .5) * 20,
      vy: -rf() * 17 - 4,
      s: 6 + rf() * 7,
      r: rf() * 6,
      c: (theme().colors[rnd(theme().colors.length)]),
      l: 110 + rf() * 70
    });
  }
  try { fc.showPopover(); } catch (e) {}
  if (!was) cloop();

  clearTimeout(confettiTimer);
  confettiTimer = setTimeout(() => { ps = []; }, 4000);
}

function cloop() {
  fx.clearRect(0, 0, fc.width, fc.height);
  ps = ps.filter(p => p.l-- > 0);
  ps.forEach(p => {
    p.vy += .35;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= .99;
    p.r += .2;
    fx.fillStyle = p.c;
    fx.save();
    fx.translate(p.x, p.y);
    fx.rotate(p.r);
    fx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
    fx.restore();
  });
  if (ps.length) requestAnimationFrame(cloop);
  else try { fc.hidePopover(); } catch (e) {}
}

/* ===== THEME MANAGERS ===== */
function theme() {
  const c = S.cfg;
  if (c.theme === 'custom') {
    const u = c.custom;
    return {
      bg: u.bg,
      panel: u.bg,
      text: u.text,
      accent: u.accent,
      btn: u.btn,
      btxt: lum(u.btn) > .5 ? '#111' : '#fff',
      colors: u.colors.split(',').map(s => s.trim()).filter(s => /^#[0-9a-f]{6}$/i.test(s))
    };
  }
  return TH[c.theme] || TH.default;
}

function lum(h) {
  const n = parseInt(h.slice(1), 16), f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  return .2126 * f(n >> 16) + .7152 * f(n >> 8 & 255) + .0722 * f(n & 255);
}

function applyAll() {
  const t = theme(), r = document.documentElement.style;
  r.setProperty('--bg', t.bg);
  r.setProperty('--panel', t.panel);
  r.setProperty('--text', t.text);
  r.setProperty('--accent', t.accent);
  r.setProperty('--btn', t.btn);
  r.setProperty('--btxt', t.btxt);
  if (S.cfg.theme === 'custom') {
    document.body.style.background = t.bg;
  } else {
    document.body.style.background = '';
  }
  $('#stage').classList.toggle('glow', S.cfg.glow);
  $('#wheel').style.width = S.cfg.size + '%';
  stats();
  draw();
}

/* ===== WHEEL RENDERING & SPIN ===== */
const cv = $('#wheel'), cx = cv.getContext('2d');
const act = () => S.parts.filter(p => !p.out);

function segColor(i, pal) {
  return S.cfg.rcolor ? { bg: 'hsl(' + (i * 137.5 % 360 | 0) + ',32%,62%)', fg: '#111' } : (c => ({ bg: c, fg: lum(c) > .4 ? '#111' : '#fff' }))(pal[i % pal.length]);
}

function draw() {
  const W = cv.width, R = W / 2 - 14, list = act(), n = list.length, pal = theme().colors, t = theme();
  cx.clearRect(0, 0, W, W);
  cx.save();
  cx.translate(W / 2, W / 2);

  if (!n) {
    cx.fillStyle = t.panel;
    cx.beginPath();
    cx.arc(0, 0, R, 0, TAU);
    cx.fill();
    cx.strokeStyle = t.accent;
    cx.lineWidth = 8;
    cx.stroke();
    cx.fillStyle = t.text;
    cx.font = '600 44px "Segoe UI",sans-serif';
    cx.textAlign = 'center';
    cx.fillText(S.parts.length ? 'Wheel kosong' : 'Tambah peserta', 0, 10);
  } else {
    const seg = TAU / n;
    cx.rotate(rot);
    for (let i = 0; i < n; i++) {
      const c = segColor(i, pal);
      cx.beginPath();
      cx.moveTo(0, 0);
      cx.arc(0, 0, R, i * seg, (i + 1) * seg + (n > 1 ? .004 : 0));
      cx.closePath();
      cx.fillStyle = c.bg;
      cx.fill();
      if (S.cfg.sborder && n <= 400) {
        cx.strokeStyle = 'rgba(255,255,255,.55)';
        cx.lineWidth = 2;
        cx.stroke();
      }
    }
    if (S.cfg.names && n <= 150) {
      const fs = Math.max(11, Math.min(36, R * seg * .5));
      cx.font = '600 ' + fs + 'px "Segoe UI",sans-serif';
      cx.textAlign = 'right';
      cx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        cx.save();
        cx.rotate((i + .5) * seg);
        cx.fillStyle = segColor(i, pal).fg;
        let s = list[i].name;
        if (s.length > 20) s = s.slice(0, 19) + '…';
        cx.fillText(s, R - 26, 0);
        cx.restore();
      }
    }
    if (S.cfg.wborder) {
      cx.beginPath();
      cx.arc(0, 0, R, 0, TAU);
      cx.strokeStyle = t.accent;
      cx.lineWidth = 12;
      cx.stroke();
    }
    cx.beginPath();
    cx.arc(0, 0, 44, 0, TAU);
    cx.fillStyle = t.panel;
    cx.fill();
    cx.strokeStyle = t.accent;
    cx.lineWidth = 6;
    cx.stroke();
  }
  cx.restore();

  cx.save();
  cx.translate(W / 2, W / 2);
  cx.rotate(PA[S.cfg.pointer]);
  cx.beginPath();
  cx.moveTo(R - 34, 0);
  cx.lineTo(R + 12, -22);
  cx.lineTo(R + 12, 22);
  cx.closePath();
  cx.fillStyle = t.btn;
  cx.fill();
  cx.strokeStyle = t.text;
  cx.lineWidth = 4;
  cx.stroke();
  cx.restore();
}

function spinTo(idx, dur) {
  return new Promise(res => {
    const n = act().length, seg = TAU / n, pa = PA[S.cfg.pointer];
    let t = pa - (idx + .5 + (rf() - .5) * .7) * seg;
    t = ((t % TAU) + TAU) % TAU;
    const from = ((rot % TAU) + TAU) % TAU, fin = t + TAU * Math.ceil((from + S.cfg.rot * TAU - t) / TAU);
    const t0 = performance.now(), D = dur * 1000;
    let last = -1, lt = 0;
    if (S.cfg.sSpin) tone(160, dur, 'sawtooth', .05, 0, 520);

    (function f(now) {
      const p = Math.min(1, (now - t0) / D);
      rot = from + (fin - from) * (1 - Math.pow(1 - p, 4));
      const cur = Math.floor((((pa - rot) % TAU + TAU) % TAU) / seg);
      if (cur !== last) {
        last = cur;
        if (S.cfg.sTick && now - lt > 28) {
          lt = now;
          tone(900, .04, 'square', .08);
        }
      }
      draw();
      if (p < 1) requestAnimationFrame(f);
      else {
        rot = fin % TAU;
        draw();
        res();
      }
    })(t0);
  });
}

/* ===== PARTICIPANT MANAGERS ===== */
function stats() {
  const s = $('#stats');
  s.style.display = S.cfg.count ? '' : 'none';
  s.replaceChildren(...[['Total Participants', S.parts.length], ['Remaining', act().length], ['Winners', S.winners.length]].map(([a, b]) => el('div', { className: 'stat' }, el('small', { textContent: a }), el('b', { textContent: b }))));
}

function renderP() {
  const q = $('#q').value.trim().toLowerCase(), f = [];
  for (const p of S.parts) {
    if (!q || p.name.toLowerCase().includes(q)) f.push(p);
    if (f.length >= 200) break;
  }
  const ul = $('#plist');
  ul.replaceChildren(...f.map(p => {
    const li = el('li', { className: p.out ? 'won' : '' },
      el('span', { textContent: p.name, title: p.name }),
      el('button', { textContent: '✎', title: 'Edit', ariaLabel: 'Edit ' + p.name, onclick: async () => { const v = await askText('Edit peserta', p.name); if (v) { p.name = v; changed(); } } }),
      el('button', { textContent: '⧉', title: 'Duplikat', ariaLabel: 'Duplikat ' + p.name, onclick: () => { S.parts.splice(S.parts.indexOf(p) + 1, 0, { id: nid++, name: p.name, out: false }); changed(); } }),
      el('button', { textContent: '✕', title: 'Hapus', ariaLabel: 'Hapus ' + p.name, onclick: () => { S.parts.splice(S.parts.indexOf(p), 1); changed(); } })
    );
    return li;
  }));
  $('#pnote').textContent = S.parts.length ? (q ? 'Hasil pencarian (maks 200 ditampilkan)' : 'Menampilkan maks 200 baris; gunakan Search untuk menemukan nama') : 'Belum ada peserta.';
}

function renderH() {
  const ul = $('#hlist');
  ul.replaceChildren(...S.winners.map((w, i) => el('li', {},
    el('span', { textContent: (i + 1) + '. ' + w.name + (w.prize ? ' (' + w.prize + ')' : '') }),
    el('button', { textContent: '✕', title: 'Hapus dari history', ariaLabel: 'Hapus history ' + w.name, onclick: () => { S.winners.splice(i, 1); changed(); } })
  )));
  if (!S.winners.length) ul.append(el('li', { textContent: 'Belum ada pemenang' }));
}

function changed() {
  renderP();
  renderH();
  stats();
  draw();
  save();
}

/* ===== IMPORT & EXPORT ===== */
const sanitizeCsv = str => String(str || '').replace(/^([=+@-])/g, "'$1").replace(/"/g, '""');

async function addNames(arr, mode) {
  arr = arr.map(s => String(s).replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean);
  if (!arr.length) { toast('Tidak ada nama valid', 'err'); return; }
  const seen = new Set(S.parts.map(p => p.name.toLowerCase())), uniq = [];
  let d = 0;
  for (const s of arr) {
    const k = s.toLowerCase();
    if (seen.has(k)) d++;
    else { seen.add(k); uniq.push(s); }
  }
  let use = arr;
  if (d && mode === 'remove') use = uniq;
  else if (d && mode === 'ask') {
    use = (await confirmBox(d + ' duplikat ditemukan. Hapus duplikat otomatis?')) ? uniq : arr;
  }
  for (const s of use) S.parts.push({ id: nid++, name: s, out: false });
  changed();
  toast(arr.length + ' imported, ' + d + ' duplicates found, ' + (arr.length - d) + ' unique participants (ditambahkan: ' + use.length + ')');
}

function firstCell(l) {
  const m = l.match(/^\s*"((?:[^"]|"")*)"|^[^,;\t]*/);
  return m ? (m[1] !== undefined ? m[1].replace(/""/g, '"') : m[0]).trim() : '';
}

function readFile(f) {
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) { toast('File terlalu besar (maks 5 MB)', 'err'); return; }
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (!['txt', 'csv', 'json'].includes(ext)) { toast('File tidak valid: gunakan TXT, CSV, atau JSON', 'err'); return; }
  const r = new FileReader();
  r.onerror = () => toast('Gagal membaca file', 'err');
  r.onload = () => {
    let t = String(r.result).replace(/^\uFEFF/, ''), a;
    try {
      if (ext === 'json') {
        let j = JSON.parse(t);
        if (j && !Array.isArray(j)) j = j.participants || j.peserta;
        if (!Array.isArray(j)) throw 0;
        a = j.map(x => typeof x === 'object' && x ? (x.name || x.nama || '') : x);
      } else if (ext === 'csv') {
        a = t.split(/\r?\n/).map(firstCell);
        if (/^(nama|name|peserta|participant)$/i.test(a[0])) a.shift();
        if (!a.some(Boolean)) throw 1;
      } else a = t.split(/\r?\n/);
    } catch (e) {
      toast(ext === 'csv' ? 'Format CSV salah' : 'Format JSON tidak valid', 'err');
      return;
    }
    addNames(a, S.cfg.dup);
  };
  r.readAsText(f);
}

/* ===== MAIN SPIN LOGIC & WINNER POPUP ===== */
const now = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function winModal(namesArr, no, isSequenceOngoing) {
  const one = namesArr.length === 1;
  const catInput = $('#cat');
  const prize = catInput ? catInput.value.trim() : '';
  const prizeText = prize ? ' — Hadiah: ' + prize : '';

  const body = el('div', { className: 'win' }, el('div', { className: 'em', textContent: '🎉' }), el('h2', { textContent: 'CONGRATULATIONS!' }));
  if (one) {
    body.append(
      el('div', { className: 'nm', textContent: String(namesArr[0]) }),
      el('div', { textContent: '🏆 Winner #' + no + prizeText })
    );
  } else {
    body.append(
      el('ol', { start: no }, ...namesArr.map(n => el('li', { textContent: String(n) + prizeText })))
    );
  }

  // JIKA MASIH ADA PUTARAN SELANJUTNYA: Tampilkan "Continue"
  // JIKA PUTARAN TERAKHIR SELESAI: HANYA TAMPILKAN "Close" (TIDAK ADA Spin Again)
  const btns = isSequenceOngoing 
    ? [{ t: 'Continue', v: 'c', p: 1 }] 
    : [{ t: 'Close', v: 'x', p: 1 }];

  return modal(body, btns, 'win');
}

function fanfare() {
  if (S.cfg.sWin) [523, 659, 784, 1047].forEach((f, i) => tone(f, .5, 'triangle', .25, i * .12));
  if (S.cfg.shake) {
    const s = $('#stage');
    s.classList.remove('shake');
    void s.offsetWidth;
    s.classList.add('shake');
  }
  confetti();
}

function record(p, rem) {
  const catInput = $('#cat');
  const prize = catInput ? catInput.value.trim() : '';
  S.winners.push({ name: p.name, prize: prize, time: now() });
  if (rem) p.out = true;
}

async function start() {
  if (busy || dm.open || $('#ds').open) return;
  busy = true;
  $('#spin').disabled = true;

  const n = act().length, N = S.cfg.winners;
  
  if (!S.parts.length) { 
    toast('Peserta kosong – tambahkan peserta dulu', 'err'); 
    busy = false; $('#spin').disabled = false; 
    return; 
  }
  if (!n) { 
    toast('Tidak ada peserta tersisa – Reset Wheel dulu', 'err'); 
    busy = false; $('#spin').disabled = false; 
    return; 
  }
  if (N > n) { 
    toast('Jumlah winner (' + N + ') melebihi peserta tersisa (' + n + ')', 'err'); 
    busy = false; $('#spin').disabled = false; 
    return; 
  }

  try {
    const picked = [];
    if (S.cfg.mode === 'seq') {
      for (let k = 0; k < N; k++) {
        const list = act(), cand = list.filter(p => !picked.includes(p));
        if (!cand.length) break;

        const w = cand[rnd(cand.length)];
        await spinTo(list.indexOf(w), S.cfg.dur);
        picked.push(w);
        record(w, S.cfg.remove);
        changed();

        const isSequenceOngoing = (k < N - 1);
        const p = winModal([w.name], S.winners.length, isSequenceOngoing);
        fanfare();

        await p;
      }
    } else {
      const list = act(), pool = list.slice(), ws = [];
      for (let k = 0; k < N; k++) {
        const j = k + rnd(pool.length - k);
        [pool[k], pool[j]] = [pool[j], pool[k]];
        ws.push(pool[k]);
      }
      await spinTo(list.indexOf(ws[0]), Math.max(2, S.cfg.dur * .6));
      ws.forEach(w => record(w, S.cfg.remove));
      changed();
      const p = winModal(ws.map(w => w.name), S.winners.length - N + 1, false);
      fanfare();
      await p;
    }
  } finally {
    busy = false;
    $('#spin').disabled = false;
  }
}

/* ===== SETTINGS PANEL BUILDER ===== */
const G = [
  ['Wheel', [['size', 'r', 60, 100, 'Wheel size (%)'], ['dur', 'r', 2, 15, 'Animation duration (s)'], ['rot', 'r', 2, 15, 'Number of rotations'], ['rcolor', 'c', 'Random color'], ['names', 'c', 'Show participant names'], ['count', 'c', 'Show participant count'], ['pointer', 's', 'Pointer position', ['top', 'right', 'bottom', 'left']], ['wborder', 'c', 'Wheel border'], ['sborder', 'c', 'Segment border']]],
  ['Sound', [['sSpin', 'c', 'Spin sound'], ['sTick', 'c', 'Tick sound'], ['sWin', 'c', 'Winner sound'], ['sMusic', 'c', 'Background music'], ['vol', 'r', 0, 100, 'Volume (%)']]],
  ['Animation', [['confetti', 'c', 'Confetti'], ['glow', 'c', 'Glow effect'], ['shake', 'c', 'Screen shake']]]
];

function buildSettings() {
  const g = $('#gs');
  g.replaceChildren();
  for (const [h, items] of G) {
    g.append(el('h3', { textContent: h }));
    for (const it of items) {
      const [k, t] = it;
      let inp, lab = it[t === 'r' ? 4 : t === 's' ? 3 : 2];
      if (t === 'r') inp = el('input', { type: 'range', min: it[2], max: it[3], value: S.cfg[k] });
      else if (t === 'c') inp = el('input', { type: 'checkbox', checked: !!S.cfg[k] });
      else {
        inp = el('select');
        it[3].forEach(o => inp.append(el('option', { value: o, textContent: o, selected: S.cfg[k] === o })));
      }
      inp.id = 's_' + k;
      inp.addEventListener('input', () => {
        S.cfg[k] = t === 'c' ? inp.checked : t === 'r' ? +inp.value : inp.value;
        if (k === 'sMusic') music();
        applyAll();
        save();
      });
      g.append(el('div', { className: 'f' }, el('label', { htmlFor: inp.id, textContent: lab }), inp));
    }
  }

  g.append(el('h3', { textContent: 'Theme' }));
  const ts = el('select', { id: 's_theme' });
  [...Object.keys(TH), 'custom'].forEach(k => ts.append(el('option', { value: k, textContent: k === 'custom' ? 'Custom Theme' : TH[k].n, selected: S.cfg.theme === k })));
  ts.onchange = () => { S.cfg.theme = ts.value; applyAll(); save(); };
  g.append(el('div', { className: 'f' }, el('label', { htmlFor: 's_theme', textContent: 'Theme' }), ts));

  [['bg', 'Background color'], ['text', 'Text color'], ['btn', 'Button color'], ['accent', 'Accent color']].forEach(([k, l]) => {
    const i = el('input', { type: 'color', id: 'c_' + k, value: S.cfg.custom[k] });
    i.oninput = () => { S.cfg.custom[k] = i.value; S.cfg.theme = 'custom'; ts.value = 'custom'; applyAll(); save(); };
    g.append(el('div', { className: 'f' }, el('label', { htmlFor: i.id, textContent: 'Custom: ' + l }), i));
  });

  const wc = el('input', { id: 'c_colors', value: S.cfg.custom.colors });
  wc.oninput = () => { S.cfg.custom.colors = wc.value; S.cfg.theme = 'custom'; ts.value = 'custom'; applyAll(); save(); };
  g.append(el('div', { className: 'f' }, el('label', { htmlFor: 'c_colors', textContent: 'Custom: Wheel colors (#hex, koma)' }), wc));
  g.append(el('h3', { textContent: 'Privacy' }), el('p', { className: 'note', textContent: 'Your participant data is stored locally on this device and is never uploaded.' }));
}

/* ===== FULLSCREEN & PRESENTATION MODE ===== */
function fs() {
  if (document.fullscreenElement) document.exitFullscreen();
  else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => toast('Fullscreen tidak tersedia', 'err'));
}

function pres(on) {
  document.body.classList.toggle('pres', on);
  if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  draw();
}

addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('pres')) pres(false);
});

/* ===== BINDINGS & LISTENERS ===== */
$('#spin').onclick = start;
$('#bSet').onclick = () => { buildSettings(); $('#ds').showModal(); };
$('#dsx').onclick = () => $('#ds').close();
$('#bFs').onclick = fs;
$('#bPres').onclick = () => pres(true);
$('#bPanel').onclick = () => document.body.classList.toggle('nopanel');

$('#bImp').onclick = () => {
  const a = $('#bulk').value.split(/\r?\n/);
  addNames(a, S.cfg.dup);
  $('#bulk').value = '';
};

$('#bAdd').onclick = () => {
  const v = $('#one').value.trim();
  if (!v) { toast('Isi nama peserta', 'err'); return; }
  S.parts.push({ id: nid++, name: v.slice(0, 80), out: false });
  $('#one').value = '';
  changed();
  $('#one').focus();
};

$('#one').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.stopPropagation();
    $('#bAdd').click();
  }
});

$('#q').oninput = renderP;
$('#dup').onchange = e => { S.cfg.dup = e.target.value; save(); };

const dz = $('#drop'), fi = $('#file');
dz.onclick = () => fi.click();
dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
fi.onchange = () => { readFile(fi.files[0]); fi.value = ''; };

['dragenter', 'dragover'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.add('on'); }));
['dragleave', 'drop'].forEach(v => dz.addEventListener(v, e => { e.preventDefault(); dz.classList.remove('on'); }));
dz.addEventListener('drop', e => readFile(e.dataTransfer.files[0]));

const names = () => S.parts.map(p => p.name);
$('#xT').onclick = () => S.parts.length ? dl('peserta.txt', names().join('\n'), 'text/plain') : toast('Peserta kosong', 'err');
$('#xC').onclick = () => S.parts.length ? dl('peserta.csv', '\uFEFFNama\n' + names().map(n => '"' + sanitizeCsv(n) + '"').join('\n'), 'text/csv;charset=utf-8;') : toast('Peserta kosong', 'err');
$('#xJ').onclick = () => S.parts.length ? dl('peserta.json', JSON.stringify(names(), null, 2), 'application/json') : toast('Peserta kosong', 'err');

$('#hX').onclick = () => S.winners.length ? dl('hasil-undian.csv', '\uFEFFNo;Winner;Prize;Time\n' + S.winners.map((w, i) => (i + 1) + ';"' + sanitizeCsv(w.name) + '";"' + sanitizeCsv(w.prize || '-') + '";' + (w.time || '')).join('\n'), 'text/csv;charset=utf-8;') : toast('Belum ada pemenang', 'err');

$('#hC').onclick = async () => { if (S.winners.length && await confirmBox('Hapus seluruh winner history?')) { S.winners = []; changed(); } };
$('#bClear').onclick = async () => { if (S.parts.length && await confirmBox('Hapus SEMUA peserta?')) { S.parts = []; changed(); } };

$('#wn').onchange = e => {
  const c = e.target.value === 'c';
  $('#wc').style.display = c ? '' : 'none';
  if (!c) {
    S.cfg.winners = +e.target.value;
  } else {
    S.cfg.winners = Math.max(1, parseInt($('#wc').value) || 1);
    $('#wc').focus();
  }
  save();
};

$('#wc').oninput = e => {
  S.cfg.winners = Math.max(1, parseInt(e.target.value) || 1);
  save();
};

$('#mode').onchange = e => { S.cfg.mode = e.target.value; save(); };
$('#rem').onchange = e => { S.cfg.remove = e.target.value === '1'; save(); };

async function reset(m, fn) {
  if (await confirmBox(m)) {
    fn();
    changed();
    applyAll();
    syncUI();
    toast('Selesai');
  }
}

$('#r1').onclick = () => reset('Kembalikan semua peserta ke wheel?', () => S.parts.forEach(p => p.out = false));
$('#r2').onclick = () => reset('Hapus daftar pemenang?', () => S.winners = []);
$('#r3').onclick = () => reset('Hapus seluruh data session (peserta & pemenang)?', () => { S.parts = []; S.winners = []; });
$('#r4').onclick = () => reset('Factory reset: semua data dan pengaturan dikembalikan ke awal?', () => { S = structuredClone(DEF); try { localStorage.removeItem(KEY); } catch (e) {} music(); });

function syncUI() {
  const std = ['1', '2', '3', '5', '10'].includes(String(S.cfg.winners));
  $('#wn').value = std ? String(S.cfg.winners) : 'c';
  $('#wc').style.display = std ? 'none' : '';
  $('#wc').value = S.cfg.winners;
  $('#mode').value = S.cfg.mode;
  $('#rem').value = S.cfg.remove ? '1' : '0';
  $('#dup').value = S.cfg.dup;
}

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!dm.open && !$('#ds').open && document.body.classList.contains('pres')) pres(false);
    return;
  }
  if (e.key === 'F11') {
    e.preventDefault();
    fs();
    return;
  }
  
  const t = e.target;
  const typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  
  if (typing || dm.open || $('#ds').open || busy || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === ' ' || e.key === 'Enter') {
    if (t && t.tagName === 'BUTTON' && t !== $('#spin')) return;
    e.preventDefault();
    start();
  } else if (e.key === 'f' || e.key === 'F') {
    fs();
  } else if (e.key === 'r' || e.key === 'R') {
    $('#r1').click();
  }
});

/* ===== INITIALIZATION ===== */
(async function init() {
  const had = load();
  syncUI();
  applyAll();
  renderP();
  renderH();
  music();

  if (had && (S.parts.length || S.winners.length)) {
    const v = await modal(
      el('div', {}, el('h2', { textContent: 'Resume Previous Session?' }), el('p', { textContent: S.parts.length + ' peserta, ' + S.winners.length + ' pemenang tersimpan.' })),
      [{ t: 'Start New', v: 'new' }, { t: 'Resume', v: 'r', p: 1 }]
    );
    if (v === 'new') {
      S.parts = [];
      S.winners = [];
      changed();
    }
  }
  syncUI();
})();

/* ===== TAB NAVIGATION ===== */
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('.tab').forEach(t => t.hidden = t.dataset.tab !== b.dataset.t);
});