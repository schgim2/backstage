/**
 * Intent Parser Implementation
 * Converts natural language descriptions into structured specifications
 */

import {
  ParsedIntent,
  ValidationResult,
  CapabilityMaturity,
  DevelopmentPhase,
  ValidationError,
  ValidationWarning,
} from '../types/core';
import { IntentParser } from '../interfaces/intent-parser';

export class NaturalLanguageIntentParser implements IntentParser {
  private readonly maturityKeywords: Record<string, CapabilityMaturity> = {
    // L1 - Generation keywords
    create: CapabilityMaturity.L1_GENERATION,
    generate: CapabilityMaturity.L1_GENERATION,
    scaffold: CapabilityMaturity.L1_GENERATION,
    template: CapabilityMaturity.L1_GENERATION,
    basic: CapabilityMaturity.L1_GENERATION,

    // L2 - Deployment keywords
    deploy: CapabilityMaturity.L2_DEPLOYMENT,
    deployment: CapabilityMaturity.L2_DEPLOYMENT,
    environment: CapabilityMaturity.L2_DEPLOYMENT,
    pipeline: CapabilityMaturity.L2_DEPLOYMENT,
    'ci/cd': CapabilityMaturity.L2_DEPLOYMENT,

    // L3 - Operations keywords
    monitor: CapabilityMaturity.L3_OPERATIONS,
    scale: CapabilityMaturity.L3_OPERATIONS,
    operate: CapabilityMaturity.L3_OPERATIONS,
    maintenance: CapabilityMaturity.L3_OPERATIONS,
    observability: CapabilityMaturity.L3_OPERATIONS,

    // L4 - Governance keywords
    policy: CapabilityMaturity.L4_GOVERNANCE,
    compliance: CapabilityMaturity.L4_GOVERNANCE,
    security: CapabilityMaturity.L4_GOVERNANCE,
    governance: CapabilityMaturity.L4_GOVERNANCE,
    audit: CapabilityMaturity.L4_GOVERNANCE,

    // L5 - Intent-driven keywords
    intent: CapabilityMaturity.L5_INTENT_DRIVEN,
    intelligent: CapabilityMaturity.L5_INTENT_DRIVEN,
    automated: CapabilityMaturity.L5_INTENT_DRIVEN,
    'self-healing': CapabilityMaturity.L5_INTENT_DRIVEN,
    adaptive: CapabilityMaturity.L5_INTENT_DRIVEN,
  };

  private readonly phaseKeywords: Record<string, DevelopmentPhase> = {
    // Foundation phase
    service: DevelopmentPhase.FOUNDATION,
    api: DevelopmentPhase.FOUNDATION,
    frontend: DevelopmentPhase.FOUNDATION,
    backend: DevelopmentPhase.FOUNDATION,
    database: DevelopmentPhase.FOUNDATION,

    // Standardization phase
    standard: DevelopmentPhase.STANDARDIZATION,
    architecture: DevelopmentPhase.STANDARDIZATION,
    pattern: DevelopmentPhase.STANDARDIZATION,
    composite: DevelopmentPhase.STANDARDIZATION,

    // Operationalization phase
    operational: DevelopmentPhase.OPERATIONALIZATION,
    automation: DevelopmentPhase.OPERATIONALIZATION,
    scaling: DevelopmentPhase.OPERATIONALIZATION,
    runbook: DevelopmentPhase.OPERATIONALIZATION,

    // Governance phase
    policy: DevelopmentPhase.GOVERNANCE,
    compliance: DevelopmentPhase.GOVERNANCE,
    governance: DevelopmentPhase.GOVERNANCE,
    security: DevelopmentPhase.GOVERNANCE,

    // Intent-driven phase
    intent: DevelopmentPhase.INTENT_DRIVEN,
    intelligent: DevelopmentPhase.INTENT_DRIVEN,
    'end-to-end': DevelopmentPhase.INTENT_DRIVEN,
    workflow: DevelopmentPhase.INTENT_DRIVEN,
  };

  private readonly requirementPatterns = [
    /(?:must|should|shall|need to|require[sd]?|want to)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
    /(?:it|the system|application)\s+(?:must|should|shall|needs to|requires?)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
    /(?:ability to|capable of|can)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
  ];

  private readonly constraintPatterns = [
    /(?:cannot|must not|should not|shall not|forbidden|prohibited)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
    /(?:limited to|restricted to|only)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
    /(?:within|under|maximum|minimum)\s+([^.]+?)(?:\s+and\s+|\.|$|,)/gi,
  ];

