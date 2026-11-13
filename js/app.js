// XORIGUER QR · aplicació
'use strict';
(function () {
const VERSIO = '1.2.1';
const { FITXES, codificaPersonal, dataLocal, TXT } = window.XQR_FITXES;
const T = window.T, LANG = window.XQR_IDIOMA.L;
const C = window.XQR_CRIPTO;
const $ = s => document.querySelector(s);
const el = (tag, at = {}, ...fills) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of fills.flat()) if (f != null) e.append(f);
  return e;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ANDROID = !!window.XoriguerAndroid || /; wv\)/.test(navigator.userAgent);
const ESCRIPTORI = /Electron/.test(navigator.userAgent);

// ------------------------------------------------------------------ dades
const CLAU = 'xoriguer-qr';
let E = { items: [], fitxesMeves: [], persones: [T('Jo')], ultimaCopia: null };
try { Object.assign(E, JSON.parse(localStorage.getItem(CLAU) || '{}')); } catch (e) { /* començar de nou */ }
const desa = () => { try { localStorage.setItem(CLAU, JSON.stringify(E)); } catch (e) { avis(T("No s'ha pogut desar (memòria plena?)")); } };

function avis(t, ms = 2600) {
  const a = $('#avis');
  a.textContent = t; a.hidden = false;
  clearTimeout(avis.t); avis.t = setTimeout(() => { a.hidden = true; }, ms);
}

// ------------------------------------------------------------------ dibuix del QR (motor a dibuix.js)
const D = window.XQR_DIBUIX;
E.logos = E.logos || [];
const LOGO_FALCO = { id: 'falco', nom: T('Falcó Xoriguer'), src: 'icons/falco.png', fons: '#0A0B0E' };
const totsLogos = () => [LOGO_FALCO, ...E.logos];
const imatges = new Map();
function imatgeLogo(id) {
  const l = totsLogos().find(x => x.id === id);
  if (!l) return null;
  let im = imatges.get(id);
  if (!im) {
    im = new Image();
    im.onload = () => { if (!$('#editor').hidden) regenera(); if ($('#v-meus').classList.contains('on')) pintaMeus(); };
    im.src = l.src;
    imatges.set(id, im);
  }
  return im.complete && im.naturalWidth ? { im, l } : null;
}
/** Opcions amb la imatge del logo ja carregada (si n'hi ha). */
function resol(op) {
  const o = { ...(op || {}) };
  delete o.logoImg;
  if (o.logo) {
    const r = imatgeLogo(o.logo);
    if (r) { o.logoImg = r.im; o.logoSrc = r.l.src; }
  }
  return o;
}
/** Dibuixa el QR a `cv` (amplada `mida` px; amb `ambMarc` hi afegeix el marc amb text). */
function dibuixaQR(cv, text, op = {}, mida = cv.width, ambMarc = false) {
  return D.dibuixa(cv, text, resol(op), mida, ambMarc);
}

function arrod(x, a, b, w, h, r) {
  x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
}

