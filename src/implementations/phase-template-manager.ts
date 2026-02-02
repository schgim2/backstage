/**
 * Phase-Appropriate Template Manager
 * Manages template types and capabilities appropriate for each development phase
 */

import {
  DevelopmentPhase,
  CapabilityMaturity,
  TemplateSpec,
  TemplateStep,
  ValidationRules,
} from '../types/core';

export interface PhaseTemplateConfig {
  phase: DevelopmentPhase;
  maturityLevel: CapabilityMaturity;
  supportedTypes: string[];
  requiredCapabilities: string[];
  templateFeatures: string[];
  validationRules: ValidationRules;
}

export interface PhaseTemplate {
  id: string;
  name: string;
  description: string;
  phase: DevelopmentPhase;
  type: string;
  spec: TemplateSpec;
  capabilities: string[];
  dependencies: string[];
}

export interface CompositeTemplate {
  id: string;
  name: string;
  description: string;
  phase: DevelopmentPhase;
  components: PhaseTemplate[];
  orchestration: TemplateStep[];
}

export class PhaseTemplateManager {
  private readonly phaseConfigs: PhaseTemplateConfig[] = [
    {
      phase: DevelopmentPhase.FOUNDATION,
      maturityLevel: CapabilityMaturity.L1_GENERATION,
      supportedTypes: [
        'backend-service',
        'frontend-app',
        'gitops-app',
        'catalog-registration',
        'library',
        'documentation',
      ],
      requiredCapabilities: [
        'Basic code generation',
        'File structure creation',
        'Template scaffolding',
      ],
      templateFeatures: [
        'Basic parameter handling',
        'File generation',
        'Simple validation',
        'Basic documentation',
      ],
      validationRules: {
        security: [
          {
            type: 'baseline',
            rule: 'No hardcoded secrets',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'naming',
            rule: 'Follow naming conventions',
            enforcement: 'warn',
          },
        ],
        standards: [
          {
            type: 'structure',
            rule: 'Standard project structure',
            enforcement: 'warn',
          },
        ],
        cost: [],
      },
    },
    {
      phase: DevelopmentPhase.STANDARDIZATION,
      maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
      supportedTypes: [
        'composite-service',
        'microservice-suite',
        'deployment-pipeline',
        'environment-config',
        'monitoring-setup',
      ],
      requiredCapabilities: [
        'Automated deployment',
        'Environment management',
        'CI/CD integration',
        'Composite template creation',
      ],
      templateFeatures: [
        'Multi-step workflows',
        'Environment-specific configs',
        'Pipeline integration',
        'Automated testing',
        'Deployment automation',
      ],
      validationRules: {
        security: [
          {
            type: 'baseline',
            rule: 'Security scanning integration',
            enforcement: 'block',
          },
          {
            type: 'access',
            rule: 'Proper RBAC configuration',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'deployment',
            rule: 'Deployment approval gates',
            enforcement: 'block',
          },
        ],
        standards: [
          {
            type: 'architecture',
            rule: 'Architectural standards compliance',
            enforcement: 'block',
          },
        ],
        cost: [
          {
            type: 'resource',
            rule: 'Resource limit enforcement',
            enforcement: 'warn',
          },
        ],
      },
    },
    {
      phase: DevelopmentPhase.OPERATIONALIZATION,
      maturityLevel: CapabilityMaturity.L3_OPERATIONS,
      supportedTypes: [
        'operational-automation',
        'scaling-template',
        'maintenance-workflow',
        'monitoring-dashboard',
        'alerting-setup',
        'backup-automation',
      ],
      requiredCapabilities: [
        'Operational automation',
        'Monitoring and alerting',
        'Scaling capabilities',
        'Maintenance automation',
      ],
      templateFeatures: [
        'Auto-scaling configuration',
        'Monitoring integration',
        'Operational dashboards',
        'Automated maintenance',
        'Performance optimization',
        'Capacity planning',
      ],
      validationRules: {
        security: [
          {
            type: 'baseline',
            rule: 'Operational security controls',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'operational',
            rule: 'SLA compliance monitoring',
            enforcement: 'block',
          },
        ],
        standards: [
          {
            type: 'operational',
            rule: 'Operational excellence standards',
            enforcement: 'block',
          },
        ],
        cost: [
          {
            type: 'optimization',
            rule: 'Cost optimization automation',
            enforcement: 'warn',
          },
        ],
      },
    },
    {
      phase: DevelopmentPhase.GOVERNANCE,
      maturityLevel: CapabilityMaturity.L4_GOVERNANCE,
      supportedTypes: [
        'policy-enforced-service',
        'compliance-template',
        'governance-workflow',
        'audit-automation',
        'risk-assessment',
      ],
      requiredCapabilities: [
        'Policy enforcement',
        'Compliance automation',
        'Risk management',
        'Audit trail generation',
      ],
      templateFeatures: [
        'Policy-as-code integration',
        'Compliance scanning',
        'Audit logging',
        'Risk assessment automation',
        'Governance reporting',
        'Regulatory compliance',
      ],
      validationRules: {
        security: [
          {
            type: 'baseline',
            rule: 'Comprehensive security framework',
            enforcement: 'block',
          },
          {
            type: 'classification',
            rule: 'Data classification enforcement',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'regulatory',
            rule: 'Regulatory compliance validation',
            enforcement: 'block',
          },
          {
            type: 'audit',
            rule: 'Audit trail requirements',
            enforcement: 'block',
          },
        ],
        standards: [
          {
            type: 'governance',
            rule: 'Governance framework compliance',
            enforcement: 'block',
          },
        ],
        cost: [
          {
            type: 'governance',
            rule: 'Cost governance policies',
            enforcement: 'block',
          },
        ],
      },
    },
    {
      phase: DevelopmentPhase.INTENT_DRIVEN,
      maturityLevel: CapabilityMaturity.L5_INTENT_DRIVEN,
      supportedTypes: [
        'intent-driven-composite',
        'adaptive-template',
        'self-optimizing-service',
        'ai-powered-workflow',
        'intelligent-automation',
      ],
      requiredCapabilities: [
        'Intent-based automation',
        'Adaptive systems',
        'Self-optimization',
        'AI/ML integration',
      ],
      templateFeatures: [
        'Intent processing',
        'Adaptive algorithms',
        'Self-optimization',
        'AI/ML integration',
        'Intelligent decision making',
        'Continuous learning',
      ],
      validationRules: {
        security: [
          {
            type: 'baseline',
            rule: 'AI security framework',
            enforcement: 'block',
          },
        ],
        compliance: [
          {
            type: 'ai',
            rule: 'AI ethics compliance',
            enforcement: 'block',
          },
        ],
        standards: [
          {
            type: 'ai',
            rule: 'AI governance standards',
            enforcement: 'block',
          },
        ],
        cost: [
          {
            type: 'ai',
            rule: 'AI cost optimization',
            enforcement: 'warn',
          },
        ],
      },
    },
  ];

