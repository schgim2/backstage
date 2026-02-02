/**
 * Template Preview System
 * Generates previews of templates before deployment and displays validation results
 */

import {
  GeneratedTemplate,
  TemplatePreview,
  ValidationResult,
  TemplateSpec,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

export interface ValidationContext {
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
  environment: 'development' | 'staging' | 'production';
}

// Simple validation engine for preview system
class SimpleValidationEngine {
  private context: ValidationContext;

  constructor(context: ValidationContext) {
    this.context = context;
  }

  async validateTemplateSpec(spec: TemplateSpec): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async validateGeneratedTemplate(
    template: GeneratedTemplate
  ): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  updateContext(context: Partial<ValidationContext>): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): ValidationContext {
    return this.context;
  }
}

export interface PreviewOptions {
  includeValidation?: boolean;
  includeFileContents?: boolean;
  maxFileSize?: number;
  excludePatterns?: string[];
  formatOutput?: boolean;
}

export interface PreviewMetadata {
  generatedAt: Date;
  templateId: string;
  version: string;
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
  estimatedSize: number;
  fileCount: number;
}

export class TemplatePreviewSystem {
  private validationEngine: SimpleValidationEngine;

  constructor(validationContext?: ValidationContext) {
    // Create default validation context if none provided
    const defaultContext: ValidationContext = {
      maturityLevel: CapabilityMaturity.L2_DEPLOYMENT,
      phase: DevelopmentPhase.FOUNDATION,
      environment: 'development',
    };

    this.validationEngine = new SimpleValidationEngine(
      validationContext || defaultContext
    );
  }

  /**
   * Generate preview of template before deployment
   */
  async previewTemplate(
    template: GeneratedTemplate,
    options: PreviewOptions = {}
  ): Promise<TemplatePreview> {
    const {
      includeValidation = true,
      includeFileContents = false,
      maxFileSize = 1024 * 10, // 10KB default
      excludePatterns = ['node_modules', '.git', 'dist', 'build'],
      formatOutput = true,
    } = options;

    // Generate file structure preview
    const fileStructure = this.generateFileStructure(
      template,
      includeFileContents,
      maxFileSize,
      excludePatterns
    );

    // Format YAML for preview
    const formattedYaml = formatOutput
      ? this.formatYamlForPreview(template.yaml)
      : template.yaml;

    // Generate documentation preview
    const documentationPreview = this.generateDocumentationPreview(template);

    // Run validation if requested
    let validationResults: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (includeValidation) {
      validationResults = await this.validationEngine.validateGeneratedTemplate(
        template
      );
    }

    return {
      yaml: formattedYaml,
      fileStructure,
      documentation: documentationPreview,
      validationResults,
    };
  }

  /**
   * Generate preview from template specification (before generation)
   */
  async previewFromSpec(
    spec: TemplateSpec,
    options: PreviewOptions = {}
  ): Promise<{
    specPreview: string;
    validationResults: ValidationResult;
    estimatedStructure: string[];
    recommendations: string[];
  }> {
    const { includeValidation = true, formatOutput = true } = options;

    // Generate spec preview
    const specPreview = formatOutput
      ? this.formatSpecForPreview(spec)
      : JSON.stringify(spec, null, 2);

    // Estimate file structure based on spec
    const estimatedStructure = this.estimateFileStructure(spec);

    // Generate recommendations
    const recommendations = this.generateRecommendations(spec);

    // Run validation if requested
    let validationResults: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (includeValidation) {
      validationResults = await this.validationEngine.validateTemplateSpec(
        spec
      );
    }

    return {
      specPreview,
      validationResults,
      estimatedStructure,
      recommendations,
    };
  }

  /**
   * Generate interactive preview with real-time validation
   */
  async generateInteractivePreview(
    template: GeneratedTemplate,
    onValidationUpdate?: (results: ValidationResult) => void
  ): Promise<TemplatePreview> {
    // Generate base preview
    const preview = await this.previewTemplate(template, {
      includeValidation: true,
      includeFileContents: true,
      formatOutput: true,
    });

    // Set up real-time validation if callback provided
    if (onValidationUpdate) {
      // Simulate real-time validation updates
      setTimeout(() => {
        onValidationUpdate(preview.validationResults);
      }, 100);
    }

    return preview;
  }

  /**
   * Generate preview metadata
   */
  generatePreviewMetadata(template: GeneratedTemplate): PreviewMetadata {
    const fileCount = Object.keys(template.skeleton.files).length;
    const estimatedSize = Object.values(template.skeleton.files).reduce(
      (total, content) => total + content.length,
      0
    );

    return {
      generatedAt: new Date(),
      templateId: template.metadata.id,
      version: template.metadata.version,
      maturityLevel: template.metadata.maturityLevel,
      phase: template.metadata.phase,
      estimatedSize,
      fileCount,
    };
  }

