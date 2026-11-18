// Builds the Paperwork Reader workflows into ./workflows from config.json and the Code files in ./nodes.
// Run: node build.js   then import each file with: n8n import:workflow --input=workflows/<file>.json
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const ROOT = __dirname;
const { credentials: CRED, ...CFG } = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const read = (f) => fs.readFileSync(path.join(ROOT, 'nodes', f), 'utf8');
const prefix = `const CFG = ${JSON.stringify(CFG)};\n${read('_shared.js')}\n`;
const ui = read('_ui.js') + '\n';
const file = (f, withUi = false) => prefix + (withUi ? ui : '') + read(f);
const snippetsOf = (f) => Object.fromEntries(read(f).split(/^\/\/@ /m).slice(1)
  .map((s) => { const [name, ...rest] = s.split('\n'); return [name.trim(), prefix + rest.join('\n')]; }));
const S = { ...snippetsOf('actions.js'), ...snippetsOf('seed.js') };

// The three older documents ship inside the workflow so a reset brings them back.
const seedDir = path.join(ROOT, 'samples', 'seed');
const seedFiles = [['S1brightwave', 'brightwave-invoice.jpg'], ['S2copperline', 'copperline-receipt.jpg'], ['S3studiosupply', 'studio-supply-invoice.jpg']]
  .map(([doc_id, f]) => ({ doc_id, mime: 'image/jpeg', data: fs.readFileSync(path.join(seedDir, f)).toString('base64') }));
const seedFilesCode = `// The original images of the three demo documents.\nreturn ${JSON.stringify(seedFiles)}.map((json) => ({ json }));`;

const PAPER_COLS = [['doc_id', 's'], ['batch', 's'], ['uploaded_at', 's'], ['file_name', 's'], ['mime', 's'], ['doc_type', 's'], ['supplier', 's'],
  ['invoice_number', 's'], ['issue_date', 's'], ['due_date', 's'], ['currency', 's'], ['subtotal', 'n'], ['tax', 'n'], ['total', 'n'], ['quote_ref', 's'],
  ['language', 's'], ['status', 's'], ['flags', 's'], ['confidence', 's'], ['lines', 's'], ['summary', 's'], ['agent_note', 's'], ['saved', 'n'],
  ['decided_at', 's'], ['tax_label', 's'], ['payment', 's'], ['quote_used', 's']];
const FILE_COLS = [['doc_id', 's'], ['mime', 's'], ['data', 's']];
const QUOTE_COLS = [['quote_ref', 's'], ['supplier', 's'], ['currency', 's'], ['total', 'n'], ['items', 's'], ['accepted_on', 's']];
// No table name may be part of another one: n8n's "create if missing" matches names loosely.
const T = { papers: 'Paperwork docs', files: 'Paperwork files', quotes: 'Paperwork quotes' };
const colType = { s: 'string', n: 'number' };

// ---------- node factories ----------
const at = (col, row = 0) => [col * 240, row * 200];
const code = (name, src, pos) => ({ name, type: 'n8n-nodes-base.code', typeVersion: 2, position: pos, parameters: { jsCode: src } });
const table = (t) => ({ __rl: true, mode: 'name', value: t });
const dt = (name, pos, parameters, extra = {}) => ({ name, type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: pos, parameters, ...extra });
const createTable = (name, t, cols, pos) => dt(name, pos, { resource: 'table', operation: 'create', tableName: t,
  columns: { column: cols.map(([n, ty]) => ({ name: n, type: colType[ty] })) }, options: { createIfNotExists: true } });
const clearTable = (name, t, pos) => dt(name, pos, { resource: 'table', operation: 'clear', dataTableId: table(t) });
const getAll = (name, t, pos) => dt(name, pos, { resource: 'row', operation: 'get', dataTableId: table(t), matchType: 'anyCondition', filters: {}, returnAll: true },
  { executeOnce: true, alwaysOutputData: true });
const getWhere = (name, t, key, value, pos) => dt(name, pos, { resource: 'row', operation: 'get', dataTableId: table(t), matchType: 'allConditions',
  filters: { conditions: [{ keyName: key, condition: 'eq', keyValue: value }] }, returnAll: true }, { executeOnce: true, alwaysOutputData: true });
