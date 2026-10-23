/* Hémicycle — rendu du tableau de bord à partir de window.VEILLE (data/veille.js) */
(function () {
  'use strict';
  const D = window.VEILLE;
  const ICONS = window.ICONS || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NS = 'http://www.w3.org/2000/svg';
  const TODAY = new Date('2026-10-23T12:00:00');

  const THEMES = {
    'budget': ['Budget et finances publiques', 'wallet'],
    'secu-sante': ['Sécurité sociale et santé', 'heart-pulse'],
    'social-travail': ['Retraites, travail, social', 'briefcase'],
    'parlement': ['Vie parlementaire', 'scale'],
    'executif': ['Exécutif', 'building-2'],
    'presidentielle': ['Présidentielle 2027', 'vote'],
    'energie-climat': ['Énergie et climat', 'zap'],
    'numerique': ['Numérique et IA', 'cpu'],
    'agriculture': ['Agriculture', 'wheat'],
    'securite-justice': ['Sécurité, justice, immigration', 'shield'],
    'europe-international': ['Europe et international', 'globe'],
    'defense': ['Défense', 'swords'],
    'economie-industrie': ['Économie et industrie', 'factory'],
    'territoires': ['Territoires, logement, transports', 'map-pin'],
    'education-culture-medias': ['Éducation, culture, médias', 'graduation-cap'],
    'opinion': ['Opinion et climat social', 'megaphone'],
  };
  const label = (k) => (THEMES[k] || [k])[0];
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[(THEMES[k] || [])[1]] || ''}</svg>`;
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const MSHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const parse = (s) => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s || ''); return m ? { y: +m[1], m: +m[2], d: m[3] ? +m[3] : null } : null; };
  const fmtDate = (s, short) => { const p = parse(s); if (!p) return esc(s); const M = short ? MSHORT : MONTHS; return (p.d ? (p.d === 1 ? '1er' : p.d) + ' ' : '') + M[p.m - 1] + (short ? '' : ' ' + p.y); };
  const toDate = (s) => { const p = parse(s); return p ? new Date(p.y, p.m - 1, p.d || 15, 12) : null; };
  const score = (s) => s.impact * s.urgence + (s.signal_faible ? 3 : 0);
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

  // Signaux à plat, ids uniques
  const seen = new Set();
  const SIGNALS = [];
  D.themes.forEach((t) => (t.signaux || []).forEach((s) => {
    let id = s.id || t.theme + '-' + SIGNALS.length;
    while (seen.has(id)) id += '-b';
    seen.add(id);
    SIGNALS.push(Object.assign({}, s, { id, theme: t.theme }));
  }));
  const byId = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));
  const S = D.synthese || {};

  /* ---------- Thème clair / sombre ---------- */
  const root = document.documentElement;
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
  const syncBtn = () => { $('#themeToggle').textContent = isDark() ? 'Mode clair' : 'Mode sombre'; };
  try { const t = localStorage.getItem('hemicycle-theme'); if (t) root.dataset.theme = t; } catch (e) { /* stockage indisponible */ }
  syncBtn();
  $('#themeToggle').addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    syncBtn();
    try { localStorage.setItem('hemicycle-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  });

  /* ---------- Infobulle et SVG ---------- */
  const tip = $('#tip');
  function showTip(e, html) {
    tip.innerHTML = html; tip.classList.add('on');
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14;
    if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => tip.classList.remove('on');
  const sigTip = (s) => `<b>${esc(s.titre)}</b><span class="m">${esc(label(s.theme))}, ${fmtDate(s.date)}<br>Impact ${s.impact}/5, urgence ${s.urgence}/5${s.signal_faible ? ', signal faible' : ''}</span>`;
  function el(tag, attrs, parent, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(w, h, host, labelText) {
    host.innerHTML = '';
    return el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': labelText || '' }, host);
  }
  function hover(node, html, onClick) {
    node.addEventListener('mousemove', (e) => showTip(e, html));
    node.addEventListener('mouseleave', hideTip);
    if (onClick) node.addEventListener('click', () => { hideTip(); onClick(); });
  }

  /* ---------- Fil de dépêches ---------- */
  const recent = SIGNALS.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 18);
  const wireItems = recent.map((s) => `<a href="#sig-${esc(s.id)}" data-id="${esc(s.id)}"><time>${fmtDate(s.date, true)}</time>${esc(s.titre)}</a>`).join('');
  $('#wire').innerHTML = wireItems + wireItems;
  $('#wire').addEventListener('click', (e) => { const a = e.target.closest('a[data-id]'); if (a) { e.preventDefault(); openSignal(a.dataset.id); } });

  /* ---------- Ouverture ---------- */
  if (S.titre) $('#title').textContent = S.titre;
  const paras = String(S.synthese_executive || '').split(/\n+/).filter(Boolean);
  $('#chapo').innerHTML = paras.length ? `<p>${esc(paras[0])}</p>` : '';

  const DEADLINES = [
    ['2026-11-17', 'Fin de la 1re lecture du PLF', 'Après 40 jours, l\'Assemblée est dessaisie au profit du Sénat.'],
    ['2026-11-26', 'Délai du PLFSS', 'Passé 50 jours, le gouvernement peut légiférer par ordonnance.'],
    ['2026-12-17', 'Délai du PLF', 'Passé 70 jours, ordonnance budgétaire possible (article 47).'],
  ];
  $('#countdown').innerHTML = DEADLINES.map(([d, t, w]) => {
    const n = Math.round((toDate(d) - TODAY) / 864e5);
    return `<div class="cd"><div class="n">${n > 0 ? 'J-' + n : 'Échu'}</div><div class="d">${esc(t)}<br><span style="font-weight:500;color:var(--ink-2)">${fmtDate(d)}</span></div><div class="w">${esc(w)}</div></div>`;
  }).join('');

  /* ---------- Hémicycle ---------- */
  const POSTURES = [
    ['soutien', '--p-soutien', 'Soutien'],
    ['soutien conditionnel', '--p-cond', 'Soutien sous conditions'],
    ['abstention probable', '--p-abst', 'Abstention probable'],
    ['opposition', '--p-oppo', 'Opposition'],
    ['censure envisagée', '--p-censure', 'Censure envisagée'],
  ];
  const postureVar = (p) => (POSTURES.find((x) => x[0] === p) || [0, '--muted'])[1];
  const H = D.hemicycle;
  const RDF = S.rapport_de_force || [];
  let selectedGroup = null;

  function selectGroup(idx) {
    selectedGroup = selectedGroup === idx ? null : idx;
    const box = $('#hemicycle');
    box.classList.toggle('focus', selectedGroup != null);
    box.querySelectorAll('circle.seat').forEach((c) => c.classList.toggle('hl', +c.dataset.g === selectedGroup));
    document.querySelectorAll('#hemiGroups button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.g === selectedGroup)));
    document.querySelectorAll('#forcesTable tbody tr').forEach((tr) => tr.classList.toggle('sel', H && selectedGroup != null && +tr.dataset.r === H.groupes[selectedGroup].rdf));
    renderHemiDetail();
  }
  function renderHemiDetail() {
    const det = $('#hemiDetail');
    if (!H) { det.innerHTML = ''; return; }
    if (selectedGroup == null) {
      const tally = POSTURES.map(([p, v, l]) => [l, v, H.groupes.filter((g) => g.posture === p).reduce((n, g) => n + g.sieges, 0)]).filter((x) => x[2]);
      det.innerHTML = `Majorité absolue : <b>289</b> sièges. ${tally.map(([l, , n]) => `${esc(l)} : ${n}`).join(' ; ')}. Choisir un groupe pour lire sa position.`;
      return;
    }
    const g = H.groupes[selectedGroup];
    const r = RDF[g.rdf];
    det.innerHTML = `<b>${esc(g.nom)}</b>, ${plural(g.sieges, 'siège', 'sièges')}<br>${r ? esc(r.position_budget) + '<br><span style="color:var(--velvet)">Ligne rouge : ' + esc(r.ligne_rouge) + '</span>' : 'Pas de position consolidée relevée sur la période.'}`;
  }
  (function hemicycle() {
    const host = $('#hemicycle');
    if (!H || !H.groupes || !H.groupes.length) { $('.hemi-box').style.display = 'none'; return; }
    const total = H.groupes.reduce((n, g) => n + g.sieges, 0);
    const W = 520, R = 240, cx = W / 2, cy = 252, rows = 11, r0 = 92;
    const radii = Array.from({ length: rows }, (_, i) => r0 + i * ((R - r0) / (rows - 1)));
    const sumR = radii.reduce((a, b) => a + b, 0);
    let counts = radii.map((r) => Math.floor(total * r / sumR));
    let rest = total - counts.reduce((a, b) => a + b, 0);
    for (let i = rows - 1; rest > 0; i = (i - 1 + rows) % rows, rest--) counts[i]++;
    const seats = [];
    radii.forEach((r, i) => {
      const n = counts[i];
      for (let j = 0; j < n; j++) {
        const a = Math.PI - (n === 1 ? Math.PI / 2 : (j / (n - 1)) * Math.PI);
        seats.push({ a, r, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
      }
    });
    seats.sort((p, q) => q.a - p.a || p.r - q.r);
    const g = svg(W, 270, host, `Hémicycle de ${total} sièges coloré selon la posture de chaque groupe sur le budget`);
    let k = 0;
    H.groupes.forEach((grp, gi) => {
      for (let s = 0; s < grp.sieges && k < seats.length; s++, k++) {
        const p = seats[k];
        const c = el('circle', { class: 'seat', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 6.4, fill: `var(${postureVar(grp.posture)})`, 'data-g': gi }, g);
        hover(c, `<b>${esc(grp.nom)}</b><span class="m">${plural(grp.sieges, 'siège', 'sièges')}, ${esc(grp.posture || 'posture non relevée')}</span>`, () => selectGroup(gi));
      }
    });
    el('text', { x: cx, y: cy - 18, 'text-anchor': 'middle', class: 'hemi-center', style: 'font-size:38px;font-weight:800;fill:var(--ink)' }, g, String(total));
    el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--muted)' }, g, 'députés');
    $('#hemiLegend').innerHTML = POSTURES.map(([p, v, l]) => `<button type="button" data-p="${esc(p)}" style="--c:var(${v})"><i></i>${esc(l)}</button>`).join('');
    $('#hemiGroups').innerHTML = H.groupes.map((grp, gi) => `<button type="button" data-g="${gi}" aria-pressed="false" style="--c:var(${postureVar(grp.posture)})"><i></i>${esc(grp.sigle)} ${grp.sieges}</button>`).join('');
    $('#hemiGroups').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectGroup(+b.dataset.g); });
    $('#hemiLegend').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      selectedGroup = null;
      host.classList.add('focus');
      host.querySelectorAll('circle.seat').forEach((c) => c.classList.toggle('hl', H.groupes[+c.dataset.g].posture === b.dataset.p));
      document.querySelectorAll('#hemiGroups button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      const n = H.groupes.filter((x) => x.posture === b.dataset.p);
      $('#hemiDetail').innerHTML = `<b>${esc(b.textContent)}</b> : ${n.map((x) => esc(x.sigle) + ' (' + x.sieges + ')').join(', ') || 'aucun groupe'}, soit ${n.reduce((a, x) => a + x.sieges, 0)} sièges.`;
    });
    $('#hemiDate').textContent = `Effectifs au ${fmtDate(H.date_reference)}`;
    $('#hemiSrc').innerHTML = H.source_url ? `Source des effectifs : <a href="${esc(H.source_url)}" target="_blank" rel="noopener noreferrer">${esc(new URL(H.source_url).hostname)}</a>. Posture : analyse du cabinet.` : '';
    renderHemiDetail();
  })();

  /* ---------- Chiffres ---------- */
  const nSources = new Set(SIGNALS.flatMap((s) => (s.sources || []).map((x) => x.url))).size;
  const crit = SIGNALS.filter((s) => s.impact >= 4 && s.urgence >= 4).length;
  $('#figures').innerHTML = [
    [SIGNALS.length, 'signaux retenus et vérifiés'],
    [crit, 'à traiter vite (impact et urgence de 4 ou plus)'],
    [SIGNALS.filter((s) => s.signal_faible).length, 'signaux faibles'],
    [D.themes.filter((t) => t.temperature >= 4).length + ' / ' + D.themes.length, 'dossiers sous haute tension'],
    [nSources, 'sources consultables'],
  ].map(([v, l]) => `<div class="fig"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

  /* ---------- Note ---------- */
  $('#exec').innerHTML = paras.slice(1).map((p) => `<p>${esc(p)}</p>`).join('') || paras.map((p) => `<p>${esc(p)}</p>`).join('');
  const VIG = S.points_de_vigilance || [];
  $('#vigTop').innerHTML = VIG.slice(0, 5).map((v) => `<li>${esc(v)}</li>`).join('');
  $('#vigList').innerHTML = VIG.slice(5).map((v) => `<li>${esc(v)}</li>`).join('');

  /* ---------- Dix signaux ---------- */
  const top = (S.top_signaux || []).filter((t) => byId[t.id]);
  $('#topList').innerHTML = top.map((t) => {
    const s = byId[t.id];
    return `<li data-id="${esc(s.id)}" tabindex="0"><div><h3>${esc(s.titre)}</h3><p>${esc(t.pourquoi)}</p>
      <div class="chips"><span class="chip theme">${esc(label(s.theme))}</span><span class="chip">${fmtDate(s.date)}</span>${s.signal_faible ? '<span class="chip weak">signal faible</span>' : ''}</div></div></li>`;
  }).join('');
  const topOpen = (e) => { const li = e.target.closest('li'); if (li && (e.type === 'click' || e.key === 'Enter')) openSignal(li.dataset.id); };
  $('#topList').addEventListener('click', topOpen);
  $('#topList').addEventListener('keydown', topOpen);

  /* ---------- Rapport de force ---------- */
  const rdfToGroup = {};
  if (H) H.groupes.forEach((g, gi) => { if (g.rdf != null) rdfToGroup[g.rdf] = gi; });
  $('#forcesTable').innerHTML = `<thead><tr><th>Groupe</th><th>Posture</th><th>Ce qu'il dit du budget</th><th>Ligne rouge</th></tr></thead><tbody>` +
    RDF.map((r, i) => `<tr data-r="${i}" style="${rdfToGroup[i] != null ? 'cursor:pointer' : ''}"><td class="g">${esc(r.groupe)}</td><td><span class="posture" style="--c:var(${postureVar(r.posture)})">${esc(r.posture)}</span></td><td>${esc(r.position_budget)}</td><td>${esc(r.ligne_rouge)}</td></tr>`).join('') + '</tbody>';
  $('#forcesTable').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-r]'); if (!tr) return;
    const gi = rdfToGroup[+tr.dataset.r];
    if (gi != null) { selectGroup(gi); $('#ouverture').scrollIntoView(); }
  });

  /* ---------- Scénarios ---------- */
  const SC_COLORS = ['--navy', '--brass', '--p-oppo', '--velvet'];
  const SC = (S.scenarios || []).map((s, i) => Object.assign({ c: SC_COLORS[i % 4], i }, s));
  $('#scenBar').setAttribute('aria-label', SC.map((s) => `${s.nom} : ${s.probabilite} %`).join(', '));
  $('#scenBar').innerHTML = SC.map((s) => `<div style="flex:${s.probabilite};background:var(${s.c})" data-i="${s.i}" title="${esc(s.nom)}">${s.probabilite >= 8 ? s.probabilite + ' %' : ''}</div>`).join('');
  $('#scenList').innerHTML = SC.map((s) => `<div class="scen" id="scen-${s.i}" style="--c:var(${s.c})">
      <div class="scen-top"><h3>${esc(s.nom)}</h3><span class="p">${s.probabilite} %</span></div>
      <p>${esc(s.description)}</p>
      <div class="trig">Ce qui ferait basculer</div>
      <div class="chips">${(s.declencheurs || []).map((d) => `<span class="chip">${esc(d)}</span>`).join('')}</div></div>`).join('');
  $('#scenBar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]'); if (!b) return;
    const n = $('#scen-' + b.dataset.i); n.scrollIntoView({ block: 'center' });
    n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 1500);
  });

  /* ---------- Échéances : frise + liste ---------- */
  const CAL = (S.calendrier || []).filter((c) => toDate(c.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  (function frise() {
    if (!CAL.length) return;
    const start = new Date(2026, 9, 22, 12), last = new Date(2027, 0, 1, 12);
    const later = CAL.filter((c) => toDate(c.date) > last).length;
    const W = 1000, Hh = 168, m = { l: 10, r: 10 }, base = 118;
    const sx = (d) => m.l + ((d - start) / (last - start)) * (W - m.l - m.r);
    const g = svg(W, Hh, $('#frise'), 'Frise des échéances');
    el('line', { x1: m.l, x2: W - m.r, y1: base, y2: base, class: 'axis', 'stroke-width': 2 }, g);
    for (let d = new Date(2026, 10, 1, 12); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) {
      el('line', { x1: sx(d), x2: sx(d), y1: base - 4, y2: base + 6, class: 'axis' }, g);
      el('text', { x: sx(d) + 4, y: base + 22 }, g, MONTHS[d.getMonth()] + (d.getFullYear() > 2026 ? ' ' + d.getFullYear() : ''));
    }
    el('text', { x: m.l, y: base + 22 }, g, '23 oct.');
    const stack = {};
    if (later) el('text', { x: W - m.r, y: 164, 'text-anchor': 'end' }, g, `+ ${later} échéances en 2027, dans la liste ci-dessous`);
    CAL.filter((c) => toDate(c.date) <= last).forEach((c) => {
      const key = String(c.date).slice(0, 10), n = (stack[key] = (stack[key] || 0) + 1) - 1;
      const x = sx(toDate(c.date)) + n * 7, h = 10 + c.criticite * 17;
      el('line', { x1: x, x2: x, y1: base, y2: base - h, stroke: c.criticite >= 4 ? 'var(--velvet)' : 'var(--rule)', 'stroke-width': 2 }, g);
      const dot = el('circle', { cx: x, cy: base - h, r: 3 + c.criticite, fill: c.criticite >= 4 ? 'var(--velvet)' : 'var(--brass)', stroke: 'var(--panel)', 'stroke-width': 2 }, g);
      const hit = el('circle', { cx: x, cy: base - h, r: 12, class: 'hit' }, g);
      hover(hit, `<b>${fmtDate(c.date)}</b><span class="m">${esc(c.evenement)}<br>${esc(label(c.theme))}, criticité ${c.criticite}/5</span>`);
      void dot;
    });
  })();
  const critDots = (n) => `<span class="crit" title="Criticité ${n} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  $('#calList').innerHTML = CAL.map((c) => `<li><div class="d">${fmtDate(c.date, true)}<small>${esc(label(c.theme))}</small></div><div class="e">${esc(c.evenement)}${critDots(c.criticite)}</div></li>`).join('');

  /* ---------- Dynamiques ---------- */
  $('#dynList').innerHTML = (S.dynamiques_transverses || []).map((d) => `<div class="dyn"><h3>${esc(d.titre)}</h3><p>${esc(d.analyse)}</p>
      <div class="chips">${(d.themes || []).map((t) => `<span class="chip theme">${esc(label(t))}</span>`).join('')}</div></div>`).join('');

  /* ---------- Matrice impact × urgence ---------- */
  (function matrix() {
    const W = 520, Hh = 420, m = { l: 44, r: 12, t: 12, b: 44 };
    const cw = (W - m.l - m.r) / 5, ch = (Hh - m.t - m.b) / 5;
    const g = svg(W, Hh, $('#matrix'), 'Matrice impact et urgence des signaux');
    el('rect', { x: m.l + 3 * cw, y: m.t, width: 2 * cw, height: 2 * ch, fill: 'var(--velvet)', opacity: 0.08, rx: 6 }, g);
    for (let i = 0; i <= 5; i++) {
      el('line', { x1: m.l + i * cw, x2: m.l + i * cw, y1: m.t, y2: Hh - m.b, class: i === 0 ? 'axis' : 'gridline' }, g);
      el('line', { x1: m.l, x2: W - m.r, y1: m.t + i * ch, y2: m.t + i * ch, class: i === 5 ? 'axis' : 'gridline' }, g);
    }
    for (let i = 1; i <= 5; i++) {
      el('text', { x: m.l + (i - 0.5) * cw, y: Hh - m.b + 16, 'text-anchor': 'middle' }, g, i);
      el('text', { x: m.l - 10, y: m.t + (5 - i + 0.5) * ch + 4, 'text-anchor': 'end' }, g, i);
    }
    el('text', { x: m.l + (W - m.l - m.r) / 2, y: Hh - 8, 'text-anchor': 'middle', class: 'lbl' }, g, 'Urgence');
    const my = m.t + (Hh - m.t - m.b) / 2;
    el('text', { x: 12, y: my, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(-90 12 ${my})` }, g, 'Impact');
    const cells = {};
    SIGNALS.forEach((s) => { const k = s.urgence + '-' + s.impact; (cells[k] = cells[k] || []).push(s); });
    Object.entries(cells).forEach(([k, list]) => {
      const [u, i] = k.split('-').map(Number);
      const x0 = m.l + (u - 1) * cw, y0 = m.t + (5 - i) * ch;
      const cols = Math.ceil(Math.sqrt(list.length * 1.3)), rows = Math.ceil(list.length / cols);
      const step = Math.min((cw - 12) / cols, (ch - 12) / rows, 22);
      const r = Math.max(3.5, Math.min(7, step / 2 - 1.5));
      list.sort((a, b) => b.signal_faible - a.signal_faible).forEach((s, j) => {
        const cx = x0 + cw / 2 + ((j % cols) - (cols - 1) / 2) * step;
        const cy = y0 + ch / 2 + (Math.floor(j / cols) - (rows - 1) / 2) * step;
        el('circle', { cx, cy, r, fill: s.signal_faible ? 'var(--s2)' : 'var(--s1)', stroke: 'var(--panel)', 'stroke-width': 2 }, g);
        hover(el('circle', { cx, cy, r: Math.max(r + 3, 8), class: 'hit' }, g), sigTip(s), () => openSignal(s.id));
      });
    });
    $('#matrixLegend').innerHTML = `<span><i style="background:var(--s1)"></i>Signal établi</span><span><i style="background:var(--s2)"></i>Signal faible</span><span><i class="sq" style="background:var(--velvet);opacity:.3"></i>Zone d'action immédiate</span>`;
  })();

  /* ---------- Carte de chaleur dossier × semaine ---------- */
  (function heat() {
    const WEEKS = [[1, 7, '1-7 oct.'], [8, 14, '8-14'], [15, 21, '15-21'], [22, 31, '22-23']];
    const rows = D.themes.map((t) => {
      const c = WEEKS.map(([a, b]) => t.signaux.filter((s) => { const p = parse(s.date); return p && p.y === 2026 && p.m === 10 && p.d >= a && p.d <= b; }).length);
      return { k: t.theme, c, tot: t.signaux.length };
    }).sort((a, b) => b.c.reduce((x, y) => x + y, 0) - a.c.reduce((x, y) => x + y, 0));
    const max = Math.max(1, ...rows.flatMap((r) => r.c));
    const q = (v) => (v === 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
    const ink = (lvl) => (lvl ? `var(--qt${lvl})` : 'var(--ink)');
    let html = `<div class="heat"><div class="h t">Dossier</div>${WEEKS.map((w) => `<div class="h">${w[2]}</div>`).join('')}<div class="h" style="text-align:right">Total</div>`;
    rows.forEach((r) => {
      html += `<div class="name" data-theme="${esc(r.k)}" title="${esc(label(r.k))}">${esc(label(r.k))}</div>`;
      r.c.forEach((v, i) => { const l = q(v); html += `<div class="cell" style="background:var(--q${l});color:${ink(l)}" title="${esc(label(r.k))}, ${WEEKS[i][2]} : ${plural(v, 'signal', 'signaux')}">${v || ''}</div>`; });
      html += `<div class="tot">${r.tot}</div>`;
    });
    html += `</div><div class="heat-scale">Moins${[1, 2, 3, 4, 5].map((i) => `<span style="background:var(--q${i})"></span>`).join('')}Plus</div>`;
    $('#heat').innerHTML = html;
    $('#heat').addEventListener('click', (e) => { const n = e.target.closest('.name'); if (n) { selectTheme(n.dataset.theme); $('#dossiers').scrollIntoView(); } });
  })();

  /* ---------- Chronologie ---------- */
  (function timeline() {
    const days = Array.from({ length: 23 }, (_, i) => '2026-10-' + String(i + 1).padStart(2, '0'));
    const counts = days.map((d) => SIGNALS.filter((s) => (s.date || '').slice(0, 10) === d));
    const before = SIGNALS.filter((s) => (s.date || '') < '2026-10-01').length;
    const W = 520, Hh = 190, m = { l: 26, r: 8, t: 10, b: 28 };
    const max = Math.max(1, ...counts.map((c) => c.length));
    const bw = (W - m.l - m.r) / days.length;
    const g = svg(W, Hh, $('#timeline'), 'Nombre de signaux par jour');
    const sy = (v) => Hh - m.b - (v / max) * (Hh - m.t - m.b);
    [0, Math.ceil(max / 2), max].forEach((v) => {
      el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: v === 0 ? 'axis' : 'gridline' }, g);
      el('text', { x: m.l - 6, y: sy(v) + 4, 'text-anchor': 'end' }, g, v);
    });
    counts.forEach((c, i) => {
      const x = m.l + i * bw + 1, weekend = [3, 4, 10, 11, 17, 18].includes(i);
      if (c.length) {
        const y = sy(c.length);
        el('path', { d: `M${x},${Hh - m.b} V${y + 3} q0,-3 3,-3 H${x + bw - 5} q3,0 3,3 V${Hh - m.b} Z`, fill: weekend ? 'var(--q2)' : 'var(--velvet)' }, g);
      }
      if (i % 3 === 0 || i === days.length - 1) el('text', { x: x + bw / 2 - 1, y: Hh - m.b + 16, 'text-anchor': 'middle' }, g, i + 1);
      hover(el('rect', { x: m.l + i * bw, y: m.t, width: bw, height: Hh - m.t - m.b, class: 'hit' }, g),
        `<b>${i + 1} octobre : ${plural(c.length, 'signal', 'signaux')}</b><span class="m">${c.slice(0, 5).map((s) => esc(s.titre)).join('<br>')}${c.length > 5 ? '<br>…' : ''}</span>`);
    });
    $('#timelineNote').textContent = `Barres claires : samedis et dimanches.${before ? ` ${before} signaux antérieurs au 1er octobre, gardés parce qu'ils pèsent encore sur les débats, ne figurent pas sur ce graphique.` : ''}`;
  })();

  /* ---------- Nature des signaux ---------- */
  (function byType() {
    const c = {};
    SIGNALS.forEach((s) => { c[s.type] = (c[s.type] || 0) + 1; });
    const rows = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const W = 520, rowH = 26, m = { l: 190, r: 34 }, Hh = rows.length * rowH;
    const max = Math.max(1, ...rows.map((r) => r[1]));
    const g = svg(W, Hh, $('#byType'), 'Répartition des signaux par nature');
    rows.forEach(([k, v], i) => {
      const y = i * rowH + 5, h = rowH - 10, w = (v / max) * (W - m.l - m.r);
      el('text', { x: m.l - 10, y: y + h / 2 + 4, 'text-anchor': 'end', class: 'lbl' }, g, k.charAt(0).toUpperCase() + k.slice(1));
      el('rect', { x: m.l, y, width: w, height: h, rx: 3, fill: 'var(--navy)' }, g);
      el('text', { x: m.l + w + 6, y: y + h / 2 + 4, class: 'val' }, g, v);
      hover(el('rect', { x: 0, y: y - 5, width: W, height: rowH, class: 'hit' }, g), `<b>${esc(k)}</b><span class="m">${plural(v, 'signal', 'signaux')}. Cliquer pour filtrer.</span>`,
        () => { resetFilters(); $('#fType').value = k; renderSignals(); $('#explorer').scrollIntoView(); });
    });
  })();

  /* ---------- Dossiers ---------- */
  const themesSorted = D.themes.slice().sort((a, b) => b.temperature - a.temperature || b.signaux.length - a.signaux.length);
  const temp = (n) => `<span class="temp" title="Tension ${n} sur 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  $('#themeTabs').innerHTML = themesSorted.map((t) => `<button role="tab" data-theme="${esc(t.theme)}" aria-selected="false">${icon(t.theme)}<span>${esc(label(t.theme))}</span>${temp(t.temperature)}</button>`).join('');
  $('#themeTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectTheme(b.dataset.theme); });
  function selectTheme(k) {
    const t = D.themes.find((x) => x.theme === k);
    if (!t) return;
    document.querySelectorAll('#themeTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.theme === k)));
    const ech = (t.echeances || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    $('#themePanel').innerHTML = `<h3 class="big">${esc(label(t.theme))}</h3>
      <div class="chips" style="margin-bottom:16px"><span class="chip ${t.temperature >= 5 ? 'hot' : ''}">Tension ${t.temperature} sur 5</span><span class="chip">Tendance ${esc(t.tendance)}</span><span class="chip">${plural(t.signaux.length, 'signal', 'signaux')}</span></div>
      <div class="lead">${esc(t.synthese)}</div>
      <div class="chips" style="margin-top:14px">${(t.mots_cles || []).map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div>
      <div class="dossier-cols">
        <div><h4>Signaux</h4><ul class="dl">${t.signaux.slice().sort((a, b) => score(b) - score(a)).map((s) => `<li><a href="#" data-id="${esc(s.id)}"><b>${esc(s.titre)}</b></a><span>${fmtDate(s.date)}, impact ${s.impact}, urgence ${s.urgence}${s.signal_faible ? ', signal faible' : ''}</span></li>`).join('')}</ul></div>
        <div><h4>Acteurs</h4><ul class="dl">${(t.acteurs_cles || []).slice().sort((a, b) => b.influence - a.influence).map((a) => `<li><b>${esc(a.nom)}</b><span>${esc(a.fonction)}. ${esc(a.position)}</span></li>`).join('')}</ul></div>
        <div><h4>Échéances</h4><ul class="dl">${ech.map((e) => `<li><b>${fmtDate(e.date)}, ${esc(e.evenement)}</b><span>${esc(e.enjeu)}</span></li>`).join('')}</ul></div>
      </div>`;
  }
  $('#themePanel').addEventListener('click', (e) => { const a = e.target.closest('a[data-id]'); if (a) { e.preventDefault(); openSignal(a.dataset.id); } });
  if (themesSorted[0]) selectTheme(themesSorted[0].theme);

  /* ---------- Explorateur ---------- */
  const fTheme = $('#fTheme'), fType = $('#fType');
  themesSorted.forEach((t) => fTheme.add(new Option(label(t.theme), t.theme)));
  [...new Set(SIGNALS.map((s) => s.type))].sort().forEach((t) => fType.add(new Option(t.charAt(0).toUpperCase() + t.slice(1), t)));
  const meter = (n, cls) => `<span class="meter ${cls || ''}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lvl = (s) => (s.impact * s.urgence >= 16 ? 'var(--velvet)' : s.impact * s.urgence >= 9 ? 'var(--brass)' : 'var(--rule)');
  function card(s) {
    return `<article class="sig" id="sig-${esc(s.id)}" style="--lvl:${lvl(s)}">
      <div class="sig-top"><h3>${esc(s.titre)}</h3><span class="date">${fmtDate(s.date, true)}</span></div>
      <div class="chips"><span class="chip theme">${esc(label(s.theme))}</span><span class="chip">${esc(s.type)}</span>${s.signal_faible ? '<span class="chip weak">signal faible</span>' : ''}</div>
      <p>${esc(s.resume)}</p>
      <div class="scores"><span>Impact${meter(s.impact)}</span><span>Urgence${meter(s.urgence)}</span></div>
      <details class="more"><summary>Lecture et sources</summary>
        <h5>Ce que cela annonce</h5><p>${esc(s.anticipation)}</p>
        <h5>Pour une organisation représentée</h5><p>${esc(s.implications)}</p>
        <h5>Acteurs</h5><p>${(s.acteurs || []).map(esc).join(', ')}</p>
        <h5>Sources</h5><ul>${(s.sources || []).map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.titre)}</a>, ${esc(x.media)}, ${fmtDate(x.date)}</li>`).join('')}</ul>
      </details></article>`;
  }
  function renderSignals() {
    const q = norm($('#q').value), th = fTheme.value, ty = fType.value, imp = +$('#fImpact').value, weak = $('#fWeak').checked;
    const list = SIGNALS.filter((s) => (!th || s.theme === th) && (!ty || s.type === ty) && s.impact >= imp && (!weak || s.signal_faible) &&
      (!q || norm([s.titre, s.resume, s.anticipation, s.implications, (s.acteurs || []).join(' '), label(s.theme)].join(' ')).includes(q)));
    list.sort($('#fSort').value === 'date' ? (a, b) => String(b.date).localeCompare(String(a.date)) : (a, b) => score(b) - score(a) || String(b.date).localeCompare(String(a.date)));
    $('#count').textContent = `${list.length} sur ${SIGNALS.length}`;
    $('#signals').innerHTML = list.map(card).join('') || '<p class="count">Aucun signal pour ces critères. Élargir la recherche ou retirer un filtre.</p>';
  }
  function resetFilters() { ['#q', '#fTheme', '#fType'].forEach((s) => { $(s).value = ''; }); $('#fImpact').value = '1'; $('#fWeak').checked = false; }
  ['#q', '#fTheme', '#fType', '#fImpact', '#fSort', '#fWeak'].forEach((s) => $(s).addEventListener('input', renderSignals));
  renderSignals();

  function openSignal(id) {
    resetFilters(); renderSignals();
    const n = document.getElementById('sig-' + id);
    if (!n) return;
    n.querySelector('details').open = true;
    n.scrollIntoView({ block: 'center' });
    n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 1800);
  }

  /* ---------- Recommandations, acteurs ---------- */
  $('#recoList').innerHTML = (S.recommandations || []).map((r) => `<li><div>${esc(r.action)}<small>Auprès de : ${esc(r.cible)}. Quand : ${esc(r.horizon)}.</small></div></li>`).join('');
  const ACTORS = D.themes.flatMap((t) => (t.acteurs_cles || []).map((a) => Object.assign({ theme: label(t.theme) }, a)));
  let sortKey = 'influence', sortDir = -1;
  function renderActors() {
    const cols = [['nom', 'Acteur'], ['fonction', 'Fonction'], ['theme', 'Dossier'], ['influence', 'Influence'], ['position', 'Position']];
    const rows = ACTORS.slice().sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    $('#actorsTable').innerHTML = `<thead><tr>${cols.map(([k, l]) => `<th class="sortable" data-k="${k}" aria-sort="${k === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${k === sortKey ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>` +
      rows.map((a) => `<tr><td class="g">${esc(a.nom)}</td><td>${esc(a.fonction)}</td><td>${esc(a.theme)}</td><td>${meter(a.influence, 'inf')}</td><td>${esc(a.position)}</td></tr>`).join('') + '</tbody>';
  }
  $('#actorsTable').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-k]'); if (!th) return;
    if (sortKey === th.dataset.k) sortDir = -sortDir; else { sortKey = th.dataset.k; sortDir = th.dataset.k === 'influence' ? -1 : 1; }
    renderActors();
  });
  renderActors();

  /* ---------- Navigation active ---------- */
  const navLinks = [...document.querySelectorAll('.nav a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach((a) => { const t = document.querySelector(a.getAttribute('href')); if (t) io.observe(t); });
  }

  $('#foot').innerHTML = `Hémicycle, veille affaires publiques sur la France, octobre 2026. Données brutes : <a href="data/veille.json">veille.json</a>. Icônes : <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a> (licence ISC). Les notes d'impact, d'urgence et les probabilités sont des jugements d'analyste ; revenir aux sources avant toute reprise.`;
})();
