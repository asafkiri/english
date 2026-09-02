import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inline) throw new Error('inline app script not found');

function runtime(seed = new Map()) {
  const app = { innerHTML: '' };
  const localStorage = {
    getItem: key => seed.has(key) ? seed.get(key) : null,
    setItem: (key, value) => seed.set(key, String(value)),
    removeItem: key => seed.delete(key),
  };
  const document = {
    hidden: false,
    getElementById: id => id === 'app' ? app : null,
    addEventListener() {},
    createElement: () => ({
      className: '', textContent: '', innerHTML: '', style: {},
      setAttribute() {}, appendChild() {}, remove() {},
    }),
    body: { appendChild() {} },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const window = {
    SpeechRecognition: null,
    webkitSpeechRecognition: null,
    scrollTo() {},
    addEventListener() {},
  };
  const context = vm.createContext({
    console, document, window, localStorage,
    navigator: {}, location: { reload() {} },
    confirm: () => true,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: fn => setTimeout(fn, 0),
    cancelAnimationFrame: id => clearTimeout(id),
    Date, Math, JSON, Map, Set, String, Number, Array, Object, Promise,
  });
  const expose = `
    ;globalThis.__test = {
      UNITS, LESSONS, BRANCH_DIALOGUES, CHALLENGE_PLAN, SESSION_VERSION, conversationRounds,
      OPENING_ROUNDS, MIDDLE_ROUNDS, EXTRA_ROUNDS, FINALE_ROUND_OVERRIDES, CONVERSATION_META_ROWS,
      defaults, load, validSavedSession, normalize, matchDetails, matchScore,
      selectWarmup, buildChallengeSteps, splitPhraseChunks,
      PRACTICE_TOPICS, PRACTICE_STORIES, PRACTICE_CAST, PRACTICE_SCENES, PRACTICE_BACKDROPS, buildPracticeSession, personArt,
      startLesson, resumeLesson, saveLessonCheckpoint, stopLessonTimers, renderStep,
      manualMicDone, answerListenQuiz, chooseBranch, notePractice, stageCaptionLine,
      getState:()=>state, setState:v=>{state=v}, getLesson:()=>L, setLesson:v=>{L=v}
    };
  `;
  vm.runInContext(inline + expose, context, { filename: 'index-inline.js' });
  return { api: context.__test, seed, app };
}

function classCount(markup, token) {
  return [...markup.matchAll(/\bclass="([^"]*)"/g)]
    .filter(([, classes]) => classes.split(/\s+/).includes(token)).length;
}

test('all seven conversation characters keep the modern layered SVG contract', () => {
  const { api } = runtime();
  const castIds = ['tom', 'maya', 'sam', 'alex', 'nina', 'ben', 'dana'];
  const stageStates = ['idle', 'waiting', 'speaking', 'listening', 'reacting', 'thinking'];
  const singleHooks = ['figure', 'head', 'eyes', 'pupils', 'brows', 'eyelids', 'cheeks', 'arm-l', 'arm-r'];
  const mouthShapes = ['mouth-rest', 'mouth-a', 'mouth-e', 'mouth-o', 'mouth-u', 'mouth-smile'];

  assert.deepEqual(Object.keys(api.PRACTICE_CAST), castIds);
  for (const id of castIds) {
    const look = api.PRACTICE_CAST[id].look;
    const before = JSON.stringify(look);
    assert.equal(look.variant, 'modern-v2', `${id} must use the modern renderer`);
    assert.equal(look.id, id, `${id} must route to its own illustration`);

    for (const stageState of stageStates) {
      const svg = api.personArt(look, stageState);
      const root = svg.match(/^<svg\b[^>]*>/)?.[0] || '';
      for (const token of ['person-art', 'modern-v2', `${id}-v2`, 'layered-mouth', stageState])
        assert.equal(classCount(root, token), 1, `${id}/${stageState} is missing root class ${token}`);
      assert.match(root, new RegExp(`data-art="${id}-v2"`));
      assert.match(root, new RegExp(`data-character="${id}"`));
      assert.match(root, new RegExp(`data-palette="${id}"`));
      assert.match(root, /data-viseme="rest"/);
      assert.match(root, /viewBox="0 0 220 410"/);

      for (const hook of singleHooks)
        assert.equal(classCount(svg, hook), 1, `${id}/${stageState} needs one ${hook} hook`);
      assert.equal(classCount(svg, 'arm'), 2, `${id}/${stageState} needs two animated arms`);
      assert.equal(classCount(svg, 'mouth'), 1, `${id}/${stageState} needs one lip-sync target`);
      assert.equal(classCount(svg, 'mouth-shapes'), 1, `${id}/${stageState} needs one mouth-shape group`);
      assert.equal(classCount(svg, 'mouth-shape'), 6, `${id}/${stageState} needs five visemes and a smile`);
      for (const shape of mouthShapes)
        assert.equal(classCount(svg, shape), 1, `${id}/${stageState} needs one ${shape} viseme`);
      assert.doesNotMatch(svg, /<(?:image|script|foreignObject|animate|animateTransform)\b/i);
    }
    assert.equal(JSON.stringify(look), before, `${id} rendering must not mutate its cast config`);
  }
});

test('the modern cast stays visually distinct and every member remains in conversation flow', () => {
  const { api } = runtime();
  const castIds = ['tom', 'maya', 'sam', 'alex', 'nina', 'ben', 'dana'];
  const visualMarkers = {
    tom: 'backpack',
    maya: 'maya-headphones',
    sam: 'hair-curly-front',
    alex: 'alex-waiter-vest',
    nina: 'shop-apron',
    ben: 'travel-pouch',
    dana: 'round-glasses',
  };
  const paletteKeys = ['skin', 'skinShadow', 'hairColor', 'eyeColor', 'clothes', 'accent', 'blush'];
  const artIds = new Set();
  const characterIds = new Set();
  const paletteIds = new Set();
  const paletteSignatures = new Set();
  const visualBodies = new Set();

  for (const id of castIds) {
    const look = api.PRACTICE_CAST[id].look;
    const svg = api.personArt(look, 'idle');
    const root = svg.match(/^<svg\b[^>]*>/)?.[0] || '';
    artIds.add(root.match(/data-art="([^"]+)"/)?.[1]);
    characterIds.add(root.match(/data-character="([^"]+)"/)?.[1]);
    paletteIds.add(root.match(/data-palette="([^"]+)"/)?.[1]);

    const palette = paletteKeys.map(key => look[key]);
    assert.ok(palette.every(Boolean), `${id} needs a complete character palette`);
    palette.forEach((color, index) => {
      assert.ok(svg.includes(color), `${id} does not render its ${paletteKeys[index]} color`);
    });
    paletteSignatures.add(palette.join('|'));
    assert.equal(classCount(svg, visualMarkers[id]), 1, `${id} needs its ${visualMarkers[id]} visual marker`);

    // Compare the illustration body rather than its data attributes, so seven
    // different IDs cannot mask seven otherwise identical drawings.
    const body = svg.replace(/^<svg\b[^>]*>/, '');
    visualBodies.add(crypto.createHash('sha256').update(body).digest('hex'));
  }

  assert.equal(artIds.size, castIds.length, 'each character needs a unique art ID');
  assert.deepEqual([...characterIds].sort(), [...castIds].sort());
  assert.deepEqual([...paletteIds].sort(), [...castIds].sort());
  assert.equal(paletteSignatures.size, castIds.length, 'each character needs a distinct palette');
  assert.equal(visualBodies.size, castIds.length, 'each character needs distinct rendered artwork');

  const sceneCharacters = new Set(Object.values(api.PRACTICE_SCENES).flat().map(scene => scene.who));
  assert.deepEqual([...sceneCharacters].sort(), [...castIds].sort(),
    'every redesigned character must remain reachable in free conversation');
});

test('all free-conversation routes use the intended 22 layered backdrops', () => {
  const { api } = runtime();
  const expectedRoutes = {
    greet: ['street-school', 'elevator', 'city-square'],
    meet: ['park-bench', 'art-studio'],
    feelings: ['school-steps', 'living-room'],
    likes: ['music-room', 'basketball-court'],
    afterschool: ['school-gate', 'park-bench'],
    food: ['restaurant', 'home-kitchen'],
    plans: ['phone-room', 'courtyard-garden'],
    shopping: ['clothing-store', 'market-stall'],
    help: ['bus-stop', 'parking-lot'],
    animals: ['dog-park', 'home-street'],
    weather: ['weather-window', 'beach-path'],
  };
  const expectedIds = [
    'street-school', 'elevator', 'city-square', 'park-bench', 'art-studio',
    'school-steps', 'living-room', 'music-room', 'basketball-court', 'school-gate',
    'restaurant', 'home-kitchen', 'phone-room', 'courtyard-garden',
    'clothing-store', 'market-stall', 'bus-stop', 'parking-lot', 'dog-park',
    'home-street', 'weather-window', 'beach-path',
  ];
  const actualRoutes = Object.fromEntries(Object.entries(api.PRACTICE_SCENES)
    .map(([topic, scenes]) => [topic, [...scenes].map(scene => scene.bg)]));

  assert.deepEqual(actualRoutes, expectedRoutes);
  assert.equal(Object.values(actualRoutes).flat().length, 23,
    'free conversation must retain all 23 scene choices');
  assert.deepEqual(Object.keys(api.PRACTICE_BACKDROPS), expectedIds);
  for (const id of Object.values(actualRoutes).flat())
    assert.ok(api.PRACTICE_BACKDROPS[id], `scene references missing backdrop ${id}`);
  assert.equal(Object.values(actualRoutes).flat().filter(id => id === 'park-bench').length, 2,
    'the neighbourhood bench is the one intentionally shared illustration');
});

test('every conversation backdrop keeps a safe, distinct, bounded depth-layer contract', () => {
  const { api } = runtime();
  const semanticMarkers = {
    'street-school': 'street-crossing',
    elevator: 'elevator-panel',
    'city-square': 'square-fountain',
    'park-bench': 'park-bench',
    'art-studio': 'art-easel',
    'school-steps': 'school-steps',
    'living-room': 'living-sofa',
    'music-room': 'music-speaker',
    'basketball-court': 'basketball-hoop',
    'school-gate': 'school-gates',
    restaurant: 'restaurant-table',
    'home-kitchen': 'kitchen-counter',
    'phone-room': 'phone-signal',
    'courtyard-garden': 'courtyard-slide',
    'clothing-store': 'clothes-rack',
    'market-stall': 'market-produce',
    'bus-stop': 'bus-shelter',
    'parking-lot': 'garage-pillar',
    'dog-park': 'dog-agility',
    'home-street': 'home-cat',
    'weather-window': 'weather-window-frame',
    'beach-path': 'beach-ocean',
  };
  const hashes = new Set();
  let totalBytes = 0;
  let totalTags = 0;

  for (const [id, backdrop] of Object.entries(api.PRACTICE_BACKDROPS)) {
    assert.equal(backdrop.id, id);
    assert.equal(backdrop.variant, 'layered-v4');
    assert.match(backdrop.sky, /^#[0-9a-f]{6}$/i);
    assert.match(backdrop.ground, /^#[0-9a-f]{6}$/i);
    assert.equal(classCount(backdrop.art, 'backdrop-far'), 1, `${id} needs one far layer`);
    assert.equal(classCount(backdrop.art, 'backdrop-mid'), 1, `${id} needs one middle layer`);
    assert.equal(classCount(backdrop.art, 'backdrop-near'), 1, `${id} needs one near layer`);
    assert.equal(classCount(backdrop.art, 'scene-base'), 1, `${id} needs one sky canvas`);
    assert.equal(classCount(backdrop.art, 'scene-floor'), 1, `${id} needs one ground plane`);
    assert.equal(classCount(backdrop.art, semanticMarkers[id]), 1,
      `${id} needs its ${semanticMarkers[id]} semantic landmark`);
    assert.match(backdrop.art, new RegExp(`id="${id}-sky"`));
    assert.match(backdrop.art, new RegExp(`url\\(#${id}-sky\\)`));

    // Artwork is inline and local: no executable SVG, remote resources or event handlers.
    assert.doesNotMatch(backdrop.art,
      /<(?:image|script|foreignObject|iframe|object|embed|animate|animateTransform)\b|\bon[a-z]+\s*=|\b(?:href|xlink:href)\s*=|url\(\s*['"]?(?:https?:|data:|javascript:)/i);

    const byteSize = Buffer.byteLength(backdrop.art, 'utf8');
    const tagCount = (backdrop.art.match(/<[a-z][\w:-]*\b/gi) || []).length;
    assert.ok(byteSize >= 1_000 && byteSize <= 12_000,
      `${id} SVG should stay detailed but lightweight; got ${byteSize} bytes`);
    assert.ok(tagCount >= 15 && tagCount <= 160,
      `${id} SVG tag count should stay phone-friendly; got ${tagCount}`);
    totalBytes += byteSize;
    totalTags += tagCount;
    hashes.add(crypto.createHash('sha256').update(backdrop.art).digest('hex'));
  }

  assert.equal(hashes.size, Object.keys(semanticMarkers).length,
    'all 22 backdrops need genuinely distinct artwork');
  assert.ok(totalBytes <= 160_000, `backdrop payload is too large: ${totalBytes} bytes`);
  assert.ok(totalTags <= 2_500, `backdrop DOM is too large: ${totalTags} SVG tags`);
});

test('the stage mounts full-height backdrop SVGs and respects reduced motion', () => {
  assert.match(html,
    /<div class="stage-bg scene-motion-[^"]*" data-backdrop="\$\{esc\(bd\.id\)\}"[^>]*>/);
  assert.match(html,
    /<svg class="backdrop-art backdrop-\$\{esc\(bd\.id\)\}" data-art="\$\{esc\(bd\.id\)\}" viewBox="0 0 400 700" preserveAspectRatio="xMidYMax slice">/);

  const svgRule = html.match(/\.stage-bg svg\{([^}]*)\}/)?.[1] || '';
  assert.match(svgRule, /position:absolute/);
  assert.match(svgRule, /inset:0/);
  assert.match(svgRule, /width:100%/);
  assert.match(svgRule, /height:100%/);
  const reduced = html.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.match(reduced, /\.stage-bg \.ambient/);
  assert.match(reduced, /animation:none!important/);
  assert.match(reduced, /transition:none!important/);
  assert.doesNotMatch(reduced, /\.stage-bg \.ambient[^\{]*\{[^\}]*transform:none!important/,
    'reduced motion must keep the backdrop at its authored static position');
});

test('course content remains intact', () => {
  const { api } = runtime();
  assert.equal(api.UNITS.length, 6);
  assert.equal(api.LESSONS.length, 30);
  api.LESSONS.forEach((lesson, idx) => {
    assert.equal(lesson.phrases.length, 5);
    // branch lessons close with the choice conversation instead of the
    // scripted dialogue, so their scripted dialogue stays at 4 lines
    assert.equal(lesson.dialogue.length, api.BRANCH_DIALOGUES[idx] ? 4 : 8);
    for (const item of [...lesson.phrases, ...lesson.dialogue]) {
      assert.ok(item.en && item.he && item.tl);
    }
  });
  const protectedContent = JSON.stringify({
    units: api.UNITS,
    lessons: api.LESSONS,
  });
  assert.equal(
    crypto.createHash('sha256').update(protectedContent).digest('hex'),
    '626ff047deb56d8144b8dff18cac1140dbec1b8dc5012040b65fa3bddca115b0',
  );
});

test('old local state migrates without losing progress', () => {
  const seed = new Map([['speakEnglishV1', JSON.stringify({
    name: 'נועם', onboarded: true, completed: 12.8, streak: 6,
    slowSpeech: false, micEnabled: true, hard: ['1:2', '1:2', null],
  })]]);
  const { api } = runtime(seed);
  const state = api.getState();
  assert.equal(state.name, 'נועם');
  assert.equal(state.completed, 12);
  assert.equal(state.streak, 6);
  assert.equal(state.slowSpeech, false);
  assert.deepEqual([...state.hard], ['1:2']);
  assert.equal(state.reviewMeta['1:2'].hard, true);
  assert.equal(state.reviewMeta['1:2'].lapses, 0);
  assert.deepEqual([...state.lastWarmupIds], []);
  assert.deepEqual([...state.finishedRuns], []);
  assert.equal(state.session, null);
});

test('speech matching respects order and negation', () => {
  const { api } = runtime();
  assert.ok(api.matchScore("I'm good, thanks", 'I am good thanks') >= 0.70);
  assert.ok(api.matchScore("I don't know", 'I dont know') >= 0.70);
  assert.ok(api.matchScore("I can't today", 'I cant today') >= 0.70);
  assert.ok(api.matchScore('I am seventeen', 'I am 17') >= 0.70);
  assert.ok(api.matchScore("OK, I'll take it", 'okay i will take it') >= 0.70);
  assert.ok(api.matchScore('Twenty dollars', '20 dollars') >= 0.70);
  assert.ok(api.matchScore("It's five o'clock", "it's 5:00") >= 0.70);
  assert.ok(api.matchScore('Can I have a burger?', 'can i have burger') >= 0.70);

  // equally correct answers and Hebrew-accent near-misses are credited
  assert.ok(api.matchScore("I'm good, thanks", 'I am fine thanks') >= 0.99);
  assert.ok(api.matchScore("I'm good, thanks", 'I am fine thank you') >= 0.99);
  assert.ok(api.matchScore('Thank you', 'tanks') >= 0.99);
  assert.ok(api.matchScore("I'm from Israel", 'I am from is real') >= 0.99);
  assert.ok(api.matchScore('I want to drink water', 'I want to drink vater') >= 0.99);
  assert.ok(api.matchScore('I think so', 'I sink so') >= 0.99);
  assert.ok(api.matchScore('Goodbye!', 'bye') >= 0.99);
  assert.ok(api.matchScore('My dad is great', 'my father is great') >= 0.99);

  const missingNot = api.matchDetails("I don't know", 'I do know');
  assert.equal(missingNot.criticalMismatch, true);
  assert.ok(missingNot.score < 0.70);
  assert.ok(api.matchScore('I like homework', "I don't like homework") < 0.70);
  assert.ok(api.matchScore('I like music', 'music I like') < 0.70);
  assert.ok(api.matchScore('Can you help me', 'you can me help') < 0.70);
  // fuzziness must not cross critical words or short unrelated words
  assert.ok(api.matchScore('No', 'know') < 0.99);
  assert.ok(api.matchScore('She is fifteen', 'he is fifteen') < 0.99);
});

test('warm-up grows to 20 and keeps hard, recent and older material', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 19;
  state.hard = Array.from({ length: 12 }, (_, i) => `${Math.floor(i / 5)}:${i % 5}`);
  state.lastWarmupIds = state.hard.slice(0, 2);
  api.setState(state);

  assert.equal(api.selectWarmup(1, 3).length, 3);
  const selected = api.selectWarmup(19, 20);
  assert.equal(selected.length, 20);
  assert.equal(new Set(selected.map(x => x.id)).size, 20);
  assert.equal(selected.filter(x => state.hard.includes(x.id)).length, 10);
  assert.equal(selected.filter(x => x.li >= 17).length, 5);
  assert.equal(selected.filter(x => x.li < 17 && !state.hard.includes(x.id)).length, 5);
  assert.ok(selected.every(x => x.li < 19));
  assert.ok(state.lastWarmupIds.every(id => !selected.some(x => x.id === id)));
  let run = 0;
  let maxHardRun = 0;
  for (const item of selected) {
    run = state.hard.includes(item.id) ? run + 1 : 0;
    maxHardRun = Math.max(maxHardRun, run);
  }
  assert.ok(maxHardRun <= 2);
});

test('each lesson builds three challenges of one gradual type', () => {
  const { api } = runtime();
  const typeMap = { listen: 'listenQuiz', order: 'order', recall: 'speak' };
  api.LESSONS.forEach((lesson, idx) => {
    const steps = api.buildChallengeSteps(idx, lesson);
    assert.equal(steps.length, 3);
    assert.ok(steps.every(step => step.type === typeMap[api.CHALLENGE_PLAN[idx]]));
    if (api.CHALLENGE_PLAN[idx] === 'listen') {
      for (const step of steps) {
        assert.equal(step.options.length, 3);
        assert.equal(new Set(step.options).size, 3);
        assert.equal(step.options.filter(x => x === step.correct).length, 1);
      }
    }
    if (api.CHALLENGE_PLAN[idx] === 'order') {
      for (const step of steps) {
        assert.ok(step.chunks.length >= 2 && step.chunks.length <= 4);
        assert.deepEqual([...step.bankOrder].sort((a, b) => a - b), Array.from({ length: step.chunks.length }, (_, i) => i));
        assert.equal(step.chunks.join(' '), step.p.en);
      }
    }
  });
});

test('there is one controlled branch conversation per unit', () => {
  const { api } = runtime();
  assert.deepEqual(Object.keys(api.BRANCH_DIALOGUES), ['4', '9', '14', '19', '24', '29']);
  for (const branch of Object.values(api.BRANCH_DIALOGUES)) {
    assert.equal(branch.rounds.length, 2);
    for (const round of branch.rounds) {
      assert.ok(round.ask.en && round.ask.he && round.ask.tl);
      assert.equal(round.options.length, 3);
      for (const option of round.options) {
        assert.ok(option.label && option.answer.en && option.reply.en);
      }
    }
  }
});

test('every lesson conversation runs four rounds, all sayable from what was taught', () => {
  const { api } = runtime();
  const words = s => String(s).toLowerCase().replace(/\{[a-z]+\}/g, ' ').match(/[a-z']+/g) || [];

  // Everything the learner has heard or said by the end of each lesson.
  const taught = [];
  const seen = new Set(['and', 'a', 'the', 'i', 'it', 'is', 'you', 'my', 'to', 'too', 'or']);
  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    api.LESSONS[idx].phrases.forEach(p => words(p.en).forEach(w => seen.add(w)));
    api.LESSONS[idx].dialogue.forEach(l => words(l.en).forEach(w => seen.add(w)));
    api.conversationRounds(idx).forEach(round => {
      words(round.ask.en).forEach(w => seen.add(w));
      round.options.forEach(o => words(o.reply.en).forEach(w => seen.add(w)));
    });
    taught.push(new Set(seen));
  }

  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    const rounds = api.conversationRounds(idx);
    assert.equal(rounds.length, 4, `lesson ${idx} should hold a four-round conversation`);
    rounds.forEach((round, n) => {
      assert.ok(round.ask.en && round.ask.he && round.ask.tl, `lesson ${idx} round ${n} needs a full ask`);
      assert.ok(round.options.length >= 2, `lesson ${idx} round ${n} needs at least two ways to answer`);
      round.options.forEach(option => {
        assert.ok(option.label, `lesson ${idx} round ${n}: option needs a Hebrew label`);
        assert.ok(option.answer.en && option.answer.he && option.answer.tl,
          `lesson ${idx} round ${n}: an answer the learner must say needs all three forms`);
        assert.ok(option.reply.en && option.reply.he && option.reply.tl,
          `lesson ${idx} round ${n}: reply needs all three forms`);
      });
    });
    // the added rounds may never ask for a word the course hasn't taught yet
    [1, 2].forEach(n => rounds[n].options.forEach(option => {
      words(option.answer.en).forEach(word => assert.ok(taught[idx].has(word),
        `lesson ${idx}: added round ${n} asks for the untaught word "${word}" in "${option.answer.en}"`));
    }));
  }

  // The conversation still opens and closes exactly where it always did —
  // the extra round is inserted in the middle, never bolted onto an end.
  for (const idx of [0, 4, 15, 29]) {
    const rounds = api.conversationRounds(idx);
    const source = api.FINALE_ROUND_OVERRIDES[idx] || api.BRANCH_DIALOGUES[idx];
    const opening = source ? source.rounds[0] : api.OPENING_ROUNDS[idx];
    const closing = source ? source.rounds[1] : null;
    assert.equal(rounds[0].ask.en, opening.ask.en, `lesson ${idx} must still open on its original line`);
    if (closing) assert.equal(rounds[3].ask.en, closing.ask.en, `lesson ${idx} must still close on its original line`);
    const asks = rounds.map(r => r.ask.en);
    assert.equal(new Set(asks).size, asks.length, `lesson ${idx}: every round must ask something different`);
  }
});

test('a lesson conversation reads as one coherent exchange', () => {
  const { api } = runtime();
  const CAST = { tom: 'Tom', maya: 'Maya', sam: 'Sam', alex: 'Alex', nina: 'Nina', ben: 'Ben', dana: 'Dana' };

  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    const rounds = api.conversationRounds(idx);
    const speaker = CAST[(api.CONVERSATION_META_ROWS[idx] || [])[0]];

    rounds.forEach((round, n) => {
      const last = n === rounds.length - 1;

      // A character who ends on a question and then keeps talking is asking
      // something nobody ever answers — exactly how it reads on screen.
      if (!last) round.options.forEach(option => {
        assert.ok(!/\?\s*$/.test(option.reply.en),
          `lesson ${idx} round ${n + 1}: "${option.reply.en}" asks a question, then the next line talks over it`);
      });

      // Nobody says goodbye and then keeps talking: a farewell line belongs
      // only to the final round — on either side of the conversation.
      if (!last) round.options.forEach(option => {
        for (const line of [option.answer.en, option.reply.en]) {
          assert.ok(!/\bgoodbye\b|\bhave a nice day\b|(?:^|[^a-z])bye\b/i.test(line),
            `lesson ${idx} round ${n + 1}: "${line}" says goodbye, then the conversation keeps going`);
        }
      });

      // The character must never introduce themselves as somebody else.
      Object.values(CAST).forEach(name => {
        if (name === speaker) return;
        assert.ok(!new RegExp(`\\b(I am|I'm) ${name}\\b`, 'i').test(round.ask.en),
          `lesson ${idx} round ${n + 1}: ${speaker} says "${round.ask.en}"`);
      });

      // Meeting someone happens once — either at the start, or the moment
      // they actually give their name. Not four lines into a chat.
      const introduces = new RegExp(`my name is|\\b(I am|I'm) ${speaker}\\b`, 'i').test(round.ask.en);
      if (n > 1 && !introduces) round.options.forEach(option => {
        for (const line of [option.answer.en, option.reply.en]) {
          assert.ok(!/\bnice to meet you\b/i.test(line),
            `lesson ${idx} round ${n + 1}: "${line}" meets someone the learner has been talking to all along`);
        }
      });
    });
  }
});

test('a free practice conversation keeps a natural arc', () => {
  const { api } = runtime();
  const variantsOf = beat => Array.isArray(beat.variants) ? beat.variants : [beat];

  // A farewell line belongs only to a closing turn — anywhere else the
  // character says goodbye and then keeps talking, which is exactly the
  // 'Have a nice day!' followed by 'How are you?' bug this guards against.
  for (const story of api.PRACTICE_STORIES) {
    story.beats.forEach((beat, beatIndex) => {
      for (const variant of variantsOf(beat)) {
        const role = variant.role || beat.role || 'mid';
        const expected = beatIndex === 0 ? 'open' :
          beatIndex === story.beats.length - 1 ? 'close' : 'mid';
        assert.equal(role, expected,
          `${story.id}/${beat.id}: ${role} turn appears where ${expected} belongs`);
        if (role === 'close') continue;
        for (const option of variant.options) {
          assert.doesNotMatch(option.reply.en, /\b(goodbye|bye|have a nice day)\b/i,
            `${story.id}/${beat.id}: "${option.reply.en}" says goodbye mid-conversation`);
        }
      }
    });
  }

  for (const completed of [1, 2, 5, 9, 14, 20, 30]) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const state = api.defaults();
      state.onboarded = true;
      state.completed = completed;
      api.setState(state);
      const session = api.buildPracticeSession();
      if (!session) continue;
      assert.ok(session.story.beats.length >= 1);
      assert.equal(session.turns, session.story.beats,
        'a story must keep its own authored turns instead of mixing in filler');
      assert.equal(new Set(session.turns).size, session.turns.length);
      assert.ok(completed >= session.story.min,
        `${session.story.id} unlocked before lesson ${session.story.min}`);
      assert.ok(session.story.sceneIds.includes(session.sceneId),
        `${session.story.id} drifted into an unrelated scene`);
    }
  }
});

test('a branch choice keeps progress length stable and inserts its fixed continuation', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 4;
  api.setState(state);
  api.startLesson(4, false, true);
  const lesson = api.getLesson();
  const branchIndex = lesson.steps.findIndex(step => step.type === 'branchChoice');
  const originalLength = lesson.steps.length;
  lesson.i = branchIndex;
  api.chooseBranch(1);
  assert.equal(lesson.steps.length, originalLength);
  assert.equal(lesson.i, branchIndex + 1);
  assert.equal(lesson.steps[lesson.i].p.en, api.conversationRounds(4)[0].options[1].answer.en);
  assert.equal(lesson.steps[lesson.i + 1].line.en, api.conversationRounds(4)[0].options[1].reply.en);
  api.stopLessonTimers(false);
});

test('the replay button repeats the line the caption is showing, on every step', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 4;
  api.setState(state);
  api.startLesson(4, false, true);
  const lesson = api.getLesson();

  const listenIndex = lesson.steps.findIndex(step => step.type === 'listen');
  lesson.i = listenIndex;
  assert.equal(api.stageCaptionLine(), lesson.steps[listenIndex].line);

  // On the answer-choice screen the caption still shows what the character
  // just said, so replay must find that line rather than come up empty.
  const branchIndex = lesson.steps.findIndex(step => step.type === 'branchChoice');
  const said = lesson.steps.slice(0, branchIndex).reverse().find(step => step.type === 'listen').line;
  lesson.chat = [{ who: 'app', line: said }];
  lesson.i = branchIndex;
  const replayed = api.stageCaptionLine();
  assert.ok(replayed, 'the replay button must not be a dead button while choosing an answer');
  assert.equal(replayed.en, said.en);

  api.stopLessonTimers(false);
});

