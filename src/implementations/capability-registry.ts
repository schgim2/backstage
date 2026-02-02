/**
 * Capability Registry Implementation
 * Centralized registry for tracking IDP capabilities and their maturity
 */

import {
  Capability,
  CapabilityFilter,
  CapabilityMaturity,
  DevelopmentPhase,
  Improvement,
  Template,
  TemplateDisplayInfo,
  TemplateFilter,
  CompositionSuggestion,
  CustomizationOption,
  TemplateReusabilityAnalysis,
  TemplateConflict,
  ConflictResolution,
  MigrationPlan,
  MigrationPhase,
  DeprecationPlan,
  DeprecationNotification,
} from '../types/core';
import { CapabilityRegistry } from '../interfaces/capability-registry';

export class CapabilityRegistryImpl implements CapabilityRegistry {
  private capabilities: Map<string, Capability> = new Map();

  /**
   * Register a new capability in the registry
   */
  async registerCapability(capability: Capability): Promise<void> {
    if (this.capabilities.has(capability.id)) {
      throw new Error(`Capability with ID ${capability.id} already exists`);
    }

    // Validate capability structure
    this.validateCapability(capability);

    this.capabilities.set(capability.id, { ...capability });
  }

  /**
   * Get capabilities based on filter criteria
   */
  async getCapabilities(filter?: CapabilityFilter): Promise<Capability[]> {
    let capabilities = Array.from(this.capabilities.values());

    if (!filter) {
      return capabilities;
    }

    // Apply filters
    if (filter.maturityLevel) {
      capabilities = capabilities.filter(
        (cap) => cap.maturityLevel === filter.maturityLevel
      );
    }

    if (filter.phase) {
      capabilities = capabilities.filter((cap) => cap.phase === filter.phase);
    }

    if (filter.tags && filter.tags.length > 0) {
      // For now, skip tag filtering since templates don't have direct tags
      // This could be enhanced later by adding tags to templates or metadata
    }

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      capabilities = capabilities.filter((capability) => {
        return (
          capability.name.toLowerCase().includes(searchTerm) ||
          capability.description.toLowerCase().includes(searchTerm)
        );
      });
    }

