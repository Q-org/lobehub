/**
 * 批量为所有包生成 tsconfig.json 和 project.json
 * 用法: node scripts/generate-all-package-configs.mjs
 */

// eslint-disable-next-line unicorn/import-style
import { readdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
// eslint-disable-next-line unicorn/import-style
import { join } from 'path';

const workspaceRoot = process.cwd();
const packagesDir = join(workspaceRoot, 'packages');

function getDirectories(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function getAllPackages() {
  const pkgs = [];

  getDirectories(packagesDir).forEach((name) => {
    const pkgPath = join(packagesDir, name);
    if (existsSync(join(pkgPath, 'package.json'))) {
      pkgs.push({ name, path: pkgPath, isBusiness: false });
    }
  });

  const businessDir = join(packagesDir, 'business');
  if (existsSync(businessDir)) {
    getDirectories(businessDir).forEach((name) => {
      const pkgPath = join(businessDir, name);
      if (existsSync(join(pkgPath, 'package.json'))) {
        pkgs.push({ name: `business/${name}`, path: pkgPath, isBusiness: true });
      }
    });
  }

  return pkgs;
}

function generateTsconfig(pkg) {
  const tsconfigPath = join(pkg.path, 'tsconfig.json');

  if (existsSync(tsconfigPath)) {
    console.log(`⏭️  Skip tsconfig.json for ${pkg.name} (exists)`);
    return false;
  }

  if (!existsSync(join(pkg.path, 'src'))) {
    console.log(`⏭️  Skip ${pkg.name} (no src/ directory)`);
    return false;
  }

  const depth = pkg.isBusiness ? '../../../..' : '../..';

  const tsconfig = {
    extends: `${depth}/tsconfig.json`,
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      composite: true,
      incremental: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts', 'tests'],
  };

  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  console.log(`✅ Created tsconfig.json for ${pkg.name}`);
  return true;
}

function readPackageJson(pkg) {
  const pkgJsonPath = join(pkg.path, 'package.json');
  return JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
}

function updatePackageJson(pkg) {
  const pkgJson = readPackageJson(pkg);
  const pkgJsonPath = join(pkg.path, 'package.json');

  if (pkgJson.scripts?.build) {
    console.log(`⏭️  Skip package.json update for ${pkg.name} (has build script)`);
    return false;
  }

  const hasIndex =
    existsSync(join(pkg.path, 'src/index.ts')) || existsSync(join(pkg.path, 'src/index.tsx'));

  if (!hasIndex) {
    console.log(`⏭️  Skip ${pkg.name} (no src/index.ts)`);
    return false;
  }

  pkgJson.scripts = pkgJson.scripts || {};
  pkgJson.scripts.build = 'tsc --project tsconfig.json';
  pkgJson.scripts.dev = 'tsc --watch --project tsconfig.json';
  pkgJson.scripts.clean = 'rm -rf dist';

  if (!pkgJson.main?.includes('/dist/') && !pkgJson.main?.includes('/src/')) {
    pkgJson.main = './dist/index.js';
  }

  if (!pkgJson.types?.includes('/dist/')) {
    pkgJson.types = './dist/index.d.ts';
  }

  writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
  console.log(`✅ Updated package.json for ${pkg.name}`);
  return true;
}

function generateProjectJson(pkg) {
  const projectJsonPath = join(pkg.path, 'project.json');

  if (existsSync(projectJsonPath)) {
    console.log(`⏭️  Skip project.json for ${pkg.name} (exists)`);
    return false;
  }

  const pkgJson = readPackageJson(pkg);

  // 只使用 dependencies，不使用 devDependencies（避免循环依赖）
  const workspaceDeps = Object.entries(pkgJson.dependencies || {})
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([_, v]) => v === 'workspace:*')
    .map(([k]) => k);

  const depth = pkg.isBusiness ? '../../../..' : '../..';
  const sourceRoot = pkg.isBusiness
    ? `packages/business/${pkg.name.replace('business/', '')}/src`
    : `packages/${pkg.name}/src`;

  const projectJson = {
    name: pkgJson.name,
    $schema: `${depth}/node_modules/nx/schemas/project-schema.json`,
    sourceRoot,
    projectType: 'library',
    targets: {
      build: {
        executor: 'nx:run-commands',
        options: {
          command: `pnpm exec tsc --project ${sourceRoot.replace('/src', '')}/tsconfig.json`,
        },
        outputs: [`{workspaceRoot}/${sourceRoot.replace('/src', '')}/dist`],
        cache: true,
        dependsOn:
          workspaceDeps.length > 0 ? workspaceDeps.map((dep) => `${dep}:build`) : undefined,
      },
      test: {
        executor: 'nx:run-commands',
        options: {
          command: `pnpm exec vitest run ${sourceRoot.replace('/src', '')}`,
        },
        cache: true,
        dependsOn: ['build'],
      },
      clean: {
        executor: 'nx:run-commands',
        options: {
          command: `rm -rf ${sourceRoot.replace('/src', '')}/dist`,
        },
      },
    },
    tags: [`scope:${pkgJson.name}`],
  };

  writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2) + '\n');
  console.log(`✅ Created project.json for ${pkgJson.name}`);
  return true;
}

function main() {
  console.log('🚀 开始批量生成包配置...\n');

  const packages = getAllPackages();
  console.log(`📦 找到 ${packages.length} 个包\n`);

  let tsconfigCount = 0;
  let packageJsonCount = 0;
  let projectJsonCount = 0;

  packages.forEach((pkg) => {
    console.log(`\n📁 处理 ${pkg.name}...`);

    if (generateTsconfig(pkg)) tsconfigCount++;
    if (updatePackageJson(pkg)) packageJsonCount++;
    if (generateProjectJson(pkg)) projectJsonCount++;
  });

  console.log('\n\n✅ 完成！');
  console.log(`📊 统计:`);
  console.log(`   - tsconfig.json: ${tsconfigCount} 个`);
  console.log(`   - package.json 更新: ${packageJsonCount} 个`);
  console.log(`   - project.json: ${projectJsonCount} 个`);
}

main();