test('a listening mistake keeps the phrase in adaptive review after correction', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 1;
  api.setState(state);
  api.startLesson(0, true, true);
  const lesson = api.getLesson();
  lesson.i = lesson.steps.findIndex(step => step.type === 'listenQuiz');
  api.renderStep();
  const step = lesson.steps[lesson.i];
  const wrong = step.options.findIndex(option => option !== step.correct);
  const correct = step.options.findIndex(option => option === step.correct);
  api.answerListenQuiz(wrong);
  api.answerListenQuiz(correct);
  assert.equal(step.usedHint, true);
  assert.ok(api.getState().hard.includes(step.hid));
  api.stopLessonTimers(false);
});

test('lesson checkpoint survives a fresh runtime', () => {
  const seed = new Map();
  const first = runtime(seed);
  const state = first.api.defaults();
  state.onboarded = true;
  state.completed = 1;
  first.api.setState(state);
  first.api.startLesson(1, false, true);
  const lesson = first.api.getLesson();
  lesson.i = 4;
  lesson.elapsedBeforeMs = 27_000;
  first.api.saveLessonCheckpoint();
  first.api.stopLessonTimers(false);

  const second = runtime(seed);
  assert.equal(second.api.getState().session.idx, 1);
  assert.equal(second.api.getState().session.i, 4);
  assert.equal(second.api.getState().session.version, second.api.SESSION_VERSION);
  second.api.resumeLesson();
  assert.equal(second.api.getLesson().i, 4);
  assert.ok(second.api.getLesson().elapsedBeforeMs >= 27_000);
  second.api.stopLessonTimers(false);
});

