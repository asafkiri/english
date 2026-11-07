import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { compactContent, readSource, embed } from '../tools/embed-content.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inline) throw new Error('inline app script not found');

/* The app renders HTML strings into #app and wires buttons to global
   functions, so a page can be driven here with no browser: a fake document
   that owns one element, a Map behind localStorage, and the inline script
   evaluated in its own context. */
function runtime(seed = new Map(), options = {}) {
  const app = { innerHTML: '' };
  const created = [];
  const windowListeners = new Map();
  const localStorage = {
    getItem: key => seed.has(key) ? seed.get(key) : null,
    setItem: (key, value) => {
      if (options.failSetItem?.(key, value)) throw new Error(`injected setItem failure for ${key}`);
      seed.set(key, String(value));
    },
    removeItem: key => seed.delete(key),
  };
  const sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const document = {
    hidden: false,
    getElementById: id => id === 'app' ? app : null,
    addEventListener() {},
    createElement: () => {
      const el = { className: '', textContent: '', innerHTML: '', style: {}, setAttribute() {}, appendChild() {}, remove() {} };
      created.push(el);
      return el;
    },
    body: { appendChild() {} },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const window = {
    scrollTo() {},
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
  };
  if (options.speechSynthesis) window.speechSynthesis = options.speechSynthesis;
  const context = vm.createContext({
    console, document, window, localStorage, sessionStorage,
    navigator: options.navigator || {}, location: { reload() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: fn => setTimeout(fn, 0),
    cancelAnimationFrame: id => clearTimeout(id),
    Date: options.Date || Date, Math, JSON, Map, Set, String, Number, Array, Object, Promise,
    ...(options.speechSynthesis ? { SpeechSynthesisUtterance: options.SpeechSynthesisUtterance } : {}),
  });
  const expose = `
    ;globalThis.__test = {
      CONTENT, TERMS, CATEGORIES, EXERCISES, SOURCES, STORE_KEY, LEGACY_KEYS, INTERVALS_DAYS, MASTERED_BOX,
      REVIEW_CAP, MAX_NEW_PER_SESSION, MAX_REQUEUES, REQUEUE_GAP, INITIAL_LESSON_IDS, RECOMMENDED_ORDER,
      EXERCISE_REQUIRES, NEAR_SYNONYMS, KINDS, STATE_LABELS, DAY,
      defaults, load, save, normalizeState, wipeLegacy, term, category, exercise, termsInCategory,
      rec, isSeen, introduce, recordAnswer, flagConcept, termState, seenIds, dueIds, masteredIds, conceptIds,
      topicProgress, unseenIds, nextNewIds, effectiveTopic, nextDue, dueLabel,
      blankSentence, termVariants, optionClash, buildOptions, kindsFor, makeQuestion, reviewKind, nextKind,
      buildSession, startSession, currentStep, next, requeue, answer, conceptAndNext, answerExercise, exitSession, goHome,
      speechAvailable, loadVoices, pickVoice, liveVoice, speak, speakTerm, speakExample, readCard, cancelSpeech, runSoundCheck,
      esc, h, toast, resolveDialog, askConfirm, specValue, unitToken, termCardHtml,
      renderHome, setNewCount, setTopic, openTopic, startTopicSession, openDue, openConcepts, openTerm,
      openSettings, setSlow, setAutoRead, resetProgress, openSources,
      renderStep, renderQuestion, renderExercise, renderDone, feedbackHtml, questionLabel, phaseLabel,
      setSentences, toggleExample, sentencesOn, exampleShown,
      getState: () => state, setState: v => { state = v; }, getSession: () => S, setSession: v => { S = v; },
    };
  `;
  vm.runInContext(inline + expose, context, { filename: 'index-inline.js' });
  return {
    api: context.__test, seed, app, context, created,
    dispatchWindow(type) { for (const listener of windowListeners.get(type) || []) listener(); },
  };
}

/* the same runtime with a clock that only moves when a test says so */
function memoryRuntime(seed = new Map(), at = Date.parse('2026-11-07T09:00:00Z'), options = {}) {
  class MemoryDate extends Date {
    constructor(...args) { super(...(args.length ? args : [at])); }
    static now() { return at; }
  }
  return {
    ...runtime(seed, { ...options, Date: MemoryDate }),
    advance(ms) { at += ms; }, now: () => at,
  };
}

function fakeSpeech(initialVoices = [{ name: 'Samantha', lang: 'en-US' }]) {
  const calls = [];
  let list = initialVoices;
  class Utterance { constructor(text) { this.text = text; this.volume = 1; } }
  const speechSynthesis = {
    speaking: false, pending: false, cancels: 0,
    getVoices: () => list,
    resume() {},
    cancel() { this.cancels++; },
    speak(u) { calls.push(u); u.onstart?.(); u.onend?.(); },
  };
  return { speechSynthesis, SpeechSynthesisUtterance: Utterance, calls, setVoices(v) { list = v; } };
}

/* plays the current session through: every question answered as asked
   (right by default), checking on the way that nothing is asked unseen */
function playSession(api, { answerWith = () => 'right' } = {}) {
  let guard = 0;
  const asked = [];
  while (api.currentStep() && api.currentStep().type !== 'done' && guard++ < 600) {
    const st = api.currentStep();
    if (st.type === 'card') {
      api.next();
    } else if (st.type === 'q') {
      assert.ok(api.isSeen(st.id), `${st.id} was asked before its card`);
      asked.push(st);
      const how = answerWith(st, asked.length);
      api.answer(how === 'right' ? st.correct : (st.correct + 1) % st.options.length);
      api.next();
    } else if (st.type === 'ex') {
      const ex = api.exercise(st.id);
      api.answerExercise(answerWith(st, asked.length) === 'right' ? ex.correct : (ex.correct + 1) % ex.answers.length);
      api.next();
    } else {
      throw new Error(`unexpected step ${st.type}`);
    }
  }
  assert.equal(api.currentStep().type, 'done');
  return asked;
}

const english = (api, ids) => ids.map(id => api.term(id).en);
const count = (markup, needle) => markup.split(needle).length - 1;
/* values born inside the vm context have another realm's prototypes, which
   strict deep equality rejects; compare their plain shape instead */
const plain = value => JSON.parse(JSON.stringify(value));
const same = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);

/* ===================== content ===================== */

test('content: the 173 terms of the brief, in its nine topics, without duplicates', () => {
  const { api } = runtime();
  assert.equal(api.TERMS.length, 173);
  assert.equal(api.CATEGORIES.length, 9);
  const expected = { spec: 25, power: 23, installation: 28, lighting: 17, hvac: 15, sources: 14, equipment: 12, cad: 25, instructions: 14 };
  for (const [cat, n] of Object.entries(expected)) assert.equal(api.termsInCategory(cat).length, n, cat);
  const ids = api.TERMS.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.equal(new Set(api.TERMS.map(t => t.en.toLowerCase())).size, ids.length, 'English is unique');
  assert.equal(new Set(api.TERMS.map(t => t.he)).size, ids.length, 'Hebrew is unique');
  for (const t of api.TERMS) {
    for (const field of ['en', 'he', 'exp', 'ex', 'exHe']) assert.ok(String(t[field]).trim(), `${t.id} has ${field}`);
    assert.ok(api.category(t.cat), `${t.id} has a real topic`);
    for (const c of t.conf || []) assert.ok(api.term(c), `${t.id} confusable ${c} exists`);
    for (const r of t.refs || []) assert.ok(api.SOURCES[r], `${t.id} reference ${r} exists`);
  }
  assert.equal(Object.keys(api.SOURCES).length, 21);
  assert.equal(api.EXERCISES.length, 5);
});

test('content: the embedded block is exactly what the JSON file says', () => {
  const { api } = runtime();
  const source = readSource();
  same(api.CONTENT, compactContent(source));
  assert.equal(embed(html, compactContent(source)), html, 'index.html is up to date with content/');
  assert.equal(source.term_count, 173);
});

test('content: nothing of the conversation course is left in the page', () => {
  for (const ghost of ['LESSONS', 'PRACTICE_STORIES', 'BRANCH_DIALOGUES', 'Nice to meet you', 'How are you?', 'מדברים אנגלית', 'להגיד שלום']) {
    assert.ok(!inline.includes(ghost), `inline script still mentions ${ghost}`);
  }
  // the old storage key is named exactly once: on the list of keys to delete
  assert.equal(count(inline, "'speakEnglishV1'"), 1);
  assert.ok(!html.includes('index.old.html'));
});

/* ===================== a clean start ===================== */

test('start: the previous app\'s data is deleted and never loaded', () => {
  const seed = new Map([
    ['speakEnglishV1', JSON.stringify({ onboarded: true, completed: 27, name: 'אסף', streak: 40, practice: { 'phrase-3': 5 } })],
    ['speakEnglishPracticeCycleV1', JSON.stringify({ cycles: [1, 2] })],
    ['english.samRun', 'abc'],
    ['someOtherApp', 'keep me'],
  ]);
  const { api, app } = runtime(seed);
  for (const key of api.LEGACY_KEYS) assert.ok(!seed.has(key), `${key} was removed`);
  assert.equal(seed.get('someOtherApp'), 'keep me', 'only this app\'s keys are touched');
  assert.equal(api.seenIds().length, 0);
  assert.equal(api.dueIds().length, 0);
  assert.equal(api.getState().sessions.length, 0);
  assert.ok(app.innerHTML.includes('מתחילים מאפס'));
  assert.ok(app.innerHTML.includes('<b dir="ltr">0<small> / 173</small></b>'));
  assert.ok(!app.innerHTML.includes('אסף'));
  // and the wipe is not a one-off: a key that reappears is removed on the next start
  seed.set('speakEnglishV1', '{"completed":30}');
  runtime(seed);
  assert.ok(!seed.has('speakEnglishV1'));
});

test('start: the first session is the brief\'s first five terms, with no reviews', () => {
  const { api } = runtime();
  const s = api.buildSession();
  assert.equal(s.reviewIds.length, 0);
  assert.ok(s.steps.every(st => !st.review));
  same(english(api, s.newIds), ['Manufacturer', 'Model', 'Datasheet', 'Input power', 'Voltage']);
  // each card is followed by one quick check of that same term
  const cards = s.steps.filter(st => st.type === 'card');
  assert.equal(cards.length, 5);
  for (const card of cards) {
    const after = s.steps[s.steps.indexOf(card) + 1];
    assert.equal(after.type, 'q');
    assert.equal(after.id, card.id);
    assert.equal(after.kind, 'meaning');
    assert.ok(after.quick);
  }
  // then every new term once more in another shape, and nothing else is asked
  const asked = s.steps.filter(st => st.type === 'q');
  assert.equal(asked.length, 10);
  assert.ok(asked.every(q => s.newIds.includes(q.id)));
  assert.equal(s.steps.filter(st => st.type === 'ex').length, 0, 'no comprehension exercise before its terms');
  assert.equal(s.steps.at(-1).type, 'done');
});

test('start: sessions two and three follow the brief, with yesterday\'s terms reviewed first', () => {
  const rt = memoryRuntime();
  const { api } = rt;
  assert.ok(api.startSession());
  playSession(api);
  assert.equal(api.seenIds().length, 5);
  rt.advance(api.DAY + 60_000);
  let s = api.buildSession();
  same(english(api, s.reviewIds).sort(), ['Datasheet', 'Input power', 'Manufacturer', 'Model', 'Voltage']);
  same(english(api, s.newIds), ['Current', 'Frequency', 'Single-phase', 'Three-phase', 'Energy consumption']);
  const lastReview = Math.max(...s.steps.map((st, i) => st.review ? i : -1));
  const firstCard = s.steps.findIndex(st => st.type === 'card');
  assert.ok(lastReview < firstCard, 'reviews come before new terms');
  assert.ok(api.startSession());
  playSession(api);
  rt.advance(api.DAY + 60_000);
  s = api.buildSession();
  same(english(api, s.newIds), ['Rated input power', 'Maximum', 'Power factor', 'Efficiency', 'Connected load']);
  assert.equal(s.reviewIds.length, 5, 'only the terms due today are reviewed');
});

test('start: the recommended order is the three opening sessions, then the basics, level by level', () => {
  const { api } = runtime();
  assert.equal(new Set(api.RECOMMENDED_ORDER).size, 173);
  same(api.RECOMMENDED_ORDER.slice(0, 15), api.INITIAL_LESSON_IDS);
  const rest = api.RECOMMENDED_ORDER.slice(15).map(id => api.term(id));
  for (let i = 1; i < rest.length; i++) assert.ok(rest[i].level >= rest[i - 1].level, `${rest[i].en} comes after easier terms`);
  assert.equal(rest[0].cat, 'spec', 'the spec-reading topic is finished first');
  assert.equal(rest.at(-1).cat, 'sources');
});

test('plan: fewer new terms can be chosen, never more than five', () => {
  const { api, app } = runtime();
  api.setNewCount(3);
  assert.equal(api.buildSession().newIds.length, 3);
  assert.ok(app.innerHTML.includes('<output>3</output>'));
  api.setNewCount(9);
  assert.equal(api.getState().settings.newCount, 5);
  api.setNewCount(-2);
  assert.equal(api.getState().settings.newCount, 0);
  assert.equal(api.buildSession().newIds.length, 0);
  // nothing to review and nothing new: no session starts
  assert.equal(api.startSession(), false);
  assert.equal(api.getSession(), null);
  assert.ok(app.innerHTML.includes('disabled'), 'the start button is disabled');
  api.setNewCount(1);
  assert.equal(api.buildSession().newIds.length, 1);
});

test('plan: a topic can be chosen for the new terms, and falls back when it is exhausted', () => {
  const { api, app } = runtime();
  api.setTopic('lighting');
  same(english(api, api.nextNewIds()), ['Luminaire', 'Lamp', 'Luminous flux', 'Luminous intensity', 'Illuminance']);
  assert.ok(app.innerHTML.includes('value="lighting" selected'));
  assert.ok(app.innerHTML.includes('תאורה ופוטומטריה'));
  api.setTopic('no-such-topic');
  assert.equal(api.getState().settings.topic, 'auto');
  api.setTopic('lighting');
  for (const t of api.termsInCategory('lighting')) api.introduce(t.id);
  assert.equal(api.effectiveTopic(), 'auto');
  assert.equal(api.term(api.nextNewIds(5, api.effectiveTopic())[0]).en, 'Manufacturer');
});

test('plan: a session from a topic screen takes that topic\'s unlearned terms', () => {
  const { api } = runtime();
  api.openTopic('cad');
  api.startTopicSession('cad');
  const s = api.getSession();
  assert.ok(s);
  same(english(api, s.newIds), ['Drawing', 'Layer', 'Line', 'Polyline', 'Circle']);
  assert.equal(api.getState().settings.topic, 'cad');
});

/* ===================== questions ===================== */

test('questions: four options, exactly one right, and no two that mean the same', () => {
  const { api } = runtime();
  for (const t of api.TERMS) api.introduce(t.id);
  for (let i = 0; i < 400; i++) {
    const t = api.TERMS[i % api.TERMS.length];
    const kind = api.kindsFor(t.id)[i % api.kindsFor(t.id).length];
    const q = api.makeQuestion(t.id, kind);
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.correct], t.id);
    assert.equal(q.options.filter(id => id === t.id).length, 1);
    const terms = q.options.map(api.term);
    assert.equal(new Set(terms.map(x => x.he)).size, 4, 'Hebrew answers differ');
    assert.equal(new Set(terms.map(x => x.en.toLowerCase())).size, 4, 'English answers differ');
    const spelled = terms.flatMap(x => [x.en, ...(x.aliases || [])].map(s => s.toLowerCase()));
    assert.equal(new Set(spelled).size, spelled.length, 'no option is an alias of another');
    for (const [a, b] of api.NEAR_SYNONYMS) assert.ok(!(q.options.includes(a) && q.options.includes(b)), 'near-synonyms are not offered together');
  }
});