    return capabilities;
  }

  /**
   * Update maturity level of a capability
   */
  async updateMaturity(
    capabilityId: string,
    level: CapabilityMaturity
  ): Promise<void> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    // Validate maturity progression
    this.validateMaturityProgression(capability.maturityLevel, level);

    capability.maturityLevel = level;
    this.capabilities.set(capabilityId, capability);
  }

  /**
   * Suggest improvements for a capability
   */
  async suggestImprovements(capabilityId: string): Promise<Improvement[]> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    const improvements: Improvement[] = [];

    // Suggest improvements based on current maturity level
    switch (capability.maturityLevel) {
      case CapabilityMaturity.L1_GENERATION:
        improvements.push({
          type: 'maturity',
          priority: 'high',
          description: 'Add deployment automation to reach L2 maturity',
          effort: 'medium',
        });
        break;

      case CapabilityMaturity.L2_DEPLOYMENT:
        improvements.push({
          type: 'maturity',
          priority: 'high',
          description: 'Implement comprehensive monitoring and alerting',
          effort: 'medium',
        });
        break;

      case CapabilityMaturity.L3_OPERATIONS:
        improvements.push({
          type: 'maturity',
          priority: 'medium',
          description: 'Add policy enforcement and compliance checks',
          effort: 'large',
        });
        break;

      case CapabilityMaturity.L4_GOVERNANCE:
        improvements.push({
          type: 'maturity',
          priority: 'low',
          description: 'Enable intent-driven automation and self-healing',
          effort: 'large',
        });
        break;

      case CapabilityMaturity.L5_INTENT_DRIVEN:
        improvements.push({
          type: 'performance',
          priority: 'low',
          description: 'Continuous optimization and evolution',
          effort: 'small',
        });
        break;
    }

    // Add general improvements based on capability analysis
    if (capability.dependencies.length > 5) {
      improvements.push({
        type: 'standards',
        priority: 'medium',
        description: 'Reduce dependency complexity',
        effort: 'medium',
      });
    }

    if (capability.templates.length === 0) {
      improvements.push({
        type: 'standards',
        priority: 'high',
        description: 'Add templates to capability',
        effort: 'small',
      });
    }

    return improvements;
  }

  /**
   * Search capabilities by name, description, or tags
   */
  async searchCapabilities(query: string): Promise<Capability[]> {
    const searchTerm = query.toLowerCase();
    const capabilities = Array.from(this.capabilities.values());

    return capabilities.filter((capability) => {
      // Search in name
      if (capability.name.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in description
      if (capability.description.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Search in template names and descriptions
      if (
        capability.templates.some(
          (template) =>
            template.name.toLowerCase().includes(searchTerm) ||
            template.description.toLowerCase().includes(searchTerm)
        )
      ) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get capability by ID
   */
  async getCapability(capabilityId: string): Promise<Capability | null> {
    const capability = this.capabilities.get(capabilityId);
    return capability ? { ...capability } : null;
  }

  /**
   * Update capability information
   */
  async updateCapability(
    capabilityId: string,
    updates: Partial<Capability>
  ): Promise<void> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    // Prevent ID changes
    if (updates.id && updates.id !== capabilityId) {
      throw new Error('Cannot change capability ID');
    }

    // Merge updates
    const updatedCapability = {
      ...capability,
      ...updates,
      id: capabilityId, // Ensure ID remains unchanged
    };

    // Validate updated capability
    this.validateCapability(updatedCapability);

    this.capabilities.set(capabilityId, updatedCapability);
  }

  /**
   * Delete capability from registry
   */
  async deleteCapability(capabilityId: string): Promise<void> {
    if (!this.capabilities.has(capabilityId)) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    // Check for dependencies
    const dependentCapabilities = Array.from(this.capabilities.values()).filter(
      (cap) => cap.dependencies.includes(capabilityId)
    );

    if (dependentCapabilities.length > 0) {
      const dependentNames = dependentCapabilities
        .map((cap) => cap.name)
        .join(', ');
      throw new Error(
        `Cannot delete capability ${capabilityId}. It is required by: ${dependentNames}`
      );
    }

    this.capabilities.delete(capabilityId);
  }

  /**
   * Get templates associated with a capability
   */
  async getCapabilityTemplates(capabilityId: string): Promise<Template[]> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    return capability.templates.map((template) => ({ ...template }));
  }

  /**
   * Add template to capability
   */
  async addTemplateToCapability(
    capabilityId: string,
    template: Template
  ): Promise<void> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability with ID ${capabilityId} not found`);
    }

    // Check for duplicate template IDs
    if (capability.templates.some((t) => t.id === template.id)) {
      throw new Error(
        `Template with ID ${template.id} already exists for capability ${capabilityId}`
      );
    }

    // Validate template
    this.validateTemplate(template);

    capability.templates.push({ ...template });
    this.capabilities.set(capabilityId, capability);
  }

  /**
   * Check for template conflicts
   */
  async checkTemplateConflicts(template: Template): Promise<Template[]> {
    const conflicts: Template[] = [];

    // Check all templates across all capabilities
    for (const capability of this.capabilities.values()) {
      for (const existingTemplate of capability.templates) {
        if (this.hasTemplateConflict(template, existingTemplate)) {
          conflicts.push({ ...existingTemplate });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get migration path for deprecated template
   */
  async getMigrationPath(templateId: string): Promise<string[]> {
    const migrationPath: string[] = [];

    // Find the deprecated template
    let deprecatedTemplate: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const template = capability.templates.find((t) => t.id === templateId);
      if (template) {
        deprecatedTemplate = template;
        break;
      }
    }

    if (!deprecatedTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Generate migration recommendations
    migrationPath.push(
      `1. Review current usage of template '${deprecatedTemplate.name}'`
    );
    migrationPath.push(
      `2. Identify alternative templates with similar functionality`
    );
    migrationPath.push(`3. Assess migration effort and impact`);
    migrationPath.push(`4. Plan phased migration approach`);
    migrationPath.push(`5. Execute migration with rollback plan`);
    migrationPath.push(`6. Remove deprecated template references`);
    migrationPath.push(`7. Update documentation and training materials`);

    return migrationPath;
  }

  // Template Discovery and Reuse Methods

  /**
   * Get detailed template information for display
   */
  async getTemplateDisplayInfo(
    templateId: string
  ): Promise<TemplateDisplayInfo> {
    // Find the template and its capability
    let foundTemplate: Template | null = null;
    let foundCapability: Capability | null = null;

    for (const capability of this.capabilities.values()) {
      const template = capability.templates.find((t) => t.id === templateId);
      if (template) {
        foundTemplate = template;
        foundCapability = capability;
        break;
      }
    }

    if (!foundTemplate || !foundCapability) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Generate usage examples
    const usageExamples = this.generateUsageExamples(
      foundTemplate,
      foundCapability
    );

    // Find similar templates
    const similarTemplates = await this.findSimilarTemplates(templateId, 0.6);

    // Generate composition suggestions
    const compositionSuggestions = await this.suggestTemplateComposition(
      templateId
    );

    return {
      template: { ...foundTemplate },
      capability: { ...foundCapability },
      usageExamples,
      similarTemplates,
      compositionSuggestions,
    };
  }

  /**
   * Get all templates across all capabilities for discovery
   */
  async getAllTemplates(
    filter?: TemplateFilter
  ): Promise<TemplateDisplayInfo[]> {
    const allTemplateInfo: TemplateDisplayInfo[] = [];

    for (const capability of this.capabilities.values()) {
      for (const template of capability.templates) {
        // Apply filters
        if (filter) {
          if (
            filter.maturityLevel &&
            template.metadata.maturityLevel !== filter.maturityLevel
          ) {
            continue;
          }
          if (filter.phase && template.metadata.phase !== filter.phase) {
            continue;
          }
          if (filter.capability && capability.id !== filter.capability) {
            continue;
          }
          if (filter.version && template.version !== filter.version) {
            continue;
          }
          if (filter.search) {
            const searchTerm = filter.search.toLowerCase();
            if (
              !template.name.toLowerCase().includes(searchTerm) &&
              !template.description.toLowerCase().includes(searchTerm) &&
              !capability.name.toLowerCase().includes(searchTerm)
            ) {
              continue;
            }
          }
        }

        // Generate display info for this template
        const usageExamples = this.generateUsageExamples(template, capability);
        const similarTemplates = await this.findSimilarTemplates(
          template.id,
          0.6
        );
        const compositionSuggestions = await this.suggestTemplateComposition(
          template.id
        );

        allTemplateInfo.push({
          template: { ...template },
          capability: { ...capability },
          usageExamples,
          similarTemplates,
          compositionSuggestions,
        });
      }
    }

    return allTemplateInfo;
  }

  /**
   * Suggest composition or extension for similar templates
   */
  async suggestTemplateComposition(
    templateId: string
  ): Promise<CompositionSuggestion[]> {
    const suggestions: CompositionSuggestion[] = [];

    // Find the template
    let sourceTemplate: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const template = capability.templates.find((t) => t.id === templateId);
      if (template) {
        sourceTemplate = template;
        break;
      }
    }

    if (!sourceTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Find similar templates for composition suggestions
    const similarTemplates = await this.findSimilarTemplates(templateId, 0.5);

    for (const similarTemplate of similarTemplates) {
      // Suggest extension if templates are very similar
      if (
        this.calculateTemplateSimilarity(sourceTemplate, similarTemplate) > 0.8
      ) {
        suggestions.push({
          type: 'extend',
          description: `Extend ${similarTemplate.name} instead of creating a new template`,
          targetTemplate: similarTemplate,
          benefits: [
            'Reuse existing proven patterns',
            'Reduce maintenance overhead',
            'Leverage existing documentation and examples',
          ],
          effort: 'small',
        });
      }

      // Suggest composition for complementary templates
      if (this.areTemplatesComplementary(sourceTemplate, similarTemplate)) {
        suggestions.push({
          type: 'compose',
          description: `Compose with ${similarTemplate.name} for enhanced functionality`,
          targetTemplate: similarTemplate,
          benefits: [
            'Combine strengths of both templates',
            'Create more comprehensive solution',
            'Reduce duplication across templates',
          ],
          effort: 'medium',
        });
      }

      // Suggest merge for highly overlapping templates
      if (
        this.calculateTemplateSimilarity(sourceTemplate, similarTemplate) > 0.9
      ) {
        suggestions.push({
          type: 'merge',
          description: `Consider merging with ${similarTemplate.name} to eliminate duplication`,
          targetTemplate: similarTemplate,
          benefits: [
            'Eliminate template duplication',
            'Simplify template catalog',
            'Reduce maintenance burden',
          ],
          effort: 'large',
        });
      }
    }

    return suggestions;
  }

  /**
   * Get customization options for a template
   */
  async getTemplateCustomizationOptions(
    templateId: string
  ): Promise<CustomizationOption[]> {
    // Find the template
    let template: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const foundTemplate = capability.templates.find(
        (t) => t.id === templateId
      );
      if (foundTemplate) {
        template = foundTemplate;
        break;
      }
    }

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const customizationOptions: CustomizationOption[] = [];

    // Generate common customization options based on template metadata
    customizationOptions.push({
      id: 'name',
      name: 'Component Name',
      description: 'Name of the component to be created',
      type: 'parameter',
      defaultValue: 'my-component',
      required: true,
    });

    customizationOptions.push({
      id: 'description',
      name: 'Component Description',
      description: 'Description of the component functionality',
      type: 'parameter',
      defaultValue: 'A new component created from template',
      required: true,
    });

    customizationOptions.push({
      id: 'owner',
      name: 'Component Owner',
      description: 'Team or individual responsible for the component',
      type: 'parameter',
      defaultValue: 'platform-team',
      required: true,
    });

    // Add template-specific customization options based on maturity level
    switch (template.metadata.maturityLevel) {
      case CapabilityMaturity.L1_GENERATION:
        customizationOptions.push({
          id: 'language',
          name: 'Programming Language',
          description: 'Primary programming language for the component',
          type: 'parameter',
          options: ['typescript', 'javascript', 'python', 'java', 'go'],
          required: true,
        });
        break;

      case CapabilityMaturity.L2_DEPLOYMENT:
        customizationOptions.push({
          id: 'deployment_strategy',
          name: 'Deployment Strategy',
          description: 'How the component should be deployed',
          type: 'parameter',
          options: ['kubernetes', 'docker', 'serverless', 'vm'],
          required: true,
        });
        break;

      case CapabilityMaturity.L3_OPERATIONS:
        customizationOptions.push({
          id: 'monitoring',
          name: 'Monitoring Configuration',
          description: 'Enable monitoring and alerting',
          type: 'parameter',
          defaultValue: true,
          required: false,
        });
        break;

      case CapabilityMaturity.L4_GOVERNANCE:
        customizationOptions.push({
          id: 'compliance_level',
          name: 'Compliance Level',
          description: 'Required compliance level for the component',
          type: 'parameter',
          options: ['basic', 'standard', 'strict'],
          defaultValue: 'standard',
          required: true,
        });
        break;

      case CapabilityMaturity.L5_INTENT_DRIVEN:
        customizationOptions.push({
          id: 'auto_scaling',
          name: 'Auto-scaling Configuration',
          description: 'Enable automatic scaling based on demand',
          type: 'parameter',
          defaultValue: true,
          required: false,
        });
        break;
    }

    // Add phase-specific customization options
    switch (template.metadata.phase) {
      case DevelopmentPhase.FOUNDATION:
        customizationOptions.push({
          id: 'repository_type',
          name: 'Repository Type',
          description: 'Type of repository to create',
          type: 'parameter',
          options: ['github', 'gitlab', 'bitbucket'],
          defaultValue: 'github',
          required: true,
        });
        break;

      case DevelopmentPhase.STANDARDIZATION:
        customizationOptions.push({
          id: 'architecture_pattern',
          name: 'Architecture Pattern',
          description: 'Architectural pattern to follow',
          type: 'parameter',
          options: ['microservice', 'monolith', 'serverless', 'event-driven'],
          required: true,
        });
        break;

      case DevelopmentPhase.OPERATIONALIZATION:
        customizationOptions.push({
          id: 'ci_cd_pipeline',
          name: 'CI/CD Pipeline',
          description: 'CI/CD pipeline configuration',
          type: 'step',
          options: ['github-actions', 'gitlab-ci', 'jenkins', 'azure-devops'],
          required: true,
        });
        break;
    }

    return customizationOptions;
  }

  /**
   * Analyze template reusability
   */
  async analyzeTemplateReusability(
    templateId: string
  ): Promise<TemplateReusabilityAnalysis> {
    // Find the template
    let template: Template | null = null;
    let capability: Capability | null = null;

    for (const cap of this.capabilities.values()) {
      const foundTemplate = cap.templates.find((t) => t.id === templateId);
      if (foundTemplate) {
        template = foundTemplate;
        capability = cap;
        break;
      }
    }

    if (!template || !capability) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Calculate reusability score based on various factors
    let reusabilityScore = 50; // Base score

    // Factor 1: Maturity level (higher maturity = more reusable)
    const maturityBonus = {
      [CapabilityMaturity.L1_GENERATION]: 0,
      [CapabilityMaturity.L2_DEPLOYMENT]: 10,
      [CapabilityMaturity.L3_OPERATIONS]: 20,
      [CapabilityMaturity.L4_GOVERNANCE]: 30,
      [CapabilityMaturity.L5_INTENT_DRIVEN]: 40,
    };
    reusabilityScore += maturityBonus[template.metadata.maturityLevel];

    // Factor 2: Template age (newer templates might be more reusable)
    const ageInDays =
      (Date.now() - template.metadata.created.getTime()) /
      (1000 * 60 * 60 * 24);
    if (ageInDays < 30) reusabilityScore += 10; // Very new
    else if (ageInDays < 90) reusabilityScore += 5; // Recent

    // Factor 3: Dependencies (fewer dependencies = more reusable)
    if (capability.dependencies.length === 0) reusabilityScore += 15;
    else if (capability.dependencies.length <= 2) reusabilityScore += 10;
    else if (capability.dependencies.length <= 5) reusabilityScore += 5;

    // Ensure score is within bounds
    reusabilityScore = Math.min(100, Math.max(0, reusabilityScore));

    // Generate strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvementSuggestions: string[] = [];

    if (template.metadata.maturityLevel >= CapabilityMaturity.L3_OPERATIONS) {
      strengths.push('High maturity level with operational best practices');
    } else {
      weaknesses.push('Lower maturity level may limit reusability');
      improvementSuggestions.push(
        'Consider advancing to higher maturity level'
      );
    }

    if (capability.dependencies.length <= 2) {
      strengths.push('Minimal dependencies make it easy to reuse');
    } else {
      weaknesses.push('High number of dependencies may complicate reuse');
      improvementSuggestions.push('Consider reducing dependency complexity');
    }

    if (template.description && template.description.length > 50) {
      strengths.push('Well-documented with clear description');
    } else {
      weaknesses.push('Limited documentation may hinder adoption');
      improvementSuggestions.push('Add more comprehensive documentation');
    }

    // Find compatible templates
    const compatibleTemplates = await this.findSimilarTemplates(
      templateId,
      0.3
    );

    return {
      template: { ...template },
      reusabilityScore,
      strengths,
      weaknesses,
      improvementSuggestions,
      compatibleTemplates,
    };
  }

  /**
   * Find similar templates based on functionality
   */
  async findSimilarTemplates(
    templateId: string,
    threshold: number = 0.7
  ): Promise<Template[]> {
    // Find the source template
    let sourceTemplate: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const template = capability.templates.find((t) => t.id === templateId);
      if (template) {
        sourceTemplate = template;
        break;
      }
    }

    if (!sourceTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const similarTemplates: Template[] = [];

    // Compare with all other templates
    for (const capability of this.capabilities.values()) {
      for (const template of capability.templates) {
        if (template.id === templateId) continue; // Skip self

        const similarity = this.calculateTemplateSimilarity(
          sourceTemplate,
          template
        );
        if (similarity >= threshold) {
          similarTemplates.push({ ...template });
        }
      }
    }

    // Sort by similarity (most similar first)
    similarTemplates.sort((a, b) => {
      const similarityA = this.calculateTemplateSimilarity(sourceTemplate!, a);
      const similarityB = this.calculateTemplateSimilarity(sourceTemplate!, b);
      return similarityB - similarityA;
    });

    return similarTemplates;
  }

  // Helper methods

  /**
   * Generate usage examples for a template
   */
  private generateUsageExamples(
    template: Template,
    capability: Capability
  ): string[] {
    const examples: string[] = [];

    // Basic usage example
    examples.push(`# Basic Usage
Use this template to create a new ${template.name.toLowerCase()}:

1. Navigate to Backstage Software Catalog
2. Click "Create Component"
3. Select "${template.name}" template
4. Fill in the required parameters:
   - Name: my-${template.name.toLowerCase().replace(/\s+/g, '-')}
   - Description: Brief description of your component
   - Owner: your-team
5. Click "Create" to generate the component`);

    // Advanced usage example based on maturity level
    if (template.metadata.maturityLevel >= CapabilityMaturity.L2_DEPLOYMENT) {
      examples.push(`# Advanced Usage with Deployment
This template includes deployment automation:

1. Follow basic usage steps above
2. Configure deployment settings:
   - Environment: development/staging/production
   - Deployment strategy: rolling/blue-green/canary
3. The template will automatically:
   - Set up CI/CD pipeline
   - Configure deployment manifests
   - Enable monitoring and logging`);
    }

    // Integration example
    if (capability.dependencies.length > 0) {
      examples.push(`# Integration with Dependencies
This template integrates with: ${capability.dependencies.join(', ')}

Ensure these dependencies are available in your environment:
${capability.dependencies
  .map((dep) => `- ${dep}: Check capability registry for setup instructions`)
  .join('\n')}`);
    }

    return examples;
  }

  /**
   * Calculate similarity between two templates
   */
  private calculateTemplateSimilarity(
    template1: Template,
    template2: Template
  ): number {
    let similarity = 0;
    let factors = 0;

    // Name similarity (using simple string comparison)
    const nameSimilarity = this.calculateStringSimilarity(
      template1.name,
      template2.name
    );
    similarity += nameSimilarity * 0.3;
    factors += 0.3;

    // Description similarity
    const descSimilarity = this.calculateStringSimilarity(
      template1.description,
      template2.description
    );
    similarity += descSimilarity * 0.4;
    factors += 0.4;

    // Maturity level similarity
    if (template1.metadata.maturityLevel === template2.metadata.maturityLevel) {
      similarity += 0.2;
    }
    factors += 0.2;

    // Phase similarity
    if (template1.metadata.phase === template2.metadata.phase) {
      similarity += 0.1;
    }
    factors += 0.1;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Calculate string similarity using simple algorithm
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate edit distance between two strings
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Check if two templates are complementary
   */
  private areTemplatesComplementary(
    template1: Template,
    template2: Template
  ): boolean {
    // Templates are complementary if they have different phases but similar maturity
    return (
      template1.metadata.phase !== template2.metadata.phase &&
      template1.metadata.maturityLevel === template2.metadata.maturityLevel
    );
  }

  /**
   * Validate capability structure
   */
  private validateCapability(capability: Capability): void {
    if (!capability.id || capability.id.trim() === '') {
      throw new Error('Capability ID is required');
    }

    if (!capability.name || capability.name.trim() === '') {
      throw new Error('Capability name is required');
    }

    if (!capability.description || capability.description.trim() === '') {
      throw new Error('Capability description is required');
    }

    const validMaturityLevels = Object.values(CapabilityMaturity);
    if (!validMaturityLevels.includes(capability.maturityLevel)) {
      throw new Error(`Invalid maturity level: ${capability.maturityLevel}`);
    }

    const validPhases = Object.values(DevelopmentPhase);
    if (!validPhases.includes(capability.phase)) {
      throw new Error(`Invalid phase: ${capability.phase}`);
    }
  }

  /**
   * Validate maturity progression
   */
  private validateMaturityProgression(
    currentLevel: CapabilityMaturity,
    newLevel: CapabilityMaturity
  ): void {
    const levels = Object.values(CapabilityMaturity);
    const currentIndex = levels.indexOf(currentLevel);
    const newIndex = levels.indexOf(newLevel);

    // Allow same level (no change) or progression
    if (newIndex < currentIndex) {
      throw new Error(
        `Cannot downgrade maturity from ${currentLevel} to ${newLevel}`
      );
    }

    // Allow skipping at most one level
    if (newIndex - currentIndex > 2) {
      throw new Error(
        `Cannot skip more than one maturity level. Current: ${currentLevel}, Target: ${newLevel}`
      );
    }
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: Template): void {
    if (!template.id || template.id.trim() === '') {
      throw new Error('Template ID is required');
    }

    if (!template.name || template.name.trim() === '') {
      throw new Error('Template name is required');
    }

    if (!template.description || template.description.trim() === '') {
      throw new Error('Template description is required');
    }

    if (!template.version || template.version.trim() === '') {
      throw new Error('Template version is required');
    }
  }

  /**
   * Check if two templates have conflicts
   */
  private hasTemplateConflict(
    template1: Template,
    template2: Template
  ): boolean {
    // Same ID is a conflict
    if (template1.id === template2.id) {
      return true;
    }

    // Same name might be a conflict
    if (template1.name === template2.name) {
      return true;
    }

    return false;
  }

  // Enhanced Conflict Resolution and Migration Methods

  /**
   * Detect comprehensive template conflicts
   */
  async detectTemplateConflicts(
    template: Template
  ): Promise<TemplateConflict[]> {
    const conflicts: TemplateConflict[] = [];

    // Check all templates across all capabilities
    for (const capability of this.capabilities.values()) {
      for (const existingTemplate of capability.templates) {
        // Skip self-comparison
        if (
          existingTemplate.id === template.id &&
          existingTemplate.name === template.name
        )
          continue;

        // ID conflict (critical)
        if (existingTemplate.id === template.id) {
          conflicts.push({
            type: 'id',
            severity: 'critical',
            description: `Template ID '${template.id}' already exists`,
            conflictingTemplate: { ...existingTemplate },
            affectedCapabilities: [capability.id],
          });
        }

        // Name conflict (high)
        if (existingTemplate.name === template.name) {
          conflicts.push({
            type: 'name',
            severity: 'high',
            description: `Template name '${template.name}' already exists`,
            conflictingTemplate: { ...existingTemplate },
            affectedCapabilities: [capability.id],
          });
        }

        // Functionality conflict (medium) - similar templates with high overlap
        const similarity = this.calculateTemplateSimilarity(
          template,
          existingTemplate
        );
        if (similarity > 0.85) {
          conflicts.push({
            type: 'functionality',
            severity: 'medium',
            description: `Template functionality overlaps significantly (${Math.round(
              similarity * 100
            )}%) with '${existingTemplate.name}'`,
            conflictingTemplate: { ...existingTemplate },
            affectedCapabilities: [capability.id],
          });
        }

        // Version conflict (low) - same name but different version
        if (
          existingTemplate.name === template.name &&
          existingTemplate.version !== template.version
        ) {
          conflicts.push({
            type: 'version',
            severity: 'low',
            description: `Version conflict: '${template.name}' exists with version ${existingTemplate.version}, new version is ${template.version}`,
            conflictingTemplate: { ...existingTemplate },
            affectedCapabilities: [capability.id],
          });
        }
      }
    }

    // Check for dependency conflicts
    const dependencyConflicts = this.detectDependencyConflicts(template);
    conflicts.push(...dependencyConflicts);

    return conflicts;
  }

  /**
   * Generate conflict resolution recommendations
   */
  async generateConflictResolutions(
    conflicts: TemplateConflict[]
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'id':
          resolutions.push({
            strategy: 'rename',
            description: `Rename template ID to avoid conflict`,
            steps: [
              `Generate unique ID for template (e.g., ${conflict.conflictingTemplate.id}-v2)`,
              'Update all references to use new ID',
              'Validate no other conflicts exist with new ID',
              'Update documentation and examples',
            ],
            impact: 'low',
            effort: 'small',
            risks: ['Potential confusion with similar IDs'],
            benefits: [
              'Resolves critical conflict',
              'Maintains both templates',
            ],
          });
          break;

        case 'name':
          resolutions.push({
            strategy: 'namespace',
            description: `Add namespace or prefix to template name`,
            steps: [
              `Add capability or domain prefix to template name`,
              'Update template metadata and documentation',
              'Ensure new name is descriptive and unique',
              'Update usage examples and references',
            ],
            impact: 'low',
            effort: 'small',
            risks: ['Longer template names may be less user-friendly'],
            benefits: ['Clear differentiation', 'Maintains both templates'],
          });
          break;

        case 'functionality':
          // Suggest merge for high similarity
          resolutions.push({
            strategy: 'merge',
            description: `Merge similar templates to eliminate duplication`,
            steps: [
              'Analyze differences between templates',
              'Create unified template with configurable options',
              'Migrate existing users to unified template',
              'Deprecate redundant template',
              'Update documentation and examples',
            ],
            impact: 'medium',
            effort: 'medium',
            risks: [
              'May increase template complexity',
              'Requires user migration',
              'Potential breaking changes',
            ],
            benefits: [
              'Eliminates duplication',
              'Reduces maintenance overhead',
              'Provides unified solution',
            ],
          });
          break;

        case 'version':
          resolutions.push({
            strategy: 'version',
            description: `Implement proper versioning strategy`,
            steps: [
              'Establish semantic versioning for templates',
              'Create version compatibility matrix',
              'Implement backward compatibility where possible',
              'Plan migration path for breaking changes',
              'Update template registry with version metadata',
            ],
            impact: 'medium',
            effort: 'medium',
            risks: ['Complexity in version management'],
            benefits: [
              'Clear evolution path',
              'Backward compatibility',
              'Professional versioning approach',
            ],
          });
          break;

        case 'dependency':
          resolutions.push({
            strategy: 'deprecate',
            description: `Deprecate conflicting dependency and migrate`,
            steps: [
              'Identify alternative dependencies',
              'Create migration plan for affected templates',
              'Implement gradual deprecation timeline',
              'Provide migration tools and documentation',
              'Monitor and support migration process',
            ],
            impact: 'high',
            effort: 'large',
            risks: [
              'May break existing implementations',
              'Requires coordinated migration',
              'Potential service disruption',
            ],
            benefits: [
              'Resolves dependency conflicts',
              'Modernizes template stack',
              'Improves long-term maintainability',
            ],
          });
          break;
      }
    }

    return resolutions;
  }

  /**
   * Create comprehensive migration plan
   */
  async createMigrationPlan(
    templateId: string,
    targetTemplateId?: string
  ): Promise<MigrationPlan> {
    // Find the source template
    let sourceTemplate: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const template = capability.templates.find((t) => t.id === templateId);
      if (template) {
        sourceTemplate = template;
        break;
      }
    }

    if (!sourceTemplate) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Find target template if specified
    let targetTemplate: Template | null = null;
    if (targetTemplateId) {
      for (const capability of this.capabilities.values()) {
        const template = capability.templates.find(
          (t) => t.id === targetTemplateId
        );
        if (template) {
          targetTemplate = template;
          break;
        }
      }

      if (!targetTemplate) {
        throw new Error(
          `Target template with ID ${targetTemplateId} not found`
        );
      }
    }

    // Determine migration strategy
    const strategy = this.determineMigrationStrategy(
      sourceTemplate,
      targetTemplate || undefined
    );

    // Create migration phases
    const phases = this.createMigrationPhases(
      sourceTemplate,
      targetTemplate || undefined,
      strategy
    );

    // Calculate estimated duration
    const estimatedDuration = this.calculateMigrationDuration(phases);

    // Generate dependencies
    const dependencies = this.identifyMigrationDependencies(
      sourceTemplate,
      targetTemplate || undefined
    );

    return {
      fromTemplate: { ...sourceTemplate },
      toTemplate: targetTemplate ? { ...targetTemplate } : undefined,
      strategy,
      phases,
      estimatedDuration,
      rollbackPlan: this.createRollbackPlan(
        sourceTemplate,
        targetTemplate || undefined
      ),
      dependencies,
      validationSteps: this.createValidationSteps(
        sourceTemplate,
        targetTemplate || undefined
      ),
    };
  }

  /**
   * Create deprecation plan for template
   */
  async createDeprecationPlan(
    templateId: string,
    reason: string,
    timelineMonths: number
  ): Promise<DeprecationPlan> {
    // Find the template
    let template: Template | null = null;
    for (const capability of this.capabilities.values()) {
      const foundTemplate = capability.templates.find(
        (t) => t.id === templateId
      );
      if (foundTemplate) {
        template = foundTemplate;
        break;
      }
    }

    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    const now = new Date();
    const deprecationDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    const endOfLifeDate = new Date(
      now.getTime() + timelineMonths * 30 * 24 * 60 * 60 * 1000
    );

    // Find replacement templates
    const replacementTemplates = await this.findReplacementTemplates(template);

    // Create migration plan
    const migrationPlan = await this.createMigrationPlan(
      templateId,
      replacementTemplates.length > 0 ? replacementTemplates[0].id : undefined
    );

    // Create notification schedule
    const notificationSchedule = this.createNotificationSchedule(
      deprecationDate,
      endOfLifeDate,
      template.name
    );

    return {
      template: { ...template },
      deprecationDate,
      endOfLifeDate,
      reason,
      replacementTemplates,
      migrationPlan,
      notificationSchedule,
      supportLevel: this.determineSupportLevel(timelineMonths),
    };
  }

  /**
   * Execute automated conflict resolution
   */
  async executeConflictResolution(
    templateId: string,
    resolutionStrategy: ConflictResolution
  ): Promise<void> {
    // Find the template
    let template: Template | null = null;
    let capability: Capability | null = null;

    for (const cap of this.capabilities.values()) {
      const foundTemplate = cap.templates.find((t) => t.id === templateId);
      if (foundTemplate) {
        template = foundTemplate;
        capability = cap;
        break;
      }
    }

    if (!template || !capability) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    switch (resolutionStrategy.strategy) {
      case 'rename':
        await this.executeRenameResolution(
          template,
          capability,
          resolutionStrategy
        );
        break;
      case 'namespace':
        await this.executeNamespaceResolution(
          template,
          capability,
          resolutionStrategy
        );
        break;
      case 'merge':
        await this.executeMergeResolution(
          template,
          capability,
          resolutionStrategy
        );
        break;
      case 'version':
        await this.executeVersionResolution(
          template,
          capability,
          resolutionStrategy
        );
        break;
      case 'deprecate':
        await this.executeDeprecateResolution(
          template,
          capability,
          resolutionStrategy
        );
        break;
      default:
        throw new Error(
          `Unknown resolution strategy: ${resolutionStrategy.strategy}`
        );
    }
  }

  /**
   * Execute migration phase
   */
  async executeMigrationPhase(
    migrationPlan: MigrationPlan,
    phaseId: string
  ): Promise<void> {
    const phase = migrationPlan.phases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Migration phase with ID ${phaseId} not found`);
    }

    // Validate prerequisites
    await this.validateMigrationPrerequisites(phase);

    // Execute phase steps
    for (const step of phase.steps) {
      await this.executeMigrationStep(step, migrationPlan);
    }

    // Validate phase completion
    await this.validateMigrationPhase(phase, migrationPlan);
  }

  // Helper methods for conflict resolution and migration

  /**
   * Detect dependency conflicts
   */
  private detectDependencyConflicts(template: Template): TemplateConflict[] {
    const conflicts: TemplateConflict[] = [];

    // Find capability containing this template
    for (const capability of this.capabilities.values()) {
      // Check if any dependencies conflict with existing templates
      for (const dependency of capability.dependencies) {
        const dependentCapability = this.capabilities.get(dependency);
        if (!dependentCapability) {
          conflicts.push({
            type: 'dependency',
            severity: 'high',
            description: `Missing dependency: ${dependency}`,
            conflictingTemplate: template,
            affectedCapabilities: [capability.id],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Determine migration strategy
   */
  private determineMigrationStrategy(
    sourceTemplate: Template,
    targetTemplate?: Template
  ): 'direct' | 'phased' | 'parallel' | 'gradual' {
    if (!targetTemplate) {
      return 'gradual'; // Deprecation without replacement
    }

    const similarity = this.calculateTemplateSimilarity(
      sourceTemplate,
      targetTemplate
    );

    if (similarity > 0.8) {
      return 'direct'; // Very similar, direct migration
    } else if (similarity > 0.5) {
      return 'phased'; // Moderate similarity, phased approach
    } else {
      return 'parallel'; // Low similarity, run in parallel
    }
  }

  /**
   * Create migration phases
   */
  private createMigrationPhases(
    sourceTemplate: Template,
    targetTemplate: Template | undefined,
    strategy: 'direct' | 'phased' | 'parallel' | 'gradual'
  ): MigrationPhase[] {
    const phases: MigrationPhase[] = [];

    switch (strategy) {
      case 'direct':
        phases.push({
          id: 'preparation',
          name: 'Migration Preparation',
          description: 'Prepare for direct migration',
          duration: '1 week',
          prerequisites: [
            'Backup existing implementations',
            'Notify stakeholders',
          ],
          steps: [
            'Analyze current template usage',
            'Identify all dependent services',
            'Create migration scripts',
            'Set up monitoring for migration',
          ],
          validationCriteria: [
            'All dependencies identified',
            'Migration scripts tested',
            'Rollback plan validated',
          ],
          rollbackSteps: [
            'Restore from backup',
            'Revert configuration changes',
          ],
        });

        phases.push({
          id: 'execution',
          name: 'Direct Migration',
          description: 'Execute direct migration to new template',
          duration: '3 days',
          prerequisites: [
            'Preparation phase completed',
            'Stakeholder approval',
          ],
          steps: [
            'Execute migration scripts',
            'Update all references',
            'Validate new implementations',
            'Update documentation',
          ],
          validationCriteria: [
            'All services migrated successfully',
            'No functionality regression',
            'Performance metrics maintained',
          ],
          rollbackSteps: [
            'Execute rollback scripts',
            'Restore original template',
          ],
        });
        break;

      case 'phased':
        phases.push({
          id: 'pilot',
          name: 'Pilot Migration',
          description: 'Migrate a subset of services as pilot',
          duration: '2 weeks',
          prerequisites: [
            'Pilot services identified',
            'Migration plan approved',
          ],
          steps: [
            'Select pilot services',
            'Migrate pilot services',
            'Monitor pilot performance',
            'Gather feedback and adjust',
          ],
          validationCriteria: [
            'Pilot services working correctly',
            'No critical issues identified',
            'Stakeholder feedback positive',
          ],
          rollbackSteps: ['Revert pilot services', 'Document lessons learned'],
        });

        phases.push({
          id: 'gradual-rollout',
          name: 'Gradual Rollout',
          description: 'Gradually migrate remaining services',
          duration: '4 weeks',
          prerequisites: ['Pilot phase successful', 'Issues resolved'],
          steps: [
            'Migrate services in batches',
            'Monitor each batch',
            'Address issues as they arise',
            'Update documentation continuously',
          ],
          validationCriteria: [
            'All services migrated',
            'System stability maintained',
            'User satisfaction maintained',
          ],
          rollbackSteps: [
            'Batch rollback procedures',
            'Incident response plan',
          ],
        });
        break;

      case 'parallel':
        phases.push({
          id: 'parallel-setup',
          name: 'Parallel Environment Setup',
          description: 'Set up new template alongside existing',
          duration: '1 week',
          prerequisites: [
            'Infrastructure capacity available',
            'Approval obtained',
          ],
          steps: [
            'Deploy new template infrastructure',
            'Configure parallel environment',
            'Set up data synchronization',
            'Implement traffic routing',
          ],
          validationCriteria: [
            'Parallel environment operational',
            'Data sync working correctly',
            'Traffic routing configured',
          ],
          rollbackSteps: [
            'Shut down parallel environment',
            'Remove routing rules',
          ],
        });

        phases.push({
          id: 'traffic-migration',
          name: 'Traffic Migration',
          description: 'Gradually shift traffic to new template',
          duration: '3 weeks',
          prerequisites: [
            'Parallel environment validated',
            'Monitoring in place',
          ],
          steps: [
            'Start with 10% traffic',
            'Monitor and validate',
            'Increase to 50% traffic',
            'Complete migration to 100%',
          ],
          validationCriteria: [
            'All traffic migrated',
            'Performance metrics met',
            'No data loss occurred',
          ],
          rollbackSteps: ['Revert traffic routing', 'Validate original system'],
        });
        break;

      case 'gradual':
        phases.push({
          id: 'deprecation-announcement',
          name: 'Deprecation Announcement',
          description: 'Announce template deprecation',
          duration: '1 week',
          prerequisites: [
            'Deprecation plan approved',
            'Communication plan ready',
          ],
          steps: [
            'Send deprecation notices',
            'Update documentation',
            'Provide migration guidance',
            'Set up support channels',
          ],
          validationCriteria: [
            'All stakeholders notified',
            'Documentation updated',
            'Support channels active',
          ],
          rollbackSteps: ['Retract deprecation notice', 'Restore full support'],
        });

        phases.push({
          id: 'support-reduction',
          name: 'Support Reduction',
          description: 'Gradually reduce support for deprecated template',
          duration: '8 weeks',
          prerequisites: [
            'Grace period elapsed',
            'Migration alternatives provided',
          ],
          steps: [
            'Reduce to maintenance-only support',
            'Stop feature development',
            'Provide security updates only',
            'Final migration assistance',
          ],
          validationCriteria: [
            'Support level clearly communicated',
            'Security updates maintained',
            'Migration assistance provided',
          ],
          rollbackSteps: ['Restore full support', 'Resume development'],
        });
        break;
    }

    return phases;
  }

  /**
   * Calculate migration duration
   */
  private calculateMigrationDuration(phases: MigrationPhase[]): string {
    // Simple duration calculation - in real implementation, this would be more sophisticated
    const totalWeeks = phases.reduce((total, phase) => {
      const weeks = parseInt(phase.duration.split(' ')[0]) || 1;
      return total + weeks;
    }, 0);

    if (totalWeeks <= 4) {
      return `${totalWeeks} weeks`;
    } else {
      const months = Math.ceil(totalWeeks / 4);
      return `${months} months`;
    }
  }

  /**
   * Identify migration dependencies
   */
  private identifyMigrationDependencies(
    sourceTemplate: Template,
    targetTemplate?: Template
  ): string[] {
    const dependencies: string[] = [];

    // Add common migration dependencies
    dependencies.push('Stakeholder approval');
    dependencies.push('Infrastructure capacity');
    dependencies.push('Backup and recovery procedures');
    dependencies.push('Monitoring and alerting setup');

    // Add template-specific dependencies
    if (targetTemplate) {
      dependencies.push(`Target template ${targetTemplate.id} available`);
      dependencies.push('Migration scripts tested');
      dependencies.push('Compatibility validation completed');
    }

    // Add maturity-level specific dependencies
    if (
      sourceTemplate.metadata.maturityLevel >= CapabilityMaturity.L3_OPERATIONS
    ) {
      dependencies.push('Operational runbooks updated');
      dependencies.push('SLA impact assessment completed');
    }

    if (
      sourceTemplate.metadata.maturityLevel >= CapabilityMaturity.L4_GOVERNANCE
    ) {
      dependencies.push('Compliance review completed');
      dependencies.push('Security assessment approved');
    }

    return dependencies;
  }

  /**
   * Create rollback plan
   */
  private createRollbackPlan(
    sourceTemplate: Template,
    targetTemplate?: Template
  ): string[] {
    const rollbackPlan: string[] = [];

    rollbackPlan.push('1. Immediately stop migration process');
    rollbackPlan.push('2. Assess current state and identify affected services');
    rollbackPlan.push('3. Execute rollback scripts to restore original state');
    rollbackPlan.push('4. Validate all services are functioning correctly');
    rollbackPlan.push('5. Notify stakeholders of rollback completion');
    rollbackPlan.push('6. Conduct post-incident review');
    rollbackPlan.push('7. Document lessons learned and update migration plan');

    if (targetTemplate) {
      rollbackPlan.push(
        '8. Preserve target template for future migration attempts'
      );
    }

    return rollbackPlan;
  }

  /**
   * Create validation steps
   */
  private createValidationSteps(
    sourceTemplate: Template,
    targetTemplate?: Template
  ): string[] {
    const validationSteps: string[] = [];

    validationSteps.push('Validate all services are operational');
    validationSteps.push(
      'Check performance metrics are within acceptable ranges'
    );
    validationSteps.push('Verify data integrity and consistency');
    validationSteps.push('Confirm security controls are functioning');
    validationSteps.push('Test critical user workflows');
    validationSteps.push('Validate monitoring and alerting');

    if (targetTemplate) {
      validationSteps.push(
        `Confirm new template ${targetTemplate.id} is functioning correctly`
      );
      validationSteps.push('Validate feature parity with original template');
    }

    return validationSteps;
  }

  /**
   * Find replacement templates
   */
  private async findReplacementTemplates(
    template: Template
  ): Promise<Template[]> {
    const replacements: Template[] = [];

    // Find similar templates that could serve as replacements
    const similarTemplates = await this.findSimilarTemplates(template.id, 0.5);

    // Filter for templates with same or higher maturity level
    for (const similarTemplate of similarTemplates) {
      const maturityLevels = Object.values(CapabilityMaturity);
      const currentIndex = maturityLevels.indexOf(
        template.metadata.maturityLevel
      );
      const similarIndex = maturityLevels.indexOf(
        similarTemplate.metadata.maturityLevel
      );

      if (similarIndex >= currentIndex) {
        replacements.push(similarTemplate);
      }
    }

    return replacements;
  }

  /**
   * Create notification schedule
   */
  private createNotificationSchedule(
    deprecationDate: Date,
    endOfLifeDate: Date,
    templateName: string
  ): DeprecationNotification[] {
    const notifications: DeprecationNotification[] = [];

    // Initial announcement
    notifications.push({
      date: deprecationDate,
      type: 'announcement',
      channels: ['email', 'slack', 'documentation'],
      message: `Template '${templateName}' has been deprecated. Please plan migration to alternative templates.`,
    });

    // Warning at 50% of timeline
    const warningDate = new Date(
      deprecationDate.getTime() +
        (endOfLifeDate.getTime() - deprecationDate.getTime()) * 0.5
    );
    notifications.push({
      date: warningDate,
      type: 'warning',
      channels: ['email', 'slack'],
      message: `Reminder: Template '${templateName}' will reach end-of-life soon. Please complete migration.`,
    });

    // Final notice 2 weeks before end-of-life
    const finalNoticeDate = new Date(
      endOfLifeDate.getTime() - 14 * 24 * 60 * 60 * 1000
    );
    notifications.push({
      date: finalNoticeDate,
      type: 'final-notice',
      channels: ['email', 'slack', 'dashboard'],
      message: `Final notice: Template '${templateName}' will be removed in 2 weeks. Immediate action required.`,
    });

    return notifications;
  }

  /**
   * Determine support level based on timeline
   */
  private determineSupportLevel(
    timelineMonths: number
  ): 'full' | 'maintenance' | 'security-only' | 'none' {
    if (timelineMonths >= 12) {
      return 'full';
    } else if (timelineMonths >= 6) {
      return 'maintenance';
    } else if (timelineMonths >= 2) {
      return 'security-only';
    } else {
      return 'none';
    }
  }

  // Resolution execution methods

  /**
   * Execute rename resolution
   */
  private async executeRenameResolution(
    template: Template,
    capability: Capability,
    resolution: ConflictResolution
  ): Promise<void> {
    // Generate new unique ID
    const newId = `${template.id}-v2`;

    // Update template ID
    template.id = newId;

    // Update in capability
    const templateIndex = capability.templates.findIndex(
      (t) => t.id === template.id
    );
    if (templateIndex >= 0) {
      capability.templates[templateIndex] = template;
      this.capabilities.set(capability.id, capability);
    }
  }

  /**
   * Execute namespace resolution
   */
  private async executeNamespaceResolution(
    template: Template,
    capability: Capability,
    resolution: ConflictResolution
  ): Promise<void> {
    // Add capability prefix to template name
    const newName = `${capability.name} - ${template.name}`;

    // Update template name
    template.name = newName;

    // Update in capability
    const templateIndex = capability.templates.findIndex(
      (t) => t.id === template.id
    );
    if (templateIndex >= 0) {
      capability.templates[templateIndex] = template;
      this.capabilities.set(capability.id, capability);
    }
  }

  /**
   * Execute merge resolution
   */
  private async executeMergeResolution(
    template: Template,
    capability: Capability,
    resolution: ConflictResolution
  ): Promise<void> {
    // This would involve complex template merging logic
    // For now, we'll mark the template as merged
    template.description += ' (Merged template)';

    // Update in capability
    const templateIndex = capability.templates.findIndex(
      (t) => t.id === template.id
    );
    if (templateIndex >= 0) {
      capability.templates[templateIndex] = template;
      this.capabilities.set(capability.id, capability);
    }
  }

  /**
   * Execute version resolution
   */
  private async executeVersionResolution(
    template: Template,
    capability: Capability,
    resolution: ConflictResolution
  ): Promise<void> {
    // Update version with semantic versioning
    const versionParts = template.version.split('.');
    const majorVersion = parseInt(versionParts[0]) || 1;
    template.version = `${majorVersion + 1}.0.0`;

    // Update in capability
    const templateIndex = capability.templates.findIndex(
      (t) => t.id === template.id
    );
    if (templateIndex >= 0) {
      capability.templates[templateIndex] = template;
      this.capabilities.set(capability.id, capability);
    }
  }

  /**
   * Execute deprecate resolution
   */
  private async executeDeprecateResolution(
    template: Template,
    capability: Capability,
    resolution: ConflictResolution
  ): Promise<void> {
    // Mark template as deprecated
    template.description += ' (DEPRECATED)';

    // Update in capability
    const templateIndex = capability.templates.findIndex(
      (t) => t.id === template.id
    );
    if (templateIndex >= 0) {
      capability.templates[templateIndex] = template;
      this.capabilities.set(capability.id, capability);
    }
  }

  /**
   * Validate migration prerequisites
   */
  private async validateMigrationPrerequisites(
    phase: MigrationPhase
  ): Promise<void> {
    // In a real implementation, this would check actual prerequisites
    // For now, we'll just validate the structure
    if (phase.prerequisites.length === 0) {
      throw new Error(`Phase ${phase.id} has no prerequisites defined`);
    }
  }

  /**
   * Execute migration step
   */
  private async executeMigrationStep(
    step: string,
    migrationPlan: MigrationPlan
  ): Promise<void> {
    // In a real implementation, this would execute actual migration steps
    // For now, we'll just log the step
    console.log(`Executing migration step: ${step}`);
  }

  /**
   * Validate migration phase
   */
  private async validateMigrationPhase(
    phase: MigrationPhase,
    migrationPlan: MigrationPlan
  ): Promise<void> {
    // In a real implementation, this would validate phase completion
    // For now, we'll just check that validation criteria exist
    if (phase.validationCriteria.length === 0) {
      throw new Error(`Phase ${phase.id} has no validation criteria defined`);
    }
  }
}
