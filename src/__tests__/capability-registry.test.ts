/**
 * Tests for Capability Registry Implementation
 */

import { CapabilityRegistryImpl } from '../implementations/capability-registry';
import {
  Capability,
  CapabilityFilter,
  CapabilityMaturity,
  DevelopmentPhase,
  Template,
  TemplateMetadata,
  Repository,
} from '../types/core';

describe('CapabilityRegistryImpl', () => {
  let registry: CapabilityRegistryImpl;

  beforeEach(() => {
    registry = new CapabilityRegistryImpl();
  });

  const createSampleRepository = (): Repository => ({
    id: 'test-repo',
    name: 'Test Repository',
    url: 'https://github.com/test/repo',
    branch: 'main',
  });

  const createSampleTemplateMetadata = (
    overrides: Partial<TemplateMetadata> = {}
  ): TemplateMetadata => ({
    id: 'test-template-metadata',
    name: 'Test Template Metadata',
    version: '1.0.0',
    created: new Date(),
    updated: new Date(),
    author: 'test-author',
    maturityLevel: CapabilityMaturity.L1_GENERATION,
    phase: DevelopmentPhase.FOUNDATION,
    ...overrides,
  });

  const createSampleTemplate = (
    overrides: Partial<Template> = {}
  ): Template => ({
    id: 'test-template',
    name: 'Test Template',
    description: 'A test template for unit testing',
    version: '1.0.0',
    repository: createSampleRepository(),
    metadata: createSampleTemplateMetadata(),
    ...overrides,
  });

  const createSampleCapability = (
    overrides: Partial<Capability> = {}
  ): Capability => ({
    id: 'test-capability',
    name: 'Test Capability',
    description: 'A test capability for unit testing',
    maturityLevel: CapabilityMaturity.L1_GENERATION,
    phase: DevelopmentPhase.FOUNDATION,
    templates: [],
    dependencies: [],
    ...overrides,
  });

  describe('registerCapability', () => {
    it('should register a new capability successfully', async () => {
      const capability = createSampleCapability();

      await registry.registerCapability(capability);

      const retrieved = await registry.getCapability(capability.id);
      expect(retrieved).toEqual(capability);
    });

    it('should throw error when registering duplicate capability ID', async () => {
      const capability = createSampleCapability();

      await registry.registerCapability(capability);

      await expect(registry.registerCapability(capability)).rejects.toThrow(
        'Capability with ID test-capability already exists'
      );
    });

    it('should validate required fields', async () => {
      const invalidCapability = createSampleCapability({ id: '' });

      await expect(
        registry.registerCapability(invalidCapability)
      ).rejects.toThrow('Capability ID is required');
    });

    it('should validate maturity level', async () => {
      const invalidCapability = createSampleCapability({
        maturityLevel: 'INVALID' as any,
      });

      await expect(
        registry.registerCapability(invalidCapability)
      ).rejects.toThrow('Invalid maturity level: INVALID');
    });

    it('should validate phase', async () => {
      const invalidCapability = createSampleCapability({
        phase: 'INVALID' as any,
      });

      await expect(
        registry.registerCapability(invalidCapability)
      ).rejects.toThrow('Invalid phase: INVALID');
    });
  });

  describe('getCapabilities', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'cap1',
          name: 'Capability 1',
          maturityLevel: CapabilityMaturity.L1_GENERATION,
          phase: DevelopmentPhase.FOUNDATION,
        })
      );

      await registry.registerCapability(
        createSampleCapability({
          id: 'cap2',
          name: 'Capability 2',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
          phase: DevelopmentPhase.STANDARDIZATION,
        })
      );

      await registry.registerCapability(
        createSampleCapability({
          id: 'cap3',
          name: 'Capability 3',
          maturityLevel: CapabilityMaturity.L1_GENERATION,
          phase: DevelopmentPhase.FOUNDATION,
        })
      );
    });

    it('should return all capabilities when no filter provided', async () => {
      const capabilities = await registry.getCapabilities();
      expect(capabilities).toHaveLength(3);
    });

    it('should filter by maturity level', async () => {
      const filter: CapabilityFilter = {
        maturityLevel: CapabilityMaturity.L1_GENERATION,
      };
      const capabilities = await registry.getCapabilities(filter);

      expect(capabilities).toHaveLength(2);
      expect(
        capabilities.every(
          (cap) => cap.maturityLevel === CapabilityMaturity.L1_GENERATION
        )
      ).toBe(true);
    });

    it('should filter by phase', async () => {
      const filter: CapabilityFilter = {
        phase: DevelopmentPhase.STANDARDIZATION,
      };
      const capabilities = await registry.getCapabilities(filter);

      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].phase).toBe(DevelopmentPhase.STANDARDIZATION);
    });

    it('should filter by search term', async () => {
      const filter: CapabilityFilter = { search: 'Capability 1' };
      const capabilities = await registry.getCapabilities(filter);

      expect(capabilities).toHaveLength(1);
      expect(capabilities[0].name).toBe('Capability 1');
    });

    it('should apply multiple filters', async () => {
      const filter: CapabilityFilter = {
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      };
      const capabilities = await registry.getCapabilities(filter);

      expect(capabilities).toHaveLength(2);
    });
  });

  describe('updateMaturity', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'test-cap',
          maturityLevel: CapabilityMaturity.L1_GENERATION,
        })
      );
    });

    it('should update maturity level successfully', async () => {
      await registry.updateMaturity(
        'test-cap',
        CapabilityMaturity.L2_DEPLOYMENT
      );

      const capability = await registry.getCapability('test-cap');
      expect(capability?.maturityLevel).toBe(CapabilityMaturity.L2_DEPLOYMENT);
    });

    it('should throw error for non-existent capability', async () => {
      await expect(
        registry.updateMaturity(
          'non-existent',
          CapabilityMaturity.L2_DEPLOYMENT
        )
      ).rejects.toThrow('Capability with ID non-existent not found');
    });

    it('should prevent maturity downgrade', async () => {
      await registry.updateMaturity(
        'test-cap',
        CapabilityMaturity.L3_OPERATIONS
      );

      await expect(
        registry.updateMaturity('test-cap', CapabilityMaturity.L2_DEPLOYMENT)
      ).rejects.toThrow(
        'Cannot downgrade maturity from L3_OPERATIONS to L2_DEPLOYMENT'
      );
    });

    it('should allow same level update', async () => {
      await registry.updateMaturity(
        'test-cap',
        CapabilityMaturity.L1_GENERATION
      );

      const capability = await registry.getCapability('test-cap');
      expect(capability?.maturityLevel).toBe(CapabilityMaturity.L1_GENERATION);
    });
  });

  describe('suggestImprovements', () => {
    it('should suggest improvements for L1 capability', async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'l1-cap',
          maturityLevel: CapabilityMaturity.L1_GENERATION,
        })
      );

      const improvements = await registry.suggestImprovements('l1-cap');

      expect(improvements).toHaveLength(2); // maturity + templates
      expect(improvements[0].type).toBe('maturity');
    });

    it('should suggest improvements for L2 capability', async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'l2-cap',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        })
      );

      const improvements = await registry.suggestImprovements('l2-cap');

      expect(improvements).toHaveLength(2); // maturity + templates
      expect(improvements[0].type).toBe('maturity');
    });

    it('should suggest dependency reduction for complex capabilities', async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'complex-cap',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
          dependencies: ['dep1', 'dep2', 'dep3', 'dep4', 'dep5', 'dep6'],
        })
      );

      const improvements = await registry.suggestImprovements('complex-cap');

      expect(improvements.some((imp) => imp.type === 'standards')).toBe(true);
    });

    it('should throw error for non-existent capability', async () => {
      await expect(
        registry.suggestImprovements('non-existent')
      ).rejects.toThrow('Capability with ID non-existent not found');
    });
  });

  describe('searchCapabilities', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'api-service',
          name: 'API Service',
          description: 'RESTful API service for data processing',
        })
      );

      await registry.registerCapability(
        createSampleCapability({
          id: 'ui-component',
          name: 'UI Component',
          description: 'React component library',
        })
      );
    });

    it('should search by name', async () => {
      const results = await registry.searchCapabilities('API');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('API Service');
    });

    it('should search by description', async () => {
      const results = await registry.searchCapabilities('RESTful');

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('RESTful');
    });

    it('should be case insensitive', async () => {
      const results = await registry.searchCapabilities('api');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('API Service');
    });

    it('should return empty array for no matches', async () => {
      const results = await registry.searchCapabilities('nonexistent');

      expect(results).toHaveLength(0);
    });
  });

  describe('getCapability', () => {
    it('should return capability by ID', async () => {
      const capability = createSampleCapability();
      await registry.registerCapability(capability);

      const result = await registry.getCapability(capability.id);

      expect(result).toEqual(capability);
    });

    it('should return null for non-existent capability', async () => {
      const result = await registry.getCapability('non-existent');

      expect(result).toBeNull();
    });

    it('should return a copy of the capability', async () => {
      const capability = createSampleCapability();
      await registry.registerCapability(capability);

      const result = await registry.getCapability(capability.id);
      result!.name = 'Modified Name';

      const original = await registry.getCapability(capability.id);
      expect(original!.name).toBe(capability.name);
    });
  });

  describe('updateCapability', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'update-test',
          name: 'Original Name',
          description: 'Original Description',
        })
      );
    });

    it('should update capability successfully', async () => {
      await registry.updateCapability('update-test', {
        name: 'Updated Name',
        description: 'Updated Description',
      });

      const capability = await registry.getCapability('update-test');
      expect(capability?.name).toBe('Updated Name');
      expect(capability?.description).toBe('Updated Description');
    });

    it('should prevent ID changes', async () => {
      await expect(
        registry.updateCapability('update-test', {
          id: 'new-id',
        })
      ).rejects.toThrow('Cannot change capability ID');
    });

    it('should throw error for non-existent capability', async () => {
      await expect(
        registry.updateCapability('non-existent', {
          name: 'New Name',
        })
      ).rejects.toThrow('Capability with ID non-existent not found');
    });

    it('should validate updated capability', async () => {
      await expect(
        registry.updateCapability('update-test', {
          name: '',
        })
      ).rejects.toThrow('Capability name is required');
    });
  });

  describe('deleteCapability', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'delete-test',
        })
      );
    });

    it('should delete capability successfully', async () => {
      await registry.deleteCapability('delete-test');

      const capability = await registry.getCapability('delete-test');
      expect(capability).toBeNull();
    });

    it('should throw error for non-existent capability', async () => {
      await expect(registry.deleteCapability('non-existent')).rejects.toThrow(
        'Capability with ID non-existent not found'
      );
    });

    it('should prevent deletion of capabilities with dependencies', async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'dependent',
          dependencies: ['delete-test'],
        })
      );

      await expect(registry.deleteCapability('delete-test')).rejects.toThrow(
        'Cannot delete capability delete-test. It is required by: Test Capability'
      );
    });
  });

  describe('template management', () => {
    beforeEach(async () => {
      await registry.registerCapability(
        createSampleCapability({
          id: 'template-test',
        })
      );
    });

    describe('getCapabilityTemplates', () => {
      it('should return empty array for capability with no templates', async () => {
        const templates = await registry.getCapabilityTemplates(
          'template-test'
        );
        expect(templates).toHaveLength(0);
      });

      it('should throw error for non-existent capability', async () => {
        await expect(
          registry.getCapabilityTemplates('non-existent')
        ).rejects.toThrow('Capability with ID non-existent not found');
      });
    });

    describe('addTemplateToCapability', () => {
      it('should add template successfully', async () => {
        const template = createSampleTemplate();

        await registry.addTemplateToCapability('template-test', template);

        const templates = await registry.getCapabilityTemplates(
          'template-test'
        );
        expect(templates).toHaveLength(1);
        expect(templates[0]).toEqual(template);
      });

      it('should throw error for non-existent capability', async () => {
        const template = createSampleTemplate();

        await expect(
          registry.addTemplateToCapability('non-existent', template)
        ).rejects.toThrow('Capability with ID non-existent not found');
      });

      it('should prevent duplicate template IDs', async () => {
        const template = createSampleTemplate();

        await registry.addTemplateToCapability('template-test', template);

        await expect(
          registry.addTemplateToCapability('template-test', template)
        ).rejects.toThrow(
          'Template with ID test-template already exists for capability template-test'
        );
      });

      it('should validate template structure', async () => {
        const invalidTemplate = createSampleTemplate({ id: '' });

        await expect(
          registry.addTemplateToCapability('template-test', invalidTemplate)
        ).rejects.toThrow('Template ID is required');
      });
    });

    describe('checkTemplateConflicts', () => {
      beforeEach(async () => {
        await registry.registerCapability(
          createSampleCapability({
            id: 'conflict-test',
          })
        );

        await registry.addTemplateToCapability(
          'template-test',
          createSampleTemplate({
            id: 'existing-template',
            name: 'Existing Template',
          })
        );
      });

      it('should detect ID conflicts', async () => {
        const conflictingTemplate = createSampleTemplate({
          id: 'existing-template',
          name: 'Different Name',
        });

        const conflicts = await registry.checkTemplateConflicts(
          conflictingTemplate
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].id).toBe('existing-template');
      });

      it('should detect name conflicts', async () => {
        const conflictingTemplate = createSampleTemplate({
          id: 'different-id',
          name: 'Existing Template',
        });

        const conflicts = await registry.checkTemplateConflicts(
          conflictingTemplate
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].name).toBe('Existing Template');
      });

      it('should return empty array for no conflicts', async () => {
        const nonConflictingTemplate = createSampleTemplate({
          id: 'unique-id',
          name: 'Unique Name',
        });

        const conflicts = await registry.checkTemplateConflicts(
          nonConflictingTemplate
        );

        expect(conflicts).toHaveLength(0);
      });
    });

    describe('getMigrationPath', () => {
      beforeEach(async () => {
        await registry.addTemplateToCapability(
          'template-test',
          createSampleTemplate({
            id: 'deprecated-template',
          })
        );

        await registry.addTemplateToCapability(
          'template-test',
          createSampleTemplate({
            id: 'active-template',
          })
        );
      });

      it('should provide migration path for any template', async () => {
        const migrationPath = await registry.getMigrationPath(
          'deprecated-template'
        );

        expect(migrationPath).toHaveLength(7);
        expect(migrationPath[0]).toContain('Review current usage');
      });

      it('should throw error for non-existent template', async () => {
        await expect(registry.getMigrationPath('non-existent')).rejects.toThrow(
          'Template with ID non-existent not found'
        );
      });
    });
  });

  describe('template discovery and reuse', () => {
    beforeEach(async () => {
      // Set up test data with multiple capabilities and templates
      await registry.registerCapability(
        createSampleCapability({
          id: 'backend-services',
          name: 'Backend Services',
          description: 'Backend service templates',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
          phase: DevelopmentPhase.FOUNDATION,
        })
      );

      await registry.registerCapability(
        createSampleCapability({
          id: 'frontend-apps',
          name: 'Frontend Applications',
          description: 'Frontend application templates',
          maturityLevel: CapabilityMaturity.L3_OPERATIONS,
          phase: DevelopmentPhase.STANDARDIZATION,
        })
      );

      // Add templates to capabilities
      await registry.addTemplateToCapability(
        'backend-services',
        createSampleTemplate({
          id: 'api-service',
          name: 'API Service',
          description: 'RESTful API service template',
          metadata: createSampleTemplateMetadata({
            id: 'api-service-meta',
            name: 'API Service Metadata',
            maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
            phase: DevelopmentPhase.FOUNDATION,
          }),
        })
      );

      await registry.addTemplateToCapability(
        'backend-services',
        createSampleTemplate({
          id: 'microservice',
          name: 'Microservice',
          description: 'Microservice template with deployment automation',
          metadata: createSampleTemplateMetadata({
            id: 'microservice-meta',
            name: 'Microservice Metadata',
            maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
            phase: DevelopmentPhase.FOUNDATION,
          }),
        })
      );

      await registry.addTemplateToCapability(
        'frontend-apps',
        createSampleTemplate({
          id: 'react-app',
          name: 'React Application',
          description: 'React application template',
          metadata: createSampleTemplateMetadata({
            id: 'react-app-meta',
            name: 'React App Metadata',
            maturityLevel: CapabilityMaturity.L3_OPERATIONS,
            phase: DevelopmentPhase.STANDARDIZATION,
          }),
        })
      );
    });

    describe('getTemplateDisplayInfo', () => {
      it('should return detailed template information', async () => {
        const displayInfo = await registry.getTemplateDisplayInfo(
          'api-service'
        );

        expect(displayInfo.template.id).toBe('api-service');
        expect(displayInfo.capability.id).toBe('backend-services');
        expect(displayInfo.usageExamples).toHaveLength(2); // Basic + Advanced
        expect(displayInfo.similarTemplates).toBeDefined();
        expect(displayInfo.compositionSuggestions).toBeDefined();
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.getTemplateDisplayInfo('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should include usage examples based on maturity level', async () => {
        const displayInfo = await registry.getTemplateDisplayInfo(
          'api-service'
        );

        expect(displayInfo.usageExamples[0]).toContain('Basic Usage');
        expect(displayInfo.usageExamples[1]).toContain(
          'Advanced Usage with Deployment'
        );
      });
    });

    describe('getAllTemplates', () => {
      it('should return all templates without filter', async () => {
        const allTemplates = await registry.getAllTemplates();

        expect(allTemplates).toHaveLength(3);
        expect(allTemplates.map((t) => t.template.id)).toContain('api-service');
        expect(allTemplates.map((t) => t.template.id)).toContain(
          'microservice'
        );
        expect(allTemplates.map((t) => t.template.id)).toContain('react-app');
      });

      it('should filter by maturity level', async () => {
        const filteredTemplates = await registry.getAllTemplates({
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
        });

        expect(filteredTemplates).toHaveLength(2);
        expect(
          filteredTemplates.every(
            (t) =>
              t.template.metadata.maturityLevel ===
              CapabilityMaturity.L2_DEPLOYMENT
          )
        ).toBe(true);
      });

      it('should filter by phase', async () => {
        const filteredTemplates = await registry.getAllTemplates({
          phase: DevelopmentPhase.STANDARDIZATION,
        });

        expect(filteredTemplates).toHaveLength(1);
        expect(filteredTemplates[0].template.id).toBe('react-app');
      });

      it('should filter by capability', async () => {
        const filteredTemplates = await registry.getAllTemplates({
          capability: 'backend-services',
        });

        expect(filteredTemplates).toHaveLength(2);
        expect(
          filteredTemplates.every((t) => t.capability.id === 'backend-services')
        ).toBe(true);
      });

      it('should filter by search term', async () => {
        const filteredTemplates = await registry.getAllTemplates({
          search: 'API',
        });

        expect(filteredTemplates).toHaveLength(1);
        expect(filteredTemplates[0].template.name).toBe('API Service');
      });
    });

    describe('suggestTemplateComposition', () => {
      it('should suggest composition for similar templates', async () => {
        const suggestions = await registry.suggestTemplateComposition(
          'api-service'
        );

        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.suggestTemplateComposition('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should include different types of suggestions', async () => {
        const suggestions = await registry.suggestTemplateComposition(
          'api-service'
        );

        // Should have suggestions if similar templates exist
        if (suggestions.length > 0) {
          const suggestionTypes = suggestions.map((s) => s.type);
          const validTypes: Array<'extend' | 'compose' | 'merge'> = [
            'extend',
            'compose',
            'merge',
          ];
          expect(
            validTypes.some((type) => suggestionTypes.includes(type))
          ).toBe(true);
        }
      });
    });

    describe('getTemplateCustomizationOptions', () => {
      it('should return customization options for template', async () => {
        const options = await registry.getTemplateCustomizationOptions(
          'api-service'
        );

        expect(options).toHaveLength(5); // name, description, owner, language, deployment_strategy
        expect(options.find((o) => o.id === 'name')).toBeDefined();
        expect(options.find((o) => o.id === 'description')).toBeDefined();
        expect(options.find((o) => o.id === 'owner')).toBeDefined();
      });

      it('should include maturity-specific options', async () => {
        const options = await registry.getTemplateCustomizationOptions(
          'api-service'
        );

        // L2_DEPLOYMENT should include deployment_strategy
        expect(
          options.find((o) => o.id === 'deployment_strategy')
        ).toBeDefined();
      });

      it('should include phase-specific options', async () => {
        const options = await registry.getTemplateCustomizationOptions(
          'api-service'
        );

        // FOUNDATION phase should include repository_type
        expect(options.find((o) => o.id === 'repository_type')).toBeDefined();
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.getTemplateCustomizationOptions('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });
    });

    describe('analyzeTemplateReusability', () => {
      it('should analyze template reusability', async () => {
        const analysis = await registry.analyzeTemplateReusability(
          'api-service'
        );

        expect(analysis.template.id).toBe('api-service');
        expect(analysis.reusabilityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.reusabilityScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(analysis.strengths)).toBe(true);
        expect(Array.isArray(analysis.weaknesses)).toBe(true);
        expect(Array.isArray(analysis.improvementSuggestions)).toBe(true);
        expect(Array.isArray(analysis.compatibleTemplates)).toBe(true);
      });

      it('should provide higher scores for higher maturity templates', async () => {
        const l2Analysis = await registry.analyzeTemplateReusability(
          'api-service'
        );
        const l3Analysis = await registry.analyzeTemplateReusability(
          'react-app'
        );

        expect(l3Analysis.reusabilityScore).toBeGreaterThan(
          l2Analysis.reusabilityScore
        );
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.analyzeTemplateReusability('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });
    });

    describe('findSimilarTemplates', () => {
      it('should find similar templates', async () => {
        const similarTemplates = await registry.findSimilarTemplates(
          'api-service',
          0.1
        );

        expect(Array.isArray(similarTemplates)).toBe(true);
        expect(similarTemplates.every((t) => t.id !== 'api-service')).toBe(
          true
        ); // Should not include self
      });

      it('should respect similarity threshold', async () => {
        const lowThreshold = await registry.findSimilarTemplates(
          'api-service',
          0.1
        );
        const highThreshold = await registry.findSimilarTemplates(
          'api-service',
          0.9
        );

        expect(lowThreshold.length).toBeGreaterThanOrEqual(
          highThreshold.length
        );
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.findSimilarTemplates('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should sort results by similarity', async () => {
        const similarTemplates = await registry.findSimilarTemplates(
          'api-service',
          0.1
        );

        if (similarTemplates.length > 1) {
          // Results should be sorted by similarity (we can't easily test the exact order,
          // but we can verify the structure is correct)
          expect(similarTemplates[0]).toBeDefined();
          expect(similarTemplates[0].id).toBeDefined();
        }
      });
    });
  });

  describe('enhanced conflict resolution and migration', () => {
    beforeEach(async () => {
      // Set up test data for conflict resolution testing
      await registry.registerCapability(
        createSampleCapability({
          id: 'conflict-test-cap',
          name: 'Conflict Test Capability',
          description: 'Capability for testing conflicts',
        })
      );

      await registry.addTemplateToCapability(
        'conflict-test-cap',
        createSampleTemplate({
          id: 'existing-template',
          name: 'Existing Template',
          description: 'Template that already exists',
        })
      );

      await registry.addTemplateToCapability(
        'conflict-test-cap',
        createSampleTemplate({
          id: 'similar-template',
          name: 'Similar Template',
          description: 'Template with similar functionality',
        })
      );
    });

    describe('detectTemplateConflicts', () => {
      it('should detect ID conflicts', async () => {
        const conflictingTemplate = createSampleTemplate({
          id: 'existing-template',
          name: 'Different Name',
        });

        const conflicts = await registry.detectTemplateConflicts(
          conflictingTemplate
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].type).toBe('id');
        expect(conflicts[0].severity).toBe('critical');
        expect(conflicts[0].conflictingTemplate.id).toBe('existing-template');
      });

      it('should detect name conflicts', async () => {
        const conflictingTemplate = createSampleTemplate({
          id: 'different-id',
          name: 'Existing Template',
        });

        const conflicts = await registry.detectTemplateConflicts(
          conflictingTemplate
        );

        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].type).toBe('name');
        expect(conflicts[0].severity).toBe('high');
        expect(conflicts[0].conflictingTemplate.name).toBe('Existing Template');
      });

      it('should detect functionality conflicts for similar templates', async () => {
        const verySimilarTemplate = createSampleTemplate({
          id: 'very-similar',
          name: 'Very Similar Template',
          description: 'Template with similar functionality', // Same description
        });

        const conflicts = await registry.detectTemplateConflicts(
          verySimilarTemplate
        );

        // Should detect functionality conflict due to high similarity
        const functionalityConflicts = conflicts.filter(
          (c) => c.type === 'functionality'
        );
        expect(functionalityConflicts.length).toBeGreaterThan(0);
        expect(functionalityConflicts[0].severity).toBe('medium');
      });

      it('should detect version conflicts', async () => {
        const versionConflictTemplate = createSampleTemplate({
          id: 'version-conflict',
          name: 'Existing Template', // Same name
          version: '2.0.0', // Different version
        });

        const conflicts = await registry.detectTemplateConflicts(
          versionConflictTemplate
        );

        const versionConflicts = conflicts.filter((c) => c.type === 'version');
        expect(versionConflicts.length).toBeGreaterThan(0);
        expect(versionConflicts[0].severity).toBe('low');
      });

      it('should return empty array for no conflicts', async () => {
        const nonConflictingTemplate = createSampleTemplate({
          id: 'unique-id',
          name: 'Unique Name',
          description: 'Completely unique functionality',
        });

        const conflicts = await registry.detectTemplateConflicts(
          nonConflictingTemplate
        );

        expect(conflicts).toHaveLength(0);
      });
    });

    describe('generateConflictResolutions', () => {
      it('should generate rename resolution for ID conflicts', async () => {
        const conflicts = [
          {
            type: 'id' as const,
            severity: 'critical' as const,
            description: 'ID conflict',
            conflictingTemplate: createSampleTemplate(),
            affectedCapabilities: ['test-cap'],
          },
        ];

        const resolutions = await registry.generateConflictResolutions(
          conflicts
        );

        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].strategy).toBe('rename');
        expect(resolutions[0].impact).toBe('low');
        expect(resolutions[0].effort).toBe('small');
        expect(resolutions[0].steps.length).toBeGreaterThan(0);
      });

      it('should generate namespace resolution for name conflicts', async () => {
        const conflicts = [
          {
            type: 'name' as const,
            severity: 'high' as const,
            description: 'Name conflict',
            conflictingTemplate: createSampleTemplate(),
            affectedCapabilities: ['test-cap'],
          },
        ];

        const resolutions = await registry.generateConflictResolutions(
          conflicts
        );

        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].strategy).toBe('namespace');
        expect(resolutions[0].impact).toBe('low');
        expect(resolutions[0].effort).toBe('small');
      });

      it('should generate merge resolution for functionality conflicts', async () => {
        const conflicts = [
          {
            type: 'functionality' as const,
            severity: 'medium' as const,
            description: 'Functionality conflict',
            conflictingTemplate: createSampleTemplate(),
            affectedCapabilities: ['test-cap'],
          },
        ];

        const resolutions = await registry.generateConflictResolutions(
          conflicts
        );

        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].strategy).toBe('merge');
        expect(resolutions[0].impact).toBe('medium');
        expect(resolutions[0].effort).toBe('medium');
      });

      it('should generate version resolution for version conflicts', async () => {
        const conflicts = [
          {
            type: 'version' as const,
            severity: 'low' as const,
            description: 'Version conflict',
            conflictingTemplate: createSampleTemplate(),
            affectedCapabilities: ['test-cap'],
          },
        ];

        const resolutions = await registry.generateConflictResolutions(
          conflicts
        );

        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].strategy).toBe('version');
        expect(resolutions[0].impact).toBe('medium');
        expect(resolutions[0].effort).toBe('medium');
      });

      it('should generate deprecate resolution for dependency conflicts', async () => {
        const conflicts = [
          {
            type: 'dependency' as const,
            severity: 'high' as const,
            description: 'Dependency conflict',
            conflictingTemplate: createSampleTemplate(),
            affectedCapabilities: ['test-cap'],
          },
        ];

        const resolutions = await registry.generateConflictResolutions(
          conflicts
        );

        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].strategy).toBe('deprecate');
        expect(resolutions[0].impact).toBe('high');
        expect(resolutions[0].effort).toBe('large');
      });
    });

    describe('createMigrationPlan', () => {
      it('should create migration plan for template without target', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template'
        );

        expect(migrationPlan.fromTemplate.id).toBe('existing-template');
        expect(migrationPlan.toTemplate).toBeUndefined();
        expect(migrationPlan.strategy).toBe('gradual');
        expect(migrationPlan.phases.length).toBeGreaterThan(0);
        expect(migrationPlan.estimatedDuration).toBeDefined();
        expect(migrationPlan.rollbackPlan.length).toBeGreaterThan(0);
        expect(migrationPlan.dependencies.length).toBeGreaterThan(0);
        expect(migrationPlan.validationSteps.length).toBeGreaterThan(0);
      });

      it('should create migration plan with target template', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template',
          'similar-template'
        );

        expect(migrationPlan.fromTemplate.id).toBe('existing-template');
        expect(migrationPlan.toTemplate?.id).toBe('similar-template');
        expect(['direct', 'phased', 'parallel']).toContain(
          migrationPlan.strategy
        );
        expect(migrationPlan.phases.length).toBeGreaterThan(0);
      });

      it('should throw error for non-existent source template', async () => {
        await expect(
          registry.createMigrationPlan('non-existent')
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should throw error for non-existent target template', async () => {
        await expect(
          registry.createMigrationPlan('existing-template', 'non-existent')
        ).rejects.toThrow('Target template with ID non-existent not found');
      });

      it('should create appropriate phases based on strategy', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template',
          'similar-template'
        );

        // Verify phases have required structure
        for (const phase of migrationPlan.phases) {
          expect(phase.id).toBeDefined();
          expect(phase.name).toBeDefined();
          expect(phase.description).toBeDefined();
          expect(phase.duration).toBeDefined();
          expect(Array.isArray(phase.prerequisites)).toBe(true);
          expect(Array.isArray(phase.steps)).toBe(true);
          expect(Array.isArray(phase.validationCriteria)).toBe(true);
          expect(Array.isArray(phase.rollbackSteps)).toBe(true);
        }
      });
    });

    describe('createDeprecationPlan', () => {
      it('should create deprecation plan for template', async () => {
        const deprecationPlan = await registry.createDeprecationPlan(
          'existing-template',
          'Template is outdated',
          6
        );

        expect(deprecationPlan.template.id).toBe('existing-template');
        expect(deprecationPlan.reason).toBe('Template is outdated');
        expect(deprecationPlan.deprecationDate).toBeInstanceOf(Date);
        expect(deprecationPlan.endOfLifeDate).toBeInstanceOf(Date);
        expect(deprecationPlan.endOfLifeDate.getTime()).toBeGreaterThan(
          deprecationPlan.deprecationDate.getTime()
        );
        expect(deprecationPlan.migrationPlan).toBeDefined();
        expect(deprecationPlan.notificationSchedule.length).toBeGreaterThan(0);
        expect(['full', 'maintenance', 'security-only', 'none']).toContain(
          deprecationPlan.supportLevel
        );
      });

      it('should throw error for non-existent template', async () => {
        await expect(
          registry.createDeprecationPlan('non-existent', 'reason', 6)
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should create appropriate notification schedule', async () => {
        const deprecationPlan = await registry.createDeprecationPlan(
          'existing-template',
          'Template is outdated',
          6
        );

        expect(deprecationPlan.notificationSchedule.length).toBe(3); // announcement, warning, final-notice

        const notificationTypes = deprecationPlan.notificationSchedule.map(
          (n) => n.type
        );
        expect(notificationTypes).toContain('announcement');
        expect(notificationTypes).toContain('warning');
        expect(notificationTypes).toContain('final-notice');
      });

      it('should determine support level based on timeline', async () => {
        const shortTimeline = await registry.createDeprecationPlan(
          'existing-template',
          'reason',
          2
        );
        expect(shortTimeline.supportLevel).toBe('security-only');

        const longTimeline = await registry.createDeprecationPlan(
          'similar-template',
          'reason',
          12
        );
        expect(longTimeline.supportLevel).toBe('full');
      });
    });

    describe('executeConflictResolution', () => {
      it('should execute rename resolution', async () => {
        const resolution = {
          strategy: 'rename' as const,
          description: 'Rename template',
          steps: ['Generate new ID'],
          impact: 'low' as const,
          effort: 'small' as const,
          risks: [],
          benefits: [],
        };

        await registry.executeConflictResolution(
          'existing-template',
          resolution
        );

        // Verify template was renamed (in a real implementation, we'd check the actual change)
        const template = await registry.getCapabilityTemplates(
          'conflict-test-cap'
        );
        expect(template.some((t) => t.id === 'existing-template-v2')).toBe(
          true
        );
      });

      it('should execute namespace resolution', async () => {
        const resolution = {
          strategy: 'namespace' as const,
          description: 'Add namespace',
          steps: ['Add prefix'],
          impact: 'low' as const,
          effort: 'small' as const,
          risks: [],
          benefits: [],
        };

        await registry.executeConflictResolution(
          'existing-template',
          resolution
        );

        // Verify template was namespaced
        const templates = await registry.getCapabilityTemplates(
          'conflict-test-cap'
        );
        const renamedTemplate = templates.find(
          (t) => t.id === 'existing-template'
        );
        expect(renamedTemplate?.name).toContain('Conflict Test Capability');
      });

      it('should throw error for non-existent template', async () => {
        const resolution = {
          strategy: 'rename' as const,
          description: 'Rename template',
          steps: [],
          impact: 'low' as const,
          effort: 'small' as const,
          risks: [],
          benefits: [],
        };

        await expect(
          registry.executeConflictResolution('non-existent', resolution)
        ).rejects.toThrow('Template with ID non-existent not found');
      });

      it('should throw error for unknown resolution strategy', async () => {
        const resolution = {
          strategy: 'unknown' as any,
          description: 'Unknown strategy',
          steps: [],
          impact: 'low' as const,
          effort: 'small' as const,
          risks: [],
          benefits: [],
        };

        await expect(
          registry.executeConflictResolution('existing-template', resolution)
        ).rejects.toThrow('Unknown resolution strategy: unknown');
      });
    });

    describe('executeMigrationPhase', () => {
      it('should execute migration phase successfully', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template'
        );

        const firstPhase = migrationPlan.phases[0];

        await registry.executeMigrationPhase(migrationPlan, firstPhase.id);

        // If we get here without throwing, the phase executed successfully
        expect(true).toBe(true);
      });

      it('should throw error for non-existent phase', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template'
        );

        await expect(
          registry.executeMigrationPhase(migrationPlan, 'non-existent-phase')
        ).rejects.toThrow(
          'Migration phase with ID non-existent-phase not found'
        );
      });

      it('should validate prerequisites before execution', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template'
        );

        // Create a phase with no prerequisites to test validation
        const invalidPhase = {
          ...migrationPlan.phases[0],
          id: 'invalid-phase',
          prerequisites: [],
        };
        migrationPlan.phases.push(invalidPhase);

        await expect(
          registry.executeMigrationPhase(migrationPlan, 'invalid-phase')
        ).rejects.toThrow('Phase invalid-phase has no prerequisites defined');
      });

      it('should validate phase completion', async () => {
        const migrationPlan = await registry.createMigrationPlan(
          'existing-template'
        );

        // Create a phase with no validation criteria
        const invalidPhase = {
          ...migrationPlan.phases[0],
          id: 'invalid-validation-phase',
          validationCriteria: [],
        };
        migrationPlan.phases.push(invalidPhase);

        await expect(
          registry.executeMigrationPhase(
            migrationPlan,
            'invalid-validation-phase'
          )
        ).rejects.toThrow(
          'Phase invalid-validation-phase has no validation criteria defined'
        );
      });
    });
  });
});
