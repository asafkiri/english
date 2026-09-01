import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
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
      defaults, load, save, validSavedSession, normalize, matchDetails, matchScore, softWordsFor,
      selectWarmup, buildChallengeSteps, splitPhraseChunks,
      PRACTICE_TOPICS, PRACTICE_SCENES, PRACTICE_STORIES,
      practiceStoryById, practiceSceneById, matchesPracticeWhen, resolvePracticeBeat,
      applyPracticeChoice, fillPracticeStoryTokens, fillProfileText, materializePracticeBeat,
      buildPracticeSession, rememberPracticeRun, startPractice, startUnitRehearsal, ptext,
      UNIT_REHEARSALS, UNIT_MISSIONS, normalizeMissions, mergeMissions, LESSONS_PER_UNIT,
      startLesson, resumeLesson, saveLessonCheckpoint, stopLessonTimers, renderStep,
      manualMicDone, answerListenQuiz, chooseBranch, next, notePractice, stageCaptionLine, captionHtml, chatMessagesHtml,
      getState:()=>state, setState:v=>{state=v}, getLesson:()=>L, setLesson:v=>{L=v}
    };
  `;
  vm.runInContext(inline + expose, context, { filename: 'index-inline.js' });
  return { api: context.__test, seed, app };
}

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
    '46793e10019e3cfd3c218a44e87f65f6213deb9845a126a1afc03964c19f2159',
  );
});

test('old local state migrates without losing progress', () => {
  const seed = new Map([['speakEnglishV1', JSON.stringify({
    name: 'נועם', onboarded: true, completed: 12.8, streak: 6,
    slowSpeech: false, micEnabled: true, hard: ['1:2', '1:2', null],
    practiceRecentStories: ['morning_robot'], progressUpdatedAt: 1234,
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
  assert.deepEqual([...state.practiceRecentStories], ['morning_robot']);
  assert.equal(state.practiceRecentUpdatedAt, 1234);
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

test('the learner\'s own name never blocks a passing sentence', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.name = 'Asaf';
  api.setState(state);

  // exactly what the phone did: an English engine cannot spell a Hebrew name,
  // so "Asaf" came back as "Steph" — and a pass needs every word matched
  const target = 'My name is Asaf. Nice to meet you!';
  const heard = 'My name is Steph nice to meet you';

  const strict = api.matchDetails(target, heard);
  assert.ok(strict.words.some((w, i) => w === 'asaf' && !strict.matched[i]),
    'without the softening the name is what fails — otherwise this test proves nothing');

  const soft = api.softWordsFor({ p: { en: 'My name is {name}. Nice to meet you!' } });
  assert.deepEqual([...soft], ['asaf']);
  const lenient = api.matchDetails(target, heard, soft);
  assert.deepEqual([...lenient.words.filter((w, i) => !lenient.matched[i])], [],
    'no word may be reported missing when only the name was misheard');
  assert.equal(lenient.score, 1);
  assert.equal(lenient.criticalMismatch, false);

  // the softening is the name and nothing else: a real English word that went
  // missing still has to be said again
  const dropped = api.matchDetails('My name is Asaf. Nice to meet you!', 'My name is Steph to meet you', soft);
  assert.ok(dropped.words.some((w, i) => w === 'nice' && !dropped.matched[i]));

  // a sentence that never asked for the name softens nothing, so a learner
  // called Ben cannot get the English word "Ben" for free
  assert.deepEqual([...api.softWordsFor({ p: { en: "I'm good, thanks" } })], []);

  // a Hebrew name is dropped from the spoken sentence altogether, so there is
  // nothing to credit and nothing to fail on
  const hebrew = api.defaults();
  hebrew.onboarded = true;
  hebrew.name = 'אסף';
  api.setState(hebrew);
  assert.deepEqual([...api.softWordsFor({ p: { en: 'My name is {name}' } })], []);
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

const EXPECTED_PRACTICE_STORIES = [
  ['morning_robot', 1, 4],
  ['first_art_class', 2, 5],
  ['phone_in_elevator', 5, 6],
  ['family_photo_wind', 6, 6],
  ['school_activity', 7, 7],
  ['lost_bag', 10, 7],
  ['restaurant_mixup', 12, 7],
  ['broken_phone_plan', 17, 8],
  ['tom_last_shot', 19, 9],
  ['nina_wrong_bag', 23, 8],
  ['maya_lost_dog', 26, 10],
  ['maya_rainy_beach', 29, 10],
];

const PROFILE_PLACEHOLDERS = new Set(['name', 'age', 'interest', 'food', 'color', 'animal']);

function storyVariants(beat) {
  return Array.isArray(beat.variants) ? beat.variants : [beat];
}

function assertTrilingual(line, where) {
  assert.ok(line && typeof line === 'object', `${where}: missing line`);
  for (const field of ['en', 'he', 'tl']) {
    assert.ok(typeof line[field] === 'string' && line[field].trim(), `${where}: missing ${field}`);
  }
}

function englishWords(value) {
  return String(value).toLowerCase().replace(/\{[a-z][a-z0-9_]*\}/gi, ' ').match(/[a-z']+/g) || [];
}

function learnedEnglishByCompleted(api) {
  const seen = new Set(['and', 'a', 'the', 'i', 'it', 'is', 'you', 'my', 'to', 'too', 'or']);
  const learned = [new Set(seen)];
  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    for (const line of [...api.LESSONS[idx].phrases, ...api.LESSONS[idx].dialogue]) {
      englishWords(line.en).forEach(word => seen.add(word));
    }
    for (const round of api.conversationRounds(idx)) {
      englishWords(round.ask.en).forEach(word => seen.add(word));
      for (const option of round.options) {
        englishWords(option.answer.en).forEach(word => seen.add(word));
        englishWords(option.reply.en).forEach(word => seen.add(word));
      }
    }
    learned.push(new Set(seen));
  }
  return learned;
}

function normalizedEcho(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
}

function fillStoryLine(api, story, vars, value, field = 'en') {
  return api.fillPracticeStoryTokens(value || '', field, story.id, vars);
}

function futureStorySignature(api, story, startAt, initialVars) {
  let vars = { ...initialVars };
  const signature = [];
  for (let i = startAt; i < story.beats.length; i++) {
    const beat = api.resolvePracticeBeat(story, i, vars);
    if (!beat) return 'UNRESOLVED';
    signature.push(beat.variantId, fillStoryLine(api, story, vars, beat.ask.en));
    if (beat.event) signature.push(fillStoryLine(api, story, vars, beat.event.he, 'he'));
    const option = beat.options[0];
    vars = api.applyPracticeChoice(vars, option);
    signature.push(
      fillStoryLine(api, story, vars, option.answer.en),
      fillStoryLine(api, story, vars, option.reply.en),
    );
  }
  signature.push(fillStoryLine(api, story, vars, story.ending, 'he'));
  return JSON.stringify(signature);
}

test('every authored free-practice path is complete, coherent and learned', () => {
  const { api } = runtime();
  const taught = learnedEnglishByCompleted(api);
  const actualCatalog = [...api.PRACTICE_STORIES]
    .sort((a, b) => a.min - b.min)
    .map(story => [story.id, story.min, story.beats.length]);
  assert.deepEqual(actualCatalog, EXPECTED_PRACTICE_STORIES);
  assert.equal(new Set(api.PRACTICE_STORIES.map(story => story.id)).size, api.PRACTICE_STORIES.length);

  for (const story of api.PRACTICE_STORIES) {
    assert.equal(api.practiceStoryById(story.id), story);
    assert.ok(Number.isInteger(story.min) && story.min >= 1 && story.min <= api.LESSONS.length);
    assert.ok(story.goal && story.open && story.ending, `${story.id}: needs a goal, opening and ending`);
    assert.ok(Array.isArray(story.sceneIds) && story.sceneIds.length, `${story.id}: needs a scene`);
    story.sceneIds.forEach(sceneId => assert.ok(api.practiceSceneById(sceneId),
      `${story.id}: unknown scene ${sceneId}`));
    assert.equal(new Set(story.beats.map(beat => beat.id)).size, story.beats.length,
      `${story.id}: duplicate beat id`);

    for (const [key, values] of Object.entries(story.values || {})) {
      assert.ok(values && typeof values === 'object' && !Array.isArray(values), `${story.id}: bad values.${key}`);
      for (const [valueId, line] of Object.entries(values)) assertTrilingual(line,
        `${story.id}: values.${key}.${valueId}`);
    }

    const allStoryText = JSON.stringify(story);
    for (const token of allStoryText.matchAll(/\{([a-z][a-z0-9_]*)\}/gi)) {
      const key = token[1];
      assert.ok(PROFILE_PLACEHOLDERS.has(key) || story.values?.[key],
        `${story.id}: unknown token {${key}}`);
    }

    story.beats.forEach((beat, beatIndex) => {
      const variants = storyVariants(beat);
      const conditionalIds = variants.filter(variant => variant.when).map(variant => variant.id);
      assert.equal(new Set(conditionalIds).size, conditionalIds.length,
        `${story.id} beat ${beat.id}: duplicate conditional variant id`);
      variants.forEach((variant, variantIndex) => {
        assertTrilingual(variant.ask, `${story.id} beat ${beat.id} variant ${variant.id || variantIndex} ask`);
        if (variant.event) assert.ok(typeof variant.event.he === 'string' && variant.event.he.trim(),
          `${story.id} beat ${beat.id}: event needs Hebrew narration`);
        assert.ok(Array.isArray(variant.options) && variant.options.length >= 2,
          `${story.id} beat ${beat.id}: every variant needs at least two choices`);
        assert.equal(new Set(variant.options.map(option => option.id)).size, variant.options.length,
          `${story.id} beat ${beat.id}: duplicate option id`);
        for (const [key, value] of Object.entries(variant.when || {})) {
          assert.ok(['string', 'number', 'boolean'].includes(typeof value),
            `${story.id} beat ${beat.id}: when.${key} must be primitive`);
        }
        variant.options.forEach((option, optionIndex) => {
          assert.ok(option.id && option.label, `${story.id} beat ${beat.id} option ${optionIndex}: missing id/label`);
          assertTrilingual(option.answer, `${story.id} beat ${beat.id} option ${option.id} answer`);
          assertTrilingual(option.reply, `${story.id} beat ${beat.id} option ${option.id} reply`);
          for (const [key, value] of Object.entries(option.set || {})) {
            assert.ok(['string', 'number', 'boolean'].includes(typeof value),
              `${story.id} beat ${beat.id}: set.${key} must be primitive`);
            if (story.values?.[key]) assert.ok(story.values[key][value],
              `${story.id} beat ${beat.id}: set.${key}=${value} has no display value`);
            const later = JSON.stringify(story.beats.slice(beatIndex + 1));
            const usedByCondition = story.beats.slice(beatIndex + 1).some(laterBeat =>
              storyVariants(laterBeat).some(laterVariant =>
                Object.prototype.hasOwnProperty.call(laterVariant.when || {}, key)));
            const usedByToken = later.includes(`{${key}}`) || String(story.ending).includes(`{${key}}`);
            assert.ok(usedByCondition || usedByToken,
              `${story.id} beat ${beat.id}: set.${key} is never remembered later`);
          }
        });
      });
    });

    const variantHits = new Set();
    let pathCount = 0;
    let rememberedChoiceComparisons = 0;
    const walk = (beatIndex, vars, eventCount, previousReply, priorEnglish) => {
      if (beatIndex === story.beats.length) {
        pathCount++;
        assert.ok(eventCount > 0, `${story.id}: every complete path needs a story event`);
        const ending = fillStoryLine(api, story, vars, story.ending, 'he');
        for (const key of Object.keys(story.values || {})) assert.doesNotMatch(ending, new RegExp(`\\{${key}\\}`),
          `${story.id}: ending uses {${key}} before it is set`);
        return;
      }

      const resolved = api.resolvePracticeBeat(story, beatIndex, vars);
      assert.ok(resolved, `${story.id} beat ${beatIndex}: no variant for ${JSON.stringify(vars)}`);
      const expectedRole = beatIndex === 0 ? 'open' : beatIndex === story.beats.length - 1 ? 'close' : 'mid';
      assert.equal(resolved.role, expectedRole, `${story.id} beat ${beatIndex}: wrong conversation role`);
      const variants = storyVariants(story.beats[beatIndex]);
      const rawIndex = variants.findIndex(variant => variant.ask === resolved.ask && variant.options === resolved.options);
      assert.ok(rawIndex >= 0, `${story.id} beat ${beatIndex}: resolver drifted outside its story`);
      const expected = variants.find(variant => variant.when && api.matchesPracticeWhen(variant.when, vars)) ||
        variants.find(variant => !variant.when);
      assert.equal(variants[rawIndex], expected, `${story.id} beat ${beatIndex}: wrong conditional variant`);
      variantHits.add(`${beatIndex}:${rawIndex}`);

      const renderedAsk = fillStoryLine(api, story, vars, resolved.ask.en);
      for (const key of Object.keys(story.values || {})) assert.doesNotMatch(renderedAsk, new RegExp(`\\{${key}\\}`),
        `${story.id} beat ${beatIndex}: ask uses {${key}} before it is set`);
      const echo = normalizedEcho(previousReply);
      const nextAsk = normalizedEcho(renderedAsk);
      if (echo.split(' ').length >= 2) assert.ok(nextAsk !== echo && !nextAsk.startsWith(`${echo} `),
        `${story.id} beat ${beatIndex}: repeats the prior reply "${previousReply}" as the next line`);

      for (let left = 0; left < resolved.options.length; left++) {
        for (let right = left + 1; right < resolved.options.length; right++) {
          const a = resolved.options[left], b = resolved.options[right];
          if (JSON.stringify(a.set || {}) === JSON.stringify(b.set || {})) continue;
          rememberedChoiceComparisons++;
          const afterA = api.applyPracticeChoice(vars, a);
          const afterB = api.applyPracticeChoice(vars, b);
          assert.notEqual(
            futureStorySignature(api, story, beatIndex + 1, afterA),
            futureStorySignature(api, story, beatIndex + 1, afterB),
            `${story.id} beat ${beatIndex}: ${a.id}/${b.id} stores a choice but never changes a later turn`,
          );
        }
      }

      resolved.options.forEach(option => {
        const beforeVars = JSON.stringify(vars);
        const beforeOption = JSON.stringify(option);
        const nextVars = api.applyPracticeChoice(vars, option);
        assert.equal(JSON.stringify(vars), beforeVars, `${story.id}: applyPracticeChoice mutated its input`);
        assert.equal(JSON.stringify(option), beforeOption, `${story.id}: applyPracticeChoice mutated authored data`);
        for (const [key, value] of Object.entries(option.set || {})) assert.equal(nextVars[key], value);

        const answer = fillStoryLine(api, story, nextVars, option.answer.en);
        const reply = fillStoryLine(api, story, nextVars, option.reply.en);
        for (const key of Object.keys(story.values || {})) {
          assert.doesNotMatch(answer, new RegExp(`\\{${key}\\}`),
            `${story.id} beat ${beatIndex}: answer uses {${key}} before it is set`);
          assert.doesNotMatch(reply, new RegExp(`\\{${key}\\}`),
            `${story.id} beat ${beatIndex}: reply uses {${key}} before it is set`);
        }
        englishWords(answer).forEach(word => assert.ok(taught[story.min].has(word),
          `${story.id} (min ${story.min}) asks for untaught "${word}" in "${answer}"`));
        if (/\bnice to meet you too\b/i.test(answer)) {
          assert.match(`${priorEnglish} ${renderedAsk}`, /\bnice to meet you\b/i,
            `${story.id} beat ${beatIndex}: learner says "too" before the other person says nice to meet you`);
        }
        assert.doesNotMatch(reply, /\?\s*$/, `${story.id} beat ${beatIndex}: reply asks a question nobody can answer`);
        if (beatIndex < story.beats.length - 1) {
          for (const line of [renderedAsk, answer, reply]) assert.doesNotMatch(line,
            /\b(goodbye|bye|have a nice day)\b/i,
            `${story.id} beat ${beatIndex}: "${line}" ends the conversation too early`);
        }
        walk(beatIndex + 1, nextVars, eventCount + (resolved.event ? 1 : 0), reply,
          `${priorEnglish} ${renderedAsk} ${answer} ${reply}`);
      });
    };

    walk(0, {}, 0, '', '');
    assert.ok(pathCount > 0 && pathCount < 200_000, `${story.id}: unreasonable path count ${pathCount}`);
    assert.ok(rememberedChoiceComparisons > 0, `${story.id}: no choice affects a later turn`);
    story.beats.forEach((beat, beatIndex) => storyVariants(beat).forEach((variant, variantIndex) => {
      if (variant.when) assert.ok(variantHits.has(`${beatIndex}:${variantIndex}`),
        `${story.id} beat ${beatIndex}: conditional variant ${variant.id || variantIndex} is unreachable`);
    }));
  }
  assert.equal(api.practiceStoryById('not-a-real-story'), null);
});

test('story values win over profile placeholders with the same name', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  const profileFallback = { food: 'pizza', color: 'blue', animal: 'dogs', interest: 'music' };
  for (const story of api.PRACTICE_STORIES) {
    for (const key of Object.keys(story.values || {}).filter(name => name in profileFallback)) {
      const chosen = Object.keys(story.values[key]).find(valueId =>
        story.values[key][valueId].en !== profileFallback[key]);
      if (!chosen) continue;
      api.setLesson({ practiceStoryId: story.id, practiceVars: { [key]: chosen } });
      assert.equal(api.ptext({ en: `{${key}}` }, 'en'), story.values[key][chosen].en,
        `${story.id}: {${key}} was replaced by the profile instead of the story choice`);
    }
  }
  api.setLesson(null);
});

test('authored story text respects the learner gender, including remembered values', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.profile.gender = 'female';
  api.setState(state);
  api.setLesson({ practiceStoryId: 'tom_last_shot', practiceVars: { cheer: 'believe' } });
  assert.equal(api.fillProfileText('{cheer}', 'he'), 'אני מאמינה בך');
  assert.equal(api.fillProfileText('האם [[אתה מוכן|את מוכנה]]?', 'he'), 'האם את מוכנה?');
  assert.equal(api.fillProfileText('[[בוא|בואי]] איתי', 'he'), 'בואי איתי');
  const benClose = api.PRACTICE_STORIES.find(story => story.id === 'family_photo_wind')
    .beats.find(beat => beat.id === 'return_photo');
  assert.equal(api.fillProfileText(benClose.options.find(option => option.id === 'care').answer.he, 'he'),
    'תודה! שמור על עצמך!', 'the learner addresses Ben, so Ben stays masculine');
  const tomContact = api.PRACTICE_STORIES.find(story => story.id === 'broken_phone_plan')
    .beats.find(beat => beat.id === 'contact');
  assert.equal(api.fillProfileText(tomContact.options.find(option => option.id === 'tom_texts').answer.he, 'he'),
    'שלח לי הודעה', 'the learner addresses Tom, so Tom stays masculine');
  const rainyBeach = api.PRACTICE_STORIES.find(story => story.id === 'maya_rainy_beach');
  assert.match(api.fillProfileText(rainyBeach.open, 'he'), /אתן בודקות ואורזות/);
  for (const story of api.PRACTICE_STORIES) {
    const authored = JSON.stringify(story);
    assert.doesNotMatch(authored, /\[\[\[\[/, `${story.id}: malformed gender marker`);
    assert.doesNotMatch(authored, /נ\[\[תראה/, `${story.id}: changed the neutral word נתראה`);
  }
  api.setLesson(null);
});

test('free practice unlocks whole stories and rotates recent stories', () => {
  const { api } = runtime();
  for (const completed of [0, 1, 2, 5, 6, 7, 10, 12, 17, 19, 23, 26, 29, 30]) {
    const state = api.defaults();
    state.onboarded = true;
    state.completed = completed;
    api.setState(state);
    const eligible = api.PRACTICE_STORIES.filter(story => story.min <= completed);
    const session = api.buildPracticeSession();
    if (!eligible.length) {
      assert.equal(session, null);
      continue;
    }
    assert.ok(eligible.includes(session.story), `completed ${completed}: selected a locked story`);
    assert.equal(session.storyId, session.story.id);
    assert.equal(session.turns, session.story.beats, `${session.storyId}: mixed in unrelated turns`);
    assert.ok(session.story.sceneIds.includes(session.sceneId), `${session.storyId}: used an unrelated scene`);
    assert.equal(session.meta.mission, session.story.goal);
    if (completed >= 18) assert.ok(session.turns.length >= 7,
      `completed ${completed}: late-course practice should be a substantial conversation`);
  }

  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  const storyIds = [];
  for (let run = 0; run < 24; run++) {
    const session = api.buildPracticeSession();
    assert.ok(session);
    assert.ok(!storyIds.slice(-6).includes(session.storyId),
      `story repeated inside the recency window: ${storyIds.join(' → ')} → ${session.storyId}`);
    api.rememberPracticeRun(session.sceneId, session.charId, session.storyId);
    storyIds.push(session.storyId);
    assert.equal(api.getState().practiceRecentStories.at(-1), session.storyId);
    assert.ok(api.getState().practiceRecentStories.length <= 8);
    assert.equal(new Set(api.getState().practiceRecentStories).size, api.getState().practiceRecentStories.length);
  }
  assert.equal(new Set(storyIds.slice(0, 7)).size, 7, 'the first seven conversations should all be different stories');
});

test('story rotation reconciles a conversation started in another tab', () => {
  const seed = new Map();
  const firstTab = runtime(seed);
  const staleTab = runtime(seed);
  for (const { api } of [firstTab, staleTab]) {
    const state = api.defaults();
    state.onboarded = true;
    state.completed = 30;
    api.setState(state);
  }

  const first = firstTab.api.buildPracticeSession();
  firstTab.api.rememberPracticeRun(first.sceneId, first.charId, first.storyId);
  const second = staleTab.api.buildPracticeSession();
  assert.notEqual(second.storyId, first.storyId, 'a stale tab repeated the story just opened elsewhere');
  assert.equal(staleTab.api.getState().practiceRecentStories.at(-1), first.storyId);

  staleTab.api.rememberPracticeRun(second.sceneId, second.charId, second.storyId);
  const third = firstTab.api.buildPracticeSession();
  assert.notEqual(third.storyId, second.storyId);
  assert.deepEqual(
    Array.from(firstTab.api.getState().practiceRecentStories.slice(-2)),
    [first.storyId, second.storyId],
  );
});

test('unrelated progress from a stale tab cannot reorder recent stories', () => {
  const seed = new Map();
  const currentTab = runtime(seed);
  const state = currentTab.api.defaults();
  state.onboarded = true;
  state.completed = 30;
  currentTab.api.setState(state);

  const first = currentTab.api.buildPracticeSession();
  currentTab.api.rememberPracticeRun(first.sceneId, first.charId, first.storyId);
  const staleTab = runtime(seed);
  const second = currentTab.api.buildPracticeSession();
  currentTab.api.rememberPracticeRun(second.sceneId, second.charId, second.storyId);
  assert.notEqual(second.storyId, first.storyId);

  // This tab only changed ordinary lesson/mission progress after it became
  // stale; it did not start another practice conversation.
  staleTab.api.getState().progressUpdatedAt = currentTab.api.getState().progressUpdatedAt + 1000;
  staleTab.api.save();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.deepEqual(persisted.practiceRecentStories.slice(-2), [first.storyId, second.storyId]);
  assert.equal(persisted.practiceRecentUpdatedAt, currentTab.api.getState().practiceRecentUpdatedAt);
});

test('practice history resolves profile markers in the opening scene', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.profile.gender = 'female';
  api.setState(state);
  const story = api.practiceStoryById('family_photo_wind');
  api.setLesson({
    isPractice: true, practiceStoryId: story.id, practiceVars: {},
    practiceMeta: { sceneOpen: story.open }, chat: [], chatExpanded: false,
  });
  const history = api.chatMessagesHtml();
  assert.match(history, /את יושבת עם בן/);
  assert.doesNotMatch(history, /\[\[/);
  api.setLesson(null);
});

test('free-practice captions keep Hebrew visible but let English lead', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.profile.gender = 'female';
  api.setState(state);
  const line = {
    en: "Hello! Welcome to your first art class. What's your name?",
    he: 'שלום! ברוכה הבאה לשיעור האמנות הראשון שלך. איך קוראים לך?',
    tl: 'הֶלוֹ! וֶולְקַאם טוּ יוֹר פֶרְסְט אַרְט קְלַאס.',
  };

  const listening = api.captionHtml(line, { showTl: false });
  assert.ok(listening.indexOf('class="cap-en"') < listening.indexOf('class="cap-aid auto-translation delayed"'),
    'English should be encountered before its Hebrew translation');
  assert.doesNotMatch(listening, /id="capHe"[^>]*hidden/);
  assert.match(listening, /id="capHe" dir="rtl" lang="he"/);
  assert.doesNotMatch(listening, /toggleCaptionAid\('he'/, 'permanent translation needs no reveal button');
  assert.match(listening, /toggleCaptionAid\('tl'/, 'pronunciation help should stay optional');
  assert.match(listening, /איך מבטאים\?/);
  assert.match(html, /animation:capTranslationReveal \.28s ease \.9s forwards/,
    'the translation should arrive shortly after the English, not at the same instant');
  assert.match(html, /translationReadingDelay=Math\.max\(2200,Math\.min\(3800,translatedLength\*45\)\)/,
    'short follow-up lines still need enough time for a beginner to read the translation');
  assert.match(html, /@media \(max-height:620px\)[\s\S]*--avatar:clamp\(84px,16vh,108px\)/,
    'bilingual captions need a compact layout on short phones');
  assert.match(html, /requestAnimationFrame\(keepStageCaptionVisible\)/,
    'the bilingual caption should be brought into view after a stage update');

  const choosing = api.captionHtml(line, { showTl: false }, { translationDelay: false });
  assert.match(choosing, /class="cap-aid auto-translation"/);
  assert.doesNotMatch(choosing, /auto-translation delayed/,
    'the same line should not flash away again on the answer-choice screen');

  api.setLesson({
    isPractice: true, idx: 0, practiceStoryId: 'first_art_class', practiceVars: {},
    practiceMeta: { character: { name: 'דנה', avatar: '🎨', color: '#38bdf8' } },
    chat: [{ who: 'app', line, showHe: false, showTl: false }],
    chatExpanded: false,
  });
  const history = api.chatMessagesHtml();
  assert.doesNotMatch(history, /id="bubble-he-history-0"[^>]*hidden/,
    'practice history should keep the translation visible too');
  assert.doesNotMatch(history, /toggleBubbleAid\('history',0,'he'/);
  api.setLesson(null);
});

test('a story event remains visible while choosing and in conversation history', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  api.startPractice();
  const lesson = api.getLesson();
  const story = api.practiceStoryById(lesson.practiceStoryId);
  let vars = {};
  let eventIndex = -1;
  let resolved = null;
  for (let i = 0; i < story.beats.length; i++) {
    resolved = api.resolvePracticeBeat(story, i, vars);
    if (resolved.event) { eventIndex = i; break; }
    vars = api.applyPracticeChoice(vars, resolved.options[0]);
  }
  assert.ok(eventIndex >= 0, `${story.id}: expected a story event`);
  lesson.practiceVars = vars;
  assert.equal(api.materializePracticeBeat(eventIndex, lesson), true);
  const listenIndex = 1 + eventIndex * 4;
  const listen = lesson.steps[listenIndex];
  const choice = lesson.steps[listenIndex + 1];
  assert.equal(choice.event, listen.event);

  lesson.chat = [];
  lesson.i = listenIndex;
  listen.arrived = true;
  api.next();
  assert.equal(lesson.chat[0].event, listen.event);
  assert.match(app.innerHTML, /class="story-event /);
  assert.ok(app.innerHTML.includes(listen.event.emoji));
  api.stopLessonTimers(false);
});

test('a free-practice choice fills the next fixed slot without changing progress length', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  api.startPractice();
  const lesson = api.getLesson();
  const story = api.practiceStoryById(lesson.practiceStoryId);
  assert.ok(story);
  assert.equal(lesson.steps.length, 2 + story.beats.length * 4);
  assert.deepEqual(Array.from(lesson.steps.slice(1, 3), step => step.type), ['listen', 'branchChoice']);
  for (let round = 1; round < story.beats.length; round++) {
    assert.deepEqual(Array.from(lesson.steps.slice(1 + round * 4, 3 + round * 4), step => step.type),
      ['practiceBeatPending', 'practiceChoicePending']);
  }

  const choice = lesson.steps[2];
  const option = choice.options[0];
  const expectedVars = api.applyPracticeChoice({}, option);
  const expectedNext = api.resolvePracticeBeat(story, 1, expectedVars);
  lesson.i = 2;
  const originalLength = lesson.steps.length;
  api.chooseBranch(0);
  assert.equal(lesson.steps.length, originalLength);
  assert.equal(lesson.i, 3);
  assert.equal(lesson.steps[3].p, option.answer);
  assert.equal(lesson.steps[4].line, option.reply);
  assert.equal(lesson.steps[5].line, expectedNext.ask);
  assert.equal(lesson.steps[6].options, expectedNext.options);
  assert.equal(lesson.steps[5].practiceVariantId, expectedNext.variantId);
  for (const [key, value] of Object.entries(option.set || {})) assert.equal(lesson.practiceVars[key], value);
  api.stopLessonTimers(false);
});

test('story branching does not hijack a unit rehearsal conversation', () => {
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 5;
  api.setState(state);
  api.startUnitRehearsal(0);
  const lesson = api.getLesson();
  const choiceIndex = lesson.steps.findIndex(step => step.type === 'branchChoice');
  const untouchedNextAsk = lesson.steps[choiceIndex + 3];
  const answer = lesson.steps[choiceIndex].options[0].answer;
  const originalLength = lesson.steps.length;
  lesson.i = choiceIndex;
  api.chooseBranch(0);
  assert.equal(lesson.practiceStoryId, undefined);
  assert.equal(lesson.practiceVars, undefined);
  assert.equal(lesson.steps.length, originalLength);
  assert.equal(lesson.steps[choiceIndex + 1].p, answer);
  assert.equal(lesson.steps[choiceIndex + 3], untouchedNextAsk);
  api.stopLessonTimers(false);
});

test('a unit rehearsal only ever asks for what that unit taught', () => {
  const { api } = runtime();
  const words = s => String(s).toLowerCase().replace(/\{[a-z]+\}/g, ' ').match(/[a-z']+/g) || [];

  // everything heard or said by the end of each unit
  const seen = new Set(['and', 'a', 'the', 'i', 'it', 'is', 'you', 'my', 'to', 'too', 'or']);
  const taughtByUnit = [];
  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    api.LESSONS[idx].phrases.forEach(p => words(p.en).forEach(w => seen.add(w)));
    api.LESSONS[idx].dialogue.forEach(l => words(l.en).forEach(w => seen.add(w)));
    api.conversationRounds(idx).forEach(round => {
      words(round.ask.en).forEach(w => seen.add(w));
      round.options.forEach(o => words(o.reply.en).forEach(w => seen.add(w)));
    });
    if ((idx + 1) % api.LESSONS_PER_UNIT === 0) taughtByUnit.push(new Set(seen));
  }

  assert.equal(api.UNIT_REHEARSALS.length, taughtByUnit.length);
  api.UNIT_REHEARSALS.forEach((rehearsal, u) => {
    assert.ok(rehearsal.turns.length >= 5, `unit ${u + 1}: a rehearsal should be a long conversation`);
    assert.ok(rehearsal.who && rehearsal.place && rehearsal.open && rehearsal.close);

    rehearsal.turns.forEach((turn, n) => {
      const last = n === rehearsal.turns.length - 1;
      assert.ok(turn.ask.en && turn.ask.he && turn.ask.tl, `unit ${u + 1} round ${n + 1}: ask needs all three forms`);
      assert.ok(turn.options.length >= 2);

      turn.options.forEach(option => {
        assert.ok(option.label, `unit ${u + 1} round ${n + 1}: option needs a Hebrew label`);
        for (const form of [option.answer, option.reply])
          assert.ok(form.en && form.he && form.tl, `unit ${u + 1} round ${n + 1}: needs all three forms`);

        // the whole point of a rehearsal is that he can already say every word
        words(option.answer.en).forEach(word => assert.ok(taughtByUnit[u].has(word),
          `unit ${u + 1} round ${n + 1}: asks for the untaught word "${word}" in "${option.answer.en}"`));

        if (!last) {
          assert.ok(!/\?\s*$/.test(option.reply.en),
            `unit ${u + 1} round ${n + 1}: "${option.reply.en}" asks a question, then the next line talks over it`);
          for (const line of [option.answer.en, option.reply.en])
            assert.ok(!/\bgoodbye\b|\bhave a nice day\b|(?:^|[^a-z])bye\b/i.test(line),
              `unit ${u + 1} round ${n + 1}: "${line}" says goodbye, then the conversation keeps going`);
        }
      });
    });
  });
});

test('every unit ends with a real mission he could actually go and do', () => {
  const { api } = runtime();
  const words = s => String(s).toLowerCase().replace(/\{[a-z]+\}/g, ' ').match(/[a-z']+/g) || [];

  const seen = new Set(['and', 'a', 'the', 'i', 'it', 'is', 'you', 'my', 'to', 'too', 'or']);
  const taughtByUnit = [];
  for (let idx = 0; idx < api.LESSONS.length; idx++) {
    api.LESSONS[idx].phrases.forEach(p => words(p.en).forEach(w => seen.add(w)));
    api.LESSONS[idx].dialogue.forEach(l => words(l.en).forEach(w => seen.add(w)));
    api.conversationRounds(idx).forEach(round => {
      words(round.ask.en).forEach(w => seen.add(w));
      round.options.forEach(o => words(o.reply.en).forEach(w => seen.add(w)));
    });
    if ((idx + 1) % api.LESSONS_PER_UNIT === 0) taughtByUnit.push(new Set(seen));
  }

  assert.equal(api.UNIT_MISSIONS.length, api.UNITS.length);
  api.UNIT_MISSIONS.forEach((mission, u) => {
    for (const field of ['emoji', 'title', 'what', 'tip', 'win'])
      assert.ok(mission[field], `unit ${u + 1}: a mission needs ${field}`);
    assert.ok(mission.lines.length >= 3, `unit ${u + 1}: give him the lines to say`);
    // he must never be sent out with a sentence the course has not taught him
    mission.lines.forEach(line => words(line).forEach(word => assert.ok(taughtByUnit[u].has(word),
      `unit ${u + 1}: the mission line "${line}" uses the untaught word "${word}"`)));
  });
});

test('rehearsals and missions only ever move forward', () => {
  const seed = new Map();
  const first = runtime(seed);
  const state = first.api.defaults();
  state.onboarded = true;
  state.completed = 10;
  first.api.setState(state);

  // normalising junk gives a complete, safe shape
  const clean = first.api.normalizeMissions({ 0: { rehearsed: true, done: 'yes', doneAt: '77' }, 9: 'nonsense' });
  assert.equal(clean[0].rehearsed, true);
  assert.equal(clean[0].done, true);
  assert.equal(clean[0].doneAt, 77);
  assert.equal(clean[1].rehearsed, false);

  // two tabs can only add to each other, never undo a mission already done
  const merged = first.api.mergeMissions(
    { 0: { rehearsed: true, done: true, doneAt: 500 }, 1: { rehearsed: false, done: false, doneAt: 0 } },
    { 0: { rehearsed: false, done: false, doneAt: 0 }, 1: { rehearsed: true, done: false, doneAt: 0 } },
  );
  assert.equal(merged[0].done, true, 'a completed mission must survive a stale tab');
  assert.equal(merged[0].doneAt, 500);
  assert.equal(merged[1].rehearsed, true);

  // and it survives being written out and read back by a fresh runtime
  const live = first.api.getState();
  live.missions = first.api.normalizeMissions({ 0: { rehearsed: true, done: true, doneAt: 1234 } });
  first.api.setState(live);
  first.api.saveLessonCheckpoint();
  seed.set('speakEnglishV1', JSON.stringify({ ...JSON.parse(seed.get('speakEnglishV1') || '{}'), missions: live.missions }));

  const second = runtime(seed);
  assert.equal(second.api.getState().missions[0].done, true);
  assert.equal(second.api.getState().missions[0].doneAt, 1234);
  first.api.stopLessonTimers(false);
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

test('the stage anchors the figure instead of re-centring it', () => {
  // The character's position must not depend on what is drawn around it.
  // Vertical centring made every caption or composer change re-centre the
  // column and shove the figure up or down — measured at up to 49px on every
  // beat of a conversation, which reads as the character jumping about.
  const stageRule = html.match(/\.stage-screen \.stage\{[^}]*flex-direction:column[^}]*\}/)?.[0];
  assert.ok(stageRule, 'the stage layout rule should exist');
  assert.match(stageRule, /justify-content:flex-start/);
  assert.doesNotMatch(stageRule, /justify-content:center/);
});

test('PWA update code is versioned and does not clear local progress', () => {
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_PREFIX\s*=\s*'speak-english-'/);
  // the cache must stay versioned, but pinning one number here only breaks
  // the suite every time the app legitimately ships a new version
  assert.match(sw, /CACHE_NAME\s*=\s*'speak-english-v\d+'/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(html, /updateViaCache:'none'/);
  assert.doesNotMatch(sw, /localStorage/);
});

test('service worker preserves network success, offline fallback, and unrelated caches', async () => {
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
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