test('invalid or completed checkpoint steps are rejected', () => {
  const seed = new Map();
  const { api } = runtime(seed);
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  api.startLesson(0, false, true);
  const saved = JSON.parse(seed.get('speakEnglishV1')).session;
  assert.equal(api.validSavedSession(saved), true);
  assert.equal(api.validSavedSession({ ...saved, i: saved.steps.length - 1 }), false);
  const unknown = structuredClone(saved);
  unknown.steps[unknown.i] = { type: 'surprise' };
  assert.equal(api.validSavedSession(unknown), false);
  api.stopLessonTimers(false);
});

test('every reachable lesson screen has a resumable checkpoint shape', () => {
  for (let idx = 0; idx < 30; idx++) {
    const { api } = runtime();
    const state = api.defaults();
    state.onboarded = true;
    state.completed = idx;
    api.setState(state);
    api.startLesson(idx, false, true);
    const lesson = api.getLesson();
    const base = api.getState().session;
    lesson.steps.forEach((step, i) => {
      if (step.type !== 'done' && step.type !== 'branchPending') {
        assert.equal(api.validSavedSession({ ...base, i }), true, `lesson ${idx + 1}, ${step.type}`);
      }
    });
    if (api.BRANCH_DIALOGUES[idx]) {
      lesson.i = lesson.steps.findIndex(step => step.type === 'branchChoice');
      api.chooseBranch(0);
      assert.equal(api.validSavedSession(api.getState().session), true);
    }
    api.stopLessonTimers(false);
  }
});

