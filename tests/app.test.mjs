import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runnerVoiceJs = fs.readFileSync(new URL('../runner-voice.js', import.meta.url), 'utf8');
const runnerVoiceWindow = {};
vm.runInNewContext(runnerVoiceJs, { window: runnerVoiceWindow });
const runnerVoice = runnerVoiceWindow.SAM_RUN_VOICE;
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
      h, hx, afterRender, viewTransitionsEnabled, wordSpans, learningWordSpans, speakResultHtml, tokenIndexAt, alignTokens, modernPersonArt,
      speak, scheduleSpeak, beginLessonAudioGesture, interruptLessonAudioUnlock,
      setMicLevel, getMicLevel, startMicMeter, stopMicMeter,
      VISEMES, visemeFor, buildMouthTimeline,
      renderSamRun, samRunMatchCommand, samRunSpeedFor, samRunTravelMs, samRunWarnMs, samRunStore, samRunSave,
      samRunSpeakLane, samRunPlayRecordedWord, samRunBeginAudioSession, samRunEndAudioSession,
      SAM_RUN_COMMANDS, SAM_RUN_UNLOCK, SAM_RUN_ORDER, SAM_RUN_THINGS, SAM_RUN_STAGES, SAM_RUN_PHASES, SAM_RUN_SHOP_ITEMS, SAM_RUN_MISSIONS, SAM_RUN_MASTERY, SAM_RUN_GOAL, SAM_RUN_KEY, STORE_KEY,
      samRunMissionProgress, samRunMissionDone, samRunAvatarHtml, samRunHubHtml, samRunShopArt, samRunShopCardHtml, samRunWorldsHtml, samRunWorldStats, samRunBackAvatarHtml, renderSamRunShop, samRunChooseLane, samRunSpawnLaneWave, samRunStartSentence, samRunSpawnSentenceWave, samRunResolve, samRunBindLaneInput,
      samRunDepth, samRunReviewPool, samRunPickKind, samRunTakePickup, samRunAirborne, samRunStartAir, samRunMaybeStartQueuedAir, samRunRoadClear, samRunAimClear, samRunGateSep, samRunWaveArrivals, samRunSpawnPickup, samRunSpawnRush, samRunSpawnCoins, SAM_RUN_COURSE_WORDS, samRunLessonPool,
      renderSamRunMap, renderSamRunEndless, samRunEndlessWords, samRunUnlocked, samRunPace, samRunWaveTiming, samRunMedalsFor, SAM_RUN_MEDALS, SAM_RUN_FEATURE_AT, SAM_RUN_ENDLESS_PHASE, samRunSentencePool, samRunSpawnGap, samRunSpawnTunnel, samRunPaintPickup,
      setSamRun:v=>{samRun=v}, setSamRunAudio:v=>{samRunAudio=v},
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
  ['lost_bag', 10, 7],
  ['tom_recess_ball', 10, 7],
  ['maya_kitchen_mixup', 11, 7],
  ['restaurant_mixup', 12, 7],
  ['nina_market_gift', 14, 7],
  ['broken_phone_plan', 17, 8],
  ['maya_courtyard_change', 17, 8],
  ['sam_dropped_key', 18, 8],
  ['tom_last_shot', 19, 9],
  ['tom_presentation_card', 20, 9],
  ['maya_kitchen_blackout', 22, 9],
  ['nina_wrong_bag', 23, 8],
  ['nina_market_rolling_apples', 25, 9],
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
  assert.equal(activeIds.length, 24);
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
    'reveal-wrong-bag', 'replace-bag', 'start-rain', 'stop-rain',
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
    weather: new Set(['sunny', 'rain']),
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

