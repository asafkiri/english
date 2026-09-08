import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');
const oldBlock = `function samRunAskAloud(ob){
  const g=samRun,c=SAM_RUN_COMMANDS[ob&&ob.cmd]; if(!g||!c||!ob) return;
  const word=c.say||String(c.en).toLowerCase();
  ob.askedAt=g.time;`;
const newBlock = `function samRunAskAloud(ob){
  const g=samRun,c=SAM_RUN_COMMANDS[ob&&ob.cmd]; if(!g||!c||!ob) return;
  const word=c.say||String(c.en).toLowerCase();
  /* The listening prompt itself is this question's single automatic English
     pronunciation. Mark it immediately so entering the correct lane or later
     resolving the wave cannot pronounce the same word a second time. Manual
     replay still calls this function directly from the speaker button. */
  ob.spokeCorrect=true;
  ob.askedAt=g.time;`;
if (!html.includes(oldBlock)) throw new Error('samRunAskAloud target not found');
html = html.replace(oldBlock, newBlock);
fs.writeFileSync('index.html', html);

const testPath = 'tests/app.test.mjs';
let tests = fs.readFileSync(testPath, 'utf8');
const anchor = `test('a listening question speaks automatically only once', () => {`;
if (!tests.includes(anchor)) throw new Error('existing one-time test not found');
const test = `test('a listening prompt cannot replay when the runner enters the correct lane', () => {\n  const start=html.indexOf('function samRunAskAloud(ob){');\n  const end=html.indexOf('\\nfunction ',start+1);\n  const fn=html.slice(start,end);\n  assert.match(fn, /ob\\.spokeCorrect=true;/,\n    'asking by ear marks the wave as already automatically spoken');\n  assert.match(html, /if\\(!ob\\.spokeCorrect\\) samRunSpeakLane\\(ob,ob\\.correctLane,false,true\\);/,\n    'the normal resolve path therefore cannot replay a listening prompt');\n});\n\n`;
if (!tests.includes(`test('a listening prompt cannot replay when the runner enters the correct lane'`)) {
  tests = tests.replace(anchor, test + anchor);
  fs.writeFileSync(testPath, tests);
}

const swPath = 'service-worker.js';
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/speak-english-v(\d+)/, (_, n) => `speak-english-v${Number(n)+1}`);
fs.writeFileSync(swPath, sw);
