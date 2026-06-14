import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Onboarding from './Onboarding';
import { UserProfile } from '../utils/firebase';

// Mock Firebase utility logCarbonEntry and updateUserProfile
vi.mock('../utils/firebase', () => ({
  updateUserProfile: vi.fn().mockResolvedValue({}),
  logCarbonEntry: vi.fn().mockResolvedValue({}),
}));

const mockUser: UserProfile = {
  uid: 'test-user-123',
  displayName: 'Test Warrior',
  email: 'test@warrior.com',
  level: 1,
  xp: 0,
  ecoTokens: 500,
  carbonTarget: undefined as any,
  carbonCurrent: undefined as any,
  twinState: undefined as any,
  completedMissions: [],
  joinedChallenges: [],
};

describe('Onboarding Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders step 1 and handles questionnaire step transitions', async () => {
    const handleComplete = vi.fn();
    
    await act(async () => {
      render(<Onboarding user={mockUser} onComplete={handleComplete} />);
    });

    // Check Step 1 title
    expect(screen.getByText('Transportation Habits')).toBeDefined();

    // Verify option choices are rendered
    expect(screen.getByText('Petrol/Diesel Car')).toBeDefined();
    expect(screen.getByText('Electric Car')).toBeDefined();

    // Find next button and click to go to step 2
    const nextBtn = screen.getByText('Next Step');
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    // Check Step 2 title
    expect(screen.getByText('Diet & Consumption')).toBeDefined();
    expect(screen.getByText('Meat Lover')).toBeDefined();
  });

  it('calculates the baseline carbon footprint correctly at step 5 summary', async () => {
    const handleComplete = vi.fn();
    
    await act(async () => {
      render(<Onboarding user={mockUser} onComplete={handleComplete} />);
    });

    // Click through all steps to reach step 5
    // Step 1 -> Step 2
    await act(async () => {
      fireEvent.click(screen.getByText('Next Step'));
    });
    // Step 2 -> Step 3
    await act(async () => {
      fireEvent.click(screen.getByText('Next Step'));
    });
    // Step 3 -> Step 4
    await act(async () => {
      fireEvent.click(screen.getByText('Next Step'));
    });
    // Step 4 -> Step 5
    await act(async () => {
      fireEvent.click(screen.getByText('Next Step'));
    });

    // Assert Onboarding Complete screen
    expect(screen.getByText('Onboarding Complete!')).toBeDefined();

    // Verify baseline carbon numbers are displayed
    expect(screen.getByText('Current Footprint')).toBeDefined();
    expect(screen.getByText('Your Target Goal')).toBeDefined();

    // Click finish button to trigger callback
    const finishBtn = screen.getByText('Initialize EcoTwin');
    await act(async () => {
      fireEvent.click(finishBtn);
    });

    expect(handleComplete).toHaveBeenCalled();
  });
});
