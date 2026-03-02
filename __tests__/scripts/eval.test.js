/**
 * @jest-environment node
 */

/**
 * Test suite for scripts/eval.js — extraction accuracy evaluation harness.
 *
 * Issue #121: No extraction accuracy measurement — impossible to detect quality regression.
 *
 * Covers:
 *  - computeCER()            — Character Error Rate between two strings
 *  - computeFieldAccuracy()  — Per-field exact-match accuracy + average CER across records
 *  - evaluateNeedsReview()   — Precision/recall for the needs_review flag
 *  - runEvaluation()         — Full pipeline combining all metrics
 *  - Gold standard data integrity — ≥20 records, correct schema
 *  - CI baseline fixture     — Eval against ci-baseline.json achieves ≥0.85 overall accuracy
 */

'use strict';

const path = require('path');
// Use real fs — jest.setup.cjs mocks fs globally; requireActual bypasses that.
const fs = jest.requireActual('fs');

const {
  computeCER,
  levenshteinDistance,
  computeFieldAccuracy,
  evaluateNeedsReview,
  runEvaluation,
} = require('../../scripts/eval');

// ---------------------------------------------------------------------------
// computeCER
// ---------------------------------------------------------------------------
describe('computeCER', () => {
  it('returns 0 for exact string match', () => {
    expect(computeCER('JOHN MURPHY', 'JOHN MURPHY')).toBe(0);
  });

  it('returns 0 when ground truth is null (nothing to compare)', () => {
    expect(computeCER('anything', null)).toBe(0);
    expect(computeCER(null, null)).toBe(0);
  });

  it('returns 0 for both empty strings', () => {
    expect(computeCER('', '')).toBe(0);
  });

  it('returns 1 for null extracted against non-empty ground truth', () => {
    expect(computeCER(null, 'JOHN MURPHY')).toBe(1);
  });

  it('returns 1 for empty extracted against non-empty ground truth (all chars missing)', () => {
    expect(computeCER('', 'JOHN')).toBe(1);
  });

  it('returns correct CER for a single substitution (1/4)', () => {
    // "JONN" vs "JOHN" — 1 substitution, GT length = 4 → CER = 0.25
    expect(computeCER('JONN', 'JOHN')).toBeCloseTo(0.25);
  });

  it('returns correct CER for a deletion (1/4)', () => {
    // "JOH" vs "JOHN" — 1 deletion, GT length = 4 → CER = 0.25
    expect(computeCER('JOH', 'JOHN')).toBeCloseTo(0.25);
  });

  it('returns correct CER for an insertion (1/4)', () => {
    // "JOHNN" vs "JOHN" — 1 insertion, GT length = 4 → CER = 0.25
    expect(computeCER('JOHNN', 'JOHN')).toBeCloseTo(0.25);
  });

  it('handles numeric values by stringifying', () => {
    expect(computeCER(1923, 1923)).toBe(0);
    expect(computeCER(1924, 1923)).toBeGreaterThan(0);
  });

  it('is case-sensitive', () => {
    expect(computeCER('john', 'JOHN')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// levenshteinDistance (internal helper — exported for transparency)
// ---------------------------------------------------------------------------
describe('levenshteinDistance', () => {
  it('returns 0 for equal strings', () => {
    expect(levenshteinDistance('abc', 'abc')).toBe(0);
  });

  it('returns length of b for empty a', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
  });

  it('returns length of a for empty b', () => {
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('returns 1 for one substitution', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('returns 3 for completely different strings of same length', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeFieldAccuracy
// ---------------------------------------------------------------------------
describe('computeFieldAccuracy', () => {
  const goldStandard = [
    {
      id: 'gs-m-001',
      source_type: 'memorial_ocr',
      expected: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: 1923 },
    },
    {
      id: 'gs-m-002',
      source_type: 'memorial_ocr',
      expected: { first_name: 'MARY', last_name: 'BRIEN', year_of_death: 1950 },
    },
  ];

  it('returns 1.0 accuracy for all fields on perfect match', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: 1923 } },
      { id: 'gs-m-002', extracted: { first_name: 'MARY', last_name: 'BRIEN', year_of_death: 1950 } },
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.accuracy).toBe(1.0);
    expect(result.last_name.accuracy).toBe(1.0);
    expect(result.year_of_death.accuracy).toBe(1.0);
  });

  it('returns 0.0 accuracy for complete mismatch', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JAMES', last_name: 'KELLY', year_of_death: 1900 } },
      { id: 'gs-m-002', extracted: { first_name: 'ANNE', last_name: 'FITZPATRICK', year_of_death: 1960 } },
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.accuracy).toBe(0);
    expect(result.last_name.accuracy).toBe(0);
    expect(result.year_of_death.accuracy).toBe(0);
  });

  it('returns 0.5 accuracy when one of two records is correct', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: 1923 } },
      { id: 'gs-m-002', extracted: { first_name: 'MARY', last_name: 'KELLY', year_of_death: 1950 } }, // last_name wrong
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.accuracy).toBe(1.0);
    expect(result.last_name.accuracy).toBe(0.5);
    expect(result.year_of_death.accuracy).toBe(1.0);
  });

  it('populates total count correctly', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: 1923 } },
      { id: 'gs-m-002', extracted: { first_name: 'MARY', last_name: 'BRIEN', year_of_death: 1950 } },
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.total).toBe(2);
    expect(result.first_name.exactMatches).toBe(2);
  });

  it('skips records whose id is missing from extracted list', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: 1923 } },
      // gs-m-002 absent
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.total).toBe(1);
    expect(result.first_name.accuracy).toBe(1.0);
  });

  it('returns an empty object for empty inputs', () => {
    expect(computeFieldAccuracy([], [])).toEqual({});
  });

  it('reports avgCER > 0 for string fields with partial errors', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JONN', last_name: 'MURPHY', year_of_death: 1923 } },
      { id: 'gs-m-002', extracted: { first_name: 'MARY', last_name: 'BRIEN', year_of_death: 1950 } },
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.first_name.avgCER).toBeGreaterThan(0);
    expect(result.last_name.avgCER).toBe(0);
  });

  it('treats null extracted value as total mismatch for numeric field', () => {
    const extracted = [
      { id: 'gs-m-001', extracted: { first_name: 'JOHN', last_name: 'MURPHY', year_of_death: null } },
      { id: 'gs-m-002', extracted: { first_name: 'MARY', last_name: 'BRIEN', year_of_death: 1950 } },
    ];
    const result = computeFieldAccuracy(goldStandard, extracted);
    expect(result.year_of_death.accuracy).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// evaluateNeedsReview
// ---------------------------------------------------------------------------
describe('evaluateNeedsReview', () => {
  it('returns perfect precision, recall, and f1 for perfect predictions', () => {
    const gs = [
      { id: 'r1', expected: {}, expected_needs_review: true },
      { id: 'r2', expected: {}, expected_needs_review: false },
    ];
    const extracted = [
      { id: 'r1', extracted: {}, needs_review: 1 },
      { id: 'r2', extracted: {}, needs_review: 0 },
    ];
    const result = evaluateNeedsReview(gs, extracted);
    expect(result.precision).toBe(1.0);
    expect(result.recall).toBe(1.0);
    expect(result.f1).toBe(1.0);
    expect(result.truePositives).toBe(1);
    expect(result.falsePositives).toBe(0);
    expect(result.trueNegatives).toBe(1);
    expect(result.falseNegatives).toBe(0);
  });

  it('counts false positives (flagged but should not be)', () => {
    const gs = [
      { id: 'r1', expected: {}, expected_needs_review: false },
      { id: 'r2', expected: {}, expected_needs_review: false },
    ];
    const extracted = [
      { id: 'r1', extracted: {}, needs_review: 1 }, // FP
      { id: 'r2', extracted: {}, needs_review: 0 }, // TN
    ];
    const result = evaluateNeedsReview(gs, extracted);
    expect(result.precision).toBe(0);
    expect(result.falsePositives).toBe(1);
    expect(result.trueNegatives).toBe(1);
  });

  it('counts false negatives (missed flagging)', () => {
    const gs = [
      { id: 'r1', expected: {}, expected_needs_review: true },
      { id: 'r2', expected: {}, expected_needs_review: true },
    ];
    const extracted = [
      { id: 'r1', extracted: {}, needs_review: 0 }, // FN
      { id: 'r2', extracted: {}, needs_review: 1 }, // TP
    ];
    const result = evaluateNeedsReview(gs, extracted);
    expect(result.recall).toBe(0.5);
    expect(result.falseNegatives).toBe(1);
    expect(result.truePositives).toBe(1);
  });

  it('skips records without expected_needs_review defined', () => {
    const gs = [
      { id: 'r1', expected: {} }, // no expected_needs_review key
    ];
    const extracted = [
      { id: 'r1', extracted: {}, needs_review: 1 },
    ];
    const result = evaluateNeedsReview(gs, extracted);
    expect(result.truePositives).toBe(0);
    expect(result.falsePositives).toBe(0);
  });

  it('returns zero f1 when no records with expected_needs_review are provided', () => {
    const result = evaluateNeedsReview([], []);
    expect(result.f1).toBe(0);
    expect(result.precision).toBe(0);
    expect(result.recall).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// runEvaluation
// ---------------------------------------------------------------------------
describe('runEvaluation', () => {
  it('returns combined fieldAccuracy and needsReview metrics', () => {
    const gs = [
      {
        id: 'r1',
        expected: { first_name: 'JOHN', inscription: 'In loving memory' },
        expected_needs_review: false,
      },
    ];
    const extracted = [
      { id: 'r1', extracted: { first_name: 'JOHN', inscription: 'In loving memory' }, needs_review: 0 },
    ];
    const result = runEvaluation(gs, extracted);
    expect(result.overallAccuracy).toBe(1.0);
    expect(result.overallCER).toBe(0);
    expect(result.fieldAccuracy).toHaveProperty('first_name');
    expect(result.fieldAccuracy).toHaveProperty('inscription');
    expect(result).toHaveProperty('needsReview');
  });

  it('overallAccuracy is the mean of per-field accuracies', () => {
    // first_name correct (1.0), year_of_death wrong (0.0) → mean = 0.5
    const gs = [
      { id: 'r1', expected: { first_name: 'JOHN', year_of_death: 1923 }, expected_needs_review: false },
    ];
    const extracted = [
      { id: 'r1', extracted: { first_name: 'JOHN', year_of_death: 1900 }, needs_review: 0 },
    ];
    const result = runEvaluation(gs, extracted);
    expect(result.overallAccuracy).toBeCloseTo(0.5);
  });

  it('returns zero accuracy for empty inputs', () => {
    const result = runEvaluation([], []);
    expect(result.overallAccuracy).toBe(0);
    expect(result.overallCER).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Gold standard data integrity
// ---------------------------------------------------------------------------
describe('gold standard data integrity', () => {
  const memorialsPath = path.join(__dirname, '../../eval/gold-standard/memorials.json');
  const burialPath = path.join(__dirname, '../../eval/gold-standard/burial-register.json');

  it('gold standard memorials file exists', () => {
    expect(fs.existsSync(memorialsPath)).toBe(true);
  });

  it('has at least 20 hand-labelled memorial records', () => {
    const data = JSON.parse(fs.readFileSync(memorialsPath, 'utf-8'));
    expect(data.records.length).toBeGreaterThanOrEqual(20);
  });

  it('all memorial records have required fields: id, source_type, expected', () => {
    const data = JSON.parse(fs.readFileSync(memorialsPath, 'utf-8'));
    for (const record of data.records) {
      expect(record.id).toBeDefined();
      expect(record.source_type).toBe('memorial_ocr');
      expect(record.expected).toBeDefined();
      expect(typeof record.expected).toBe('object');
    }
  });

  it('all memorial records have at least first_name and last_name in expected', () => {
    const data = JSON.parse(fs.readFileSync(memorialsPath, 'utf-8'));
    for (const record of data.records) {
      expect(record.expected.first_name).toBeDefined();
      expect(record.expected.last_name).toBeDefined();
    }
  });

  it('all memorial record ids are unique', () => {
    const data = JSON.parse(fs.readFileSync(memorialsPath, 'utf-8'));
    const ids = data.records.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('burial register gold standard file exists and has at least 1 entry', () => {
    expect(fs.existsSync(burialPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(burialPath, 'utf-8'));
    expect(data.records.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// CI baseline fixture — regression gate
// ---------------------------------------------------------------------------
describe('CI baseline fixture', () => {
  const memorialsPath = path.join(__dirname, '../../eval/gold-standard/memorials.json');
  const fixturePath = path.join(__dirname, '../../eval/fixtures/ci-baseline.json');

  it('CI baseline fixture file exists', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
  });

  it('eval against CI baseline achieves at least 0.85 overall accuracy', () => {
    const goldStandard = JSON.parse(fs.readFileSync(memorialsPath, 'utf-8')).records;
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const result = runEvaluation(goldStandard, fixture.extracted_records);
    // This assertion is the CI regression gate: if eval logic or fixture data
    // breaks, this test fails and blocks the PR.
    expect(result.overallAccuracy).toBeGreaterThanOrEqual(0.85);
  });

  it('CI baseline fixture has an extracted_records array', () => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    expect(Array.isArray(fixture.extracted_records)).toBe(true);
    expect(fixture.extracted_records.length).toBeGreaterThan(0);
  });
});
