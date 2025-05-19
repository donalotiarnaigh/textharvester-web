const { getPrompt, registerPrompt, listPrompts, clearRegistry } = require('../index');
const MemorialOCRPrompt = require('../templates/MemorialOCRPrompt');

describe('Prompt Module', () => {
  beforeEach(() => {
    // Reset module state between tests
    clearRegistry();
    jest.clearAllMocks();
  });

  describe('registerPrompt', () => {
    it('should register a prompt with its versions', () => {
      const result = registerPrompt('memorial', {
        '1.0.0': MemorialOCRPrompt,
        '2.0.0': MemorialOCRPrompt
      });

      expect(result).toBeTruthy();
      expect(listPrompts()).toContainEqual({
        name: 'memorial',
        versions: ['1.0.0', '2.0.0']
      });
    });

    it('should throw error when registering invalid prompt class', () => {
      expect(() => {
        registerPrompt('invalid', {
          '1.0.0': class InvalidPrompt {}
        });
      }).toThrow('Invalid prompt class');
    });

    it('should throw error when registering duplicate prompt name', () => {
      registerPrompt('test', { '1.0.0': MemorialOCRPrompt });
      expect(() => {
        registerPrompt('test', { '1.0.0': MemorialOCRPrompt });
      }).toThrow('Prompt name already registered');
    });
  });

  describe('getPrompt', () => {
    beforeEach(() => {
      registerPrompt('memorial', {
        '1.0.0': MemorialOCRPrompt,
        '2.0.0': MemorialOCRPrompt
      });
    });

    it('should return latest version when version is not specified', () => {
      const prompt = getPrompt('memorial');
      expect(prompt).toBeInstanceOf(MemorialOCRPrompt);
      expect(prompt.version).toBe('2.0.0');
    });

    it('should return specific version when requested', () => {
      const prompt = getPrompt('memorial', '1.0.0');
      expect(prompt).toBeInstanceOf(MemorialOCRPrompt);
      expect(prompt.version).toBe('1.0.0');
    });

    it('should throw error for unknown prompt name', () => {
      expect(() => {
        getPrompt('unknown');
      }).toThrow('Unknown prompt: unknown');
    });

    it('should throw error for unknown version', () => {
      expect(() => {
        getPrompt('memorial', '3.0.0');
      }).toThrow('Version 3.0.0 not found for prompt: memorial');
    });

    it('should accept configuration options', () => {
      const config = {
        description: 'Custom memorial prompt',
        modelTargets: ['openai']
      };
      const prompt = getPrompt('memorial', 'latest', config);
      expect(prompt.description).toBe('Custom memorial prompt');
      expect(prompt.modelTargets).toEqual(['openai']);
    });
  });

  describe('listPrompts', () => {
    beforeEach(() => {
      registerPrompt('memorial', {
        '1.0.0': MemorialOCRPrompt,
        '2.0.0': MemorialOCRPrompt
      });
      registerPrompt('inscription', {
        '1.0.0': MemorialOCRPrompt
      });
    });

    it('should list all registered prompts and their versions', () => {
      const prompts = listPrompts();
      expect(prompts).toEqual([
        { name: 'memorial', versions: ['1.0.0', '2.0.0'] },
        { name: 'inscription', versions: ['1.0.0'] }
      ]);
    });

    it('should return empty array when no prompts registered', () => {
      jest.resetModules();
      const { listPrompts } = require('../index');
      expect(listPrompts()).toEqual([]);
    });
  });
}); 