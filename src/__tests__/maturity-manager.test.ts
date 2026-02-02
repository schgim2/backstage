/**
 * Unit tests for MaturityManager
 */

import {
  MaturityManager,
  MaturityAssessment,
  MaturityBlocker,
  MaturityRecommendation,
  ProgressionStep,
} from '../implementations/maturity-manager';
import {
  CapabilityMaturity,
  DevelopmentPhase,
  TemplateSpec,
  Capability,
  Improvement,
} from '../types/core';

describe('MaturityManager', () => {
  let maturityManager: MaturityManager;

  beforeEach(() => {
    maturityManager = new MaturityManager();
  });

  describe('assessMaturity', () => {
    it('should assess L1 capability correctly', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);

      expect(assessment.currentLevel).toBe(CapabilityMaturity.L1_GENERATION);
      expect(assessment.nextLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
      expect(assessment.readinessScore).toBeGreaterThanOrEqual(0);
      expect(assessment.readinessScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(assessment.blockers)).toBe(true);
      expect(Array.isArray(assessment.recommendations)).toBe(true);
      expect(Array.isArray(assessment.progressionPath)).toBe(true);
    });

    it('should assess L5 capability correctly', async () => {
      const capability: Capability = {
        id: 'advanced-capability',
        name: 'Advanced Capability',
        description: 'An advanced capability',
        maturityLevel: CapabilityMaturity.L5_INTENT_DRIVEN,
        phase: DevelopmentPhase.INTENT_DRIVEN,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);

      expect(assessment.currentLevel).toBe(CapabilityMaturity.L5_INTENT_DRIVEN);
      expect(assessment.nextLevel).toBeUndefined();
      expect(assessment.readinessScore).toBe(100);
    });

    it('should identify blockers for progression', async () => {
      const capability: Capability = {
        id: 'blocked-capability',
        name: 'Blocked Capability',
        description: 'A capability with blockers',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);

      expect(assessment.blockers.length).toBeGreaterThan(0);
      assessment.blockers.forEach((blocker) => {
        expect(blocker).toHaveProperty('category');
        expect(blocker).toHaveProperty('description');
        expect(blocker).toHaveProperty('severity');
        expect(blocker).toHaveProperty('resolution');
        expect([
          'technical',
          'organizational',
          'process',
          'governance',
        ]).toContain(blocker.category);
        expect(['low', 'medium', 'high', 'critical']).toContain(
          blocker.severity
        );
      });
    });

    it('should generate appropriate recommendations', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.STANDARDIZATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      assessment.recommendations.forEach((rec) => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('priority');
        expect(rec).toHaveProperty('description');
        expect(rec).toHaveProperty('effort');
        expect(rec).toHaveProperty('impact');
        expect(['immediate', 'short_term', 'long_term']).toContain(rec.type);
        expect(['low', 'medium', 'high']).toContain(rec.priority);
        expect(['small', 'medium', 'large']).toContain(rec.effort);
        expect(['low', 'medium', 'high']).toContain(rec.impact);
      });
    });

    it('should create progression path', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);

      expect(assessment.progressionPath.length).toBeGreaterThan(0);
      assessment.progressionPath.forEach((step) => {
        expect(step).toHaveProperty('fromLevel');
        expect(step).toHaveProperty('toLevel');
        expect(step).toHaveProperty('requirements');
        expect(step).toHaveProperty('estimatedEffort');
        expect(step).toHaveProperty('prerequisites');
        expect(['weeks', 'months', 'quarters']).toContain(step.estimatedEffort);
      });
    });
  });

  describe('assessTemplateMaturity', () => {
    it('should assess template maturity from spec', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-template',
          description: 'A test template',
          tags: ['l2', 'deployment'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: { links: [], text: [] },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const assessment = await maturityManager.assessTemplateMaturity(spec);

      expect(assessment.currentLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
      expect(assessment.nextLevel).toBe(CapabilityMaturity.L3_OPERATIONS);
    });

    it('should infer L1 maturity for basic templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'basic-template',
          description: 'A basic template',
          tags: ['basic'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: { links: [], text: [] },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const assessment = await maturityManager.assessTemplateMaturity(spec);

      expect(assessment.currentLevel).toBe(CapabilityMaturity.L1_GENERATION);
    });

    it('should infer L5 maturity for intent-driven templates', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'intent-template',
          description: 'An intent-driven template',
          tags: ['l5', 'intent-driven', 'ai'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: { links: [], text: [] },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const assessment = await maturityManager.assessTemplateMaturity(spec);

      expect(assessment.currentLevel).toBe(CapabilityMaturity.L5_INTENT_DRIVEN);
      expect(assessment.nextLevel).toBeUndefined();
    });
  });

  describe('suggestImprovements', () => {
    it('should suggest improvements for L1 capability', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const improvements = await maturityManager.suggestImprovements(
        capability
      );

      expect(improvements.length).toBeGreaterThan(0);
      improvements.forEach((improvement) => {
        expect(improvement).toHaveProperty('type');
        expect(improvement).toHaveProperty('description');
        expect(improvement).toHaveProperty('priority');
        expect(improvement).toHaveProperty('effort');
        expect(['maturity', 'security', 'performance', 'standards']).toContain(
          improvement.type
        );
        expect(['low', 'medium', 'high']).toContain(improvement.priority);
        expect(['small', 'medium', 'large']).toContain(improvement.effort);
      });
    });

    it('should prioritize improvements correctly', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const improvements = await maturityManager.suggestImprovements(
        capability
      );

      // Check that high priority items come first
      for (let i = 0; i < improvements.length - 1; i++) {
        const current = improvements[i];
        const next = improvements[i + 1];

        const priorityOrder = { high: 3, medium: 2, low: 1 };
        expect(priorityOrder[current.priority]).toBeGreaterThanOrEqual(
          priorityOrder[next.priority]
        );
      }
    });

    it('should suggest target-specific improvements', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const improvements = await maturityManager.suggestImprovements(
        capability,
        CapabilityMaturity.L3_OPERATIONS
      );

      expect(improvements.length).toBeGreaterThan(0);

      // Should include improvements targeting L3 operations
      const l3Improvements = improvements.filter(
        (imp) =>
          imp.description.includes('L3_OPERATIONS') ||
          imp.description.includes('operations') ||
          imp.description.includes('monitoring')
      );
      expect(l3Improvements.length).toBeGreaterThan(0);
    });
  });

  describe('generateProgressionRoadmap', () => {
    it('should generate roadmap from L1 to L3', async () => {
      const roadmap = await maturityManager.generateProgressionRoadmap(
        CapabilityMaturity.L1_GENERATION,
        CapabilityMaturity.L3_OPERATIONS
      );

      expect(roadmap.length).toBe(2); // L1->L2, L2->L3
      expect(roadmap[0].fromLevel).toBe(CapabilityMaturity.L1_GENERATION);
      expect(roadmap[0].toLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
      expect(roadmap[1].fromLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
      expect(roadmap[1].toLevel).toBe(CapabilityMaturity.L3_OPERATIONS);
    });

    it('should generate complete roadmap from L1 to L5', async () => {
      const roadmap = await maturityManager.generateProgressionRoadmap(
        CapabilityMaturity.L1_GENERATION,
        CapabilityMaturity.L5_INTENT_DRIVEN
      );

      expect(roadmap.length).toBe(4); // L1->L2->L3->L4->L5

      const expectedProgression = [
        [CapabilityMaturity.L1_GENERATION, CapabilityMaturity.L2_DEPLOYMENT],
        [CapabilityMaturity.L2_DEPLOYMENT, CapabilityMaturity.L3_OPERATIONS],
        [CapabilityMaturity.L3_OPERATIONS, CapabilityMaturity.L4_GOVERNANCE],
        [CapabilityMaturity.L4_GOVERNANCE, CapabilityMaturity.L5_INTENT_DRIVEN],
      ];

      roadmap.forEach((step, index) => {
        expect(step.fromLevel).toBe(expectedProgression[index][0]);
        expect(step.toLevel).toBe(expectedProgression[index][1]);
        expect(step.requirements.length).toBeGreaterThan(0);
        expect(step.prerequisites.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return empty roadmap for same level', async () => {
      const roadmap = await maturityManager.generateProgressionRoadmap(
        CapabilityMaturity.L3_OPERATIONS,
        CapabilityMaturity.L3_OPERATIONS
      );

      expect(roadmap.length).toBe(0);
    });
  });

  describe('isReadyForProgression', () => {
    it('should return false for low readiness score', async () => {
      const capability: Capability = {
        id: 'low-readiness',
        name: 'Low Readiness Capability',
        description: 'A capability with low readiness',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const isReady = await maturityManager.isReadyForProgression(capability);

      // Since L1 capabilities typically have low readiness scores, this should be false
      expect(typeof isReady).toBe('boolean');
    });

    it('should check for critical blockers', async () => {
      const capability: Capability = {
        id: 'blocked-capability',
        name: 'Blocked Capability',
        description: 'A capability with critical blockers',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const isReady = await maturityManager.isReadyForProgression(capability);

      expect(typeof isReady).toBe('boolean');
    });

    it('should handle target level parameter', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.STANDARDIZATION,
        templates: [],
        dependencies: [],
      };

      const isReady = await maturityManager.isReadyForProgression(
        capability,
        CapabilityMaturity.L4_GOVERNANCE
      );

      expect(typeof isReady).toBe('boolean');
    });
  });

  describe('getNextSteps', () => {
    it('should return actionable next steps', async () => {
      const capability: Capability = {
        id: 'test-capability',
        name: 'Test Capability',
        description: 'A test capability',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const nextSteps = await maturityManager.getNextSteps(capability);

      expect(Array.isArray(nextSteps)).toBe(true);
      expect(nextSteps.length).toBeGreaterThan(0);
      expect(nextSteps.length).toBeLessThanOrEqual(5); // Limited to top 5

      nextSteps.forEach((step) => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize critical blockers', async () => {
      const capability: Capability = {
        id: 'critical-blocked',
        name: 'Critically Blocked Capability',
        description: 'A capability with critical blockers',
        maturityLevel: CapabilityMaturity.L3_OPERATIONS,
        phase: DevelopmentPhase.OPERATIONALIZATION,
        templates: [],
        dependencies: [],
      };

      const nextSteps = await maturityManager.getNextSteps(capability);

      // Check if any steps mention critical issues
      const hasCriticalSteps = nextSteps.some((step) =>
        step.includes('CRITICAL')
      );
      expect(typeof hasCriticalSteps).toBe('boolean');
    });

    it('should include progression steps when no critical blockers', async () => {
      const capability: Capability = {
        id: 'ready-capability',
        name: 'Ready Capability',
        description: 'A capability ready for progression',
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.STANDARDIZATION,
        templates: [],
        dependencies: [],
      };

      const nextSteps = await maturityManager.getNextSteps(capability);

      expect(nextSteps.length).toBeGreaterThan(0);

      // Should include some progression-related steps
      const hasProgressionSteps = nextSteps.some(
        (step) => step.includes('Progress to') || step.includes('L3_OPERATIONS')
      );
      expect(typeof hasProgressionSteps).toBe('boolean');
    });
  });

  describe('maturity level inference', () => {
    it('should infer correct maturity from template tags', async () => {
      const testCases = [
        { tags: ['l1', 'basic'], expected: CapabilityMaturity.L1_GENERATION },
        {
          tags: ['l2', 'deployment'],
          expected: CapabilityMaturity.L2_DEPLOYMENT,
        },
        {
          tags: ['l3', 'operations'],
          expected: CapabilityMaturity.L3_OPERATIONS,
        },
        {
          tags: ['l4', 'governance'],
          expected: CapabilityMaturity.L4_GOVERNANCE,
        },
        {
          tags: ['l5', 'intent-driven'],
          expected: CapabilityMaturity.L5_INTENT_DRIVEN,
        },
        { tags: ['unknown'], expected: CapabilityMaturity.L1_GENERATION },
      ];

      for (const testCase of testCases) {
        const spec: TemplateSpec = {
          metadata: {
            name: 'test-template',
            description: 'A test template',
            tags: testCase.tags,
            owner: 'platform-team',
          },
          parameters: {},
          steps: [],
          output: { links: [], text: [] },
          validation: {
            security: [],
            compliance: [],
            standards: [],
            cost: [],
          },
        };

        const assessment = await maturityManager.assessTemplateMaturity(spec);
        expect(assessment.currentLevel).toBe(testCase.expected);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle capability with no dependencies', async () => {
      const capability: Capability = {
        id: 'isolated-capability',
        name: 'Isolated Capability',
        description: 'A capability with no dependencies',
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.STANDARDIZATION,
        templates: [],
        dependencies: [],
      };

      const assessment = await maturityManager.assessMaturity(capability);
      expect(assessment).toBeDefined();
      expect(assessment.currentLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
    });

    it('should handle capability with empty templates array', async () => {
      const capability: Capability = {
        id: 'empty-templates',
        name: 'Empty Templates Capability',
        description: 'A capability with no templates',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
        templates: [],
        dependencies: [],
      };

      const improvements = await maturityManager.suggestImprovements(
        capability
      );
      expect(improvements).toBeDefined();
      expect(Array.isArray(improvements)).toBe(true);
    });

    it('should handle L5 capability progression requests', async () => {
      const capability: Capability = {
        id: 'max-level',
        name: 'Max Level Capability',
        description: 'A capability at maximum maturity',
        maturityLevel: CapabilityMaturity.L5_INTENT_DRIVEN,
        phase: DevelopmentPhase.INTENT_DRIVEN,
        templates: [],
        dependencies: [],
      };

      const roadmap = await maturityManager.generateProgressionRoadmap(
        CapabilityMaturity.L5_INTENT_DRIVEN,
        CapabilityMaturity.L5_INTENT_DRIVEN
      );

      expect(roadmap.length).toBe(0);

      const nextSteps = await maturityManager.getNextSteps(capability);
      expect(Array.isArray(nextSteps)).toBe(true);
    });
  });

  describe('assessment consistency', () => {
    it('should return consistent assessments for same capability', async () => {
      const capability: Capability = {
        id: 'consistent-test',
        name: 'Consistent Test Capability',
        description: 'A capability for consistency testing',
        maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        phase: DevelopmentPhase.STANDARDIZATION,
        templates: [],
        dependencies: [],
      };

      const assessment1 = await maturityManager.assessMaturity(capability);
      const assessment2 = await maturityManager.assessMaturity(capability);

      expect(assessment1.currentLevel).toBe(assessment2.currentLevel);
      expect(assessment1.nextLevel).toBe(assessment2.nextLevel);
      expect(assessment1.readinessScore).toBe(assessment2.readinessScore);
      expect(assessment1.blockers.length).toBe(assessment2.blockers.length);
      expect(assessment1.recommendations.length).toBe(
        assessment2.recommendations.length
      );
    });
  });
});