test('questions: the confusable terms are the first distractors', () => {
  const { api } = runtime();
  const q = api.makeQuestion('ee-en-input-power', 'meaning');
  for (const id of ['ee-en-output-power', 'ee-en-cooling-capacity', 'ee-en-motor-output-power']) assert.ok(q.options.includes(id));
  const q2 = api.makeQuestion('ee-en-power-factor', 'distinguish');
  assert.ok(q2.options.includes('ee-en-efficiency'));
});

test('questions: the sentence shape blanks the term itself and is skipped where the sentence paraphrases it', () => {
  const { api } = runtime();
  // "only the words" is the default: no term is asked about its sentence
  assert.ok(api.TERMS.every(t => !api.kindsFor(t.id).includes('sentence')));
  api.setSentences(true);
  let withBlank = 0;
  for (const t of api.TERMS) {
    const b = api.blankSentence(t);
    if (!b) continue;
    withBlank++;
    assert.equal(b.before + b.hidden + b.after, t.ex);
    const hidden = b.hidden.toLowerCase().replace(/e?s$/, '');
    assert.ok(api.termVariants(t).some(v => hidden === v || hidden + 'e' === v || v.startsWith(hidden)), `${t.en}: blanked "${b.hidden}"`);
    assert.ok(api.kindsFor(t.id).includes('sentence'));
  }
  assert.equal(withBlank, 170);
  for (const en of ['Apparent power', 'Neutral conductor', 'Storage water heater']) {
    const t = api.TERMS.find(x => x.en === en);
    assert.equal(api.blankSentence(t), null);
    assert.ok(!api.kindsFor(t.id).includes('sentence'));
  }
  const noConf = api.TERMS.find(t => !(t.conf || []).length);
  assert.ok(!api.kindsFor(noConf.id).includes('distinguish'));
  same(api.kindsFor('ee-en-input-power'), ['meaning', 'reverse', 'sentence', 'spec', 'distinguish']);
});

