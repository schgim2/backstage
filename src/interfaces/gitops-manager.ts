/**
 * GitOps Manager Interface
 * Manages the complete template lifecycle through Git-based workflows
 */

import {
  GeneratedTemplate,
  Repository,
  PullRequest,
  DeploymentResult,
} from '../types/core';

// Import CI/CD related types
export interface ValidationResults {
  pipelineId: string;
  status: 'passed' | 'failed' | 'warning';
  timestamp: Date;
  validationChecks: ValidationCheck[];
  securityScan: SecurityScanResult;
  qualityGate: QualityGateResult;
  errors: string[];
  warnings: string[];
}

export interface ValidationCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: string;
}

export interface SecurityScanResult {
  vulnerabilities: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  status: 'passed' | 'failed' | 'warning';
  details?: string[];
}

export interface QualityGateResult {
  coverage: number;
  maintainability: 'A' | 'B' | 'C' | 'D' | 'E';
  reliability: 'A' | 'B' | 'C' | 'D' | 'E';
  security: 'A' | 'B' | 'C' | 'D' | 'E';
  status: 'passed' | 'failed' | 'warning';
}

export interface PipelineStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  stages: PipelineStage[];
}

export interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number; // in seconds
  logs?: string;
}

export interface GitOpsManager {
  /**
   * Create Git repository for new template
   * @param template Generated template to create repository for
   * @returns Promise resolving to created repository
   */
  createTemplateRepository(template: GeneratedTemplate): Promise<Repository>;

  /**
   * Submit template for review via pull request
   * @param repository Repository containing the template
   * @returns Promise resolving to created pull request
   */
  submitForReview(repository: Repository): Promise<PullRequest>;

  /**
   * Deploy approved template to Backstage instance
   * @param approvedPR Approved pull request
   * @returns Promise resolving to deployment result
   */
  deployTemplate(approvedPR: PullRequest): Promise<DeploymentResult>;

  /**
   * Update capability registry after successful deployment
   * @param deployment Successful deployment result
   * @returns Promise resolving when registry is updated
   */
  updateCapabilityRegistry(deployment: DeploymentResult): Promise<void>;

  /**
   * Commit template changes to Git repository
   * @param repository Target repository
   * @param template Template to commit
   * @param message Commit message
   * @returns Promise resolving to commit hash
   */
  commitChanges(
    repository: Repository,
    template: GeneratedTemplate,
    message: string
  ): Promise<string>;

  /**
   * Trigger CI/CD pipeline for validation
   * @param repository Repository to trigger pipeline for
   * @returns Promise resolving to pipeline ID
   */
  triggerPipeline(repository: Repository): Promise<string>;

  /**
   * Process validation results from CI/CD pipeline
   * @param pipelineId Pipeline ID to get results for
   * @param repository Repository being validated
   * @returns Promise resolving to validation results
   */
  processValidationResults(
    pipelineId: string,
    repository: Repository
  ): Promise<ValidationResults>;

  /**
   * Get pipeline status and execution details
   * @param pipelineId Pipeline ID to check
   * @returns Promise resolving to pipeline status
   */
  getPipelineStatus(pipelineId: string): Promise<PipelineStatus>;

  /**
   * Monitor pipeline execution and provide real-time updates
   * @param pipelineId Pipeline ID to monitor
   * @param onUpdate Optional callback for status updates
   * @returns Promise resolving to final pipeline status
   */
  monitorPipeline(
    pipelineId: string,
    onUpdate?: (status: PipelineStatus) => void
  ): Promise<PipelineStatus>;

  /**
   * Create pull request with comprehensive impact analysis
   * @param repository Source repository
   * @param sourceBranch Source branch
   * @param targetBranch Target branch
   * @param title PR title
   * @param description PR description
   * @returns Promise resolving to created pull request
   */
  createPullRequest(
    repository: Repository,
    sourceBranch: string,
    targetBranch: string,
    title: string,
    description: string
  ): Promise<PullRequest>;

  /**
   * Automatically merge approved pull request with comprehensive validation
   * @param pullRequest Pull request to merge
   * @returns Promise resolving to merge result
   */
  mergePullRequest(pullRequest: PullRequest): Promise<boolean>;

  /**
   * Verify deployment was successful
   * @param deployment Deployment to verify
   * @returns Promise resolving to verification result
   */
  verifyDeployment(deployment: DeploymentResult): Promise<boolean>;
}
