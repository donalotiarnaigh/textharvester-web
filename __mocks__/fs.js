const fs = jest.createMockFromModule("fs");

fs.writeFileSync = jest.fn();

module.exports = fs;
