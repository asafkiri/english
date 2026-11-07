#!/usr/bin/env node
/* Regenerates the CONTENT block of index.html from the vocabulary file.

   content/electrical_english_vocabulary.json is the source of truth for the
   terms, the comprehension exercises and the reference list. The app is a
   single file with no build step, so the data is embedded in it between the
   CONTENT:BEGIN / CONTENT:END markers; this script is the only thing that
   should write inside them. A test compares the embedded block with the
   file so the two cannot drift apart.

   Usage:  node tools/embed-content.mjs            (rewrites index.html)
           node tools/embed-content.mjs --check    (fails if index.html is stale)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT_FILE = path.join(ROOT, 'content', 'electrical_english_vocabulary.json');
export const APP_FILE = path.join(ROOT, 'index.html');
export const BEGIN_MARK = '/* CONTENT:BEGIN */';
export const END_MARK = '/* CONTENT:END */';

const ID_SHAPE = /^[a-z0-9-]+$/;

function fail(message) {
  throw new Error(`embed-content: ${message}`);
}

/* The compact shape the app works with. Field names are short because the
   block is read on every start; nothing that the app does not use is kept,
   and per-term text that is identical across the whole file is hoisted. */
export function compactContent(source) {
  if (!source || !Array.isArray(source.terms)) fail('terms array missing');
  if (!Array.isArray(source.categories) || !source.categories.length) fail('categories missing');
  const categoryIds = new Set(source.categories.map(c => c.id));
  const ids = new Set();
  for (const t of source.terms) {
    if (!ID_SHAPE.test(t.id || '')) fail(`term id "${t.id}" is not a plain slug`);
    if (ids.has(t.id)) fail(`duplicate term id ${t.id}`);
    ids.add(t.id);
    if (!categoryIds.has(t.category_id)) fail(`${t.id}: unknown category ${t.category_id}`);
    for (const field of ['english', 'hebrew', 'explanation_he', 'example_en', 'example_he']) {
      if (!String(t[field] || '').trim()) fail(`${t.id}: empty ${field}`);
    }
  }
  for (const t of source.terms) {
    for (const other of t.confusable_with || []) {
      if (!ids.has(other)) fail(`${t.id}: confusable_with points at unknown ${other}`);
    }
    for (const ref of t.reference_ids || []) {
      if (!source.sources?.[ref]) fail(`${t.id}: reference ${ref} is not in sources`);
    }
  }
  if (Number(source.term_count) !== source.terms.length) {
    fail(`term_count says ${source.term_count} but there are ${source.terms.length} terms`);
  }
  const notes = new Set(source.terms.map(t => t.evidence_note_he || ''));
  const commonNote = notes.size === 1 ? [...notes][0] : '';

  const terms = source.terms.map(t => {
    const o = {
      id: t.id, cat: t.category_id, en: t.english, he: t.hebrew,
      exp: t.explanation_he, ex: t.example_en, exHe: t.example_he,
      level: Number(t.level) || 1,
    };
    if (t.unit_or_symbol) o.unit = t.unit_or_symbol;
    if (t.aliases?.length) o.aliases = t.aliases.slice();
    if (t.confusable_with?.length) o.conf = t.confusable_with.slice();
    if (t.reference_ids?.length) o.refs = t.reference_ids.slice();
    if (t.contextual_variants?.length) o.variants = t.contextual_variants.slice();
    if (t.initial_lesson) o.lesson = Number(t.initial_lesson);
    o.status = t.verification_status === 'reference_backed_terminology' ? 'ref' : 'authored';
    if (!commonNote && t.evidence_note_he) o.note = t.evidence_note_he;
    return o;
  });

  const exercises = (source.mini_exercises || []).map(e => {
    if (!ID_SHAPE.test(e.id || '')) fail(`exercise id "${e.id}" is not a plain slug`);
    if (!Array.isArray(e.answers) || e.answers.length < 2) fail(`${e.id}: needs at least two answers`);
    if (!(e.correct_index >= 0 && e.correct_index < e.answers.length)) fail(`${e.id}: correct_index out of range`);
    const o = {
      id: e.id, level: Number(e.level) || 1, kind: e.kind, basis: e.content_basis,
      context: e.context_he, question: e.question_he, answers: e.answers.slice(),
      correct: e.correct_index, explanation: e.explanation_he,
    };
    if (e.source_id) o.source = e.source_id;
    if (Array.isArray(e.fields)) o.fields = e.fields.map(f => ({ label: f.label, value: f.value, unit: f.unit }));
    if (e.text_en) o.text = e.text_en;
    return o;
  });

  const sources = {};
  for (const [key, value] of Object.entries(source.sources || {})) {
    sources[key] = { title: value.title, url: value.url, scope: value.scope_he };
  }

  const defaults = source.learning_defaults || {};
  return {
    version: source.prepared_on || '',
    title: source.title_he || '',
    purpose: source.purpose_he || '',
    basis: source.curriculum_basis_he || '',
    note: source.content_note_he || '',
    evidenceNote: commonNote,
    newPerSession: Number(defaults.new_terms_per_session) || 5,
    intervals: Array.isArray(defaults.example_review_intervals_days) ? defaults.example_review_intervals_days.slice() : [1, 3, 7, 14, 30],
    initialLessons: Array.isArray(defaults.initial_lessons) ? defaults.initial_lessons.map(l => l.slice()) : [],
    categories: source.categories.map(c => ({ id: c.id, name: c.name_he, level: Number(c.default_level) || 1 })),
    terms,
    exercises,
    sources,
  };
}