test('a stale tab checkpoint cannot roll back newer completion or streak', () => {
  const seed = new Map();
  const stale = runtime(seed);
  const staleState = stale.api.defaults();
  staleState.onboarded = true;
  staleState.completed = 1;
  staleState.streak = 2;
  staleState.lastDoneDate = '2026-8-30';
  stale.api.setState(staleState);
  stale.api.startLesson(1, false, true);

  const newer = JSON.parse(seed.get('speakEnglishV1'));
  newer.completed = 2;
  newer.streak = 7;
  newer.lastDoneDate = '2026-8-31';
  newer.session = null;
  seed.set('speakEnglishV1', JSON.stringify(newer));

  stale.api.saveLessonCheckpoint();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.completed, 2);
  assert.equal(persisted.streak, 7);
  assert.equal(persisted.lastDoneDate, '2026-8-31');
  assert.equal(persisted.session, null);
  stale.api.stopLessonTimers(false);
});

test('a stale tab checkpoint cannot erase newer adaptive-review data', () => {
  const seed = new Map();
  const stale = runtime(seed);
  const state = stale.api.defaults();
  state.onboarded = true;
  state.completed = 1;
  stale.api.setState(state);
  stale.api.startLesson(1, false, true);

  const newer = JSON.parse(seed.get('speakEnglishV1'));
  newer.hard = ['0:0'];
  newer.reviewMeta = { '0:0': { successes: 0, lapses: 1, hints: 1, updatedAt: 100 } };
  newer.lastWarmupIds = ['0:0'];
  newer.reviewUpdatedAt = Date.now() + 10_000;
  seed.set('speakEnglishV1', JSON.stringify(newer));

  stale.api.saveLessonCheckpoint();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.deepEqual(persisted.hard, ['0:0']);
  assert.equal(persisted.reviewMeta['0:0'].lapses, 1);
  assert.deepEqual(persisted.lastWarmupIds, ['0:0']);
  stale.api.stopLessonTimers(false);
});

