/**
 * Backstage YAML Generation Engine
 * Generates complete Backstage template YAML configurations
 */

import * as yaml from 'yaml';
import {
  TemplateSpec,
  TemplateStep,
  TemplateOutput,
  CapabilityMaturity,
  DevelopmentPhase,
  ValidationRules,
} from '../types/core';

export interface BackstageTemplateYaml {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title: string;
    description: string;
    tags: string[];
    annotations?: Record<string, string>;
  };
  spec: {
    owner: string;
    type: string;
    parameters: Array<{
      title: string;
      required?: string[];
      properties: Record<string, any>;
      dependencies?: Record<string, any>;
    }>;
    steps: Array<{
      id: string;
      name: string;
      action: string;
      input: Record<string, any>;
      if?: string;
    }>;
    output?: {
      links?: Array<{
        title: string;
        url: string;
        icon?: string;
      }>;
      text?: Array<{
        title: string;
        content: string;
      }>;
    };
  };
}

export interface ParameterField {
  type: string;
  title: string;
  description?: string;
  default?: any;
  enum?: string[];
  pattern?: string;
  'ui:field'?: string;
  'ui:options'?: Record<string, any>;
}

export class BackstageYamlGenerator {
  private readonly defaultActions: Record<DevelopmentPhase, string[]> = {
    [DevelopmentPhase.FOUNDATION]: [
      'fetch:template',
      'publish:github',
      'catalog:register',
    ],
    [DevelopmentPhase.STANDARDIZATION]: [
      'fetch:template',
      'fs:rename',
      'fs:replace',
      'publish:github',
      'catalog:register',
    ],
    [DevelopmentPhase.OPERATIONALIZATION]: [
      'fetch:template',
      'fs:rename',
      'fs:replace',
      'publish:github',
      'catalog:register',
      'github:actions:dispatch',
    ],
    [DevelopmentPhase.GOVERNANCE]: [
      'fetch:template',
      'fs:rename',
      'fs:replace',
      'publish:github',
      'catalog:register',
      'github:actions:dispatch',
      'catalog:write',
    ],
    [DevelopmentPhase.INTENT_DRIVEN]: [
      'fetch:template',
      'fs:rename',
      'fs:replace',
      'publish:github',
      'catalog:register',
      'github:actions:dispatch',
      'catalog:write',
      'debug:log',
    ],
  };

  private readonly maturityParameters: Record<
    CapabilityMaturity,
    ParameterField[]
  > = {
    [CapabilityMaturity.L1_GENERATION]: [
      {
        type: 'string',
        title: 'Component Name',
        description: 'Name of the component',
        pattern: '^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$',
      },
      {
        type: 'string',
        title: 'Description',
        description: 'Help others understand what this component is for',
      },
    ],
    [CapabilityMaturity.L2_DEPLOYMENT]: [
      {
        type: 'string',
        title: 'Component Name',
        description: 'Name of the component',
        pattern: '^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$',
      },
      {
        type: 'string',
        title: 'Description',
        description: 'Help others understand what this component is for',
      },
      {
        type: 'string',
        title: 'Environment',
        description: 'Deployment environment',
        enum: ['development', 'staging', 'production'],
        default: 'development',
      },
      {
        type: 'boolean',
        title: 'Enable CI/CD',
        description: 'Enable continuous integration and deployment',
        default: true,
      },
    ],
    [CapabilityMaturity.L3_OPERATIONS]: [
      {
        type: 'string',
        title: 'Component Name',
        description: 'Name of the component',
        pattern: '^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$',
      },
      {
        type: 'string',
        title: 'Description',
        description: 'Help others understand what this component is for',
      },
      {
        type: 'string',
        title: 'Environment',
        description: 'Deployment environment',
        enum: ['development', 'staging', 'production'],
        default: 'development',
      },
      {
        type: 'boolean',
        title: 'Enable Monitoring',
        description: 'Enable monitoring and observability',
        default: true,
      },
      {
        type: 'boolean',
        title: 'Enable Auto-scaling',
        description: 'Enable automatic scaling based on metrics',
        default: false,
      },
    ],
    [CapabilityMaturity.L4_GOVERNANCE]: [
      {
        type: 'string',
        title: 'Component Name',
        description: 'Name of the component',
        pattern: '^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$',
      },
      {
        type: 'string',
        title: 'Description',
        description: 'Help others understand what this component is for',
      },
      {
        type: 'string',
        title: 'Security Level',
        description: 'Security classification level',
        enum: ['public', 'internal', 'confidential', 'restricted'],
        default: 'internal',
      },
      {
        type: 'string',
        title: 'Data Classification',
        description: 'Data classification level',
        enum: ['public', 'internal', 'confidential', 'restricted'],
        default: 'internal',
      },
      {
        type: 'boolean',
        title: 'Compliance Required',
        description: 'Requires compliance validation',
        default: true,
      },
    ],
    [CapabilityMaturity.L5_INTENT_DRIVEN]: [
      {
        type: 'string',
        title: 'Intent Description',
        description: 'High-level description of what you want to achieve',
      },
      {
        type: 'string',
        title: 'Business Outcome',
        description: 'Expected business outcome or value',
      },
      {
        type: 'array',
        title: 'Success Criteria',
        description: 'Measurable success criteria',
        'ui:field': 'MultilineText',
      },
      {
        type: 'boolean',
        title: 'Auto-optimize',
        description: 'Enable automatic optimization based on metrics',
        default: true,
      },
    ],
  };

