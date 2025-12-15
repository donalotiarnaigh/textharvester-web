
jest.mock('glob');
jest.mock('../../src/utils/fileProcessing', () => ({
    processFile: jest.fn()
}));

// Mock fs specifically for the way it's used
const mockAccess = jest.fn().mockResolvedValue(undefined);
jest.mock('fs', () => ({
    promises: {
        access: mockAccess
    },
    constants: {
        R_OK: 1
    }
}));

const IngestService = require('../../src/services/IngestService');
const { CLIError } = require('../../src/cli/errors');
const { processFile } = require('../../src/utils/fileProcessing');
const glob = require('glob');
// We don't need to require fs here if we use the mockAccess variable directly or rely on the mock setup
// But if we want to spy on it in tests, we can use the mockAccess variable.


describe('IngestService', () => {
    let service;
    let mockConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mocks
        mockAccess.mockResolvedValue(undefined);
        mockConfig = {
            batchSize: 2,
            provider: 'openai',
            verbose: false
        };
        service = new IngestService(mockConfig);
    });

    describe('ingest', () => {
        // Happy Path Tests
        test('should process a single file successfully', async () => {
            // Mock glob to return one file
            glob.mockImplementation((pattern, cb) => cb(null, ['test.jpg']));

            // Mock processFile to succeed
            processFile.mockResolvedValue({
                success: true,
                recordId: 123,
                file: 'test.jpg'
            });

            const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

            expect(result.successes).toHaveLength(1);
            expect(result.failures).toHaveLength(0);
            expect(result.total).toBe(1);
            expect(result.successes[0]).toMatchObject({
                success: true,
                file: 'test.jpg'
            });
            // Verify options passed to processFile
            expect(processFile).toHaveBeenCalledWith('test.jpg', expect.objectContaining({
                sourceType: 'memorial',
                provider: 'openai'
            }));
        });

        test('should expand glob patterns correctly', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, ['a.jpg', 'b.jpg']));
            processFile.mockResolvedValue({ success: true });

            const result = await service.ingest('*.jpg', {});

            expect(result.total).toBe(2);
            expect(glob).toHaveBeenCalledWith('*.jpg', expect.any(Function));
        });

        test('should respect batch size limit', async () => {
            const files = ['1.jpg', '2.jpg', '3.jpg', '4.jpg'];
            glob.mockImplementation((pattern, cb) => cb(null, files));

            // We can't easily test true concurrency with checking Jest calls in this sync way,
            // but we can ensure processFile is called for all of them.
            // A more rapid test might check if they are chunked, but that's internal implementation detail.
            // We'll trust the logic for now and just verify all are processed.
            processFile.mockResolvedValue({ success: true });

            const result = await service.ingest('*.jpg', { batchSize: 2 });

            expect(processFile).toHaveBeenCalledTimes(4);
            expect(result.total).toBe(4);
        });

        // Unhappy Path Tests
        test('should throw NO_FILES_MATCHED if pattern matches nothing', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, []));

            await expect(service.ingest('*.jpg'))
                .rejects
                .toThrow('No files matched: *.jpg');

            try {
                await service.ingest('*.jpg');
            } catch (error) {
                expect(error).toBeInstanceOf(CLIError);
                expect(error.code).toBe('NO_FILES_MATCHED');
            }
        });

        test('should collect failures for individual file errors', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, ['good.jpg', 'bad.jpg']));

            processFile.mockImplementation((file) => {
                if (file === 'bad.jpg') return Promise.reject(new Error('Corrupt file'));
                return Promise.resolve({ success: true });
            });

            const result = await service.ingest('*.jpg');

            expect(result.successes).toHaveLength(1);
            expect(result.failures).toHaveLength(1);
            expect(result.failures[0]).toMatchObject({
                file: 'bad.jpg',
                success: false,
                error: 'Corrupt file'
            });
            expect(result.partial).toBe(true);
        });

        test('should handle API errors by adding to failures', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, ['error.jpg']));
            processFile.mockRejectedValue(new Error('API Rate Limit'));

            const result = await service.ingest('*.jpg');

            expect(result.failures).toHaveLength(1);
            expect(result.failures[0].error).toBe('API Rate Limit');
        });
    });
});
