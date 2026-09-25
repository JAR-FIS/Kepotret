import { spawnSync } from 'node:child_process';
import {
  access,
  mkdtemp,
  readdir,
  readFile,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const contractPath = path.resolve('contracts/openapi/Kepotret_OpenAPI_v1_Baseline.yaml');
const generatedPath = path.resolve('src/lib/api/generated');
const browserBarrelPath = path.resolve('src/lib/api/browser.ts');
const orvalEntry = path.resolve('node_modules/orval/dist/bin/orval.mjs');
const orvalConfig = path.resolve('orval.config.ts');

async function assertFileExists(filePath, label) {
  try {
    await access(filePath);
  } catch {
    throw new Error(`${label} is missing: ${filePath}`);
  }
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function snapshot(directory) {
  const files = await listFiles(directory);
  return new Map(
    await Promise.all(
      files.map(async (file) => [file, await readFile(path.join(directory, file))]),
    ),
  );
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

async function validateBrowserBarrel(temporaryGeneratedPath) {
  const barrelContents = await readFile(browserBarrelPath, 'utf8');
  const exportedModules = [
    ...barrelContents.matchAll(
      /^\s*export\s+\*\s+from\s+(['"])([^'"]+)\1\s*;?\s*$/gm,
    ),
  ].map((match) => match[2]);

  if (exportedModules.some((modulePath) => modulePath.split('/').includes('internal'))) {
    throw new Error(
      'Browser API barrel must not expose generated internal API modules.',
    );
  }

  const duplicateExports = exportedModules.filter(
    (modulePath, index) => exportedModules.indexOf(modulePath) !== index,
  );

  if (duplicateExports.length > 0) {
    throw new Error(
      `Browser API barrel contains duplicate exports: ${duplicateExports.join(', ')}`,
    );
  }

  const expectedModules = (await listFiles(temporaryGeneratedPath))
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .filter((file) => !toPosixPath(file).split('/').includes('internal'))
    .map((file) => `./generated/${toPosixPath(file).replace(/\.ts$/, '')}`)
    .sort();
  const actualModules = [...exportedModules].sort();

  if (JSON.stringify(expectedModules) !== JSON.stringify(actualModules)) {
    throw new Error(
      [
        'Browser API barrel drift detected.',
        `Expected: ${expectedModules.join(', ')}`,
        `Found: ${actualModules.join(', ')}`,
      ].join('\n'),
    );
  }
}

try {
  await assertFileExists(contractPath, 'Authoritative OpenAPI contract');
  await assertFileExists(generatedPath, 'Generated API output');
  await assertFileExists(browserBarrelPath, 'Browser API barrel');
  await assertFileExists(orvalEntry, 'Orval executable');

  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), 'kepotret-openapi-check-'),
  );
  const temporaryGeneratedPath = path.join(temporaryRoot, 'generated');

  try {
    const generation = spawnSync(
      process.execPath,
      [orvalEntry, '--config', orvalConfig],
      {
        env: {
          ...process.env,
          ORVAL_OUTPUT_DIR: temporaryGeneratedPath,
        },
        stdio: 'inherit',
      },
    );

    if (generation.status !== 0) {
      throw new Error(
        `OpenAPI generation failed with exit code ${generation.status ?? 1}.`,
      );
    }

    const [expected, actual] = await Promise.all([
      snapshot(temporaryGeneratedPath),
      snapshot(generatedPath),
    ]);
    const differences = new Set([...expected.keys(), ...actual.keys()]);

    for (const file of differences) {
      const expectedContents = expected.get(file);
      const actualContents = actual.get(file);

      if (
        !expectedContents ||
        !actualContents ||
        !expectedContents.equals(actualContents)
      ) {
        throw new Error(`Generated API drift detected: ${file}`);
      }
    }

    await validateBrowserBarrel(temporaryGeneratedPath);

    console.log('OpenAPI generated client is fresh.');
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
