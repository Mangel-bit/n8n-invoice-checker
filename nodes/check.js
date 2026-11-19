// Reads the AI's answer for each document and runs the checks in plain code, so they're exact:
// does the math add up, have we seen this invoice before, does it match the quote, is anything missing.
// Then it writes the agent's note in Sam's voice and decides the status.
const files = $('One item per file').all().map((i) => i.json);
const answers = $input.all().map((i) => i.json);
const existing = $('Get papers').all().map((i) => i.json).filter((p) => p.doc_id);
const quotes = $('Get quotes').all().map((i) => i.json).filter((q) => q.quote_ref);
const near = (a, b) => Math.abs(num(a) - num(b)) < 0.015;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function readAnswer(r) {
  if (!r || r.error || !Array.isArray(r.content)) return { err: 'call' };
  if (r.stop_reason === 'refusal' || r.stop_reason === 'max_tokens') return { err: r.stop_reason };
  const block = r.content.find((c) => c.type === 'text');
  const data = block && parseJson(block.text, null);
  return data ? { data } : { err: 'parse' };
}

// Best quote line for an invoice line, by shared words.
function matchQuoteLine(line, items) {
  let best = null, score = 0;
  for (const q of items) {
    const a = new Set(words(line.description)), s = words(q.description).filter((w) => a.has(w)).length;
    if (s > score) { score = s; best = q; }
  }
  return score > 0 ? best : null;
}

