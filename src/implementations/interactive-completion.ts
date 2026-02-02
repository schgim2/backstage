/**
 * Interactive Specification Completion
 * Handles clarifying questions and specification refinement
 */

import {
  ParsedIntent,
  CapabilityMaturity,
  DevelopmentPhase,
  ValidationResult,
} from '../types/core';

export interface InteractionContext {
  conversationHistory: ConversationTurn[];
  organizationalContext?: Record<string, unknown>;
  userPreferences?: UserPreferences;
}

export interface ConversationTurn {
  type: 'question' | 'answer' | 'clarification';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UserPreferences {
  preferredTechnologies?: string[];
  defaultMaturityLevel?: CapabilityMaturity;
  organizationStandards?: string[];
  communicationStyle?: 'detailed' | 'concise' | 'technical';
}

export interface CompletionSuggestion {
  field: keyof ParsedIntent;
  suggestion: string;
  confidence: number;
  reasoning: string;
}

export interface QuestionPriority {
  question: string;
  priority: 'high' | 'medium' | 'low';
  category:
    | 'capability'
    | 'requirements'
    | 'constraints'
    | 'technical'
    | 'organizational';
  followUp?: string[];
}

export class InteractiveSpecificationCompletion {
  private readonly questionTemplates: Record<string, string[]> = {
    capability: [
      'What is the main purpose of this capability?',
      'What problem does this solve for your organization?',
      'How would you describe this capability in one sentence?',
    ],
    requirements: [
      'What specific functionality must this capability provide?',
      'What are the key requirements this must fulfill?',
      'What should users be able to do with this capability?',
    ],
    constraints: [
      'Are there any technical limitations we should consider?',
      'What organizational policies must be followed?',
      'Are there any security or compliance requirements?',
    ],
    technical: [
      'What technologies or frameworks should be used?',
      'Are there any integration requirements?',
      'What are the performance expectations?',
    ],
    organizational: [
      'Who will be the primary users of this capability?',
      'How does this fit into your existing architecture?',
      'What is the expected timeline for implementation?',
    ],
  };

  private readonly maturityQuestions: Record<CapabilityMaturity, string[]> = {
    [CapabilityMaturity.L1_GENERATION]: [
      'Do you need just basic code generation, or also deployment capabilities?',
      'Should this include standard project structure and configuration?',
    ],
    [CapabilityMaturity.L2_DEPLOYMENT]: [
      'What environments should this deploy to?',
      'Do you need automated CI/CD pipeline integration?',
      'What deployment strategies should be supported?',
    ],
    [CapabilityMaturity.L3_OPERATIONS]: [
      'What operational concerns need to be addressed?',
      'Do you need monitoring and alerting capabilities?',
      'Should this include scaling and maintenance automation?',
    ],
    [CapabilityMaturity.L4_GOVERNANCE]: [
      'What governance policies need to be enforced?',
      'Are there specific compliance requirements?',
      'What security controls must be implemented?',
    ],
    [CapabilityMaturity.L5_INTENT_DRIVEN]: [
      'What high-level outcomes should this achieve automatically?',
      'How should the system adapt to changing requirements?',
      'What intelligence should be built into the automation?',
    ],
  };

  private readonly phaseQuestions: Record<DevelopmentPhase, string[]> = {
    [DevelopmentPhase.FOUNDATION]: [
      'What type of service or component is this? (API, frontend, database, etc.)',
      'What programming language or framework should be used?',
    ],
    [DevelopmentPhase.STANDARDIZATION]: [
      'What architectural patterns should be enforced?',
      'How should this integrate with existing standards?',
    ],
    [DevelopmentPhase.OPERATIONALIZATION]: [
      'What operational procedures need to be automated?',
      'How should this handle scaling and maintenance?',
    ],
    [DevelopmentPhase.GOVERNANCE]: [
      'What policies need to be automatically enforced?',
      'How should compliance be validated?',
    ],
    [DevelopmentPhase.INTENT_DRIVEN]: [
      'What should the end-to-end workflow accomplish?',
      'How should the system handle complex scenarios automatically?',
    ],
  };

