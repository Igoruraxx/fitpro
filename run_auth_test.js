const { execSync } = require('child_process');
try {
  const result = execSync('pnpm run test server/auth.login.test.ts', { stdio: 'pipe', encoding: 'utf-8' });
  console.log(result);
} catch (e) {
  console.error(e.output.join('\n'));
}
