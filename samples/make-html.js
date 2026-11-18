// Writes the HTML source for every sample document into samples/html.
// make-docs.ps1 then turns them into PDFs, scans and phone photos with Edge and System.Drawing.
const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'html');
fs.mkdirSync(out, { recursive: true });

const usd = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const page = (body, css, size = 'letter') => `<!doctype html><html><head><meta charset="utf-8">
<style>@page{size:${size};margin:0}*{box-sizing:border-box}html,body{margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}${css}</style></head><body>${body}</body></html>`;
const rows = (lines, fmt = usd) => lines.map(([d, q, u]) => `<tr><td>${d}</td><td class="r">${q}</td><td class="r">${fmt(u)}</td><td class="r">${fmt(q * u)}</td></tr>`).join('');

// ---------- Invoice styles ----------
const invCss = (accent, font) => `
body{font-family:${font};color:#1d1f24;width:8.5in;height:11in;padding:.75in .8in;font-size:12.5px;line-height:1.45;background:#fff}
.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${accent};padding-bottom:22px}
.logo{font-size:26px;font-weight:800;letter-spacing:-.02em;color:${accent}}
.sub{color:#666;font-size:11.5px}
h1{font-size:30px;margin:0;letter-spacing:.06em;font-weight:300;color:#333;text-align:right}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin:28px 0}
.meta b{display:block;font-size:10.5px;color:#888;font-weight:600;letter-spacing:.08em;margin-bottom:4px}
.kv{display:grid;grid-template-columns:auto auto;gap:3px 18px;justify-content:end;text-align:right}
.kv span:nth-child(odd){color:#777}
table{width:100%;border-collapse:collapse;margin-top:10px}
th{text-align:left;font-size:10.5px;letter-spacing:.08em;color:#777;border-bottom:1px solid #ccc;padding:8px 6px;font-weight:600}
td{padding:10px 6px;border-bottom:1px solid #eee}
.r{text-align:right}
.tot{margin-left:auto;width:290px;margin-top:18px}
.tot div{display:flex;justify-content:space-between;padding:5px 6px}
.tot .g{border-top:2px solid #1d1f24;font-weight:800;font-size:15px;margin-top:4px;padding-top:9px}
.foot{position:absolute;bottom:.7in;left:.8in;right:.8in;color:#777;font-size:11px;border-top:1px solid #eee;padding-top:12px}
`;
const invoice = ({ accent, font, logo, sub, from, to, meta, lines, totals, foot, fmt = usd, labels = {} }) => page(`
<div class="top"><div><div class="logo">${logo}</div><div class="sub">${sub}</div></div><h1>${labels.title || 'INVOICE'}</h1></div>
<div class="meta"><div><b>${labels.billTo || 'BILL TO'}</b>${to}</div><div class="kv">${meta.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join('')}</div></div>
<table><thead><tr><th>${labels.desc || 'DESCRIPTION'}</th><th class="r">${labels.qty || 'QTY'}</th><th class="r">${labels.unit || 'UNIT PRICE'}</th><th class="r">${labels.amount || 'AMOUNT'}</th></tr></thead><tbody>${rows(lines, fmt)}</tbody></table>
<div class="tot">${totals.map(([k, v, g]) => `<div class="${g ? 'g' : ''}"><span>${k}</span><span>${v}</span></div>`).join('')}</div>
<div class="foot">${from}<br>${foot}</div>`, invCss(accent, font));

const northlight = 'Northlight Studio<br>Attn: Sam<br>418 Alder Street, Suite 3<br>Portland, OR 97204';

// D1 Kova Print Co: clean, matches quote Q-118
const kova = [['Business cards, 16pt matte, 500 pcs', 500, 0.18], ['Tri-fold brochures, 100lb gloss', 250, 1.20], ['Design proof round', 1, 45]];
fs.writeFileSync(path.join(out, 'kova-print-invoice.html'), invoice({
  accent: '#0f6b5c', font: '"Segoe UI", Arial, sans-serif', logo: 'KOVA PRINT CO.', sub: '2210 SE Division St, Portland OR 97202 · (503) 555-0148 · billing@kovaprint.co',
  to: northlight, meta: [['Invoice #', 'KP-1182'], ['Date', 'Nov 14, 2026'], ['Due', 'Dec 14, 2026'], ['Your quote', 'Q-118'], ['Terms', 'Net 30']],
  lines: kova, totals: [['Subtotal', usd(435)], ['Sales tax 8.25%', usd(35.89)], ['Total due', usd(470.89), 1]],
  from: 'Kova Print Co. · EIN 93-4417820', foot: 'Pay online at kovaprint.co/pay or by check to the address above. Thank you for your business.',
}));

