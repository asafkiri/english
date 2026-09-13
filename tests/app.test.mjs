import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!inline) throw new Error('inline app script not found');

function runtime(seed = new Map(), options = {}) {
  const app = { innerHTML: '' };
  const documentListeners = new Map();
  const windowListeners = new Map();
  const rememberListener = (bucket, type, listener) => {
    if (!bucket.has(type)) bucket.set(type, []);
    bucket.get(type).push(listener);
  };
  const localStorage = {
    getItem: key => seed.has(key) ? seed.get(key) : null,
    setItem: (key, value) => {
      if (options.failSetItem?.(key, value)) throw new Error(`injected setItem failure for ${key}`);
      seed.set(key, String(value));
    },
    removeItem: key => seed.delete(key),
  };
  const document = {
    hidden: false,
    getElementById: id => id === 'app' ? app : null,
    addEventListener(type, listener) { rememberListener(documentListeners, type, listener); },
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
    matchMedia: options.matchMedia,
    scrollTo() {},
    addEventListener(type, listener) { rememberListener(windowListeners, type, listener); },
  };
  if (options.speechSynthesis) window.speechSynthesis = options.speechSynthesis;
  const context = vm.createContext({
    console, document, window, localStorage,
    navigator: options.navigator || {}, location: { reload() {} },
    confirm: () => true,
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: fn => setTimeout(fn, 0),
    cancelAnimationFrame: id => clearTimeout(id),
    Date, Math, JSON, Map, Set, String, Number, Array, Object, Promise, atob,
    ...(options.speechSynthesis ? {
      speechSynthesis: options.speechSynthesis,
      SpeechSynthesisUtterance: options.SpeechSynthesisUtterance,
    } : {}),
  });
  const expose = `
    ;globalThis.__test = {
      UNITS, LESSONS, BRANCH_DIALOGUES, CHALLENGE_PLAN, SESSION_VERSION, conversationRounds,
      OPENING_ROUNDS, MIDDLE_ROUNDS, EXTRA_ROUNDS, FINALE_ROUND_OVERRIDES, CONVERSATION_META_ROWS,
      defaults, load, save, validSavedSession, normalize, matchDetails, matchScore, softWordsFor, todayStr,
      selectWarmup, buildChallengeSteps, splitPhraseChunks,
      PRACTICE_TOPICS, PRACTICE_SCENES, PRACTICE_STORIES, PRACTICE_CAST,
      PRACTICE_STAGE_DIRECTIONS, STAGE_DIRECTION_PRESETS, STAGE_ACTION_DURATIONS_MS,
      practiceStoryById, practiceSceneById, matchesPracticeWhen, resolvePracticeBeat,
      applyPracticeChoice, fillPracticeStoryTokens, fillProfileText, materializePracticeBeat,
      initialPracticeStageWorld, initialPracticeVars, applyPracticeStageMutation, enterPracticeStageAction,
      ensurePracticeStageWorld, settlePracticeStageAction, finishPracticeStageActionVisual,
      schedulePracticeStageActionSettle, pausePracticeStageActionSettle, resumePracticeStageActionSettle,
      practiceStageModel, practiceStageDirection, practiceStageActionDuration,
      prefersReducedStageMotion, practiceStageActionVisualDelay,
      stageDirectionModel, stageDirectionClasses, stageBackdropMomentClasses,
      stageActionClass, stageHeldObjectClasses, stageWorldClasses,
      PRACTICE_BACKDROPS, sceneBackdrop,
      physicalStoryPropFace, stagePhysicalStoryPropHtml,
      stagePropsHtml, stageWeatherHtml, syncStageVisualBlock,
      availablePracticeStories, remainingPracticeStories, practiceStoryLengthPool, normalizePracticeStoryIds,
      practiceStoryCycleState, mergePracticeStoryCycles,
      buildPracticeSession, rememberPracticeRun, startPractice, startUnitRehearsal, ptext,
      UNIT_REHEARSALS, UNIT_MISSIONS, normalizeMissions, mergeMissions, LESSONS_PER_UNIT,
      startLesson, resumeLesson, saveLessonCheckpoint, stopLessonTimers, renderStep, renderHome,
      manualMicDone, answerListenQuiz, renderOrder, selectOrderChunk, chooseBranch, next, notePractice, stageCaptionLine, stageCaptionSequence,
      stageCaptionHtml, captionHtml, chatMessagesHtml, stageCaptionPairing,
      keepStageCaptionVisible,
      askConfirm, resolveDialog, exitLesson, unitCallToActionHtml, snoozeMission, missionSnoozed,
      completeMission, estimateLessonMinutes, lessonEtaLabel, canSayHtml, streakLabel, daysBetween,
      dateNDaysAgo, UNIT_PROMISES, unitPromise,
      h, hx, afterRender, viewTransitionsEnabled, wordSpans, learningWordSpans, speakResultHtml, tokenIndexAt, alignTokens, modernPersonArt, personArt,
      speak, scheduleSpeak, beginLessonAudioGesture, interruptLessonAudioUnlock,
      pickVoice, characterVoice, VOICE_PREFS, playUiSound, unlockUiAudio, setUiSounds, fitStage, practiceTurnLabel,
      renderPracticePicker, practiceStoryCards, practiceStoryCardHtml, castPortraitHtml, drawPracticeStory,
      storyThumbHtml, storyThumbArt, STORY_THUMB_ART, STORY_THUMB_PHYSICAL,
      setMicLevel, getMicLevel, startMicMeter, stopMicMeter, bumpMicLevel, setMicLive,
      setStageGaze, stageGazeStep, stopStageGaze, STAGE_GAZE, STAGE_GAZE_FOR_CUE, stageEncourage, setStageCue,
      VISEMES, visemeFor, buildMouthTimeline, STORE_KEY,
      reviewLevel, reviewSeedLevel, reviewRestMs, reviewDueness, reviewSecure, reviewPool, reviewSelect,
      buildReviewQuestions, startDailyDrill, startUnitCheck, exitReviewRun, getReview:()=>R,
      answerReviewChoice, answerReviewSay, revealReviewSay, notePractice,
      unitChecked, checkRow, normalizeChecks, mergeChecks, drilledToday, todayStr, advanceReview,
      REVIEW_UNSEEN_DUENESS, CHECK_LENGTH, CHECK_PASS, DRILL_LENGTH, REVIEW_SECURE_LEVEL,
      REVIEW_MAX_LEVEL, REVIEW_MISS_DROP,
      REVIEW_PAUSE_PASS,
      startSelfTest, TEST_WORDS, TEST_LENGTH, wordGloss, reviewWordChips,
      pickMissingWord, finishReviewPick, playOrderChunks, splitPhraseChunks,
      getPicking:()=>R&&R.picking, getPicked:()=>R&&R.pickedChip,
      REVIEW_PICK_ORDER, REVIEW_PICK_BLANK,
      SOUND_SETS, SOUND_ROUNDS, renderSoundsHub, startSoundRun, answerSound, exitSoundRun,
      getSounds:()=>S, advanceSound, playSoundPair, soundRow, mouthArt, MOUTH_SHAPES, soundExplainHtml, soundAccuracy, soundsSummary, normalizeSounds, mergeSounds, canHearSounds,
      wordsMatch,
      getState:()=>state, setState:v=>{state=v}, getLesson:()=>L, setLesson:v=>{L=v}
    };
  `;
  vm.runInContext(inline + expose, context, { filename: 'index-inline.js' });
  return {
    api: context.__test, seed, app, context,
    dispatchDocument(type) { for (const listener of documentListeners.get(type) || []) listener(); },
    dispatchWindow(type) { for (const listener of windowListeners.get(type) || []) listener(); },
  };
}

function classCount(markup, token) {
  return [...String(markup).matchAll(/\bclass="([^"]*)"/g)]
    .filter(([, classes]) => classes.split(/\s+/).includes(token)).length;
}

function lockedIphoneSpeech({ pending = false, deferStart = false } = {}) {
  let inGesture = false;
  let unlocked = false;
  let cancels = 0;
  const calls = [];
  const deferred = [];
  class Utterance {
    constructor(text) { this.text = text; this.volume = 1; }
  }
  const speechSynthesis = {
    speaking: false,
    pending,
    getVoices: () => [],
    resume() {},
    cancel() { cancels++; this.pending = false; deferred.length = 0; },
    speak(utterance) {
      calls.push({ text: utterance.text, volume: utterance.volume, inGesture });
      if (!unlocked && (!inGesture || utterance.volume <= 0)) return;
      if (deferStart) {
        this.pending = true;
        deferred.push(utterance);
        return;
      }
      unlocked = true;
      this.pending = false;
      utterance.onstart?.();
      utterance.onend?.();
    },
  };
  return {
    speechSynthesis,
    SpeechSynthesisUtterance: Utterance,
    calls,
    get cancels() { return cancels; },
    flushStart() {
      deferStart = false;
      for (const utterance of deferred.splice(0)) {
        unlocked = true;
        speechSynthesis.pending = false;
        utterance.onstart?.();
        utterance.onend?.();
      }
    },
    duringGesture(callback) {
      inGesture = true;
      try { return callback(); }
      finally { inGesture = false; }
    },
  };
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
    '626ff047deb56d8144b8dff18cac1140dbec1b8dc5012040b65fa3bddca115b0',
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
  assert.deepEqual([...state.practiceStorySeen], ['morning_robot']);
  assert.equal(state.practiceStoryEpoch, 0);
  assert.equal(state.practiceRecentUpdatedAt, 1234);
  assert.equal(state.session, null);
});

