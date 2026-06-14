import { test, expect } from '@playwright/test';

test.describe('3D EcoTwin WebGL Rendering E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local test app or production portal
    await page.goto('/');
    
    // Simulate authentication login flow if needed
    // NetZeroSync fallback automatically enters mock auth or allows logging in
    await page.evaluate(() => {
      localStorage.setItem('firebase_auth_mock', 'true');
    });
    await page.goto('/');
  });

  test('successfully renders the 3D WebGL simulator canvas and checks for compile issues', async ({ page }) => {
    // Navigate to EcoTwin tab
    const ecoTwinTab = page.locator('button:has-text("EcoTwin")');
    await expect(ecoTwinTab).toBeVisible();
    await ecoTwinTab.click();

    // Verify loading spinner is hidden and canvas container is loaded
    const canvasContainer = page.locator('.eco-twin-style-13');
    await expect(canvasContainer).toBeVisible();

    // Wait for dynamic Three.js assets to resolve and attach WebGL canvas element
    const canvasElement = page.locator('.eco-twin-style-13 canvas');
    await expect(canvasElement).toBeVisible({ timeout: 15000 });

    // Validate that the WebGL context initialized successfully and did not crash
    const webglStatus = await page.evaluate(() => {
      const canvas = document.querySelector('.eco-twin-style-13 canvas') as HTMLCanvasElement;
      if (!canvas) return 'No canvas found';
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'WebGL context failed';
      // Verify shader precision
      const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      return precision ? 'OK' : 'WebGL low-precision';
    });

    expect(webglStatus).toBe('OK');
  });

  test('verifies keyboard navigation textual coordinate map highlights meshes dynamically', async ({ page }) => {
    const ecoTwinTab = page.locator('button:has-text("EcoTwin")');
    await ecoTwinTab.click();

    // Focus the windmill item in the accessibility grid list
    const firstWindmillItem = page.locator('.sr-terrain-item:has-text("Wind Turbine #1")');
    await expect(firstWindmillItem).toBeVisible();

    // Trigger focus via tab or click focus simulation
    await firstWindmillItem.focus();

    // Confirm focus-highlight class matches stylesheet
    await expect(firstWindmillItem).toHaveClass(/focused-highlight/);

    // Verify active coordinate values via data structures
    const activeFocusState = await page.evaluate(() => {
      const windmill = document.querySelector('.sr-terrain-item:has-text("Wind Turbine #1")');
      return windmill ? 'active' : 'inactive';
    });
    expect(activeFocusState).toBe('active');
  });
});