/* One term per line keeps diffs readable when the vocabulary changes. */
export function renderContentBlock(content) {
  const lineSeparators = new RegExp('[' + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + ']', 'g');
  const safe = text => text
    .replace(/</g, '\\u003c')
    .replace(lineSeparators, ch => '\\u' + ch.charCodeAt(0).toString(16));
  const lines = [BEGIN_MARK];
  lines.push('/* Generated by tools/embed-content.mjs from content/electrical_english_vocabulary.json — edit the JSON, not this block. */');
  lines.push('const CONTENT = {');
  const keys = Object.keys(content);
  keys.forEach((key, index) => {
    const value = content[key];
    const comma = index < keys.length - 1 ? ',' : '';
    if (Array.isArray(value) && value.length && typeof value[0] === 'object' && !Array.isArray(value[0])) {
      lines.push(`  ${JSON.stringify(key)}: [`);
      value.forEach((item, i) => lines.push(`    ${safe(JSON.stringify(item))}${i < value.length - 1 ? ',' : ''}`));
      lines.push(`  ]${comma}`);
    } else {
      lines.push(`  ${JSON.stringify(key)}: ${safe(JSON.stringify(value))}${comma}`);
    }
  });
  lines.push('};');
  lines.push(END_MARK);
  return lines.join('\n');
}

export function embed(html, content) {
  const begin = html.indexOf(BEGIN_MARK);
  const end = html.indexOf(END_MARK);
  if (begin < 0 || end < 0 || end < begin) fail('CONTENT markers not found in index.html');
  return html.slice(0, begin) + renderContentBlock(content) + html.slice(end + END_MARK.length);
}

export function readSource(file = CONTENT_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function main(argv) {
  const check = argv.includes('--check');
  const content = compactContent(readSource());
  const html = fs.readFileSync(APP_FILE, 'utf8');
  const next = embed(html, content);
  if (check) {
    if (next !== html) {
      console.error('index.html is out of date: run node tools/embed-content.mjs');
      process.exit(1);
    }
    console.log(`index.html is up to date (${content.terms.length} terms, ${content.exercises.length} exercises).`);
    return;
  }
  if (next === html) {
    console.log('index.html already up to date.');
    return;
  }
  fs.writeFileSync(APP_FILE, next);
  console.log(`Embedded ${content.terms.length} terms, ${content.exercises.length} exercises and ${Object.keys(content.sources).length} sources into index.html.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
