/**
 * Integration tests for the Backstage Template Generator orchestrator
 * Tests the complete workflow from intent to deployment
 */

import { BackstageTemplateGenerator } from '../index';
import {
  CapabilityMaturity,
  DevelopmentPhase,
  ParsedIntent,
  TemplateSpec,
} from '../types/core';

describe('BackstageTemplateGenerator Orchestrator', () => {
  let generator: BackstageTemplateGenerator;

  beforeEach(() => {
    generator = new BackstageTemplateGenerator({
      gitProvider: 'github',
      gitConfig: {
        baseUrl: 'https://github.com',
        organization: 'test-org',
        token: 'test-token',
      },
      features: {
        enablePreview: true,
        enableInteractiveCompletion: false, // Disable for testing
        enableMaturityAssessment: true,
        enableGitOpsWorkflow: false, // Disable for testing
      },
    });
  });

  afterEach(async () => {
    await generator.shutdown();
  });

  describe('Component Initialization', () => {
    it('should initialize all components successfully', () => {
      expect(generator).toBeDefined();
      // Test that the generator was created without throwing errors
    });

    it('should handle configuration options correctly', () => {
      const customGenerator = new BackstageTemplateGenerator({
        gitProvider: 'gitlab',
        features: {
          enablePreview: false,
          enableInteractiveCompletion: true,
          enableMaturityAssessment: false,
          enableGitOpsWorkflow: true,
        },
      });

      expect(customGenerator).toBeDefined();
    });
  });

  describe('Intent-to-Template Generation', () => {
    it('should generate template from natural language intent', async () => {
      const intentDescription =
        'Create a Node.js microservice with REST API endpoints and database integration';

      const result = await generator.generateFromIntent(intentDescription, {
        interactive: false,
        preview: true,
        deploy: false,
        maturityAssessment: true,
      });

      expect(result.template).toBeDefined();
      expect(result.template.yaml).toContain(
        'apiVersion: scaffolder.backstage.io/v1beta3'
      );
      expect(result.template.yaml).toContain('kind: Template');
      expect(result.template.skeleton).toBeDefined();
      expect(result.template.documentation).toBeDefined();
      expect(result.template.validation).toBeDefined();
      expect(result.template.metadata).toBeDefined();

      expect(result.preview).toBeDefined();
      expect(result.maturityAssessment).toBeDefined();
      expect(result.deploymentResult).toBeUndefined();
    });

    it('should handle different maturity levels in intent', async () => {
      const intentDescription =
        'Create an advanced microservice with monitoring, observability, and governance policies';

      const result = await generator.generateFromIntent(intentDescription, {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: true,
      });

      expect(result.template.metadata.maturityLevel).toBeDefined();
      expect(result.template.metadata.phase).toBeDefined();
      expect(result.maturityAssessment).toBeDefined();
    });

    it('should handle different development phases', async () => {
      const intentDescription =
        'Create a foundation-level service template for getting started';

      const result = await generator.generateFromIntent(intentDescription, {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      expect(result.template.metadata.phase).toBe(DevelopmentPhase.FOUNDATION);
    });
  });

  describe('Specification-based Generation', () => {
    it('should generate template from existing specification', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-service',
          description: 'A test service template',
          tags: ['nodejs', 'api', 'microservice'],
          owner: 'platform-team',
        },
        parameters: {
          name: {
            title: 'Name',
            type: 'string',
            description: 'Unique name of the component',
          },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Skeleton',
            action: 'fetch:template',
            input: {
              url: './skeleton',
            },
          },
        ],
        output: {
          links: [
            {
              title: 'Repository',
              url: '${{ steps.publish.output.remoteUrl }}',
            },
          ],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const result = await generator.generateFromSpec(spec, {
        preview: true,
        deploy: false,
      });

      expect(result.template).toBeDefined();
      expect(result.template.metadata.name).toBe('test-service');
      expect(result.preview).toBeDefined();
      expect(result.deploymentResult).toBeUndefined();
    });
  });

  describe('Preview Functionality', () => {
    it('should generate preview from specification', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'preview-test',
          description: 'A test for preview functionality',
          tags: ['test'],
          owner: 'test-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await generator.previewFromSpec(spec);

      expect(preview.specPreview).toBeDefined();
      expect(preview.validationResults).toBeDefined();
      expect(preview.estimatedStructure).toBeDefined();
      expect(preview.recommendations).toBeDefined();
    });
  });

  describe('Maturity Assessment', () => {
    it('should assess capability maturity', async () => {
      const mockCapability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await generator.assessMaturity(mockCapability);

      expect(assessment).toBeDefined();
      expect(assessment.currentLevel).toBeDefined();
      expect(assessment.readinessScore).toBeGreaterThanOrEqual(0);
      expect(assessment.readinessScore).toBeLessThanOrEqual(100);
      expect(assessment.blockers).toBeDefined();
      expect(assessment.recommendations).toBeDefined();
      expect(assessment.progressionPath).toBeDefined();
    });
  });

  describe('Template Discovery', () => {
    it('should discover templates based on criteria', async () => {
      const query = {
        tags: ['nodejs'],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        searchTerm: 'service',
      };

      const templates = await generator.discoverTemplates(query);

      expect(Array.isArray(templates)).toBe(true);
      // Templates array might be empty in test environment, which is fine
    });

    it('should handle empty search results', async () => {
      const query = {
        searchTerm: 'nonexistent-template-xyz',
      };

      const templates = await generator.discoverTemplates(query);

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBe(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate recommendations for capabilities', async () => {
      // First register a capability to get recommendations for
      const mockCapability = {
        id: 'test-capability-for-recommendations',
        name: 'Test Capability',
        description: 'A test capability for recommendations',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      // Register the capability first
      await generator['capabilityRegistry'].registerCapability(mockCapability);

      const recommendations = await generator.getRecommendations(
        'test-capability-for-recommendations'
      );

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach((rec) => {
        expect(typeof rec).toBe('string');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid intent gracefully', async () => {
      const invalidIntent = '';

      const result = await generator.generateFromIntent(invalidIntent, {
        interactive: false,
        preview: false,
        deploy: false,
        maturityAssessment: false,
      });

      // The system should handle empty intent by creating a basic template
      expect(result.template).toBeDefined();
      expect(result.template.yaml).toContain('apiVersion');
    });

    it('should handle invalid specification gracefully', async () => {
      const invalidSpec = {
        metadata: {
          name: '', // Invalid empty name
          description: '',
          tags: [],
          owner: '',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      } as TemplateSpec;

      await expect(generator.generateFromSpec(invalidSpec)).rejects.toThrow();
    });
  });

  describe('Component Integration', () => {
    it('should integrate all components in the workflow', async () => {
      const intentDescription = 'Create a simple web service';

      const result = await generator.generateFromIntent(intentDescription, {
        interactive: false,
        preview: true,
        deploy: false,
        maturityAssessment: true,
      });

      // Verify that all components contributed to the result
      expect(result.template.yaml).toBeDefined(); // YAML Generator
      expect(result.template.skeleton).toBeDefined(); // Skeleton Generator
      expect(result.template.documentation).toBeDefined(); // Documentation Generator
      expect(result.template.validation).toBeDefined(); // Validation Generator
      expect(result.preview).toBeDefined(); // Preview System
      expect(result.maturityAssessment).toBeDefined(); // Maturity Manager

      // Verify template structure
      expect(result.template.yaml).toContain('apiVersion');
      expect(result.template.yaml).toContain('kind: Template');
      expect(result.template.skeleton.files).toBeDefined();
      expect(result.template.documentation.readme).toBeDefined();
    });

    it('should handle feature flags correctly', async () => {
      const generatorWithLimitedFeatures = new BackstageTemplateGenerator({
        features: {
          enablePreview: false,
          enableInteractiveCompletion: false,
          enableMaturityAssessment: false,
          enableGitOpsWorkflow: false,
        },
      });

      const result = await generatorWithLimitedFeatures.generateFromIntent(
        'Create a simple service',
        {}
      );

      expect(result.template).toBeDefined();
      expect(result.preview).toBeUndefined();
      expect(result.maturityAssessment).toBeUndefined();
      expect(result.deploymentResult).toBeUndefined();

      await generatorWithLimitedFeatures.shutdown();
    });
  });

  describe('Configuration Management', () => {
    it('should use default configuration when none provided', () => {
      const defaultGenerator = new BackstageTemplateGenerator();
      expect(defaultGenerator).toBeDefined();
    });

    it('should override default configuration with provided values', () => {
      const customConfig = {
        gitProvider: 'gitlab' as const,
        gitConfig: {
          baseUrl: 'https://gitlab.com',
          organization: 'custom-org',
        },
        features: {
          enablePreview: false,
          enableInteractiveCompletion: true,
          enableMaturityAssessment: false,
          enableGitOpsWorkflow: true,
        },
      };

      const customGenerator = new BackstageTemplateGenerator(customConfig);
      expect(customGenerator).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should shutdown gracefully', async () => {
      const testGenerator = new BackstageTemplateGenerator();

      // Should not throw
      await expect(testGenerator.shutdown()).resolves.not.toThrow();
    });
  });
});
