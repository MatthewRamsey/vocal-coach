const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({ testDir: './e2e', use: { baseURL: 'http://127.0.0.1:3000', screenshot: 'only-on-failure' }, webServer: { command: 'npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: true }, reporter: 'line' });
