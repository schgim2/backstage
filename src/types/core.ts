/**
 * Core types and interfaces for the Backstage Template Generator
 */

import { z } from 'zod';

// Capability Maturity Levels
export enum CapabilityMaturity {
  L1_GENERATION = 'L1_GENERATION',
  L2_DEPLOYMENT = 'L2_DEPLOYMENT',
  L3_OPERATIONS = 'L3_OPERATIONS',
  L4_GOVERNANCE = 'L4_GOVERNANCE',
  L5_INTENT_DRIVEN = 'L5_INTENT_DRIVEN',
}

// Development Phases
export enum DevelopmentPhase {
  FOUNDATION = 'FOUNDATION',
  STANDARDIZATION = 'STANDARDIZATION',
  OPERATIONALIZATION = 'OPERATIONALIZATION',
  GOVERNANCE = 'GOVERNANCE',
  INTENT_DRIVEN = 'INTENT_DRIVEN',
}

// Validation Rule Types
export interface SecurityRule {
  type: 'baseline' | 'classification' | 'access';
  rule: string;
  enforcement: 'warn' | 'block';
}

export interface ComplianceRule {
  type: string;
  rule: string;
  enforcement: 'warn' | 'block';
}

export interface StandardRule {
  type: string;
  rule: string;
  enforcement: 'warn' | 'block';
}

export interface CostRule {
  type: string;
  rule: string;
  enforcement: 'warn' | 'block';
}

export interface ValidationRules {
  security: SecurityRule[];
  compliance: ComplianceRule[];
  standards: StandardRule[];
  cost: CostRule[];
}

// Parsed Intent from natural language
export interface ParsedIntent {
  capability: string;
  description: string;
  requirements: string[];
  constraints: string[];
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
}

// Template Specification
export interface TemplateSpec {
  metadata: {
    name: string;
    description: string;
    tags: string[];
    owner: string;
  };
  parameters: Record<string, unknown>; // JSONSchema
  steps: TemplateStep[];
  output: TemplateOutput;
  validation: ValidationRules;
}

export interface TemplateStep {
  id: string;
  name: string;
  action: string;
  input: Record<string, unknown>;
  if?: string;
}

export interface TemplateOutput {
  links?: Array<{
    title: string;
    url: string;
  }>;
  text?: Array<{
    title: string;
    content: string;
  }>;
}

// Generated Template Artifacts
export interface SkeletonStructure {
  files: Record<string, string>; // filepath -> content
  directories: string[];
}

export interface Documentation {
  readme: string;
  techDocs: string;
  apiDocs?: string;
  usageExamples: string[];
}

export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  created: Date;
  updated: Date;
  author: string;
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
}

export interface GeneratedTemplate {
  yaml: string;
  skeleton: SkeletonStructure;
  documentation: Documentation;
  validation: ValidationRules;
  metadata: TemplateMetadata;
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  severity: 'warning';
}

// Template Preview
export interface TemplatePreview {
  yaml: string;
  fileStructure: string[];
  documentation: string;
  validationResults: ValidationResult;
}

// Repository and GitOps
export interface Repository {
  id: string;
  name: string;
  url: string;
  branch: string;
}

export interface PullRequest {
  id: string;
  title: string;
  description: string;
  repository: Repository;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed';
}

export interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  timestamp: Date;
  errors?: string[];
}

// Capability Registry
export interface Capability {
  id: string;
  name: string;
  description: string;
  maturityLevel: CapabilityMaturity;
  phase: DevelopmentPhase;
  templates: Template[];
  dependencies: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  repository: Repository;
  metadata: TemplateMetadata;
}

export interface CapabilityFilter {
  maturityLevel?: CapabilityMaturity;
  phase?: DevelopmentPhase;
  tags?: string[];
  search?: string;
}

export interface TemplateFilter {
  maturityLevel?: CapabilityMaturity;
  phase?: DevelopmentPhase;
  search?: string;
  capability?: string;
  version?: string;
}

export interface Improvement {
  type: 'maturity' | 'security' | 'performance' | 'standards';
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
}

// Template Discovery and Reuse Types
export interface TemplateDisplayInfo {
  template: Template;
  capability: Capability;
  usageExamples: string[];
  similarTemplates: Template[];
  compositionSuggestions: CompositionSuggestion[];
}

export interface CompositionSuggestion {
  type: 'extend' | 'compose' | 'merge';
  description: string;
  targetTemplate: Template;
  benefits: string[];
  effort: 'small' | 'medium' | 'large';
}

export interface TemplateCustomization {
  templateId: string;
  parameters: Record<string, unknown>;
  customizations: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  description: string;
  type: 'parameter' | 'step' | 'output';
  defaultValue?: unknown;
  required: boolean;
  options?: unknown[];
}

export interface TemplateReusabilityAnalysis {
  template: Template;
  reusabilityScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  compatibleTemplates: Template[];
}

// Conflict Resolution and Migration Types
export interface TemplateConflict {
  type: 'id' | 'name' | 'functionality' | 'dependency' | 'version';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  conflictingTemplate: Template;
  affectedCapabilities: string[];
}

export interface ConflictResolution {
  strategy: 'rename' | 'merge' | 'deprecate' | 'version' | 'namespace';
  description: string;
  steps: string[];
  impact: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  risks: string[];
  benefits: string[];
}

export interface MigrationPlan {
  fromTemplate: Template;
  toTemplate?: Template;
  strategy: 'direct' | 'phased' | 'parallel' | 'gradual';
  phases: MigrationPhase[];
  estimatedDuration: string;
  rollbackPlan: string[];
  dependencies: string[];
  validationSteps: string[];
}

export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  duration: string;
  prerequisites: string[];
  steps: string[];
  validationCriteria: string[];
  rollbackSteps: string[];
}

export interface DeprecationPlan {
  template: Template;
  deprecationDate: Date;
  endOfLifeDate: Date;
  reason: string;
  replacementTemplates: Template[];
  migrationPlan: MigrationPlan;
  notificationSchedule: DeprecationNotification[];
  supportLevel: 'full' | 'maintenance' | 'security-only' | 'none';
}

export interface DeprecationNotification {
  date: Date;
  type: 'announcement' | 'warning' | 'final-notice';
  channels: string[];
  message: string;
}

// Zod schemas for runtime validation
export const ParsedIntentSchema = z.object({
  capability: z.string(),
  description: z.string(),
  requirements: z.array(z.string()),
  constraints: z.array(z.string()),
  maturityLevel: z.nativeEnum(CapabilityMaturity),
  phase: z.nativeEnum(DevelopmentPhase),
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      path: z.string().optional(),
      severity: z.literal('error'),
    })
  ),
  warnings: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      path: z.string().optional(),
      severity: z.literal('warning'),
    })
  ),
});
