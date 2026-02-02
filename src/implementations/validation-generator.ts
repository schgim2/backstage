/**
 * Validation Logic Generator
 * Generates validation rules for organizational standards enforcement
 */

import {
  TemplateSpec,
  ValidationRules,
  SecurityRule,
  ComplianceRule,
  StandardRule,
  CostRule,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

export class ValidationLogicGenerator {
  /**
   * Generate comprehensive validation rules for a template specification
   */
  async generateValidationLogic(spec: TemplateSpec): Promise<ValidationRules> {
    const securityRules = this.generateSecurityRules(spec);
    const complianceRules = this.generateComplianceRules(spec);
    const standardRules = this.generateStandardRules(spec);
    const costRules = this.generateCostRules(spec);

    return {
      security: securityRules,
      compliance: complianceRules,
      standards: standardRules,
      cost: costRules,
    };
  }

  /**
   * Generate security baseline rules
   */
  private generateSecurityRules(spec: TemplateSpec): SecurityRule[] {
    const rules: SecurityRule[] = [];

    // Basic security baseline rules
    rules.push({
      type: 'baseline',
      rule: 'All generated repositories must include .gitignore file',
      enforcement: 'block',
    });

    rules.push({
      type: 'baseline',
      rule: 'Secrets must not be hardcoded in template files',
      enforcement: 'block',
    });

    rules.push({
      type: 'baseline',
      rule: 'Default branch protection must be enabled',
      enforcement: 'warn',
    });

    // Access control rules
    rules.push({
      type: 'access',
      rule: 'Repository access must follow least privilege principle',
      enforcement: 'warn',
    });

    // Data classification rules based on template tags
    if (this.hasDataProcessing(spec)) {
      rules.push({
        type: 'classification',
        rule: 'Data processing templates must include data classification metadata',
        enforcement: 'block',
      });

      rules.push({
        type: 'classification',
        rule: 'PII handling must be documented and approved',
        enforcement: 'block',
      });
    }

    // API security rules
    if (this.isApiTemplate(spec)) {
      rules.push({
        type: 'baseline',
        rule: 'API endpoints must implement authentication',
        enforcement: 'block',
      });

      rules.push({
        type: 'baseline',
        rule: 'API rate limiting must be configured',
        enforcement: 'warn',
      });

      rules.push({
        type: 'baseline',
        rule: 'HTTPS must be enforced for all API endpoints',
        enforcement: 'block',
      });
    }

    // Container security rules
    if (this.isContainerTemplate(spec)) {
      rules.push({
        type: 'baseline',
        rule: 'Container images must use non-root user',
        enforcement: 'warn',
      });

      rules.push({
        type: 'baseline',
        rule: 'Container images must be scanned for vulnerabilities',
        enforcement: 'block',
      });
    }

    return rules;
  }

  /**
   * Generate compliance rules based on organizational requirements
   */
  private generateComplianceRules(spec: TemplateSpec): ComplianceRule[] {
    const rules: ComplianceRule[] = [];

    // General compliance rules
    rules.push({
      type: 'documentation',
      rule: 'All templates must include comprehensive README documentation',
      enforcement: 'block',
    });

    rules.push({
      type: 'licensing',
      rule: 'All generated code must include appropriate license headers',
      enforcement: 'warn',
    });

    rules.push({
      type: 'audit',
      rule: 'Template usage must be logged for audit purposes',
      enforcement: 'block',
    });

    // Maturity-specific compliance rules
    const maturityLevel = this.extractMaturityLevel(spec);
    if (
      maturityLevel === CapabilityMaturity.L4_GOVERNANCE ||
      maturityLevel === CapabilityMaturity.L5_INTENT_DRIVEN
    ) {
      rules.push({
        type: 'governance',
        rule: 'High maturity templates must undergo security review',
        enforcement: 'block',
      });

      rules.push({
        type: 'governance',
        rule: 'Policy violations must be automatically detected and reported',
        enforcement: 'block',
      });
    }

    // Data compliance rules
    if (this.hasDataProcessing(spec)) {
      rules.push({
        type: 'data_protection',
        rule: 'Data retention policies must be implemented',
        enforcement: 'block',
      });

      rules.push({
        type: 'data_protection',
        rule: 'Data encryption at rest must be enabled',
        enforcement: 'block',
      });
    }

    return rules;
  }

  /**
   * Generate coding and architectural standard rules
   */
  private generateStandardRules(spec: TemplateSpec): StandardRule[] {
    const rules: StandardRule[] = [];

    // General coding standards
    rules.push({
      type: 'code_quality',
      rule: 'All generated code must pass linting checks',
      enforcement: 'block',
    });

    rules.push({
      type: 'code_quality',
      rule: 'Code coverage must be at least 80%',
      enforcement: 'warn',
    });

    rules.push({
      type: 'code_quality',
      rule: 'All public functions must have documentation',
      enforcement: 'warn',
    });

    // Naming conventions
    rules.push({
      type: 'naming',
      rule: 'Repository names must follow kebab-case convention',
      enforcement: 'block',
    });

    rules.push({
      type: 'naming',
      rule: 'Component names must be descriptive and follow organizational patterns',
      enforcement: 'warn',
    });

    // Architecture standards
    rules.push({
      type: 'architecture',
      rule: 'Services must implement health check endpoints',
      enforcement: 'warn',
    });

    rules.push({
      type: 'architecture',
      rule: 'Configuration must be externalized from code',
      enforcement: 'block',
    });

    // Language-specific standards
    const language = this.detectLanguage(spec);
    if (language === 'typescript' || language === 'javascript') {
      rules.push({
        type: 'language_specific',
        rule: 'TypeScript strict mode must be enabled',
        enforcement: 'block',
      });

      rules.push({
        type: 'language_specific',
        rule: 'ESLint configuration must be included',
        enforcement: 'block',
      });
    }

    if (language === 'python') {
      rules.push({
        type: 'language_specific',
        rule: 'Python code must follow PEP 8 style guide',
        enforcement: 'block',
      });

      rules.push({
        type: 'language_specific',
        rule: 'Type hints must be used for all function signatures',
        enforcement: 'warn',
      });
    }

    // Testing standards
    rules.push({
      type: 'testing',
      rule: 'Unit tests must be included for all business logic',
      enforcement: 'warn',
    });

    rules.push({
      type: 'testing',
      rule: 'Integration tests must be provided for API endpoints',
      enforcement: 'warn',
    });

    return rules;
  }

  /**
   * Generate cost control and resource management rules
   */
  private generateCostRules(spec: TemplateSpec): CostRule[] {
    const rules: CostRule[] = [];

    // Resource limits
    rules.push({
      type: 'resource_limits',
      rule: 'Container memory limits must be specified',
      enforcement: 'warn',
    });

    rules.push({
      type: 'resource_limits',
      rule: 'CPU limits must be appropriate for workload type',
      enforcement: 'warn',
    });

    // Cloud resource rules
    if (this.isCloudTemplate(spec)) {
      rules.push({
        type: 'cloud_resources',
        rule: 'Auto-scaling policies must be configured',
        enforcement: 'warn',
      });

      rules.push({
        type: 'cloud_resources',
        rule: 'Resource tagging must include cost center information',
        enforcement: 'block',
      });

      rules.push({
        type: 'cloud_resources',
        rule: 'Unused resources must be automatically cleaned up',
        enforcement: 'warn',
      });
    }

    // Database cost controls
    if (this.hasDatabaseComponent(spec)) {
      rules.push({
        type: 'database',
        rule: 'Database connection pooling must be implemented',
        enforcement: 'warn',
      });

      rules.push({
        type: 'database',
        rule: 'Database backup retention must be optimized for cost',
        enforcement: 'warn',
      });
    }

    // Monitoring and alerting cost controls
    rules.push({
      type: 'monitoring',
      rule: 'Log retention periods must be cost-optimized',
      enforcement: 'warn',
    });

    rules.push({
      type: 'monitoring',
      rule: 'Metrics collection must be selective to avoid excessive costs',
      enforcement: 'warn',
    });

    return rules;
  }

  /**
   * Helper methods for template analysis
   */
  private hasDataProcessing(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    return (
      tags.some((tag) =>
        ['data', 'database', 'analytics', 'etl', 'pipeline'].includes(tag)
      ) ||
      description.includes('data') ||
      description.includes('database')
    );
  }

  private isApiTemplate(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    return (
      tags.some((tag) =>
        ['api', 'rest', 'graphql', 'service', 'backend'].includes(tag)
      ) ||
      description.includes('api') ||
      description.includes('service')
    );
  }

  private isContainerTemplate(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    return (
      tags.some((tag) =>
        ['docker', 'container', 'kubernetes', 'k8s'].includes(tag)
      ) ||
      description.includes('docker') ||
      description.includes('container')
    );
  }

  private isCloudTemplate(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    return (
      tags.some((tag) =>
        ['aws', 'azure', 'gcp', 'cloud', 'serverless', 'lambda'].includes(tag)
      ) ||
      description.includes('cloud') ||
      description.includes('aws')
    );
  }

  private hasDatabaseComponent(spec: TemplateSpec): boolean {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    return (
      tags.some((tag) =>
        [
          'database',
          'db',
          'sql',
          'nosql',
          'postgres',
          'mysql',
          'mongodb',
        ].includes(tag)
      ) ||
      description.includes('database') ||
      description.includes('db')
    );
  }

  private extractMaturityLevel(spec: TemplateSpec): CapabilityMaturity {
    // Extract maturity level from template metadata or infer from complexity
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());

    if (tags.includes('l5') || tags.includes('intent-driven')) {
      return CapabilityMaturity.L5_INTENT_DRIVEN;
    }
    if (tags.includes('l4') || tags.includes('governance')) {
      return CapabilityMaturity.L4_GOVERNANCE;
    }
    if (tags.includes('l3') || tags.includes('operations')) {
      return CapabilityMaturity.L3_OPERATIONS;
    }
    if (tags.includes('l2') || tags.includes('deployment')) {
      return CapabilityMaturity.L2_DEPLOYMENT;
    }

    return CapabilityMaturity.L1_GENERATION;
  }

  private detectLanguage(spec: TemplateSpec): string {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());
    const description = spec.metadata.description.toLowerCase();

    if (tags.includes('typescript') || description.includes('typescript')) {
      return 'typescript';
    }
    if (tags.includes('javascript') || description.includes('javascript')) {
      return 'javascript';
    }
    if (tags.includes('python') || description.includes('python')) {
      return 'python';
    }
    if (tags.includes('java') || description.includes('java')) {
      return 'java';
    }
    if (tags.includes('go') || description.includes('go')) {
      return 'go';
    }

    return 'unknown';
  }

  /**
   * Validate that generated rules are consistent and complete
   */
  async validateRules(rules: ValidationRules): Promise<boolean> {
    // Check that all rule categories have at least one rule
    if (rules.security.length === 0) {
      throw new Error('Security rules are required');
    }

    if (rules.standards.length === 0) {
      throw new Error('Standard rules are required');
    }

    // Check for conflicting rules
    const allRules = [
      ...rules.security,
      ...rules.compliance,
      ...rules.standards,
      ...rules.cost,
    ];

    const ruleTexts = allRules.map((rule) => rule.rule);
    const duplicates = ruleTexts.filter(
      (rule, index) => ruleTexts.indexOf(rule) !== index
    );

    if (duplicates.length > 0) {
      throw new Error(`Duplicate rules found: ${duplicates.join(', ')}`);
    }

    return true;
  }

  /**
   * Generate validation rules specific to organizational policies
   */
  async generateOrganizationalRules(
    organizationConfig: Record<string, unknown>
  ): Promise<ValidationRules> {
    // This would integrate with organizational policy systems
    // For now, return basic organizational rules
    return {
      security: [
        {
          type: 'baseline',
          rule: 'All code must be reviewed by at least one other developer',
          enforcement: 'block',
        },
      ],
      compliance: [
        {
          type: 'audit',
          rule: 'All changes must be tracked in audit log',
          enforcement: 'block',
        },
      ],
      standards: [
        {
          type: 'code_quality',
          rule: 'Code must follow organizational style guide',
          enforcement: 'block',
        },
      ],
      cost: [
        {
          type: 'resource_limits',
          rule: 'Resource usage must not exceed allocated budget',
          enforcement: 'warn',
        },
      ],
    };
  }
}
