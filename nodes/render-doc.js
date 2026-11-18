// One document: the original on the desk with its stamps, and everything the agent read and checked next to it.
const q = ($('Document page').first().json.query) || {};
const p = $('Get papers for doc').all().map((i) => i.json).find((r) => r.doc_id === q.id);
const file = $('Get file').all().map((i) => i.json).find((r) => r.doc_id === q.id);

if (!p) {
  const html = `${head('Not found')}${topBar()}<main class="wrap" style="padding:60px 28px"><h1>I couldn't find that document</h1>
  <p style="margin:14px 0 22px;color:var(--muted)">It might have been cleared when the demo was reset.</p><a class="btn blue" href="/webhook/papers">Back to all paperwork</a></main></body></html>`;
  return [{ json: { html } }];
}

const flags = flagsOf(p);
const conf = parseJson(p.confidence, {});
const lines = parseJson(p.lines, []);
const cur = p.currency || CFG.currency;
const m = (n) => money(n, cur);
const has = (k) => flags.some((f) => f.kind === k);
const flag = (k) => flags.find((f) => f.kind === k);
const justDecided = q.done === 'approve' || q.done === 'reject';

// Stamps on the document: up to two problems, or the status.
let stamps = flags.filter((f) => FLAG_STAMP[f.kind]).slice(0, 2).map((f) => ({ text: FLAG_STAMP[f.kind], ink: 'red' }));
if (p.status === 'approved' || p.status === 'rejected' || !stamps.length) { const s = STATUS[p.status] || STATUS.needs_you; stamps = [{ text: s.stamp, ink: s.ink }]; }
const STAMP_POS = [{ top: '7%', right: '6%', r: -9 }, { top: '27%', right: '12%', r: 5 }];
const stampHtml = stamps.map((s, i) => `<div class="on-doc" style="top:${STAMP_POS[i].top};right:${STAMP_POS[i].right}">${stamp(s.text, s.ink, STAMP_POS[i].r, 'big thud').replace('style="', `style="animation-delay:${0.45 + i * 0.4}s;`)}</div>`).join('');

let viewer;
if (!file) viewer = `<div class="nofile">The original isn't stored for this one.</div>`;
else if (file.mime === 'application/pdf') viewer = `<canvas id="pdf" class="sheet" aria-label="The original PDF"></canvas><script type="application/octet-stream" id="pdfdata">${file.data}</script><div class="nofile" id="pdffail" hidden>The PDF can't be shown here, but it was read fine.</div>`;
else viewer = `<img class="sheet" alt="The original ${esc(typeLabel(p).toLowerCase())} from ${esc(p.supplier)}" src="data:${esc(file.mime)};base64,${file.data}">`;

const check = (ok, title, detail, link = '') => `<li class="${ok === true ? 'pass' : ok === false ? 'fail' : 'na'}"><span class="ic" aria-hidden="true">${ok === true ? '✓' : ok === false ? '!' : '–'}</span><div><b>${esc(title)}</b>${detail ? `<p>${esc(detail)}</p>` : ''}${link}</div></li>`;
const dupRef = flag('duplicate')?.ref;
const dupLink = dupRef ? `<a class="see" href="/webhook/papers-doc?id=${encodeURIComponent(dupRef)}">Open the first one</a>` : '';
const isReceipt = p.doc_type === 'receipt';
const checks = p.status === 'unreadable' ? check(false, "Couldn't read it", flag('unreadable')?.detail) : [
  check(!has('math'), has('math') ? "The numbers don't add up" : 'The numbers add up', flag('math')?.detail),
  check(!has('duplicate'), has('duplicate') ? 'Already received before' : 'Not paid before', flag('duplicate')?.detail, dupLink),
  p.quote_used ? check(!has('over_quote'), has('over_quote') ? flag('over_quote').title : `Matches quote ${p.quote_used}`, flag('over_quote')?.detail)
    : check(null, isReceipt ? 'No quote needed for a receipt' : 'No quote on file to compare with', ''),
  check(!(has('missing') || has('unsure')), has('missing') || has('unsure') ? 'Something needs a second look' : 'Nothing missing', [flag('missing')?.detail, flag('unsure')?.detail].filter(Boolean).join('. ')),
].join('');

const field = (label, value, key) => {
  const c = conf[key];
  const v = value ? esc(value) : '<span class="none">Not on it</span>';
  return `<div><dt>${label}</dt><dd>${c === 'low' && value ? `<mark>${v}</mark><small>hard to read</small>` : v}</dd></div>`;
};
const daysLeft = p.due_date ? daysBetween(today, p.due_date) : null;
const dueText = isReceipt ? `Paid${p.payment ? ` with ${esc(p.payment)}` : ''}` : p.due_date
  ? `Due ${fmtDate(p.due_date)}${daysLeft > 1 ? `, in ${daysLeft} days` : daysLeft === 1 ? ', tomorrow' : daysLeft === 0 ? ', today' : `, ${-daysLeft} days ago`}` : 'No due date on it';

const lineRows = lines.map((l) => `<tr><td>${esc(l.description)}${l.original_description ? `<small class="orig">${esc(l.original_description)}</small>` : ''}</td><td class="r">${l.quantity || ''}</td>
  <td class="r">${l.unit_price ? m(l.unit_price) : ''}${l.agreed ? `<small class="agreed">quoted ${m(l.agreed)}</small>` : ''}</td><td class="r">${m(l.amount)}</td></tr>`).join('');

const decidedOn = p.decided_at ? fmtDate(p.decided_at) : '';
let actions;
if (p.status === 'approved') actions = `<p class="decided">You approved this for payment${decidedOn ? ` on ${decidedOn}` : ''}.</p><button class="btn red-line" name="action" value="undo">Undo</button>`;
else if (p.status === 'rejected') actions = `<p class="decided">You marked this as not paying${decidedOn ? ` on ${decidedOn}` : ''}.</p><button class="btn red-line" name="action" value="undo">Undo</button>`;
else if (p.status === 'filed') actions = `<p class="decided">Filed for your records, nothing to pay.</p>`;
else actions = `<button class="btn blue" name="action" value="approve">Approve for payment</button><button class="btn red-line" name="action" value="reject">Don't pay this</button>`;

const tone = p.status === 'needs_you' || p.status === 'unreadable' || p.status === 'rejected' ? 'red' : 'blue';
const CSS = `
.crumb{padding:16px 0 0}.crumb a{color:var(--muted);text-decoration:none;font-size:14.5px}.crumb a:hover{color:var(--ink)}
.doc{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,1fr);gap:0;margin:14px auto 50px;max-width:1240px;border-radius:20px;overflow:clip;border:1px solid var(--rule)}
.viewer{background:radial-gradient(900px 600px at 30% 10%,#244A40 0%,var(--desk) 50%,var(--desk-2) 100%);padding:44px 40px;display:grid;place-items:start center;position:relative}
.sheet-wrap{position:sticky;top:24px;width:100%;max-width:580px}
.sheet{display:block;width:100%;height:auto;border-radius:3px;box-shadow:0 2px 4px rgba(0,0,0,.25),0 28px 50px -12px rgba(0,0,0,.6);background:#fff}
.on-doc{position:absolute;pointer-events:none}
.stamp.big{font-size:clamp(22px,2.6vw,34px);border-width:4px;outline-width:2px;outline-offset:4px;padding:10px 16px 8px;mix-blend-mode:multiply;background:rgba(255,255,255,.04)}
.viewer .fname{color:var(--desk-muted);font-size:13px;margin-top:14px;text-align:center}
.nofile{color:var(--desk-muted);padding:80px 20px;text-align:center}
.facts{background:var(--sheet);padding:38px 40px;display:grid;gap:26px;align-content:start}
.kind{color:var(--muted);font-size:14.5px}
.facts h1{font-size:clamp(30px,3vw,42px);font-weight:800;letter-spacing:-.035em;margin-top:4px}
.summary{color:var(--muted);margin-top:8px;font-size:16px}
.amount{display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:16px 0}
.amount .big{font-size:44px;font-weight:800;letter-spacing:-.04em;line-height:1}
.amount .due{color:var(--muted)}
.note{border-left:4px solid var(--blue);padding:4px 0 4px 18px}
.note.red{border-color:var(--red)}
.note b{font-size:13.5px;color:var(--muted);font-weight:600}
.note p{font-size:17.5px;line-height:1.5;margin-top:4px;max-width:54ch}
.checks{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.checks li{display:grid;grid-template-columns:28px 1fr;gap:12px;padding:10px 0;border-bottom:1px dashed var(--rule)}
.checks li:last-child{border-bottom:0}
.checks .ic{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;background:var(--ok)}
.checks .fail .ic{background:var(--red)}
.checks .na .ic{background:var(--rule-2)}
.checks b{font-weight:700}
.checks p{color:var(--muted);font-size:14px;margin-top:2px}
.checks .see{display:inline-block;margin-top:6px;font-size:14px;font-weight:600;color:var(--blue)}
h2.sec{font-size:15px;font-weight:700;margin-bottom:10px}
.fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 18px;margin:0}
.fields dt{font-size:13px;color:var(--muted)}
.fields dd{margin:2px 0 0;font-weight:600;overflow-wrap:anywhere}
.fields mark{background:linear-gradient(transparent 12%,var(--hl) 12%,var(--hl) 88%,transparent 88%);padding:0 3px}
.fields small{display:block;font-weight:500;font-size:12px;color:#8A7A10}
.fields .none{color:var(--muted);font-weight:400}
table{width:100%;border-collapse:collapse;font-size:14.5px}
th{text-align:left;font-weight:600;color:var(--muted);font-size:13px;padding:6px 8px 8px 0;border-bottom:1.5px solid var(--ink)}
td{padding:10px 8px 10px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.r{text-align:right}
td small{display:block;font-size:12.5px}
.orig{color:var(--muted);font-style:italic}
.agreed{color:var(--red);font-weight:700}
tfoot td{border-bottom:0;padding-top:6px;padding-bottom:4px;color:var(--muted)}
tfoot tr:last-child td{color:var(--ink);font-weight:800;font-size:16px;border-top:1.5px solid var(--ink);padding-top:10px}
.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;padding-top:6px}
.decided{width:100%;color:var(--muted)}
@media (max-width:960px){.doc{grid-template-columns:1fr;border-radius:0;border-left:0;border-right:0}.viewer{padding:28px 18px}.facts{padding:28px 20px}.fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

const html = `${head(`${p.supplier || p.file_name} · Paperwork Reader`, CSS)}${topBar()}
<div class="wrap crumb"><a href="/webhook/papers">← All paperwork</a></div>
<main class="doc">
  <section class="viewer"><div class="sheet-wrap">${viewer}${stampHtml}</div></section>
  <section class="facts">
    <div><p class="kind">${typeLabel(p)}${p.invoice_number ? ` ${esc(p.invoice_number)}` : ''}${p.language && !/english/i.test(p.language) ? `, translated from ${esc(p.language)}` : ''}</p>
      <h1>${esc(p.supplier || p.file_name)}</h1>${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ''}</div>
    <div class="amount"><span class="big">${p.total ? m(p.total) : '–'}</span><span class="due">${dueText}</span></div>
    <div class="note ${tone}"><b>What I found</b><p>${esc(p.agent_note)}</p></div>
    <div><h2 class="sec">Checks</h2><ul class="checks">${checks}</ul></div>
    ${p.status === 'unreadable' ? '' : `<div><h2 class="sec">What I read</h2><dl class="fields">
      ${field('From', p.supplier, 'supplier')}${field(isReceipt ? 'Receipt number' : 'Invoice number', p.invoice_number, 'invoice_number')}${field('Issued', fmtDate(p.issue_date) ? `${fmtDate(p.issue_date)}, ${p.issue_date.slice(0, 4)}` : '', 'issue_date')}
      ${isReceipt ? field('Paid with', p.payment, '') : field('Due', fmtDate(p.due_date) ? `${fmtDate(p.due_date)}, ${p.due_date.slice(0, 4)}` : '', 'due_date')}${field('Quote or order', p.quote_ref, '')}${field('Language', p.language, '')}
    </dl></div>
    <div><h2 class="sec">Lines</h2><table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>${lineRows}</tbody>
      <tfoot><tr><td colspan="3">Subtotal</td><td class="r">${m(p.subtotal)}</td></tr><tr><td colspan="3">${esc(p.tax_label || 'Tax')}</td><td class="r">${m(p.tax)}</td></tr><tr><td colspan="3">Total</td><td class="r">${m(p.total)}</td></tr></tfoot></table></div>`}
    <form class="actions" method="post" action="/webhook/papers-action"><input type="hidden" name="id" value="${esc(p.doc_id)}">${actions}</form>
  </section>
</main>
${file && file.mime === 'application/pdf' ? `<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
(function () {
  var c = document.getElementById('pdf'), fail = document.getElementById('pdffail');
  function bad() { c.hidden = true; fail.hidden = false; }
  try {
    var lib = window.pdfjsLib; if (!lib) return bad();
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var raw = atob(document.getElementById('pdfdata').textContent.trim()), bytes = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    lib.getDocument({ data: bytes, isEvalSupported: false }).promise.then(function (pdf) { return pdf.getPage(1); }).then(function (page) {
      var w = c.parentNode.clientWidth, v1 = page.getViewport({ scale: 1 }), dpr = Math.min(window.devicePixelRatio || 1, 2);
      var v = page.getViewport({ scale: (w / v1.width) * dpr });
      c.width = v.width; c.height = v.height; c.style.width = w + 'px';
      return page.render({ canvasContext: c.getContext('2d'), viewport: v }).promise;
    }).catch(bad);
  } catch (e) { bad(); }
})();
</script>` : ''}
${justDecided ? `<script>history.replaceState&&history.replaceState(null,'',location.pathname+'?id=${encodeURIComponent(p.doc_id)}')</script>` : ''}
</body></html>`;
return [{ json: { html } }];
