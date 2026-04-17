#!/usr/bin/env node

/**
 * Export for Annotation — Ground Truth Stub Generator
 *
 * Runs a source image through the TextHarvester pipeline and writes a .gt.json
 * stub file with model_output populated. The annotator then manually corrects
 * the `corrected` fields against the source image.
 *
 * Usage:
 *   node eval/scripts/export-for-annotation.js \
 *     --image path/to/image.jpg \
 *     --type burial_register \
 *     --provider openai \
 *     [--output-dir eval/ground-truth/burial-registers]
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    opts[key] = args[i + 1];
  }

  if (!opts.image) {
    console.error('Usage: node eval/scripts/export-for-annotation.js --image <path> --type <type> [--provider <provider>] [--output-dir <dir>]');
    console.error('\nTypes: burial_register, grave_card, memorial, monument_photo');
    process.exit(1);
  }

  return {
    imagePath: path.resolve(opts.image),
    sourceType: opts.type || 'memorial',
    provider: opts.provider || 'openai',
    outputDir: opts['output-dir'] || null,
  };
}

// Map source type to pipeline template and output directory
const TYPE_CONFIG = {
  burial_register: {
    promptTemplate: 'burialRegister',
    outputSubdir: 'burial-registers',
  },
  grave_card: {
    promptTemplate: 'graveCard',
    outputSubdir: 'grave-cards',
  },
  grave_record_card: {
    promptTemplate: 'graveCard',
    outputSubdir: 'grave-cards',
  },
  memorial: {
    promptTemplate: 'memorialOCR',
    outputSubdir: 'memorials',
  },
  monument_photo: {
    promptTemplate: 'monumentPhotoOCR',
    outputSubdir: 'memorials',
  },
};

/**
 * Run the pipeline on a single image and return structured results without
 * storing to the database or deleting the source file.
 */
async function extractModelOutput(imagePath, sourceType, providerName) {
  // Load pipeline modules
  const { createProvider } = require('../../src/utils/modelProviders');
  const { getPrompt } = require('../../src/utils/prompts/templates/providerTemplates');
  const { optimizeImageForProvider, analyzeImageForProvider } = require('../../src/utils/imageProcessor');
  const { processWithValidationRetry } = require('../../src/utils/processingHelpers');
  const config = require('../../config.json');

  // For grave cards, use the PDF stitcher
  const graveCardProcessor = sourceType === 'grave_card' || sourceType === 'grave_record_card'
    ? require('../../src/utils/imageProcessing/graveCardProcessor')
    : null;

  const typeConfig = TYPE_CONFIG[sourceType];
  if (!typeConfig) {
    throw new Error(`Unknown source type: ${sourceType}. Use: burial_register, grave_card, memorial`);
  }

  const processingId = crypto.randomUUID();

  // Read and optionally optimize image
  let base64Image;
  let stitchedImageBuffer = null;
  if (sourceType === 'burial_register') {
    base64Image = await fs.readFile(imagePath, { encoding: 'base64' });
  } else if (sourceType === 'grave_card' || sourceType === 'grave_record_card') {
    stitchedImageBuffer = await graveCardProcessor.processPdf(imagePath);
    base64Image = stitchedImageBuffer.toString('base64');
  } else {
    const analysis = await analyzeImageForProvider(imagePath, providerName);
    if (analysis.needsOptimization) {
      base64Image = await optimizeImageForProvider(imagePath, providerName);
    } else {
      base64Image = await fs.readFile(imagePath, { encoding: 'base64' });
    }
  }

  // Create provider and prompt
  const provider = createProvider({ AI_PROVIDER: providerName });
  const promptInstance = getPrompt(providerName, typeConfig.promptTemplate, 'latest');
  const promptConfig = promptInstance.getProviderPrompt(providerName);
  const userPrompt = typeof promptConfig === 'string' ? promptConfig : promptConfig.userPrompt;
  const systemPrompt = typeof promptConfig === 'object' ? promptConfig.systemPrompt : undefined;

  const providerOptions = {
    systemPrompt,
    promptTemplate: promptInstance,
    processingId,
    ...(config.schemaConstrained?.enabled && promptInstance.getJsonSchema
      ? { jsonSchema: promptInstance.getJsonSchema() }
      : {})
  };

  // Choose validation function based on source type
  let validateFn;
  if (sourceType === 'burial_register') {
    validateFn = (raw) => {
      if (raw && typeof raw === 'object') {
        raw.volume_id = raw.volume_id || 'vol1';
      }
      return promptInstance.validateAndConvertPage(raw);
    };
  } else {
    validateFn = (raw) => promptInstance.validateAndConvert(raw);
  }

  // Run provider + validation (with retry)
  const { validationResult, usage } = await processWithValidationRetry(
    provider, base64Image, userPrompt, providerOptions, validateFn
  );

  return {
    data: validationResult.data,
    confidenceScores: validationResult.confidenceScores,
    validationWarnings: validationResult.validationWarnings,
    usage,
    provider: providerName,
    model: provider.getModelVersion(),
    processingId,
    stitchedImageBuffer,
  };
}

