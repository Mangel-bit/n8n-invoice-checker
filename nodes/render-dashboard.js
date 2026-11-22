// The main page: drop tray and tallies on the desk, then the ledger of everything that was read.
const papers = $('Get papers for page').all().map((i) => i.json).filter((p) => p.doc_id)
  .sort((a, b) => String(b.uploaded_at).localeCompare(String(a.uploaded_at)));
const q = ($('Paperwork page').first().json.query) || {};
const latest = papers.filter((p) => p.batch !== 'seed').map((p) => p.batch).sort().pop();
const fresh = q.new === '1' && latest ? papers.filter((p) => p.batch === latest) : [];
const freshIds = new Set(fresh.map((p) => p.doc_id));

const needs = papers.filter((p) => p.status === 'needs_you' || p.status === 'unreadable');
const ready = papers.filter((p) => p.status === 'ready');
const done = papers.filter((p) => ['approved', 'filed', 'rejected'].includes(p.status));
const caught = papers.reduce((s, p) => s + ((p.currency || CFG.currency) === CFG.currency ? num(p.saved) : 0), 0);
const caughtCount = papers.filter((p) => num(p.saved) > 0).length;

let banner = '';
if (fresh.length) {
  const n = fresh.filter((p) => p.status === 'needs_you' || p.status === 'unreadable').length;
  banner = `Done, I read ${fresh.length} document${fresh.length > 1 ? 's' : ''}${n ? ` and ${n} of them need${n === 1 ? 's' : ''} you, so they're at the top` : ' and everything checks out'}`;
} else if (q.done === 'reset') banner = 'The demo is back to the start, so you can drop the sample documents in again';

