jest.mock('../../src/utils/logger');

const { classifyError, withRetry } = require('../../src/utils/retryHelper');

describe('retryHelper', () => {
  describe('classifyError', () => {
    test('identifies rate-limit by status 429', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      expect(classifyError(error)).toBe('rate_limit');
    });

    test('identifies rate-limit by message', () => {
      const error = new Error('Rate limit exceeded');
      expect(classifyError(error)).toBe('rate_limit');
    });

    test('identifies timeout by message', () => {
      const error = new Error('Request timeout after 30000ms');
      expect(classifyError(error)).toBe('timeout');
    });

    test('identifies timeout by ETIMEDOUT', () => {
      const error = new Error('connect ETIMEDOUT');
      expect(classifyError(error)).toBe('timeout');
    });

    test('identifies parse error by JSON keyword', () => {
      const error = new Error('Unexpected token in JSON at position 0');
      expect(classifyError(error)).toBe('parse_error');
    });

    test('identifies parse error by parse keyword', () => {
      const error = new Error('Failed to parse response');
      expect(classifyError(error)).toBe('parse_error');
    });

    test('returns unknown for unrecognized errors', () => {
      const error = new Error('Something went wrong');
      expect(classifyError(error)).toBe('unknown');
    });
  });

  describe('withRetry', () => {
    test('succeeds on first attempt — fn called once', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries and succeeds on second attempt', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('ok');

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10, jitterMs: 0 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('throws after exhausting all retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelay: 10, jitterMs: 0 })
      ).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    test('calls onRetry callback on each failure', async () => {
      const onRetry = jest.fn();
      const error1 = new Error('fail 1');
      const error2 = new Error('fail 2');
      const fn = jest.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce('ok');

      await withRetry(fn, { maxRetries: 3, baseDelay: 10, jitterMs: 0, onRetry });
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(error1, 1);
      expect(onRetry).toHaveBeenCalledWith(error2, 2);
    });

    test('does not retry when maxRetries=0', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      await expect(withRetry(fn, { maxRetries: 0 })).rejects.toThrow('fail');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('passes attempt number to fn', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('ok');

      await withRetry(fn, { maxRetries: 2, baseDelay: 10, jitterMs: 0 });

      expect(fn).toHaveBeenCalledWith(1);
      expect(fn).toHaveBeenCalledWith(2);
    });
  });
});
