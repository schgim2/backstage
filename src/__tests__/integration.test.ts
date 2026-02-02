/**
 * Integration tests for core template generation functionality
 */

import { NaturalLanguageIntentParser } from '../implementations/intent-parser';
import { InteractiveSpecificationCompletion } from '../implementations/interactive-completion';
import { BackstageYamlGenerator } from '../implementations/backstage-yaml-generator';
import { SkeletonRepositoryGenerator } from '../implementations/skeleton-generator';
import { ValidationLogicGenerator } from '../implementations/validation-generator';
import { DocumentationGenerator } from '../implementations/documentation-generator';
import {
  TemplateSpec,
  ParsedIntent,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('Core Generation Functionality Integration', () => {
  let intentParser: NaturalLanguageIntentParser;
  let interactiveCompletion: InteractiveSpecificationCompletion;
  let yamlGenerator: BackstageYamlGenerator;
  let skeletonGenerator: SkeletonRepositoryGenerator;
  let validationGenerator: ValidationLogicGenerator;
  let documentationGenerator: DocumentationGenerator;

  beforeEach(() => {
    intentParser = new NaturalLanguageIntentParser();
    interactiveCompletion = new InteractiveSpecificationCompletion();
    yamlGenerator = new BackstageYamlGenerator();
    skeletonGenerator = new SkeletonRepositoryGenerator();
    validationGenerator = new ValidationLogicGenerator();
    documentationGenerator = new DocumentationGenerator();
  });

  describe('End-to-End Template Generation', () => {
    it('should generate complete template from intent to artifacts', async () => {
      // Step 1: Parse intent
      const intent = await intentParser.parseIntent(
        'Create a REST API service for user management with authentication and database integration'
      );

      expect(intent).toBeDefined();
      expect(intent.capability).toBeDefined();
      expect(intent.requirements.length).toBeGreaterThan(0);

      // Step 2: Create template specification
      const templateSpec: TemplateSpec = {
        metadata: {
          name: 'user-management-api',
          description:
            'REST API service for user management with authentication and database integration',
          tags: ['api', 'rest', 'authentication', 'database'],
          owner: 'backend-team',
        },
        parameters: {
          name: { type: 'string', description: 'Service name' },
          description: { type: 'string', description: 'Service description' },
          owner: { type: 'string', description: 'Team owner' },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: { url: './skeleton' },
          },
          {
            id: 'publish',
            name: 'Publish to GitHub',
            action: 'publish:github',
            input: { repoUrl: '${{ parameters.repoUrl }}' },
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

      // Step 3: Generate Backstage YAML
      const yaml = await yamlGenerator.generateBackstageYaml(templateSpec);
      expect(yaml).toContain('apiVersion: scaffolder.backstage.io/v1beta3');
      expect(yaml).toContain('kind: Template');
      expect(yaml).toContain('user-management-api');
      expect(yaml).toContain('fetch:template');
      expect(yaml).toContain('publish:github');

      // Step 4: Generate skeleton repository
      const skeleton = await skeletonGenerator.generateSkeleton(templateSpec);
      expect(skeleton.files).toBeDefined();
      expect(skeleton.directories).toBeDefined();
      expect(Object.keys(skeleton.files).length).toBeGreaterThan(0);
      expect(skeleton.directories.length).toBeGreaterThan(0);

      // Step 5: Generate validation logic
      const validation = await validationGenerator.generateValidationLogic(
        templateSpec
      );
      expect(validation.security.length).toBeGreaterThan(0);
      expect(validation.standards.length).toBeGreaterThan(0);
      expect(
        validation.security.some(
          (rule) =>
            rule.rule.includes('authentication') || rule.rule.includes('API')
        )
      ).toBe(true);

      // Step 6: Generate documentation
      const documentation = await documentationGenerator.generateDocumentation(
        templateSpec
      );
      expect(documentation.readme).toContain('User Management Api');
      expect(documentation.readme).toContain('REST API');
      expect(documentation.techDocs).toContain('Technical Documentation');
      expect(documentation.apiDocs).toBeDefined();
      expect(documentation.usageExamples.length).toBeGreaterThan(0);

      // Verify all components work together
      expect(yaml).toBeTruthy();
      expect(skeleton).toBeTruthy();
      expect(validation).toBeTruthy();
      expect(documentation).toBeTruthy();
    });

    it('should handle data pipeline template generation', async () => {
      // Step 1: Parse intent for data pipeline
      const intent = await intentParser.parseIntent(
        'Create an ETL data pipeline for processing sales data with monitoring and error handling'
      );

      expect(intent.capability).toBeDefined();
      expect(intent.requirements.length).toBeGreaterThan(0);

      // Step 2: Create data pipeline template spec
      const templateSpec: TemplateSpec = {
        metadata: {
          name: 'sales-data-pipeline',
          description:
            'ETL pipeline for processing sales data with monitoring and error handling',
          tags: ['data', 'pipeline', 'etl', 'monitoring'],
          owner: 'data-team',
        },
        parameters: {
          name: { type: 'string', description: 'Pipeline name' },
          schedule: { type: 'string', description: 'Cron schedule' },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: { url: './skeleton' },
          },
        ],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      // Step 3: Generate all artifacts
      const yaml = await yamlGenerator.generateBackstageYaml(templateSpec);
      const skeleton = await skeletonGenerator.generateSkeleton(templateSpec);
      const validation = await validationGenerator.generateValidationLogic(
        templateSpec
      );
      const documentation = await documentationGenerator.generateDocumentation(
        templateSpec
      );

      // Verify data-specific features
      expect(yaml).toContain('sales-data-pipeline');
      expect(Object.keys(skeleton.files).length).toBeGreaterThan(0);
      expect(documentation.readme).toContain('Sales Data Pipeline');
      expect(documentation.readme).toContain('Python 3.9+ and pip');
      expect(
        documentation.usageExamples.some((example) =>
          example.includes('Data Pipeline Example')
        )
      ).toBe(true);
    });

    it('should handle containerized application template generation', async () => {
      // Step 1: Parse intent for containerized app
      const intent = await intentParser.parseIntent(
        'Create a containerized web application with Docker and Kubernetes deployment'
      );

      expect(intent.capability).toBeDefined();
      expect(intent.description).toBeDefined();

      // Step 2: Create containerized app template spec
      const templateSpec: TemplateSpec = {
        metadata: {
          name: 'containerized-web-app',
          description:
            'Containerized web application with Docker and Kubernetes deployment',
          tags: ['docker', 'kubernetes', 'web', 'container'],
          owner: 'devops-team',
        },
        parameters: {
          name: { type: 'string', description: 'App name' },
          replicas: { type: 'number', description: 'Number of replicas' },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: { url: './skeleton' },
          },
        ],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      // Step 3: Generate all artifacts
      const yaml = await yamlGenerator.generateBackstageYaml(templateSpec);
      const skeleton = await skeletonGenerator.generateSkeleton(templateSpec);
      const validation = await validationGenerator.generateValidationLogic(
        templateSpec
      );
      const documentation = await documentationGenerator.generateDocumentation(
        templateSpec
      );

      // Verify container-specific features
      expect(yaml).toContain('containerized-web-app');
      expect(Object.keys(skeleton.files).length).toBeGreaterThan(0);
      expect(
        validation.security.some((rule) =>
          rule.rule.includes('Container images')
        )
      ).toBe(true);
      expect(documentation.readme).toContain('🐳 **Containerization**');
      expect(documentation.readme).toContain('Docker and Docker Compose');
    });
  });

  describe('Component Integration', () => {
    it('should maintain consistency across all generated artifacts', async () => {
      const templateSpec: TemplateSpec = {
        metadata: {
          name: 'test-service',
          description: 'Test service for integration',
          tags: ['service', 'test'],
          owner: 'test-team',
        },
        parameters: {
          name: { type: 'string', description: 'Service name' },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: { url: './skeleton' },
          },
        ],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      // Generate all artifacts
      const yaml = await yamlGenerator.generateBackstageYaml(templateSpec);
      const skeleton = await skeletonGenerator.generateSkeleton(templateSpec);
      const validation = await validationGenerator.generateValidationLogic(
        templateSpec
      );
      const documentation = await documentationGenerator.generateDocumentation(
        templateSpec
      );

      // Verify consistency
      const templateName = 'test-service';

      // Name consistency
      expect(yaml).toContain(templateName);
      expect(documentation.readme).toContain('Test Service');
      expect(documentation.techDocs).toContain('Test Service');

      // Description consistency
      expect(yaml).toContain('Test service for integration');
      expect(documentation.readme).toContain('Test service for integration');

      // Owner consistency
      expect(yaml).toContain('test-team');
      expect(documentation.readme).toContain('test-team');

      // All artifacts should be generated
      expect(yaml).toBeTruthy();
      expect(skeleton).toBeTruthy();
      expect(validation).toBeTruthy();
      expect(documentation).toBeTruthy();
    });

    it('should handle interactive completion workflow', async () => {
      // Start with incomplete intent
      const incompleteIntent: ParsedIntent = {
        capability: 'web service',
        description: 'A web service',
        requirements: ['web'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      // Generate clarifying questions
      const questions =
        await interactiveCompletion.generatePrioritizedQuestions(
          incompleteIntent
        );
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].question).toBeDefined();

      // Simulate user providing more details
      const refinedIntent =
        await interactiveCompletion.refineSpecificationInteractively(
          incompleteIntent,
          {
            functionality:
              'REST API with database integration and authentication',
            technologies: 'Node.js, TypeScript, PostgreSQL',
          }
        );

      expect(refinedIntent.requirements.length).toBeGreaterThanOrEqual(
        incompleteIntent.requirements.length
      );
      expect(refinedIntent.description.length).toBeGreaterThanOrEqual(
        incompleteIntent.description.length
      );

      // Verify the refined intent can be used for template generation
      const templateSpec: TemplateSpec = {
        metadata: {
          name: 'refined-web-service',
          description: refinedIntent.description,
          tags: ['api', 'database', 'authentication'],
          owner: 'team',
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

      const yaml = await yamlGenerator.generateBackstageYaml(templateSpec);
      expect(yaml).toContain('refined-web-service');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid template specifications gracefully', async () => {
      const invalidSpec: TemplateSpec = {
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
      };

      // The YAML generator currently handles empty names by generating a template
      // In a real implementation, this might throw an error
      const yaml = await yamlGenerator.generateBackstageYaml(invalidSpec);
      expect(yaml).toContain('apiVersion: scaffolder.backstage.io/v1beta3');

      // Other generators should handle invalid specs gracefully
      const skeleton = await skeletonGenerator.generateSkeleton(invalidSpec);
      expect(skeleton).toBeDefined();

      const validation = await validationGenerator.generateValidationLogic(
        invalidSpec
      );
      expect(validation).toBeDefined();

      const documentation = await documentationGenerator.generateDocumentation(
        invalidSpec
      );
      expect(documentation).toBeDefined();
    });

    it('should validate generated artifacts', async () => {
      const validSpec: TemplateSpec = {
        metadata: {
          name: 'valid-service',
          description: 'A valid service',
          tags: ['service'],
          owner: 'team',
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

      // All generators should succeed with valid spec
      const yaml = await yamlGenerator.generateBackstageYaml(validSpec);
      const skeleton = await skeletonGenerator.generateSkeleton(validSpec);
      const validation = await validationGenerator.generateValidationLogic(
        validSpec
      );
      const documentation = await documentationGenerator.generateDocumentation(
        validSpec
      );

      expect(yaml).toBeTruthy();
      expect(skeleton).toBeTruthy();
      expect(validation).toBeTruthy();
      expect(documentation).toBeTruthy();
    });
  });
});