const CSS = `
.desk{background:radial-gradient(1200px 500px at 20% 0%,#21423A 0%,var(--desk) 55%,var(--desk-2) 100%);color:var(--desk-ink);padding:40px 0 46px}
.desk-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:28px;align-items:start}
.tray{position:relative;border:2px dashed #3D6357;border-radius:18px;padding:34px;min-height:330px;display:grid;transition:border-color .2s,background .2s;background:rgba(0,0,0,.08)}
.tray.over{border-color:var(--hl);background:rgba(244,227,94,.06)}
.tray-empty{display:grid;grid-template-columns:auto 1fr;gap:30px;align-items:center}
.pile{width:150px;height:170px;position:relative}
.pile i{position:absolute;inset:0;background:#F4F7F2;border-radius:4px;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.pile i:nth-child(1){transform:rotate(-9deg) translate(-8px,6px);background:#DCE5DD}
.pile i:nth-child(2){transform:rotate(5deg) translate(10px,2px);background:#E9EFE8}
.pile i:nth-child(3){padding:18px 16px;display:grid;gap:7px;align-content:start}
.pile i:nth-child(3) b{display:block;height:6px;border-radius:3px;background:#C9D6CB}
.pile i:nth-child(3) b:first-child{width:55%;height:9px;background:#9DB3A4}
.pile .stamp{position:absolute;right:-18px;bottom:22px;font-size:15px;background:transparent}
.tray h1{font-size:clamp(28px,3.4vw,42px);font-weight:800;letter-spacing:-.035em;max-width:15ch}
.tray p{color:var(--desk-muted);margin:14px 0 24px;max-width:48ch;font-size:16px}
.tray-files{display:none;align-content:start;gap:18px}
.tray.has-files .tray-empty{display:none}
.tray.has-files .tray-files{display:grid}
.tray-files h2{font-size:22px;font-weight:800}
.tray-files .sub{color:var(--desk-muted);margin-top:4px;font-size:14.5px}
.queue{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:12px}
.queue li{background:var(--desk-2);border:1px solid var(--desk-3);border-radius:12px;padding:8px;display:grid;gap:8px;min-width:0}
.thumb{position:relative;height:132px;border-radius:6px;overflow:hidden;background:#E9EFE8;display:grid;place-items:center}
.thumb img{width:100%;height:100%;object-fit:cover;object-position:top}
.thumb .pdf{font-family:var(--stamp);letter-spacing:.08em;color:var(--desk-3);font-size:26px}
.queue .nm{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.queue .st{font-size:12.5px;color:var(--desk-muted);min-height:1.5em}
.tray-actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.tray-actions .link{background:none;border:0;color:var(--desk-muted);text-decoration:underline;cursor:pointer;padding:8px}
.beam{position:absolute;left:0;right:0;height:38%;top:-40%;background:linear-gradient(180deg,transparent,rgba(244,227,94,.0) 20%,rgba(244,227,94,.55) 92%,var(--hl));mix-blend-mode:multiply;display:none}
.tray.reading .beam{display:block;animation:scan 1.6s cubic-bezier(.45,0,.55,1) infinite;animation-delay:var(--d)}
.tray.reading .st{color:var(--hl)}
@keyframes scan{0%{top:-40%}100%{top:105%}}

.tally{display:grid;gap:0;border-radius:18px;background:var(--desk-2);border:1px solid var(--desk-3);overflow:hidden}
.t-row{padding:20px 24px;border-bottom:1px solid var(--desk-3);display:grid;gap:2px}
.t-row .lab{color:var(--desk-muted);font-size:14px;display:flex;justify-content:space-between;gap:10px}
.t-row .val{font-size:30px;font-weight:800;letter-spacing:-.03em;line-height:1.15}
.t-row.needs .val{color:#FF8F8F}
.t-row.caught{border-bottom:0;background:var(--hl);color:var(--ink);padding-top:26px;padding-bottom:24px}
.t-row.caught .lab{color:#5C5420}
.t-row.caught .val{font-size:clamp(40px,4.4vw,56px);letter-spacing:-.045em}
.t-row.caught small{font-size:13.5px;color:#5C5420}

.flashwrap{margin-top:-22px;position:relative}
.ledger{padding:34px 0 30px}
.group{margin-bottom:34px}
.g-head{display:flex;align-items:baseline;gap:14px;padding:0 4px 10px;border-bottom:2px solid var(--ink)}
.g-head h2{font-size:22px;font-weight:800}
.g-head .ct{color:var(--muted);font-size:14.5px}
.g-head .sum{margin-left:auto;font-weight:700}
.rows{background:var(--sheet);border:1px solid var(--rule);border-top:0;border-radius:0 0 12px 12px;overflow:hidden}
.row{display:grid;grid-template-columns:150px minmax(0,1.6fr) 130px 96px 96px 130px 22px;align-items:center;gap:14px;padding:13px 16px;text-decoration:none;border-bottom:1px solid var(--rule);position:relative}
.row:last-child{border-bottom:0}
.row:hover{background:#F1F6EF}
.row .who b{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .who span{display:block;color:var(--muted);font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .ref,.row .dt{font-size:13.5px;color:var(--muted)}
.row .amt{text-align:right;font-weight:700;font-size:16px;border-left:1px solid var(--rule-2);padding-left:14px;align-self:stretch;display:flex;align-items:center;justify-content:flex-end}
.row .go{color:var(--rule-2)}
.row:hover .go{color:var(--ink)}
.row.fresh{animation:glow 2.4s ease both;animation-delay:var(--d)}
@keyframes glow{0%,30%{background:color-mix(in srgb,var(--hl) 55%,var(--sheet))}100%{background:var(--sheet)}}
.cols{display:grid;grid-template-columns:150px minmax(0,1.6fr) 130px 96px 96px 130px 22px;gap:14px;padding:12px 16px 6px;font-size:12.5px;color:var(--muted)}
.cols span:nth-child(6){text-align:right}
.empty{padding:22px 18px;color:var(--muted)}
footer{border-top:1px solid var(--rule);padding:22px 0 40px;color:var(--muted);font-size:14px}
footer .wrap{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}
footer button{background:none;border:1px solid var(--rule-2);border-radius:8px;padding:8px 14px;cursor:pointer;color:var(--ink)}
@media (max-width:980px){.desk-grid{grid-template-columns:1fr}}
@media (max-width:860px){.cols{display:none}.row{grid-template-columns:auto minmax(0,1fr) auto;row-gap:4px}.row .ref,.row .dt,.row .go{display:none}.row .amt{border:0;padding:0}}
@media (max-width:560px){.tray{padding:22px}.tray-empty{grid-template-columns:1fr}.pile{width:110px;height:125px}.row{grid-template-columns:minmax(0,1fr) auto}.row .st-col{grid-column:1/-1}}
`;

