// Shared look for the pages: green ledger paper, a dark desk the documents sit on, and rubber stamps.
const FONTS = 'https://fonts.googleapis.com/css2?family=Anton&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap';
const BASE_CSS = `
:root{--paper:#EDF2EC;--sheet:#F9FBF8;--rule:#CCDBC8;--rule-2:#9FBC99;--ink:#13201B;--muted:#56685F;
--desk:#1B362F;--desk-2:#132923;--desk-3:#24463D;--desk-ink:#E6EFEA;--desk-muted:#9BB4AA;
--red:#C2303A;--blue:#2A49AC;--hl:#F4E35E;--ok:#1D7A4C;
--f:"Schibsted Grotesk","Segoe UI",system-ui,sans-serif;--stamp:"Anton","Impact",sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--f);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit}
button,input{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--hl);outline-offset:3px;border-radius:4px}
.wrap{max-width:1240px;margin:0 auto;padding:0 28px}
h1,h2,h3{margin:0;letter-spacing:-.02em;line-height:1.08}
p{margin:0}

.bar{background:var(--desk-2);color:var(--desk-ink)}
.bar .wrap{display:flex;align-items:center;gap:18px;height:62px}
.brand{display:flex;align-items:center;gap:11px;text-decoration:none;font-weight:800;font-size:17px;letter-spacing:-.01em}
.brand svg{width:28px;height:28px}
.brand small{font-weight:500;color:var(--desk-muted);font-size:14px;margin-left:4px}
.bar .grow{flex:1}
.chip{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--desk-muted);border:1px solid var(--desk-3);border-radius:999px;padding:5px 12px}
.chip i{width:7px;height:7px;border-radius:50%;background:var(--hl)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:10px;padding:12px 20px;font-weight:700;font-size:15px;cursor:pointer;text-decoration:none;transition:transform .12s ease,background .15s}
.btn:active{transform:translateY(1px)}
.btn.light{background:var(--desk-ink);color:var(--desk-2)}
.btn.light:hover{background:#fff}
.btn.ghost{background:transparent;color:var(--desk-ink);border:1px solid var(--desk-3)}
.btn.ghost:hover{border-color:var(--desk-muted)}
.btn.blue{background:var(--blue);color:#fff}
.btn.blue:hover{background:#2340a0}
.btn.red-line{background:transparent;color:var(--red);border:1.5px solid color-mix(in srgb,var(--red) 45%,transparent)}
.btn.red-line:hover{border-color:var(--red)}
.btn[disabled]{opacity:.55;cursor:default}
.bar .btn{padding:8px 14px;font-size:14px}

.stamp{--c:var(--red);--r:-7deg;display:inline-block;font-family:var(--stamp);font-weight:400;letter-spacing:.07em;line-height:1;color:var(--c);
  border:3px solid var(--c);outline:1.5px solid var(--c);outline-offset:3px;border-radius:5px;padding:7px 12px 6px;white-space:nowrap;
  transform:rotate(var(--r));filter:url(#ink);opacity:.9;text-transform:uppercase}
.stamp.blue{--c:var(--blue)}
.stamp.sm{font-size:13px;border-width:2px;outline-width:1px;outline-offset:2px;padding:4px 7px 3px;border-radius:4px;filter:url(#ink-sm);opacity:.95}
.stamp.thud{animation:thud .5s cubic-bezier(.2,.9,.25,1) both}
@keyframes thud{0%{opacity:0;transform:rotate(var(--r)) scale(2.6)}55%{opacity:.95;transform:rotate(var(--r)) scale(.93)}100%{opacity:.9;transform:rotate(var(--r)) scale(1)}}
.flash{background:var(--hl);color:var(--ink);font-weight:600;padding:12px 16px;border-radius:10px;display:flex;gap:10px;align-items:center}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}
.bar .short{display:none}
@media (max-width:640px){.wrap{padding:0 16px}.bar .chip{display:none}.brand small{display:none}.bar .long{display:none}.bar .short{display:inline}}
`;
// Roughens the stamp edges and knocks a few specks out of the ink, like a real rubber stamp.
const INK_SVG = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ink" x="-10%" y="-20%" width="120%" height="140%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="11" result="m"/>
<feColorMatrix in="m" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -2 1.72" result="mask"/><feComposite in="d" in2="mask" operator="in"/></filter>
<filter id="ink-sm" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="1" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="2" result="m"/><feColorMatrix in="m" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.3 1.5" result="mask"/><feComposite in="d" in2="mask" operator="in"/></filter></svg>`;
const MARK = `<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="7" y="3" width="15" height="19" rx="2" fill="#2E554A"/><rect x="4" y="6" width="15" height="19" rx="2" fill="#E6EFEA"/>
<path d="M7.5 11h8M7.5 14h8M7.5 17h5" stroke="#9BB4AA" stroke-width="1.4" stroke-linecap="round"/><circle cx="20" cy="20" r="5.2" fill="none" stroke="#F4E35E" stroke-width="2"/><path d="M17.8 20.1l1.5 1.5 2.9-3" fill="none" stroke="#F4E35E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const head = (title, extraCss = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="${FONTS}"><style>${BASE_CSS}${extraCss}</style></head><body>${INK_SVG}`;
const topBar = () => `<header class="bar"><div class="wrap"><a class="brand" href="/webhook/papers">${MARK}Paperwork Reader<small>for ${esc(CFG.business)}</small></a><span class="grow"></span>
<span class="chip"><i></i>Demo mode, nothing gets paid from here</span><a class="btn ghost" href="/webhook/papers-export"><span class="long">Export for your accountant</span><span class="short">Export</span></a></div></header>`;
const stamp = (text, ink, rot, cls = '') => `<span class="stamp ${ink === 'blue' ? 'blue' : ''} ${cls}" style="--r:${rot}deg">${esc(text)}</span>`;
const flagsOf = (p) => parseJson(p.flags, []);
// The stamp a document gets: its worst problem when it needs you, otherwise its status.
const mainStamp = (p) => {
  const f = flagsOf(p);
  if (p.status === 'needs_you' && f.length) return { text: FLAG_STAMP[f[0].kind] || 'CHECK THIS', ink: 'red' };
  const s = STATUS[p.status] || STATUS.needs_you;
  return { text: s.stamp, ink: s.ink };
};
// "$589.91 and €249.90" when there's more than one currency.
const sumByCurrency = (rows, field = 'total') => {
  const by = {};
  rows.forEach((r) => { const c = r.currency || CFG.currency; by[c] = (by[c] || 0) + num(r[field]); });
  const keys = Object.keys(by).sort((a, b) => (a === CFG.currency ? -1 : b === CFG.currency ? 1 : 0));
  return keys.length ? keys.map((c) => money(by[c], c)).join(' and ') : money(0);
};
const typeLabel = (p) => ({ invoice: 'Invoice', receipt: 'Receipt', credit_note: 'Credit note', quote: 'Quote' }[p.doc_type] || 'Document');
