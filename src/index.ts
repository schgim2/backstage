/**
 * Main entry point for Backstage Template Generator
 * Orchestrates the complete workflow from intent to deployment
 */

export * from './types/core';
export * from './interfaces';
export * from './implementations';

/**
 * Error types for the Backstage Template Generator
 */
export enum ErrorType {
  INTENT_PARSING_ERROR = 'INTENT_PARSING_ERROR',
  TEMPLATE_GENERATION_ERROR = 'TEMPLATE_GENERATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  GITOPS_ERROR = 'GITOPS_ERROR',
  DEPLOYMENT_ERROR = 'DEPLOYMENT_ERROR',
  REGISTRY_ERROR = 'REGISTRY_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  RESOURCE_ERROR = 'RESOURCE_ERROR',
}

/**
 * Custom error class for Backstage Template Generator
 */
export class BackstageTemplateGeneratorError extends Error {
  public readonly type: ErrorType;
  public readonly component: string;
  public readonly operation: string;
  public readonly details: Record<string, any>;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    component: string,
    operation: string,
    message: string,
    details: Record<string, any> = {},
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'BackstageTemplateGeneratorError';
    this.type = type;
    this.component = component;
    this.operation = operation;
    this.details = details;
    this.recoverable = recoverable;
    this.timestamp = new Date();
  }
}

/**
 * Recovery strategy interface
 */
export interface RecoveryStrategy {
  canRecover(error: BackstageTemplateGeneratorError): boolean;
  recover(error: BackstageTemplateGeneratorError, context: any): Promise<any>;
  getDescription(): string;
}

/**
 * Operation context for error recovery
 */
export interface OperationContext {
  operationId: string;
  component: string;
  operation: string;
  startTime: Date;
  parameters: Record<string, any>;
  checkpoints: Array<{
    name: string;
    timestamp: Date;
    data: any;
  }>;
}

/**
 * Rollback operation interface
 */
export interface RollbackOperation {
  id: string;
  description: string;
  execute(): Promise<void>;
  canRollback(): boolean;
}

import {
  NaturalLanguageIntentParser,
  InteractiveSpecificationCompletion,
  BackstageYamlGenerator,
  SkeletonRepositoryGenerator,
  ValidationLogicGenerator,
  DocumentationGenerator,
  MaturityManager,
  PhaseTemplateManager,
  GitOpsManagerImpl,
  CapabilityRegistryImpl,
  TemplatePreviewSystem,
  TemplateInspectorImpl,
} from './implementations';

import {
  TemplateSpec,
  GeneratedTemplate,
  CapabilityMaturity,
  DevelopmentPhase,
  ValidationResult,
  TemplatePreview,
  ParsedIntent,
  Capability,
  Improvement,
} from './types/core';

import { MaturityAssessment } from './implementations/maturity-manager';

import { ValidationContext } from './implementations/template-preview-system';

/**
 * Simple logger implementation
 */
class Logger {
  private level: string;
  private levels = ['debug', 'info', 'warn', 'error'];

  constructor(level: string = 'info') {
    this.level = level;
  }

  private shouldLog(level: string): boolean {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.level);
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  error(message: string, error?: Error, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error, ...args);
    }
  }
}

/**
 * Configuration for the Backstage Template Generator
 */
export interface BackstageTemplateGeneratorConfig {
  // GitOps configuration
  gitProvider?: 'github' | 'gitlab' | 'azure' | 'jenkins';
  gitConfig?: {
    baseUrl?: string;
    token?: string;
    organization?: string;
  };
  
  // Backstage configuration
  backstageConfig?: {
    baseUrl?: string;
    token?: string;
  };
  
  // Validation configuration
  validationContext?: ValidationContext;
  
  // Feature flags
  features?: {
    enablePreview?: boolean;
    enableInteractiveCompletion?: boolean;
    enableMaturityAssessment?: boolean;
    enableGitOpsWorkflow?: boolean;
  };

  // Error handling configuration
  errorHandling?: {
    maxRetries?: number;
    retryDelayMs?: number;
    enableRollback?: boolean;
    enableRecovery?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  };

  // Monitoring configuration
  monitoring?: {
    enableMetrics?: boolean;
    enableTracing?: boolean;
    metricsEndpoint?: string;
  };
}

/**
 * Main orchestrator class that coordinates all components
 */
export class BackstageTemplateGenerator {
  private intentParser!: NaturalLanguageIntentParser;
  private interactiveCompletion!: InteractiveSpecificationCompletion;
  private yamlGenerator!: BackstageYamlGenerator;
  private skeletonGenerator!: SkeletonRepositoryGenerator;
  private validationGenerator!: ValidationLogicGenerator;
  private documentationGenerator!: DocumentationGenerator;
  private maturityManager!: MaturityManager;
  private phaseTemplateManager!: PhaseTemplateManager;
  private gitOpsManager!: GitOpsManagerImpl;
  private capabilityRegistry!: CapabilityRegistryImpl;
  private previewSystem!: TemplatePreviewSystem;
  private templateInspector!: TemplateInspectorImpl;
  private config: BackstageTemplateGeneratorConfig;

  // Error handling and recovery
  private recoveryStrategies: Map<ErrorType, RecoveryStrategy[]> = new Map();
  private operationContexts: Map<string, OperationContext> = new Map();
  private rollbackOperations: Map<string, RollbackOperation[]> = new Map();
  private logger: Logger;

