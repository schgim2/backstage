/**
 * Maturity Assessment Engine
 * Evaluates and manages capability maturity levels (L1-L5)
 */

import {
  CapabilityMaturity,
  DevelopmentPhase,
  TemplateSpec,
  Capability,
  Improvement,
} from '../types/core';

export interface MaturityAssessment {
  currentLevel: CapabilityMaturity;
  nextLevel?: CapabilityMaturity;
  readinessScore: number; // 0-100
  blockers: MaturityBlocker[];
  recommendations: MaturityRecommendation[];
  progressionPath: ProgressionStep[];
}

export interface MaturityBlocker {
  category: 'technical' | 'organizational' | 'process' | 'governance';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: string;
}

export interface MaturityRecommendation {
  type: 'immediate' | 'short_term' | 'long_term';
  priority: 'low' | 'medium' | 'high';
  description: string;
  effort: 'small' | 'medium' | 'large';
  impact: 'low' | 'medium' | 'high';
}

export interface ProgressionStep {
  fromLevel: CapabilityMaturity;
  toLevel: CapabilityMaturity;
  requirements: string[];
  estimatedEffort: 'weeks' | 'months' | 'quarters';
  prerequisites: string[];
}

export interface MaturityCriteria {
  level: CapabilityMaturity;
  phase: DevelopmentPhase;
  requiredCapabilities: string[];
  technicalRequirements: string[];
  processRequirements: string[];
  governanceRequirements: string[];
}

export class MaturityManager {
  private readonly maturityCriteria: MaturityCriteria[] = [
    {
      level: CapabilityMaturity.L1_GENERATION,
      phase: DevelopmentPhase.FOUNDATION,
      requiredCapabilities: [
        'Basic code generation',
        'Template scaffolding',
        'File structure creation',
      ],
      technicalRequirements: [
        'Template YAML configuration',
        'Basic parameter handling',
        'File generation logic',
      ],
      processRequirements: ['Manual template creation', 'Basic documentation'],
      governanceRequirements: [
        'Basic naming conventions',
        'Simple validation rules',
      ],
    },
    {
      level: CapabilityMaturity.L2_DEPLOYMENT,
      phase: DevelopmentPhase.STANDARDIZATION,
      requiredCapabilities: [
        'Automated deployment',
        'Environment management',
        'CI/CD integration',
      ],
      technicalRequirements: [
        'Deployment automation',
        'Environment configuration',
        'Pipeline integration',
        'Artifact management',
      ],
      processRequirements: [
        'Automated testing',
        'Deployment procedures',
        'Environment promotion',
      ],
      governanceRequirements: [
        'Deployment policies',
        'Environment controls',
        'Change management',
      ],
    },
    {
      level: CapabilityMaturity.L3_OPERATIONS,
      phase: DevelopmentPhase.OPERATIONALIZATION,
      requiredCapabilities: [
        'Operational automation',
        'Monitoring and alerting',
        'Scaling capabilities',
      ],
      technicalRequirements: [
        'Monitoring integration',
        'Auto-scaling configuration',
        'Operational dashboards',
        'Log aggregation',
      ],
      processRequirements: [
        'Operational runbooks',
        'Incident response',
        'Capacity planning',
        'Performance monitoring',
      ],
      governanceRequirements: [
        'SLA definitions',
        'Operational policies',
        'Resource governance',
      ],
    },
    {
      level: CapabilityMaturity.L4_GOVERNANCE,
      phase: DevelopmentPhase.GOVERNANCE,
      requiredCapabilities: [
        'Policy enforcement',
        'Compliance automation',
        'Risk management',
      ],
      technicalRequirements: [
        'Policy engines',
        'Compliance scanning',
        'Audit logging',
        'Risk assessment tools',
      ],
      processRequirements: [
        'Governance workflows',
        'Compliance reporting',
        'Risk assessment procedures',
        'Audit processes',
      ],
      governanceRequirements: [
        'Comprehensive policies',
        'Regulatory compliance',
        'Security frameworks',
        'Data governance',
      ],
    },
    {
      level: CapabilityMaturity.L5_INTENT_DRIVEN,
      phase: DevelopmentPhase.INTENT_DRIVEN,
      requiredCapabilities: [
        'Intent-based automation',
        'Adaptive systems',
        'Self-optimization',
      ],
      technicalRequirements: [
        'AI/ML integration',
        'Intent processing',
        'Adaptive algorithms',
        'Feedback loops',
      ],
      processRequirements: [
        'Intent-driven workflows',
        'Continuous optimization',
        'Adaptive processes',
        'Learning systems',
      ],
      governanceRequirements: [
        'AI governance',
        'Ethical AI policies',
        'Automated compliance',
        'Intelligent risk management',
      ],
    },
  ];

