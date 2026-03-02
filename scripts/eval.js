/**
 * scripts/eval.js — Extraction accuracy evaluation harness (issue #121).
 *
 * Compares AI-extracted records against a hand-labelled gold standard to
 * measure field-level accuracy, Character Error Rate (CER), and
 * needs_review precision/recall.
 *
 * Usage (CLI):
 *   node scripts/eval.js [--gold <path>] [--input <path>] [--floor <number>] [--output <path>]
 *
 *   --gold    Path to gold standard JSON (default: data/eval/gold-standard/memorials.json)
 *   --input   Path to extracted results JSON  (default: data/eval/fixtures/ci-baseline.json)
 *   --floor   Minimum overall accuracy; exits with code 1 if not met
 *   --output  Write JSON report to this file path (optional)
 *
 * Exported functions are used by the test suite and can be imported into
 * other scripts for programmatic evaluation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Metric computation — all functions are pure and exported for testing
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein (edit) distance between two strings at character level.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Minimum edit operations (insert / delete / substitute)
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Character Error Rate between an extracted value and a ground-truth string.
 *
 * CER = editDistance(extracted, groundTruth) / len(groundTruth)
 *
 * Returns 0 when groundTruth is null or undefined (nothing to measure against).
 * Returns 1 when extracted is null/undefined and groundTruth is non-empty.
 *
 * @param {string|number|null} extracted
 * @param {string|number|null} groundTruth
 * @returns {number} CER in [0, ∞)  — 0 for exact match
 */
function computeCER(extracted, groundTruth) {
  if (groundTruth === null || groundTruth === undefined) return 0;

  const gt = String(groundTruth);
  if (gt.length === 0) {
    return extracted === null || extracted === undefined || String(extracted).length === 0 ? 0 : 1;
  }

  if (extracted === null || extracted === undefined) return 1;

  const hyp = String(extracted);
  return levenshteinDistance(gt, hyp) / gt.length;
}

/**
 * Compute per-field accuracy and average CER across a set of records.
 *
 * String fields: exact match when CER === 0; otherwise counted as incorrect.
 * Non-string fields (numbers, null): strict equality.
 *
 * @param {Array<{id: string, expected: Object}>} goldStandard
 * @param {Array<{id: string, extracted: Object}>} extractedRecords
 * @returns {Object} Map of fieldName → { accuracy, avgCER, exactMatches, total }
 */
function computeFieldAccuracy(goldStandard, extractedRecords) {
  const fieldStats = {};
  const extractedMap = Object.fromEntries(extractedRecords.map(r => [r.id, r]));

  for (const gsRecord of goldStandard) {
    const extracted = extractedMap[gsRecord.id];
    if (!extracted) continue;

    for (const [field, expectedValue] of Object.entries(gsRecord.expected)) {
      if (!fieldStats[field]) {
        fieldStats[field] = { exactMatches: 0, total: 0, totalCER: 0 };
      }

      const extractedValue = extracted.extracted?.[field];
      fieldStats[field].total++;

      if (typeof expectedValue === 'string') {
        const cer = computeCER(extractedValue, expectedValue);
        fieldStats[field].totalCER += cer;
        if (cer === 0) fieldStats[field].exactMatches++;
      } else {
        // Exact match for numeric / null fields; binary CER (0 or 1)
        const isMatch = extractedValue === expectedValue;
        if (isMatch) fieldStats[field].exactMatches++;
        fieldStats[field].totalCER += isMatch ? 0 : 1;
      }
    }
  }

  const result = {};
  for (const [field, stats] of Object.entries(fieldStats)) {
    result[field] = {
      accuracy: stats.total > 0 ? stats.exactMatches / stats.total : 0,
      avgCER: stats.total > 0 ? stats.totalCER / stats.total : 0,
      exactMatches: stats.exactMatches,
      total: stats.total,
    };
  }

  return result;
}

/**
 * Evaluate precision, recall, and F1 for the needs_review flag.
 *
 * Gold standard records that lack an `expected_needs_review` field are skipped.
 *
 * @param {Array<{id: string, expected_needs_review?: boolean}>} goldStandard
 * @param {Array<{id: string, needs_review: 0|1}>} extractedRecords
 * @returns {{ precision, recall, f1, truePositives, falsePositives, trueNegatives, falseNegatives }}
 */
