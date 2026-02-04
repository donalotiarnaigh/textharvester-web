const { getResults, downloadResultsCSV } = require('../../src/controllers/resultsManager');
const QueryService = require('../../src/services/QueryService');
const { validateAndConvertRecords } = require('../../src/utils/dataValidation');

// Mock dependencies
jest.mock('../../src/services/QueryService');
jest.mock('../../src/utils/dataValidation');
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/fileQueue', () => ({
  getProcessedResults: jest.fn().mockReturnValue([]),
  getProcessingProgress: jest.fn().mockReturnValue({})
}));
jest.mock('../../../config.json', () => ({}), { virtual: true });

describe('Results Manager - Typographic Analysis', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      query: {}
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn()
    };
    jest.clearAllMocks();
  });

  test('includes typographic analysis fields in results', async () => {
    // Mock detected source type
    // Note: getResults detects source type internally. We need to mock that process or force it.
    // The current implementation of getResults uses a helper detectSourceType query DB directly.
    // We might need to mock db if we can't hijack detectSourceType easily.
    // However, since we are testing unit logic, we can mock QueryService.list to return our mock data
    // and assume detectSourceType returns 'memorial' (since it defaults to it).

    // Mock data with new fields as JSON strings (simulating DB retrieval)
    const mockRecords = [{
      id: 1,
      memorial_number: '123',
      transcription_raw: 'Here lies|John Doe',
      stone_condition: '{"weathered": true}',
      typography_analysis: '{"style": "gothic"}',
      iconography: '{"motifs": ["cross"]}',
      source_type: 'typographic_analysis'
    }];

    QueryService.prototype.list.mockResolvedValue({ records: mockRecords });

    // Mock validation to return deserialized data
    validateAndConvertRecords.mockReturnValue([{
      ...mockRecords[0],
      stone_condition: { weathered: true },
      typography_analysis: { style: 'gothic' },
      iconography: { motifs: ['cross'] }
    }]);

    // We can't easily mock inner helper detectSourceType without rewiring.
    // But failing to find tables (default) returns 'memorial'.

    await getResults(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    const item = response.memorials[0];

    // Verify structure
    expect(item.stone_condition).toEqual({ weathered: true });
    expect(item.typography_analysis).toEqual({ style: 'gothic' });
    expect(item.iconography).toEqual({ motifs: ['cross'] });
  });
});