// ------------------------------------------------------------------ navegació
function mostra(v) {
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  if (v !== 'llegir') aturaCamera();
  if (v === 'meus') pintaMeus();
  if (v === 'mes') pintaMes();
  window.scrollTo(0, 0);
}
$('#nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) mostra(b.dataset.v); });

// ------------------------------------------------------------------ llistes de fitxes
function targetaFitxa(f, obre, treu) {
  return el('button', { class: 'fitxa', style: `--c:${f.color || '#FFA82E'}`, onclick: obre },
    el('span', { class: 'ic', text: f.icona || '🗂️' }),
    el('span', {}, el('b', { text: f.nom }), el('small', { text: f.desc || '' })),
    treu ? el('span', { class: 'treu', title: T('Esborra la fitxa'), role: 'button',
      onclick: ev => { ev.stopPropagation(); treu(); } }, '✕') : null);
}
function pintaFitxes() {
  $('#llista-fitxes').replaceChildren(...FITXES.map(f => targetaFitxa(f, () => obreEditor({ fitxa: f.id }))));
  $('#bloc-fitxes-meves').hidden = !E.fitxesMeves.length;
  $('#llista-fitxes-meves').replaceChildren(...E.fitxesMeves.map(f => targetaFitxa(
    { ...f, desc: f.camps.join(' · '), color: '#FFA82E' },
    () => obreEditor({ fitxa: 'personal', plantilla: f }),
    () => { if (confirm(T("Esborrar la fitxa «{n}»? (els QR ja desats no s'esborren)", { n: f.nom }))) { E.fitxesMeves = E.fitxesMeves.filter(x => x !== f); desa(); pintaFitxes(); } })));
}
$('#nou-personal').onclick = () => obreEditor({ fitxa: 'personal' });

// ------------------------------------------------------------------ editor
const ed = { fitxa: null, dades: {}, item: null, qr: '', frase: '' };
const fitxaDe = id => FITXES.find(f => f.id === id);

function obreEditor({ fitxa, plantilla, item, dades, frase }) {
  ed.item = item || null;
  ed.fitxa = fitxa;
  ed.frase = frase || '';
  const f = fitxaDe(fitxa);
  if (fitxa === 'personal') {
    ed.dades = dades || { capcalera: plantilla ? plantilla.nom : '', format: 'text',
      camps: (plantilla ? plantilla.camps : ['', '']).map(l => ({ label: l, valor: '' })) };
  } else {
    ed.dades = dades || Object.fromEntries(f.camps.filter(c => c.val !== undefined).map(c => [c.k, c.val]));
  }
  $('#ed-titol').textContent = f ? `${f.icona} ${f.nom}` : (plantilla ? `${plantilla.icona || '✏️'} ${plantilla.nom}` : '✏️ ' + T('Personalitzat'));
  $('#ed-nom').value = item?.nom || '';
  $('#ed-nom').dataset.auto = item ? '' : '1';
  omplePersones($('#ed-persona'), item?.persona ?? '');
  const op = item?.op || {};
  posaAspecte(item ? op : (E.estil || {}));
  const forca = !!f?.forcaXifrat;
  $('#op-xifra').checked = forca || !!op.xifra;
  $('#op-xifra').disabled = forca;
  $('#op-frase').value = $('#op-frase2').value = ed.frase;
  $('#op-xifra-camps').hidden = !$('#op-xifra').checked;
  $('#ed-opcions').open = forca;
  if (fitxa === 'personal') pintaPersonal(); else pintaCamps(f);
  $('#ed-extra').replaceChildren();
  if (f?.boto?.fes === 'ubicacio') {
    $('#ed-extra').append(el('button', { type: 'button', class: 'b sec', text: f.boto.text, onclick: ubicacio }));
  }
  $('#ac-desa-fitxa').hidden = fitxa !== 'personal';
  pintaBotonsTargeta(f);
  $('#editor').hidden = false;
  document.body.style.overflow = 'hidden';
  $('#editor').scrollTop = 0;
  regenera();
}
$('#ed-tanca').onclick = tancaEditor;
function tancaEditor() { $('#editor').hidden = true; document.body.style.overflow = ''; }

function pintaCamps(f) {
  const cont = el('div', { class: 'camps' });
  for (const c of f.camps) {
    if (c.grup) cont.append(el('div', { class: 'grup', text: c.grup }));
    const id = 'c-' + c.k;
    let inp;
    const val = ed.dades[c.k] ?? '';
    if (c.tipus === 'select') {
      inp = el('select', { id }, c.opcions.map(([v, t]) => el('option', { value: v, text: t, selected: v === val })));
    } else if (c.tipus === 'textarea') {
      inp = el('textarea', { id, rows: c.alt || 2, placeholder: c.placeholder || '' });
      inp.value = val;
    } else {
      inp = el('input', { id, type: c.tipus || 'text', placeholder: c.placeholder || '', value: val,
        autocomplete: c.tipus === 'password' ? 'new-password' : 'off',
        inputmode: c.tipus === 'tel' ? 'tel' : undefined });
    }
    inp.addEventListener('input', () => { ed.dades[c.k] = inp.value; regenera(); });
    const camp = el('div', { class: 'camp' + (c.mig ? ' mig' : '') + (c.curt ? ' curt' : '') }, el('label', { for: id, text: c.label }));
    if (c.tipus === 'password') {
      camp.append(el('div', { class: 'fila' }, inp, el('button', { type: 'button', class: 'b sec petit', text: '👁',
        title: T('Mostra / amaga'), onclick: () => { inp.type = inp.type === 'password' ? 'text' : 'password'; } })));
    } else camp.append(inp);
    cont.append(camp);
  }
  $('#ed-camps').replaceChildren(cont);
}

const SUGGERITS = ['Nom', 'Telèfon', 'Adreça', 'Correu', 'Al·lèrgies', 'Grup sanguini', 'Medicació', 'Contacte d\'emergència',
  'Matrícula', 'Núm. de soci', 'Web', 'Horari', 'Notes'].map(s => T(s));

function pintaPersonal() {
  const d = ed.dades;
  const files = el('div', {});
  d.camps.forEach((c, i) => {
    const lab = el('input', { placeholder: T('Nom del camp'), value: c.label, 'aria-label': T('Nom del camp') });
    const val = el('textarea', { class: 'valor', rows: 1, placeholder: T('Valor'), 'aria-label': T('Valor') });
    val.value = c.valor;
    lab.oninput = () => { c.label = lab.value; regenera(); };
    val.oninput = () => { c.valor = val.value; regenera(); };
    files.append(el('div', { class: 'pcamp' },
      el('button', { type: 'button', class: 'mou', title: T('Puja / baixa'), onclick: ev => {
        const amunt = ev.offsetY < ev.currentTarget.offsetHeight / 2;
        const j = amunt ? i - 1 : i + 1;
        if (j < 0 || j >= d.camps.length) return;
        [d.camps[i], d.camps[j]] = [d.camps[j], d.camps[i]]; pintaPersonal(); regenera();
      } }, el('span', { text: '▲' }), el('span', { text: '▼' })),
      lab, val,
      el('button', { type: 'button', class: 'treu', title: T('Treu el camp'), text: '✕',
        onclick: () => { d.camps.splice(i, 1); pintaPersonal(); regenera(); } })));
  });
  const cap = el('input', { id: 'p-cap', placeholder: T("p. ex. DADES DE L'AVI"), value: d.capcalera || '' });
  cap.oninput = () => { d.capcalera = cap.value; regenera(); };
  const fmt = el('select', { id: 'p-fmt' },
    el('option', { value: 'text', text: T('Text (es llegeix amb qualsevol mòbil)'), selected: d.format !== 'json' }),
    el('option', { value: 'json', text: T('JSON (per a programes)'), selected: d.format === 'json' }));
  fmt.onchange = () => { d.format = fmt.value; regenera(); };
  $('#ed-camps').replaceChildren(
    el('div', { class: 'camp' }, el('label', { for: 'p-cap', text: T('Capçalera (primera línia, opcional)') }), cap),
    el('div', { class: 'grup', text: T('Camps') }), files,
    el('div', { class: 'botons' }, el('button', { type: 'button', class: 'b sec', text: T('➕ Afegeix un camp'),
      onclick: () => { d.camps.push({ label: '', valor: '' }); pintaPersonal(); files.lastElementChild; } })),
    el('div', { class: 'xips' }, SUGGERITS.map(s => el('button', { type: 'button', class: 'etq', text: '+ ' + s,
      onclick: () => { d.camps.push({ label: s, valor: '' }); pintaPersonal(); regenera(); } }))),
    el('div', { class: 'camp' }, el('label', { for: 'p-fmt', text: T('Format') }), fmt));
}

$('#ac-desa-fitxa').onclick = () => {
  const camps = ed.dades.camps.map(c => c.label.trim()).filter(Boolean);
  if (!camps.length) return avis(T('Posa nom als camps primer'));
  demana(T('Desa com a fitxa meva'), [
    { id: 'nom', label: T('Nom de la fitxa'), val: ed.dades.capcalera || '' },
    { id: 'icona', label: T('Icona (un emoji)'), val: '🗂️' },
  ], v => {
    if (!v.nom.trim()) return false;
    E.fitxesMeves.push({ id: 'u_' + uid(), nom: v.nom.trim(), icona: v.icona.trim() || '🗂️', camps });
    desa(); pintaFitxes(); avis(T('Fitxa desada a «Fitxes → Les meves fitxes»'));
  });
};

// opcions
// ------------------------------------------------------------------ aspecte i logo
const CAMPS_OP = ['color', 'fons', 'punts', 'formaUlls', 'marge', 'nivell', 'logoMida', 'logoPlaca', 'logoFons', 'marc', 'marcText', 'marcColor'];
let logoTriat = '';
if (D.PER_DEFECTE) D.PER_DEFECTE.marcText = T("ESCANEJA'M");
const ESTILS = [
  { nom: 'Clàssic', o: { color: '#000000', color2: '', ulls: '', fons: '#FFFFFF', punts: 'quadrat', formaUlls: 'quadrat' } },
  { nom: 'Xoriguer', o: { color: '#0A0B0E', color2: '', ulls: '#F2650F', fons: '#FFFFFF', punts: 'arrodonit', formaUlls: 'arrodonit' } },
  { nom: 'Suau', o: { color: '#1B3455', color2: '', ulls: '', fons: '#FFFFFF', punts: 'punts', formaUlls: 'rodo' } },
  { nom: 'Degradat', o: { color: '#2C5282', color2: '#C2410C', ulls: '', fons: '#FFFFFF', punts: 'arrodonit', formaUlls: 'fulla' } },
  { nom: 'Barres', o: { color: '#14532D', color2: '', ulls: '', fons: '#F6EFE2', punts: 'barres', formaUlls: 'arrodonit' } },
  { nom: 'Vermell', o: { color: '#B91C1C', color2: '', ulls: '#7F1D1D', fons: '#FFFFFF', punts: 'quadrat', formaUlls: 'arrodonit' } },
];
function posaAspecte(o0) {
  const o = D.opc(o0);
  for (const k of CAMPS_OP) { const e = $('#op-' + k); if (e) e.value = o[k] ?? ''; }
  if (!o.logoFons) $('#op-logoFons').value = o.fons;
  if (!o.marcColor) $('#op-marcColor').value = o.color;
  $('#op-ambDegradat').checked = !!o.color2; $('#op-color2').value = o.color2 || '#F2650F';
  $('#op-ambUlls').checked = !!o.ulls; $('#op-ulls').value = o.ulls || '#F2650F';
  logoTriat = totsLogos().some(l => l.id === o.logo) ? o.logo : '';
  pintaLogos(); etiquetesRang();
}
function llegeixAspecte() {
  const o = {};
  for (const k of CAMPS_OP) o[k] = $('#op-' + k).value;
  o.marge = +o.marge; o.logoMida = +o.logoMida;
  o.color2 = $('#op-ambDegradat').checked ? $('#op-color2').value : '';
  o.ulls = $('#op-ambUlls').checked ? $('#op-ulls').value : '';
  o.logo = logoTriat;
  return o;
}
function etiquetesRang() {
  $('#op-logoMida-v').textContent = $('#op-logoMida').value + '%';
  $('#op-marge-v').textContent = $('#op-marge').value;
  $('#op-logo-opcions').hidden = !logoTriat;
  $('#op-marcText').disabled = $('#op-marcColor').disabled = $('#op-marc').value !== 'text';
}
function pintaLogos() {
  const boto = (id, contingut, titol, treu) => el('button', { type: 'button', class: 'logo' + (logoTriat === id ? ' on' : ''), title: titol,
    onclick: () => {
      logoTriat = id;
      const l = totsLogos().find(x => x.id === id);
      if (l) $('#op-logoFons').value = l.fons || $('#op-fons').value;
      pintaLogos(); etiquetesRang(); regenera();
    } }, contingut,
    treu ? el('span', { class: 'treu', title: T('Esborra el logo'), role: 'button', text: '✕', onclick: ev => {
      ev.stopPropagation();
      if (!confirm(T('Esborrar el logo «{n}»? Els QR que el fan servir es quedaran sense logo.', { n: treu.nom }))) return;
      E.logos = E.logos.filter(x => x !== treu); imatges.delete(treu.id);
      if (logoTriat === treu.id) logoTriat = '';
      desa(); pintaLogos(); etiquetesRang(); regenera();
    } }) : null);
  $('#op-logos').replaceChildren(
    boto('', el('span', { class: 'sense', text: T('Cap') }), T('Sense logo')),
    ...totsLogos().map(l => boto(l.id, el('img', { src: l.src, alt: l.nom, style: l.fons ? `background:${l.fons}` : '' }), l.nom, l.id === 'falco' ? null : l)));
}
$('#op-puja-logo').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const url = URL.createObjectURL(f);
    const im = new Image();
    await new Promise((ok, ko) => { im.onload = ok; im.onerror = ko; im.src = url; });
    // es desa reduït (màx. 320 px) perquè no ompli la memòria de l'aparell
    const w0 = im.naturalWidth || 320, h0 = im.naturalHeight || 320;
    const k = Math.min(1, 320 / Math.max(w0, h0));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w0 * k)); cv.height = Math.max(1, Math.round(h0 * k));
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    let src = cv.toDataURL('image/webp', 0.92);
    if (!src.startsWith('data:image/webp')) src = cv.toDataURL('image/png');
    const l = { id: 'l_' + uid(), nom: f.name.replace(/\.[^.]+$/, '').slice(0, 40), src };
    E.logos.push(l); desa();
    logoTriat = l.id; $('#op-logoFons').value = $('#op-fons').value;
    pintaLogos(); etiquetesRang(); regenera();
    avis(T('Logo afegit. Es queda desat per a altres QR.'));
  } catch (err) { avis(T('No he pogut llegir aquesta imatge'), 3000); }
};
$('#op-estils').replaceChildren(...ESTILS.map(es => el('button', { type: 'button', class: 'etq estil', text: T(es.nom),
  onclick: () => { posaAspecte({ ...llegeixAspecte(), ...es.o, logoFons: '', marcColor: '' }); regenera(); } })));
