#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Template validation script for Backstage templates
 * Validates YAML syntax, schema compliance, and required fields
 */

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const REQUIRED_TEMPLATE_FIELDS = [
  'apiVersion',
  'kind',
  'metadata.name',
  'metadata.title',
  'metadata.description',
  'spec.owner',
  'spec.type',
  'spec.parameters',
  'spec.steps'
];

const REQUIRED_STEP_FIELDS = [
  'id',
  'name',
  'action',
  'input'
];

class TemplateValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validatedTemplates = [];
  }

  log(level, message, templateName = null) {
    const timestamp = new Date().toISOString();
    const prefix = templateName ? `[${templateName}]` : '';
    console.log(`${timestamp} [${level.toUpperCase()}] ${prefix} ${message}`);
  }

  error(message, templateName = null) {
    this.errors.push({ message, templateName });
    this.log('error', message, templateName);
  }

  warn(message, templateName = null) {
    this.warnings.push({ message, templateName });
    this.log('warn', message, templateName);
  }

  info(message, templateName = null) {
    this.log('info', message, templateName);
  }

  validateYamlSyntax(filePath, templateName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = yaml.load(content);
      this.info(`YAML syntax validation passed`, templateName);
      return parsed;
    } catch (error) {
      this.error(`YAML syntax error: ${error.message}`, templateName);
      return null;
    }
  }

  validateRequiredFields(template, templateName) {
    let isValid = true;

    for (const field of REQUIRED_TEMPLATE_FIELDS) {
      const value = this.getNestedValue(template, field);
      if (value === undefined || value === null || value === '') {
        this.error(`Missing required field: ${field}`, templateName);
        isValid = false;
      }
    }

    return isValid;
  }

  validateTemplateSteps(template, templateName) {
    let isValid = true;

    if (!Array.isArray(template.spec?.steps)) {
      this.error('Template steps must be an array', templateName);
      return false;
    }

    template.spec.steps.forEach((step, index) => {
      for (const field of REQUIRED_STEP_FIELDS) {
        if (!step[field]) {
          this.error(`Step ${index + 1} missing required field: ${field}`, templateName);
          isValid = false;
        }
      }

      // Validate common step actions
      if (step.action) {
        this.validateStepAction(step, index + 1, templateName);
      }
    });

    return isValid;
  }

  validateStepAction(step, stepNumber, templateName) {
    const commonActions = [
      'fetch:template',
      'publish:github',
      'catalog:register',
      'debug:log',
      'fs:rename'
    ];

    if (!commonActions.includes(step.action)) {
      this.warn(`Step ${stepNumber} uses uncommon action: ${step.action}`, templateName);
    }

    // Validate specific action requirements
    switch (step.action) {
      case 'fetch:template':
        if (!step.input?.url) {
          this.error(`Step ${stepNumber} (fetch:template) missing required input.url`, templateName);
        }
        break;
      case 'publish:github':
        if (!step.input?.repoUrl && !step.input?.description) {
          this.warn(`Step ${stepNumber} (publish:github) should have repoUrl and description`, templateName);
        }
        break;
      case 'catalog:register':
        if (!step.input?.repoContentsUrl && !step.input?.catalogInfoPath) {
          this.warn(`Step ${stepNumber} (catalog:register) should specify catalog info location`, templateName);
        }
        break;
    }
  }

  validateParameters(template, templateName) {
    let isValid = true;

    if (!Array.isArray(template.spec?.parameters)) {
      this.error('Template parameters must be an array', templateName);
      return false;
    }

    template.spec.parameters.forEach((paramGroup, groupIndex) => {
      if (!paramGroup.title) {
        this.error(`Parameter group ${groupIndex + 1} missing title`, templateName);
        isValid = false;
      }

      if (!paramGroup.properties || typeof paramGroup.properties !== 'object') {
        this.error(`Parameter group ${groupIndex + 1} missing or invalid properties`, templateName);
        isValid = false;
        return;
      }

      Object.entries(paramGroup.properties).forEach(([paramName, paramConfig]) => {
        if (!paramConfig.type) {
          this.error(`Parameter '${paramName}' missing type`, templateName);
          isValid = false;
        }

        if (!paramConfig.title) {
          this.warn(`Parameter '${paramName}' missing title`, templateName);
        }

        if (!paramConfig.description) {
          this.warn(`Parameter '${paramName}' missing description`, templateName);
        }
      });
    });

    return isValid;
  }

  validateSkeletonDirectory(templateDir, templateName) {
    const skeletonPath = path.join(templateDir, 'skeleton');
    
    if (!fs.existsSync(skeletonPath)) {
      this.error('Missing skeleton directory', templateName);
      return false;
    }

    const skeletonStats = fs.statSync(skeletonPath);
    if (!skeletonStats.isDirectory()) {
      this.error('skeleton must be a directory', templateName);
      return false;
    }

    // Check if skeleton has any content
    const skeletonContents = fs.readdirSync(skeletonPath);
    if (skeletonContents.length === 0) {
      this.warn('skeleton directory is empty', templateName);
    } else {
      this.info(`skeleton directory contains ${skeletonContents.length} items`, templateName);
    }

    return true;
  }

  validateTemplate(templateDir) {
    const templateName = path.basename(templateDir);
    const templatePath = path.join(templateDir, 'template.yaml');

    this.info(`Validating template: ${templateName}`);

    if (!fs.existsSync(templatePath)) {
      this.error('template.yaml not found', templateName);
      return false;
    }

    // Parse YAML
    const template = this.validateYamlSyntax(templatePath, templateName);
    if (!template) {
      return false;
    }

    // Validate required fields
    const hasRequiredFields = this.validateRequiredFields(template, templateName);
    
    // Validate template steps
    const hasValidSteps = this.validateTemplateSteps(template, templateName);
    
    // Validate parameters
    const hasValidParameters = this.validateParameters(template, templateName);
    
    // Validate skeleton directory
    const hasValidSkeleton = this.validateSkeletonDirectory(templateDir, templateName);

    const isValid = hasRequiredFields && hasValidSteps && hasValidParameters && hasValidSkeleton;

    if (isValid) {
      this.info(`✅ Template validation passed`, templateName);
      this.validatedTemplates.push({
        name: templateName,
        path: templateDir,
        valid: true
      });
    } else {
      this.error(`❌ Template validation failed`, templateName);
      this.validatedTemplates.push({
        name: templateName,
        path: templateDir,
        valid: false
      });
    }

    return isValid;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  validateAllTemplates() {
    this.info('Starting template validation...');

    if (!fs.existsSync(TEMPLATES_DIR)) {
      this.error(`Templates directory not found: ${TEMPLATES_DIR}`);
      return false;
    }

    const templateDirs = fs.readdirSync(TEMPLATES_DIR)
      .map(name => path.join(TEMPLATES_DIR, name))
      .filter(dir => fs.statSync(dir).isDirectory());

    if (templateDirs.length === 0) {
      this.warn('No template directories found');
      return true;
    }

    this.info(`Found ${templateDirs.length} template directories`);

    let allValid = true;
    for (const templateDir of templateDirs) {
      const isValid = this.validateTemplate(templateDir);
      if (!isValid) {
        allValid = false;
      }
    }

    return allValid;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('TEMPLATE VALIDATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nTemplates validated: ${this.validatedTemplates.length}`);
    console.log(`Valid templates: ${this.validatedTemplates.filter(t => t.valid).length}`);
    console.log(`Invalid templates: ${this.validatedTemplates.filter(t => !t.valid).length}`);
    console.log(`Warnings: ${this.warnings.length}`);
    console.log(`Errors: ${this.errors.length}`);

    if (this.validatedTemplates.length > 0) {
      console.log('\nTemplate Status:');
      this.validatedTemplates.forEach(template => {
        const status = template.valid ? '✅ VALID' : '❌ INVALID';
        console.log(`  ${template.name}: ${status}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(warning => {
        const prefix = warning.templateName ? `[${warning.templateName}]` : '';
        console.log(`  ⚠️  ${prefix} ${warning.message}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\nErrors:');
      this.errors.forEach(error => {
        const prefix = error.templateName ? `[${error.templateName}]` : '';
        console.log(`  ❌ ${prefix} ${error.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
if (require.main === module) {
  const validator = new TemplateValidator();
  const isValid = validator.validateAllTemplates();
  validator.printSummary();
  
  process.exit(isValid ? 0 : 1);
}

module.exports = TemplateValidator;