import { spawnSync } from 'node:child_process';

const args = ['playwright', 'install'];
if (process.env.CI) {
  args.push('--with-deps');
}
args.push('chromium');

const result = spawnSync('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: '0',
  },
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
  process.exit(1);
}

process.exit(typeof result.status === 'number' ? result.status : 1);