test('questions: reviews rotate through the shapes a term supports', () => {
  const { api } = runtime();
  api.introduce('ee-en-input-power');
  const r = api.rec('ee-en-input-power');
  const seen = new Set();
  for (let i = 0; i < 5; i++) { r.right = i; seen.add(api.reviewKind('ee-en-input-power')); }
  assert.equal(seen.size, 4, 'four shapes while sentences are off');
  api.setSentences(true);
  seen.clear();
  for (let i = 0; i < 5; i++) { r.right = i; seen.add(api.reviewKind('ee-en-input-power')); }
  assert.equal(seen.size, 5);
  assert.equal(api.nextKind('ee-en-input-power', 'distinguish'), 'meaning');
  assert.equal(api.nextKind('ee-en-input-power', 'meaning'), 'reverse');
});

test('questions: Hebrew reads right to left, English left to right, and the mock spec invents no numbers', () => {
  const { api, app } = runtime();
  assert.ok(html.includes('<html lang="he" dir="rtl">'));
  api.setSentences(true);
  api.startSession({ newCount: 1 });
  api.next();
  const quick = api.currentStep();
  assert.equal(quick.kind, 'meaning');
  assert.ok(app.innerHTML.includes('class="cue-en en" dir="ltr" lang="en"'));
  assert.equal(count(app.innerHTML, 'onclick="answer('), 4);
  assert.ok(!/class="opt[^"]*"[^>]*dir="ltr"/.test(app.innerHTML), 'Hebrew answers carry no ltr direction');
  for (const kind of ['reverse', 'sentence', 'distinguish']) {
    api.setSession({ ...api.getSession(), steps: [api.makeQuestion('ee-en-input-power', kind), { type: 'done' }], i: 0, answered: null });
    api.renderStep();
    assert.equal(count(app.innerHTML, 'class="opt en'), 4, `${kind}: English answers`);
    assert.equal(count(app.innerHTML, 'dir="ltr" lang="en"  onclick="answer('), 4, `${kind}: English answers read left to right`);
  }
  assert.ok(app.innerHTML.includes('class="blank"') === false, 'the distinguish shape shows the explanation, not a blank');
  api.setSession({ ...api.getSession(), steps: [api.makeQuestion('ee-en-input-power', 'sentence'), { type: 'done' }], i: 0, answered: null });
  api.renderStep();
  assert.ok(app.innerHTML.includes('class="blank"'));
  assert.ok(app.innerHTML.includes('מצא את הספק הכניסה החשמלי.'), 'the Hebrew meaning of the sentence is shown');
  assert.ok(!app.innerHTML.includes('Find the electrical input power.'), 'the whole sentence is not given away');
  api.setSession({ ...api.getSession(), steps: [api.makeQuestion('ee-en-input-power', 'spec'), { type: 'done' }], i: 0, answered: null });
  api.renderStep();
  assert.ok(app.innerHTML.includes('תבנית מפרט לתרגול שפה בלבד'));
  const values = [...app.innerHTML.matchAll(/<span class="val">([^<]*)<\/span>/g)].map(m => m[1]);
  assert.equal(values.length, 4);
  assert.ok(values.every(v => !/\d/.test(v)), `no invented numbers: ${values.join(' | ')}`);
  assert.ok(values.includes('… kW') || values.includes('… W'));
  assert.equal(api.specValue(api.term('ee-en-manufacturer')), '—');
  assert.equal(api.unitToken(api.term('ee-en-apparent-power')), 'kVA');
  assert.equal(api.unitToken(api.term('ee-en-connected-load')), 'W');
  assert.equal(api.unitToken(api.term('ee-en-efficiency')), '');
});

