// XORIGUER QR · fitxes preestablertes
// Cada fitxa: camps del formulari + codifica(dades) -> text que va dins del QR.
'use strict';
(function () {

const esc_vc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const esc_wifi = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
const net = s => String(s || '').trim();
const nomesNum = s => net(s).replace(/[^\d+]/g, '');

function vcard(d) {
  const L = ['BEGIN:VCARD', 'VERSION:3.0'];
  const nom = net(d.nom), cog = net(d.cognoms);
  L.push(`N:${esc_vc(cog)};${esc_vc(nom)};;;`);
  L.push(`FN:${esc_vc([nom, cog].filter(Boolean).join(' ') || d.empresa || '')}`);
  if (net(d.empresa)) L.push(`ORG:${esc_vc(d.empresa)}`);
  if (net(d.carrec)) L.push(`TITLE:${esc_vc(d.carrec)}`);
  if (net(d.mobil)) L.push(`TEL;TYPE=CELL:${net(d.mobil)}`);
  if (net(d.telefon)) L.push(`TEL;TYPE=WORK,VOICE:${net(d.telefon)}`);
  if (net(d.email)) L.push(`EMAIL;TYPE=INTERNET:${net(d.email)}`);
  if (net(d.web)) L.push(`URL:${net(d.web)}`);
  if (net(d.carrer) || net(d.poblacio)) {
    L.push(`ADR;TYPE=WORK:;;${esc_vc(d.carrer)};${esc_vc(d.poblacio)};${esc_vc(d.provincia)};${esc_vc(d.cp)};${esc_vc(d.pais)}`);
  }
  if (net(d.nota)) L.push(`NOTE:${esc_vc(d.nota)}`);
  L.push('END:VCARD');
  return L.join('\n');
}

// Textos de les fitxes d'emergència en tres idiomes (per si l'accident és fora)
const TXT = {
  ca: { cap: 'EMERGÈNCIA · ICE', med: 'FITXA MÈDICA', nom: 'Nom', naix: 'Naixement', dni: 'DNI/NIE',
        sang: 'Grup sanguini', alerg: 'AL·LÈRGIES', medi: 'Medicació', malal: 'Malalties', ice: 'Truqueu a',
        metge: 'Metge', mutua: 'Mútua / targeta sanitària', notes: 'Notes', adreca: 'Adreça', don: 'Donant d\'òrgans',
        cap_al: 'Cap de coneguda', protesi: 'Implants / pròtesis' },
  es: { cap: 'EMERGENCIA · ICE', med: 'FICHA MÉDICA', nom: 'Nombre', naix: 'Nacimiento', dni: 'DNI/NIE',
        sang: 'Grupo sanguíneo', alerg: 'ALERGIAS', medi: 'Medicación', malal: 'Enfermedades', ice: 'Llamad a',
        metge: 'Médico', mutua: 'Mutua / tarjeta sanitaria', notes: 'Notas', adreca: 'Dirección', don: 'Donante de órganos',
        cap_al: 'Ninguna conocida', protesi: 'Implantes / prótesis' },
  en: { cap: 'EMERGENCY · ICE', med: 'MEDICAL RECORD', nom: 'Name', naix: 'Born', dni: 'ID',
        sang: 'Blood type', alerg: 'ALLERGIES', medi: 'Medication', malal: 'Conditions', ice: 'Call',
        metge: 'Doctor', mutua: 'Health insurance', notes: 'Notes', adreca: 'Address', don: 'Organ donor',
        cap_al: 'None known', protesi: 'Implants / prostheses' },
};

const IDIOMA = { k: 'idioma', label: 'Idioma del text', tipus: 'select', opcions: [['ca', 'Català'], ['es', 'Castellà'], ['en', 'Anglès']], val: 'ca' };
const SANG = { k: 'sang', label: 'Grup sanguini', tipus: 'select',
  opcions: [['', '—'], ...['0+', '0-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(x => [x, x])] };

function contactesICE(d, t) {
  const l = [];
  for (const i of [1, 2, 3]) {
    const n = net(d['ice' + i + '_nom']), tf = net(d['ice' + i + '_tlf']), r = net(d['ice' + i + '_rel']);
    if (n || tf) l.push(`${i}. ${n}${r ? ' (' + r + ')' : ''} ${tf}`.trim());
  }
  return l.length ? [`${t.ice}:`, ...l] : [];
}
const campsICE = [1, 2, 3].flatMap(i => [
  { k: `ice${i}_nom`, label: `Contacte ${i} · nom`, grup: 'Contactes en cas d\'accident', mig: true },
  { k: `ice${i}_rel`, label: 'Relació', placeholder: 'fill, esposa…', mig: true, curt: true },
  { k: `ice${i}_tlf`, label: 'Telèfon', tipus: 'tel', mig: true },
]);

const linia = (et, v) => (net(v) ? `${et}: ${net(v)}` : null);

const FITXES = [
  {
    id: 'emergencia', nom: 'Emergència', icona: '🆘', color: '#E5484D',
    desc: 'Contactes en cas d\'accident i dades mèdiques bàsiques. Es llegeix amb qualsevol mòbil, sense internet.',
    camps: [
      IDIOMA,
      { k: 'nom', label: 'Nom i cognoms', grup: 'Persona' },
      { k: 'naix', label: 'Data de naixement', tipus: 'date', mig: true },
      SANG,
      { k: 'alerg', label: 'Al·lèrgies', tipus: 'textarea', placeholder: 'Penicil·lina, fruits secs…  (buit = cap de coneguda)', grup: 'Salut' },
      { k: 'medi', label: 'Medicació habitual', tipus: 'textarea' },
      { k: 'malal', label: 'Malalties / condicions', tipus: 'textarea', placeholder: 'Diabetis, marcapassos…' },
      ...campsICE,
      { k: 'notes', label: 'Altres notes', tipus: 'textarea', grup: 'Altres' },
    ],
    codifica(d) {
      const t = TXT[d.idioma] || TXT.ca;
      return [
        `🆘 ${t.cap}`,
        linia(t.nom, d.nom), linia(t.naix, dataLocal(d.naix)), linia(t.sang, d.sang),
        `${t.alerg}: ${net(d.alerg) || t.cap_al}`,
        linia(t.medi, d.medi), linia(t.malal, d.malal),
        ...contactesICE(d, t),
        linia(t.notes, d.notes),
      ].filter(Boolean).join('\n');
    },
    titol: d => d.nom ? `Emergència · ${d.nom}` : 'Emergència',
    targetes: ['fons', 'adhesiu', 'targeta'],
  },
  {
    id: 'medica', nom: 'Fitxa mèdica', icona: '🩺', color: '#E5484D',
    desc: 'Més completa: al·lèrgies, medicació, implants, metge i mútua.',
    camps: [
      IDIOMA,
      { k: 'nom', label: 'Nom i cognoms', grup: 'Persona' },
      { k: 'naix', label: 'Data de naixement', tipus: 'date', mig: true },
      { k: 'dni', label: 'DNI / NIE', mig: true },
      SANG,
      { k: 'don', label: 'Donant d\'òrgans', tipus: 'select', opcions: [['', '—'], ['Sí', 'Sí'], ['No', 'No']], mig: true },
      { k: 'alerg', label: 'Al·lèrgies', tipus: 'textarea', grup: 'Salut' },
      { k: 'medi', label: 'Medicació (nom i dosi)', tipus: 'textarea' },
      { k: 'malal', label: 'Malalties / condicions', tipus: 'textarea' },
      { k: 'protesi', label: 'Implants / pròtesis', placeholder: 'Marcapassos, pròtesi de maluc…' },
      { k: 'metge', label: 'Metge de capçalera (nom i tlf)', grup: 'Atenció' },
      { k: 'mutua', label: 'Mútua / núm. targeta sanitària' },
      { k: 'ice1_nom', label: 'Contacte d\'emergència', mig: true },
      { k: 'ice1_tlf', label: 'Telèfon', tipus: 'tel', mig: true },
      { k: 'notes', label: 'Notes', tipus: 'textarea' },
    ],
    codifica(d) {
      const t = TXT[d.idioma] || TXT.ca;
      return [
        `🩺 ${t.med}`,
        linia(t.nom, d.nom), linia(t.naix, dataLocal(d.naix)), linia(t.dni, d.dni), linia(t.sang, d.sang),
        linia(t.don, d.don),
        `${t.alerg}: ${net(d.alerg) || t.cap_al}`,
        linia(t.medi, d.medi), linia(t.malal, d.malal), linia(t.protesi, d.protesi),
        linia(t.metge, d.metge), linia(t.mutua, d.mutua),
        (net(d.ice1_nom) || net(d.ice1_tlf)) ? `${t.ice}: ${net(d.ice1_nom)} ${net(d.ice1_tlf)}`.trim() : null,
        linia(t.notes, d.notes),
      ].filter(Boolean).join('\n');
    },
    titol: d => d.nom ? `Fitxa mèdica · ${d.nom}` : 'Fitxa mèdica',
    targetes: ['fons', 'adhesiu', 'targeta'],
  },
  {
    id: 'contacte', nom: 'Contacte personal', icona: '👤', color: '#FFA82E',
    desc: 'Targeta de visita: en escanejar-la, el contacte es desa al mòbil.',
    camps: [
      { k: 'nom', label: 'Nom', mig: true }, { k: 'cognoms', label: 'Cognoms', mig: true },
      { k: 'mobil', label: 'Mòbil', tipus: 'tel', mig: true }, { k: 'email', label: 'Correu', tipus: 'email', mig: true },
      { k: 'carrer', label: 'Adreça (carrer i número)', grup: 'Adreça' },
      { k: 'cp', label: 'CP', mig: true, curt: true }, { k: 'poblacio', label: 'Població', mig: true },
      { k: 'provincia', label: 'Província', mig: true }, { k: 'pais', label: 'País', mig: true, val: 'Espanya' },
      { k: 'web', label: 'Web o xarxa social', tipus: 'url', grup: 'Altres' },
      { k: 'nota', label: 'Nota', tipus: 'textarea' },
    ],
    codifica: vcard,
    titol: d => [d.nom, d.cognoms].filter(Boolean).join(' ') || 'Contacte',
    targetes: ['targeta'],
  },
  {
    id: 'negoci', nom: 'Negoci', icona: '🏢', color: '#FFA82E',
    desc: 'Empresa, adreça, telèfon i web en una sola targeta.',
    camps: [
      { k: 'empresa', label: 'Nom del negoci' },
      { k: 'nom', label: 'Persona de contacte', mig: true }, { k: 'carrec', label: 'Càrrec', mig: true },
      { k: 'telefon', label: 'Telèfon', tipus: 'tel', mig: true }, { k: 'mobil', label: 'Mòbil', tipus: 'tel', mig: true },
      { k: 'email', label: 'Correu', tipus: 'email', mig: true }, { k: 'web', label: 'Web', tipus: 'url', mig: true },
      { k: 'carrer', label: 'Adreça (carrer i número)', grup: 'Adreça' },
      { k: 'cp', label: 'CP', mig: true, curt: true }, { k: 'poblacio', label: 'Població', mig: true },
      { k: 'provincia', label: 'Província', mig: true }, { k: 'pais', label: 'País', mig: true, val: 'Espanya' },
      { k: 'nota', label: 'Horari / nota', tipus: 'textarea', placeholder: 'Dl-Dv 9-14 i 16-20' },
    ],
    codifica: d => vcard({ ...d, cognoms: '' }),
    titol: d => d.empresa || 'Negoci',
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'adreca', nom: 'Adreça / ubicació', icona: '📍', color: '#FFA82E',
    desc: 'Obre el mapa directament al lloc (casa, negoci, aparcament…).',
    camps: [
      { k: 'etiqueta', label: 'Nom del lloc', placeholder: 'Casa, Taller, Mas…' },
      { k: 'adreca', label: 'Adreça', placeholder: 'Carrer Major 1, 08001 Barcelona', tipus: 'textarea' },
      { k: 'lat', label: 'o bé latitud', mig: true, placeholder: '41.3874', grup: 'Coordenades (opcional, més precís)' },
      { k: 'lon', label: 'longitud', mig: true, placeholder: '2.1686' },
    ],
    codifica(d) {
      const lat = net(d.lat).replace(',', '.'), lon = net(d.lon).replace(',', '.');
      const q = (lat && lon) ? `${lat},${lon}` : net(d.adreca);
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    },
    titol: d => d.etiqueta || d.adreca || 'Adreça',
    boto: { text: '📍 La meva ubicació ara', fes: 'ubicacio' },
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'wifi', nom: 'WiFi', icona: '📶', color: '#3B82F6',
    desc: 'Els convidats es connecten escanejant, sense escriure la clau.',
    camps: [
      { k: 'ssid', label: 'Nom de la xarxa (SSID)' },
      { k: 'pass', label: 'Contrasenya', tipus: 'password' },
      { k: 'seg', label: 'Seguretat', tipus: 'select', opcions: [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'Sense contrasenya']], val: 'WPA', mig: true },
      { k: 'oculta', label: 'Xarxa oculta', tipus: 'select', opcions: [['false', 'No'], ['true', 'Sí']], val: 'false', mig: true },
    ],
    codifica: d => `WIFI:T:${d.seg || 'WPA'};S:${esc_wifi(d.ssid)};${d.seg === 'nopass' ? '' : 'P:' + esc_wifi(d.pass) + ';'}H:${d.oculta || 'false'};;`,
    titol: d => d.ssid ? `WiFi · ${d.ssid}` : 'WiFi',
    targetes: ['adhesiu', 'targeta'],
  },
  {
    id: 'clau', nom: 'Contrasenya / codi', icona: '🔐', color: '#8B5CF6',
    desc: 'Contrasenyes, PIN, codis d\'alarma… SEMPRE xifrats: només els obre Xoriguer QR amb la frase secreta.',
    forcaXifrat: true,
    camps: [
      { k: 'servei', label: 'De què és', placeholder: 'Alarma de casa, router, caixa forta…' },
      { k: 'usuari', label: 'Usuari (opcional)' },
      { k: 'clau', label: 'Contrasenya o codi', tipus: 'password' },
      { k: 'notes', label: 'Notes', tipus: 'textarea' },
    ],
    codifica: d => [linia('Servei', d.servei), linia('Usuari', d.usuari), linia('Contrasenya', d.clau), linia('Notes', d.notes)].filter(Boolean).join('\n'),
    titol: d => d.servei ? `🔐 ${d.servei}` : 'Contrasenya',
    targetes: ['targeta'],
  },
  {
    id: 'web', nom: 'Enllaç web', icona: '🔗', color: '#22A06B',
    desc: 'Una pàgina, un vídeo, un formulari, una xarxa social…',
    camps: [{ k: 'url', label: 'Adreça web', tipus: 'url', placeholder: 'https://…' }],
    codifica: d => { const u = net(d.url); return u && !/^[a-z]+:/i.test(u) ? 'https://' + u : u; },
    titol: d => net(d.url).replace(/^https?:\/\//, '') || 'Enllaç',
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'telefon', nom: 'Trucada', icona: '📞', color: '#22A06B',
    desc: 'En escanejar-lo, el mòbil marca el número.',
    camps: [{ k: 'etiqueta', label: 'Nom', placeholder: 'Avi Joan' }, { k: 'tlf', label: 'Telèfon', tipus: 'tel' }],
    codifica: d => 'tel:' + nomesNum(d.tlf),
    titol: d => d.etiqueta || d.tlf || 'Trucada',
    targetes: ['adhesiu', 'targeta'],
  },
  {
    id: 'whatsapp', nom: 'WhatsApp', icona: '💬', color: '#22A06B',
    desc: 'Obre un xat amb el missatge ja escrit.',
    camps: [
      { k: 'tlf', label: 'Telèfon amb prefix', tipus: 'tel', placeholder: '+34 600 000 000' },
      { k: 'msg', label: 'Missatge', tipus: 'textarea' },
    ],
    codifica(d) {
      let n = nomesNum(d.tlf).replace(/^\+/, '');
      if (n.length === 9) n = '34' + n;
      return `https://wa.me/${n}` + (net(d.msg) ? '?text=' + encodeURIComponent(d.msg) : '');
    },
    titol: d => d.tlf ? `WhatsApp · ${d.tlf}` : 'WhatsApp',
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'sms', nom: 'SMS', icona: '✉️', color: '#22A06B',
    desc: 'Prepara un SMS amb el text.',
    camps: [{ k: 'tlf', label: 'Telèfon', tipus: 'tel' }, { k: 'msg', label: 'Missatge', tipus: 'textarea' }],
    codifica: d => `SMSTO:${nomesNum(d.tlf)}:${net(d.msg)}`,
    titol: d => d.tlf ? `SMS · ${d.tlf}` : 'SMS',
    targetes: ['targeta'],
  },
  {
    id: 'correu', nom: 'Correu', icona: '📧', color: '#22A06B',
    desc: 'Obre un correu nou amb l\'adreça, l\'assumpte i el text.',
    camps: [
      { k: 'a', label: 'Per a', tipus: 'email' }, { k: 'assumpte', label: 'Assumpte' },
      { k: 'cos', label: 'Text', tipus: 'textarea' },
    ],
    codifica(d) {
      const p = [];
      if (net(d.assumpte)) p.push('subject=' + encodeURIComponent(d.assumpte));
      if (net(d.cos)) p.push('body=' + encodeURIComponent(d.cos));
      return 'mailto:' + net(d.a) + (p.length ? '?' + p.join('&') : '');
    },
    titol: d => d.a || 'Correu',
    targetes: ['targeta'],
  },
  {
    id: 'esdeveniment', nom: 'Esdeveniment', icona: '📅', color: '#22A06B',
    desc: 'Casament, aniversari, sopar… s\'afegeix al calendari.',
    camps: [
      { k: 'titol', label: 'Títol' },
      { k: 'inici', label: 'Comença', tipus: 'datetime-local', mig: true },
      { k: 'fi', label: 'Acaba', tipus: 'datetime-local', mig: true },
      { k: 'lloc', label: 'Lloc' }, { k: 'desc', label: 'Descripció', tipus: 'textarea' },
    ],
    codifica(d) {
      const f = s => net(s).replace(/[-:]/g, '').slice(0, 13) + '00';
      return ['BEGIN:VEVENT', `SUMMARY:${esc_vc(d.titol)}`,
        net(d.inici) && `DTSTART:${f(d.inici)}`, net(d.fi) && `DTEND:${f(d.fi)}`,
        net(d.lloc) && `LOCATION:${esc_vc(d.lloc)}`, net(d.desc) && `DESCRIPTION:${esc_vc(d.desc)}`,
        'END:VEVENT'].filter(Boolean).join('\n');
    },
    titol: d => d.titol || 'Esdeveniment',
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'text', nom: 'Text lliure', icona: '📝', color: '#94A3B8',
    desc: 'Qualsevol text: una nota, unes instruccions, un missatge.',
    camps: [{ k: 'titol', label: 'Títol (no va dins el QR)' }, { k: 'text', label: 'Text', tipus: 'textarea', alt: 8 }],
    codifica: d => net(d.text),
    titol: d => d.titol || net(d.text).slice(0, 30) || 'Text',
    targetes: ['targeta', 'adhesiu'],
  },
];

function dataLocal(iso) {
  if (!net(iso)) return '';
  const [a, m, d] = iso.split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso;
}

// ---- personalitzat: camps lliures que crea l'usuari ----
function codificaPersonal(d) {
  const camps = (d.camps || []).filter(c => net(c.label) || net(c.valor));
  if (d.format === 'json') {
    const o = {};
    for (const c of camps) o[net(c.label) || 'camp'] = net(c.valor);
    return JSON.stringify(net(d.capcalera) ? { [net(d.capcalera)]: o } : o);
  }
  return [net(d.capcalera), ...camps.map(c => (net(c.label) ? `${net(c.label)}: ` : '') + net(c.valor))]
    .filter(Boolean).join('\n');
}

window.XQR_FITXES = { FITXES, codificaPersonal, dataLocal };
})();