  /**
   * Get supported template types for a specific phase
   */
  getSupportedTypes(phase: DevelopmentPhase): string[] {
    const config = this.phaseConfigs.find((c) => c.phase === phase);
    return config?.supportedTypes || [];
  }

  /**
   * Check if a template type is supported in a specific phase
   */
  isTypeSupported(phase: DevelopmentPhase, templateType: string): boolean {
    const supportedTypes = this.getSupportedTypes(phase);
    return supportedTypes.includes(templateType);
  }

  /**
   * Get phase configuration
   */
  getPhaseConfig(phase: DevelopmentPhase): PhaseTemplateConfig | undefined {
    return this.phaseConfigs.find((c) => c.phase === phase);
  }

  /**
   * Generate phase-appropriate template
   */
  async generatePhaseTemplate(
    phase: DevelopmentPhase,
    templateType: string,
    name: string,
    description: string,
    parameters: Record<string, unknown> = {}
  ): Promise<PhaseTemplate> {
    const config = this.getPhaseConfig(phase);
    if (!config) {
      throw new Error(`Configuration not found for phase '${phase}'`);
    }

    if (!this.isTypeSupported(phase, templateType)) {
      throw new Error(
        `Template type '${templateType}' is not supported in phase '${phase}'`
      );
    }

    const spec = await this.createPhaseTemplateSpec(
      phase,
      templateType,
      name,
      description,
      parameters,
      config
    );

    return {
      id: `${phase.toLowerCase()}-${templateType}-${name}`,
      name,
      description,
      phase,
      type: templateType,
      spec,
      capabilities: config.requiredCapabilities,
      dependencies: this.getTemplateDependencies(phase, templateType),
    };
  }