/**
 * Build the GT stub JSON for a memorial document
 */
function buildMemorialStub(result, imagePath, relativeImageRef) {
  const data = result.data;
  const modelOutput = {
    memorial_number: data.memorial_number ?? null,
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    year_of_death: data.year_of_death ?? null,
    inscription: data.inscription ?? null,
  };

  return {
    schema_version: '1.0.0',
    document_type: 'memorial',
    image_ref: relativeImageRef,
    annotator: '',
    annotation_date: new Date().toISOString().split('T')[0],
    blind_transcribed: false,
    difficulty: 0,
    annotator_notes: '',
    extraction_provider: result.provider,
    extraction_model: result.model,
    records: [
      {
        record_index: 0,
        model_output: modelOutput,
        corrected: JSON.parse(JSON.stringify(modelOutput)),
        corrections_made: [],
        needs_review_model: data.needs_review === 1 || data.needs_review === true,
        needs_review_actual: false,
      }
    ],
  };
}

/**
 * Unwrap a {value, confidence} envelope to its plain value, or return as-is.
 */
function unwrap(v) {
  if (v !== null && typeof v === 'object' && 'value' in v) return v.value ?? null;
  return v ?? null;
}

/**
 * Build the GT stub JSON for a burial register page
 */
function buildBurialRegisterStub(result, imagePath, relativeImageRef) {
  const data = result.data;

  const pageModelOutput = {
    parish_header_raw: data.parish_header_raw ?? null,
    county_header_raw: data.county_header_raw ?? null,
    year_header_raw: data.year_header_raw ?? null,
    page_marginalia_raw: data.page_marginalia_raw ?? null,
  };

  const entries = (data.entries || []).map((entry, idx) => {
    const entryFields = {
      entry_no_raw: unwrap(entry.entry_no_raw),
      name_raw: unwrap(entry.name_raw),
      abode_raw: unwrap(entry.abode_raw),
      burial_date_raw: unwrap(entry.burial_date_raw),
      age_raw: unwrap(entry.age_raw),
      officiant_raw: unwrap(entry.officiant_raw),
      marginalia_raw: unwrap(entry.marginalia_raw),
      extra_notes_raw: unwrap(entry.extra_notes_raw),
    };

    return {
      row_index_on_page: entry.row_index_on_page ?? idx,
      model_output: entryFields,
      corrected: JSON.parse(JSON.stringify(entryFields)),
      corrections_made: [],
      needs_review_model: false,
      needs_review_actual: false,
    };
  });

  return {
    schema_version: '1.0.0',
    document_type: 'burial_register',
    image_ref: relativeImageRef,
    annotator: '',
    annotation_date: new Date().toISOString().split('T')[0],
    blind_transcribed: false,
    difficulty: 0,
    annotator_notes: '',
    extraction_provider: result.provider,
    extraction_model: result.model,
    page_level: {
      model_output: pageModelOutput,
      corrected: JSON.parse(JSON.stringify(pageModelOutput)),
      corrections_made: [],
    },
    entries,
  };
}