['op-color', 'op-fons', 'op-color2', 'op-ulls', 'op-punts', 'op-formaUlls', 'op-marge', 'op-nivell', 'op-logoMida', 'op-logoPlaca',
  'op-logoFons', 'op-marc', 'op-marcText', 'op-marcColor', 'op-ambDegradat', 'op-ambUlls']
  .forEach(id => $('#' + id).addEventListener('input', () => { etiquetesRang(); regenera(); }));
$('#op-reset').onclick = () => { posaAspecte({}); regenera(); };
$('#op-predet').onclick = () => { E.estil = llegeixAspecte(); desa(); avis(T('Els QR nous tindran aquest aspecte')); };
$('#op-xifra').onchange = () => { $('#op-xifra-camps').hidden = !$('#op-xifra').checked; regenera(); };
['op-frase', 'op-frase2'].forEach(id => $('#' + id).addEventListener('input', regenera));
$('#ed-nom').addEventListener('input', () => { $('#ed-nom').dataset.auto = $('#ed-nom').value ? '' : '1'; });

function textPla() {
  if (ed.fitxa === 'personal') return codificaPersonal(ed.dades);
  return fitxaDe(ed.fitxa).codifica(ed.dades);
}
function titolAuto() {
  if (ed.fitxa === 'personal') return ed.dades.capcalera || ed.dades.camps.find(c => c.valor)?.valor?.slice(0, 30) || T('QR personalitzat');
  return fitxaDe(ed.fitxa).titol(ed.dades);
}
const op = () => ({ ...llegeixAspecte(), xifra: $('#op-xifra').checked });

