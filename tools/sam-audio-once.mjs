import fs from 'node:fs';

let html = fs.readFileSync('index.html', 'utf8');
const oldBlock = `  /* Heard again, always — for a listening question the sound IS the answer. */
  if(ob.listen) samRunAskAloud(ob);
  else if(!ob.spokeCorrect) samRunSpeakLane(ob,ob.correctLane,false,true);`;
const newBlock = `  /* Listening questions speak automatically once when the question appears.
     Corrections do not replay English automatically; the speaker button remains
     the explicit way to hear the word again. */
  if(!ob.listen&&!ob.spokeCorrect) samRunSpeakLane(ob,ob.correctLane,false,true);`;
if (!html.includes(oldBlock)) throw new Error('target audio block not found');
html = html.replace(oldBlock, newBlock);
fs.writeFileSync('index.html', html);

const testPath = 'tests/app.test.mjs';
let tests = fs.readFileSync(testPath, 'utf8');
const anchor = `test('a listening question falls back to writing when the device will not speak', () => {`;
if (!tests.includes(anchor)) throw new Error('test anchor not found');
const test = `test('a listening question speaks automatically only once', () => {\n  assert.match(html, /if\\(listen\\)\\{ samRunAskAloud\\(ob\\); samRunCoach\\('listen'\\); \\}/,\n    'the English word is spoken when the listening question first appears');\n  const teachStart=html.indexOf('function samRunTeach(ob){');\n  const teachEnd=html.indexOf('\\nfunction ',teachStart+1);\n  const teach=html.slice(teachStart,teachEnd);\n  assert.doesNotMatch(teach, /if\\(ob\\.listen\\) samRunAskAloud\\(ob\\)/,\n    'correction never automatically repeats the listening word');\n  assert.match(html, /onclick=\\"samRunAskAgain\\(\\)\\"/,\n    'the speaker button still lets the learner replay it manually');\n});\n\n`;
if (!tests.includes(`test('a listening question speaks automatically only once'`)) {
  tests = tests.replace(anchor, test + anchor);
  fs.writeFileSync(testPath, tests);
}

const swPath='service-worker.js';
let sw=fs.readFileSync(swPath,'utf8');
sw=sw.replace(/speak-english-v(\d+)/,(_,n)=>`speak-english-v${Number(n)+1}`);
fs.writeFileSync(swPath,sw);
