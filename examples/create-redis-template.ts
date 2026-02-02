/**
 * Simple Redis Cluster Template Creation
 */

import { BackstageTemplateGenerator } from '../src/index';

async function createRedisTemplate() {
  console.log('🚀 Creating Redis Cluster Template...');

  const generator = new BackstageTemplateGenerator({
    features: {
      enablePreview: true,
      enableInteractiveCompletion: false,
      enableMaturityAssessment: true,
      enableGitOpsWorkflow: false, // 로컬에서만 생성
    },
    errorHandling: {
      logLevel: 'info',
    },
  });

  try {
    const result = await generator.generateFromIntent(
      "Redis 클러스터를 컨테이너로 배포하는 템플릿을 만들어줘. Docker Compose와 Kubernetes 배포 옵션을 포함해야 해.",
      {
        interactive: false,
        preview: true,
        deploy: false, // 로컬에서만 생성
        maturityAssessment: true,
      }
    );

    console.log('✅ Template generated successfully!');
    console.log(`Template ID: ${result.template.metadata.id}`);
    console.log(`Template Name: ${result.template.metadata.name}`);
    
    // 생성된 YAML 출력
    console.log('\n📄 Generated Backstage Template:');
    console.log('='.repeat(80));
    console.log(result.template.yaml);
    console.log('='.repeat(80));

    // 파일 구조 출력
    if (result.preview) {
      console.log('\n📁 File Structure:');
      result.preview.fileStructure.forEach((file: string) => {
        console.log(`  ${file}`);
      });
    }

    return result;
  } catch (error) {
    console.error('❌ Failed to create template:', error);
    throw error;
  }
}

// 실행
createRedisTemplate().catch(console.error);