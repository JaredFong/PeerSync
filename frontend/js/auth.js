const fs = require('fs');
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const f = process.argv[1];
const s = fs.readFileSync(f, 'utf8');
const sf = ts.createSourceFile(f, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
if (sf.parseDiagnostics.length) {
    console.error(sf.parseDiagnostics.map(d => d.messageText).join('\n'));
    process.exit(2);
}
process.stdout.write(ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false }).printFile(sf));
