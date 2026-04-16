import { spawnSync } from 'node:child_process';

const ciLikeMode = process.argv.includes('--ci');

const result = spawnSync('npx', ['playwright', 'test'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: '0',
    ...(ciLikeMode ? { PW_JSON_REPORT: '1' } : {}),
  },
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
