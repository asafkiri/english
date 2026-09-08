import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');
const oldHeader = `function samRunSpeakLane(ob,lane,arrival=false,afterResolve=false){
  if(!ob||!ob.options||!ob.options.length||(arrival&&(ob.arrivalSpoken||ob.arrivalPending))) return;
  lane=Math.max(0,Math.min(2,Number(lane)||0));`;
const newHeader = `function samRunSpeakLane(ob,lane,arrival=false,afterResolve=false){
  if(!ob||!ob.options||!ob.options.length||(arrival&&(ob.arrivalSpoken||ob.arrivalPending))) return;
  /* Automatic lane speech is one-shot per question. Leaving the correct lane
     and coming back must not pronounce the same word again. */
  if(ob.spokeCorrect) return;
  lane=Math.max(0,Math.min(2,Number(lane)||0));`;
if (!html.includes(oldHeader)) throw new Error('samRunSpeakLane header not found');
html = html.replace(oldHeader, newHeader);
fs.writeFileSync('index.html', html);

const testPath = 'tests/app.test.mjs';
let tests = fs.readFileSync(testPath, 'utf8');
const anchor = `test("Sam's lane vocabulary has offline recorded pronunciation", async () => {`;
if (!tests.includes(anchor)) throw new Error('test anchor not found');
const regression = `test('returning to the correct lane does not repeat the word', () => {\n  const start=html.indexOf('function samRunSpeakLane(ob,lane,arrival=false,afterResolve=false){');\n  const end=html.indexOf('\\nfunction ',start+1);\n  const fn=html.slice(start,end);\n  assert.match(fn, /if\\(ob\\.spokeCorrect\\) return;/,\n    'once the correct word has been spoken for this wave, later lane changes cannot replay it');\n});\n\n`;
if (!tests.includes(`test('returning to the correct lane does not repeat the word'`)) {
  tests = tests.replace(anchor, regression + anchor);
  fs.writeFileSync(testPath, tests);
}

const swPath='service-worker.js';
let sw=fs.readFileSync(swPath,'utf8');
sw=sw.replace(/speak-english-v(\d+)/,(_,n)=>`speak-english-v${Number(n)+1}`);
fs.writeFileSync(swPath,sw);