const insert = (name, t, pos) => dt(name, pos, { resource: 'row', operation: 'insert', dataTableId: table(t), columns: { mappingMode: 'autoMapInputData', value: null }, options: {} });
const update = (name, t, key, pos) => dt(name, pos, { resource: 'row', operation: 'update', dataTableId: table(t), matchType: 'allConditions',
  filters: { conditions: [{ keyName: key, condition: 'eq', keyValue: `={{ $json.${key} }}` }] }, columns: { mappingMode: 'autoMapInputData', value: null }, options: {} });
const claude = (name, pos) => ({ name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: pos, onError: 'continueRegularOutput',
  // Without a credential id in config.json, n8n asks you to pick your Anthropic credential on the node after import.
  ...(CRED.anthropic && CRED.anthropic.id ? { credentials: { anthropicApi: CRED.anthropic } } : {}),
  parameters: { method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'predefinedCredentialType', nodeCredentialType: 'anthropicApi',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2026-10-21' }, { name: 'anthropic-beta', value: 'server-side-fallback-2026-07-01' }] },
    sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.claudeBody) }}',
    options: { batching: { batch: { batchSize: 6, batchInterval: 200 } }, timeout: 180000 } } });
const webhook = (name, method, p, mode, id, pos, extra = {}) => ({ name, type: 'n8n-nodes-base.webhook', typeVersion: 2.1, position: pos, webhookId: id,
  parameters: { httpMethod: method, path: p, responseMode: mode, options: {}, ...extra } });
const respond = (name, body, headers, pos, codeNo = 200) => ({ name, type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.5, position: pos,
  parameters: { respondWith: 'text', responseBody: body, options: { responseCode: codeNo, responseHeaders: { entries: headers } } } });
const redirect = (name, to, pos) => respond(name, 'Redirectingâ€¦', [{ name: 'Location', value: to }], pos, 303);
const page = (name, pos) => respond(name, '={{ $json.html }}', [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }, { name: 'Cache-Control', value: 'no-store' }], pos);

const wf = (id, name, nodes, links) => {
  const connections = {};
  for (const [from, ...to] of links) connections[from] = { main: [to.map((n) => ({ node: n, type: 'main', index: 0 }))] };
  nodes.forEach((n) => { n.id = n.id || randomUUID(); });
  return { id, name, active: false, nodes, connections, settings: { executionOrder: 'v1' }, pinData: {} };
};
const chain = (...names) => names.slice(0, -1).map((n, i) => [n, names[i + 1]]);
const ID = (n) => `7b2e3d4f-5a6b-4c70-8d91-a3b4c5d6e7${String(n).padStart(2, '0')}`;

// ---------- 0. Setup ----------
//   POST /webhook/papers-setup  creates the tables and adds the demo data if they're empty
//   POST /webhook/papers-reset  test mode only: wipes everything and reloads the demo data
const setup = wf('paperReadSetup00', 'Paperwork Reader Â· 0 Setup', [
  webhook('Run setup (link)', 'POST', 'papers-setup', 'responseNode', ID(0), at(0, -1)),
  createTable('Create papers table', T.papers, PAPER_COLS, at(1, -1)),
  createTable('Create files table', T.files, FILE_COLS, at(2, -1)),
  createTable('Create quotes table', T.quotes, QUOTE_COLS, at(3, -1)),
  webhook('Reset demo', 'POST', 'papers-reset', 'responseNode', ID(1), at(0, 1)),
  code('Only in test mode', prefix + 'if (!CFG.testMode) return [];\nreturn $input.all();', at(1, 1)),
  createTable('Papers table', T.papers, PAPER_COLS, at(2, 1)),
  createTable('Files table', T.files, FILE_COLS, at(3, 1)),
  createTable('Quotes table', T.quotes, QUOTE_COLS, at(4, 1)),
  clearTable('Clear papers', T.papers, at(5, 1)),
  clearTable('Clear files', T.files, at(6, 1)),
  clearTable('Clear quotes', T.quotes, at(7, 1)),
  getAll('Get papers', T.papers, at(8)),
  code('Demo papers (only if empty)', S['seed-papers'], at(9)),
  insert('Save papers', T.papers, at(10)),
  code('Demo files', seedFilesCode, at(11)),
  insert('Save files', T.files, at(12)),
  code('Demo quotes', S['seed-quotes'], at(13)),
  insert('Save quotes', T.quotes, at(14)),
  redirect('Back to paperwork', '/webhook/papers?done=reset', at(15)),
], [
  ...chain('Run setup (link)', 'Create papers table', 'Create files table', 'Create quotes table', 'Get papers'),
  ...chain('Reset demo', 'Only in test mode', 'Papers table', 'Files table', 'Quotes table', 'Clear papers', 'Clear files', 'Clear quotes', 'Get papers'),
  ...chain('Get papers', 'Demo papers (only if empty)', 'Save papers', 'Demo files', 'Save files', 'Demo quotes', 'Save quotes', 'Back to paperwork'),
]);

