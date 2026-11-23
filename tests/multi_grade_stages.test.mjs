import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Multi-Grade Wiring - Step 2: Stages, Worlds & Curriculum Isolation', async () => {
  const bankModule = await import('../data/curriculum_bank.js');
  const bank = bankModule.default || globalThis.window?.CURRICULUM_BANK || globalThis.CURRICULUM_BANK;
  const indexPath = path.resolve('index.html');
  const html = fs.readFileSync(indexPath, 'utf8');

  // Extract inline script functions to evaluate
  const scriptMatch = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(scriptMatch, 'Inline script must exist in index.html');

  // Create isolated context with simulated DOM
  const domElements = new Map();
  const getMockElement = (id) => {
    if (!domElements.has(id)) {
      domElements.set(id, {
        id,
        textContent: '',
        innerHTML: '',
        value: '',
        title: '',
        classList: {
          add: () => {},
          remove: () => {},
          toggle: () => {},
          contains: () => false
        },
        style: {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        querySelectorAll: () => [],
        querySelector: () => ({ addEventListener: () => {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
      });
    }
    return domElements.get(id);
  };

  const mockWindow = {
    CURRICULUM_BANK: bank,
    fetch: () => Promise.resolve({ ok: false, json: async () => ({}) }),
    document: {
      getElementById: (id) => getMockElement(id),
      querySelectorAll: () => [],
      querySelector: () => null,
      createElement: (tag) => ({
        tagName: tag,
        className: '',
        innerHTML: '',
        textContent: '',
        style: { setProperty: () => {} },
        setAttribute: () => {},
        appendChild: () => {},
        querySelector: () => ({ addEventListener: () => {} }),
        addEventListener: () => {},
        removeEventListener: () => {}
      }),
      body: { setAttribute: () => {}, classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    }
  };

  const scriptCode = scriptMatch[1].replace(/\(async function init\(\)[\s\S]*?\)\(\);/g, '// init() skipped for unit test');

  const sandboxCode = `
    const window = mockWindow;
    const document = mockWindow.document;
    const localStorage = mockWindow.localStorage;
    ${scriptCode}
    return {
      buildStagesForGrade,
      getCurrentUserGrade,
      getActiveStages,
      STAGES_BY_GRADE,
      DEFAULT_STAGES,
      getQuizOptionsForCard,
      formatQuizPrompt,
      updateUserGradePill,
      toggleDemoGrade,
      appState
    };
  `;

  const ctxFn = new Function('mockWindow', sandboxCode);
  const runtime = ctxFn(mockWindow);

  it('1. HTML includes #userGradePill in top-hud and 4 updated world portal names', () => {
    assert.ok(html.includes('id="userGradePill"'), '#userGradePill must exist in HTML');
    assert.ok(html.includes('class="grade-indicator-pill"'), '.grade-indicator-pill must exist in HTML');
    assert.ok(html.includes('برج واژگان'), 'Portal Tab 1 name must be برج واژگان');
    assert.ok(html.includes('معبد کنایه و ایهام'), 'Portal Tab 2 name must be معبد کنایه و ایهام');
    assert.ok(html.includes('تالار تاریخ ادبیات'), 'Portal Tab 3 name must be تالار تاریخ ادبیات');
    assert.ok(html.includes('دژ جهنمی'), 'Portal Tab 4 name must be دژ جهنمی');
  });

  it('2. Grade 10 stages: exactly 15 stages with exact card distributions', () => {
    const s10 = runtime.buildStagesForGrade('10');
    assert.equal(s10.length, 15, 'Grade 10 must have exactly 15 stages');

    const w1 = s10.filter(s => s.world === 1);
    const w2 = s10.filter(s => s.world === 2);
    const w3 = s10.filter(s => s.world === 3);
    const w4 = s10.filter(s => s.world === 4);

    assert.equal(w1.length, 8, 'Grade 10 World 1 must have 8 stages');
    assert.equal(w2.length, 3, 'Grade 10 World 2 must have 3 stages');
    assert.equal(w3.length, 2, 'Grade 10 World 3 must have 2 stages');
    assert.equal(w4.length, 2, 'Grade 10 World 4 must have 2 boss stages');

    // W1 card counts: 14, 15, 23, 24, 25, 25, 25, 11 (Total 162)
    const w1Counts = w1.map(s => s.words.length);
    assert.deepEqual(w1Counts, [14, 15, 23, 24, 25, 25, 25, 11], 'W1 exact card counts');
    assert.equal(w1Counts.reduce((a, b) => a + b, 0), 162, 'W1 total cards must be 162');

    // W2 card counts: 16, 10, 8 (Total 34)
    const w2Counts = w2.map(s => s.words.length);
    assert.deepEqual(w2Counts, [16, 10, 8], 'W2 exact card counts');
    assert.equal(w2Counts.reduce((a, b) => a + b, 0), 34, 'W2 total cards must be 34');

    // W3 card counts: 8, 8 (Total 16)
    const w3Counts = w3.map(s => s.words.length);
    assert.deepEqual(w3Counts, [8, 8], 'W3 exact card counts');
    assert.equal(w3Counts.reduce((a, b) => a + b, 0), 16, 'W3 total cards must be 16');

    // W4 boss stages: 20 cards each
    assert.equal(w4[0].words.length, 20, 'Hell boss 1 must have 20 cards');
    assert.equal(w4[1].words.length, 20, 'Hell boss 2 must have 20 cards');

    // Namespacing
    assert.ok(s10.every(s => s.id.startsWith('g10_')), 'All Grade 10 stage IDs must start with g10_');
  });

  it('3. Grade 11 stages: exactly 16 stages with exact card distributions', () => {
    const s11 = runtime.buildStagesForGrade('11');
    assert.equal(s11.length, 16, 'Grade 11 must have exactly 16 stages');

    const w1 = s11.filter(s => s.world === 1);
    const w2 = s11.filter(s => s.world === 2);
    const w3 = s11.filter(s => s.world === 3);
    const w4 = s11.filter(s => s.world === 4);

    assert.equal(w1.length, 8, 'Grade 11 World 1 must have 8 stages');
    assert.equal(w2.length, 4, 'Grade 11 World 2 must have 4 stages');
    assert.equal(w3.length, 2, 'Grade 11 World 3 must have 2 stages');
    assert.equal(w4.length, 2, 'Grade 11 World 4 must have 2 boss stages');

    // W1 card counts: 27, 29, 15, 26, 33, 28, 28, 13 (Total 199)
    const w1Counts = w1.map(s => s.words.length);
    assert.deepEqual(w1Counts, [27, 29, 15, 26, 33, 28, 28, 13], 'W1 exact card counts');
    assert.equal(w1Counts.reduce((a, b) => a + b, 0), 199, 'W1 total cards must be 199');

    // W2 card counts: 22, 14, 22, 25 (Total 83)
    const w2Counts = w2.map(s => s.words.length);
    assert.deepEqual(w2Counts, [22, 14, 22, 25], 'W2 exact card counts');
    assert.equal(w2Counts.reduce((a, b) => a + b, 0), 83, 'W2 total cards must be 83');

    // W3 card counts: 13, 13 (Total 26)
    const w3Counts = w3.map(s => s.words.length);
    assert.deepEqual(w3Counts, [13, 13], 'W3 exact card counts');
    assert.equal(w3Counts.reduce((a, b) => a + b, 0), 26, 'W3 total cards must be 26');

    // W4 boss stages: 20 cards each
    assert.equal(w4[0].words.length, 20, 'Hell boss 1 must have 20 cards');
    assert.equal(w4[1].words.length, 20, 'Hell boss 2 must have 20 cards');

    // Namespacing
    assert.ok(s11.every(s => s.id.startsWith('g11_')), 'All Grade 11 stage IDs must start with g11_');
  });

  it('4. Distractor generation provides 4 distinct options with zero duplicate meanings/authors', () => {
    for (const grade of ['10', '11']) {
      runtime.appState.currentUserCode = 'test_user';
      runtime.appState.students['test_user'] = { code: 'test_user', grade };

      const stages = runtime.buildStagesForGrade(grade);
      for (const stage of stages) {
        for (const card of stage.words) {
          const opts = runtime.getQuizOptionsForCard(card, stage);
          assert.equal(opts.length, 4, `Grade ${grade} stage ${stage.id} card ${card.word} must return 4 options`);
          const correctChoice = card.correct || (card.meanings && card.meanings[0]) || '';
          assert.ok(opts.includes(correctChoice), `Options must include correct choice`);
          const unique = new Set(opts.map(o => o.trim()));
          assert.equal(unique.size, 4, `All 4 options must be unique for ${card.word}`);
        }
      }
    }
  });

  it('5. formatQuizPrompt outputs correct badge and question lead per tag', () => {
    // Vocab
    const p1 = runtime.formatQuizPrompt('معالجه', 1, false, null, 'واژه');
    assert.ok(p1.includes('معنای واژه'), 'Vocab prompt must show معنای واژه badge');
    assert.ok(p1.includes('«معالجه»'), 'Prompt must show target word');

    // Kenayeh
    const p2 = runtime.formatQuizPrompt('دم فرو بستن', 2, false, null, 'کنایه');
    assert.ok(p2.includes('مفهوم کنایی'), 'Kenayeh prompt must show مفهوم کنایی badge');

    // Iham
    const p3 = runtime.formatQuizPrompt('امشب صدای تیشه از بیستون نیامد', 2, false, null, 'ایهام');
    assert.ok(p3.includes('دو معنای ایهام'), 'Iham prompt must show دو معنای ایهام badge');

    // History
    const p4 = runtime.formatQuizPrompt('گلستان', 3, false, null, 'تاریخ ادبیات');
    assert.ok(p4.includes('پدیدآورنده اثر'), 'History prompt must show پدیدآورنده اثر badge');
    assert.ok(p4.includes('پدیدآورنده یا صاحب اثر کیست؟'), 'History prompt lead text');

    // Hell
    const p5 = runtime.formatQuizPrompt('امتحان نهایی', 4, true, null, 'واژه');
    assert.ok(p5.includes('چالش جهنمی'), 'Hell prompt must show چالش جهنمی badge');
  });

  it('6. Demo user grade toggle switches between Grade 10 and Grade 11', () => {
    runtime.appState.currentUserCode = '09000000000';
    runtime.appState.students['09000000000'] = {
      code: '09000000000',
      grade: '10',
      stats: { grade: '10', studiedStageIds: [] }
    };

    assert.equal(runtime.getCurrentUserGrade(), '10');

    // Toggle to 11
    runtime.toggleDemoGrade();
    assert.equal(runtime.getCurrentUserGrade(), '11');
    assert.equal(runtime.appState.students['09000000000'].grade, '11');
    assert.equal(runtime.appState.students['09000000000'].stats.studiedStageIds.length, 16);

    // Toggle back to 10
    runtime.toggleDemoGrade();
    assert.equal(runtime.getCurrentUserGrade(), '10');
    assert.equal(runtime.appState.students['09000000000'].grade, '10');
    assert.equal(runtime.appState.students['09000000000'].stats.studiedStageIds.length, 15);
  });
});
