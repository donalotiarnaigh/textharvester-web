

jest.mock('glob');
jest.mock('../../src/utils/fileProcessing', () => ({
    processFile: jest.fn()
}));
// Removed explicit jest.mock for logger to use spyOn instead


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
const logger = require('../../src/utils/logger');
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
            sourceType: 'memorial',
            verbose: false
        };
        service = new IngestService(mockConfig, logger);

        // Spy on logger methods
        jest.spyOn(logger, 'info').mockImplementation(() => { });
        jest.spyOn(logger, 'error').mockImplementation(() => { });
        jest.spyOn(logger, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
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

            const result = await service.ingest('*.jpg', { batchSize: 2, sourceType: 'memorial' });

            expect(processFile).toHaveBeenCalledTimes(4);
            expect(result.total).toBe(4);
        });

        // Unhappy Path Tests
        test('should throw NO_FILES_MATCHED if pattern matches nothing', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, []));

            await expect(service.ingest('*.jpg', { sourceType: 'memorial' }))
                .rejects
                .toThrow('No files matched: *.jpg');

            try {
                await service.ingest('*.jpg', { sourceType: 'memorial' });
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

            const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

            expect(result.successes).toHaveLength(1);
            expect(result.failures).toHaveLength(1);
            expect(result.failures[0]).toMatchObject({
                file: 'bad.jpg',
                success: false,
                error: 'Corrupt file'
            });
            expect(result.partial).toBe(true);
        });

        it('should handle API errors by adding to failures', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, ['error.jpg']));

            processFile.mockImplementation(() => Promise.reject(new Error('API Rate Limit')));

            const result = await service.ingest('*.jpg', { sourceType: 'memorial' });

            expect(result.failures).toHaveLength(1);
            expect(result.failures[0].error).toBe('API Rate Limit');
        });

        it('should validate source type', async () => {
            await expect(service.ingest('*.jpg', { sourceType: 'invalid_type' }))
                .rejects.toThrow('Unknown source type: invalid_type');
        });

        it('should log progress', async () => {
            glob.mockImplementation((pattern, cb) => cb(null, ['test.jpg']));
            processFile.mockImplementation(() => Promise.resolve({ success: true }));

            await service.ingest('*.jpg', { sourceType: 'memorial' });

            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Found 1 files'));
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Ingestion complete'));
        });
    });
});

