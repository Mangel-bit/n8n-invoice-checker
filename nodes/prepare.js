// Builds one AI request per document. The AI only reads and reports what is printed,
// the checks (math, duplicates, quotes) happen afterwards in code so they're exact.
const conf = { type: 'string', enum: ['high', 'medium', 'low', 'absent'] };
const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['doc_type', 'supplier', 'invoice_number', 'issue_date', 'due_date', 'currency', 'language', 'quote_ref', 'line_items',
    'subtotal', 'tax', 'tax_label', 'total', 'paid_already', 'payment_method', 'summary', 'confidence', 'unclear_notes'],
  properties: {
    doc_type: { type: 'string', enum: ['invoice', 'receipt', 'credit_note', 'quote', 'other'] },
    supplier: { type: 'string', description: 'Who sent it or sold it, the business name only' },
    invoice_number: { type: 'string', description: 'Invoice, receipt or transaction number exactly as printed, empty if none' },
    issue_date: { type: 'string', description: 'YYYY-MM-DD or empty' },
    due_date: { type: 'string', description: 'YYYY-MM-DD or empty' },
    currency: { type: 'string', description: 'ISO 4217 code like USD or EUR' },
    language: { type: 'string', description: 'Language the document is written in, in English, like English or German' },
    quote_ref: { type: 'string', description: 'Any quote, estimate, PO or order number the document refers to, empty if none' },
    line_items: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['description', 'original_description', 'quantity', 'unit_price', 'amount'],
      properties: {
        description: { type: 'string', description: 'In English' },
        original_description: { type: 'string', description: 'As printed, only when the document is not in English, else empty' },
        quantity: { type: 'number' }, unit_price: { type: 'number' }, amount: { type: 'number', description: 'The line amount exactly as printed' },
      } } },
    subtotal: { type: 'number', description: 'As printed, 0 if not printed' },
    tax: { type: 'number', description: 'As printed, 0 if none' },
    tax_label: { type: 'string', description: 'Like "Sales tax 8.25%" or "VAT 19%", in English' },
    total: { type: 'number', description: 'The final total as printed' },
    paid_already: { type: 'boolean', description: 'True when the document shows it was already paid, like a card receipt' },
    payment_method: { type: 'string', description: 'Like "Visa ending 4417", empty if not shown' },
    summary: { type: 'string', description: 'One short plain sentence saying what this was for, like "Business cards and brochures from the print shop"' },
    confidence: { type: 'object', additionalProperties: false, required: ['supplier', 'invoice_number', 'issue_date', 'due_date', 'total', 'line_items'],
      properties: { supplier: conf, invoice_number: conf, issue_date: conf, due_date: conf, total: conf, line_items: conf } },
    unclear_notes: { type: 'string', description: 'Anything that was hard to read or ambiguous, empty if none' },
  },
};

const SYSTEM = `You read business paperwork (invoices, bills and receipts) for ${CFG.business}, a small design studio run by ${CFG.ownerName}.
Report exactly what is printed on the document:
- Never fix, recalculate or complete numbers. If the printed lines, subtotal and total don't add up, still report the printed values, because a separate check compares them.
- Dates become YYYY-MM-DD. Read the date format from the document's country: 13.11.2026 is 2026-11-13, and US style 11/11/2026 is 2026-11-11.
- Amounts become plain numbers, so "1.234,56 €" is 1234.56 and "$1,576.00" is 1576.
- Translate descriptions to English when the document is in another language, and keep the printed text in original_description.
- Confidence per field: "high" when it's clearly printed, "medium" when you had to infer a little, "low" when it's printed but hard to read (blur, glare, cut off), "absent" when it isn't on the document.
- If the file isn't business paperwork at all, set doc_type to "other" and explain in unclear_notes.`;

return $('One item per file').all().map((it) => {
  const d = it.json;
  if (!d.supported || !d.data) return { json: { doc_id: d.doc_id, skip: 'type' } };
  if (d.bytes > 4.8 * 1024 * 1024 && d.mime !== 'application/pdf') return { json: { doc_id: d.doc_id, skip: 'size' } };
  const file = d.mime === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: d.data } }
    : { type: 'image', source: { type: 'base64', media_type: d.mime, data: d.data } };
  return { json: { doc_id: d.doc_id, aiBody: {
    model: CFG.aiModel,
    max_tokens: 4000,
    system: SYSTEM,
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: [file, { type: 'text', text: `File name: ${d.file_name}\nRead this document and report what it says.` }] }],
  } } };
});