  /**
   * Assess the current maturity level of a capability
   */
  async assessMaturity(capability: Capability): Promise<MaturityAssessment> {
    const currentLevel = this.determineCurrentLevel(capability);
    const nextLevel = this.getNextLevel(currentLevel);
    const readinessScore = await this.calculateReadinessScore(
      capability,
      nextLevel
    );
    const blockers = await this.identifyBlockers(capability, nextLevel);
    const recommendations = await this.generateRecommendations(
      capability,
      nextLevel
    );
    const progressionPath = await this.generateProgressionPath(currentLevel);

    return {
      currentLevel,
      nextLevel,
      readinessScore,
      blockers,
      recommendations,
      progressionPath,
    };
  }

  /**
   * Assess maturity based on template specification
   */
  async assessTemplateMaturity(
    spec: TemplateSpec
  ): Promise<MaturityAssessment> {
    const capability = this.templateSpecToCapability(spec);
    return this.assessMaturity(capability);
  }

  /**
   * Suggest improvements to advance maturity level
   */
  async suggestImprovements(
    capability: Capability,
    targetLevel?: CapabilityMaturity
  ): Promise<Improvement[]> {
    const assessment = await this.assessMaturity(capability);
    const target =
      targetLevel || assessment.nextLevel || capability.maturityLevel;

    const improvements: Improvement[] = [];

    // Add improvements based on blockers
    assessment.blockers.forEach((blocker) => {
      improvements.push({
        type: this.mapBlockerToImprovementType(blocker.category),
        description: blocker.resolution,
        priority: this.mapSeverityToPriority(blocker.severity),
        effort: this.estimateEffort(blocker.category, blocker.severity),
      });
    });

    // Add improvements from recommendations
    assessment.recommendations.forEach((rec) => {
      improvements.push({
        type: this.mapRecommendationType(rec.type),
        description: rec.description,
        priority: rec.priority,
        effort: rec.effort,
      });
    });

    // Add target-specific improvements
    const targetCriteria = this.maturityCriteria.find(
      (c) => c.level === target
    );
    if (targetCriteria) {
      const missingCapabilities = this.findMissingCapabilities(
        capability,
        targetCriteria
      );
      missingCapabilities.forEach((missing) => {
        improvements.push({
          type: 'maturity',
          description: `Implement ${missing} to reach ${target}`,
          priority: 'high',
          effort: 'medium',
        });
      });
    }

    return improvements.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate a roadmap for capability progression
   */
  async generateProgressionRoadmap(
    currentLevel: CapabilityMaturity,
    targetLevel: CapabilityMaturity
  ): Promise<ProgressionStep[]> {
    const roadmap: ProgressionStep[] = [];
    let level = currentLevel;

    while (level !== targetLevel) {
      const nextLevel = this.getNextLevel(level);
      if (!nextLevel) break;

      const step = await this.generateProgressionStep(level, nextLevel);
      roadmap.push(step);
      level = nextLevel;
    }

    return roadmap;
  }

  /**
   * Check if a capability is ready for progression
   */
  async isReadyForProgression(
    capability: Capability,
    targetLevel?: CapabilityMaturity
  ): Promise<boolean> {
    const assessment = await this.assessMaturity(capability);
    const target = targetLevel || assessment.nextLevel;

    if (!target) return false;

    // Check readiness score threshold
    if (assessment.readinessScore < 80) return false;

    // Check for critical blockers
    const criticalBlockers = assessment.blockers.filter(
      (b) => b.severity === 'critical'
    );
    if (criticalBlockers.length > 0) return false;

    return true;
  }

  /**
   * Get recommended next steps for capability improvement
   */
  async getNextSteps(capability: Capability): Promise<string[]> {
    const assessment = await this.assessMaturity(capability);
    const nextSteps: string[] = [];

    // Address critical blockers first
    const criticalBlockers = assessment.blockers.filter(
      (b) => b.severity === 'critical'
    );
    criticalBlockers.forEach((blocker) => {
      nextSteps.push(`CRITICAL: ${blocker.resolution}`);
    });

    // Add high-priority recommendations
    const highPriorityRecs = assessment.recommendations.filter(
      (r) => r.priority === 'high'
    );
    highPriorityRecs.slice(0, 3).forEach((rec) => {
      nextSteps.push(rec.description);
    });

    // If no critical issues, suggest progression steps
    if (criticalBlockers.length === 0 && assessment.nextLevel) {
      const progressionStep = assessment.progressionPath.find(
        (step) => step.fromLevel === capability.maturityLevel
      );
      if (progressionStep) {
        progressionStep.requirements.slice(0, 2).forEach((req) => {
          nextSteps.push(`Progress to ${assessment.nextLevel}: ${req}`);
        });
      }
    }

    return nextSteps.slice(0, 5); // Limit to top 5 next steps
  }

  /**
   * Private helper methods
   */
  private determineCurrentLevel(capability: Capability): CapabilityMaturity {
    // Start with the capability's declared maturity level
    let level = capability.maturityLevel;

    // Validate against actual capabilities
    const criteria = this.maturityCriteria.find((c) => c.level === level);
    if (!criteria) return CapabilityMaturity.L1_GENERATION;

    // Check if capability meets the requirements for its declared level
    const hasRequiredCapabilities = this.hasRequiredCapabilities(
      capability,
      criteria
    );
    if (!hasRequiredCapabilities) {
      // Downgrade to the highest level they actually meet
      level = this.findHighestAchievableLevel(capability);
    }

    return level;
  }

  private getNextLevel(
    currentLevel: CapabilityMaturity
  ): CapabilityMaturity | undefined {
    const levels = [
      CapabilityMaturity.L1_GENERATION,
      CapabilityMaturity.L2_DEPLOYMENT,
      CapabilityMaturity.L3_OPERATIONS,
      CapabilityMaturity.L4_GOVERNANCE,
      CapabilityMaturity.L5_INTENT_DRIVEN,
    ];

    const currentIndex = levels.indexOf(currentLevel);
    return currentIndex < levels.length - 1
      ? levels[currentIndex + 1]
      : undefined;
  }

  private async calculateReadinessScore(
    capability: Capability,
    targetLevel?: CapabilityMaturity
  ): Promise<number> {
    if (!targetLevel) return 100; // Already at highest level

    const targetCriteria = this.maturityCriteria.find(
      (c) => c.level === targetLevel
    );
    if (!targetCriteria) return 0;

    let score = 0;
    let totalChecks = 0;

    // Check technical requirements
    const techScore = this.calculateRequirementScore(
      capability,
      targetCriteria.technicalRequirements
    );
    score += techScore * 0.4; // 40% weight
    totalChecks += 40;

    // Check process requirements
    const processScore = this.calculateRequirementScore(
      capability,
      targetCriteria.processRequirements
    );
    score += processScore * 0.3; // 30% weight
    totalChecks += 30;

    // Check governance requirements
    const govScore = this.calculateRequirementScore(
      capability,
      targetCriteria.governanceRequirements
    );
    score += govScore * 0.3; // 30% weight
    totalChecks += 30;

    return Math.round((score / totalChecks) * 100);
  }

  private async identifyBlockers(
    capability: Capability,
    targetLevel?: CapabilityMaturity
  ): Promise<MaturityBlocker[]> {
    const blockers: MaturityBlocker[] = [];

    if (!targetLevel) return blockers;

    const targetCriteria = this.maturityCriteria.find(
      (c) => c.level === targetLevel
    );
    if (!targetCriteria) return blockers;

    // Check for missing technical requirements
    const missingTech = this.findMissingRequirements(
      capability,
      targetCriteria.technicalRequirements
    );
    missingTech.forEach((req) => {
      blockers.push({
        category: 'technical',
        description: `Missing technical requirement: ${req}`,
        severity: 'high',
        resolution: `Implement ${req} to meet ${targetLevel} requirements`,
      });
    });

    // Check for missing process requirements
    const missingProcess = this.findMissingRequirements(
      capability,
      targetCriteria.processRequirements
    );
    missingProcess.forEach((req) => {
      blockers.push({
        category: 'process',
        description: `Missing process requirement: ${req}`,
        severity: 'medium',
        resolution: `Establish ${req} process`,
      });
    });

    // Check for missing governance requirements
    const missingGov = this.findMissingRequirements(
      capability,
      targetCriteria.governanceRequirements
    );
    missingGov.forEach((req) => {
      blockers.push({
        category: 'governance',
        description: `Missing governance requirement: ${req}`,
        severity:
          targetLevel === CapabilityMaturity.L4_GOVERNANCE
            ? 'critical'
            : 'high',
        resolution: `Implement ${req} governance controls`,
      });
    });

    return blockers;
  }

  private async generateRecommendations(
    capability: Capability,
    targetLevel?: CapabilityMaturity
  ): Promise<MaturityRecommendation[]> {
    const recommendations: MaturityRecommendation[] = [];

    if (!targetLevel) return recommendations;

    // Add level-specific recommendations
    switch (targetLevel) {
      case CapabilityMaturity.L2_DEPLOYMENT:
        recommendations.push({
          type: 'immediate',
          priority: 'high',
          description: 'Implement automated deployment pipelines',
          effort: 'medium',
          impact: 'high',
        });
        break;

      case CapabilityMaturity.L3_OPERATIONS:
        recommendations.push({
          type: 'short_term',
          priority: 'high',
          description: 'Set up comprehensive monitoring and alerting',
          effort: 'large',
          impact: 'high',
        });
        break;

      case CapabilityMaturity.L4_GOVERNANCE:
        recommendations.push({
          type: 'long_term',
          priority: 'high',
          description: 'Implement policy-as-code framework',
          effort: 'large',
          impact: 'high',
        });
        break;

      case CapabilityMaturity.L5_INTENT_DRIVEN:
        recommendations.push({
          type: 'long_term',
          priority: 'medium',
          description: 'Develop AI-powered intent processing capabilities',
          effort: 'large',
          impact: 'medium',
        });
        break;
    }

    // Add general improvement recommendations
    recommendations.push({
      type: 'immediate',
      priority: 'medium',
      description: 'Improve documentation and knowledge sharing',
      effort: 'small',
      impact: 'medium',
    });

    return recommendations;
  }

  private async generateProgressionPath(
    currentLevel: CapabilityMaturity
  ): Promise<ProgressionStep[]> {
    const path: ProgressionStep[] = [];
    let level = currentLevel;

    while (level !== CapabilityMaturity.L5_INTENT_DRIVEN) {
      const nextLevel = this.getNextLevel(level);
      if (!nextLevel) break;

      const step = await this.generateProgressionStep(level, nextLevel);
      path.push(step);
      level = nextLevel;
    }

    return path;
  }

  private async generateProgressionStep(
    fromLevel: CapabilityMaturity,
    toLevel: CapabilityMaturity
  ): Promise<ProgressionStep> {
    const toCriteria = this.maturityCriteria.find((c) => c.level === toLevel);
    const fromCriteria = this.maturityCriteria.find(
      (c) => c.level === fromLevel
    );

    return {
      fromLevel,
      toLevel,
      requirements: toCriteria?.requiredCapabilities || [],
      estimatedEffort: this.estimateProgressionEffort(fromLevel, toLevel),
      prerequisites: fromCriteria?.requiredCapabilities || [],
    };
  }

  private templateSpecToCapability(spec: TemplateSpec): Capability {
    // Convert template spec to capability for assessment
    return {
      id: spec.metadata.name,
      name: spec.metadata.name,
      description: spec.metadata.description,
      maturityLevel: this.inferMaturityFromSpec(spec),
      phase: this.inferPhaseFromSpec(spec),
      templates: [],
      dependencies: [],
    };
  }

  private inferMaturityFromSpec(spec: TemplateSpec): CapabilityMaturity {
    const tags = spec.metadata.tags.map((tag) => tag.toLowerCase());

    if (tags.includes('l5') || tags.includes('intent-driven')) {
      return CapabilityMaturity.L5_INTENT_DRIVEN;
    }
    if (tags.includes('l4') || tags.includes('governance')) {
      return CapabilityMaturity.L4_GOVERNANCE;
    }
    if (tags.includes('l3') || tags.includes('operations')) {
      return CapabilityMaturity.L3_OPERATIONS;
    }
    if (tags.includes('l2') || tags.includes('deployment')) {
      return CapabilityMaturity.L2_DEPLOYMENT;
    }

    return CapabilityMaturity.L1_GENERATION;
  }

  private inferPhaseFromSpec(spec: TemplateSpec): DevelopmentPhase {
    const maturity = this.inferMaturityFromSpec(spec);
    const criteria = this.maturityCriteria.find((c) => c.level === maturity);
    return criteria?.phase || DevelopmentPhase.FOUNDATION;
  }

  private hasRequiredCapabilities(
    capability: Capability,
    criteria: MaturityCriteria
  ): boolean {
    // This would check if the capability has the required capabilities
    // For now, we'll assume it does if it's declared at that level
    return true;
  }

  private findHighestAchievableLevel(
    capability: Capability
  ): CapabilityMaturity {
    // Start from L1 and work up to find the highest achievable level
    return CapabilityMaturity.L1_GENERATION;
  }

  private calculateRequirementScore(
    capability: Capability,
    requirements: string[]
  ): number {
    // This would check how many requirements the capability meets
    // For now, return a score based on capability maturity
    const maturityScores = {
      [CapabilityMaturity.L1_GENERATION]: 20,
      [CapabilityMaturity.L2_DEPLOYMENT]: 40,
      [CapabilityMaturity.L3_OPERATIONS]: 60,
      [CapabilityMaturity.L4_GOVERNANCE]: 80,
      [CapabilityMaturity.L5_INTENT_DRIVEN]: 100,
    };

    return maturityScores[capability.maturityLevel] || 0;
  }

  private findMissingRequirements(
    capability: Capability,
    requirements: string[]
  ): string[] {
    // This would identify which requirements are missing
    // For now, return some based on maturity level
    const currentLevel = capability.maturityLevel;
    if (currentLevel === CapabilityMaturity.L1_GENERATION) {
      return requirements.slice(0, Math.ceil(requirements.length * 0.7));
    }
    return requirements.slice(0, Math.ceil(requirements.length * 0.3));
  }

  private findMissingCapabilities(
    capability: Capability,
    criteria: MaturityCriteria
  ): string[] {
    return this.findMissingRequirements(
      capability,
      criteria.requiredCapabilities
    );
  }

  private estimateProgressionEffort(
    fromLevel: CapabilityMaturity,
    toLevel: CapabilityMaturity
  ): 'weeks' | 'months' | 'quarters' {
    const effortMap: Record<string, 'weeks' | 'months' | 'quarters'> = {
      [`${CapabilityMaturity.L1_GENERATION}-${CapabilityMaturity.L2_DEPLOYMENT}`]:
        'months',
      [`${CapabilityMaturity.L2_DEPLOYMENT}-${CapabilityMaturity.L3_OPERATIONS}`]:
        'months',
      [`${CapabilityMaturity.L3_OPERATIONS}-${CapabilityMaturity.L4_GOVERNANCE}`]:
        'quarters',
      [`${CapabilityMaturity.L4_GOVERNANCE}-${CapabilityMaturity.L5_INTENT_DRIVEN}`]:
        'quarters',
    };

    return effortMap[`${fromLevel}-${toLevel}`] || 'months';
  }

  private mapBlockerToImprovementType(
    category: string
  ): 'maturity' | 'security' | 'performance' | 'standards' {
    const mapping: Record<
      string,
      'maturity' | 'security' | 'performance' | 'standards'
    > = {
      technical: 'performance',
      organizational: 'standards',
      process: 'standards',
      governance: 'security',
    };
    return mapping[category] || 'standards';
  }

  private mapSeverityToPriority(severity: string): 'low' | 'medium' | 'high' {
    const mapping: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'high',
    };
    return mapping[severity] || 'medium';
  }

  private estimateEffort(
    category: string,
    severity: string
  ): 'small' | 'medium' | 'large' {
    if (severity === 'critical') return 'large';
    if (category === 'governance') return 'large';
    if (category === 'technical') return 'medium';
    return 'small';
  }

  private mapRecommendationType(
    type: string
  ): 'maturity' | 'security' | 'performance' | 'standards' {
    const mapping: Record<
      string,
      'maturity' | 'security' | 'performance' | 'standards'
    > = {
      immediate: 'performance',
      short_term: 'maturity',
      long_term: 'maturity',
    };
    return mapping[type] || 'maturity';
  }
}