  /**
   * Generate comparison preview between two templates
   */
  async generateComparisonPreview(
    originalTemplate: GeneratedTemplate,
    updatedTemplate: GeneratedTemplate
  ): Promise<{
    originalPreview: TemplatePreview;
    updatedPreview: TemplatePreview;
    differences: {
      yamlChanges: string[];
      fileChanges: string[];
      validationChanges: string[];
    };
  }> {
    const originalPreview = await this.previewTemplate(originalTemplate);
    const updatedPreview = await this.previewTemplate(updatedTemplate);

    const differences = {
      yamlChanges: this.compareYaml(
        originalTemplate.yaml,
        updatedTemplate.yaml
      ),
      fileChanges: this.compareFileStructure(
        originalTemplate.skeleton,
        updatedTemplate.skeleton
      ),
      validationChanges: this.compareValidationResults(
        originalPreview.validationResults,
        updatedPreview.validationResults
      ),
    };

    return {
      originalPreview,
      updatedPreview,
      differences,
    };
  }

  /**
   * Generate file structure preview
   */
  private generateFileStructure(
    template: GeneratedTemplate,
    includeContents: boolean,
    maxFileSize: number,
    excludePatterns: string[]
  ): string[] {
    const structure: string[] = [];

    // Add directories
    template.skeleton.directories.forEach((dir) => {
      if (!this.shouldExclude(dir, excludePatterns)) {
        structure.push(`📁 ${dir}/`);
      }
    });

    // Add files
    Object.entries(template.skeleton.files).forEach(([filePath, content]) => {
      if (!this.shouldExclude(filePath, excludePatterns)) {
        const fileSize = content.length;
        const sizeInfo = this.formatFileSize(fileSize);

        if (includeContents && fileSize <= maxFileSize) {
          const preview = this.generateFilePreview(content, filePath);
          structure.push(`📄 ${filePath} (${sizeInfo})\n${preview}`);
        } else {
          structure.push(`📄 ${filePath} (${sizeInfo})`);
        }
      }
    });

    return structure.sort();
  }

  /**
   * Format YAML for preview display
   */
  private formatYamlForPreview(yaml: string): string {
    try {
      // Parse and re-stringify for consistent formatting
      const parsed = JSON.parse(yaml);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      // Return original if parsing fails
      return yaml;
    }
  }

  /**
   * Generate documentation preview
   */
  private generateDocumentationPreview(template: GeneratedTemplate): string {
    const sections: string[] = [];

    // Add README preview
    if (template.documentation.readme) {
      sections.push('## README Preview');
      sections.push(this.truncateContent(template.documentation.readme, 500));
    }

    // Add TechDocs preview
    if (template.documentation.techDocs) {
      sections.push('## TechDocs Preview');
      sections.push(this.truncateContent(template.documentation.techDocs, 300));
    }

    // Add API docs preview if available
    if (template.documentation.apiDocs) {
      sections.push('## API Documentation Preview');
      sections.push(this.truncateContent(template.documentation.apiDocs, 300));
    }

    // Add usage examples
    if (template.documentation.usageExamples.length > 0) {
      sections.push('## Usage Examples');
      template.documentation.usageExamples
        .slice(0, 3)
        .forEach((example, index) => {
          sections.push(`### Example ${index + 1}`);
          sections.push('```bash');
          sections.push(example);
          sections.push('```');
        });
    }

    return sections.join('\n\n');
  }

  /**
   * Format template specification for preview
   */
  private formatSpecForPreview(spec: TemplateSpec): string {
    const preview = {
      metadata: spec.metadata,
      parameters:
        Object.keys(spec.parameters).length > 0
          ? `${Object.keys(spec.parameters).length} parameters defined`
          : 'No parameters',
      steps: spec.steps.map((step) => ({
        id: step.id,
        name: step.name,
        action: step.action,
      })),
      output: spec.output,
    };

    return JSON.stringify(preview, null, 2);
  }

  /**
   * Estimate file structure based on template specification
   */
  private estimateFileStructure(spec: TemplateSpec): string[] {
    const structure: string[] = [];

    // Basic files that are always generated
    structure.push('📄 template.yaml');
    structure.push('📄 README.md');
    structure.push('📄 catalog-info.yaml');

    // Estimate based on template tags and metadata
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());

    if (tags.includes('typescript') || tags.includes('javascript')) {
      structure.push('📄 package.json');
      structure.push('📄 tsconfig.json');
      structure.push('📁 src/');
      structure.push('📁 tests/');
    }

    if (tags.includes('python')) {
      structure.push('📄 requirements.txt');
      structure.push('📄 setup.py');
      structure.push('📁 src/');
      structure.push('📁 tests/');
    }

    if (tags.includes('docker') || tags.includes('container')) {
      structure.push('📄 Dockerfile');
      structure.push('📄 .dockerignore');
    }

    if (tags.includes('kubernetes') || tags.includes('k8s')) {
      structure.push('📁 k8s/');
      structure.push('📄 k8s/deployment.yaml');
      structure.push('📄 k8s/service.yaml');
    }

