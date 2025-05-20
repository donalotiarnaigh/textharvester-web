const fs = require('fs').promises;
const path = require('path');
const { analyzeTranscriptionAccuracy } = require('../src/utils/transcriptionAnalysis');

describe('Memorial Record Transcription Accuracy Tests', () => {
  let baselineResults;
  let testResults;
  
  beforeAll(async () => {
    // Load baseline results from 2025-05-19
    baselineResults = JSON.parse(
      await fs.readFile(
        path.join(__dirname, '../sample_data/test_results/results_all_1-5_2025-05-19T20-20-51-898Z.json'),
        'utf8'
      )
    );
  });

  describe('Dataset Analysis', () => {
    it('should analyze all 5 memorial pages', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.totalPages).toBe(5);
      expect(analysis.pagesAnalyzed).toHaveLength(5);
    });

    it('should calculate success rates for each page', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      analysis.pagesAnalyzed.forEach(page => {
        expect(page).toHaveProperty('pageNumber');
        expect(page).toHaveProperty('successRate');
        expect(page).toHaveProperty('fieldAccuracy');
        expect(page.successRate).toBeGreaterThanOrEqual(0);
        expect(page.successRate).toBeLessThanOrEqual(100);
      });
    });

    it('should track accuracy for each field type', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      analysis.pagesAnalyzed.forEach(page => {
        expect(page.fieldAccuracy).toHaveProperty('memorial_number');
        expect(page.fieldAccuracy).toHaveProperty('first_name');
        expect(page.fieldAccuracy).toHaveProperty('last_name');
        expect(page.fieldAccuracy).toHaveProperty('year_of_death');
        expect(page.fieldAccuracy).toHaveProperty('inscription');
      });
    });
  });

  describe('Multi-run Comparison', () => {
    it('should compare results across multiple runs', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.runComparisons).toBeInstanceOf(Array);
      analysis.runComparisons.forEach(comparison => {
        expect(comparison).toHaveProperty('timestamp');
        expect(comparison).toHaveProperty('averageAccuracy');
        expect(comparison).toHaveProperty('consistencyScore');
      });
    });

    it('should identify consistency in transcriptions', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      analysis.runComparisons.forEach(comparison => {
        expect(comparison.consistencyScore).toBeGreaterThanOrEqual(0);
        expect(comparison.consistencyScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Multi-line Entry Handling', () => {
    it('should correctly analyze multi-line inscriptions', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.multiLineAnalysis).toBeDefined();
      expect(analysis.multiLineAnalysis).toHaveProperty('totalMultiLineEntries');
      expect(analysis.multiLineAnalysis).toHaveProperty('accuratelyTranscribed');
      expect(analysis.multiLineAnalysis).toHaveProperty('lineBreakAccuracy');
    });

    it('should maintain formatting in multi-line inscriptions', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.multiLineAnalysis.formattingConsistency).toBeGreaterThanOrEqual(0);
      expect(analysis.multiLineAnalysis.formattingConsistency).toBeLessThanOrEqual(100);
    });
  });

  describe('Baseline Comparison', () => {
    it('should compare results against 2025-05-19 baseline', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.baselineComparison).toBeDefined();
      expect(analysis.baselineComparison).toHaveProperty('baselineDate', '2025-05-19');
      expect(analysis.baselineComparison).toHaveProperty('improvements');
      expect(analysis.baselineComparison).toHaveProperty('regressions');
    });

    it('should track specific improvements and regressions', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.baselineComparison.improvements).toBeInstanceOf(Array);
      expect(analysis.baselineComparison.regressions).toBeInstanceOf(Array);
      
      // Each improvement/regression should have detailed information
      if (analysis.baselineComparison.improvements.length > 0) {
        const improvement = analysis.baselineComparison.improvements[0];
        expect(improvement).toHaveProperty('field');
        expect(improvement).toHaveProperty('pageNumber');
        expect(improvement).toHaveProperty('percentageImprovement');
      }
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle common real-world variations', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.realWorldScenarios).toBeDefined();
      expect(analysis.realWorldScenarios).toHaveProperty('abbreviationHandling');
      expect(analysis.realWorldScenarios).toHaveProperty('dateFormatVariations');
      expect(analysis.realWorldScenarios).toHaveProperty('specialCharacters');
    });

    it('should analyze handling of special cases', async () => {
      const analysis = await analyzeTranscriptionAccuracy();
      expect(analysis.realWorldScenarios.specialCases).toContainEqual(
        expect.objectContaining({
          type: expect.any(String),
          occurrences: expect.any(Number),
          handlingAccuracy: expect.any(Number)
        })
      );
    });
  });
}); 