function teContingut() {
  if (ed.fitxa === 'personal') return ed.dades.camps.some(c => c.valor.trim()) || !!ed.dades.capcalera?.trim();
  return Object.entries(ed.dades).some(([k, v]) => k !== 'idioma' && k !== 'seg' && k !== 'oculta' && k !== 'pais' && String(v).trim());
}

let torn = 0;
async function regenera() {
  const meu = ++torn;
  const info = $('#qr-info');
  info.classList.remove('mal');
  if ($('#ed-nom').dataset.auto) $('#ed-nom').placeholder = titolAuto();
  if (!teContingut()) { $('#qr-buit').hidden = false; ed.qr = ''; $('#qr-text').textContent = ''; info.textContent = ''; botons(false); return; }
  let text = textPla();
  const o = op();
  if (o.xifra) {
    const f1 = $('#op-frase').value, f2 = $('#op-frase2').value;
    if (!C.disponible) { info.textContent = T('Aquest navegador no pot xifrar.'); info.classList.add('mal'); return; }
    if (f1.length < 6) { mostraBuit(T('Posa una frase secreta (mínim 6 caràcters) a «Seguretat»')); return; }
    if (f1 !== f2) { mostraBuit(T('Les dues frases secretes no coincideixen')); return; }
    await new Promise(r => setTimeout(r, 250));
    if (meu !== torn) return;
    text = await C.xifra(text, f1);
    if (meu !== torn) return;
    ed.frase = f1;
  }
  ed.qr = text;
  const cv = $('#qr');
  const r = dibuixaQR(cv, text, o, 600, true);
  $('.qr-marc').style.background = o.fons;
  $('#qr-buit').hidden = !!r;
  $('#qr-text').textContent = text;
  if (!r) { info.textContent = T('Massa dades per a un QR: treu text.'); info.classList.add('mal'); botons(false); return; }
  const avisC = D.avisColors(o);
  $('#op-avis-colors').hidden = !avisC; $('#op-avis-colors').textContent = '⚠️ ' + avisC;
  const base = T('{n} caràcters · versió {v} · correcció {c}', { n: text.length, v: r.versio, c: r.nivell }) + (o.xifra ? ' · ' + T('🔐 xifrat') : '');
  info.textContent = base + ' · ' + T('comprovant…');
  botons(true);
  // prova de lectura, com faria un mòbil amb una foto petita
  setTimeout(() => {
    if (meu !== torn) return;
    const ok = D.provaLectura(cv, text);
    if (ok === false) {
      info.textContent = base + ' · ' + T("⚠️ costa de llegir: fes el logo més petit, posa més contrast o puja la correcció d'errors");
      info.classList.add('mal');
    } else info.textContent = base + (ok ? ' · ' + T('✅ es llegeix bé') : '') + (r.versio > 15 ? ' · ' + T('és dens: imprimeix-lo gran') : '');
  }, 60);
}
function mostraBuit(t) {
  ed.qr = ''; $('#qr-buit').hidden = false; $('#qr-buit').textContent = t; botons(false);
  $('#qr-info').textContent = '';
}
function botons(ok) {
  if (ok) $('#qr-buit').textContent = T('Omple les dades');
  document.querySelectorAll('.ed-accions .b').forEach(b => { b.disabled = !ok; });
}

// ------------------------------------------------------------------ desar
$('#ac-desa').onclick = async () => {
  if (!ed.qr) return;
  const o = op();
  const ara = new Date().toISOString();
  const it = ed.item || { id: uid(), creat: ara };
  Object.assign(it, { fitxa: ed.fitxa, nom: $('#ed-nom').value.trim() || titolAuto(), persona: $('#ed-persona').value,
    op: o, qr: ed.qr, mod: ara, titolFitxa: $('#ed-titol').textContent });
  if (o.xifra) { it.dadesX = await C.xifra(JSON.stringify(ed.dades), ed.frase); delete it.dades; }
  else { it.dades = JSON.parse(JSON.stringify(ed.dades)); delete it.dadesX; }
  if (!ed.item) E.items.unshift(it);
  ed.item = it;
  desa();
  avis(T('Desat a «Els meus»'));
};

function obreItem(it) {
  if (it.dadesX) {
    demana(T('🔐 QR protegit'), [{ id: 'f', label: T('Frase secreta'), tipus: 'password' }], async v => {
      try {
        const dades = JSON.parse(await C.desxifra(it.dadesX, v.f));
        obreEditor({ fitxa: it.fitxa, item: it, dades, frase: v.f });
      } catch (e) { avis(T('Frase incorrecta')); return false; }
    });
    return;
  }
  obreEditor({ fitxa: it.fitxa, item: it, dades: JSON.parse(JSON.stringify(it.dades || {})) });
}

