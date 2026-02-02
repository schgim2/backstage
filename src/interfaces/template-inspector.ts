/**
 * Template Inspector Interface
 * Provides post-deployment monitoring and health verification for Backstage templates
 */

export interface TemplateInspector {
  /**
   * Perform comprehensive health check on a deployed template
   */
  performHealthCheck(templateId: string): Promise<HealthCheckResult>;

  /**
   * Monitor template usage patterns and collect metrics
   */
  monitorTemplateUsage(templateId: string): Promise<UsageMetrics>;

  /**
   * Validate template integrity and functionality
   */
  validateTemplateIntegrity(templateId: string): Promise<IntegrityReport>;

  /**
   * Generate detailed diagnostic report for template issues
   */
  generateDiagnosticReport(templateId: string): Promise<DiagnosticReport>;

  /**
   * Trigger automated rollback for failed templates
   */
  triggerRollback(templateId: string, reason: string): Promise<RollbackResult>;

  /**
   * Track performance metrics for templates
   */
  trackPerformanceMetrics(templateId: string): Promise<PerformanceMetrics>;

  /**
   * Verify dependency compatibility
   */
  verifyDependencyCompatibility(templateId: string): Promise<CompatibilityReport>;

  /**
   * Perform regression testing for template updates
   */
  performRegressionTesting(templateId: string): Promise<RegressionTestResult>;

  /**
   * Get overall health status for all monitored templates
   */
  getOverallHealthStatus(): Promise<OverallHealthStatus>;

  /**
   * Schedule periodic health checks
   */
  scheduleHealthChecks(templateId: string, interval: number): Promise<void>;

  /**
   * Cancel scheduled health checks
   */
  cancelHealthChecks(templateId: string): Promise<void>;
}

export interface HealthCheckResult {
  templateId: string;
  status: 'healthy' | 'degraded' | 'failed';
  checks: HealthCheck[];
  timestamp: Date;
  recommendations: string[];
  nextCheckScheduled?: Date;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: Record<string, any>;
  executionTime: number;
}

export interface UsageMetrics {
  templateId: string;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  failureReasons: FailureReason[];
  userSatisfactionScore: number;
  lastUsed: Date;
  usageByPeriod: UsagePeriod[];
  topUsers: UserUsage[];
}

export interface FailureReason {
  reason: string;
  count: number;
  percentage: number;
  lastOccurrence: Date;
}

export interface UsagePeriod {
  period: string;
  executions: number;
  successRate: number;
}

export interface UserUsage {
  userId: string;
  executions: number;
  successRate: number;
}

export interface IntegrityReport {
  templateId: string;
  isValid: boolean;
  validationErrors: TemplateValidationError[];
  accessibilityStatus: AccessibilityStatus;
  parameterValidation: ParameterValidationResult[];
  stepValidation: StepValidationResult[];
  timestamp: Date;
}

export interface TemplateValidationError {
  type: 'syntax' | 'semantic' | 'runtime';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  suggestion?: string;
}

export interface AccessibilityStatus {
  isAccessible: boolean;
  responseTime: number;
  statusCode?: number;
  errorMessage?: string;
}

export interface ParameterValidationResult {
  parameterName: string;
  isValid: boolean;
  validationErrors: string[];
  testValues: TestValue[];
}

export interface TestValue {
  value: any;
  isValid: boolean;
  errorMessage?: string;
}

export interface StepValidationResult {
  stepId: string;
  stepName: string;
  isValid: boolean;
  executionTime: number;
  errors: string[];
  warnings: string[];
}

export interface DiagnosticReport {
  templateId: string;
  issues: Issue[];
  performanceAnalysis: PerformanceAnalysis;
  dependencyStatus: DependencyStatus[];
  remediationSuggestions: RemediationSuggestion[];
  generatedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Issue {
  id: string;
  type: 'performance' | 'functionality' | 'security' | 'compatibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  firstDetected: Date;
  lastOccurrence: Date;
  occurrenceCount: number;
}

export interface PerformanceAnalysis {
  averageExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  memoryUsage: MemoryUsage;
  cpuUsage: CpuUsage;
  trends: PerformanceTrend[];
}

export interface MemoryUsage {
  average: number;
  peak: number;
  unit: 'MB' | 'GB';
}

export interface CpuUsage {
  average: number;
  peak: number;
  unit: 'percentage';
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changePercentage: number;
  period: string;
}

export interface DependencyStatus {
  name: string;
  version: string;
  status: 'compatible' | 'incompatible' | 'deprecated' | 'unknown';
  lastChecked: Date;
  issues: string[];
  recommendedVersion?: string;
}

export interface RemediationSuggestion {
  issueId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  description: string;
  estimatedEffort: string;
  automatable: boolean;
  steps: string[];
}

export interface RollbackResult {
  templateId: string;
  success: boolean;
  rollbackVersion: string;
  timestamp: Date;
  reason: string;
  affectedUsers: string[];
  notificationsSent: NotificationResult[];
}

export interface NotificationResult {
  recipient: string;
  method: 'email' | 'slack' | 'webhook';
  success: boolean;
  timestamp: Date;
  errorMessage?: string;
}

export interface PerformanceMetrics {
  templateId: string;
  metrics: Metric[];
  collectedAt: Date;
  period: string;
}

export interface Metric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface CompatibilityReport {
  templateId: string;
  overallCompatibility: 'compatible' | 'partially-compatible' | 'incompatible';
  dependencies: DependencyCompatibility[];
  backstageVersion: BackstageVersionCompatibility;
  recommendations: CompatibilityRecommendation[];
  lastChecked: Date;
}

export interface DependencyCompatibility {
  name: string;
  currentVersion: string;
  requiredVersion: string;
  compatible: boolean;
  issues: string[];
  migrationPath?: string[];
}

export interface BackstageVersionCompatibility {
  currentVersion: string;
  supportedVersions: string[];
  compatible: boolean;
  deprecationWarnings: string[];
}

export interface CompatibilityRecommendation {
  type: 'upgrade' | 'downgrade' | 'replace' | 'configure';
  component: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface RegressionTestResult {
  templateId: string;
  testSuite: string;
  overallResult: 'pass' | 'fail' | 'partial';
  tests: RegressionTest[];
  executionTime: number;
  timestamp: Date;
  backwardCompatible: boolean;
}

export interface RegressionTest {
  name: string;
  result: 'pass' | 'fail' | 'skip';
  executionTime: number;
  errorMessage?: string;
  expectedOutput?: any;
  actualOutput?: any;
}

export interface OverallHealthStatus {
  totalTemplates: number;
  healthyTemplates: number;
  degradedTemplates: number;
  failedTemplates: number;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  lastUpdated: Date;
  trends: HealthTrend[];
}

export interface HealthTrend {
  metric: string;
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'stable' | 'degrading';
}