  async generatePrioritizedQuestions(
    intent: Partial<ParsedIntent>,
    context?: InteractionContext
  ): Promise<QuestionPriority[]> {
    const questions: QuestionPriority[] = [];

    // High priority: Missing essential information
    if (!intent.capability || intent.capability.trim().length === 0) {
      questions.push({
        question: 'What is the main capability or feature you want to create?',
        priority: 'high',
        category: 'capability',
        followUp: [
          'What problem does this solve?',
          'Who are the primary users?',
        ],
      });
    }

    if (!intent.description || intent.description.trim().length < 20) {
      questions.push({
        question:
          'Can you provide more details about what this capability should do?',
        priority: 'high',
        category: 'capability',
        followUp: ['What are the key features?', 'How should it work?'],
      });
    }

    // Medium priority: Requirements and constraints
    if (!intent.requirements || intent.requirements.length === 0) {
      questions.push({
        question: 'What specific requirements must this capability fulfill?',
        priority: 'medium',
        category: 'requirements',
        followUp: [
          'Are there any performance requirements?',
          'What integrations are needed?',
        ],
      });
    }

    if (!intent.constraints || intent.constraints.length === 0) {
      questions.push({
        question: 'Are there any constraints or limitations to consider?',
        priority: 'medium',
        category: 'constraints',
        followUp: ['Any security requirements?', 'Technology restrictions?'],
      });
    }

    // Add maturity-specific questions
    if (intent.maturityLevel) {
      const maturityQuestions = this.maturityQuestions[intent.maturityLevel];
      maturityQuestions.forEach((question) => {
        questions.push({
          question,
          priority: 'medium',
          category: 'technical',
        });
      });
    }

    // Add phase-specific questions
    if (intent.phase) {
      const phaseQuestions = this.phaseQuestions[intent.phase];
      phaseQuestions.forEach((question) => {
        questions.push({
          question,
          priority: 'low',
          category: 'technical',
        });
      });
    }

    // Add context-specific questions
    if (context) {
      questions.push(...this.generateContextualQuestions(intent, context));
    }

    // Sort by priority and remove duplicates
    return this.prioritizeAndDeduplicateQuestions(questions);
  }

  async refineSpecificationInteractively(
    intent: ParsedIntent,
    answers: Record<string, string>,
    context?: InteractionContext
  ): Promise<ParsedIntent> {
    const refinedIntent = { ...intent };

    // Process answers to refine the specification
    for (const [question, answer] of Object.entries(answers)) {
      if (!answer || answer.trim().length === 0) continue;

      // Update capability if it was missing or unclear
      if (
        question.toLowerCase().includes('capability') ||
        question.toLowerCase().includes('main purpose')
      ) {
        if (!refinedIntent.capability || refinedIntent.capability.length < 5) {
          refinedIntent.capability = this.extractCapabilityFromAnswer(answer);
        }
      }

      // Extract additional requirements
      if (
        question.toLowerCase().includes('requirement') ||
        question.toLowerCase().includes('functionality')
      ) {
        const newRequirements = this.extractRequirementsFromAnswer(answer);
        refinedIntent.requirements = [
          ...refinedIntent.requirements,
          ...newRequirements,
        ];
      }

      // Extract additional constraints
      if (
        question.toLowerCase().includes('constraint') ||
        question.toLowerCase().includes('limitation') ||
        question.toLowerCase().includes('security') ||
        question.toLowerCase().includes('compliance')
      ) {
        const newConstraints = this.extractConstraintsFromAnswer(answer);
        refinedIntent.constraints = [
          ...refinedIntent.constraints,
          ...newConstraints,
        ];
      }

      // Update description with additional context
      if (answer.length > 10) {
        refinedIntent.description += `\n\nAdditional context: ${answer}`;
      }
    }

    // Re-evaluate maturity level and phase based on new information
    const combinedText = `${refinedIntent.description} ${Object.values(
      answers
    ).join(' ')}`;
    refinedIntent.maturityLevel = this.reassessMaturityLevel(
      combinedText,
      refinedIntent.maturityLevel
    );
    refinedIntent.phase = this.reassessPhase(combinedText, refinedIntent.phase);

    // Remove duplicates
    refinedIntent.requirements = [...new Set(refinedIntent.requirements)];
    refinedIntent.constraints = [...new Set(refinedIntent.constraints)];

    return refinedIntent;
  }

