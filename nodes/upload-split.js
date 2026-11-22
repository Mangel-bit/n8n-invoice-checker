// One item per uploaded file, with the file as base64 so the AI can read it and the page can show it later.
const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
const item = $input.first();
const bin = item.binary || {};
const batch = 'B' + Date.now().toString(36);
const out = [];
let i = 0;
for (const key of Object.keys(bin)) {
  const b = bin[key];
  const name = b.fileName || `document-${i + 1}`;
  const ext = (name.split('.').pop() || '').toLowerCase();
  let mime = String(b.mimeType || '').toLowerCase();
  if (!Object.values(TYPES).includes(mime)) mime = TYPES[ext] || mime;
  let data = '';
  try { data = (await this.helpers.getBinaryDataBuffer(0, key)).toString('base64'); }
  catch (e) { data = typeof b.data === 'string' && b.data.length > 100 ? b.data : ''; }
  out.push({ json: {
    doc_id: `D${Date.now().toString(36)}${i}`,
    batch,
    order: i,
    file_name: name,
    mime,
    supported: Object.values(TYPES).includes(mime),
    bytes: Math.round(data.length * 0.75),
    data,
  } });
  i++;
}
return out;
