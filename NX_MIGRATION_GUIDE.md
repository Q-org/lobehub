# LobeHub 渐进式集成 Nx 指南

## 📋 方案概述

采用 **Nx + pnpm** 混合模式：

- **保留** pnpm workspace 管理包依赖
- **添加** Nx 作为任务运行器和缓存层
- **目标**：加速构建、减少重复工作

---

## 🎯 集成后的收益

| 功能         | 说明                 | 预期效果            |
| ------------ | -------------------- | ------------------- |
| **任务缓存** | 缓存构建 / 测试结果  | 重复构建提速 70-90% |
| **依赖图**   | 可视化项目依赖关系   | 清晰了解包依赖      |
| **影响分析** | 只构建变更影响的包   | CI 提速 50%+        |
| **并行执行** | 智能并行任务         | 多核利用最大化      |
| **远程缓存** | 团队共享缓存（可选） | 团队协作加速        |

---

## 🚀 实施步骤

### 阶段 1：安装 Nx（影响最小）

```bash
# 1. 安装 Nx 作为开发依赖
pnpm add -D nx @nx/js @nx/vite -w

# 2. 初始化 Nx（保留 pnpm workspace）
npx nx init
```

**初始化时选择**：

- ❌ 不转换现有包结构
- ✅ 仅添加任务缓存

---

### 阶段 2：创建 nx.json 配置

创建 `nx.json`：

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/*.test.{ts,tsx}",
      "!{projectRoot}/**/*.spec.{ts,tsx}",
      "!{projectRoot}/tests/**/*",
      "!{projectRoot}/**/?(*.)test-setup.[jt]s"
    ],
    "sharedGlobals": ["{workspaceRoot}/tsconfig.json", "{workspaceRoot}/package.json"]
  },
  "nxCloudAccessToken": "",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default"],
      "cache": true
    },
    "type-check": {
      "inputs": ["default", "^production"],
      "cache": true
    }
  }
}
```

---

### 阶段 3：为核心包创建 project.json

#### 示例 1: `packages/database/project.json`

```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "@lobechat/database",
  "projectType": "library",
  "sourceRoot": "packages/database/src",
  "tags": ["scope:database", "type:library"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec tsc --project packages/database/tsconfig.json",
        "cwd": "."
      },
      "outputs": ["{workspaceRoot}/packages/database/dist"]
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec vitest run --silent='passed-only' packages/database",
        "cwd": "."
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec eslint packages/database/src",
        "cwd": "."
      }
    }
  }
}
```

#### 示例 2: `packages/utils/project.json`

```json
{
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "name": "@lobechat/utils",
  "projectType": "library",
  "sourceRoot": "packages/utils/src",
  "tags": ["scope:utils", "type:library"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec tsc --project packages/utils/tsconfig.json"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec vitest run --silent='passed-only' packages/utils"
      }
    }
  }
}
```

#### 示例 3: 根应用 `project.json`

```json
{
  "$schema": "./node_modules/nx/schemas/project-schema.json",
  "name": "@lobehub/lobehub",
  "projectType": "application",
  "tags": ["type:application", "scope:root"],
  "targets": {
    "build:spa": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm run build:spa:raw"
      },
      "dependsOn": ["@lobechat/database:build", "@lobechat/utils:build"],
      "inputs": ["production", "^production"],
      "cache": true,
      "outputs": ["{workspaceRoot}/public/_spa"]
    },
    "build:next": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm run build:next:raw"
      },
      "dependsOn": ["build:spa"],
      "cache": true,
      "outputs": ["{workspaceRoot}/.next"]
    },
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm run build"
      },
      "dependsOn": ["build:spa", "build:next"]
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm exec vitest run --silent='passed-only'"
      }
    },
    "type-check": {
      "executor": "nx:run-commands",
      "options": {
        "command": "pnpm run type-check"
      }
    }
  }
}
```

---

### 阶段 4：验证缓存效果

#### 1. 查看依赖图

```bash
npx nx graph
```

这会打开浏览器显示完整的项目依赖关系图。

#### 2. 首次构建（无缓存）

```bash
npx nx build @lobehub/lobehub
```

#### 3. 第二次构建（使用缓存）

```bash
npx nx build @lobehub/lobehub
```

应该显示 `[Nx Read the output cache]` 并从缓存恢复。

#### 4. 查看缓存统计

```bash
npx nx show projects --with-target build
npx nx run-many --target=build --all --dry-run
```

#### 5. 清理缓存

```bash
npx nx reset
```

---

## 🔧 常用 Nx 命令

| 命令                                   | 说明                   |
| -------------------------------------- | ---------------------- |
| `npx nx graph`                         | 查看项目依赖图         |
| `npx nx build <project>`               | 构建指定项目（含依赖） |
| `npx nx test <project>`                | 测试指定项目           |
| `npx nx affected --target=build`       | 只构建受影响的包       |
| `npx nx affected --target=test`        | 只测试受影响的包       |
| `npx nx run-many --target=build --all` | 构建所有项目           |
| `npx nx show projects`                 | 列出所有项目           |
| `npx nx reset`                         | 清理缓存               |

---

## 📝 自动化生成 project.json 脚本

对于 65+ 个包，建议创建脚本自动生成：

```bash
# scripts/generate-nx-projects.mjs
import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const packagesDir = join(process.cwd(), 'packages');
const packages = readdirSync(packagesDir);

