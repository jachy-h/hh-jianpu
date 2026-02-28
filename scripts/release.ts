#!/usr/bin/env tsx
/**
 * Release script for hh-jianpu
 * Usage: tsx scripts/release.ts [patch|minor|major] [version]
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

function log(color: string, message: string) {
  console.log(`${color}${message}${NC}`);
}

function runCommand(cmd: string, cwd?: string) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf-8' });
  } catch (error) {
    console.error('Command failed:', cmd);
    throw error;
  }
}

function updateVersionInFile(filePath: string, oldVersion: string, newVersion: string) {
  const content = readFileSync(filePath, 'utf-8');
  const updated = content.replace(
    `"version": "${oldVersion}"`,
    `"version": "${newVersion}"`
  );
  writeFileSync(filePath, updated);
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  return [parts[0], parts[1], parts[2]];
}

function calculateNewVersion(
  currentVersion: string,
  versionType: 'patch' | 'minor' | 'major'
): string {
  const [major, minor, patch] = parseVersion(currentVersion);
  
  switch (versionType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updateChangelog(newVersion: string) {
  const today = new Date().toISOString().split('T')[0];
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  let content = readFileSync(changelogPath, 'utf-8');
  
  // Find Unreleased section and move it to new version
  const unreleasedMatch = content.match(/## \[Unreleased\]\n\n([\s\S]*?)(?=\n## \[|$)/);
  const unreleasedContent = unreleasedMatch ? unreleasedMatch[1] : '';
  
  // Build new changelog
  let newContent = content.replace(
    /## \[Unreleased\]\n\n/,
    `## [Unreleased]\n\n## [${newVersion}] - ${today}\n\n${unreleasedContent}`
  );
  
  writeFileSync(changelogPath, newContent);
}

async function main() {
  const args = process.argv.slice(2);
  const versionType = (args[0] as 'patch' | 'minor' | 'major') || 'patch';
  const explicitVersion = args[1];

  log(GREEN, '📦 Starting release process...');
  console.log();

  // 1. Check workspace status
  try {
    const status = runCommand('git status --porcelain').trim();
    if (status) {
      log(YELLOW, '⚠️  Working directory has uncommitted changes');
      console.log(status);
      const readline = await import('readline').then(rl => rl.createInterface({
        input: process.stdin,
        output: process.stdout
      }));
      const answer = await new Promise<string>(resolve => {
        readline.question('Continue anyway? (y/N) ', resolve);
      });
      readline.close();
      if (!answer.toLowerCase().startsWith('y')) {
        log(RED, '❌ Release cancelled');
        process.exit(1);
      }
    }
  } catch (error) {
    // Git not available or not a repo
  }

  // 2. Get current version
  const rootPackage = JSON.parse(readFileSync('package.json', 'utf-8'));
  const currentVersion = rootPackage.version;
  log(GREEN, `📌 Current version: ${currentVersion}`);

  // 3. Calculate new version
  const newVersion = explicitVersion || calculateNewVersion(currentVersion, versionType);
  log(GREEN, `🎯 New version: ${newVersion}`);
  console.log();

  // 4. Confirm release
  const readline = await import('readline').then(rl => rl.createInterface({
    input: process.stdin,
    output: process.stdout
  }));
  const confirm = await new Promise<string>(resolve => {
    readline.question(`Confirm release version ${newVersion}? (y/N) `, resolve);
  });
  readline.close();
  
  if (!confirm.toLowerCase().startsWith('y')) {
    log(RED, '❌ Release cancelled');
    process.exit(1);
  }
  console.log();

  // 5. Update versions
  log(GREEN, '🔧 Updating version numbers...');
  updateVersionInFile('package.json', currentVersion, newVersion);
  updateVersionInFile('packages/core/package.json', currentVersion, newVersion);
  updateVersionInFile('apps/web/package.json', currentVersion, newVersion);
  log(GREEN, '✅ Version numbers updated');
  console.log();

  // 6. Update CHANGELOG
  log(GREEN, '📝 Updating CHANGELOG...');
  updateChangelog(newVersion);
  log(GREEN, '✅ CHANGELOG updated');
  console.log();

  // 7. Run tests
  log(GREEN, '🧪 Running tests...');
  try {
    runCommand('pnpm test -- --run', 'packages/core');
    log(GREEN, '✅ Tests passed');
  } catch (error) {
    log(RED, '❌ Tests failed');
    throw error;
  }
  console.log();

  // 8. Build
  log(GREEN, '🏗️  Building project...');
  runCommand('pnpm build');
  log(GREEN, '✅ Build completed');
  console.log();

  // 9. Git commit and tag
  log(GREEN, '📤 Committing changes...');
  runCommand('git add .');
  runCommand(`git commit -m "chore: release v${newVersion}"`);
  runCommand(`git tag "v${newVersion}"`);
  log(GREEN, '✅ Git commit created');
  console.log();

  // 10. Done
  log(GREEN, `🎉 Version ${newVersion} released successfully!`);
  console.log();
  log(GREEN, '📋 Next steps:');
  console.log('   1. Push code: git push origin main');
  console.log(`   2. Push tags: git push origin v${newVersion}`);
  console.log();
}

main().catch(error => {
  log(RED, `❌ Error: ${error.message}`);
  process.exit(1);
});
