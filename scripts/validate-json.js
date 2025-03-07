#!/usr/bin/env node

/**
 * This script validates the JSON data files against their schemas.
 * Run it with: node scripts/validate-json.js
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Ajv instance
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Paths
const dataDir = path.join(__dirname, '../src/data');
const schemasDir = path.join(__dirname, '../src/data/schemas');

// Files to validate
const filesToValidate = [
  { 
    dataFile: 'conferences.json', 
    schemaFile: 'conferences.schema.json' 
  },
  { 
    dataFile: 'meetups.json', 
    schemaFile: 'meetups.schema.json' 
  }
];

// Validate each file
let hasErrors = false;

filesToValidate.forEach(({ dataFile, schemaFile }) => {
  try {
    console.log(chalk.blue(`Validating ${dataFile}...`));
    
    // Read files
    const schemaPath = path.join(schemasDir, schemaFile);
    const dataPath = path.join(dataDir, dataFile);
    
    if (!fs.existsSync(schemaPath)) {
      console.error(chalk.red(`Schema file not found: ${schemaPath}`));
      hasErrors = true;
      return;
    }
    
    if (!fs.existsSync(dataPath)) {
      console.error(chalk.red(`Data file not found: ${dataPath}`));
      hasErrors = true;
      return;
    }
    
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Validate
    const validate = ajv.compile(schema);
    const valid = validate(data);
    
    if (!valid) {
      console.error(chalk.red(`❌ ${dataFile} is invalid:`));
      validate.errors.forEach(error => {
        console.error(chalk.red(`  - ${error.instancePath}: ${error.message}`));
      });
      hasErrors = true;
    } else {
      console.log(chalk.green(`✅ ${dataFile} is valid`));
    }
  } catch (error) {
    console.error(chalk.red(`Error validating ${dataFile}:`), error);
    hasErrors = true;
  }
});

// Exit with appropriate code
if (hasErrors) {
  console.error(chalk.red('\nValidation failed. Please fix the errors above.'));
  process.exit(1);
} else {
  console.log(chalk.green('\nAll files are valid! 🎉'));
  process.exit(0);
} 