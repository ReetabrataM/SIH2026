import test from 'node:test'; import assert from 'node:assert/strict';
import { classify, policy, wellbeing } from '../src/engine.js';
test('minor adult content escalates after repeat exposure', () => { const c = classify('', 'Adult/18+'); assert.equal(policy({ age: '13–15', classification: c, repetition: 2 }).level, 5); });
test('adult content warns but does not lock adult users', () => { const c = classify('', 'Adult/18+'); assert.equal(policy({ age: '18+', classification: c }).level, 2); });
test('misinformation is framed as risk', () => assert.equal(classify('breaking guaranteed miracle cure').category, 'Misinformation-risk'));
test('wellbeing is bounded', () => assert.ok(wellbeing({ screenMinutes: 999, goalMinutes: 100, lateMinutes: 300, longSessions: 10, safetyEvents: 10, categories: new Set() }) >= 0));
