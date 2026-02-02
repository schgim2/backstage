/**
 * Template Generator Interface
 * Core component that produces Backstage template artifacts
 */

import {
  TemplateSpec,
  GeneratedTemplate,
  ValidationResult,
  TemplatePreview,
  SkeletonStructure,
  Documentation,
  ValidationRules,
} from '../types/core';

export interface TemplateGenerator {
  /**
   * Generate complete Backstage template from specification
   * @param spec Template specification
   * @returns Promise resolving to generated template artifacts
   */
  generateTemplate(spec: TemplateSpec): Promise<GeneratedTemplate>;

  /**
   * Validate generated template against organizational standards
   * @param template Generated template to validate
   * @returns Promise resolving to validation result
   */
  validateTemplate(template: GeneratedTemplate): Promise<ValidationResult>;

  /**
   * Generate preview of template before deployment
   * @param template Generated template
   * @returns Promise resolving to template preview
   */
  previewTemplate(template: GeneratedTemplate): Promise<TemplatePreview>;

  /**
   * Generate Backstage YAML configuration
   * @param spec Template specification
   * @returns Promise resolving to YAML string
   */
  generateBackstageYaml(spec: TemplateSpec): Promise<string>;

  /**
   * Generate skeleton repository structure
   * @param spec Template specification
   * @returns Promise resolving to skeleton structure
   */
  generateSkeleton(spec: TemplateSpec): Promise<SkeletonStructure>;

  /**
   * Generate validation logic for organizational standards
   * @param spec Template specification
   * @returns Promise resolving to validation rules
   */
  generateValidationLogic(spec: TemplateSpec): Promise<ValidationRules>;

  /**
   * Generate documentation (TechDocs, README, etc.)
   * @param spec Template specification
   * @returns Promise resolving to documentation
   */
  generateDocumentation(spec: TemplateSpec): Promise<Documentation>;

  /**
   * Ensure consistency across all generated artifacts
   * @param template Generated template
   * @returns Promise resolving to validation result for consistency
   */
  validateConsistency(template: GeneratedTemplate): Promise<ValidationResult>;
}
