// XORIGUER QR · fitxes preestablertes
// Cada fitxa: camps del formulari + codifica(dades) -> text que va dins del QR.
'use strict';
(function () {
const T = window.T;

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

// Textos de les fitxes d'emergència en quatre idiomes (per si l'accident és fora)
const TXT = {
  ca: { cap: 'EMERGÈNCIA · ICE', med: 'FITXA MÈDICA', nom: 'Nom', naix: 'Naixement', dni: 'DNI/NIE',
        sang: 'Grup sanguini', alerg: 'AL·LÈRGIES', medi: 'Medicació', malal: 'Malalties', ice: 'Truqueu a',
        metge: 'Metge', mutua: 'Mútua / targeta sanitària', notes: 'Notes', adreca: 'Adreça', don: 'Donant d\'òrgans',
        cap_al: 'Cap de coneguda', protesi: 'Implants / pròtesis', si: 'Sí', no: 'No',
        emerg: 'EMERGÈNCIA', cas: 'En cas d\'accident, escanegeu aquest codi', scan: 'Escanegeu-me · Scan me' },
  es: { cap: 'EMERGENCIA · ICE', med: 'FICHA MÉDICA', nom: 'Nombre', naix: 'Nacimiento', dni: 'DNI/NIE',
        sang: 'Grupo sanguíneo', alerg: 'ALERGIAS', medi: 'Medicación', malal: 'Enfermedades', ice: 'Llamad a',
        metge: 'Médico', mutua: 'Mutua / tarjeta sanitaria', notes: 'Notas', adreca: 'Dirección', don: 'Donante de órganos',
        cap_al: 'Ninguna conocida', protesi: 'Implantes / prótesis', si: 'Sí', no: 'No',
        emerg: 'EMERGENCIA', cas: 'En caso de accidente, escanead este código', scan: 'Escanéame · Scan me' },
  fr: { cap: 'URGENCE · ICE', med: 'FICHE MÉDICALE', nom: 'Nom', naix: 'Né(e) le', dni: 'Pièce d\'identité',
        sang: 'Groupe sanguin', alerg: 'ALLERGIES', medi: 'Médicaments', malal: 'Maladies', ice: 'Appelez',
        metge: 'Médecin', mutua: 'Mutuelle / carte vitale', notes: 'Notes', adreca: 'Adresse', don: 'Donneur d\'organes',
        cap_al: 'Aucune connue', protesi: 'Implants / prothèses', si: 'Oui', no: 'Non',
        emerg: 'URGENCE', cas: 'En cas d\'accident, scannez ce code', scan: 'Scannez-moi · Scan me' },
  en: { cap: 'EMERGENCY · ICE', med: 'MEDICAL RECORD', nom: 'Name', naix: 'Born', dni: 'ID',
        sang: 'Blood type', alerg: 'ALLERGIES', medi: 'Medication', malal: 'Conditions', ice: 'Call',
        metge: 'Doctor', mutua: 'Health insurance', notes: 'Notes', adreca: 'Address', don: 'Organ donor',
        cap_al: 'None known', protesi: 'Implants / prostheses', si: 'Yes', no: 'No',
        emerg: 'EMERGENCY', cas: 'In case of accident, scan this code', scan: 'Scan me' },
};

const IDIOMA = { k: 'idioma', label: T('Idioma del text'), tipus: 'select', opcions: [['ca', 'Català'], ['es', 'Español'], ['fr', 'Français'], ['en', 'English']], val: window.XQR_IDIOMA.L };
const SANG = { k: 'sang', label: T('Grup sanguini'), tipus: 'select',
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
  { k: `ice${i}_nom`, label: T(`Contacte ${i} · nom`), grup: T('Contactes en cas d\'accident'), mig: true },
  { k: `ice${i}_rel`, label: T('Relació'), placeholder: T('fill, esposa…'), mig: true, curt: true },
  { k: `ice${i}_tlf`, label: T('Telèfon'), tipus: 'tel', mig: true },
]);

const linia = (et, v) => (net(v) ? `${et}: ${net(v)}` : null);

const FITXES = [
  {
    id: 'emergencia', nom: T('Emergència'), icona: '🆘', color: '#E5484D',
    desc: T('Contactes en cas d\'accident i dades mèdiques bàsiques. Es llegeix amb qualsevol mòbil, sense internet.'),
    camps: [
      IDIOMA,
      { k: 'nom', label: T('Nom i cognoms'), grup: T('Persona') },
      { k: 'naix', label: T('Data de naixement'), tipus: 'date', mig: true },
      SANG,
      { k: 'alerg', label: T('Al·lèrgies'), tipus: 'textarea', placeholder: T('Penicil·lina, fruits secs…  (buit = cap de coneguda)'), grup: T('Salut') },
      { k: 'medi', label: T('Medicació habitual'), tipus: 'textarea' },
      { k: 'malal', label: T('Malalties / condicions'), tipus: 'textarea', placeholder: T('Diabetis, marcapassos…') },
      ...campsICE,
      { k: 'notes', label: T('Altres notes'), tipus: 'textarea', grup: T('Altres') },
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
    titol: d => d.nom ? `${T('Emergència')} · ${d.nom}` : T('Emergència'),
    targetes: ['fons', 'adhesiu', 'targeta'],
  },
  {
    id: 'medica', nom: T('Fitxa mèdica'), icona: '🩺', color: '#E5484D',
    desc: T('Més completa: al·lèrgies, medicació, implants, metge i mútua.'),
    camps: [
      IDIOMA,
      { k: 'nom', label: T('Nom i cognoms'), grup: T('Persona') },
      { k: 'naix', label: T('Data de naixement'), tipus: 'date', mig: true },
      { k: 'dni', label: T('DNI / NIE'), mig: true },
      SANG,
      { k: 'don', label: T('Donant d\'òrgans'), tipus: 'select', opcions: [['', '—'], ['Sí', T('Sí')], ['No', T('No')]], mig: true },
      { k: 'alerg', label: T('Al·lèrgies'), tipus: 'textarea', grup: T('Salut') },
      { k: 'medi', label: T('Medicació (nom i dosi)'), tipus: 'textarea' },
      { k: 'malal', label: T('Malalties / condicions'), tipus: 'textarea' },
      { k: 'protesi', label: T('Implants / pròtesis'), placeholder: T('Marcapassos, pròtesi de maluc…') },
      { k: 'metge', label: T('Metge de capçalera (nom i tlf)'), grup: T('Atenció') },
      { k: 'mutua', label: T('Mútua / núm. targeta sanitària') },
      { k: 'ice1_nom', label: T('Contacte d\'emergència'), mig: true },
      { k: 'ice1_tlf', label: T('Telèfon'), tipus: 'tel', mig: true },
      { k: 'notes', label: T('Notes'), tipus: 'textarea' },
    ],
    codifica(d) {
      const t = TXT[d.idioma] || TXT.ca;
      return [
        `🩺 ${t.med}`,
        linia(t.nom, d.nom), linia(t.naix, dataLocal(d.naix)), linia(t.dni, d.dni), linia(t.sang, d.sang),
        linia(t.don, d.don === 'Sí' ? t.si : d.don === 'No' ? t.no : d.don),
        `${t.alerg}: ${net(d.alerg) || t.cap_al}`,
        linia(t.medi, d.medi), linia(t.malal, d.malal), linia(t.protesi, d.protesi),
        linia(t.metge, d.metge), linia(t.mutua, d.mutua),
        (net(d.ice1_nom) || net(d.ice1_tlf)) ? `${t.ice}: ${net(d.ice1_nom)} ${net(d.ice1_tlf)}`.trim() : null,
        linia(t.notes, d.notes),
      ].filter(Boolean).join('\n');
    },
    titol: d => d.nom ? `${T('Fitxa mèdica')} · ${d.nom}` : T('Fitxa mèdica'),
    targetes: ['fons', 'adhesiu', 'targeta'],
  },
  {
    id: 'contacte', nom: T('Contacte personal'), icona: '👤', color: '#FFA82E',
    desc: T('Targeta de visita: en escanejar-la, el contacte es desa al mòbil.'),
    camps: [
      { k: 'nom', label: T('Nom'), mig: true }, { k: 'cognoms', label: T('Cognoms'), mig: true },
      { k: 'mobil', label: T('Mòbil'), tipus: 'tel', mig: true }, { k: 'email', label: T('Correu'), tipus: 'email', mig: true },
      { k: 'carrer', label: T('Adreça (carrer i número)'), grup: T('Adreça') },
      { k: 'cp', label: T('CP'), mig: true, curt: true }, { k: 'poblacio', label: T('Població'), mig: true },
      { k: 'provincia', label: T('Província'), mig: true }, { k: 'pais', label: T('País'), mig: true, val: T('Espanya') },
      { k: 'web', label: T('Web o xarxa social'), tipus: 'url', grup: T('Altres') },
      { k: 'nota', label: T('Nota'), tipus: 'textarea' },
    ],
    codifica: vcard,
    titol: d => [d.nom, d.cognoms].filter(Boolean).join(' ') || T('Contacte'),
    targetes: ['targeta'],
  },
  {
    id: 'negoci', nom: T('Negoci'), icona: '🏢', color: '#FFA82E',
    desc: T('Empresa, adreça, telèfon i web en una sola targeta.'),
    camps: [
      { k: 'empresa', label: T('Nom del negoci') },
      { k: 'nom', label: T('Persona de contacte'), mig: true }, { k: 'carrec', label: T('Càrrec'), mig: true },
      { k: 'telefon', label: T('Telèfon'), tipus: 'tel', mig: true }, { k: 'mobil', label: T('Mòbil'), tipus: 'tel', mig: true },
      { k: 'email', label: T('Correu'), tipus: 'email', mig: true }, { k: 'web', label: T('Web'), tipus: 'url', mig: true },
      { k: 'carrer', label: T('Adreça (carrer i número)'), grup: T('Adreça') },
      { k: 'cp', label: T('CP'), mig: true, curt: true }, { k: 'poblacio', label: T('Població'), mig: true },
      { k: 'provincia', label: T('Província'), mig: true }, { k: 'pais', label: T('País'), mig: true, val: T('Espanya') },
      { k: 'nota', label: T('Horari / nota'), tipus: 'textarea', placeholder: T('Dl-Dv 9-14 i 16-20') },
    ],
    codifica: d => vcard({ ...d, cognoms: '' }),
    titol: d => d.empresa || T('Negoci'),
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'adreca', nom: T('Adreça / ubicació'), icona: '📍', color: '#FFA82E',
    desc: T('Obre el mapa directament al lloc (casa, negoci, aparcament…).'),
    camps: [
      { k: 'etiqueta', label: T('Nom del lloc'), placeholder: T('Casa, Taller, Mas…') },
      { k: 'adreca', label: T('Adreça'), placeholder: T('Carrer Major 1, 08001 Barcelona'), tipus: 'textarea' },
      { k: 'lat', label: T('o bé latitud'), mig: true, placeholder: T('41.3874'), grup: T('Coordenades (opcional, més precís)') },
      { k: 'lon', label: T('longitud'), mig: true, placeholder: T('2.1686') },
    ],
    codifica(d) {
      const lat = net(d.lat).replace(',', '.'), lon = net(d.lon).replace(',', '.');
      const q = (lat && lon) ? `${lat},${lon}` : net(d.adreca);
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    },
    titol: d => d.etiqueta || d.adreca || T('Adreça'),
    boto: { text: T('📍 La meva ubicació ara'), fes: 'ubicacio' },
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'wifi', nom: T('WiFi'), icona: '📶', color: '#3B82F6',
    desc: T('Els convidats es connecten escanejant, sense escriure la clau.'),
    camps: [
      { k: 'ssid', label: T('Nom de la xarxa (SSID)') },
      { k: 'pass', label: T('Contrasenya'), tipus: 'password' },
      { k: 'seg', label: T('Seguretat'), tipus: 'select', opcions: [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', T('Sense contrasenya')]], val: 'WPA', mig: true },
      { k: 'oculta', label: T('Xarxa oculta'), tipus: 'select', opcions: [['false', T('No')], ['true', T('Sí')]], val: 'false', mig: true },
    ],
    codifica: d => `WIFI:T:${d.seg || 'WPA'};S:${esc_wifi(d.ssid)};${d.seg === 'nopass' ? '' : 'P:' + esc_wifi(d.pass) + ';'}H:${d.oculta || 'false'};;`,
    titol: d => d.ssid ? `WiFi · ${d.ssid}` : 'WiFi',
    targetes: ['adhesiu', 'targeta'],
  },
  {
    id: 'clau', nom: T('Contrasenya / codi'), icona: '🔐', color: '#8B5CF6',
    desc: T('Contrasenyes, PIN, codis d\'alarma… SEMPRE xifrats: només els obre Xoriguer QR amb la frase secreta.'),
    forcaXifrat: true,
    camps: [
      { k: 'servei', label: T('De què és'), placeholder: T('Alarma de casa, router, caixa forta…') },
      { k: 'usuari', label: T('Usuari (opcional)') },
      { k: 'clau', label: T('Contrasenya o codi'), tipus: 'password' },
      { k: 'notes', label: T('Notes'), tipus: 'textarea' },
    ],
    codifica: d => [linia(T('Servei'), d.servei), linia(T('Usuari'), d.usuari), linia(T('Contrasenya'), d.clau), linia(T('Notes'), d.notes)].filter(Boolean).join('\n'),
    titol: d => d.servei ? `🔐 ${d.servei}` : T('Contrasenya'),
    targetes: ['targeta'],
  },
  {
    id: 'web', nom: T('Enllaç web'), icona: '🔗', color: '#22A06B',
    desc: T('Una pàgina, un vídeo, un formulari, una xarxa social…'),
    camps: [{ k: 'url', label: T('Adreça web'), tipus: 'url', placeholder: T('https://…') }],
    codifica: d => { const u = net(d.url); return u && !/^[a-z]+:/i.test(u) ? 'https://' + u : u; },
    titol: d => net(d.url).replace(/^https?:\/\//, '') || T('Enllaç'),
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'telefon', nom: T('Trucada'), icona: '📞', color: '#22A06B',
    desc: T('En escanejar-lo, el mòbil marca el número.'),
    camps: [{ k: 'etiqueta', label: T('Nom'), placeholder: T('Avi Joan') }, { k: 'tlf', label: T('Telèfon'), tipus: 'tel' }],
    codifica: d => 'tel:' + nomesNum(d.tlf),
    titol: d => d.etiqueta || d.tlf || T('Trucada'),
    targetes: ['adhesiu', 'targeta'],
  },
  {
    id: 'whatsapp', nom: T('WhatsApp'), icona: '💬', color: '#22A06B',
    desc: T('Obre un xat amb el missatge ja escrit.'),
    camps: [
      { k: 'tlf', label: T('Telèfon amb prefix'), tipus: 'tel', placeholder: T('+34 600 000 000') },
      { k: 'msg', label: T('Missatge'), tipus: 'textarea' },
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
    id: 'sms', nom: T('SMS'), icona: '✉️', color: '#22A06B',
    desc: T('Prepara un SMS amb el text.'),
    camps: [{ k: 'tlf', label: T('Telèfon'), tipus: 'tel' }, { k: 'msg', label: T('Missatge'), tipus: 'textarea' }],
    codifica: d => `SMSTO:${nomesNum(d.tlf)}:${net(d.msg)}`,
    titol: d => d.tlf ? `SMS · ${d.tlf}` : 'SMS',
    targetes: ['targeta'],
  },
  {
    id: 'correu', nom: T('Correu'), icona: '📧', color: '#22A06B',
    desc: T('Obre un correu nou amb l\'adreça, l\'assumpte i el text.'),
    camps: [
      { k: 'a', label: T('Per a'), tipus: 'email' }, { k: 'assumpte', label: T('Assumpte') },
      { k: 'cos', label: T('Text'), tipus: 'textarea' },
    ],
    codifica(d) {
      const p = [];
      if (net(d.assumpte)) p.push('subject=' + encodeURIComponent(d.assumpte));
      if (net(d.cos)) p.push('body=' + encodeURIComponent(d.cos));
      return 'mailto:' + net(d.a) + (p.length ? '?' + p.join('&') : '');
    },
    titol: d => d.a || T('Correu'),
    targetes: ['targeta'],
  },
  {
    id: 'esdeveniment', nom: T('Esdeveniment'), icona: '📅', color: '#22A06B',
    desc: T('Casament, aniversari, sopar… s\'afegeix al calendari.'),
    camps: [
      { k: 'titol', label: T('Títol') },
      { k: 'inici', label: T('Comença'), tipus: 'datetime-local', mig: true },
      { k: 'fi', label: T('Acaba'), tipus: 'datetime-local', mig: true },
      { k: 'lloc', label: T('Lloc') }, { k: 'desc', label: T('Descripció'), tipus: 'textarea' },
    ],
    codifica(d) {
      const f = s => net(s).replace(/[-:]/g, '').slice(0, 13) + '00';
      return ['BEGIN:VEVENT', `SUMMARY:${esc_vc(d.titol)}`,
        net(d.inici) && `DTSTART:${f(d.inici)}`, net(d.fi) && `DTEND:${f(d.fi)}`,
        net(d.lloc) && `LOCATION:${esc_vc(d.lloc)}`, net(d.desc) && `DESCRIPTION:${esc_vc(d.desc)}`,
        'END:VEVENT'].filter(Boolean).join('\n');
    },
    titol: d => d.titol || T('Esdeveniment'),
    targetes: ['targeta', 'adhesiu'],
  },
  {
    id: 'text', nom: T('Text lliure'), icona: '📝', color: '#94A3B8',
    desc: T('Qualsevol text: una nota, unes instruccions, un missatge.'),
    camps: [{ k: 'titol', label: T('Títol (no va dins el QR)') }, { k: 'text', label: T('Text'), tipus: 'textarea', alt: 8 }],
    codifica: d => net(d.text),
    titol: d => d.titol || net(d.text).slice(0, 30) || T('Text'),
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

window.XQR_FITXES = { FITXES, codificaPersonal, dataLocal, TXT };
})();