/* ===================== answering and the schedule ===================== */

test('answers: a right answer on a fresh term schedules it for tomorrow, and the same session cannot push it further', () => {
  const rt = memoryRuntime();
  const { api } = rt;
  api.startSession({ newCount: 1 });
  const card = api.currentStep();
  assert.equal(card.type, 'card');
  assert.equal(api.termState(card.id), 'due', 'a shown term waits for its first check');
  api.next();
  const q = api.currentStep();
  api.answer(q.correct);
  let r = api.rec(card.id);
  assert.equal(r.box, 1);
  assert.equal(r.due, rt.now() + api.DAY);
  assert.equal(api.termState(card.id), 'learning');
  api.next();
  const again = api.currentStep();
  assert.equal(again.id, card.id);
  api.answer(again.correct);
  r = api.rec(card.id);
  assert.equal(r.box, 1, 'practice inside the session is not evidence of remembering');
  assert.equal(r.due, rt.now() + api.DAY);
  assert.equal(r.right, 2);
  assert.equal(api.getState().totals.asked, 2);
});

test('answers: a mistake is explained in Hebrew, brings the term back in another shape, and keeps it for tomorrow', () => {
  const rt = memoryRuntime();
  const { api, app } = rt;
  api.startSession({ newCount: 2 });
  api.next();
  const q = api.currentStep();
  const wrong = (q.correct + 1) % 4;
  const chosen = api.term(q.options[wrong]);
  const right = api.term(q.id);
  const before = api.getSession().steps.length;
  api.answer(wrong);
  const markup = app.innerHTML;
  assert.ok(markup.includes('לא מדויק'));
  assert.ok(markup.includes('בחרת:') && markup.includes(api.esc(chosen.he)) && markup.includes(api.esc(chosen.exp)));
  assert.ok(markup.includes('התשובה:') && markup.includes(api.esc(right.exp)));
  assert.ok(!markup.includes('דוגמה:'), 'no sentence to learn while sentences are off');
  api.setSentences(true);
  api.renderQuestion(q, false);
  const withSentence = app.innerHTML;
  assert.ok(withSentence.includes('דוגמה:') && withSentence.includes(api.esc(right.ex)) && withSentence.includes(api.esc(right.exHe)));
  api.setSentences(false);
  assert.ok(markup.includes('הבנתי את האנגלית, לא את המושג בחשמל'));
  assert.ok(markup.includes('המונח יחזור לתרגול נוסף'));
  assert.ok(markup.includes('class="opt wrong"') || markup.includes(' wrong"'));
  assert.equal(count(markup, 'disabled'), 4, 'answered options are locked');
  const s = api.getSession();
  assert.equal(s.steps.length, before + 1);
  const requeued = s.steps[s.i + 1 + api.REQUEUE_GAP];
  assert.equal(requeued.id, q.id);
  assert.ok(requeued.requeued);
  assert.notEqual(requeued.kind, q.kind);
  const r = api.rec(q.id);
  assert.equal(r.wrong, 1);
  assert.equal(r.box, 0);
  assert.equal(r.due, rt.now() + api.DAY);
  // the second answer on the same question is ignored
  api.answer(q.correct);
  assert.equal(api.rec(q.id).right, 0);
  // a requeue is capped, so a session cannot loop forever on one term
  playSession(api, { answerWith: () => 'wrong' });
  assert.ok(Object.values(api.getSession().requeues).every(n => n <= api.MAX_REQUEUES));
});

