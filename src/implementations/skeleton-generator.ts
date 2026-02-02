/**
 * Skeleton Repository Generator
 * Creates file structure and templated file content for Backstage templates
 */

import {
  TemplateSpec,
  SkeletonStructure,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

export interface FileTemplate {
  path: string;
  content: string;
  executable?: boolean;
  encoding?: 'utf8' | 'binary';
}

export interface DirectoryStructure {
  name: string;
  files: FileTemplate[];
  subdirectories: DirectoryStructure[];
}

export interface SkeletonConfig {
  templateType: 'service' | 'frontend' | 'library' | 'documentation';
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'generic';
  framework?: string;
  includeTests: boolean;
  includeDocs: boolean;
  includeCI: boolean;
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
}

export class SkeletonRepositoryGenerator {
  private readonly templateVariables = {
    // Common template variables
    name: '${{ values.name }}',
    description: '${{ values.description }}',
    owner: '${{ values.owner }}',
    destination: '${{ values.destination }}',

    // Computed variables
    nameKebab: '${{ values.name | lower | replace(" ", "-") }}',
    namePascal:
      '${{ values.name | title | replace(" ", "") | replace("-", "") }}',
    nameCamel: '${{ values.name | camelCase }}',
    nameSnake:
      '${{ values.name | lower | replace(" ", "_") | replace("-", "_") }}',

    // Date and metadata
    currentYear: new Date().getFullYear().toString(),
    timestamp: '${{ "" | now }}',
  };

  private readonly baseStructures: Record<string, DirectoryStructure> = {
    service: {
      name: 'service-template',
      files: [],
      subdirectories: [
        {
          name: 'src',
          files: [],
          subdirectories: [
            {
              name: 'controllers',
              files: [],
              subdirectories: [],
            },
            {
              name: 'services',
              files: [],
              subdirectories: [],
            },
            {
              name: 'models',
              files: [],
              subdirectories: [],
            },
            {
              name: 'utils',
              files: [],
              subdirectories: [],
            },
          ],
        },
        {
          name: 'tests',
          files: [],
          subdirectories: [],
        },
        {
          name: 'docs',
          files: [],
          subdirectories: [],
        },
        {
          name: '.github',
          files: [],
          subdirectories: [
            {
              name: 'workflows',
              files: [],
              subdirectories: [],
            },
          ],
        },
      ],
    },
    frontend: {
      name: 'frontend-template',
      files: [],
      subdirectories: [
        {
          name: 'src',
          files: [],
          subdirectories: [
            {
              name: 'components',
              files: [],
              subdirectories: [],
            },
            {
              name: 'pages',
              files: [],
              subdirectories: [],
            },
            {
              name: 'hooks',
              files: [],
              subdirectories: [],
            },
            {
              name: 'utils',
              files: [],
              subdirectories: [],
            },
            {
              name: 'styles',
              files: [],
              subdirectories: [],
            },
          ],
        },
        {
          name: 'public',
          files: [],
          subdirectories: [],
        },
        {
          name: 'tests',
          files: [],
          subdirectories: [],
        },
      ],
    },
    library: {
      name: 'library-template',
      files: [],
      subdirectories: [
        {
          name: 'src',
          files: [],
          subdirectories: [],
        },
        {
          name: 'tests',
          files: [],
          subdirectories: [],
        },
        {
          name: 'docs',
          files: [],
          subdirectories: [],
        },
        {
          name: 'examples',
          files: [],
          subdirectories: [],
        },
      ],
    },
    documentation: {
      name: 'docs-template',
      files: [],
      subdirectories: [
        {
          name: 'docs',
          files: [],
          subdirectories: [
            {
              name: 'guides',
              files: [],
              subdirectories: [],
            },
            {
              name: 'api',
              files: [],
              subdirectories: [],
            },
            {
              name: 'tutorials',
              files: [],
              subdirectories: [],
            },
          ],
        },
        {
          name: 'assets',
          files: [],
          subdirectories: [
            {
              name: 'images',
              files: [],
              subdirectories: [],
            },
          ],
        },
      ],
    },
  };

  async generateSkeleton(spec: TemplateSpec): Promise<SkeletonStructure> {
    const config = this.extractSkeletonConfig(spec);
    const structure = this.buildDirectoryStructure(config);
    const files = this.generateFiles(structure, config);
    const directories = this.extractDirectories(structure);

    return {
      files,
      directories,
    };
  }

  private extractSkeletonConfig(spec: TemplateSpec): SkeletonConfig {
    const tags = spec.metadata.tags || [];
    const description = spec.metadata.description.toLowerCase();

    // Determine template type
    let templateType: SkeletonConfig['templateType'] = 'service';
    if (
      tags.includes('frontend') ||
      description.includes('frontend') ||
      description.includes('ui')
    ) {
      templateType = 'frontend';
    } else if (tags.includes('library') || description.includes('library')) {
      templateType = 'library';
    } else if (tags.includes('documentation') || description.includes('docs')) {
      templateType = 'documentation';
    }

    // Determine language
    let language: SkeletonConfig['language'] = 'typescript';
    if (tags.includes('javascript') || description.includes('javascript')) {
      language = 'javascript';
    } else if (tags.includes('python') || description.includes('python')) {
      language = 'python';
    } else if (tags.includes('java') || description.includes('java')) {
      language = 'java';
    } else if (tags.includes('go') || description.includes('golang')) {
      language = 'go';
    }

    // Determine framework
    let framework: string | undefined;
    if (description.includes('react')) framework = 'react';
    else if (description.includes('vue')) framework = 'vue';
    else if (description.includes('angular')) framework = 'angular';
    else if (description.includes('express')) framework = 'express';
    else if (description.includes('fastapi')) framework = 'fastapi';
    else if (description.includes('spring')) framework = 'spring';

    // Extract maturity and phase
    const maturityLevel = this.extractMaturityLevel(tags);
    const phase = this.extractPhase(tags);

    return {
      templateType,
      language,
      framework,
      includeTests: true,
      includeDocs: true,
      includeCI: maturityLevel !== CapabilityMaturity.L1_GENERATION,
      maturityLevel,
      phase,
    };
  }

  private buildDirectoryStructure(config: SkeletonConfig): DirectoryStructure {
    const baseStructure = { ...this.baseStructures[config.templateType] };

    // Add language-specific files
    this.addLanguageSpecificFiles(baseStructure, config);

    // Add framework-specific files
    if (config.framework) {
      this.addFrameworkSpecificFiles(baseStructure, config);
    }

    // Add maturity-specific files
    this.addMaturitySpecificFiles(baseStructure, config);

    // Add phase-specific files
    this.addPhaseSpecificFiles(baseStructure, config);

    return baseStructure;
  }

  private addLanguageSpecificFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    const rootFiles: FileTemplate[] = [];
    const srcFiles: FileTemplate[] = [];

    switch (config.language) {
      case 'typescript':
        rootFiles.push(
          {
            path: 'package.json',
            content: this.generatePackageJson(config),
          },
          {
            path: 'tsconfig.json',
            content: this.generateTsConfig(config),
          },
          {
            path: '.eslintrc.js',
            content: this.generateEslintConfig(config),
          },
          {
            path: '.prettierrc',
            content: this.generatePrettierConfig(),
          }
        );
        srcFiles.push({
          path: 'index.ts',
          content: this.generateMainFile(config),
        });
        break;

      case 'javascript':
        rootFiles.push({
          path: 'package.json',
          content: this.generatePackageJson(config),
        });
        srcFiles.push({
          path: 'index.js',
          content: this.generateMainFile(config),
        });
        break;

      case 'python':
        rootFiles.push(
          {
            path: 'requirements.txt',
            content: this.generateRequirementsTxt(config),
          },
          {
            path: 'setup.py',
            content: this.generateSetupPy(config),
          },
          {
            path: 'pyproject.toml',
            content: this.generatePyprojectToml(config),
          }
        );
        srcFiles.push({
          path: '__init__.py',
          content: this.generatePythonInit(config),
        });
        break;

      case 'java':
        rootFiles.push(
          {
            path: 'pom.xml',
            content: this.generatePomXml(config),
          },
          {
            path: 'build.gradle',
            content: this.generateBuildGradle(config),
          }
        );
        break;

      case 'go':
        rootFiles.push(
          {
            path: 'go.mod',
            content: this.generateGoMod(config),
          },
          {
            path: 'go.sum',
            content: '',
          }
        );
        srcFiles.push({
          path: 'main.go',
          content: this.generateGoMain(config),
        });
        break;
    }

    // Add common files
    rootFiles.push(
      {
        path: 'README.md',
        content: this.generateReadme(config),
      },
      {
        path: '.gitignore',
        content: this.generateGitignore(config),
      },
      {
        path: 'catalog-info.yaml',
        content: this.generateCatalogInfo(config),
      }
    );

    // Add files to structure
    structure.files.push(...rootFiles);
    const srcDir = structure.subdirectories.find((d) => d.name === 'src');
    if (srcDir) {
      srcDir.files.push(...srcFiles);
    }
  }

  private addFrameworkSpecificFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    if (!config.framework) return;

    const srcDir = structure.subdirectories.find((d) => d.name === 'src');
    if (!srcDir) return;

    switch (config.framework) {
      case 'react':
        srcDir.files.push(
          {
            path: 'App.tsx',
            content: this.generateReactApp(config),
          },
          {
            path: 'App.css',
            content: this.generateReactAppCss(),
          }
        );
        break;

      case 'express':
        srcDir.files.push(
          {
            path: 'app.ts',
            content: this.generateExpressApp(config),
          },
          {
            path: 'routes/index.ts',
            content: this.generateExpressRoutes(config),
          }
        );
        break;

      case 'fastapi':
        srcDir.files.push(
          {
            path: 'main.py',
            content: this.generateFastApiMain(config),
          },
          {
            path: 'routers/__init__.py',
            content: '',
          }
        );
        break;
    }
  }

  private addMaturitySpecificFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    switch (config.maturityLevel) {
      case CapabilityMaturity.L2_DEPLOYMENT:
        this.addDeploymentFiles(structure, config);
        break;
      case CapabilityMaturity.L3_OPERATIONS:
        this.addDeploymentFiles(structure, config);
        this.addOperationalFiles(structure, config);
        break;
      case CapabilityMaturity.L4_GOVERNANCE:
        this.addDeploymentFiles(structure, config);
        this.addOperationalFiles(structure, config);
        this.addGovernanceFiles(structure, config);
        break;
      case CapabilityMaturity.L5_INTENT_DRIVEN:
        this.addDeploymentFiles(structure, config);
        this.addOperationalFiles(structure, config);
        this.addGovernanceFiles(structure, config);
        this.addIntentDrivenFiles(structure, config);
        break;
    }
  }

  private addPhaseSpecificFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    switch (config.phase) {
      case DevelopmentPhase.STANDARDIZATION:
        this.addStandardizationFiles(structure, config);
        break;
      case DevelopmentPhase.OPERATIONALIZATION:
        this.addOperationalizationFiles(structure, config);
        break;
      case DevelopmentPhase.GOVERNANCE:
        this.addGovernancePhaseFiles(structure, config);
        break;
      case DevelopmentPhase.INTENT_DRIVEN:
        this.addIntentDrivenPhaseFiles(structure, config);
        break;
    }
  }

  private addDeploymentFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    const githubDir = structure.subdirectories.find(
      (d) => d.name === '.github'
    );
    const workflowsDir = githubDir?.subdirectories.find(
      (d) => d.name === 'workflows'
    );

    if (workflowsDir) {
      workflowsDir.files.push({
        path: 'ci.yml',
        content: this.generateCIWorkflow(config),
      });
    }

    structure.files.push({
      path: 'Dockerfile',
      content: this.generateDockerfile(config),
    });
  }

  private addOperationalFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push(
      {
        path: 'docker-compose.yml',
        content: this.generateDockerCompose(config),
      },
      {
        path: 'monitoring.yml',
        content: this.generateMonitoringConfig(config),
      }
    );
  }

  private addGovernanceFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push(
      {
        path: 'SECURITY.md',
        content: this.generateSecurityPolicy(config),
      },
      {
        path: 'compliance.yml',
        content: this.generateComplianceConfig(config),
      }
    );
  }

  private addIntentDrivenFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push({
      path: 'intent.yml',
      content: this.generateIntentConfig(config),
    });
  }

  private addStandardizationFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push({
      path: 'standards.yml',
      content: this.generateStandardsConfig(config),
    });
  }

  private addOperationalizationFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push({
      path: 'operations.yml',
      content: this.generateOperationsConfig(config),
    });
  }

  private addGovernancePhaseFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push({
      path: 'governance.yml',
      content: this.generateGovernanceConfig(config),
    });
  }

  private addIntentDrivenPhaseFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): void {
    structure.files.push({
      path: 'intent-driven.yml',
      content: this.generateIntentDrivenConfig(config),
    });
  }

  private generateFiles(
    structure: DirectoryStructure,
    config: SkeletonConfig
  ): Record<string, string> {
    const files: Record<string, string> = {};

    const processDirectory = (
      dir: DirectoryStructure,
      basePath: string = ''
    ) => {
      // Process files in current directory
      dir.files.forEach((file) => {
        const fullPath = basePath ? `${basePath}/${file.path}` : file.path;
        files[fullPath] = file.content;
      });

      // Process subdirectories
      dir.subdirectories.forEach((subdir) => {
        const newBasePath = basePath
          ? `${basePath}/${subdir.name}`
          : subdir.name;
        processDirectory(subdir, newBasePath);
      });
    };

    processDirectory(structure);
    return files;
  }

  private extractDirectories(structure: DirectoryStructure): string[] {
    const directories: string[] = [];

    const processDirectory = (
      dir: DirectoryStructure,
      basePath: string = ''
    ) => {
      dir.subdirectories.forEach((subdir) => {
        const fullPath = basePath ? `${basePath}/${subdir.name}` : subdir.name;
        directories.push(fullPath);
        processDirectory(subdir, fullPath);
      });
    };

    processDirectory(structure);
    return directories;
  }

  private extractMaturityLevel(tags: string[]): CapabilityMaturity {
    if (tags.includes('L5')) return CapabilityMaturity.L5_INTENT_DRIVEN;
    if (tags.includes('L4')) return CapabilityMaturity.L4_GOVERNANCE;
    if (tags.includes('L3')) return CapabilityMaturity.L3_OPERATIONS;
    if (tags.includes('L2')) return CapabilityMaturity.L2_DEPLOYMENT;
    return CapabilityMaturity.L1_GENERATION;
  }

  private extractPhase(tags: string[]): DevelopmentPhase {
    if (tags.includes('intent-driven')) return DevelopmentPhase.INTENT_DRIVEN;
    if (tags.includes('governance')) return DevelopmentPhase.GOVERNANCE;
    if (tags.includes('operations')) return DevelopmentPhase.OPERATIONALIZATION;
    if (tags.includes('standards')) return DevelopmentPhase.STANDARDIZATION;
    return DevelopmentPhase.FOUNDATION;
  }

  // File content generators (simplified versions for brevity)
  private generatePackageJson(config: SkeletonConfig): string {
    return JSON.stringify(
      {
        name: this.templateVariables.nameKebab,
        version: '1.0.0',
        description: this.templateVariables.description,
        main:
          config.language === 'typescript' ? 'dist/index.js' : 'src/index.js',
        scripts: {
          build:
            config.language === 'typescript' ? 'tsc' : 'echo "No build needed"',
          start:
            'node ' +
            (config.language === 'typescript'
              ? 'dist/index.js'
              : 'src/index.js'),
          dev:
            config.language === 'typescript'
              ? 'ts-node src/index.ts'
              : 'node src/index.js',
          test: 'jest',
          lint: 'eslint src/**/*.{js,ts}',
        },
        dependencies: this.getLanguageDependencies(config),
        devDependencies: this.getLanguageDevDependencies(config),
      },
      null,
      2
    );
  }

  private generateTsConfig(config: SkeletonConfig): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['ES2020'],
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2
    );
  }

  private generateReadme(config: SkeletonConfig): string {
    return `# ${this.templateVariables.name}

${this.templateVariables.description}

## Getting Started

### Prerequisites

- Node.js 18+
${config.language === 'typescript' ? '- TypeScript 5+' : ''}

### Installation

\`\`\`bash
npm install
\`\`\`

### Development

\`\`\`bash
npm run dev
\`\`\`

### Build

\`\`\`bash
npm run build
\`\`\`

### Test

\`\`\`bash
npm test
\`\`\`

## Documentation

For more information, see the [documentation](./docs/).

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;
  }

  private generateCatalogInfo(config: SkeletonConfig): string {
    return `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: ${this.templateVariables.nameKebab}
  title: ${this.templateVariables.name}
  description: ${this.templateVariables.description}
  annotations:
    github.com/project-slug: ${this.templateVariables.destination}
    backstage.io/techdocs-ref: dir:.
spec:
  type: ${config.templateType}
  lifecycle: experimental
  owner: ${this.templateVariables.owner}
  system: ${config.templateType}-system
`;
  }

  private generateMainFile(config: SkeletonConfig): string {
    switch (config.language) {
      case 'typescript':
        return `/**
 * ${this.templateVariables.name}
 * ${this.templateVariables.description}
 */

export class ${this.templateVariables.namePascal} {
  constructor() {
    console.log('${this.templateVariables.name} initialized');
  }

  async start(): Promise<void> {
    console.log('Starting ${this.templateVariables.name}...');
    // Implementation goes here
  }
}

// Default export
export default ${this.templateVariables.namePascal};
`;

      case 'javascript':
        return `/**
 * ${this.templateVariables.name}
 * ${this.templateVariables.description}
 */

class ${this.templateVariables.namePascal} {
  constructor() {
    console.log('${this.templateVariables.name} initialized');
  }

  async start() {
    console.log('Starting ${this.templateVariables.name}...');
    // Implementation goes here
  }
}

module.exports = ${this.templateVariables.namePascal};
`;

      default:
        return `// ${this.templateVariables.name}
// ${this.templateVariables.description}

console.log('Hello from ${this.templateVariables.name}!');
`;
    }
  }

  // Utility methods for dependencies and configurations
  private getLanguageDependencies(
    config: SkeletonConfig
  ): Record<string, string> {
    const deps: Record<string, string> = {};

    if (config.framework === 'express') {
      deps.express = '^4.18.0';
    }
    if (config.framework === 'react') {
      deps.react = '^18.2.0';
      deps['react-dom'] = '^18.2.0';
    }

    return deps;
  }

  private getLanguageDevDependencies(
    config: SkeletonConfig
  ): Record<string, string> {
    const devDeps: Record<string, string> = {
      jest: '^29.5.0',
    };

    if (config.language === 'typescript') {
      devDeps.typescript = '^5.0.0';
      devDeps['ts-node'] = '^10.9.0';
      devDeps['@types/node'] = '^18.15.0';
      devDeps['@types/jest'] = '^29.5.0';
    }

    return devDeps;
  }

  // Placeholder methods for other file generators (simplified for brevity)
  private generateEslintConfig(config: SkeletonConfig): string {
    return '{}';
  }
  private generatePrettierConfig(): string {
    return '{}';
  }
  private generateRequirementsTxt(config: SkeletonConfig): string {
    return '';
  }
  private generateSetupPy(config: SkeletonConfig): string {
    return '';
  }
  private generatePyprojectToml(config: SkeletonConfig): string {
    return '';
  }
  private generatePythonInit(config: SkeletonConfig): string {
    return '';
  }
  private generatePomXml(config: SkeletonConfig): string {
    return '';
  }
  private generateBuildGradle(config: SkeletonConfig): string {
    return '';
  }
  private generateGoMod(config: SkeletonConfig): string {
    return `module ${this.templateVariables.nameKebab}\n\ngo 1.21\n`;
  }
  private generateGoMain(config: SkeletonConfig): string {
    return 'package main\n\nfunc main() {\n\tprintln("Hello World")\n}\n';
  }
  private generateGitignore(config: SkeletonConfig): string {
    return 'node_modules/\ndist/\n.env\n';
  }
  private generateReactApp(config: SkeletonConfig): string {
    return '';
  }
  private generateReactAppCss(): string {
    return '';
  }
  private generateExpressApp(config: SkeletonConfig): string {
    return '';
  }
  private generateExpressRoutes(config: SkeletonConfig): string {
    return '';
  }
  private generateFastApiMain(config: SkeletonConfig): string {
    return '';
  }
  private generateCIWorkflow(config: SkeletonConfig): string {
    return '';
  }
  private generateDockerfile(config: SkeletonConfig): string {
    return '';
  }
  private generateDockerCompose(config: SkeletonConfig): string {
    return '';
  }
  private generateMonitoringConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateSecurityPolicy(config: SkeletonConfig): string {
    return '';
  }
  private generateComplianceConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateIntentConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateStandardsConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateOperationsConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateGovernanceConfig(config: SkeletonConfig): string {
    return '';
  }
  private generateIntentDrivenConfig(config: SkeletonConfig): string {
    return '';
  }
}