function evaluateNeedsReview(goldStandard, extractedRecords) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const extractedMap = Object.fromEntries(extractedRecords.map(r => [r.id, r]));

  for (const gsRecord of goldStandard) {
    if (typeof gsRecord.expected_needs_review === 'undefined') continue;

    const extracted = extractedMap[gsRecord.id];
    if (!extracted) continue;

    const actuallyNeedsReview = gsRecord.expected_needs_review;
    const predictedNeedsReview = extracted.needs_review === 1;

    if (actuallyNeedsReview && predictedNeedsReview) tp++;
    else if (!actuallyNeedsReview && predictedNeedsReview) fp++;
    else if (!actuallyNeedsReview && !predictedNeedsReview) tn++;
    else fn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1, truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn };
}

/**
 * Run a full evaluation pass and return combined metrics.
 *
 * @param {Array} goldStandard
 * @param {Array} extractedRecords
 * @returns {{ fieldAccuracy, needsReview, overallAccuracy, overallCER }}
 */
function runEvaluation(goldStandard, extractedRecords) {
  const fieldAccuracy = computeFieldAccuracy(goldStandard, extractedRecords);
  const needsReview = evaluateNeedsReview(goldStandard, extractedRecords);

  const accuracyValues = Object.values(fieldAccuracy).map(f => f.accuracy);
  const cerValues = Object.values(fieldAccuracy).map(f => f.avgCER);

  const overallAccuracy =
    accuracyValues.length > 0 ? accuracyValues.reduce((a, b) => a + b, 0) / accuracyValues.length : 0;
  const overallCER =
    cerValues.length > 0 ? cerValues.reduce((a, b) => a + b, 0) / cerValues.length : 0;

  return { fieldAccuracy, needsReview, overallAccuracy, overallCER };
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

function formatReport(result, goldPath, inputPath) {
  const sep = '─'.repeat(60);
  const lines = [
    sep,
    '  TextHarvester — Extraction Accuracy Report',
    sep,
    `  Gold standard : ${goldPath}`,
    `  Input records : ${inputPath}`,
    sep,
    '  Field-Level Accuracy',
    sep,
  ];

  for (const [field, stats] of Object.entries(result.fieldAccuracy)) {
    const pct = (stats.accuracy * 100).toFixed(1).padStart(5);
    const cer = stats.avgCER.toFixed(3);
    lines.push(`  ${field.padEnd(22)} accuracy=${pct}%  avgCER=${cer}  (${stats.exactMatches}/${stats.total})`);
  }

  lines.push(sep);
  lines.push(`  Overall accuracy : ${(result.overallAccuracy * 100).toFixed(1)}%`);
  lines.push(`  Overall avg CER  : ${result.overallCER.toFixed(3)}`);
  lines.push(sep);
  lines.push('  needs_review Evaluation');
  lines.push(sep);

  const nr = result.needsReview;
  lines.push(`  Precision : ${(nr.precision * 100).toFixed(1)}%`);
  lines.push(`  Recall    : ${(nr.recall * 100).toFixed(1)}%`);
  lines.push(`  F1        : ${(nr.f1 * 100).toFixed(1)}%`);
  lines.push(`  TP=${nr.truePositives}  FP=${nr.falsePositives}  TN=${nr.trueNegatives}  FN=${nr.falseNegatives}`);
  lines.push(sep);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/* istanbul ignore next */
if (require.main === module) {
  const args = process.argv.slice(2);

  const getArg = (flag, fallback) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const goldPath = getArg(
    '--gold',
    path.join(__dirname, '../eval/gold-standard/memorials.json')
  );
  const inputPath = getArg(
    '--input',
    path.join(__dirname, '../eval/fixtures/ci-baseline.json')
  );
  const floorArg = getArg('--floor', null);
  const outputPath = getArg('--output', null);
  const floor = floorArg !== null ? parseFloat(floorArg) : null;

  if (!fs.existsSync(goldPath)) {
    console.error(`Gold standard file not found: ${goldPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const goldStandard = JSON.parse(fs.readFileSync(goldPath, 'utf-8')).records;
  const fixture = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const extractedRecords = fixture.extracted_records || fixture;

  const result = runEvaluation(goldStandard, extractedRecords);

  console.log(formatReport(result, goldPath, inputPath));

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify({ result, goldPath, inputPath }, null, 2), 'utf-8');
    console.log(`Report saved to ${outputPath}`);
  }

  if (floor !== null && result.overallAccuracy < floor) {
    console.error(
      `\nACCURACY BELOW FLOOR: ${(result.overallAccuracy * 100).toFixed(1)}% < ${(floor * 100).toFixed(1)}%`
    );
    process.exit(1);
  }
}

module.exports = {
  levenshteinDistance,
  computeCER,
  computeFieldAccuracy,
  evaluateNeedsReview,
  runEvaluation,
};