  async generateBackstageYaml(spec: TemplateSpec): Promise<string> {
    const backstageTemplate = this.buildBackstageTemplate(spec);
    return yaml.stringify(backstageTemplate, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
    });
  }

  private buildBackstageTemplate(spec: TemplateSpec): BackstageTemplateYaml {
    const template: BackstageTemplateYaml = {
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: this.sanitizeName(spec.metadata.name),
        title: spec.metadata.description || spec.metadata.name,
        description: spec.metadata.description,
        tags: spec.metadata.tags || [],
        annotations: {
          'backstage.io/techdocs-ref': 'dir:.',
        },
      },
      spec: {
        owner: spec.metadata.owner || 'platform-team',
        type: this.determineTemplateType(spec),
        parameters: this.generateParameters(spec),
        steps: this.generateSteps(spec),
        output: this.generateOutput(spec),
      },
    };

    return template;
  }

  private generateParameters(spec: TemplateSpec): Array<{
    title: string;
    required?: string[];
    properties: Record<string, any>;
    dependencies?: Record<string, any>;
  }> {
    const parameters = [];

    // Basic information step
    const basicProperties: Record<string, ParameterField> = {
      name: {
        type: 'string',
        title: 'Name',
        description: 'Unique name of the component',
        pattern: '^[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]$',
        'ui:field': 'EntityNamePicker',
      },
      description: {
        type: 'string',
        title: 'Description',
        description: 'Help others understand what this component is for.',
        'ui:options': {
          rows: 5,
        },
      },
    };

    // Add maturity-specific parameters
    const maturityLevel = this.extractMaturityFromSpec(spec);
    const maturityParams = this.maturityParameters[maturityLevel] || [];

    maturityParams.forEach((param, index) => {
      if (!basicProperties[`param_${index}`]) {
        basicProperties[`param_${index}`] = param;
      }
    });

    // Add repository picker
    basicProperties.repoUrl = {
      type: 'string',
      title: 'Repository Location',
      'ui:field': 'RepoUrlPicker',
      'ui:options': {
        allowedHosts: ['github.com'],
      },
    };

    parameters.push({
      title: 'Provide basic information',
      required: ['name', 'description', 'repoUrl'],
      properties: basicProperties,
    });

    // Add configuration step if needed
    if (spec.parameters && Object.keys(spec.parameters).length > 0) {
      parameters.push({
        title: 'Configure component',
        properties: spec.parameters,
      });
    }

    return parameters;
  }

  private generateSteps(spec: TemplateSpec): Array<{
    id: string;
    name: string;
    action: string;
    input: Record<string, any>;
    if?: string;
  }> {
    const steps = [];

    // Determine phase and get default actions
    const phase = this.extractPhaseFromSpec(spec);
    const defaultActions =
      this.defaultActions[phase] ||
      this.defaultActions[DevelopmentPhase.FOUNDATION];

    // Fetch template step
    steps.push({
      id: 'fetch-base',
      name: 'Fetch Base',
      action: 'fetch:template',
      input: {
        url: './template',
        values: {
          name: '${{ parameters.name }}',
          description: '${{ parameters.description }}',
          destination: '${{ parameters.repoUrl | parseRepoUrl }}',
          owner: '${{ parameters.repoUrl | parseRepoUrl | pick("owner") }}',
        },
      },
    });

    // Add custom steps from spec
    if (spec.steps && spec.steps.length > 0) {
      spec.steps.forEach((step) => {
        steps.push({
          id: step.id,
          name: step.name,
          action: step.action,
          input: step.input,
          if: step.if,
        });
      });
    }

    // Publish to GitHub step
    if (defaultActions.includes('publish:github')) {
      steps.push({
        id: 'publish',
        name: 'Publish',
        action: 'publish:github',
        input: {
          allowedHosts: ['github.com'],
          description: 'This is ${{ parameters.name }}',
          repoUrl: '${{ parameters.repoUrl }}',
        },
      });
    }

    // Register in catalog step
    if (defaultActions.includes('catalog:register')) {
      steps.push({
        id: 'register',
        name: 'Register',
        action: 'catalog:register',
        input: {
          repoContentsUrl: '${{ steps.publish.output.repoContentsUrl }}',
          catalogInfoPath: '/catalog-info.yaml',
        },
      });
    }

    return steps;
  }

  private generateOutput(spec: TemplateSpec): {
    links?: Array<{
      title: string;
      url: string;
      icon?: string;
    }>;
    text?: Array<{
      title: string;
      content: string;
    }>;
  } {
    const output: any = {
      links: [
        {
          title: 'Repository',
          url: '${{ steps.publish.output.remoteUrl }}',
          icon: 'github',
        },
        {
          title: 'Open in catalog',
          icon: 'catalog',
          entityRef: '${{ steps.register.output.entityRef }}',
        },
      ],
    };

    // Add custom output from spec
    if (spec.output) {
      if (spec.output.links) {
        output.links.push(...spec.output.links);
      }
      if (spec.output.text) {
        output.text = spec.output.text;
      }
    }

    return output;
  }

  private determineTemplateType(spec: TemplateSpec): string {
    const tags = spec.metadata.tags || [];
    const description = spec.metadata.description.toLowerCase();

    if (tags.includes('service') || description.includes('service')) {
      return 'service';
    }
    if (
      tags.includes('website') ||
      description.includes('website') ||
      description.includes('frontend')
    ) {
      return 'website';
    }
    if (tags.includes('library') || description.includes('library')) {
      return 'library';
    }
    if (tags.includes('documentation') || description.includes('docs')) {
      return 'documentation';
    }

    return 'service'; // Default
  }

  private extractMaturityFromSpec(spec: TemplateSpec): CapabilityMaturity {
    // Try to extract from metadata or tags
    const tags = spec.metadata.tags || [];

    if (tags.includes('L5') || tags.includes('intent-driven')) {
      return CapabilityMaturity.L5_INTENT_DRIVEN;
    }
    if (tags.includes('L4') || tags.includes('governance')) {
      return CapabilityMaturity.L4_GOVERNANCE;
    }
    if (tags.includes('L3') || tags.includes('operations')) {
      return CapabilityMaturity.L3_OPERATIONS;
    }
    if (tags.includes('L2') || tags.includes('deployment')) {
      return CapabilityMaturity.L2_DEPLOYMENT;
    }

    return CapabilityMaturity.L1_GENERATION; // Default
  }

  private extractPhaseFromSpec(spec: TemplateSpec): DevelopmentPhase {
    const tags = spec.metadata.tags || [];

    if (tags.includes('intent-driven')) {
      return DevelopmentPhase.INTENT_DRIVEN;
    }
    if (tags.includes('governance')) {
      return DevelopmentPhase.GOVERNANCE;
    }
    if (tags.includes('operations')) {
      return DevelopmentPhase.OPERATIONALIZATION;
    }
    if (tags.includes('standards')) {
      return DevelopmentPhase.STANDARDIZATION;
    }

    return DevelopmentPhase.FOUNDATION; // Default
  }

  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  // Utility methods for validation and enhancement
  validateYamlStructure(yamlContent: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const parsed = yaml.parse(yamlContent);

      // Validate required fields
      if (!parsed.apiVersion) {
        errors.push('Missing required field: apiVersion');
      }
      if (!parsed.kind || parsed.kind !== 'Template') {
        errors.push('Missing or invalid kind field (must be "Template")');
      }
      if (!parsed.metadata?.name) {
        errors.push('Missing required field: metadata.name');
      }
      if (!parsed.spec?.parameters) {
        errors.push('Missing required field: spec.parameters');
      }
      if (!parsed.spec?.steps) {
        errors.push('Missing required field: spec.steps');
      }

      // Validate parameters structure
      if (parsed.spec?.parameters && !Array.isArray(parsed.spec.parameters)) {
        errors.push('spec.parameters must be an array');
      }

      // Validate steps structure
      if (parsed.spec?.steps && !Array.isArray(parsed.spec.steps)) {
        errors.push('spec.steps must be an array');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push(`Invalid YAML syntax: ${errorMessage}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  enhanceWithValidation(
    yamlContent: string,
    validationRules: ValidationRules
  ): string {
    const parsed = yaml.parse(yamlContent);

    // Add validation steps based on rules
    if (validationRules.security.length > 0) {
      parsed.spec.steps.push({
        id: 'security-validation',
        name: 'Security Validation',
        action: 'catalog:write',
        input: {
          entity: {
            metadata: {
              annotations: {
                'security.backstage.io/validated': 'true',
              },
            },
          },
        },
      });
    }

    if (validationRules.compliance.length > 0) {
      parsed.spec.steps.push({
        id: 'compliance-check',
        name: 'Compliance Check',
        action: 'catalog:write',
        input: {
          entity: {
            metadata: {
              annotations: {
                'compliance.backstage.io/validated': 'true',
              },
            },
          },
        },
      });
    }

    return yaml.stringify(parsed, {
      indent: 2,
      lineWidth: 120,
      minContentWidth: 0,
    });
  }
}