const rowHtml = (p, i) => {
  const s = mainStamp(p);
  const isFresh = freshIds.has(p.doc_id);
  const order = isFresh ? fresh.findIndex((f) => f.doc_id === p.doc_id) : 0;
  const delay = `${0.25 + order * 0.32}s`;
  const due = p.due_date ? fmtDate(p.due_date) : p.doc_type === 'receipt' ? 'Paid' : '';
  return `<a class="row ${isFresh ? 'fresh' : ''}" style="--d:${delay}" href="/webhook/papers-doc?id=${encodeURIComponent(p.doc_id)}">
  <span class="st-col">${stamp(s.text, s.ink, i % 2 ? 3 : -4, `sm ${isFresh ? 'thud' : ''}`).replace('style="', `style="animation-delay:${delay};`)}</span>
  <span class="who"><b>${esc(p.supplier || p.file_name)}</b><span>${esc(p.summary || p.agent_note)}</span></span>
  <span class="ref">${esc(p.invoice_number || '')}</span><span class="dt">${fmtDate(p.uploaded_at)}</span><span class="dt">${esc(due)}</span>
  <span class="amt">${p.total ? money(p.total, p.currency) : ''}</span><span class="go" aria-hidden="true">›</span></a>`;
};
const group = (title, list, emptyText, showSum = true) => `<section class="group"><div class="g-head"><h2>${title}</h2><span class="ct">${list.length} document${list.length === 1 ? '' : 's'}</span>
  ${showSum && list.length ? `<span class="sum">${sumByCurrency(list)}</span>` : ''}</div>
  <div class="rows">${list.length ? list.map(rowHtml).join('') : `<p class="empty">${emptyText}</p>`}</div></section>`;

const html = `${head('Paperwork Reader', CSS)}${topBar()}
<section class="desk"><div class="wrap desk-grid">
  <form class="tray" id="tray" method="post" action="/webhook/papers-upload" enctype="multipart/form-data">
    <input type="file" name="files" id="files" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*" hidden>
    <div class="tray-empty">
      <div class="pile" aria-hidden="true"><i></i><i></i><i><b></b><b></b><b></b><b></b><b></b></i>${stamp('CHECKED', 'blue', -12)}</div>
      <div><h1>Drop your invoices and receipts here</h1>
      <p>PDFs, scans or photos straight from your phone, and I'll read every one and check it before anything gets paid.</p>
      <label for="files" class="btn light" tabindex="0">Choose files</label></div>
    </div>
    <div class="tray-files">
      <div><h2 id="trayTitle">Ready to read</h2><p class="sub" id="traySub">Have a look, and when you're happy I'll go through them one by one.</p></div>
      <ul class="queue" id="queue"></ul>
      <div class="tray-actions"><button class="btn light" id="readBtn" type="submit">Read them</button><button class="link" type="button" id="clearBtn">Clear</button></div>
    </div>
  </form>
  <aside class="tally" aria-label="Totals">
    <div class="t-row"><span class="lab"><span>Ready to pay</span><span>${ready.length}</span></span><span class="val">${sumByCurrency(ready)}</span></div>
    <div class="t-row needs"><span class="lab"><span>Needs you</span><span>${needs.length}</span></span><span class="val">${sumByCurrency(needs)}</span></div>
    <div class="t-row caught"><span class="lab"><span>Caught before you paid it</span></span><span class="val">${money(caught)}</span>
      <small>${caughtCount ? `Duplicates, overcharges and wrong totals across ${caughtCount} document${caughtCount > 1 ? 's' : ''}` : "Duplicates and overcharges show up here when I find them"}</small></div>
  </aside>
</div></section>
${banner ? `<div class="wrap flashwrap"><div class="flash" role="status">${esc(banner)}</div></div>` : ''}
<main class="wrap ledger">
  <div class="cols" aria-hidden="true"><span>Status</span><span>From</span><span>Number</span><span>Received</span><span>Due</span><span>Amount</span><span></span></div>
  ${group('Needs you', needs, "Nothing needs you right now, everything that came in checks out.")}
  ${group('Ready to pay', ready, 'Nothing waiting to be paid at the moment.')}
  ${group('Done', done, 'Approved invoices and filed receipts end up here.', false)}
</main>
<footer><div class="wrap"><span>Demo mode, so nothing gets paid from here, it only reads and checks.</span>
<form method="post" action="/webhook/papers-reset" onsubmit="return confirm('Start the demo over? This clears everything you added.')"><button type="submit">Reset demo data</button></form></div></footer>
<script>
(function () {
  var tray = document.getElementById('tray'), input = document.getElementById('files'), queue = document.getElementById('queue');
  var readBtn = document.getElementById('readBtn');
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function show() {
    var files = Array.prototype.slice.call(input.files || []);
    queue.innerHTML = '';
    tray.classList.toggle('has-files', files.length > 0);
    readBtn.textContent = 'Read ' + (files.length === 1 ? 'this document' : 'these ' + files.length + ' documents');
    files.forEach(function (f, i) {
      var li = document.createElement('li');
      li.innerHTML = '<div class="thumb"><span class="pdf">PDF</span><div class="beam" style="--d:' + (i * 0.22) + 's"></div></div><div class="nm"></div><div class="st"></div>';
      li.querySelector('.nm').textContent = f.name;
      li.querySelector('.st').textContent = size(f.size);
      if (/^image\\//.test(f.type)) {
        var r = new FileReader();
        r.onload = function () { var img = new Image(); img.src = r.result; img.alt = ''; var t = li.querySelector('.thumb'); t.replaceChild(img, t.querySelector('.pdf')); };
        r.readAsDataURL(f);
      }
      queue.appendChild(li);
    });
  }
  input.addEventListener('change', show);
  document.getElementById('clearBtn').addEventListener('click', function () { input.value = ''; show(); });
  document.querySelector('label[for=files]').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); tray.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'drop' || e.target === document.documentElement) tray.classList.remove('over'); }); });
  document.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; show(); } });
  var STEPS = ['Reading it', 'Checking the math', 'Looking for duplicates', 'Comparing with your quotes'];
  tray.addEventListener('submit', function (e) {
    if (!input.files || !input.files.length) { e.preventDefault(); return; }
    tray.classList.add('reading');
    document.getElementById('trayTitle').textContent = 'Reading your paperwork';
    document.getElementById('traySub').textContent = 'It takes a few seconds per document, and I check the math, look for duplicates and compare each one with your quotes.';
    var sts = queue.querySelectorAll('.st'), k = 0;
    sts.forEach(function (s, i) { s.textContent = STEPS[0]; });
    setInterval(function () { k++; sts.forEach(function (s, i) { s.textContent = STEPS[(k + i) % STEPS.length]; }); }, 1400);
    setTimeout(function () { readBtn.disabled = true; readBtn.textContent = 'Reading…'; document.getElementById('clearBtn').disabled = true; }, 0);
  });
  if (/[?&](new|done)=/.test(location.search) && history.replaceState) history.replaceState(null, '', location.pathname);
})();
</script></body></html>`;
return [{ json: { html } }];
