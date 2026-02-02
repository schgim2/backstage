/**
 * Unit tests for PhaseTemplateManager
 */

import {
  PhaseTemplateManager,
  PhaseTemplate,
  CompositeTemplate,
  PhaseTemplateConfig,
} from '../implementations/phase-template-manager';
import { DevelopmentPhase, CapabilityMaturity } from '../types/core';

describe('PhaseTemplateManager', () => {
  let phaseTemplateManager: PhaseTemplateManager;

  beforeEach(() => {
    phaseTemplateManager = new PhaseTemplateManager();
  });

  describe('getSupportedTypes', () => {
    it('should return Foundation phase supported types', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        DevelopmentPhase.FOUNDATION
      );

      expect(types).toContain('backend-service');
      expect(types).toContain('frontend-app');
      expect(types).toContain('gitops-app');
      expect(types).toContain('catalog-registration');
      expect(types).toContain('library');
      expect(types).toContain('documentation');
    });

    it('should return Standardization phase supported types', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        DevelopmentPhase.STANDARDIZATION
      );

      expect(types).toContain('composite-service');
      expect(types).toContain('microservice-suite');
      expect(types).toContain('deployment-pipeline');
      expect(types).toContain('environment-config');
      expect(types).toContain('monitoring-setup');
    });

    it('should return Operationalization phase supported types', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        DevelopmentPhase.OPERATIONALIZATION
      );

      expect(types).toContain('operational-automation');
      expect(types).toContain('scaling-template');
      expect(types).toContain('maintenance-workflow');
      expect(types).toContain('monitoring-dashboard');
      expect(types).toContain('alerting-setup');
      expect(types).toContain('backup-automation');
    });

    it('should return Governance phase supported types', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        DevelopmentPhase.GOVERNANCE
      );

      expect(types).toContain('policy-enforced-service');
      expect(types).toContain('compliance-template');
      expect(types).toContain('governance-workflow');
      expect(types).toContain('audit-automation');
      expect(types).toContain('risk-assessment');
    });

    it('should return Intent-Driven phase supported types', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        DevelopmentPhase.INTENT_DRIVEN
      );

      expect(types).toContain('intent-driven-composite');
      expect(types).toContain('adaptive-template');
      expect(types).toContain('self-optimizing-service');
      expect(types).toContain('ai-powered-workflow');
      expect(types).toContain('intelligent-automation');
    });

    it('should return empty array for unknown phase', () => {
      const types = phaseTemplateManager.getSupportedTypes(
        'UNKNOWN_PHASE' as DevelopmentPhase
      );

      expect(types).toEqual([]);
    });
  });

  describe('isTypeSupported', () => {
    it('should return true for supported types in Foundation phase', () => {
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.FOUNDATION,
          'backend-service'
        )
      ).toBe(true);
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.FOUNDATION,
          'frontend-app'
        )
      ).toBe(true);
    });

    it('should return false for unsupported types in Foundation phase', () => {
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.FOUNDATION,
          'composite-service'
        )
      ).toBe(false);
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.FOUNDATION,
          'ai-powered-workflow'
        )
      ).toBe(false);
    });

    it('should return true for supported types in Intent-Driven phase', () => {
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.INTENT_DRIVEN,
          'intent-driven-composite'
        )
      ).toBe(true);
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.INTENT_DRIVEN,
          'adaptive-template'
        )
      ).toBe(true);
    });

    it('should return false for types from other phases', () => {
      expect(
        phaseTemplateManager.isTypeSupported(
          DevelopmentPhase.INTENT_DRIVEN,
          'backend-service'
        )
      ).toBe(false);
    });
  });

  describe('getPhaseConfig', () => {
    it('should return correct config for Foundation phase', () => {
      const config = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.FOUNDATION
      );

      expect(config).toBeDefined();
      expect(config!.phase).toBe(DevelopmentPhase.FOUNDATION);
      expect(config!.maturityLevel).toBe(CapabilityMaturity.L1_GENERATION);
      expect(config!.requiredCapabilities).toContain('Basic code generation');
      expect(config!.templateFeatures).toContain('Basic parameter handling');
    });

    it('should return correct config for Governance phase', () => {
      const config = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.GOVERNANCE
      );

      expect(config).toBeDefined();
      expect(config!.phase).toBe(DevelopmentPhase.GOVERNANCE);
      expect(config!.maturityLevel).toBe(CapabilityMaturity.L4_GOVERNANCE);
      expect(config!.requiredCapabilities).toContain('Policy enforcement');
      expect(config!.templateFeatures).toContain('Policy-as-code integration');
    });

    it('should return undefined for unknown phase', () => {
      const config = phaseTemplateManager.getPhaseConfig(
        'UNKNOWN_PHASE' as DevelopmentPhase
      );

      expect(config).toBeUndefined();
    });
  });

  describe('generatePhaseTemplate', () => {
    it('should generate Foundation phase backend service template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'user-service',
        'A user management service',
        { language: 'typescript', database: 'postgresql' }
      );

      expect(template.id).toBe('foundation-backend-service-user-service');
      expect(template.name).toBe('user-service');
      expect(template.description).toBe('A user management service');
      expect(template.phase).toBe(DevelopmentPhase.FOUNDATION);
      expect(template.type).toBe('backend-service');
      expect(template.spec.metadata.name).toBe(
        'foundation-backend-service-user-service'
      );
      expect(template.spec.steps.length).toBeGreaterThan(0);
      expect(template.capabilities).toContain('Basic code generation');
    });

    it('should generate Standardization phase composite service template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.STANDARDIZATION,
        'composite-service',
        'order-system',
        'Complete order management system',
        { services: ['order', 'payment', 'inventory'] }
      );

      expect(template.id).toBe(
        'standardization-composite-service-order-system'
      );
      expect(template.phase).toBe(DevelopmentPhase.STANDARDIZATION);
      expect(template.type).toBe('composite-service');
      expect(template.capabilities).toContain('Automated deployment');
      expect(template.capabilities).toContain('CI/CD integration');

      // Check for standardization-specific steps
      const stepActions = template.spec.steps.map((step) => step.action);
      expect(stepActions).toContain('validate:standards');
      expect(stepActions).toContain('pipeline:create');
    });

    it('should generate Operationalization phase scaling template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.OPERATIONALIZATION,
        'scaling-template',
        'auto-scaler',
        'Automatic scaling configuration',
        { minReplicas: 2, maxReplicas: 10 }
      );

      expect(template.phase).toBe(DevelopmentPhase.OPERATIONALIZATION);
      expect(template.type).toBe('scaling-template');
      expect(template.capabilities).toContain('Scaling capabilities');

      // Check for operationalization-specific steps
      const stepActions = template.spec.steps.map((step) => step.action);
      expect(stepActions).toContain('monitoring:create');
      expect(stepActions).toContain('scaling:configure');
      expect(stepActions).toContain('validate:operations');
    });

    it('should generate Governance phase policy-enforced template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.GOVERNANCE,
        'policy-enforced-service',
        'secure-api',
        'Policy-enforced API service',
        { securityLevel: 'high', compliance: ['sox', 'gdpr'] }
      );

      expect(template.phase).toBe(DevelopmentPhase.GOVERNANCE);
      expect(template.type).toBe('policy-enforced-service');
      expect(template.capabilities).toContain('Policy enforcement');
      expect(template.capabilities).toContain('Compliance automation');

      // Check for governance-specific steps
      const stepActions = template.spec.steps.map((step) => step.action);
      expect(stepActions).toContain('validate:policy');
      expect(stepActions).toContain('audit:configure');
      expect(stepActions).toContain('compliance:validate');
    });

    it('should generate Intent-Driven phase AI-powered template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.INTENT_DRIVEN,
        'ai-powered-workflow',
        'smart-processor',
        'AI-powered data processor',
        { aiModel: 'gpt-4', learningEnabled: true }
      );

      expect(template.phase).toBe(DevelopmentPhase.INTENT_DRIVEN);
      expect(template.type).toBe('ai-powered-workflow');
      expect(template.capabilities).toContain('Intent-based automation');
      expect(template.capabilities).toContain('AI/ML integration');

      // Check for intent-driven-specific steps
      const stepActions = template.spec.steps.map((step) => step.action);
      expect(stepActions).toContain('intent:process');
      expect(stepActions).toContain('adaptive:configure');
      expect(stepActions).toContain('validate:ai');
    });

    it('should throw error for unsupported template type', async () => {
      await expect(
        phaseTemplateManager.generatePhaseTemplate(
          DevelopmentPhase.FOUNDATION,
          'ai-powered-workflow',
          'test',
          'test description'
        )
      ).rejects.toThrow(
        "Template type 'ai-powered-workflow' is not supported in phase 'FOUNDATION'"
      );
    });

    it('should throw error for unknown phase', async () => {
      await expect(
        phaseTemplateManager.generatePhaseTemplate(
          'UNKNOWN_PHASE' as DevelopmentPhase,
          'backend-service',
          'test',
          'test description'
        )
      ).rejects.toThrow("Configuration not found for phase 'UNKNOWN_PHASE'");
    });
  });

  describe('generateCompositeTemplate', () => {
    it('should generate composite template for Standardization phase', async () => {
      const componentSpecs = [
        {
          type: 'composite-service',
          name: 'api-gateway',
          parameters: { port: 8080 },
        },
        {
          type: 'microservice-suite',
          name: 'backend-services',
          parameters: { services: ['user', 'order'] },
        },
      ];

      const composite = await phaseTemplateManager.generateCompositeTemplate(
        DevelopmentPhase.STANDARDIZATION,
        'e-commerce-platform',
        'Complete e-commerce platform',
        componentSpecs
      );

      expect(composite.id).toBe(
        'standardization-composite-e-commerce-platform'
      );
      expect(composite.name).toBe('e-commerce-platform');
      expect(composite.phase).toBe(DevelopmentPhase.STANDARDIZATION);
      expect(composite.components).toHaveLength(2);
      expect(composite.orchestration).toHaveLength(4); // start + 2 components + complete

      // Check orchestration steps
      const orchestrationActions = composite.orchestration.map(
        (step) => step.action
      );
      expect(orchestrationActions).toContain('orchestration:start');
      expect(orchestrationActions).toContain('template:execute');
      expect(orchestrationActions).toContain('orchestration:complete');
    });

    it('should generate composite template for Intent-Driven phase', async () => {
      const componentSpecs = [
        {
          type: 'intent-driven-composite',
          name: 'smart-system',
          parameters: { aiEnabled: true },
        },
        {
          type: 'adaptive-template',
          name: 'learning-component',
          parameters: { learningRate: 0.01 },
        },
      ];

      const composite = await phaseTemplateManager.generateCompositeTemplate(
        DevelopmentPhase.INTENT_DRIVEN,
        'intelligent-platform',
        'AI-powered intelligent platform',
        componentSpecs
      );

      expect(composite.phase).toBe(DevelopmentPhase.INTENT_DRIVEN);
      expect(composite.components).toHaveLength(2);
      expect(composite.components[0].type).toBe('intent-driven-composite');
      expect(composite.components[1].type).toBe('adaptive-template');
    });

    it('should throw error for unsupported phase', async () => {
      const componentSpecs = [
        {
          type: 'backend-service',
          name: 'simple-service',
          parameters: {},
        },
      ];

      await expect(
        phaseTemplateManager.generateCompositeTemplate(
          DevelopmentPhase.FOUNDATION,
          'test-composite',
          'Test composite',
          componentSpecs
        )
      ).rejects.toThrow(
        "Composite templates are not supported in phase 'FOUNDATION'"
      );
    });
  });

  describe('validatePhaseTemplate', () => {
    it('should validate Foundation phase template successfully', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service'
      );

      const validation = await phaseTemplateManager.validatePhaseTemplate(
        template
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should identify missing capabilities', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service'
      );

      // Remove a required capability
      template.capabilities = template.capabilities.filter(
        (cap) => cap !== 'Basic code generation'
      );

      const validation = await phaseTemplateManager.validatePhaseTemplate(
        template
      );

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Missing capabilities');
      expect(validation.warnings[0]).toContain('Basic code generation');
    });

    it('should identify unsupported template type', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service'
      );

      // Change to unsupported type
      template.type = 'ai-powered-workflow';

      const validation = await phaseTemplateManager.validatePhaseTemplate(
        template
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain(
        "Template type 'ai-powered-workflow' is not supported in phase 'FOUNDATION'"
      );
    });

    it('should handle unknown phase', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service'
      );

      // Change to unknown phase
      template.phase = 'UNKNOWN_PHASE' as DevelopmentPhase;

      const validation = await phaseTemplateManager.validatePhaseTemplate(
        template
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('Unknown phase: UNKNOWN_PHASE');
    });
  });

  describe('getNextPhase', () => {
    it('should return correct next phases', () => {
      expect(
        phaseTemplateManager.getNextPhase(DevelopmentPhase.FOUNDATION)
      ).toBe(DevelopmentPhase.STANDARDIZATION);
      expect(
        phaseTemplateManager.getNextPhase(DevelopmentPhase.STANDARDIZATION)
      ).toBe(DevelopmentPhase.OPERATIONALIZATION);
      expect(
        phaseTemplateManager.getNextPhase(DevelopmentPhase.OPERATIONALIZATION)
      ).toBe(DevelopmentPhase.GOVERNANCE);
      expect(
        phaseTemplateManager.getNextPhase(DevelopmentPhase.GOVERNANCE)
      ).toBe(DevelopmentPhase.INTENT_DRIVEN);
    });

    it('should return undefined for highest phase', () => {
      expect(
        phaseTemplateManager.getNextPhase(DevelopmentPhase.INTENT_DRIVEN)
      ).toBeUndefined();
    });
  });

  describe('getEvolutionRecommendations', () => {
    it('should provide recommendations for Foundation to Standardization evolution', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service'
      );

      const recommendations =
        await phaseTemplateManager.getEvolutionRecommendations(template);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((rec) => rec.includes('Automated deployment'))
      ).toBe(true);
      expect(
        recommendations.some((rec) => rec.includes('CI/CD integration'))
      ).toBe(true);
      expect(
        recommendations.some((rec) => rec.includes('Multi-step workflows'))
      ).toBe(true);
    });

    it('should provide recommendations for Standardization to Operationalization evolution', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.STANDARDIZATION,
        'composite-service',
        'test-service',
        'Test service'
      );

      const recommendations =
        await phaseTemplateManager.getEvolutionRecommendations(template);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((rec) => rec.includes('Operational automation'))
      ).toBe(true);
      expect(
        recommendations.some((rec) => rec.includes('Monitoring and alerting'))
      ).toBe(true);
      expect(
        recommendations.some((rec) => rec.includes('Scaling capabilities'))
      ).toBe(true);
    });

    it('should handle highest phase template', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.INTENT_DRIVEN,
        'ai-powered-workflow',
        'test-service',
        'Test service'
      );

      const recommendations =
        await phaseTemplateManager.getEvolutionRecommendations(template);

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0]).toBe(
        'Template is already at the highest phase level'
      );
    });

    it('should recommend security enhancements for governance evolution', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.OPERATIONALIZATION,
        'scaling-template',
        'test-service',
        'Test service'
      );

      const recommendations =
        await phaseTemplateManager.getEvolutionRecommendations(template);

      expect(
        recommendations.some((rec) => rec.includes('security validation'))
      ).toBe(true);
      expect(
        recommendations.some((rec) => rec.includes('compliance validation'))
      ).toBe(true);
    });
  });

  describe('phase-specific validation rules', () => {
    it('should have appropriate validation rules for each phase', () => {
      const foundationConfig = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.FOUNDATION
      );
      const governanceConfig = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.GOVERNANCE
      );

      // Foundation should have basic validation
      expect(foundationConfig!.validationRules.security).toHaveLength(1);
      expect(foundationConfig!.validationRules.cost).toHaveLength(0);

      // Governance should have comprehensive validation
      expect(governanceConfig!.validationRules.security.length).toBeGreaterThan(
        1
      );
      expect(
        governanceConfig!.validationRules.compliance.length
      ).toBeGreaterThan(1);
      expect(governanceConfig!.validationRules.cost.length).toBeGreaterThan(0);
    });

    it('should enforce stricter rules in higher phases', () => {
      const foundationConfig = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.FOUNDATION
      );
      const governanceConfig = phaseTemplateManager.getPhaseConfig(
        DevelopmentPhase.GOVERNANCE
      );

      // Count 'block' enforcement rules
      const foundationBlocks = [
        ...foundationConfig!.validationRules.security,
        ...foundationConfig!.validationRules.compliance,
        ...foundationConfig!.validationRules.standards,
      ].filter((rule) => rule.enforcement === 'block').length;

      const governanceBlocks = [
        ...governanceConfig!.validationRules.security,
        ...governanceConfig!.validationRules.compliance,
        ...governanceConfig!.validationRules.standards,
      ].filter((rule) => rule.enforcement === 'block').length;

      expect(governanceBlocks).toBeGreaterThan(foundationBlocks);
    });
  });

  describe('template dependencies', () => {
    it('should include phase-appropriate dependencies', async () => {
      const foundationTemplate =
        await phaseTemplateManager.generatePhaseTemplate(
          DevelopmentPhase.FOUNDATION,
          'backend-service',
          'test-service',
          'Test service'
        );

      const intentTemplate = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.INTENT_DRIVEN,
        'ai-powered-workflow',
        'test-service',
        'Test service'
      );

      // Foundation should have basic dependencies
      expect(foundationTemplate.dependencies).toContain('git');
      expect(foundationTemplate.dependencies).toContain('backstage-cli');
      expect(foundationTemplate.dependencies).toContain('node');

      // Intent-driven should have AI dependencies
      expect(intentTemplate.dependencies).toContain('tensorflow');
      expect(intentTemplate.dependencies).toContain('pytorch');
      expect(intentTemplate.dependencies).toContain('langchain');
    });
  });

  describe('edge cases', () => {
    it('should handle empty parameters', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'backend-service',
        'test-service',
        'Test service',
        {}
      );

      expect(template).toBeDefined();
      expect(template.spec.parameters).toEqual({});
    });

    it('should handle complex parameters', async () => {
      const complexParams = {
        services: ['user', 'order', 'payment'],
        database: {
          type: 'postgresql',
          version: '13',
          replicas: 3,
        },
        features: {
          authentication: true,
          monitoring: true,
          caching: false,
        },
      };

      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.STANDARDIZATION,
        'composite-service',
        'complex-service',
        'Complex service with multiple parameters',
        complexParams
      );

      expect(template.spec.parameters).toEqual(complexParams);
    });

    it('should handle template with no steps gracefully', async () => {
      const template = await phaseTemplateManager.generatePhaseTemplate(
        DevelopmentPhase.FOUNDATION,
        'documentation',
        'simple-docs',
        'Simple documentation'
      );

      expect(template.spec.steps.length).toBeGreaterThan(0);
      expect(template.spec.steps[0].action).toBe('fetch:template');
    });
  });

  describe('consistency checks', () => {
    it('should maintain consistency between phase and maturity level', () => {
      const phases = [
        DevelopmentPhase.FOUNDATION,
        DevelopmentPhase.STANDARDIZATION,
        DevelopmentPhase.OPERATIONALIZATION,
        DevelopmentPhase.GOVERNANCE,
        DevelopmentPhase.INTENT_DRIVEN,
      ];

      const expectedMaturity = [
        CapabilityMaturity.L1_GENERATION,
        CapabilityMaturity.L2_DEPLOYMENT,
        CapabilityMaturity.L3_OPERATIONS,
        CapabilityMaturity.L4_GOVERNANCE,
        CapabilityMaturity.L5_INTENT_DRIVEN,
      ];

      phases.forEach((phase, index) => {
        const config = phaseTemplateManager.getPhaseConfig(phase);
        expect(config!.maturityLevel).toBe(expectedMaturity[index]);
      });
    });

    it('should ensure all phases have required configuration', () => {
      const phases = [
        DevelopmentPhase.FOUNDATION,
        DevelopmentPhase.STANDARDIZATION,
        DevelopmentPhase.OPERATIONALIZATION,
        DevelopmentPhase.GOVERNANCE,
        DevelopmentPhase.INTENT_DRIVEN,
      ];

      phases.forEach((phase) => {
        const config = phaseTemplateManager.getPhaseConfig(phase);
        expect(config).toBeDefined();
        expect(config!.supportedTypes.length).toBeGreaterThan(0);
        expect(config!.requiredCapabilities.length).toBeGreaterThan(0);
        expect(config!.templateFeatures.length).toBeGreaterThan(0);
        expect(config!.validationRules).toBeDefined();
      });
    });
  });
});
