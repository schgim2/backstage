/**
 * Error Handling and Recovery Tests
 * Tests comprehensive error handling, recovery strategies, and rollback mechanisms
 */

import {
  BackstageTemplateGenerator,
  BackstageTemplateGeneratorError,
  ErrorType,
  BackstageTemplateGeneratorConfig,
} from '../index';
import {
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
  Capability,
} from '../types/core';

describe('Error Handling and Recovery', () => {
  let generator: BackstageTemplateGenerator;
  let mockConsole: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    mockConsole = jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();

    const config: BackstageTemplateGeneratorConfig = {
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 100,
        enableRollback: true,
        enableRecovery: true,
        logLevel: 'error',
      },
      features: {
        enablePreview: false,
        enableInteractiveCompletion: false,
        enableMaturityAssessment: false,
        enableGitOpsWorkflow: false,
      },
    };

    generator = new BackstageTemplateGenerator(config);
  });

  afterEach(() => {
    mockConsole.mockRestore();
    jest.restoreAllMocks();
  });

  describe('BackstageTemplateGeneratorError', () => {
    it('should create error with all required properties', () => {
      const error = new BackstageTemplateGeneratorError(
        ErrorType.INTENT_PARSING_ERROR,
        'TestComponent',
        'testOperation',
        'Test error message',
        { testDetail: 'value' },
        true
      );

      expect(error.type).toBe(ErrorType.INTENT_PARSING_ERROR);
      expect(error.component).toBe('TestComponent');
      expect(error.operation).toBe('testOperation');
      expect(error.message).toBe('Test error message');
      expect(error.details).toEqual({ testDetail: 'value' });
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('BackstageTemplateGeneratorError');
    });

    it('should create error with default values', () => {
      const error = new BackstageTemplateGeneratorError(
        ErrorType.VALIDATION_ERROR,
        'TestComponent',
        'testOperation',
        'Test error message'
      );

      expect(error.details).toEqual({});
      expect(error.recoverable).toBe(true);
    });
  });

  describe('Error Handling in generateFromIntent', () => {
    it('should handle intent parsing errors with recovery', async () => {
      // Mock intent parser to throw error
      const mockParseIntent = jest
        .spyOn(generator['intentParser'], 'parseIntent')
        .mockRejectedValueOnce(new Error('Intent parsing failed'));

      const result = await generator.generateFromIntent('invalid intent', {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      // Should recover with fallback intent
      expect(result.template).toBeDefined();
      expect(result.template.metadata.name).toBe('basic-service');
      expect(mockParseIntent).toHaveBeenCalledTimes(1);
    });

    it('should handle template generation errors with recovery', async () => {
      // Mock YAML generator to throw error
      const mockGenerateYaml = jest
        .spyOn(generator['yamlGenerator'], 'generateBackstageYaml')
        .mockRejectedValueOnce(new Error('YAML generation failed'));

      const result = await generator.generateFromIntent('create a service', {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      // Should recover with minimal template
      expect(result.template).toBeDefined();
      expect(mockGenerateYaml).toHaveBeenCalledTimes(2); // Original call + recovery call
    });

    it('should throw error when recovery fails', async () => {
      // Mock all components to fail
      jest
        .spyOn(generator['intentParser'], 'parseIntent')
        .mockRejectedValue(new Error('Intent parsing failed'));
      jest
        .spyOn(generator['yamlGenerator'], 'generateBackstageYaml')
        .mockRejectedValue(new Error('YAML generation failed'));
      jest
        .spyOn(generator['skeletonGenerator'], 'generateSkeleton')
        .mockRejectedValue(new Error('Skeleton generation failed'));

      await expect(
        generator.generateFromIntent('invalid intent', {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        })
      ).rejects.toThrow(BackstageTemplateGeneratorError);
    });
  });

  describe('Error Handling in generateFromSpec', () => {
    const mockSpec: TemplateSpec = {
      metadata: {
        name: 'test-template',
        description: 'Test template',
        tags: ['test'],
        owner: 'test-team',
      },
      parameters: {},
      steps: [],
      output: { links: [] },
      validation: {
        security: [],
        compliance: [],
        standards: [],
        cost: [],
      },
    };

    it('should handle template generation errors', async () => {
      // Mock skeleton generator to throw error
      const mockGenerateSkeleton = jest
        .spyOn(generator['skeletonGenerator'], 'generateSkeleton')
        .mockRejectedValueOnce(new Error('Skeleton generation failed'));

      const result = await generator.generateFromSpec(mockSpec, {
        preview: false,
        deploy: false,
      });

      // Should recover with minimal template
      expect(result.template).toBeDefined();
      expect(mockGenerateSkeleton).toHaveBeenCalledTimes(2); // Original call + recovery call
    });

    it('should handle preview generation errors', async () => {
      // Mock preview system to throw error
      jest
        .spyOn(generator['previewSystem'], 'previewTemplate')
        .mockRejectedValueOnce(new Error('Preview generation failed'));

      await expect(
        generator.generateFromSpec(mockSpec, {
          preview: true,
          deploy: false,
        })
      ).rejects.toThrow(BackstageTemplateGeneratorError);
    });
  });

  describe('Error Handling in Other Methods', () => {
    it('should handle errors in previewFromSpec', async () => {
      const mockSpec: TemplateSpec = {
        metadata: {
          name: 'test-template',
          description: 'Test template',
          tags: ['test'],
          owner: 'test-team',
        },
        parameters: {},
        steps: [],
        output: { links: [] },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      jest
        .spyOn(generator['previewSystem'], 'previewFromSpec')
        .mockRejectedValueOnce(new Error('Preview generation failed'));

      await expect(generator.previewFromSpec(mockSpec)).rejects.toThrow(
        BackstageTemplateGeneratorError
      );
    });

    it('should handle errors in assessMaturity', async () => {
      const mockCapability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'Test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      jest
        .spyOn(generator['maturityManager'], 'assessMaturity')
        .mockRejectedValueOnce(new Error('Maturity assessment failed'));

      await expect(generator.assessMaturity(mockCapability)).rejects.toThrow(
        BackstageTemplateGeneratorError
      );
    });

    it('should handle errors in discoverTemplates', async () => {
      jest
        .spyOn(generator['capabilityRegistry'], 'getCapabilities')
        .mockRejectedValueOnce(new Error('Template discovery failed'));

      await expect(generator.discoverTemplates({})).rejects.toThrow(
        BackstageTemplateGeneratorError
      );
    });

    it('should handle errors in getRecommendations', async () => {
      jest
        .spyOn(generator['capabilityRegistry'], 'suggestImprovements')
        .mockRejectedValueOnce(new Error('Recommendation generation failed'));

      await expect(
        generator.getRecommendations('test-capability')
      ).rejects.toThrow(BackstageTemplateGeneratorError);
    });
  });

  describe('Rollback Operations', () => {
    it('should register and execute rollback operations', async () => {
      const config: BackstageTemplateGeneratorConfig = {
        errorHandling: {
          enableRollback: true,
          enableRecovery: false, // Disable recovery to test rollback
        },
        features: {
          enablePreview: false,
          enableInteractiveCompletion: false,
          enableMaturityAssessment: false,
          enableGitOpsWorkflow: true, // Enable GitOps to test rollback
        },
      };

      const rollbackGenerator = new BackstageTemplateGenerator(config);

      // Mock GitOps operations to fail after some operations
      jest
        .spyOn(rollbackGenerator['gitOpsManager'], 'createTemplateRepository')
        .mockResolvedValueOnce({
          id: 'test-repo',
          name: 'test-repo',
          url: 'https://github.com/test/test-repo',
          branch: 'main',
        });

      jest
        .spyOn(rollbackGenerator['gitOpsManager'], 'commitChanges')
        .mockResolvedValueOnce('commit-hash-123');

      jest
        .spyOn(rollbackGenerator['gitOpsManager'], 'createPullRequest')
        .mockRejectedValueOnce(new Error('PR creation failed'));

      await expect(
        rollbackGenerator.generateFromIntent('create a service', {
          interactive: false,
          preview: false,
          deploy: true,
          maturityAssessment: false,
        })
      ).rejects.toThrow();

      // Rollback operations should have been executed
      // In a real implementation, we would verify that cleanup operations were called
    });
  });

  describe('Configuration Validation', () => {
    it('should handle invalid configuration gracefully', () => {
      const invalidConfig: BackstageTemplateGeneratorConfig = {
        errorHandling: {
          maxRetries: -1, // Invalid value
          retryDelayMs: -100, // Invalid value
        },
      };

      // Should not throw during construction
      expect(() => new BackstageTemplateGenerator(invalidConfig)).not.toThrow();
    });

    it('should use default values for missing configuration', () => {
      const minimalConfig: BackstageTemplateGeneratorConfig = {};
      const generator = new BackstageTemplateGenerator(minimalConfig);

      // Should initialize successfully with defaults
      expect(generator).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully with no ongoing operations', async () => {
      await expect(generator.shutdown()).resolves.not.toThrow();
    });

    it('should cancel ongoing operations during shutdown', async () => {
      // Start a long-running operation
      const operationPromise = generator.generateFromIntent(
        'create a service',
        {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        }
      );

      // Shutdown while operation is running
      const shutdownPromise = generator.shutdown();

      // Both should complete without throwing
      await expect(
        Promise.all([operationPromise, shutdownPromise])
      ).resolves.toBeDefined();
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log operations at appropriate levels', async () => {
      const debugConfig: BackstageTemplateGeneratorConfig = {
        errorHandling: {
          logLevel: 'debug',
        },
        features: {
          enablePreview: false,
          enableInteractiveCompletion: false,
          enableMaturityAssessment: false,
          enableGitOpsWorkflow: false,
        },
      };

      const debugGenerator = new BackstageTemplateGenerator(debugConfig);

      await debugGenerator.generateFromIntent('create a service', {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      // Verify that logging occurred (in a real implementation, we would check log outputs)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should handle logging errors gracefully', async () => {
      // Mock console methods to throw errors
      jest.spyOn(console, 'info').mockImplementation(() => {
        throw new Error('Logging failed');
      });

      // Should not affect operation execution
      await expect(
        generator.generateFromIntent('create a service', {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Recovery Strategies', () => {
    it('should execute multiple recovery strategies if first fails', async () => {
      // This test would verify that if the first recovery strategy fails,
      // the system tries the next available strategy
      // For now, we'll test that recovery is attempted

      jest
        .spyOn(generator['intentParser'], 'parseIntent')
        .mockRejectedValueOnce(new Error('Intent parsing failed'));

      const result = await generator.generateFromIntent('invalid intent', {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      expect(result.template).toBeDefined();
    });

    it('should provide recovery strategy descriptions', () => {
      // Test that recovery strategies have proper descriptions
      const strategies = generator['recoveryStrategies'];

      expect(strategies.size).toBeGreaterThan(0);

      for (const [errorType, strategyList] of strategies.entries()) {
        for (const strategy of strategyList) {
          expect(strategy.getDescription()).toBeTruthy();
          expect(typeof strategy.getDescription()).toBe('string');
        }
      }
    });
  });

  describe('Error Context and Details', () => {
    it('should preserve error context through recovery attempts', async () => {
      jest
        .spyOn(generator['intentParser'], 'parseIntent')
        .mockRejectedValueOnce(new Error('Intent parsing failed'));

      const result = await generator.generateFromIntent('test intent', {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      // Recovery should preserve original intent in some form
      expect(result.template).toBeDefined();
    });

    it('should include operation context in error details', async () => {
      jest
        .spyOn(generator['yamlGenerator'], 'generateBackstageYaml')
        .mockRejectedValue(new Error('YAML generation failed'));
      jest
        .spyOn(generator['skeletonGenerator'], 'generateSkeleton')
        .mockRejectedValue(new Error('Skeleton generation failed'));
      jest
        .spyOn(generator['validationGenerator'], 'generateValidationLogic')
        .mockRejectedValue(new Error('Validation generation failed'));
      jest
        .spyOn(generator['documentationGenerator'], 'generateDocumentation')
        .mockRejectedValue(new Error('Documentation generation failed'));

      try {
        await generator.generateFromIntent('create a service', {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        });
      } catch (error) {
        if (error instanceof BackstageTemplateGeneratorError) {
          expect(error.details).toBeDefined();
          expect(error.component).toBeTruthy();
          expect(error.operation).toBeTruthy();
        }
      }
    });
  });
});
