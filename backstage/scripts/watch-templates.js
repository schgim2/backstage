#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const TemplateValidator = require('./validate-templates');

/**
 * Template watcher script for development
 * Watches template files for changes and validates them automatically
 */

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const DEBOUNCE_DELAY = 1000; // 1 second debounce

class TemplateWatcher {
  constructor() {
    this.validator = new TemplateValidator();
    this.debounceTimers = new Map();
    this.watchedFiles = new Set();
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} [WATCHER:${level.toUpperCase()}] ${message}`);
  }

  info(message) {
    this.log('info', message);
  }

  warn(message) {
    this.log('warn', message);
  }

  error(message) {
    this.log('error', message);
  }

  debounce(key, callback, delay = DEBOUNCE_DELAY) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      callback();
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  getTemplateNameFromPath(filePath) {
    const relativePath = path.relative(TEMPLATES_DIR, filePath);
    const parts = relativePath.split(path.sep);
    return parts[0]; // First directory is the template name
  }

  validateTemplate(templateName) {
    this.info(`Validating template: ${templateName}`);
    
    const templateDir = path.join(TEMPLATES_DIR, templateName);
    if (!fs.existsSync(templateDir)) {
      this.error(`Template directory not found: ${templateDir}`);
      return;
    }

    // Create a new validator instance for this validation
    const validator = new TemplateValidator();
    const isValid = validator.validateTemplate(templateDir);
    
    if (isValid) {
      this.info(`✅ Template '${templateName}' validation passed`);
    } else {
      this.error(`❌ Template '${templateName}' validation failed`);
      
      // Print errors for this template
      const templateErrors = validator.errors.filter(e => e.templateName === templateName);
      const templateWarnings = validator.warnings.filter(w => w.templateName === templateName);
      
      if (templateErrors.length > 0) {
        console.log(`\nErrors in ${templateName}:`);
        templateErrors.forEach(error => {
          console.log(`  ❌ ${error.message}`);
        });
      }
      
      if (templateWarnings.length > 0) {
        console.log(`\nWarnings in ${templateName}:`);
        templateWarnings.forEach(warning => {
          console.log(`  ⚠️  ${warning.message}`);
        });
      }
    }
    
    console.log('-'.repeat(50));
  }

  handleFileChange(filePath, eventType) {
    const templateName = this.getTemplateNameFromPath(filePath);
    const relativePath = path.relative(TEMPLATES_DIR, filePath);
    
    this.info(`File ${eventType}: ${relativePath}`);
    
    // Debounce validation to avoid excessive runs
    this.debounce(`validate-${templateName}`, () => {
      this.validateTemplate(templateName);
    });
  }

  startWatching() {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      this.error(`Templates directory not found: ${TEMPLATES_DIR}`);
      return false;
    }

    this.info(`Starting template watcher on: ${TEMPLATES_DIR}`);
    
    // Initial validation of all templates
    this.info('Running initial validation...');
    const isInitialValid = this.validator.validateAllTemplates();
    this.validator.printSummary();
    
    if (!isInitialValid) {
      this.warn('Some templates have validation errors. Fix them to ensure proper functionality.');
    }
    
    console.log('\n' + '='.repeat(60));
    this.info('Starting file watcher...');
    console.log('='.repeat(60));

    // Watch for changes in template files
    const watcher = chokidar.watch(TEMPLATES_DIR, {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log',
        '**/.*' // Hidden files
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10
    });

    // File event handlers
    watcher
      .on('add', (filePath) => {
        this.handleFileChange(filePath, 'added');
      })
      .on('change', (filePath) => {
        this.handleFileChange(filePath, 'changed');
      })
      .on('unlink', (filePath) => {
        const templateName = this.getTemplateNameFromPath(filePath);
        const relativePath = path.relative(TEMPLATES_DIR, filePath);
        this.info(`File removed: ${relativePath}`);
        
        // If template.yaml was removed, warn about it
        if (path.basename(filePath) === 'template.yaml') {
          this.warn(`Template definition removed for: ${templateName}`);
        }
      })
      .on('addDir', (dirPath) => {
        const relativePath = path.relative(TEMPLATES_DIR, dirPath);
        this.info(`Directory added: ${relativePath}`);
      })
      .on('unlinkDir', (dirPath) => {
        const relativePath = path.relative(TEMPLATES_DIR, dirPath);
        this.info(`Directory removed: ${relativePath}`);
      })
      .on('error', (error) => {
        this.error(`Watcher error: ${error.message}`);
      })
      .on('ready', () => {
        this.info('File watcher is ready and monitoring for changes');
        this.info('Press Ctrl+C to stop watching');
      });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.info('Shutting down template watcher...');
      watcher.close().then(() => {
        this.info('Template watcher stopped');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      this.info('Received SIGTERM, shutting down...');
      watcher.close().then(() => {
        process.exit(0);
      });
    });

    return true;
  }

  // Method to validate a specific template by name
  validateSpecificTemplate(templateName) {
    if (!templateName) {
      this.error('Template name is required');
      return false;
    }

    const templateDir = path.join(TEMPLATES_DIR, templateName);
    if (!fs.existsSync(templateDir)) {
      this.error(`Template '${templateName}' not found`);
      return false;
    }

    return this.validateTemplate(templateName);
  }

  // Method to list all available templates
  listTemplates() {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      this.error(`Templates directory not found: ${TEMPLATES_DIR}`);
      return [];
    }

    const templates = fs.readdirSync(TEMPLATES_DIR)
      .filter(name => {
        const templatePath = path.join(TEMPLATES_DIR, name);
        return fs.statSync(templatePath).isDirectory();
      })
      .map(name => {
        const templatePath = path.join(TEMPLATES_DIR, name, 'template.yaml');
        const hasTemplate = fs.existsSync(templatePath);
        return {
          name,
          path: path.join(TEMPLATES_DIR, name),
          hasTemplateYaml: hasTemplate
        };
      });

    this.info(`Found ${templates.length} template directories:`);
    templates.forEach(template => {
      const status = template.hasTemplateYaml ? '✅' : '❌';
      console.log(`  ${status} ${template.name}`);
    });

    return templates;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const watcher = new TemplateWatcher();

  switch (command) {
    case 'list':
      watcher.listTemplates();
      break;
    
    case 'validate':
      const templateName = args[1];
      if (templateName) {
        watcher.validateSpecificTemplate(templateName);
      } else {
        watcher.validator.validateAllTemplates();
        watcher.validator.printSummary();
      }
      break;
    
    case 'watch':
    default:
      watcher.startWatching();
      break;
  }
}

module.exports = TemplateWatcher;