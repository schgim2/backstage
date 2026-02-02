/**
 * Tests for ValidationLogicGenerator
 */

import { ValidationLogicGenerator } from '../implementations/validation-generator';
import {
  TemplateSpec,
  ValidationRules,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('ValidationLogicGenerator', () => {
  let generator: ValidationLogicGenerator;

  beforeEach(() => {
    generator = new ValidationLogicGenerator();
  });

  describe('generateValidationLogic', () => {
    it('should generate comprehensive validation rules for basic template', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'basic-service',
          description: 'A basic service template',
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

      const rules = await generator.generateValidationLogic(spec);

      expect(rules).toBeDefined();
      expect(rules.security.length).toBeGreaterThan(0);
      expect(rules.compliance.length).toBeGreaterThan(0);
      expect(rules.standards.length).toBeGreaterThan(0);
      expect(rules.cost.length).toBeGreaterThan(0);
    });

    it('should generate API-specific security rules for API templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'api-service',
          description: 'REST API service template',
          tags: ['api', 'rest', 'backend'],
          owner: 'api-team',
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

      const rules = await generator.generateValidationLogic(spec);

      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'API endpoints must implement authentication'
      );
      expect(securityRules).toContain(
        'HTTPS must be enforced for all API endpoints'
      );
      expect(securityRules).toContain('API rate limiting must be configured');
    });

    it('should generate data processing rules for data templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'data-pipeline',
          description: 'Data processing pipeline with database access',
          tags: ['data', 'pipeline', 'database'],
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

      const rules = await generator.generateValidationLogic(spec);

      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'Data processing templates must include data classification metadata'
      );
      expect(securityRules).toContain(
        'PII handling must be documented and approved'
      );

      const complianceRules = rules.compliance.map((rule) => rule.rule);
      expect(complianceRules).toContain(
        'Data retention policies must be implemented'
      );
      expect(complianceRules).toContain(
        'Data encryption at rest must be enabled'
      );
    });

    it('should generate container-specific rules for containerized templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'containerized-app',
          description: 'Containerized application with Docker',
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

      const rules = await generator.generateValidationLogic(spec);

      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'Container images must use non-root user'
      );
      expect(securityRules).toContain(
        'Container images must be scanned for vulnerabilities'
      );
    });

    it('should generate language-specific standards for TypeScript templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'typescript-service',
          description: 'TypeScript service template',
          tags: ['typescript', 'service'],
          owner: 'frontend-team',
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

      const rules = await generator.generateValidationLogic(spec);

      const standardRules = rules.standards.map((rule) => rule.rule);
      expect(standardRules).toContain('TypeScript strict mode must be enabled');
      expect(standardRules).toContain('ESLint configuration must be included');
    });

    it('should generate language-specific standards for Python templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'python-service',
          description: 'Python service template',
          tags: ['python', 'service'],
          owner: 'backend-team',
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

      const rules = await generator.generateValidationLogic(spec);

      const standardRules = rules.standards.map((rule) => rule.rule);
      expect(standardRules).toContain(
        'Python code must follow PEP 8 style guide'
      );
      expect(standardRules).toContain(
        'Type hints must be used for all function signatures'
      );
    });

    it('should generate cloud-specific cost rules for cloud templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'aws-lambda',
          description: 'AWS Lambda function template',
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

      const rules = await generator.generateValidationLogic(spec);

      const costRules = rules.cost.map((rule) => rule.rule);
      expect(costRules).toContain('Auto-scaling policies must be configured');
      expect(costRules).toContain(
        'Resource tagging must include cost center information'
      );
      expect(costRules).toContain(
        'Unused resources must be automatically cleaned up'
      );
    });

    it('should generate governance rules for high maturity templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'governance-template',
          description: 'High maturity governance template',
          tags: ['l4', 'governance', 'policy'],
          owner: 'governance-team',
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

      const rules = await generator.generateValidationLogic(spec);

      const complianceRules = rules.compliance.map((rule) => rule.rule);
      expect(complianceRules).toContain(
        'High maturity templates must undergo security review'
      );
      expect(complianceRules).toContain(
        'Policy violations must be automatically detected and reported'
      );
    });
  });

  describe('validateRules', () => {
    it('should validate that rules are complete and consistent', async () => {
      const validRules: ValidationRules = {
        security: [
          {
            type: 'baseline',
            rule: 'Test security rule',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'audit',
            rule: 'Test compliance rule',
            enforcement: 'warn',
          },
        ],
        standards: [
          {
            type: 'code_quality',
            rule: 'Test standard rule',
            enforcement: 'block',
          },
        ],
        cost: [
          {
            type: 'resource_limits',
            rule: 'Test cost rule',
            enforcement: 'warn',
          },
        ],
      };

      const isValid = await generator.validateRules(validRules);
      expect(isValid).toBe(true);
    });

    it('should reject rules without security rules', async () => {
      const invalidRules: ValidationRules = {
        security: [],
        compliance: [
          {
            type: 'audit',
            rule: 'Test compliance rule',
            enforcement: 'warn',
          },
        ],
        standards: [
          {
            type: 'code_quality',
            rule: 'Test standard rule',
            enforcement: 'block',
          },
        ],
        cost: [],
      };

      await expect(generator.validateRules(invalidRules)).rejects.toThrow(
        'Security rules are required'
      );
    });

    it('should reject rules without standard rules', async () => {
      const invalidRules: ValidationRules = {
        security: [
          {
            type: 'baseline',
            rule: 'Test security rule',
            enforcement: 'block',
          },
        ],
        compliance: [],
        standards: [],
        cost: [],
      };

      await expect(generator.validateRules(invalidRules)).rejects.toThrow(
        'Standard rules are required'
      );
    });

    it('should reject rules with duplicates', async () => {
      const invalidRules: ValidationRules = {
        security: [
          {
            type: 'baseline',
            rule: 'Duplicate rule',
            enforcement: 'block',
          },
        ],
        compliance: [],
        standards: [
          {
            type: 'code_quality',
            rule: 'Duplicate rule',
            enforcement: 'warn',
          },
        ],
        cost: [],
      };

      await expect(generator.validateRules(invalidRules)).rejects.toThrow(
        'Duplicate rules found: Duplicate rule'
      );
    });
  });

  describe('generateOrganizationalRules', () => {
    it('should generate basic organizational rules', async () => {
      const orgConfig = {
        requireCodeReview: true,
        auditRequired: true,
        budgetLimits: true,
      };

      const rules = await generator.generateOrganizationalRules(orgConfig);

      expect(rules.security.length).toBeGreaterThan(0);
      expect(rules.compliance.length).toBeGreaterThan(0);
      expect(rules.standards.length).toBeGreaterThan(0);
      expect(rules.cost.length).toBeGreaterThan(0);

      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'All code must be reviewed by at least one other developer'
      );

      const complianceRules = rules.compliance.map((rule) => rule.rule);
      expect(complianceRules).toContain(
        'All changes must be tracked in audit log'
      );
    });
  });

  describe('rule enforcement levels', () => {
    it('should use appropriate enforcement levels for different rule types', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-template',
          description: 'Test template for enforcement levels',
          tags: ['api', 'security'],
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

      const rules = await generator.generateValidationLogic(spec);

      // Critical security rules should block
      const criticalSecurityRules = rules.security.filter(
        (rule) =>
          rule.rule.includes('Secrets must not be hardcoded') ||
          rule.rule.includes('HTTPS must be enforced')
      );
      criticalSecurityRules.forEach((rule) => {
        expect(rule.enforcement).toBe('block');
      });

      // Some rules should warn instead of block
      const warningRules = rules.security.filter(
        (rule) => rule.enforcement === 'warn'
      );
      expect(warningRules.length).toBeGreaterThan(0);
    });
  });

  describe('template type detection', () => {
    it('should correctly detect API templates from tags', async () => {
      const apiSpec: TemplateSpec = {
        metadata: {
          name: 'api-template',
          description: 'Template for APIs',
          tags: ['api', 'rest'],
          owner: 'api-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const rules = await generator.generateValidationLogic(apiSpec);
      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'API endpoints must implement authentication'
      );
    });

    it('should correctly detect API templates from description', async () => {
      const apiSpec: TemplateSpec = {
        metadata: {
          name: 'service-template',
          description: 'REST API service for user management',
          tags: ['backend'],
          owner: 'backend-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const rules = await generator.generateValidationLogic(apiSpec);
      const securityRules = rules.security.map((rule) => rule.rule);
      expect(securityRules).toContain(
        'API endpoints must implement authentication'
      );
    });

    it('should correctly detect database templates', async () => {
      const dbSpec: TemplateSpec = {
        metadata: {
          name: 'db-template',
          description: 'Template with database integration',
          tags: ['database', 'postgres'],
          owner: 'data-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const rules = await generator.generateValidationLogic(dbSpec);
      const costRules = rules.cost.map((rule) => rule.rule);
      expect(costRules).toContain(
        'Database connection pooling must be implemented'
      );
    });
  });

  describe('maturity level detection', () => {
    it('should detect L5 maturity from tags', async () => {
      const l5Spec: TemplateSpec = {
        metadata: {
          name: 'l5-template',
          description: 'Intent-driven template',
          tags: ['l5', 'intent-driven'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const rules = await generator.generateValidationLogic(l5Spec);
      const complianceRules = rules.compliance.map((rule) => rule.rule);
      expect(complianceRules).toContain(
        'High maturity templates must undergo security review'
      );
    });

    it('should detect L4 maturity from governance tags', async () => {
      const l4Spec: TemplateSpec = {
        metadata: {
          name: 'governance-template',
          description: 'Governance-enabled template',
          tags: ['governance', 'policy'],
          owner: 'governance-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const rules = await generator.generateValidationLogic(l4Spec);
      const complianceRules = rules.compliance.map((rule) => rule.rule);
      expect(complianceRules).toContain(
        'High maturity templates must undergo security review'
      );
    });
  });
});
