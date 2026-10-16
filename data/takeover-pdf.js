/* Sonor Takeover — proposal PDF  v0.1.0 (2026-10-16)
   Client-facing takeover proposal on the shared luxury engine (data/sonor-pdf-luxury.js ≥ 1.3.0, root master, synced):
   SC-style cover (contract-hero.jpg, airy, brand large) → summary → sections in SERVICE ORDER with the service colour → survey
   photos → price summary from LIVE WeQuote lines (never typed) → tier comparison from service_contract_tiers (optional) →
   assumptions / next steps → rear contact page. Footer = `<project> · Page N` only (footerMode 'minimal'); contacts live on the rear page.
   Language: every string comes from the proposal's {en, es} fields or __TAKEOVER_CONFIG__.ui[lang]; nothing client-facing is hard-coded here.
   No transparency on the cover (the fade is the engine's baked PNG) — Preview paints alpha groups magenta. */
(function (global) {
  'use strict';
  var CFG = global.__TAKEOVER_CONFIG__ || {};
  function L() { var lx = global.SonorPdfLuxury; if (!lx) throw new Error('SonorPdfLuxury missing'); return lx; }
  function svcHex(nn) { var s = ((global.__SONOR_BRAND__ || {}).services || []).find(function (x) { return x.nn === String(nn); }); return s ? s.hex : '#d9d6d1'; }
  function money(n) { return n == null || isNaN(n) ? null : '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  function money2(n) { return '£' + Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fmtQty(q, unit, U) { if (q == null || Number(q) === 0) return ''; var n = Number(q); var s = (Math.round(n * 100) / 100).toString(); if (!unit) return s; var u = unit === 'day' ? (n === 1 ? U.day : U.days) : (U[unit] || unit); return s + ' ' + u; }
  function dateLabel(lang, d) { d = d || new Date(); if (lang === 'es') return d.getDate() + ' de ' + (CFG.months_es || [])[d.getMonth()] + ' de ' + d.getFullYear(); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function lineQty(l) { var q = l.quantity != null ? l.quantity : (l.qty != null ? l.qty : l.amount); return q == null ? null : Number(q); }
  function lineOptional(l) { return !!(l.optional || l.is_optional || l.option || l.optional_item); }
  function lineTotal(l) { var q = lineQty(l) || 0, u = l.sell_price != null ? Number(l.sell_price) : (l.unit_price != null ? Number(l.unit_price) : null); if (l.total_price != null && Number(l.total_price)) return Number(l.total_price); if (l.line_total != null && Number(l.line_total)) return Number(l.line_total); return u == null ? null : q * u; }
  function areaKey(name) { var m = String(name || '').match(/^\s*(\d+)\s*[·.\-–—]/); return m ? 'n' + m[1] : String(name || '').trim().toLowerCase(); }
  function lineArea(l) { return l.structure_description || l.structure_name || l.area_name || l.area || l.structure || l.group_description || ''; }

  // ── tier cell (mirrors render-brief.py tier_cell and the Service Contracts pack) ──
  function tierPricing(t, aspects) {
    var ta = (aspects || {})[t.key] || {}; function g(k) { var r = ta[k]; return r && r.included && r.value != null && r.value !== '' && !isNaN(Number(r.value)) ? Number(r.value) : null; }
    var annual = g('annual_price') != null ? g('annual_price') : (t.annual_price_default != null ? Number(t.annual_price_default) : null);
    var monthly = g('price_monthly');
    return { annual_ex_vat: annual, monthly: monthly != null ? monthly : (annual != null ? annual * 1.2 / 12 : null) };
  }
  function tierCell(t, k, V, U, aspects) {
    var v;
    switch (k) {
      case 'visits': v = t.visits_per_year; return v ? String(v) : V.none;
      case 'visit_h': v = t.visit_duration_hours; return v ? v + ' ' + U.h : V.none;
      case 'remote_h': if (!t.remote_support_included) return V.none; v = t.remote_support_hours_per_year; return v == null ? V.unlimited : v + ' ' + U.h;
      case 'support': return t.support_hours || V.none;
      case 'ooh': return t.out_of_hours ? V.yes : V.no;
      case 'priority': return t.priority_callout ? V.yes : V.no;
      case 'loan': return t.loan_equipment ? V.yes : V.no;
      case 'updates': return t.software_updates ? V.yes : V.no;
      case 'crit': v = t.response_hours_critical; return v ? v + ' ' + U.h : V.callout;
      case 'std': v = t.response_hours_standard; return v ? v + ' ' + U.h : V.callout;
      case 'onsite': v = t.onsite_hours; return v ? v + ' ' + U.h : (t.visits_per_year ? V.best : V.none);
      case 'parts': v = t.parts_discount_pct; return v ? v + '%' : V.none;
      case 'price': v = tierPricing(t, aspects).annual_ex_vat; return v ? money(v) : V.none;
      case 'monthly': v = tierPricing(t, aspects).monthly; return v ? money2(v) : V.none;
    }
    return '';
  }

  async function generate(m) {
    var lx = L(), PL = global.PDFLib, A4 = lx.A4, M = lx.M, C = lx.COL, BASE = m.assetBase || '../data/';
    var p = m.proposal, pr = m.project || {}, lang = m.lang || 'en', U = m.ui || CFG.ui.en, UN = U.units || {};
    function T(obj) { obj = obj || {}; var v = obj[lang]; if (v == null || (Array.isArray(v) && !v.length) || v === '') v = obj.en; return v == null ? (Array.isArray(obj.en) ? [] : '') : v; }
    var doc = await PL.PDFDocument.create();
    doc.setTitle(T(p.title) + ' — ' + (pr.name || '')); doc.setAuthor('Sonor Ltd'); doc.setProducer('Sonor Takeover v' + (m.appVersion || '')); doc.setLanguage(lang === 'es' ? 'es-ES' : 'en-GB');
    var F = await lx.makeFonts(doc, BASE);
    var hero = null, cedia = null, fadeImg = null;
    try { hero = await lx.loadImage(doc, BASE + ((CFG.assets || {}).hero || 'contract-hero.jpg')); } catch (e) {}
    try { cedia = await lx.loadImage(doc, BASE + ((CFG.assets || {}).cedia || 'cedia-member-line.png')); } catch (e) {}
    try { var fd = lx.fadePngDataUrl(); if (fd) fadeImg = await doc.embedPng(await lx.fetchBytes(fd)); } catch (e) {}
    var photoImgs = {};
    for (var si = 0; si < (p.sections || []).length; si++) { var ph = p.sections[si].photos || []; for (var pi = 0; pi < ph.length; pi++) { try { photoImgs[ph[pi].path] = await lx.loadImage(doc, m.photoUrl ? m.photoUrl(ph[pi].path) : ph[pi].path); } catch (e) { console.warn('[takeover-pdf] photo', ph[pi].path, e); } } }

    var projectLabel = pr.ref || pr.name || 'Sonor';
    lx.footerMode('minimal', projectLabel);
    var W = A4.w - M * 2, DOC_LABEL = String(T(p.options.doc_type) || U.doc_type).toUpperCase();

    // 1 — cover (identical anatomy to the Service Contracts pack)
    var p1 = doc.addPage([A4.w, A4.h]);
    lx.cover(lx.mk(p1, doc), F, { hero: hero, fadeImg: fadeImg, cediaImg: cedia, brandLarge: true, airy: true, eyebrow: T(p.options.doc_type) || U.doc_type, title: T(p.title), subtitle: T(p.subtitle),
      info: [[U.prepared_for.toUpperCase(), (p.options.attention || pr.client_name || '—')], [U.site.toUpperCase(), [pr.address, pr.postcode].filter(Boolean).join(', ') || pr.name || '—'], [U.date.toUpperCase() + '  ·  ' + U.ref.toUpperCase(), dateLabel(lang) + '  ·  ' + (p.options.ref || pr.ref || '')]] });

    // ── flow engine on cream pages ──
    var pageNo = 1, P = null, y = 0, BOTTOM = A4.h - 60;
    function newPage(label) { pageNo++; var pg = doc.addPage([A4.w, A4.h]); P = lx.mk(pg, doc); P.rect(0, 0, A4.w, A4.h, C.CREAM); lx.pageHead(P, F, label || DOC_LABEL, 0, 0, DOC_LABEL, { brand: 'large' }); lx.pageFoot(P, F, { pageNo: pageNo, pageLabel: U.page }); y = 92; }
    function ensure(h, label) { if (y + h > BOTTOM) newPage(label); }
    function para(txt, size, font, colr, width, x, lh) { var ls = lx.wrap(String(txt || ''), font, size, width || W); lh = lh || size * 1.42; ls.forEach(function (ln) { ensure(lh); P.text(ln, x == null ? M : x, y, size, font, colr || C.INK2); y += lh; }); return ls.length; }
    function heading(eyebrow, title) { ensure(44); P.hline(M, M + 22, y + 4, C.GOLD, 1, 0.95); P.tracked(String(eyebrow || '').toUpperCase(), M + 30, y, 7.5, F.r, C.LABEL, 2.6); y += 16; P.text(title, M, y, 17, F.b, C.INK); y += 30; }
    function bullets(items, size, width, x) { x = x == null ? M : x; width = width || W; (items || []).forEach(function (it) { var ls = lx.wrap(String(it), F.r, size, width - 14), lh = size * 1.42; ensure(lh * ls.length + 3); P.text('–', x, y, size, F.r, C.GOLD); ls.forEach(function (ln) { P.text(ln, x + 14, y, size, F.r, C.INK2); y += lh; }); y += 3; }); }

    // 2 — summary
    newPage();
    heading(U.summary_h, T(p.title));
    (T(p.summary) || []).forEach(function (para1) { para(para1, 10.5, F.r, C.INK2); y += 8; });
    y += 6;

    // sections — service order 01 → 10, renumbered; noted sections carry their eyebrow label instead of a number
    var secs = (p.sections || []).slice().sort(function (a, b) { return (a.service_nn || '99').localeCompare(b.service_nn || '99') || (a.sort || 0) - (b.sort || 0); });
    heading(U.scope_h, U.scope_h);
    var n = 0;
    secs.forEach(function (s) {
      var isNoted = s.kind === 'noted'; if (!isNoted) n++;
      var hex = lx.hexRgb(svcHex(s.service_nn)), dos = T(s.do) || [], res = T(s.result) || '';
      // measure
      var hTitle = 20, hDo = 0; dos.forEach(function (d) { hDo += lx.wrap(d, F.r, 9.5, W - 32).length * 13.5 + 3; });
      var hRes = res ? lx.wrap(res, F.l, 9.5, W - 32).length * 13.5 + 10 : 0;
      ensure(Math.min(hTitle + hDo + hRes + 16, 260));
      var top = y, startP = P;
      P.tracked(isNoted ? String(T(s.label) || U.noted).toUpperCase() : ('§' + String(n).padStart(2, '0')), M + 14, y + 1, 7, F.r, hex, 2.2);
      P.text(T(s.title), M + 14 + (isNoted ? 44 : 30), y - 2, 12.5, F.b, C.INK); y += hTitle;
      if (dos.length) { P.tracked(U.what_we_do.toUpperCase(), M + 14, y, 6.5, F.r, C.LABEL, 2); y += 11; bullets(dos, 9.5, W - 18, M + 18); }
      if (res) { ensure(hRes); P.tracked(U.result.toUpperCase(), M + 14, y, 6.5, F.r, C.LABEL, 2); y += 11; para(res, 9.5, F.l, C.INK, W - 32, M + 18, 13.5); }
      // service colour bar — drawn after measuring on the page the block ended on (blocks that spilled keep the bar on the first page only)
      if (P === startP && top < y) P.rect(M, top - 4, 3, Math.min(y, BOTTOM) - top + 2, hex); else startP.rect(M, top - 4, 3, BOTTOM - top, hex);
      // photos — two across
      var phs = (s.photos || []).filter(function (ph) { return photoImgs[ph.path]; });
      if (phs.length) {
        var gap = 10, pw = (W - 18 - gap) / 2, phh = pw * 0.66;
        for (var i = 0; i < phs.length; i += 2) {
          ensure(phh + 26);
          [phs[i], phs[i + 1]].filter(Boolean).forEach(function (ph, k) { var img = photoImgs[ph.path], x = M + 18 + k * (pw + gap); var sc = Math.max(pw / img.width, phh / img.height); var dw = img.width * sc, dh = img.height * sc; var cap = T(ph.caption); P.image(img, x, y, pw, phh, 1); P.rectB(x, y, pw, phh, C.LINE, 0.5, 1); if (cap) P.text(lx.wrap(cap, F.r, 8, pw)[0] || '', x, y + phh + 5, 8, F.r, C.INK2); });
          y += phh + 22;
        }
        P.text(U.photos_note, M + 18, y, 7.5, F.l, C.LABEL); y += 12;
      }
      y += 14;
    });

    // prices — LIVE WeQuote lines, grouped by section (service order) via wq_area; unmapped areas follow
    var wq = m.wqLines || [], byArea = {}, keyOf = m.wqLineKey || function (l) { return l.structure_id != null ? 's' + l.structure_id : areaKey(lineArea(l)); };
    wq.forEach(function (l) { var k = keyOf(l); (byArea[k] = byArea[k] || { name: lineArea(l), lines: [] }).lines.push(l); });
    var labels = ((p.line_labels || {})[lang] || {}), labelsEn = ((p.line_labels || {}).en || {});
    function lineLabel(w, exp) { var k = String(w.product_id != null ? w.product_id : (exp && exp.label_key) || ''); return labels[k] || (exp && (labels[exp.label_key] || exp.wq_name)) || labelsEn[k] || w.short_description || w.description || k; }
    var groups = [], claimed = {};
    // every section with expected lines prints: quote lines priced, expected lines not (yet) on the quote as "to be confirmed" (never blocked — Bryn 2026-10-16)
    secs.forEach(function (s) { var k = (m.sectionKeys || {})[s.key] || (s.wq_structure_id ? 's' + s.wq_structure_id : (s.wq_area ? areaKey(s.wq_area) : null)); var g = k && byArea[k]; var exp = s.lines || []; if (!g && !exp.length) return; if (g) claimed[k] = true;
      var rows = (g ? g.lines : []).slice(), used = {};
      rows.forEach(function (w) { var i = exp.findIndex(function (e, j) { return !used[j] && String(e.product_id) === String(w.product_id); }); if (i >= 0) used[i] = true; });
      exp.forEach(function (e, j) { if (!used[j]) rows.push({ product_id: e.product_id, short_description: e.wq_name, quantity: e.qty, _tbc: true, _exp: e }); });
      groups.push({ title: T(s.title), nn: s.service_nn, lines: rows, exp: exp }); });
    Object.keys(byArea).forEach(function (k) { if (!claimed[k]) groups.push({ title: (byArea[k].name || '').replace(/^\s*\d+\s*[·.\-–—]\s*/, '') || (lang === 'es' ? 'Otras partidas' : 'Other items'), nn: '10', lines: byArea[k].lines, exp: [] }); });
    if (groups.some(function (g) { return g.lines.length; })) {
      ensure(120); heading(U.prices_h, U.prices_h);
      var cL = M, cQ = M + W * 0.64, cA = A4.w - M, rowH = 15;
      P.tracked(U.price_col.toUpperCase(), cA - F.r.widthOfTextAtSize(U.price_col.toUpperCase(), 6.5) - 6, y, 6.5, F.r, C.LABEL, 1.2); P.tracked(U.qty.toUpperCase(), cQ, y, 6.5, F.r, C.LABEL, 1.2); y += 10; P.hline(M, A4.w - M, y, C.LINE, 0.8); y += 8;
      var works = 0, worksTbc = false, plan = 0;
      groups.forEach(function (g) {
        ensure(rowH * 2 + 12);
        var hex = lx.hexRgb(svcHex(g.nn)); P.rect(M, y - 1, 3, 9, hex); P.text(g.title, M + 10, y - 2, 9.5, F.b, C.INK); y += rowH;
        g.lines.forEach(function (w) {
          var exp = w._exp || g.exp.find(function (e) { return String(e.product_id) === String(w.product_id); }) || null;
          var q = lineQty(w), tot = lineTotal(w), opt = lineOptional(w) || !!(exp && exp.optional && w._tbc), tbc = w._tbc || ((q === 0 || tot == null || tot === 0) && !opt);
          var lab = lineLabel(w, exp), tags = []; if (opt) tags.push(U.option); if (exp && exp.provisional) tags.push(U.provisional); if (exp && exp.needs_product) tbc = true;
          var isPlan = /maintenance agreement|service plan|plan de servicio/i.test((w.short_description || '') + ' ' + lab);
          var labW = cQ - M - 16, ls = lx.wrap(lab, F.r, 9, labW); ensure(13 * ls.length + 2);
          ls.forEach(function (ln, i) { P.text(ln, M + 10, y, 9, F.r, C.INK2); if (i < ls.length - 1) y += 13; });
          if (tags.length) { var tx = M + 10 + F.r.widthOfTextAtSize(ls[ls.length - 1], 9) + 6; P.tracked(tags.join(' · ').toUpperCase(), tx, y + 2, 5.5, F.r, C.LABEL, 1.2); }
          P.text(fmtQty(q, exp ? exp.unit : '', UN), cQ, y, 9, F.r, C.INK2);
          var amt = tbc ? U.tbc : money(tot); P.right(amt, cA, y, 9, tbc ? F.l : F.r, tbc ? C.LABEL : C.INK);
          if (!opt) { if (tbc) worksTbc = true; else if (isPlan) plan += tot; else works += tot; }
          y += rowH;
        });
        y += 4;
      });
      ensure(60); P.hline(M, A4.w - M, y, C.GOLD, 0.8, 0.9); y += 10;
      P.text(U.subtotal_works, M + 10, y, 10, F.b, C.INK); P.right(money(works) + (worksTbc ? '  + ' + U.tbc : ''), cA, y, 10, F.b, C.INK); y += rowH + 2;
      if (plan) { P.text(U.subtotal_plan, M + 10, y, 10, F.b, C.INK); P.right(money(plan), cA, y, 10, F.b, C.INK); y += rowH + 2; }
      y += 4; para(U.total_note, 7.5, F.l, C.INK2, W, M, 11); y += 10;
    }

    // tiers — optional, from service_contract_tiers (the plans pack SSOT); proposed tier marked
    var tiers = m.tiers || [];
    if (tiers.length) {
      var ROWS = ['visits', 'visit_h', 'remote_h', 'support', 'ooh', 'crit', 'std', 'onsite', 'priority', 'parts', 'loan', 'updates', 'price', 'monthly'];
      var tw = W * 0.30, cw = (W - tw) / tiers.length, rh = 16, need = 90 + 22 * (ROWS.length + 2);
      if (y + need > BOTTOM) newPage(); heading(U.tiers_h, U.tiers_h); para(U.tiers_intro, 9, F.r, C.INK2); y += 10;
      var TR = U.tier_rows || {}, TV = U.tier_vals || {};
      var tblH = rh + 6; ROWS.forEach(function (k) { var nl = Math.max.apply(null, tiers.map(function (t) { return lx.wrap(tierCell(t, k, TV, UN, m.tierAspects), F.r, 7.2, cw - 6).slice(0, 2).length; }).concat([1])); tblH += 10 * nl + 6; });
      tiers.forEach(function (t, i) { var x = M + tw + i * cw, prop = t.key === m.tierProposed; if (prop) { P.rect(x - 4, y - 8, cw, tblH + 4, C.GOLD, 0.10); P.tracked(String(U.proposed).toUpperCase(), x, y - 4, 5.5, F.r, C.GOLD, 1.4); } P.text((t.metadata || {}).comparison_only ? (TV.nocontract || t.name) : t.name, x, y + 4, 9, F.b, C.INK); });
      y += rh + 6; P.hline(M, A4.w - M, y - 4, C.LINE, 0.8);
      ROWS.forEach(function (k, ri) {
        var lab = TR[k] || k, fs = 7.2, cells = tiers.map(function (t) { return lx.wrap(tierCell(t, k, TV, UN, m.tierAspects), k === 'price' ? F.b : F.r, fs, cw - 6).slice(0, 2); });
        var nl = Math.max.apply(null, cells.map(function (c) { return c.length; }).concat([1])), rowH = 10 * nl + 6;
        P.text(lab, M, y, 7.8, k === 'price' || k === 'monthly' ? F.b : F.r, C.INK2);
        cells.forEach(function (c, i) { c.forEach(function (ln, j) { P.text(ln, M + tw + i * cw, y + j * 10, fs, k === 'price' ? F.b : F.r, C.INK); }); });
        y += rowH; if (ri === ROWS.length - 3) P.hline(M, A4.w - M, y - 4, C.LINE, 0.5);
      });
      y += 10;
    }

    // assumptions + next steps
    var asm = T(p.assumptions) || [], nxt = T(p.next_steps) || [];
    if (asm.length) { ensure(70); heading(U.assumptions_h, U.assumptions_h); bullets(asm, 9); y += 8; }
    if (nxt.length) { ensure(70); heading(U.next_h, U.next_h); bullets(nxt, 9.5); y += 8; }
    ensure(20); P.text(U.validity, M, y, 7.5, F.l, C.LABEL); y += 12;

    // rear — the full contact block, once
    var pr2 = doc.addPage([A4.w, A4.h]), co = m.company || {}, R = U.rear || {};
    lx.rearPage(lx.mk(pr2, doc), F, { tagline: R.tagline, labels: { new: R.new, service: R.service, phone: R.phone, web: R.web }, email_new: co.email || 'projects@sonor.co.uk', email_service: co.emailSupport || 'service@sonor.co.uk', phone: co.phone, web: String(co.url || 'sonor.co.uk').replace(/^https?:\/\//, ''), company: R.company, cediaImg: cedia });

    var bytes = await doc.save();
    var blob = new Blob([bytes], { type: 'application/pdf' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ((lang === 'es' ? 'Propuesta' : 'Proposal') + '-Sonor_' + (pr.ref || pr.name || 'takeover').replace(/^ENQ\s*-\s*/i, '').replace(/\s+/g, '-') + '_' + lang.toUpperCase() + '.pdf').replace(/[\/\\:*?"<>|]/g, '-');
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return { pages: doc.getPageCount(), bytes: bytes.length };
  }

  global.TakeoverPdf = { generate: generate, tierCell: tierCell, __version: '0.1.0' };
})(typeof window !== 'undefined' ? window : this);