// D3 + seed S1 Brightwave Hosting: the duplicate
fs.writeFileSync(path.join(out, 'brightwave-invoice.html'), invoice({
  accent: '#3a3fd8', font: 'Georgia, "Times New Roman", serif', logo: 'brightwave', sub: 'Managed hosting for small studios · brightwave.host',
  to: northlight, meta: [['Invoice', 'BW-88412'], ['Issued', 'October 28, 2026'], ['Due', 'November 27, 2026'], ['Account', 'NLS-2291']],
  lines: [['Studio Pro hosting plan, annual (Nov 2026 to Oct 2027)', 1, 240]], totals: [['Subtotal', usd(240)], ['Tax', usd(0)], ['Amount due', usd(240), 1]],
  from: 'Brightwave Hosting LLC · 77 Market St, San Francisco CA 94105', foot: 'Questions about this invoice? Reply to billing@brightwave.host',
}));

// D4 Pixel & Pine: charged $120/hr, quote Q-2031 said $95/hr
fs.writeFileSync(path.join(out, 'pixel-pine-invoice.html'), invoice({
  accent: '#7a4b2a', font: '"Trebuchet MS", Arial, sans-serif', logo: 'Pixel &amp; Pine', sub: 'Product photography · Jonah Reyes · jonah@pixelandpine.photo',
  to: northlight, meta: [['Invoice no.', 'PP-2031-1'], ['Date', 'Nov 15, 2026'], ['Due', 'Nov 29, 2026'], ['Quote', 'Q-2031']],
  lines: [['Product photo shoot, studio (hours)', 6, 120], ['Retouching, per image', 20, 8]], totals: [['Subtotal', usd(880)], ['Tax (services)', usd(0)], ['Total', usd(880), 1]],
  from: 'Pixel &amp; Pine Photography · 1130 NW Glisan St, Portland OR 97209', foot: 'Please make payment within 14 days. Venmo @pixelandpine or bank transfer.',
}));

// D5 Atlas Office Furniture: lines add to 1,576 but subtotal says 1,676
fs.writeFileSync(path.join(out, 'atlas-invoice.html'), invoice({
  accent: '#b4361f', font: 'Arial, Helvetica, sans-serif', logo: 'ATLAS OFFICE FURNITURE', sub: 'Commercial furniture since 1998 · 600 N Interstate Ave, Portland OR 97227',
  to: northlight, meta: [['Invoice #', 'AOF-5521'], ['Invoice date', '11/11/2026'], ['Payment due', '12/11/2026'], ['Order', 'SO-77310']],
  lines: [['Ergonomic task chair, graphite', 2, 389], ['Electric standing desk 60x30', 1, 640], ['Dual monitor arm', 2, 79]],
  totals: [['Subtotal', usd(1676)], ['Sales tax 8.25%', usd(138.27)], ['Total', usd(1814.27), 1]],
  from: 'Atlas Office Furniture Inc. · accounts@atlasoffice.com · (503) 555-0199', foot: 'Delivery included. 1.5% monthly late fee on overdue balances.',
}));

// D6 Druckerei Weber (German, EUR)
const eur = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
fs.writeFileSync(path.join(out, 'weber-rechnung.html'), invoice({
  accent: '#1f2d3d', font: '"Segoe UI", Arial, sans-serif', logo: 'Druckerei Weber GmbH', sub: 'Hafenstraße 12 · 20457 Hamburg · Tel. +49 40 5550 3321 · info@druckerei-weber.de',
  to: 'Northlight Studio<br>z. Hd. Sam<br>418 Alder Street, Suite 3<br>Portland, OR 97204, USA',
  meta: [['Rechnungsnr.', 'RE-2026-0457'], ['Rechnungsdatum', '13.11.2026'], ['Zahlbar bis', '27.11.2026'], ['Kundennr.', 'K-10882']],
  lines: [['Visitenkarten, 350 g, beidseitig', 1000, 0.09], ['Plakate DIN A2, 170 g', 50, 2.4]], fmt: eur,
  labels: { title: 'RECHNUNG', billTo: 'RECHNUNG AN', desc: 'BESCHREIBUNG', qty: 'MENGE', unit: 'EINZELPREIS', amount: 'BETRAG' },
  totals: [['Nettobetrag', eur(210)], ['MwSt. 19 %', eur(39.9)], ['Gesamtbetrag', eur(249.9), 1]],
  from: 'Druckerei Weber GmbH · USt-IdNr. DE 287 445 190 · Amtsgericht Hamburg HRB 99213', foot: 'Bitte überweisen Sie den Betrag bis zum Fälligkeitsdatum. IBAN DE44 2005 0550 1234 5678 90',
}));

