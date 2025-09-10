import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    screenshot: 'on',
    headless: true,
    launchOptions: {
      logger: {
        isEnabled: (name, severity) => true,
        log: (name, severity, message, args) => {
          console.log(`${name} ${message}`);
        }
      }
    }
  },
});
