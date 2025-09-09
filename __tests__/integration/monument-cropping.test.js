jest.unmock('fs');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

jest.mock('../../src/utils/modelProviders', () => ({
  createProvider: jest.fn().mockReturnValue({
    processImage: jest.fn().mockResolvedValue({}),
    getModelVersion: jest.fn().mockReturnValue('v1')
  })
}));
jest.mock('../../src/utils/database', () => ({ storeMemorial: jest.fn() }));
jest.mock('../../src/utils/prompts/templates/providerTemplates', () => ({
  getPrompt: jest.fn().mockReturnValue({
    getProviderPrompt: jest.fn().mockReturnValue('prompt'),
    validateAndConvert: jest.fn().mockReturnValue({}),
    version: '1.0'
  })
}));
jest.mock('../../src/utils/logger');
jest.mock('../../src/utils/imageProcessor', () => {
  const fs = require('fs').promises;
  return {
    analyzeImageForProvider: jest.fn(async (input) => ({
      needsOptimization: false,
      reasons: [],
      originalSize: Buffer.isBuffer(input) ? input.length : (await fs.stat(input)).size
    })),
    optimizeImageForProvider: jest.fn(async (input) => {
      if (Buffer.isBuffer(input)) return input.toString('base64');
      const data = await fs.readFile(input);
      return data.toString('base64');
    })
  };
});

describe('Monument cropping integration', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  let originalBase64;
  let blankBase64;

  beforeAll(async () => {
    await fs.mkdir(fixturesDir, { recursive: true });
    const monumentBuffer = await sharp({
      create: { width: 800, height: 600, channels: 3, background: 'white' }
    })
      .composite([
        {
          input: await sharp({
            create: { width: 500, height: 400, channels: 3, background: 'black' }
          }).png().toBuffer(),
          top: 100,
          left: 150
        }
      ])
      .png()
      .toBuffer();
    await fs.writeFile(path.join(fixturesDir, 'monument.png'), monumentBuffer);
    originalBase64 = monumentBuffer.toString('base64');

    const blankBuffer = await sharp({
      create: { width: 800, height: 600, channels: 3, background: 'white' }
    }).png().toBuffer();
    await fs.writeFile(path.join(fixturesDir, 'blank.png'), blankBuffer);
    blankBase64 = blankBuffer.toString('base64');
  });

  afterAll(() => fs.rm(fixturesDir, { recursive: true, force: true }));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('uses cropped image when detection succeeds', async () => {
    jest.doMock('../../config.json', () => ({
      monumentCropping: { enabled: true, minWidth: 400, minHeight: 400, aspectRatioMin: 0.5, aspectRatioMax: 2 }
    }), { virtual: true });
    const { processFile } = require('../../src/utils/fileProcessing');
    const { createProvider } = require('../../src/utils/modelProviders');
    await processFile(path.join(fixturesDir, 'monument.png'), {
      provider: 'anthropic',
      source_type: 'monument_photo'
    });
    const provider = createProvider.mock.results[0].value;
    const usedBase64 = provider.processImage.mock.calls[0][0];
    expect(usedBase64.length).toBeLessThan(originalBase64.length);
  });

  test('falls back to original when detection fails', async () => {
    jest.doMock('../../config.json', () => ({
      monumentCropping: { enabled: true, minWidth: 400, minHeight: 400, aspectRatioMin: 0.5, aspectRatioMax: 2 }
    }), { virtual: true });
    const { processFile } = require('../../src/utils/fileProcessing');
    const { createProvider } = require('../../src/utils/modelProviders');
    await processFile(path.join(fixturesDir, 'blank.png'), {
      provider: 'anthropic',
      source_type: 'monument_photo'
    });
    const provider = createProvider.mock.results[0].value;
    const usedBase64 = provider.processImage.mock.calls[0][0];
    expect(usedBase64.length).toBe(blankBase64.length);
  });
});