// Seed S3 Studio Supply Co
fs.writeFileSync(path.join(out, 'studio-supply-invoice.html'), invoice({
  accent: '#2a6fb0', font: 'Verdana, sans-serif', logo: 'Studio Supply Co.', sub: 'Art and office supplies · studiosupply.co',
  to: northlight, meta: [['Invoice', 'SSC-3307'], ['Date', 'Nov 10, 2026'], ['Due', 'Dec 10, 2026']],
  lines: [['Printer paper, letter, ream', 5, 8.99], ['Ink cartridge, black XL', 2, 32.5]], totals: [['Subtotal', usd(109.95)], ['Tax', usd(9.07)], ['Total', usd(119.02), 1]],
  from: 'Studio Supply Co. · 5 W Burnside St, Portland OR 97209', foot: 'Thanks for shopping local.',
}));

// ---------- Receipts ----------
const rcptCss = `body{font-family:"Courier New",monospace;width:340px;padding:22px 20px 30px;background:#fff;color:#222;font-size:13px;line-height:1.35}
.c{text-align:center}.b{font-weight:700}.big{font-size:18px;font-weight:700}hr{border:0;border-top:1px dashed #555;margin:10px 0}
.l{display:flex;justify-content:space-between;gap:8px}`;
const receipt = (body) => page(body, rcptCss, 'auto');

// D2 Harbor Hardware (photo)
fs.writeFileSync(path.join(out, 'harbor-hardware-receipt.html'), receipt(`
<div class="c big">HARBOR HARDWARE</div><div class="c">1820 NE Broadway<br>Portland, OR 97232<br>(503) 555-0110</div><hr>
<div class="l"><span>11/16/2026</span><span>14:32</span></div><div class="l"><span>Store 04  Reg 2</span><span>Trans 88213</span></div><hr>
<div class="l"><span>EXT CORD 25FT 14GA</span><span>18.99</span></div>
<div class="l"><span>GAFFER TAPE BLK 2"</span><span></span></div><div class="l"><span>&nbsp; 2 @ 11.49</span><span>22.98</span></div>
<div class="l"><span>LED BULB A19 4PK</span><span>14.99</span></div><hr>
<div class="l"><span>SUBTOTAL</span><span>56.96</span></div><div class="l"><span>TAX 8.25%</span><span>4.70</span></div>
<div class="l b"><span>TOTAL</span><span>61.66</span></div><hr>
<div class="l"><span>VISA ****4417</span><span>61.66</span></div><div class="l"><span>APPROVED  AUTH 093317</span><span></span></div><hr>
<div class="c">ITEMS 4<br>THANK YOU FOR SHOPPING LOCAL<br>RETURNS WITHIN 30 DAYS W/ RECEIPT</div>`));

// Seed S2 Copperline Coffee
fs.writeFileSync(path.join(out, 'copperline-receipt.html'), receipt(`
<div class="c big">COPPERLINE COFFEE</div><div class="c">412 SW 10th Ave, Portland</div><hr>
<div class="l"><span>11/12/2026 10:14</span><span>Order #4471</span></div><hr>
<div class="l"><span>2 FLAT WHITE</span><span>9.00</span></div><div class="l"><span>1 BUTTER CROISSANT</span><span>3.75</span></div><div class="l"><span>1 SPARKLING WATER</span><span>3.00</span></div><hr>
<div class="l"><span>SUBTOTAL</span><span>15.75</span></div><div class="l"><span>TAX</span><span>1.30</span></div><div class="l b"><span>TOTAL</span><span>17.05</span></div><hr>
<div class="l"><span>MASTERCARD ****2290</span><span>17.05</span></div><div class="c">thanks, see you soon</div>`));

console.log('html written:', fs.readdirSync(out).join(', '));
