/**
 * Example: Creating a Redis Cluster Container Deployment Template
 * Using the Backstage Template Generator
 */

import { BackstageTemplateGenerator } from '../src/index';

async function createRedisClusterTemplate() {
  console.log('🚀 Creating Redis Cluster Container Deployment Template...');

  // Initialize the template generator
  const generator = new BackstageTemplateGenerator({
    gitProvider: 'github',
    gitConfig: {
      baseUrl: 'https://github.com',
      organization: 'my-org',
      token: process.env.GITHUB_TOKEN,
    },
    backstageConfig: {
      baseUrl: 'http://localhost:3000',
      token: process.env.BACKSTAGE_TOKEN,
    },
    features: {
      enablePreview: true,
      enableInteractiveCompletion: true,
      enableMaturityAssessment: true,
      enableGitOpsWorkflow: true,
    },
    errorHandling: {
      logLevel: 'info',
      enableRollback: true,
      enableRecovery: true,
    },
  });

  try {
    // Generate template from natural language intent
    const result = await generator.generateFromIntent(
      `Redis 클러스터를 컨테이너로 배포하는 템플릿을 만들어줘. 
       다음 요구사항을 포함해야 해:
       - Docker Compose를 사용한 Redis 클러스터 구성
       - 마스터-슬레이브 복제 설정
       - 센티넬을 통한 고가용성 구성
       - 모니터링 및 로깅 설정
       - Kubernetes 배포 옵션
       - 환경별 설정 관리 (dev, staging, prod)
       - 보안 설정 (인증, 네트워크 격리)
       - 백업 및 복구 스크립트
       - 성능 튜닝 가이드`,
      {
        interactive: false, // 자동으로 생성
        preview: true,
        deploy: true,
        maturityAssessment: true,
      }
    );

    console.log('✅ Template generation completed!');
    console.log('\n📋 Generated Template Details:');
    console.log(`- Template ID: ${result.template.metadata.id}`);
    console.log(`- Template Name: ${result.template.metadata.name}`);
    console.log(`- Maturity Level: ${result.template.metadata.maturityLevel}`);
    console.log(`- Phase: ${result.template.metadata.phase}`);

    if (result.preview) {
      console.log('\n👀 Template Preview:');
      console.log(`- Validation Status: ${result.preview.validationResults.isValid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`- Estimated Files: ${result.preview.fileStructure.length}`);
      console.log('- Key Files:');
      result.preview.fileStructure.slice(0, 10).forEach((file: string) => {
        console.log(`  • ${file}`);
      });
    }

    if (result.maturityAssessment) {
      console.log('\n📊 Maturity Assessment:');
      console.log(`- Current Level: ${result.maturityAssessment.currentLevel}`);
      console.log(`- Next Level: ${result.maturityAssessment.nextLevel || 'N/A'}`);
      console.log(`- Readiness Score: ${result.maturityAssessment.readinessScore}/100`);
      console.log('- Recommendations:');
      result.maturityAssessment.recommendations.slice(0, 3).forEach((rec: any) => {
        console.log(`  • ${rec.description}`);
      });
    }

    if (result.deploymentResult) {
      console.log('\n🚀 Deployment Results:');
      console.log(`- Repository: ${result.deploymentResult.repository.name}`);
      console.log(`- Pull Request: #${result.deploymentResult.pullRequest.id}`);
      console.log(`- Deployment Status: ${result.deploymentResult.deployment.success ? '✅ Success' : '❌ Failed'}`);
    }

    // Perform comprehensive template inspection
    console.log('\n🔍 Performing template inspection...');
    const inspection = await generator.inspectTemplate(result.template.metadata.id);
    
    console.log('\n📈 Health Status:');
    console.log(`- Overall Status: ${inspection.health.status}`);
    console.log(`- Health Checks: ${inspection.health.checks.filter((c: any) => c.status === 'pass').length}/${inspection.health.checks.length} passed`);

    console.log('\n⚡ Performance Metrics:');
    console.log(`- Average Execution Time: ${inspection.performance.averageExecutionTime}ms`);
    console.log(`- Success Rate: ${inspection.performance.successRate}%`);

    // Schedule monitoring for the template
    console.log('\n⏰ Scheduling health monitoring...');
    await generator.scheduleTemplateMonitoring(result.template.metadata.id, 30); // Every 30 minutes
    console.log('✅ Health monitoring scheduled');

    // Display the generated YAML template
    console.log('\n📄 Generated Backstage Template YAML:');
    console.log('='.repeat(80));
    console.log(result.template.yaml);
    console.log('='.repeat(80));

    return result;

  } catch (error) {
    console.error('❌ Template generation failed:', error);
    throw error;
  }
}

// Example of using the generated template programmatically
async function demonstrateTemplateUsage() {
  console.log('\n🎯 Demonstrating template usage...');

  const generator = new BackstageTemplateGenerator();

  try {
    // Discover existing Redis-related templates
    const existingTemplates = await generator.discoverTemplates({
      searchTerm: 'redis',
      tags: ['database', 'cache', 'cluster'],
    });

    console.log(`\n📚 Found ${existingTemplates.length} existing Redis-related templates:`);
    existingTemplates.forEach(template => {
      console.log(`- ${template.name}: ${template.description}`);
    });

    // Get recommendations for Redis cluster improvements
    if (existingTemplates.length > 0) {
      const recommendations = await generator.getRecommendations(existingTemplates[0].id);
      console.log('\n💡 Improvement Recommendations:');
      recommendations.forEach(rec => {
        console.log(`- ${rec}`);
      });
    }

    // Check overall system health
    const systemHealth = await generator.getSystemHealthStatus();
    console.log('\n🏥 System Health Status:');
    console.log(`- Overall Status: ${systemHealth.overallStatus}`);
    console.log(`- Healthy Templates: ${systemHealth.healthyTemplates}/${systemHealth.totalTemplates}`);

  } catch (error) {
    console.error('❌ Template usage demonstration failed:', error);
  }
}

// Main execution
async function main() {
  try {
    console.log('🎉 Starting Redis Cluster Template Generation Example\n');
    
    // Create the Redis cluster template
    const result = await createRedisClusterTemplate();
    
    // Demonstrate template usage
    await demonstrateTemplateUsage();
    
    console.log('\n🎊 Example completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Check the generated template in your Backstage instance');
    console.log('2. Use the template to create new Redis cluster deployments');
    console.log('3. Monitor template health and usage metrics');
    console.log('4. Iterate and improve based on feedback');

  } catch (error) {
    console.error('\n💥 Example failed:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { createRedisClusterTemplate, demonstrateTemplateUsage };