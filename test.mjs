#!/usr/bin/env bun

// Запускаем тесты с исключениями для e2e и spec файлов
const { spawn } = await import('child_process');
const { promisify } = await import('util');

const exec = promisify(spawn);

async function runTests() {
  try {
    const result = await exec('bun', [
      'test',
      '--path-ignore-patterns=**/packages/e2e/**',
      '--path-ignore-patterns=**/*.spec.ts'
    ], {
      stdio: 'inherit',
      shell: true
    });
    
    process.exit(result.status || 0);
  } catch (error) {
    process.exit(error.status || 1);
  }
}

runTests();
