// Shared helpers, added to the top of every Code node by build.js. CFG comes from config.json.
const today = (typeof $now !== 'undefined' && $now && $now.toISODate) ? $now.toISODate() : new Date().toISOString().slice(0, 10);
const nowIso = new Date().toISOString();
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const toUTC = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 86400000); // b - a
const fmtDate = (s) => (isDate(String(s).slice(0, 10)) ? `${MONTHS[Number(String(s).slice(5, 7)) - 1]} ${Number(String(s).slice(8, 10))}` : '');
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(num(n) * 100) / 100;
const money = (n, cur, exact = true) => {
  const v = num(n);
  const digits = exact && Math.round(v * 100) % 100 !== 0 ? 2 : 0;
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || CFG.currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v); }
  catch { return (cur || '') + ' ' + v.toFixed(digits); }
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parseJson = (s, fallback) => { try { const v = JSON.parse(s); return v ?? fallback; } catch { return fallback; } };
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
const sameSupplier = (a, b) => {
  const x = words(a).filter((w) => !['inc', 'llc', 'ltd', 'gmbh', 'the', 'and', 'company'].includes(w));
  const y = words(b);
  return norm(a) === norm(b) || (x.length > 0 && x[0] === y[0]);
};

// What each status and check is called on screen, and the stamp that goes on the document.
const STATUS = {
  ready: { label: 'Ready to pay', stamp: 'READY TO PAY', ink: 'blue' },
  filed: { label: 'Paid, filed', stamp: 'FILED', ink: 'blue' },
  needs_you: { label: 'Needs you', stamp: 'CHECK THIS', ink: 'red' },
  approved: { label: 'Approved', stamp: 'APPROVED', ink: 'blue' },
  rejected: { label: 'Not paying', stamp: 'NOT PAYING', ink: 'red' },
  unreadable: { label: "Couldn't read", stamp: 'UNREADABLE', ink: 'red' },
};
const FLAG_STAMP = { duplicate: 'DUPLICATE', over_quote: 'OVER QUOTE', math: "DOESN'T ADD UP", missing: 'MISSING INFO', unsure: 'CHECK THIS', unreadable: 'UNREADABLE' };
