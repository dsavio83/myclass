#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Vercel Build Diagnostic Tool');
console.log('================================');

// Check current working directory
console.log('\n📁 Current working directory:', process.cwd());

// List files in current directory
console.log('\n📋 Files in current directory:');
try {
    const files = fs.readdirSync('.');
    files.forEach(file => {
        const stats = fs.statSync(file);
        console.log(`  ${file} ${stats.isDirectory() ? '[DIR]' : '[FILE]'}`);
    });
} catch (error) {
    console.error('❌ Error reading directory:', error.message);
}

// Check for package.json
console.log('\n📦 Checking for package.json:');
if (fs.existsSync('./package.json')) {
    console.log('✅ package.json found');
    try {
        const packageContent = fs.readFileSync('./package.json', 'utf8');
        console.log('📄 package.json content length:', packageContent.length, 'bytes');
        
        // Check if it's valid JSON
        const packageJson = JSON.parse(packageContent);
        console.log('📄 package.json name:', packageJson.name);
        console.log('📄 package.json version:', packageJson.version);
        console.log('📄 package.json scripts:', Object.keys(packageJson.scripts || {}));
    } catch (error) {
        console.error('❌ Error parsing package.json:', error.message);
    }
} else {
    console.log('❌ package.json NOT found');
}

// Check for node_modules
console.log('\n📦 Checking for node_modules:');
if (fs.existsSync('./node_modules')) {
    console.log('✅ node_modules directory found');
    try {
        const modules = fs.readdirSync('./node_modules');
        console.log('📦 Number of dependencies:', modules.length);
    } catch (error) {
        console.error('❌ Error reading node_modules:', error.message);
    }
} else {
    console.log('❌ node_modules directory NOT found');
}

console.log('\n🔍 Diagnostic completed');