packages.forEach((pkg) => {
  const pkgPath = join(packagesDir, pkg);
  const pkgJsonPath = join(pkgPath, 'package.json');

  if (!existsSync(pkgJsonPath)) return;

  const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));

  const projectJson = {
    name: pkgJson.name,
    $schema: "../../node_modules/nx/schemas/project-schema.json",
    sourceRoot: `packages/${pkg}/src`,
    projectType: "library",
    targets: {
      build: {
        executor: "nx:run-commands",
        options: {
          command: `pnpm exec tsc --project packages/${pkg}/tsconfig.json`
        }
      },
      test: {
        executor: "nx:run-commands",
        options: {
          command: `pnpm exec vitest run --silent='passed-only' packages/${pkg}`
        }
      }
    },
    tags: [`scope:${pkg}`]
  };

  writeFileSync(
    join(pkgPath, 'project.json'),
    JSON.stringify(projectJson, null, 2)
  );

  console.log(`✅ Created project.json for ${pkgJson.name}`);
});
```

运行：

```bash
node scripts/generate-nx-projects.mjs
```

---

## ⚡ CI/CD 集成示例

### GitHub Actions

```yaml
name: CI

on:
  pull_request:
    branches: [canary]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Nx 需要完整 git 历史

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      # Nx 缓存
      - uses: nrwl/nx-set-shas@v4

      - name: Install dependencies
        run: pnpm install

      # 只构建受影响的包
      - name: Build affected
        run: npx nx affected --target=build --parallel=3

      # 只测试受影响的包
      - name: Test affected
        run: npx nx affected --target=test --parallel=3
```

---

## 🔍 缓存调优

### 1. 配置缓存路径

在 `nx.json` 中添加：

```json
{
  "cacheDirectory": ".nx/cache",
  "defaultBase": "canary"
}
```

### 2. 忽略不需要缓存的文件

在 `.nxignore` 中添加：

```
node_modules/
.git/
.vscode/
*.md
```

### 3. 查看缓存命中率

```bash
npx nx run-many --target=build --all --verbose
```

---

## ⚠️ 注意事项

1. **保留 pnpm workspace**：不删除 `pnpm-workspace.yaml`
2. **兼容现有脚本**：`package.json` 中的 scripts 保持不变
3. **渐进采用**：先为核心包添加 Nx，逐步扩展
4. **缓存清理**：定期运行 `npx nx reset` 避免缓存膨胀
5. **团队协作**：可将 `.nx/cache` 加入 `.gitignore`

---

## 📚 参考资源

- [Nx 官方文档](https://nx.dev)
- [Nx + pnpm 混合工作区](https://nx.dev/recipes/tips-n-tricks/advanced-update)
- [Nx 缓存配置](https://nx.dev/features/cache-task-results)

---

## 🎯 推荐实施顺序

```
1. 安装 Nx（1天）
   ↓
2. 创建 nx.json（1天）
   ↓
3. 为核心包添加 project.json（3-5天）
   - @lobechat/types
   - @lobechat/utils
   - @lobechat/const
   - @lobechat/database
   ↓
4. 验证缓存效果（1天）
   ↓
5. 扩展到其他包（按需）
   ↓
6. CI/CD 集成（1-2天）
```

**总计**：约 1-2 周完成核心集成

---

## 💡 预期效果

| 指标         | 当前     | 集成 Nx 后       |
| ------------ | -------- | ---------------- |
| 完整构建时间 | \~10 min | \~10 min（首次） |
| 重复构建时间 | \~10 min | **1-3 min** ⚡   |
| CI 构建时间  | \~10 min | **3-5 min** ⚡   |
| 依赖可视化   | ❌       | ✅               |
| 影响分析     | ❌       | ✅               |
