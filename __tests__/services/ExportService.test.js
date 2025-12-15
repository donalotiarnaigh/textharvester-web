const ExportService = require('../../src/services/ExportService');
const { CLIError } = require('../../src/cli/errors');
const fs = require('fs').promises;

// Mock dependencies
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        access: jest.fn()
    },
    constants: {
        F_OK: 0
    }
}));

describe('ExportService', () => {
    let service;
    let mockConfig;
    let mockQueryService;

    beforeEach(() => {
        mockConfig = {
            dataDir: './data'
        };
        mockQueryService = {
            list: jest.fn()
        };
        service = new ExportService(mockConfig, mockQueryService);
        jest.clearAllMocks();
        // Default: Mock implementation to handle directory vs file checks
        fs.access.mockImplementation(async (path) => {
            if (path.toString().endsWith('.json') || path.toString().endsWith('.csv')) {
                // File check: default to not found (ENOENT)
                const err = new Error('File not found');
                err.code = 'ENOENT';
                throw err;
            }
            // Directory check: resolve (exists)
            return Promise.resolve();
        });
    });

    describe('export', () => {
        const mockRecords = [
            { memorial_number: '1', first_name: 'John', last_name: 'Doe', year_of_death: '1900' },
            { memorial_number: '2', first_name: 'Jane', last_name: 'Smith', year_of_death: '1901' }
        ];

        describe('Happy Path', () => {
            it('should export records to JSON file', async () => {
                mockQueryService.list.mockResolvedValue({ records: mockRecords });

                const result = await service.export({
                    format: 'json',
                    destination: './output.json'
                });

                expect(mockQueryService.list).toHaveBeenCalled();
                expect(fs.writeFile).toHaveBeenCalledWith(
                    './output.json',
                    expect.stringContaining('"memorial_number": "1"'),
                    'utf-8'
                );
                expect(result.exported).toBe(2);
                expect(result.format).toBe('json');
            });

            it('should export records to CSV file', async () => {
                mockQueryService.list.mockResolvedValue({ records: mockRecords });

                const result = await service.export({
                    format: 'csv',
                    destination: './output.csv'
                });

                expect(fs.writeFile).toHaveBeenCalledWith(
                    './output.csv',
                    expect.stringContaining('memorial_number,first_name,last_name'),
                    'utf-8'
                );
                expect(result.exported).toBe(2);
            });

            it('should return data for stdout when no destination provided', async () => {
                mockQueryService.list.mockResolvedValue({ records: mockRecords });

                const result = await service.export({
                    format: 'json'
                });

                expect(fs.writeFile).not.toHaveBeenCalled();
                expect(result.data).toBeDefined();
                expect(result.exported).toBe(2);
            });

            it('should filter export by source type', async () => {
                mockQueryService.list.mockResolvedValue({ records: [] });

                await service.export({
                    format: 'json',
                    sourceType: 'memorial'
                });

                expect(mockQueryService.list).toHaveBeenCalledWith(expect.objectContaining({
                    sourceType: 'memorial',
                    limit: expect.any(Number) // Should fetch all/large batch
                }));
            });
        });

        describe('Unhappy Path', () => {
            it('should throw INVALID_FORMAT for unsupported format', async () => {
                await expect(service.export({ format: 'xml' }))
                    .rejects.toThrow('Invalid format');
            });

            it('should throw FILE_EXISTS if destination exists without force', async () => {
                // Mock access to succeed (file exists)
                fs.access.mockResolvedValue(true);

                await expect(service.export({
                    format: 'json',
                    destination: './existing.json'
                })).rejects.toThrow('Destination file already exists');
            });

            it('should allow overwrite if force is true', async () => {
                fs.access.mockResolvedValue(true);
                mockQueryService.list.mockResolvedValue({ records: mockRecords });

                await service.export({
                    format: 'json',
                    destination: './existing.json',
                    force: true
                });

                expect(fs.writeFile).toHaveBeenCalled();
            });

            it('should handle empty results gracefully', async () => {
                mockQueryService.list.mockResolvedValue({ records: [] });

                const result = await service.export({ format: 'json' });

                expect(result.exported).toBe(0);
                expect(fs.writeFile).not.toHaveBeenCalled();
            });

            it('should throw WRITE_ERROR if file operations fail', async () => {
                mockQueryService.list.mockResolvedValue({ records: mockRecords });
                fs.writeFile.mockRejectedValue(new Error('Permission denied'));

                await expect(service.export({
                    format: 'json',
                    destination: '/root/out.json'
                })).rejects.toThrow('Failed to write export file');
            });
        });
    });
});
