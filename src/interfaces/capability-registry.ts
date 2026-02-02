/**
 * Capability Registry Interface
 * Centralized registry for tracking IDP capabilities and their maturity
 */

import {
  Capability,
  CapabilityFilter,
  CapabilityMaturity,
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

export interface CapabilityRegistry {
  /**
   * Register a new capability in the registry
   * @param capability Capability to register
   * @returns Promise resolving when capability is registered
   */
  registerCapability(capability: Capability): Promise<void>;

  /**
   * Get capabilities based on filter criteria
   * @param filter Optional filter criteria
   * @returns Promise resolving to array of matching capabilities
   */
  getCapabilities(filter?: CapabilityFilter): Promise<Capability[]>;

  /**
   * Update maturity level of a capability
   * @param capabilityId ID of capability to update
   * @param level New maturity level
   * @returns Promise resolving when maturity is updated
   */
  updateMaturity(
    capabilityId: string,
    level: CapabilityMaturity
  ): Promise<void>;

  /**
   * Suggest improvements for a capability
   * @param capabilityId ID of capability to analyze
   * @returns Promise resolving to array of improvement suggestions
   */
  suggestImprovements(capabilityId: string): Promise<Improvement[]>;

  /**
   * Search capabilities by name, description, or tags
   * @param query Search query
   * @returns Promise resolving to array of matching capabilities
   */
  searchCapabilities(query: string): Promise<Capability[]>;

  /**
   * Get capability by ID
   * @param capabilityId ID of capability to retrieve
   * @returns Promise resolving to capability or null if not found
   */
  getCapability(capabilityId: string): Promise<Capability | null>;

  /**
   * Update capability information
   * @param capabilityId ID of capability to update
   * @param updates Partial capability updates
   * @returns Promise resolving when capability is updated
   */
  updateCapability(
    capabilityId: string,
    updates: Partial<Capability>
  ): Promise<void>;

  /**
   * Delete capability from registry
   * @param capabilityId ID of capability to delete
   * @returns Promise resolving when capability is deleted
   */
  deleteCapability(capabilityId: string): Promise<void>;

  /**
   * Get templates associated with a capability
   * @param capabilityId ID of capability
   * @returns Promise resolving to array of templates
   */
  getCapabilityTemplates(capabilityId: string): Promise<Template[]>;

  /**
   * Add template to capability
   * @param capabilityId ID of capability
   * @param template Template to add
   * @returns Promise resolving when template is added
   */
  addTemplateToCapability(
    capabilityId: string,
    template: Template
  ): Promise<void>;

  /**
   * Check for template conflicts
   * @param template Template to check for conflicts
   * @returns Promise resolving to array of conflicting templates
   */
  checkTemplateConflicts(template: Template): Promise<Template[]>;

  /**
   * Get migration path for deprecated template
   * @param templateId ID of deprecated template
   * @returns Promise resolving to migration recommendations
   */
  getMigrationPath(templateId: string): Promise<string[]>;

  // Enhanced Conflict Resolution and Migration Methods

  /**
   * Detect comprehensive template conflicts
   * @param template Template to analyze for conflicts
   * @returns Promise resolving to detailed conflict analysis
   */
  detectTemplateConflicts(template: Template): Promise<TemplateConflict[]>;

  /**
   * Generate conflict resolution recommendations
   * @param conflicts Array of detected conflicts
   * @returns Promise resolving to resolution strategies
   */
  generateConflictResolutions(
    conflicts: TemplateConflict[]
  ): Promise<ConflictResolution[]>;

  /**
   * Create comprehensive migration plan
   * @param templateId ID of template to migrate from
   * @param targetTemplateId Optional ID of target template
   * @returns Promise resolving to detailed migration plan
   */
  createMigrationPlan(
    templateId: string,
    targetTemplateId?: string
  ): Promise<MigrationPlan>;

  /**
   * Create deprecation plan for template
   * @param templateId ID of template to deprecate
   * @param reason Reason for deprecation
   * @param timelineMonths Number of months until end of life
   * @returns Promise resolving to deprecation plan
   */
  createDeprecationPlan(
    templateId: string,
    reason: string,
    timelineMonths: number
  ): Promise<DeprecationPlan>;

  /**
   * Execute automated conflict resolution
   * @param templateId ID of template with conflicts
   * @param resolutionStrategy Strategy to apply
   * @returns Promise resolving when resolution is complete
   */
  executeConflictResolution(
    templateId: string,
    resolutionStrategy: ConflictResolution
  ): Promise<void>;

  /**
   * Execute migration phase
   * @param migrationPlan Migration plan to execute
   * @param phaseId ID of phase to execute
   * @returns Promise resolving when phase is complete
   */
  executeMigrationPhase(
    migrationPlan: MigrationPlan,
    phaseId: string
  ): Promise<void>;

  // Template Discovery and Reuse Methods

  /**
   * Get detailed template information for display
   * @param templateId ID of template to get display info for
   * @returns Promise resolving to template display information
   */
  getTemplateDisplayInfo(templateId: string): Promise<TemplateDisplayInfo>;

  /**
   * Get all templates across all capabilities for discovery
   * @param filter Optional filter criteria
   * @returns Promise resolving to array of templates with capability context
   */
  getAllTemplates(filter?: TemplateFilter): Promise<TemplateDisplayInfo[]>;

  /**
   * Suggest composition or extension for similar templates
   * @param templateId ID of template to analyze
   * @returns Promise resolving to composition suggestions
   */
  suggestTemplateComposition(
    templateId: string
  ): Promise<CompositionSuggestion[]>;

  /**
   * Get customization options for a template
   * @param templateId ID of template to get customization options for
   * @returns Promise resolving to available customization options
   */
  getTemplateCustomizationOptions(
    templateId: string
  ): Promise<CustomizationOption[]>;

  /**
   * Analyze template reusability
   * @param templateId ID of template to analyze
   * @returns Promise resolving to reusability analysis
   */
  analyzeTemplateReusability(
    templateId: string
  ): Promise<TemplateReusabilityAnalysis>;

  /**
   * Find similar templates based on functionality
   * @param templateId ID of template to find similar templates for
   * @param threshold Similarity threshold (0-1, default 0.7)
   * @returns Promise resolving to array of similar templates
   */
  findSimilarTemplates(
    templateId: string,
    threshold?: number
  ): Promise<Template[]>;
}
