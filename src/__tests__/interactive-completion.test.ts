/**
 * Interactive Specification Completion Tests
 */

import {
  InteractiveSpecificationCompletion,
  InteractionContext,
  QuestionPriority,
  CompletionSuggestion,
} from '../implementations/interactive-completion';
import { CapabilityMaturity, DevelopmentPhase } from '../types/core';

describe('InteractiveSpecificationCompletion', () => {
  let completion: InteractiveSpecificationCompletion;

  beforeEach(() => {
    completion = new InteractiveSpecificationCompletion();
  });

  describe('generatePrioritizedQuestions', () => {
    test('should generate high priority questions for missing essential info', async () => {
      const incompleteIntent = {
        description: 'Short',
      };

      const questions = await completion.generatePrioritizedQuestions(
        incompleteIntent
      );

      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].priority).toBe('high');
      expect(questions[0].category).toBe('capability');
      expect(questions[0].question).toContain('main capability');
    });

    test('should generate medium priority questions for requirements', async () => {
      const partialIntent = {
        capability: 'user-service',
        description: 'A comprehensive user management service',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const questions = await completion.generatePrioritizedQuestions(
        partialIntent
      );

      const requirementQuestions = questions.filter(
        (q) => q.category === 'requirements'
      );
      expect(requirementQuestions.length).toBeGreaterThan(0);
      expect(requirementQuestions[0].priority).toBe('medium');
    });

    test('should generate maturity-specific questions', async () => {
      const governanceIntent = {
        capability: 'policy-service',
        description: 'Service for policy enforcement',
        requirements: ['Enforce policies'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L4_GOVERNANCE,
        phase: DevelopmentPhase.GOVERNANCE,
      };

      const questions = await completion.generatePrioritizedQuestions(
        governanceIntent
      );

      const governanceQuestions = questions.filter(
        (q) =>
          q.question.toLowerCase().includes('governance') ||
          q.question.toLowerCase().includes('policy') ||
          q.question.toLowerCase().includes('compliance')
      );
      expect(governanceQuestions.length).toBeGreaterThan(0);
    });

    test('should generate contextual questions based on interaction history', async () => {
      const intent = {
        capability: 'api-service',
        description: 'API service for data management',
        requirements: ['Handle data'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const context: InteractionContext = {
        conversationHistory: [
          {
            type: 'answer',
            content: 'I need an API for user management',
            timestamp: new Date(),
          },
        ],
      };

      const questions = await completion.generatePrioritizedQuestions(
        intent,
        context
      );

      const authQuestions = questions.filter((q) =>
        q.question.toLowerCase().includes('authentication')
      );
      expect(authQuestions.length).toBeGreaterThan(0);
    });

    test('should prioritize questions correctly', async () => {
      const intent = {
        capability: '',
        description: 'Short',
        requirements: [],
        constraints: [],
      };

      const questions = await completion.generatePrioritizedQuestions(intent);

      // Should have high priority questions first
      const priorities = questions.map((q) => q.priority);
      const highPriorityCount = priorities.filter((p) => p === 'high').length;
      expect(highPriorityCount).toBeGreaterThan(0);

      // High priority questions should come first
      const firstHighIndex = priorities.indexOf('high');
      const firstMediumIndex = priorities.indexOf('medium');
      if (firstMediumIndex !== -1) {
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }
    });
  });

  describe('refineSpecificationInteractively', () => {
    test('should refine capability based on answers', async () => {
      const originalIntent = {
        capability: '',
        description: 'Basic service',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const answers = {
        'What is the main capability?': 'Create a user authentication service',
        'What requirements?': 'Must handle login and registration',
      };

      const refined = await completion.refineSpecificationInteractively(
        originalIntent,
        answers
      );

      expect(refined.capability).toContain('create');
      expect(refined.capability).toContain('authentication');
      expect(refined.requirements).toContain('handle login');
      expect(refined.description).toContain(
        'Create a user authentication service'
      );
    });

    test('should extract requirements from detailed answers', async () => {
      const originalIntent = {
        capability: 'api-service',
        description: 'API service',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const answers = {
        'What functionality must this provide?':
          'The system must handle user authentication and should provide REST endpoints. It needs to support rate limiting.',
      };

      const refined = await completion.refineSpecificationInteractively(
        originalIntent,
        answers
      );

      expect(refined.requirements).toContain('handle user authentication');
      expect(refined.requirements).toContain('provide REST endpoints');
      expect(refined.requirements).toContain('rate limiting');
    });

    test('should extract constraints from security-related answers', async () => {
      const originalIntent = {
        capability: 'data-service',
        description: 'Data processing service',
        requirements: ['Process data'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const answers = {
        'Any security requirements?':
          'The service cannot store sensitive data and must not use external APIs. It should be limited to read-only operations.',
      };

      const refined = await completion.refineSpecificationInteractively(
        originalIntent,
        answers
      );

      expect(refined.constraints).toContain('store sensitive data');
      expect(refined.constraints).toContain('use external APIs');
      expect(refined.constraints).toContain('read-only operations');
    });

    test('should reassess maturity level based on new information', async () => {
      const originalIntent = {
        capability: 'basic-service',
        description: 'Basic service',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const answers = {
        'Additional details':
          'This should include automated deployment pipelines and CI/CD integration',
      };

      const refined = await completion.refineSpecificationInteractively(
        originalIntent,
        answers
      );

      expect(refined.maturityLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
    });

    test('should remove duplicate requirements and constraints', async () => {
      const originalIntent = {
        capability: 'service',
        description: 'Service',
        requirements: ['Handle users'],
        constraints: ['Security required'],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const answers = {
        'Requirements?': 'Must handle users and provide authentication',
        'Constraints?': 'Security required and must use HTTPS',
      };

      const refined = await completion.refineSpecificationInteractively(
        originalIntent,
        answers
      );

      // Should not have excessive duplicates
      const userRequirements = refined.requirements.filter((r) =>
        r.toLowerCase().includes('users')
      );
      expect(userRequirements.length).toBeLessThan(5); // Allow for some variations but not excessive

      const securityConstraints = refined.constraints.filter((c) =>
        c.toLowerCase().includes('security')
      );
      expect(securityConstraints.length).toBeLessThan(5); // Allow for some variations but not excessive
    });
  });

  describe('generateCompletionSuggestions', () => {
    test('should suggest capability name from description', async () => {
      const intent = {
        description:
          'Create a user authentication service for login management',
      };

      const suggestions = await completion.generateCompletionSuggestions(
        intent
      );

      const capabilitySuggestion = suggestions.find(
        (s) => s.field === 'capability'
      );
      expect(capabilitySuggestion).toBeDefined();
      expect(capabilitySuggestion!.suggestion).toContain('create');
      expect(capabilitySuggestion!.confidence).toBeGreaterThan(0.5);
    });

    test('should suggest requirements from description', async () => {
      const intent = {
        capability: 'api-service',
        description:
          'API service that must handle authentication and should provide REST endpoints',
        requirements: [],
      };

      const suggestions = await completion.generateCompletionSuggestions(
        intent
      );

      const requirementsSuggestion = suggestions.find(
        (s) => s.field === 'requirements'
      );
      expect(requirementsSuggestion).toBeDefined();
      expect(requirementsSuggestion!.suggestion).toContain(
        'handle authentication'
      );
    });

    test('should suggest maturity level based on keywords', async () => {
      const intent = {
        capability: 'deployment-service',
        description: 'Service for automated deployment with CI/CD pipelines',
      };

      const suggestions = await completion.generateCompletionSuggestions(
        intent
      );

      const maturitySuggestion = suggestions.find(
        (s) => s.field === 'maturityLevel'
      );
      expect(maturitySuggestion).toBeDefined();
      expect(maturitySuggestion!.suggestion).toBe(
        CapabilityMaturity.L2_DEPLOYMENT
      );
    });

    test('should suggest development phase', async () => {
      const intent = {
        capability: 'policy-service',
        description: 'Service for governance and compliance policy enforcement',
      };

      const suggestions = await completion.generateCompletionSuggestions(
        intent
      );

      const phaseSuggestion = suggestions.find((s) => s.field === 'phase');
      expect(phaseSuggestion).toBeDefined();
      expect(phaseSuggestion!.suggestion).toBe(DevelopmentPhase.GOVERNANCE);
    });
  });

  describe('validateCompleteness', () => {
    test('should validate complete specification successfully', async () => {
      const completeIntent = {
        capability: 'user-service',
        description:
          'Comprehensive user management service with authentication',
        requirements: ['Handle user registration', 'Provide authentication'],
        constraints: ['Must use OAuth 2.0'],
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await completion.validateCompleteness(completeIntent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify missing essential information', async () => {
      const incompleteIntent = {
        capability: '',
        description: 'Short',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await completion.validateCompleteness(incompleteIntent);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_CAPABILITY');
    });

    test('should warn about missing requirements', async () => {
      const intentWithoutRequirements = {
        capability: 'test-service',
        description: 'A test service with proper description length',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await completion.validateCompleteness(
        intentWithoutRequirements
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('NO_REQUIREMENTS');
    });

    test('should validate governance-specific requirements', async () => {
      const governanceIntent = {
        capability: 'policy-service',
        description: 'Service for policy enforcement and governance',
        requirements: ['Enforce policies'],
        constraints: [], // Missing constraints for governance
        maturityLevel: CapabilityMaturity.L4_GOVERNANCE,
        phase: DevelopmentPhase.GOVERNANCE,
      };

      const result = await completion.validateCompleteness(governanceIntent);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('MISSING_GOVERNANCE_CONSTRAINTS');
    });

    test('should validate security requirements based on context', async () => {
      const intent = {
        capability: 'data-service',
        description: 'Service for data processing',
        requirements: ['Process data'],
        constraints: [], // Missing security constraints
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const context: InteractionContext = {
        conversationHistory: [],
        organizationalContext: {
          securityLevel: 'high',
        },
      };

      const result = await completion.validateCompleteness(intent, context);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('MISSING_SECURITY_CONSTRAINTS');
    });
  });
});