test('concurrent review edits merge per phrase and newer same-phrase result wins', async () => {
  const seed = new Map();
  const initial = runtime(seed);
  const base = initial.api.defaults();
  base.onboarded = true;
  base.completed = 2;
  seed.set('speakEnglishV1', JSON.stringify(base));
  const first = runtime(seed);
  const second = runtime(seed);

  first.api.notePractice('0:0', 'fail', false, true);
  await new Promise(resolve => setTimeout(resolve, 2));
  second.api.notePractice('1:0', 'fail', false, true);
  let persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.ok(persisted.hard.includes('0:0'));
  assert.ok(persisted.hard.includes('1:0'));
  assert.equal(persisted.reviewMeta['0:0'].lapses, 1);
  assert.equal(persisted.reviewMeta['1:0'].lapses, 1);
  assert.ok(persisted.lastWarmupIds.includes('0:0'));
  assert.ok(persisted.lastWarmupIds.includes('1:0'));

  await new Promise(resolve => setTimeout(resolve, 2));
  first.api.notePractice('0:0', 'pass', false, true);
  persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.reviewMeta['0:0'].hard, false);
  assert.ok(!persisted.hard.includes('0:0'));
  assert.ok(persisted.hard.includes('1:0'));
  assert.equal(persisted.reviewMeta['1:0'].lapses, 1);
});

