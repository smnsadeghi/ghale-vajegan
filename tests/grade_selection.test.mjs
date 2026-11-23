import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Multi-Grade Wiring - Step 1: Grade Selection & Persistence', () => {
  const htmlPath = path.resolve('index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  it('1. Auth subtitle mentions both Grade 10 and Grade 11', () => {
    assert.ok(
      html.includes('دوئل کارتی شوالیه‌ها • مسابقه ادبی دهم و یازدهم'),
      'Auth subtitle must be updated to include دهم و یازدهم'
    );
  });

  it('2. Grade selection form group is located directly above Major inside registerFields', () => {
    const regStart = html.indexOf('<div id="registerFields"');
    const gradeIdx = html.indexOf('id="authGrade"', regStart);
    const majorIdx = html.indexOf('id="authMajor"', regStart);
    assert.ok(regStart !== -1, '#registerFields must exist');
    assert.ok(gradeIdx !== -1, '#authGrade must exist');
    assert.ok(majorIdx !== -1, '#authMajor must exist');
    assert.ok(gradeIdx < majorIdx, '#authGrade must precede #authMajor');
  });

  it('3. Grade selector provides options for Grade 10 (دهم) and Grade 11 (یازدهم)', () => {
    assert.ok(html.includes('data-grade="10"'), 'Option for grade 10 must exist');
    assert.ok(html.includes('data-grade="11"'), 'Option for grade 11 must exist');
    assert.ok(html.includes('>دهم</button>'), 'Button text for Grade 10 must be دهم');
    assert.ok(html.includes('>یازدهم</button>'), 'Button text for Grade 11 must be یازدهم');
  });

  it('4. selectAuthGrade function exists and toggles active grade chip without affecting major chips', () => {
    assert.ok(html.includes('function selectAuthGrade('), 'selectAuthGrade must be defined');
    assert.ok(html.includes('window.selectAuthGrade = selectAuthGrade'), 'selectAuthGrade must be attached to window');
    assert.ok(html.includes('.major-chip[data-grade]'), 'selectAuthGrade scopes active class removal to grade chips');
    assert.ok(html.includes('.major-chip[data-major]'), 'selectAuthMajor scopes active class removal to major chips');
  });

  it('5. mapStudentRow extracts grade safely and defaults to "10" for legacy records', () => {
    const fnMatch = html.match(/function mapStudentRow\([\s\S]*?\n\}/);
    assert.ok(fnMatch, 'mapStudentRow must exist');
    const fnCode = fnMatch[0];
    const mapStudentRow = new Function(`return (${fnCode});`)();

    // Legacy row without grade or stats
    const legacyRow = { code: '09120000000', name: 'قدیمی', major: 'شبکه' };
    const mappedLegacy = mapStudentRow(legacyRow);
    assert.equal(mappedLegacy.grade, '10', 'Legacy record without grade must default to "10"');
    assert.equal(mappedLegacy.stats.grade, '10', 'stats.grade must default to "10"');

    // Grade 11 row in row.grade
    const g11Row = { code: '09121111111', name: 'یازدهمی', major: 'معماری', grade: '11' };
    const mappedG11 = mapStudentRow(g11Row);
    assert.equal(mappedG11.grade, '11', 'Grade 11 row must preserve "11"');

    // Grade 11 row in row.stats.grade
    const g11StatsRow = { code: '09122222222', name: 'یازدهمی ۲', major: 'مکانیک', stats: { grade: '11' } };
    const mappedG11Stats = mapStudentRow(g11StatsRow);
    assert.equal(mappedG11Stats.grade, '11', 'row.stats.grade "11" must be extracted');
  });
});
