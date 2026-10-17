/* Sonor Takeover — app logic  v0.1.1 (2026-10-17: the shared project bar 1.14.0 is the picker — ● has-a-proposal via
   decorateOption, unsaved-edits guard via beforeChange, the bar's + New hidden; #project= hash, ?pid= and the old
   sonor_takeover_project memory still open a project)
   v0.1.0 (2026-10-16)
   The takeover survey / proposal (B-553): one editable proposal per project in `takeover_proposals`, in the client's language,
   mirrored to the WeQuote quote that carries every price. Laws (CLAUDE.md): prices are NEVER typed here — WeQuote is the SSOT;
   sections print in service order 01 → 10 (derived from service_nn, no handles); EN is approved first, the client language is
   the final output; subcontractors live in internal_notes only; one proposal row ↔ one WQ quote.
   Seams: SonorShell (chrome/toasts/db), SonorProjectList (picker order), SonorWQClient (read-only proxy), TakeoverPdf (export),
   service_contract_tiers (tier table), storage `site-photos` (survey photos). */
(function (global) {
  'use strict';
  var CFG = global.__TAKEOVER_CONFIG__ || {};
  var BRAND = global.__SONOR_BRAND__ || {};
  var LS_PROJECT = 'sonor_takeover_project', LS_TAB = 'sonor_takeover_tab', LS_LANG = 'sonor_takeover_lang';
  var S = { db: null, ready: false, projects: [], proposals: [], tiers: [], tierAspects: {}, cur: null, project: null, lang: 'en', dirty: false, wq: { lines: null, at: null, quoteId: null }, mirror: null };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function toast(msg, kind) { if (global.SonorShell && global.SonorShell.toast) global.SonorShell.toast(msg, { kind: kind || 'info' }); else console.log('[toast]', msg); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function svcHex(nn) { var s = (BRAND.services || []).find(function (x) { return x.nn === String(nn); }); return s ? s.hex : null; }
  function svcName(nn) { var s = (BRAND.services || []).find(function (x) { return x.nn === String(nn); }); return s ? s.core : nn; }
  function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
  function L(obj) { obj = obj || {}; var v = obj[S.lang]; return v == null ? (Array.isArray(obj.en) ? [] : '') : v; }
  function lines(txt) { return String(txt || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
  function gbp(n) { return n == null || isNaN(n) ? '—' : '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }

  // ── tabs ──
  function goTab(t) {
    $$('.tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
    $$('.tab-pane').forEach(function (p) { p.classList.toggle('active', p.id === 'tab-' + t); });
    try { localStorage.setItem(LS_TAB, t); } catch (e) {}
    if (t === 'mirror' && S.cur && !S.mirror) checkMirror();
  }

  // ── template → new proposal ──
  function newFromTemplate(project) {
    var meta = (project && project.metadata) || {}, langClient = meta.client_language || (meta.occupancy || {}).language || 'en';
    var p = {
      id: uid(), project_id: project.id, status: 'draft', lang_primary: 'en', lang_client: langClient,
      wq_quote_id: meta.wequote_quote_id || null, wq_quote_no: ((meta.wequote_quotes || [])[0] || {}).quote_no || null,
      title: { en: 'Smart home system takeover', es: 'Toma de control del sistema domótico' },
      subtitle: { en: '', es: '' }, summary: { en: [], es: [] },
      sections: (CFG.template || []).map(function (t, i) {
        return { key: t.key, service_nn: t.service_nn, sort: (i + 1) * 10, kind: t.kind || 'works', wq_area: null, wq_structure_id: null, title: Object.assign({}, t.title), do: { en: [], es: [] }, result: { en: '', es: '' }, label: { en: '', es: '' }, lines: [], photos: [] };
      }),
      assumptions: { en: [], es: [] }, next_steps: { en: [], es: [] }, line_labels: { en: {}, es: {} },
      options: { tiers_show: false, tier_proposed: null, segment: 'residential', attention: project.client_name || '', ref: project.ref || '', doc_type: { en: CFG.ui.en.doc_type, es: CFG.ui.es.doc_type }, es_stale: false },
      mirror: {}, internal_notes: [], metadata: { created_by: 'takeover ' + CFG.version }
    };
    return p;
  }

  // ── load ──
  async function loadAll() {
    if (!S.ready) { toast('Supabase not reachable — nothing to edit offline', 'warn'); return; }
    var c = S.db.client;
    var r = await Promise.all([
      c.from('projects').select('id, ref, name, client_name, client_email, address, postcode, status, metadata, updated_at, created_at').order('updated_at', { ascending: false }).limit(1000),
      c.from(CFG.table || 'takeover_proposals').select('*').order('updated_at', { ascending: false }),
      c.from('service_contract_tiers').select('*').order('sort_order'),
      c.from('service_contract_tier_aspects').select('*')
    ]);
    r.forEach(function (x) { if (x.error) toast(x.error.message, 'error'); });
    S.projects = r[0].data || []; S.proposals = r[1].data || []; S.tiers = (r[2].data || []).filter(function (t) { return (t.metadata || {}).segment == null || (t.metadata || {}).segment === 'residential'; });
    S.tierAspects = {}; (r[3].data || []).forEach(function (a) { (S.tierAspects[a.tier_key] = S.tierAspects[a.tier_key] || {})[a.aspect_key] = a; });
    var want = (location.hash.match(/project=([0-9a-f-]{36})/) || [])[1];
    var PB = global.SonorProjectBar;
    if (PB && PB.init) {
      try {
        await PB.init({
          supa: c, appKey: 'takeover', host: $('#projectBarHost'), showNew: false,   // + New in the tab bar starts a PROPOSAL, not a project
          decorateOption: function (p) { return hasProposal(p.id) ? { prefix: '● ', title: 'Has a takeover proposal' } : ''; },
          beforeChange: function (newId) { return !(S.dirty && S.cur && S.cur.project_id !== newId) || confirm('Discard unsaved changes to the current proposal?'); },
          onChange: function (d) {
            var id = d && d.currentId || null;
            if (S.project && S.project.id === id) return;
            if (d && d.fromOtherTab && S.dirty) { toast('Another Takeover tab switched project — this tab keeps your unsaved proposal', 'warn'); return; }
            selectProject(id);
          }
        });
      } catch (e) { console.warn('[takeover] project bar', e); }
      if (!want && PB.getActiveId) want = PB.getActiveId();   // ?pid= deep link or this app's own memory
    }
    if (!want) want = (function () { try { return localStorage.getItem(LS_PROJECT); } catch (e) { return null; } })();   // pre-0.1.1 memory
    var has = S.projects.find(function (p) { return p.id === want; }) || S.projects.find(function (p) { return hasProposal(p.id); }) || S.projects[0];
    selectProject(has ? has.id : null);
  }
  function hasProposal(id) { return S.proposals.some(function (q) { return q.project_id === id; }); }
  // the shared bar is the picker (v0.1.1); keep it showing the selected project + fresh ● marks
  function syncBar(id) {
    var PB = global.SonorProjectBar; if (!PB || !PB.getActiveId) return;
    if (id && PB.getActiveId() !== id) PB.setActive(id);   // onChange → selectProject returns early (same id)
    else if (PB.rerender) PB.rerender();
  }
  function selectProject(id) {
    S.project = S.projects.find(function (p) { return p.id === id; }) || null; S.mirror = null; S.wq = { lines: null, at: null, quoteId: null }; S.dirty = false;
    S.cur = S.project ? (S.proposals.find(function (q) { return q.project_id === id && q.status !== 'superseded'; }) || S.proposals.find(function (q) { return q.project_id === id; }) || null) : null;
    syncBar(id);
    try { if (id) localStorage.setItem(LS_PROJECT, id); } catch (e) {}
    if (S.cur && S.cur.lang_client && S.cur.lang_client !== 'en' && S.lang !== 'en' && S.lang !== S.cur.lang_client) S.lang = 'en';
    render();
  }

  // ── render ──
  function render() {
    var has = !!S.cur;
    $('#noProposal').style.display = has ? 'none' : ''; $('#editor').style.display = has ? '' : 'none';
    renderLangPick(); renderStatus();
    if (!has) { $('#mirrorBody').innerHTML = ''; $('#mirrorCount').textContent = '–'; return; }
    var p = S.cur, pr = S.project || {};
    $('#docH').textContent = 'Document — ' + (S.lang === 'en' ? 'English' : (CFG.languages.find(function (l) { return l.key === S.lang; }) || {}).label);
    $('#langNote').textContent = S.lang === 'en' ? 'English is approved first; translate once approved.' : (p.options.es_stale ? '⚠ English changed since this translation — review before export.' : 'Client-language final.');
    $('#f_title').value = L(p.title); $('#f_subtitle').value = L(p.subtitle); $('#f_summary').value = (L(p.summary) || []).join('\n');
    $('#f_assumptions').value = (L(p.assumptions) || []).join('\n'); $('#f_next').value = (L(p.next_steps) || []).join('\n');
    $('#f_doctype').value = L(p.options.doc_type || {}) || ''; $('#o_attention').value = p.options.attention || ''; $('#o_ref').value = p.options.ref || '';
    $('#k_client').textContent = pr.client_name || '—'; $('#k_site').textContent = [pr.address, pr.postcode].filter(Boolean).join(', ') || pr.name || '—';
    $('#k_lang').textContent = (CFG.languages.find(function (l) { return l.key === p.lang_client; }) || {}).label || p.lang_client;
    $('#o_tiers_show').checked = !!p.options.tiers_show;
    $('#o_tier').innerHTML = '<option value="">—</option>' + S.tiers.map(function (t) { return '<option value="' + t.key + '"' + (p.options.tier_proposed === t.key ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
    $('#f_internal').value = (p.internal_notes || []).join('\n');
    $('#o_status').innerHTML = (CFG.statuses || []).map(function (s) { return '<option value="' + s.key + '"' + (p.status === s.key ? ' selected' : '') + '>' + s.label + '</option>'; }).join('');
    $('#o_lang_client').innerHTML = (CFG.languages || []).map(function (l) { return '<option value="' + l.key + '"' + (p.lang_client === l.key ? ' selected' : '') + '>' + l.label + '</option>'; }).join('');
    $('#o_wq_id').value = p.wq_quote_id || ''; $('#o_wq_no').value = p.wq_quote_no || '';
    renderSections(); renderMirror();
  }
  function renderLangPick() {
    var el = $('#langPick'); if (!el) return;
    var langs = ['en'].concat(S.cur && S.cur.lang_client && S.cur.lang_client !== 'en' ? [S.cur.lang_client] : []);
    el.innerHTML = langs.map(function (k) { var lab = (CFG.languages.find(function (l) { return l.key === k; }) || { label: k }).label; return '<button data-lang="' + k + '" class="' + (S.lang === k ? 'on' : '') + '">' + esc(lab) + (k !== 'en' && S.cur && S.cur.options && S.cur.options.es_stale ? '<span class="stale" title="English changed since this translation"></span>' : '') + '</button>'; }).join('');
    $$('button', el).forEach(function (b) { b.onclick = function () { S.lang = b.dataset.lang; try { localStorage.setItem(LS_LANG, S.lang); } catch (e) {} render(); }; });
  }
  function renderStatus() {
    var pill = $('#statusPill'); if (!pill) return;
    if (!S.cur) { pill.className = 'pill pill-grey'; pill.textContent = '—'; return; }
    var st = (CFG.statuses || []).find(function (s) { return s.key === S.cur.status; }) || { label: S.cur.status, pill: 'pill-grey' };
    pill.className = 'pill ' + st.pill; pill.textContent = st.label + (S.dirty ? ' · unsaved' : '');
  }
  function sortedSections() { return (S.cur.sections || []).slice().sort(function (a, b) { return (a.service_nn || '99').localeCompare(b.service_nn || '99') || (a.sort || 0) - (b.sort || 0); }); }
  function renderSections() {
    var host = $('#secList'); host.innerHTML = '';
    var secs = sortedSections(), n = 0;
    secs.forEach(function (s) {
      if (s.kind !== 'noted') n++;
      var hex = svcHex(s.service_nn), card = document.createElement('div'); card.className = 'sec' + (s._open ? '' : ' collapsed'); card.dataset.key = s.key; if (hex) card.style.setProperty('--svc', hex);
      card.innerHTML =
        '<div class="sec-head">' +
          '<span class="n" title="' + esc(svcName(s.service_nn)) + '">' + (s.kind === 'noted' ? esc(L(s.label) || 'noted') : ('§' + String(n).padStart(2, '0'))) + '</span>' +
          '<input class="input title" data-f="title" value="' + esc(L(s.title)) + '" placeholder="Section title">' +
          '<select class="select" data-f="service_nn">' + (CFG.serviceOrder || []).map(function (nn) { return '<option value="' + nn + '"' + (s.service_nn === nn ? ' selected' : '') + '>' + esc(svcName(nn)) + '</option>'; }).join('') + '</select>' +
          '<select class="select" data-f="kind"><option value="works"' + (s.kind === 'works' ? ' selected' : '') + '>Works</option><option value="noted"' + (s.kind === 'noted' ? ' selected' : '') + '>Noted only</option></select>' +
          '<span class="row"><button class="btn btn-sm" data-act="toggle">' + (s._open ? '▾' : '▸') + '</button><button class="btn btn-sm" data-act="del" title="Remove section">✕</button></span>' +
        '</div>' +
        '<div class="sec-body">' +
          '<div class="fld span2"><span class="field-label">What we will do — one bullet per line</span><textarea class="input lines" data-f="do">' + esc((L(s.do) || []).join('\n')) + '</textarea></div>' +
          '<div class="fld"><span class="field-label">Outcome</span><textarea class="input" data-f="result">' + esc(L(s.result)) + '</textarea></div>' +
          '<div class="fld"><span class="field-label">WeQuote area — structure id (from the push) and name</span><div class="row"><input class="input mono" data-f="wq_structure_id" style="width:110px" value="' + esc(s.wq_structure_id || '') + '" placeholder="#id"><input class="input mono" data-f="wq_area" value="' + esc(s.wq_area || '') + '" placeholder="e.g. 1 · Network — reset & recommission"></div><span class="field-label" style="margin-top:6px">Eyebrow label (noted sections)</span><input class="input" data-f="label" value="' + esc(L(s.label)) + '"></div>' +
          '<div class="span2"><div class="row spread"><span class="field-label">Expected WeQuote lines <span class="tag">no prices here</span></span><button class="btn btn-sm" data-act="addline">+ Line</button></div>' + linesTable(s) + '</div>' +
          '<div class="span2"><div class="row spread"><span class="field-label">Photos (from the Survey app — storage <code>' + esc((CFG.storage || {}).photos || 'site-photos') + '</code>)</span><button class="btn btn-sm" data-act="photos">＋ Pick from survey</button></div><div class="photos" data-photos>' + (s.photos || []).map(function (ph, i) { return '<div class="photo"><img src="' + esc(photoUrl(ph.path)) + '" loading="lazy"><input class="input cap" data-ph="' + i + '" value="' + esc(L(ph.caption || {}))+ '" placeholder="Caption"><button class="btn btn-sm" data-phdel="' + i + '" style="position:absolute;top:2px;right:2px">✕</button></div>'; }).join('') + '</div></div>' +
        '</div>';
      host.appendChild(card);
      wireSection(card, s);
    });
  }
  function linesTable(s) {
    var rows = (s.lines || []).map(function (l, i) {
      return '<tr data-i="' + i + '"><td><input class="input pid mono" data-lf="product_id" value="' + esc(l.product_id == null ? '' : l.product_id) + '" placeholder="WQ id"></td>' +
        '<td><input class="input" data-lf="wq_name" value="' + esc(l.wq_name || '') + '" placeholder="WeQuote product name"></td>' +
        '<td><input class="input" data-lf="label" value="' + esc(((S.cur.line_labels || {})[S.lang] || {})[String(l.product_id == null ? (l.label_key || '') : l.product_id)] || '') + '" placeholder="Client label (' + S.lang + ')"></td>' +
        '<td><input class="input num" data-lf="qty" type="number" step="0.5" value="' + esc(l.qty == null ? '' : l.qty) + '"></td>' +
        '<td><select class="select" data-lf="unit">' + ['', 'h', 'day', 'yr', 'ea'].map(function (u) { return '<option value="' + u + '"' + ((l.unit || '') === u ? ' selected' : '') + '>' + (u || '—') + '</option>'; }).join('') + '</select></td>' +
        '<td class="chk"><input type="checkbox" data-lf="provisional"' + (l.provisional ? ' checked' : '') + '></td><td class="chk"><input type="checkbox" data-lf="optional"' + (l.optional ? ' checked' : '') + '></td>' +
        '<td><input class="input" data-lf="note" value="' + esc(l.note || '') + '" placeholder="Internal note / DO-IN-WEQUOTE"></td><td><button class="btn btn-sm" data-ldel="' + i + '">✕</button></td></tr>';
    }).join('');
    return '<table class="lines-tbl"><thead><tr><th>WQ id</th><th>WeQuote name</th><th>Client label</th><th>Qty</th><th>Unit</th><th>Prov.</th><th>Opt.</th><th>Note (internal)</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="9" class="muted">No lines — a section with no WeQuote lines prints without prices (demarcation / noted).</td></tr>') + '</tbody></table>';
  }
  function photoUrl(path) {
    if (!path) return ''; var bucket = (CFG.storage || {}).photos || 'site-photos'; var rel = String(path).replace(new RegExp('^' + bucket + '/'), '');
    try { return S.db.client.storage.from(bucket).getPublicUrl(rel).data.publicUrl; } catch (e) { return ''; }
  }
  function touched(isText) { S.dirty = true; if (isText && S.lang === 'en' && S.cur.lang_client && S.cur.lang_client !== 'en') S.cur.options.es_stale = true; renderStatus(); }
  function wireSection(card, s) {
    card.querySelector('[data-act="toggle"]').onclick = function () { s._open = !s._open; renderSections(); };
    card.querySelector('[data-act="del"]').onclick = function () { if (!confirm('Remove section "' + L(s.title) + '"?')) return; S.cur.sections = S.cur.sections.filter(function (x) { return x !== s; }); touched(true); renderSections(); };
    card.querySelector('[data-act="addline"]').onclick = function () { s.lines = s.lines || []; s.lines.push({ product_id: null, wq_name: '', qty: 1, unit: '', provisional: false, optional: false, needs_product: null, note: '' }); s._open = true; touched(); renderSections(); };
    card.querySelector('[data-act="photos"]').onclick = function () { pickPhotos(s); };
    $$('[data-f]', card).forEach(function (el) {
      el.oninput = el.onchange = function () {
        var f = el.dataset.f, v = el.value;
        if (f === 'title' || f === 'result' || f === 'label') { s[f] = s[f] || {}; s[f][S.lang] = v; touched(true); }
        else if (f === 'do') { s.do = s.do || {}; s.do[S.lang] = lines(v); touched(true); }
        else if (f === 'service_nn') { s.service_nn = v; touched(); renderSections(); }
        else if (f === 'kind') { s.kind = v; touched(); renderSections(); }
        else if (f === 'wq_structure_id') { s.wq_structure_id = v === '' ? null : +v; touched(); S.mirror = null; }
        else { s[f] = v || null; touched(); S.mirror = null; }
      };
    });
    $$('tr[data-i]', card).forEach(function (tr) {
      var l = s.lines[+tr.dataset.i];
      $$('[data-lf]', tr).forEach(function (el) {
        el.oninput = el.onchange = function () {
          var f = el.dataset.lf;
          if (f === 'provisional' || f === 'optional') l[f] = el.checked;
          else if (f === 'qty') l.qty = el.value === '' ? null : +el.value;
          else if (f === 'product_id') { l.product_id = el.value === '' ? null : +el.value; S.mirror = null; }
          else if (f === 'label') { var k = String(l.product_id == null ? (l.label_key || (l.label_key = 'x_' + Math.random().toString(36).slice(2, 8))) : l.product_id); S.cur.line_labels = S.cur.line_labels || {}; S.cur.line_labels[S.lang] = S.cur.line_labels[S.lang] || {}; S.cur.line_labels[S.lang][k] = el.value; touched(true); return; }
          else l[f] = el.value;
          touched();
        };
      });
    });
    $$('[data-ldel]', card).forEach(function (b) { b.onclick = function () { s.lines.splice(+b.dataset.ldel, 1); touched(); S.mirror = null; renderSections(); }; });
    $$('[data-ph]', card).forEach(function (el) { el.oninput = function () { var ph = s.photos[+el.dataset.ph]; ph.caption = ph.caption || {}; ph.caption[S.lang] = el.value; touched(true); }; });
    $$('[data-phdel]', card).forEach(function (b) { b.onclick = function () { s.photos.splice(+b.dataset.phdel, 1); touched(); renderSections(); }; });
  }

  // survey photos: list storage `<bucket>/<project_id>/survey/**` (no survey-schema coupling — the Survey app owns that)
  async function pickPhotos(s) {
    var bucket = (CFG.storage || {}).photos || 'site-photos', st = S.db.client.storage.from(bucket), base = S.project.id + '/survey', found = [];
    try {
      var top = await st.list(base, { limit: 200 }); if (top.error) throw top.error;
      for (var i = 0; i < (top.data || []).length; i++) {
        var e = top.data[i];
        if (e.id == null && !/\.(jpe?g|png|webp)$/i.test(e.name)) { var sub = await st.list(base + '/' + e.name, { limit: 500 }); (sub.data || []).forEach(function (f) { if (/\.(jpe?g|png|webp)$/i.test(f.name)) found.push(bucket + '/' + base + '/' + e.name + '/' + f.name); }); }
        else if (/\.(jpe?g|png|webp)$/i.test(e.name)) found.push(bucket + '/' + base + '/' + e.name);
      }
    } catch (e) { toast('Photo listing failed: ' + e.message, 'error'); return; }
    if (!found.length) { toast('No survey photos for this project in ' + bucket + '/' + base, 'warn'); return; }
    var have = {}; (s.photos || []).forEach(function (p) { have[p.path] = true; });
    var ov = document.createElement('div'); ov.className = 'modal-backdrop'; ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:900;display:flex;align-items:center;justify-content:center';
    ov.innerHTML = '<div class="card" style="max-width:860px;width:92vw;max-height:80vh;overflow:auto"><div class="card-header"><h2>Survey photos — tap to add</h2><button class="btn btn-sm" data-close>Done</button></div><div class="photos" style="padding:0 16px 16px">' +
      found.map(function (p) { return '<div class="photo' + (have[p] ? ' on' : '') + '" data-p="' + esc(p) + '"><img src="' + esc(photoUrl(p)) + '" loading="lazy"><div class="cap mono">' + esc(p.split('/').pop()) + '</div></div>'; }).join('') + '</div></div>';
    document.body.appendChild(ov);
    $$('.photo', ov).forEach(function (el) { el.onclick = function () { var p = el.dataset.p; if (have[p]) { s.photos = s.photos.filter(function (x) { return x.path !== p; }); delete have[p]; el.classList.remove('on'); } else { s.photos = s.photos || []; s.photos.push({ survey_page_id: (p.split('/').pop() || '').replace(/\.\w+$/, ''), path: p, caption: { en: '', es: '' } }); have[p] = true; el.classList.add('on'); } touched(); }; });
    ov.querySelector('[data-close]').onclick = function () { ov.remove(); s._open = true; renderSections(); };
  }

  // ── doc-level fields ──
  function wireGlobal() {
    $$('.tab-btn').forEach(function (b) { b.onclick = function () { goTab(b.dataset.tab); }; });
    $('#newBtn').onclick = function () { if (!S.project) return; if (S.cur && !confirm('This project already has a proposal. Start another from the template? (the current one stays; mark it Superseded on Settings)')) return; S.cur = newFromTemplate(S.project); S.proposals.unshift(S.cur); S.dirty = true; S.lang = 'en'; render(); toast('New proposal from the takeover template — edit, then Save'); };
    $('#saveBtn').onclick = function () { save(); };
    $('#pdfBtn').onclick = function () { exportPdf(); };
    $('#mirrorBtn').onclick = function () { checkMirror(true); };
    $('#addSecBtn').onclick = function () { S.cur.sections.push({ key: 'sec_' + Math.random().toString(36).slice(2, 7), service_nn: '10', sort: (S.cur.sections.length + 1) * 10, kind: 'works', wq_area: null, wq_structure_id: null, title: { en: 'New section', es: '' }, do: { en: [], es: [] }, result: { en: '', es: '' }, label: { en: '', es: '' }, lines: [], photos: [], _open: true }); touched(true); renderSections(); };
    function bindText(id, set) { $(id).oninput = function () { set(this.value); touched(true); }; }
    bindText('#f_title', function (v) { S.cur.title[S.lang] = v; });
    bindText('#f_subtitle', function (v) { S.cur.subtitle = S.cur.subtitle || {}; S.cur.subtitle[S.lang] = v; });
    bindText('#f_summary', function (v) { S.cur.summary = S.cur.summary || {}; S.cur.summary[S.lang] = lines(v); });
    bindText('#f_assumptions', function (v) { S.cur.assumptions = S.cur.assumptions || {}; S.cur.assumptions[S.lang] = lines(v); });
    bindText('#f_next', function (v) { S.cur.next_steps = S.cur.next_steps || {}; S.cur.next_steps[S.lang] = lines(v); });
    bindText('#f_doctype', function (v) { S.cur.options.doc_type = S.cur.options.doc_type || {}; S.cur.options.doc_type[S.lang] = v; });
    $('#o_attention').oninput = function () { S.cur.options.attention = this.value; touched(); };
    $('#o_ref').oninput = function () { S.cur.options.ref = this.value; touched(); };
    $('#o_tiers_show').onchange = function () { S.cur.options.tiers_show = this.checked; touched(); };
    $('#o_tier').onchange = function () { S.cur.options.tier_proposed = this.value || null; touched(); };
    $('#f_internal').oninput = function () { S.cur.internal_notes = lines(this.value); touched(); };
    $('#o_status').onchange = function () { S.cur.status = this.value; touched(); };
    $('#o_lang_client').onchange = function () { S.cur.lang_client = this.value; touched(); renderLangPick(); };
    $('#o_wq_id').oninput = function () { S.cur.wq_quote_id = this.value === '' ? null : +this.value; S.mirror = null; touched(); };
    $('#o_wq_no').oninput = function () { S.cur.wq_quote_no = this.value || null; touched(); };
    window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
    document.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); } });
  }

  // ── save: upsert the row + MERGE a pointer into projects.metadata (merge-only law; the RPC is shallow on top-level keys) ──
  async function save() {
    if (!S.cur) return; if (!S.ready) { toast('Offline — cannot save', 'error'); return; }
    var row = {}; Object.keys(S.cur).forEach(function (k) { if (k[0] !== '_') row[k] = S.cur[k]; });
    row.sections = (row.sections || []).map(function (s) { var o = {}; Object.keys(s).forEach(function (k) { if (k[0] !== '_') o[k] = s[k]; }); return o; });
    row.mirror = S.mirror ? { status: S.mirror.status, checked_at: S.mirror.at, wq_quote_id: S.mirror.quoteId, issues: S.mirror.issues.length, totals: S.mirror.totals } : (row.mirror || {});
    var r = await S.db.client.from(CFG.table || 'takeover_proposals').upsert(row, { onConflict: 'id' }).select().single();
    if (r.error) { toast('Save failed: ' + r.error.message, 'error'); return; }
    Object.assign(S.cur, r.data); S.dirty = false; renderStatus(); syncBar(S.cur.project_id);
    try {
      var patch = { takeover_proposal: { id: S.cur.id, status: S.cur.status, lang_client: S.cur.lang_client, wq_quote_id: S.cur.wq_quote_id, wq_quote_no: S.cur.wq_quote_no, updated_at: new Date().toISOString(), app: 'takeover' } };
      var rm = await S.db.client.rpc('sonor_merge_project_metadata', { p_project_id: S.cur.project_id, p_patch: patch });
      if (rm.error) throw rm.error; if (S.project) S.project.metadata = Object.assign({}, S.project.metadata || {}, patch);
    } catch (e) { toast('Saved; project pointer merge failed: ' + e.message, 'warn'); return; }
    toast('Proposal saved', 'success');
  }

  // ── WeQuote mirror — the quote is the price SSOT; the proposal's lines are the expectation ──
  function areaKey(name) { var m = String(name || '').match(/^\s*(\d+)\s*[·.\-–—]/); return m ? 'n' + m[1] : String(name || '').trim().toLowerCase(); }
  // WQ quote lines carry `structure_id` (the area), not a name. A section maps to its area by: section.wq_structure_id →
  // projects.metadata.wequote_quote_structure.areas[section.key] (written by the takeover push, same quote) → name match on wq_area.
  function wqLineKey(l) { return l.structure_id != null ? 's' + l.structure_id : areaKey(lineArea(l)); }
  function sectionKey(p, s) {
    if (s.wq_structure_id) return 's' + s.wq_structure_id;
    var st = ((S.project || {}).metadata || {}).wequote_quote_structure || {};
    if (st.areas && st.areas[s.key] && (!st.quote_id || String(st.quote_id) === String(p.wq_quote_id))) return 's' + st.areas[s.key];
    return s.wq_area ? areaKey(s.wq_area) : null;
  }
  function sectionMapped(p, s) { return !!(s.wq_structure_id || s.wq_area || ((((S.project || {}).metadata || {}).wequote_quote_structure || {}).areas || {})[s.key]); }
  function lineQty(l) { var q = l.quantity != null ? l.quantity : (l.qty != null ? l.qty : l.amount); return q == null ? null : Number(q); }
  function lineArea(l) { return l.structure_description || l.structure_name || l.area_name || l.area || l.structure || l.group_description || ''; }
  function lineOptional(l) { return !!(l.optional || l.is_optional || l.option || l.optional_item); }
  function lineTotal(l) { var q = lineQty(l) || 0, u = l.sell_price != null ? Number(l.sell_price) : (l.unit_price != null ? Number(l.unit_price) : null); if (l.total_price != null && Number(l.total_price)) return Number(l.total_price); if (l.line_total != null && Number(l.line_total)) return Number(l.line_total); return u == null ? null : q * u; }
  async function checkMirror(force) {
    if (!S.cur) return null;
    if (!S.cur.wq_quote_id) { S.mirror = { status: 'red', issues: [{ level: 'red', msg: 'No WeQuote quote linked — set the quote id on Settings' }], groups: [], totals: {}, at: new Date().toISOString(), quoteId: null }; renderMirror(); return S.mirror; }
    var el = $('#mirrorStatus'); if (el) { el.className = 'mirror-status'; el.textContent = 'Checking WeQuote…'; }
    try {
      if (!global.SonorWQClient) throw new Error('SonorWQClient missing');
      var st = global.SonorWQClient.status(); if (!st.ready) await global.SonorWQClient.init(S.db.client);
      var lines = await global.SonorWQClient.quoteLinesResolved(S.cur.wq_quote_id, !!force);
      S.wq = { lines: lines, at: new Date().toISOString(), quoteId: S.cur.wq_quote_id };
    } catch (e) { S.mirror = { status: 'red', issues: [{ level: 'red', msg: 'WeQuote read failed: ' + e.message }], groups: [], totals: {}, at: new Date().toISOString(), quoteId: S.cur.wq_quote_id }; renderMirror(); return S.mirror; }
    S.mirror = computeMirror(S.cur, S.wq.lines); renderMirror(); return S.mirror;
  }
  function computeMirror(p, wqLines) {
    var issues = [], groups = [], byArea = {};
    wqLines.forEach(function (l) { var k = wqLineKey(l); (byArea[k] = byArea[k] || { name: lineArea(l) || (l.structure_id != null ? 'structure ' + l.structure_id : 'quote'), lines: [] }).lines.push(l); });
    var claimed = {};
    sortedSections().forEach(function (s) {
      if (s.kind === 'noted' && !(s.lines || []).length) return;
      var g = { section: s, wq: null, rows: [] };
      if (sectionMapped(p, s)) { var k = sectionKey(p, s); g.wq = (k && byArea[k]) || null; if (g.wq) { claimed[k] = true; if (!g.wq.name || /^structure /.test(g.wq.name)) g.wq.name = (s.wq_area || L(s.title)) + ' · #' + k.slice(1); } if (!g.wq && (s.lines || []).some(function (l) { return l.product_id; })) issues.push({ level: 'red', msg: 'Section "' + L(s.title) + '": WeQuote area ' + (s.wq_structure_id ? '#' + s.wq_structure_id : '"' + (s.wq_area || s.key) + '"') + ' not found on quote ' + p.wq_quote_id, section: s.key }); }
      var pool = g.wq ? g.wq.lines.slice() : wqLines.slice();
      (s.lines || []).forEach(function (exp) {
        if (!exp.product_id) { if (exp.needs_product) issues.push({ level: 'amber', msg: 'Section "' + L(s.title) + '": "' + exp.wq_name + '" has no WeQuote product yet (DO-IN-WEQUOTE) — ' + exp.needs_product, section: s.key }); g.rows.push({ exp: exp, wq: null, state: 'no-product' }); return; }
        var ix = -1; for (var i = 0; i < pool.length; i++) if (String(pool[i].product_id) === String(exp.product_id) && (lineQty(pool[i]) === Number(exp.qty) || ix < 0)) { ix = i; if (lineQty(pool[i]) === Number(exp.qty)) break; }
        var w = ix >= 0 ? pool.splice(ix, 1)[0] : null;
        var state = !w ? 'missing' : (lineQty(w) !== Number(exp.qty) ? 'qty' : (exp.optional !== lineOptional(w) && (w.optional != null || w.is_optional != null) ? 'optional' : 'ok'));
        if (state === 'missing') issues.push({ level: 'red', msg: 'Section "' + L(s.title) + '": ' + exp.wq_name + ' (' + exp.product_id + ') is not on the quote', section: s.key });
        if (state === 'qty') issues.push({ level: 'amber', msg: 'Section "' + L(s.title) + '": ' + exp.wq_name + ' qty ' + exp.qty + ' expected, quote has ' + lineQty(w), section: s.key });
        if (state === 'optional') issues.push({ level: 'amber', msg: 'Section "' + L(s.title) + '": ' + exp.wq_name + ' optional flag differs (set it in the WeQuote UI)', section: s.key });
        g.rows.push({ exp: exp, wq: w, state: state });
      });
      if (g.wq) pool.forEach(function (w) { g.rows.push({ exp: null, wq: w, state: 'extra' }); issues.push({ level: 'amber', msg: 'Quote area "' + g.wq.name + '" has an extra line: ' + (w.short_description || w.description || w.product_id), section: s.key }); });
      groups.push(g);
    });
    Object.keys(byArea).forEach(function (k) { if (!claimed[k]) { issues.push({ level: 'amber', msg: 'Quote area "' + byArea[k].name + '" (' + byArea[k].lines.length + ' lines) is not mapped to any section', section: null }); groups.push({ section: null, wq: byArea[k], rows: byArea[k].lines.map(function (w) { return { exp: null, wq: w, state: 'unmapped' }; }) }); } });
    var works = 0, worksTbc = false, plan = 0, options = 0;
    wqLines.forEach(function (w) { var t = lineTotal(w), isPlan = /maintenance agreement|service plan/i.test(w.short_description || w.description || ''); if (lineOptional(w)) { options += t || 0; return; } if (t == null) { worksTbc = true; return; } if (isPlan) plan += t; else works += t; });
    var status = issues.some(function (i) { return i.level === 'red'; }) ? 'red' : (issues.length ? 'amber' : 'ok');
    return { status: status, issues: issues, groups: groups, totals: { works: works, works_tbc: worksTbc, plan: plan, options: options, lines: wqLines.length }, at: new Date().toISOString(), quoteId: p.wq_quote_id };
  }
  function renderMirror() {
    var el = $('#mirrorStatus'), body = $('#mirrorBody'), cnt = $('#mirrorCount'); if (!el || !body) return;
    var m = S.mirror;
    if (!m) { el.className = 'mirror-status'; el.textContent = S.cur && S.cur.wq_quote_id ? 'Not checked yet — quote ' + S.cur.wq_quote_id : 'No quote linked'; cnt.textContent = '–'; body.innerHTML = ''; return; }
    el.className = 'mirror-status ' + m.status; el.textContent = (m.status === 'ok' ? '● Mirrors WeQuote' : m.status === 'amber' ? '● Check before sending' : '● Differences from the quote') + ' · ' + m.issues.length + ' issue' + (m.issues.length === 1 ? '' : 's') + ' · ' + new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    cnt.textContent = String(m.issues.length);
    var h = '';
    if (m.issues.length) h += '<ul class="small" style="margin:8px 0 14px;padding-left:18px">' + m.issues.map(function (i) { return '<li style="color:var(--' + (i.level === 'red' ? 'red' : 'amber') + ')">' + esc(i.msg) + '</li>'; }).join('') + '</ul>';
    h += '<div class="row wrap small muted" style="margin-bottom:8px"><span>Works (ex VAT): <strong>' + gbp(m.totals.works) + (m.totals.works_tbc ? ' + TBC' : '') + '</strong></span><span>Service plan / yr: <strong>' + gbp(m.totals.plan) + '</strong></span><span>Options: <strong>' + gbp(m.totals.options) + '</strong></span><span>' + m.totals.lines + ' quote lines</span></div>';
    h += '<table class="mir-tbl"><thead><tr><th>Section ↔ WeQuote area</th><th>Line</th><th class="r">Plan qty</th><th class="r">Quote qty</th><th class="r">Sell</th><th class="r">Total</th><th>State</th></tr></thead><tbody>';
    m.groups.forEach(function (g) {
      var hex = g.section ? svcHex(g.section.service_nn) : null;
      h += '<tr class="grp"' + (hex ? ' style="--svc:' + hex + '"' : '') + '><td colspan="7">' + (g.section ? esc(L(g.section.title)) : '<em>unmapped</em>') + ' <span class="tag">' + esc(g.wq ? g.wq.name : (g.section && g.section.wq_area ? g.section.wq_area + ' · not on quote' : 'no area')) + '</span></td></tr>';
      g.rows.forEach(function (r) {
        var w = r.wq, cls = r.state === 'ok' ? '' : (r.state === 'missing' ? 'issue-red' : 'issue');
        h += '<tr class="' + cls + '"><td></td><td>' + esc(r.exp ? r.exp.wq_name : (w.short_description || w.description || '')) + (w && w.product_id ? ' <span class="mono muted">' + esc(w.product_id) + '</span>' : '') + (w && lineOptional(w) ? '<span class="tag">option</span>' : '') + (r.exp && r.exp.provisional ? '<span class="tag">prov.</span>' : '') + '</td>' +
          '<td class="r">' + (r.exp ? esc(r.exp.qty) + (r.exp.unit ? ' ' + r.exp.unit : '') : '—') + '</td><td class="r">' + (w ? esc(lineQty(w)) : '—') + '</td><td class="r">' + (w ? gbp(w.sell_price != null ? w.sell_price : w.unit_price) : '—') + '</td><td class="r">' + (w ? gbp(lineTotal(w)) : '—') + '</td><td>' + esc(r.state) + '</td></tr>';
      });
    });
    h += '</tbody></table>';
    body.innerHTML = h;
  }

  // ── export ──
  async function exportPdf() {
    if (!S.cur) return;
    if (S.dirty) { await save(); if (S.dirty) return; }
    var m = S.mirror || await checkMirror(); if (!m) return;
    if (m.status !== 'ok') toast((m.status === 'red' ? 'Lines missing from the quote print as "to be confirmed"' : 'Quote differs from the proposal') + ' — see Pricing & mirror (' + m.issues.length + ')', 'warn');   // never blocked (Bryn 2026-10-16): unpriced = TBC
    if (S.lang !== 'en' && S.cur.options.es_stale && !confirm('The English text changed since this translation was made. Export the ' + S.lang.toUpperCase() + ' version anyway?')) return;
    if (!global.TakeoverPdf) { toast('PDF module missing', 'error'); return; }
    var tier = S.tiers.find(function (t) { return t.key === S.cur.options.tier_proposed; }) || null;
    try {
      toast('Building PDF…');
      await global.TakeoverPdf.generate({
        proposal: S.cur, project: S.project, lang: S.lang, ui: (CFG.ui || {})[S.lang] || CFG.ui.en, wqLines: S.wq.lines || [], mirror: m,
        sectionKeys: (function () { var m = {}; S.cur.sections.forEach(function (s) { m[s.key] = sectionKey(S.cur, s); }); return m; })(), wqLineKey: wqLineKey,
        tiers: S.cur.options.tiers_show ? S.tiers.filter(function (t) { return !(t.metadata || {}).comparison_only || true; }) : [], tierAspects: S.tierAspects, tierProposed: tier ? tier.key : null,
        company: BRAND.company || {}, appVersion: CFG.version, assetBase: '../data/', photoUrl: photoUrl
      });
      toast('PDF exported', 'success');
    } catch (e) { console.error(e); toast('PDF failed: ' + e.message, 'error'); }
  }

  async function boot(shellReady) {
    wireGlobal();
    try { S.lang = localStorage.getItem(LS_LANG) || 'en'; goTab(localStorage.getItem(LS_TAB) || 'proposal'); } catch (e) { goTab('proposal'); }
    var res = await shellReady; S.db = res.db; S.ready = !!res.supaReady;
    if (S.ready && global.SonorWQClient) { try { global.SonorWQClient.setSource(CFG.wqProxySource || 'takeover'); await global.SonorWQClient.init(S.db.client); } catch (e) { console.warn('[takeover] WQ init', e); } }
    await loadAll();
  }

  global.TakeoverApp = { boot: boot, state: S, goTab: goTab, save: save, exportPdf: exportPdf, checkMirror: checkMirror, computeMirror: computeMirror, newFromTemplate: newFromTemplate, __version: CFG.version };
})(typeof window !== 'undefined' ? window : this);
