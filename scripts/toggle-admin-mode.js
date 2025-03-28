#!/usr/bin/env node
/**
 * Script to toggle admin mode and test protections for development
 * Run with: node scripts/toggle-admin-mode.js [admin|test] [enable|disable]
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

// Set up paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ADMIN_KEY = 'aya_admin_access';
const ADMIN_STORAGE_KEY = 'aya_admin_debug';
const TEST_PROTECTIONS_KEY = 'aya_test_protections';

function printUsage() {
  console.log('\nUsage:');
  console.log('  node scripts/toggle-admin-mode.js [admin|test] [enable|disable]\n');
  console.log('Options:');
  console.log('  admin - Toggle admin mode (DevTools access without triggering protections)');
  console.log('  test  - Toggle test protections (Enable protections in dev mode for testing)\n');
  console.log('This will provide instructions for enabling/disabling these modes.\n');
}

function generateAdminInstructions(action) {
  const enable = action === 'enable';
  
  console.log('\n=== Admin Mode Instructions ===\n');
  console.log(`To ${enable ? 'enable' : 'disable'} admin mode, you can use one of these methods:\n`);
  
  console.log('1. Browser Console Method:');
  console.log(`   Open DevTools and run: window.__toggleAyaAdmin('${ADMIN_KEY}')\n`);
  
  console.log('2. Local Storage Method:');
  console.log(`   Open DevTools > Application > Local Storage`);
  console.log(`   Set key: ${ADMIN_STORAGE_KEY}`);
  console.log(`   Set value: ${enable ? 'true' : 'false'}`);
  console.log('   Then refresh the page\n');
  
  console.log('3. Development Environment:');
  console.log(`   In development mode, protections are disabled by default`);
  console.log(`   Unless test protections are enabled\n`);
  
  console.log('Remember:');
  console.log('- Admin mode should only be used for debugging/development');
  console.log('- The page will reload after changing admin mode');
  console.log('- When enabled, all security protections will be disabled\n');
}

function generateTestInstructions(action) {
  const enable = action === 'enable';
  
  console.log('\n=== Test Protections Instructions ===\n');
  console.log(`To ${enable ? 'enable' : 'disable'} test protections, you can use one of these methods:\n`);
  
  console.log('1. Browser Console Method:');
  console.log(`   Open DevTools and run: window.__toggleTestProtections(${enable ? 'true' : 'false'})\n`);
  
  console.log('2. Local Storage Method:');
  console.log(`   Open DevTools > Application > Local Storage`);
  console.log(`   Set key: ${TEST_PROTECTIONS_KEY}`);
  console.log(`   Set value: ${enable ? 'true' : 'false'}`);
  console.log('   Then refresh the page\n');
  
  console.log('Remember:');
  console.log('- Test protections allow you to test the protection mechanisms in development mode');
  console.log('- When enabled in dev mode, all security protections will be active as if in production');
  console.log('- To use DevTools while test protections are enabled, you need to enable admin mode\n');
}

function askForMode() {
  rl.question('Which mode do you want to toggle? (admin/test/help): ', (modeAnswer) => {
    const mode = modeAnswer.toLowerCase().trim();
    
    if (mode === 'admin' || mode === 'test') {
      askForAction(mode);
    } else if (mode === 'help') {
      printUsage();
      askForMode();
    } else {
      console.log('Invalid option. Please type "admin", "test", or "help".');
      askForMode();
    }
  });
}

function askForAction(mode) {
  rl.question(`Do you want to enable or disable ${mode} mode? (enable/disable/help): `, (answer) => {
    const action = answer.toLowerCase().trim();
    
    if (action === 'enable' || action === 'disable') {
      if (mode === 'admin') {
        generateAdminInstructions(action);
      } else if (mode === 'test') {
        generateTestInstructions(action);
      }
      rl.close();
    } else if (action === 'help') {
      if (mode === 'admin') {
        generateAdminInstructions('enable');
        generateAdminInstructions('disable');
      } else if (mode === 'test') {
        generateTestInstructions('enable');
        generateTestInstructions('disable');
      }
      askForAction(mode);
    } else {
      console.log('Invalid option. Please type "enable", "disable", or "help".');
      askForAction(mode);
    }
  });
}

// Main execution
if (process.argv.length > 2) {
  const mode = process.argv[2].toLowerCase();
  const action = process.argv.length > 3 ? process.argv[3].toLowerCase() : null;
  
  if (mode === 'admin' || mode === 'test') {
    if (action === 'enable' || action === 'disable') {
      if (mode === 'admin') {
        generateAdminInstructions(action);
      } else if (mode === 'test') {
        generateTestInstructions(action);
      }
    } else {
      console.log(`Please specify 'enable' or 'disable' for ${mode} mode.`);
      printUsage();
    }
  } else {
    printUsage();
  }
  rl.close();
} else {
  console.log('Welcome to the Aya Game Protection Mode Helper');
  askForMode();
} 