/**
 * Build the GT stub JSON for a grave card
 */
function buildGraveCardStub(result, imagePath, relativeImageRef) {
  const data = result.data;
  const modelOutput = {
    section: data.section ?? data.location?.section ?? null,
    grave_number: data.grave_number ?? data.location?.grave_number ?? null,
    data_json: data,
  };

  return {
    schema_version: '1.0.0',
    document_type: 'grave_card',
    image_ref: relativeImageRef,
    annotator: '',
    annotation_date: new Date().toISOString().split('T')[0],
    blind_transcribed: false,
    difficulty: 0,
    annotator_notes: '',
    extraction_provider: result.provider,
    extraction_model: result.model,
    model_output: modelOutput,
    corrected: JSON.parse(JSON.stringify(modelOutput)),
    corrections_made: [],
    needs_review_model: data.needs_review === 1 || data.needs_review === true,
    needs_review_actual: false,
  };
}

async function main() {
  const opts = parseArgs();
  const projectRoot = path.resolve(__dirname, '../..');
  const typeConfig = TYPE_CONFIG[opts.sourceType];

  if (!typeConfig) {
    console.error(`Unknown source type: ${opts.sourceType}. Use: burial_register, grave_card, memorial`);
    process.exit(1);
  }

  const outputDir = opts.outputDir
    ? path.resolve(opts.outputDir)
    : path.join(projectRoot, 'eval', 'ground-truth', typeConfig.outputSubdir);

  console.log(`Processing: ${opts.imagePath}`);
  console.log(`Type: ${opts.sourceType}, Provider: ${opts.provider}`);

  const result = await extractModelOutput(opts.imagePath, opts.sourceType, opts.provider);

  // For grave cards, save the stitched image as the source reference
  let relativeImageRef;
  if ((opts.sourceType === 'grave_card' || opts.sourceType === 'grave_record_card') && result.stitchedImageBuffer) {
    const baseName = path.basename(opts.imagePath, path.extname(opts.imagePath))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    const stitchedDir = path.join(projectRoot, 'eval', 'source-images', 'grave-cards-stitched');
    await fs.mkdir(stitchedDir, { recursive: true });
    const stitchedPath = path.join(stitchedDir, `${baseName}-stitched.jpg`);
    await fs.writeFile(stitchedPath, result.stitchedImageBuffer);
    relativeImageRef = path.relative(projectRoot, stitchedPath);
    console.log(`Stitched image saved to: ${stitchedPath}`);
  } else {
    relativeImageRef = path.relative(projectRoot, opts.imagePath);
  }

  // Build stub based on document type
  let stub;
  if (opts.sourceType === 'burial_register') {
    stub = buildBurialRegisterStub(result, opts.imagePath, relativeImageRef);
  } else if (opts.sourceType === 'grave_card' || opts.sourceType === 'grave_record_card') {
    stub = buildGraveCardStub(result, opts.imagePath, relativeImageRef);
  } else {
    stub = buildMemorialStub(result, opts.imagePath, relativeImageRef);
  }

  // Derive output filename from source image
  const baseName = path.basename(opts.imagePath, path.extname(opts.imagePath))
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  const outputPath = path.join(outputDir, `${baseName}.gt.json`);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(stub, null, 2) + '\n');

  console.log(`\nGround truth stub written to: ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Open ${outputPath} and the source image side by side`);
  console.log(`  2. Correct every field in "corrected" against the source image`);
  console.log(`  3. Add changed field names to "corrections_made"`);
  console.log(`  4. Set "difficulty" (1-5) and "annotator" field`);
  console.log(`  5. Add "annotator_notes" for anything unusual`);
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { extractModelOutput, buildMemorialStub, buildBurialRegisterStub, buildGraveCardStub };