test('answers: "I understood the English, not the concept" is recorded apart from the language record', () => {
  const { api, app } = runtime();
  api.startSession({ newCount: 1 });
  api.next();
  const q = api.currentStep();
  api.answer((q.correct + 1) % 4);
  api.conceptAndNext();
  const r = api.rec(q.id);
  assert.equal(r.concept, 1);
  assert.equal(r.wrong, 1);
  assert.equal(r.right, 0);
  same(api.conceptIds(), [q.id]);
  api.goHome();
  assert.ok(app.innerHTML.includes('<span class="count pink">1</span>'));
  api.openConcepts();
  assert.ok(app.innerHTML.includes(api.esc(api.term(q.id).en)));
  assert.ok(app.innerHTML.includes('מושג לבירור'));
  api.openTerm(q.id);
  assert.ok(app.innerHTML.includes('סומן כמושג לבירור'));
});

test('schedule: the four states, and mastery only after several spaced successes', () => {
  const rt = memoryRuntime();
  const { api } = rt;
  const id = 'ee-en-voltage';
  same(Object.values(api.STATE_LABELS), ['חדש', 'בתרגול', 'לחזרה', 'שליטה מבוססת']);
  same(api.INTERVALS_DAYS, [1, 3, 7, 14, 30]);
  assert.equal(api.termState(id), 'new');
  api.introduce(id);
  assert.equal(api.termState(id), 'due');
  api.recordAnswer(id, true);
  assert.equal(api.termState(id), 'learning');
  const expectBox = (box, days) => {
    assert.equal(api.rec(id).box, box);
    assert.equal(api.rec(id).due, rt.now() + days * api.DAY);
  };
  expectBox(1, 1);
  rt.advance(api.DAY);
  assert.equal(api.termState(id), 'due');
  api.recordAnswer(id, true); expectBox(2, 3);
  assert.equal(api.termState(id), 'learning', 'two right answers are not mastery');
  rt.advance(3 * api.DAY);
  api.recordAnswer(id, true); expectBox(3, 7);
  assert.equal(api.termState(id), 'learning');
  rt.advance(7 * api.DAY);
  api.recordAnswer(id, true); expectBox(4, 14);
  assert.equal(api.termState(id), 'mastered');
  same(api.masteredIds(), [id]);
  rt.advance(14 * api.DAY);
  assert.equal(api.termState(id), 'due', 'a mastered term still comes back for review');
  api.recordAnswer(id, true); expectBox(5, 30);
  rt.advance(30 * api.DAY);
  api.recordAnswer(id, true); expectBox(5, 30);
  // a lapse drops one box and brings the term back tomorrow
  rt.advance(30 * api.DAY);
  api.recordAnswer(id, false); expectBox(4, 1);
  api.recordAnswer(id, false); expectBox(3, 1);
  assert.equal(api.termState(id), 'learning');
  assert.equal(api.dueLabel(api.rec(id).due), 'מחר');
  assert.equal(api.dueLabel(rt.now() + 5 * api.DAY), 'בעוד 5 ימים');
  assert.equal(api.dueLabel(rt.now() - 1), 'עכשיו');
});

test('schedule: only due terms are reviewed, the longest-waiting first, at most twelve a session', () => {
  const rt = memoryRuntime();
  const { api } = rt;
  const ids = api.TERMS.slice(0, 20).map(t => t.id);
  ids.forEach((id, i) => {
    api.introduce(id);
    api.rec(id).box = 1;
    api.rec(id).due = rt.now() - (i < 16 ? (i + 1) * api.DAY : -(i + 1) * api.DAY);
  });
  const s = api.buildSession({ newCount: 0 });
  assert.equal(api.dueIds().length, 16);
  assert.equal(s.reviewIds.length, api.REVIEW_CAP);
  same(s.reviewIds, ids.slice(4, 16).reverse());
  assert.ok(s.steps.filter(st => st.type === 'q').every(st => st.review));
  for (const id of ids.slice(16)) assert.ok(!s.reviewIds.includes(id), 'a term due in the future is not reviewed');
  rt.advance(0);
  api.startSession({ newCount: 0 });
  playSession(api);
  assert.equal(api.getState().sessions.length, 1);
  assert.equal(api.getState().sessions[0].reviewed, api.REVIEW_CAP);
  assert.equal(api.dueIds().length, 4, 'the rest wait for the next session');
});

test('schedule: a term shown but not yet practised comes back next time', () => {
  const rt = memoryRuntime();
  const { api } = rt;
  api.startSession({ newCount: 2 });
  api.next(); // the first card was seen, its check never answered
  api.goHome();
  assert.equal(api.seenIds().length, 1);
  const s = api.buildSession({ newCount: 1 });
  assert.equal(s.reviewIds.length, 1);
  assert.equal(api.term(s.newIds[0]).en, 'Model');
});

