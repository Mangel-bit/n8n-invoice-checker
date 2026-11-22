//@ seed-papers
// Three documents that were read before the demo starts, so the ledger isn't empty
// and the Brightwave invoice can be caught as a duplicate later.
const existing = $('Get papers').all().filter((i) => i.json.doc_id);
if (existing.length) return [];
const conf = JSON.stringify({ supplier: 'high', invoice_number: 'high', issue_date: 'high', due_date: 'high', total: 'high', line_items: 'high' });
const row = (r) => ({ batch: 'seed', mime: 'image/jpeg', quote_ref: '', language: 'English', flags: '[]', confidence: conf, saved: 0, decided_at: '', tax_label: '', payment: '', quote_used: '', ...r });
return [
  row({ doc_id: 'S1brightwave', uploaded_at: '2026-10-28T16:20:00.000Z', file_name: 'brightwave-invoice.jpg', doc_type: 'invoice', supplier: 'Brightwave Hosting',
    invoice_number: 'BW-88412', issue_date: '2026-10-28', due_date: '2026-11-27', currency: 'USD', subtotal: 240, tax: 0, total: 240, tax_label: 'Tax',
    status: 'approved', decided_at: '2026-10-30T10:05:00.000Z', summary: 'A year of Studio Pro website hosting, Nov 2026 to Oct 2027',
    lines: JSON.stringify([{ description: 'Studio Pro hosting plan, annual (Nov 2026 to Oct 2027)', original_description: '', quantity: 1, unit_price: 240, amount: 240 }]),
    agent_note: "Everything adds up and nothing looks off, so it's ready to pay before Nov 27" }),
  row({ doc_id: 'S2copperline', uploaded_at: '2026-11-12T18:02:00.000Z', file_name: 'copperline-receipt.jpg', doc_type: 'receipt', supplier: 'Copperline Coffee',
    invoice_number: '4471', issue_date: '2026-11-12', due_date: '', currency: 'USD', subtotal: 15.75, tax: 1.3, total: 17.05, tax_label: 'Tax', payment: 'Mastercard ending 2290',
    status: 'filed', summary: 'Coffee and a croissant for a client meeting',
    lines: JSON.stringify([{ description: 'Flat white', original_description: '', quantity: 2, unit_price: 4.5, amount: 9 }, { description: 'Butter croissant', original_description: '', quantity: 1, unit_price: 3.75, amount: 3.75 }, { description: 'Sparkling water', original_description: '', quantity: 1, unit_price: 3, amount: 3 }]),
    agent_note: "It's a receipt that's already paid with the Mastercard ending 2290, so I just filed it for your records with the tax split out" }),
  row({ doc_id: 'S3studiosupply', uploaded_at: '2026-11-10T21:40:00.000Z', file_name: 'studio-supply-invoice.jpg', doc_type: 'invoice', supplier: 'Studio Supply Co.',
    invoice_number: 'SSC-3307', issue_date: '2026-11-10', due_date: '2026-12-10', currency: 'USD', subtotal: 109.95, tax: 9.07, total: 119.02, tax_label: 'Tax',
    status: 'ready', summary: 'Printer paper and black ink for the office',
    lines: JSON.stringify([{ description: 'Printer paper, letter, ream', original_description: '', quantity: 5, unit_price: 8.99, amount: 44.95 }, { description: 'Ink cartridge, black XL', original_description: '', quantity: 2, unit_price: 32.5, amount: 65 }]),
    agent_note: "Everything adds up and nothing looks off, so it's ready to pay before Dec 10" }),
].map((json) => ({ json }));

//@ seed-quotes
// Quotes the studio already accepted, which invoices get compared against. Only runs right after the papers were seeded.
return [
  { quote_ref: 'Q-118', supplier: 'Kova Print Co.', currency: 'USD', total: 435, accepted_on: '2026-11-03',
    items: JSON.stringify([{ description: 'Business cards, 16pt matte', quantity: 500, unit_price: 0.18 }, { description: 'Tri-fold brochures, 100lb gloss', quantity: 250, unit_price: 1.2 }, { description: 'Design proof round', quantity: 1, unit_price: 45 }]) },
  { quote_ref: 'Q-2031', supplier: 'Pixel & Pine Photography', currency: 'USD', total: 730, accepted_on: '2026-11-05',
    items: JSON.stringify([{ description: 'Product photo shoot, studio, per hour', quantity: 6, unit_price: 95 }, { description: 'Retouching, per image', quantity: 20, unit_price: 8 }]) },
].map((json) => ({ json }));
