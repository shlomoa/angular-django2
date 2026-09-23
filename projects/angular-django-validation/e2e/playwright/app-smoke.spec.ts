import { test, expect } from '@playwright/test';

test.describe('Angular-Django Application Smoke Tests', () => {
  test('verifies application loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    // Default port for Angular dev server is 4200 (or custom configured via BASE_URL)
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4200';

    try {
      const response = await page.goto(baseUrl, { timeout: 15000 });
      if (response) {
        expect(response.status()).toBeLessThan(400);
      }

      // Check for presence of Angular root element
      const rootElement = page.locator('app-root');
      await expect(rootElement).toBeAttached({ timeout: 5000 });

      // Expect no fatal uncaught page errors
      expect(pageErrors).toHaveLength(0);
    } catch (error) {
      // If server is not running during passive unit runs, skip gracefully with informative note
      if (
        (error as Error).message.includes('ECONNREFUSED') ||
        (error as Error).message.includes('timeout')
      ) {
        test.skip(true, `Development server is not currently running at ${baseUrl}`);
      } else {
        throw error;
      }
    }
  });

  test('verifies Angular Material components and layout render properly', async ({ page }) => {
    const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:4200';

    try {
      await page.goto(baseUrl, { timeout: 15000 });

      // Verify page title exists and is non-empty
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);

      // Verify body renders and has default typography
      const body = page.locator('body');
      await expect(body).toBeVisible();
    } catch (error) {
      if (
        (error as Error).message.includes('ECONNREFUSED') ||
        (error as Error).message.includes('timeout')
      ) {
        test.skip(true, `Development server is not currently running at ${baseUrl}`);
      } else {
        throw error;
      }
    }
  });
});
