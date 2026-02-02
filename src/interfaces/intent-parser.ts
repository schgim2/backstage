/**
 * Intent Parser Interface
 * Responsible for converting natural language descriptions into structured specifications
 */

import { ParsedIntent, ValidationResult } from '../types/core';

export interface IntentParser {
  /**
   * Parse natural language description into structured intent
   * @param description Natural language description of the desired capability
   * @returns Promise resolving to parsed intent structure
   */
  parseIntent(description: string): Promise<ParsedIntent>;

  /**
   * Validate parsed intent for completeness and consistency
   * @param intent Parsed intent to validate
   * @returns Promise resolving to validation result
   */
  validateIntent(intent: ParsedIntent): Promise<ValidationResult>;

  /**
   * Refine intent based on user feedback or additional information
   * @param intent Current parsed intent
   * @param feedback Additional feedback or clarification
   * @returns Promise resolving to refined intent
   */
  refineIntent(intent: ParsedIntent, feedback: string): Promise<ParsedIntent>;

  /**
   * Generate clarifying questions for incomplete specifications
   * @param intent Incomplete parsed intent
   * @returns Array of clarifying questions
   */
  generateClarifyingQuestions(intent: Partial<ParsedIntent>): string[];

  /**
   * Extract requirements from natural language description
   * @param description Natural language description
   * @returns Array of extracted requirements
   */
  extractRequirements(description: string): Promise<string[]>;

  /**
   * Identify organizational constraints from context
   * @param description Natural language description
   * @param organizationalContext Optional organizational context
   * @returns Array of identified constraints
   */
  identifyConstraints(
    description: string,
    organizationalContext?: Record<string, unknown>
  ): Promise<string[]>;
}