test('a stale tab cannot move the same lesson session backwards', () => {
  const seed = new Map();
  const stale = runtime(seed);
  const state = stale.api.defaults();
  state.onboarded = true;
  stale.api.setState(state);
  stale.api.startLesson(0, false, true);

  const newer = JSON.parse(seed.get('speakEnglishV1'));
  newer.session.i = 4;
  newer.session.elapsedMs = 45_000;
  seed.set('speakEnglishV1', JSON.stringify(newer));

  stale.api.saveLessonCheckpoint();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.session.i, 4);
  assert.ok(persisted.session.elapsedMs >= 45_000);
  stale.api.stopLessonTimers(false);
});

test('a finished replay cannot be resurrected by a stale tab', () => {
  const seed = new Map();
  const stale = runtime(seed);
  const state = stale.api.defaults();
  state.onboarded = true;
  state.completed = 1;
  stale.api.setState(state);
  stale.api.startLesson(0, true, true);
  const runId = stale.api.getLesson().runId;

  const finished = JSON.parse(seed.get('speakEnglishV1'));
  finished.session = null;
  finished.replays = 1;
  finished.finishedRuns = [runId];
  finished.sessionUpdatedAt = Date.now() + 10_000;
  seed.set('speakEnglishV1', JSON.stringify(finished));

  stale.api.saveLessonCheckpoint();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.session, null);
  assert.ok(persisted.finishedRuns.includes(runId));
  assert.equal(persisted.replays, 1);
  stale.api.stopLessonTimers(false);
});

