import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Curriculum Bank Data Layer (Grade 10 & 11)', () => {
  const bankPath = path.resolve('data/curriculum_bank.js');
  const indexPath = path.resolve('index.html');
  const swPath = path.resolve('sw.js');

  it('data/curriculum_bank.js exists and exports valid window.CURRICULUM_BANK', async () => {
    assert.ok(fs.existsSync(bankPath), 'data/curriculum_bank.js must exist');
    const bankModule = await import('../data/curriculum_bank.js');
    const bank = bankModule.default || globalThis.window?.CURRICULUM_BANK || globalThis.CURRICULUM_BANK;
    assert.ok(bank, 'CURRICULUM_BANK must be populated');
    assert.ok(bank['10'], 'Grade 10 bank must exist');
    assert.ok(bank['11'], 'Grade 11 bank must exist');
  });

  it('Grade 10 bank has exact item counts (162 vocab, 34 kenayeh/iham, 16 history)', async () => {
    const bankModule = await import('../data/curriculum_bank.js');
    const bank = bankModule.default || globalThis.window?.CURRICULUM_BANK || globalThis.CURRICULUM_BANK;
    const g10 = bank['10'];

    assert.equal(g10.world1_vocab.length, 162, 'Grade 10 world1_vocab must have exactly 162 items');
    assert.equal(g10.world2_kenayeh_iham.length, 34, 'Grade 10 world2_kenayeh_iham must have exactly 34 items');
    assert.equal(g10.world3_history.length, 16, 'Grade 10 world3_history must have exactly 16 items');
    assert.equal(g10.label, 'پایه دهم');
    assert.equal(g10.book, 'فارسی و نگارش (۱) - فنی و حرفهای و کاردانش');
  });

  it('Grade 11 bank has exact item counts (199 vocab, 83 kenayeh/iham, 26 history)', async () => {
    const bankModule = await import('../data/curriculum_bank.js');
    const bank = bankModule.default || globalThis.window?.CURRICULUM_BANK || globalThis.CURRICULUM_BANK;
    const g11 = bank['11'];

    assert.equal(g11.world1_vocab.length, 199, 'Grade 11 world1_vocab must have exactly 199 items');
    assert.equal(g11.world2_kenayeh_iham.length, 83, 'Grade 11 world2_kenayeh_iham must have exactly 83 items');
    assert.equal(g11.world3_history.length, 26, 'Grade 11 world3_history must have exactly 26 items');
    assert.equal(g11.label, 'پایه یازدهم');
    assert.equal(g11.book, 'فارسی و نگارش (۲) - فنی و حرفهای و کاردانش');
  });

  it('index.html loads data/curriculum_bank.js before inline script', () => {
    const html = fs.readFileSync(indexPath, 'utf8');
    const scriptSrcIdx = html.indexOf('<script src="data/curriculum_bank.js"></script>');
    const inlineScriptIdx = html.indexOf('<script>\n// ==========================================');
    assert.ok(scriptSrcIdx !== -1, 'index.html must include script tag for data/curriculum_bank.js');
    assert.ok(inlineScriptIdx !== -1, 'index.html must have inline script tag');
    assert.ok(scriptSrcIdx < inlineScriptIdx, 'data/curriculum_bank.js must load before inline script');
  });

  it('sw.js precaches ./data/curriculum_bank.js', () => {
    const sw = fs.readFileSync(swPath, 'utf8');
    assert.ok(sw.includes("'./data/curriculum_bank.js'"), "sw.js ASSETS array must include './data/curriculum_bank.js'");
  });
});