  async generateCompletionSuggestions(
    intent: Partial<ParsedIntent>,
    context?: InteractionContext
  ): Promise<CompletionSuggestion[]> {
    const suggestions: CompletionSuggestion[] = [];

    // Suggest capability name if missing
    if (!intent.capability && intent.description) {
      const suggestedCapability = this.extractCapabilityFromAnswer(
        intent.description
      );
      suggestions.push({
        field: 'capability',
        suggestion: suggestedCapability,
        confidence: 0.7,
        reasoning: 'Extracted from description using keyword analysis',
      });
    }

    // Suggest requirements based on description
    if (
      intent.description &&
      (!intent.requirements || intent.requirements.length === 0)
    ) {
      const suggestedRequirements = this.extractRequirementsFromAnswer(
        intent.description
      );
      if (suggestedRequirements.length > 0) {
        suggestions.push({
          field: 'requirements',
          suggestion: suggestedRequirements.join(', '),
          confidence: 0.6,
          reasoning: 'Inferred from description keywords and patterns',
        });
      }
    }

    // Suggest maturity level based on keywords
    if (!intent.maturityLevel && intent.description) {
      const suggestedMaturity = this.reassessMaturityLevel(
        intent.description,
        CapabilityMaturity.L1_GENERATION
      );
      suggestions.push({
        field: 'maturityLevel',
        suggestion: suggestedMaturity,
        confidence: 0.8,
        reasoning: 'Based on keyword analysis of description',
      });
    }

    // Suggest phase based on context
    if (!intent.phase && intent.description) {
      const suggestedPhase = this.reassessPhase(
        intent.description,
        DevelopmentPhase.FOUNDATION
      );
      suggestions.push({
        field: 'phase',
        suggestion: suggestedPhase,
        confidence: 0.7,
        reasoning: 'Based on capability type and complexity indicators',
      });
    }

    return suggestions;
  }

