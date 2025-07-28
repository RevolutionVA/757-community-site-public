#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MEETUPS_FILE = path.join(__dirname, '..', 'src', 'data', 'meetups-combined.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function fetchMetadata(url) {
  try {
    console.log(chalk.yellow('Fetching metadata from Meetup.com...'));
    const response = await fetch(url);
    const html = await response.text();
    
    const metadata = {
      imageUrl: '',
      title: '',
      description: ''
    };
    
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch) metadata.imageUrl = ogImageMatch[1];
    
    const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) metadata.title = ogTitleMatch[1];
    
    const ogDescMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    if (ogDescMatch) metadata.description = ogDescMatch[1];
    
    return metadata;
  } catch (error) {
    console.log(chalk.yellow('Could not fetch metadata automatically. You can add it manually later.'));
    return {
      imageUrl: '',
      title: '',
      description: ''
    };
  }
}

function extractGroupSlug(url) {
  const match = url.match(/meetup\.com\/([^\/]+)/);
  return match ? match[1] : null;
}

async function main() {
  console.log(chalk.blue.bold('\n🚀 Add New Meetup Group to 757 Tech Community\n'));
  
  try {
    const name = await question(chalk.cyan('Meetup Group Name: '));
    if (!name.trim()) {
      console.log(chalk.red('Group name is required!'));
      process.exit(1);
    }
    
    const url = await question(chalk.cyan('Meetup URL (e.g., https://www.meetup.com/group-name/): '));
    if (!url.trim() || !url.includes('meetup.com')) {
      console.log(chalk.red('Valid Meetup.com URL is required!'));
      process.exit(1);
    }
    
    const cleanUrl = url.trim().replace(/\/$/, '');
    const groupSlug = extractGroupSlug(cleanUrl);
    
    if (!groupSlug) {
      console.log(chalk.red('Could not extract group slug from URL!'));
      process.exit(1);
    }
    
    const rssFeed = `https://www.meetup.com/${groupSlug}/events/rss/`;
    console.log(chalk.gray(`RSS Feed will be: ${rssFeed}`));
    
    const categories = ['Development', 'Technology', 'Design', 'Cloud'];
    console.log(chalk.cyan('\nAvailable categories:'));
    categories.forEach((cat, i) => console.log(chalk.gray(`  ${i + 1}. ${cat}`)));
    
    const categoryChoice = await question(chalk.cyan('Select category (1-4): '));
    const categoryIndex = parseInt(categoryChoice) - 1;
    
    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      console.log(chalk.red('Invalid category selection!'));
      process.exit(1);
    }
    
    const category = categories[categoryIndex];
    
    const tagsInput = await question(chalk.cyan('Tags (comma-separated, e.g., javascript,react,web): '));
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    console.log(chalk.yellow('\nFetching metadata from Meetup.com...'));
    const metadata = await fetchMetadata(cleanUrl);
    
    const existingData = JSON.parse(fs.readFileSync(MEETUPS_FILE, 'utf8'));
    
    if (existingData.some(m => m.url === cleanUrl)) {
      console.log(chalk.red('This meetup group already exists!'));
      process.exit(1);
    }
    
    const newMeetup = {
      name: name.trim(),
      url: cleanUrl,
      tags: tags,
      category: category,
      rssFeed: rssFeed,
      metadata: metadata
    };
    
    console.log(chalk.green('\nNew meetup to be added:'));
    console.log(JSON.stringify(newMeetup, null, 2));
    
    const confirm = await question(chalk.cyan('\nAdd this meetup? (y/n): '));
    
    if (confirm.toLowerCase() !== 'y') {
      console.log(chalk.yellow('Cancelled.'));
      process.exit(0);
    }
    
    existingData.push(newMeetup);
    existingData.sort((a, b) => a.name.localeCompare(b.name));
    
    fs.writeFileSync(MEETUPS_FILE, JSON.stringify(existingData, null, 2));
    console.log(chalk.green('✅ Meetup group added successfully!'));
    
    console.log(chalk.blue('\n📅 Updating calendar with new events...'));
    
    const { stdout, stderr } = await execAsync('npm run update-calendar');
    
    if (stderr) {
      console.error(chalk.red('Error updating calendar:'), stderr);
    } else {
      console.log(chalk.green('✅ Calendar updated successfully!'));
      console.log(chalk.gray(stdout));
    }
    
    console.log(chalk.blue('\n🖼️  Fetching meetup images...'));
    const { stdout: imgStdout, stderr: imgStderr } = await execAsync('npm run fetch-meetup-images');
    
    if (imgStderr) {
      console.error(chalk.yellow('Warning fetching images:'), imgStderr);
    } else {
      console.log(chalk.green('✅ Images fetched successfully!'));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();