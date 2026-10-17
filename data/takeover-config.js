/* Sonor Takeover — app config  v0.1.0 (2026-10-16)
   window.__TAKEOVER_CONFIG__
   The takeover survey / proposal: what Sonor will do when it takes over systems it did not install, per workstream, in the client's
   language, mirrored to the WeQuote quote that carries the prices. Static engineering refs only — project data lives in Supabase
   (`takeover_proposals`), prices in WeQuote, tiers in `service_contract_tiers`, photos in `survey_pages`.
*/
window.__TAKEOVER_CONFIG__ = {
  version: '0.1.2',   // 2026-10-17 WeQuote-linked items carry the shared .wq-pill (0.1.1 = shared project bar 1.14.0)
  // 0.1.0 — 2026-10-16 born: editable sections, WQ mirror, luxury PDF (B-553)
  table: 'takeover_proposals',
  languages: [{ key: 'en', label: 'English' }, { key: 'es', label: 'Español' }],
  statuses: [
    { key: 'draft', label: 'Draft', pill: 'pill-grey' },
    { key: 'approved', label: 'English approved', pill: 'pill-amber' },
    { key: 'final', label: 'Final', pill: 'pill-green' },
    { key: 'sent', label: 'Sent', pill: 'pill-blue' },
    { key: 'superseded', label: 'Superseded', pill: 'pill-grey' }
  ],
  // Canonical service order (CLAUDE.md): sections ALWAYS print 01 → 10; the editor sorts itself (derived order, no handles).
  serviceOrder: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
  // A new proposal starts from these workstreams (keys stable; titles editable). `wq_area` = the WeQuote area name the lines live under.
  template: [
    { key: 'lutron',   service_nn: '04', kind: 'works', title: { en: 'Lutron lighting — programming extraction & engraving', es: 'Iluminación Lutron — extracción de la programación y grabado' } },
    { key: 'control4', service_nn: '07', kind: 'works', title: { en: 'Control4 — extract, upgrade & reconfigure', es: 'Control4 — extracción, actualización y reconfiguración' } },
    { key: 'handover', service_nn: '07', kind: 'works', title: { en: 'Accounts, apps & handover', es: 'Cuentas, aplicaciones y entrega' } },
    { key: 'service',  service_nn: '07', kind: 'works', title: { en: 'Ongoing support — Sonor Service Plan', es: 'Soporte continuo — Plan de servicio Sonor' } },
    { key: 'security', service_nn: '08', kind: 'works', title: { en: 'Security, CCTV & intercom', es: 'Seguridad, CCTV e intercomunicador' } },
    { key: 'network',  service_nn: '09', kind: 'works', title: { en: 'Network — reset & recommission', es: 'Red — restablecimiento y nueva puesta en servicio' } },
    { key: 'logistics', service_nn: '10', kind: 'works', title: { en: 'Logistics', es: 'Logística' } },
    { key: 'snags',    service_nn: '10', kind: 'noted', title: { en: 'Items noted on the visit — outside this proposal', es: 'Incidencias observadas en la visita — fuera de esta propuesta' } }
  ],
  // Client-facing UI strings per language (the PDF). Add a language = add a block here + a column in the editor.
  ui: {
    en: { doc_type: 'Service proposal', prepared_for: 'Prepared for', attention: 'For the attention of', site: 'Property', date: 'Date', ref: 'Reference',
          summary_h: 'Summary', scope_h: 'Scope of works', what_we_do: 'What we will do', result: 'Outcome', noted: 'Noted', prices_h: 'Price summary', qty: 'Qty',
          price_col: 'Amount (GBP, ex VAT)', tbc: 'to be confirmed', option: 'optional', provisional: 'provisional', subtotal_works: 'Rescue & takeover works',
          subtotal_plan: 'Service plan (per year)', total_note: 'Amounts marked "to be confirmed" are fixed in the formal quotation once quantities are confirmed. The formal Sonor quotation takes precedence over this document. UK VAT applies where applicable.',
          assumptions_h: 'Assumptions & exclusions', next_h: 'Next steps', tiers_h: 'Sonor Service Plans — the tiers at a glance',
          tiers_intro: 'The same residential plans offered to every Sonor client; the proposed plan is marked. Prices per year ex VAT, with the equivalent monthly figure including VAT.',
          proposed: 'Proposed', validity: 'Proposal valid for 30 days from the date shown.', page: 'Page', photos_note: 'Photographed on the visit.',
          units: { h: 'h', day: 'day', days: 'days', yr: 'yr', ea: 'ea' },
          rear: { tagline: 'Smart homes, beautifully done.', new: 'New projects & proposals', service: 'Service & support', phone: 'Telephone', web: 'Web', company: 'Sonor Ltd  ·  Chester, England  ·  Trusted by homeowners across the North West & Wales' },
          tier_rows: { visits: 'Planned maintenance visits / year', visit_h: 'Time on site per visit', remote_h: 'Remote support / year', support: 'Support hours', ooh: 'Out-of-hours emergency line', crit: 'Critical fault — response target', std: 'Standard fault — response target', onsite: 'On-site attendance target', priority: 'Priority callout booking', parts: 'Discount on parts + additional labour', loan: 'Loan equipment during repairs', updates: 'Firmware / software updates', price: 'Per year (ex VAT)', monthly: '≈ per month (inc VAT)' },
          tier_vals: { unlimited: 'unlimited (fair use)', none: '—', yes: 'yes', no: '—', best: 'best endeavours', callout: 'standard call-out rates', nocontract: 'No contract' } },
    es: { doc_type: 'Propuesta de servicios', prepared_for: 'Preparado para', attention: 'A la atención de', site: 'Propiedad', date: 'Fecha', ref: 'Referencia',
          summary_h: 'Resumen', scope_h: 'Alcance de los trabajos', what_we_do: 'Qué haremos', result: 'Resultado', noted: 'Observado', prices_h: 'Resumen de precios', qty: 'Cant.',
          price_col: 'Importe (GBP, IVA no incluido)', tbc: 'a confirmar', option: 'opcional', provisional: 'provisional', subtotal_works: 'Trabajos de rescate y toma de control',
          subtotal_plan: 'Plan de servicio (anual)', total_note: 'Los importes marcados «a confirmar» se fijan en el presupuesto formal una vez confirmadas las cantidades. El presupuesto formal de Sonor prevalece sobre este documento. IVA del Reino Unido aplicable según corresponda.',
          assumptions_h: 'Supuestos y exclusiones', next_h: 'Próximos pasos', tiers_h: 'Planes de servicio Sonor — los niveles de un vistazo',
          tiers_intro: 'Los mismos planes residenciales que ofrecemos a todos nuestros clientes; el plan propuesto aparece marcado. Precios por año, IVA no incluido, con el importe mensual equivalente IVA incluido.',
          proposed: 'Propuesto', validity: 'Propuesta válida 30 días desde la fecha indicada.', page: 'Página', photos_note: 'Fotografiado en la visita.',
          units: { h: 'h', day: 'día', days: 'días', yr: 'año', ea: 'ud.' },
          rear: { tagline: 'Smart homes, beautifully done.', new: 'Nuevos proyectos y propuestas', service: 'Servicio y soporte', phone: 'Teléfono', web: 'Web', company: 'Sonor Ltd  ·  Chester, Inglaterra  ·  La confianza de propietarios en el noroeste de Inglaterra y Gales' },
          tier_rows: { visits: 'Visitas de mantenimiento planificadas / año', visit_h: 'Tiempo en sitio por visita', remote_h: 'Soporte remoto / año', support: 'Horario de soporte', ooh: 'Línea de emergencia fuera de horario', crit: 'Avería crítica — objetivo de respuesta', std: 'Avería estándar — objetivo de respuesta', onsite: 'Objetivo de asistencia en sitio', priority: 'Prioridad en la reserva de visitas', parts: 'Descuento en piezas y mano de obra adicional', loan: 'Equipo de sustitución durante reparaciones', updates: 'Actualizaciones de firmware / software', price: 'Por año (IVA no incluido)', monthly: '≈ al mes (IVA incluido)' },
          tier_vals: { unlimited: 'ilimitado (uso razonable)', none: '—', yes: 'sí', no: '—', best: 'según disponibilidad', callout: 'tarifas estándar de asistencia', nocontract: 'Sin contrato' } }
  },
  months_es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  wqProxySource: 'takeover',
  storage: { photos: 'site-photos' },
  assets: { hero: 'contract-hero.jpg', cedia: 'cedia-member-line.png' }
};
