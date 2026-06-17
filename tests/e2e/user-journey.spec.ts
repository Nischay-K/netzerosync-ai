import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('NetZeroSync AI Full User Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local test app or production portal
    await page.goto('/');
    
    // Simulate authentication login flow without onboarding setup, in sandbox mode
    await page.evaluate(() => {
      localStorage.setItem('ecoSphere_firebaseConfig', JSON.stringify({ apiKey: '', projectId: '' }));
      const mockProfile = {
        uid: 'demo_user_123',
        displayName: 'Journey Explorer',
        email: 'journey@test.com',
        level: 1,
        xp: 120,
        ecoTokens: 600,
        // carbonTarget and twinState are undefined to trigger onboarding
        completedMissions: [],
        joinedChallenges: []
      };
      localStorage.setItem('ecoSphere_current_session', JSON.stringify(mockProfile));
    });
    await page.goto('/');
  });

  test('walks through onboarding, views dashboard, browses quests, and purchases carbon offsets', async ({ page }) => {
    // Perform WCAG 2.1 AA Accessibility audit on the Onboarding route
    const onboardingA11yResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();
    expect(onboardingA11yResults.violations).toEqual([]);

    // 1. Onboarding Questionnaire Flow
    // Step 1: Transportation habits
    await expect(page.locator('h2.onboarding-style-4')).toHaveText('Calculate Your Baseline');
    await expect(page.locator('h3.onboarding-style-12')).toContainText('Transportation Habits');
    
    // Click on one of the custom button choices (e.g. Electric Car)
    const electricCarOption = page.locator('div.onboarding-style-15:has-text("Electric Car")');
    await expect(electricCarOption).toBeVisible();
    await electricCarOption.click();
    
    // Proceed to Step 2
    const nextBtn = page.locator('button:has-text("Next Step")');
    await nextBtn.click();

    // Step 2: Diet & Consumption
    const vegetarianOption = page.locator('div.onboarding-style-28:has-text("Vegetarian")');
    await expect(vegetarianOption).toBeVisible();
    await vegetarianOption.click();
    await nextBtn.click();

    // Step 3: Energy usage
    const solarOption = page.locator('div.onboarding-style-41:has-text("100% Solar")');
    await expect(solarOption).toBeVisible();
    await solarOption.click();
    await nextBtn.click();

    // Step 4: Shopping habits
    const ecoOption = page.locator('div.onboarding-style-58:has-text("Always")');
    await expect(ecoOption).toBeVisible();
    await ecoOption.click();
    await nextBtn.click();

    // Step 5: Summary and Initialization
    await expect(page.locator('h3.onboarding-style-63')).toContainText('Onboarding Complete!');
    const initializeBtn = page.locator('button:has-text("Initialize EcoTwin")');
    await expect(initializeBtn).toBeVisible();
    await initializeBtn.click();

    // 2. Redirect to Dashboard & verify metrics
    await expect(page.locator('h2.dashboard-header-title')).toContainText('Telemetry Node');
    await expect(page.locator('text=Current Footprint')).toBeVisible();

    // Perform WCAG 2.1 AA Accessibility audit on the Dashboard route
    const dashboardA11yResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();
    expect(dashboardA11yResults.violations).toEqual([]);

    // 3. Navigate to Carbon Quests tab
    const questsTab = page.locator('button:has-text("CarbonQuest")');
    await expect(questsTab).toBeVisible();
    await questsTab.click();
    
    // Verify quests section is rendering
    await expect(page.locator('h1.carbon-quest-style-3')).toContainText('CarbonQuest');
    await expect(page.locator('text=Active Quests')).toBeVisible();

    // 4. Navigate to Marketplace
    const marketplaceTab = page.locator('button:has-text("Marketplace")');
    await expect(marketplaceTab).toBeVisible();
    await marketplaceTab.click();

    // Verify marketplace and offset list is rendering
    await expect(page.locator('h3.market-section-title')).toContainText('Verified Green Initiatives');
    await expect(page.locator('text=Available Balance')).toBeVisible();

    // Purchase an offset (e.g. Mangrove Reforestation)
    const purchaseBtn = page.locator('button:has-text("Simulate Offset Purchase")').first();
    await expect(purchaseBtn).toBeVisible();
    await purchaseBtn.click();

    // Verify Offset confirmation success modal is visible
    const successHeader = page.locator('h3.success-modal-title');
    await expect(successHeader).toHaveText("Carbon Offset Active!");

    // Close the success modal
    const closeBtn = page.locator('button:has-text("Sync EcoTwin Simulation")');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Verify modal is closed
    await expect(successHeader).not.toBeVisible();
  });
});
