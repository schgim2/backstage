/**
 * Tests for Template Preview System
 */

import {
  TemplatePreviewSystem,
  PreviewOptions,
  PreviewMetadata,
} from '../implementations/template-preview-system';
import {
  GeneratedTemplate,
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
  TemplateMetadata,
} from '../types/core';

describe('TemplatePreviewSystem', () => {
  let previewSystem: TemplatePreviewSystem;

  beforeEach(() => {
    previewSystem = new TemplatePreviewSystem();
  });

  describe('previewTemplate', () => {
    it('should generate a complete template preview', async () => {
      const template: GeneratedTemplate = {
        yaml: JSON.stringify({
          apiVersion: 'scaffolder.backstage.io/v1beta3',
          kind: 'Template',
          metadata: {
            name: 'test-service',
            title: 'Test Service Template',
          },
          spec: {
            type: 'service',
            parameters: {
              name: { type: 'string' },
            },
            steps: [
              {
                id: 'fetch',
                name: 'Fetch Template',
                action: 'fetch:template',
              },
            ],
          },
        }),
        skeleton: {
          files: {
            'README.md': '# Test Service\n\nA test service template',
            'package.json': '{"name": "test-service", "version": "1.0.0"}',
            'src/index.ts': 'console.log("Hello World");',
            '.gitignore': 'node_modules/\n*.log',
          },
          directories: ['src', 'tests', 'docs'],
        },
        documentation: {
          readme: '# Test Service\n\nA comprehensive test service',
          techDocs:
            '# Technical Documentation\n\nDetailed technical information',
          usageExamples: ['npm start', 'npm test', 'npm run build'],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {
          id: 'test-service-template',
          name: 'test-service',
          version: '1.0.0',
          created: new Date(),
          updated: new Date(),
          author: 'test-team',
          maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
          phase: DevelopmentPhase.FOUNDATION,
        },
      };

      const preview = await previewSystem.previewTemplate(template);

      expect(preview).toBeDefined();
      expect(preview.yaml).toBeDefined();
      expect(preview.fileStructure).toHaveLength(7); // 4 files + 3 directories
      expect(preview.documentation).toContain('README Preview');
      expect(preview.documentation).toContain('TechDocs Preview');
      expect(preview.documentation).toContain('Usage Examples');
      expect(preview.validationResults).toBeDefined();
      expect(preview.validationResults.isValid).toBe(true);
    });

    it('should handle preview options correctly', async () => {
      const template: GeneratedTemplate = {
        yaml: '{"test": "yaml"}',
        skeleton: {
          files: {
            'large-file.txt': 'x'.repeat(20000), // Large file
            'small-file.txt': 'small content',
          },
          directories: ['node_modules', 'src'],
        },
        documentation: {
          readme: 'README content',
          techDocs: 'TechDocs content',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const options: PreviewOptions = {
        includeValidation: false,
        includeFileContents: true,
        maxFileSize: 1000,
        excludePatterns: ['node_modules'],
        formatOutput: false,
      };

      const preview = await previewSystem.previewTemplate(template, options);

      expect(preview.validationResults.errors).toHaveLength(0);
      expect(preview.validationResults.warnings).toHaveLength(0);
      expect(
        preview.fileStructure.some((item) => item.includes('node_modules'))
      ).toBe(false);
      expect(
        preview.fileStructure.some((item) => item.includes('small-file.txt'))
      ).toBe(true);
      expect(preview.yaml).toBe('{"test": "yaml"}'); // Not formatted
    });

    it('should include file contents when requested', async () => {
      const template: GeneratedTemplate = {
        yaml: '{}',
        skeleton: {
          files: {
            'test.js': 'console.log("test");',
          },
          directories: [],
        },
        documentation: {
          readme: '',
          techDocs: '',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const preview = await previewSystem.previewTemplate(template, {
        includeFileContents: true,
      });

      expect(preview.fileStructure[0]).toContain('console.log("test");');
      expect(preview.fileStructure[0]).toContain('```javascript');
    });
  });

  describe('previewFromSpec', () => {
    it('should generate preview from template specification', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-service',
          description: 'A test service template',
          tags: ['typescript', 'api', 'docker'],
          owner: 'platform-team',
        },
        parameters: {
          serviceName: { type: 'string' },
          port: { type: 'number', default: 3000 },
        },
        steps: [
          {
            id: 'fetch',
            name: 'Fetch Template',
            action: 'fetch:template',
            input: { url: './skeleton' },
          },
          {
            id: 'publish',
            name: 'Publish to GitHub',
            action: 'publish:github',
            input: { repoUrl: 'github.com' },
          },
        ],
        output: {
          links: [
            { title: 'Repository', url: 'https://github.com/example/repo' },
          ],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await previewSystem.previewFromSpec(spec);

      expect(preview.specPreview).toBeDefined();
      expect(preview.specPreview).toContain('test-service');
      expect(preview.specPreview).toContain('2 parameters defined');
      expect(preview.validationResults).toBeDefined();
      expect(preview.estimatedStructure).toContain('📄 package.json');
      expect(preview.estimatedStructure).toContain('📄 Dockerfile');
      expect(preview.estimatedStructure).toContain('📁 src/');
      expect(preview.recommendations).toContain(
        'Add catalog registration step for better discoverability'
      );
    });

    it('should provide recommendations for incomplete specs', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'minimal-template',
          description: 'A minimal template',
          tags: [],
          owner: 'test-team',
        },
        parameters: {},
        steps: [
          {
            id: 'fetch',
            name: 'Fetch',
            action: 'fetch:template',
            input: {},
          },
        ],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await previewSystem.previewFromSpec(spec);

      expect(preview.recommendations).toContain(
        'Consider adding more steps for a complete workflow (fetch, publish, register)'
      );
      expect(preview.recommendations).toContain(
        'Add parameters to make the template more flexible and reusable'
      );
      expect(preview.recommendations).toContain(
        'Add output links to help users navigate to created resources'
      );
    });
  });

  describe('generateInteractivePreview', () => {
    it('should generate interactive preview with validation callback', async () => {
      const template: GeneratedTemplate = {
        yaml: JSON.stringify({
          apiVersion: 'scaffolder.backstage.io/v1beta3',
          kind: 'Template',
          spec: {},
        }),
        skeleton: {
          files: { 'README.md': '# Test' },
          directories: [],
        },
        documentation: {
          readme: 'Test README',
          techDocs: 'Test TechDocs',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      let validationCallbackCalled = false;
      const onValidationUpdate = jest.fn(() => {
        validationCallbackCalled = true;
      });

      const preview = await previewSystem.generateInteractivePreview(
        template,
        onValidationUpdate
      );

      expect(preview).toBeDefined();
      expect(preview.yaml).toBeDefined();
      expect(preview.fileStructure).toBeDefined();

      // Wait for callback to be called
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(validationCallbackCalled).toBe(true);
    });
  });

  describe('generatePreviewMetadata', () => {
    it('should generate accurate preview metadata', () => {
      const template: GeneratedTemplate = {
        yaml: '{}',
        skeleton: {
          files: {
            'file1.txt': 'content1',
            'file2.txt': 'longer content here',
          },
          directories: ['dir1'],
        },
        documentation: {
          readme: '',
          techDocs: '',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {
          id: 'test-template',
          name: 'test',
          version: '2.1.0',
          created: new Date(),
          updated: new Date(),
          author: 'test-author',
          maturityLevel: CapabilityMaturity.L3_OPERATIONS,
          phase: DevelopmentPhase.OPERATIONALIZATION,
        },
      };

      const metadata = previewSystem.generatePreviewMetadata(template);

      expect(metadata.templateId).toBe('test-template');
      expect(metadata.version).toBe('2.1.0');
      expect(metadata.maturityLevel).toBe(CapabilityMaturity.L3_OPERATIONS);
      expect(metadata.phase).toBe(DevelopmentPhase.OPERATIONALIZATION);
      expect(metadata.fileCount).toBe(2);
      expect(metadata.estimatedSize).toBe(27); // 'content1' (8) + 'longer content here' (19)
      expect(metadata.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateComparisonPreview', () => {
    it('should generate comparison between two templates', async () => {
      const originalTemplate: GeneratedTemplate = {
        yaml: JSON.stringify({ version: '1.0.0' }),
        skeleton: {
          files: { 'file1.txt': 'original content' },
          directories: ['dir1'],
        },
        documentation: {
          readme: 'Original README',
          techDocs: 'Original TechDocs',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const updatedTemplate: GeneratedTemplate = {
        yaml: JSON.stringify({ version: '2.0.0' }),
        skeleton: {
          files: {
            'file1.txt': 'updated content',
            'file2.txt': 'new file',
          },
          directories: ['dir1'],
        },
        documentation: {
          readme: 'Updated README',
          techDocs: 'Updated TechDocs',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const comparison = await previewSystem.generateComparisonPreview(
        originalTemplate,
        updatedTemplate
      );

      expect(comparison.originalPreview).toBeDefined();
      expect(comparison.updatedPreview).toBeDefined();
      expect(comparison.differences.yamlChanges).toContain(
        'YAML structure changes detected'
      );
      expect(comparison.differences.fileChanges).toContain(
        'Modified: file1.txt'
      );
      expect(comparison.differences.fileChanges).toContain('Added: file2.txt');
    });
  });

  describe('validation context management', () => {
    it('should update validation context', () => {
      const newContext = {
        maturityLevel: CapabilityMaturity.L5_INTENT_DRIVEN,
        environment: 'production' as const,
      };

      previewSystem.updateValidationContext(newContext);

      const context = previewSystem.getValidationContext();
      expect(context.maturityLevel).toBe(CapabilityMaturity.L5_INTENT_DRIVEN);
      expect(context.environment).toBe('production');
    });

    it('should get current validation context', () => {
      const context = previewSystem.getValidationContext();

      expect(context).toBeDefined();
      expect(context.maturityLevel).toBeDefined();
      expect(context.phase).toBeDefined();
      expect(context.environment).toBeDefined();
    });
  });

  describe('file structure estimation', () => {
    it('should estimate TypeScript project structure', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'ts-service',
          description: 'TypeScript service',
          tags: ['typescript', 'api'],
          owner: 'dev-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await previewSystem.previewFromSpec(spec);

      expect(preview.estimatedStructure).toContain('📄 package.json');
      expect(preview.estimatedStructure).toContain('📄 tsconfig.json');
      expect(preview.estimatedStructure).toContain('📁 src/');
      expect(preview.estimatedStructure).toContain('📁 tests/');
    });

    it('should estimate Python project structure', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'py-service',
          description: 'Python service',
          tags: ['python'],
          owner: 'dev-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await previewSystem.previewFromSpec(spec);

      expect(preview.estimatedStructure).toContain('📄 requirements.txt');
      expect(preview.estimatedStructure).toContain('📄 setup.py');
      expect(preview.estimatedStructure).toContain('📁 src/');
      expect(preview.estimatedStructure).toContain('📁 tests/');
    });

    it('should estimate Kubernetes project structure', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'k8s-service',
          description: 'Kubernetes service',
          tags: ['kubernetes', 'docker'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const preview = await previewSystem.previewFromSpec(spec);

      expect(preview.estimatedStructure).toContain('📄 Dockerfile');
      expect(preview.estimatedStructure).toContain('📁 k8s/');
      expect(preview.estimatedStructure).toContain('📄 k8s/deployment.yaml');
      expect(preview.estimatedStructure).toContain('📄 k8s/service.yaml');
    });
  });

  describe('content formatting', () => {
    it('should format file sizes correctly', () => {
      const template: GeneratedTemplate = {
        yaml: '{}',
        skeleton: {
          files: {
            'small.txt': 'x'.repeat(500), // 500 bytes
            'medium.txt': 'x'.repeat(2048), // 2KB
            'large.txt': 'x'.repeat(2 * 1024 * 1024), // 2MB
          },
          directories: [],
        },
        documentation: {
          readme: '',
          techDocs: '',
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const preview = previewSystem.previewTemplate(template);

      expect(preview).resolves.toBeDefined();
    });

    it('should truncate long content appropriately', async () => {
      const longContent = 'x'.repeat(1000);
      const template: GeneratedTemplate = {
        yaml: '{}',
        skeleton: {
          files: {},
          directories: [],
        },
        documentation: {
          readme: longContent,
          techDocs: longContent,
          usageExamples: [],
        },
        validation: {
          security: [],
          compliance: [],
          standards: [],
          cost: [],
        },
        metadata: {} as TemplateMetadata,
      };

      const preview = await previewSystem.previewTemplate(template);

      expect(preview.documentation).toContain('...');
      expect(preview.documentation.length).toBeLessThan(longContent.length * 2);
    });
  });
});