test('practice shuffle-bag migration removes duplicates and unknown stories', () => {
  const seed = new Map([['speakEnglishV1', JSON.stringify({
    schemaVersion: 2, onboarded: true, completed: 30,
    practiceStorySeen: ['morning_robot', 'missing_story', 'morning_robot', 'first_art_class', null],
    practiceStoryEpoch: 4.9,
  })]]);
  const { api } = runtime(seed);
  const state = api.getState();
  assert.equal(state.schemaVersion, 3);
  assert.deepEqual([...state.practiceStorySeen], ['morning_robot', 'first_art_class']);
  assert.equal(state.practiceStoryEpoch, 4);
  assert.deepEqual(
    Array.from(api.normalizePracticeStoryIds(['first_art_class', 'nope', 'first_art_class', 'morning_robot'])),
    ['first_art_class', 'morning_robot'],
  );
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

test('a cold iPhone lesson speaks the real first sentence inside the start tap', async () => {
  const phone = lockedIphoneSpeech({ pending: true });
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  const expected = api.ptext(api.LESSONS[0].phrases[0], 'en');

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.next();
  });

  assert.deepEqual(phone.calls.map(call => call.text), [expected],
    'the visible sentence is submitted synchronously, with no muted primer or timer first');
  assert.equal(phone.calls[0].inGesture, true);
  assert.equal(phone.calls[0].volume, 1);
  assert.equal(phone.cancels, 0, 'nothing cancels the gesture-authorised first utterance');
  assert.equal(api.getLesson().audioPrimed, true, 'the lesson unlocks only after speech really starts');

  await new Promise(resolve => setTimeout(resolve, 350));
  assert.equal(api.getLesson().steps[1].introAudioComplete, true,
    'successful automatic speech opens the microphone step without a speaker tap');
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('resuming directly on a new sentence also unlocks audio in that tap', () => {
  const phone = lockedIphoneSpeech();
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = 1;
  saved.steps[1].introAudioComplete = false;
  api.setLesson(null);
  const expected = api.ptext(api.LESSONS[0].phrases[0], 'en');

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), [expected]);
  assert.equal(phone.calls[0].inGesture, true,
    'resume must not push the first real sentence behind scheduleSpeak\'s timer');
  assert.equal(api.getLesson().audioPrimed, true);
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('resuming a completed auto-advance screen waits for a delayed iPhone voice start', async () => {
  const phone = lockedIphoneSpeech({ deferStart: true });
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = 1;
  saved.steps[1].introAudioComplete = true;
  saved.steps[1].resultKind = 'pass';
  saved.steps[1].resultMessage = 'Great';
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), ['Ready'],
    'a saved screen that only advances later still gives iOS a real utterance in the resume tap');
  assert.equal(phone.calls[0].inGesture, true);
  assert.equal(api.getLesson().audioPrimed, undefined,
    'submission alone is not treated as proof that iOS started speaking');
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(api.getLesson().i, 1,
    'the completed screen cannot cancel a slowly starting unlock after its old 1.1s advance delay');
  assert.equal(phone.cancels, 0);
  phone.flushStart();
  assert.equal(api.getLesson().audioPrimed, true);
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('resuming a sent dialogue reply cannot outrun a slowly starting unlock', async () => {
  const phone = lockedIphoneSpeech({ deferStart: true });
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = 1;
  saved.steps[1] = {
    type: 'speak', p: api.LESSONS[0].phrases[0], isDlg: true,
    resultKind: 'pass', resultMessage: 'Great', attempts: 1, tries: 1,
  };
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), ['Ready']);
  await new Promise(resolve => setTimeout(resolve, 2000));
  assert.equal(api.getLesson().i, 1,
    'the old 820ms + 1080ms reply transition waits instead of cancelling the pending unlock');
  assert.equal(phone.cancels, 0);
  phone.flushStart();
  assert.equal(api.getLesson().audioPrimed, true);
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('backgrounding a pending resume unlock leaves a tappable recovery path', () => {
  const phone = lockedIphoneSpeech({ deferStart: true });
  const { api, app, context, dispatchDocument } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = 1;
  saved.steps[1].introAudioComplete = true;
  saved.steps[1].resultKind = 'pass';
  saved.steps[1].resultMessage = 'Great';
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });
  context.document.hidden = true;
  dispatchDocument('visibilitychange');
  assert.equal(phone.cancels, 1, 'backgrounding cancels the pending voice safely');

  context.document.hidden = false;
  dispatchDocument('visibilitychange');
  assert.match(app.innerHTML, /id="resumeLessonAudioBtn"/,
    'the completed screen no longer sits forever without a timer or a Continue button');
  const nextSentence = api.ptext(api.LESSONS[0].phrases[1], 'en');
  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.next();
  });
  assert.equal(phone.calls.at(-1).text, nextSentence);
  assert.equal(phone.calls.at(-1).inGesture, true,
    'the recovery tap submits the next visible sentence directly');
  phone.flushStart();
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('resuming on an incoming conversation line does not lose the unlock to its arrival timer', () => {
  const phone = lockedIphoneSpeech();
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = saved.steps.findIndex(step => step.type === 'listen');
  delete saved.steps[saved.i].arrived;
  const expected = api.ptext(saved.steps[saved.i].line, 'en', true);
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), [expected]);
  assert.equal(phone.calls[0].inGesture, true);
  assert.equal(api.getLesson().steps[api.getLesson().i].arrived, true,
    'the real line replaces the cold-start arrival delay');
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('an already-arrived resumed line speaks inside the resume tap', () => {
  const phone = lockedIphoneSpeech();
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = saved.steps.findIndex(step => step.type === 'listen');
  saved.steps[saved.i].arrived = true;
  const expected = api.ptext(saved.steps[saved.i].line, 'en', true);
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), [expected]);
  assert.equal(phone.calls[0].inGesture, true);
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('a cold resumed listening quiz bypasses its autoplay timer', () => {
  const phone = lockedIphoneSpeech();
  const { api } = runtime(new Map(), {
    speechSynthesis: phone.speechSynthesis,
    SpeechSynthesisUtterance: phone.SpeechSynthesisUtterance,
  });
  api.startLesson(0, false);
  api.stopLessonTimers(true);
  const saved = api.getState().session;
  saved.i = saved.steps.findIndex(step => step.type === 'listenQuiz');
  const expected = api.ptext(saved.steps[saved.i].p, 'en');
  api.setLesson(null);

  phone.duringGesture(() => {
    api.beginLessonAudioGesture();
    api.resumeLesson();
  });

  assert.deepEqual(phone.calls.map(call => call.text), [expected]);
  assert.equal(phone.calls[0].inGesture, true);
  api.stopLessonTimers(false);
  api.setLesson(null);
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

test('guided lessons stay short, keep new English visible, and end on a real stage', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 29;
  api.setState(state);
  api.startLesson(29, false, true);

  const lesson = api.getLesson();
  assert.equal(lesson.steps.filter(step => step.warmup).length, 6, 'the opening review is capped for beginners');
  assert.equal(lesson.steps.filter(step => step.type === 'learn').length, 0,
    'a new phrase must not require a separate duplicate card');
  assert.equal(lesson.steps.filter(step => step.newPhrase).length, 5);

  lesson.i = lesson.steps.findIndex(step => step.type === 'speak' && !step.warmup && !step.challenge);
  api.renderStep();
  assert.match(app.innerHTML, /משפט חדש · עכשיו אומרים יחד/);
  assert.match(app.innerHTML, /המשפט מולך/);
  assert.match(app.innerHTML, /id="listenFirst"/);
  assert.match(app.innerHTML, /recall-card learning-card is-intro/);
  assert.match(app.innerHTML, /data-word-sync/);
  assert.match(app.innerHTML, /class="w"/);
  assert.match(app.innerHTML, /id="hintAudio"[^>]*disabled/,
    'replay stays disabled until the automatic example has finished');
  assert.match(app.innerHTML, /id="speakZone" hidden/,
    'the microphone must wait until the automatic example finishes');
  assert.match(app.innerHTML, /id="micBtn"|אמרתי בקול/,
    'hearing and recording must happen on the same screen');
  assert.doesNotMatch(app.innerHTML, /id="englishHint" hidden/);
  assert.doesNotMatch(app.innerHTML, /id="translitHint" hidden/);

  const feedback=api.learningWordSpans("I'm good, thanks",{matched:[true,false,true]});
  assert.match(feedback,/heard-ok/);
  assert.match(feedback,/heard-miss/);
  const success=api.speakResultHtml('pass','מעולה',{newPhrase:true});
  assert.match(success,/learning-success-orb/);
  assert.doesNotMatch(success,/onclick="next\(\)"/,
    'new phrase success advances automatically instead of adding another tap');

  lesson.i = lesson.steps.findIndex(step => step.type === 'listen');
  lesson.steps[lesson.i].arrived = true;
  api.renderStep();
  assert.match(app.innerHTML, /conversation-screen stage-screen/);
  assert.match(app.innerHTML, /data-backdrop="beach-path"/);
  assert.match(app.innerHTML, /person-art modern-v2/);

  lesson.i = lesson.steps.findIndex(step => step.type === 'branchChoice');
  api.renderStep();
  assert.match(app.innerHTML, /choice-mic-icon/);
  assert.match(app.innerHTML, /chooseBranchAndSpeak/);
  assert.match(app.innerHTML, /בחירה והתחלת דיבור/);
  api.chooseBranch(0);
  assert.equal(api.getLesson().curStep.hintLevel, 0);
  assert.match(app.innerHTML, /id="englishHint" hidden/);
  assert.match(app.innerHTML, /id="translitHint" hidden/);
  assert.match(app.innerHTML, /אם קשה, פתח עזרה/);
  assert.doesNotMatch(app.innerHTML, /class="cap-en"/,
    'the stage must not reveal the answer before the learner requests help');
  api.stopLessonTimers(false);
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

test('ordering words animates mistakes back and success continues without another tap', async () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 2;
  api.setState(state);
  api.startLesson(2, false, true);
  const lesson = api.getLesson();
  lesson.i = lesson.steps.findIndex(step => step.type === 'order');
  api.renderStep();
  const step = lesson.steps[lesson.i];
  assert.match(app.innerHTML, /order-target/);
  assert.match(app.innerHTML, /המשפט שצריך לבנות/);
  assert.match(app.innerHTML, new RegExp(step.p.he));
  assert.match(app.innerHTML, /לחץ על החלקים באנגלית לפי הסדר/);

  api.selectOrderChunk(1);
  assert.equal(step.returningChunkId, 1);
  assert.match(app.innerHTML, /is-returning/);
  await new Promise(resolve => setTimeout(resolve, 390));
  assert.deepEqual([...step.selected], []);
  assert.match(app.innerHTML, /wrong-returned/);

  for(let id=0;id<step.chunks.length;id++) api.selectOrderChunk(id);
  assert.equal(step.correct, true);
  assert.match(app.innerHTML, /order-built[^>]*is-correct/);
  assert.match(app.innerHTML, /data-word-sync/);
  assert.match(app.innerHTML, /מקשיבים וממשיכים אוטומטית/);
  assert.doesNotMatch(app.innerHTML, /onclick="next\(\)"/);
  assert.equal((app.innerHTML.match(/class="word-chip"/g)||[]).length, 0,
    'used bank chips disappear instead of remaining as disabled controls');
  api.stopLessonTimers(false);
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
  ['maya_window_light', 1, 4],
  ['first_art_class', 2, 5],
  ['ben_old_camera', 2, 4],
  ['sam_boxes_at_door', 3, 5],
  ['maya_slow_english', 4, 5],
  ['phone_in_elevator', 5, 6],
  ['family_photo_wind', 6, 6],
  ['school_activity', 7, 7],
  ['tom_gate_notebook', 8, 5],
  ['sam_elevator_stop', 9, 6],
  ['lost_bag', 10, 7],
  ['tom_recess_ball', 10, 7],
  ['maya_kitchen_mixup', 11, 7],
  ['maya_ice_cream_truck', 11, 6],
  ['restaurant_mixup', 12, 7],
  ['nina_market_gift', 14, 7],
  ['nina_lemonade_stand', 14, 6],
  ['broken_phone_plan', 17, 8],
  ['maya_courtyard_change', 17, 8],
  ['sam_dropped_key', 18, 8],
  ['tom_last_shot', 19, 9],
  ['tom_presentation_card', 20, 9],
  ['maya_kitchen_blackout', 22, 9],
  ['nina_wrong_bag', 23, 8],
  ['dana_paint_spill', 23, 6],
  ['nina_market_rolling_apples', 25, 9],
  ['maya_lost_dog', 26, 10],
  ['tom_street_cat', 26, 6],
  ['ben_pigeon_sandwich', 26, 5],
  ['maya_rainy_beach', 29, 10],
  ['tom_snow_day', 29, 6],
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

    const initialVarSeeds = story.id === 'maya_lost_dog'
      ? [
        { size: 'big', collar: 'blue' }, { size: 'big', collar: 'red' },
        { size: 'small', collar: 'blue' }, { size: 'small', collar: 'red' },
      ]
      : [{}];
    for (const initialVars of initialVarSeeds) walk(0, initialVars, 0, '', '');
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

test('free practice catalog only grows and exhausts every story before repeating', () => {
  const { api } = runtime();
  const milestones = [0, ...new Set(api.PRACTICE_STORIES.map(story => story.min)), api.LESSONS.length]
    .sort((a, b) => a - b);
  let previousIds = new Set();
  for (const completed of milestones) {
    const state = api.defaults();
    state.onboarded = true;
    state.completed = completed;
    api.setState(state);
    const eligible = api.PRACTICE_STORIES.filter(story => story.min <= completed);
    const available = Array.from(api.availablePracticeStories(completed));
    const availableIds = new Set(available.map(story => story.id));
    assert.ok(available.length >= previousIds.size,
      `completed ${completed}: active catalog shrank from ${previousIds.size} to ${available.length}`);
    for (const id of previousIds) assert.ok(availableIds.has(id),
      `completed ${completed}: previously active story ${id} disappeared`);
    assert.deepEqual(
      Array.from(availableIds).sort(),
      Array.from(eligible, story => story.id).sort(),
      `completed ${completed}: active catalog drifted from the unlock rules`,
    );
    const session = api.buildPracticeSession();
    if (!eligible.length) {
      assert.equal(session, null);
      previousIds = availableIds;
      continue;
    }
    const remaining = Array.from(api.remainingPracticeStories(available));
    const lengthPool = Array.from(api.practiceStoryLengthPool(remaining, completed));
    assert.ok(lengthPool.length > 0 && lengthPool.every(story => remaining.includes(story)),
      `completed ${completed}: length preference escaped the active shuffle bag`);
    assert.ok(eligible.includes(session.story), `completed ${completed}: selected a locked story`);
    assert.equal(session.storyId, session.story.id);
    assert.equal(session.turns, session.story.beats, `${session.storyId}: mixed in unrelated turns`);
    assert.ok(session.story.sceneIds.includes(session.sceneId), `${session.storyId}: used an unrelated scene`);
    assert.equal(session.meta.mission, session.story.goal);
    if (completed >= 18) assert.ok(session.turns.length >= 7,
      `completed ${completed}: late-course practice should be a substantial conversation`);
    previousIds = availableIds;
  }

  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  const activeIds = Array.from(api.availablePracticeStories(), story => story.id);
  assert.equal(activeIds.length, api.PRACTICE_STORIES.length, 'a finished course unlocks every authored story');
  const storyIds = [];
  for (let run = 0; run < activeIds.length * 2; run++) {
    const session = api.buildPracticeSession();
    assert.ok(session);
    api.rememberPracticeRun(session.sceneId, session.charId, session.storyId);
    storyIds.push(session.storyId);
    assert.equal(api.getState().practiceRecentStories.at(-1), session.storyId);
    assert.ok(api.getState().practiceRecentStories.length <= 8);
    assert.equal(new Set(api.getState().practiceRecentStories).size, api.getState().practiceRecentStories.length);
  }
  const expected = activeIds.slice().sort();
  for (let cycle = 0; cycle < 2; cycle++) {
    const selected = storyIds.slice(cycle * activeIds.length, (cycle + 1) * activeIds.length);
    assert.equal(new Set(selected).size, activeIds.length,
      `cycle ${cycle + 1}: a story repeated before the bag was exhausted`);
    assert.deepEqual(selected.slice().sort(), expected,
      `cycle ${cycle + 1}: not every active story appeared exactly once`);
  }
  assert.notEqual(storyIds[activeIds.length - 1], storyIds[activeIds.length],
    'the first story of a new cycle must not immediately repeat the previous cycle\'s final story');
  assert.equal(api.getState().practiceStoryEpoch, 1);
  assert.deepEqual(Array.from(api.getState().practiceStorySeen).sort(), expected);
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
  assert.equal(firstTab.api.getState().practiceStoryEpoch, 0);
  assert.deepEqual(Array.from(firstTab.api.getState().practiceStorySeen), [first.storyId]);
  const second = staleTab.api.buildPracticeSession();
  assert.notEqual(second.storyId, first.storyId, 'a stale tab repeated the story just opened elsewhere');
  assert.equal(staleTab.api.getState().practiceRecentStories.at(-1), first.storyId);
  assert.equal(staleTab.api.getState().practiceRecentChars.at(-1), first.charId);
  assert.equal(staleTab.api.getState().practiceRecent.at(-1), first.sceneId);
  assert.ok(staleTab.api.getState().practiceStorySeen.includes(first.storyId));

  staleTab.api.rememberPracticeRun(second.sceneId, second.charId, second.storyId);
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.practiceStoryEpoch, 0);
  assert.deepEqual(new Set(persisted.practiceStorySeen), new Set([first.storyId, second.storyId]));
  assert.equal(persisted.practiceRecentStories.at(-1), second.storyId);
  assert.equal(persisted.practiceRecentChars.at(-1), second.charId);
  assert.equal(persisted.practiceRecent.at(-1), second.sceneId);
  const third = firstTab.api.buildPracticeSession();
  assert.notEqual(third.storyId, second.storyId);
  assert.deepEqual(
    Array.from(firstTab.api.getState().practiceRecentStories.slice(-2)),
    [first.storyId, second.storyId],
  );
  assert.deepEqual(
    new Set(firstTab.api.getState().practiceStorySeen),
    new Set([first.storyId, second.storyId]),
  );
});

test('same-epoch shuffle bags union divergent stories from two tabs', () => {
  const seed = new Map();
  const firstTab = runtime(seed);
  const secondTab = runtime(seed);
  const [firstId, secondId] = firstTab.api.PRACTICE_STORIES.slice(0, 2).map(story => story.id);
  for (const [tab, storyId, timestamp] of [
    [firstTab, firstId, 100],
    [secondTab, secondId, 101],
  ]) {
    const state = tab.api.defaults();
    state.completed = 30;
    state.practiceStoryEpoch = 7;
    state.practiceStorySeen = [storyId];
    state.practiceRecentUpdatedAt = timestamp;
    tab.api.setState(state);
  }

  firstTab.api.save();
  secondTab.api.save();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.equal(persisted.practiceStoryEpoch, 7);
  assert.deepEqual(new Set(persisted.practiceStorySeen), new Set([firstId, secondId]));
});

test('an unlocked story consumed in an older epoch survives a newer smaller-catalog epoch', () => {
  const { api } = runtime();
  const beforeUnlock = Array.from(api.availablePracticeStories(17), story => story.id);
  const afterUnlock = Array.from(api.availablePracticeStories(18), story => story.id);
  const newlyUnlocked = afterUnlock.filter(id => !beforeUnlock.includes(id));
  assert.deepEqual(newlyUnlocked, ['sam_dropped_key']);

  const higherEpoch = api.defaults();
  higherEpoch.completed = 17;
  higherEpoch.practiceStoryEpoch = 8;
  higherEpoch.practiceStoryCatalog = beforeUnlock.slice();
  higherEpoch.practiceStorySeen = [beforeUnlock[0]];

  const lowerEpoch = api.defaults();
  lowerEpoch.completed = 18;
  lowerEpoch.practiceStoryEpoch = 7;
  lowerEpoch.practiceStoryCatalog = afterUnlock.slice();
  lowerEpoch.practiceStorySeen = [beforeUnlock[1], newlyUnlocked[0]];

  for (const merged of [
    api.mergePracticeStoryCycles(higherEpoch, lowerEpoch),
    api.mergePracticeStoryCycles(lowerEpoch, higherEpoch),
  ]) {
    assert.equal(merged.epoch, 8);
    assert.deepEqual(new Set(merged.catalog), new Set(afterUnlock));
    assert.ok(merged.seen.includes(beforeUnlock[0]), 'the newer cycle must keep its own consumed story');
    assert.ok(merged.seen.includes(newlyUnlocked[0]),
      'a story absent from the newer cycle catalog must not be resurrected after another tab consumed it');
    assert.ok(merged.seen.includes(beforeUnlock[1]),
      'a strict-superset older catalog must conservatively carry its whole consumed set');
  }

  const [a, b, c] = afterUnlock.slice(0, 3);
  for (const merged of [
    api.mergePracticeStoryCycles(
      { completed: 18, practiceStoryEpoch: 10, practiceStoryCatalog: [a, b], practiceStorySeen: [a] },
      { completed: 18, practiceStoryEpoch: 2, practiceStoryCatalog: [a, b, c], practiceStorySeen: [b, c] },
    ),
    api.mergePracticeStoryCycles(
      { completed: 18, practiceStoryEpoch: 2, practiceStoryCatalog: [a, b, c], practiceStorySeen: [b, c] },
      { completed: 18, practiceStoryEpoch: 10, practiceStoryCatalog: [a, b], practiceStorySeen: [a] },
    ),
  ]) {
    assert.equal(merged.epoch, 10);
    assert.deepEqual(new Set(merged.catalog), new Set([a, b, c]));
    assert.deepEqual(new Set(merged.seen), new Set([a, b, c]),
      'A/B/C regression: lower strict-superset catalog must retain B even though the higher catalog already knew it');
  }

  const migrated = api.practiceStoryCycleState({
    completed: 18, practiceStoryEpoch: 7, practiceStorySeen: newlyUnlocked,
  });
  assert.deepEqual(new Set(migrated.catalog), new Set(afterUnlock),
    'states saved before catalog snapshots should reconstruct the catalog from lesson progress');
});

test('startPractice reserves story selection through the shared Web Lock when available', async () => {
  const calls = [];
  const seed = new Map();
  const locks = {
    request(name, options, callback) {
      calls.push({ name, options });
      return Promise.resolve().then(callback);
    },
  };
  const { api } = runtime(seed, { navigator: { locks } });
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 1;
  api.setState(state);

  const pending = api.startPractice();
  assert.equal(api.getLesson(), null, 'selection should wait until the exclusive lock callback runs');
  const started = await pending;
  const lesson = api.getLesson();
  const seenCount = api.getState().practiceStorySeen.length;
  const reservedStoryId = lesson?.practiceStoryId;
  const dedicatedCycle = JSON.parse(seed.get('speakEnglishPracticeCycleV1'));
  api.stopLessonTimers(false);
  api.setLesson(null);

  assert.equal(started, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'speak-english-practice-story');
  assert.equal(calls[0].options.mode, 'exclusive');
  assert.ok(lesson?.isPractice);
  assert.equal(seenCount, 1,
    'the selected story must be recorded before the lock callback completes');
  assert.ok(dedicatedCycle.practiceStorySeen.includes(reservedStoryId),
    'the lock callback must persist its reservation in the practice-only store');
});

test('a failure after entering the Web Lock does not retry outside it or consume a second story', async () => {
  let callbackRuns = 0;
  const locks = {
    request(_name, _options, callback) {
      return Promise.resolve().then(() => {
        callbackRuns++;
        return callback();
      });
    },
  };
  const seed = new Map();
  const { api, context } = runtime(seed, { navigator: { locks } });
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  vm.runInContext(`
    toast = () => {};
    initialPracticeVars = () => { throw new Error('injected post-reservation failure'); };
  `, context);

  assert.equal(await api.startPractice(), false);
  assert.equal(callbackRuns, 1);
  assert.equal(api.getLesson(), null);
  assert.equal(api.getState().practiceStorySeen.length, 1,
    'the rejected lock callback must not run beginPracticeSession a second time');
  assert.equal(api.getState().practiceRecentStories.length, 1);
  const dedicated = JSON.parse(seed.get('speakEnglishPracticeCycleV1'));
  assert.deepEqual(new Set(dedicated.practiceStorySeen), new Set(api.getState().practiceStorySeen));
});

test('practice-only catalog context never promotes course completion', () => {
  const seed = new Map();
  const bootstrap = runtime(seed);
  const main = bootstrap.api.defaults();
  main.onboarded = true;
  main.completed = 1;
  seed.set('speakEnglishV1', JSON.stringify(main));
  const fullCatalog = Array.from(bootstrap.api.availablePracticeStories(30), story => story.id);
  seed.set('speakEnglishPracticeCycleV1', JSON.stringify({
    schemaVersion: 1,
    completed: 30,
    practiceStoryEpoch: 4,
    practiceStorySeen: [fullCatalog.at(-1)],
    practiceStoryCatalog: fullCatalog,
  }));

  const fresh = runtime(seed);
  assert.equal(fresh.api.getState().completed, 1, 'load must trust course progress from the main record');
  fresh.api.save();
  assert.equal(fresh.api.getState().completed, 1, 'reconciliation must not import dedicated catalog context');
  assert.equal(JSON.parse(seed.get('speakEnglishV1')).completed, 1,
    'saving after reconciliation must not persist an invented course jump');
});

test('a failed practice-only write rolls back every reservation field and opens no session', () => {
  const seed = new Map();
  const { api, context } = runtime(seed, {
    failSetItem: key => key === 'speakEnglishPracticeCycleV1',
  });
  vm.runInContext('toast = () => {}', context);
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  const activeIds = Array.from(api.availablePracticeStories(30), story => story.id);
  state.practiceRecent = ['greet#0'];
  state.practiceRecentChars = ['tom'];
  state.practiceRecentStories = [activeIds[0]];
  state.practiceStorySeen = [activeIds[0]];
  state.practiceStoryCatalog = activeIds.slice();
  state.practiceStoryEpoch = 3;
  state.practiceRecentUpdatedAt = 101;
  state.progressUpdatedAt = 202;
  api.setState(state);
  api.save();
  const before = {
    practiceRecent: Array.from(api.getState().practiceRecent),
    practiceRecentChars: Array.from(api.getState().practiceRecentChars),
    practiceRecentStories: Array.from(api.getState().practiceRecentStories),
    practiceStorySeen: Array.from(api.getState().practiceStorySeen),
    practiceStoryCatalog: Array.from(api.getState().practiceStoryCatalog),
    practiceStoryEpoch: api.getState().practiceStoryEpoch,
    practiceRecentUpdatedAt: api.getState().practiceRecentUpdatedAt,
    progressUpdatedAt: api.getState().progressUpdatedAt,
  };

  assert.equal(api.startPractice(), false);
  assert.equal(api.getLesson(), null);
  assert.deepEqual({
    practiceRecent: Array.from(api.getState().practiceRecent),
    practiceRecentChars: Array.from(api.getState().practiceRecentChars),
    practiceRecentStories: Array.from(api.getState().practiceRecentStories),
    practiceStorySeen: Array.from(api.getState().practiceStorySeen),
    practiceStoryCatalog: Array.from(api.getState().practiceStoryCatalog),
    practiceStoryEpoch: api.getState().practiceStoryEpoch,
    practiceRecentUpdatedAt: api.getState().practiceRecentUpdatedAt,
    progressUpdatedAt: api.getState().progressUpdatedAt,
  }, before);
  assert.equal(seed.has('speakEnglishPracticeCycleV1'), false);
  const persistedMain = JSON.parse(seed.get('speakEnglishV1'));
  assert.deepEqual(persistedMain.practiceStorySeen, before.practiceStorySeen,
    'a rejected reservation must not leak into the main state record');
});

test('the practice-only reservation survives a stale whole-state overwrite', () => {
  const seed = new Map();
  const currentTab = runtime(seed);
  const initial = currentTab.api.defaults();
  initial.onboarded = true;
  initial.completed = 30;
  currentTab.api.setState(initial);
  currentTab.api.save();
  const staleMainState = seed.get('speakEnglishV1');

  const first = currentTab.api.buildPracticeSession();
  currentTab.api.rememberPracticeRun(first.sceneId, first.charId, first.storyId);
  const dedicated = JSON.parse(seed.get('speakEnglishPracticeCycleV1'));
  assert.ok(dedicated.practiceStorySeen.includes(first.storyId));

  // Models an unrelated tab that read the old main object before the practice
  // reservation and finished its whole-object write afterwards.
  seed.set('speakEnglishV1', staleMainState);
  const freshTab = runtime(seed);
  assert.ok(freshTab.api.getState().practiceStorySeen.includes(first.storyId),
    'the practice-only record must remain authoritative after a stale main-store write');
  const second = freshTab.api.buildPracticeSession();
  assert.notEqual(second.storyId, first.storyId,
    'a stale unrelated save must not put the reserved story back into the bag');
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

  // Move the current tab into a newer cycle. A stale ordinary-progress save
  // must not resurrect the old cycle's consumed set.
  const protectedEpoch = 7;
  const protectedSeen = [second.storyId];
  currentTab.api.getState().practiceStoryEpoch = protectedEpoch;
  currentTab.api.getState().practiceStorySeen = protectedSeen.slice();
  currentTab.api.getState().practiceRecentUpdatedAt += 10;
  currentTab.api.save();

  // This tab only changed ordinary lesson/mission progress after it became
  // stale; it did not start another practice conversation.
  staleTab.api.getState().progressUpdatedAt = currentTab.api.getState().progressUpdatedAt + 1000;
  staleTab.api.save();
  const persisted = JSON.parse(seed.get('speakEnglishV1'));
  assert.deepEqual(persisted.practiceRecentStories.slice(-2), [first.storyId, second.storyId]);
  assert.equal(persisted.practiceRecentChars.at(-1), second.charId);
  assert.equal(persisted.practiceRecent.at(-1), second.sceneId);
  assert.equal(persisted.practiceStoryEpoch, protectedEpoch);
  assert.deepEqual(persisted.practiceStorySeen, protectedSeen);
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
  assert.match(html, /\?\s*Math\.max\(700,Math\.min\(1200,translatedLength\*22\)\)\s*:\s*Math\.max\(2200,Math\.min\(3800,translatedLength\*45\)\)/,
    'a beginner still gets a length-aware window to read the translation — the full one at the end of a turn, a shorter one mid-turn where the pair keeps the sentence and its Hebrew on screen anyway');
  assert.match(html, /@media \(max-height:620px\)[\s\S]*--avatar:clamp\(108px,19vh,124px\)/,
    'short phones should keep the full-body acting large enough to read');
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

test('a consecutive reply and question stay together until the learner answers', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 30;
  api.setState(state);
  const stale = { en: 'STALE BOT LINE', he: 'משפט ישן', tl: 'סְטֵייל' };
  const learner = { en: 'LEARNER TURN', he: 'תור הלומד', tl: 'לֶרְנֶר' };
  const first = { en: 'FIRST RUN ON LINE', he: 'המשפט הראשון נשאר', tl: 'פֶרְסְט' };
  const second = { en: 'SECOND RUN ON LINE', he: 'המשפט השני מוצג', tl: 'סֶקֶנְד' };
  const lesson = {
    idx: 0, i: 3, isReplay: true, isPractice: true,
    steps: [
      { type: 'listen', line: stale, arrived: true, chatAdded: true },
      { type: 'speak', p: learner, isDlg: true, chatAdded: true },
      { type: 'listen', line: first, arrived: true, chatAdded: true },
      { type: 'listen', line: second, arrived: true },
      { type: 'branchChoice', options: [{ label: 'תשובה א' }, { label: 'תשובה ב' }] },
    ],
    chat: [{ who: 'app', line: stale }, { who: 'you', line: learner }, { who: 'app', line: first }],
    practiceStoryId: 'first_art_class', practiceVars: {}, practiceDecisions: [],
    practiceMeta: {
      characterId: 'dana', character: { name: 'דנה', avatar: '🎨', color: '#38bdf8', f: true },
      placeEmoji: '🎨', place: 'בחוג', mission: 'לדבר באנגלית', role: 'מדריכה', bg: 'art-studio',
    },
    stageWorld: api.initialPracticeStageWorld('first_art_class'), stagePlayedActions: [], pendingStageAction: null,
    elapsedBeforeMs: 0, activeSince: Date.now(), chatExpanded: false,
    tries: 0, attempts: 0, rec: null, timerId: null, runId: 'caption-sequence-test',
  };
  api.setLesson(lesson);

  lesson.i = 2;
  assert.deepEqual(Array.from(api.stageCaptionSequence(), item => item.line.en), [first.en],
    'a learner turn must break the caption sequence');

  // The room for a pair is claimed one beat early, so the arriving second
  // sentence never resizes the figure while the first is still being read.
  assert.equal(api.stageCaptionPairing(), true, 'a line followed by another line is already a pair');
  api.renderStep();
  assert.match(app.innerHTML, /class="cap-pair cap-pair-lead"/,
    'the beat before the pair must already reserve the pair layout');
  assert.ok(!app.innerHTML.includes(second.en), 'but it must not show the line that has not been said yet');

  lesson.i = 0;
  assert.equal(api.stageCaptionPairing(), false, 'a line answered by the learner is not a pair');
  api.renderStep();
  assert.doesNotMatch(app.innerHTML, /cap-pair/, 'a genuinely solo line keeps the full-size stage');

  lesson.i = 3;
  assert.deepEqual(Array.from(api.stageCaptionSequence(), item => item.line.en), [first.en, second.en]);
  api.renderStep();
  for (const value of [first.en, first.he, second.en, second.he]) assert.ok(app.innerHTML.includes(value));
  assert.ok(app.innerHTML.indexOf(first.en) < app.innerHTML.indexOf(second.en));
  assert.ok(!app.innerHTML.includes(stale.en), 'older lines must remain in history rather than accumulating on stage');
  assert.equal((app.innerHTML.match(/auto-translation delayed/g) || []).length, 1,
    'only the newly spoken line should reveal its translation after English');
  assert.equal((app.innerHTML.match(/id="capHe"/g) || []).length, 1);
  assert.equal((app.innerHTML.match(/id="capTl"/g) || []).length, 1);
  assert.match(app.innerHTML, /onclick="replayStageLine\('previous'\)"/,
    'the retained sentence needs its own replay control');
  assert.match(html, /\.stage-caption\.stage-swap:has\(\.cap-sequence\)\{animation:none\}/,
    'the retained sentence should not fade out and back when the next one arrives');
  assert.match(html, /@media \(min-height:701px\) and \(max-height:960px\)[\s\S]*\.stage-screen \.stage:has\(\.cap-pair\)/,
    'the stacked caption should make room on the learner\'s 932px-tall phone');
  // one bubble, not a card inside a card: the earlier line carries no border,
  // no background and no visible turn label of its own
  assert.match(html, /\.cap-previous\{padding:0 2px 10px;border:none;background:none;/,
    'the earlier sentence must not be drawn as a second boxed card');
  assert.match(app.innerHTML, /class="cap-turn-label sr-only"/,
    'the turn labels stay for screen readers rather than on screen');
  assert.doesNotMatch(app.innerHTML, /class="cap-previous-copy"/);
  assert.match(html, /\.cap-sequence \.cap-aid\.auto-translation\{border-top:none;/,
    'a pair keeps one divider: a second rule would box the current sentence again');
  // replaying the earlier sentence must light up ITS words, not nothing:
  // without the hook the 60% token match finds no container at all
  assert.match(app.innerHTML, /class="cap-previous-en"[^>]*data-word-sync/,
    'the earlier sentence needs a word-sync target for its own replay button');
  assert.match(html, /\.cap-previous-en \.w\.now/,
    'and the lit word needs to be visible on that line');

  api.next();
  assert.equal(lesson.i, 4);
  for (const value of [first.en, first.he, second.en, second.he]) assert.ok(app.innerHTML.includes(value));
  assert.ok(!app.innerHTML.includes(stale.en));
  assert.equal((app.innerHTML.match(/auto-translation delayed/g) || []).length, 0,
    'neither sentence should flash away again while choosing an answer');
  assert.equal((app.innerHTML.match(/id="capHe"/g) || []).length, 1);
  assert.equal((app.innerHTML.match(/id="capTl"/g) || []).length, 1);

  api.stopLessonTimers(false);
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
  let vars = api.initialPracticeVars(story);
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

test('every free-practice line has one coherent authored acting direction', () => {
  const { api } = runtime();
  const cueIds = [];

  for (const story of api.PRACTICE_STORIES) {
    assert.equal(
      Object.keys(api.PRACTICE_STAGE_DIRECTIONS[story.id] || {}).sort().join('|'),
      Array.from(story.beats, beat => beat.id).sort().join('|'),
      `${story.id}: every beat needs an ask/reply direction pair`,
    );
    for (const beat of story.beats) for (const variant of storyVariants(beat)) {
      for (const phase of ['ask', 'reply']) {
        const cue = api.practiceStageDirection(story, beat, variant, phase);
        assert.ok(cue, `${story.id}/${beat.id}/${variant.id || 'base'}: missing ${phase} direction`);
        assert.ok(api.STAGE_DIRECTION_PRESETS[cue.preset], `${cue.id}: unknown direction preset`);
        cueIds.push(cue.id);
      }
    }

    const session = {
      practiceStoryId: story.id, practiceVars: api.initialPracticeVars(story),
      steps: Array.from({ length: 2 + story.beats.length * 4 }, () => ({ type: 'pending' })),
    };
    for (let beatIndex = 0; beatIndex < story.beats.length; beatIndex++) {
      assert.equal(api.materializePracticeBeat(beatIndex, session), true);
      const at = 1 + beatIndex * 4;
      assert.ok(session.steps[at].stageCue?.id, `${story.id}/${beatIndex}: ask cue not materialized`);
      assert.ok(session.steps[at + 1].replyStageCue?.id, `${story.id}/${beatIndex}: reply cue not materialized`);
      session.practiceVars = api.applyPracticeChoice(session.practiceVars, session.steps[at + 1].options[0]);
    }
  }

  assert.equal(new Set(cueIds).size, cueIds.length, 'each variant and phase needs a stable unique cue id');
});

test('authored stage actions are narrated, unique and use the supported world contract', () => {
  const { api } = runtime();
  const gestures = new Set([
    'lift-cargo', 'bag-to-learner', 'catch-cargo-bag', 'shoulder-door',
    'walk-through-door', 'set-down-cargo', 'close-door',
    'place-brushes', 'pick-up-phone', 'hand-over-phone', 'phone-to-desk',
    'move-mirror-light', 'find-mirror', 'place-mirror',
    'reveal-wrong-bag', 'replace-bag', 'start-rain', 'stop-rain', 'start-snow',
    'inspect-found-bag', 'find-lost-bag', 'serve-wrong-meal', 'swap-correct-meal',
    'catch-photo', 'return-photo', 'choose-activity', 'confirm-activity',
    'signal-breaks', 'message-arrives', 'lose-ball', 'recover-ball', 'score-ball',
    'dog-appears', 'inspect-dog', 'dog-reunion', 'reveal-robot', 'robot-lights',
    'story-prop-change', 'story-prop-reveal',
  ]);
  const motions = new Set([
    'reach-low', 'present', 'swap', 'catch', 'catch-high', 'offer', 'react', 'celebrate', 'carry',
  ]);
  const worldValues = {
    brushes: new Set(['held', 'placed']),
    phone: new Set(['floor', 'held', 'learner', 'desk']),
    bag: new Set(['none', 'wrong', 'right']),
    weather: new Set(['sunny', 'rain', 'snow']),
    lostBag: new Set(['missing', 'wrong', 'found']),
    mealTray: new Set(['none', 'wrong', 'correct']),
    photo: new Set(['notebook', 'held', 'learner']),
    activity: new Set(['options', 'choosing', 'selected']),
    connection: new Set(['clear', 'bad', 'message']),
    ball: new Set(['held', 'lost', 'scored']),
    lostDog: new Set(['none', 'spotted', 'identified', 'reunited']),
    robot: new Set(['bag', 'awake', 'lit']),
    storyProp: new Set(['ready', 'changed']),
    samBag: new Set(['stacked', 'learner', 'sam']),
    samDoor: new Set(['narrow', 'open', 'closed']),
    samCargo: new Set(['ground', 'held', 'doorway', 'inside']),
    mirror: new Set(['hidden', 'held', 'placed']),
    mirrorLight: new Set(['hidden', 'moving', 'source', 'final']),
  };
  const ids = [];
  const authoredActionIds = new Set();
  const locations = new Map();
  const actionsById = new Map();
  const actionStories = new Set();

  const registerAction = (story, action, location, narration) => {
    if (!action) return;
    authoredActionIds.add(action.id);
    assert.ok(narration, `${location}: a visible action needs matching narration`);
    assert.ok(typeof action.id === 'string' && action.id.trim(), `${location}: missing action id`);
    assert.ok(gestures.has(action.gesture), `${location}: unsupported ${action.gesture}`);
    assert.ok(api.STAGE_ACTION_DURATIONS_MS[action.gesture], `${location}: gesture needs an authored duration`);
    assert.equal(api.practiceStageActionDuration(action), api.STAGE_ACTION_DURATIONS_MS[action.gesture]);
    if (action.motion) assert.ok(motions.has(action.motion), `${location}: unsupported motion ${action.motion}`);
    assert.ok(action.set && Object.keys(action.set).length, `${location}: action changes no world state`);
    for (const [key, value] of Object.entries(action.set)) {
      assert.ok(worldValues[key]?.has(value), `${location}: unsupported ${key}=${value}`);
    }
    if (locations.has(action.id)) {
      assert.equal(locations.get(action.id), location, `${action.id}: reused by two different beats`);
    } else {
      locations.set(action.id, location);
      actionsById.set(action.id, action);
      ids.push(action.id);
      actionStories.add(story.id);
    }
  };

  for (const story of api.PRACTICE_STORIES) {
    for (const [key, value] of Object.entries(story.stageInitial || {})) {
      assert.ok(worldValues[key]?.has(value), `${story.id}: unsupported initial ${key}=${value}`);
    }
    for (const beat of story.beats) for (const variant of storyVariants(beat)) {
      const action = variant.stageAction || beat.stageAction;
      const location = `${story.id}/${beat.id}`;
      registerAction(story, action, location, variant.event || beat.event);
      for (const option of variant.options || []) {
        registerAction(story, option.replyStageAction,
          `${location}/reply/${option.id || 'option'}`, option.replyEvent);
      }
    }
  }

  assert.equal(new Set(ids).size, ids.length, 'stage action ids must be globally unique');
  assert.equal(ids.length, authoredActionIds.size,
    'the action count must follow the authored catalog instead of a stale fixed total');
  assert.ok(ids.length >= api.PRACTICE_STORIES.length,
    'every story needs an action, and richer stories may contain more than one');
  assert.equal(actionStories.size, api.PRACTICE_STORIES.length, 'every randomly selected story needs a physical event');
  for (const [id] of locations) {
    const action = actionsById.get(id);
    if (action.motion) assert.match(html, new RegExp(`\\.stage-avatar\\.stage-motion-${action.motion}`),
      `${id}: reusable body motion is missing`);
    else assert.match(html, new RegExp(`\\.stage-avatar\\.stage-action-${action.gesture}`),
      `${id}: authored character gesture is missing`);
  }

  const artStory = api.practiceStoryById('first_art_class');
  const materialized = {
    practiceStoryId: artStory.id, practiceVars: {},
    steps: Array.from({ length: 2 + artStory.beats.length * 4 }, () => ({ type: 'pending' })),
  };
  assert.equal(api.materializePracticeBeat(3, materialized), true);
  assert.equal(materialized.steps[13].stageAction.id, 'dana-place-brushes');
  assert.equal(materialized.steps[14].stageAction, undefined,
    'the duplicated narration on the choice screen must not carry the one-shot action');

  const phoneStory = api.practiceStoryById('phone_in_elevator');
  for (const [vars, beatIndex, actionId] of [
    [{ owner: 'mine' }, 2, 'sam-hand-phone-to-learner'],
    [{ owner: 'other' }, 3, 'sam-hand-phone-to-desk'],
  ]) {
    const phonePath = {
      practiceStoryId: phoneStory.id, practiceVars: vars,
      steps: Array.from({ length: 2 + phoneStory.beats.length * 4 }, () => ({ type: 'pending' })),
    };
    assert.equal(api.materializePracticeBeat(beatIndex, phonePath), true);
    const at = 1 + beatIndex * 4;
    assert.equal(phonePath.steps[at].stageAction.id, actionId);
    assert.equal(phonePath.steps[at + 1].stageAction, undefined);
  }
});

test('stage actions run once on arrival and their logical result persists across later turns', () => {
  const { api } = runtime();
  const sessionFor = (storyId, vars = {}) => ({
    isPractice: true, practiceStoryId: storyId, practiceVars: { ...vars },
    stageWorld: api.initialPracticeStageWorld(storyId), stagePlayedActions: [], pendingStageAction: null,
  });
  const actionAt = (storyId, beatIndex, vars = {}) => {
    const beat = api.resolvePracticeBeat(storyId, beatIndex, vars);
    assert.ok(beat, `${storyId}/${beatIndex}: unresolved beat`);
    return beat.stageAction;
  };
  const enter = (session, action, arrived = true) => api.enterPracticeStageAction({
    arrived, stageAction: action,
  }, session);

  const art = sessionFor('first_art_class');
  const brushes = actionAt('first_art_class', 3);
  assert.deepEqual({ ...art.stageWorld }, { brushes: 'held' });
  assert.equal(enter(art, brushes, false), false, 'the prop must not move while the line is still incoming');
  assert.deepEqual({ ...art.stageWorld }, { brushes: 'held' });
  assert.equal(enter(art, brushes), true);
  assert.equal(enter(art, brushes), false, 'rerendering the same listen step must not replay its action');
  assert.equal(art.stageWorld.brushes, 'placed');
  assert.match(api.stagePropsHtml(api.practiceStageModel(art)), /at-placed is-placing/);
  api.settlePracticeStageAction(art);
  assert.equal(art.stageWorld.brushes, 'placed', 'settling a gesture must keep its final prop state');
  assert.match(api.stagePropsHtml(api.practiceStageModel(art)), /at-placed/);
  assert.doesNotMatch(api.stagePropsHtml(api.practiceStageModel(art)), /is-placing/);

  const mine = sessionFor('phone_in_elevator', { owner: 'mine' });
  enter(mine, actionAt('phone_in_elevator', 0));
  api.settlePracticeStageAction(mine);
  assert.equal(mine.stageWorld.phone, 'held');
  enter(mine, actionAt('phone_in_elevator', 2, mine.practiceVars));
  api.settlePracticeStageAction(mine);
  assert.equal(mine.stageWorld.phone, 'learner');

  const other = sessionFor('phone_in_elevator', { owner: 'other' });
  enter(other, actionAt('phone_in_elevator', 0));
  api.settlePracticeStageAction(other);
  assert.equal(actionAt('phone_in_elevator', 2, other.practiceVars), null,
    'the phone stays with Sam until the front-desk beat on the other-owner path');
  enter(other, actionAt('phone_in_elevator', 3, other.practiceVars));
  api.settlePracticeStageAction(other);
  assert.equal(other.stageWorld.phone, 'desk');

  const bag = sessionFor('nina_wrong_bag', { color: 'black', price: 'fifty' });
  enter(bag, actionAt('nina_wrong_bag', 4, bag.practiceVars));
  api.settlePracticeStageAction(bag);
  assert.equal(bag.stageWorld.bag, 'wrong');
  assert.match(api.stagePropsHtml(api.practiceStageModel(bag)), /shirt-red/);
  enter(bag, actionAt('nina_wrong_bag', 7, bag.practiceVars));
  api.settlePracticeStageAction(bag);
  const rightBag = api.stagePropsHtml(api.practiceStageModel(bag));
  assert.equal(bag.stageWorld.bag, 'right');
  assert.match(rightBag, /shirt-black/);
  assert.doesNotMatch(rightBag, /shirt-red/, 'the red mistake must be gone once the right bag arrives');

  const weather = sessionFor('maya_rainy_beach', { wait: 'music' });
  enter(weather, actionAt('maya_rainy_beach', 5, weather.practiceVars));
  api.settlePracticeStageAction(weather);
  assert.equal(weather.stageWorld.weather, 'rain');
  assert.match(api.stageWeatherHtml(api.practiceStageModel(weather)), /rain-field/);
  assert.equal(actionAt('maya_rainy_beach', 6, weather.practiceVars), null);
  assert.equal(actionAt('maya_rainy_beach', 7, weather.practiceVars), null);
  assert.equal(weather.stageWorld.weather, 'rain', 'rain must survive both waiting beats');
  enter(weather, actionAt('maya_rainy_beach', 8, weather.practiceVars));
  assert.equal(weather.stageWorld.weather, 'sunny');
  assert.match(api.stageWeatherHtml(api.practiceStageModel(weather)), /is-clearing/);
  assert.match(api.stageWeatherHtml(api.practiceStageModel(weather)), /returning-sun/);
  api.settlePracticeStageAction(weather);
  assert.equal(api.stageWeatherHtml(api.practiceStageModel(weather)), '');

  const visual = sessionFor('morning_robot');
  const revealRobot = actionAt('morning_robot', 2, visual.practiceVars);
  assert.equal(enter(visual, revealRobot), true);
  assert.equal(api.finishPracticeStageActionVisual(visual, revealRobot), true);
  assert.equal(visual.pendingStageAction, null);
  assert.deepEqual(Array.from(visual.stagePlayedActions), ['tom-reveals-robot']);
  assert.equal(visual.stageWorld.robot, 'awake');
  assert.equal(api.finishPracticeStageActionVisual(visual, revealRobot), false,
    'a completed action callback must be idempotent');
  visual.pendingStageAction = { id: 'newer-action', gesture: 'robot-lights' };
  assert.equal(api.finishPracticeStageActionVisual(visual, revealRobot), false,
    'a stale timer must never clear the next action');
  assert.equal(visual.pendingStageAction.id, 'newer-action');
});

test('Maya physically finds and places the mirror while its wall light keeps the resolved state', () => {
  const { api } = runtime();
  const story = api.practiceStoryById('maya_window_light');
  assert.ok(story, 'the window-light story should remain available');

  const actionAt = beatIndex => {
    const beat = api.resolvePracticeBeat(story, beatIndex, { clue: 'light' });
    assert.ok(beat, `maya_window_light/${beatIndex}: unresolved beat`);
    return beat.stageAction;
  };
  const actions = [actionAt(1), actionAt(2), actionAt(3)];
  assert.deepEqual(Array.from(actions, action => action?.gesture), [
    'move-mirror-light', 'find-mirror', 'place-mirror',
  ], 'the narrated discovery needs a physical action on each visible beat');
  assert.equal(new Set(actions.map(action => action?.id)).size, actions.length,
    'each mirror action should remain a one-shot event');

  const session = {
    isPractice: true, practiceStoryId: story.id, practiceVars: { clue: 'light' },
    stageWorld: api.initialPracticeStageWorld(story), stagePlayedActions: [], pendingStageAction: null,
  };
  assert.equal(session.stageWorld.mirror, 'hidden');
  assert.equal(session.stageWorld.mirrorLight, 'hidden');
  const livingRoomArt = api.PRACTICE_BACKDROPS['living-room'].art;
  for (const className of ['wall-light-moving', 'wall-light-source', 'wall-light-final']) {
    assert.match(livingRoomArt, new RegExp(className), `${className} should be anchored to the living-room SVG`);
  }
  const storyOverlayAt = livingRoomArt.indexOf('class="backdrop-motion"');
  assert.ok(storyOverlayAt >= 0 && livingRoomArt.indexOf('wall-light-moving') > storyOverlayAt,
    'the animated spot should live in a small unfiltered overlay, outside the far-layer filter');
  assert.match(livingRoomArt, /class="mirror-window-prop"/,
    'the placed mirror should share the window viewBox instead of drifting with avatar size');
  assert.match(livingRoomArt, /class="living-picture" transform="translate\(0 74\)"/,
    'the wall target should stay below the header crop on short phones');
  assert.match(livingRoomArt, /wall-light-source[\s\S]*cx="244" cy="314"[\s\S]*class="mirror-source-prop"[\s\S]*cx="244" cy="314"/,
    'the source ray and reflective face should meet at one scene-coordinate point');
  assert.ok(livingRoomArt.indexOf('class="sun-mirror-object"', livingRoomArt.indexOf('class="mirror-source-prop"')) <
      livingRoomArt.indexOf('class="mirror-source-book"'),
    'the book should paint over the lower mirror so it visibly peeks out from underneath');
  assert.match(livingRoomArt, /class="mirror-final-beam"[\s\S]*class="mirror-final-spot"/,
    'the reflected beam should stay anchored while only its landing spot moves');
  assert.match(livingRoomArt, /class="mirror-final-spot"[\s\S]*cy="129"/,
    'the settled light should land on the short-phone-safe target position');
  assert.match(html, /@keyframes mirrorLightLand\{\s*0%,68%\{opacity:0/,
    'the reflected light must wait until Maya brings the mirror to the window');
  assert.match(html, /@keyframes storyMirrorBackdropTurn\{\s*0%,38%/,
    'the mirror turn should begin before the wall reflection appears');

  assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: actions[0] }, session), true);
  assert.equal(session.stageWorld.mirror, 'hidden');
  assert.equal(session.stageWorld.mirrorLight, 'moving');
  let model = api.practiceStageModel(session);
  let props = api.stagePropsHtml(model);
  assert.match(api.stageWorldClasses(model), /has-mirror-light-moving/);
  assert.match(api.stageWorldClasses(model), /is-mirror-action-move/,
    'the first light sweep should be synchronized to Maya\'s tracking glance');
  assert.doesNotMatch(api.stageWorldClasses(model), /has-mirror-light-final/);
  api.settlePracticeStageAction(session);
  model = api.practiceStageModel(session);
  assert.equal(model.action, null);
  assert.match(api.stageWorldClasses(model), /has-mirror-light-moving/,
    'the travelling spot should persist after its one-shot tracking gesture settles');
  assert.doesNotMatch(api.stageWorldClasses(model), /is-mirror-action-move/,
    'after the authored glance, the spot should switch to its slower ambient wander');

  assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: actions[1] }, session), true);
  assert.equal(session.stageWorld.mirror, 'held');
  assert.equal(session.stageWorld.mirrorLight, 'source');
  model = api.practiceStageModel(session);
  props = api.stagePropsHtml(model);
  assert.doesNotMatch(props, /prop-sun-mirror/,
    'the source mirror should stay aligned to the room rather than an avatar-relative overlay');
  assert.match(livingRoomArt, /mirror-source-prop/,
    'the discovered mirror should be drawn as a real living-room object');
  assert.match(api.stageWorldClasses(model), /has-mirror-light-source/);
  assert.doesNotMatch(props, /prop-story-card/,
    'the physical mirror should not fall back to the generic floating story card');
  api.settlePracticeStageAction(session);
  model = api.practiceStageModel(session);
  assert.equal(model.action, null);
  assert.equal(model.world.mirror, 'held');
  assert.match(api.stageWorldClasses(model), /has-mirror-light-source/);
  assert.match(api.stageHeldObjectClasses(model), /has-held-mirror/,
    'after the pickup animation settles, the mirror must remain visibly gripped');
  assert.doesNotMatch(api.stagePropsHtml(model), /prop-sun-mirror/,
    'the source copy should disappear once the same mirror is in Maya\'s hand');

  assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: actions[2] }, session), true);
  assert.equal(session.stageWorld.mirror, 'placed');
  assert.equal(session.stageWorld.mirrorLight, 'final');
  model = api.practiceStageModel(session);
  props = api.stagePropsHtml(model);
  assert.doesNotMatch(props, /prop-sun-mirror/,
    'the settled mirror belongs to the background coordinate system, not the avatar prop layer');
  assert.match(api.stageWorldClasses(model), /has-mirror-light-final/);
  assert.doesNotMatch(api.stageWorldClasses(model), /has-mirror-light-moving|has-mirror-light-source/,
    'the settled spot should replace transient light states rather than stack on top of them');
  api.settlePracticeStageAction(session);
  assert.equal(session.stageWorld.mirror, 'placed');
  assert.equal(session.stageWorld.mirrorLight, 'final');
  assert.match(api.stageWorldClasses(api.practiceStageModel(session)), /has-mirror-light-final/,
    'the final spot should persist after the one-shot placement animation ends');
  assert.doesNotMatch(api.stageHeldObjectClasses(api.practiceStageModel(session)), /has-held-mirror/,
    'the hand should release the mirror after it settles on the window ledge');
  for (const gesture of ['move-mirror-light', 'find-mirror', 'place-mirror']) {
    assert.match(html, new RegExp(`\\.stage-avatar\\.stage-action-${gesture.replaceAll('-', '\\-')}`),
      `${gesture}: the semantic action needs dedicated body choreography`);
  }
  assert.match(html, /\.person-art\.modern-v2\.voicing \.arm-r \.hand\{animation:mirrorPlaceWrist[^}]*transform-origin:176px 252px/,
    'the placement wrist must override speaking motion without losing its anatomical pivot');
  const breathe = html.match(/@keyframes figBreathe\{[\s\S]*?\}\n@keyframes blink/)?.[0] || '';
  assert.ok(breathe, 'the figure breathing keyframes should remain available');
  assert.doesNotMatch(breathe, /scaleY\(/,
    'whole-body idle motion should not stretch Maya on top of the torso breath');
});

test('the living-room portrait is lit from its visible window on the right', () => {
  const { api } = runtime();
  assert.equal(api.PRACTICE_BACKDROPS['living-room'].lightSide, 'right');
});

test('sceneBackdrop wraps each authored plane in one outer depth layer', () => {
  const { api } = runtime();
  const sentinels = {
    far: '<path data-depth="far"/>',
    mid: '<path data-depth="mid"/>',
    near: '<path data-depth="near"/>',
  };
  const sample = api.sceneBackdrop(
    'depth-contract',
    { top: '#123', bottom: '#234', floor: '#345', glow: '#fff', horizon: 500 },
    sentinels.far,
    sentinels.mid,
    sentinels.near,
  ).art;

  for (const layer of ['far', 'mid', 'near']) {
    assert.equal(classCount(sample, `scene-depth-${layer}`), 1,
      `${layer}: sceneBackdrop needs exactly one depth wrapper`);
    assert.match(sample, new RegExp(
      `<g class="scene-depth scene-depth-${layer}">\\s*` +
      `<g class="backdrop-${layer}">${sentinels[layer]}</g>\\s*</g>`,
    ), `${layer}: the scene-depth group must be outside the existing backdrop group`);
  }
  assert.equal(classCount(sample, 'scene-depth'), 3);
  assert.ok(sample.indexOf('scene-depth-far') < sample.indexOf('scene-depth-mid'));
  assert.ok(sample.indexOf('scene-depth-mid') < sample.indexOf('scene-depth-near'));

  for (const [id, backdrop] of Object.entries(api.PRACTICE_BACKDROPS)) {
    assert.equal(classCount(backdrop.art, 'scene-depth'), 3, `${id}: expected three depth planes`);
    for (const layer of ['far', 'mid', 'near']) {
      assert.equal(classCount(backdrop.art, `scene-depth-${layer}`), 1,
        `${id}: expected one ${layer} depth plane`);
    }
  }
});

test('both Sam offer replies author unique lift-cargo actions', () => {
  const { api } = runtime();
  const story = api.practiceStoryById('sam_boxes_at_door');
  const offer = api.resolvePracticeBeat(story, 0, {});
  assert.equal(offer.id, 'offer');
  assert.deepEqual(Array.from(offer.options, option => option.id), ['carry', 'cannot']);

  const actions = Array.from(offer.options, option => option.replyStageAction);
  assert.ok(actions.every(Boolean), 'each answer needs an action on Sam\'s immediate reply');
  assert.deepEqual(Array.from(actions, action => action.id), [
    'sam-lifts-boxes-for-help',
    'sam-lifts-bag-and-boxes',
  ]);
  assert.equal(new Set(actions.map(action => action.id)).size, actions.length,
    'the two branches must not suppress each other through the one-shot action id');
  for (const action of actions) {
    assert.equal(action.gesture, 'lift-cargo');
    assert.equal(action.motion, 'carry');
    assert.deepEqual({ ...action.set }, { samCargo: 'held' });
    assert.equal(api.practiceStageActionDuration(action), api.STAGE_ACTION_DURATIONS_MS['lift-cargo']);
  }
});

test('a selected reply action reaches only the NPC reply and waits for its arrival', () => {
  for (const optionIndex of [0, 1]) {
    const { api, app } = runtime();
    const story = api.practiceStoryById('sam_boxes_at_door');
    const steps = [{ type: 'practiceIntro' }];
    story.beats.forEach((_, roundIndex) => steps.push(
      { type: 'practiceBeatPending', roundIndex },
      { type: 'practiceChoicePending', roundIndex },
      { type: 'branchPending' },
      { type: 'branchPending' },
    ));
    steps.push({ type: 'practiceDone' });
    const lesson = {
      idx: story.min - 1, lesson: api.LESSONS[story.min - 1], steps, i: 2,
      isReplay: true, isPractice: true, practiceStoryId: story.id,
      practiceVars: {}, practiceDecisions: [],
      practiceMeta: {
        characterId: 'sam', character: api.PRACTICE_CAST.sam,
        placeEmoji: '📦', place: 'בחניית הבניין', mission: story.goal,
        role: api.PRACTICE_CAST.sam.role, bg: 'parking-lot',
      },
      stageWorld: api.initialPracticeStageWorld(story),
      stagePlayedActions: [], pendingStageAction: null,
      elapsedBeforeMs: 0, activeSince: Date.now(), chat: [], chatExpanded: false,
      tries: 0, attempts: 0, rec: null, timerId: null, runId: `sam-reply-${optionIndex}`,
    };
    assert.equal(api.materializePracticeBeat(0, lesson), true);
    const choice = lesson.steps[2];
    const option = choice.options[optionIndex];
    api.setLesson(lesson);
    api.chooseBranch(optionIndex);

    assert.equal(lesson.i, 3);
    const learnerSpeak = lesson.steps[3];
    const npcReply = lesson.steps[4];
    assert.equal(learnerSpeak.p, option.answer);
    assert.equal(learnerSpeak.stageAction, undefined,
      'Sam must not lift the cargo while the learner is still speaking');
    assert.equal(npcReply.line, option.reply);
    assert.equal(npcReply.stageAction, option.replyStageAction,
      'the selected option must copy its action onto its own NPC reply');
    assert.equal(choice.stageAction, undefined);
    assert.equal(lesson.pendingStageAction, null);
    assert.equal(lesson.stageWorld.samCargo, 'ground');
    assert.doesNotMatch(app.innerHTML, /stage-action-lift-cargo/);

    assert.equal(npcReply.arrived, undefined);
    assert.equal(api.enterPracticeStageAction(npcReply, lesson), false,
      'materializing a reply must not commit its action before the line arrives');
    assert.equal(lesson.stageWorld.samCargo, 'ground');
    assert.deepEqual(Array.from(lesson.stagePlayedActions), []);

    npcReply.arrived = true;
    assert.equal(api.enterPracticeStageAction(npcReply, lesson), true);
    assert.equal(lesson.stageWorld.samCargo, 'held');
    assert.equal(lesson.pendingStageAction, option.replyStageAction);
    assert.deepEqual(Array.from(lesson.stagePlayedActions), [option.replyStageAction.id]);
    assert.match(api.stageActionClass(api.practiceStageModel(lesson)), /stage-action-lift-cargo/);
    assert.equal(api.enterPracticeStageAction(npcReply, lesson), false,
      'redrawing the same spoken reply must not lift the boxes twice');

    api.settlePracticeStageAction(lesson);
    assert.equal(lesson.pendingStageAction, null);
    assert.equal(lesson.stageWorld.samCargo, 'held');
    api.stopLessonTimers(false);
    api.setLesson(null);
  }
});

test('other reply-timed events settle on the sentence that announces them', () => {
  const { api } = runtime();
  const activity = api.practiceStoryById('school_activity');
  const oneSlot = api.resolvePracticeBeat(activity, 3, {});
  assert.ok(oneSlot.options.every(option => option.replyStageAction?.set?.activity === 'selected'));
  assert.ok(oneSlot.options.every(option => option.replyEvent?.he));
  assert.equal(api.resolvePracticeBeat(activity, 4, { final: 'music' }).stageAction, null,
    'the selected card must already be settled before the sister question begins');

  const shot = api.practiceStoryById('tom_last_shot');
  for (const vars of [{ search: 'quick' }, { search: 'together' }]) {
    const returnBall = api.resolvePracticeBeat(shot, 4, vars);
    assert.ok(returnBall.options.every(option => option.replyStageAction?.set?.ball === 'held'));
    assert.ok(returnBall.options.every(option => option.replyEvent?.he));
  }
  assert.equal(api.resolvePracticeBeat(shot, 5, { search: 'quick' }).stageAction, null,
    'Tom must not wait until the next question to receive the ball');
});

test('the recess ball visibly stays flat without changing the last-shot basketball', () => {
  const { api } = runtime();
  const flat = api.stagePropsHtml({
    storyId: 'tom_recess_ball', world: { ball: 'lost' }, action: null,
  });
  assert.match(flat, /class="stage-prop prop-ball at-lost is-flat"/);
  assert.match(flat, /class="ball-core flat-ball-core"/);

  const round = api.stagePropsHtml({
    storyId: 'tom_last_shot', world: { ball: 'lost' }, action: null,
  });
  assert.doesNotMatch(round, /is-flat|flat-ball-core/);
  assert.match(round, /<circle cx="33" cy="78" r="23"/);
});

test('Sam cargo follows ground to held to doorway to inside on both offer paths', () => {
  const { api } = runtime();
  const story = api.practiceStoryById('sam_boxes_at_door');
  const offer = api.resolvePracticeBeat(story, 0, {});

  for (const option of offer.options) {
    const session = {
      isPractice: true, practiceStoryId: story.id, practiceVars: {},
      stageWorld: api.initialPracticeStageWorld(story),
      stagePlayedActions: [], pendingStageAction: null,
    };
    const states = [session.stageWorld.samCargo];
    const assertCargoClass = expected => assert.match(
      api.stageWorldClasses(api.practiceStageModel(session)),
      new RegExp(`has-sam-cargo-${expected}`),
      `${option.id}: ${expected} needs a persistent visual resting state`,
    );
    assertCargoClass('ground');

    assert.equal(api.enterPracticeStageAction({
      arrived: true, stageAction: option.replyStageAction,
    }, session), true);
    states.push(session.stageWorld.samCargo);
    assertCargoClass('held');
    assert.match(api.stageHeldObjectClasses(api.practiceStageModel(session)), /has-sam-cargo-held/,
      'the load state must be copied onto the actor that owns the hand rig');
    api.settlePracticeStageAction(session);
    assert.equal(session.stageWorld.samCargo, 'held');

    session.practiceVars = api.applyPracticeChoice(session.practiceVars, option);
    const slipping = api.resolvePracticeBeat(story, 1, session.practiceVars).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: slipping }, session), true);
    api.settlePracticeStageAction(session);
    assert.equal(session.stageWorld.samCargo, 'held',
      'catching or handing off the bag must not drop the cartons back to the floor');

    const doorway = api.resolvePracticeBeat(story, 2, session.practiceVars).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: doorway }, session), true);
    states.push(session.stageWorld.samCargo);
    assertCargoClass('doorway');
    api.settlePracticeStageAction(session);

    const inside = api.resolvePracticeBeat(story, 3, session.practiceVars).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: inside }, session), true);
    states.push(session.stageWorld.samCargo);
    assertCargoClass('inside');
    api.settlePracticeStageAction(session);
    assertCargoClass('inside');

    assert.deepEqual(states, ['ground', 'held', 'doorway', 'inside']);
    assert.equal(new Set(session.stagePlayedActions).size, session.stagePlayedActions.length);
  }
});

