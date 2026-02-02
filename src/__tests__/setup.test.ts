/**
 * Basic setup test to verify project structure
 */

import { BackstageTemplateGenerator } from '../index';
import { CapabilityMaturity, DevelopmentPhase } from '../types/core';

describe('Project Setup', () => {
  test('should create BackstageTemplateGenerator instance', () => {
    const generator = new BackstageTemplateGenerator();
    expect(generator).toBeInstanceOf(BackstageTemplateGenerator);
  });

  test('should export core types', () => {
    expect(CapabilityMaturity.L1_GENERATION).toBe('L1_GENERATION');
    expect(DevelopmentPhase.FOUNDATION).toBe('FOUNDATION');
  });

  test('should have proper enum values', () => {
    const maturityLevels = Object.values(CapabilityMaturity);
    expect(maturityLevels).toHaveLength(5);
    expect(maturityLevels).toContain('L1_GENERATION');
    expect(maturityLevels).toContain('L5_INTENT_DRIVEN');

    const phases = Object.values(DevelopmentPhase);
    expect(phases).toHaveLength(5);
    expect(phases).toContain('FOUNDATION');
    expect(phases).toContain('INTENT_DRIVEN');
  });
});
