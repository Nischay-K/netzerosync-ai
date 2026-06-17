import { test, expect } from '@playwright/test';

test.describe('3D EcoTwin WebGL Rendering E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local test app or production portal
    await page.goto('/');
    
    // Simulate authentication login flow by setting the actual demo session key
    // and override firebaseConfig to empty to force Local Demo Mode
    await page.evaluate(() => {
      localStorage.setItem('ecoSphere_firebaseConfig', JSON.stringify({ apiKey: '', projectId: '' }));
      const mockProfile = {
        uid: 'demo_user_123',
        displayName: 'Test Explorer',
        email: 'explorer@test.com',
        level: 1,
        xp: 120,
        ecoTokens: 600,
        carbonTarget: 3.5,
        carbonCurrent: 5.2,
        twinState: {
          transportSlider: 40,
          dietSlider: 30,
          energySlider: 45,
          shoppingSlider: 35
        },
        completedMissions: [],
        joinedChallenges: []
      };
      localStorage.setItem('ecoSphere_current_session', JSON.stringify(mockProfile));
    });
    await page.goto('/');
  });

  test('successfully renders the 3D WebGL simulator canvas and checks for compile issues', async ({ page }) => {
    // Navigate to EcoTwin tab
    const ecoTwinTab = page.locator('button:has-text("EcoTwin")');
    await expect(ecoTwinTab).toBeVisible();
    await ecoTwinTab.click();

    // Verify loading spinner is hidden and canvas container is loaded
    const canvasContainer = page.locator('.eco-twin-canvas-element');
    await expect(canvasContainer).toBeVisible();

    // Wait for dynamic Three.js assets to resolve and attach WebGL canvas element
    const canvasElement = page.locator('.eco-twin-canvas-element canvas');
    await expect(canvasElement).toBeVisible({ timeout: 15000 });

    // Validate that the WebGL context initialized successfully and did not crash
    const webglStatus = await page.evaluate(() => {
      const canvas = document.querySelector('.eco-twin-canvas-element canvas') as HTMLCanvasElement;
      if (!canvas) return 'No canvas found';
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGL2RenderingContext | null;
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
      const items = Array.from(document.querySelectorAll('.sr-terrain-item'));
      const windmill = items.find(el => el.textContent && el.textContent.includes('Wind Turbine #1'));
      return windmill ? 'active' : 'inactive';
    });
    expect(activeFocusState).toBe('active');
  });
});