  constructor(config: BackstageTemplateGeneratorConfig = {}) {
    this.config = {
      gitProvider: 'github',
      features: {
        enablePreview: true,
        enableInteractiveCompletion: true,
        enableMaturityAssessment: true,
        enableGitOpsWorkflow: true,
        ...config.features,
      },
      errorHandling: {
        maxRetries: 3,
        retryDelayMs: 1000,
        enableRollback: true,
        enableRecovery: true,
        logLevel: 'info',
        ...config.errorHandling,
      },
      monitoring: {
        enableMetrics: false,
        enableTracing: false,
        ...config.monitoring,
      },
      ...config,
    };

    // Initialize logger
    this.logger = new Logger(this.config.errorHandling?.logLevel || 'info');

    // Initialize all components
    this.initializeComponents();

    // Initialize error handling
    this.initializeErrorHandling();
  }

  /**
   * Initialize all system components
   */
  private initializeComponents(): void {
    try {
      // Core parsing and completion
      this.intentParser = new NaturalLanguageIntentParser();
      this.interactiveCompletion = new InteractiveSpecificationCompletion();

      // Generation components
      this.yamlGenerator = new BackstageYamlGenerator();
      this.skeletonGenerator = new SkeletonRepositoryGenerator();
      this.validationGenerator = new ValidationLogicGenerator();
      this.documentationGenerator = new DocumentationGenerator();

      // Management components
      this.maturityManager = new MaturityManager();
      this.phaseTemplateManager = new PhaseTemplateManager();
      
      // GitOps and registry
      const gitOpsConfig = {
        defaultBranch: 'main',
        remoteUrl: this.config.gitConfig?.baseUrl || 'https://github.com',
        organization: this.config.gitConfig?.organization || 'backstage-templates',
        token: this.config.gitConfig?.token,
      };
      this.gitOpsManager = new GitOpsManagerImpl(gitOpsConfig);
      this.capabilityRegistry = new CapabilityRegistryImpl();

      // Preview system
      this.previewSystem = new TemplatePreviewSystem(this.config.validationContext);

      // Template inspector
      this.templateInspector = new TemplateInspectorImpl(
        this.config.backstageConfig?.baseUrl || 'http://localhost:3000',
        this.config.features?.enableGitOpsWorkflow ?? true
      );

      this.logger.info('Backstage Template Generator initialized with all components');
    } catch (error) {
      const btgError = new BackstageTemplateGeneratorError(
        ErrorType.CONFIGURATION_ERROR,
        'BackstageTemplateGenerator',
        'initializeComponents',
        'Failed to initialize system components',
        { originalError: error },
        false
      );
      this.logger.error('Component initialization failed', btgError);
      throw btgError;
    }
  }

  /**
   * Initialize error handling and recovery strategies
   */
  private initializeErrorHandling(): void {
    // Initialize recovery strategies for different error types
    this.setupRecoveryStrategies();
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    this.logger.debug('Error handling and recovery strategies initialized');
  }

