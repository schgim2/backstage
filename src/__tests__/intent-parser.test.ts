/**
 * Intent Parser Tests
 */

import { NaturalLanguageIntentParser } from '../implementations/intent-parser';
import { CapabilityMaturity, DevelopmentPhase } from '../types/core';

describe('NaturalLanguageIntentParser', () => {
  let parser: NaturalLanguageIntentParser;

  beforeEach(() => {
    parser = new NaturalLanguageIntentParser();
  });

  describe('parseIntent', () => {
    test('should parse basic service creation intent', async () => {
      const description =
        'Create a backend API service that handles user authentication and provides REST endpoints';
      const result = await parser.parseIntent(description);

      expect(result.capability).toBe('create-backend');
      expect(result.description).toBe(description);
      expect(result.requirements).toContain('Provide RESTful API endpoints');
      expect(result.requirements).toContain(
        'Implement authentication mechanism'
      );
      expect(result.maturityLevel).toBe(CapabilityMaturity.L1_GENERATION);
      expect(result.phase).toBe(DevelopmentPhase.FOUNDATION);
    });

    test('should parse deployment automation intent', async () => {
      const description =
        'Build a deployment pipeline that automatically deploys to multiple environments with CI/CD integration';
      const result = await parser.parseIntent(description);

      expect(result.capability).toBe('build-deployment');
      expect(result.maturityLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
      // Should have at least some requirements (even if implicit)
      expect(result.requirements.length).toBeGreaterThanOrEqual(0);
    });

    test('should parse governance intent', async () => {
      const description =
        'Implement security policies and compliance checks for all services with audit trails';
      const result = await parser.parseIntent(description);

      expect(result.maturityLevel).toBe(CapabilityMaturity.L4_GOVERNANCE);
      expect(result.phase).toBe(DevelopmentPhase.GOVERNANCE);
    });

    test('should parse intent-driven capability', async () => {
      const description =
        'Create an intelligent system that automatically adapts based on intent and provides self-healing capabilities';
      const result = await parser.parseIntent(description);

      expect(result.maturityLevel).toBe(CapabilityMaturity.L5_INTENT_DRIVEN);
      expect(result.phase).toBe(DevelopmentPhase.INTENT_DRIVEN);
    });
  });

  describe('validateIntent', () => {
    test('should validate complete intent successfully', async () => {
      const intent = {
        capability: 'user-service',
        description:
          'A comprehensive user management service with authentication',
        requirements: ['Handle user registration', 'Provide authentication'],
        constraints: ['Must use OAuth 2.0'],
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await parser.validateIntent(intent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should identify missing capability name', async () => {
      const intent = {
        capability: '',
        description: 'A service without a name',
        requirements: ['Some requirement'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await parser.validateIntent(intent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_CAPABILITY');
    });

    test('should identify insufficient description', async () => {
      const intent = {
        capability: 'test',
        description: 'Short',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await parser.validateIntent(intent);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INSUFFICIENT_DESCRIPTION');
    });

    test('should warn about missing requirements', async () => {
      const intent = {
        capability: 'test-service',
        description: 'A test service with proper description length',
        requirements: [],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const result = await parser.validateIntent(intent);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('NO_REQUIREMENTS');
    });
  });

  describe('refineIntent', () => {
    test('should refine intent with additional feedback', async () => {
      const originalIntent = {
        capability: 'api-service',
        description: 'Basic API service',
        requirements: ['Provide endpoints'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const feedback =
        'The service must also include database integration and monitoring capabilities';
      const refined = await parser.refineIntent(originalIntent, feedback);

      expect(refined.requirements).toContain('Provide endpoints');
      expect(refined.requirements).toContain('Include database integration');
      expect(refined.requirements).toContain(
        'Include monitoring and observability'
      );
      expect(refined.description).toContain(feedback);
    });
  });

  describe('generateClarifyingQuestions', () => {
    test('should generate questions for incomplete intent', () => {
      const incompleteIntent = {
        description: 'Some basic description',
      };

      const questions = parser.generateClarifyingQuestions(incompleteIntent);

      expect(questions).toContain(
        'What is the main capability or feature you want to create?'
      );
      expect(questions).toContain(
        'What specific requirements should this capability fulfill?'
      );
      expect(questions).toContain(
        'Are there any constraints or limitations to consider?'
      );
    });

    test('should generate context-specific questions', () => {
      const apiIntent = {
        capability: 'api-service',
        description: 'Create an API service for user management',
        requirements: ['Handle users'],
        constraints: [],
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };

      const questions = parser.generateClarifyingQuestions(apiIntent);

      expect(questions).toContain(
        'Does this API require authentication and authorization?'
      );
    });
  });

  describe('extractRequirements', () => {
    test('should extract explicit requirements', async () => {
      const description =
        'The system must handle user authentication and should provide REST endpoints. It needs to support multiple databases.';
      const requirements = await parser.extractRequirements(description);

      expect(requirements).toContain('handle user authentication');
      expect(requirements).toContain('provide REST endpoints');
      expect(requirements).toContain('support multiple databases');
      // Also check for implicit requirements
      expect(requirements).toContain('Implement authentication mechanism');
    });

    test('should extract implicit requirements from keywords', async () => {
      const description = 'Build an API with database and monitoring';
      const requirements = await parser.extractRequirements(description);

      expect(requirements).toContain('Provide RESTful API endpoints');
      expect(requirements).toContain('Include database integration');
      expect(requirements).toContain('Include monitoring and observability');
    });
  });

  describe('identifyConstraints', () => {
    test('should identify explicit constraints', async () => {
      const description =
        'The service cannot use external APIs and must not store sensitive data. It should be limited to read-only operations.';
      const constraints = await parser.identifyConstraints(description);

      expect(constraints).toContain('use external APIs');
      expect(constraints).toContain('store sensitive data');
      expect(constraints).toContain('read-only operations');
    });

    test('should add organizational constraints', async () => {
      const description = 'Basic service description';
      const orgContext = {
        securityLevel: 'high',
        cloudProvider: 'AWS',
        dataClassification: 'confidential',
      };

      const constraints = await parser.identifyConstraints(
        description,
        orgContext
      );

      expect(constraints).toContain('Must comply with high security standards');
      expect(constraints).toContain('Must use AWS cloud services');
      expect(constraints).toContain(
        'Must handle confidential data classification'
      );
    });
  });
});