// ---------- 1. Read documents ----------
// The browser waits while the agent reads, then gets one redirect back to the ledger with the new rows marked.
const reader = wf('paperReadDocs001', 'Paperwork Reader Â· 1 Read documents', [
  webhook('Upload', 'POST', 'papers-upload', 'lastNode', ID(10), at(0), {
    responseData: 'noData',
    options: {
      responseCode: { values: { responseCode: 'customCode', customCode: 303 } },
      responseHeaders: { entries: [{ name: 'Location', value: '/webhook/papers?new=1' }] },
    },
  }),
  code('One item per file', file('upload-split.js'), at(1)),
  getAll('Get papers', T.papers, at(2)),
  getAll('Get quotes', T.quotes, at(3)),
  code('Prepare AI', file('prepare.js'), at(4)),
  claude('Claude reads the document', at(5)),
  code('Check', file('check.js'), at(6)),
  insert('Save papers', T.papers, at(7)),
  code('File rows', S['file-rows'], at(8)),
  insert('Save files', T.files, at(9)),
], [...chain('Upload', 'One item per file', 'Get papers', 'Get quotes', 'Prepare AI', 'Claude reads the document', 'Check', 'Save papers', 'File rows', 'Save files')]);

// ---------- 2. Pages ----------
const pages = wf('paperReadPages01', 'Paperwork Reader Â· 2 Pages', [
  webhook('Paperwork page', 'GET', 'papers', 'responseNode', ID(20), at(0, 0)),
  getAll('Get papers for page', T.papers, at(1, 0)),
  code('Render paperwork', file('render-dashboard.js', true), at(2, 0)),
  page('Send page', at(3, 0)),

  webhook('Document page', 'GET', 'papers-doc', 'responseNode', ID(21), at(0, 1)),
  getAll('Get papers for doc', T.papers, at(1, 1)),
  getWhere('Get file', T.files, 'doc_id', "={{ $('Document page').first().json.query.id }}", at(2, 1)),
  code('Render document', file('render-doc.js', true), at(3, 1)),
  page('Send document', at(4, 1)),

  webhook('Document action', 'POST', 'papers-action', 'responseNode', ID(22), at(0, 2)),
  getAll('Get papers for action', T.papers, at(1, 2)),
  code('Apply action', S['apply-action'], at(2, 2)),
  update('Update paper', T.papers, 'doc_id', at(3, 2)),
  redirect('Back to document', "=/webhook/papers-doc?id={{ $('Apply action').first().json.doc_id }}&done={{ $('Document action').first().json.body.action }}", at(4, 2)),

  webhook('Export', 'GET', 'papers-export', 'responseNode', ID(23), at(0, 3)),
  getAll('Get papers for export', T.papers, at(1, 3)),
  code('Build CSV', S['export-csv'], at(2, 3)),
  respond('Send CSV', '={{ $json.csv }}', [{ name: 'Content-Type', value: 'text/csv; charset=utf-8' },
    { name: 'Content-Disposition', value: '=attachment; filename="{{ $json.name }}"' }], at(3, 3)),
], [
  ...chain('Paperwork page', 'Get papers for page', 'Render paperwork', 'Send page'),
  ...chain('Document page', 'Get papers for doc', 'Get file', 'Render document', 'Send document'),
  ...chain('Document action', 'Get papers for action', 'Apply action', 'Update paper', 'Back to document'),
  ...chain('Export', 'Get papers for export', 'Build CSV', 'Send CSV'),
]);

fs.mkdirSync(path.join(ROOT, 'workflows'), { recursive: true });
for (const [f, w] of [['0-setup', setup], ['1-read-documents', reader], ['2-pages', pages]]) {
  fs.writeFileSync(path.join(ROOT, 'workflows', f + '.json'), JSON.stringify(w, null, 2));
}
console.log('Built 3 workflows. Seed files:', seedFiles.map((f) => `${f.doc_id} ${Math.round(f.data.length / 1024)}KB`).join(', '));
