// XORIGUER QR · xifrat de QR amb frase secreta (AES-GCM 256, clau derivada amb PBKDF2-SHA256)
// Format dins el QR:  XQR1:<base64url( sal[16] | iv[12] | dades xifrades )>
'use strict';
(function () {
  const PREFIX = 'XQR1:';
  const ITER = 250000;
  const te = new TextEncoder(), td = new TextDecoder();

  const b64u = b => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const deb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  async function clau(frase, sal) {
    const base = await crypto.subtle.importKey('raw', te.encode(frase.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: ITER, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function xifra(text, frase) {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await clau(frase, sal), te.encode(text)));
    const tot = new Uint8Array(28 + c.length);
    tot.set(sal, 0); tot.set(iv, 16); tot.set(c, 28);
    return PREFIX + b64u(tot);
  }

  async function desxifra(qr, frase) {
    const b = deb64u(qr.slice(PREFIX.length).trim());
    const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(16, 28) }, await clau(frase, b.slice(0, 16)), b.slice(28));
    return td.decode(p);
  }

  window.XQR_CRIPTO = { xifra, desxifra, esXifrat: s => typeof s === 'string' && s.startsWith(PREFIX), disponible: !!(window.crypto && crypto.subtle) };
})();
