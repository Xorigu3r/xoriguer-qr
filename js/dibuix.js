// XORIGUER QR · motor de dibuix dels codis
// Fa servir els mateixos camins (format SVG) per pintar al canvas (Path2D) i per exportar a SVG.
'use strict';
(function () {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  const PER_DEFECTE = {
    color: '#0A0B0E', color2: '', fons: '#FFFFFF', ulls: '', // ulls: color dels ulls ('' = el mateix)
    punts: 'quadrat', formaUlls: 'quadrat', marge: 4, nivell: 'auto',
    logo: '', logoMida: 22, logoPlaca: 'quadrat', // logoPlaca: cap | quadrat | rodo
    marc: 'cap', marcText: "ESCANEJA'M", marcColor: '',
  };
  const opc = o => ({ ...PER_DEFECTE, ...(o || {}) });

  /** Matriu del QR. Amb logo cal correcció alta (H = fins a un 30% tapat). */
  function model(text, o) {
    const nivells = o.nivell && o.nivell !== 'auto' ? [o.nivell, 'M', 'L'] : (o.logoImg ? ['H', 'Q', 'M'] : ['M', 'L']);
    for (const n of nivells) {
      try {
        const q = qrcode(0, n);
        q.addData(text, 'Byte');
        q.make();
        return { q, n: q.getModuleCount(), nivell: n, versio: (q.getModuleCount() - 17) / 4 };
      } catch (e) { /* no hi cap: prova un nivell més baix */ }
    }
    return null;
  }

  // ---- camins SVG ----
  const f = v => +v.toFixed(2);
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    if (!r) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
    return `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}` +
      `h${f(2 * r - w)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}v${f(2 * r - h)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}Z`;
  }
  const cercle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

  /** Calcula totes les formes. Retorna {mida, alt, cel, punts, ullsFora, ullsDins, logo, marc} en px. */
  function formes(m, o, mida, ambMarc) {
    const n = m.n, marge = +o.marge;
    const cel = mida / (n + marge * 2);
    const ox = marge * cel;
    const ulls = [[0, 0], [0, n - 7], [n - 7, 0]];
    const esUll = (r, c) => ulls.some(([r0, c0]) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7);

    // zona del logo (en mòduls), centrada; s'hi treuen els punts perquè quedi net
    let logo = null;
    if (o.logoImg) {
      const iw = o.logoImg.naturalWidth || o.logoImg.width, ih = o.logoImg.naturalHeight || o.logoImg.height;
      const costat = Math.max(3, n * o.logoMida / 100);
      const k = costat / Math.max(iw, ih);
      let w = iw * k, h = ih * k;
      const pad = o.logoPlaca === 'cap' ? 0.4 : 0.9;
      let W = w + pad * 2, H = h + pad * 2;
      if (o.logoPlaca === 'rodo') { W = H = Math.hypot(w, h) + pad; }
      const r0 = (n - H) / 2, c0 = (n - W) / 2;
      logo = { c0, r0, W, H, w, h };
    }
    const tapat = (r, c) => logo && c + 1 > logo.c0 && c < logo.c0 + logo.W && r + 1 > logo.r0 && r < logo.r0 + logo.H &&
      (o.logoPlaca !== 'rodo' || Math.hypot(c + 0.5 - n / 2, r + 0.5 - n / 2) < logo.W / 2 + 0.5);

    let punts = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!m.q.isDark(r, c) || esUll(r, c) || tapat(r, c)) continue;
        const x = ox + c * cel, y = ox + r * cel;
        if (o.punts === 'punts') punts += cercle(x + cel / 2, y + cel / 2, cel * 0.46);
        else if (o.punts === 'arrodonit') punts += rr(x + cel * 0.06, y + cel * 0.06, cel * 0.88, cel * 0.88, cel * 0.32);
        else if (o.punts === 'barres') {
          // uneix verticalment els mòduls seguits
          if (r > 0 && m.q.isDark(r - 1, c) && !esUll(r - 1, c) && !tapat(r - 1, c)) continue;
          let k = 1;
          while (r + k < n && m.q.isDark(r + k, c) && !esUll(r + k, c) && !tapat(r + k, c)) k++;
          punts += rr(x + cel * 0.1, y + cel * 0.05, cel * 0.8, k * cel - cel * 0.1, cel * 0.4);
        } else punts += rr(x - 0.05, y - 0.05, cel + 0.1, cel + 0.1, 0);
      }
    }
    let ullsFora = '', ullsDins = '';
    for (const [r0, c0] of ulls) {
      const x = ox + c0 * cel, y = ox + r0 * cel, s = 7 * cel;
      if (o.formaUlls === 'rodo') {
        ullsFora += cercle(x + s / 2, y + s / 2, 3.5 * cel) + cercle(x + s / 2, y + s / 2, 2.5 * cel);
        ullsDins += cercle(x + s / 2, y + s / 2, 1.5 * cel);
      } else {
        const ro = o.formaUlls === 'arrodonit' ? cel * 2.2 : o.formaUlls === 'fulla' ? cel * 3 : 0;
        const ri = o.formaUlls === 'arrodonit' ? cel * 1.4 : o.formaUlls === 'fulla' ? cel * 2 : 0;
        const rd = o.formaUlls === 'arrodonit' ? cel * 0.9 : o.formaUlls === 'fulla' ? cel * 1.2 : 0;
        if (o.formaUlls === 'fulla') {
          // dues cantonades arrodonides i dues de rectes, orientades cap a fora
          ullsFora += fulla(x, y, s, ro, r0, c0, n) + fulla(x + cel, y + cel, s - 2 * cel, ri, r0, c0, n);
          ullsDins += fulla(x + 2 * cel, y + 2 * cel, 3 * cel, rd, r0, c0, n);
        } else {
          ullsFora += rr(x, y, s, s, ro) + rr(x + cel, y + cel, s - 2 * cel, s - 2 * cel, ri);
          ullsDins += rr(x + 2 * cel, y + 2 * cel, 3 * cel, 3 * cel, rd);
        }
      }
    }
    let logoPx = null;
    if (logo) {
      logoPx = { x: ox + logo.c0 * cel, y: ox + logo.r0 * cel, W: logo.W * cel, H: logo.H * cel, w: logo.w * cel, h: logo.h * cel };
    }
    // marc amb text a sota
    let alt = mida, marc = null;
    if (ambMarc && o.marc === 'text' && String(o.marcText).trim()) {
      const bh = mida * 0.17;
      marc = { y: mida, h: bh };
      alt = mida + bh;
    }
    return { mida, alt, cel, punts, ullsFora, ullsDins, logo: logoPx, marc };
  }
  // quadrat amb les cantonades arrodonides menys la de cap al centre del QR
  function fulla(x, y, s, r, r0, c0, n) {
    const dalt = r0 === 0, esq = c0 === 0;
    // cantonada recta: la que mira cap al centre
    const rect = dalt && esq ? 'br' : dalt ? 'bl' : 'tr';
    const R = k => (k === rect ? 0 : r);
    const [tl, tr, br, bl] = ['tl', 'tr', 'br', 'bl'].map(R);
    return `M${f(x + tl)} ${f(y)}H${f(x + s - tr)}` + (tr ? `A${f(tr)} ${f(tr)} 0 0 1 ${f(x + s)} ${f(y + tr)}` : '') +
      `V${f(y + s - br)}` + (br ? `A${f(br)} ${f(br)} 0 0 1 ${f(x + s - br)} ${f(y + s)}` : '') +
      `H${f(x + bl)}` + (bl ? `A${f(bl)} ${f(bl)} 0 0 1 ${f(x)} ${f(y + s - bl)}` : '') +
      `V${f(y + tl)}` + (tl ? `A${f(tl)} ${f(tl)} 0 0 1 ${f(x + tl)} ${f(y)}` : '') + 'Z';
  }

  const colorMarc = o => o.marcColor || o.color;
  function textMarc(o) { return String(o.marcText || '').trim().slice(0, 28); }
  function contrastText(hex) {
    const [r, g, b] = rgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0A0B0E' : '#FFFFFF';
  }

  /** Pinta el QR a un canvas. Retorna info o null si el text no hi cap. */
  function dibuixa(cv, text, op, mida, ambMarc = false) {
    const o = opc(op);
    const m = model(text, o);
    if (!m) { cv.width = cv.height = mida; const x = cv.getContext('2d'); x.fillStyle = o.fons; x.fillRect(0, 0, mida, mida); return null; }
    const F = formes(m, o, mida, ambMarc);
    cv.width = mida; cv.height = Math.round(F.alt);
    const x = cv.getContext('2d');
    x.fillStyle = o.fons; x.fillRect(0, 0, mida, F.alt);
    const pinta = (d, color, regla) => {
      if (!d) return;
      if (o.color2 && color === o.color) {
        const g = x.createLinearGradient(0, 0, mida, mida);
        g.addColorStop(0, o.color); g.addColorStop(1, o.color2);
        x.fillStyle = g;
      } else x.fillStyle = color;
      x.fill(new Path2D(d), regla);
    };
    pinta(F.punts, o.color, 'nonzero');
    pinta(F.ullsFora, o.ulls || o.color, 'evenodd');
    pinta(F.ullsDins, o.ulls || o.color, 'nonzero');
    if (F.logo) {
      const L = F.logo;
      if (o.logoPlaca !== 'cap') {
        x.fillStyle = o.logoFons || o.fons;
        x.fill(new Path2D(o.logoPlaca === 'rodo' ? cercle(L.x + L.W / 2, L.y + L.H / 2, L.W / 2) : rr(L.x, L.y, L.W, L.H, F.cel * 1.2)));
      }
      x.drawImage(o.logoImg, L.x + (L.W - L.w) / 2, L.y + (L.H - L.h) / 2, L.w, L.h);
    }
    if (F.marc) {
      const M = F.marc, c = colorMarc(o);
      x.fillStyle = c;
      x.fill(new Path2D(rr(F.cel * 2, M.y - F.cel * 0.5, mida - F.cel * 4, M.h - F.cel * 1.5, M.h * 0.22)));
      x.fillStyle = contrastText(c);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      let px = M.h * 0.42;
      x.font = `800 ${px}px Montserrat, "Segoe UI", sans-serif`;
      while (x.measureText(textMarc(o)).width > mida - F.cel * 8 && px > 8) { px -= 2; x.font = `800 ${px}px Montserrat, "Segoe UI", sans-serif`; }
      x.fillText(textMarc(o), mida / 2, M.y + (M.h - F.cel * 2) / 2);
    }
    return { versio: m.versio, n: m.n, nivell: m.nivell, logo: !!F.logo };
  }

  /** El mateix QR en SVG (vectorial: es pot ampliar sense perdre qualitat). */
  function svg(text, op, mida = 1000, ambMarc = true) {
    const o = opc(op);
    const m = model(text, o);
    if (!m) return null;
    const F = formes(m, o, mida, ambMarc);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    let defs = '', fg = o.color;
    if (o.color2) {
      defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="${mida}" y2="${mida}" gradientUnits="userSpaceOnUse">` +
        `<stop offset="0" stop-color="${o.color}"/><stop offset="1" stop-color="${o.color2}"/></linearGradient></defs>`;
      fg = 'url(#g)';
    }
    const ull = o.ulls || fg;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mida} ${f(F.alt)}" width="${mida}" height="${f(F.alt)}">${defs}` +
      `<rect width="100%" height="100%" fill="${o.fons}"/>` +
      `<path d="${F.punts}" fill="${fg}"/><path d="${F.ullsFora}" fill="${ull}" fill-rule="evenodd"/><path d="${F.ullsDins}" fill="${ull}"/>`;
    if (F.logo) {
      const L = F.logo;
      if (o.logoPlaca !== 'cap') {
        s += `<path d="${o.logoPlaca === 'rodo' ? cercle(L.x + L.W / 2, L.y + L.H / 2, L.W / 2) : rr(L.x, L.y, L.W, L.H, F.cel * 1.2)}" fill="${o.logoFons || o.fons}"/>`;
      }
      s += `<image href="${esc(o.logoSrc || o.logoImg.src)}" x="${f(L.x + (L.W - L.w) / 2)}" y="${f(L.y + (L.H - L.h) / 2)}" width="${f(L.w)}" height="${f(L.h)}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    if (F.marc) {
      const M = F.marc, c = colorMarc(o);
      s += `<path d="${rr(F.cel * 2, M.y - F.cel * 0.5, mida - F.cel * 4, M.h - F.cel * 1.5, M.h * 0.22)}" fill="${c}"/>` +
        `<text x="${mida / 2}" y="${f(M.y + (M.h - F.cel * 2) / 2)}" fill="${contrastText(c)}" font-family="Montserrat, Segoe UI, sans-serif" font-weight="800" ` +
        `font-size="${f(M.h * 0.42)}" text-anchor="middle" dominant-baseline="central" textLength="${f(Math.min(mida - F.cel * 8, textMarc(o).length * M.h * 0.3))}" lengthAdjust="spacingAndGlyphs">${esc(textMarc(o))}</text>`;
    }
    return s + '</svg>';
  }

  // ---- comprovacions ----
  function rgb(hex) {
    const h = String(hex || '#000').replace('#', '');
    const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
    return [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16));
  }
  function lum(hex) {
    const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  /** Avisos de colors: poc contrast o colors invertits (clar sobre fosc). */
  function avisColors(op) {
    const o = opc(op);
    const fons = lum(o.fons);
    const ratio = c => { const l = lum(c); return (Math.max(l, fons) + 0.05) / (Math.min(l, fons) + 0.05); };
    const codi = Math.min(...[o.color, o.color2].filter(Boolean).map(ratio));
    const ulls = o.ulls ? ratio(o.ulls) : 99;
    if ([o.color, o.color2].filter(Boolean).some(c => lum(c) > fons)) return 'Colors invertits (clar sobre fosc): molts lectors no el llegeixen.';
    if (codi < 3.5 || ulls < 2.5) return 'Poc contrast entre el codi i el fons: pot costar de llegir.';
    return '';
  }
  /** Llegeix un QR d'una imatge com fan els mòbils: prova diverses mides i un lleuger desenfocament
   *  (els punts rodons o separats es llegeixen millor una mica borrosos). */
  function llegeix(font, fw, fh, mides = [300, 220, 160, 480, 800]) {
    if (!window.jsQR) return null;
    for (const w of mides) {
      if (w > fw * 1.5) continue;
      const h = Math.round(fh * w / fw);
      for (const b of [0, 1, 2]) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
        if (b) x.filter = `blur(${(b * w / 300).toFixed(2)}px)`;
        x.drawImage(font, 0, 0, w, h);
        const r = jsQR(x.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
        if (r && r.data) return r.data;
      }
    }
    return null;
  }
  /** Prova de lectura abans de baixar: el redueix com una foto petita i el llegeix. */
  function provaLectura(cv, text) {
    if (!window.jsQR) return null;
    return llegeix(cv, cv.width, cv.height, [300, 220]) === text;
  }

  window.XQR_DIBUIX = { PER_DEFECTE, opc, model, dibuixa, svg, avisColors, provaLectura, llegeix };
})();