    // Add skeleton directory
    structure.push('📁 skeleton/');

    return structure.sort();
  }

  /**
   * Generate recommendations based on template specification
   */
  private generateRecommendations(spec: TemplateSpec): string[] {
    const recommendations: string[] = [];

    // Check for common improvements
    if (spec.steps.length < 3) {
      recommendations.push(
        'Consider adding more steps for a complete workflow (fetch, publish, register)'
      );
    }

    if (Object.keys(spec.parameters).length === 0) {
      recommendations.push(
        'Add parameters to make the template more flexible and reusable'
      );
    }

    if (!spec.output.links || spec.output.links.length === 0) {
      recommendations.push(
        'Add output links to help users navigate to created resources'
      );
    }

    // Check for security considerations
    const hasSecuritySteps = spec.steps.some(
      (step) =>
        step.action.includes('security') ||
        JSON.stringify(step.input).includes('auth')
    );

    if (!hasSecuritySteps) {
      recommendations.push('Consider adding security validation steps');
    }

    // Check for documentation
    const hasDocSteps = spec.steps.some(
      (step) => step.action.includes('docs') || step.action.includes('catalog')
    );

    if (!hasDocSteps) {
      recommendations.push(
        'Add catalog registration step for better discoverability'
      );
    }

    return recommendations;
  }

  /**
   * Compare YAML content between templates
   */
  private compareYaml(original: string, updated: string): string[] {
    const changes: string[] = [];

    if (original !== updated) {
      // Always detect changes if strings are different
      changes.push('YAML structure changes detected');
    }

    return changes;
  }

  /**
   * Compare file structure between templates
   */
  private compareFileStructure(original: any, updated: any): string[] {
    const changes: string[] = [];

    const originalFiles = new Set(Object.keys(original.files));
    const updatedFiles = new Set(Object.keys(updated.files));

    // Check for added files
    updatedFiles.forEach((file) => {
      if (!originalFiles.has(file)) {
        changes.push(`Added: ${file}`);
      }
    });

    // Check for removed files
    originalFiles.forEach((file) => {
      if (!updatedFiles.has(file)) {
        changes.push(`Removed: ${file}`);
      }
    });

    // Check for modified files
    originalFiles.forEach((file) => {
      if (
        updatedFiles.has(file) &&
        original.files[file] !== updated.files[file]
      ) {
        changes.push(`Modified: ${file}`);
      }
    });

    return changes;
  }

  /**
   * Compare validation results between templates
   */
  private compareValidationResults(
    original: ValidationResult,
    updated: ValidationResult
  ): string[] {
    const changes: string[] = [];

    if (original.errors.length !== updated.errors.length) {
      changes.push(
        `Error count changed: ${original.errors.length} → ${updated.errors.length}`
      );
    }

    if (original.warnings.length !== updated.warnings.length) {
      changes.push(
        `Warning count changed: ${original.warnings.length} → ${updated.warnings.length}`
      );
    }

    if (original.isValid !== updated.isValid) {
      changes.push(
        `Validation status changed: ${original.isValid} → ${updated.isValid}`
      );
    }

    return changes;
  }

  /**
   * Check if file/directory should be excluded from preview
   */
  private shouldExclude(path: string, excludePatterns: string[]): boolean {
    return excludePatterns.some((pattern) => {
      // Exact match for directories (with trailing slash)
      if (pattern.endsWith('/')) {
        return path === pattern.slice(0, -1) || path.startsWith(pattern);
      }
      // For files, check if path starts with pattern or equals pattern
      return path === pattern || path.startsWith(pattern + '/');
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Generate file content preview
   */
  private generateFilePreview(content: string, filePath: string): string {
    const lines = content.split('\n');
    const previewLines = lines.slice(0, 10); // Show first 10 lines

    let preview = previewLines.join('\n');

    if (lines.length > 10) {
      preview += `\n... (${lines.length - 10} more lines)`;
    }

    // Add syntax highlighting hint based on file extension
    const extension = filePath.split('.').pop()?.toLowerCase();
    const language = this.getLanguageFromExtension(extension || '');

    return `\`\`\`${language}\n${preview}\n\`\`\``;
  }

  /**
   * Get language identifier for syntax highlighting
   */
  private getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      java: 'java',
      go: 'go',
      yaml: 'yaml',
      yml: 'yaml',
      json: 'json',
      md: 'markdown',
      sh: 'bash',
      dockerfile: 'dockerfile',
    };

    return languageMap[extension] || 'text';
  }

  /**
   * Truncate content for preview
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }

  /**
   * Update validation context
   */
  updateValidationContext(context: Partial<ValidationContext>): void {
    this.validationEngine.updateContext(context);
  }

  /**
   * Get current validation context
   */
  getValidationContext(): ValidationContext {
    return this.validationEngine.getContext();
  }
}