// ------------------------------------------------------------------ fitxers: baixar, compartir, imprimir
const nomFitxer = t => (t || 'qr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50) || 'qr';
const aBlob = cv => new Promise(r => cv.toBlob(r, 'image/png'));

function baixa(blob, nom) {
  const u = URL.createObjectURL(blob);
  const a = el('a', { href: u, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 30000);
  if (!ANDROID) avis(T('Desat: {n}', { n: nom }));
}
async function comparteix(blob, nom, titol) {
  const f = new File([blob], nom, { type: 'image/png' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [f] }))) {
    try { await navigator.share({ files: [f], title: titol }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  baixa(blob, nom);
}
function imprimeix(cv) {
  const img = el('img', { src: cv.toDataURL('image/png') });
  $('#impressio').replaceChildren(img);
  img.onload = () => setTimeout(() => window.print(), 100);
}
const nomActual = () => $('#ed-nom').value.trim() || titolAuto();

function qrGran(mida = 1200) {
  const cv = document.createElement('canvas');
  dibuixaQR(cv, ed.qr, op(), mida, true);
  return cv;
}
$('#ac-svg').onclick = () => {
  const s = D.svg(ed.qr, resol(op()), 1000, true);
  if (s) baixa(new Blob([s], { type: 'image/svg+xml' }), nomFitxer(nomActual()) + '_QR.svg');
};
$('#ac-png').onclick = async () => baixa(await aBlob(qrGran()), nomFitxer(nomActual()) + '_QR.png');
$('#ac-comparteix').onclick = async () => comparteix(await aBlob(qrGran()), nomFitxer(nomActual()) + '_QR.png', nomActual());

// ------------------------------------------------------------------ targetes i fons de pantalla
const TARGETES = {
  fons: { nom: T('📱 Fons de pantalla'), desc: T('Per a la pantalla de bloqueig del mòbil: els sanitaris el veuen sense desbloquejar-lo.') },
  adhesiu: { nom: T('🏷️ Adhesiu'), desc: T('Per al casc, la cartera, el cotxe, la nevera… (10×12 cm).') },
  targeta: { nom: T('💳 Targeta'), desc: T('Mida targeta de crèdit (85×54 mm), per imprimir i portar a la cartera.') },
};
function pintaBotonsTargeta(f) {
  const tipus = f?.targetes || ['targeta', 'adhesiu'];
  $('#ac-targetes').replaceChildren(...tipus.map(t => el('button', { class: 'b sec', text: TARGETES[t].nom, onclick: () => fesTargeta(t) })));
}
const esEmerg = () => ed.fitxa === 'emergencia' || ed.fitxa === 'medica';
const txtE = () => TXT[ed.dades.idioma] || TXT[LANG] || TXT.ca;
const fontT = px => `800 ${px}px Montserrat, "Segoe UI", sans-serif`;
const fontX = (px, w = 600) => `${w} ${px}px "Segoe UI", Roboto, system-ui, sans-serif`;

function liniesText(x, text, maxW) {
  const out = [];
  for (const par of String(text).split('\n')) {
    let l = '';
    for (const w of par.split(' ')) {
      const p = l ? l + ' ' + w : w;
      if (x.measureText(p).width > maxW && l) { out.push(l); l = w; } else l = p;
    }
    out.push(l);
  }
  return out;
}
function escriu(x, text, cx, y, maxW, lh, maxL = 3, alinea = 'center') {
  x.textAlign = alinea;
  let ls = liniesText(x, text, maxW);
  if (ls.length > maxL) { ls = ls.slice(0, maxL); ls[maxL - 1] = ls[maxL - 1].replace(/.{0,2}$/, '…'); }
  ls.forEach((l, i) => x.fillText(l, cx, y + i * lh));
  return y + ls.length * lh;
}
function rotulMarca(x, cx, y, px, color = '#F6EFE2') {
  x.font = fontT(px); x.fillStyle = color; x.textAlign = 'center';
  x.fillText('XORIGUER', cx, y);
  x.font = fontX(px * 0.42); x.fillStyle = '#FFA82E';
  x.fillText('Q R', cx, y + px * 0.62);
}
function fonsBlauNit(x, w, h) {
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#2C5282'); g.addColorStop(1, '#0A1628');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
}
// dades curtes per escriure sota el QR d'emergència
function resumEmergencia() {
  const d = ed.dades, l = [];
  if (d.nom) l.push(d.nom);
  if (d.sang) l.push('🩸 ' + d.sang);
  const t = txtE();
  l.push(`⚠️ ${t.alerg}: ` + (d.alerg?.trim() || t.cap_al));
  const ice = [1, 2, 3].map(i => d['ice' + i + '_tlf'] && `${d['ice' + i + '_nom'] || ''} ${d['ice' + i + '_tlf']}`.trim()).filter(Boolean);
  if (ice.length) l.push('📞 ' + ice.slice(0, 2).join(' · '));
  return l;
}

async function fesTargeta(tipus) {
  if (!ed.qr) return;
  try { await document.fonts.load(fontT(40)); } catch (e) { /* sense Montserrat */ }
  const cv = document.createElement('canvas');
  const x = cv.getContext('2d');
  const o = op(), nom = nomActual(), emerg = esEmerg();
  const qr = document.createElement('canvas');

  if (tipus === 'fons') {
    const W = 1170, H = 2532; cv.width = W; cv.height = H;
    fonsBlauNit(x, W, H);
    // franja vermella sota el rellotge
    const y0 = 980;
    x.fillStyle = '#E5484D'; arrod(x, 90, y0 - 150, W - 180, 120, 30); x.fill();
    x.fillStyle = '#fff'; x.font = fontT(62); x.textAlign = 'center';
    x.fillText(emerg ? '🆘 ' + txtE().cap : nom, W / 2, y0 - 68);
    const q = 640, qx = (W - q) / 2, qy = y0 + 10;
    x.fillStyle = '#fff'; arrod(x, qx - 30, qy - 30, q + 60, q + 60, 40); x.fill();
    dibuixaQR(qr, ed.qr, o, q);
    x.drawImage(qr, qx, qy);
    x.fillStyle = '#F6EFE2'; x.font = fontX(44);
    let y = escriu(x, emerg ? txtE().cas : T('Escaneja el codi'), W / 2, qy + q + 110, W - 200, 56, 2);
    if (emerg) {
      x.font = fontX(46, 700);
      for (const l of resumEmergencia()) y = escriu(x, l, W / 2, y + 22, W - 180, 58, 2);
    }
    rotulMarca(x, W / 2, H - 170, 50);
  } else if (tipus === 'adhesiu') {
    const W = 1200, H = 1440; cv.width = W; cv.height = H;
    x.fillStyle = '#fff'; arrod(x, 0, 0, W, H, 60); x.fill();
    x.fillStyle = emerg ? '#E5484D' : '#0A0B0E'; arrod(x, 0, 0, W, 230, 60); x.fill(); x.fillRect(0, 150, W, 80);
    x.fillStyle = '#fff'; x.font = fontT(emerg ? 86 : 70); x.textAlign = 'center';
    escriu(x, emerg ? '🆘 ' + txtE().emerg : nom, W / 2, 148, W - 80, 80, 1);
    const q = 860;
    dibuixaQR(qr, ed.qr, o, q);
    x.drawImage(qr, (W - q) / 2, 270);
    x.fillStyle = '#0A0B0E'; x.font = fontX(52, 700);
    escriu(x, emerg ? txtE().scan : T("Escaneja'm"), W / 2, 1210, W - 100, 60, 1);
    x.fillStyle = '#555'; x.font = fontX(42);
    escriu(x, emerg ? (ed.dades.nom || '') : '', W / 2, 1290, W - 100, 50, 1);
    x.fillStyle = '#F2650F'; x.font = fontT(34);
    x.fillText('XORIGUER QR', W / 2, H - 40);
  } else {
    // targeta 85,6 × 54 mm a 300 ppp
    const W = 1011, H = 638; cv.width = W; cv.height = H;
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = emerg ? '#E5484D' : '#0A0B0E'; x.fillRect(0, 0, W, 16);
    const q = 470;
    dibuixaQR(qr, ed.qr, o, q);
    x.drawImage(qr, 40, (H - q) / 2 + 8);
    const tx = 540, tw = W - tx - 36;
    x.fillStyle = emerg ? '#E5484D' : '#0A0B0E'; x.font = fontT(46);
    let y = escriu(x, emerg ? '🆘 ' + txtE().emerg : nom, tx, 120, tw, 54, 2, 'left');
    x.fillStyle = '#333'; x.font = fontX(30);
    const linies = emerg ? resumEmergencia() : resumGeneric();
    for (const l of linies) y = escriu(x, l, tx, y + 18, tw, 38, 2, 'left');
    x.fillStyle = '#F2650F'; x.font = fontT(26); x.textAlign = 'left';
    x.fillText('XORIGUER QR', tx, H - 40);
  }
  previsualitza(cv, tipus, nom);
}
function resumGeneric() {
  const d = ed.dades, f = ed.fitxa;
  if (f === 'personal') return d.camps.filter(c => c.valor && !/contrasenya|clau|pin/i.test(c.label)).slice(0, 4).map(c => (c.label ? c.label + ': ' : '') + c.valor);
  if (f === 'clau') return [T('🔐 Protegit amb frase secreta'), T("Obre'l amb Xoriguer QR")];
  if (f === 'wifi') return [T('Escaneja per connectar-te'), d.ssid ? T('Xarxa') + ': ' + d.ssid : ''].filter(Boolean);
  if (f === 'contacte' || f === 'negoci') return [d.carrec, d.mobil || d.telefon, d.email, d.web].filter(Boolean).slice(0, 4);
  if (f === 'adreca') return [d.adreca].filter(Boolean);
  return op().xifra ? [T("🔐 Obre'l amb Xoriguer QR")] : [T('Escaneja el codi')];
}

function previsualitza(cv, tipus, nom) {
  const fitxer = `${nomFitxer(nom)}_${tipus}.png`;
  $('#modal-titol').textContent = TARGETES[tipus].nom;
  $('#modal-cos').replaceChildren(el('img', { src: cv.toDataURL('image/png'), alt: '' }), el('p', { class: 'ajuda', text: TARGETES[tipus].desc }));
  $('#modal-botons').replaceChildren(
    el('button', { class: 'b', text: T('⬇️ Desa la imatge'), onclick: async () => baixa(await aBlob(cv), fitxer) }),
    el('button', { class: 'b sec', text: T('📤 Comparteix'), onclick: async () => comparteix(await aBlob(cv), fitxer, nom) }),
    ANDROID ? null : el('button', { class: 'b sec', text: T('🖨️ Imprimeix'), onclick: () => imprimeix(cv) }),
    el('button', { class: 'b sec', text: T('Tanca'), onclick: tancaModal }));
  $('#modal').hidden = false;
}
function tancaModal() { $('#modal').hidden = true; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') tancaModal(); });

/** Petit formulari en finestra. `fes(valors)` pot retornar false perquè no es tanqui. */
function demana(titol, camps, fes) {
  $('#modal-titol').textContent = titol;
  const ins = camps.map(c => {
    const i = el('input', { type: c.tipus || 'text', value: c.val || '', 'aria-label': c.label, placeholder: c.label,
      autocomplete: c.tipus === 'password' ? 'current-password' : 'off' });
    return [c, i];
  });
  const ok = async () => {
    const v = Object.fromEntries(ins.map(([c, i]) => [c.id, i.value]));
    if ((await fes(v)) !== false) tancaModal();
  };
  ins.forEach(([, i]) => i.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); }));
  $('#modal-cos').replaceChildren(...ins.map(([c, i]) => el('div', { class: 'camp' }, el('label', { text: c.label }), i)));
  $('#modal-botons').replaceChildren(el('button', { class: 'b', text: T("D'acord"), onclick: ok }),
    el('button', { class: 'b sec', text: T('Cancel·la'), onclick: tancaModal }));
  $('#modal').hidden = false;
  setTimeout(() => ins[0]?.[1].focus(), 50);
}

function ubicacio() {
  if (!navigator.geolocation) return avis(T('Aquest aparell no dona la ubicació'));
  avis(T('Buscant la ubicació…'), 8000);
  navigator.geolocation.getCurrentPosition(p => {
    ed.dades.lat = p.coords.latitude.toFixed(6); ed.dades.lon = p.coords.longitude.toFixed(6);
    $('#c-lat').value = ed.dades.lat; $('#c-lon').value = ed.dades.lon;
    regenera(); avis(T('Ubicació posada'));
  }, () => avis(T("No s'ha pogut obtenir la ubicació")), { enableHighAccuracy: true, timeout: 15000 });
}

// ------------------------------------------------------------------ els meus
function titolDe(it) {
  const f = fitxaDe(it.fitxa);
  return f ? `${f.icona} ${f.nom}` : (it.titolFitxa || '');
}
function omplePersones(sel, val) {
  sel.replaceChildren(el('option', { value: '', text: '—' }), ...E.persones.map(p => el('option', { value: p, text: p, selected: p === val })));
}
function pintaMeus() {
  const f = $('#filtre-persona'), fv = f.value;
  f.replaceChildren(el('option', { value: '', text: T('Tota la família') }), ...E.persones.map(p => el('option', { value: p, text: p, selected: p === fv })));
  const q = $('#cerca').value.trim().toLowerCase();
  const l = E.items.filter(it => (!fv || it.persona === fv) && (!q || (it.nom + ' ' + titolDe(it)).toLowerCase().includes(q)));
  $('#meus-buit').hidden = E.items.length > 0;
  $('#llista-meus').replaceChildren(...l.map(it => {
    const cv = el('canvas', { width: 144, height: 144, title: T('Obre') });
    dibuixaQR(cv, it.qr, it.op, 144);
    cv.onclick = () => obreItem(it);
    return el('div', { class: 'item' }, cv,
      el('div', { class: 'txt', onclick: () => obreItem(it) },
        el('b', { text: it.nom }),
        el('small', {}, it.persona ? el('span', { class: 'etq', text: it.persona }) : null, it.dadesX && it.fitxa !== 'clau' ? '🔐 ' : '', titolDe(it))),
      el('div', { class: 'acc' },
        el('button', { title: T('Duplica'), text: '⧉', onclick: () => {
          const c = JSON.parse(JSON.stringify(it)); c.id = uid(); c.nom += ' ' + T('(còpia)'); c.creat = c.mod = new Date().toISOString();
          E.items.unshift(c); desa(); pintaMeus();
        } }),
        el('button', { title: T('Esborra'), text: '🗑', onclick: () => {
          if (confirm(T('Esborrar «{n}»?', { n: it.nom }))) { E.items = E.items.filter(x => x !== it); desa(); pintaMeus(); }
        } })));
  }));
}
$('#cerca').oninput = pintaMeus;
$('#filtre-persona').onchange = pintaMeus;

// ------------------------------------------------------------------ llegir
let flux = null, bucle = null;
const cvLect = document.createElement('canvas');
$('#obre-camera').onclick = async () => {
  if (!navigator.mediaDevices?.getUserMedia) return avis(T("Aquest aparell no deixa fer servir la càmera aquí. Prova «Des d'una imatge»."), 4000);
  try {
    flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
  } catch (e) { return avis(T("No s'ha pogut obrir la càmera (permís?)"), 4000); }
  const v = $('#video');
  v.srcObject = flux; await v.play();
  $('#camera').hidden = false; $('#resultat').hidden = true;
  const x = cvLect.getContext('2d', { willReadFrequently: true });
  const pas = () => {
    if (!flux) return;
    if (v.readyState >= 2) {
      const k = Math.min(1, 900 / Math.max(v.videoWidth, v.videoHeight));
      cvLect.width = v.videoWidth * k; cvLect.height = v.videoHeight * k;
      // un fotograma de cada dos, una mica desenfocat: ajuda amb els QR de punts rodons
      x.filter = (pas.n = (pas.n || 0) + 1) % 2 ? 'none' : 'blur(1px)';
      x.drawImage(v, 0, 0, cvLect.width, cvLect.height);
      const r = jsQR(x.getImageData(0, 0, cvLect.width, cvLect.height).data, cvLect.width, cvLect.height, { inversionAttempts: 'attemptBoth' });
      if (r && r.data) { navigator.vibrate?.(80); aturaCamera(); return interpreta(r.data); }
    }
    bucle = requestAnimationFrame(pas);
  };
  pas();
};
$('#tanca-camera').onclick = aturaCamera;
function aturaCamera() {
  cancelAnimationFrame(bucle);
  if (flux) flux.getTracks().forEach(t => t.stop());
  flux = null; $('#camera').hidden = true;
}
$('#llegeix-imatge').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  const img = await createImageBitmap(f);
  const t = D.llegeix(img, img.width, img.height, [Math.min(img.width, 1400), 900, 600, 400, 300, 220]);
  if (t) return interpreta(t);
  avis(T('No hi he trobat cap QR'), 3000);
};

