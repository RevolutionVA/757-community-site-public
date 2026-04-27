#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANIES_FILE = path.join(__dirname, '..', 'src', 'data', 'companies.json');
const INDUSTRIES_FILE = path.join(__dirname, '..', 'src', 'data', 'industries.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));
const yesNo = async (query) => {
  const answer = (await question(chalk.cyan(`${query} (y/n): `))).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
};

async function main() {
  console.log(chalk.blue.bold('\n🏢 Add Company / Org to 757tech\n'));

  try {
    const industries = JSON.parse(fs.readFileSync(INDUSTRIES_FILE, 'utf8'));
    const industryIds = industries.map((i) => i.id);

    const name = (await question(chalk.cyan('Name: '))).trim();
    if (!name) {
      console.log(chalk.red('Name is required.'));
      process.exit(1);
    }

    const url = (await question(chalk.cyan('URL: '))).trim().replace(/\/$/, '');
    if (!/^https?:\/\//.test(url)) {
      console.log(chalk.red('URL must start with http:// or https://'));
      process.exit(1);
    }

    const description = (await question(chalk.cyan('One-line description: '))).trim();
    if (description.length < 10) {
      console.log(chalk.red('Description must be at least 10 characters.'));
      process.exit(1);
    }

    const location = (await question(chalk.cyan('Location (city or region in Hampton Roads): '))).trim();
    if (!location) {
      console.log(chalk.red('Location is required.'));
      process.exit(1);
    }

    console.log(chalk.cyan('\nAvailable industries:'));
    industries.forEach((i, idx) => console.log(chalk.gray(`  ${idx + 1}. ${i.name} (${i.id})`)));
    const industryInput = await question(chalk.cyan('Industry numbers (comma-separated, e.g., 1,5): '));
    const selectedIndustries = industryInput
      .split(',')
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((n) => n >= 0 && n < industries.length)
      .map((n) => industries[n].id);

    if (selectedIndustries.length === 0) {
      console.log(chalk.red('At least one industry is required.'));
      process.exit(1);
    }

    console.log(chalk.cyan('\nType:'));
    console.log(chalk.gray('  1. company (for-profit employer)'));
    console.log(chalk.gray('  2. org (nonprofit / community)'));
    console.log(chalk.gray('  3. startup (early-stage builder)'));
    const typeChoice = (await question(chalk.cyan('Select type (1-3): '))).trim();
    const typeMap = { '1': 'company', '2': 'org', '3': 'startup' };
    const type = typeMap[typeChoice];
    if (!type) {
      console.log(chalk.red('Invalid type selection.'));
      process.exit(1);
    }

    const hiring = await yesNo('Currently hiring tech roles?');
    const hiringClearedTalent = hiring ? await yesNo('Hires cleared talent?') : false;

    const tagsInput = await question(chalk.cyan('Tags (comma-separated, optional): '));
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    const newEntry = {
      name,
      url,
      description,
      location,
      industries: selectedIndustries,
      type,
      hiring,
      ...(hiringClearedTalent && { hiringClearedTalent }),
      ...(tags.length > 0 && { tags })
    };

    console.log(chalk.green('\nNew entry:'));
    console.log(JSON.stringify(newEntry, null, 2));

    const confirm = await yesNo('Add this entry?');
    if (!confirm) {
      console.log(chalk.yellow('Cancelled.'));
      process.exit(0);
    }

    const existing = JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf8'));
    if (existing.some((c) => c.url.replace(/\/$/, '') === url)) {
      console.log(chalk.red('A company with that URL already exists.'));
      process.exit(1);
    }

    existing.push(newEntry);
    existing.sort((a, b) => a.name.localeCompare(b.name));

    fs.writeFileSync(COMPANIES_FILE, JSON.stringify(existing, null, 2) + '\n');
    console.log(chalk.green('✅ Company added. Run `npm run validate` to confirm schema.'));
  } catch (err) {
    console.error(chalk.red('Error:'), err);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
