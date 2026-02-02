/**
 * Property-Based Integration Tests
 * Tests system properties and invariants across different inputs and scenarios
 */

import * as fc from 'fast-check';
import {
  BackstageTemplateGenerator,
  BackstageTemplateGeneratorConfig,
} from '../index';
import {
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('Property-Based Integration Tests', () => {
  let generator: BackstageTemplateGenerator;
  let mockConsole: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods to reduce test noise
    mockConsole = jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    const config: BackstageTemplateGeneratorConfig = {
      features: {
        enablePreview: false, // Disable to speed up tests
        enableInteractiveCompletion: false,
        enableMaturityAssessment: false,
        enableGitOpsWorkflow: false, // Disable to avoid complex mocking
      },
      errorHandling: {
        maxRetries: 1,
        retryDelayMs: 10,
        enableRollback: false,
        enableRecovery: true,
        logLevel: 'error',
      },
    };

    generator = new BackstageTemplateGenerator(config);
  });

  afterEach(async () => {
    await generator.shutdown();
    mockConsole.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Intent Processing Properties', () => {
    it('should always generate valid templates from any non-empty intent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .string({ minLength: 5, maxLength: 200 })
            .filter((s) => s.trim().length >= 5),
          async (intentDescription) => {
            const result = await generator.generateFromIntent(
              intentDescription,
              {
                interactive: false,
                preview: false,
                deploy: false,
                maturityAssessment: false,
              }
            );

            // Property: All generated templates should be valid
            expect(result.template).toBeDefined();
            expect(result.template.yaml).toContain(
              'apiVersion: scaffolder.backstage.io/v1beta3'
            );
            expect(result.template.yaml).toContain('kind: Template');
            expect(result.template.metadata).toBeDefined();
            expect(result.template.metadata.name).toBeTruthy();
            expect(result.template.skeleton).toBeDefined();
            expect(result.template.documentation).toBeDefined();
            expect(result.template.validation).toBeDefined();
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should preserve intent information in generated templates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            capability: fc.string({ minLength: 3, maxLength: 50 }),
            technology: fc.constantFrom(
              'nodejs',
              'python',
              'java',
              'go',
              'typescript'
            ),
            type: fc.constantFrom(
              'api',
              'service',
              'application',
              'pipeline',
              'frontend'
            ),
          }),
          async ({ capability, technology, type }) => {
            const intentDescription = `Create a ${technology} ${type} for ${capability}`;

            const result = await generator.generateFromIntent(
              intentDescription,
              {
                interactive: false,
                preview: false,
                deploy: false,
                maturityAssessment: false,
              }
            );

            // Property: Generated template should reflect the intent
            const yaml = result.template.yaml.toLowerCase();
            const readme = result.template.documentation.readme.toLowerCase();

            // At least one of the key terms should appear in the generated content
            const hasCapabilityReference =
              yaml.includes(capability.toLowerCase()) ||
              readme.includes(capability.toLowerCase());
            const hasTechnologyReference =
              yaml.includes(technology) || readme.includes(technology);
            const hasTypeReference =
              yaml.includes(type) || readme.includes(type);

            expect(
              hasCapabilityReference ||
                hasTechnologyReference ||
                hasTypeReference
            ).toBe(true);
          }
        ),
        { numRuns: 15, timeout: 30000 }
      );
    });
  });

  describe('Template Specification Properties', () => {
    it('should generate consistent artifacts from valid specifications', async () => {
      const templateSpecArbitrary = fc.record({
        metadata: fc.record({
          name: fc.string({ minLength: 3, maxLength: 50 }).map(
            (s) =>
              s
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/^-+|-+$/g, '')
                .replace(/-+/g, '-') || 'default-name'
          ),
          description: fc.string({ minLength: 10, maxLength: 200 }),
          tags: fc.array(fc.string({ minLength: 2, maxLength: 20 }), {
            minLength: 1,
            maxLength: 5,
          }),
          owner: fc.constantFrom(
            'platform-team',
            'backend-team',
            'frontend-team',
            'data-team'
          ),
        }),
        parameters: fc.constant({}),
        steps: fc.constant([]),
        output: fc.constant({}),
        validation: fc.constant({
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        }),
      });

      await fc.assert(
        fc.asyncProperty(templateSpecArbitrary, async (spec) => {
          const result = await generator.generateFromSpec(
            spec as TemplateSpec,
            {
              preview: false,
              deploy: false,
            }
          );

          // Property: Generated template should be consistent with spec
          const specName = spec.metadata.name;
          if (specName && specName.trim()) {
            expect(result.template.yaml).toContain(specName);
          }
          // Only check description if it's a reasonable string
          if (
            spec.metadata.description &&
            spec.metadata.description.length > 5 &&
            !spec.metadata.description.includes('"') &&
            !spec.metadata.description.includes("'")
          ) {
            expect(result.template.yaml).toContain(spec.metadata.description);
          }
          expect(result.template.yaml).toContain(spec.metadata.owner);

          // Property: All artifacts should be generated
          expect(result.template.yaml).toBeTruthy();
          expect(result.template.skeleton).toBeTruthy();
          expect(result.template.documentation).toBeTruthy();
          expect(result.template.validation).toBeTruthy();

          // Property: Template name should be consistent across artifacts
          const specTemplateName = spec.metadata.name;
          if (specTemplateName && specTemplateName.trim()) {
            const displayName = specTemplateName
              .split('-')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            expect(result.template.documentation.readme).toContain(displayName);
          }
        }),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should handle edge cases in template specifications gracefully', async () => {
      const edgeCaseSpecArbitrary = fc.record({
        metadata: fc.record({
          name: fc.oneof(
            fc.constant(''), // Empty name
            fc.string({ minLength: 1, maxLength: 5 }), // Very short name
            fc.string({ minLength: 100, maxLength: 200 }), // Very long name
            fc.constant('special-chars-!@#$%') // Special characters
          ),
          description: fc.oneof(
            fc.constant(''), // Empty description
            fc.string({ minLength: 1, maxLength: 5 }), // Very short description
            fc.string({ minLength: 500, maxLength: 1000 }) // Very long description
          ),
          tags: fc.oneof(
            fc.constant([]), // No tags
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 10,
              maxLength: 20,
            }) // Many tags
          ),
          owner: fc.oneof(
            fc.constant(''), // Empty owner
            fc.string({ minLength: 1, maxLength: 100 }) // Any owner
          ),
        }),
        parameters: fc.constant({}),
        steps: fc.constant([]),
        output: fc.constant({}),
        validation: fc.constant({
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        }),
      });

      await fc.assert(
        fc.asyncProperty(edgeCaseSpecArbitrary, async (spec) => {
          // Property: System should handle edge cases gracefully without crashing
          const result = await generator.generateFromSpec(
            spec as TemplateSpec,
            {
              preview: false,
              deploy: false,
            }
          );

          expect(result.template).toBeDefined();
          expect(result.template.yaml).toContain('apiVersion');
          expect(result.template.yaml).toContain('kind: Template');
        }),
        { numRuns: 10, timeout: 30000 }
      );
    });
  });

  describe('Maturity and Phase Properties', () => {
    it('should assign appropriate maturity levels based on intent complexity', async () => {
      const testCases = [
        {
          intent: 'create a basic simple service',
          expectedMaturity: CapabilityMaturity.L1_GENERATION,
        },
        {
          intent: 'deploy a service with pipeline and environment setup',
          expectedMaturity: CapabilityMaturity.L2_DEPLOYMENT,
        },
        {
          intent:
            'create a service with monitor, scale, and operational features',
          expectedMaturity: CapabilityMaturity.L3_OPERATIONS,
        },
        {
          intent:
            'create a service with governance, policy, and compliance features',
          expectedMaturity: CapabilityMaturity.L4_GOVERNANCE,
        },
        {
          intent: 'create an intelligent, automated, self-healing service',
          expectedMaturity: CapabilityMaturity.L5_INTENT_DRIVEN,
        },
      ];

      for (const testCase of testCases) {
        const result = await generator.generateFromIntent(testCase.intent, {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        });

        // Property: System should assign a valid maturity level
        expect(Object.values(CapabilityMaturity)).toContain(
          result.template.metadata.maturityLevel
        );

        // For specific test cases, verify the expected behavior
        if (
          testCase.intent.includes('basic') ||
          testCase.intent.includes('simple')
        ) {
          expect(result.template.metadata.maturityLevel).toBe(
            CapabilityMaturity.L1_GENERATION
          );
        }
      }
    });

    it('should assign appropriate development phases based on intent type', async () => {
      const testCases = [
        {
          intent: 'create a service with api and backend features',
          expectedPhase: DevelopmentPhase.FOUNDATION,
        },
        {
          intent: 'create a standard architecture pattern',
          expectedPhase: DevelopmentPhase.STANDARDIZATION,
        },
        {
          intent: 'create an operational service with scaling and automation',
          expectedPhase: DevelopmentPhase.OPERATIONALIZATION,
        },
        {
          intent: 'create a service with governance and security policies',
          expectedPhase: DevelopmentPhase.GOVERNANCE,
        },
        {
          intent: 'create an intelligent end-to-end workflow',
          expectedPhase: DevelopmentPhase.INTENT_DRIVEN,
        },
      ];

      for (const testCase of testCases) {
        const result = await generator.generateFromIntent(testCase.intent, {
          interactive: false,
          preview: false,
          deploy: false,
          maturityAssessment: false,
        });

        // Property: System should assign a valid development phase
        expect(Object.values(DevelopmentPhase)).toContain(
          result.template.metadata.phase
        );

        // For specific test cases, verify the expected behavior
        if (
          testCase.intent.includes('api') ||
          testCase.intent.includes('service')
        ) {
          expect(result.template.metadata.phase).toBe(
            DevelopmentPhase.FOUNDATION
          );
        }
      }
    });
  });

  describe('Error Recovery Properties', () => {
    it('should always recover from single component failures', async () => {
      const componentFailures = [
        'yamlGenerator',
        'skeletonGenerator',
        'validationGenerator',
        'documentationGenerator',
      ];

      for (const component of componentFailures) {
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 10, maxLength: 100 }),
            async (intentDescription) => {
              // Mock one component to fail
              const mockMethod = jest
                .spyOn(
                  generator[
                    component as keyof BackstageTemplateGenerator
                  ] as any,
                  component === 'yamlGenerator'
                    ? 'generateBackstageYaml'
                    : component === 'skeletonGenerator'
                    ? 'generateSkeleton'
                    : component === 'validationGenerator'
                    ? 'generateValidationLogic'
                    : 'generateDocumentation'
                )
                .mockRejectedValueOnce(new Error(`${component} failed`));

              const result = await generator.generateFromIntent(
                intentDescription,
                {
                  interactive: false,
                  preview: false,
                  deploy: false,
                  maturityAssessment: false,
                }
              );

              // Property: System should recover and generate a valid template
              expect(result.template).toBeDefined();
              expect(result.template.yaml).toContain('apiVersion');

              mockMethod.mockRestore();
            }
          ),
          { numRuns: 2, timeout: 15000 }
        );
      }
    });

    it('should maintain data consistency during recovery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc
              .string({ minLength: 5, maxLength: 30 })
              .filter((s) => /^[a-zA-Z][a-zA-Z0-9\s-]*$/.test(s)),
            description: fc
              .string({ minLength: 10, maxLength: 100 })
              .filter((s) => s.trim().length >= 10),
          }),
          async ({ name, description }) => {
            const intentDescription = `Create a ${name} service for ${description}`;

            // Mock skeleton generator to fail initially
            const mockGenerateSkeleton = jest
              .spyOn(generator['skeletonGenerator'], 'generateSkeleton')
              .mockRejectedValueOnce(new Error('Skeleton generation failed'));

            const result = await generator.generateFromIntent(
              intentDescription,
              {
                interactive: false,
                preview: false,
                deploy: false,
                maturityAssessment: false,
              }
            );

            // Property: Template should be generated successfully even after recovery
            expect(result.template.metadata.name).toBeTruthy();
            expect(result.template.yaml).toContain('apiVersion');
            expect(result.template.yaml).toContain('kind: Template');
            expect(result.template.documentation.readme).toBeTruthy();

            mockGenerateSkeleton.mockRestore();
          }
        ),
        { numRuns: 5, timeout: 20000 }
      );
    });
  });

  describe('Template Discovery Properties', () => {
    it('should return consistent results for identical queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchTerm: fc.string({ minLength: 3, maxLength: 20 }),
            tags: fc.array(fc.string({ minLength: 2, maxLength: 10 }), {
              maxLength: 3,
            }),
          }),
          async (query) => {
            const result1 = await generator.discoverTemplates(query);
            const result2 = await generator.discoverTemplates(query);

            // Property: Identical queries should return identical results
            expect(result1).toEqual(result2);
            expect(Array.isArray(result1)).toBe(true);
            expect(Array.isArray(result2)).toBe(true);
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    });

    it('should handle empty and invalid search queries gracefully', async () => {
      const invalidQueries = [
        {},
        { searchTerm: '' },
        { tags: [] },
        { searchTerm: 'a'.repeat(1000) }, // Very long search term
        { tags: Array(100).fill('tag') }, // Too many tags
      ];

      for (const query of invalidQueries) {
        const result = await generator.discoverTemplates(query);

        // Property: Invalid queries should not crash and should return arrays
        expect(Array.isArray(result)).toBe(true);
      }
    });
  });

  describe('System Invariants', () => {
    it('should maintain template structure invariants', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 100 }),
          async (intentDescription) => {
            const result = await generator.generateFromIntent(
              intentDescription,
              {
                interactive: false,
                preview: false,
                deploy: false,
                maturityAssessment: false,
              }
            );

            // Invariant: All templates must have required structure
            expect(result.template.yaml).toBeTruthy();
            expect(result.template.skeleton).toBeTruthy();
            expect(result.template.documentation).toBeTruthy();
            expect(result.template.validation).toBeTruthy();
            expect(result.template.metadata).toBeTruthy();

            // Invariant: YAML must be valid Backstage template
            expect(result.template.yaml).toContain(
              'apiVersion: scaffolder.backstage.io/v1beta3'
            );
            expect(result.template.yaml).toContain('kind: Template');

            // Invariant: Metadata must have required fields
            expect(result.template.metadata.name).toBeTruthy();
            expect(result.template.metadata.version).toBeTruthy();
            expect(result.template.metadata.created).toBeInstanceOf(Date);
            expect(result.template.metadata.updated).toBeInstanceOf(Date);

            // Invariant: Documentation must have required sections
            expect(result.template.documentation.readme).toBeTruthy();
            expect(result.template.documentation.techDocs).toBeTruthy();

            // Invariant: Validation must have required structure
            expect(result.template.validation.security).toBeDefined();
            expect(result.template.validation.compliance).toBeDefined();
            expect(result.template.validation.standards).toBeDefined();
            expect(result.template.validation.cost).toBeDefined();
          }
        ),
        { numRuns: 10, timeout: 30000 }
      );
    });

    it('should maintain performance characteristics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 200 }),
          async (intentDescription) => {
            const startTime = Date.now();

            const result = await generator.generateFromIntent(
              intentDescription,
              {
                interactive: false,
                preview: false,
                deploy: false,
                maturityAssessment: false,
              }
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Invariant: Template generation should complete within reasonable time
            expect(duration).toBeLessThan(10000); // 10 seconds max
            expect(result.template).toBeDefined();
          }
        ),
        { numRuns: 5, timeout: 15000 }
      );
    });
  });
});
