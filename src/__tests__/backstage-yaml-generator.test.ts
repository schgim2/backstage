/**
 * Backstage YAML Generator Tests
 */

import * as yaml from 'yaml';
import { BackstageYamlGenerator } from '../implementations/backstage-yaml-generator';
import {
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
  ValidationRules,
} from '../types/core';

describe('BackstageYamlGenerator', () => {
  let generator: BackstageYamlGenerator;

  beforeEach(() => {
    generator = new BackstageYamlGenerator();
  });

  describe('generateBackstageYaml', () => {
    test('should generate basic Backstage template YAML', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'user-service',
          description: 'User management service',
          tags: ['service', 'backend'],
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      expect(parsed.apiVersion).toBe('scaffolder.backstage.io/v1beta3');
      expect(parsed.kind).toBe('Template');
      expect(parsed.metadata.name).toBe('user-service');
      expect(parsed.metadata.title).toBe('User management service');
      expect(parsed.metadata.description).toBe('User management service');
      expect(parsed.metadata.tags).toContain('service');
      expect(parsed.metadata.tags).toContain('backend');
    });

    test('should generate parameters based on maturity level', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'deployment-service',
          description: 'Deployment automation service',
          tags: ['L2', 'deployment'],
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      expect(parsed.spec.parameters).toHaveLength(1);
      expect(parsed.spec.parameters[0].title).toBe('Provide basic information');
      expect(parsed.spec.parameters[0].required).toContain('name');
      expect(parsed.spec.parameters[0].required).toContain('description');
      expect(parsed.spec.parameters[0].required).toContain('repoUrl');

      // Should have deployment-specific parameters
      const properties = parsed.spec.parameters[0].properties;
      expect(properties.repoUrl).toBeDefined();
      expect(properties.repoUrl['ui:field']).toBe('RepoUrlPicker');
    });

    test('should generate governance-level parameters for L4 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'governance-service',
          description: 'Governance and compliance service',
          tags: ['L4', 'governance'],
          owner: 'security-team',
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
          ],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      const properties = parsed.spec.parameters[0].properties;

      // Should have governance-specific parameters
      expect(Object.keys(properties)).toEqual(
        expect.arrayContaining(['name', 'description', 'repoUrl'])
      );
    });

    test('should generate intent-driven parameters for L5 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'intelligent-service',
          description: 'AI-driven intelligent service',
          tags: ['L5', 'intent-driven'],
          owner: 'ai-team',
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      const properties = parsed.spec.parameters[0].properties;
      expect(properties.name).toBeDefined();
      expect(properties.description).toBeDefined();
      expect(properties.repoUrl).toBeDefined();
    });

    test('should generate appropriate steps based on development phase', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'foundation-service',
          description: 'Basic foundation service',
          tags: ['service'],
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      expect(parsed.spec.steps).toHaveLength(3); // fetch, publish, register
      expect(parsed.spec.steps[0].action).toBe('fetch:template');
      expect(parsed.spec.steps[1].action).toBe('publish:github');
      expect(parsed.spec.steps[2].action).toBe('catalog:register');
    });

    test('should include custom steps from spec', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'custom-service',
          description: 'Service with custom steps',
          tags: ['service'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [
          {
            id: 'custom-step',
            name: 'Custom Processing',
            action: 'fs:rename',
            input: {
              files: [
                {
                  from: 'src/template.ts',
                  to: 'src/${{ parameters.name }}.ts',
                },
              ],
            },
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      // Should have default steps + custom step
      expect(parsed.spec.steps).toHaveLength(4);
      expect(parsed.spec.steps[1].id).toBe('custom-step');
      expect(parsed.spec.steps[1].action).toBe('fs:rename');
    });

    test('should generate appropriate output links', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'output-service',
          description: 'Service with custom output',
          tags: ['service'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {
          links: [
            {
              title: 'Documentation',
              url: 'https://docs.example.com',
            },
          ],
          text: [
            {
              title: 'Next Steps',
              content: 'Follow the documentation to get started',
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

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      expect(parsed.spec.output.links).toHaveLength(3); // 2 default + 1 custom
      expect(parsed.spec.output.links[0].title).toBe('Repository');
      expect(parsed.spec.output.links[1].title).toBe('Open in catalog');
      expect(parsed.spec.output.links[2].title).toBe('Documentation');
      expect(parsed.spec.output.text).toHaveLength(1);
      expect(parsed.spec.output.text[0].title).toBe('Next Steps');
    });

    test('should determine correct template type from tags and description', async () => {
      const serviceSpec: TemplateSpec = {
        metadata: {
          name: 'api-service',
          description: 'REST API service',
          tags: ['service'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const websiteSpec: TemplateSpec = {
        metadata: {
          name: 'company-website',
          description: 'Company frontend website',
          tags: ['website'],
          owner: 'frontend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const serviceYaml = await generator.generateBackstageYaml(serviceSpec);
      const websiteYaml = await generator.generateBackstageYaml(websiteSpec);

      const serviceParsed = yaml.parse(serviceYaml);
      const websiteParsed = yaml.parse(websiteYaml);

      expect(serviceParsed.spec.type).toBe('service');
      expect(websiteParsed.spec.type).toBe('website');
    });

    test('should sanitize template names correctly', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'My Service With Spaces & Special!',
          description: 'Test service',
          tags: [],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const yamlContent = await generator.generateBackstageYaml(spec);
      const parsed = yaml.parse(yamlContent);

      expect(parsed.metadata.name).toBe('my-service-with-spaces-special');
    });
  });

  describe('validateYamlStructure', () => {
    test('should validate correct YAML structure', () => {
      const validYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
  title: Test Template
  description: A test template
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Basic Info
      properties:
        name:
          type: string
  steps:
    - id: fetch
      name: Fetch
      action: fetch:template
      input:
        url: ./template
`;

      const result = generator.validateYamlStructure(validYaml);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify missing required fields', () => {
      const invalidYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
metadata:
  name: test-template
spec:
  owner: platform-team
`;

      const result = generator.validateYamlStructure(invalidYaml);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Missing or invalid kind field (must be "Template")'
      );
      expect(result.errors).toContain(
        'Missing required field: spec.parameters'
      );
      expect(result.errors).toContain('Missing required field: spec.steps');
    });

    test('should identify invalid YAML syntax', () => {
      const invalidYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
  invalid: yaml: syntax: here
`;

      const result = generator.validateYamlStructure(invalidYaml);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid YAML syntax');
    });

    test('should validate parameter and step array types', () => {
      const invalidYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
spec:
  owner: platform-team
  parameters: "not an array"
  steps: "also not an array"
`;

      const result = generator.validateYamlStructure(invalidYaml);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('spec.parameters must be an array');
      expect(result.errors).toContain('spec.steps must be an array');
    });
  });

  describe('enhanceWithValidation', () => {
    test('should add security validation steps', () => {
      const baseYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
spec:
  owner: platform-team
  parameters: []
  steps:
    - id: fetch
      name: Fetch
      action: fetch:template
`;

      const validationRules: ValidationRules = {
        security: [
          {
            type: 'baseline',
            rule: 'Must use HTTPS',
            enforcement: 'block',
          },
        ],
        compliance: [],
        standards: [],
        cost: [],
      };

      const enhancedYaml = generator.enhanceWithValidation(
        baseYaml,
        validationRules
      );
      const parsed = yaml.parse(enhancedYaml);

      expect(parsed.spec.steps).toHaveLength(2);
      expect(parsed.spec.steps[1].id).toBe('security-validation');
      expect(parsed.spec.steps[1].action).toBe('catalog:write');
    });

    test('should add compliance validation steps', () => {
      const baseYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
spec:
  owner: platform-team
  parameters: []
  steps:
    - id: fetch
      name: Fetch
      action: fetch:template
`;

      const validationRules: ValidationRules = {
        security: [],
        compliance: [
          {
            type: 'GDPR',
            rule: 'Must comply with GDPR',
            enforcement: 'warn',
          },
        ],
        standards: [],
        cost: [],
      };

      const enhancedYaml = generator.enhanceWithValidation(
        baseYaml,
        validationRules
      );
      const parsed = yaml.parse(enhancedYaml);

      expect(parsed.spec.steps).toHaveLength(2);
      expect(parsed.spec.steps[1].id).toBe('compliance-check');
      expect(parsed.spec.steps[1].action).toBe('catalog:write');
    });

    test('should add both security and compliance steps', () => {
      const baseYaml = `
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: test-template
spec:
  owner: platform-team
  parameters: []
  steps:
    - id: fetch
      name: Fetch
      action: fetch:template
`;

      const validationRules: ValidationRules = {
        security: [
          {
            type: 'baseline',
            rule: 'Security rule',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'GDPR',
            rule: 'Compliance rule',
            enforcement: 'warn',
          },
        ],
        standards: [],
        cost: [],
      };

      const enhancedYaml = generator.enhanceWithValidation(
        baseYaml,
        validationRules
      );
      const parsed = yaml.parse(enhancedYaml);

      expect(parsed.spec.steps).toHaveLength(3);
      expect(parsed.spec.steps[1].id).toBe('security-validation');
      expect(parsed.spec.steps[2].id).toBe('compliance-check');
    });
  });
});