function interpreta(t) {
  const R = $('#resultat');
  R.hidden = false;
  const acc = [];
  let tipus = T('Text'), mostra = t;
  const copia = el('button', { class: 'b sec', text: T('📋 Copia'), onclick: () => navigator.clipboard?.writeText(mostra).then(() => avis(T('Copiat'))) });
  if (C.esXifrat(t)) {
    tipus = T('🔐 Xifrat amb Xoriguer QR');
    mostra = T("Aquest QR està protegit. Posa la frase secreta per veure'l.");
    acc.push(el('button', { class: 'b', text: T('🔓 Obre amb la frase secreta'), onclick: () => demana(T('🔐 Frase secreta'), [{ id: 'f', label: T('Frase secreta'), tipus: 'password' }], async v => {
      try { interpreta(await C.desxifra(t, v.f)); R.querySelector('.tipus').textContent += ' ' + T('(desxifrat)'); }
      catch (e) { avis(T('Frase incorrecta')); return false; }
    }) }));
  } else if (/^https?:\/\//i.test(t)) {
    tipus = /google\.[a-z.]+\/maps/.test(t) ? T('📍 Ubicació') : /wa\.me/.test(t) ? '💬 WhatsApp' : T('🔗 Enllaç');
    acc.push(el('a', { class: 'b', href: t, target: '_blank', rel: 'noopener', text: T('Obre') }));
  } else if (/^tel:/i.test(t)) {
    tipus = T('📞 Telèfon'); acc.push(el('a', { class: 'b', href: t, text: T('Truca {n}', { n: t.slice(4) }) }));
  } else if (/^mailto:/i.test(t)) {
    tipus = T('📧 Correu'); acc.push(el('a', { class: 'b', href: t, text: T('Escriu') }));
  } else if (/^SMSTO:/i.test(t)) {
    const [, n, m] = t.match(/^SMSTO:([^:]*):?(.*)$/is) || [];
    tipus = '✉️ SMS'; mostra = `${n}\n${m}`; acc.push(el('a', { class: 'b', href: `sms:${n}?body=${encodeURIComponent(m || '')}`, text: T('Envia') }));
  } else if (/^WIFI:/i.test(t)) {
    const g = k => (t.match(new RegExp(`[:;]${k}:((?:\\\\.|[^;])*)`)) || [])[1]?.replace(/\\(.)/g, '$1') || '';
    tipus = '📶 WiFi'; mostra = `${T('Xarxa')}: ${g('S')}\n${T('Contrasenya')}: ${g('P') || T('(cap)')}\n${T('Seguretat')}: ${g('T')}`;
    acc.push(el('button', { class: 'b', text: T('📋 Copia la contrasenya'), onclick: () => navigator.clipboard?.writeText(g('P')).then(() => avis(T('Copiada'))) }));
  } else if (/^BEGIN:VCARD/i.test(t)) {
    tipus = T('👤 Contacte');
    mostra = t.split(/\r?\n/).filter(l => !/^(BEGIN|END|VERSION|N):/i.test(l))
      .map(l => l.replace(/^([A-Z]+)[^:]*:/i, (m, k) => ({ FN: '', ORG: T('Empresa') + ': ', TITLE: T('Càrrec') + ': ', TEL: T('Tel') + ': ', EMAIL: T('Correu') + ': ', URL: T('Web') + ': ', ADR: T('Adreça') + ': ', NOTE: T('Nota') + ': ' }[k.toUpperCase()] ?? k + ': '))
        .replace(/;+/g, ' ').replace(/\\([,;\\])/g, '$1').replace(/\\n/g, '\n').trim()).join('\n');
    acc.push(el('button', { class: 'b', text: T('💾 Desa el contacte (.vcf)'), onclick: () => baixa(new Blob([t], { type: 'text/vcard' }), 'contacte.vcf') }));
  } else if (/^BEGIN:VEVENT/i.test(t)) {
    tipus = T('📅 Esdeveniment');
    acc.push(el('button', { class: 'b', text: T('📅 Afegeix al calendari (.ics)'), onclick: () => baixa(new Blob([
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Xoriguer//QR//CA\n' + t + '\nEND:VCALENDAR'], { type: 'text/calendar' }), 'esdeveniment.ics') }));
  } else if (/^(🆘|🩺)/.test(t)) tipus = t.startsWith('🆘') ? T('🆘 Emergència') : T('🩺 Fitxa mèdica');
  R.replaceChildren(el('div', { class: 'tipus', text: tipus }), el('pre', { text: mostra }),
    el('div', { class: 'botons' }, acc, C.esXifrat(t) ? null : copia,
      el('button', { class: 'b sec', text: T('📷 Llegeix-ne un altre'), onclick: () => $('#obre-camera').click() })));
  R.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ------------------------------------------------------------------ més: família i còpies
function pintaMes() {
  $('#persones').replaceChildren(...E.persones.map(p => el('span', { class: 'xip' }, p,
    el('button', { title: T('Treu'), text: '✕', onclick: () => { E.persones = E.persones.filter(x => x !== p); desa(); pintaMes(); } }))));
  $('#ultima-copia').textContent = E.ultimaCopia ? T('Última còpia: {d}', { d: new Date(E.ultimaCopia).toLocaleDateString(LANG) }) : T('Encara no has desat cap còpia.');
}
$('#afegeix-persona').onclick = () => {
  const v = $('#nova-persona').value.trim();
  if (v && !E.persones.includes(v)) { E.persones.push(v); desa(); }
  $('#nova-persona').value = ''; pintaMes();
};
$('#nova-persona').addEventListener('keydown', e => { if (e.key === 'Enter') $('#afegeix-persona').click(); });
$('#exporta').onclick = () => {
  E.ultimaCopia = new Date().toISOString(); desa();
  const { ultimaCopia, ...dades } = E;
  baixa(new Blob([JSON.stringify({ app: 'xoriguer-qr', versio: 1, data: ultimaCopia, ...dades }, null, 1)], { type: 'application/json' }),
    `XoriguerQR_copia_${ultimaCopia.slice(0, 10)}.json`);
  pintaMes();
};
$('#importa').onchange = async e => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'xoriguer-qr') throw new Error();
    const ids = new Set(E.items.map(i => i.id));
    const nous = (d.items || []).filter(i => !ids.has(i.id));
    E.items.push(...nous);
    const fm = new Set(E.fitxesMeves.map(i => i.id));
    E.fitxesMeves.push(...(d.fitxesMeves || []).filter(i => !fm.has(i.id)));
    for (const p of d.persones || []) if (!E.persones.includes(p)) E.persones.push(p);
    desa(); pintaFitxes(); pintaMes();
    avis(T('Recuperats {n} QR nous', { n: nous.length }));
  } catch (err) { avis(T('Aquest fitxer no és una còpia de Xoriguer QR'), 3500); }
};

// ------------------------------------------------------------------ versió nova (només a l'exe i a l'apk:
// la web/iPhone s'actualitza sola). El mateix versio.json que fa servir la pàgina de descàrregues.
const URL_VERSIO = 'https://raw.githubusercontent.com/Xorigu3r/xoriguer-versions/main/qr/versio.json';
const PAGINA = 'https://xorigu3r.github.io/';
function comparaVersio(a, b) {
  const p = v => String(v).replace(/^v/i, '').split('.').map(x => parseInt(x, 10) || 0);
  const x = p(a), y = p(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) ? 1 : -1;
  return 0;
}
async function miraVersio(manual) {
  const estat = $('#estat-versio');
  if (manual) estat.textContent = T('Mirant…');
  let d;
  try {
    const r = await fetch(URL_VERSIO + '?t=' + Date.now(), { cache: 'no-store' });
    d = await r.json();
  } catch (e) {
    if (manual) estat.textContent = T("No s'ha pogut mirar (sense connexió?)");
    return;
  }
  const enllac = (ANDROID ? d.apk : d.url) || PAGINA;
  if (!d.versio || comparaVersio(d.versio, VERSIO) <= 0) {
    if (manual) estat.textContent = T('Ja tens la darrera versió ({v}).', { v: VERSIO });
    return;
  }
  estat.textContent = T('Hi ha la versió {v}.', { v: d.versio });
  if (!manual && E.versioAmagada === d.versio) return;
  const b = $('#versio-nova');
  b.replaceChildren(
    el('span', { style: 'font-size:26px' }, '🆕'),
    el('div', { class: 'txt' },
      el('b', { text: T('Hi ha una versió nova: {v}', { v: d.versio }) }),
      el('small', { text: (d.notes ? d.notes + ' · ' : '') + T('Tens la {v}. Les teves dades es mantenen.', { v: VERSIO }) })),
    el('a', { class: 'b', href: enllac, target: ESCRIPTORI ? '_blank' : null, rel: 'noopener',
      text: ANDROID ? T("⬇️ Baixa l'APK") : T("⬇️ Baixa l'instal·lador") }),
    el('button', { class: 'tanca', title: T('Ara no'), text: '✕',
      onclick: () => { b.hidden = true; E.versioAmagada = d.versio; desa(); } }));
  b.hidden = false;
  if (manual) { mostra('fitxes'); }
}
if (ANDROID || ESCRIPTORI) {
  $('#bloc-versio').hidden = false;
  $('#mira-versio').onclick = () => miraVersio(true);
  setTimeout(() => miraVersio(false), 1500);
}

// ------------------------------------------------------------------ inici
$('#versio').textContent = VERSIO;
pintaFitxes();
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#modal').hidden) tancaModal(); else if (!$('#editor').hidden) tancaEditor(); }
});
// funcionament sense connexió (només a la web publicada; l'app d'Android i la de Windows ja porten els fitxers)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !ANDROID && location.hostname !== 'localhost') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