  async parseIntent(description: string): Promise<ParsedIntent> {
    const normalizedDescription = description.toLowerCase().trim();

    // Extract capability name from description
    const capability = this.extractCapabilityName(description);

    // Extract requirements using pattern matching
    const requirements = await this.extractRequirements(description);

    // Identify constraints
    const constraints = await this.identifyConstraints(description);

    // Determine maturity level based on keywords
    const maturityLevel = this.determineMaturityLevel(normalizedDescription);

    // Determine development phase
    const phase = this.determineDevelopmentPhase(normalizedDescription);

    return {
      capability,
      description: description.trim(),
      requirements,
      constraints,
      maturityLevel,
      phase,
    };
  }

  async validateIntent(intent: ParsedIntent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate capability name
    if (!intent.capability || intent.capability.trim().length === 0) {
      errors.push({
        code: 'MISSING_CAPABILITY',
        message: 'Capability name is required',
        severity: 'error',
      });
    }

    // Validate description
    if (!intent.description || intent.description.trim().length < 10) {
      errors.push({
        code: 'INSUFFICIENT_DESCRIPTION',
        message: 'Description must be at least 10 characters long',
        severity: 'error',
      });
    }

    // Validate requirements
    if (intent.requirements.length === 0) {
      warnings.push({
        code: 'NO_REQUIREMENTS',
        message:
          'No explicit requirements found. Consider adding specific requirements.',
        severity: 'warning',
      });
    }

    // Validate maturity level consistency
    if (
      intent.maturityLevel === CapabilityMaturity.L5_INTENT_DRIVEN &&
      intent.requirements.length < 3
    ) {
      warnings.push({
        code: 'MATURITY_MISMATCH',
        message:
          'L5 intent-driven capabilities typically require more detailed requirements',
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async refineIntent(
    intent: ParsedIntent,
    feedback: string
  ): Promise<ParsedIntent> {
    // Parse additional requirements from feedback
    const additionalRequirements = await this.extractRequirements(feedback);
    const additionalConstraints = await this.identifyConstraints(feedback);

    // Merge with existing intent
    const refinedIntent: ParsedIntent = {
      ...intent,
      requirements: [...intent.requirements, ...additionalRequirements],
      constraints: [...intent.constraints, ...additionalConstraints],
      description: `${intent.description}\n\nAdditional context: ${feedback}`,
    };

    // Re-evaluate maturity level and phase with new information
    const combinedText = `${intent.description} ${feedback}`.toLowerCase();
    refinedIntent.maturityLevel = this.determineMaturityLevel(combinedText);
    refinedIntent.phase = this.determineDevelopmentPhase(combinedText);

    return refinedIntent;
  }

  generateClarifyingQuestions(intent: Partial<ParsedIntent>): string[] {
    const questions: string[] = [];

    if (!intent.capability) {
      questions.push(
        'What is the main capability or feature you want to create?'
      );
    }

    if (!intent.requirements || intent.requirements.length === 0) {
      questions.push(
        'What specific requirements should this capability fulfill?'
      );
    }

    if (!intent.constraints || intent.constraints.length === 0) {
      questions.push('Are there any constraints or limitations to consider?');
    }

    if (intent.maturityLevel === CapabilityMaturity.L1_GENERATION) {
      questions.push(
        'Do you need deployment automation, or just basic generation?'
      );
    }

    if (intent.phase === DevelopmentPhase.FOUNDATION) {
      questions.push(
        'What type of service are you building? (backend, frontend, database, etc.)'
      );
    }

    // Add context-specific questions based on detected keywords
    const description = intent.description?.toLowerCase() || '';

    if (
      description.includes('api') &&
      !description.includes('authentication')
    ) {
      questions.push('Does this API require authentication and authorization?');
    }

    if (description.includes('database') && !description.includes('type')) {
      questions.push('What type of database do you need? (SQL, NoSQL, etc.)');
    }

    if (
      description.includes('frontend') &&
      !description.includes('framework')
    ) {
      questions.push(
        'Which frontend framework should be used? (React, Vue, Angular, etc.)'
      );
    }

    return questions;
  }

  async extractRequirements(description: string): Promise<string[]> {
    const requirements: string[] = [];

    for (const pattern of this.requirementPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const requirement = match[1].trim();
        if (requirement.length > 3 && !requirements.includes(requirement)) {
          requirements.push(requirement);
        }
      }
    }

    // Add implicit requirements based on keywords
    const lowerDescription = description.toLowerCase();

    if (lowerDescription.includes('api')) {
      requirements.push('Provide RESTful API endpoints');
    }

    if (lowerDescription.includes('database')) {
      requirements.push('Include database integration');
    }

    if (lowerDescription.includes('authentication')) {
      requirements.push('Implement authentication mechanism');
    }

    if (lowerDescription.includes('monitoring')) {
      requirements.push('Include monitoring and observability');
    }

    return requirements;
  }

  async identifyConstraints(
    description: string,
    organizationalContext?: Record<string, unknown>
  ): Promise<string[]> {
    const constraints: string[] = [];

    for (const pattern of this.constraintPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const constraint = match[1].trim();
        if (constraint.length > 3 && !constraints.includes(constraint)) {
          constraints.push(constraint);
        }
      }
    }

    // Add organizational constraints if provided
    if (organizationalContext) {
      if (organizationalContext.securityLevel === 'high') {
        constraints.push('Must comply with high security standards');
      }

      if (organizationalContext.cloudProvider) {
        constraints.push(
          `Must use ${organizationalContext.cloudProvider} cloud services`
        );
      }

      if (organizationalContext.dataClassification) {
        constraints.push(
          `Must handle ${organizationalContext.dataClassification} data classification`
        );
      }
    }

    return constraints;
  }

  private extractCapabilityName(description: string): string {
    // Try to extract a meaningful capability name from the description
    const words = description.split(/\s+/);

    // Look for action words followed by object words
    const actionWords = [
      'create',
      'build',
      'generate',
      'develop',
      'implement',
      'setup',
      'configure',
    ];
    const objectWords = [
      'service',
      'api',
      'application',
      'system',
      'component',
      'template',
      'pipeline',
    ];

    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i].toLowerCase().replace(/[^\w]/g, '');
      if (actionWords.includes(word)) {
        // Look for the next meaningful word
        for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
          const nextWord = words[j].toLowerCase().replace(/[^\w]/g, '');
          if (objectWords.includes(nextWord) || nextWord.length > 4) {
            return `${word}-${nextWord}`;
          }
        }
      }
    }

