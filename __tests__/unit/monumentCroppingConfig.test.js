const config = require('../../config.json');

describe('Monument Cropping configuration', () => {
  test('should expose default cropping settings', () => {
    expect(config.monumentCropping).toEqual({
      enabled: false,
      minWidth: 400,
      minHeight: 400,
      aspectRatioMin: 0.5,
      aspectRatioMax: 2.0
    });
  });
});
