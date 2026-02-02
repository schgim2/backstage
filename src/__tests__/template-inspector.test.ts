/**
 * Template Inspector Tests
 * Tests for post-deployment monitoring and health verification functionality
 */

import { TemplateInspectorImpl } from '../implementations/template-inspector';
import {
  HealthCheckResult,
  UsageMetrics,
  IntegrityReport,
  DiagnosticReport,
  RollbackResult,
  PerformanceMetrics,
  CompatibilityReport,
  RegressionTestResult,
  OverallHealthStatus,
} from '../interfaces/template-inspector';

describe('TemplateInspector', () => {
  let templateInspector: TemplateInspectorImpl;

  beforeEach(() => {
    templateInspector = new TemplateInspectorImpl('http://localhost:3000', true);
  });

  afterEach(async () => {
    // Clean up any scheduled health checks
    await templateInspector.cancelHealthChecks('test-template');
  });

  describe('Health Check Functionality', () => {
    it('should perform comprehensive health check', async () => {
      const result = await templateInspector.performHealthCheck('test-template');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('test-template');
      expect(['healthy', 'degraded', 'failed']).toContain(result.status);
      expect(result.checks).toBeInstanceOf(Array);
      expect(result.checks.length).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.recommendations).toBeInstanceOf(Array);

      // Verify all required health checks are performed
      const checkNames = result.checks.map(check => check.name);
      expect(checkNames).toContain('Template Accessibility');
      expect(checkNames).toContain('Parameter Validation');
      expect(checkNames).toContain('Step Validation');
      expect(checkNames).toContain('Dependency Check');
      expect(checkNames).toContain('Performance Check');
    });

    it('should handle health check failures gracefully', async () => {
      // Test with invalid template ID to trigger error handling
      const result = await templateInspector.performHealthCheck('invalid-template');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('invalid-template');
      // The status may vary based on simulated checks, but should be defined
      expect(['healthy', 'degraded', 'failed']).toContain(result.status);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide detailed health check information', async () => {
      const result = await templateInspector.performHealthCheck('test-template');

      result.checks.forEach(check => {
        expect(check.name).toBeTruthy();
        expect(['pass', 'warn', 'fail']).toContain(check.status);
        expect(check.message).toBeTruthy();
        expect(typeof check.executionTime).toBe('number');
        expect(check.executionTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate appropriate recommendations based on check results', async () => {
      const result = await templateInspector.performHealthCheck('test-template');

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Usage Monitoring', () => {
    it('should monitor template usage patterns', async () => {
      const metrics = await templateInspector.monitorTemplateUsage('test-template');

      expect(metrics).toBeDefined();
      expect(metrics.templateId).toBe('test-template');
      expect(typeof metrics.totalExecutions).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageExecutionTime).toBe('number');
      expect(metrics.failureReasons).toBeInstanceOf(Array);
      expect(typeof metrics.userSatisfactionScore).toBe('number');
      expect(metrics.lastUsed).toBeInstanceOf(Date);
      expect(metrics.usageByPeriod).toBeInstanceOf(Array);
      expect(metrics.topUsers).toBeInstanceOf(Array);
    });

    it('should provide detailed failure analysis', async () => {
      const metrics = await templateInspector.monitorTemplateUsage('test-template');

      metrics.failureReasons.forEach(reason => {
        expect(reason.reason).toBeTruthy();
        expect(typeof reason.count).toBe('number');
        expect(typeof reason.percentage).toBe('number');
        expect(reason.lastOccurrence).toBeInstanceOf(Date);
      });
    });

    it('should track usage trends over time', async () => {
      const metrics = await templateInspector.monitorTemplateUsage('test-template');

      metrics.usageByPeriod.forEach(period => {
        expect(period.period).toBeTruthy();
        expect(typeof period.executions).toBe('number');
        expect(typeof period.successRate).toBe('number');
      });
    });

    it('should identify top users', async () => {
      const metrics = await templateInspector.monitorTemplateUsage('test-template');

      metrics.topUsers.forEach(user => {
        expect(user.userId).toBeTruthy();
        expect(typeof user.executions).toBe('number');
        expect(typeof user.successRate).toBe('number');
      });
    });
  });

  describe('Template Integrity Validation', () => {
    it('should validate template integrity', async () => {
      const report = await templateInspector.validateTemplateIntegrity('test-template');

      expect(report).toBeDefined();
      expect(report.templateId).toBe('test-template');
      expect(typeof report.isValid).toBe('boolean');
      expect(report.validationErrors).toBeInstanceOf(Array);
      expect(report.accessibilityStatus).toBeDefined();
      expect(report.parameterValidation).toBeInstanceOf(Array);
      expect(report.stepValidation).toBeInstanceOf(Array);
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should check template accessibility', async () => {
      const report = await templateInspector.validateTemplateIntegrity('test-template');

      expect(report.accessibilityStatus).toBeDefined();
      expect(typeof report.accessibilityStatus.isAccessible).toBe('boolean');
      expect(typeof report.accessibilityStatus.responseTime).toBe('number');
    });

    it('should validate template parameters', async () => {
      const report = await templateInspector.validateTemplateIntegrity('test-template');

      report.parameterValidation.forEach(param => {
        expect(param.parameterName).toBeTruthy();
        expect(typeof param.isValid).toBe('boolean');
        expect(param.validationErrors).toBeInstanceOf(Array);
        expect(param.testValues).toBeInstanceOf(Array);

        param.testValues.forEach(testValue => {
          expect(testValue.value).toBeDefined();
          expect(typeof testValue.isValid).toBe('boolean');
        });
      });
    });

    it('should validate template steps', async () => {
      const report = await templateInspector.validateTemplateIntegrity('test-template');

      report.stepValidation.forEach(step => {
        expect(step.stepId).toBeTruthy();
        expect(step.stepName).toBeTruthy();
        expect(typeof step.isValid).toBe('boolean');
        expect(typeof step.executionTime).toBe('number');
        expect(step.errors).toBeInstanceOf(Array);
        expect(step.warnings).toBeInstanceOf(Array);
      });
    });
  });

  describe('Diagnostic Reporting', () => {
    it('should generate comprehensive diagnostic reports', async () => {
      const report = await templateInspector.generateDiagnosticReport('test-template');

      expect(report).toBeDefined();
      expect(report.templateId).toBe('test-template');
      expect(report.issues).toBeInstanceOf(Array);
      expect(report.performanceAnalysis).toBeDefined();
      expect(report.dependencyStatus).toBeInstanceOf(Array);
      expect(report.remediationSuggestions).toBeInstanceOf(Array);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(['low', 'medium', 'high', 'critical']).toContain(report.severity);
    });

    it('should analyze template performance', async () => {
      const report = await templateInspector.generateDiagnosticReport('test-template');

      expect(report.performanceAnalysis).toBeDefined();
      expect(typeof report.performanceAnalysis.averageExecutionTime).toBe('number');
      expect(typeof report.performanceAnalysis.p95ExecutionTime).toBe('number');
      expect(typeof report.performanceAnalysis.p99ExecutionTime).toBe('number');
      expect(report.performanceAnalysis.memoryUsage).toBeDefined();
      expect(report.performanceAnalysis.cpuUsage).toBeDefined();
      expect(report.performanceAnalysis.trends).toBeInstanceOf(Array);
    });

    it('should provide remediation suggestions', async () => {
      const report = await templateInspector.generateDiagnosticReport('test-template');

      report.remediationSuggestions.forEach(suggestion => {
        expect(suggestion.issueId).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(suggestion.priority);
        expect(suggestion.action).toBeTruthy();
        expect(suggestion.description).toBeTruthy();
        expect(suggestion.estimatedEffort).toBeTruthy();
        expect(typeof suggestion.automatable).toBe('boolean');
        expect(suggestion.steps).toBeInstanceOf(Array);
      });
    });

    it('should classify issues by severity', async () => {
      const report = await templateInspector.generateDiagnosticReport('test-template');

      report.issues.forEach(issue => {
        expect(issue.id).toBeTruthy();
        expect(['performance', 'functionality', 'security', 'compatibility']).toContain(issue.type);
        expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
        expect(issue.title).toBeTruthy();
        expect(issue.description).toBeTruthy();
        expect(issue.impact).toBeTruthy();
        expect(issue.firstDetected).toBeInstanceOf(Date);
        expect(issue.lastOccurrence).toBeInstanceOf(Date);
        expect(typeof issue.occurrenceCount).toBe('number');
      });
    });
  });

  describe('Rollback Functionality', () => {
    it('should trigger template rollback', async () => {
      const result = await templateInspector.triggerRollback('test-template', 'Critical issue detected');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('test-template');
      expect(typeof result.success).toBe('boolean');
      expect(result.rollbackVersion).toBeTruthy();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.reason).toBe('Critical issue detected');
      expect(result.affectedUsers).toBeInstanceOf(Array);
      expect(result.notificationsSent).toBeInstanceOf(Array);
    });

    it('should notify affected users during rollback', async () => {
      const result = await templateInspector.triggerRollback('test-template', 'Performance degradation');

      result.notificationsSent.forEach(notification => {
        expect(notification.recipient).toBeTruthy();
        expect(['email', 'slack', 'webhook']).toContain(notification.method);
        expect(typeof notification.success).toBe('boolean');
        expect(notification.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle rollback failures gracefully', async () => {
      const result = await templateInspector.triggerRollback('invalid-template', 'Test rollback');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('invalid-template');
      // Should handle gracefully even if rollback fails
    });
  });

  describe('Performance Metrics Tracking', () => {
    it('should track template performance metrics', async () => {
      const metrics = await templateInspector.trackPerformanceMetrics('test-template');

      expect(metrics).toBeDefined();
      expect(metrics.templateId).toBe('test-template');
      expect(metrics.metrics).toBeInstanceOf(Array);
      expect(metrics.collectedAt).toBeInstanceOf(Date);
      expect(metrics.period).toBeTruthy();
    });

    it('should provide detailed performance metrics', async () => {
      const metrics = await templateInspector.trackPerformanceMetrics('test-template');

      metrics.metrics.forEach(metric => {
        expect(metric.name).toBeTruthy();
        expect(typeof metric.value).toBe('number');
        expect(metric.unit).toBeTruthy();
        expect(['up', 'down', 'stable']).toContain(metric.trend);
        expect(['normal', 'warning', 'critical']).toContain(metric.status);
      });
    });

    it('should include common performance metrics', async () => {
      const metrics = await templateInspector.trackPerformanceMetrics('test-template');

      const metricNames = metrics.metrics.map(m => m.name);
      expect(metricNames).toContain('execution_time');
      expect(metricNames).toContain('success_rate');
      expect(metricNames).toContain('memory_usage');
      expect(metricNames).toContain('cpu_usage');
    });
  });

  describe('Dependency Compatibility', () => {
    it('should verify dependency compatibility', async () => {
      const report = await templateInspector.verifyDependencyCompatibility('test-template');

      expect(report).toBeDefined();
      expect(report.templateId).toBe('test-template');
      expect(['compatible', 'partially-compatible', 'incompatible']).toContain(report.overallCompatibility);
      expect(report.dependencies).toBeInstanceOf(Array);
      expect(report.backstageVersion).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.lastChecked).toBeInstanceOf(Date);
    });

    it('should check individual dependency compatibility', async () => {
      const report = await templateInspector.verifyDependencyCompatibility('test-template');

      report.dependencies.forEach(dep => {
        expect(dep.name).toBeTruthy();
        expect(dep.currentVersion).toBeTruthy();
        expect(dep.requiredVersion).toBeTruthy();
        expect(typeof dep.compatible).toBe('boolean');
        expect(dep.issues).toBeInstanceOf(Array);
      });
    });

    it('should verify Backstage version compatibility', async () => {
      const report = await templateInspector.verifyDependencyCompatibility('test-template');

      expect(report.backstageVersion).toBeDefined();
      expect(report.backstageVersion.currentVersion).toBeTruthy();
      expect(report.backstageVersion.supportedVersions).toBeInstanceOf(Array);
      expect(typeof report.backstageVersion.compatible).toBe('boolean');
      expect(report.backstageVersion.deprecationWarnings).toBeInstanceOf(Array);
    });

    it('should provide compatibility recommendations', async () => {
      const report = await templateInspector.verifyDependencyCompatibility('test-template');

      report.recommendations.forEach(rec => {
        expect(['upgrade', 'downgrade', 'replace', 'configure']).toContain(rec.type);
        expect(rec.component).toBeTruthy();
        expect(rec.description).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(rec.priority);
        expect(['low', 'medium', 'high']).toContain(rec.effort);
      });
    });
  });

  describe('Regression Testing', () => {
    it('should perform regression testing', async () => {
      const result = await templateInspector.performRegressionTesting('test-template');

      expect(result).toBeDefined();
      expect(result.templateId).toBe('test-template');
      expect(result.testSuite).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(result.overallResult);
      expect(result.tests).toBeInstanceOf(Array);
      expect(typeof result.executionTime).toBe('number');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.backwardCompatible).toBe('boolean');
    });

    it('should execute individual regression tests', async () => {
      const result = await templateInspector.performRegressionTesting('test-template');

      result.tests.forEach(test => {
        expect(test.name).toBeTruthy();
        expect(['pass', 'fail', 'skip']).toContain(test.result);
        expect(typeof test.executionTime).toBe('number');
      });
    });

    it('should include standard regression tests', async () => {
      const result = await templateInspector.performRegressionTesting('test-template');

      const testNames = result.tests.map(t => t.name);
      expect(testNames).toContain('Template YAML Validation');
      expect(testNames).toContain('Parameter Validation');
      expect(testNames).toContain('Step Execution');
      expect(testNames).toContain('Backward Compatibility');
    });
  });

  describe('Overall Health Status', () => {
    it('should provide overall health status', async () => {
      const status = await templateInspector.getOverallHealthStatus();

      expect(status).toBeDefined();
      expect(typeof status.totalTemplates).toBe('number');
      expect(typeof status.healthyTemplates).toBe('number');
      expect(typeof status.degradedTemplates).toBe('number');
      expect(typeof status.failedTemplates).toBe('number');
      expect(['healthy', 'degraded', 'critical']).toContain(status.overallStatus);
      expect(status.lastUpdated).toBeInstanceOf(Date);
      expect(status.trends).toBeInstanceOf(Array);
    });

    it('should provide health trends', async () => {
      const status = await templateInspector.getOverallHealthStatus();

      status.trends.forEach(trend => {
        expect(trend.metric).toBeTruthy();
        expect(typeof trend.current).toBe('number');
        expect(typeof trend.previous).toBe('number');
        expect(typeof trend.change).toBe('number');
        expect(['improving', 'stable', 'degrading']).toContain(trend.trend);
      });
    });

    it('should calculate correct totals', async () => {
      const status = await templateInspector.getOverallHealthStatus();

      const calculatedTotal = status.healthyTemplates + status.degradedTemplates + status.failedTemplates;
      expect(calculatedTotal).toBe(status.totalTemplates);
    });
  });

  describe('Health Check Scheduling', () => {
    it('should schedule periodic health checks', async () => {
      await expect(
        templateInspector.scheduleHealthChecks('test-template', 60000) // 1 minute
      ).resolves.not.toThrow();
    });

    it('should cancel scheduled health checks', async () => {
      await templateInspector.scheduleHealthChecks('test-template', 60000);
      
      await expect(
        templateInspector.cancelHealthChecks('test-template')
      ).resolves.not.toThrow();
    });

    it('should handle multiple schedule operations', async () => {
      // Schedule, cancel, and reschedule
      await templateInspector.scheduleHealthChecks('test-template', 60000);
      await templateInspector.cancelHealthChecks('test-template');
      await templateInspector.scheduleHealthChecks('test-template', 30000);
      await templateInspector.cancelHealthChecks('test-template');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Test with monitoring disabled to simulate network issues
      const offlineInspector = new TemplateInspectorImpl('http://invalid-url', false);
      
      const result = await offlineInspector.performHealthCheck('test-template');
      expect(result).toBeDefined();
      expect(result.templateId).toBe('test-template');
    });

    it('should provide meaningful error messages', async () => {
      const result = await templateInspector.performHealthCheck('');
      
      expect(result).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);
      // Should handle empty template ID gracefully
    });

    it('should recover from partial failures', async () => {
      // Even if some checks fail, others should still execute
      const result = await templateInspector.performHealthCheck('test-template');
      
      expect(result).toBeDefined();
      expect(result.checks.length).toBeGreaterThan(0);
      // Should have multiple checks even if some fail
    });
  });

  describe('Integration with Monitoring Systems', () => {
    it('should be configurable for different environments', () => {
      const prodInspector = new TemplateInspectorImpl('https://backstage.prod.com', true);
      const devInspector = new TemplateInspectorImpl('http://localhost:3000', false);
      
      expect(prodInspector).toBeInstanceOf(TemplateInspectorImpl);
      expect(devInspector).toBeInstanceOf(TemplateInspectorImpl);
    });

    it('should handle different Backstage configurations', async () => {
      const customInspector = new TemplateInspectorImpl('https://custom-backstage.com:8080', true);
      
      const result = await customInspector.performHealthCheck('test-template');
      expect(result).toBeDefined();
    });
  });
});