test('all nine authored stageProp kinds render as physical before-and-after objects', () => {
  const { api } = runtime();
  const expectedKinds = [
    'apples', 'audio', 'bike-key', 'blackout-meal', 'camera',
    'cue-card', 'sale-sign', 'sink', 'watering',
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
  /* Free practice and the game are things to do, not steps on the path, and
     both now sit above it — the game had been below the stats at the bottom of
     a long scroll, past thirty locked lessons. */
  assert.match(html, /class="home-extra practice"[^>]*onclick="startPractice\(\)"/);
  assert.match(html, /class="home-extra game"[^>]*onclick="renderSamRun\(\)"/);
  assert.ok(html.indexOf('home-extras') < html.indexOf('המסלול שלך'),
    'both sit above the lesson list rather than inside or below it');
  assert.doesNotMatch(html, /home-path-special|home-side-game/,
    'and neither is left wedged between two units or stranded at the foot of the page');
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

test('PWA update code is versioned and does not clear local progress', () => {
  const sw = fs.readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(sw, /CACHE_PREFIX\s*=\s*'speak-english-'/);
  // the cache must stay versioned, but pinning one number here only breaks
  // the suite every time the app legitimately ships a new version
  assert.match(sw, /CACHE_NAME\s*=\s*'speak-english-v\d+'/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(html, /updateViaCache:'none'/);
  assert.doesNotMatch(sw, /localStorage/);
  for(const asset of ['runner-voice.js','THIRD_PARTY_NOTICES.md','LICENSES/Apache-2.0.txt','LICENSES/Flite-CMU.txt']){
    assert.ok(sw.includes(`'./${asset}'`), `${asset} is preserved in the offline app`);
  }
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

test("Sam's Run: words are matched with the lessons' forgiveness, and the last word said wins", () => {
  const { api } = runtime();
  const m = (text, active) => api.samRunMatchCommand(text, active);
  assert.equal(m('jump'), 'jump');
  assert.equal(m('Jumped!'), 'jump', 'a past tense still means the move');
  assert.equal(m('dock'), 'duck', 'the common mishearing lands on the move meant');
  assert.equal(m('cash'), 'catch');
  assert.equal(m('hi'), 'hello');
  assert.equal(m('no wait jump'), 'jump', 'the last word said is the one meant');
  assert.equal(m('banana'), null);
  assert.equal(m(''), null);
  assert.equal(m('cash', ['jump', 'duck']), null, 'a word not yet unlocked is not a command yet');
  for (const id of api.SAM_RUN_ORDER)
    assert.equal(m(api.SAM_RUN_COMMANDS[id].en), id, `${id} answers to its own word`);
});

test("Sam's Run: the street speeds up with the score, then stops speeding up", () => {
  const { api } = runtime();
  let prev = 0;
  for (let s = 0; s <= 120; s += 5) { const v = api.samRunSpeedFor(s); assert.ok(v >= prev, 'speed never drops'); prev = v; }
  assert.equal(api.samRunSpeedFor(0), 1);
  assert.equal(api.samRunSpeedFor(70), api.samRunSpeedFor(500), 'a ceiling keeps the voice path fair');
  assert.ok(api.samRunTravelMs(0) > api.samRunTravelMs(70), 'things arrive faster as the score climbs');
  assert.ok(api.samRunTravelMs(500) >= 1500, 'a spoken word needs a real moment to be recognised');
  // every thing announces itself at the edge first, and a slow recogniser,
  // measured on this device, earns more notice — up to a cap
  assert.equal(api.samRunWarnMs(0, 0), 1000, 'a fresh run gives a full second of warning');
  assert.ok(api.samRunWarnMs(70, 0) < api.samRunWarnMs(0, 0) && api.samRunWarnMs(70, 0) >= 750, 'the warning shortens with speed but never below 750ms');
  assert.equal(api.samRunWarnMs(0, 600), 1000, 'a quick recogniser earns no extra notice');
  assert.equal(api.samRunWarnMs(0, 1200), 1550, 'a slow one earns the difference above 650ms');
  assert.equal(api.samRunWarnMs(0, 4000), 1700, 'capped at +700ms, so a broken measurement cannot stall the game');
  // the whole window a human gets: warning plus approach, at both ends of the ramp
  assert.ok(api.samRunWarnMs(0, 0) + api.samRunTravelMs(0) >= 3400, 'over three seconds at the start');
  assert.ok(api.samRunWarnMs(70, 0) + api.samRunTravelMs(70) >= 2250, 'still over two seconds at full speed');
  for (const id of api.SAM_RUN_ORDER)
    assert.ok(api.SAM_RUN_COMMANDS[id] && api.SAM_RUN_THINGS[id], `${id} has both a word and a thing that answers to it`);
  assert.equal(api.SAM_RUN_ORDER.filter(id => api.SAM_RUN_UNLOCK[id] === 0).join(','), 'jump,duck',
    'a first run starts with two words, not five');
  const thresholds = api.SAM_RUN_ORDER.map(id => api.SAM_RUN_UNLOCK[id]);
  assert.deepEqual([...thresholds].sort((a, b) => a - b).join(','), thresholds.join(','), 'words unlock in order');
});

test("Sam's Run: offered above the course path, remembers its best, and never outranks the day's lesson", () => {
  const seed = new Map();
  const { api, app } = runtime(seed);
  const state = api.defaults(); state.onboarded = true; api.setState(state);
  api.renderHome();
  assert.match(app.innerHTML, /class="home-extra game"[^>]*onclick="renderSamRun\(\)"/, 'the game is reachable from home');
  /* Before the first lesson there is nothing to practise yet, so the game gets
     the whole row to itself rather than sitting beside an empty half. */
  assert.match(app.innerHTML, /class="home-extras one"/, 'and it stands alone until there is something to practise');
  assert.doesNotMatch(app.innerHTML, /class="btn[^"]*"[^>]*onclick="renderSamRun\(\)"/, 'but not as a primary button');
  /* It is offered plainly now instead of hidden at the foot of the page, but
     the day's lesson is still the one thing styled as the main action. */
  assert.ok(app.innerHTML.indexOf('home-extras') > app.innerHTML.indexOf('home-map-title')
    || app.innerHTML.indexOf('home-extras') < app.innerHTML.indexOf('המסלול שלך'),
    'the game is offered above the path');

  const before = JSON.stringify(api.getState());
  api.renderSamRun();
  assert.match(app.innerHTML, /game-screen/);
  assert.match(app.innerHTML, /data-character="sam"/, 'Sam himself is on the hub');
  assert.match(app.innerHTML, /onclick="renderSamRunEndless\(\)"/, 'the endless run is the front door');
  assert.match(app.innerHTML, /השיא שלך במטרים/, 'and a personal best is what it shows');
  assert.match(app.innerHTML, /onclick="renderSamRunMap\(\)"/, 'the worlds are one button down as focused practice');
  api.renderSamRunMap();
  assert.match(app.innerHTML, /JUMP[\s\S]*DUCK/, 'which still lists every world and its words');
  assert.doesNotMatch(app.innerHTML, /is-locked/, 'and no longer locks any of them behind the others');
  assert.equal(JSON.stringify(api.getState()), before, 'opening the game must not touch the learner state');
  assert.equal(api.getLesson(), null, 'and must not open a lesson');

  // its own storage key, never the lesson's
  assert.notEqual(api.SAM_RUN_KEY, api.STORE_KEY);
  assert.equal(api.samRunStore().best, 0);
  api.samRunSave({ ...api.samRunStore(), best: 17, unlocked: ['jump', 'duck', 'stop'] });
  assert.equal(api.samRunStore().best, 17);
  assert.ok(!String(seed.get(api.STORE_KEY) || '').includes('samRun'), 'nothing of the game leaks into the lesson state');
  const again = runtime(seed);
  assert.equal(again.api.samRunStore().best, 17, 'the best survives a reload');
  assert.equal(again.api.samRunStore().unlocked.join(','), 'jump,duck,stop', 'so do the words already earned');
  seed.set(api.SAM_RUN_KEY, '{not json');
  assert.equal(runtime(seed).api.samRunStore().best, 0, 'a corrupt store falls back instead of crashing the game');
});

test("Sam's word journey has eight focused worlds and forty playable curriculum words", () => {
  const { api } = runtime();
  assert.equal(api.SAM_RUN_STAGES.length, 8);
  assert.ok(api.SAM_RUN_STAGES.every(stage => stage.words.length === 5),
    'a world stays small enough to repeat every word several times');
  const ids = api.SAM_RUN_STAGES.flatMap(stage => stage.words.map(word => word[0]));
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, ids.length, 'curriculum words must not repeat across worlds');
  for (const stage of api.SAM_RUN_STAGES) {
    const active = stage.words.map(word => word[0]);
    for (const id of active)
      assert.equal(api.samRunMatchCommand(api.SAM_RUN_COMMANDS[id].en, active), id,
        `${id} must be playable by voice inside its world`);
  }
});

test("Sam's word journey persists mastery without leaking into lesson progress", () => {
  const seed = new Map();
  const { api, app } = runtime(seed);
  const before = JSON.stringify(api.getState());
  const store = api.samRunStore();
  store.mastery.jump = api.SAM_RUN_MASTERY;
  store.stageStars[0] = 2;
  store.stage = 1;
  store.coins = 23;
  api.samRunSave(store);
  const fresh = runtime(seed);
  assert.equal(fresh.api.samRunStore().mastery.jump, api.SAM_RUN_MASTERY);
  assert.equal(fresh.api.samRunStore().stageStars[0], 2);
  assert.equal(fresh.api.samRunStore().coins, 23);
  fresh.api.renderSamRunMap();
  assert.match(fresh.app.innerHTML, /אימון ממוקד/);
  assert.match(fresh.app.innerHTML, /<b>1<\/b> מתוך 40 מילים/);
  assert.match(fresh.app.innerHTML, /צובעים את העיר/);
  assert.equal(JSON.stringify(api.getState()), before);
  assert.ok(api.SAM_RUN_GOAL >= 15, 'one run repeats a five-word pack rather than sampling it once');
});

test("Sam's run teaches every stage aloud, then challenges Hebrew to English", () => {
  assert.match(html, /function samRunReviewStep\(index\)/,
    'every run needs a word-preview sequence before its countdown');
  assert.match(html, /speak\(c\.say\)/,
    'the preview must pronounce each English word, not only show it');
  assert.match(html, /setTimeout\(\(\)=>\{ if\(samRun===g\) samRunReviewStep\(index\+1\); \},1100\)/,
    'the five-word preview stays brisk');
  assert.match(html, /<span class="ob-label" dir="rtl">\$\{esc\(c\.he\)\}<em>בחר באנגלית<\/em><\/span>/,
    'the live challenge always asks with an unambiguous Hebrew word');
  assert.doesNotMatch(html, /mastery>=SAM_RUN_MASTERY\?'':`<span class="ob-label"/,
    'mastery must not remove the Hebrew prompt and turn translation into picture guessing');
});

test("Sam's runs start directly without microphone friction", () => {
  const { api } = runtime();
  assert.equal(api.SAM_RUN_PHASES.map(phase => phase.id).join(','), 'learn,speed,final');
  assert.match(html, /onclick="samRunStart\(\)">מתחילים לרוץ/,
    'one intentional tap starts the word preview and runner');
  assert.doesNotMatch(html, /samRunChooseMode\('voice'\)|משחק קולי|\+50% מטבעות/,
    'the game no longer offers a microphone mode');
  const oldSave = new Map([[api.SAM_RUN_KEY, JSON.stringify({
    version: 3, stage: 2, stageStars: {0: 3, 1: 2}, phaseByStage: {0: 1, 1: 1, 2: 1},
  })]]);
  const migrated = runtime(oldSave).api.samRunStore();
  assert.equal(migrated.phaseByStage[0], 0, 'a completed old world reopens quietly');
  assert.equal(migrated.phaseByStage[1], 0, 'adjacent completed worlds cannot both reopen as voice stages');
  assert.equal(migrated.phaseByStage[2], 2, 'an unfinished old challenge remains in the final activity slot');
  assert.doesNotMatch(html, /function samRunPrepareMicrophone/,
    'starting the runner never requests microphone permission');
  /* Only the right answer is ever spoken — reading out whichever lane the
     runner was crossing taught wrong words as often as right ones. But a
     runner already standing on the answer when a wave arrives has still
     answered it, and hearing nothing there was the jarring part: the gate
     below means an arriving wave speaks only when the lane underfoot is
     already the correct one, so nothing is given away anywhere else. */
  assert.match(html, /function samRunSpeakLane\(ob,lane,arrival=false,afterResolve=false\)\{[\s\S]*?if\(!samRunPlayRecordedWord\(spoken,ob,lane,finish,afterResolve\)\) finish\(samRunSay\(spoken\)\);/,
    'all lane speech prefers the recorded gameplay path and retains speech synthesis as fallback');
  assert.match(html, /function samRunSpawnLaneWave\(\)\{[\s\S]*?samRunSpeakLane\(ob,g\.lane,true\);/,
    'a wave arriving under the runner speaks, because standing on the answer is answering it');
  assert.match(html, /function samRunSpawnSentenceWave\(\)\{[\s\S]*?samRunSpeakLane\(ob,g\.lane,true\);/,
    'and so does the next word of a sentence');
  /* The reward spoken as a wave resolves is played deliberately after it has
     resolved, so the recorded path must not treat "resolved" as a reason to
     stay silent — that check is only there to drop a word moved on from. */
  assert.match(html, /\(ob\.resolved&&!afterResolve\)\|\|ob\.chosenLane!==lane/,
    'the resolve-time reward is not swallowed by the guard meant for stale words');
  assert.match(html, /function samRunSpeakLane\(ob,lane,arrival=false,afterResolve=false\)\{[\s\S]*?if\(ob\.correctLane!=null&&lane!==ob\.correctLane\) return;/,
    'a lane that is not the answer is never pronounced');
  /* The prompt is centred with the translate PROPERTY, and individual
     transform properties are applied before `transform`. A keyframe that also
     says translate(-50%) therefore shifts the box a second half-width and the
     word visibly slides in from the left every time it changes — 125px of it,
     measured, on an iPhone 13. The pop may only scale. */
  const popKeyframes = html.match(/@keyframes gamePromptPop\{[^}]*\}[^}]*\}[^}]*\}/);
  assert.ok(popKeyframes, 'the prompt still has its attention-drawing pop');
  assert.doesNotMatch(popKeyframes[0], /translate\(/,
    'and it scales in place — the box is already centred by the translate property, so a translate here drags it sideways');
  assert.match(html, /function samRunChooseLane\(lane\)\{[\s\S]*?samRunSpeakLane\(ob,lane\);/,
    'finding the right lane pronounces its English word');
  /* The word is normally heard the moment the runner is on the answer. This is
     the net for the rare case where that attempt was dropped — the voice was
     still busy with the previous word — so a correct answer is never silent. */
  assert.match(html, /if\(!ob\.spokeCorrect\) samRunSpeakLane\(ob,ob\.correctLane,false,true\);/,
    'and a correct answer whose word never got out is still spoken as it lands');
  assert.match(html, /const finish=played=>\{[\s\S]*?if\(played\) ob\.arrivalSpoken=true;/,
    'a wave is marked spoken only after a playback path really starts it');
  assert.match(html, /function samRunStart\(\)\{[\s\S]*?samRunTone\('tick'\);\n  samRunVoiceUntil=0;/,
    'each run starts with a fresh speech backlog clock');
  assert.doesNotMatch(html, /g\.sayTimer=setTimeout/,
    'and never through a timer, which is what iOS drops');
  assert.match(html, /function samRunSay\(text\)\{[\s\S]*?speechSynthesis\.resume\(\)/,
    'the game resumes the synthesis queue itself — iOS leaves it paused');
  assert.match(html, /function samRunStart\(\)\{[\s\S]*?samRunSay\('Ready'\);/,
    'a direct game visit primes iOS speech from the Start-button tap');
  /* Nothing the game says may go through a cancel. Asking iOS whether it is
     speaking and skipping if so let the child hear only the first word of a
     fast run; cancelling to make room silenced the phone outright, because a
     cancel can wedge the iOS engine for the rest of the page. The game keeps
     its own reckoning of when the voice comes free, queues every word inside
     the swipe that chose it, and drops one only when the queue has run more
     than a word behind. */
  const sayBody = html.slice(html.indexOf('function samRunSay(text){'));
  const sayFn = sayBody.slice(0, sayBody.indexOf('\nfunction '));
  assert.doesNotMatch(sayFn, /speechSynthesis\.cancel\(\)/,
    'the game never cancels — that is the call that wedges iOS for the rest of the page');
  assert.doesNotMatch(sayFn, /speechSynthesis\.speaking|speechSynthesis\.pending/,
    'and never asks iOS whether it is speaking, because that answer cannot be trusted');
  assert.match(sayFn, /if\(samRunVoiceUntil-now>820\) return false;/,
    'it keeps its own reckoning instead, and drops a word only once the voice is a word behind');
  assert.match(sayFn, /speechSynthesis\.speak\(u\);/,
    'every word is handed over synchronously, inside the swipe that chose it');
  /* Everything the game says while a run is going has to use that path — a
     completed sentence going through the lesson speak() would cancel, and one
     cancel is enough to silence the rest of the run. */
  assert.match(html, /samRunWorldFx\('is-combo',520\);\n  samRunSay\(s\.say\);/,
    'a finished sentence is spoken by the game, not by the lesson screen');
  assert.match(html, /function samRunReviewStep\(index\)\{[\s\S]*?samRunSay\(c\.say\);/,
    'the pre-run review uses the same non-cancelling game voice');
  const startFn = html.slice(html.indexOf('function samRunStart(){'), html.indexOf('\nfunction samRunReviewStep'));
  const reviewFn = html.slice(html.indexOf('function samRunReviewStep(index){'), html.indexOf('\nfunction samRunBeginCountdown'));
  const countdownFn = html.slice(html.indexOf('function samRunBeginCountdown(){'), html.indexOf('\nfunction samRunGo'));
  assert.doesNotMatch(startFn + reviewFn + countdownFn, /cancelSpeech\(\)/,
    'nothing may cancel the iOS speech queue between the start tap and the live road');
  assert.match(html, /if\('speechSynthesis' in window && \(speechSynthesis\.speaking\|\|speechSynthesis\.pending\)\) speechSynthesis\.cancel\(\);/,
    'nothing cancels a queue that is already empty — the runner does that on every start');
  assert.match(html, /function next\(\)\{[\s\S]*?invalidateDialogueFlow\(!protectFirstLessonSpeech\);/,
    'only the transition that will submit the first real lesson sentence protects stale iOS pending state');
  assert.doesNotMatch(html, /SpeechSynthesisUtterance\('a'\)|\.volume\s*=\s*0/,
    'no muted global primer may claim to unlock iOS before a real utterance starts');
  assert.match(html, /document\.addEventListener\('click', beginLessonAudioGesture, true\);/,
    'lesson speech keeps the trusted click alive for the real sentence');
});

test("Sam's lane vocabulary has offline recorded pronunciation", async () => {
  const { api, context } = runtime();
  assert.match(html, /<script src="\.\/runner-voice\.js"><\/script>/,
    'the pronunciation pack loads before the game code');
  assert.match(runnerVoiceJs, /Full provenance and license copies: \.\/THIRD_PARTY_NOTICES\.md/,
    'the distributed audio pack points recipients to its bundled notices');
  assert.ok(runnerVoice?.audio, 'the pronunciation pack is readable');
  for(const command of Object.values(api.SAM_RUN_COMMANDS)){
    const key=String(command.say||command.en).toLowerCase();
    assert.ok(runnerVoice.audio[key], `${key} has a recorded lane pronunciation`);
  }
  for(const sentence of api.samRunSentencePool(api.LESSONS.length)){
    for(const word of sentence.words){
      const key=word.toLowerCase();
      assert.ok(runnerVoice.audio[key], `${key} has a recorded sentence-lane pronunciation`);
    }
  }
  for(const clip of Object.values(runnerVoice.audio)){
    const bytes=Buffer.from(clip,'base64');
    assert.ok(bytes.length>1000, 'each pronunciation contains real audio data');
    assert.ok(bytes[0]===0x49||bytes[0]===0xff, 'each pronunciation is an MP3 clip');
  }
  let starts=0;
  const audioContext={
    state:'running', destination:{},
    decodeAudioData:async()=>({duration:.7}),
    createBufferSource:()=>({connect(){},start(){ starts++; },stop(){}}),
  };
  context.window.SAM_RUN_VOICE=runnerVoice;
  api.setSamRunAudio(audioContext);
  const game={running:true};
  const wave={options:['night','please','no'],chosenLane:0,resolved:false};
  api.setSamRun(game);
  api.samRunSpeakLane(wave,0,true);
  assert.equal(wave.arrivalPending,true, 'the wave is pending while its first clip decodes');
  assert.equal(wave.arrivalSpoken,undefined, 'requesting a clip does not prematurely mark it spoken');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(starts,1, 'an arriving wave really starts a Web Audio source without a lane gesture');
  assert.equal(wave.arrivalPending,false);
  assert.equal(wave.arrivalSpoken,true);
  api.samRunSpeakLane(wave,0,true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(starts,1, 'the same arriving wave is not played twice');

  let resumes=0;
  audioContext.state='interrupted';
  audioContext.resume=async()=>{ resumes++; audioContext.state='running'; };
  const resumedWave={options:['please','night','no'],chosenLane:0,resolved:false};
  api.samRunSpeakLane(resumedWave,0,true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(resumes,1, 'an interrupted WebKit audio context is resumed');
  assert.equal(starts,2, 'the arriving word starts after an audio interruption');
  assert.equal(resumedWave.arrivalSpoken,true);
  assert.match(html, /Promise\.race\(\[attempt,new Promise\(resolve=>setTimeout\(resolve,450\)\)\]\)/,
    'a stuck WebKit resume cannot leave a wave pending forever');

  audioContext.decodeAudioData=(_bytes,success)=>{ setTimeout(()=>success({duration:.7}),0); };
  const legacyWave={options:['no','night','please'],chosenLane:0,resolved:false};
  api.samRunSpeakLane(legacyWave,0,true);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(starts,3, 'the legacy callback-only Safari decoder also starts the word');
  assert.equal(legacyWave.arrivalSpoken,true);
});

test("Sam's game chooses the audible iPhone media route only while it runs", async () => {
  const audioSession={type:'auto'};
  const modern=runtime(new Map(),{navigator:{audioSession}});
  modern.api.samRunBeginAudioSession();
  assert.equal(audioSession.type,'playback', 'modern iOS ignores the silent switch for spoken game words');
  modern.api.samRunEndAudioSession();
  assert.equal(audioSession.type,'auto', 'leaving the game restores the lesson audio route');

  let plays=0,pauses=0;
  const legacy=runtime(new Map(),{navigator:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:5}});
  legacy.context.window.Audio=class {
    constructor(src){ this.src=src; this.currentTime=0; this.loop=false; }
    play(){ plays++; return Promise.resolve(); }
    pause(){ pauses++; }
  };
  legacy.api.samRunBeginAudioSession();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(plays,1, 'older iOS opens its audible media channel during the Start gesture');
  legacy.api.samRunEndAudioSession();
  assert.equal(pauses,1, 'the compatibility bridge stops with the game');
  assert.match(html, /function samRunStart\(\)\{[\s\S]*?samRunBeginAudioSession\(\);[\s\S]*?samRunTone\('tick'\);/,
    'the media route is selected synchronously inside Start');
  assert.match(html, /function samRunTeardown\(\)\{[\s\S]*?samRunEndAudioSession\(\);/,
    'teardown always restores the surrounding lesson audio behavior');
});

test("Sam's run renders themed parallax worlds and game-feel feedback", () => {
  const { api, app } = runtime();
  api.renderSamRun(0);
  assert.match(app.innerHTML, /game-skyfx/);
  assert.match(app.innerHTML, /game-mid/);
  assert.match(app.innerHTML, /game-roadside/);
  assert.match(app.innerHTML, /game-finish/);
  assert.match(app.innerHTML, /phase-learn/);
  assert.match(html, /function samRunBurst\(ob\)/, 'correct answers create a particle reward');
  assert.match(html, /world\.classList\.toggle\('zone-2',g\.resolvedCount>=6\)/,
    'the atmosphere progresses during a run');
  assert.match(html, /world\.classList\.add\('is-finishing'\)/,
    'a completed run gets a visible finish-line sequence');
  assert.match(html, /if\(cls==='is-jumping'\) setTimeout\(\(\)=>samRunWorldFx\('is-land',300\),690\)/,
    'jumping has a camera-weighted landing');
  assert.match(html, /\.game-world\.lane-game \.game-runner\.is-collecting[^\n]*\.back-air-root\{animation:gameBackCollectHop/,
    'a correct lane answer reaches the rear-view rig with a grounded reaction');
  assert.match(html, /\.game-world\.lane-game \.game-runner\.is-celebrating \.back-air-root\{animation:gameBackCelebrateHop/,
    'the rear-view rig owns a finish-line celebration too');
  assert.match(html, /if\(g\.laneGame\) samRunPose\('is-collecting',480\)/,
    'resolving a correct lane answer actually starts that reaction');
  assert.match(html, /runner\.classList\.remove\('is-collecting'\); samRunPose\('is-celebrating'\)/,
    'the finish celebration cannot be hidden behind the final answer reaction');
});

test("Sam's quiet game is a real three-lane runner rather than a word queue", () => {
  const { api, app } = runtime();
  api.renderSamRun(0);
  assert.match(app.innerHTML, /game-lane-grid/);
  assert.match(app.innerHTML, /game-lane-prompt/);
  assert.match(app.innerHTML, /lane-game/);
  assert.match(app.innerHTML, /game-playing/, 'the run owns the full viewport');
  assert.match(app.innerHTML, /game-back-rig/, 'the equipped character is seen running away from the camera');
  assert.match(app.innerHTML, /viewBox="0 0 140 260"/,
    'the runner uses taller, human-like proportions');
  assert.match(app.innerHTML, /class="back-hair-mass"/,
    'the road character shows a covered back of the head rather than a blank face');
  assert.doesNotMatch(app.innerHTML, /<ellipse cx="70" cy="26" rx="18" ry="22" fill=/,
    'the old face-shaped skin oval is gone from the rear-view runner');
  assert.match(app.innerHTML, /M48 78Q70 90 92 78/,
    'a shoulder yoke makes the jacket read unmistakably from behind');
  assert.doesNotMatch(app.innerHTML, /M70 72v61|M51 93h12v15H51/,
    'front zipper and chest-pocket marks are not drawn on the runner\'s back');
  assert.match(app.innerHTML, /back-ground-shadow[\s\S]*?back-lane-root[\s\S]*?back-air-root[\s\S]*?back-run-bob/,
    'ground contact, lane lean, air action and run cadence own separate transforms');
  assert.doesNotMatch(app.innerHTML, /<svg class="game-back-rig"[^>]*>[\s\S]{0,120}<ellipse class="back-shadow"/,
    'the shadow is no longer inside the jumping rig');
  const rideStore = api.samRunStore();
  rideStore.equipped = { ...rideStore.equipped, ride: 'ride_scooter' };
  assert.match(api.samRunBackAvatarHtml(rideStore), /back-lane-root[\s\S]*?back-air-root[\s\S]*?game-back-ride[\s\S]*?back-ride-offset/,
    'equipped rides travel through lane changes and jumps with the character');
  assert.match(app.innerHTML, /game-lane-focus/, 'the selected road gets immediate visual feedback');
  assert.doesNotMatch(app.innerHTML, /game-swipe-hint/,
    'tutorial cards never cover a live lane or obstacle');
  assert.match(app.innerHTML, /↔️ לוחצים על המסלול הנכון · ⬆️ למעלה קופצים · ⬇️ למטה מתכופפים/,
    'the controls are explained on the start card before the road begins');
  assert.doesNotMatch(app.innerHTML, /lane-choices/, 'answers are not duplicated below the road');
  assert.match(html, /const distractors=shuffled\(choices\.filter\(id=>id!==cmd\)\)\.slice\(0,2\)/,
    'each wave mixes the answer with two live distractors');
  assert.match(html, /onclick="samRunChooseLane\(\$\{i\}\)"/,
    'the approaching gates themselves are playable');
  assert.match(html, /document\.addEventListener\('pointerup',onPointerEnd,\{passive:false,capture:true\}\)/,
    'the whole road is the input surface');
  assert.match(html, /dx=x-startX/,
    'horizontal swipes move naturally between perspective lanes');
  assert.match(html, /const axisOf=\(dx,dy\)=>Math\.max\(Math\.abs\(dx\),Math\.abs\(dy\)\)<14\?'':\(Math\.abs\(dy\)>Math\.abs\(dx\)\*\.85\?'y':'x'\)/,
    'a gesture belongs to one axis, decided once by whichever delta is bigger');
  assert.match(html, /if\(!axis\) axis=axisOf\(dx,dy\);/,
    'and it is decided once per gesture rather than re-judged on every sample');
  assert.match(html, /if\(e\.key==='ArrowUp'\|\|e\.key==='ArrowDown'\) samRunAirborne\(e\.key==='ArrowUp'\?'jump':'duck'\)/,
    'the keyboard reaches the vertical axis too');
  assert.match(html, /document\.addEventListener\('touchmove',onTouchMove,\{passive:false,capture:true\}\)/,
    'older iOS versions retain a classic touch-event fallback');
  assert.match(html, /g\.gestureCleanup=/,
    'global gesture listeners are removed when the run closes');
  assert.match(html, /world\.setPointerCapture\(pointerId\)/,
    'all pointer gestures keep control when they cross a gate');
  assert.match(html, /const stage=\(\)=>document\.getElementById\('samRunWorld'\)\|\|worldAtBind\|\|null/,
    'the road is looked up per gesture, never held from before the view transition');
  assert.doesNotMatch(html, /runner\.style\.transform='translateX\(-50%\)'/,
    'no inline transform overrides the lane runner lean');
  assert.match(html, /document\.addEventListener\('click',onClickCapture,\{capture:true\}\)/,
    'a completed swipe suppresses the accidental lane-button click beneath the finger');
  assert.match(html, /navigator\.vibrate\?\.\(10\)/,
    'supported phones confirm a lane change with light haptics');
  assert.match(html, /\['20%','50%','80%'\]\[lane\]/,
    'the rear-view runner travels between three screen lanes');
  /* Everything on the road shares one camera except the one thing that has to
     be read. Three gates on the scene camera were 42px wide at the horizon,
     which is 7.5px of English — no font size survives that, so the gates get
     their own gentler camera and arrive already legible. */
  assert.match(html, /const \{y,scale,spread\}=samRunGateDepth\(ob\.progress\)/,
    'answer gates get the gentle camera, so the word can be read on arrival');
  assert.match(html, /samRunPaintPickup[\s\S]{0,900}samRunDepth\(pu\.p\)/,
    'while the walls and coins still ride the real perspective');
  assert.match(html, /if\(!samRunPlayRecordedWord\(spoken,ob,lane,finish,afterResolve\)\) finish\(samRunSay\(spoken\)\)/,
    'every lane choice reinforces its English pronunciation through recorded audio or fallback');
  assert.match(html, /last&&!last\.resolved&&\(g\.laneGame\|\|last\.progress<\.55\)/,
    'a second three-answer wave never steals control from the active one');
  assert.match(html, /Math\.random\(\)<\.18/, 'rare bonus coins make runs less predictable');
  assert.match(html, /g\.streak===5&&!g\.shield/, 'a five-answer combo earns a one-hit shield');
});

test("Sam's lane runner completes a real iPhone touch swipe", () => {
  const { api, context } = runtime();
  const documentHandlers = {}, worldHandlers = {};
  context.document.addEventListener = (type, fn) => { documentHandlers[type] = fn; };
  context.document.removeEventListener = () => {};
  const classList = { add() {}, remove() {} };
  const style = () => ({ left: '', setProperty(name, value) { this[name] = value; } });
  const runner = { style: style(), classList, offsetWidth: 80 };
  const focus = { style: style() };
  context.document.getElementById = id => id === 'samRunRunner' ? runner : id === 'samRunLaneFocus' ? focus : null;
  const world = {
    classList, tabIndex: -1,
    addEventListener(type, fn) { worldHandlers[type] = fn; },
    contains: () => true,
    getBoundingClientRect: () => ({ left: 0, width: 300 }),
    setPointerCapture() {},
  };
  const game = { running: true, laneGame: true, lane: 1, obstacles: [] };
  api.setSamRun(game);
  api.samRunBindLaneInput(world, game);
  documentHandlers.touchstart({ target: world, composedPath: () => [world], touches: [{ clientX: 150, clientY: 300 }] });
  let prevented = false;
  documentHandlers.touchmove({ touches: [{ clientX: 205, clientY: 302 }], preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, 'the page must not steal the horizontal gesture');
  assert.equal(game.lane, 2, 'one right swipe moves from the centre to the right lane');
  assert.equal(runner.style.left, '80%', 'the character visibly follows the selected lane');
  assert.equal(focus.style.left, '80%', 'the road highlight moves with the character');
  documentHandlers.touchend({ target: world, changedTouches: [{ clientX: 205, clientY: 302 }] });

  // the same finger, dragged up instead of sideways, is a jump and leaves the lane alone
  documentHandlers.touchstart({ target: world, composedPath: () => [world], touches: [{ clientX: 150, clientY: 300 }] });
  documentHandlers.touchmove({ touches: [{ clientX: 154, clientY: 244 }], preventDefault() {} });
  assert.equal(game.air?.kind, 'jump', 'an upward drag leaves the ground');
  assert.equal(game.lane, 2, 'and never drags Sam out of the lane he chose');
  documentHandlers.touchend({ target: world, changedTouches: [{ clientX: 154, clientY: 244 }] });
});

test("Sam's lane runner handles iPhone Pointer Events without turning the swipe into a tap", () => {
  const { api, context } = runtime();
  context.window.PointerEvent = function PointerEvent() {};
  const documentHandlers = {}, worldHandlers = {};
  context.document.addEventListener = (type, fn) => { documentHandlers[type] = fn; };
  context.document.removeEventListener = () => {};
  const classList = { add() {}, remove() {} };
  const style = () => ({ left: '', setProperty(name, value) { this[name] = value; } });
  const runner = { style: style(), classList, offsetWidth: 80 };
  const focus = { style: style() };
  context.document.getElementById = id => id === 'samRunRunner' ? runner : id === 'samRunLaneFocus' ? focus : null;
  let captured = null, released = null;
  const world = {
    classList, tabIndex: -1,
    addEventListener(type, fn) { worldHandlers[type] = fn; },
    contains: () => true,
    getBoundingClientRect: () => ({ left: 0, width: 300 }),
    setPointerCapture(id) { captured = id; },
    releasePointerCapture(id) { released = id; },
  };
  const game = { running: true, laneGame: true, lane: 1, obstacles: [] };
  api.setSamRun(game);
  api.samRunBindLaneInput(world, game);
  assert.ok(documentHandlers.pointerdown && documentHandlers.pointermove && documentHandlers.pointerup,
    'pointer-capable iPhones bind the pointer path at document capture level');
  let prevented = 0;
  const common = { pointerId: 7, pointerType: 'touch', target: world, composedPath: () => [world], cancelable: true, preventDefault: () => { prevented++; } };
  documentHandlers.pointerdown({ ...common, clientX: 150, clientY: 300 });
  documentHandlers.pointermove({ ...common, clientX: 190, clientY: 302 });
  documentHandlers.pointerup({ ...common, clientX: 190, clientY: 302 });
  assert.equal(captured, 7);
  assert.equal(released, 7);
  assert.equal(game.lane, 2, 'a touch pointer swipe moves to the adjacent lane');
  assert.equal(runner.style.left, '80%', 'the runner visibly follows the swipe');
  assert.ok(prevented >= 3, 'Safari never gets to reinterpret the gesture as page movement');
  let clickPrevented = false, clickStopped = false;
  documentHandlers.click({
    target: world, composedPath: () => [world],
    preventDefault: () => { clickPrevented = true; },
    stopPropagation: () => { clickStopped = true; },
    stopImmediatePropagation() {},
  });
  assert.equal(clickPrevented, true, 'the synthetic click following a swipe is cancelled');
  assert.equal(clickStopped, true, 'the synthetic click cannot select the gate beneath the finger');
});

test("Sam's lane runner still swipes when the road arrives after the view transition", () => {
  const { api, context } = runtime();
  context.window.PointerEvent = function PointerEvent() {};
  const documentHandlers = {};
  context.document.addEventListener = (type, fn) => { documentHandlers[type] = fn; };
  context.document.removeEventListener = () => {};
  const classList = { add() {}, remove() {} };
  const style = () => ({ left: '', setProperty(name, value) { this[name] = value; } });
  const runner = { style: style(), classList, offsetWidth: 80 };
  const focus = { style: style() };
  const world = {
    classList, tabIndex: -1,
    contains: () => true,
    getBoundingClientRect: () => ({ left: 0, width: 300 }),
    setPointerCapture() {}, releasePointerCapture() {},
  };
  /* hx() swaps the play screen in inside a view transition, so #samRunWorld is
     still missing from the document while the run binds its gestures. */
  context.document.getElementById = id => id === 'samRunRunner' ? runner : id === 'samRunLaneFocus' ? focus : null;
  const game = { running: true, laneGame: true, lane: 1, obstacles: [] };
  api.setSamRun(game);
  api.samRunBindLaneInput(null, game);
  assert.ok(documentHandlers.pointerdown && documentHandlers.pointerup,
    'the swipe binds even though the road is not in the document yet');

  context.document.getElementById = id => id === 'samRunWorld' ? world
    : id === 'samRunRunner' ? runner : id === 'samRunLaneFocus' ? focus : null;
  const common = { pointerId: 3, pointerType: 'touch', target: world, composedPath: () => [world], cancelable: true, preventDefault() {} };
  documentHandlers.pointerdown({ ...common, clientX: 150, clientY: 300 });
  documentHandlers.pointermove({ ...common, clientX: 195, clientY: 301 });
  documentHandlers.pointerup({ ...common, clientX: 195, clientY: 301 });
  assert.equal(game.lane, 2, 'the swipe finds the road once the transition has applied it');
  assert.equal(runner.style.left, '80%', 'the runner slides to the swiped lane');

  documentHandlers.keydown({ key: 'ArrowLeft', preventDefault() {} });
  assert.equal(game.lane, 1, 'arrow keys steer without the road having to hold focus');

  // a gesture whose pointerup never arrives must not lock the road for the run
  documentHandlers.pointerdown({ ...common, pointerId: 4, clientX: 150, clientY: 300 });
  documentHandlers.pointerdown({ ...common, pointerId: 5, clientX: 150, clientY: 300 });
  documentHandlers.pointermove({ ...common, pointerId: 5, clientX: 105, clientY: 301 });
  assert.equal(game.lane, 0, 'a fresh touch recovers from a swipe that was never released');
});

test("the lane runner shares one perspective camera", () => {
  const { api } = runtime();
  const at = p => api.samRunDepth(p);
  const horizon = at(0), mid = at(.5), near = at(1);
  assert.equal(Math.round(horizon.y), 40, 'the road starts on the painted horizon');
  assert.equal(Math.round(near.y), 96, 'and reaches the foot plane instead of resolving beside his head');
  assert.ok(at(.985).y > 94, 'the collision beat is visibly at the runner before it resolves');
  assert.ok(horizon.scale < mid.scale && mid.scale < near.scale, 'things only ever grow on the way in');
  // 1/z, not a straight line: most of the travel belongs to the final moments
  assert.ok(mid.y - horizon.y < (near.y - horizon.y) * .4,
    'a gate hangs near the horizon and then rushes past, instead of drifting down at a constant rate');
  assert.ok(near.spread / near.scale - mid.spread / mid.scale < 1e-9,
    'lane spacing scales with the gates themselves, so lanes and gate widths always agree');
  assert.ok(at(1.18).y > 100, 'anything that passes the player leaves the screen instead of piling up');
  assert.deepEqual(at(-3), at(0), 'a gate still waiting at the edge is pinned to the horizon');
});

test("the road between questions carries coins, roadworks and depth traffic", () => {
  const { api, context } = runtime();
  assert.match(html, /\.game-rush \.rush-coin,\.game-coin-flight\{width:54px;height:54px;[\s\S]*?radial-gradient[\s\S]*?animation:none\}/,
    'coins use one large, fixed gold face instead of a platform emoji');
  assert.match(html, /\.game-rush \.rush-coin:after,\.game-coin-flight:after\{content:'★'/,
    'the gold coin has its own embossed mark on every phone');
  const takeFrames = html.match(/@keyframes gameCoinTake\{[^\n]+/)?.[0] || '';
  assert.match(takeFrames, /scale:/, 'collection can brighten and shrink the gold face');
  assert.doesNotMatch(takeFrames, /transform:/,
    'collection never replaces the inline perspective transform and teleports a coin to the origin');
  const coinSpawner = html.match(/function samRunSpawnCoins[\s\S]*?(?=function samRunSpawnHurdle)/)?.[0] || '';
  assert.doesNotMatch(coinSpawner, /🪙/, 'road coins never inherit the silver iOS emoji artwork');
  assert.match(html, /id="samRunRunWallet"[\s\S]*?id="samRunRunCoins"/,
    'collected gold has a live destination in the run HUD');
  assert.doesNotMatch(html, /@keyframes gameCoinSpin/,
    'coins do not spin while the player is trying to see their lane');
  assert.match(html, /if\(g\.laneGame\) samRunRunRoad\(dt\)/,
    'the run loop drives the road, not just the questions');
  assert.match(html, /samRunSpawnRush\('stone'\)/, 'lane stones stream out of the horizon');
  assert.match(html, /for\(const side of \[-1,1\]\)/,
    'each depth beat paints both lane seams instead of random white debris');
  assert.match(html, /\.game-world\.lane-game \.game-mid\{[\s\S]*?animation:none!important/,
    'the distant city no longer scrolls sideways against the forward camera');
  assert.match(html, /el\.className='rush-hurdle'; el\.innerHTML='<span><\/span><span><\/span><span><\/span>'/,
    'single-lane roadworks use a consistent cone graphic rather than an emoji barrier');
  assert.match(html, /const live=g\.obstacles\.find\(o=>!o\.resolved&&o\.laneWave\);/);
  assert.match(html, /if\(!g\.finishing&&g\.time>=g\.nextPickupAt&&\(!live\|\|live\.progress<\.4\)\) samRunSpawnPickup\(\)/,
    'a coin never appears while a question is already closing in');
  assert.match(html, /if\(feature==='walls'\|\|feature==='hurdles'\) return g\.phase\.id!=='learn';/,
    'the first, gentlest phase of a world stays a pure reading run');
  assert.match(html, /if\(!still\)\{/, 'decoration is skipped for players who asked for less motion');

  const markerHost = { children: [], appendChild(node) { this.children.push(node); } };
  context.document.getElementById = id => id === 'samRunRush' ? markerHost : null;
  context.document.createElement = () => ({ className: '', style: {}, remove() {} });
  const markerGame = { props: [], stageIndex: 0 };
  api.setSamRun(markerGame);
  api.samRunSpawnRush('stone');
  assert.deepEqual(markerGame.props.map(p => p.side), [-1, 1], 'the paired markers share one depth and stay parallel');

  const style = () => ({ setProperty(n, v) { this[n] = v; } });
  const el = () => ({ style: style(), classList: { list: [], add(c) { this.list.push(c); } }, remove() {} });
  const coin = { el: el(), kind: 'coin', lane: 1, p: .95, done: false };
  const hurdle = { el: el(), kind: 'hurdle', lane: 1, p: .95, done: false };
  const game = { running: true, laneGame: true, lane: 1, worldW: 300, worldH: 600, streak: 4, cleanStreak: 4,
    lives: 3, score: 0, runCoinBonus: 0, obstacles: [], pickups: [coin, hurdle], props: [], mission: null };
  api.setSamRun(game);
  api.samRunTakePickup(coin);
  assert.equal(game.runCoinBonus, 1, 'a collected coin is worth a coin at the end of the run');
  assert.equal(game.streak, 4, 'and never disturbs the answer combo');
  api.samRunTakePickup(hurdle);
  assert.equal(game.streak, 0, 'running into roadworks breaks the combo');
  assert.equal(game.lives, 3, 'but never costs a heart — this stays a reading game');
});

test("walls give the road a vertical axis that can only be answered by reading", () => {
  const { api, context } = runtime();
  assert.match(html, /const SAM_RUN_AIR_LEAD_MS=340/,
    'queued actions begin close enough to contact for the visible pose to match collision');
  assert.match(html, /48%\{transform:translateY\(-94px\)\}/,
    'the jump apex visibly clears the full-height bar');
  assert.match(html, /pu\.kind==='duck'\?'translate\(-50%,-350%\)'/,
    'the overhead beam clears the fully crouched head instead of clipping through it');
  assert.match(html, /gameDuckBackHead[\s\S]*?translateY\(50px\)/,
    'ducking folds the head and torso under the overhead beam');
  assert.match(html, /\.game-runner\.is-air-duck \.back-elbow-l\{animation:gameDuckElbowL/,
    'the elbows stop their running cycle and join the crouch');
  assert.match(html, /\.game-back-avatar\.has-ride \.back-air-root\{animation:none\}[^\n]*gameRideDuckRider/,
    'ducking lowers the rider without sinking an equipped vehicle into the road');
  assert.match(html, /\.game-world\.lane-game \.game-runner\.is-hit\{animation:gameBackHit \.55s ease both!important\}/,
    'reduced-motion mode keeps the rear-view hit reaction on the correct axis');
  assert.match(html, /el\.style\.width=Math\.round\(g\.worldW\*\.93\)\+'px'/,
    'a wall spans the whole road: stepping around it is not one of the options');
  assert.match(html, /el\.innerHTML=`<b class="wall-command"><span>\$\{jump\?'⬆':'⬇'\}<\/span>\$\{jump\?'JUMP':'DUCK'\}<\/b>`;/,
    'and carries one large, explicit action sign above the obstacle');
  assert.match(html, /\.game-rush \.wall-command\{[\s\S]*?font-size:32px/,
    'JUMP and DUCK remain readable well before impact');
  assert.match(html, /transform-origin:0 0/,
    'the rush layer anchors from its top-left so a scaled wall stays centred on the road');

  const classList = () => { const list = []; return { list, add(c) { list.push(c); }, remove(c) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }, contains: c => list.includes(c) }; };
  const runner = { classList: classList(), offsetWidth: 80, style: { setProperty() {} } };
  context.document.getElementById = id => id === 'samRunRunner' ? runner : null;
  const wall = (kind, life = 1300) => ({ el: { classList: classList(), style: {}, remove() {} }, kind, lane: 1, wide: true, p: .95, life, done: false });
  const game = { running: true, laneGame: true, lane: 1, worldW: 300, worldH: 600, streak: 5, cleanStreak: 5,
    lives: 3, score: 0, runCoinBonus: 0, time: 1000, air: null, obstacles: [], pickups: [], props: [], mission: null,
    phase: { id: 'final' }, nextSpawnAt: Infinity };
  api.setSamRun(game);

  api.samRunAirborne('jump');
  assert.equal(game.air.kind, 'jump', 'a swipe up leaves the ground');
  assert.ok(runner.classList.contains('is-air-jump'));
  const airborneUntil = game.air.until;
  api.samRunAirborne('duck');
  assert.equal(game.air.until, airborneUntil, 'and cannot be turned into a second jump in mid-air');

  const jumped = wall('jump');
  api.samRunTakePickup(jumped);
  assert.equal(game.streak, 5, 'clearing a wall keeps the answer combo whole');
  assert.equal(game.runCoinBonus, 1, 'and pays a coin');
  assert.equal(game.clearedWalls, 1);

  // the wrong gesture is a miss, and so is no gesture at all
  for (const [kind, air] of [['duck', 'jump'], ['jump', null]]) {
    Object.assign(game, { streak: 5, cleanStreak: 5, lives: 3 });
    game.air = air ? { kind: air, until: game.time + 500 } : null;
    game.lastAir = air ? { kind: air, at: game.time } : null;
    api.samRunTakePickup(wall(kind));
    assert.equal(game.streak, 0, `${air || 'nothing'} against a ${kind} wall breaks the combo`);
    assert.equal(game.lives, 3, 'and still never costs a heart');
  }

  // An early read is accepted, while the visible jump waits for the physical
  // contact beat. This preserves forgiving input without a magical collision.
  Object.assign(game, { streak: 5, cleanStreak: 5, lives: 3, runCoinBonus: 0, coinsRun: 0, air: null, lastAir: null, queuedAir: null });
  const queued = wall('jump', 2600); queued.p = 0; game.pickups = [queued];
  api.samRunAirborne('jump');
  assert.equal(game.air, null, 'a far wall does not make the character jump and land immediately');
  assert.equal(game.queuedAir.pickup, queued, 'but the early swipe is remembered for that exact wall');
  assert.ok(runner.classList.contains('is-ready-jump'), 'a restrained anticipation pose confirms the input');
  queued.p = 1 - 340 * api.samRunPace(game) / queued.life;
  api.samRunMaybeStartQueuedAir();
  assert.equal(game.air.kind, 'jump', 'the authored jump begins as the wall enters the contact window');
  assert.equal(game.queuedAir, null);
  api.samRunTakePickup(queued);
  assert.equal(game.streak, 5, 'the queued early read clears the wall during the visible pose');

  Object.assign(game, { streak: 5, cleanStreak: 5, lives: 3, air: null, queuedAir: null, pickups: [] });
  game.lastAir = { kind: 'jump', at: game.time - 1000, until: game.time - 400 };
  api.samRunTakePickup(wall('jump'));
  assert.equal(game.streak, 0, 'a character who landed long ago no longer passes through the wall');

  Object.assign(game, { streak: 5, cleanStreak: 5, lives: 3, air: null });
  game.lastAir = { kind: 'jump', at: game.time - 700, until: game.time - 100 };
  api.samRunTakePickup(wall('jump'));
  assert.equal(game.streak, 5, 'a small landing grace still covers a dropped frame at contact');
  // one gesture clears one wall — a tunnel still needs a duck per beam
  Object.assign(game, { streak: 5, cleanStreak: 5, lives: 3, air: null });
  game.lastAir = { kind: 'duck', at: game.time - 400, until: game.time + 100 };
  api.samRunTakePickup(wall('duck'));
  assert.equal(game.streak, 5, 'the first beam is cleared');
  api.samRunTakePickup(wall('duck'));
  assert.equal(game.streak, 0, 'the second needs its own duck');

  // a wall is aimed at the gap, never at the same depth as a live gate
  game.obstacles = [{ resolved: false, laneWave: true, progress: .5, travelMs: 2000 }];
  assert.equal(api.samRunRoadClear(game, 1000), false, 'a wall may not land on top of the gate it shares the road with');
  assert.equal(api.samRunRoadClear(game, 1700), false, 'nor close on its heels — half a second is not time to think');
  assert.equal(api.samRunRoadClear(game, 2200), true, 'but a clear beat later the road is its own');
  game.obstacles = [];
  assert.equal(api.samRunRoadClear(game, 1000), true, 'an empty road is always clear');
  // the wave that has not spawned yet occupies its slot too
  game.nextSpawnAt = game.time + 200;
  const wave = api.samRunWaveTiming(game);
  assert.equal(api.samRunRoadClear(game, 200 + wave.warnMs + wave.travelMs), false,
    'a wall may not be scheduled into the slot the next question is about to take');
  // squarely between two waves is the one place a wall belongs
  const period = wave.warnMs + wave.travelMs * .86;
  assert.equal(api.samRunRoadClear(game, 200 + wave.warnMs + wave.travelMs + Math.round(period / 2)), true,
    'but the road between two of them is free');
});

test("the final challenge is the fastest gear and the only one that pairs walls", () => {
  const { api, context } = runtime();
  assert.match(html, /const phasePace=g\.phase\.id==='final'\?\.74:g\.phase\.id==='speed'\?\.82:1;/,
    'each phase of a world is a gear, and the final challenge is the quickest');
  assert.match(html, /warnMs=g\.phase\.id==='final'\?500:650/,
    'and gives the shortest look at a wave before it starts moving');
  // it is named the final challenge, so it must not be gentler than the speed one
  const wave = id => Math.round(api.samRunTravelMs(0) * (id === 'final' ? .74 : id === 'speed' ? .82 : 1))
    + (id === 'final' ? 500 : 650);
  assert.ok(wave('learn') > wave('speed') && wave('speed') > wave('final'),
    'the three phases of a world are a monotone difficulty curve');

  const host = { children: [], appendChild(el) { this.children.push(el); } };
  context.document.getElementById = id => id === 'samRunRush' ? host : null;
  const batchesFor = phase => {
    const g = { phase: { id: phase }, score: 0, time: 0, worldW: 300, worldH: 600,
      obstacles: [], pickups: [], props: [], nextPickupAt: 0, taught: {} };
    api.setSamRun(g);
    const out = [];
    for (let i = 0; i < 400; i++) {
      g.pickups.length = 0; g.time = 1; g.nextPickupAt = -1;
      api.samRunSpawnPickup();
      const walls = g.pickups.filter(x => x.wide);
      if (walls.length) out.push({ walls, coins: g.pickups.filter(x => x.kind === 'coin').length });
    }
    return out;
  };

  const final = batchesFor('final'), speed = batchesFor('speed');
  assert.ok(final.length > 40 && speed.length > 40, 'walls are a regular part of both later phases');
  assert.ok(speed.every(b => b.walls.length === 1), 'the speed challenge never doubles up');
  const pairs = final.filter(b => b.walls.length === 2);
  assert.ok(pairs.length > final.length * .25, 'pairs are frequent enough to be the final challenge’s signature');
  assert.ok(pairs.every(b => b.walls[0].kind !== b.walls[1].kind),
    'a pair is always one gesture and then the other — never a repeat, so the second wall has to be read');
  assert.ok(pairs.every(b => b.walls[1].life > b.walls[0].life),
    'and the second wall of a pair is always the one further out');
  assert.ok(final.some(b => b.coins > 0) && speed.some(b => b.coins > 0),
    'a wall and a line of coins can share one gap');
  assert.equal(batchesFor('learn').length, 0, 'the learn phase still has no walls at all');
});

test("a wall keeps its beat away from the questions at every pace, and the road never runs out of them", () => {
  const { api, context } = runtime();
  const host = { children: [], appendChild(el) { this.children.push(el); } };
  context.document.getElementById = id => id === 'samRunRush' ? host : null;
  // the sliding gap paints its own cells, so the stub has to have some
  context.document.createElement = () => ({ className: '', innerHTML: '', style: {},
    classList: { add() {}, toggle() {} }, setAttribute() {}, appendChild() {}, remove() {},
    querySelectorAll: () => [0, 1, 2].map(() => ({ classList: { toggle() {}, add() {} } })) });
  const endlessAt = d => ({ endless: true, distance: d, score: 0, time: 0, worldW: 300, worldH: 600,
    phase: api.SAM_RUN_ENDLESS_PHASE, obstacles: [], pickups: [], props: [], nextPickupAt: 0, taught: {} });

  // the room a wall demands has to shrink with the wave period: the questions
  // come every 1.3s at full speed, so a flat 900ms forbade the whole road
  for (const d of [400, 1200, 2000, 2600]) {
    const g = endlessAt(d), wave = api.samRunWaveTiming(g), period = wave.warnMs + wave.travelMs * .86;
    assert.ok(api.samRunGateSep(period) * 2 < period,
      `at ${d}m two separations must still fit inside one wave period, or no wall can ever be placed`);
  }

  // and with a question on the road, a wall is walked forward to a clear slot
  const walls = d => {
    const g = endlessAt(d);
    api.setSamRun(g);
    let seen = 0, tooClose = 0;
    for (let i = 0; i < 300; i++) {
      g.pickups.length = 0; g.time = 1; g.nextPickupAt = -1;
      // a live question, at a fresh point of its approach each time
      g.obstacles = [{ resolved: false, laneWave: true, progress: (i % 10) / 10, travelMs: 1800 }];
      api.samRunSpawnPickup();
      const wave = api.samRunWaveTiming(g), sep = api.samRunGateSep(wave.warnMs + wave.travelMs * .86);
      const gate = (1 - g.obstacles[0].progress) * g.obstacles[0].travelMs, pace = api.samRunPace(g);
      for (const pu of g.pickups.filter(x => x.wide)) {
        seen++;
        // life/pace is the journey the wall actually makes, and it must not
        // end in the same moment the child is reading the word
        if (Math.abs(pu.life / pace - gate) < sep * .75) tooClose++;
      }
    }
    return { seen, tooClose };
  };
  for (const d of [700, 1400, 2200, 2600]) {
    const { seen, tooClose } = walls(d);
    assert.ok(seen > 30, `walls must keep coming at ${d}m — the road gets harder with distance, not emptier`);
    assert.equal(tooClose, 0, `and none of them lands on the word the child is still reading at ${d}m`);
  }
});

test("the endless run is measured in metres and hands out its mechanics by distance", () => {
  const { api } = runtime();
  const endless = d => ({ endless: true, distance: d, score: 0, phase: api.SAM_RUN_ENDLESS_PHASE });

  // a world winds up with its score; the endless road winds up with distance
  assert.equal(api.samRunPace(endless(0)), 1);
  assert.ok(api.samRunPace(endless(1300)) > api.samRunPace(endless(400)), 'the run keeps accelerating');
  assert.equal(api.samRunPace(endless(9999)), api.samRunPace(endless(2600)), 'but it tops out rather than becoming impossible');
  assert.equal(api.samRunPace({ score: 0, phase: { id: 'learn' } }), api.samRunSpeedFor(0),
    'a world run is untouched and still paces off its score');

  const far = api.samRunWaveTiming(endless(2600)), near = api.samRunWaveTiming(endless(0));
  assert.ok(far.travelMs < near.travelMs && far.warnMs < near.warnMs, 'waves tighten as the run gets longer');
  assert.ok(far.travelMs >= 1100 && far.warnMs >= 400, 'and stop tightening while still readable');

  // mechanics arrive by the metre, in a fixed order, and never before their sign
  const at = api.SAM_RUN_FEATURE_AT;
  assert.ok(at.coins < at.walls && at.walls < at.hurdles && at.hurdles < at.pairs,
    'the run introduces itself one mechanic at a time');
  for (const [feature, metre] of Object.entries(at)) {
    assert.equal(api.samRunUnlocked(endless(Math.max(0, metre - 1)), feature), metre === 0,
      `${feature} must not appear before ${metre}m`);
    assert.equal(api.samRunUnlocked(endless(metre), feature), true, `${feature} appears at ${metre}m`);
  }
  // a world still gates the same things by phase, exactly as before
  const world = id => ({ phase: { id }, score: 0 });
  assert.equal(api.samRunUnlocked(world('learn'), 'walls'), false);
  assert.equal(api.samRunUnlocked(world('speed'), 'walls'), true);
  assert.equal(api.samRunUnlocked(world('speed'), 'pairs'), false);
  assert.equal(api.samRunUnlocked(world('final'), 'pairs'), true);

  // medals are cumulative and ordered
  assert.equal(api.samRunMedalsFor(0).length, 0);
  assert.equal(api.samRunMedalsFor(api.SAM_RUN_MEDALS[0].m).length, 1);
  assert.equal(api.samRunMedalsFor(99999).length, api.SAM_RUN_MEDALS.length);
  const metres = api.SAM_RUN_MEDALS.map(x => x.m);
  assert.deepEqual(metres.join(), [...metres].sort((a, b) => a - b).join(), 'medals climb');

  assert.match(html, /g\.finishing\|\|g\.lives<=0\|\|g\.endless\) return;/,
    'an endless run has no finish line to reach — only the hearts can stop it');
  assert.match(html, /g\.distance\+=dt\/1000\*8\.5\*samRunPace\(g\)/, 'distance is what the run accumulates');
  assert.match(html, /const scene=\(\(g\.sceneOrigin\|\|0\)\+Math\.floor\(metre\/700\)\)%SAM_RUN_STAGES\.length/,
    'and the roadside rolls forward from the scene the run actually opened on');
});

test("the late road adds a gap that moves and a tunnel to stay down through", () => {
  const { api, context } = runtime();
  const at = api.SAM_RUN_FEATURE_AT;
  const endless = d => ({ endless: true, distance: d });

  assert.ok(at.slider > at.pairs && at.tunnel > at.slider,
    'the two hardest things on the road arrive last, after everything that teaches them');
  for (const feature of ['slider', 'tunnel']) {
    assert.equal(api.samRunUnlocked(endless(at[feature] - 1), feature), false, `${feature} waits for its metre`);
    assert.equal(api.samRunUnlocked(endless(at[feature]), feature), true);
    assert.equal(api.samRunUnlocked({ phase: { id: 'final' }, score: 0 }, feature), false,
      `a world never travels far enough to earn ${feature}`);
  }
  assert.doesNotMatch(html, /SAM_RUN_FEATURE_SAY|samRunAnnounce|samRunSwipeHint/,
    'new road mechanics arrive without interrupting play with announcement cards');

  // three cells, exactly one of them open, and the open one moves on the way in
  const cells = () => Array.from({ length: 3 }, () => {
    const list = [];
    return { classList: { toggle(c, on) { const i = list.indexOf(c); if (on && i < 0) list.push(c); if (!on && i >= 0) list.splice(i, 1); },
      contains: c => list.includes(c), add(c) { list.push(c); } } };
  });
  let made = [];
  context.document.createElement = () => {
    const c = cells();
    made.push(c);
    return { className: '', innerHTML: '', style: {}, classList: { add() {}, contains: () => false },
      querySelectorAll: () => c, appendChild() {}, remove() {} };
  };
  const host = { appendChild() {} };
  context.document.getElementById = id => id === 'samRunRush' ? host : null;
  const game = { endless: true, distance: 1600, score: 0, worldW: 300, worldH: 600, lane: 1, streak: 6,
    cleanStreak: 6, lives: 3, runCoinBonus: 0, time: 0, obstacles: [], pickups: [], props: [], phase: { id: 'endless' } };
  api.setSamRun(game);

  const gap = api.samRunSpawnGap(1200);
  const openLane = () => made[0].findIndex(c => c.classList.contains('open'));
  assert.equal(made[0].filter(c => c.classList.contains('open')).length, 1, 'exactly one lane is ever open');
  assert.equal(openLane(), gap.free);
  assert.notEqual(gap.free2, gap.free, 'and it does not slide back to where it already was');
  gap.p = gap.slideAt - .01; api.samRunPaintPickup(gap);
  assert.equal(openLane(), gap.free, 'the gap holds still on the way out of the horizon');
  const was = gap.free;
  gap.p = gap.slideAt + .01; api.samRunPaintPickup(gap);
  assert.equal(gap.free, gap.free2, 'then slides once');
  assert.notEqual(gap.free, was);
  assert.equal(openLane(), gap.free, 'and the blocks follow it');
  assert.equal(made[0].filter(c => c.classList.contains('open')).length, 1);

  // being in the open lane is the only way through, and missing it costs no heart
  const through = inGap => {
    Object.assign(game, { streak: 6, cleanStreak: 6, lives: 3, runCoinBonus: 0 });
    game.lane = inGap ? gap.free : (gap.free + 1) % 3;
    api.samRunTakePickup({ ...gap, done: false });
    return { streak: game.streak, lives: game.lives, coins: game.runCoinBonus };
  };
  assert.deepEqual(through(true), { streak: 6, lives: 3, coins: 1 }, 'through the gap keeps the combo and pays a coin');
  assert.deepEqual(through(false), { streak: 0, lives: 3, coins: 0 }, 'and hitting it costs the combo, never a heart');

  // the tunnel is three low beams at an even rhythm
  game.pickups.length = 0; made = [];
  const end = api.samRunSpawnTunnel(1100);
  const beams = game.pickups.filter(x => x.wide);
  assert.equal(beams.length, 3);
  assert.ok(beams.every(x => x.kind === 'duck'), 'a tunnel is stayed down through, not jumped');
  /* p advances by dt/life*pace, so the journey a beam actually makes is
     life/pace — and that has to be the time it was asked for, or everything
     placed around it is placed in the wrong second. */
  const pace = api.samRunPace(game);
  const arrivals = beams.map(x => x.life / pace);
  assert.ok(pace > 1.2, 'the fixture has to be at a real pace for this to prove anything');
  assert.ok(Math.abs(arrivals[0] - 1100) < 1, 'a beam asked to arrive in 1100ms takes 1100ms to arrive');
  assert.ok(Math.abs((arrivals[1] - arrivals[0]) - (arrivals[2] - arrivals[1])) < 30, 'evenly spaced');
  assert.ok(arrivals[2] - arrivals[1] > 700, 'and far enough apart to duck again between them');
  assert.ok(end >= arrivals[2] - 1, 'the gap after it is measured from the last beam, not the first');

  assert.match(html, /if\(g\.air&&g\.air\.until>g\.time\+220\) return;/,
    'the mid-air lock is short enough that three ducks are a rhythm rather than a race');
  assert.match(html, /menu\.push\(\['coins',44\]\)/,
    'coins stay on the menu at a fixed share however much the road unlocks');
});

test("sentence rounds rebuild a phrase the child already learned whole", () => {
  const { api } = runtime();
  assert.equal(api.samRunSentencePool(0).length, 0, 'nothing to rebuild before the first lesson');
  assert.ok(api.samRunSentencePool(15).length > api.samRunSentencePool(5).length, 'the more lessons, the more phrases');

  for (const sentence of api.samRunSentencePool(api.LESSONS.length)) {
    assert.ok(sentence.words.length >= 2 && sentence.words.length <= 4,
      `"${sentence.say}" is not a length a child can hold in his head while running`);
    assert.ok(sentence.words.every(w => w.length <= 9 && w === w.toUpperCase()),
      `"${sentence.say}" has a word that will not fit on a gate`);
    assert.doesNotMatch(sentence.say, /[{}]/, 'a phrase with a slot to fill is not a sentence anyone can rebuild');
    assert.doesNotMatch(sentence.he, /\[\[/);
    // the phrase must genuinely come from a lesson, word for word and in order
    const source = api.LESSONS.flatMap(l => l.phrases).find(ph => ph.en === sentence.say && ph.he === sentence.he);
    assert.ok(source, `"${sentence.say}" is not a phrase any lesson teaches`);
    assert.equal(sentence.words.join(' '),
      source.en.replace(/[.,!?]/g, ' ').trim().split(/\s+/).join(' ').toUpperCase(),
      'the words must be the phrase itself, in its own order');
  }
  // the function words that could never be gate cards are exactly what this is for
  const words = new Set(api.samRunSentencePool(15).flatMap(s => s.words));
  for (const fn of ['HOW', 'ARE', 'YOU', 'IS', 'TO', 'A', 'THE'])
    assert.ok(words.has(fn), `${fn} has no picture and no standalone Hebrew — the sentence round is its only home`);
  const cards = new Set(api.SAM_RUN_COURSE_WORDS.map(w => w[1]));
  assert.ok(['HOW', 'ARE', 'IS', 'THE'].every(w => !cards.has(w)),
    'and none of them was smuggled into the gate-card pool');

  // a list has no order a child could reason out, so it is not a sentence
  for (const sentence of api.samRunSentencePool(api.LESSONS.length)) {
    const parts = sentence.say.split(',').map(x => x.trim()).filter(Boolean);
    assert.ok(!(parts.length >= 3 && parts.every(x => !/\s/.test(x.replace(/[.!?]/g, '')))),
      `"${sentence.say}" is an enumeration — rebuilding it would mark a good answer wrong`);
  }
  assert.ok(api.samRunSentencePool(api.LESSONS.length).some(s => s.words.join(' ') === 'WATER PLEASE'),
    'but a two-part phrase like "Water, please" is a sentence and stays');
  assert.ok(api.samRunSentencePool(30).length > api.samRunSentencePool(15).length * 1.5,
    'the later units carry the sentence pool as far as the early ones did');

  assert.equal(api.samRunUnlocked({ phase: { id: 'final' } }, 'sentences'), false,
    'a world teaches five words and has no phrases of the child\'s own to rebuild');
  assert.equal(api.samRunUnlocked({ endless: true, distance: api.SAM_RUN_FEATURE_AT.sentences }, 'sentences'), true);

  assert.match(html, /const own=\[\.\.\.new Set\(s\.words\.filter\(w=>w!==word\)\)\];/,
    "the decoys are the sentence's own other words, so the wave asks which comes NEXT");
  assert.match(html, /if\(!ob\.sentenceWave\)\{\s*\n\s*g\.runSeen\[ob\.cmd\]/,
    'a sentence word keeps no mastery of its own — HOW and ARE do not belong in that record');
  // A wrong word now teaches and retries the same slot. It should not punish a
  // child for failing to infer an order from three moving cards.
  const wrongBranch = html.slice(html.indexOf('if(ob.sentenceWave){'));
  const branchBody = wrongBranch.slice(0, wrongBranch.indexOf('return;'));
  assert.doesNotMatch(branchBody, /g\.streak=0|samRunHit\(/,
    'a wrong sentence word costs neither the visible combo nor a heart');
  assert.match(branchBody, /g\.cleanStreak=0;/,
    'but the separate no-mistakes mission remains honest');
  assert.match(branchBody, /g\.sentenceHint=ob\.cmd;/,
    'the expected word is revealed in the sentence itself');
  assert.match(branchBody, /samRunSentencePrompt\(\)/,
    'the correction is rendered immediately');
  assert.match(branchBody, /g\.nextSpawnAt=Math\.max\(g\.nextSpawnAt,g\.time\+950\)/,
    'the child gets time to read the correction before the same slot returns');
  assert.match(html, /g\.sentenceHint=null;\s*\n\s*samRunSentencePrompt\(\);/,
    'the revealed answer becomes a question again when the retry gates arrive');
  assert.doesNotMatch(branchBody, /samRunAdvanceSentence\(ob\)/,
    'a wrong choice cannot silently advance the sentence');
  assert.match(html, /samRunSentencePrompt\(\);\s*\n\s*g\.nextSpawnAt=Math\.max\(g\.nextSpawnAt,g\.time\+700\);/,
    'the sentence panel gets a readable preview before its first gates move');
  assert.match(html, /samRunStartSentence\(\); return;/,
    'starting a sentence cannot spawn its first word in the same frame');
  assert.match(html, /game-lane-prompt\.is-sentence[^}]*width:min\(420px,calc\(100% - 22px\)\)/,
    'the sentence prompt uses almost the full phone width');
  assert.match(html, /game-sentence\{[^}]*font-size:clamp\(20px,5\.4vw,26px\)[^}]*white-space:normal/,
    'the assembled English is large and wraps instead of clipping');
  assert.match(html, /game-world\.lane-game \.game-lane-prompt\.is-sentence \.sentence-kicker\{[^}]*font-size:13px/,
    'the sentence instruction is not reduced back to the normal 10px prompt size');
  assert.match(html, /@media \(max-height:700px\)\{\.game-world\.lane-game \.game-lane-prompt\.is-sentence\{top:138px/,
    'short phones keep the sentence panel above the approaching gates');
  assert.doesNotMatch(html, /class="sentence-gap"/,
    'line wrapping cannot strand a direction arrow away from its word');
  assert.match(html, /g\.nextSpawnAt=Math\.max\(g\.nextSpawnAt,g\.time\+1500\);/,
    'the road is held for a beat so the finished sentence can be seen and heard');
  assert.match(html, /if\(g\.sentence\) samRunSpawnSentenceWave\(\); else samRunSpawnLaneWave\(\);/,
    'a sentence owns the road until it is finished');
});

test("a wrong sentence choice teaches, retries, and advances only after correction", () => {
  const { api, context } = runtime();
  const classList = () => ({ add() {}, remove() {}, toggle() {}, contains: () => false });
  const prompt = { innerHTML: '', classList: classList(), setAttribute() {}, removeAttribute() {} };
  const host = { children: [], appendChild(el) { this.children.push(el); } };
  context.document.createElement = () => ({
    className: '', innerHTML: '', style: {}, classList: classList(), remove() {},
    querySelectorAll: () => Array.from({ length: 3 }, () => ({ classList: classList() })),
  });
  context.document.getElementById = id => id === 'samRunObstacles' ? host : id === 'samRunLanePrompt' ? prompt : null;

  const sentence = { say: 'Good morning', he: 'בוקר טוב', words: ['GOOD', 'MORNING'] };
  const game = {
    endless: true, distance: 500, phase: api.SAM_RUN_ENDLESS_PHASE, score: 0, time: 1000,
    worldW: 390, worldH: 700, lane: 1, laneGame: true, lives: 3, shield: 0,
    sentence, sentenceAt: 0, sentenceHint: null, sentenceWords: ['GOOD', 'MORNING', 'HELLO'],
    obstacles: [], pickups: [], obstacleSeq: 0, nextSpawnAt: 0, resolvedCount: 0, correctCount: 0,
    streak: 4, cleanStreak: 4, streakPeak: 4, cleanPeak: 4, runSeen: {}, cleared: {},
    store: { mastery: {}, cleared: {}, totalCorrect: 0, streakBest: 4, bestDistance: 0, latency: 0 },
  };
  api.setSamRun(game);
  const wrong = {
    cmd: 'GOOD', armed: 'MORNING', sentenceWave: true, laneWave: true, resolved: false,
    correctLane: 0, chosenLane: 1, bonus: false, el: context.document.createElement('div'),
  };
  game.obstacles.push(wrong);
  api.samRunResolve(wrong);

  assert.equal(game.sentenceAt, 0, 'the wrong choice stays on the same word');
  assert.equal(game.sentenceHint, 'GOOD');
  assert.match(prompt.innerHTML, />GOOD</, 'the correction is visible during the teaching beat');
  assert.equal(game.streak, 4, 'the visible combo survives');
  assert.equal(game.cleanStreak, 0, 'the no-mistakes mission does not count the error');
  assert.equal(game.lives, 3, 'sentence practice never takes a heart');
  assert.equal(game.resolvedCount, 0, 'the retry cannot inflate progress');
  assert.equal(game.nextSpawnAt, 1950);

  game.time = game.nextSpawnAt;
  api.samRunSpawnSentenceWave();
  const retry = game.obstacles.at(-1);
  assert.equal(retry.cmd, 'GOOD', 'the same word returns');
  assert.equal(game.sentenceHint, null, 'the answer is hidden once the retry starts');
  assert.match(prompt.innerHTML, />\?</, 'the current slot becomes a question again');
  retry.armed = retry.cmd;
  api.samRunResolve(retry);
  assert.equal(game.sentenceAt, 1, 'one correct retry advances exactly one slot');
  assert.equal(game.resolvedCount, 1);
  assert.equal(game.correctCount, 1);
});

test("the endless run is built from this child's own words, and remembers his record", () => {
  const seed = new Map();
  const { api } = runtime(seed);

  // a child who has barely started still gets a playable game
  const cold = api.samRunEndlessWords(api.samRunStore(), 0);
  assert.ok(cold.active.length >= 8, "the runner's own words carry a child who has not started the course");
  assert.ok(cold.filler.length === 40);
  // once the course has taught enough, it takes over entirely
  const warm = api.samRunEndlessWords(api.samRunStore(), 13);
  const courseIds = new Set(api.SAM_RUN_COURSE_WORDS.map(w => w[0]));
  assert.ok(warm.active.length > 20 && warm.active.every(id => courseIds.has(id)),
    'a child deep in the course runs on his own vocabulary');
  assert.ok(warm.active.every(id => api.SAM_RUN_COMMANDS[id].lesson < 13), 'and never on a lesson he has not reached');
  assert.ok(api.samRunEndlessWords(api.samRunStore(), 30).active.length >= warm.active.length,
    'the pool only ever widens with more lessons');

  const store = api.samRunStore();
  assert.equal(store.bestDistance, 0);
  assert.deepEqual(store.medals.join(), '');
  api.samRunSave({ ...store, bestDistance: 1240, medals: [250, 600, 9999] });
  const back = runtime(seed).api.samRunStore();
  assert.equal(back.bestDistance, 1240, 'the record survives a reload');
  assert.deepEqual(back.medals.join(), '250,600', 'and a medal that does not exist is dropped rather than shown');

  assert.match(html, /store\.bestDistance=Math\.max\(store\.bestDistance\|\|0,metres\)/,
    'a shorter run can never lower the record');
  assert.match(html, /onclick="renderSamRunEndless\(\)"/, 'the hub starts the run');
});

test("every game word drawn from the course is really taught by the course", () => {
  const { api } = runtime();
  const pool = api.SAM_RUN_COURSE_WORDS;
  assert.ok(pool.length >= 40, 'the course pool is worth wiring up at all');

  const ids = new Set(), hebrew = new Map();
  const gameIds = new Set(api.SAM_RUN_STAGES.flatMap(s => s.words.map(w => w[0])));
  for (const id of gameIds) hebrew.set(api.SAM_RUN_COMMANDS[id].he, id);

  for (const [id, en, he, icon, aliases, move, lesson] of pool) {
    assert.ok(!ids.has(id), `${id} appears twice`);
    ids.add(id);
    assert.ok(!gameIds.has(id), `${id} duplicates one of the game's own words`);
    assert.ok(!hebrew.has(he), `the prompt "${he}" already answers to ${hebrew.get(he)}`);
    hebrew.set(he, id);
    assert.ok(en.length <= 10, `${en} is too long to read on a moving gate`);
    assert.equal(en, en.toUpperCase(), `${en} must be gate-cased`);
    assert.ok(Number.isInteger(lesson) && lesson >= 0 && lesson < api.LESSONS.length, `${id} cites lesson ${lesson}`);
    assert.ok(Array.isArray(aliases) && aliases.includes(id), `${id} must recognise itself`);
    assert.ok(['is-jumping', 'is-ducking', 'is-stopped', 'is-collecting', 'is-waving', 'is-catching'].includes(move),
      `${id} has an unknown pose`);
    const graphemes = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(icon)];
    assert.equal(graphemes.length, 1, `${id} needs exactly one emoji, not "${icon}"`);

    // the whole promise of this pool: the word is one the child has actually met
    const phrases = api.LESSONS[lesson].phrases.map(p => p.en.toLowerCase());
    const spelled = new RegExp(`(^|[^a-z])${id}([^a-z]|$)`);
    assert.ok(phrases.some(ph => spelled.test(ph)),
      `${id} is not in any phrase of lesson ${lesson}: ${JSON.stringify(phrases)}`);
    const earlier = api.LESSONS.slice(0, lesson)
      .findIndex(l => l.phrases.some(ph => spelled.test(ph.en.toLowerCase())));
    assert.equal(earlier, -1, `${id} is taught earlier, in lesson ${earlier}, not ${lesson}`);

    const cmd = api.SAM_RUN_COMMANDS[id];
    assert.ok(cmd && cmd.lesson === lesson && cmd.en === en && cmd.he === he,
      `${id} did not reach SAM_RUN_COMMANDS, so no gate could ever show it`);
    assert.equal(cmd.say, en.toLowerCase(), `${id} must be pronounceable`);
  }

  // a digit emoji would hand the answer over without the word ever being read
  const numerals = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
    'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred'];
  const numeralIcons = new Set(numerals.map(n => api.SAM_RUN_COMMANDS[n].ic));
  assert.equal(numeralIcons.size, 1, 'every numeral shares one neutral icon so the English has to be read');
  assert.ok(!numeralIcons.has(api.SAM_RUN_COMMANDS.number.ic), 'and NUMBER does not borrow it');
  // same reasoning for the weekdays: a picture per day would be arbitrary
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  assert.equal(new Set(days.map(d => api.SAM_RUN_COMMANDS[d].ic)).size, 1,
    'the seven days share one icon, so the day is read rather than recognised');

  // outside those two deliberate groups, no two words may look alike
  const grouped = new Set([...numerals, ...days]);
  const icons = pool.filter(w => !grouped.has(w[0])).map(w => w[3]);
  assert.equal(new Set(icons).size, icons.length, 'no two other course words share an emoji');

  // the pool has to keep pace with the whole course, not just its opening
  assert.ok(pool.some(w => w[6] >= 25), 'the last unit of the course is represented too');
  const reach = n => pool.filter(w => w[6] < n).length;
  assert.ok(reach(30) > reach(20) && reach(20) > reach(10) && reach(10) > reach(5),
    'every unit the child finishes widens the pool');
});

test("a run carries the words this child has earned in the course", () => {
  const { api } = runtime();
  const lessonOf = id => api.SAM_RUN_COMMANDS[id].lesson;
  assert.equal(api.samRunLessonPool(0, 6).length, 0, 'a child who has finished nothing brings nothing');
  assert.equal(api.samRunLessonPool(6, 0).length, 0, 'and a limit of zero is honoured');

  const early = api.samRunLessonPool(1, 6);
  assert.ok(early.length > 0 && early.every(id => lessonOf(id) < 1),
    'one finished lesson already puts its words on the road, and nothing beyond it');

  for (const done of [3, 8, 13, 15]) {
    const pool = api.samRunLessonPool(done, 6);
    assert.ok(pool.length <= 6, 'the pool never floods a wave');
    assert.equal(new Set(pool).size, pool.length, 'and never repeats a word');
    assert.ok(pool.every(id => lessonOf(id) < done), `nothing from an unfinished lesson leaks in at ${done}`);
  }
  assert.ok(api.samRunLessonPool(15, 6).length === 6, 'a child deep in the course always gets a full pool');

  // weighted to recent lessons, but the early ones must stay reachable
  const seen = new Set();
  for (let i = 0; i < 300; i++) for (const id of api.samRunLessonPool(13, 6)) seen.add(id);
  const reachable = [...seen].map(lessonOf);
  assert.ok(Math.min(...reachable) === 0, 'lesson 1 vocabulary never falls out of rotation');
  assert.ok(new Set(reachable).size >= 10, 'and the whole course so far stays in play');
  const recentShare = api.samRunLessonPool(13, 6).filter(id => lessonOf(id) >= 10).length;
  assert.ok(recentShare >= 2, 'while what was just taught gets the bigger share');

  assert.match(html, /lesson:endless\?\[\]:\(phaseIndex\?samRunLessonPool\(state\.completed,6\):\[\]\)/,
    "the pool is read from the course itself, and stays out of a world's first teaching pass");
  assert.match(html, /g\.active\.concat\(g\.review\|\|\[\],g\.lesson\|\|\[\]\)/,
    'course words can be the answer as well as a distractor');
  assert.match(html, /choice\.lesson===undefined\?'':' from-lesson'/,
    'and a gate carrying one says where it came from');
});

test("later runs mix in words the player already met in earlier worlds", () => {
  const seed = new Map();
  const { api } = runtime(seed);
  const store = api.samRunStore();
  for (const id of ['jump', 'duck', 'run', 'red', 'blue', 'dog']) store.mastery[id] = 2;
  api.samRunSave(store);
  assert.equal(api.samRunReviewPool(store, 3, 0).length, 0,
    'the first pass through a world stays on that world\'s own five words');
  const speed = api.samRunReviewPool(store, 3, 1);
  assert.equal(speed.length, 3, 'the speed challenge widens the pool');
  assert.equal(api.samRunReviewPool(store, 3, 2).length, 5, 'and the final challenge widens it further');
  const own = api.SAM_RUN_STAGES[3].words.map(w => w[0]);
  assert.ok(speed.every(id => !own.includes(id) && (store.mastery[id] || 0) > 0),
    'review words come from earlier worlds the player has actually met');
  assert.equal(api.samRunReviewPool(api.samRunStore(), 0, 2).length, 0,
    'the very first world has nothing to review yet');

  // the wider pool has to actually reach the waves
  const game = { active: own, review: speed, store, runSeen: {}, lastKind: '', sameKind: 0 };
  api.setSamRun(game);
  const drawn = new Set();
  for (let i = 0; i < 400; i++) { drawn.add(api.samRunPickKind()); game.sameKind = 0; }
  assert.ok(speed.some(id => drawn.has(id)), 'review words really do come up as questions');
  assert.ok(own.filter(id => drawn.has(id)).length >= 4, 'without crowding out the world being learned');
});

test("the runner's whole body shares one gait, and the hair arrives late", () => {
  /* The legs already ran on six phases while the arms and elbows carried two
     keyframes each, so the top half of the runner swung like a metronome over
     a body that was actually running. Everything is on the same grid now. */
  const stops = name => {
    const m = html.match(new RegExp('@keyframes ' + name + '\\{([^}]*\\})*[^}]*\\}'));
    assert.ok(m, name + ' exists');
    return (m[0].match(/\d+%\{/g) || []).length + (m[0].match(/0%,100%\{/g) || []).length;
  };
  for (const part of ['gameBackArmL', 'gameBackArmR', 'gameBackElbowL', 'gameBackElbowR', 'gameBackTwist'])
    assert.ok(stops(part) >= 6, part + ' is posed across the stride, not swung between two extremes');

  /* An elbow that bends hardest as the arm drives forward and opens on the way
     back is the difference between an arm swinging and an arm pumping. */
  const elbow = html.match(/@keyframes gameBackElbowL\{[^@]*/)[0];
  const angles = [...elbow.matchAll(/rotate\((-?[\d.]+)deg\)/g)].map(m => parseFloat(m[1]));
  assert.ok(Math.max(...angles) - Math.min(...angles) > 12, 'the elbow really drives through the cycle');

  /* Secondary motion: nothing on the runner used to lag behind anything else,
     which is what made a correct gait still read as one carved piece. */
  assert.match(html, /\.game-back-rig \.back-hair-mass,\.game-back-rig \.back-cap\{[^}]*animation:gameBackHairLag/,
    'hair and cap trail the body');
  assert.match(html, /\.game-back-rig \.back-hair-length,\.game-back-rig \.back-hair-bun\{[^}]*animation:gameBackHairSwing/,
    'and long hair, which has further to travel, swings wider');
  assert.match(html, /\.game-back-rig \.back-head\{[^}]*animation:gameBackHeadSteady/,
    'while the head counters the bounce instead of following it');
  /* The lag is the whole point: the body bobs at 0 and 50, so the hair must
     reach the same place later, not at the same instant. */
  assert.match(html, /@keyframes gameBackBob\{0%,50%,100%/, 'the body bobs on the half-cycle');
  assert.match(html, /@keyframes gameBackHairLag\{0%,50%,100%\{[^}]*\}12%,62%/,
    'and the hair reaches its low point an eighth of a stride behind it');

  /* All of it still stops dead when the phone asks for less motion. */
  assert.match(html, /\.game-world\.lane-game \.game-back-rig \*\{animation:none!important\}/,
    'reduced motion silences every part of the rig, including the new ones');
});

test("the game's front door shows the shop and every world behind it", () => {
  const { api } = runtime();
  const store = api.samRunStore();
  store.coins = 430;
  store.owned = api.SAM_RUN_SHOP_ITEMS.filter(x => x.price > 0).slice(0, 3).map(x => x.id);
  store.stage = 2;
  store.stageStars = { 0: 3 };
  for (const id of api.SAM_RUN_STAGES[0].words.map(w => w[0])) store.mastery[id] = api.SAM_RUN_MASTERY;

  /* The shop is drawn, not written. A child does not shop at a word. */
  const art = api.samRunShopArt();
  assert.match(art, /^<svg /, 'the shopfront is inline art, so it works offline like the rest of the app');
  assert.ok(!/<image|xlink:href|https?:/.test(art), 'and pulls in nothing from outside the file');
  assert.ok((art.match(/<circle/g) || []).length >= 15, 'the awning frill runs the whole width rather than stopping short');

  const shop = api.samRunShopCardHtml(store);
  assert.match(shop, /onclick="renderSamRunShop\(\)"/, 'the shopfront is the way in');
  assert.match(shop, /🪙 430/, 'it shows what the player has to spend');
  assert.match(shop, /3\/\d+ פריטים שלך/, 'and how much of the shop is already theirs');

  /* Eight worlds that were two screens deep, now at the front door. */
  const worlds = api.samRunWorldsHtml(store);
  for (let i = 0; i < api.SAM_RUN_STAGES.length; i++)
    assert.match(worlds, new RegExp(`onclick="renderSamRun\\(${i}\\)"`), `world ${i + 1} can be opened from the hub`);
  assert.match(worlds, /⭐⭐⭐/, 'a finished world wears its stars');
  assert.match(worlds, /כאן אתה/, 'and the one in progress says so');

  const first = api.samRunWorldStats(store, 0);
  assert.equal(first.mastered, first.total, 'the shared reading of a world counts mastered words');
  assert.equal(api.samRunWorldStats(store, 7).mastered, 0, 'and an untouched world reads as empty');

  /* The hub carries both, and still leads with the run itself. */
  const hub = api.samRunHubHtml(store);
  assert.ok(hub.indexOf('game-hub-go') < hub.indexOf('game-shop-card'), 'the run is still the first thing offered');
  assert.ok(hub.includes('game-shop-card') && hub.includes('game-world-grid'), 'the front door carries the shop and the worlds');
});

test("Sam's optional missions fund a persistent cosmetic shop", () => {
  const { api, app } = runtime();
  assert.ok(api.SAM_RUN_MISSIONS.length >= 5);
  assert.ok(api.SAM_RUN_MISSIONS.every(m => m.reward > 0 && m.target > 0));
  assert.ok(api.SAM_RUN_SHOP_ITEMS.some(x => x.type === 'outfit' && x.price > 0));
  assert.ok(api.SAM_RUN_SHOP_ITEMS.some(x => x.type === 'shoes' && x.price > 0));
  assert.ok(api.SAM_RUN_SHOP_ITEMS.some(x => x.type === 'hair' && x.price > 0));
  assert.ok(api.SAM_RUN_SHOP_ITEMS.some(x => x.type === 'character' && x.price > 0));
  assert.ok(api.SAM_RUN_SHOP_ITEMS.some(x => x.type === 'ride' && x.price > 0));
  assert.equal(api.samRunMissionDone({mission:{metric:'streak',target:5},streakPeak:4}), false);
  assert.equal(api.samRunMissionDone({mission:{metric:'streak',target:5},streakPeak:5}), true);
  const store=api.samRunStore(); store.coins=1200; store.owned=['outfit_blue','ride_scooter']; store.equipped={outfit:'outfit_blue',ride:'ride_scooter'}; api.samRunSave(store);
  api.renderSamRunShop();
  assert.match(app.innerHTML, /החנות של סם/);
  assert.match(app.innerHTML, /🪙 1200/);
  assert.match(app.innerHTML, /class="game-ride"[^>]*>🛴</);
  assert.match(app.innerHTML, /תספורות/);
  assert.match(app.innerHTML, /כלי רכב/);
  assert.doesNotMatch(app.innerHTML, /ג׳קט כחול/, 'the category landing page stays compact');
  api.renderSamRunShop('outfit');
  assert.match(app.innerHTML, /ג׳קט כחול/);
  assert.match(app.innerHTML, /תצוגה מקדימה/);
  api.renderSamRunShop('hair','hair_pink');
  assert.equal(api.SAM_RUN_SHOP_ITEMS.filter(x => x.type === 'hair').length, 10);
  assert.match(app.innerHTML, /קארה ורוד/);
  assert.match(app.innerHTML, /תצוגה מקדימה · עדיין לא חויבת/);
  assert.match(app.innerHTML, /1 מתוך 10 פריטים נאספו/);
  assert.equal(api.samRunStore().coins, 1200, 'previewing an unowned style never spends coins');
});