/* ===================== persistence ===================== */

test('persistence: progress survives closing and reopening the app', () => {
  const seed = new Map();
  const first = memoryRuntime(seed);
  first.api.startSession();
  playSession(first.api, { answerWith: (st, n) => (n % 4 === 0 ? 'wrong' : 'right') });
  const saved = JSON.parse(seed.get(first.api.STORE_KEY));
  assert.equal(Object.keys(saved.terms).length, 5);
  const second = memoryRuntime(seed, first.now());
  same(second.api.getState().terms, first.api.getState().terms);
  same(second.api.getState().sessions, first.api.getState().sessions);
  assert.equal(second.api.getState().sessions.length, 1);
  assert.equal(second.api.seenIds().length, 5);
  assert.ok(!second.app.innerHTML.includes('מתחילים מאפס'));
  assert.ok(second.app.innerHTML.includes('<b dir="ltr">5<small> / 173</small></b>'));
  assert.ok(second.app.innerHTML.includes('נלמדו 5 מתוך 25'));
});

test('persistence: a storage failure never breaks the session', () => {
  const { api, app } = runtime(new Map(), { failSetItem: key => key === 'electricalEnglishV1' });
  api.startSession({ newCount: 1 });
  api.next();
  const q = api.currentStep();
  api.answer(q.correct);
  assert.ok(app.innerHTML.includes('נכון'));
  assert.equal(api.rec(q.id).right, 1);
  api.next(); api.answer(api.currentStep().correct); api.next();
  assert.equal(api.currentStep().type, 'done');
});

test('persistence: the saved state is validated on load', () => {
  const junk = {
    createdAt: 'yesterday',
    terms: { 'phrase-old-7': { seen: 1, box: 3 }, 'ee-en-voltage': { seen: 1, box: 99, due: 'soon', right: -3, concept: 2 }, 'ee-en-model': { seen: 0 } },
    exercises: { nope: { passed: true }, 'ee-read-per-unit': { passed: true, tries: 'x' } },
    sessions: 'none',
    settings: { newCount: 50, topic: 'bogus', slow: 'yes', autoRead: 0, sentences: 'yes' },
  };
  const { api } = runtime(new Map([['electricalEnglishV1', JSON.stringify(junk)]]));
  const s = api.getState();
  same(Object.keys(s.terms), ['ee-en-voltage']);
  assert.equal(s.terms['ee-en-voltage'].box, 5);
  assert.equal(s.terms['ee-en-voltage'].due, 0);
  assert.equal(s.terms['ee-en-voltage'].right, 0);
  assert.equal(s.terms['ee-en-voltage'].concept, 2);
  same(Object.keys(s.exercises), ['ee-read-per-unit']);
  assert.equal(s.exercises['ee-read-per-unit'].tries, 0);
  same(s.sessions, []);
  assert.equal(s.settings.newCount, 5);
  assert.equal(s.settings.topic, 'auto');
  assert.equal(s.settings.slow, true);
  assert.equal(s.settings.autoRead, false);
  assert.equal(s.settings.sentences, true);
  assert.equal(runtime().api.getState().settings.sentences, false, 'sentences are off until switched on');
  assert.ok(Number.isFinite(s.createdAt) && s.createdAt > 0);
  const broken = runtime(new Map([['electricalEnglishV1', '{not json']]));
  assert.equal(broken.api.seenIds().length, 0);
});

test('persistence: a reset wipes this track only, after the sheet is confirmed', async () => {
  const seed = new Map([['someOtherApp', 'keep me']]);
  const { api } = runtime(seed);
  api.startSession({ newCount: 1 });
  playSession(api);
  assert.equal(api.seenIds().length, 1);
  api.resetProgress();
  api.resolveDialog(false);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(api.seenIds().length, 1, 'cancelling keeps everything');
  api.resetProgress();
  api.resolveDialog(true);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(api.seenIds().length, 0);
  assert.equal(api.getState().sessions.length, 0);
  assert.equal(JSON.parse(seed.get(api.STORE_KEY)).sessions.length, 0);
  assert.equal(seed.get('someOtherApp'), 'keep me');
});

/* ===================== speech ===================== */

test('speech: without an engine there is no speaker button anywhere', () => {
  const { api, app } = runtime();
  assert.equal(api.speechAvailable(), false);
  assert.ok(!api.termCardHtml(api.term('ee-en-voltage')).includes('class="play"'));
  api.startSession({ newCount: 1 });
  assert.ok(!app.innerHTML.includes('🔊'));
  assert.equal(api.readCard('ee-en-manufacturer'), false);
  api.next();
  assert.ok(!app.innerHTML.includes('🔊'));
  api.goHome();
  api.openSettings();
  assert.ok(app.innerHTML.includes('לא מציע קול באנגלית'));
  assert.ok(!app.innerHTML.includes('runSoundCheck'));
  assert.equal(api.speak('Voltage'), false);
});

