import { test, expect } from '@playwright/test';

test.describe('Responsive Layout & Geometry Validation (/ui/code-generation)', () => {
  const targetRoute = '/ui/code-generation';

  test('2.1 Widescreen Desktop Viewport (1920x1080) validates fluid expansion and side-by-side placement', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(targetRoute, { waitUntil: 'networkidle' });

    const category = page.locator('.ui-command-category');
    await expect(category).toBeVisible();

    const categoryBox = await category.boundingBox();
    expect(categoryBox).not.toBeNull();
    // Fluid expansion: category occupies >= 90% of available viewport width
    expect(categoryBox!.width).toBeGreaterThanOrEqual(1920 * 0.9);

    // Verify zero horizontal page scroll
    const isHorizontalScrollFree = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isHorizontalScrollFree).toBe(true);

    // Verify two-column layout: sidebar on left, detail on right
    const sidebar = page.locator('.ui-command-category__command-list');
    const detail = page.locator('.ui-command-category__detail-panel');
    await expect(sidebar).toBeVisible();
    await expect(detail).toBeVisible();

    const sidebarBox = await sidebar.boundingBox();
    const detailBox = await detail.boundingBox();
    expect(sidebarBox).not.toBeNull();
    expect(detailBox).not.toBeNull();
    expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(detailBox!.x + 4);

    // Verify Before and After comparison cards sit side-by-side
    const stateGrid = page.locator('.ui-command-category__state-grid');
    const stateCards = stateGrid.locator('> section');
    await expect(stateCards).toHaveCount(2);

    const beforeCardBox = await stateCards.nth(0).boundingBox();
    const afterCardBox = await stateCards.nth(1).boundingBox();
    expect(beforeCardBox).not.toBeNull();
    expect(afterCardBox).not.toBeNull();

    // Side-by-side horizontal alignment
    expect(Math.abs(beforeCardBox!.y - afterCardBox!.y)).toBeLessThanOrEqual(4);
    expect(beforeCardBox!.x + beforeCardBox!.width).toBeLessThanOrEqual(afterCardBox!.x + 4);

    // Apply command to render and verify visualizer placement
    const applyButton = page.locator('.ui-command-category__apply-button');
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // Verify command visualizer spans full width below the comparison cards
    const visualizer = page.locator('app-command-visualizer.ui-command-category__visualization');
    await expect(visualizer).toBeVisible();

    const visualizerBox = await visualizer.boundingBox();
    const stateGridBox = await stateGrid.boundingBox();
    expect(visualizerBox).not.toBeNull();
    expect(stateGridBox).not.toBeNull();

    // Visualizer width spans the entire grid track
    expect(Math.abs(visualizerBox!.width - stateGridBox!.width)).toBeLessThanOrEqual(4);
    // Visualizer is placed strictly below the comparison cards
    const bottomOfCards = Math.max(
      beforeCardBox!.y + beforeCardBox!.height,
      afterCardBox!.y + afterCardBox!.height,
    );
    expect(visualizerBox!.y).toBeGreaterThanOrEqual(bottomOfCards - 4);
  });

  test('2.2 Standard Laptop Viewport (1280x720) validates responsive fit and zero overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(targetRoute, { waitUntil: 'networkidle' });

    const category = page.locator('.ui-command-category');
    await expect(category).toBeVisible();

    const categoryBox = await category.boundingBox();
    expect(categoryBox).not.toBeNull();
    // Fluid expansion: category occupies >= 90% of available viewport width
    expect(categoryBox!.width).toBeGreaterThanOrEqual(1280 * 0.9);

    // Verify zero horizontal page scroll
    const isHorizontalScrollFree = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isHorizontalScrollFree).toBe(true);

    // Side-by-side sidebar and detail
    const sidebar = page.locator('.ui-command-category__command-list');
    const detail = page.locator('.ui-command-category__detail-panel');
    const sidebarBox = await sidebar.boundingBox();
    const detailBox = await detail.boundingBox();
    expect(sidebarBox!.x + sidebarBox!.width).toBeLessThanOrEqual(detailBox!.x + 4);

    // Side-by-side Before/After cards
    const stateCards = page.locator('.ui-command-category__state-grid > section');
    const beforeCardBox = await stateCards.nth(0).boundingBox();
    const afterCardBox = await stateCards.nth(1).boundingBox();
    expect(Math.abs(beforeCardBox!.y - afterCardBox!.y)).toBeLessThanOrEqual(4);
    expect(beforeCardBox!.x + beforeCardBox!.width).toBeLessThanOrEqual(afterCardBox!.x + 4);
  });

  test('2.3 Tablet Viewport (768x1024) validates responsive vertical stacking below 860px breakpoint', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(targetRoute, { waitUntil: 'networkidle' });

    // Verify zero horizontal page scroll
    const isHorizontalScrollFree = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isHorizontalScrollFree).toBe(true);

    const sidebar = page.locator('.ui-command-category__command-list');
    const detail = page.locator('.ui-command-category__detail-panel');
    const sidebarBox = await sidebar.boundingBox();
    const detailBox = await detail.boundingBox();

    // In stacked mode, sidebar is positioned vertically above detail panel
    expect(sidebarBox!.y + sidebarBox!.height).toBeLessThanOrEqual(detailBox!.y + 4);

    // Sidebar position is static, not sticky
    const sidebarPosition = await sidebar.evaluate((el) => window.getComputedStyle(el).position);
    expect(sidebarPosition).toBe('static');

    // Before and After comparison cards stack vertically
    const stateCards = page.locator('.ui-command-category__state-grid > section');
    const beforeCardBox = await stateCards.nth(0).boundingBox();
    const afterCardBox = await stateCards.nth(1).boundingBox();
    expect(beforeCardBox!.y + beforeCardBox!.height).toBeLessThanOrEqual(afterCardBox!.y + 4);
  });

  test('2.4 Mobile Viewport (375x667) validates single-column flow with zero horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(targetRoute, { waitUntil: 'networkidle' });

    // Verify zero horizontal page scroll
    const isHorizontalScrollFree = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isHorizontalScrollFree).toBe(true);

    const category = page.locator('.ui-command-category');
    await expect(category).toBeVisible();

    const categoryBox = await category.boundingBox();
    expect(categoryBox).not.toBeNull();
    expect(categoryBox!.width).toBeLessThanOrEqual(375);

    // Verify components stack vertically
    const sidebar = page.locator('.ui-command-category__command-list');
    const detail = page.locator('.ui-command-category__detail-panel');
    const sidebarBox = await sidebar.boundingBox();
    const detailBox = await detail.boundingBox();
    expect(sidebarBox!.y).toBeLessThan(detailBox!.y);
  });

  test('2.5 Dynamic Command Execution Interaction validates full-width visualizer update without layout shift', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(targetRoute, { waitUntil: 'networkidle' });

    const applyButton = page.locator('.ui-command-category__apply-button');
    await expect(applyButton).toBeVisible();
    await applyButton.click();

    // Verify live visualizer sandbox rendered
    const sandbox = page.locator('.command-visualizer__sandbox');
    await expect(sandbox).toBeVisible();

    // Verify visualizer maintains full width alignment after state change
    const visualizer = page.locator('app-command-visualizer.ui-command-category__visualization');
    const stateGrid = page.locator('.ui-command-category__state-grid');
    const visualizerBox = await visualizer.boundingBox();
    const stateGridBox = await stateGrid.boundingBox();

    expect(Math.abs(visualizerBox!.width - stateGridBox!.width)).toBeLessThanOrEqual(4);

    // Verify zero horizontal overflow after dynamic update
    const isHorizontalScrollFree = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= window.innerWidth;
    });
    expect(isHorizontalScrollFree).toBe(true);
  });
});