const seen = existing.map((p) => ({ ...p }));
const rows = files.map((f, idx) => {
  const ans = readAnswer(answers[idx]);
  const base = { doc_id: f.doc_id, batch: f.batch, uploaded_at: new Date(Date.now() + idx).toISOString(), file_name: f.file_name, mime: f.mime };
  if (!f.supported || ans.err) {
    const why = !f.supported ? `It's a ${(f.file_name.split('.').pop() || 'file').toUpperCase()} file and I can't open that type, so if you can send it as a PDF or a photo I'll read it right away`
      : "I couldn't read this one properly, so maybe try a clearer photo or the PDF if you have it, and I'll go through it again";
    return { ...base, doc_type: 'other', supplier: f.file_name, invoice_number: '', issue_date: '', due_date: '', currency: CFG.currency, subtotal: 0, tax: 0, total: 0,
      quote_ref: '', language: '', status: 'unreadable', flags: JSON.stringify([{ kind: 'unreadable', title: "Couldn't read it", detail: why }]), confidence: '{}',
      lines: '[]', summary: '', agent_note: why, saved: 0, decided_at: '', tax_label: '', payment: '', quote_used: '' };
  }
  const d = ans.data;
  const cur = (d.currency || CFG.currency).toUpperCase();
  const m = (n) => money(n, cur);
  const lines = (d.line_items || []).map((l) => ({ ...l, quantity: num(l.quantity), unit_price: num(l.unit_price), amount: num(l.amount) }));
  const flags = [];
  let saved = 0;
  const isReceipt = d.doc_type === 'receipt' || d.paid_already;

  // 1. Math
  const math = [];
  lines.forEach((l) => {
    if (l.quantity && l.unit_price && !near(l.quantity * l.unit_price, l.amount)) {
      math.push(`${l.description}: ${l.quantity} × ${m(l.unit_price)} is ${m(l.quantity * l.unit_price)}, but the line says ${m(l.amount)}`);
    }
  });
  const lineSum = round2(lines.reduce((s, l) => s + l.amount, 0));
  let mathGap = 0, mathNote = '';
  if (lines.length && d.subtotal && !near(lineSum, d.subtotal)) {
    mathGap = round2(d.subtotal - lineSum);
    math.push(`The lines add up to ${m(lineSum)} but the subtotal says ${m(d.subtotal)}`);
    mathNote = `The lines add up to ${m(lineSum)} but the subtotal says ${m(d.subtotal)}, so there's ${m(Math.abs(mathGap))} that doesn't come from anywhere, and it might just be a typo but I'd ask them to fix it before you pay`;
  }
  const preTax = d.subtotal || lineSum;
  if (d.total && preTax && !near(preTax + num(d.tax), d.total)) {
    const gap = round2(d.total - preTax - num(d.tax));
    math.push(`${m(preTax)} plus ${m(d.tax)} tax is ${m(preTax + num(d.tax))}, but the total says ${m(d.total)}`);
    if (!mathNote) { mathGap = gap; mathNote = `${m(preTax)} plus the tax should come to ${m(preTax + num(d.tax))}, but the total says ${m(d.total)}, so it's off by ${m(Math.abs(gap))}, and I'd ask them to send a corrected invoice before you pay`; }
  }
  if (math.length) {
    flags.push({ kind: 'math', title: "The numbers don't add up", detail: math.join('. '), amount: Math.max(0, mathGap) });
    if (mathGap > 0) saved += mathGap;
    if (!mathNote) mathNote = `Some of the lines don't add up, ${lc(math[0])}, so I'd check that with them before paying`;
  }

  // 2. Duplicate (against everything already in the ledger and earlier files in this upload)
  const dup = seen.find((p) => p.status !== 'rejected' && sameSupplier(p.supplier, d.supplier) && (
    (d.invoice_number && norm(p.invoice_number) === norm(d.invoice_number)) ||
    (near(p.total, d.total) && p.issue_date && p.issue_date === d.issue_date)));
  let dupNote = '';
  if (dup) {
    const when = fmtDate(dup.uploaded_at) || fmtDate(dup.issue_date);
    const what = dup.status === 'approved' ? 'you already approved that one' : dup.status === 'filed' ? "that one's already filed" : "that one's already in your list";
    dupNote = `Heads up, this looks like the same invoice ${d.supplier} sent before, same number ${d.invoice_number || ''} and the same ${m(d.total)}, and ${what}${when ? ` back on ${when}` : ''}, so I held this one to make sure it doesn't get paid twice`.replace('  ', ' ');
    flags.push({ kind: 'duplicate', title: 'Already received', detail: `Same supplier, number ${d.invoice_number || 'n/a'} and ${m(d.total)} as the one received ${when}`, amount: num(d.total), ref: dup.doc_id });
    saved += num(d.total);
  }

  // 3. Quote
  const quote = quotes.find((q) => d.quote_ref && norm(q.quote_ref) === norm(d.quote_ref))
    || quotes.find((q) => sameSupplier(q.supplier, d.supplier));
  let quoteNote = '';
  if (quote && !isReceipt) {
    const qItems = parseJson(quote.items, []);
    const over = [];
    lines.forEach((l) => {
      const q = matchQuoteLine(l, qItems);
      if (q && l.unit_price > num(q.unit_price) * 1.005) {
        const diff = round2((l.unit_price - num(q.unit_price)) * (l.quantity || 1));
        l.agreed = num(q.unit_price);
        over.push({ l, q, diff });
      }
    });
    const overTotal = round2(over.reduce((s, o) => s + o.diff, 0));
    if (over.length) {
      const o = over[0];
      const unit = /hour/i.test(o.l.description + o.q.description) ? ' an hour' : ' each';
      quoteNote = `The quote said ${m(o.q.unit_price)}${unit} for the ${lc(o.l.description.split(',')[0])} but they charged ${m(o.l.unit_price)}, so that's ${m(overTotal)} more than what you agreed on, and I'd check with them before paying`;
      flags.push({ kind: 'over_quote', title: `Higher than quote ${quote.quote_ref}`, detail: over.map((x) => `${x.l.description}: quoted ${m(x.q.unit_price)}, charged ${m(x.l.unit_price)} (${m(x.diff)} more)`).join('. '), amount: overTotal });
      saved += overTotal;
    } else if (num(quote.total) && d.subtotal > num(quote.total) * 1.005) {
      const diff = round2(d.subtotal - num(quote.total));
      quoteNote = `The quote came to ${m(quote.total)} but this one's ${m(d.subtotal)} before tax, so it's ${m(diff)} over, and I'd ask them what changed before paying`;
      flags.push({ kind: 'over_quote', title: `Higher than quote ${quote.quote_ref}`, detail: `Quote ${m(quote.total)}, invoice ${m(d.subtotal)} before tax`, amount: diff });
      saved += diff;
    }
  }

  // 4. Missing or hard to read
  const c = d.confidence || {};
  const missing = [];
  if (!d.supplier) missing.push('who sent it');
  if (!d.total) missing.push('the total');
  if (!isReceipt && d.doc_type === 'invoice' && !d.due_date) missing.push('a due date');
  if (!isReceipt && d.doc_type === 'invoice' && !d.invoice_number) missing.push('an invoice number');
  if (missing.length) flags.push({ kind: 'missing', title: 'Missing information', detail: `I couldn't find ${missing.join(' or ')} on it` });
  const unsure = ['total', 'supplier', 'invoice_number', 'due_date'].filter((k) => c[k] === 'low');
  const NAMES = { total: 'total', supplier: 'supplier name', invoice_number: 'invoice number', due_date: 'due date' };
  if (unsure.length) flags.push({ kind: 'unsure', title: 'Hard to read', detail: `I'm not fully sure about the ${unsure.map((k) => NAMES[k]).join(' and ')}${d.unclear_notes ? `. ${d.unclear_notes}` : ''}` });

  // Status and the note
  const status = flags.length ? 'needs_you' : isReceipt ? 'filed' : 'ready';
  const translated = d.language && !/english/i.test(d.language);
  let note;
  if (dup) note = dupNote;
  else if (quoteNote) note = quoteNote;
  else if (mathNote) note = mathNote;
  else if (missing.length) note = `I couldn't find ${missing.join(' or ')} on this one, so I put it here for you, and once you've had a look it can go with the others`;
  else if (unsure.length) note = `The ${unsure.map((k) => NAMES[k]).join(' and ')} ${unsure.length > 1 ? 'are' : 'is'} a bit hard to read, so I'm not fully sure about ${unsure.includes('total') ? m(d.total) : 'it'}, could you take a quick look before it goes through`;
  else if (status === 'filed') note = `It's a receipt that's already paid${d.payment_method ? ` with the ${d.payment_method}` : ''}, so I just filed it for your records with the tax split out`;
  else {
    const due = d.due_date ? ` before ${fmtDate(d.due_date)}` : '';
    note = quote ? `Everything checks out, the lines add up and the prices match quote ${quote.quote_ref}, so this one's ready whenever you want to pay it${due}`
      : `Everything adds up and nothing looks off, so it's ready to pay${due}`;
  }
  if (translated && !dup) note = `This one was in ${d.language} so I translated it for you, and ${lc(note)}`;
  const otherFlags = flags.length > 1 ? `, and there's ${flags.length - 1} more thing${flags.length > 2 ? 's' : ''} below` : '';
  note += otherFlags;

  const row = { ...base, doc_type: d.doc_type, supplier: d.supplier, invoice_number: d.invoice_number, issue_date: isDate(d.issue_date) ? d.issue_date : '',
    due_date: isDate(d.due_date) ? d.due_date : '', currency: cur, subtotal: round2(d.subtotal || lineSum), tax: round2(d.tax), total: round2(d.total),
    quote_ref: d.quote_ref, language: d.language, status, flags: JSON.stringify(flags), confidence: JSON.stringify(c), lines: JSON.stringify(lines),
    summary: d.summary, agent_note: note, saved: round2(saved), decided_at: '', tax_label: d.tax_label, payment: d.payment_method, quote_used: quote ? quote.quote_ref : '' };
  seen.push(row);
  return row;
});
return rows.map((json) => ({ json }));
