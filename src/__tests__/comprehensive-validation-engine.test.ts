/**
 * Simple tests for Comprehensive Validation Engine functionality
 */

import {
  TemplateSpec,
  GeneratedTemplate,
  CapabilityMaturity,
  DevelopmentPhase,
  TemplateMetadata,
} from '../types/core';

// Simple validation engine for testing
class SimpleValidationEngine {
  async validateTemplateSpec(spec: TemplateSpec) {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic naming validation
    if (!this.isValidRepositoryName(spec.metadata.name)) {
      errors.push({
        code: 'NAMING_CONVENTION',
        message: `Repository name '${spec.metadata.name}' does not match naming conventions`,
        severity: 'error',
      });
    }

    // API authentication validation
    if (this.isApiTemplate(spec) && !this.hasAuthentication(spec)) {
      errors.push({
        code: 'MISSING_AUTHENTICATION',
        message: 'API templates must implement authentication',
        severity: 'error',
      });
    }

    // Hardcoded secrets validation
    if (this.hasHardcodedSecrets(spec)) {
      errors.push({
        code: 'HARDCODED_SECRETS',
        message: 'Templates must not contain hardcoded secrets',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async validateGeneratedTemplate(template: GeneratedTemplate) {
    const errors: any[] = [];
    const warnings: any[] = [];

    // YAML validation
    try {
      const parsed = JSON.parse(template.yaml);
      if (!parsed.apiVersion) {
        errors.push({
          code: 'MISSING_API_VERSION',
          message: 'Template YAML must include apiVersion',
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        code: 'INVALID_YAML',
        message: `Invalid YAML structure: ${error}`,
        severity: 'error',
      });
    }

    // Documentation validation
    if (!template.documentation.readme) {
      errors.push({
        code: 'MISSING_README',
        message: 'Documentation must include README',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidRepositoryName(name: string): boolean {
    const pattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
    return pattern.test(name);
  }

  private isApiTemplate(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    return tags.some((tag) => ['api', 'rest', 'service'].includes(tag));
  }

  private hasAuthentication(spec: TemplateSpec): boolean {
    return spec.steps.some((step) =>
      JSON.stringify(step.input).toLowerCase().includes('auth')
    );
  }

  private hasHardcodedSecrets(spec: TemplateSpec): boolean {
    return spec.steps.some((step) =>
      JSON.stringify(step.input).toLowerCase().includes('"secret"')
    );
  }
}

describe('Comprehensive Validation Engine', () => {
  let validationEngine: SimpleValidationEngine;

  beforeEach(() => {
    validationEngine = new SimpleValidationEngine();
  });

  describe('validateTemplateSpec', () => {
    it('should validate a compliant template spec successfully', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'my-service',
          description: 'A compliant service template',
          tags: ['typescript'],
          owner: 'platform-team',
        },
        parameters: {
          serviceName: { type: 'string' },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch template',
            action: 'fetch:template',
            input: {
              url: './skeleton',
              values: {
                serviceName: '${{ parameters.serviceName }}',
              },
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

      const result = await validationEngine.validateTemplateSpec(spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect naming convention violations', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'MyService', // Invalid: should be kebab-case
          description: 'A service template',
          tags: ['typescript'],
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

      const result = await validationEngine.validateTemplateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NAMING_CONVENTION');
    });

    it('should detect missing authentication for API templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'api-service',
          description: 'An API service template',
          tags: ['api', 'rest'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [
          {
            id: 'fetch',
            name: 'Fetch template',
            action: 'fetch:template',
            input: {
              url: './skeleton',
              // Missing authentication configuration
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

      const result = await validationEngine.validateTemplateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e: any) => e.code === 'MISSING_AUTHENTICATION')
      ).toBe(true);
    });

    it('should detect hardcoded secrets', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'my-service',
          description: 'A service template',
          tags: ['typescript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [
          {
            id: 'fetch',
            name: 'Fetch template',
            action: 'fetch:template',
            input: {
              url: './skeleton',
              values: {
                secret: 'hardcoded-secret-key', // This should be detected
              },
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

      const result = await validationEngine.validateTemplateSpec(spec);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e: any) => e.code === 'HARDCODED_SECRETS')
      ).toBe(true);
    });
  });

  describe('validateGeneratedTemplate', () => {
    it('should validate a complete generated template', async () => {
      const template: GeneratedTemplate = {
        yaml: JSON.stringify({
          apiVersion: 'scaffolder.backstage.io/v1beta3',
          kind: 'Template',
          spec: {
            type: 'service',
            parameters: {},
            steps: [],
          },
        }),
        skeleton: {
          files: {
            'README.md': '# My Service\n\nDescription of the service',
            '.gitignore': 'node_modules/\n*.log',
          },
          directories: ['src', 'tests'],
        },
        documentation: {
          readme: '# My Service\n\nA comprehensive service',
          techDocs: '# Technical Documentation',
          usageExamples: ['npm start', 'npm test'],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {
          id: 'my-service-template',
          name: 'my-service',
          version: '1.0.0',
          created: new Date(),
          updated: new Date(),
          author: 'platform-team',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
          phase: DevelopmentPhase.FOUNDATION,
        },
      };

      const result = await validationEngine.validateGeneratedTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid YAML structure', async () => {
      const template: GeneratedTemplate = {
        yaml: 'invalid-json', // Invalid JSON/YAML
        skeleton: {
          files: {},
          directories: [],
        },
        documentation: {
          readme: 'README content',
          techDocs: 'TechDocs content',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const result = await validationEngine.validateGeneratedTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.code === 'INVALID_YAML')).toBe(
        true
      );
    });

    it('should detect missing documentation', async () => {
      const template: GeneratedTemplate = {
        yaml: JSON.stringify({
          apiVersion: 'scaffolder.backstage.io/v1beta3',
          kind: 'Template',
          spec: {},
        }),
        skeleton: {
          files: {},
          directories: [],
        },
        documentation: {
          readme: '', // Empty README
          techDocs: 'TechDocs content',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const result = await validationEngine.validateGeneratedTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.code === 'MISSING_README')).toBe(
        true
      );
    });
  });
});
