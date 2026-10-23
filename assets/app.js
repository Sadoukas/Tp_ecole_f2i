/* Tableau de bord de veille — rendu à partir de window.VEILLE (data/veille.js) */
(function () {
  'use strict';
  const D = window.VEILLE;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NS = 'http://www.w3.org/2000/svg';

  const THEME_LABELS = {
    'budget': 'Budget & finances publiques',
    'secu-sante': 'Sécurité sociale & santé',
    'social-travail': 'Retraites, travail & social',
    'parlement': 'Vie parlementaire',
    'executif': 'Exécutif',
    'presidentielle': 'Présidentielle 2027 & partis',
    'energie-climat': 'Énergie & climat',
    'numerique': 'Numérique & IA',
    'agriculture': 'Agriculture',
    'securite-justice': 'Sécurité, justice & immigration',
    'europe-international': 'Europe & international',
    'defense': 'Défense',
    'economie-industrie': 'Économie & industrie',
    'territoires': 'Territoires, logement & transports',
    'education-culture-medias': 'Éducation, culture & médias',
    'opinion': 'Opinion & climat social',
  };
  const label = (k) => THEME_LABELS[k] || k;
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const fmtDate = (s) => {
    const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(s || '');
    if (!m) return esc(s);
    return (m[3] ? +m[3] + ' ' : '') + MONTHS[+m[2] - 1] + ' ' + m[1];
  };
  const score = (s) => s.impact * s.urgence + (s.signal_faible ? 3 : 0);

  // Aplatir les signaux et dédoublonner les ids
  const seen = new Set();
  const SIGNALS = [];
  D.themes.forEach((t) => (t.signaux || []).forEach((s) => {
    let id = s.id || (t.theme + '-' + SIGNALS.length);
    while (seen.has(id)) id += '-b';
    seen.add(id);
    SIGNALS.push(Object.assign({}, s, { id, theme: t.theme }));
  }));
  const byId = Object.fromEntries(SIGNALS.map((s) => [s.id, s]));

  /* ---------- Thème clair / sombre ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem('veille-theme'); if (t) root.dataset.theme = t; } catch (e) { /* stockage indisponible */ }
  $('#themeToggle').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('veille-theme', root.dataset.theme); } catch (e) { /* ignore */ }
  });

  /* ---------- Infobulle ---------- */
  const tip = $('#tip');
  function showTip(e, html) {
    tip.innerHTML = html; tip.classList.add('on');
    const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + w > innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > innerHeight - 8) y = e.clientY - h - pad;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  }
  const hideTip = () => tip.classList.remove('on');
  const sigTip = (s) => `<b>${esc(s.titre)}</b><span class="m">${esc(label(s.theme))} · ${fmtDate(s.date)}<br>Impact ${s.impact}/5 · Urgence ${s.urgence}/5${s.signal_faible ? ' · signal faible' : ''}</span>`;

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(w, h, host) {
    host.innerHTML = '';
    return el('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img' }, host);
  }
  const cssVar = (v) => `var(${v})`;

  /* ---------- En-tête ---------- */
  const S = D.synthese || {};
  if (S.titre) $('#title').textContent = S.titre;
  const nSources = new Set(SIGNALS.flatMap((s) => (s.sources || []).map((x) => x.url))).size;
  const nWeak = SIGNALS.filter((s) => s.signal_faible).length;
  const hot = D.themes.filter((t) => t.temperature >= 4).length;
  const crit = SIGNALS.filter((s) => s.impact >= 4 && s.urgence >= 4).length;
  $('#metaLine').innerHTML = `<span>Période : 1<sup>er</sup> – 23 octobre 2026</span><span>Mise à jour : ${fmtDate(D.generated_for)}</span><span>${D.themes.length} thèmes · ${nSources} sources uniques</span>`;
  $('#kpis').innerHTML = [
    [SIGNALS.length, 'signaux vérifiés'],
    [crit, 'signaux critiques (impact et urgence ≥ 4)'],
    [nWeak, 'signaux faibles détectés'],
    [hot, 'thèmes sous haute tension (≥ 4/5)'],
    [nSources, 'sources citées'],
  ].map(([v, l]) => `<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');

  /* ---------- Synthèse ---------- */
  $('#exec').innerHTML = String(S.synthese_executive || '').split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');

  /* ---------- Top signaux ---------- */
  const top = (S.top_signaux || []).filter((t) => byId[t.id]);
  const topList = top.length ? top : SIGNALS.slice().sort((a, b) => score(b) - score(a)).slice(0, 10).map((s) => ({ id: s.id, pourquoi: s.anticipation }));
  $('#topList').innerHTML = topList.map((t) => {
    const s = byId[t.id];
    return `<li data-id="${esc(s.id)}" tabindex="0"><div><div class="t">${esc(s.titre)}</div><div class="w">${esc(t.pourquoi)}</div>
      <div class="tags"><span class="tag theme">${esc(label(s.theme))}</span><span class="tag">${fmtDate(s.date)}</span><span class="tag">Impact ${s.impact} · Urgence ${s.urgence}</span>${s.signal_faible ? '<span class="tag weak">signal faible</span>' : ''}</div></div></li>`;
  }).join('');
  $('#topList').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) openSignal(li.dataset.id); });
  $('#topList').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const li = e.target.closest('li'); if (li) openSignal(li.dataset.id); } });

  /* ---------- Matrice impact × urgence ---------- */
  (function matrix() {
    const W = 520, H = 400, m = { l: 44, r: 12, t: 12, b: 40 };
    const cw = (W - m.l - m.r) / 5, ch = (H - m.t - m.b) / 5;
    const g = svg(W, H, $('#matrix'));
    el('rect', { x: m.l + 3 * cw, y: m.t, width: 2 * cw, height: 2 * ch, fill: cssVar('--critical'), opacity: 0.07, rx: 4 }, g);
    const zone = el('text', { x: W - m.r - 6, y: m.t + 14, 'text-anchor': 'end', class: 'lbl' }, g); zone.textContent = 'Zone d\'action prioritaire';
    for (let i = 0; i <= 5; i++) {
      el('line', { x1: m.l + i * cw, x2: m.l + i * cw, y1: m.t, y2: H - m.b, class: i === 0 ? 'axis' : 'gridline' }, g);
      el('line', { x1: m.l, x2: W - m.r, y1: m.t + i * ch, y2: m.t + i * ch, class: i === 5 ? 'axis' : 'gridline' }, g);
    }
    for (let i = 1; i <= 5; i++) {
      const tx = el('text', { x: m.l + (i - 0.5) * cw, y: H - m.b + 16, 'text-anchor': 'middle' }, g); tx.textContent = i;
      const ty = el('text', { x: m.l - 10, y: m.t + (5 - i + 0.5) * ch + 4, 'text-anchor': 'end' }, g); ty.textContent = i;
    }
    const ax = el('text', { x: m.l + (W - m.l - m.r) / 2, y: H - 6, 'text-anchor': 'middle', class: 'lbl' }, g); ax.textContent = 'Urgence →';
    const ay = el('text', { x: 12, y: m.t + (H - m.t - m.b) / 2, 'text-anchor': 'middle', class: 'lbl', transform: `rotate(-90 12 ${m.t + (H - m.t - m.b) / 2})` }, g); ay.textContent = 'Impact →';
    const cells = {};
    SIGNALS.forEach((s) => { const k = s.urgence + '-' + s.impact; (cells[k] = cells[k] || []).push(s); });
    Object.entries(cells).forEach(([k, list]) => {
      const [u, i] = k.split('-').map(Number);
      const x0 = m.l + (u - 1) * cw, y0 = m.t + (5 - i) * ch;
      const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols);
      const step = Math.min((cw - 12) / cols, (ch - 12) / rows, 22);
      const r = Math.max(3.5, Math.min(7, step / 2 - 1.5));
      list.sort((a, b) => b.signal_faible - a.signal_faible).forEach((s, j) => {
        const cx = x0 + cw / 2 + ((j % cols) - (cols - 1) / 2) * step;
        const cy = y0 + ch / 2 + (Math.floor(j / cols) - (rows - 1) / 2) * step;
        el('circle', { cx, cy, r, fill: cssVar(s.signal_faible ? '--s2' : '--s1'), stroke: cssVar('--surface'), 'stroke-width': 2 }, g);
        const hit = el('circle', { cx, cy, r: Math.max(r + 4, 9), class: 'hit', tabindex: 0 }, g);
        hit.addEventListener('mousemove', (e) => showTip(e, sigTip(s)));
        hit.addEventListener('mouseleave', hideTip);
        hit.addEventListener('click', () => { hideTip(); openSignal(s.id); });
      });
    });
    $('#matrixLegend').innerHTML = `<span><i style="background:var(--s1)"></i>Signal établi</span><span><i style="background:var(--s2)"></i>Signal faible</span><span><i style="background:var(--critical);opacity:.35;border-radius:2px"></i>Zone d'action prioritaire (impact et urgence ≥ 4)</span>`;
  })();

  /* ---------- Thermomètre ---------- */
  const themesSorted = D.themes.slice().sort((a, b) => b.temperature - a.temperature || b.signaux.length - a.signaux.length);
  const arrow = { hausse: '↗ hausse', stable: '→ stable', baisse: '↘ baisse' };
  $('#thermo').innerHTML = themesSorted.map((t) => `<div class="thermo-row" data-theme="${esc(t.theme)}" title="${esc(label(t.theme))} : ${t.temperature}/5">
      <div class="thermo-name">${esc(label(t.theme))}</div>
      <div class="thermo-track" aria-label="${t.temperature} sur 5">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= t.temperature ? 'on' + i : ''}"></span>`).join('')}</div>
      <div class="trend">${arrow[t.tendance] || ''}</div></div>`).join('');
  $('#thermo').addEventListener('click', (e) => { const r = e.target.closest('.thermo-row'); if (r) { selectTheme(r.dataset.theme); $('#themes').scrollIntoView(); } });

  /* ---------- Signaux par thème (barres empilées horizontales) ---------- */
  (function byTheme() {
    const rows = D.themes.map((t) => ({ k: t.theme, weak: t.signaux.filter((s) => s.signal_faible).length, all: t.signaux.length }))
      .sort((a, b) => b.all - a.all);
    const W = 520, rowH = 24, m = { l: 200, r: 34, t: 4, b: 4 }, H = m.t + m.b + rows.length * rowH;
    const max = Math.max(1, ...rows.map((r) => r.all));
    const sx = (v) => (v / max) * (W - m.l - m.r);
    const g = svg(W, H, $('#byTheme'));
    rows.forEach((r, i) => {
      const y = m.t + i * rowH + 4, h = rowH - 8;
      const t = el('text', { x: m.l - 8, y: y + h / 2 + 4, 'text-anchor': 'end', class: 'lbl' }, g); t.textContent = label(r.k);
      const est = r.all - r.weak;
      if (est) el('rect', { x: m.l, y, width: Math.max(0, sx(est) - (r.weak ? 1 : 0)), height: h, rx: 3, fill: cssVar('--s1') }, g);
      if (r.weak) el('rect', { x: m.l + sx(est) + (est ? 1 : 0), y, width: Math.max(0, sx(r.weak) - (est ? 1 : 0)), height: h, rx: 3, fill: cssVar('--s2') }, g);
      const v = el('text', { x: m.l + sx(r.all) + 6, y: y + h / 2 + 4, class: 'val' }, g); v.textContent = r.all;
      const hit = el('rect', { x: 0, y: y - 4, width: W, height: rowH, class: 'hit' }, g);
      hit.addEventListener('mousemove', (e) => showTip(e, `<b>${esc(label(r.k))}</b><span class="m">${r.all} signaux, dont ${r.weak} faible${r.weak > 1 ? 's' : ''}</span>`));
      hit.addEventListener('mouseleave', hideTip);
      hit.addEventListener('click', () => { hideTip(); $('#fTheme').value = r.k; renderSignals(); $('#explorer').scrollIntoView(); });
    });
    $('#byThemeLegend').innerHTML = `<span><i style="background:var(--s1)"></i>Signaux établis</span><span><i style="background:var(--s2)"></i>Signaux faibles</span>`;
  })();

  /* ---------- Chronologie ---------- */
  (function timeline() {
    const days = [];
    for (let d = 1; d <= 23; d++) days.push('2026-10-' + String(d).padStart(2, '0'));
    const counts = days.map((d) => SIGNALS.filter((s) => (s.date || '').slice(0, 10) === d));
    const before = SIGNALS.filter((s) => (s.date || '') < '2026-10-01').length;
    const W = 520, H = 170, m = { l: 26, r: 8, t: 10, b: 26 };
    const max = Math.max(1, ...counts.map((c) => c.length));
    const bw = (W - m.l - m.r) / days.length;
    const g = svg(W, H, $('#timeline'));
    const sy = (v) => H - m.b - (v / max) * (H - m.t - m.b);
    [0, Math.ceil(max / 2), max].forEach((v) => {
      el('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: v === 0 ? 'axis' : 'gridline' }, g);
      const t = el('text', { x: m.l - 6, y: sy(v) + 4, 'text-anchor': 'end' }, g); t.textContent = v;
    });
    counts.forEach((c, i) => {
      const x = m.l + i * bw + 1;
      if (c.length) {
        const y = sy(c.length), h = H - m.b - y;
        el('path', { d: `M${x},${H - m.b} V${y + 3} q0,-3 3,-3 H${x + bw - 5} q3,0 3,3 V${H - m.b} Z`, fill: cssVar('--s1') }, g);
      }
      if (i % 3 === 0 || i === days.length - 1) { const t = el('text', { x: x + bw / 2 - 1, y: H - m.b + 15, 'text-anchor': 'middle' }, g); t.textContent = i + 1; }
      const hit = el('rect', { x: m.l + i * bw, y: m.t, width: bw, height: H - m.t - m.b, class: 'hit' }, g);
      hit.addEventListener('mousemove', (e) => showTip(e, `<b>${i + 1} octobre 2026 — ${c.length} signal${c.length > 1 ? 'aux' : ''}</b><span class="m">${c.slice(0, 5).map((s) => '· ' + esc(s.titre)).join('<br>')}${c.length > 5 ? '<br>…' : ''}</span>`));
      hit.addEventListener('mouseleave', hideTip);
    });
    if (before) $('#timelineNote').textContent = `Hors graphique : ${before} signaux antérieurs au 1er octobre, conservés car ils structurent les débats du mois.`;
  })();

  /* ---------- Nature des signaux ---------- */
  (function byType() {
    const c = {};
    SIGNALS.forEach((s) => { c[s.type] = (c[s.type] || 0) + 1; });
    const rows = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const W = 520, rowH = 22, m = { l: 200, r: 34 }, H = rows.length * rowH;
    const max = Math.max(1, ...rows.map((r) => r[1]));
    const g = svg(W, H, $('#byType'));
    rows.forEach(([k, v], i) => {
      const y = i * rowH + 4, h = rowH - 8;
      const t = el('text', { x: m.l - 8, y: y + h / 2 + 4, 'text-anchor': 'end', class: 'lbl' }, g); t.textContent = k;
      el('rect', { x: m.l, y, width: (v / max) * (W - m.l - m.r), height: h, rx: 3, fill: cssVar('--seq-4') }, g);
      const tv = el('text', { x: m.l + (v / max) * (W - m.l - m.r) + 6, y: y + h / 2 + 4, class: 'val' }, g); tv.textContent = v;
      const hit = el('rect', { x: 0, y: y - 4, width: W, height: rowH, class: 'hit' }, g);
      hit.addEventListener('click', () => { $('#fType').value = k; renderSignals(); $('#explorer').scrollIntoView(); });
      hit.addEventListener('mousemove', (e) => showTip(e, `<b>${esc(k)}</b><span class="m">${v} signaux · cliquer pour filtrer</span>`));
      hit.addEventListener('mouseleave', hideTip);
    });
  })();

  /* ---------- Rapport de force ---------- */
  const POSTURE = { 'soutien': '--good', 'soutien conditionnel': '--s1', 'abstention probable': '--warning', 'opposition': '--serious', 'censure envisagée': '--critical' };
  $('#forcesTable').innerHTML = `<thead><tr><th>Groupe</th><th>Posture</th><th>Position sur le budget</th><th>Ligne rouge</th></tr></thead><tbody>` +
    (S.rapport_de_force || []).map((r) => `<tr><td><b>${esc(r.groupe)}</b></td><td><span class="posture" style="--c:var(${POSTURE[r.posture] || '--muted'})">${esc(r.posture)}</span></td><td>${esc(r.position_budget)}</td><td>${esc(r.ligne_rouge)}</td></tr>`).join('') + '</tbody>';

  /* ---------- Scénarios ---------- */
  $('#scenList').innerHTML = (S.scenarios || []).slice().sort((a, b) => b.probabilite - a.probabilite).map((s) => `<div class="scen-item">
      <div class="scen-top"><b>${esc(s.nom)}</b><span class="p">${s.probabilite} %</span></div>
      <div class="bar" role="img" aria-label="Probabilité ${s.probabilite} %"><span style="width:${s.probabilite}%"></span></div>
      <p>${esc(s.description)}</p>
      <div class="tags">${(s.declencheurs || []).map((d) => `<span class="tag">${esc(d)}</span>`).join('')}</div></div>`).join('');

  /* ---------- Calendrier ---------- */
  const cal = (S.calendrier || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  $('#calList').innerHTML = cal.map((c) => `<li><div class="d">${fmtDate(c.date)}<small>${esc(label(c.theme))}</small></div>
      <div>${esc(c.evenement)}<span class="crit" title="Criticité ${c.criticite}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= c.criticite ? 'on' : ''}"></i>`).join('')}</span></div></li>`).join('');

  /* ---------- Dynamiques transverses ---------- */
  $('#dynList').innerHTML = (S.dynamiques_transverses || []).map((d) => `<div class="card dyn"><h3>${esc(d.titre)}</h3><p>${esc(d.analyse)}</p>
      <div class="tags">${(d.themes || []).map((t) => `<span class="tag theme">${esc(label(t))}</span>`).join('')}</div></div>`).join('');

  /* ---------- Analyse par thème ---------- */
  $('#themeTabs').innerHTML = themesSorted.map((t) => `<button role="tab" data-theme="${esc(t.theme)}" aria-selected="false">${esc(label(t.theme))}</button>`).join('');
  $('#themeTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) selectTheme(b.dataset.theme); });
  function selectTheme(k) {
    const t = D.themes.find((x) => x.theme === k);
    if (!t) return;
    document.querySelectorAll('#themeTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.theme === k)));
    const ech = (t.echeances || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    $('#themePanel').innerHTML = `<p class="synth">${esc(t.synthese)}</p>
      <div class="tags" style="margin-bottom:18px"><span class="tag">Température ${t.temperature}/5</span><span class="tag">Tendance : ${esc(t.tendance)}</span>${(t.mots_cles || []).map((m) => `<span class="tag">${esc(m)}</span>`).join('')}</div>
      <div class="grid-3">
        <div><h3 style="margin-bottom:10px">Signaux</h3><ul class="actors">${t.signaux.slice().sort((a, b) => score(b) - score(a)).map((s) => `<li><a href="#" data-id="${esc(s.id)}"><b>${esc(s.titre)}</b></a><span>${fmtDate(s.date)} · impact ${s.impact} · urgence ${s.urgence}${s.signal_faible ? ' · faible' : ''}</span></li>`).join('')}</ul></div>
        <div><h3 style="margin-bottom:10px">Acteurs clés</h3><ul class="actors">${(t.acteurs_cles || []).slice().sort((a, b) => b.influence - a.influence).map((a) => `<li><b>${esc(a.nom)}</b><span>${esc(a.fonction)} — ${esc(a.position)}</span></li>`).join('')}</ul></div>
        <div><h3 style="margin-bottom:10px">Échéances</h3><ul class="actors">${ech.map((e) => `<li><b>${fmtDate(e.date)} — ${esc(e.evenement)}</b><span>${esc(e.enjeu)}</span></li>`).join('')}</ul></div>
      </div>`;
  }
  $('#themePanel').addEventListener('click', (e) => { const a = e.target.closest('a[data-id]'); if (a) { e.preventDefault(); openSignal(a.dataset.id); } });
  if (themesSorted[0]) selectTheme(themesSorted[0].theme);

  /* ---------- Explorateur ---------- */
  const fTheme = $('#fTheme'), fType = $('#fType');
  themesSorted.forEach((t) => fTheme.add(new Option(label(t.theme), t.theme)));
  [...new Set(SIGNALS.map((s) => s.type))].sort().forEach((t) => fType.add(new Option(t, t)));
  const dots = (n) => `<span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function card(s) {
    return `<article class="sig" id="sig-${esc(s.id)}">
      <div class="sig-top"><h3>${esc(s.titre)}</h3><span class="date">${fmtDate(s.date)}</span></div>
      <div class="tags" style="margin-top:0"><span class="tag theme">${esc(label(s.theme))}</span><span class="tag">${esc(s.type)}</span><span class="tag">${esc(s.tonalite)}</span>${s.signal_faible ? '<span class="tag weak">signal faible</span>' : ''}</div>
      <p>${esc(s.resume)}</p>
      <div class="scores"><span>Impact ${dots(s.impact)}</span><span>Urgence ${dots(s.urgence)}</span></div>
      <details class="more"><summary>Analyse et sources</summary>
        <div class="k">Ce que le signal anticipe</div><p>${esc(s.anticipation)}</p>
        <div class="k">Implications affaires publiques</div><p>${esc(s.implications)}</p>
        <div class="k">Acteurs</div><p>${(s.acteurs || []).map(esc).join(' · ')}</p>
        <div class="k">Sources</div><ul>${(s.sources || []).map((x) => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.titre)}</a> — ${esc(x.media)}, ${fmtDate(x.date)}</li>`).join('')}</ul>
      </details></article>`;
  }
  function renderSignals() {
    const q = norm($('#q').value), th = fTheme.value, ty = fType.value, imp = +$('#fImpact').value, weak = $('#fWeak').checked;
    const list = SIGNALS.filter((s) => (!th || s.theme === th) && (!ty || s.type === ty) && s.impact >= imp && (!weak || s.signal_faible) &&
      (!q || norm([s.titre, s.resume, s.anticipation, s.implications, (s.acteurs || []).join(' '), label(s.theme)].join(' ')).includes(q)));
    list.sort($('#fSort').value === 'date' ? (a, b) => String(b.date).localeCompare(String(a.date)) : (a, b) => score(b) - score(a) || String(b.date).localeCompare(String(a.date)));
    $('#count').textContent = `${list.length} signal${list.length > 1 ? 'aux' : ''} sur ${SIGNALS.length}`;
    $('#signals').innerHTML = list.map(card).join('') || '<p class="count">Aucun signal ne correspond à ces filtres.</p>';
  }
  ['#q', '#fTheme', '#fType', '#fImpact', '#fSort', '#fWeak'].forEach((s) => $(s).addEventListener('input', renderSignals));
  renderSignals();

  function openSignal(id) {
    ['#q', '#fTheme', '#fType'].forEach((s) => { $(s).value = ''; });
    $('#fImpact').value = '1'; $('#fWeak').checked = false;
    renderSignals();
    const n = document.getElementById('sig-' + id);
    if (!n) return;
    n.querySelector('details').open = true;
    n.scrollIntoView({ block: 'center' });
    n.classList.add('flash'); setTimeout(() => n.classList.remove('flash'), 1800);
  }

  /* ---------- Recommandations, vigilance, acteurs ---------- */
  $('#recoList').innerHTML = (S.recommandations || []).map((r) => `<li>${esc(r.action)}<small>Cible : ${esc(r.cible)} · Horizon : ${esc(r.horizon)}</small></li>`).join('');
  $('#vigList').innerHTML = (S.points_de_vigilance || []).map((v) => `<li>${esc(v)}</li>`).join('');

  const ACTORS = D.themes.flatMap((t) => (t.acteurs_cles || []).map((a) => Object.assign({ theme: label(t.theme) }, a)));
  let sortKey = 'influence', sortDir = -1;
  function renderActors() {
    const cols = [['nom', 'Acteur'], ['fonction', 'Fonction'], ['theme', 'Thème'], ['influence', 'Influence'], ['position', 'Position']];
    const rows = ACTORS.slice().sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
    $('#actorsTable').innerHTML = `<thead><tr>${cols.map(([k, l]) => `<th class="sortable" data-k="${k}" aria-sort="${k === sortKey ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${k === sortKey ? (sortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead><tbody>` +
      rows.map((a) => `<tr><td><b>${esc(a.nom)}</b></td><td>${esc(a.fonction)}</td><td>${esc(a.theme)}</td><td class="num">${dots(a.influence)}</td><td>${esc(a.position)}</td></tr>`).join('') + '</tbody>';
  }
  $('#actorsTable').addEventListener('click', (e) => {
    const th = e.target.closest('th[data-k]'); if (!th) return;
    if (sortKey === th.dataset.k) sortDir = -sortDir; else { sortKey = th.dataset.k; sortDir = th.dataset.k === 'influence' ? -1 : 1; }
    renderActors();
  });
  renderActors();

  $('#foot').innerHTML = `Veille média affaires publiques — France, octobre 2026. Données : <a href="data/veille.json">data/veille.json</a>. Réalisée par un dispositif multi-agents (recherche, vérification, synthèse) ; les appréciations d'impact, d'urgence et de probabilité relèvent de l'analyse et doivent être confrontées aux sources citées.`;
})();