test('speech: with an engine the new card reads the term, reads its sentence only when sentences are on, and buttons appear', async () => {
  const fake = fakeSpeech();
  const { api, app } = runtime(new Map(), fake);
  assert.equal(api.speechAvailable(), true);
  api.startSession({ newCount: 1 });
  assert.ok(app.innerHTML.includes(`speakTerm('ee-en-manufacturer')`));
  assert.ok(!app.innerHTML.includes(`speakExample('ee-en-manufacturer')`), 'the hidden sentence has no speaker yet');
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].text, 'Manufacturer');
  assert.equal(fake.calls[0].lang, 'en-US');
  assert.equal(fake.calls[0].voice, fake.speechSynthesis.getVoices()[0]);
  await new Promise(r => setTimeout(r, 650));
  assert.equal(fake.calls.length, 1, 'the sentence is not read while sentences are off');
  api.toggleExample('ee-en-manufacturer');
  assert.ok(app.innerHTML.includes(`speakExample('ee-en-manufacturer')`), 'revealing the sentence brings its speaker');
  assert.ok(app.innerHTML.includes('Find the manufacturer on the nameplate.'));
  assert.equal(fake.calls.length, 1, 'revealing it does not read it unasked');
  // with sentences on, the card reads the term and then the sentence
  const loud = fakeSpeech();
  const on = runtime(new Map(), loud);
  on.api.setSentences(true);
  on.api.startSession({ newCount: 1 });
  assert.equal(loud.calls[0].text, 'Manufacturer');
  await new Promise(r => setTimeout(r, 650));
  assert.equal(loud.calls.length, 2);
  assert.equal(loud.calls[1].text, 'Find the manufacturer on the nameplate.');
  api.next();
  assert.ok(app.innerHTML.includes('class="play"'), 'the quick check can replay the term');
  api.goHome();
  api.openSettings();
  assert.ok(app.innerHTML.includes('runSoundCheck'));
  api.setAutoRead(false);
  const before = fake.calls.length;
  api.startSession({ newCount: 1 });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(fake.calls.length, before, 'auto-reading can be switched off');
  api.speakTerm('ee-en-voltage');
  assert.equal(fake.calls.at(-1).text, 'Voltage');
  api.setSlow(true);
  api.speakTerm('ee-en-voltage');
  assert.equal(fake.calls.at(-1).rate, 0.8);
});

test('speech: a voice the engine no longer lists is re-picked from the live list', () => {
  const fake = fakeSpeech([{ name: 'Samantha', lang: 'en-US' }, { name: 'Carmit', lang: 'he-IL' }]);
  const { api } = runtime(new Map(), { ...fake, speechSynthesis: fake.speechSynthesis });
  api.setAutoRead(false);
  const stale = api.pickVoice();
  assert.equal(stale.name, 'Samantha');
  const fresh = [{ name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }];
  fake.setVoices(fresh);
  api.speakTerm('ee-en-voltage');
  assert.equal(fake.calls.at(-1).voice, fresh[0], 'the dead handle was not handed over');
  fake.setVoices([{ name: 'Carmit', lang: 'he-IL' }]);
  api.speakTerm('ee-en-voltage');
  assert.equal(fake.calls.at(-1).voice.name, 'Carmit', 'with no English voice the engine\'s own choice is used');
});

/* ===================== comprehension exercises ===================== */

test('exercises: every authored exercise names real terms it waits for, and one right answer', () => {
  const { api } = runtime();
  for (const ex of api.EXERCISES) {
    const needs = api.EXERCISE_REQUIRES[ex.id];
    assert.ok(Array.isArray(needs) && needs.length, `${ex.id} has prerequisites`);
    for (const id of needs) assert.ok(api.term(id), `${ex.id} needs real term ${id}`);
    assert.ok(ex.correct >= 0 && ex.correct < ex.answers.length);
    assert.equal(new Set(ex.answers).size, ex.answers.length);
    assert.ok(ex.explanation && ex.question);
  }
});

test('exercises: offered only once their terms were met, kept until passed, and marked real or mock', () => {
  const rt = memoryRuntime();
  const { api, app } = rt;
  api.startSession(); playSession(api);
  rt.advance(api.DAY + 1);
  let s = api.buildSession();
  same(s.steps.filter(st => st.type === 'ex').map(st => st.id), ['ee-read-tefcold-input']);
  api.startSession();
  // answer the exercise wrongly this time
  playSession(api, { answerWith: st => (st.type === 'ex' ? 'wrong' : 'right') });
  assert.equal(api.getState().exercises['ee-read-tefcold-input'].passed, false);
  assert.equal(api.getState().exercises['ee-read-tefcold-input'].tries, 1);
  rt.advance(api.DAY + 1);
  s = api.buildSession();
  assert.ok(s.steps.some(st => st.type === 'ex' && st.id === 'ee-read-tefcold-input'), 'a failed exercise is offered again');
  api.startSession();
  const exStep = () => api.getSession().steps.find(st => st.type === 'ex');
  api.setSession({ ...api.getSession(), steps: [exStep(), { type: 'done' }], i: 0, answered: null });
  api.renderStep();
  assert.ok(app.innerHTML.includes('מתוך דף נתונים'));
  assert.ok(app.innerHTML.includes('TEFCOLD'));
  assert.ok(app.innerHTML.includes('Input Power') && app.innerHTML.includes('125 W'));
  assert.ok(!app.innerHTML.includes('בוחרים Input Power'), 'the explanation waits for the answer');
  const ex = api.exercise('ee-read-tefcold-input');
  api.answerExercise(ex.correct);
  assert.ok(app.innerHTML.includes(api.esc(ex.explanation)));
  assert.equal(api.getState().exercises['ee-read-tefcold-input'].passed, true);
  api.next();
  rt.advance(api.DAY + 1);
  assert.ok(!api.buildSession().steps.some(st => st.type === 'ex'), 'a passed exercise is not offered again');
  // a mock spec is said to be one
  api.setSession({ ...api.buildSession(), steps: [{ type: 'ex', id: 'ee-read-cooling' }, { type: 'done' }], i: 0, answered: null });
  api.renderStep();
  assert.ok(app.innerHTML.includes('תרגול מדומה'));
  assert.ok(app.innerHTML.includes('מפרט מדומה'));
});

/* ===================== screens ===================== */

test('screens: topics show progress without listing the terms that were not taught yet', () => {
  const { api, app } = runtime();
  api.startSession(); playSession(api);
  api.goHome();
  assert.ok(app.innerHTML.includes('נלמדו 5 מתוך 25'));
  assert.ok(app.innerHTML.includes('נלמדו 0 מתוך 23'));
  api.openTopic('spec');
  assert.ok(app.innerHTML.includes('data-view="topic"'));
  for (const en of ['Manufacturer', 'Model', 'Datasheet', 'Input power', 'Voltage']) assert.ok(app.innerHTML.includes(`>${en}<`));
  for (const en of ['Nameplate', 'Rated current', 'Operating conditions']) assert.ok(!app.innerHTML.includes(`>${en}<`), `${en} is not shown before it is taught`);
  assert.ok(app.innerHTML.includes('עוד 20 מונחים בנושא זה טרם נלמדו'));
  assert.equal(count(app.innerHTML, 'class="term-row"'), 5);
  api.openTopic('power');
  assert.ok(app.innerHTML.includes('עדיין לא נלמדו מונחים בנושא זה'));
  assert.equal(count(app.innerHTML, 'class="term-row"'), 0);
});