  async validateCompleteness(
    intent: ParsedIntent,
    context?: InteractionContext
  ): Promise<ValidationResult> {
    const errors = [];
    const warnings = [];

    // Check essential fields
    if (!intent.capability || intent.capability.trim().length === 0) {
      errors.push({
        code: 'MISSING_CAPABILITY',
        message: 'Capability name is required',
        severity: 'error' as const,
      });
    }

    if (!intent.description || intent.description.trim().length < 20) {
      errors.push({
        code: 'INSUFFICIENT_DESCRIPTION',
        message: 'Description should be at least 20 characters',
        severity: 'error' as const,
      });
    }

    // Check requirements completeness
    if (intent.requirements.length === 0) {
      warnings.push({
        code: 'NO_REQUIREMENTS',
        message: 'No specific requirements defined',
        severity: 'warning' as const,
      });
    }

    // Check maturity-specific completeness
    if (
      intent.maturityLevel === CapabilityMaturity.L4_GOVERNANCE ||
      intent.maturityLevel === CapabilityMaturity.L5_INTENT_DRIVEN
    ) {
      if (intent.constraints.length === 0) {
        warnings.push({
          code: 'MISSING_GOVERNANCE_CONSTRAINTS',
          message:
            'High maturity capabilities typically require explicit constraints',
          severity: 'warning' as const,
        });
      }
    }

    // Context-specific validation
    if (context?.organizationalContext) {
      if (
        context.organizationalContext.securityLevel === 'high' &&
        !intent.constraints.some((c) => c.toLowerCase().includes('security'))
      ) {
        warnings.push({
          code: 'MISSING_SECURITY_CONSTRAINTS',
          message:
            'High security environment requires explicit security constraints',
          severity: 'warning' as const,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private generateContextualQuestions(
    intent: Partial<ParsedIntent>,
    context: InteractionContext
  ): QuestionPriority[] {
    const questions: QuestionPriority[] = [];

    // Questions based on conversation history
    if (context.conversationHistory.length > 0) {
      const lastTurn =
        context.conversationHistory[context.conversationHistory.length - 1];
      if (
        lastTurn.type === 'answer' &&
        lastTurn.content.toLowerCase().includes('api')
      ) {
        questions.push({
          question: 'What authentication method should this API use?',
          priority: 'medium',
          category: 'technical',
        });
      }
    }

    // Questions based on organizational context
    if (context.organizationalContext) {
      if (context.organizationalContext.cloudProvider) {
        questions.push({
          question: `Should this be optimized for ${context.organizationalContext.cloudProvider}?`,
          priority: 'low',
          category: 'organizational',
        });
      }
    }

    // Questions based on user preferences
    if (context.userPreferences?.communicationStyle === 'detailed') {
      questions.push({
        question: 'Would you like to specify detailed technical requirements?',
        priority: 'low',
        category: 'technical',
      });
    }

    return questions;
  }

  private prioritizeAndDeduplicateQuestions(
    questions: QuestionPriority[]
  ): QuestionPriority[] {
    // Remove duplicates
    const uniqueQuestions = questions.filter(
      (q, index, arr) =>
        arr.findIndex((other) => other.question === q.question) === index
    );

    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return uniqueQuestions.sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  private extractCapabilityFromAnswer(answer: string): string {
    const words = answer.toLowerCase().split(/\s+/);
    const actionWords = [
      'create',
      'build',
      'generate',
      'develop',
      'implement',
      'setup',
    ];
    const objectWords = [
      'service',
      'api',
      'application',
      'system',
      'component',
    ];

    for (let i = 0; i < words.length - 1; i++) {
      if (actionWords.includes(words[i])) {
        for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
          if (objectWords.includes(words[j]) || words[j].length > 4) {
            return `${words[i]}-${words[j]}`;
          }
        }
      }
    }

    // Fallback: use first meaningful words
    const meaningfulWords = words.filter((w) => w.length > 3);
    return meaningfulWords.slice(0, 2).join('-');
  }

  private extractRequirementsFromAnswer(answer: string): string[] {
    const requirements: string[] = [];
    const patterns = [
      /(?:must|should|need to|require)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
      /(?:ability to|can)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
      /(?:support|handle|provide)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const requirement = match[1].trim();
        if (requirement.length > 3) {
          requirements.push(requirement);
        }
      }
    }

    return requirements;
  }

  private extractConstraintsFromAnswer(answer: string): string[] {
    const constraints: string[] = [];
    const patterns = [
      /(?:cannot|must not|should not)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
      /(?:limited to|restricted to)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
      /(?:only|exclusively)\s+([^.]+?)(?:\s+and\s+|\.|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(answer)) !== null) {
        const constraint = match[1].trim();
        if (constraint.length > 3) {
          constraints.push(constraint);
        }
      }
    }

    return constraints;
  }

  private reassessMaturityLevel(
    text: string,
    currentLevel: CapabilityMaturity
  ): CapabilityMaturity {
    const lowerText = text.toLowerCase();
    const keywords = {
      [CapabilityMaturity.L2_DEPLOYMENT]: [
        'deploy',
        'pipeline',
        'environment',
        'ci/cd',
        'deployment',
      ],
      [CapabilityMaturity.L4_GOVERNANCE]: [
        'policy',
        'compliance',
        'governance',
        'security',
      ],
      [CapabilityMaturity.L3_OPERATIONS]: [
        'monitor',
        'scale',
        'operate',
        'maintenance',
      ],
      [CapabilityMaturity.L5_INTENT_DRIVEN]: [
        'intelligent',
        'adaptive',
        'intent',
      ],
      [CapabilityMaturity.L1_GENERATION]: [
        'create',
        'generate',
        'basic',
        'simple',
      ],
    };

    // Check in priority order (most specific first)
    for (const [level, levelKeywords] of Object.entries(keywords)) {
      if (levelKeywords.some((keyword) => lowerText.includes(keyword))) {
        return level as CapabilityMaturity;
      }
    }

    return currentLevel;
  }

  private reassessPhase(
    text: string,
    currentPhase: DevelopmentPhase
  ): DevelopmentPhase {
    const lowerText = text.toLowerCase();
    const keywords = {
      [DevelopmentPhase.INTENT_DRIVEN]: [
        'end-to-end',
        'intelligent',
        'workflow',
      ],
      [DevelopmentPhase.GOVERNANCE]: ['policy', 'compliance', 'governance'],
      [DevelopmentPhase.OPERATIONALIZATION]: [
        'operational',
        'automation',
        'scaling',
      ],
      [DevelopmentPhase.STANDARDIZATION]: [
        'standard',
        'architecture',
        'pattern',
      ],
      [DevelopmentPhase.FOUNDATION]: ['service', 'api', 'basic', 'simple'],
    };

    for (const [phase, phaseKeywords] of Object.entries(keywords)) {
      if (phaseKeywords.some((keyword) => lowerText.includes(keyword))) {
        return phase as DevelopmentPhase;
      }
    }

    return currentPhase;
  }
}
