const fs = require('fs').promises;
const path = require('path');
const { CLIError } = require('../cli/errors');
const { jsonToCsv, formatJsonForExport } = require('../utils/dataConversion');

class ExportService {
    constructor(config, queryService) {
        this.config = config;
        this.queryService = queryService;
    }

    async export(options = {}) {
        const { format = 'json', destination, sourceType, force = false } = options;

        // Validate format
        if (!['json', 'csv'].includes(format)) {
            throw new CLIError('INVALID_FORMAT', `Invalid format: ${format}. Valid: json, csv`);
        }

        // Validate destination if provided
        if (destination) {
            await this._validateDestination(destination, force);
        }

        // Get records
        // Fetch a large limit to simulate "all matching", though strict streaming isn't implemented yet
        const { records } = await this.queryService.list({
            sourceType,
            limit: 100000
        });

        if (records.length === 0) {
            return { exported: 0, format, destination, data: '' };
        }

        let output = '';
        if (format === 'csv') {
            output = this._generateCsv(records, sourceType);
        } else {
            output = formatJsonForExport(records, 'pretty');
        }

        // Write or return
        if (destination) {
            try {
                await fs.writeFile(destination, output, 'utf-8');
                return { exported: records.length, destination, format };
            } catch (err) {
                throw new CLIError('WRITE_ERROR', `Failed to write export file: ${err.message}`, { originalError: err });
            }
        }

        return { exported: records.length, format, data: output };
    }

    async _validateDestination(dest, force) {
        const dir = path.dirname(dest);

        // Check directory exists
        try {
            await fs.access(dir);
        } catch (err) {
            throw new CLIError('DIRECTORY_NOT_FOUND', `Directory does not exist: ${dir}`);
        }

        // Check file existence
        try {
            await fs.access(dest);
            // File exists
            if (!force) {
                throw new CLIError('FILE_EXISTS', 'Destination file already exists. Use --force to overwrite.');
            }
        } catch (err) {
            // File does not exist, which is good
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }

    _generateCsv(records, sourceType) {
        if (sourceType === 'grave_record_card') {
            return this._graveCardsToCsv(records);
        } else if (sourceType === 'burial_register') {
            const columns = [
                'volume_id', 'page_number', 'row_index_on_page', 'entry_id',
                'entry_no_raw', 'name_raw', 'abode_raw', 'burial_date_raw',
                'age_raw', 'officiant_raw', 'marginalia_raw', 'file_name',
                'ai_provider', 'processed_date'
            ];
            return jsonToCsv(records, columns);
        } else {
            // Default (memorials) relies on jsonToCsv defaults
            return jsonToCsv(records);
        }
    }

    _graveCardsToCsv(records) {
        // Flatten logic adapted from graveCardStorage.js
        const flattenedRows = records.map(row => {
            const data = row.data || {};

            const flat = {
                id: row.id,
                file_name: row.file_name,
                processed_date: row.processed_date,
                ai_provider: row.ai_provider,
                section: row.section,
                grave_number: row.grave_number,
                grave_status: data.grave?.status || '',
                grave_type: data.grave?.type || '',
                grave_notes: data.grave?.notes || '',
                dimensions_length: data.grave?.dimensions?.length_ft || '',
                dimensions_width: data.grave?.dimensions?.width_ft || '',
                inscription_text: data.inscription?.text ? data.inscription.text.replace(/\n/g, ' | ') : '',
                inscription_notes: data.inscription?.notes || '',
                sketch_description: data.sketch?.description || '',
                card_processed_by: data.card_metadata?.processed_by || '',
            };

            // Flatten interments
            if (Array.isArray(data.interments)) {
                data.interments.forEach((interment, index) => {
                    const i = index + 1;
                    flat[`interment_${i}_name`] = interment.name || '';
                    flat[`interment_${i}_date_death`] = interment.date_of_death || '';
                    flat[`interment_${i}_date_burial`] = interment.date_of_burial || '';
                    flat[`interment_${i}_age`] = interment.age || (interment.age_at_death || '');
                    flat[`interment_${i}_notes`] = interment.notes || '';
                });
            }

            return flat;
        });

        // Collect keys
        const allKeys = new Set();
        flattenedRows.forEach(row => {
            Object.keys(row).forEach(key => allKeys.add(key));
        });

        // Sort keys
        const standardKeys = [
            'id', 'file_name', 'processed_date', 'ai_provider', 'section', 'grave_number',
            'grave_status', 'grave_type', 'grave_notes', 'dimensions_length', 'dimensions_width',
            'inscription_text', 'inscription_notes', 'sketch_description', 'card_processed_by'
        ];

        const intermentKeys = Array.from(allKeys)
            .filter(k => k.startsWith('interment_'))
            .sort((a, b) => {
                const numA = parseInt(a.match(/interment_(\d+)_/)[1]);
                const numB = parseInt(b.match(/interment_(\d+)_/)[1]);
                if (numA !== numB) return numA - numB;
                return a.localeCompare(b);
            });

        const otherKeys = Array.from(allKeys).filter(k => !standardKeys.includes(k) && !intermentKeys.includes(k));
        const sortedKeys = [...standardKeys, ...intermentKeys, ...otherKeys].filter(k => allKeys.has(k));

        // Create CSV using jsonToCsv utility but with our dynamic columns
        return jsonToCsv(flattenedRows, sortedKeys);
    }
}

module.exports = ExportService;
