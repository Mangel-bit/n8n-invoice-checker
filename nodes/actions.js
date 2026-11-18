//@ file-rows
// The original files, kept so the document page can show them next to what was read.
return $('One item per file').all().map((i) => ({ json: { doc_id: i.json.doc_id, mime: i.json.mime, data: i.json.data } }));

//@ apply-action
// Approve, don't pay, or undo. Undo puts the document back where the checks left it.
const body = $('Document action').first().json.body || {};
const p = $('Get papers for action').all().map((i) => i.json).find((r) => r.doc_id === body.id);
if (!p) return [];
const back = parseJson(p.flags, []).length ? 'needs_you' : (p.doc_type === 'receipt' ? 'filed' : 'ready');
const status = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : back;
return [{ json: { doc_id: p.doc_id, status, decided_at: body.action === 'undo' ? '' : nowIso } }];

//@ export-csv
// Everything in a CSV the accountant can drop into their software.
const rows = $('Get papers for export').all().map((i) => i.json).filter((p) => p.doc_id)
  .sort((a, b) => String(a.issue_date || a.uploaded_at).localeCompare(String(b.issue_date || b.uploaded_at)));
const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const head = ['Issue date', 'Supplier', 'Type', 'Number', 'Due date', 'Currency', 'Subtotal', 'Tax', 'Total', 'Status', 'Quote or order', 'What it was for', 'Agent note'];
const lines = rows.map((p) => [p.issue_date, p.supplier, p.doc_type, p.invoice_number, p.due_date, p.currency, num(p.subtotal).toFixed(2), num(p.tax).toFixed(2),
  num(p.total).toFixed(2), (STATUS[p.status] || {}).label || p.status, p.quote_ref, p.summary, p.agent_note].map(cell).join(','));
return [{ json: { csv: '﻿' + [head.join(','), ...lines].join('\r\n'), name: `paperwork-${today}.csv` } }];