test('screens: the review list, the term page and the session summary', () => {
  const rt = memoryRuntime();
  const { api, app } = rt;
  api.startSession(); playSession(api);
  assert.ok(app.innerHTML.includes('סיימת את המפגש'));
  assert.ok(app.innerHTML.includes('5 מונחים חדשים'));
  assert.ok(app.innerHTML.includes('החזרה הבאה: מחר'));
  api.goHome();
  api.openDue();
  assert.ok(app.innerHTML.includes('אין כרגע מילים לחזרה'));
  rt.advance(api.DAY + 1);
  api.openDue();
  assert.equal(count(app.innerHTML, 'class="term-row"'), 5);
  assert.ok(app.innerHTML.includes('חזרה בלבד'));
  assert.equal(count(app.innerHTML, 'class="state due"'), 5);
  api.openTerm('ee-en-voltage');
  assert.ok(app.innerHTML.includes('data-view="term"'));
  assert.ok(app.innerHTML.includes('class="state due">לחזרה<'));
  assert.ok(app.innerHTML.includes('מתח'));
  assert.ok(app.innerHTML.includes('משפט לדוגמה') && !app.innerHTML.includes('Read the voltage value and its unit.'), 'the sentence waits behind a tap');
  api.goHome();
  assert.ok(app.innerHTML.includes('חזרה על 5 מונחים, ואז 5 מונחים חדשים'));
});

test('screens: the term card shows unit, aliases, confusable terms and its references', () => {
  const { api } = runtime();
  const card = api.termCardHtml(api.term('ee-en-input-power'));
  assert.ok(card.includes('<span>Input power</span>'));
  assert.ok(card.includes('הספק כניסה'));
  assert.ok(card.includes('W; kW'));
  assert.ok(card.includes('Electrical input power'));
  assert.ok(card.includes('לא לבלבל עם') && card.includes('Output power') && card.includes('הספק יציאה'));
  assert.ok(card.includes('Power input — יש לבדוק'));
  assert.ok(!card.includes('Find the electrical input power.'), 'the sentence waits behind a tap');
  assert.ok(card.includes('משפט לדוגמה') && card.includes(`toggleExample('ee-en-input-power')`));
  api.toggleExample('ee-en-input-power');
  const opened = api.termCardHtml(api.term('ee-en-input-power'));
  assert.ok(opened.includes('Find the electrical input power.') && opened.includes('מצא את הספק הכניסה החשמלי.'));
  assert.ok(opened.includes('להסתיר את המשפט'));
  api.toggleExample('ee-en-input-power');
  api.setSentences(true);
  const always = api.termCardHtml(api.term('ee-en-input-power'));
  assert.ok(always.includes('Find the electrical input power.') && !always.includes('toggleExample'));
  api.setSentences(false);
  assert.ok(card.includes('KSB — Efficiency class'));
  assert.ok(card.includes('target="_blank" rel="noopener"'));
  const plain = api.termCardHtml(api.term('ee-en-current'));
  assert.ok(plain.includes('לא מצורף מקור חיצוני'));
  assert.ok(!plain.includes('גם נכתב'));
});

test('screens: settings and sources', () => {
  const { api, app } = runtime();
  api.openSettings();
  assert.ok(app.innerHTML.includes('data-view="settings"'));
  assert.ok(app.innerHTML.includes('<output>5</output>'));
  assert.ok(app.innerHTML.includes('אנגלית טכנית להנדסאי חשמל'));
  assert.ok(app.innerHTML.includes('2026-11-07'));
  api.setNewCount(2);
  assert.ok(app.innerHTML.includes('data-view="settings"'), 'the settings screen stays open');
  assert.ok(app.innerHTML.includes('<output>2</output>'));
  api.openSources();
  assert.ok(app.innerHTML.includes('data-view="sources"'));
  assert.equal(count(app.innerHTML, 'class="source"'), 21);
  assert.ok(app.innerHTML.includes('https://www.electrical-installation.org/enwiki/Definition_of_Power_Factor'));
  assert.ok(app.innerHTML.includes('לא אומתו מחדש'));
});

test('screens: leaving a session asks first and keeps what was answered', async () => {
  const { api, app } = runtime();
  api.startSession({ newCount: 2 });
  api.next();
  api.answer(api.currentStep().correct);
  api.exitSession();
  api.resolveDialog(false);
  await new Promise(r => setTimeout(r, 0));
  assert.ok(api.getSession(), 'cancelling stays in the session');
  api.exitSession();
  api.resolveDialog(true);
  await new Promise(r => setTimeout(r, 0));
  assert.equal(api.getSession(), null);
  assert.ok(app.innerHTML.includes('data-view="home"'));
  assert.equal(api.seenIds().length, 1);
  assert.equal(api.rec('ee-en-manufacturer').right, 1);
});

/* ===================== the shell ===================== */

test('shell: manifest and service worker belong to the new app and clear the old caches', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
  assert.ok(manifest.name.includes('חשמל'));
  assert.equal(manifest.lang, 'he');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.icons.length, 2);
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.ok(/CACHE_NAME = 'electrical-english-v\d+'/.test(sw));
  assert.ok(sw.includes("'speak-english-'"), 'the previous app\'s caches are named for removal');
  assert.ok(sw.includes("'./index.html'") && sw.includes("'./manifest.webmanifest'"));
  assert.ok(html.includes('<title>אנגלית טכנית לחשמל</title>'));
  assert.ok(html.includes("register('./service-worker.js'"));
  assert.ok(fs.existsSync(new URL('../icon-192.png', import.meta.url)) && fs.existsSync(new URL('../icon-512.png', import.meta.url)));
});