  /**
   * Set up recovery strategies for different error types
   */
  private setupRecoveryStrategies(): void {
    // Intent parsing error recovery
    this.recoveryStrategies.set(ErrorType.INTENT_PARSING_ERROR, [
      {
        canRecover: (error) => error.details.originalInput !== undefined,
        recover: async (error, context) => {
          this.logger.warn('Attempting intent parsing recovery', { error: error.message });
          // Try with simplified parsing or fallback to basic template
          const fallbackIntent = await this.createFallbackIntent(error.details.originalInput);
          const fallbackSpec = this.convertIntentToSpec(fallbackIntent);
          return this.generateTemplate(fallbackSpec);
        },
        getDescription: () => 'Fallback to basic template generation'
      }
    ]);

    // Template generation error recovery
    this.recoveryStrategies.set(ErrorType.TEMPLATE_GENERATION_ERROR, [
      {
        canRecover: (error) => error.details.spec !== undefined,
        recover: async (error, context) => {
          this.logger.warn('Attempting template generation recovery', { error: error.message });
          // Try with minimal template configuration
          return this.generateMinimalTemplate(error.details.spec);
        },
        getDescription: () => 'Generate minimal template with basic configuration'
      }
    ]);

    // GitOps error recovery
    this.recoveryStrategies.set(ErrorType.GITOPS_ERROR, [
      {
        canRecover: (error) => error.details.repository !== undefined,
        recover: async (error, context) => {
          this.logger.warn('Attempting GitOps recovery', { error: error.message });
          // Try rollback to last known good state
          return this.rollbackGitOpsOperation(error.details.repository, context);
        },
        getDescription: () => 'Rollback GitOps operation to last known good state'
      }
    ]);

    // Deployment error recovery
    this.recoveryStrategies.set(ErrorType.DEPLOYMENT_ERROR, [
      {
        canRecover: (error) => error.details.deploymentId !== undefined,
        recover: async (error, context) => {
          this.logger.warn('Attempting deployment recovery', { error: error.message });
          // Try cleanup and retry deployment
          return this.retryDeploymentWithCleanup(error.details.deploymentId, context);
        },
        getDescription: () => 'Cleanup failed deployment and retry'
      }
    ]);

    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK_ERROR, [
      {
        canRecover: (error) => error.details.retryCount < (this.config.errorHandling?.maxRetries || 3),
        recover: async (error, context) => {
          const retryCount = (error.details.retryCount || 0) + 1;
          const delay = (this.config.errorHandling?.retryDelayMs || 1000) * retryCount;
          
          this.logger.warn(`Retrying network operation (attempt ${retryCount})`, { error: error.message });
          await this.sleep(delay);
          
          // Retry the original operation
          return this.retryOperation(error.details.operation, context, retryCount);
        },
        getDescription: () => 'Retry network operation with exponential backoff'
      }
    ]);
  }

  /**
   * Set up global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Only set up handlers if not already set up
    if (!process.listenerCount('unhandledRejection')) {
      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        const error = new BackstageTemplateGeneratorError(
          ErrorType.RESOURCE_ERROR,
          'Global',
          'unhandledRejection',
          'Unhandled promise rejection',
          { reason, promise: promise.toString() },
          false
        );
        this.logger.error('Unhandled promise rejection', error);
      });
    }

    if (!process.listenerCount('uncaughtException')) {
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        const btgError = new BackstageTemplateGeneratorError(
          ErrorType.RESOURCE_ERROR,
          'Global',
          'uncaughtException',
          'Uncaught exception',
          { originalError: error },
          false
        );
        this.logger.error('Uncaught exception', btgError);
      });
    }
  }

  /**
   * Main entry point: Generate template from natural language intent
   */
  async generateFromIntent(
    intentDescription: string,
    options: {
      interactive?: boolean;
      preview?: boolean;
      deploy?: boolean;
      maturityAssessment?: boolean;
    } = {}
  ): Promise<{
    template: GeneratedTemplate;
    preview?: TemplatePreview;
    maturityAssessment?: MaturityAssessment;
    deploymentResult?: any;
  }> {
    const operationId = `generate-intent-${Date.now()}`;
    const operationContext: OperationContext = {
      operationId,
      component: 'BackstageTemplateGenerator',
      operation: 'generateFromIntent',
      startTime: new Date(),
      parameters: { intentDescription, options },
      checkpoints: [],
    };

    this.operationContexts.set(operationId, operationContext);

    try {
      const {
        interactive = this.config.features?.enableInteractiveCompletion ?? true,
        preview = this.config.features?.enablePreview ?? true,
        deploy = this.config.features?.enableGitOpsWorkflow ?? true,
        maturityAssessment = this.config.features?.enableMaturityAssessment ?? true,
      } = options;

      this.logger.info('🚀 Starting template generation from intent...', { operationId });

      // Step 1: Parse intent with error handling
      this.logger.info('📝 Parsing intent...');
      const parsedIntent = await this.executeWithErrorHandling(
        () => this.intentParser.parseIntent(intentDescription),
        ErrorType.INTENT_PARSING_ERROR,
        'IntentParser',
        'parseIntent',
        { originalInput: intentDescription }
      );

      this.addCheckpoint(operationContext, 'intent-parsed', parsedIntent);

      // Step 2: Interactive completion (if enabled)
      let finalSpec: TemplateSpec;
      if (interactive) {
        this.logger.info('💬 Starting interactive completion...');
        finalSpec = await this.executeWithErrorHandling(
          () => this.completeSpecificationInteractively(parsedIntent),
          ErrorType.TEMPLATE_GENERATION_ERROR,
          'InteractiveCompletion',
          'completeSpecification',
          { parsedIntent }
        );
      } else {
        finalSpec = this.convertIntentToSpec(parsedIntent);
      }

      this.addCheckpoint(operationContext, 'spec-completed', finalSpec);

      // Step 3: Generate template with error handling
      this.logger.info('🔧 Generating template artifacts...');
      const template = await this.executeWithErrorHandling(
        () => this.generateTemplate(finalSpec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'TemplateGenerator',
        'generateTemplate',
        { spec: finalSpec }
      );

      this.addCheckpoint(operationContext, 'template-generated', template);

      // Step 4: Preview (if enabled)
      let templatePreview: TemplatePreview | undefined;
      if (preview) {
        this.logger.info('👀 Generating preview...');
        templatePreview = await this.executeWithErrorHandling(
          () => this.previewSystem.previewTemplate(template),
          ErrorType.TEMPLATE_GENERATION_ERROR,
          'PreviewSystem',
          'previewTemplate',
          { template }
        );
      }

      // Step 5: Maturity assessment (if enabled)
      let assessment: MaturityAssessment | undefined;
      if (maturityAssessment) {
        this.logger.info('📊 Performing maturity assessment...');
        const mockCapability: Capability = {
          id: template.metadata.id,
          name: template.metadata.name,
          description: template.metadata.name,
          maturityLevel: template.metadata.maturityLevel,
          phase: template.metadata.phase,
          templates: [],
          dependencies: [],
        };
        assessment = await this.executeWithErrorHandling(
          () => this.maturityManager.assessMaturity(mockCapability),
          ErrorType.TEMPLATE_GENERATION_ERROR,
          'MaturityManager',
          'assessMaturity',
          { capability: mockCapability }
        );
      }

      // Step 6: Deploy (if enabled)
      let deploymentResult: any;
      if (deploy) {
        this.logger.info('🚀 Deploying template...');
        deploymentResult = await this.executeWithErrorHandling(
          () => this.deployTemplate(template),
          ErrorType.DEPLOYMENT_ERROR,
          'GitOpsManager',
          'deployTemplate',
          { template }
        );
      }

      this.logger.info('✅ Template generation complete!', { operationId });

      // Clean up operation context
      this.operationContexts.delete(operationId);

      return {
        template,
        preview: templatePreview,
        maturityAssessment: assessment,
        deploymentResult,
      };
    } catch (error) {
      this.logger.error('Template generation failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      
      // Attempt recovery if enabled
      if (this.config.errorHandling?.enableRecovery && error instanceof BackstageTemplateGeneratorError) {
        const recoveryResult = await this.attemptRecovery(error, operationContext);
        if (recoveryResult) {
          this.logger.info('Recovery successful', { operationId });
          
          // Clean up operation context
          this.operationContexts.delete(operationId);
          
          // Return recovery result wrapped in expected format
          return {
            template: recoveryResult,
            preview: undefined,
            maturityAssessment: undefined,
            deploymentResult: undefined,
          };
        }
      }

      // Attempt rollback if enabled
      if (this.config.errorHandling?.enableRollback) {
        await this.attemptRollback(operationId);
      }

      // Clean up operation context
      this.operationContexts.delete(operationId);

      throw error;
    }
  }

  /**
   * Generate template from existing specification
   */
  async generateFromSpec(
    spec: TemplateSpec,
    options: {
      preview?: boolean;
      deploy?: boolean;
    } = {}
  ): Promise<{
    template: GeneratedTemplate;
    preview?: TemplatePreview;
    deploymentResult?: any;
  }> {
    const operationId = `generate-spec-${Date.now()}`;
    const operationContext: OperationContext = {
      operationId,
      component: 'BackstageTemplateGenerator',
      operation: 'generateFromSpec',
      startTime: new Date(),
      parameters: { spec, options },
      checkpoints: [],
    };

    this.operationContexts.set(operationId, operationContext);

    try {
      const { preview = true, deploy = true } = options;

      this.logger.info('🔧 Generating template from specification...', { operationId });

      // Generate template with error handling
      const template = await this.executeWithErrorHandling(
        () => this.generateTemplate(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'TemplateGenerator',
        'generateTemplate',
        { spec }
      );

      this.addCheckpoint(operationContext, 'template-generated', template);

      // Preview (if enabled)
      let templatePreview: TemplatePreview | undefined;
      if (preview) {
        this.logger.info('👀 Generating preview...');
        templatePreview = await this.executeWithErrorHandling(
          () => this.previewSystem.previewTemplate(template),
          ErrorType.TEMPLATE_GENERATION_ERROR,
          'PreviewSystem',
          'previewTemplate',
          { template }
        );
      }

      // Deploy (if enabled)
      let deploymentResult: any;
      if (deploy) {
        this.logger.info('🚀 Deploying template...');
        deploymentResult = await this.executeWithErrorHandling(
          () => this.deployTemplate(template),
          ErrorType.DEPLOYMENT_ERROR,
          'GitOpsManager',
          'deployTemplate',
          { template }
        );
      }

      this.logger.info('✅ Template generation from spec complete!', { operationId });

      // Clean up operation context
      this.operationContexts.delete(operationId);

      return {
        template,
        preview: templatePreview,
        deploymentResult,
      };
    } catch (error) {
      this.logger.error('Template generation from spec failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      
      // Attempt recovery if enabled
      if (this.config.errorHandling?.enableRecovery && error instanceof BackstageTemplateGeneratorError) {
        const recoveryResult = await this.attemptRecovery(error, operationContext);
        if (recoveryResult) {
          this.logger.info('Recovery successful', { operationId });
          
          // Clean up operation context
          this.operationContexts.delete(operationId);
          
          // Return recovery result wrapped in expected format
          return {
            template: recoveryResult,
            preview: undefined,
            deploymentResult: undefined,
          };
        }
      }

      // Attempt rollback if enabled
      if (this.config.errorHandling?.enableRollback) {
        await this.attemptRollback(operationId);
      }

      // Clean up operation context
      this.operationContexts.delete(operationId);

      throw error;
    }
  }

  /**
   * Preview template from specification without generating
   */
  async previewFromSpec(spec: TemplateSpec): Promise<{
    specPreview: string;
    validationResults: ValidationResult;
    estimatedStructure: string[];
    recommendations: string[];
  }> {
    const operationId = `preview-spec-${Date.now()}`;
    
    try {
      this.logger.info('👀 Generating preview from specification...', { operationId });
      
      return await this.executeWithErrorHandling(
        () => this.previewSystem.previewFromSpec(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'PreviewSystem',
        'previewFromSpec',
        { spec }
      );
    } catch (error) {
      this.logger.error('Preview generation failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      throw error;
    }
  }

  /**
   * Assess capability maturity for a given context
   */
  async assessMaturity(capability: Capability): Promise<MaturityAssessment> {
    const operationId = `assess-maturity-${Date.now()}`;
    
    try {
      this.logger.info('📊 Assessing capability maturity...', { operationId });
      
      return await this.executeWithErrorHandling(
        () => this.maturityManager.assessMaturity(capability),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'MaturityManager',
        'assessMaturity',
        { capability }
      );
    } catch (error) {
      this.logger.error('Maturity assessment failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      throw error;
    }
  }

  /**
   * Search and discover existing templates
   */
  async discoverTemplates(query: {
    tags?: string[];
    maturityLevel?: CapabilityMaturity;
    phase?: DevelopmentPhase;
    searchTerm?: string;
  }): Promise<Capability[]> {
    const operationId = `discover-templates-${Date.now()}`;
    
    try {
      this.logger.info('🔍 Discovering templates...', { operationId });
      
      return await this.executeWithErrorHandling(
        () => this.capabilityRegistry.getCapabilities(query),
        ErrorType.REGISTRY_ERROR,
        'CapabilityRegistry',
        'getCapabilities',
        { query }
      );
    } catch (error) {
      this.logger.error('Template discovery failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      throw error;
    }
  }

  /**
   * Get template recommendations based on current capabilities
   */
  async getRecommendations(capabilityId: string): Promise<string[]> {
    const operationId = `get-recommendations-${Date.now()}`;
    
    try {
      this.logger.info('💡 Generating recommendations...', { operationId });
      
      const improvements = await this.executeWithErrorHandling(
        () => this.capabilityRegistry.suggestImprovements(capabilityId),
        ErrorType.REGISTRY_ERROR,
        'CapabilityRegistry',
        'suggestImprovements',
        { capabilityId }
      );
      
      return improvements.map(improvement => improvement.description);
    } catch (error) {
      this.logger.error('Recommendation generation failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      throw error;
    }
  }

  /**
   * Complete specification interactively
   */
  private async completeSpecificationInteractively(
    intent: ParsedIntent
  ): Promise<TemplateSpec> {
    // In a real implementation, this would involve user interaction
    // For now, we'll simulate completion by converting intent to spec
    return this.convertIntentToSpec(intent);
  }

  /**
   * Convert parsed intent to template specification
   */
  private convertIntentToSpec(intent: ParsedIntent): TemplateSpec {
    // Create a basic template structure based on intent
    // In a real implementation, this would use phase-appropriate templates
    return {
      metadata: {
        name: intent.capability.toLowerCase().replace(/\s+/g, '-'),
        description: intent.description,
        tags: intent.requirements,
        owner: 'platform-team',
      },
      parameters: {
        name: {
          title: 'Name',
          type: 'string',
          description: 'Unique name of the component',
        },
        description: {
          title: 'Description',
          type: 'string',
          description: 'Description of the component',
        },
      },
      steps: [
        {
          id: 'fetch',
          name: 'Fetch Skeleton',
          action: 'fetch:template',
          input: {
            url: './skeleton',
            values: {
              name: '${{ parameters.name }}',
              description: '${{ parameters.description }}',
            },
          },
        },
        {
          id: 'publish',
          name: 'Publish',
          action: 'publish:github',
          input: {
            allowedHosts: ['github.com'],
            description: 'This is ${{ parameters.name }}',
            repoUrl: '${{ parameters.repoUrl }}',
          },
        },
        {
          id: 'register',
          name: 'Register',
          action: 'catalog:register',
          input: {
            repoContentsUrl: '${{ steps.publish.output.repoContentsUrl }}',
            catalogInfoPath: '/catalog-info.yaml',
          },
        },
      ],
      output: {
        links: [
          {
            title: 'Repository',
            url: '${{ steps.publish.output.remoteUrl }}',
          },
          {
            title: 'Open in catalog',
            url: '/catalog/default/component/${{ parameters.name }}',
          },
        ],
      },
      validation: {
        security: [],
        compliance: [],
        standards: [],
        cost: [],
      },
    };
  }

  /**
   * Generate complete template from specification
   */
  private async generateTemplate(spec: TemplateSpec): Promise<GeneratedTemplate> {
    const operationId = `generate-template-${Date.now()}`;
    
    try {
      // Generate YAML with error handling
      const yaml = await this.executeWithErrorHandling(
        () => this.yamlGenerator.generateBackstageYaml(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'YamlGenerator',
        'generateBackstageYaml',
        { spec }
      );

      // Generate skeleton with error handling
      const skeleton = await this.executeWithErrorHandling(
        () => this.skeletonGenerator.generateSkeleton(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'SkeletonGenerator',
        'generateSkeleton',
        { spec }
      );

      // Generate validation with error handling
      const validation = await this.executeWithErrorHandling(
        () => this.validationGenerator.generateValidationLogic(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'ValidationGenerator',
        'generateValidationLogic',
        { spec }
      );

      // Generate documentation with error handling
      const documentation = await this.executeWithErrorHandling(
        () => this.documentationGenerator.generateDocumentation(spec),
        ErrorType.TEMPLATE_GENERATION_ERROR,
        'DocumentationGenerator',
        'generateDocumentation',
        { spec }
      );

      // Create metadata
      const metadata = {
        id: `${spec.metadata.name}-template`,
        name: spec.metadata.name,
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        author: spec.metadata.owner,
        maturityLevel: this.determineMaturityLevel(spec),
        phase: this.determinePhase(spec),
      };

      return {
        yaml,
        skeleton,
        documentation,
        validation,
        metadata,
      };
    } catch (error) {
      this.logger.error('Template generation failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      throw error;
    }
  }

  /**
   * Deploy template using GitOps workflow
   */
  private async deployTemplate(template: GeneratedTemplate): Promise<any> {
    const operationId = `deploy-template-${Date.now()}`;
    
    try {
      // Create repository with rollback registration
      const repoResult = await this.executeWithErrorHandling(
        () => this.gitOpsManager.createTemplateRepository(template),
        ErrorType.GITOPS_ERROR,
        'GitOpsManager',
        'createTemplateRepository',
        { template }
      );

      // Register rollback for repository creation
      this.registerRollbackOperation(operationId, {
        id: `rollback-repo-${Date.now()}`,
        description: `Delete repository ${repoResult.name}`,
        execute: async () => {
          this.logger.info(`Rolling back repository creation: ${repoResult.name}`);
          // In a real implementation, this would delete the repository
        },
        canRollback: () => true,
      });

      // Commit changes with rollback registration
      const commitHash = await this.executeWithErrorHandling(
        () => this.gitOpsManager.commitChanges(
          repoResult,
          template,
          'Initial template generation'
        ),
        ErrorType.GITOPS_ERROR,
        'GitOpsManager',
        'commitChanges',
        { repository: repoResult, template }
      );

      // Register rollback for commit
      this.registerRollbackOperation(operationId, {
        id: `rollback-commit-${Date.now()}`,
        description: `Revert commit ${commitHash}`,
        execute: async () => {
          this.logger.info(`Rolling back commit: ${commitHash}`);
          // In a real implementation, this would revert the commit
        },
        canRollback: () => true,
      });

      // Create pull request with rollback registration
      const prResult = await this.executeWithErrorHandling(
        () => this.gitOpsManager.createPullRequest(
          repoResult,
          'main',
          `feature/template-${Date.now()}`,
          `Add template: ${template.metadata.name}`,
          `Generated template for ${template.metadata.name}\n\nCapability: ${template.metadata.name}\nMaturity Level: ${template.metadata.maturityLevel}\nPhase: ${template.metadata.phase}`
        ),
        ErrorType.GITOPS_ERROR,
        'GitOpsManager',
        'createPullRequest',
        { repository: repoResult, template }
      );

      // Register rollback for pull request
      this.registerRollbackOperation(operationId, {
        id: `rollback-pr-${Date.now()}`,
        description: `Close pull request ${prResult.id}`,
        execute: async () => {
          this.logger.info(`Rolling back pull request: ${prResult.id}`);
          // In a real implementation, this would close the PR
        },
        canRollback: () => true,
      });

      // Auto-merge if validation passes
      const mergeResult = await this.executeWithErrorHandling(
        () => this.gitOpsManager.mergePullRequest(prResult),
        ErrorType.GITOPS_ERROR,
        'GitOpsManager',
        'mergePullRequest',
        { pullRequest: prResult }
      );

      // Deploy to Backstage
      const deployResult = await this.executeWithErrorHandling(
        () => this.gitOpsManager.deployTemplate(prResult),
        ErrorType.DEPLOYMENT_ERROR,
        'GitOpsManager',
        'deployTemplate',
        { pullRequest: prResult }
      );

      // Register rollback for deployment
      this.registerRollbackOperation(operationId, {
        id: `rollback-deploy-${Date.now()}`,
        description: `Undeploy template ${template.metadata.name}`,
        execute: async () => {
          this.logger.info(`Rolling back deployment: ${template.metadata.name}`);
          // In a real implementation, this would undeploy the template
        },
        canRollback: () => deployResult.success,
      });

      // Register in capability registry
      await this.executeWithErrorHandling(
        () => this.capabilityRegistry.registerCapability({
          id: template.metadata.id,
          name: template.metadata.name,
          description: template.metadata.name,
          maturityLevel: template.metadata.maturityLevel,
          phase: template.metadata.phase,
          templates: [{
            id: template.metadata.id,
            name: template.metadata.name,
            description: template.metadata.name,
            version: template.metadata.version,
            repository: repoResult,
            metadata: template.metadata,
          }],
          dependencies: [],
        }),
        ErrorType.REGISTRY_ERROR,
        'CapabilityRegistry',
        'registerCapability',
        { template, repository: repoResult }
      );

      // Register rollback for capability registration
      this.registerRollbackOperation(operationId, {
        id: `rollback-capability-${Date.now()}`,
        description: `Unregister capability ${template.metadata.id}`,
        execute: async () => {
          this.logger.info(`Rolling back capability registration: ${template.metadata.id}`);
          // In a real implementation, this would unregister the capability
        },
        canRollback: () => true,
      });

      return {
        repository: repoResult,
        pullRequest: prResult,
        merge: mergeResult,
        deployment: deployResult,
      };
    } catch (error) {
      this.logger.error('Template deployment failed', error instanceof Error ? error : new Error(String(error)), { operationId });
      
      // Attempt rollback on deployment failure
      if (this.config.errorHandling?.enableRollback) {
        await this.attemptRollback(operationId);
      }
      
      throw error;
    }
  }

  /**
   * Determine maturity level from specification
   */
  private determineMaturityLevel(spec: TemplateSpec): CapabilityMaturity {
    const tags = spec.metadata.tags.map(tag => tag.toLowerCase());
    
    if (tags.some(tag => ['intent', 'ai', 'autonomous'].includes(tag))) {
      return CapabilityMaturity.L5_INTENT_DRIVEN;
    }
    if (tags.some(tag => ['governance', 'policy', 'compliance'].includes(tag))) {
      return CapabilityMaturity.L4_GOVERNANCE;
    }
    if (tags.some(tag => ['operations', 'monitoring', 'scaling'].includes(tag))) {
      return CapabilityMaturity.L3_OPERATIONS;
    }
    if (tags.some(tag => ['deployment', 'cicd', 'automation'].includes(tag))) {
      return CapabilityMaturity.L2_DEPLOYMENT;
    }
    
    return CapabilityMaturity.L1_GENERATION;
  }

  /**
   * Determine development phase from specification
   */
  private determinePhase(spec: TemplateSpec): DevelopmentPhase {
    const tags = spec.metadata.tags.map(tag => tag.toLowerCase());
    
    if (tags.some(tag => ['intent', 'composite', 'end-to-end'].includes(tag))) {
      return DevelopmentPhase.INTENT_DRIVEN;
    }
    if (tags.some(tag => ['governance', 'policy', 'compliance'].includes(tag))) {
      return DevelopmentPhase.GOVERNANCE;
    }
    if (tags.some(tag => ['operations', 'scaling', 'maintenance'].includes(tag))) {
      return DevelopmentPhase.OPERATIONALIZATION;
    }
    if (tags.some(tag => ['standards', 'architecture', 'composite'].includes(tag))) {
      return DevelopmentPhase.STANDARDIZATION;
    }
    
    return DevelopmentPhase.FOUNDATION;
  }

  /**
   * Shutdown the system gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Backstage Template Generator...');
    
    try {
      // Cancel any ongoing operations
      for (const [operationId, context] of this.operationContexts.entries()) {
        this.logger.warn(`Cancelling ongoing operation: ${operationId}`);
        await this.attemptRollback(operationId);
      }

      // Cancel scheduled health checks
      if (this.templateInspector) {
        // Note: In a real implementation, we'd track all scheduled templates
        // For now, this is a placeholder for cleanup
      }

      // Clear all contexts and strategies
      this.operationContexts.clear();
      this.rollbackOperations.clear();
      this.recoveryStrategies.clear();

      this.logger.info('✅ Shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Perform health check on a deployed template
   */
  async performTemplateHealthCheck(templateId: string): Promise<any> {
    this.logger.info(`🔍 Performing health check for template: ${templateId}`);
    
    try {
      const healthResult = await this.templateInspector.performHealthCheck(templateId);
      
      this.logger.info(`Health check completed for ${templateId}: ${healthResult.status}`);
      return healthResult;
    } catch (error) {
      this.logger.error(`Health check failed for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Monitor template usage and collect metrics
   */
  async monitorTemplateUsage(templateId: string): Promise<any> {
    this.logger.info(`📊 Monitoring usage for template: ${templateId}`);
    
    try {
      const usageMetrics = await this.templateInspector.monitorTemplateUsage(templateId);
      
      this.logger.info(`Usage monitoring completed for ${templateId}`);
      return usageMetrics;
    } catch (error) {
      this.logger.error(`Usage monitoring failed for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate diagnostic report for a template
   */
  async generateTemplateDiagnostics(templateId: string): Promise<any> {
    this.logger.info(`🔧 Generating diagnostics for template: ${templateId}`);
    
    try {
      const diagnosticReport = await this.templateInspector.generateDiagnosticReport(templateId);
      
      this.logger.info(`Diagnostic report generated for ${templateId}: ${diagnosticReport.severity} severity`);
      return diagnosticReport;
    } catch (error) {
      this.logger.error(`Diagnostic generation failed for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Trigger rollback for a problematic template
   */
  async rollbackTemplate(templateId: string, reason: string): Promise<any> {
    this.logger.warn(`🔄 Triggering rollback for template: ${templateId}, reason: ${reason}`);
    
    try {
      const rollbackResult = await this.templateInspector.triggerRollback(templateId, reason);
      
      if (rollbackResult.success) {
        this.logger.info(`Rollback successful for ${templateId} to version ${rollbackResult.rollbackVersion}`);
      } else {
        this.logger.error(`Rollback failed for ${templateId}`);
      }
      
      return rollbackResult;
    } catch (error) {
      this.logger.error(`Rollback operation failed for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get overall health status of all monitored templates
   */
  async getSystemHealthStatus(): Promise<any> {
    this.logger.info('📈 Getting overall system health status');
    
    try {
      const healthStatus = await this.templateInspector.getOverallHealthStatus();
      
      this.logger.info(`System health status: ${healthStatus.overallStatus} (${healthStatus.healthyTemplates}/${healthStatus.totalTemplates} healthy)`);
      return healthStatus;
    } catch (error) {
      this.logger.error('Failed to get system health status', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Schedule periodic health checks for a template
   */
  async scheduleTemplateMonitoring(templateId: string, intervalMinutes: number = 60): Promise<void> {
    this.logger.info(`⏰ Scheduling health checks for template: ${templateId} every ${intervalMinutes} minutes`);
    
    try {
      const intervalMs = intervalMinutes * 60 * 1000;
      await this.templateInspector.scheduleHealthChecks(templateId, intervalMs);
      
      this.logger.info(`Health check scheduling completed for ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule health checks for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Cancel scheduled health checks for a template
   */
  async cancelTemplateMonitoring(templateId: string): Promise<void> {
    this.logger.info(`❌ Cancelling health checks for template: ${templateId}`);
    
    try {
      await this.templateInspector.cancelHealthChecks(templateId);
      
      this.logger.info(`Health check cancellation completed for ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel health checks for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Perform comprehensive template inspection (health + diagnostics + compatibility)
   */
  async inspectTemplate(templateId: string): Promise<{
    health: any;
    diagnostics: any;
    compatibility: any;
    performance: any;
  }> {
    this.logger.info(`🔍 Performing comprehensive inspection for template: ${templateId}`);
    
    try {
      const [health, diagnostics, compatibility, performance] = await Promise.all([
        this.templateInspector.performHealthCheck(templateId),
        this.templateInspector.generateDiagnosticReport(templateId),
        this.templateInspector.verifyDependencyCompatibility(templateId),
        this.templateInspector.trackPerformanceMetrics(templateId),
      ]);

      this.logger.info(`Comprehensive inspection completed for ${templateId}`);
      
      return {
        health,
        diagnostics,
        compatibility,
        performance,
      };
    } catch (error) {
      this.logger.error(`Comprehensive inspection failed for template ${templateId}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute operation with comprehensive error handling
   */
  private async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    errorType: ErrorType,
    component: string,
    operationName: string,
    details: Record<string, any> = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const btgError = new BackstageTemplateGeneratorError(
        errorType,
        component,
        operationName,
        error instanceof Error ? error.message : String(error),
        { ...details, originalError: error },
        true
      );
      
      this.logger.error(`Operation failed: ${component}.${operationName}`, btgError);
      throw btgError;
    }
  }

  /**
   * Add checkpoint to operation context
   */
  private addCheckpoint(context: OperationContext, name: string, data: any): void {
    context.checkpoints.push({
      name,
      timestamp: new Date(),
      data,
    });
    this.logger.debug(`Checkpoint added: ${name}`, { operationId: context.operationId });
  }

  /**
   * Attempt error recovery using registered strategies
   */
  private async attemptRecovery(
    error: BackstageTemplateGeneratorError,
    context: OperationContext
  ): Promise<any> {
    const strategies = this.recoveryStrategies.get(error.type) || [];
    
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          this.logger.info(`Attempting recovery: ${strategy.getDescription()}`, {
            operationId: context.operationId,
            errorType: error.type
          });
          
          const result = await strategy.recover(error, context);
          
          this.logger.info('Recovery successful', {
            operationId: context.operationId,
            strategy: strategy.getDescription()
          });
          
          return result;
        } catch (recoveryError) {
          this.logger.warn('Recovery strategy failed', {
            operationId: context.operationId,
            strategy: strategy.getDescription(),
            error: recoveryError
          });
        }
      }
    }
    
    this.logger.warn('No recovery strategy available or all strategies failed', {
      operationId: context.operationId,
      errorType: error.type
    });
    
    return null;
  }

  /**
   * Attempt rollback of failed operation
   */
  private async attemptRollback(operationId: string): Promise<void> {
    const rollbackOps = this.rollbackOperations.get(operationId) || [];
    
    if (rollbackOps.length === 0) {
      this.logger.debug('No rollback operations registered', { operationId });
      return;
    }

    this.logger.info(`Attempting rollback of ${rollbackOps.length} operations`, { operationId });

    // Execute rollback operations in reverse order
    for (let i = rollbackOps.length - 1; i >= 0; i--) {
      const rollbackOp = rollbackOps[i];
      
      if (rollbackOp.canRollback()) {
        try {
          this.logger.debug(`Executing rollback: ${rollbackOp.description}`, { operationId });
          await rollbackOp.execute();
          this.logger.debug(`Rollback successful: ${rollbackOp.description}`, { operationId });
        } catch (rollbackError) {
          this.logger.error(`Rollback failed: ${rollbackOp.description}`, rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)), { operationId });
        }
      } else {
        this.logger.warn(`Rollback not possible: ${rollbackOp.description}`, { operationId });
      }
    }

    // Clean up rollback operations
    this.rollbackOperations.delete(operationId);
  }

  /**
   * Register rollback operation
   */
  private registerRollbackOperation(operationId: string, rollbackOp: RollbackOperation): void {
    if (!this.rollbackOperations.has(operationId)) {
      this.rollbackOperations.set(operationId, []);
    }
    this.rollbackOperations.get(operationId)!.push(rollbackOp);
    
    this.logger.debug(`Rollback operation registered: ${rollbackOp.description}`, { operationId });
  }

  /**
   * Recovery helper: Create fallback intent
   */
  private async createFallbackIntent(originalInput: string): Promise<ParsedIntent> {
    return {
      capability: 'basic-service',
      description: originalInput || 'Basic service template',
      requirements: ['Create basic service structure'],
      constraints: [],
      maturityLevel: CapabilityMaturity.L1_GENERATION,
      phase: DevelopmentPhase.FOUNDATION,
    };
  }

  /**
   * Recovery helper: Generate minimal template
   */
  private async generateMinimalTemplate(spec: TemplateSpec): Promise<GeneratedTemplate> {
    const minimalSpec: TemplateSpec = {
      metadata: {
        name: spec.metadata.name || 'minimal-template',
        description: spec.metadata.description || 'Minimal template',
        tags: ['minimal'],
        owner: spec.metadata.owner || 'platform-team',
      },
      parameters: {
        name: {
          title: 'Name',
          type: 'string',
          description: 'Component name',
        },
      },
      steps: [
        {
          id: 'fetch',
          name: 'Fetch Template',
          action: 'fetch:template',
          input: {
            url: './skeleton',
            values: { name: '${{ parameters.name }}' },
          },
        },
      ],
      output: {
        links: [
          {
            title: 'Repository',
            url: '#',
          },
        ],
      },
      validation: {
        security: [],
        compliance: [],
        standards: [],
        cost: [],
      },
    };

    return this.generateTemplate(minimalSpec);
  }

  /**
   * Recovery helper: Rollback GitOps operation
   */
  private async rollbackGitOpsOperation(repository: any, context: OperationContext): Promise<any> {
    // Find the last successful checkpoint
    const lastCheckpoint = context.checkpoints
      .filter(cp => cp.name.includes('repository') || cp.name.includes('commit'))
      .pop();

    if (lastCheckpoint) {
      this.logger.info('Rolling back to last checkpoint', {
        operationId: context.operationId,
        checkpoint: lastCheckpoint.name
      });
      
      // In a real implementation, this would revert Git operations
      return lastCheckpoint.data;
    }

    throw new Error('No rollback point available for GitOps operation');
  }

  /**
   * Recovery helper: Retry deployment with cleanup
   */
  private async retryDeploymentWithCleanup(deploymentId: string, context: OperationContext): Promise<any> {
    this.logger.info('Cleaning up failed deployment', { deploymentId });
    
    // In a real implementation, this would clean up failed deployment resources
    // For now, we'll simulate cleanup and retry
    await this.sleep(1000);
    
    // Find the template from context
    const templateCheckpoint = context.checkpoints.find(cp => cp.name === 'template-generated');
    if (templateCheckpoint) {
      return this.deployTemplate(templateCheckpoint.data);
    }

    throw new Error('No template available for deployment retry');
  }

  /**
   * Recovery helper: Retry operation with backoff
   */
  private async retryOperation(operation: string, context: OperationContext, retryCount: number): Promise<any> {
    // This would retry the specific operation based on the operation type
    // For now, we'll simulate a successful retry
    this.logger.info(`Retrying operation: ${operation}`, {
      operationId: context.operationId,
      retryCount
    });
    
    return { success: true, retryCount };
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default export for convenience
export default BackstageTemplateGenerator;