test('Sam keeps two real boxes and one visible bag through both doorway branches', () => {
  const { api } = runtime();
  const story = api.practiceStoryById('sam_boxes_at_door');
  assert.ok(story);
  assert.equal(story.stageProp, undefined,
    'the physical cargo should replace the floating generic summary card');
  const initialWorld = api.initialPracticeStageWorld(story);
  assert.equal(initialWorld.storyProp, 'ready');
  assert.equal(initialWorld.samBag, 'stacked');
  assert.equal(initialWorld.samDoor, 'narrow');
  assert.equal(initialWorld.samCargo, 'ground');

  const parkingArt = api.PRACTICE_BACKDROPS['parking-lot'].art;
  assert.equal((parkingArt.match(/class="sam-cargo-box /g) || []).length, 2,
    'the narrated two cartons must both exist in the scene');
  assert.equal((parkingArt.match(/class="sam-cargo-bag"/g) || []).length, 1,
    'the heavy bag must be one persistent physical object');
  assert.match(parkingArt, /class="sam-door-threshold"/,
    'the cargo needs a visible building entrance to move through');
  assert.match(parkingArt, /class="sam-cargo-stage" transform="translate\(0 -72\)"/,
    'the cargo must stay above the opaque controls on short phones');
  assert.match(parkingArt, /class="sam-cargo-boxes">\s*<ellipse class="sam-cargo-shadow"/,
    'the contact shadow must move with the cartons');

  const samActor = api.modernPersonArt(api.PRACTICE_CAST.sam.look, 'speaking');
  assert.equal((samActor.match(/class="sam-held-box /g) || []).length, 2,
    'the held version must keep both cartons inside Sam\'s own SVG coordinates');
  assert.equal(classCount(samActor, 'sam-held-bag'), 1);
  assert.equal(classCount(samActor, 'sam-cargo-grips'), 1,
    'painted grip hands must visibly connect the actor to the load');

  const makeSession = canCarry => ({
    isPractice: true, practiceStoryId: story.id, practiceVars: { canCarry },
    stageWorld: api.initialPracticeStageWorld(story), stagePlayedActions: [], pendingStageAction: null,
  });
  const initial = makeSession(true);
  let model = api.practiceStageModel(initial);
  assert.match(api.stageWorldClasses(model), /has-sam-cargo/);
  assert.match(api.stageWorldClasses(model), /has-sam-boxes-ready/);
  assert.match(api.stageWorldClasses(model), /has-sam-bag-stacked/);
  assert.match(api.stageWorldClasses(model), /has-sam-door-narrow/);
  assert.match(api.stageWorldClasses(model), /has-sam-cargo-ground/);
  assert.doesNotMatch(api.stageHeldObjectClasses(model), /has-sam-cargo-held/);
  assert.doesNotMatch(api.stagePropsHtml(model), /prop-story-card/);

  for (const [canCarry, actionId, bagState, actionClass] of [
    [true, 'sam-bag-to-learner', 'learner', 'is-sam-bag-to-learner'],
    [false, 'sam-catches-bag', 'sam', 'is-sam-bag-to-sam'],
  ]) {
    const session = makeSession(canCarry);
    const slip = api.resolvePracticeBeat(story, 1, { canCarry });
    assert.equal(slip.stageAction.id, actionId);
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: slip.stageAction }, session), true);
    assert.equal(session.stageWorld.samBag, bagState);
    model = api.practiceStageModel(session);
    assert.match(api.stageWorldClasses(model), new RegExp(`has-sam-bag-${bagState}`));
    assert.match(api.stageWorldClasses(model), new RegExp(actionClass));
    assert.doesNotMatch(api.stagePropsHtml(model), /prop-story-card/);
    api.settlePracticeStageAction(session);
    assert.doesNotMatch(api.stageWorldClasses(api.practiceStageModel(session)), new RegExp(actionClass));
    assert.match(api.stageWorldClasses(api.practiceStageModel(session)), new RegExp(`has-sam-bag-${bagState}`),
      'the selected holder must remain visible through the next doorway beat');

    const throughDoor = api.resolvePracticeBeat(story, 2, { canCarry }).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: throughDoor }, session), true);
    assert.equal(session.stageWorld.samDoor, 'open');
    assert.equal(session.stageWorld.samCargo, 'doorway');
    assert.match(api.stageWorldClasses(api.practiceStageModel(session)), /is-sam-door-opening/);
    api.settlePracticeStageAction(session);
    assert.match(api.stageWorldClasses(api.practiceStageModel(session)), /has-sam-door-open/);

    const setDown = api.resolvePracticeBeat(story, 3, { canCarry }).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: setDown }, session), true);
    assert.equal(session.stageWorld.storyProp, 'changed');
    assert.equal(session.stageWorld.samCargo, 'inside');
    assert.equal(session.stageWorld.samBag, bagState,
      'the holder state remains available as the source of the set-down animation');
    const finalClasses = api.stageWorldClasses(api.practiceStageModel(session));
    assert.match(finalClasses, /has-sam-boxes-changed/);
    assert.match(finalClasses, /is-sam-cargo-set-down/);
    assert.match(finalClasses, /has-sam-door-open/);
    api.settlePracticeStageAction(session);

    const closeDoor = api.resolvePracticeBeat(story, 4, { canCarry }).stageAction;
    assert.equal(api.enterPracticeStageAction({ arrived: true, stageAction: closeDoor }, session), true);
    assert.equal(session.stageWorld.samDoor, 'closed');
    const closedClasses = api.stageWorldClasses(api.practiceStageModel(session));
    assert.match(closedClasses, /has-sam-door-closed/);
    assert.match(closedClasses, /is-sam-door-closing/);
  }

  const legacy = { practiceStoryId: story.id, stageWorld: { storyProp: 'changed' }, stagePlayedActions: [] };
  assert.equal(api.ensurePracticeStageWorld(legacy).samBag, 'stacked',
    'older saved conversations should receive the new bag state without losing their progress');
  assert.equal(legacy.stageWorld.samDoor, 'narrow');
  assert.match(api.stageWorldClasses(api.practiceStageModel(legacy)), /has-sam-boxes-changed/);
  assert.match(api.stageWorldClasses(api.practiceStageModel(legacy)), /has-sam-cargo-inside/,
    'a completed pre-samCargo checkpoint must not put the boxes back outside');
  assert.match(html, /\.stage-bg\.has-sam-cargo-inside \.sam-cargo-bag\{opacity:1;transform:/,
    'the completed scene must directly place the bag on the entrance floor');
  assert.match(html, /\.stage-bg\.has-sam-door-closed \.sam-cargo-stage\{opacity:0\}/,
    'closing the door must put the completed cargo behind it');
  assert.match(html, /@keyframes samDoorClose\{0%,44%\{transform:scaleX\(\.22\)\}/,
    'the door must wait for the cargo to move inside before it closes');
  assert.match(html, /@keyframes samCargoBehindDoor\{0%,20%\{opacity:1\}42%,100%\{opacity:0\}\}/,
    'the cargo must clear the doorway before the panel crosses it');
  assert.match(html, /\.stage-avatar\.has-sam-door-closed:not\(\.stage-action-close-door\) \.person-art\{opacity:\.74/,
    'Sam must remain visibly present inside the doorway for the final exchange');
  assert.match(html, /\.stage-avatar\.has-sam-cargo-held \.person-art \.arm \.hand[\s\S]*?\{opacity:0\}/,
    'the original hands must yield to the load-specific grip hands while Sam carries the cargo');
  assert.match(html, /@keyframes samLoadAcquire\{0%,40%\{opacity:0;transform:translate\(88px,86px\)/,
    'the held load needs to begin at the ground stack rather than teleporting into Sam\'s hands');
  assert.match(html, /\.stage-avatar\.stage-directed\.stage-settled\.has-sam-cargo-held \.person-art \.arm-l[\s\S]*?animation:none/,
    'the settled idle loop must not detach Sam\'s sleeves from the boxes');
});

test('the rendered mirror scene keeps one physical mirror through pickup and placement', () => {
  const renderBeat = (beatIndex, stageWorld, stagePlayedActions) => {
    const { api, app } = runtime();
    const story = api.practiceStoryById('maya_window_light');
    const beat = api.resolvePracticeBeat(story, beatIndex, { clue: 'light' });
    const listen = {
      type: 'listen', line: beat.ask, event: beat.event, stageAction: beat.stageAction,
      stageCue: beat.stageCue, practiceBeatId: beat.id, practiceVariantId: beat.variantId,
      roundIndex: beatIndex, arrived: true,
    };
    const lesson = {
      idx: 0, steps: [listen, { type: 'branchChoice', options: beat.options, roundIndex: beatIndex }],
      i: 0, isReplay: true, isPractice: true, practiceStoryId: story.id,
      practiceVars: { clue: 'light' }, practiceDecisions: [],
      practiceMeta: {
        characterId: 'maya', character: api.PRACTICE_CAST.maya,
        placeEmoji: '🪟', place: 'בסלון', mission: story.goal,
        role: api.PRACTICE_CAST.maya.role, bg: 'living-room',
      },
      stageWorld: { ...stageWorld }, stagePlayedActions: [...stagePlayedActions], pendingStageAction: null,
      elapsedBeforeMs: 0, activeSince: Date.now(), chat: [], chatExpanded: false,
      tries: 0, attempts: 0, rec: null, timerId: null, runId: `mirror-dom-${beatIndex}`,
    };
    api.setLesson(lesson);
    api.renderStep();
    const during = app.innerHTML;
    api.next();
    const settled = app.innerHTML;
    api.stopLessonTimers(false);
    api.setLesson(null);
    return { during, settled };
  };

  const pickup = renderBeat(2, { mirror: 'hidden', mirrorLight: 'moving' }, ['maya-tracks-moving-mirror-light']);
  assert.match(pickup.during, /stage-action-find-mirror/);
  assert.match(pickup.during, /is-mirror-action-find/);
  assert.match(pickup.during, /has-held-mirror/);
  assert.match(pickup.during, /mirror-source-prop/);
  assert.doesNotMatch(pickup.during, /prop-sun-mirror/);
  assert.doesNotMatch(pickup.settled, /stage-action-find-mirror|is-mirror-action-find/);
  assert.match(pickup.settled, /has-held-mirror/,
    'the settled choice screen must keep the discovered mirror in Maya\'s hand');

  const placement = renderBeat(3, { mirror: 'held', mirrorLight: 'source' }, [
    'maya-tracks-moving-mirror-light', 'maya-finds-sun-mirror',
  ]);
  assert.match(placement.during, /stage-action-place-mirror/);
  assert.match(placement.during, /is-mirror-action-place/);
  assert.match(placement.during, /has-held-mirror/);
  assert.match(placement.during, /mirror-window-prop/);
  assert.doesNotMatch(placement.during, /prop-sun-mirror at-window/,
    'placement must not create a second mirror tied to the avatar coordinate system');
  assert.doesNotMatch(placement.settled, /stage-action-place-mirror|is-mirror-action-place|has-held-mirror/);
  assert.match(placement.settled, /has-mirror-light-final/);
  assert.match(placement.settled, /mirror-window-prop/,
    'the same mirror must remain anchored to the window after Maya releases it');
});

test('every authored stageProp kind renders as a physical before-and-after object', () => {
  const { api } = runtime();
  const expectedKinds = [
    'apples', 'audio', 'bike-key', 'blackout-meal', 'camera', 'cat',
    'cue-card', 'elevator-panel', 'ice-cream', 'lemonade', 'notebook', 'paint-jar', 'pigeon',
    'sale-sign', 'sink', 'snowman', 'watering',
  ];
  const stories = api.PRACTICE_STORIES.filter(story => story.stageProp?.kind);
  assert.deepEqual(Array.from(stories, story => story.stageProp.kind).sort(), expectedKinds);
  assert.equal(new Set(stories.map(story => story.stageProp.kind)).size, expectedKinds.length,
    'each physical prop kind should belong to one authored story');

  for (const story of stories) {
    const spec = story.stageProp;
    const kind = spec.kind;
    const beforeFace = api.physicalStoryPropFace(kind, 'before');
    const afterFace = api.physicalStoryPropFace(kind, 'after');
    assert.ok(beforeFace.trim(), `${story.id}: missing physical before artwork`);
    assert.ok(afterFace.trim(), `${story.id}: missing physical after artwork`);
    assert.notEqual(beforeFace, afterFace, `${story.id}: the story event needs two visible states`);
    assert.match(beforeFace, /class="object-shadow"/,
      `${story.id}: the physical object needs contact with the scene`);
    assert.match(afterFace, /class="object-shadow"/,
      `${story.id}: its resolved state needs the same scene contact`);

    const readyModel = api.practiceStageModel({
      practiceStoryId: story.id, practiceVars: {}, stageWorld: { storyProp: 'ready' },
      stagePlayedActions: [], pendingStageAction: null,
    });
    const ready = api.stagePhysicalStoryPropHtml(readyModel, spec, 'ready', 'story-prop-reveal');
    assert.match(ready, new RegExp(`physical-story-prop physical-${kind}`));
    assert.match(ready, /story-prop-ready is-revealing/);
    assert.ok(ready.includes(beforeFace), `${story.id}: physical renderer skipped its before face`);
    assert.ok(!ready.includes(afterFace), `${story.id}: resolved face appeared before the event`);

    const changedModel = api.practiceStageModel({
      practiceStoryId: story.id, practiceVars: {}, stageWorld: { storyProp: 'changed' },
      stagePlayedActions: [], pendingStageAction: {
        id: `${story.id}-physical-test`, gesture: 'story-prop-change', motion: 'present',
      },
    });
    const changing = api.stagePhysicalStoryPropHtml(changedModel, spec, 'changed', 'story-prop-change');
    assert.match(changing, /story-prop-changed is-changing/);
    assert.ok(changing.includes(beforeFace), `${story.id}: change animation needs its physical source`);
    assert.ok(changing.includes(afterFace), `${story.id}: change animation needs its physical destination`);

    const settledModel = api.practiceStageModel({
      practiceStoryId: story.id, practiceVars: {}, stageWorld: { storyProp: 'changed' },
      stagePlayedActions: [], pendingStageAction: null,
    });
    const settled = api.stagePhysicalStoryPropHtml(settledModel, spec, 'changed', '');
    assert.match(settled, /story-prop-changed/);
    assert.doesNotMatch(settled, /is-changing|is-revealing/);
    assert.ok(settled.includes(afterFace), `${story.id}: resolved physical object did not persist`);
    assert.ok(!settled.includes(beforeFace), `${story.id}: obsolete physical state remained after settling`);

    assert.equal(api.stagePropsHtml(readyModel),
      api.stagePhysicalStoryPropHtml(readyModel, spec, 'ready', ''),
      `${story.id}: stagePropsHtml must route this kind through the physical renderer`);
    for (const rendered of [ready, changing, settled, api.stagePropsHtml(readyModel)]) {
      assert.doesNotMatch(rendered, /prop-story-card|story-prop-icon|story-prop-label/,
        `${story.id}: physical story object regressed to the generic floating card`);
    }
  }
  assert.equal(api.physicalStoryPropFace('not-a-real-kind', 'before'), '');
});

test('every story world renders a persistent prop and held objects share the hand rig', () => {
  const { api } = runtime();
  const modelFor = (storyId, world, vars = {}, action = null) => api.practiceStageModel({
    practiceStoryId: storyId, practiceVars: vars, stageWorld: world,
    stagePlayedActions: [], pendingStageAction: action,
  });

  const oldRobotSession = { practiceStoryId: 'morning_robot', stageWorld: {}, stagePlayedActions: [] };
  assert.equal(api.ensurePracticeStageWorld(oldRobotSession).robot, 'bag',
    'older sessions should receive a newly authored initial prop');
  oldRobotSession.stageWorld.robot = 'lit';
  assert.equal(api.ensurePracticeStageWorld(oldRobotSession).robot, 'lit',
    'merging missing defaults must never overwrite story progress');

  const renderCases = [
    ['first_art_class', { brushes: 'placed' }, {}, /prop-brushes/],
    ['phone_in_elevator', { phone: 'floor' }, {}, /prop-phone/],
    ['nina_wrong_bag', { bag: 'right' }, { color: 'black' }, /prop-bag[^>]*shirt-black/],
    ['lost_bag', { lostBag: 'found' }, {}, /prop-lost-bag[^>]*lost-bag-found/],
    ['restaurant_mixup', { mealTray: 'correct' }, { meal: 'burger', drink: 'water' }, /prop-meal[^>]*served-burger/],
    ['family_photo_wind', { photo: 'notebook' }, {}, /prop-photo[^>]*at-notebook/],
    ['school_activity', { activity: 'selected' }, { final: 'football' }, /prop-activity[^>]*selected-football/],
    ['broken_phone_plan', { connection: 'message' }, {}, /prop-connection[^>]*connection-message/],
    ['tom_last_shot', { ball: 'lost' }, {}, /prop-ball[^>]*at-lost/],
    ['maya_lost_dog', { lostDog: 'spotted' }, { size: 'small', collar: 'red' }, /prop-dog[^>]*dog-spotted/],
    ['morning_robot', { robot: 'lit' }, {}, /prop-robot[^>]*robot-lit/],
  ];
  for (const [storyId, world, vars, expected] of renderCases) {
    assert.match(api.stagePropsHtml(modelFor(storyId, world, vars)), expected, `${storyId}: missing final prop`);
  }
  assert.match(api.stageWeatherHtml(modelFor('maya_rainy_beach', { weather: 'rain' })), /rain-field/);
  const dogPair = api.stagePropsHtml(modelFor('maya_lost_dog', { lostDog: 'spotted' }, { size: 'small', collar: 'blue' }));
  assert.match(dogPair, /dog-friend/);
  assert.match(dogPair, /stroke="#c9ab61"/,
    'Maya\'s dog needs a distinct gold collar even when the lost dog is small and blue-collared');
  assert.match(dogPair, /stroke="#3e8fd8"/);

  const stable = { practiceStoryId: 'restaurant_mixup', practiceVars: { meal: 'pizza', drink: 'none' }, stageWorld: { mealTray: 'wrong' } };
  const firstKey = api.practiceStageModel(stable).key;
  assert.equal(api.practiceStageModel(stable).key, firstKey, 'identical stage state needs a stable visual key');
  stable.practiceVars.meal = 'burger';
  assert.notEqual(api.practiceStageModel(stable).key, firstKey, 'a visible story choice must refresh its prop');

  const bagSwap = modelFor('lost_bag', { lostBag: 'found' }, {}, {
    id: 'ben-find-own-bag', gesture: 'find-lost-bag', motion: 'swap',
  });
  assert.match(api.stagePropsHtml(bagSwap), /lost-bag-wrong is-leaving/);
  assert.match(api.stagePropsHtml(bagSwap), /lost-bag-found is-arriving/);
  const mealSwap = modelFor('restaurant_mixup', { mealTray: 'correct' }, { meal: 'pizza', drink: 'water' }, {
    id: 'alex-swap-correct-meal', gesture: 'swap-correct-meal', motion: 'swap',
  });
  assert.match(api.stagePropsHtml(mealSwap), /meal-wrong[^>]*is-leaving/);
  assert.match(api.stagePropsHtml(mealSwap), /meal-correct[^>]*is-arriving/);

  assert.match(api.stageHeldObjectClasses({ world: { photo: 'held' } }), /has-held-photo/);
  assert.match(api.stageHeldObjectClasses({ world: { photo: 'learner' }, action: { gesture: 'return-photo' } }), /has-held-photo/,
    'the photo stays gripped until the release contact');
  assert.doesNotMatch(api.stageHeldObjectClasses({ world: { photo: 'learner' } }), /has-held-photo/);
  assert.match(api.stageHeldObjectClasses({ world: { ball: 'held' } }), /has-held-ball/);
  assert.match(api.stageHeldObjectClasses({ world: { ball: 'scored' }, action: { gesture: 'score-ball' } }), /has-held-ball/,
    'the ball stays in the hand until the throw');
  assert.doesNotMatch(api.stageHeldObjectClasses({ world: { ball: 'scored' } }), /has-held-ball/);
  assert.match(api.stageHeldObjectClasses({ world: { mirror: 'held' } }), /has-held-mirror/);
  assert.match(api.stageHeldObjectClasses({ world: { mirror: 'placed' }, action: { gesture: 'place-mirror' } }), /has-held-mirror/,
    'the mirror stays in the hand until it reaches the window ledge');
  assert.doesNotMatch(api.stageHeldObjectClasses({ world: { mirror: 'placed' } }), /has-held-mirror/);

  const slotAt = html.indexOf('class="hand-object-slot"');
  const fingersAt = html.indexOf('class="grip-fingers"', slotAt);
  assert.ok(slotAt >= 0 && fingersAt > slotAt, 'the front fingers must be painted above held objects');
  for (const held of ['held-brushes-art', 'held-phone-art', 'held-photo-art', 'held-ball-art', 'held-mirror-art']) {
    const at = html.indexOf(`class="held-object ${held}"`, slotAt);
    assert.ok(at > slotAt && at < fingersAt, `${held}: object must live inside the hand slot`);
  }
  for (const held of ['brushes', 'phone', 'photo', 'ball', 'mirror']) {
    assert.match(html, new RegExp(`has-held-${held}`), `${held}: held state needs a visibility selector`);
  }
  assert.match(html, /\.stage-bg\.has-story-connection \.phone-signal/,
    'the authored phone prop must replace the room signal instead of duplicating it');
});

test('an arriving stage action animates through renderListen and settles through next', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  const story = api.practiceStoryById('first_art_class');
  const beat = api.resolvePracticeBeat(story, 3, {});
  const listen = {
    type: 'listen', line: beat.ask, event: beat.event, stageAction: beat.stageAction,
    stageCue: beat.stageCue,
    practiceBeatId: beat.id, practiceVariantId: beat.variantId, roundIndex: 3, arrived: true,
  };
  const choice = {
    type: 'branchChoice', options: beat.options, event: beat.event,
    practiceBeatId: beat.id, practiceVariantId: beat.variantId, roundIndex: 3,
  };
  const lesson = {
    idx: 0, steps: [listen, choice], i: 0, isReplay: true, isPractice: true,
    practiceStoryId: story.id, practiceVars: {}, practiceDecisions: [],
    practiceMeta: {
      characterId: 'dana', character: { name: 'דנה', avatar: '🎨', color: '#38bdf8', f: true },
      placeEmoji: '🎨', place: 'בחוג', mission: story.goal, role: 'מדריכה', bg: 'art-studio',
    },
    stageWorld: api.initialPracticeStageWorld(story), stagePlayedActions: [], pendingStageAction: null,
    elapsedBeforeMs: 0, activeSince: Date.now(), chat: [], chatExpanded: false,
    tries: 0, attempts: 0, rec: null, timerId: null, runId: 'stage-lifecycle-test',
  };
  api.setLesson(lesson);

  api.renderStep();
  assert.equal(lesson.stageWorld.brushes, 'placed');
  assert.equal(lesson.pendingStageAction.id, 'dana-place-brushes');
  assert.ok(lesson.stageActionSettleTimer, 'the visual action should have its own settle timer');
  assert.match(app.innerHTML, /stage-action-place-brushes/);
  assert.match(app.innerHTML, /at-placed is-placing/);
  assert.match(app.innerHTML, new RegExp(`data-stage-cue="${beat.stageCue.id}"`));
  const direction = api.STAGE_DIRECTION_PRESETS[beat.stageCue.preset];
  assert.match(app.innerHTML, /stage-directed/);
  assert.match(app.innerHTML, new RegExp(`stage-pose-${direction.pose}`));
  assert.match(app.innerHTML, new RegExp(`stage-expression-${direction.expression}`));
  assert.match(app.innerHTML, new RegExp(`stage-gaze-${direction.gaze}`));
  assert.match(app.innerHTML, new RegExp(`stage-shot-${direction.camera}`));
  assert.match(app.innerHTML, new RegExp(`stage-camera-${direction.camera}`));
  assert.match(app.innerHTML, new RegExp(`stage-mood-${direction.mood}`));
  assert.match(app.innerHTML, /id="stageEventAnnouncer" aria-live="polite" aria-atomic="true"/,
    'the stage should keep a persistent empty announcer for narrated events');

  api.next();
  assert.equal(lesson.i, 1);
  assert.equal(lesson.pendingStageAction, null);
  assert.equal(lesson.stageActionSettleTimer, null);
  assert.equal(lesson.stageWorld.brushes, 'placed');
  assert.match(app.innerHTML, /at-placed/);
  assert.doesNotMatch(app.innerHTML, /is-placing|stage-action-place-brushes/,
    'the choice screen keeps the brushes but never replays Dana placing them');
  api.stopLessonTimers(false);
  api.setLesson(null);
});

test('stage action markup updates independently and has a reduced-motion final state', () => {
  assert.match(html, /id="stageStoryProps" data-visual-key=/);
  assert.match(html, /id="stageWeather" data-visual-key=/);
  assert.match(html, /syncStageVisualBlock\(screen\.querySelector\('#stageStoryProps'\)/);
  assert.match(html, /syncStageVisualBlock\(screen\.querySelector\('#stageWeather'\)/);
  assert.match(html, /practiceStageActionVisualDelay\(action\)\+140/,
    'caption scrolling should wait for the authored action, including longer cinematic beats');
  assert.match(html, /behavior:prefersReducedStageMotion\(\)\?'auto':'smooth'/,
    'reduced-motion users should not be forced through a smooth programmatic scroll');
  assert.match(html, /if\(stageActionStarted\)\{[\s\S]*requestAnimationFrame\(keepStageActionVisible\)/,
    'a later action should restore the avatar even when the stage was already scrolled to the prior caption');
  assert.match(html, /announceStageEvent\(step\.arrived\?step\.event:null\)/);
  assert.match(html, /announcer\.textContent=''[\s\S]*requestAnimationFrame\(\(\)=>[\s\S]*announcer\.textContent=text/,
    'the persistent live region must be mutated after insertion for reliable screen-reader output');
  assert.match(html, /\.stage-prop\.is-leaving,[^\{]*\.rain-field\.is-clearing\{display:none\}/,
    'reduced motion should jump directly to resolved props and sunny weather');
  const reduced = html.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/)?.[1] || '';
  assert.ok(reduced, 'stage animation needs a reduced-motion contract');
  assert.doesNotMatch(reduced, /\.person-art[^\{]*\{[^\}]*transform\s*:\s*none!important/,
    'reduced motion must preserve static SVG joints and character accessories');
  assert.match(reduced, /\.stage-moment-fx\{display:none\}/);
  const mirrorLightStops = /\.wall-light-moving[^\{]*\{[^\}]*animation\s*:\s*none!important/.test(reduced) &&
    /\.wall-light-source[^\{]*\{[^\}]*animation\s*:\s*none!important/.test(reduced);
  assert.ok(mirrorLightStops,
    'reduced motion should freeze both the travelling spot and its source-light transition');
  assert.match(reduced, /\.wall-light-final[^\{]*\{[^\}]*opacity\s*:\s*1!important/,
    'reduced motion must leave the mirror story\'s resolved wall spot visible');
  assert.doesNotMatch(reduced, /\.wall-light-final[^\{]*\{[^\}]*(?:display\s*:\s*none|opacity\s*:\s*0(?:\D|$))/,
    'reduced motion must never hide the resolved wall spot');
  assert.match(html, /\.mirror-source-prop \.sun-mirror-object\{opacity:0;/,
    'without its pickup animation, the scene copy should yield directly to the mirror in Maya\'s hand');
  assert.match(reduced, /\.mirror-source-prop,[^\{]*\.mirror-source-prop \*[^\{]*\{[^\}]*animation\s*:\s*none!important/,
    'reduced motion should disable the scene-coordinate pickup transition');
  assert.match(reduced, /\.stage-action-place-mirror\s+\.held-mirror-art\{opacity:0!important\}/,
    'reduced motion should not show held and placed copies of the mirror together');
  assert.match(reduced, /\.sam-door-story,\.sam-door-story \*\{animation:none!important;transition:none!important\}/,
    'reduced motion should keep Sam\'s cargo in its state-driven resting pose');
  assert.match(reduced, /\.stage-avatar,\.stage-avatar \.person-art\{animation:none!important;transition:none!important\}/,
    'reduced motion must also stop root-level character movement and transitions');
  assert.match(reduced, /\.stage-action-close-door \.person-art\{opacity:\.74!important/,
    'reduced motion must keep Sam visible inside the doorway during his closing line');
  assert.match(html, /const actionRemaining=stageActionStarted\?Math\.max\(0,stageActionVisualMs-\(Date\.now\(\)-stageActionStartedAt\)\):0/,
    'conversation flow should wait only for the unfinished part of an action after speech ends');

  const { api: reducedApi } = runtime(new Map(), { matchMedia: query => ({
    matches: query === '(prefers-reduced-motion: reduce)',
  }) });
  assert.equal(reducedApi.prefersReducedStageMotion(), true);
  assert.equal(reducedApi.practiceStageActionVisualDelay({ gesture: 'place-mirror' }), 0,
    'reduced motion should settle a semantic action without waiting through its cinematic duration');

  const { api } = runtime();
  const block = { dataset: {}, innerHTML: '' };
  api.syncStageVisualBlock(block, 'phone-held|pickup', '<svg>moving</svg>');
  assert.equal(block.innerHTML, '<svg>moving</svg>');
  api.syncStageVisualBlock(block, 'phone-held|pickup', '<svg>replayed</svg>');
  assert.equal(block.innerHTML, '<svg>moving</svg>', 'the same visual key must not rebuild and restart CSS motion');
  api.syncStageVisualBlock(block, 'phone-held|settled', '<svg>settled</svg>');
  assert.equal(block.innerHTML, '<svg>settled</svg>');

  const actionSession = { pendingStageAction: { id: 'visible-action' } };
  api.setLesson(actionSession);
  api.keepStageCaptionVisible(123.45); // requestAnimationFrame supplies this timestamp argument
  assert.ok(actionSession.stageCaptionAfterActionTimer,
    'a frame timestamp must not bypass the action-first scroll delay');
  api.settlePracticeStageAction(actionSession);
  assert.equal(actionSession.stageCaptionAfterActionTimer, null);

  const timerSession = {
    stageActionSettleTimer: setTimeout(() => {}, 5000),
    stageCaptionAfterActionTimer: setTimeout(() => {}, 5000),
  };
  api.setLesson(timerSession);
  api.stopLessonTimers(false);
  assert.equal(timerSession.stageActionSettleTimer, null);
  assert.equal(timerSession.stageCaptionAfterActionTimer, null);
  api.setLesson(null);
});

test('backgrounding pauses and resumes the remaining stage-action time', () => {
  const { api } = runtime();
  const session = {
    pendingStageAction: { id: 'pause-safe-lift', gesture: 'lift-cargo' },
    stageActionSettleTimer: null,
    stageActionSettleDueAt: null,
    stageActionSettleRemainingMs: null,
  };

  api.schedulePracticeStageActionSettle(session, 2000);
  assert.ok(session.stageActionSettleTimer);
  assert.ok(session.stageActionSettleDueAt > Date.now());
  assert.equal(api.pausePracticeStageActionSettle(session), true);
  assert.equal(session.stageActionSettleTimer, null);
  assert.equal(session.stageActionSettleDueAt, null);
  assert.ok(session.stageActionSettleRemainingMs > 0 && session.stageActionSettleRemainingMs <= 2000);
  const pausedRemaining = session.stageActionSettleRemainingMs;

  assert.equal(api.pausePracticeStageActionSettle(session), false,
    'a duplicate pagehide event must not discard the already preserved delay');
  assert.equal(session.stageActionSettleRemainingMs, pausedRemaining);
  assert.equal(api.resumePracticeStageActionSettle(session), true);
  assert.ok(session.stageActionSettleTimer);
  assert.equal(session.stageActionSettleRemainingMs, null);
  assert.ok(session.stageActionSettleDueAt > Date.now());
  assert.equal(api.resumePracticeStageActionSettle(session), false,
    'visibilitychange and pageshow must not schedule the same settle twice');

  api.settlePracticeStageAction(session);
  assert.equal(session.stageActionSettleTimer, null);
  assert.equal(session.pendingStageAction, null);
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
  assert.equal(lesson.steps[4].stageCue, choice.replyStageCue);
  assert.equal(lesson.steps[5].line, expectedNext.ask);
  assert.equal(lesson.steps[6].options, expectedNext.options);
  assert.equal(lesson.steps[5].practiceVariantId, expectedNext.variantId);
  assert.equal(lesson.steps[5].stageCue.id, expectedNext.stageCue.id);
  assert.equal(lesson.steps[6].replyStageCue.id, expectedNext.replyStageCue.id);
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

test('a paused lesson resumes from its map row without a duplicate home card', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  api.startLesson(0, false, true);
  const lesson = api.getLesson();
  lesson.i = 2;
  api.saveLessonCheckpoint();
  api.stopLessonTimers(false);
  api.setLesson(null);
  api.renderHome();

  assert.doesNotMatch(app.innerHTML, /ממשיכים מאיפה שעצרת|המשך בשיעור/);
  assert.match(app.innerHTML, /עצרת כאן — אפשר להמשיך/);
  assert.match(app.innerHTML, /onclick="resumeLesson\(\)"/);
});

test("finishing the day's lesson congratulates and stops, and a bonus is only ever asked for", () => {
  const { api, app } = runtime();
  const base = () => { const st = api.defaults(); st.onboarded = true; st.completed = 3; return st; };

  /* Nothing done today: the lesson is simply the lesson. */
  let st = base(); st.lastDoneDate = '2020-01-01'; api.setState(st); api.renderHome();
  assert.match(app.innerHTML, /class="lesson-row current"[^>]*onclick="startLesson\(3, false\)"/,
    "today's lesson opens on a tap, with nothing in the way");

  /* One done: congratulated, and the next lesson reads shut. Dangling a bonus
     here turned "one lesson a day" into a suggestion nobody asked about. */
  st = base(); st.lastDoneDate = api.todayStr(); st.lessonsToday = 1; api.setState(st); api.renderHome();
  const after = app.innerHTML;
  assert.match(after, /\u05db\u05dc \u05d4\u05db\u05d1\u05d5\u05d3/, 'the day ends on praise');
  assert.doesNotMatch(after, /\u05e9\u05d9\u05e2\u05d5\u05e8 \u05d4\u05d1\u05d5\u05e0\u05d5\u05e1 \u05de\u05e1\u05d5\u05de\u05df|\u05d6\u05de\u05d9\u05df \u05db\u05e9\u05d9\u05e2\u05d5\u05e8 \u05d1\u05d5\u05e0\u05d5\u05e1/,
    'and never on an offer of more work');
  assert.doesNotMatch(after, />\u{1F381}</u, 'nothing is dressed up as a present waiting to be opened');
  assert.match(after, /class="lesson-row locked day-done"[^>]*onclick="askBonusLesson\(3\)"/,
    'the next lesson reads closed, and a tap starts a conversation rather than the lesson');

  /* Two done: the day really is over — no bonus left to ask for. */
  st = base(); st.lastDoneDate = api.todayStr(); st.lessonsToday = 2; api.setState(st); api.renderHome();
  const full = app.innerHTML;
  assert.match(full, /class="lesson-row locked"[^>]*disabled/, 'a spent day leaves the row shut and inert');
  assert.doesNotMatch(full, /askBonusLesson/, 'with nothing more to ask for');

  /* And the bonus itself explains the rule before overruling it. */
  assert.match(html, /async function askBonusLesson\(idx\)\{[\s\S]*?askConfirm\(\{[\s\S]*?if\(yes\) startLesson\(idx, false\);/,
    'the bonus opens only after the learner is told why it was shut and says yes anyway');
  assert.doesNotMatch(html, /\u05de\u05d7\u05db\u05d4 \u05dc\u05da \u05d1\u05d5\u05e0\u05d5\u05e1/,
    'and the finish screen no longer advertises one either');
});

test('home puts the active course path first and collapses completed and future units', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 6;
  state.daysLearned = 3;
  api.setState(state);
  api.renderHome();

  const html = app.innerHTML;
  assert.ok(html.indexOf('המסלול שלך') < html.indexOf('home-stats-strip'));
  assert.match(html, /id="homeUnitBody0" class="home-unit-body collapsed" aria-hidden="true" inert/);
  assert.match(html, /id="homeUnitBody1" class="home-unit-body" aria-hidden="false"/);
  assert.match(html, /id="homeUnitBody2" class="home-unit-body collapsed" aria-hidden="true" inert/);
  assert.match(html, /class="lesson-row current"[^>]*data-home-current="true"/);
  /* Things to do, not steps on the path, so they sit above it rather than
     below the stats at the foot of a long scroll, past thirty locked lessons. */
  // free practice now opens the picker, where the surprise draw is one tap away
  assert.match(html, /class="home-extra practice"[^>]*onclick="renderPracticePicker\(\)"/);
  assert.match(html, /class="home-extra drill[^"]*"[^>]*onclick="startDailyDrill\(\)"/,
    'and the daily drill sits beside it, in the two-column row');
  assert.ok(html.indexOf('home-extras') < html.indexOf('המסלול שלך'),
    'they sit above the lesson list rather than inside or below it');
  assert.doesNotMatch(html, /home-path-special|home-side-game/,
    'and neither is wedged between two units or stranded at the foot of the page');
  assert.doesNotMatch(html, /class="btn practice-cta"/);
  assert.doesNotMatch(html, />⭐</);
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

/* Sam's Run — a three-lane endless runner — was removed. It failed for a
   structural reason worth writing down, because the next idea can fail the
   same way: running rewards fast reaction, translating rewards stopping to
   think, so each gate broke the flow and the flow prevented the thinking. It
   was also a single verb repeated — pick one of three — which is novel for a
   minute and a form thereafter, and it shipped a 1.2MB voice pack and a
   hand-written WebGL2 renderer to do it. Sam the neighbour is a different
   thing entirely: he lives in the practice conversations and stays. */
test("Sam's Run is gone, in the markup, the styles and the offline payload", () => {
  /* One mention survives on purpose: the line that clears the game's orphaned
     save out of the learner's storage. Nothing else may name it. */
  assert.match(html, /localStorage\.removeItem\('english\.samRun'\)/,
    "the game's old save is cleared from storage rather than left to sit there");
  const mentions = html.match(/samRun|SAM_RUN|\bs3d[A-Z]/g) || [];
  assert.deepEqual(mentions, ['samRun'],
    `the cleanup line is the only mention of the runner left, found: ${mentions.join(', ')}`);
  assert.doesNotMatch(html, /lane-game|game-obstacle|game-back-rig|game-world/,
    'and none of its styles are left behind either');
  assert.doesNotMatch(html, /<script[^>]+src=/,
    'the app is one file again, with no external script to fetch');
  for(const gone of ['runner-voice.js', 'THIRD_PARTY_NOTICES.md', 'LICENSES/Apache-2.0.txt', 'LICENSES/Flite-CMU.txt'])
    assert.ok(!fs.existsSync(new URL(`../${gone}`, import.meta.url)),
      `${gone} existed only for the runner and is deleted`);

  // Sam the neighbour is a character in the practice conversations, not the game.
  assert.match(html, /sam:\{name:'סם'/, 'the neighbour keeps his place in the cast');
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
  /* cache.addAll() rejects atomically: a single 404 fails the whole install and
     leaves the app with no offline copy at all. Listing a file that was deleted
     is therefore not a stale comment, it is an outage — so every path in the
     list has to really be in the repo. */
  const listed = [...sw.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
  assert.ok(listed.length >= 4, 'the offline list still names the app files');
  for(const asset of listed){
    assert.ok(fs.existsSync(new URL(`../${asset}`, import.meta.url)),
      `${asset} is listed for offline use and really exists`);
  }
  assert.ok(!sw.includes('runner-voice'),
    "and the runner's 1.2MB voice pack went with Sam's Run instead of being downloaded by every learner");
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

/* ---- confidence-first changes: proof, honest promises, quiet missions ---- */

test('in-app question sheets replace the browser confirm box', async () => {
  assert.doesNotMatch(inline, /[^a-zA-Z.]confirm\(/, 'no native confirm() may remain in the app');
  const { api } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);

  const first = api.askConfirm({ title: 'לצאת?' });
  api.resolveDialog(true);
  assert.equal(await first, true);

  // a newer question closes the older one as "no"; tapping away is also "no"
  const older = api.askConfirm({ title: 'א' });
  const newer = api.askConfirm({ title: 'ב' });
  assert.equal(await older, false);
  api.resolveDialog(false);
  assert.equal(await newer, false);

  // cancelling the exit question keeps the lesson exactly where it was
  api.startLesson(0, false, true);
  api.exitLesson();
  api.resolveDialog(false);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(api.getLesson(), 'a cancelled exit must not close the lesson');
  api.exitLesson();
  api.resolveDialog(true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(api.getLesson(), null);
  assert.ok(api.validSavedSession(api.getState().session), 'leaving keeps the checkpoint');
});

test('a finished lesson shows the sentences he can now say, with a streak he can read', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  api.startLesson(0, false, true);
  const lesson = api.getLesson();
  lesson.i = lesson.steps.findIndex(step => step.type === 'done');
  api.renderStep();
  assert.ok(app.innerHTML.includes('מהיום אתה יכול להגיד'));
  for (const phrase of api.LESSONS[0].phrases) assert.ok(app.innerHTML.includes(api.ptext(phrase, 'en')));
  assert.ok(app.innerHTML.includes('יום ראשון ברצף'));
  assert.ok(!app.innerHTML.includes('1 ימים ברצף'));
  assert.equal(api.streakLabel(2), 'יומיים ברצף');
  assert.equal(api.streakLabel(7), '7 ימים ברצף');
  assert.equal(api.getState().daysLearned, 1);
  // the same proof sits on the home screen after the lesson
  const html = api.canSayHtml(0);
  for (const phrase of api.LESSONS[0].phrases) assert.ok(html.includes(api.ptext(phrase, 'en')));
});

test('coming back after a break never lands the broken streak on the medal', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 6;
  state.streak = 6;
  state.daysLearned = 6;
  state.lastDoneDate = api.dateNDaysAgo(5);
  api.setState(state);
  api.startLesson(6, false, true);
  const lesson = api.getLesson();
  lesson.i = lesson.steps.findIndex(step => step.type === 'done');
  api.renderStep();
  assert.ok(!app.innerHTML.includes('ברצף'), 'the reset streak must not be shown on the finish screen');
  assert.ok(app.innerHTML.includes('חזרת אחרי 5 ימים'));
  assert.equal(api.getState().streak, 1);
  assert.equal(api.getState().daysLearned, 7, 'the day still counts on the counter that only grows');
  assert.equal(api.daysBetween('2026-1-1', '2026-1-4'), 3);
});

test('days learned migrate from old installs and only ever grow', () => {
  const migrated = runtime(new Map([['speakEnglishV1', JSON.stringify({ onboarded: true, completed: 12, streak: 4 })]]));
  assert.equal(migrated.api.getState().daysLearned, 12);
  assert.equal(migrated.api.defaults().daysLearned, 0);
  assert.equal(migrated.api.defaults().micPrimed, false);

  const seed = new Map([['speakEnglishV1', JSON.stringify({ onboarded: true, completed: 3, daysLearned: 20, progressUpdatedAt: 5 })]]);
  const { api } = runtime(seed);
  const state = api.getState();
  state.daysLearned = 9;
  api.setState(state);
  api.save();
  assert.equal(JSON.parse(seed.get('speakEnglishV1')).daysLearned, 20, 'a stale tab cannot lower the count');
});

test('a mission can wait quietly for a week and count when done the soft way', () => {
  const { api } = runtime();
  const clean = api.normalizeMissions({ 0: { done: true, soft: 1, snoozedUntil: '99' } });
  assert.equal(clean[0].soft, true);
  assert.equal(clean[0].snoozedUntil, 99);
  const merged = api.mergeMissions(
    { 0: { rehearsed: true, done: false, doneAt: 0, soft: false, snoozedUntil: 500 } },
    { 0: { rehearsed: true, done: true, doneAt: 7, soft: true, snoozedUntil: 100 } },
  );
  assert.equal(merged[0].snoozedUntil, 500);
  assert.equal(merged[0].soft, true);
  assert.equal(merged[0].done, true);

  const state = api.defaults();
  state.onboarded = true;
  state.completed = 5;
  state.missions = api.normalizeMissions({ 0: { rehearsed: true } });
  api.setState(state);
  assert.ok(api.unitCallToActionHtml().includes('לפתוח את המשימה'));
  assert.ok(api.unitCallToActionHtml().includes('snoozeMission(0)'), 'the card offers "not now"');
  api.snoozeMission(0);
  assert.equal(api.missionSnoozed(0), true);
  assert.ok(api.unitCallToActionHtml().includes('mission-snoozed'));
  assert.ok(!api.unitCallToActionHtml().includes('לפתוח את המשימה'), 'a snoozed mission folds into one quiet line');
  assert.equal(api.missionSnoozed(0, Date.now() + 8 * 864e5), false, 'and comes back after a week');

  api.completeMission(0, true);
  assert.equal(api.getState().missions[0].done, true);
  assert.equal(api.getState().missions[0].soft, true);
  api.completeMission(0, false);
  assert.equal(api.getState().missions[0].soft, false, 'the real thing later upgrades the record');
  assert.equal(api.unitCallToActionHtml(), '');
});

test('the lesson header shows how little is left instead of a stopwatch', () => {
  const { api, app } = runtime();
  assert.ok(api.estimateLessonMinutes(0) >= 5);
  assert.ok(api.estimateLessonMinutes(19) > api.estimateLessonMinutes(0), 'warm-up grows the estimate honestly');
  assert.ok(api.estimateLessonMinutes(19, true) < api.estimateLessonMinutes(19), 'a replay has no warm-up');
  const state = api.defaults();
  state.onboarded = true;
  api.setState(state);
  api.startLesson(0, false, true);
  assert.match(app.innerHTML, /id="timer"[^>]*>עוד כ־\d+ דק׳</);
  assert.doesNotMatch(app.innerHTML, /id="timer"[^>]*>\d\d:\d\d</);
  const lesson = api.getLesson();
  lesson.i = lesson.steps.length - 1;
  assert.equal(api.lessonEtaLabel(), 'כמעט סיימת');
  api.stopLessonTimers(false);
});

test('promises are concrete and no fixed fifteen minutes remain', () => {
  const manifest = fs.readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8');
  assert.ok(!html.includes('15 דקות'));
  assert.ok(!manifest.includes('15 דקות'));
  const { api, app } = runtime();
  assert.equal(api.UNIT_PROMISES.length, api.UNITS.length);
  api.UNIT_PROMISES.forEach(promise => assert.ok(promise.length > 10));
  // a fresh install boots into onboarding, which promises what unit one delivers
  assert.ok(app.innerHTML.includes(api.unitPromise(0)));
  /* But the course path itself carries no such note. Repeating the unit's aim
     above its lessons every time the unit was open was a paragraph in the way
     of the thing it described. */
  assert.doesNotMatch(html, /class="unit-promise"/,
    'the promise is made once, at the start, and never again mid-path');
  assert.ok(!app.innerHTML.includes('15 דקות ביום'));
});

/* ---- animation: soft screen changes, a word that lights up, a face that answers him ---- */

test('a newer synchronous render always wins over a pending screen transition', async () => {
  const { api, app, context } = runtime();
  assert.equal(api.viewTransitionsEnabled(), false, 'without the API every render is synchronous');
  api.hx('<div class="screen">plain</div>');
  assert.equal(app.innerHTML, '<div class="screen">plain</div>');

  const queued = [];
  context.document.startViewTransition = cb => {
    queued.push(cb);
    return { updateCallbackDone: Promise.resolve(), finished: Promise.resolve() };
  };
  assert.equal(api.viewTransitionsEnabled(), true);
  api.hx('<div class="screen">A</div>');
  assert.equal(app.innerHTML, '<div class="screen">plain</div>', 'a transition applies its swap a frame later');
  api.h('<div class="screen">B</div>');
  queued.splice(0).forEach(cb => cb());
  assert.equal(app.innerHTML, '<div class="screen">B</div>', 'the older transition must not overwrite the newer render');

  api.hx('<div class="screen">C</div>');
  let ran = false;
  api.afterRender(() => { ran = true; });
  queued.splice(0).forEach(cb => cb());
  assert.equal(app.innerHTML, '<div class="screen">C</div>');
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(ran, true, 'afterRender waits for the swap, then runs');
  delete context.document.startViewTransition;
});

test('the word being spoken can be found in the text he sees', () => {
  const { api } = runtime();
  const html = api.wordSpans('Good morning, Dan!');
  assert.match(html, /data-i="0"[^>]*>Good</);
  assert.match(html, /data-i="2"[^>]*>Dan!</);
  assert.doesNotMatch(api.wordSpans('Hi - there'), /data-i="1"/, 'a token with no letters gets no button');
  assert.equal(api.tokenIndexAt('Good morning, Dan!', 0), 0);
  assert.equal(api.tokenIndexAt('Good morning, Dan!', 5), 1);
  assert.equal(api.tokenIndexAt('Good morning, Dan!', 14), 2);
  assert.equal(api.tokenIndexAt('Good morning, Dan!', 7), 1, 'a boundary inside a word still means that word');
  // the voice drops a Hebrew name the caption still shows
  const aligned = api.alignTokens(['Good', 'morning!'], ['Good', 'morning,', 'Dan!']);
  assert.deepEqual(aligned.map, [0, 1]);
  assert.equal(aligned.matched, 2);
  assert.deepEqual(api.alignTokens(['What', 'is', 'this?'], ['Totally', 'different']).map, [-1, -1, -1]);
});

test('the drawn cast can smile, and the mic ring level stays in range', () => {
  const { api } = runtime();
  const svg = api.modernPersonArt({ id: 'tom', variant: 'modern-v2' }, 'listening');
  assert.match(svg, /class="mouth-shape mouth-smile"/);
  assert.match(svg, /class="mouth-shape mouth-rest"/);
  api.setMicLevel(2);
  assert.equal(api.getMicLevel(), 1);
  api.setMicLevel(-1);
  assert.equal(api.getMicLevel(), 0);
  api.startMicMeter();
  assert.ok(api.getMicLevel() > 0, 'listening starts with a faint ring');
  api.stopMicMeter();
  assert.equal(api.getMicLevel(), 0, 'the ring goes away with the recording');
});

test('the mouth closes on m/b/p and bites the lip on f/v, in word order', () => {
  const { api } = runtime();
  // joined rather than compared as arrays: the timeline is built inside the vm
  // sandbox, so its arrays carry that realm's prototype and deepStrictEqual
  // rejects them against a literal declared out here
  const shapes = text => api.buildMouthTimeline(text, 1).filter(f => f.sy !== undefined).map(f => f.id).join(' ');

  assert.equal(api.visemeFor('b'), api.VISEMES.m, 'b shares the lips-together shape');
  assert.equal(api.visemeFor('p'), api.VISEMES.m, 'p shares the lips-together shape');
  assert.equal(api.visemeFor('v'), api.VISEMES.f, 'v shares the teeth-on-lip shape');
  assert.equal(api.visemeFor('a'), api.VISEMES.a, 'vowels still resolve to their own shape');
  assert.equal(api.visemeFor('zzz'), api.VISEMES.default, 'unreadable consonants stay neutral');

  // 0.5 is the height of the neutral rest frame the timeline inserts
  assert.ok(api.VISEMES.m.sy < 0.5, 'the m/b/p shape is tighter than a resting mouth');
  assert.ok(api.VISEMES.f.sy < api.VISEMES.a.sy, 'the f/v bite is narrower than an open vowel');

  // the closure has to land where the word puts it, not merely be present.
  // every utterance also ends on a rest, which is why the vowel-final words
  // below close twice: once relaxing out of the vowel, once at the end.
  assert.equal(shapes('bag'), 'm a rest rest', 'bag opens from a closed b');
  assert.equal(shapes('find'), 'f i rest rest', 'find starts on the lip bite');
  assert.equal(shapes('problem'), 'm o m e m rest', 'problem closes three times');

  // a consonant slot is shorter than a vowel slot, and never doubles a close
  const tl = api.buildMouthTimeline('bag', 1).filter(f => f.sy !== undefined);
  assert.ok(tl[1].t - tl[0].t < tl[2].t - tl[1].t, 'the b is quicker than the a it opens into');
  assert.ok(!shapes('problem').includes('m rest m'), 'a real closure replaces the filler rest');
});

test('only the beats that mean a change of distance make the figure travel', () => {
  const { api } = runtime();
  const travelOf = preset => {
    const cls = api.stageDirectionClasses(api.stageDirectionModel({ id: 'x', preset }));
    return cls.match(/stage-travel-([a-z]+)/)?.[1] || null;
  };
  assert.equal(travelOf('encourage'), 'in', 'encouraging steps toward the learner');
  assert.equal(travelOf('surprise'), 'back', 'surprise backs off');
  assert.equal(travelOf('consider'), 'aside', 'thinking turns away');
  assert.equal(travelOf('farewell'), 'out', 'a goodbye eases out');
  assert.equal(travelOf('agree'), null, 'an ordinary beat stays put');
  assert.equal(travelOf('curious'), null, 'an ordinary beat stays put');

  const all = Object.keys(api.STAGE_DIRECTION_PRESETS);
  const moving = all.filter(p => api.STAGE_DIRECTION_PRESETS[p].travel);
  assert.ok(moving.length < all.length / 2,
    `movement only reads as movement while most beats are still (${moving.length}/${all.length} travel)`);
  for (const p of moving)
    assert.match(api.STAGE_DIRECTION_PRESETS[p].travel, /^(in|back|aside|out)$/, `${p} uses a defined travel`);

  // an absent travel must not emit a bare class the [class*=] step cue matches
  assert.doesNotMatch(api.stageDirectionClasses(api.stageDirectionModel({ id: 'x', preset: 'agree' })), /stage-travel-/);
});

test('two sentences of one turn are paced like a speaker, not like a stalled recording', () => {
  runtime();
  // The pair keeps the first sentence on screen above the second, so nothing
  // is whisked away and there is nothing to hold the conversation for. Paying
  // the full translation reading window here left the character standing
  // silent for 2.2s between two halves of one thought.
  assert.match(html, /const translationReadingDelay=runsOn\s*\?\s*Math\.max\(700,Math\.min\(1200,translatedLength\*22\)\)/,
    'mid-turn the reading window shrinks to a speaker\'s scale instead of holding the conversation');
  assert.match(html, /const readingDelay=runsOn\s*\?\s*\(voiced\?600:/,
    "the gap between two sentences of one turn is a speaker's beat, not a wait");
  assert.match(html, /const runsOn=L\.steps\[L\.i\+1\]\?\.type==='listen'&&!!L\.steps\[L\.i\+1\]\.line/,
    'a run-on needs a real next line, matching what the paired caption requires');
  // the end of the turn still gets its full reading window before answering
  assert.match(html, /:\s*Math\.max\(1900,Math\.min\(3400,spokenEn\.length\*38\)\)/,
    'the last sentence of a turn keeps the time to read before the learner answers');
});

/* ---- the conversation: a person who is present ----
   The cast always acted out its own lines well. What it never did was react to
   the learner, or look at them; and the learner had no body in the room at
   all. These lock down the live layer that answers both. */

function fakeStageDom(context) {
  const make = cls => ({
    className: cls,
    style: { props: {}, setProperty(n, v) { this.props[n] = v; }, getPropertyValue(n) { return this.props[n] || ''; } },
    classList: {
      set: new Set(cls.split(' ')),
      add(...c) { c.forEach(x => this.set.add(x)); },
      remove(...c) { c.forEach(x => this.set.delete(x)); },
      contains(c) { return this.set.has(c); },
      toggle(c, on) { if (on === undefined ? !this.set.has(c) : on) this.set.add(c); else this.set.delete(c); },
    },
  });
  const avatar = make('stage-avatar'), art = make('person-art modern-v2'), hint = make('mic-hint');
  hint.textContent = '';
  context.document.querySelectorAll = sel =>
    /stage-avatar/.test(sel) && /person-art/.test(sel) ? [avatar, art]
    : /stage-avatar/.test(sel) ? [avatar]
    : /person-art/.test(sel) ? [art]
    : [];
  context.document.querySelector = sel => /stage-avatar/.test(sel) ? avatar : null;
  context.document.getElementById = id => id === 'micHint' ? hint : null;
  return { avatar, art, hint };
}

test('the character looks at the learner, and the look is driven by their turn not the script', () => {
  const { api, context } = runtime();
  const { avatar } = fakeStageDom(context);
  // every cue the conversation can be in has somewhere to look
  for (const cue of ['speaking', 'listening', 'heard', 'thinking', 'incoming', 'choosing'])
    assert.ok(api.STAGE_GAZE[api.STAGE_GAZE_FOR_CUE[cue]], `${cue} has a gaze`);
  // the learner's turn is the one that holds their eye
  assert.equal(api.STAGE_GAZE_FOR_CUE.listening, 'attend');
  assert.equal(api.STAGE_GAZE[api.STAGE_GAZE_FOR_CUE.listening].x, 0, 'straight at them');
  assert.equal(api.STAGE_GAZE[api.STAGE_GAZE_FOR_CUE.listening].y, 0);
  assert.ok(api.STAGE_GAZE.attend.jitter < api.STAGE_GAZE.speak.jitter,
    'eye contact is steadier than the drift of someone talking');

  api.setStageGaze('attend');
  const x = avatar.style.getPropertyValue('--gaze-x');
  assert.ok(x.endsWith('px') && Math.abs(parseFloat(x)) <= api.STAGE_GAZE.attend.jitter + .01,
    `attention stays near the centre, got ${x}`);
  api.setStageGaze('think');
  assert.ok(parseFloat(avatar.style.getPropertyValue('--gaze-y')) < 0, 'thinking looks up and away');
  api.setStageGaze('nonsense-mode');
  assert.ok(avatar.style.getPropertyValue('--gaze-x'), 'an unknown mode still lands somewhere sane');
  api.stopStageGaze();

  // it composes with the authored gaze presets instead of overwriting them
  assert.match(html, /\.stage-avatar \.person-art \.pupils\{translate:var\(--gaze-x,0px\) var\(--gaze-y,0px\)/,
    'the live layer uses translate, which is its own property');
  assert.match(html, /\.stage-gaze-up \.person-art \.pupils\{transform:/,
    'so the authored presets keep their transform');
});

test('the figure answers the learner\'s voice, and waits for them when they go quiet', () => {
  const { api, context } = runtime();
  const { art, hint } = fakeStageDom(context);

  api.setMicLevel(.2);
  assert.equal(art.classList.contains('hearing'), false, 'an open microphone alone is not being heard');
  api.setMicLevel(.8);
  assert.equal(art.classList.contains('hearing'), true, 'sound arriving is');
  api.setMicLevel(.1);
  assert.equal(art.classList.contains('hearing'), false, 'and it settles when they stop');

  api.stageEncourage();
  api.stopStageGaze();
  assert.equal(art.classList.contains('encouraging'), true, 'going quiet earns a nod, not a stare');
  assert.match(hint.textContent, /מקשיבה/, 'and the hint softens with it');
  assert.match(html, /@keyframes headNodTwice\{/, 'the nod is a real, bounded gesture');

  // saying something cancels the wait
  api.startMicMeter();
  api.bumpMicLevel(.9);
  api.stopMicMeter();
  api.stopStageGaze();
  assert.equal(api.getMicLevel(), 0);
});


test('each conversation partner asks for a voice of their own', () => {
  const calls = [];
  const voices = [
    { name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' },
    { name: 'Aaron', lang: 'en-US' }, { name: 'Carmit', lang: 'he-IL' },
  ];
  const speechSynthesis = {
    speaking: false, pending: false, getVoices: () => voices, cancel() {}, resume() {},
    speak(utterance) { calls.push(utterance); utterance.onstart?.(); utterance.onend?.(); },
  };
  class Utterance { constructor(text) { this.text = text; this.rate = 1; this.pitch = 1; this.volume = 1; } }
  const { api } = runtime(new Map(), { speechSynthesis, SpeechSynthesisUtterance: Utterance });
  const state = api.defaults();
  state.onboarded = true;
  state.slowSpeech = false;
  api.setState(state);
  assert.equal(api.pickVoice('f').name, 'Samantha');
  assert.equal(api.pickVoice('m').name, 'Aaron');
  assert.equal(api.pickVoice('m', 'gb').name, 'Daniel', 'Ben from London asks for a British voice first');
  assert.equal(api.pickVoice().name, 'Samantha', 'the plain default is unchanged');
  const maya = api.characterVoice(api.PRACTICE_CAST.maya);
  const sam = api.characterVoice(api.PRACTICE_CAST.sam);
  const ben = api.characterVoice(api.PRACTICE_CAST.ben);
  assert.equal(maya.gender, 'f');
  assert.equal(sam.gender, 'm');
  assert.equal(ben.accent, 'gb');
  assert.ok(maya.pitch > sam.pitch, 'a girl and a grown neighbour do not share a pitch');
  api.speak('Hello', null, maya);
  api.speak('Hello', null, sam);
  api.speak('Hello', null, ben);
  api.speak('Hello');
  assert.equal(calls[0].voice.name, 'Samantha');
  assert.equal(calls[0].pitch, maya.pitch);
  assert.equal(calls[1].voice.name, 'Aaron');
  assert.equal(calls[1].pitch, sam.pitch);
  assert.equal(calls[2].voice.name, 'Daniel');
  assert.equal(calls[3].pitch, 1, 'the learner\'s own lines keep the plain voice');
  assert.equal(calls[3].rate, 1);
  const profiles = Object.values(api.PRACTICE_CAST).map(c => JSON.stringify(api.characterVoice(c)));
  assert.equal(new Set(profiles).size, profiles.length, 'no two people sound identical');
  for (const gender of ['f', 'm']) for (const accent of ['us', 'gb']) {
    assert.ok(api.VOICE_PREFS[gender][accent].length > 3, `${gender}/${accent} needs a real preference list`);
  }
  // an engine that only names its voices by role still finds a match
  voices.splice(0, voices.length, { name: 'en-us-x-sfg#male_1-local', lang: 'en-US' }, { name: 'en-us-x-sfg#female_2-local', lang: 'en-US' });
  assert.equal(api.pickVoice('f').name, 'en-us-x-sfg#female_2-local');
  assert.equal(api.pickVoice('m').name, 'en-us-x-sfg#male_1-local');
  api.stopLessonTimers(false);
});

test('a free conversation counts turns instead of minutes', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 12;
  api.setState(state);
  api.startPractice();
  const lesson = api.getLesson();
  try {
    const total = lesson.practiceRoundCount;
    assert.ok(total >= 4);
    assert.equal(api.lessonEtaLabel(), `תור 1 מתוך ${total}`);
    assert.match(app.innerHTML, new RegExp(`id="timer"[^>]*>תור 1 מתוך ${total}<`));
    api.next();
    lesson.stepTransitioning = false;
    lesson.steps[lesson.i].arrived = true;
    api.renderStep();
    assert.equal(api.practiceTurnLabel(), `תור 1 מתוך ${total}`);
    assert.match(app.innerHTML, /class="conversation-composer slim"/, 'while the character talks the answer area steps aside');
    api.next();
    lesson.stepTransitioning = false;
    assert.equal(lesson.steps[lesson.i].type, 'branchChoice');
    assert.doesNotMatch(app.innerHTML, /conversation-composer slim/, 'the choices get the full answer area back');
    assert.match(app.innerHTML, /מה תענה\?/);
    lesson.i = lesson.steps.length - 1;
    assert.equal(api.practiceTurnLabel(), `תור ${total} מתוך ${total}`);
  } finally {
    api.stopLessonTimers(false);
  }
});

test('small sounds are on by default and off with one switch, and never crash without audio', () => {
  const { api } = runtime();
  assert.equal(api.defaults().uiSounds, true);
  const muted = runtime(new Map([['speakEnglishV1', JSON.stringify({ onboarded: true, completed: 3, uiSounds: false })]]));
  assert.equal(muted.api.getState().uiSounds, false);
  const old = runtime(new Map([['speakEnglishV1', JSON.stringify({ onboarded: true, completed: 3 })]]));
  assert.equal(old.api.getState().uiSounds, true, 'an older install gets the sounds without being asked');
  // no AudioContext in this runtime: every call is a quiet no-op
  api.unlockUiAudio();
  api.playUiSound('pass');
  api.playUiSound('arrive');
  api.fitStage();
});

test('every conversation card carries its own moving picture of what the story is about', () => {
  const { api, app } = runtime();
  const stories = [...api.PRACTICE_STORIES];
  const bodies = new Map();
  stories.forEach((story, i) => {
    const art = api.storyThumbArt(story);
    assert.ok(art, story.id + ' has a thumbnail');
    assert.ok(/<(path|circle|rect|ellipse)\b/.test(art.body), story.id + ' is drawn, not empty');
    assert.ok(Array.isArray([...art.tint]) && art.tint.length === 2, story.id + ' has a tile tint');
    const html = api.storyThumbHtml(story, i);
    assert.match(html, /^<svg class="story-thumb-art [^"]*m-[a-z]+"/, story.id + ' is an svg with a motion class');
    assert.match(html, /viewBox="0 0 160 150"/);
    assert.ok(!html.includes('stage-prop'), story.id + ' must not inherit the stage positioning');
    if (story.stageProp?.kind) assert.ok(html.includes('physical-' + story.stageProp.kind), story.id + ' reuses its stage object');
    bodies.set(art.body, story.id);
  });
  assert.equal(bodies.size, stories.length, 'no two stories share a picture');
  // the picker puts the picture and the state badge on every card
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 12;
  state.practiceStoryDone = ['lost_bag'];
  api.setState(state);
  api.renderPracticePicker();
  const cards = app.innerHTML.match(/<button type="button" class="story-card/g) || [];
  const thumbs = app.innerHTML.match(/<span class="story-thumb" style="--thumb-a:#[0-9a-f]{6};--thumb-b:#[0-9a-f]{6}"/g) || [];
  assert.equal(cards.length, stories.length);
  assert.equal(thumbs.length, stories.length, 'every card has a tinted picture tile');
  assert.equal((app.innerHTML.match(/<svg class="story-thumb-art /g) || []).length, stories.length);
  assert.match(app.innerHTML, /class="story-card done"[\s\S]*?<span class="story-mark">✓</);
  assert.match(app.innerHTML, /class="story-card locked"[\s\S]*?<span class="story-mark">🔒</);
  assert.match(app.innerHTML, /class="story-card fresh"[\s\S]*?<span class="story-mark">✨</);
  // the shelf does not move in lockstep
  const delays = new Set(app.innerHTML.match(/animation-delay:-?[\d.]+s/g));
  assert.ok(delays.size >= 8, 'cards start their loops at different moments, got ' + delays.size);
  // the CSS has a loop for every motion the drawings ask for
  const css = html;
  const motions = new Set([...Object.values(api.STORY_THUMB_PHYSICAL).map(m => m.motion), ...Object.values(api.STORY_THUMB_ART).map(a => a.motion)]);
  motions.forEach(m => { if (m !== 'none') assert.ok(css.includes('.story-thumb svg.m-' + m + '{animation:'), 'motion ' + m + ' has a loop'); });
  assert.ok(css.includes('.story-thumb svg.m-none{animation:none}'));
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
  assert.ok(reduced && reduced[0].includes('.story-thumb svg.story-thumb-art,.story-thumb .story-thumb-art *{animation:none!important}'), 'the loops stop under reduced motion');
});

test('the learner can choose a conversation, and the surprise draw respects the choice', () => {
  const { api, app } = runtime();
  const state = api.defaults();
  state.onboarded = true;
  state.completed = 12;
  api.setState(state);
  const groups = api.practiceStoryCards();
  const cards = groups.flatMap(g => g.stories);
  assert.equal(cards.length, api.PRACTICE_STORIES.length, 'every story appears exactly once');
  assert.equal(new Set(cards.map(c => c.story.id)).size, api.PRACTICE_STORIES.length);
  const open = cards.filter(c => c.available).map(c => c.story.id).sort();
  assert.deepEqual(open, api.availablePracticeStories(12).map(s => s.id).sort());
  assert.ok(groups[0].stories.some(s => s.available), 'people with open stories come first');
  assert.ok(groups.every(g => g.character && g.character.look), 'every group is a drawn person');
  api.renderHome();
  assert.match(app.innerHTML, /onclick="renderPracticePicker\(\)"/, 'the home button opens the picker');
  api.renderPracticePicker();
  assert.match(app.innerHTML, /onclick="startPractice\(\)"/, 'the surprise draw is still one tap away');
  assert.match(app.innerHTML, /onclick="startPractice\('lost_bag'\)"/);
  assert.match(app.innerHTML, /נפתח אחרי שיעור 29/, 'a locked story says which lesson opens it');
  assert.match(app.innerHTML, /class="cast-portrait motion-paused/, 'a drawn face, not an emoji');
  assert.equal(api.startPractice('maya_rainy_beach'), false, 'a locked story does not open');
  assert.equal(api.getLesson(), null);
  assert.equal(api.startPractice('lost_bag'), true);
  const lesson = api.getLesson();
  try {
    assert.equal(lesson.practiceStoryId, 'lost_bag');
    assert.ok(api.getState().practiceStorySeen.includes('lost_bag'), 'a chosen story is dealt out of the shuffle bag');
    assert.match(app.innerHTML, /class="cast-portrait motion-paused portrait/, 'the intro shows the drawn person');
    lesson.chat = [
      { who: 'app', line: { en: 'Hi', he: 'היי', tl: 'הַיי' } },
      { who: 'you', line: { en: 'Yes, no problem', he: 'כן, אין בעיה', tl: 'יֶס, נוֹ פְּרוֹבְּלֶם' } },
    ];
    lesson.i = lesson.steps.length - 1;
    api.renderStep();
    assert.ok(api.getState().practiceStoryDone.includes('lost_bag'), 'a finished story is remembered as done');
    assert.match(app.innerHTML, /מה אמרת בשיחה/);
    assert.match(app.innerHTML, /Yes, no problem/);
    assert.match(app.innerHTML, /אמרת משפט אחד/);
    assert.match(app.innerHTML, /onclick="renderPracticePicker\(\)"/);
    assert.match(app.innerHTML, /class="finish-portrait"/);
  } finally {
    if (api.getLesson()) api.stopLessonTimers(false);
  }
  assert.equal(api.getLesson(), null, 'the finish screen closes the session');
  const after = api.practiceStoryCards().flatMap(g => g.stories);
  assert.ok(after.find(c => c.story.id === 'lost_bag').done);
  assert.equal(after.filter(c => c.done).length, 1);
  // the done list survives a save and load, and an old install starts empty
  const reloaded = runtime(new Map([['speakEnglishV1', JSON.stringify({ ...api.getState(), session: null })]]));
  assert.deepEqual([...reloaded.api.getState().practiceStoryDone], ['lost_bag']);
  assert.equal(api.defaults().practiceStoryDone.length, 0);
});

test('portraits crop the drawn head and fall back to the emoji for a look-less character', () => {
  const { api } = runtime();
  const html = api.castPortraitHtml(api.PRACTICE_CAST.ben, 54);
  assert.match(html, /class="cast-portrait motion-paused /);
  assert.match(html, /--size:54px/);
  assert.match(html, /class="person-art modern-v2/);
  assert.doesNotMatch(html, /voicing/, 'a still portrait never mouths words');
  const emoji = api.castPortraitHtml({ name: 'x', avatar: '🙂', color: '#fff' }, 40);
  assert.match(emoji, /cast-portrait-emoji/);
  assert.ok(emoji.includes('🙂'));
});

/* ---- the cast and the places they stand in ----
   These six came from a second, stale copy of this suite that sat in the repo
   root, last touched long before the tests moved here. Everything else in that
   file was already covered here; these were not, and they still pass, so they
   were carried over before it was deleted. They are contract tests: every
   character in every stage state, and every backdrop, checked as a set rather
   than one at a time. */
test('all seven conversation characters keep the modern layered SVG contract', () => {
  const { api } = runtime();
  const castIds = ['tom', 'maya', 'sam', 'alex', 'nina', 'ben', 'dana'];
  const stageStates = ['idle', 'waiting', 'speaking', 'listening', 'reacting', 'thinking'];
  const singleHooks = ['figure', 'head', 'eyes', 'pupils', 'brows', 'eyelids', 'cheeks', 'arm-l', 'arm-r'];
  const mouthShapes = ['mouth-rest', 'mouth-a', 'mouth-e', 'mouth-o', 'mouth-u', 'mouth-m', 'mouth-f', 'mouth-smile'];

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
      assert.equal(classCount(svg, 'mouth-shape'), mouthShapes.length, `${id}/${stageState} needs five vowel visemes, the m/b/p and f/v consonants, and a smile`);
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

/* ---- the check and the daily drill ----
   The app had always recorded how well every phrase was going and then read
   that record in one place: the six warm-up cards at the head of a new
   lesson. So it stopped being used on the day the lessons ran out. These lock
   down the scheduler that now spends it, and the two doors onto it. */

// answer the question the run is currently on; `right` decides correctly or not
function answerReview(api, right) {
  const run = api.getReview();
  const q = run.questions[run.i];
  if (q.shape === 'say') {
    api.revealReviewSay();
    api.answerReviewSay(right);
    return q;
  }
  const i = right ? q.options.indexOf(q.correct) : q.options.findIndex(o => o !== q.correct);
  api.answerReviewChoice(i);
  return q;
}
/* Run a whole check or drill to its end; `decide(n)` answers question n. A
   choice question schedules its advance on a real timer, so rather than make
   every test wait out eight readable pauses, this drives the same advance the
   timer would. One test below waits for the real timer instead. */
function runReview(api, decide) {
  const shapes = [], asked = [];
  for (let n = 0; api.getReview() && api.getReview().i < api.getReview().questions.length; n++) {
    assert.ok(n < 40, 'the run has to terminate');
    const before = api.getReview().i;
    shapes.push(api.getReview().questions[before].shape);
    asked.push(answerReview(api, decide(n)));
    if (api.getReview() && api.getReview().i === before) api.advanceReview();
  }
  return { shapes, asked };
}
function learnerAt(api, completed, extra = {}) {
  const state = api.defaults();
  state.onboarded = true;
  state.completed = completed;
  Object.assign(state, extra);
  api.setState(state);
  return state;
}

test('a phrase rests longer the better it is known, and an untested one is asked first', () => {
  const { api } = runtime();
  const hours = n => n * 36e5;

  // each rung of the ladder doubles the rest, and the doubling stops
  const rest = level => api.reviewRestMs({ level });
  assert.equal(rest(1), rest(0) * 2);
  assert.equal(rest(3), rest(0) * 8);
  assert.equal(rest(99), rest(api.REVIEW_MAX_LEVEL), 'even the best-known phrase comes back eventually');

  // dueness is "how far past its rest", so 1 is due now
  const now = Date.now();
  assert.equal(api.reviewDueness({ level: 0, lastPracticedAt: now - rest(0) }, now), 1);
  assert.ok(api.reviewDueness({ level: 0, lastPracticedAt: now }, now) < 0.01, 'just practised is not due');

  /* An untested phrase outranks anything in normal rotation but stays finite,
     so a phrase the learner keeps getting wrong and has not seen for weeks —
     known to be broken, not merely unknown — is still asked before it. */
  const unseen = api.reviewDueness({}, now);
  assert.equal(unseen, api.REVIEW_UNSEEN_DUENESS);
  assert.ok(Number.isFinite(unseen), 'Infinity here would make the sort comparator NaN');
  assert.ok(api.reviewDueness({ level: 4, lastPracticedAt: now - hours(24 * 7) }, now) < unseen,
    'a well-known phrase a week old is not more urgent than one never tested');
  assert.ok(api.reviewDueness({ level: 0, lastPracticedAt: now - hours(24 * 30) }, now) > unseen,
    'but one at the bottom of the ladder and unseen for a month is');
});

test('the questions come from what is closest to being forgotten, not from what is handy', () => {
  const { api } = runtime();
  const state = learnerAt(api, 12);
  const now = Date.now();
  // three phrases known cold and practised just now, one going badly for weeks
  for (const id of ['0:0', '0:1', '0:2'])
    state.reviewMeta[id] = { successes: 6, lapses: 0, hints: 0, lastPracticedAt: now, hard: false };
  state.reviewMeta['3:3'] = { successes: 1, lapses: 4, hints: 2, lastPracticedAt: now - 30 * 864e5, hard: true };

  const picked = api.reviewSelect(api.reviewPool(null), 8);
  const ids = picked.map(x => x.id);
  assert.equal(ids[0], '3:3', 'the phrase in real trouble is asked first');
  assert.ok(!ids.some(id => ['0:0', '0:1', '0:2'].includes(id)),
    'and the three he plainly knows are left out of an eight-question run');
  assert.equal(new Set(ids).size, ids.length, 'no phrase is asked twice in one run');

  /* Ten questions from one lesson would be a test of that lesson, not of the
     unit, so the same lesson never comes up twice running while another has
     anything left to offer. */
  assert.ok(ids.every((id, i) => i === 0 || id.split(':')[0] !== ids[i - 1].split(':')[0]),
    'consecutive questions come from different lessons');
});

test('a drill asks eight, rotates its three shapes, and records every answer', () => {
  const seed = new Map();
  const { api } = runtime(seed);
  learnerAt(api, 10);
  api.startDailyDrill();
  assert.equal(api.getReview().questions.length, api.DRILL_LENGTH);

  const { shapes, asked } = runReview(api, () => true);
  assert.equal(shapes.length, api.DRILL_LENGTH);
  assert.deepEqual(shapes.slice(0, 3), ['pick', 'hear', 'say'],
    'recognising, hearing and saying — no shape twice running');

  /* The point of the drill is that it writes to the same record the lessons
     write to, so a phrase drilled today rests longer tomorrow. */
  const meta = api.getState().reviewMeta;
  for (const q of asked) assert.ok((meta[q.id].successes || 0) >= 1, `${q.id} recorded a success`);
  assert.ok(api.drilledToday(), 'and the day is marked, so the home card can say so');
  assert.equal(api.getState().drillCount, 1);
});

test('a phrase missed in a drill goes back on the hard list for the next warm-up', () => {
  const { api } = runtime();
  learnerAt(api, 10);
  api.startDailyDrill();
  const { asked } = runReview(api, () => false);

  const state = api.getState();
  for (const q of asked) {
    assert.ok(state.hard.includes(q.id), `${q.id} is marked hard`);
    assert.ok((state.reviewMeta[q.id].lapses || 0) >= 1, `${q.id} recorded the lapse`);
    assert.ok(!api.reviewSecure(state.reviewMeta[q.id]), 'and is certainly not counted as secure');
  }
});

test('the check draws only from its own unit, and passing marks that unit for good', () => {
  const seed = new Map();
  const { api } = runtime(seed);
  learnerAt(api, 10);

  api.startUnitCheck(1);
  const run = api.getReview();
  assert.equal(run.questions.length, api.CHECK_LENGTH);
  assert.ok(run.questions.every(q => q.item.li >= 5 && q.item.li < 10),
    'every question belongs to unit 2, whose lessons are 6 to 10');

  // one short of the pass mark is not a pass
  runReview(api, n => n < api.CHECK_PASS - 1);
  assert.equal(api.unitChecked(1), false, 'seven out of ten leaves the unit unmarked');

  // the retry stands on its own, and the mark it earns is permanent
  api.startUnitCheck(1);
  runReview(api, () => true);
  assert.equal(api.unitChecked(1), true);
  assert.equal(api.checkRow(1).best, api.CHECK_LENGTH);

  // a worse later attempt cannot take the mark away
  api.startUnitCheck(1);
  runReview(api, () => false);
  assert.equal(api.unitChecked(1), true, 'a bad day does not unmark a unit');
  assert.equal(api.checkRow(1).best, api.CHECK_LENGTH, 'and the best score stands');
});

test('the mark and the drill survive a reload, a merge, and an install that never had them', () => {
  // an install saved before either feature existed
  const old = new Map([['speakEnglishV1', JSON.stringify({
    onboarded: true, completed: 12, streak: 5,
    hard: ['1:2'], reviewMeta: { '1:2': { successes: 1, lapses: 2, lastPracticedAt: 1, hard: true } },
  })]]);
  const { api } = runtime(old);
  const state = api.getState();
  assert.equal(state.completed, 12, 'course progress is untouched');
  assert.ok(state.hard.includes('1:2'), 'and so is everything already measured');
  assert.equal(Object.keys(state.checks).length, 6, 'a row appears for every unit');
  assert.ok(Object.values(state.checks).every(c => !c.passed), 'none of them claiming a pass');
  assert.equal(api.drilledToday(), false);

  // nonsense in either field must not take the app down with it
  const junk = runtime(new Map([['speakEnglishV1', JSON.stringify({
    onboarded: true, completed: 10, checks: 'not an object', drillDate: 42, drillCount: 'x',
  })]]));
  assert.equal(Object.keys(junk.api.getState().checks).length, 6);
  assert.equal(junk.api.getState().drillDate, '');
  assert.equal(junk.api.getState().drillCount, 0);

  /* Two tabs: a pass earned in either is a fact about the learner, so it
     survives the merge from both directions and the best score only climbs. */
  const merged = api.mergeChecks(
    { 0: { passed: true, best: 9, total: 10, at: 100 }, 1: { passed: false, best: 3, total: 10, at: 50 } },
    { 0: { passed: false, best: 0, total: 0, at: 0 }, 1: { passed: true, best: 8, total: 10, at: 200 } },
  );
  assert.equal(merged[0].passed, true, 'the pass only the stored copy knew about');
  assert.equal(merged[1].passed, true, 'and the one only this tab knew about');
  assert.equal(merged[0].best, 9);

  // and a check taken now is still there on the next load of the same storage
  const seed = new Map();
  const a = runtime(seed);
  learnerAt(a.api, 10);
  a.api.startUnitCheck(0);
  runReview(a.api, () => true);
  assert.equal(a.api.unitChecked(0), true);
  assert.equal(runtime(seed).api.unitChecked(0), true, 'reopening the app keeps the mark');
});

test('after the last lesson there is still something to open the app for', () => {
  const { api, app } = runtime();
  learnerAt(api, api.LESSONS.length);
  api.renderHome();
  const html = app.innerHTML;

  /* This is the case the warm-up could never cover: it only ever ran at the
     head of a NEW lesson, and after the last one every lesson is a replay. */
  assert.match(html, /onclick="startDailyDrill\(\)"/, 'the drill is still offered');
  assert.equal((html.match(/class="unit-check[ "]/g) || []).length, 6,
    'and every one of the six finished units can still be checked');

  const drill = api.reviewPool(null);
  assert.equal(drill.length, 150, 'with the whole course to draw on');
  assert.equal(api.reviewSelect(drill, api.DRILL_LENGTH).length, api.DRILL_LENGTH);
});

test('the secure count means "could say it right now", so it moves', () => {
  const { api } = runtime();
  const now = Date.now();
  const fresh = extra => ({ level: 5, hard: false, lastPracticedAt: now, ...extra });

  assert.equal(api.reviewSecure(fresh(), now), true);
  assert.equal(api.reviewSecure(fresh({ hard: true }), now), false,
    'a phrase still marked hard is not secure, however high it has climbed');
  assert.equal(api.reviewSecure(fresh({ level: 1 }), now), false,
    'one rung up is not knowing it');
  assert.equal(api.reviewSecure({}, now), false);
  assert.equal(api.reviewSecure(fresh({ level: api.REVIEW_SECURE_LEVEL }), now), true);

  /* The part strength alone could never express. A phrase answered right five
     times and then left for three months is not one he can say today, and a
     count that claimed otherwise would sit at its maximum forever and tell
     him nothing. It has to decay on its own — and come back when he drills. */
  const stale = fresh({ lastPracticedAt: now - 200 * 864e5 });
  assert.equal(api.reviewSecure(stale, now), false, 'known once, but long overdue');
  assert.equal(api.reviewSecure({ ...stale, lastPracticedAt: now }, now), true,
    'and practising it is what puts it back');
});

test('the secure count is neither always nothing nor always everything', () => {
  const { api } = runtime();
  const state = learnerAt(api, 10);
  const now = Date.now();

  // nothing practised yet: the app cannot claim he holds any of it
  assert.equal(api.reviewPool(null).filter(x => api.reviewSecure(state.reviewMeta[x.id], now)).length, 0);

  /* What ten lessons actually leave behind — a speak step for every phrase, a
     challenge for some, warm-ups for the older ones. This is the case that
     matters: a count that read 50 of 50 here would be decoration. */
  for (let li = 0; li < 10; li++) {
    for (let pi = 0; pi < 5; pi++) {
      const id = `${li}:${pi}`;
      api.notePractice(id, 'pass');
      if (pi < 3) api.notePractice(id, 'pass');
      for (let w = 0; w < Math.max(0, Math.min(3, 9 - li)); w++) api.notePractice(id, 'pass');
    }
  }
  const meta = api.getState().reviewMeta;
  const pool = api.reviewPool(null);
  const justPractised = pool.filter(x => api.reviewSecure(meta[x.id], now)).length;
  assert.ok(justPractised > pool.length * 0.8, 'straight after the lessons he does hold nearly all of it');

  // three weeks later, without opening the app, he plainly does not
  const later = now + 21 * 864e5;
  const lapsed = pool.filter(x => api.reviewSecure(meta[x.id], later)).length;
  assert.ok(lapsed < justPractised, `the count falls away on its own (${justPractised} to ${lapsed})`);
  assert.ok(lapsed > 0, 'but the best-known phrases are still there');
});


test('the pause after an answer advances the run it belongs to, and no other', async () => {
  const { api } = runtime();
  learnerAt(api, 10);

  // the ordinary path: answering really does move on by itself
  api.startDailyDrill();
  const first = api.getReview();
  const q = first.questions[0];
  api.answerReviewChoice(q.options.indexOf(q.correct));
  assert.equal(api.getReview().i, 0, 'the right answer stays up for a beat');
  await new Promise(r => setTimeout(r, api.REVIEW_PAUSE_PASS + 250));
  assert.equal(api.getReview().i, 1, 'and then the run advances on its own');

  /* Leaving during that pause and immediately starting another drill used to
     hand the new run the old run's timer, which stepped it forward a question
     the learner never answered. */
  const next = api.getReview().questions[1];
  api.answerReviewChoice(next.options.indexOf(next.correct));
  api.exitReviewRun();
  await Promise.resolve();                       // let the confirm sheet resolve
  api.startDailyDrill();
  const second = api.getReview();
  assert.notEqual(second, first, 'a genuinely new run');
  await new Promise(r => setTimeout(r, api.REVIEW_PAUSE_PASS + 250));
  assert.equal(api.getReview(), second, 'still on the new run');
  assert.equal(api.getReview().i, 0, 'which is untouched by the abandoned run\'s pending advance');
});

test('coming back after a long gap shows the count climbing again', () => {
  const { api, app } = runtime();
  const lessonCount = api.LESSONS.length;
  learnerAt(api, lessonCount);
  // the whole course played through, then forty days of nothing
  for (let li = 0; li < lessonCount; li++) {
    for (let pi = 0; pi < 5; pi++) {
      api.notePractice(`${li}:${pi}`, 'pass');
      if (pi < 3) api.notePractice(`${li}:${pi}`, 'pass');
    }
  }
  const meta = api.getState().reviewMeta;
  for (const id of Object.keys(meta)) meta[id].lastPracticedAt = Date.now() - 40 * 864e5;

  const pool = api.reviewPool(null);
  const secure = () => pool.filter(x => api.reviewSecure(api.getState().reviewMeta[x.id])).length;
  const before = secure();
  assert.ok(before < pool.length * 0.2, 'forty days away really has cost him most of it');

  api.startDailyDrill();
  runReview(api, () => true);
  assert.equal(secure(), before + api.DRILL_LENGTH, 'and ninety seconds of drilling buys it straight back');

  /* The number moving is the whole reward for opening the app on a day with
     no lesson in it, so the run has to end by showing that it moved. */
  assert.match(app.innerHTML, /milestone-gain/, 'the gain is on the screen');
  assert.match(app.innerHTML, new RegExp(`\\+${api.DRILL_LENGTH}`), 'and it says how much');
});

/* ---- the self-test ----
   Its own button, and deliberately not the drill with the dial turned up: a
   multiple-choice question puts the answer on the screen, so mixing the two
   keeps showing the learner what he is about to be asked to produce. Here
   nothing is shown until he has tried to say it, and a sentence he could not
   say is followed by the one word in it most likely to have been what was
   missing. Seeing that is the whole point of the mode. */

/* Drive a self-test to its end. `decide(n)` answers question n; a miss then
   opens the which-word question, and `chip` says which word to point at. */
function runSelfTest(api, decide, chip = 0) {
  let sentences = 0, picks = 0;
  while (api.getReview() && api.getReview().i < api.getReview().questions.length) {
    assert.ok(sentences < 60, 'the run has to terminate');
    api.revealReviewSay();
    api.answerReviewSay(decide(sentences));
    sentences++;
    if (api.getPicking()) { picks++; api.pickMissingWord(chip); api.finishReviewPick(); }
  }
  return { sentences, picks };
}

test('the self-test asks for production only, never recognition', () => {
  const { api } = runtime();
  learnerAt(api, 15);
  api.startSelfTest();
  const run = api.getReview();
  assert.equal(run.questions.length, api.TEST_LENGTH);
  assert.ok(run.questions.every(q => q.shape === 'say'),
    'not one question offers a list to pick the answer from');
  assert.ok(run.questions.every(q => !q.options),
    'and none of them carries options at all, so nothing can leak the answer');
  assert.equal(new Set(run.questions.map(q => q.id)).size, api.TEST_LENGTH, 'no repeats');
});




test('the self-test ends on what he could not say, not on a score', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();
  const asked = api.getReview().questions.map(q => q.item);
  runSelfTest(api, n => n >= 3);   // miss the first three

  const html = app.innerHTML;
  assert.match(html, /3 משפטים שעוד לא יצאו לך/, 'the headline counts the gaps, not the passes');
  assert.match(html, /class="test-list"/);
  for (const item of asked.slice(0, 3)) {
    // the rendered line has {name} and friends filled in, so match the fixed part
    const literal = item.p.en.split('{')[0].trim();
    assert.ok(literal && html.includes(literal), `${item.p.en} is named on the list`);
  }
  assert.match(html, /class="test-words"/, 'and the words missing from them are named too');

  /* No "in command" tally here: that is the drill's maintenance number, and
     under a list of failures it dilutes the list — after a clean run it would
     even contradict it. */
  assert.doesNotMatch(html, /בשליטה/);
  assert.equal(api.getState().testCount, 1);
});

test('a clean self-test says so without contradicting itself', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();
  runSelfTest(api, () => true);
  assert.match(app.innerHTML, /ידעת את כולם/);
  assert.doesNotMatch(app.innerHTML, /בשליטה/, 'nothing on screen argues with that');
  assert.doesNotMatch(app.innerHTML, /class="test-list"/, 'and there is no empty list of failures');
});

test('the three buttons appear together, and only once there is anything to test', () => {
  const { api, app } = runtime();

  learnerAt(api, 0);
  api.renderHome();
  assert.doesNotMatch(app.innerHTML, /home-extra/, 'nothing to drill or test before the first lesson');

  learnerAt(api, 1);
  api.renderHome();
  assert.match(app.innerHTML, /class="home-extras three"/);
  for (const call of ['startDailyDrill\\(\\)', 'startSelfTest\\(\\)', 'renderPracticePicker\\(\\)'])
    assert.match(app.innerHTML, new RegExp(`onclick="${call}"`));
  /* One lesson in there are only five phrases, so the card must not promise
     twelve of them. */
  assert.match(app.innerHTML, /5 משפטים, בלי רמזים/);

  learnerAt(api, 20);
  api.renderHome();
  assert.match(app.innerHTML, new RegExp(`${api.TEST_LENGTH} משפטים, בלי רמזים`));
});

test('every catalogued word is one the course actually teaches', () => {
  const { api } = runtime();
  const taught = new Set();
  for (const lesson of api.LESSONS)
    for (const phrase of lesson.phrases)
      for (const token of String(phrase.en).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/))
        if (token) taught.add(token);

  assert.ok(api.TEST_WORDS.length > 90, 'the bank is worth having');
  for (const [en, he, ic] of api.TEST_WORDS) {
    assert.ok(taught.has(en), `${en} appears in a phrase the course teaches`);
    assert.equal(en, en.toLowerCase(), `${en} is stored the way the matcher looks it up`);
    assert.ok(he && he.trim(), `${en} has its Hebrew`);
    assert.ok(ic && ic.trim(), `${en} has its picture`);
  }
  assert.equal(new Set(api.TEST_WORDS.map(w => w[0])).size, api.TEST_WORDS.length, 'no duplicates');
});

/* ---- saying "I knew it" has to change something ----
   Reported from real use: marking a phrase known made no difference, it came
   back the next day either way. The schedule was reading a lifetime ledger —
   successes minus lapses and hints, floored at zero — so a phrase that had
   gone wrong three times early on was pinned at the bottom rung, and no
   number of correct answers could lift it. */

test('a phrase with a bad history still climbs the moment he starts knowing it', () => {
  const { api } = runtime();
  learnerAt(api, 10);
  const id = '3:2';
  for (let i = 0; i < 3; i++) api.notePractice(id, 'fail');

  const meta = () => api.getState().reviewMeta[id];
  const rest = () => api.reviewRestMs(meta());
  assert.equal(api.reviewLevel(meta()), 0, 'three misses put it at the bottom');

  const bottom = rest();
  api.notePractice(id, 'pass');
  assert.equal(rest(), bottom * 2, 'the very first "I knew it" doubles the rest');
  api.notePractice(id, 'pass');
  assert.equal(rest(), bottom * 4, 'and the next doubles it again');

  /* The old lifetime ledger is still recorded — it is an honest history — it
     just no longer decides when the phrase comes back. */
  assert.equal(meta().lapses, 3, 'the misses are still on the record');
  assert.equal(api.reviewLevel(meta()), 2);
});

test('one clear answer is one rung, from wherever the phrase happens to be', () => {
  const { api } = runtime();
  learnerAt(api, 10);
  const level = id => api.reviewLevel(api.getState().reviewMeta[id]);

  api.notePractice('0:0', 'pass');
  assert.equal(level('0:0'), 1, 'a phrase met for the first time goes to one, not two');

  for (let i = 0; i < 5; i++) api.notePractice('0:1', 'pass');
  assert.equal(level('0:1'), 5);
  for (let i = 0; i < 6; i++) api.notePractice('0:1', 'pass');
  assert.equal(level('0:1'), api.REVIEW_MAX_LEVEL, 'the ladder has a top');

  // a miss costs two rungs, so one bad day does not undo a month
  api.notePractice('0:1', 'fail');
  assert.equal(level('0:1'), api.REVIEW_MAX_LEVEL - api.REVIEW_MISS_DROP);
  for (let i = 0; i < 9; i++) api.notePractice('0:1', 'fail');
  assert.equal(level('0:1'), 0, 'but enough of them do take it back to the bottom');

  // needing a hint is not a clear answer
  api.notePractice('0:2', 'pass');
  api.notePractice('0:2', 'pass');
  const before = level('0:2');
  api.notePractice('0:2', 'pass', true);
  assert.ok(level('0:2') < before, 'a hinted answer moves it down, not up');
});

test('what he says he knows really does come back far less often', () => {
  const { api } = runtime();
  learnerAt(api, api.LESSONS.length);
  const ids = [];
  for (let li = 0; li < api.LESSONS.length; li++) for (let pi = 0; pi < 5; pi++) ids.push(`${li}:${pi}`);
  for (const id of ids) api.notePractice(id, 'pass');

  // half of them answered right three times over, half wrong
  const known = new Set(ids.slice(0, 75));
  for (let round = 0; round < 3; round++)
    for (const id of ids) api.notePractice(id, known.has(id) ? 'pass' : 'fail');

  /* Fourteen days of drilling, the clock walked forward a day at a time. The
     complaint this answers is not "it never rests them" but "it makes no
     difference at all", so the bar is a wide margin, not a total absence. */
  const realNow = Date.now;
  let askedKnown = 0, askedShaky = 0;
  try {
    for (let day = 1; day <= 14; day++) {
      const at = realNow() + day * 864e5;
      Date.now = () => at;
      api.startDailyDrill();
      for (const q of api.getReview().questions) known.has(q.id) ? askedKnown++ : askedShaky++;
      runReview(api, () => true);
    }
  } finally { Date.now = realNow; }

  assert.equal(askedKnown + askedShaky, 14 * api.DRILL_LENGTH);
  assert.ok(askedShaky > askedKnown * 5,
    `the shaky half should dominate the drills by a wide margin (${askedShaky} vs ${askedKnown})`);
});

test('an install saved before the ladder existed keeps its place on it', () => {
  /* The level is seeded from the tally the old scheme kept, so a learner who
     had worked a phrase up to a long rest does not get dropped to daily. */
  const seed = new Map([['speakEnglishV1', JSON.stringify({
    onboarded: true, completed: 12, name: 'דן',
    reviewMeta: {
      '1:1': { successes: 5, lapses: 0, hints: 0, lastPracticedAt: 1, hard: false },
      '1:2': { successes: 1, lapses: 4, hints: 0, lastPracticedAt: 1, hard: true },
      '1:3': { successes: 40, lapses: 0, hints: 0, lastPracticedAt: 1, hard: false },
    },
  })]]);
  const { api } = runtime(seed);
  const state = api.getState();
  assert.equal(state.name, 'דן', 'the profile survived the upgrade');

  assert.equal(api.reviewLevel(state.reviewMeta['1:1']), 5, 'a well-known phrase keeps its long rest');
  assert.equal(api.reviewLevel(state.reviewMeta['1:2']), 0, 'and a troubled one stays at the bottom');
  assert.equal(api.reviewLevel(state.reviewMeta['1:3']), api.REVIEW_MAX_LEVEL, 'clamped to the top of the ladder');

  // and from there it behaves like any other: the next correct answer lifts it
  api.notePractice('1:2', 'pass');
  assert.equal(api.reviewLevel(api.getState().reviewMeta['1:2']), 1);
});

test('the added words mean the same thing everywhere the course uses them', () => {
  const { api } = runtime();
  const tokens = en => String(en).toLowerCase().replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  const covered = api.LESSONS.flatMap(l => l.phrases)
    .filter(p => tokens(p.en).some(t => api.TEST_WORDS.some(w => w[0] === t))).length;
  assert.ok(covered >= 120, `most of the course can now be diagnosed (${covered} of 150)`);

  /* The bank is no longer used to guess which word was missed — the learner
     says which — but it still supplies the Hebrew when the word he points at
     happens to be one the course teaches. */
  assert.equal(api.wordGloss('cats')?.he, 'חתולים');
  assert.equal(api.wordGloss('understand')?.he, 'להבין');
  assert.equal(api.wordGloss('burger?')?.he, 'המבורגר', 'punctuation does not stop the lookup');
  assert.equal(api.wordGloss('I'), null, 'a word the course never taught simply has no gloss');

  /* A word is only worth adding if its Hebrew holds across every phrase it
     turns up in — the follow-up shows that Hebrew and asks for the English,
     so a word with two meanings would teach the learner something untrue. */
  for (const drifting of ['nice', 'take', 'much'])
    assert.ok(!api.TEST_WORDS.some(w => w[0] === drifting),
      `${drifting} means different things in different phrases and is deliberately absent`);
});

/* ---- the sounds Hebrew does not have ----
   The matcher elsewhere compares text with a one-character edit allowance, so
   it cannot tell a Hebrew speaker's substitutions from the real thing. These
   fix what the trainer is for, and the honest limit on what it claims. */

// a speech engine that reports what it was asked to say and always completes
function speaker() {
  const said = [];
  class Utterance {
    constructor(text) { this.text = text; this.volume = 1; }
  }
  return {
    said,
    Utterance,
    synth: {
      speaking: false, pending: false, getVoices: () => [], resume() {},
      cancel() { this.speaking = false; },
      speak(u) { said.push(u.text); u.onstart?.(); u.onend?.(); },
    },
  };
}

test('the matcher cannot hear an accent, which is what the trainer is for', () => {
  const { api } = runtime();
  /* Not a criticism of wordsMatch — it compares text, and the text is all the
     recogniser returns. It is the reason a separate, listening-only exercise
     has to exist rather than a pronunciation score bolted onto the mic. */
  const slips = [['water', 'vater'], ['very', 'wery'], ['three', 'tree'], ['work', 'vork']];
  const missed = slips.filter(([target, said]) => api.wordsMatch(target, said));
  assert.equal(missed.length, slips.length,
    'every one of these passes as correct, so nothing else in the app will ever flag them');

  // and the four contrasts the trainer covers are the ones Hebrew lacks
  assert.equal(api.SOUND_SETS.map(s => s.id).join(','), 'th,wv,ii,ae');
});

test('every minimal pair really is minimal, and every word carries its Hebrew', () => {
  const { api } = runtime();
  const seen = new Set();
  for (const set of api.SOUND_SETS) {
    assert.ok(set.pairs.length >= 4, `${set.id} has enough pairs to draw on`);
    /* Each side is explained on its own — one sentence covering both was
       reported as impossible to follow — and each says what to do and what it
       should feel like, since "a third sound" is not something you can check. */
    for (const side of ['a', 'b']) {
      const sound = set[side];
      assert.ok(sound?.label?.trim(), `${set.id}.${side} is named`);
      assert.ok(sound?.how?.trim(), `${set.id}.${side} says what to do with the mouth`);
      assert.ok(sound?.feel?.trim(), `${set.id}.${side} says how to tell you did it`);
      assert.ok(api.MOUTH_SHAPES[sound.art], `${set.id}.${side} has a mouth to copy (${sound.art})`);
      assert.match(api.mouthArt(sound.art), /^<svg[\s\S]*<\/svg>$/, `${sound.art} really draws`);
    }
    assert.ok(set.from?.trim(), `${set.id} has a way in from a sound Hebrew already has`);
    assert.notEqual(set.a.art, set.b.art, `${set.id} draws its two sounds differently`);
    for (const pair of set.pairs) {
      assert.equal(pair.length, 2);
      const [a, b] = pair;
      assert.notEqual(a[0], b[0], 'the two words differ');
      assert.ok(a[1]?.trim() && b[1]?.trim(), `${a[0]}/${b[0]} both have Hebrew`);
      assert.ok(!seen.has(`${a[0]}/${b[0]}`), `${a[0]}/${b[0]} appears once`);
      seen.add(`${a[0]}/${b[0]}`);
      /* A pair only trains a contrast if the words are otherwise the same
         length-ish; "think/sink" works, "think/elephant" would just be two
         different words and could be told apart without hearing the sound. */
      assert.ok(Math.abs(a[0].length - b[0].length) <= 2, `${a[0]}/${b[0]} are a near pair`);
    }
  }
});

test('a listening round scores what it can judge and records it per sound', async () => {
  const { said, synth, Utterance } = speaker();
  const { api } = runtime(new Map(), { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  learnerAt(api, 10);
  assert.ok(api.canHearSounds(), 'the exercise needs a voice, and has one here');

  api.startSoundRun('th');
  const run = api.getSounds();
  assert.equal(run.rounds.length, api.SOUND_ROUNDS);
  assert.ok(run.rounds.every(r => r.set.id === 'th'), 'one contrast at a time');

  /* The word arrives as sound and only as sound — the two spellings are the
     answer, so writing it would be the answer too. */
  await new Promise(r => setTimeout(r, 600));
  assert.ok(said.length >= 1, 'the word to identify is played, not written');
  assert.ok(run.rounds[0].pair.some(w => w[0] === said[0]), 'and it is one of the two on offer');

  // answer seven of ten correctly
  for (let n = 0; api.getSounds() && n < api.SOUND_ROUNDS; n++) {
    const r = api.getSounds().rounds[api.getSounds().i];
    api.answerSound(n < 7 ? r.target : 1 - r.target);
    // the right answer stays up for a beat; drive that on rather than wait it out
    if (api.getSounds()) api.advanceSound();
  }
  const row = api.soundRow('th');
  assert.equal(row.heard, 10, 'every answer is on the record');
  assert.equal(row.right, 7);
  assert.equal(api.soundAccuracy('th'), 70);
  assert.equal(api.soundRow('wv').heard, 0, 'and it is kept per contrast, not pooled');
});

test('the trainer refuses rather than pretends when the device has no voice', () => {
  const { api } = runtime();                       // no speechSynthesis
  learnerAt(api, 10);
  assert.equal(api.canHearSounds(), false);
  api.startSoundRun('th');
  assert.equal(api.getSounds(), null, 'an exercise that is entirely listening does not start silent');
});

test('the home card names the weakest sound rather than an average', () => {
  const { api } = runtime();
  const state = learnerAt(api, 10);
  assert.match(api.soundsSummary(), /th/, 'before any attempt it just names them');

  state.sounds = api.normalizeSounds({
    th: { heard: 20, right: 11 }, wv: { heard: 20, right: 19 },
    ii: { heard: 0, right: 0 }, ae: { heard: 0, right: 0 },
  });
  assert.match(api.soundsSummary(), /th/, 'the one at 55% is the one worth naming');
  assert.doesNotMatch(api.soundsSummary(), /w מול v/, 'not the one already at 95%');

  // a contrast barely sampled is not called the weakest on two answers
  state.sounds = api.normalizeSounds({ th: { heard: 2, right: 0 }, wv: { heard: 30, right: 20 } });
  assert.doesNotMatch(api.soundsSummary(), /th/);
});

test('the sounds row appears once there is anything behind it', () => {
  const { api, app } = runtime();

  learnerAt(api, 0);
  api.renderHome();
  assert.doesNotMatch(app.innerHTML, /renderSoundsHub/, 'nothing to train before the first lesson');

  learnerAt(api, 3);
  api.renderHome();
  assert.match(app.innerHTML, /class="home-extra2s one"/, 'and it stands alone, in the single-column row');
  assert.match(app.innerHTML, /onclick="renderSoundsHub\(\)"/);
  /* A second, quieter row: the ear is not the daily habit and should not
     compete with the drill and the self-test for the same tap. */
  assert.ok(app.innerHTML.indexOf('home-extras three') < app.innerHTML.indexOf('home-extra2s'));
});

/* ---- a wrong answer waits ----
   Reported from real use: the explanation after a miss went by too fast to
   read, so the round became something to guess your way through. With two
   options that works half the time. A right answer moves on by itself; a
   wrong one is the only moment worth stopping on, so it stops. */

test('a missed sound holds the screen and plays the two words against each other', async () => {
  const { said, synth, Utterance } = speaker();
  const { api } = runtime(new Map(), { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  learnerAt(api, 10);

  api.startSoundRun('th');
  const round = api.getSounds().rounds[0];
  await new Promise(r => setTimeout(r, 600));        // the question plays itself
  said.length = 0;

  api.answerSound(1 - round.target);                 // wrong
  assert.equal(api.getSounds().i, 0, 'it does not move');

  /* Hearing them one after the other is the lesson; no amount of text about
     tongues between teeth replaces it. */
  await new Promise(r => setTimeout(r, 900));
  assert.equal(said[0], round.pair[round.target][0], 'the word that was actually played comes first');
  assert.equal(said[1], round.pair[1 - round.target][0], 'then the one that was picked instead');

  // and no timer takes it away from under the learner
  await new Promise(r => setTimeout(r, 3200));
  assert.equal(api.getSounds().i, 0, 'still on the same question after three seconds');
  api.advanceSound();
  assert.equal(api.getSounds().i, 1, 'it moves when the learner says so, and not before');
});

test('a correct sound still moves on by itself', async () => {
  const { synth, Utterance } = speaker();
  const { api } = runtime(new Map(), { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  learnerAt(api, 10);
  api.startSoundRun('ii');
  const round = api.getSounds().rounds[0];
  api.answerSound(round.target);
  assert.equal(api.getSounds().i, 0, 'a beat to register it');
  await new Promise(r => setTimeout(r, 1300));
  assert.equal(api.getSounds().i, 1, 'and then on, without a tap — nothing to dwell on here');
});

test('a missed drill question waits too, with the answer to hear', async () => {
  const { said, synth, Utterance } = speaker();
  const { api } = runtime(new Map(), { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  learnerAt(api, 10);

  api.startDailyDrill();
  const q = api.getReview().questions[0];
  await new Promise(r => setTimeout(r, 600));
  said.length = 0;

  api.answerReviewChoice(q.options.findIndex(o => o !== q.correct));
  assert.ok(said.some(t => t.includes(q.item.p.en.split('{')[0].trim().slice(0, 10))),
    'the phrase he missed is spoken, not only printed');
  await new Promise(r => setTimeout(r, 2600));
  assert.equal(api.getReview().i, 0, 'and the screen is still his after two and a half seconds');
  api.advanceReview();
  assert.equal(api.getReview().i, 1);
});

test('the explanation is drawn, split per sound, and namespaced away from the rest of the app', () => {
  const { api } = runtime();
  const set = api.SOUND_SETS.find(s => s.id === 'th');
  const html = api.soundExplainHtml(set, 'a');

  // both sounds get their own card, and the one that was played is marked
  assert.equal((html.match(/class="sound-side /g) || []).length, 2, 'one card per sound, never one blob for both');
  assert.match(html, /sound-side sound-said/);
  assert.match(html, /sound-side sound-picked/);
  assert.ok(html.includes(set.a.how) && html.includes(set.b.how), 'each says what to do');
  assert.ok(html.includes(set.a.feel) && html.includes(set.b.feel), 'and how to tell you did it');
  assert.ok(html.includes(set.from), 'with a way in from a sound Hebrew already has');
  assert.equal((html.match(/<svg/g) || []).length, 2, 'and a mouth to copy for each');

  /* Every class here has to be namespaced. A bare `.mouth` is already the
     character lip-sync element and a bare `.heard` is already the lesson's
     speech-recognition line — the first draft used both, and inherited
     `margin-top:12px` and `direction:ltr` from a rule nine hundred lines away. */
  const classes = new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)).filter(Boolean));
  for (const cls of classes)
    assert.match(cls, /^(sound-|mouth-dia$|m-)/, `${cls} is namespaced to this feature`);
});

/* ---- which word was missing is his answer, not the app's guess ----
   Reported from real use: "Can I have a burger?" came out as "can have a
   burger", so the word that failed was I — and the app announced burger,
   because it picked the rarest word the course teaches in the sentence. It
   had no evidence for that and could not have: the self-test is self-rated,
   so nothing is recorded but "no". */

/* Walk a run to a question whose sentence has more than one word. Eight of the
   course's phrases are single words — Please, Yes, Sorry — and those skip the
   which-word question on purpose, since there is nothing to point at. */
function toMultiWord(api) {
  while (api.getReview() && api.reviewWordChips(api.getReview().questions[api.getReview().i]).length < 2) {
    api.revealReviewSay();
    api.answerReviewSay(true);
  }
  assert.ok(api.getReview(), 'the run reached a sentence worth asking about');
  return api.getReview().questions[api.getReview().i];
}

test('a missed sentence asks which word rather than deciding for him', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();

  const q = toMultiWord(api);
  const at = api.getReview().i;
  api.revealReviewSay();
  api.answerReviewSay(false);

  assert.ok(api.getPicking(), 'a miss opens the question instead of moving on');
  assert.equal(api.getReview().i, at, 'and it is still the same question');

  // every word of the sentence is offered, so any of them can be the answer
  const chips = api.reviewWordChips(q);
  assert.ok(chips.length > 1);
  for (const w of chips) assert.ok(app.innerHTML.includes(w), `${w} can be pointed at`);
  assert.match(app.innerHTML, /pick-chip/);
});

test('the word he points at is the one recorded, whatever the app would have picked', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();

  const q = toMultiWord(api);
  const chips = api.reviewWordChips(q);
  const at = api.getReview().i;
  api.revealReviewSay();
  api.answerReviewSay(false);

  /* The first word of a sentence is exactly the sort the old guess would never
     have chosen — it is the commonest thing there. */
  api.pickMissingWord(0);
  assert.match(app.innerHTML, /is-gap/, 'the sentence is shown with his word marked');
  api.finishReviewPick();
  assert.equal(api.getReview().i, at + 1);

  runSelfTest(api, () => true);
  assert.ok(app.innerHTML.includes(chips[0]), `${chips[0]} is on the closing list because he said so`);
});

test('a word the course never taught is still a valid answer', () => {
  const { api } = runtime();
  /* "I" is not in the vocabulary bank and never will be, but it is a perfectly
     good answer to what would not come out, so it must not be swallowed. */
  assert.equal(api.wordGloss('I'), null);
  assert.ok(api.wordGloss('burger?'), 'while a taught word still resolves through its punctuation');

  learnerAt(api, 20);
  api.startSelfTest();
  toMultiWord(api);
  const at = api.getReview().i;
  api.revealReviewSay();
  api.answerReviewSay(false);
  api.pickMissingWord(0);
  api.finishReviewPick();
  assert.equal(api.getReview().i, at + 1, 'the run carries on either way');
});

test('nothing came at all closes without inventing a word', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();
  toMultiWord(api);
  const at = api.getReview().i;
  api.revealReviewSay();
  api.answerReviewSay(false);
  assert.ok(api.getPicking());

  api.pickMissingWord(api.REVIEW_PICK_BLANK);
  assert.ok(!api.getPicking(), 'the question closes');
  assert.equal(api.getReview().i, at + 1, 'and the run moves on');
  runSelfTest(api, () => true);
  assert.doesNotMatch(app.innerHTML, /class="test-words"/, 'with no word put on the closing list');
});

/* ---- getting only the order wrong is its own answer ----
   Raised from real use: sometimes the words were all there and the sentence
   still would not come. That used to record a number nothing read and move
   straight on, which made it the one answer the app did nothing with. */

test('saying it was only the order shows the order', () => {
  const { said, synth, Utterance } = speaker();
  const { api, app } = runtime(new Map(), { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  learnerAt(api, 20);
  api.startSelfTest();
  const q = toMultiWord(api);
  const at = api.getReview().i;
  api.revealReviewSay();
  api.answerReviewSay(false);
  said.length = 0;

  api.pickMissingWord(api.REVIEW_PICK_ORDER);
  assert.ok(api.getPicking(), 'it does not just move on');
  assert.equal(api.getReview().i, at, 'the run is still on the same sentence');

  // the sentence is laid out in its parts, each one playable
  const chunks = api.splitPhraseChunks(q.item.p.en);
  assert.match(app.innerHTML, /class="order-parts"/);
  for (const c of chunks) assert.ok(app.innerHTML.includes(c), `the part "${c}" is shown in place`);

  // and heard a part at a time, in order, because order is a thing you hear
  assert.equal(said[0], chunks[0], 'the parts play from the beginning');
  assert.ok(!app.innerHTML.includes('class="pick-word"'), 'no single word is blamed');

  api.finishReviewPick();
  assert.equal(api.getReview().i, at + 1);
});

test('order misses are counted and reported as their own finding', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();

  let ordered = 0;
  while (api.getReview() && api.getReview().i < api.getReview().questions.length) {
    const many = api.reviewWordChips(api.getReview().questions[api.getReview().i]).length > 1;
    api.revealReviewSay();
    api.answerReviewSay(false);
    if (api.getPicking()) { api.pickMissingWord(api.REVIEW_PICK_ORDER); ordered++; api.finishReviewPick(); }
    else assert.ok(!many, 'only a one-word phrase skips the question');
  }

  assert.ok(ordered > 0);
  /* A different problem from a missing word, with a different fix: the
     vocabulary is there and the sentence is not, so it is said separately. */
  assert.match(app.innerHTML, /class="test-order"/);
  assert.match(app.innerHTML, new RegExp(`${ordered} משפטים|משפט אחד`));
  assert.doesNotMatch(app.innerHTML, /class="test-words"/, 'and no words are listed, because none were named');
});

test('the closing list names each word once, and only what he chose', () => {
  const { api, app } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();
  // miss everything and always point at the first word, which repeats a lot
  runSelfTest(api, () => false, 0);

  const row = app.innerHTML.match(/<div class="test-words-row">([\s\S]*?)<\/div>/)?.[1] ?? '';
  const listed = [...row.matchAll(/<b dir="ltr" lang="en">([^<]+)<\/b>/g)].map(m => m[1]);
  assert.ok(listed.length, 'the words he pointed at are listed');
  assert.equal(new Set(listed.map(w => w.toLowerCase())).size, listed.length, 'each one once');
});

test('a one-word phrase has nothing to point at, so it is not asked about', () => {
  const { api } = runtime();
  learnerAt(api, 20);
  api.startSelfTest();

  /* Please, Yes, Sorry and the rest are one word each. Opening a which-word
     question over a single chip would be asking him to confirm the only
     answer there is. */
  const single = { shape: 'say', item: { p: { en: 'Please', he: 'בבקשה', tl: 'פְּלִיז' }, li: 0, pi: 0 }, id: '0:0' };
  assert.equal(api.reviewWordChips(single).length, 1);

  const run = api.getReview();
  run.questions[run.i] = single;
  api.revealReviewSay();
  api.answerReviewSay(false);
  assert.ok(!api.getPicking(), 'it simply moves on');
  assert.equal(api.getReview().i, 1);
});

test('the British word for the restaurant tab is not a mistake', () => {
  const { api } = runtime();
  /* "Check" is American and "bill" is British and most of everywhere else.
     The course teaches the American one, to match the voice it speaks with,
     but a learner who says the other was scoring .67 against a .70 pass —
     marked wrong for saying the word most of the English-speaking world uses. */
  assert.ok(api.wordsMatch('check', 'bill'));
  assert.ok(api.matchScore('The check, please', 'the bill please') >= 0.7);
  assert.ok(api.matchScore('The check, please', 'the check please') >= 0.7);

  // the same allowance the course already makes for the other regional splits
  for (const [a, b] of [['mom', 'mum'], ['football', 'soccer'], ['goodbye', 'bye']])
    assert.ok(api.wordsMatch(a, b), `${a}/${b} was already accepted`);

  /* Safe only because the verb never has to be produced: "let me check the
     ball" and friends are all lines the app speaks, never ones it listens for.
     If that stops being true, this equivalence has to become phrase-scoped. */
  const spoken = new Set();
  for (const lesson of api.LESSONS) {
    for (const p of lesson.phrases) spoken.add(p.en);
    for (const d of lesson.dialogue || []) if (d.who === 'you') spoken.add(d.en);
  }
  for (const line of spoken)
    if (/\bcheck\b/i.test(line))
      assert.match(line, /\bthe check\b/i, `"${line}" uses check as the noun, not the verb`);
});
