/**
 * Tests for DocumentationGenerator
 */

import { DocumentationGenerator } from '../implementations/documentation-generator';
import {
  TemplateSpec,
  Documentation,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('DocumentationGenerator', () => {
  let generator: DocumentationGenerator;

  beforeEach(() => {
    generator = new DocumentationGenerator();
  });

  describe('generateDocumentation', () => {
    it('should generate comprehensive documentation for basic template', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'basic-library',
          description: 'A basic library template',
          tags: ['library', 'utils'],
          owner: 'platform-team',
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

      const docs = await generator.generateDocumentation(spec);

      expect(docs).toBeDefined();
      expect(docs.readme).toContain('Basic Library');
      expect(docs.readme).toContain('A basic library template');
      expect(docs.readme).toContain('platform-team');
      expect(docs.techDocs).toContain('Technical Documentation');
      expect(docs.usageExamples).toHaveLength(1);
      expect(docs.apiDocs).toBeUndefined(); // Not an API template
    });

    it('should generate API-specific documentation for API templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'user-api',
          description: 'REST API for user management',
          tags: ['api', 'rest', 'backend'],
          owner: 'api-team',
        },
        parameters: {},
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: {},
          },
          {
            id: 'publish',
            name: 'Publish to GitHub',
            action: 'publish:github',
            input: {},
          },
        ],
        output: {},
        validation: {
          security: [
            {
              type: 'baseline',
              rule: 'API endpoints must implement authentication',
              enforcement: 'block',
            },
          ],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('User Api');
      expect(docs.readme).toContain('REST API for user management');
      expect(docs.readme).toContain('🌐 **REST API**');
      expect(docs.readme).toContain(
        'API endpoints must implement authentication'
      );
      expect(docs.techDocs).toContain('API Reference');
      expect(docs.apiDocs).toBeDefined();
      expect(docs.apiDocs).toContain('API Documentation');
      expect(docs.apiDocs).toContain('Authentication');
      expect(docs.usageExamples).toHaveLength(2); // Basic + API example
    });

    it('should generate data-specific documentation for data templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'data-pipeline',
          description: 'ETL pipeline for data processing',
          tags: ['data', 'pipeline', 'etl'],
          owner: 'data-team',
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

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Data Pipeline');
      expect(docs.readme).toContain('📊 **Data Processing**');
      expect(docs.readme).toContain('Python 3.9+ and pip');
      expect(docs.usageExamples).toHaveLength(2); // Basic + Data example
      expect(docs.usageExamples[1]).toContain('Data Pipeline Example');
      expect(docs.usageExamples[1]).toContain('ETL pipeline');
    });

    it('should generate container-specific documentation for container templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'containerized-app',
          description: 'Containerized web application',
          tags: ['docker', 'container', 'kubernetes'],
          owner: 'devops-team',
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

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Containerized App');
      expect(docs.readme).toContain('🐳 **Containerization**');
      expect(docs.readme).toContain('Docker and Docker Compose');
      expect(docs.readme).toContain('kubectl configured');
      expect(docs.usageExamples).toHaveLength(2); // Basic + Container example
      expect(docs.usageExamples[1]).toContain(
        'Containerized Application Example'
      );
      expect(docs.usageExamples[1]).toContain('Kubernetes deployment');
    });

    it('should generate cloud-specific documentation for cloud templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'aws-lambda',
          description: 'Serverless function on AWS Lambda',
          tags: ['aws', 'lambda', 'serverless'],
          owner: 'cloud-team',
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

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Aws Lambda');
      expect(docs.readme).toContain('☁️ **Cloud Native**');
      expect(docs.readme).toContain('AWS account and CLI configured');
      expect(docs.usageExamples).toHaveLength(2); // Basic + Cloud example
      expect(docs.usageExamples[1]).toContain(
        'Cloud-Native Application Example'
      );
      expect(docs.usageExamples[1]).toContain('AWS Lambda functions');
    });

    it('should generate governance documentation for high maturity templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'enterprise-service',
          description: 'Enterprise-grade service with governance',
          tags: ['l4', 'governance', 'enterprise'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [
            {
              type: 'governance',
              rule: 'High maturity templates must undergo security review',
              enforcement: 'block',
            },
          ],
          standards: [],
          cost: [],
        },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Enterprise Service');
      expect(docs.readme).toContain(
        'High maturity templates must undergo security review'
      );
      expect(docs.usageExamples.length).toBeGreaterThanOrEqual(2); // Basic + Advanced example (may include API example too)
      expect(
        docs.usageExamples.some((example) =>
          example.includes('Advanced Governance Example')
        )
      ).toBe(true);
      expect(
        docs.usageExamples.some((example) => example.includes('L4_GOVERNANCE'))
      ).toBe(true);
    });

    it('should generate language-specific prerequisites', async () => {
      const typescriptSpec: TemplateSpec = {
        metadata: {
          name: 'ts-service',
          description: 'TypeScript service',
          tags: ['typescript', 'service'],
          owner: 'frontend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(typescriptSpec);

      expect(docs.readme).toContain('Node.js 18+ and npm/yarn');

      const pythonSpec: TemplateSpec = {
        metadata: {
          name: 'py-service',
          description: 'Python service',
          tags: ['python', 'service'],
          owner: 'backend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const pythonDocs = await generator.generateDocumentation(pythonSpec);

      expect(pythonDocs.readme).toContain('Python 3.9+ and pip');
    });

    it('should generate proper template steps documentation', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'full-template',
          description: 'Template with multiple steps',
          tags: ['service'],
          owner: 'team',
        },
        parameters: {},
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template Files',
            action: 'fetch:template',
            input: {},
          },
          {
            id: 'publish',
            name: 'Create Repository',
            action: 'publish:github',
            input: {},
          },
          {
            id: 'register',
            name: 'Register Component',
            action: 'register:catalog',
            input: {},
          },
        ],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Template Steps');
      expect(docs.readme).toContain('1. **Fetch Template Files**');
      expect(docs.readme).toContain('2. **Create Repository**');
      expect(docs.readme).toContain('3. **Register Component**');
      expect(docs.readme).toContain(
        'Fetch the template files from the repository'
      );
    });

    it('should generate validation rules documentation', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'secure-template',
          description: 'Template with validation rules',
          tags: ['service'],
          owner: 'team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [
            {
              type: 'baseline',
              rule: 'Must use HTTPS',
              enforcement: 'block',
            },
            {
              type: 'access',
              rule: 'Must implement authentication',
              enforcement: 'warn',
            },
          ],
          compliance: [],
          standards: [
            {
              type: 'code_quality',
              rule: 'Code coverage must be above 80%',
              enforcement: 'warn',
            },
          ],
          cost: [],
        },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('Validation Rules');
      expect(docs.readme).toContain('Security Rules');
      expect(docs.readme).toContain('Code Standards');
      expect(docs.readme).toContain('🚫 Must use HTTPS');
      expect(docs.readme).toContain('⚠️ Must implement authentication');
      expect(docs.readme).toContain('⚠️ Code coverage must be above 80%');
    });
  });

  describe('TechDocs generation', () => {
    it('should generate comprehensive technical documentation', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'api-service',
          description: 'REST API service',
          tags: ['api', 'service'],
          owner: 'api-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.techDocs).toContain('Technical Documentation');
      expect(docs.techDocs).toContain('Architecture');
      expect(docs.techDocs).toContain('Implementation Details');
      expect(docs.techDocs).toContain('Security Considerations');
      expect(docs.techDocs).toContain('Performance Guidelines');
      expect(docs.techDocs).toContain('Monitoring and Observability');
      expect(docs.techDocs).toContain('API Reference');
      expect(docs.techDocs).toContain('Configuration Reference');
      expect(docs.techDocs).toContain('Troubleshooting Guide');
    });

    it('should include timestamp in TechDocs', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-template',
          description: 'Test template',
          tags: ['test'],
          owner: 'test-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.techDocs).toMatch(
        /Last updated: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      );
      expect(docs.techDocs).toContain(
        'Generated by Backstage Template Generator'
      );
    });
  });

  describe('API documentation generation', () => {
    it('should generate API docs only for API templates', async () => {
      const apiSpec: TemplateSpec = {
        metadata: {
          name: 'user-api',
          description: 'User management API',
          tags: ['api', 'rest'],
          owner: 'api-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(apiSpec);

      expect(docs.apiDocs).toBeDefined();
      expect(docs.apiDocs).toContain('API Documentation');
      expect(docs.apiDocs).toContain('Endpoints');
      expect(docs.apiDocs).toContain('Authentication');
      expect(docs.apiDocs).toContain('OpenAPI Specification');

      const nonApiSpec: TemplateSpec = {
        metadata: {
          name: 'library',
          description: 'Utility library',
          tags: ['library', 'utils'],
          owner: 'lib-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const nonApiDocs = await generator.generateDocumentation(nonApiSpec);

      expect(nonApiDocs.apiDocs).toBeUndefined();
    });

    it('should generate comprehensive API documentation sections', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'rest-api',
          description: 'REST API service',
          tags: ['api', 'rest', 'backend'],
          owner: 'backend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.apiDocs).toContain('API Overview');
      expect(docs.apiDocs).toContain('Endpoints');
      expect(docs.apiDocs).toContain('Authentication');
      expect(docs.apiDocs).toContain('Request/Response Format');
      expect(docs.apiDocs).toContain('Error Handling');
      expect(docs.apiDocs).toContain('Rate Limiting');
      expect(docs.apiDocs).toContain('OpenAPI Specification');
      expect(docs.apiDocs).toContain('SDK and Client Libraries');
      expect(docs.apiDocs).toContain('Testing');
    });
  });

  describe('Usage examples generation', () => {
    it('should generate basic usage example for all templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'simple-app',
          description: 'Simple application',
          tags: ['app'],
          owner: 'dev-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.usageExamples).toHaveLength(1);
      expect(docs.usageExamples[0]).toContain('Basic Usage Example');
      expect(docs.usageExamples[0]).toContain('simple-app');
      expect(docs.usageExamples[0]).toContain('Template parameters');
    });

    it('should generate multiple examples for complex templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'full-stack-app',
          description: 'Full-stack application with API and frontend',
          tags: ['api', 'frontend', 'docker', 'aws'],
          owner: 'full-stack-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.usageExamples.length).toBeGreaterThan(1);
      expect(
        docs.usageExamples.some((example) =>
          example.includes('API Service Example')
        )
      ).toBe(true);
      expect(
        docs.usageExamples.some((example) =>
          example.includes('Containerized Application Example')
        )
      ).toBe(true);
      expect(
        docs.usageExamples.some((example) =>
          example.includes('Cloud-Native Application Example')
        )
      ).toBe(true);
    });

    it('should generate advanced examples for high maturity templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'enterprise-app',
          description: 'Enterprise application',
          tags: ['l5', 'intent-driven', 'governance'],
          owner: 'enterprise-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(
        docs.usageExamples.some((example) =>
          example.includes('Advanced Governance Example')
        )
      ).toBe(true);
      expect(
        docs.usageExamples.some((example) => example.includes('L4_GOVERNANCE'))
      ).toBe(true);
    });
  });

  describe('Template type detection', () => {
    it('should correctly detect API templates', async () => {
      const apiByTag: TemplateSpec = {
        metadata: {
          name: 'api-service',
          description: 'Service',
          tags: ['api'],
          owner: 'team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs1 = await generator.generateDocumentation(apiByTag);
      expect(docs1.apiDocs).toBeDefined();

      const apiByDescription: TemplateSpec = {
        metadata: {
          name: 'user-service',
          description: 'REST API for user management',
          tags: ['backend'],
          owner: 'team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs2 = await generator.generateDocumentation(apiByDescription);
      expect(docs2.apiDocs).toBeDefined();
    });

    it('should correctly detect frontend templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'react-app',
          description: 'React frontend application',
          tags: ['frontend', 'react'],
          owner: 'frontend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('⚛️ **Modern Framework**');
      expect(docs.readme).toContain('🎨 **Design System**');
    });

    it('should correctly detect data templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'etl-pipeline',
          description: 'Data processing pipeline',
          tags: ['data', 'etl'],
          owner: 'data-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('📊 **Data Processing**');
      expect(
        docs.usageExamples.some((example) =>
          example.includes('Data Pipeline Example')
        )
      ).toBe(true);
    });
  });

  describe('Documentation formatting', () => {
    it('should format template names correctly', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'my-awesome-service-template',
          description: 'An awesome service',
          tags: ['service'],
          owner: 'team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      expect(docs.readme).toContain('# My Awesome Service Template');
      expect(docs.techDocs).toContain(
        '# My Awesome Service Template - Technical Documentation'
      );
    });

    it('should include proper markdown formatting', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-template',
          description: 'Test template',
          tags: ['test'],
          owner: 'test-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const docs = await generator.generateDocumentation(spec);

      // Check for proper markdown headers
      expect(docs.readme).toMatch(/^# /m);
      expect(docs.readme).toMatch(/^## /m);
      expect(docs.readme).toMatch(/^### /m);

      // Check for code blocks
      expect(docs.readme).toContain('```');

      // Check for lists
      expect(docs.readme).toMatch(/^- /m);
      expect(docs.readme).toMatch(/^\d+\. /m);
    });
  });
});
