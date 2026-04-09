const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { db } = require('../../utils/database');

const EXPORT_TARGETS = [
  {
    sql: 'SELECT id, file_name, edited_fields, needs_review FROM memorials WHERE edited_at IS NOT NULL',
    fileName: 'memorials.json',
    sourceType: 'memorial_ocr',
    idPrefix: 'gs-m',
  },
  {
    sql: 'SELECT id, file_name, edited_fields, needs_review FROM burial_register_entries WHERE edited_at IS NOT NULL',
    fileName: 'burial-register.json',
    sourceType: 'burial_register',
    idPrefix: 'gs-b',
  },
];

const evalCmd = new Command('eval')
  .description('Active learning evaluation utilities');

evalCmd
  .command('export-annotations')
  .description('Export human-corrected records to eval/gold-standard/*.json')
  .option(
    '--output-dir <dir>',
    'Directory for gold-standard JSON files',
    path.resolve(__dirname, '../../../../eval/gold-standard')
  )
  .action(async (options) => {
    try {
      await exportAnnotations(options.outputDir);
      console.log('Annotation export complete.');
      process.exit(0);
    } catch (err) {
      console.error('Export failed:', err.message);
      process.exit(1);
    }
  });

async function exportAnnotations(outputDir) {
  const results = await Promise.all(EXPORT_TARGETS.map(t => queryEdited(t.sql)));

  for (let i = 0; i < EXPORT_TARGETS.length; i++) {
    const { fileName, sourceType, idPrefix } = EXPORT_TARGETS[i];
    const rows = results[i];
    const filePath = path.join(outputDir, fileName);
    const file = readGoldStandard(filePath, sourceType);

    for (const row of rows) {
      const editedFields = parseJson(row.edited_fields, []);
      upsertRecord(file, {
        id: `${idPrefix}-${row.id}`,
        source_type: sourceType,
        image_ref: row.file_name || '',
        expected_needs_review: row.needs_review === 1,
        expected: buildExpected(row, editedFields),
      });
    }

    writeGoldStandard(filePath, file);
  }
}

function queryEdited(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function parseJson(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function buildExpected(row, editedFields) {
  const expected = {};
  for (const field of editedFields) {
    if (Object.prototype.hasOwnProperty.call(row, field)) {
      expected[field] = row[field];
    }
  }
  return expected;
}

function readGoldStandard(filePath, sourceType) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {
      version: '1.0.0',
      description: `Gold-standard annotations for ${sourceType}`,
      source: 'human-corrected via TextHarvester inline edit',
      created: new Date().toISOString(),
      fields_evaluated: [],
      notes: '',
      records: [],
    };
  }
}

function upsertRecord(file, record) {
  const idx = file.records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    file.records[idx] = record;
  } else {
    file.records.push(record);
  }
}

function writeGoldStandard(filePath, file) {
  fs.writeFileSync(filePath, JSON.stringify({ ...file, created: new Date().toISOString() }, null, 2), 'utf8');
}

module.exports = evalCmd;
