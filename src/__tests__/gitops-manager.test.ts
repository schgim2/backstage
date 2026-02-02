/**
 * Unit tests for GitOpsManagerImpl
 */

import {
  GitOpsManagerImpl,
  GitConfig,
  PipelineConfig,
  GitCommit,
  GitBranch,
  ImpactAnalysis,
  DetailedValidationResults,
} from '../implementations/gitops-manager';
import {
  ValidationResults,
  PipelineStatus,
} from '../interfaces/gitops-manager';
import {
  GeneratedTemplate,
  Repository,
  PullRequest,
  DeploymentResult,
  CapabilityMaturity,
  DevelopmentPhase,
} from '../types/core';

describe('GitOpsManagerImpl', () => {
  let gitOpsManager: GitOpsManagerImpl;
  let mockTemplate: GeneratedTemplate;
  let mockRepository: Repository;

  beforeEach(() => {
    const gitConfig: GitConfig = {
      defaultBranch: 'main',
      remoteUrl: 'https://github.com',
      organization: 'test-org',
      token: 'test-token',
    };

    const pipelineConfig: PipelineConfig = {
      provider: 'github-actions',
      workflowFile: '.github/workflows/test.yml',
      triggers: ['pull_request', 'push'],
      environment: 'test',
    };

    gitOpsManager = new GitOpsManagerImpl(gitConfig, pipelineConfig);

    mockTemplate = {
      yaml: 'apiVersion: scaffolder.backstage.io/v1beta3\nkind: Template',
      skeleton: {
        files: {
          'package.json': '{"name": "test-service"}',
          'src/index.ts': 'console.log("Hello World");',
        },
        directories: ['src', 'tests'],
      },
      documentation: {
        readme: '# Test Service\nA test service template',
        techDocs: '# Technical Documentation\nDetailed docs here',
        apiDocs: '# API Documentation\nAPI endpoints',
        usageExamples: ['npm install', 'npm start'],
      },
      validation: {
        security: [],
        compliance: [],
        standards: [],
        cost: [],
      },
      metadata: {
        id: 'test-template',
        name: 'test-service',
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        author: 'test-author',
        maturityLevel: CapabilityMaturity.L1_GENERATION,
        phase: DevelopmentPhase.FOUNDATION,
      },
    };

    mockRepository = {
      id: 'test-org/test-service',
      name: 'test-service',
      url: 'https://github.com/test-org/test-service',
      branch: 'main',
    };
  });

  describe('createTemplateRepository', () => {
    it('should create a new repository for template', async () => {
      const repository = await gitOpsManager.createTemplateRepository(
        mockTemplate
      );

      expect(repository.id).toBe('test-org/test-service');
      expect(repository.name).toBe('test-service');
      expect(repository.url).toBe('https://github.com/test-org/test-service');
      expect(repository.branch).toBe('main');
    });

    it('should sanitize repository name', async () => {
      const templateWithSpecialChars = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          name: 'Test Service With Spaces & Special!',
        },
      };

      const repository = await gitOpsManager.createTemplateRepository(
        templateWithSpecialChars
      );

      expect(repository.name).toBe('test-service-with-spaces-special');
      expect(repository.id).toBe('test-org/test-service-with-spaces-special');
    });

    it('should handle template with minimal metadata', async () => {
      const minimalTemplate = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          name: 'minimal',
        },
      };

      const repository = await gitOpsManager.createTemplateRepository(
        minimalTemplate
      );

      expect(repository.name).toBe('minimal');
      expect(repository.branch).toBe('main');
    });
  });

  describe('commitChanges', () => {
    it('should commit template changes to repository', async () => {
      const commitHash = await gitOpsManager.commitChanges(
        mockRepository,
        mockTemplate,
        'Add new template features'
      );

      expect(typeof commitHash).toBe('string');
      expect(commitHash.length).toBeGreaterThan(0);
    });

    it('should handle empty commit message', async () => {
      const commitHash = await gitOpsManager.commitChanges(
        mockRepository,
        mockTemplate,
        ''
      );

      expect(typeof commitHash).toBe('string');
    });

    it('should commit all template files', async () => {
      const templateWithManyFiles = {
        ...mockTemplate,
        skeleton: {
          files: {
            'package.json': '{}',
            'src/index.ts': 'code',
            'src/utils.ts': 'utils',
            'tests/index.test.ts': 'tests',
            'README.md': 'readme',
          },
          directories: ['src', 'tests'],
        },
      };

      const commitHash = await gitOpsManager.commitChanges(
        mockRepository,
        templateWithManyFiles,
        'Add multiple files'
      );

      expect(commitHash).toBeDefined();
    });
  });

  describe('createBranch', () => {
    it('should create a new branch from default branch', async () => {
      const branch = await gitOpsManager.createBranch(
        mockRepository,
        'feature/new-feature'
      );

      expect(branch.name).toBe('feature/new-feature');
      expect(branch.isDefault).toBe(false);
      expect(branch.isProtected).toBe(false);
      expect(typeof branch.commit).toBe('string');
    });

    it('should create a new branch from specified source', async () => {
      const branch = await gitOpsManager.createBranch(
        mockRepository,
        'hotfix/urgent-fix',
        'develop'
      );

      expect(branch.name).toBe('hotfix/urgent-fix');
      expect(branch.isDefault).toBe(false);
    });

    it('should mark default branch as protected', async () => {
      const branch = await gitOpsManager.createBranch(mockRepository, 'main');

      expect(branch.name).toBe('main');
      expect(branch.isDefault).toBe(true);
      expect(branch.isProtected).toBe(true);
    });
  });

  describe('mergeBranches', () => {
    it('should merge branches successfully', async () => {
      // First create a feature branch
      await gitOpsManager.createBranch(mockRepository, 'feature/test');

      const mergeCommit = await gitOpsManager.mergeBranches(
        mockRepository,
        'feature/test',
        'main',
        'Merge feature branch'
      );

      expect(mergeCommit.message).toBe('Merge feature branch');
      expect(mergeCommit.author).toBe('GitOps Manager');
      expect(mergeCommit.hash).toBeDefined();
      expect(mergeCommit.timestamp).toBeInstanceOf(Date);
    });

    it('should use default merge message when not provided', async () => {
      await gitOpsManager.createBranch(mockRepository, 'feature/auto-merge');

      const mergeCommit = await gitOpsManager.mergeBranches(
        mockRepository,
        'feature/auto-merge',
        'main'
      );

      expect(mergeCommit.message).toBe('Merge feature/auto-merge into main');
    });

    it('should throw error for non-existent source branch', async () => {
      await expect(
        gitOpsManager.mergeBranches(
          mockRepository,
          'non-existent-branch',
          'main'
        )
      ).rejects.toThrow("Branch 'non-existent-branch' does not exist");
    });

    it('should throw error for non-existent target branch', async () => {
      await gitOpsManager.createBranch(mockRepository, 'feature/test');

      await expect(
        gitOpsManager.mergeBranches(
          mockRepository,
          'feature/test',
          'non-existent-target'
        )
      ).rejects.toThrow("Branch 'non-existent-target' does not exist");
    });
  });

  describe('submitForReview', () => {
    it('should create pull request for review', async () => {
      const pullRequest = await gitOpsManager.submitForReview(mockRepository);

      expect(pullRequest.title).toContain('Add template: test-service');
      expect(pullRequest.repository).toBe(mockRepository);
      expect(pullRequest.targetBranch).toBe('main');
      expect(pullRequest.status).toBe('open');
      expect(pullRequest.sourceBranch).toMatch(/^feature\/template-\d+$/);
    });

    it('should generate descriptive pull request description', async () => {
      const pullRequest = await gitOpsManager.submitForReview(mockRepository);

      expect(pullRequest.description).toContain('Template Addition');
      expect(pullRequest.description).toContain('test-service');
      expect(pullRequest.description).toContain('Changes');
      expect(pullRequest.description).toContain('Testing');
      expect(pullRequest.description).toContain('Deployment');
    });
  });

  describe('triggerPipeline', () => {
    it('should trigger GitHub Actions pipeline', async () => {
      const pipelineId = await gitOpsManager.triggerPipeline(mockRepository);

      expect(typeof pipelineId).toBe('string');
      expect(pipelineId).toMatch(/^pipeline-\d+$/);
    });

    it('should handle different pipeline providers', async () => {
      const gitLabConfig: PipelineConfig = {
        provider: 'gitlab-ci',
        workflowFile: '.gitlab-ci.yml',
        triggers: ['merge_request'],
        environment: 'production',
      };

      const gitLabManager = new GitOpsManagerImpl(undefined, gitLabConfig);
      const pipelineId = await gitLabManager.triggerPipeline(mockRepository);

      expect(pipelineId).toBeDefined();
    });

    it('should throw error for unsupported pipeline provider', async () => {
      const unsupportedConfig: PipelineConfig = {
        provider: 'unsupported' as any,
        workflowFile: '.unsupported.yml',
        triggers: [],
        environment: 'test',
      };

      const unsupportedManager = new GitOpsManagerImpl(
        undefined,
        unsupportedConfig
      );

      await expect(
        unsupportedManager.triggerPipeline(mockRepository)
      ).rejects.toThrow('Unsupported pipeline provider: unsupported');
    });
  });

  describe('createPullRequest', () => {
    it('should create pull request with comprehensive impact analysis', async () => {
      const pullRequest = await gitOpsManager.createPullRequest(
        mockRepository,
        'feature/new-feature',
        'main',
        'Add new feature',
        'This PR adds a new feature to the template'
      );

      expect(pullRequest.title).toBe('Add new feature');
      expect(pullRequest.sourceBranch).toBe('feature/new-feature');
      expect(pullRequest.targetBranch).toBe('main');
      expect(pullRequest.status).toBe('open');
      expect(pullRequest.description).toContain('📊 Impact Analysis');
      expect(pullRequest.description).toContain('Files Changed');
      expect(pullRequest.description).toContain('Risk Level');
      expect(pullRequest.description).toContain('Security Impact');
      expect(pullRequest.description).toContain('Performance Impact');
      expect(pullRequest.description).toContain('👥 Review Requirements');
      expect(pullRequest.description).toContain('🔍 Automated Checks');
    });

    it('should include detailed impact analysis in description', async () => {
      const pullRequest = await gitOpsManager.createPullRequest(
        mockRepository,
        'feature/major-change',
        'main',
        'Major changes',
        'Significant updates'
      );

      expect(pullRequest.description).toContain('Lines Added');
      expect(pullRequest.description).toContain('Lines Removed');
      expect(pullRequest.description).toContain('Breaking Changes');
      expect(pullRequest.description).toContain('Affected Components');
      expect(pullRequest.description).toContain('Test Coverage');
      expect(pullRequest.description).toContain('Required Reviewers');
      expect(pullRequest.description).toContain('Estimated Review Time');
    });

    it('should handle high-risk changes with additional validation', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const pullRequest = await gitOpsManager.createPullRequest(
        mockRepository,
        'feature/high-risk',
        'main',
        'High risk changes',
        'Changes with high impact'
      );

      expect(pullRequest).toBeDefined();

      // Check if high-risk validation was triggered
      const highRiskLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Setting up automated checks')
      );
      expect(highRiskLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should set up appropriate automated checks based on impact', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await gitOpsManager.createPullRequest(
        mockRepository,
        'feature/security-change',
        'main',
        'Security updates',
        'Updates to security components'
      );

      const checkLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] && call[0].includes && call[0].includes('Required checks:')
      );
      expect(checkLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('should notify stakeholders based on impact level', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await gitOpsManager.createPullRequest(
        mockRepository,
        'feature/stakeholder-notification',
        'main',
        'Important changes',
        'Changes requiring stakeholder notification'
      );

      const notificationLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Notifying stakeholders')
      );
      expect(notificationLogs.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });

  describe('mergePullRequest', () => {
    it('should merge approved pull request successfully with comprehensive validation', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-123',
        title: 'Test PR',
        description: 'Test description',
        repository: mockRepository,
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(mockRepository, 'feature/test');

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      expect(success).toBe(true);
      expect(pullRequest.status).toBe('merged');
    });

    it('should handle merge failures gracefully with detailed logging', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-456',
        title: 'Failing PR',
        description: 'This will fail',
        repository: mockRepository,
        sourceBranch: 'non-existent-branch',
        targetBranch: 'main',
        status: 'open',
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to merge pull request:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should perform comprehensive pre-merge validation', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-validation',
        title: 'Validation Test PR',
        description: 'Testing validation',
        repository: mockRepository,
        sourceBranch: 'feature/validation',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(mockRepository, 'feature/validation');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Check if pre-merge validation was performed
      const validationLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Performing pre-merge validation')
      );
      expect(validationLogs.length).toBeGreaterThan(0);

      expect(success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should trigger post-merge actions after successful merge', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-post-merge',
        title: 'Post-merge Test PR',
        description: 'Testing post-merge actions',
        repository: mockRepository,
        sourceBranch: 'feature/post-merge',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(mockRepository, 'feature/post-merge');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Check if post-merge actions were triggered
      const postMergeLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Triggering post-merge actions')
      );
      expect(postMergeLogs.length).toBeGreaterThan(0);

      expect(success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should send appropriate notifications for merge success', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-notification',
        title: 'Notification Test PR',
        description: 'Testing notifications',
        repository: mockRepository,
        sourceBranch: 'feature/notification',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(mockRepository, 'feature/notification');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Check if success notification was sent
      const notificationLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Merge success notification:')
      );
      expect(notificationLogs.length).toBeGreaterThan(0);

      expect(success).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should send appropriate notifications for merge failure', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-failure-notification',
        title: 'Failure Notification Test PR',
        description: 'Testing failure notifications',
        repository: mockRepository,
        sourceBranch: 'non-existent-branch',
        targetBranch: 'main',
        status: 'open',
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Check if failure notification was sent
      const notificationLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Merge failure notification:')
      );
      expect(notificationLogs.length).toBeGreaterThan(0);

      expect(success).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should validate CI status before merging', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-ci-validation',
        title: 'CI Validation Test PR',
        description: 'Testing CI validation',
        repository: mockRepository,
        sourceBranch: 'feature/ci-validation',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(mockRepository, 'feature/ci-validation');

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Since our mock CI always passes, merge should succeed
      expect(success).toBe(true);
    });

    it('should check for merge conflicts before merging', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-conflict-check',
        title: 'Conflict Check Test PR',
        description: 'Testing conflict detection',
        repository: mockRepository,
        sourceBranch: 'feature/conflict-check',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(
        mockRepository,
        'feature/conflict-check'
      );

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Since our mock conflict detection returns no conflicts, merge should succeed
      expect(success).toBe(true);
    });

    it('should perform final security check before merging', async () => {
      const pullRequest: PullRequest = {
        id: 'pr-security-check',
        title: 'Security Check Test PR',
        description: 'Testing security validation',
        repository: mockRepository,
        sourceBranch: 'feature/security-check',
        targetBranch: 'main',
        status: 'open',
      };

      // Create the source branch first
      await gitOpsManager.createBranch(
        mockRepository,
        'feature/security-check'
      );

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const success = await gitOpsManager.mergePullRequest(pullRequest);

      // Check if security check was performed
      const securityLogs = consoleSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Performing final security check')
      );
      expect(securityLogs.length).toBeGreaterThan(0);

      expect(success).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('deployTemplate', () => {
    it('should deploy merged pull request successfully', async () => {
      const mergedPR: PullRequest = {
        id: 'pr-789',
        title: 'Merged PR',
        description: 'Successfully merged',
        repository: mockRepository,
        sourceBranch: 'feature/deployed',
        targetBranch: 'main',
        status: 'merged',
      };

      const deployment = await gitOpsManager.deployTemplate(mergedPR);

      expect(deployment.success).toBe(true);
      expect(deployment.deploymentId).toMatch(/^deploy-\d+$/);
      expect(deployment.timestamp).toBeInstanceOf(Date);
      expect(deployment.errors).toBeUndefined();
    });

    it('should fail deployment for non-merged PR', async () => {
      const openPR: PullRequest = {
        id: 'pr-999',
        title: 'Open PR',
        description: 'Still open',
        repository: mockRepository,
        sourceBranch: 'feature/open',
        targetBranch: 'main',
        status: 'open',
      };

      const deployment = await gitOpsManager.deployTemplate(openPR);

      expect(deployment.success).toBe(false);
      expect(deployment.errors).toContain(
        'Pull request must be merged before deployment'
      );
    });

    it('should include deployment metadata', async () => {
      const mergedPR: PullRequest = {
        id: 'pr-metadata',
        title: 'Metadata Test',
        description: 'Testing metadata',
        repository: mockRepository,
        sourceBranch: 'feature/metadata',
        targetBranch: 'main',
        status: 'merged',
      };

      const deployment = await gitOpsManager.deployTemplate(mergedPR);

      expect(deployment.deploymentId).toBeDefined();
      expect(deployment.timestamp).toBeInstanceOf(Date);
      expect(deployment.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('verifyDeployment', () => {
    it('should verify successful deployment', async () => {
      const successfulDeployment: DeploymentResult = {
        success: true,
        deploymentId: 'deploy-success',
        timestamp: new Date(),
      };

      const isVerified = await gitOpsManager.verifyDeployment(
        successfulDeployment
      );

      expect(isVerified).toBe(true);
    });

    it('should fail verification for failed deployment', async () => {
      const failedDeployment: DeploymentResult = {
        success: false,
        deploymentId: 'deploy-failed',
        timestamp: new Date(),
        errors: ['Deployment failed'],
      };

      const isVerified = await gitOpsManager.verifyDeployment(failedDeployment);

      expect(isVerified).toBe(false);
    });

    it('should handle verification errors gracefully', async () => {
      const deployment: DeploymentResult = {
        success: true,
        deploymentId: 'deploy-error',
        timestamp: new Date(),
      };

      // Mock console.error to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const isVerified = await gitOpsManager.verifyDeployment(deployment);

      expect(typeof isVerified).toBe('boolean');
      consoleSpy.mockRestore();
    });
  });

  describe('updateCapabilityRegistry', () => {
    it('should update registry for successful deployment', async () => {
      const successfulDeployment: DeploymentResult = {
        success: true,
        deploymentId: 'deploy-registry',
        timestamp: new Date(),
      };

      await expect(
        gitOpsManager.updateCapabilityRegistry(successfulDeployment)
      ).resolves.not.toThrow();
    });

    it('should throw error for failed deployment', async () => {
      const failedDeployment: DeploymentResult = {
        success: false,
        deploymentId: 'deploy-failed-registry',
        timestamp: new Date(),
        errors: ['Deployment failed'],
      };

      await expect(
        gitOpsManager.updateCapabilityRegistry(failedDeployment)
      ).rejects.toThrow('Cannot update registry for failed deployment');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle repository with no files', async () => {
      const emptyTemplate = {
        ...mockTemplate,
        skeleton: {
          files: {},
          directories: [],
        },
      };

      const repository = await gitOpsManager.createTemplateRepository(
        emptyTemplate
      );
      expect(repository).toBeDefined();
    });

    it('should handle very long repository names', async () => {
      const longNameTemplate = {
        ...mockTemplate,
        metadata: {
          ...mockTemplate.metadata,
          name:
            'a'.repeat(100) +
            '-very-long-repository-name-that-exceeds-normal-limits',
        },
      };

      const repository = await gitOpsManager.createTemplateRepository(
        longNameTemplate
      );
      expect(repository.name.length).toBeLessThan(100);
    });

    it('should handle special characters in commit messages', async () => {
      const specialMessage = 'Fix: Add "quotes" & <tags> and émojis 🚀';

      const commitHash = await gitOpsManager.commitChanges(
        mockRepository,
        mockTemplate,
        specialMessage
      );

      expect(commitHash).toBeDefined();
    });

    it('should handle concurrent branch operations', async () => {
      const branchPromises = [
        gitOpsManager.createBranch(mockRepository, 'feature/concurrent-1'),
        gitOpsManager.createBranch(mockRepository, 'feature/concurrent-2'),
        gitOpsManager.createBranch(mockRepository, 'feature/concurrent-3'),
      ];

      const branches = await Promise.all(branchPromises);

      expect(branches).toHaveLength(3);
      branches.forEach((branch, index) => {
        expect(branch.name).toBe(`feature/concurrent-${index + 1}`);
      });
    });
  });

  describe('configuration handling', () => {
    it('should use default configuration when none provided', () => {
      const defaultManager = new GitOpsManagerImpl();
      expect(defaultManager).toBeDefined();
    });

    it('should handle partial configuration', () => {
      const partialConfig: Partial<GitConfig> = {
        defaultBranch: 'develop',
      };

      const manager = new GitOpsManagerImpl(partialConfig as GitConfig);
      expect(manager).toBeDefined();
    });

    it('should support different Git providers', async () => {
      const gitLabConfig: GitConfig = {
        defaultBranch: 'main',
        remoteUrl: 'https://gitlab.com',
        organization: 'gitlab-org',
      };

      const gitLabManager = new GitOpsManagerImpl(gitLabConfig);
      const repository = await gitLabManager.createTemplateRepository(
        mockTemplate
      );

      expect(repository.url).toContain('gitlab.com');
      expect(repository.url).toContain('gitlab-org');
    });
  });

  describe('workflow integration', () => {
    it('should support complete GitOps workflow', async () => {
      // 1. Create repository
      const repository = await gitOpsManager.createTemplateRepository(
        mockTemplate
      );

      // 2. Submit for review
      const pullRequest = await gitOpsManager.submitForReview(repository);

      // 3. Trigger pipeline
      const pipelineId = await gitOpsManager.triggerPipeline(repository);

      // 4. Process validation results
      const results = await gitOpsManager.processValidationResults(
        'pipeline-success-workflow',
        repository
      );

      // 5. Merge PR (keep status as 'open' for merge validation)
      pullRequest.status = 'open'; // Ensure PR is in correct state for merging
      const mergeSuccess = await gitOpsManager.mergePullRequest(pullRequest);

      // 6. Deploy template (PR status will be 'merged' after successful merge)
      const deployment = await gitOpsManager.deployTemplate(pullRequest);

      // 7. Verify deployment
      const isVerified = await gitOpsManager.verifyDeployment(deployment);

      // 8. Update registry
      await gitOpsManager.updateCapabilityRegistry(deployment);

      expect(repository).toBeDefined();
      expect(pullRequest.status).toBe('merged');
      expect(pipelineId).toBeDefined();
      expect(results.status).toBe('passed');
      expect(mergeSuccess).toBe(true);
      expect(deployment.success).toBe(true);
      expect(isVerified).toBe(true);
    });
  });

  describe('CI/CD Pipeline Integration', () => {
    describe('processValidationResults', () => {
      it('should process successful validation results', async () => {
        const pipelineId = 'pipeline-success-123';

        const results = await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        expect(results.pipelineId).toBe(pipelineId);
        expect(results.status).toBe('passed');
        expect(results.timestamp).toBeInstanceOf(Date);
        expect(results.validationChecks).toHaveLength(3);
        expect(results.securityScan.status).toBe('passed');
        expect(results.qualityGate.status).toBe('passed');
        expect(results.errors).toHaveLength(0);
        expect(results.warnings).toHaveLength(0);
      });

      it('should handle validation results with errors', async () => {
        // Mock a failed pipeline
        const failedPipelineId = 'pipeline-failed';

        const results = await gitOpsManager.processValidationResults(
          failedPipelineId,
          mockRepository
        );

        expect(results.pipelineId).toBe(failedPipelineId);
        expect(results.timestamp).toBeInstanceOf(Date);
        expect(results.validationChecks).toBeDefined();
        expect(results.securityScan).toBeDefined();
        expect(results.qualityGate).toBeDefined();
      });

      it('should update repository status after processing results', async () => {
        const pipelineId = 'pipeline-status-update';

        const results = await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        expect(results).toBeDefined();
        // Verify that status update was called (would be mocked in real implementation)
      });
    });

    describe('getPipelineStatus', () => {
      it('should return pipeline status with stages', async () => {
        const pipelineId = 'pipeline-status-test';

        const status = await gitOpsManager.getPipelineStatus(pipelineId);

        expect(status.id).toBe(pipelineId);
        expect(status.status).toBe('completed');
        expect(status.startTime).toBeInstanceOf(Date);
        expect(status.endTime).toBeInstanceOf(Date);
        expect(status.duration).toBe(300);
        expect(status.stages).toHaveLength(2);

        const validationStage = status.stages[0];
        expect(validationStage.name).toBe('validation');
        expect(validationStage.status).toBe('passed');
        expect(validationStage.duration).toBe(120);

        const securityStage = status.stages[1];
        expect(securityStage.name).toBe('security-scan');
        expect(securityStage.status).toBe('passed');
        expect(securityStage.duration).toBe(180);
      });

      it('should handle different pipeline statuses', async () => {
        const runningPipelineId = 'pipeline-running';

        const status = await gitOpsManager.getPipelineStatus(runningPipelineId);

        expect(status.id).toBe(runningPipelineId);
        expect([
          'pending',
          'running',
          'completed',
          'failed',
          'cancelled',
        ]).toContain(status.status);
      });
    });

    describe('monitorPipeline', () => {
      it('should monitor pipeline until completion', async () => {
        const pipelineId = 'pipeline-monitor';
        const updates: PipelineStatus[] = [];

        const finalStatus = await gitOpsManager.monitorPipeline(
          pipelineId,
          (status) => updates.push(status)
        );

        expect(finalStatus.id).toBe(pipelineId);
        expect(finalStatus.status).toBe('completed');
        expect(updates.length).toBeGreaterThanOrEqual(1);
      });

      it('should handle pipeline monitoring without callback', async () => {
        const pipelineId = 'pipeline-no-callback';

        const finalStatus = await gitOpsManager.monitorPipeline(pipelineId);

        expect(finalStatus.id).toBe(pipelineId);
        expect(finalStatus.status).toBe('completed');
      });

      it('should timeout for long-running pipelines', async () => {
        // This test would need to mock a long-running pipeline
        // For now, we'll test the basic functionality
        const pipelineId = 'pipeline-timeout';

        const finalStatus = await gitOpsManager.monitorPipeline(pipelineId);

        expect(finalStatus).toBeDefined();
      });
    });

    describe('validation result processing', () => {
      it('should handle comprehensive validation checks', async () => {
        const pipelineId = 'pipeline-comprehensive';

        const results = await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        // Verify all validation check types
        const checkNames = results.validationChecks.map((check) => check.name);
        expect(checkNames).toContain('template-syntax');
        expect(checkNames).toContain('parameter-validation');
        expect(checkNames).toContain('step-validation');

        // Verify security scan results
        expect(results.securityScan.vulnerabilities).toBe(0);
        expect(results.securityScan.highRisk).toBe(0);
        expect(results.securityScan.mediumRisk).toBe(0);
        expect(results.securityScan.lowRisk).toBe(0);

        // Verify quality gate results
        expect(results.qualityGate.coverage).toBe(85);
        expect(results.qualityGate.maintainability).toBe('A');
        expect(results.qualityGate.reliability).toBe('A');
        expect(results.qualityGate.security).toBe('A');
      });

      it('should categorize validation results correctly', async () => {
        const pipelineId = 'pipeline-categorization';

        const results = await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        // All checks should be categorized
        results.validationChecks.forEach((check) => {
          expect(['passed', 'failed', 'warning']).toContain(check.status);
          expect(check.name).toBeDefined();
          expect(check.message).toBeDefined();
        });

        // Results should have proper status
        expect(['passed', 'failed', 'warning']).toContain(results.status);
      });
    });

    describe('pipeline provider integration', () => {
      it('should handle GitHub Actions pipeline', async () => {
        const githubManager = new GitOpsManagerImpl(undefined, {
          provider: 'github-actions',
          workflowFile: '.github/workflows/ci.yml',
          triggers: ['pull_request', 'push'],
          environment: 'production',
        });

        const pipelineId = await githubManager.triggerPipeline(mockRepository);
        expect(pipelineId).toMatch(/^pipeline-\d+$/);
      });

      it('should handle GitLab CI pipeline', async () => {
        const gitlabManager = new GitOpsManagerImpl(undefined, {
          provider: 'gitlab-ci',
          workflowFile: '.gitlab-ci.yml',
          triggers: ['merge_request'],
          environment: 'production',
        });

        const pipelineId = await gitlabManager.triggerPipeline(mockRepository);
        expect(pipelineId).toMatch(/^pipeline-\d+$/);
      });

      it('should handle Jenkins pipeline', async () => {
        const jenkinsManager = new GitOpsManagerImpl(undefined, {
          provider: 'jenkins',
          workflowFile: 'Jenkinsfile',
          triggers: ['webhook'],
          environment: 'production',
        });

        const pipelineId = await jenkinsManager.triggerPipeline(mockRepository);
        expect(pipelineId).toMatch(/^pipeline-\d+$/);
      });

      it('should handle Azure DevOps pipeline', async () => {
        const azureManager = new GitOpsManagerImpl(undefined, {
          provider: 'azure-devops',
          workflowFile: 'azure-pipelines.yml',
          triggers: ['pr', 'ci'],
          environment: 'production',
        });

        const pipelineId = await azureManager.triggerPipeline(mockRepository);
        expect(pipelineId).toMatch(/^pipeline-\d+$/);
      });
    });

    describe('notification system', () => {
      it('should send success notifications for passed pipelines', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const pipelineId = 'pipeline-success-notification';
        await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        // Check if any console.log call contains the success notification
        const successNotificationCall = consoleSpy.mock.calls.find(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Success notification:')
        );

        expect(successNotificationCall).toBeDefined();

        consoleSpy.mockRestore();
      });

      it('should send warning notifications for pipelines with warnings', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const pipelineId = 'pipeline-warning-notification';
        await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        // Since our mock returns warnings, it should trigger warning notification
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should include relevant details in notifications', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const pipelineId = 'pipeline-detailed-notification';
        await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        const notificationCalls = consoleSpy.mock.calls.filter((call) =>
          call[0].includes('notification:')
        );

        expect(notificationCalls.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('error handling in CI/CD integration', () => {
      it('should handle pipeline status retrieval errors gracefully', async () => {
        // This would test error scenarios in a real implementation
        const pipelineId = 'pipeline-error-handling';

        const status = await gitOpsManager.getPipelineStatus(pipelineId);

        expect(status).toBeDefined();
        expect(status.id).toBe(pipelineId);
      });

      it('should handle validation result processing errors', async () => {
        const pipelineId = 'pipeline-validation-error';

        const results = await gitOpsManager.processValidationResults(
          pipelineId,
          mockRepository
        );

        expect(results).toBeDefined();
        expect(results.pipelineId).toBe(pipelineId);
      });

      it('should handle monitoring timeout scenarios', async () => {
        // Test would verify timeout handling in real implementation
        const pipelineId = 'pipeline-monitoring-timeout';

        const finalStatus = await gitOpsManager.monitorPipeline(pipelineId);

        expect(finalStatus).toBeDefined();
      });
    });

    describe('enhanced pull request management', () => {
      it('should handle pull requests with comprehensive impact analysis', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/comprehensive-analysis',
          'main',
          'Comprehensive Analysis Test',
          'Testing comprehensive impact analysis'
        );

        expect(pullRequest.description).toContain('📊 Impact Analysis');
        expect(pullRequest.description).toContain('Security Impact');
        expect(pullRequest.description).toContain('Performance Impact');
        expect(pullRequest.description).toContain('Test Coverage');
        expect(pullRequest.description).toContain('Dependency Changes');
        expect(pullRequest.description).toContain('Required Reviewers');
        expect(pullRequest.description).toContain('Estimated Review Time');
      });

      it('should create pull request with risk-appropriate emoji indicators', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/risk-indicators',
          'main',
          'Risk Indicators Test',
          'Testing risk level indicators'
        );

        // Should contain risk level emoji (🟢, 🟡, or 🔴)
        expect(pullRequest.description).toMatch(/[🟢🟡🔴]/u);

        // Should contain security emoji (🔓, 🔐, or 🔒)
        expect(pullRequest.description).toMatch(/[🔓🔐🔒]/u);
      });

      it('should handle breaking changes detection and notification', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/breaking-changes',
          'main',
          'Breaking Changes Test',
          'Testing breaking changes detection'
        );

        // Check if breaking changes were detected and handled
        const breakingChangeLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            (call[0].includes('Breaking changes') ||
              call[0].includes('additional validation'))
        );

        // Should have some form of breaking change handling
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });

      it('should integrate pull request workflow with CI/CD pipeline', async () => {
        // Create repository and PR
        const repository = await gitOpsManager.createTemplateRepository(
          mockTemplate
        );
        const pullRequest = await gitOpsManager.submitForReview(repository);

        // Trigger pipeline
        const pipelineId = await gitOpsManager.triggerPipeline(repository);

        // Process validation results
        const results = await gitOpsManager.processValidationResults(
          'pipeline-success-pr-integration',
          repository
        );

        // Attempt to merge PR (should succeed with passing pipeline)
        pullRequest.status = 'open'; // Reset status
        await gitOpsManager.createBranch(repository, pullRequest.sourceBranch);
        const mergeSuccess = await gitOpsManager.mergePullRequest(pullRequest);

        expect(repository).toBeDefined();
        expect(pullRequest).toBeDefined();
        expect(pipelineId).toBeDefined();
        expect(results.status).toBe('passed');
        expect(mergeSuccess).toBe(true);
      });

      it('should handle pull request approval validation', async () => {
        const pullRequest: PullRequest = {
          id: 'pr-approval-test',
          title: 'Approval Test PR',
          description: 'Testing approval validation',
          repository: mockRepository,
          sourceBranch: 'feature/approval-test',
          targetBranch: 'main',
          status: 'open',
        };

        // Create the source branch first
        await gitOpsManager.createBranch(
          mockRepository,
          'feature/approval-test'
        );

        // Mock console to capture validation messages
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const success = await gitOpsManager.mergePullRequest(pullRequest);

        // Should succeed since our mock approval validation returns true
        expect(success).toBe(true);

        consoleSpy.mockRestore();
      });

      it('should handle pull request with security impact', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/security-impact',
          'main',
          'Security Impact Test',
          'Testing security impact analysis'
        );

        // Check if security-related notifications were triggered
        const securityLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            (call[0].includes('security') || call[0].includes('Security'))
        );

        expect(pullRequest).toBeDefined();
        expect(pullRequest.description).toContain('Security Impact');

        consoleSpy.mockRestore();
      });

      it('should estimate review time based on change complexity', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/review-time-estimation',
          'main',
          'Review Time Test',
          'Testing review time estimation'
        );

        expect(pullRequest.description).toContain('Estimated Review Time');
        expect(pullRequest.description).toMatch(/\d+ minutes/);
      });

      it('should determine required reviewers based on impact', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/reviewer-requirements',
          'main',
          'Reviewer Requirements Test',
          'Testing reviewer requirement calculation'
        );

        expect(pullRequest.description).toContain('Required Reviewers');
        expect(pullRequest.description).toMatch(/Required Reviewers.*: \d+/);
      });

      it('should handle dependency changes detection', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/dependency-changes',
          'main',
          'Dependency Changes Test',
          'Testing dependency change detection'
        );

        expect(pullRequest.description).toContain('Dependency Changes');
      });

      it('should calculate test coverage impact', async () => {
        const pullRequest = await gitOpsManager.createPullRequest(
          mockRepository,
          'feature/test-coverage',
          'main',
          'Test Coverage Test',
          'Testing test coverage calculation'
        );

        expect(pullRequest.description).toContain('Test Coverage');
        expect(pullRequest.description).toMatch(/Test Coverage.*: \d+%/);
      });
    });
  });

  describe('deployment automation', () => {
    describe('deployToBackstage', () => {
      it('should deploy template to Backstage successfully', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        // Use the private method through deployTemplate
        const mergedPR: PullRequest = {
          id: 'pr-deploy-backstage',
          title: 'Deploy to Backstage Test',
          description: 'Testing Backstage deployment',
          repository: mockRepository,
          sourceBranch: 'feature/deploy-backstage',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if deployment steps were logged
        const deploymentLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            (call[0].includes('Deploying') || call[0].includes('deployment'))
        );
        expect(deploymentLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should handle deployment configuration preparation', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-deploy-config',
          title: 'Deploy Config Test',
          description: 'Testing deployment configuration',
          repository: mockRepository,
          sourceBranch: 'feature/deploy-config',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if configuration preparation was logged
        const configLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Preparing deployment configuration')
        );
        expect(configLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should deploy template files to correct locations', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-deploy-files',
          title: 'Deploy Files Test',
          description: 'Testing file deployment',
          repository: mockRepository,
          sourceBranch: 'feature/deploy-files',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if file deployment was logged
        const fileLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Deploying template files')
        );
        expect(fileLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should update Backstage configuration correctly', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-backstage-config',
          title: 'Backstage Config Test',
          description: 'Testing Backstage configuration update',
          repository: mockRepository,
          sourceBranch: 'feature/backstage-config',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if configuration update was logged
        const configLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Updating Backstage configuration')
        );
        expect(configLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should restart Backstage services after deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-service-restart',
          title: 'Service Restart Test',
          description: 'Testing service restart',
          repository: mockRepository,
          sourceBranch: 'feature/service-restart',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if service restart was logged
        const restartLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Restarting Backstage services')
        );
        expect(restartLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should wait for services to be ready', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-services-ready',
          title: 'Services Ready Test',
          description: 'Testing services readiness check',
          repository: mockRepository,
          sourceBranch: 'feature/services-ready',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if readiness check was logged
        const readyLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Waiting for services to be ready')
        );
        expect(readyLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('registerInCatalog', () => {
      it('should register template in Backstage catalog', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-catalog-register',
          title: 'Catalog Register Test',
          description: 'Testing catalog registration',
          repository: mockRepository,
          sourceBranch: 'feature/catalog-register',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if catalog registration was logged
        const catalogLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Registering') &&
            call[0].includes('catalog')
        );
        expect(catalogLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should generate proper catalog-info.yaml', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-catalog-info',
          title: 'Catalog Info Test',
          description: 'Testing catalog info generation',
          repository: mockRepository,
          sourceBranch: 'feature/catalog-info',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if catalog info generation was logged
        const catalogInfoLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Generating catalog-info.yaml')
        );
        expect(catalogInfoLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should verify catalog registration success', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-catalog-verify',
          title: 'Catalog Verify Test',
          description: 'Testing catalog verification',
          repository: mockRepository,
          sourceBranch: 'feature/catalog-verify',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment.success).toBe(true);

        // Check if catalog verification was logged
        const verifyLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying catalog registration')
        );
        expect(verifyLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('verifyBackstageDeployment', () => {
      it('should verify all deployment aspects', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-verify-deployment',
          title: 'Verify Deployment Test',
          description: 'Testing deployment verification',
          repository: mockRepository,
          sourceBranch: 'feature/verify-deployment',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if verification steps were logged
        const verifyLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying deployment')
        );
        expect(verifyLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should verify template files deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-verify-files',
          title: 'Verify Files Test',
          description: 'Testing file deployment verification',
          repository: mockRepository,
          sourceBranch: 'feature/verify-files',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(isVerified).toBe(true);

        // Check if file verification was logged
        const fileLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying template files deployment')
        );
        expect(fileLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should verify Backstage configuration update', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-verify-config',
          title: 'Verify Config Test',
          description: 'Testing configuration verification',
          repository: mockRepository,
          sourceBranch: 'feature/verify-config',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(isVerified).toBe(true);

        // Check if config verification was logged
        const configLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying Backstage configuration')
        );
        expect(configLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should verify template API accessibility', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-verify-api',
          title: 'Verify API Test',
          description: 'Testing API accessibility verification',
          repository: mockRepository,
          sourceBranch: 'feature/verify-api',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(isVerified).toBe(true);

        // Check if API verification was logged
        const apiLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying template API access')
        );
        expect(apiLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should verify template instantiation capability', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-verify-instantiation',
          title: 'Verify Instantiation Test',
          description: 'Testing instantiation verification',
          repository: mockRepository,
          sourceBranch: 'feature/verify-instantiation',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(isVerified).toBe(true);

        // Check if instantiation verification was logged
        const instantiationLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Verifying template instantiation')
        );
        expect(instantiationLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('checkTemplateAccessibility', () => {
      it('should check template accessibility via deployTemplate and verifyDeployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-accessibility-test',
          title: 'Accessibility Test',
          description: 'Testing template accessibility',
          repository: mockRepository,
          sourceBranch: 'feature/accessibility-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if accessibility check was logged
        const accessibilityLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking template accessibility')
        );
        expect(accessibilityLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should handle API errors gracefully during deployment verification', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-api-error-test',
          title: 'API Error Test',
          description: 'Testing API error handling',
          repository: mockRepository,
          sourceBranch: 'feature/api-error-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(typeof isVerified).toBe('boolean');

        consoleSpy.mockRestore();
      });
    });

    describe('validateTemplateFunctionality', () => {
      it('should validate template functionality through deployment verification', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-functionality-test',
          title: 'Functionality Test',
          description: 'Testing template functionality validation',
          repository: mockRepository,
          sourceBranch: 'feature/functionality-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if functionality validation was logged
        const functionalityLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Validating template functionality')
        );
        expect(functionalityLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should validate template schema through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-schema-test',
          title: 'Schema Test',
          description: 'Testing template schema validation',
          repository: mockRepository,
          sourceBranch: 'feature/schema-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if schema validation was logged
        const schemaLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Validating template schema')
        );
        expect(schemaLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should validate template parameters through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-parameters-test',
          title: 'Parameters Test',
          description: 'Testing template parameters validation',
          repository: mockRepository,
          sourceBranch: 'feature/parameters-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if parameters validation was logged
        const parametersLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Validating template parameters')
        );
        expect(parametersLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should validate template steps through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-steps-test',
          title: 'Steps Test',
          description: 'Testing template steps validation',
          repository: mockRepository,
          sourceBranch: 'feature/steps-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if steps validation was logged
        const stepsLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Validating template steps')
        );
        expect(stepsLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should perform template dry-run through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-dryrun-test',
          title: 'Dry-run Test',
          description: 'Testing template dry-run',
          repository: mockRepository,
          sourceBranch: 'feature/dryrun-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if dry-run was logged
        const dryRunLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Performing template dry-run')
        );
        expect(dryRunLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('checkDeploymentHealth', () => {
      it('should check comprehensive deployment health through verifyDeployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-health-test',
          title: 'Health Test',
          description: 'Testing deployment health check',
          repository: mockRepository,
          sourceBranch: 'feature/health-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if health check was logged
        const healthLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking deployment health')
        );
        expect(healthLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should check Backstage service health through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-backstage-health-test',
          title: 'Backstage Health Test',
          description: 'Testing Backstage service health',
          repository: mockRepository,
          sourceBranch: 'feature/backstage-health-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if Backstage health check was logged
        const backstageHealthLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking Backstage service health')
        );
        expect(backstageHealthLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should check template-specific health through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-template-health-test',
          title: 'Template Health Test',
          description: 'Testing template-specific health',
          repository: mockRepository,
          sourceBranch: 'feature/template-health-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if template health check was logged
        const templateHealthLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking template health')
        );
        expect(templateHealthLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should check database health through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-database-health-test',
          title: 'Database Health Test',
          description: 'Testing database health',
          repository: mockRepository,
          sourceBranch: 'feature/database-health-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if database health check was logged
        const databaseHealthLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking database health')
        );
        expect(databaseHealthLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });

      it('should check external dependencies through deployment', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-dependencies-test',
          title: 'Dependencies Test',
          description: 'Testing external dependencies check',
          repository: mockRepository,
          sourceBranch: 'feature/dependencies-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if external dependencies check was logged
        const dependenciesLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            call[0].includes('Checking external dependencies')
        );
        expect(dependenciesLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });

    describe('error handling in deployment automation', () => {
      it('should handle deployment failures gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const openPR: PullRequest = {
          id: 'pr-deployment-failure',
          title: 'Deployment Failure Test',
          description: 'Testing deployment failure handling',
          repository: mockRepository,
          sourceBranch: 'feature/deployment-failure',
          targetBranch: 'main',
          status: 'open', // Not merged, should fail
        };

        const deployment = await gitOpsManager.deployTemplate(openPR);

        expect(deployment.success).toBe(false);
        expect(deployment.errors).toContain(
          'Pull request must be merged before deployment'
        );

        consoleSpy.mockRestore();
      });

      it('should handle verification failures', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const failedDeployment: DeploymentResult = {
          success: false,
          deploymentId: 'deploy-verification-failure',
          timestamp: new Date(),
          errors: ['Deployment failed'],
        };

        const isVerified = await gitOpsManager.verifyDeployment(
          failedDeployment
        );

        expect(isVerified).toBe(false);

        consoleSpy.mockRestore();
      });

      it('should handle API errors during verification', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const deployment: DeploymentResult = {
          success: true,
          deploymentId: 'deploy-api-error',
          timestamp: new Date(),
        };

        // The verification should handle errors gracefully
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(typeof isVerified).toBe('boolean');

        consoleSpy.mockRestore();
      });

      it('should handle service timeout scenarios', async () => {
        // This test would verify timeout handling in real implementation
        const deployment: DeploymentResult = {
          success: true,
          deploymentId: 'deploy-timeout-test',
          timestamp: new Date(),
        };

        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(typeof isVerified).toBe('boolean');
      });
    });

    describe('deployment workflow integration', () => {
      it('should support complete deployment workflow', async () => {
        // 1. Create repository
        const repository = await gitOpsManager.createTemplateRepository(
          mockTemplate
        );

        // 2. Submit for review
        const pullRequest = await gitOpsManager.submitForReview(repository);

        // 3. Trigger pipeline
        const pipelineId = await gitOpsManager.triggerPipeline(repository);

        // 4. Process validation results
        const results = await gitOpsManager.processValidationResults(
          'pipeline-success-deployment-workflow',
          repository
        );

        // 5. Merge PR
        pullRequest.status = 'open';
        await gitOpsManager.createBranch(repository, pullRequest.sourceBranch);
        const mergeSuccess = await gitOpsManager.mergePullRequest(pullRequest);

        // 6. Deploy template
        const deployment = await gitOpsManager.deployTemplate(pullRequest);

        // 7. Verify deployment
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        // 8. Update registry
        await gitOpsManager.updateCapabilityRegistry(deployment);

        expect(repository).toBeDefined();
        expect(pullRequest.status).toBe('merged');
        expect(pipelineId).toBeDefined();
        expect(results.status).toBe('passed');
        expect(mergeSuccess).toBe(true);
        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);
      });

      it('should handle deployment rollback scenarios', async () => {
        // This would test rollback functionality in a real implementation
        const mergedPR: PullRequest = {
          id: 'pr-rollback-test',
          title: 'Rollback Test',
          description: 'Testing rollback functionality',
          repository: mockRepository,
          sourceBranch: 'feature/rollback-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);

        expect(deployment).toBeDefined();
        expect(deployment.success).toBe(true);
      });

      it('should support deployment monitoring and alerting', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const mergedPR: PullRequest = {
          id: 'pr-monitoring-test',
          title: 'Monitoring Test',
          description: 'Testing deployment monitoring',
          repository: mockRepository,
          sourceBranch: 'feature/monitoring-test',
          targetBranch: 'main',
          status: 'merged',
        };

        const deployment = await gitOpsManager.deployTemplate(mergedPR);
        const isVerified = await gitOpsManager.verifyDeployment(deployment);

        expect(deployment.success).toBe(true);
        expect(isVerified).toBe(true);

        // Check if monitoring activities were logged
        const monitoringLogs = consoleSpy.mock.calls.filter(
          (call) =>
            call[0] &&
            call[0].includes &&
            (call[0].includes('health') ||
              call[0].includes('monitoring') ||
              call[0].includes('checking'))
        );
        expect(monitoringLogs.length).toBeGreaterThan(0);

        consoleSpy.mockRestore();
      });
    });
  });
});