    // Fallback: use first few words
    return words
      .slice(0, 3)
      .join('-')
      .toLowerCase()
      .replace(/[^\w-]/g, '');
  }

  private determineMaturityLevel(description: string): CapabilityMaturity {
    const scores: Record<CapabilityMaturity, number> = {
      [CapabilityMaturity.L1_GENERATION]: 0,
      [CapabilityMaturity.L2_DEPLOYMENT]: 0,
      [CapabilityMaturity.L3_OPERATIONS]: 0,
      [CapabilityMaturity.L4_GOVERNANCE]: 0,
      [CapabilityMaturity.L5_INTENT_DRIVEN]: 0,
    };

    // Score based on keyword presence
    for (const [keyword, maturity] of Object.entries(this.maturityKeywords)) {
      if (description.includes(keyword)) {
        scores[maturity]++;
      }
    }

    // Find the maturity level with the highest score
    let maxScore = 0;
    let selectedMaturity = CapabilityMaturity.L1_GENERATION;

    for (const [maturity, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        selectedMaturity = maturity as CapabilityMaturity;
      }
    }

    return selectedMaturity;
  }

  private determineDevelopmentPhase(description: string): DevelopmentPhase {
    const scores: Record<DevelopmentPhase, number> = {
      [DevelopmentPhase.FOUNDATION]: 0,
      [DevelopmentPhase.STANDARDIZATION]: 0,
      [DevelopmentPhase.OPERATIONALIZATION]: 0,
      [DevelopmentPhase.GOVERNANCE]: 0,
      [DevelopmentPhase.INTENT_DRIVEN]: 0,
    };

    // Score based on keyword presence
    for (const [keyword, phase] of Object.entries(this.phaseKeywords)) {
      if (description.includes(keyword)) {
        scores[phase]++;
      }
    }

    // Find the phase with the highest score
    let maxScore = 0;
    let selectedPhase = DevelopmentPhase.FOUNDATION;

    for (const [phase, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        selectedPhase = phase as DevelopmentPhase;
      }
    }

    return selectedPhase;
  }
}
