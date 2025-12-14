/**
 * @jest-environment jsdom
 */

import { formatSourceType, getSourceTypeBadgeClass } from '../main.js';

describe('Source Type Display Utilities', () => {
  describe('formatSourceType', () => {
    it('should format grave_record_card as "Grave Record Card"', () => {
      expect(formatSourceType('grave_record_card')).toBe('Grave Record Card');
    });

    it('should format record_sheet as "Record Sheet"', () => {
      expect(formatSourceType('record_sheet')).toBe('Record Sheet');
    });

    it('should format monument_photo as "Monument Photo"', () => {
      expect(formatSourceType('monument_photo')).toBe('Monument Photo');
    });

    it('should handle unknown source types with capitalization', () => {
      expect(formatSourceType('unknown_type')).toBe('Unknown_type');
    });

    it('should return "Unknown" for null or undefined', () => {
      expect(formatSourceType(null)).toBe('Unknown');
      expect(formatSourceType(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for empty string', () => {
      expect(formatSourceType('')).toBe('Unknown');
    });
  });

  describe('getSourceTypeBadgeClass', () => {
    it('should return "badge-warning" for grave_record_card', () => {
      expect(getSourceTypeBadgeClass('grave_record_card')).toBe('badge-warning');
    });

    it('should return "badge-primary" for record_sheet', () => {
      expect(getSourceTypeBadgeClass('record_sheet')).toBe('badge-primary');
    });

    it('should return "badge-success" for monument_photo', () => {
      expect(getSourceTypeBadgeClass('monument_photo')).toBe('badge-success');
    });

    it('should return "badge-secondary" for unknown source types', () => {
      expect(getSourceTypeBadgeClass('unknown_type')).toBe('badge-secondary');
    });

    it('should return "badge-secondary" for null or undefined', () => {
      expect(getSourceTypeBadgeClass(null)).toBe('badge-secondary');
      expect(getSourceTypeBadgeClass(undefined)).toBe('badge-secondary');
    });
  });
});