  /**
   * Create composite template for advanced phases
   */
  async generateCompositeTemplate(
    phase: DevelopmentPhase,
    name: string,
    description: string,
    componentSpecs: Array<{
      type: string;
      name: string;
      parameters: Record<string, unknown>;
    }>
  ): Promise<CompositeTemplate> {
    if (
      ![
        DevelopmentPhase.STANDARDIZATION,
        DevelopmentPhase.INTENT_DRIVEN,
      ].includes(phase)
    ) {
      throw new Error(
        `Composite templates are not supported in phase '${phase}'`
      );
    }

    const components: PhaseTemplate[] = [];
    for (const componentSpec of componentSpecs) {
      const component = await this.generatePhaseTemplate(
        phase,
        componentSpec.type,
        componentSpec.name,
        `Component: ${componentSpec.name}`,
        componentSpec.parameters
      );
      components.push(component);
    }

    const orchestration = this.createOrchestrationSteps(components, phase);

    return {
      id: `${phase.toLowerCase()}-composite-${name}`,
      name,
      description,
      phase,
      components,
      orchestration,
    };
  }

  /**
   * Validate template against phase requirements
   */
  async validatePhaseTemplate(
    template: PhaseTemplate
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const config = this.getPhaseConfig(template.phase);
    if (!config) {
      errors.push(`Unknown phase: ${template.phase}`);
      return { isValid: false, errors, warnings };
    }

    // Check if template type is supported
    if (!this.isTypeSupported(template.phase, template.type)) {
      errors.push(
        `Template type '${template.type}' is not supported in phase '${template.phase}'`
      );
    }

    // Validate required capabilities
    const missingCapabilities = config.requiredCapabilities.filter(
      (cap) => !template.capabilities.includes(cap)
    );
    if (missingCapabilities.length > 0) {
      warnings.push(`Missing capabilities: ${missingCapabilities.join(', ')}`);
    }

    // Validate template features
    const templateFeatures = this.extractTemplateFeatures(template);
    const missingFeatures = config.templateFeatures.filter(
      (feature) => !templateFeatures.includes(feature)
    );
    if (missingFeatures.length > 0) {
      warnings.push(`Missing features: ${missingFeatures.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get recommended next phase for template evolution
   */
  getNextPhase(currentPhase: DevelopmentPhase): DevelopmentPhase | undefined {
    const phases = [
      DevelopmentPhase.FOUNDATION,
      DevelopmentPhase.STANDARDIZATION,
      DevelopmentPhase.OPERATIONALIZATION,
      DevelopmentPhase.GOVERNANCE,
      DevelopmentPhase.INTENT_DRIVEN,
    ];

    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex < phases.length - 1
      ? phases[currentIndex + 1]
      : undefined;
  }

  /**
   * Get evolution recommendations for advancing to next phase
   */
  async getEvolutionRecommendations(
    template: PhaseTemplate
  ): Promise<string[]> {
    const nextPhase = this.getNextPhase(template.phase);
    if (!nextPhase) {
      return ['Template is already at the highest phase level'];
    }

    const nextConfig = this.getPhaseConfig(nextPhase);
    if (!nextConfig) {
      return ['Unable to determine next phase requirements'];
    }

    const recommendations: string[] = [];

    // Capability recommendations
    const newCapabilities = nextConfig.requiredCapabilities.filter(
      (cap) => !template.capabilities.includes(cap)
    );
    newCapabilities.forEach((cap) => {
      recommendations.push(`Add capability: ${cap}`);
    });

    // Feature recommendations
    const currentFeatures = this.extractTemplateFeatures(template);
    const newFeatures = nextConfig.templateFeatures.filter(
      (feature) => !currentFeatures.includes(feature)
    );
    newFeatures.forEach((feature) => {
      recommendations.push(`Implement feature: ${feature}`);
    });

    // Validation recommendations
    const currentValidation = template.spec.validation;
    const nextValidation = nextConfig.validationRules;

    if (nextValidation.security.length > currentValidation.security.length) {
      recommendations.push('Enhance security validation rules');
    }
    if (
      nextValidation.compliance.length > currentValidation.compliance.length
    ) {
      recommendations.push('Add compliance validation rules');
    }
    if (nextValidation.standards.length > currentValidation.standards.length) {
      recommendations.push('Implement additional standards validation');
    }

    return recommendations;
  }

  /**
   * Private helper methods
   */
  private async createPhaseTemplateSpec(
    phase: DevelopmentPhase,
    templateType: string,
    name: string,
    description: string,
    parameters: Record<string, unknown>,
    config: PhaseTemplateConfig
  ): Promise<TemplateSpec> {
    const steps = this.generatePhaseSteps(phase, templateType, parameters);

    return {
      metadata: {
        name: `${phase.toLowerCase()}-${templateType}-${name}`,
        description,
        tags: [phase.toLowerCase(), templateType, config.maturityLevel],
        owner: 'platform-team',
      },
      parameters,
      steps,
      output: {
        links: [
          {
            title: 'Repository',
            url: '${{ steps.publish.output.remoteUrl }}',
          },
        ],
        text: [
          {
            title: 'Template Generated',
            content: `${templateType} template for ${name} has been generated successfully`,
          },
        ],
      },
      validation: config.validationRules,
    };
  }

  private generatePhaseSteps(
    phase: DevelopmentPhase,
    templateType: string,
    parameters: Record<string, unknown>
  ): TemplateStep[] {
    const baseSteps: TemplateStep[] = [
      {
        id: 'fetch',
        name: 'Fetch Template',
        action: 'fetch:template',
        input: {
          url: './skeleton',
          values: parameters,
        },
      },
    ];

    // Add phase-specific steps
    switch (phase) {
      case DevelopmentPhase.FOUNDATION:
        baseSteps.push(
          {
            id: 'validate-basic',
            name: 'Basic Validation',
            action: 'validate:basic',
            input: {
              rules: ['naming', 'structure'],
            },
          },
          {
            id: 'publish',
            name: 'Publish to Git',
            action: 'publish:git',
            input: {
              description: 'Initial commit',
            },
          }
        );
        break;

      case DevelopmentPhase.STANDARDIZATION:
        baseSteps.push(
          {
            id: 'validate-standards',
            name: 'Standards Validation',
            action: 'validate:standards',
            input: {
              rules: ['architecture', 'security', 'deployment'],
            },
          },
          {
            id: 'setup-pipeline',
            name: 'Setup CI/CD Pipeline',
            action: 'pipeline:create',
            input: {
              type: 'deployment',
              environments: ['dev', 'staging', 'prod'],
            },
          },
          {
            id: 'publish',
            name: 'Publish to Git',
            action: 'publish:git',
            input: {
              description: 'Standardized template with CI/CD',
            },
          }
        );
        break;

      case DevelopmentPhase.OPERATIONALIZATION:
        baseSteps.push(
          {
            id: 'setup-monitoring',
            name: 'Setup Monitoring',
            action: 'monitoring:create',
            input: {
              dashboards: true,
              alerts: true,
            },
          },
          {
            id: 'setup-scaling',
            name: 'Setup Auto-scaling',
            action: 'scaling:configure',
            input: {
              type: 'horizontal',
              metrics: ['cpu', 'memory'],
            },
          },
          {
            id: 'validate-operations',
            name: 'Operational Validation',
            action: 'validate:operations',
            input: {
              rules: ['sla', 'performance', 'capacity'],
            },
          },
          {
            id: 'publish',
            name: 'Publish to Git',
            action: 'publish:git',
            input: {
              description: 'Operational template with monitoring and scaling',
            },
          }
        );
        break;

      case DevelopmentPhase.GOVERNANCE:
        baseSteps.push(
          {
            id: 'policy-validation',
            name: 'Policy Validation',
            action: 'validate:policy',
            input: {
              policies: ['security', 'compliance', 'governance'],
            },
          },
          {
            id: 'audit-setup',
            name: 'Setup Audit Trail',
            action: 'audit:configure',
            input: {
              logging: true,
              reporting: true,
            },
          },
          {
            id: 'compliance-check',
            name: 'Compliance Check',
            action: 'compliance:validate',
            input: {
              frameworks: ['sox', 'gdpr', 'hipaa'],
            },
          },
          {
            id: 'publish',
            name: 'Publish to Git',
            action: 'publish:git',
            input: {
              description: 'Governance-compliant template with audit trail',
            },
          }
        );
        break;

      case DevelopmentPhase.INTENT_DRIVEN:
        baseSteps.push(
          {
            id: 'intent-processing',
            name: 'Process Intent',
            action: 'intent:process',
            input: {
              aiModel: 'gpt-4',
              context: parameters,
            },
          },
          {
            id: 'adaptive-config',
            name: 'Configure Adaptive Behavior',
            action: 'adaptive:configure',
            input: {
              learning: true,
              optimization: true,
            },
          },
          {
            id: 'ai-validation',
            name: 'AI-Powered Validation',
            action: 'validate:ai',
            input: {
              ethics: true,
              bias: true,
              explainability: true,
            },
          },
          {
            id: 'publish',
            name: 'Publish to Git',
            action: 'publish:git',
            input: {
              description: 'Intent-driven template with AI capabilities',
            },
          }
        );
        break;
    }

    return baseSteps;
  }

  private getTemplateDependencies(
    phase: DevelopmentPhase,
    templateType: string
  ): string[] {
    const dependencies: string[] = [];

    // Base dependencies for all phases
    dependencies.push('git', 'backstage-cli');

    // Phase-specific dependencies
    switch (phase) {
      case DevelopmentPhase.FOUNDATION:
        if (templateType.includes('backend')) {
          dependencies.push('node', 'npm');
        }
        if (templateType.includes('frontend')) {
          dependencies.push('node', 'npm', 'react');
        }
        break;

      case DevelopmentPhase.STANDARDIZATION:
        dependencies.push('docker', 'kubernetes', 'helm');
        break;

      case DevelopmentPhase.OPERATIONALIZATION:
        dependencies.push('prometheus', 'grafana', 'elasticsearch');
        break;

      case DevelopmentPhase.GOVERNANCE:
        dependencies.push('opa', 'falco', 'vault');
        break;

      case DevelopmentPhase.INTENT_DRIVEN:
        dependencies.push('tensorflow', 'pytorch', 'langchain');
        break;
    }

    return dependencies;
  }

  private createOrchestrationSteps(
    components: PhaseTemplate[],
    phase: DevelopmentPhase
  ): TemplateStep[] {
    const orchestrationSteps: TemplateStep[] = [
      {
        id: 'orchestration-start',
        name: 'Start Composite Template',
        action: 'orchestration:start',
        input: {
          components: components.map((c) => c.id),
          phase,
        },
      },
    ];

    // Add component execution steps
    components.forEach((component, index) => {
      orchestrationSteps.push({
        id: `execute-${component.id}`,
        name: `Execute ${component.name}`,
        action: 'template:execute',
        input: {
          templateId: component.id,
          parameters: component.spec.parameters,
        },
        if:
          index > 0
            ? `steps.execute-${components[index - 1].id}.completed`
            : undefined,
      });
    });

    orchestrationSteps.push({
      id: 'orchestration-complete',
      name: 'Complete Composite Template',
      action: 'orchestration:complete',
      input: {
        results: components.map((c) => `steps.execute-${c.id}.output`),
      },
    });

    return orchestrationSteps;
  }

  private extractTemplateFeatures(template: PhaseTemplate): string[] {
    const features: string[] = [];

    // Extract features from template steps
    template.spec.steps.forEach((step) => {
      switch (step.action) {
        case 'validate:basic':
          features.push('Basic validation');
          break;
        case 'validate:standards':
          features.push('Standards validation');
          break;
        case 'pipeline:create':
          features.push('Pipeline integration');
          break;
        case 'monitoring:create':
          features.push('Monitoring integration');
          break;
        case 'scaling:configure':
          features.push('Auto-scaling configuration');
          break;
        case 'validate:policy':
          features.push('Policy enforcement');
          break;
        case 'audit:configure':
          features.push('Audit logging');
          break;
        case 'intent:process':
          features.push('Intent processing');
          break;
        case 'adaptive:configure':
          features.push('Adaptive algorithms');
          break;
      }
    });

    return features;
  }
}
