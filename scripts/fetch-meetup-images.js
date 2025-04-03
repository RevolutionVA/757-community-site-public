#!/usr/bin/env node

/**
 * This script fetches images and metadata from meetup URLs and saves them
 * for use in the static site build process.
 * 
 * Run it with: node scripts/fetch-meetup-images.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import chalk from 'chalk';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const dataDir = path.join(__dirname, '../src/data');
const publicDir = path.join(__dirname, '../public');
const meetupsImagesDir = path.join(publicDir, 'images/meetups');
const metadataOutputPath = path.join(dataDir, 'meetup-groups.json');

// Create meetups images directory if it doesn't exist
if (!fs.existsSync(meetupsImagesDir)) {
  fs.mkdirSync(meetupsImagesDir, { recursive: true });
  console.log(chalk.green(`Created directory: ${meetupsImagesDir}`));
}

// Load meetups data
const meetupsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'meetup-groups.json'), 'utf8'));
console.log(chalk.blue(`Loaded ${meetupsData.length} meetups from data file`));

// Function to extract Open Graph metadata from a URL
async function fetchOgMetadata(url) {
  try {
    console.log(chalk.yellow(`Fetching metadata for: ${url}`));
    const response = await fetch(url);
    const html = await response.text();
    
    // Extract Open Graph metadata
    const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const ogDescription = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    
    const metadata = {
      url,
      imageUrl: ogImage ? ogImage[1] : null,
      title: ogTitle ? ogTitle[1] : null,
      description: ogDescription ? ogDescription[1] : null
    };
    
    return metadata;
  } catch (error) {
    console.error(chalk.red(`Error fetching metadata for ${url}:`), error.message);
    return { url, imageUrl: null, title: null, description: null };
  }
}

// Function to download an image
async function downloadImage(url, outputPath) {
  try {
    console.log(chalk.yellow(`Downloading image: ${url}`));
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    await pipeline(response.body, createWriteStream(outputPath));
    console.log(chalk.green(`Downloaded image to: ${outputPath}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Error downloading image from ${url}:`), error.message);
    return false;
  }
}

// Function to generate a safe filename from a URL
function getSafeFilename(url) {
  // Extract domain and path
  const urlObj = new URL(url);
  const domain = urlObj.hostname.replace('www.', '');
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  
  // Create a safe filename
  const filename = `${domain}-${pathSegments.join('-')}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${filename}.jpg`;
}

// Function to get fallback metadata based on URL type
function getFallbackMetadata(meetup) {
  const { name, url } = meetup;
  
  if (url.includes('meetup.com')) {
    return {
      imageUrl: '/images/default-meetup.jpg',
      title: name,
      description: `A meetup group on Meetup.com. Click to learn more and join upcoming events.`
    };
  } else if (url.includes('linkedin.com')) {
    return {
      imageUrl: '/images/linkedin-default.jpg',
      title: name,
      description: `A professional profile or company on LinkedIn. Click to learn more.`
    };
  } else {
    return {
      imageUrl: '/images/external-default.jpg',
      title: name,
      description: `Click to visit this website and learn more.`
    };
  }
}

// Function to check if a URL exists
async function urlExists(url) {
  try {
    // Skip URL check for LinkedIn URLs as they often require authentication
    if (url.includes('linkedin.com')) {
      return true;
    }
    
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    // For LinkedIn URLs, return true even if the check fails
    if (url.includes('linkedin.com')) {
      return true;
    }
    return false;
  }
}

// Main function to process all meetups
async function processMeetups() {
  const metadata = {};
  let successCount = 0;
  let failureCount = 0;
  let nonExistentCount = 0;
  
  // Default image paths that should not cause skipping
  const defaultImagePaths = [
    '/images/default-meetup.jpg',
    '/images/linkedin-default.jpg',
    '/images/external-default.jpg'
  ];
  
  for (const meetup of meetupsData) {
    const { name, url } = meetup;
    
    // Check if the meetup URL exists (skipping LinkedIn URLs)
    const exists = await urlExists(url);
    if (!exists) {
      console.log(chalk.red(`Warning: Meetup URL does not exist: ${url}`));
      console.log(chalk.yellow(`Consider removing or updating the entry for "${name}" in meetup-groups.json`));
      
      // Add to metadata with a special note
      metadata[url] = {
        imageUrl: '/images/external-default.jpg',
        title: `${name} (No longer available)`,
        description: `This meetup appears to no longer be available. The URL ${url} could not be reached.`
      };
      nonExistentCount++;
      continue;
    }
    
    // Special handling for LinkedIn URLs - use the coverImage if available, otherwise create a placeholder
    const isLinkedInUrl = url.includes('linkedin.com');
    
    if (isLinkedInUrl) {
      console.log(chalk.yellow(`Processing LinkedIn meetup: ${name}`));
      
      // Always use the LinkedIn default image for LinkedIn meetups
      const filename = getSafeFilename(url);
      const imagePath = path.join(meetupsImagesDir, filename);
      const relativeImagePath = `/images/linkedin-default.jpg`;
      
      metadata[url] = {
        imageUrl: relativeImagePath,
        title: name,
        description: `${name} - A professional group on LinkedIn. Click to learn more.`
      };
      successCount++;
      continue;
    }
    
    // Remove the skip logic for custom coverImages - always fetch from source
    // Instead of skipping, we'll fetch the image from the source
    console.log(chalk.blue(`Fetching metadata for: ${url}`));
    
    // Fetch metadata for non-LinkedIn URLs
    const ogMetadata = await fetchOgMetadata(url);
    
    if (ogMetadata.imageUrl) {
      // Generate a safe filename
      const filename = getSafeFilename(url);
      const imagePath = path.join(meetupsImagesDir, filename);
      const relativeImagePath = `/images/meetups/${filename}`;
      
      // Download the image
      const success = await downloadImage(ogMetadata.imageUrl, imagePath);
      
      if (success) {
        metadata[url] = {
          imageUrl: relativeImagePath,
          title: ogMetadata.title || name,
          description: ogMetadata.description || `${name} - A meetup in the Hampton Roads area.`
        };
        successCount++;
      } else {
        // Use default image if download fails
        metadata[url] = getFallbackMetadata(meetup);
        failureCount++;
      }
    } else {
      // Use default image if no OG image found
      metadata[url] = getFallbackMetadata(meetup);
      failureCount++;
    }
  }
  
  // Save metadata to file
  fs.writeFileSync(metadataOutputPath, JSON.stringify(metadata, null, 2));
  console.log(chalk.green(`Saved metadata for ${Object.keys(metadata).length} meetups to ${metadataOutputPath}`));
  console.log(chalk.green(`Successfully processed ${successCount} meetups`));
  
  if (failureCount > 0) {
    console.log(chalk.yellow(`Failed to process ${failureCount} meetups (using fallback images)`));
  }
  
  if (nonExistentCount > 0) {
    console.log(chalk.red(`Found ${nonExistentCount} non-existent meetups (consider removing them from meetup-groups.json)`));
  }
}

// Run the script
processMeetups().catch(error => {
  console.error(chalk.red('Error processing meetups:'), error);
  process.exit(1);
}); 