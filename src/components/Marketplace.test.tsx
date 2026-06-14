import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Marketplace from './Marketplace';
import { UserProfile } from '../utils/firebase';

// Mock Firebase utility
vi.mock('../utils/firebase', () => ({
  getCarbonLogs: vi.fn().mockResolvedValue([
    { id: '1', name: 'Offset Purchase: Mangrove Reforestation', category: 'Offset', co2Value: -1000, timestamp: new Date().toISOString() }
  ]),
  logCarbonEntry: vi.fn().mockResolvedValue({
    ecoTokens: 100,
  }),
}));

const mockUser: UserProfile = {
  uid: 'test-user-123',
  displayName: 'Test Warrior',
  email: 'test@warrior.com',
  level: 1,
  xp: 150,
  ecoTokens: 500,
  carbonTarget: 3.5,
  carbonCurrent: 6.8,
  twinState: {
    transportSlider: 50,
    dietSlider: 50,
    energySlider: 50,
    shoppingSlider: 50,
  },
  completedMissions: [],
  joinedChallenges: [],
};

describe('Marketplace Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders available tokens and registry headers correctly', async () => {
    await act(async () => {
      render(<Marketplace user={mockUser} onProfileUpdate={vi.fn()} />);
    });

    expect(screen.getByText('Available Balance')).toBeDefined();
    expect(screen.getByText('Lifetime Offsets Purchased')).toBeDefined();
    expect(screen.getByText('Verified Green Initiatives')).toBeDefined();
  });

  it('displays offset initiatives and triggers offset dialog on purchase', async () => {
    const handleProfileUpdate = vi.fn();
    await act(async () => {
      render(<Marketplace user={mockUser} onProfileUpdate={handleProfileUpdate} />);
    });

    // Verify Mangrove project exists
    expect(screen.getByText('Mangrove Reforestation')).toBeDefined();

    // Verify purchase button exists
    const purchaseBtn = screen.getAllByText('Simulate Offset Purchase')[0];
    await act(async () => {
      fireEvent.click(purchaseBtn);
    });

    // Check certificate modal displays
    expect(screen.getByText('Carbon Offset Active!')).toBeDefined();
  });
});
