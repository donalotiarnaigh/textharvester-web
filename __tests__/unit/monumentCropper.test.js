const path = require('path');
jest.unmock('fs');
const fs = require('fs').promises;
const sharp = require('sharp');

const fixturesDir = path.join(__dirname, 'fixtures');

beforeAll(async () => {
  await fs.mkdir(fixturesDir, { recursive: true });
  // create valid monument image with central dark rectangle 500x400 within 800x600 canvas
  const monument = await sharp({
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
  await fs.writeFile(path.join(fixturesDir, 'monument.png'), monument);

  // create blank image without monument
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: 'white' }
  })
    .png()
    .toFile(path.join(fixturesDir, 'blank.png'));

  // create small rectangle that fails size thresholds
  const small = await sharp({
    create: { width: 800, height: 600, channels: 3, background: 'white' }
  })
    .composite([
      {
        input: await sharp({
          create: { width: 100, height: 80, channels: 3, background: 'black' }
        }).png().toBuffer(),
        top: 260,
        left: 350
      }
    ])
    .png()
    .toBuffer();
  await fs.writeFile(path.join(fixturesDir, 'small.png'), small);
});

afterAll(() => fs.rm(fixturesDir, { recursive: true, force: true }));

describe('MonumentCropper', () => {
  const { detectAndCrop } = require('../../src/utils/imageProcessing/monumentCropper');

  test('crops detected monument', async () => {
    const result = await detectAndCrop(path.join(fixturesDir, 'monument.png'));
    expect(result.buffer).toBeInstanceOf(Buffer);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(500);
    expect(meta.height).toBe(400);
    expect(result.box).toEqual({ left: 150, top: 100, width: 500, height: 400 });
  });

  test('returns null when no monument detected', async () => {
    const result = await detectAndCrop(path.join(fixturesDir, 'blank.png'));
    expect(result).toBeNull();
  });

  test('returns null when monument too small', async () => {
    const result = await detectAndCrop(path.join(fixturesDir, 'small.png'));
    expect(result).toBeNull();
  });
});
