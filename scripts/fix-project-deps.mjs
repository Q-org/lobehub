/**
 * 修复所有 project.json - 只使用 dependencies 而不 devDependencies
 */

import { readdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();
const packagesDir = join(workspaceRoot, 'packages');

function getDirectories(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function getAllPackages() {
  const pkgs = [];
  getDirectories(packagesDir).forEach(name => {
    const pkgPath = join(packagesDir, name);
    if (existsSync(join(pkgPath, 'package.json'))) {
      pkgs.push({ name, path: pkgPath });
    }
  });
  const businessDir = join(packagesDir, 'business');
  if (existsSync(businessDir)) {
    getDirectories(businessDir).forEach(name => {
      const pkgPath = join(businessDir, name);
      if (existsSync(join(pkgPath, 'package.json'))) {
        pkgs.push({ name: `business/${name}`, path: pkgPath });
      }
    });
  }
  return pkgs;
}

function fixProjectJson(pkg) {
  const projectJsonPath = join(pkg.path, 'project.json');
  if (!existsSync(projectJsonPath)) return false;

  const pkgJson = JSON.parse(readFileSync(join(pkg.path, 'package.json'), 'utf8'));
  const projectJson = JSON.parse(readFileSync(projectJsonPath, 'utf8'));

  // 只使用 dependencies（不使用 devDependencies）
  const workspaceDeps = Object.entries(pkgJson.dependencies || {})
    .filter(([, v]) => v === 'workspace:*')
    .map(([k]) => `${k}:build`);

  // 更新 dependsOn
  if (projectJson.targets?.build) {
    if (workspaceDeps.length > 0) {
      projectJson.targets.build.dependsOn = workspaceDeps;
    } else {
      delete projectJson.targets.build.dependsOn;
    }
  }

  writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + '\n');
  console.log(`✅ Fixed ${pkgJson.name} (${workspaceDeps.length} deps)`);
  return true;
}

function main() {
  console.log('🔧 开始修复 project.json 循环依赖问题...\n');
  const packages = getAllPackages();
  let fixed = 0;
  packages.forEach(pkg => {
    if (fixProjectJson(pkg)) fixed++;
  });
  console.log(`\n✅ 修复完成！共修复 ${fixed} 个 project.json`);
}

main();
