/**
 * Skeleton Repository Generator Tests
 */

import { SkeletonRepositoryGenerator } from '../implementations/skeleton-generator';
import {
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('SkeletonRepositoryGenerator', () => {
  let generator: SkeletonRepositoryGenerator;

  beforeEach(() => {
    generator = new SkeletonRepositoryGenerator();
  });

  describe('generateSkeleton', () => {
    test('should generate basic service skeleton', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'user-service',
          description: 'User management service',
          tags: ['service', 'typescript'],
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

      const skeleton = await generator.generateSkeleton(spec);

      expect(skeleton.files).toBeDefined();
      expect(skeleton.directories).toBeDefined();

      // Should have basic files
      expect(skeleton.files['package.json']).toBeDefined();
      expect(skeleton.files['README.md']).toBeDefined();
      expect(skeleton.files['catalog-info.yaml']).toBeDefined();
      expect(skeleton.files['tsconfig.json']).toBeDefined();
      expect(skeleton.files['src/index.ts']).toBeDefined();

      // Should have basic directories
      expect(skeleton.directories).toContain('src');
      expect(skeleton.directories).toContain('tests');
      expect(skeleton.directories).toContain('docs');
    });

    test('should generate frontend skeleton with React', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'company-website',
          description: 'Company frontend website with React',
          tags: ['frontend', 'react', 'typescript'],
          owner: 'frontend-team',
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have frontend-specific structure
      expect(skeleton.directories).toContain('src/components');
      expect(skeleton.directories).toContain('src/pages');
      expect(skeleton.directories).toContain('src/hooks');
      expect(skeleton.directories).toContain('public');

      // Should have React-specific files
      expect(skeleton.files['src/App.tsx']).toBeDefined();
      expect(skeleton.files['src/App.css']).toBeDefined();
    });

    test('should generate Python service skeleton', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'data-processor',
          description: 'Data processing service in Python',
          tags: ['service', 'python'],
          owner: 'data-team',
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have Python-specific files
      expect(skeleton.files['requirements.txt']).toBeDefined();
      expect(skeleton.files['setup.py']).toBeDefined();
      expect(skeleton.files['pyproject.toml']).toBeDefined();
      expect(skeleton.files['src/__init__.py']).toBeDefined();
    });

    test('should generate Go service skeleton', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'api-gateway',
          description: 'API gateway service in Go',
          tags: ['service', 'go'],
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have Go-specific files
      expect(skeleton.files['go.mod']).toBeDefined();
      expect(skeleton.files['go.sum']).toBeDefined();
      expect(skeleton.files['src/main.go']).toBeDefined();

      // Check go.mod content
      expect(skeleton.files['go.mod']).toContain('module');
      expect(skeleton.files['go.mod']).toContain('go 1.21');
    });

    test('should generate library skeleton', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'utility-library',
          description: 'Utility library for common functions',
          tags: ['library', 'typescript'],
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have library-specific structure
      expect(skeleton.directories).toContain('src');
      expect(skeleton.directories).toContain('tests');
      expect(skeleton.directories).toContain('docs');
      expect(skeleton.directories).toContain('examples');
    });

    test('should generate documentation skeleton', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'api-docs',
          description: 'API documentation site',
          tags: ['documentation'],
          owner: 'docs-team',
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have documentation-specific structure
      expect(skeleton.directories).toContain('docs');
      expect(skeleton.directories).toContain('docs/guides');
      expect(skeleton.directories).toContain('docs/api');
      expect(skeleton.directories).toContain('docs/tutorials');
      expect(skeleton.directories).toContain('assets');
      expect(skeleton.directories).toContain('assets/images');
    });

    test('should add deployment files for L2 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'deployment-service',
          description: 'Service with deployment automation',
          tags: ['service', 'L2', 'deployment'],
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have deployment-specific files
      expect(skeleton.files['Dockerfile']).toBeDefined();
      expect(skeleton.files['.github/workflows/ci.yml']).toBeDefined();
      expect(skeleton.directories).toContain('.github');
      expect(skeleton.directories).toContain('.github/workflows');
    });

    test('should add operational files for L3 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'operational-service',
          description: 'Service with operational capabilities',
          tags: ['service', 'L3', 'operations'],
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have operational files
      expect(skeleton.files['Dockerfile']).toBeDefined();
      expect(skeleton.files['docker-compose.yml']).toBeDefined();
      expect(skeleton.files['monitoring.yml']).toBeDefined();
      expect(skeleton.files['.github/workflows/ci.yml']).toBeDefined();
    });

    test('should add governance files for L4 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'governance-service',
          description: 'Service with governance controls',
          tags: ['service', 'L4', 'governance'],
          owner: 'security-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: {
          security: [
            {
              type: 'baseline',
              rule: 'Must use HTTPS',
              enforcement: 'block',
            },
          ],
          compliance: [],
          standards: [],
          cost: [],
        },
      };

      const skeleton = await generator.generateSkeleton(spec);

      // Should have governance files
      expect(skeleton.files['SECURITY.md']).toBeDefined();
      expect(skeleton.files['compliance.yml']).toBeDefined();
      expect(skeleton.files['Dockerfile']).toBeDefined();
      expect(skeleton.files['docker-compose.yml']).toBeDefined();
      expect(skeleton.files['monitoring.yml']).toBeDefined();
    });

    test('should add intent-driven files for L5 maturity', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'intelligent-service',
          description: 'AI-driven intelligent service',
          tags: ['service', 'L5', 'intent-driven'],
          owner: 'ai-team',
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

      const skeleton = await generator.generateSkeleton(spec);

      // Should have intent-driven files
      expect(skeleton.files['intent.yml']).toBeDefined();
      expect(skeleton.files['SECURITY.md']).toBeDefined();
      expect(skeleton.files['compliance.yml']).toBeDefined();
    });

    test('should add phase-specific files', async () => {
      const standardizationSpec: TemplateSpec = {
        metadata: {
          name: 'standards-service',
          description: 'Service with standardization',
          tags: ['service', 'standards'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(standardizationSpec);
      expect(skeleton.files['standards.yml']).toBeDefined();
    });

    test('should generate proper package.json content', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'test-service',
          description: 'Test service for package.json',
          tags: ['service', 'typescript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const packageJson = JSON.parse(skeleton.files['package.json']);

      expect(packageJson.name).toBe(
        '${{ values.name | lower | replace(" ", "-") }}'
      );
      expect(packageJson.description).toBe('${{ values.description }}');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBe('tsc');
      expect(packageJson.scripts.test).toBe('jest');
    });

    test('should generate proper TypeScript config', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'ts-service',
          description: 'TypeScript service',
          tags: ['service', 'typescript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const tsConfig = JSON.parse(skeleton.files['tsconfig.json']);

      expect(tsConfig.compilerOptions.target).toBe('ES2020');
      expect(tsConfig.compilerOptions.module).toBe('commonjs');
      expect(tsConfig.compilerOptions.outDir).toBe('./dist');
      expect(tsConfig.compilerOptions.rootDir).toBe('./src');
      expect(tsConfig.compilerOptions.strict).toBe(true);
    });

    test('should generate proper catalog-info.yaml', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'catalog-service',
          description: 'Service for catalog testing',
          tags: ['service'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const catalogInfo = skeleton.files['catalog-info.yaml'];

      expect(catalogInfo).toContain('apiVersion: backstage.io/v1alpha1');
      expect(catalogInfo).toContain('kind: Component');
      expect(catalogInfo).toContain(
        'name: ${{ values.name | lower | replace(" ", "-") }}'
      );
      expect(catalogInfo).toContain('title: ${{ values.name }}');
      expect(catalogInfo).toContain('description: ${{ values.description }}');
      expect(catalogInfo).toContain('type: service');
      expect(catalogInfo).toContain('owner: ${{ values.owner }}');
    });

    test('should generate proper README.md', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'readme-service',
          description: 'Service for README testing',
          tags: ['service', 'typescript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const readme = skeleton.files['README.md'];

      expect(readme).toContain('# ${{ values.name }}');
      expect(readme).toContain('${{ values.description }}');
      expect(readme).toContain('## Getting Started');
      expect(readme).toContain('### Prerequisites');
      expect(readme).toContain('- Node.js 18+');
      expect(readme).toContain('- TypeScript 5+');
      expect(readme).toContain('npm install');
      expect(readme).toContain('npm run dev');
      expect(readme).toContain('npm run build');
      expect(readme).toContain('npm test');
    });

    test('should generate TypeScript main file', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'main-service',
          description: 'Service for main file testing',
          tags: ['service', 'typescript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const mainFile = skeleton.files['src/index.ts'];

      expect(mainFile).toContain('export class');
      expect(mainFile).toContain(
        '${{ values.name | title | replace(" ", "") | replace("-", "") }}'
      );
      expect(mainFile).toContain('constructor()');
      expect(mainFile).toContain('async start(): Promise<void>');
      expect(mainFile).toContain('export default');
    });

    test('should generate JavaScript main file', async () => {
      const spec: TemplateSpec = {
        metadata: {
          name: 'js-service',
          description: 'JavaScript service',
          tags: ['service', 'javascript'],
          owner: 'platform-team',
        },
        parameters: {},
        steps: [],
        output: {},
        validation: { security: [], compliance: [], standards: [], cost: [] },
      };

      const skeleton = await generator.generateSkeleton(spec);
      const mainFile = skeleton.files['src/index.js'];

      expect(mainFile).toContain('class');
      expect(mainFile).toContain('constructor()');
      expect(mainFile).toContain('async start()');
      expect(mainFile).toContain('module.exports');
    });
  });
});