test('a completed speaking result resumes without requiring the phrase again', () => {
  const seed = new Map();
  const first = runtime(seed);
  const state = first.api.defaults();
  state.onboarded = true;
  first.api.setState(state);
  first.api.startLesson(0, false, true);
  const lesson = first.api.getLesson();
  lesson.i = lesson.steps.findIndex(step => step.type === 'speak');
  first.api.renderStep();
  first.api.manualMicDone();
  assert.equal(lesson.steps[lesson.i].resultKind, 'pass');
  first.api.stopLessonTimers(false);

  const second = runtime(seed);
  second.api.resumeLesson();
  const resumed = second.api.getLesson();
  assert.equal(resumed.steps[resumed.i].resultKind, 'pass');
  assert.match(second.app.innerHTML, /ממשיכים/);
  assert.doesNotMatch(second.app.innerHTML, /אמרתי בקול!/);
  second.api.stopLessonTimers(false);
});

test('PWA update code is versioned and does not clear local progress', () => {
  const sw = fs.readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_PREFIX\s*=\s*'speak-english-'/);
  assert.match(sw, /CACHE_NAME\s*=\s*'speak-english-v\d+'/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(html, /updateViaCache:'none'/);
  assert.doesNotMatch(sw, /localStorage/);
});

test('service worker preserves network success, offline fallback, and unrelated caches', async () => {
  const sw = fs.readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');
  const handlers = {};
  const deleted = [];
  let offline = false;
  const context = vm.createContext({
    URL, Request, Response, Promise,
    fetch: async () => {
      if (offline) throw new Error('offline');
      return new Response('fresh', { status: 200 });
    },
    caches: {
      keys: async () => ['speak-english-v1', 'speak-english-v2', 'another-app-cache'],
      delete: async key => { deleted.push(key); return true; },
      open: async () => ({
        addAll: async () => {},
        put: async () => { throw new Error('quota'); },
      }),
      match: async () => new Response('offline-copy', { status: 200 }),
    },
    self: {
      location: { origin: 'https://app.test' },
      clients: { claim: async () => {} },
      skipWaiting: async () => {},
      addEventListener: (type, handler) => { handlers[type] = handler; },
    },
  });
  vm.runInContext(sw, context, { filename: 'service-worker.js' });

  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ['speak-english-v1', 'speak-english-v2']);

  const request = { method: 'GET', url: 'https://app.test/index.html', mode: 'navigate' };
  let responsePromise;
  handlers.fetch({ request, respondWith: promise => { responsePromise = promise; } });
  assert.equal(await (await responsePromise).text(), 'fresh');

  offline = true;
  handlers.fetch({ request, respondWith: promise => { responsePromise = promise; } });
  assert.equal(await (await responsePromise).text(), 'offline-copy');
});
