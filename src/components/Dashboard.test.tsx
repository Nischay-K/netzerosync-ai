import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import Dashboard from './Dashboard';
import { UserProfile } from '../utils/firebase';

// Mock Recharts to avoid drawing complexity in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
}));

// Mock Firebase utility logCarbonEntry and getCarbonLogs
vi.mock('../utils/firebase', () => ({
  getCarbonLogs: vi.fn().mockResolvedValue([]),
  logCarbonEntry: vi.fn().mockResolvedValue({
    carbonCurrent: 5.5,
    xp: 1200,
    level: 2,
    ecoTokens: 520,
  }),
}));

const mockUser: UserProfile = {
  uid: 'test-user-123',
  displayName: 'Test Warrior',
  email: 'test@warrior.com',
  level: 1,
  xp: 150,
  ecoTokens: 100,
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

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user current telemetry metrics correctly', async () => {
    const handleProfileUpdate = vi.fn();
    const handleOpenAchievements = vi.fn();

    await act(async () => {
      render(
        <Dashboard
          user={mockUser}
          onProfileUpdate={handleProfileUpdate}
          onOpenAchievements={handleOpenAchievements}
        />
      );
    });

    // Assert username rendering
    expect(screen.getByText('Test Warrior')).toBeDefined();

    // Assert footprint rendering
    expect(screen.getByText('6.8')).toBeDefined();
    expect(screen.getByText('3.5')).toBeDefined();
  });

  it('renders quick log form inputs and allows entering values', async () => {
    await act(async () => {
      render(
        <Dashboard
          user={mockUser}
          onProfileUpdate={vi.fn()}
          onOpenAchievements={vi.fn()}
        />
      );
    });

    // Assert quick logger components exist
    expect(screen.getByLabelText('Action Name')).toBeDefined();
    expect(screen.getByLabelText('Category')).toBeDefined();
    expect(screen.getByLabelText('CO₂ Impact (kg)')).toBeDefined();
  });

  it('claims ecological certificate when claim button is clicked', async () => {
    await act(async () => {
      render(
        <Dashboard
          user={mockUser}
          onProfileUpdate={vi.fn()}
          onOpenAchievements={vi.fn()}
        />
      );
    });

    // Open certificate modal
    const claimBtn = screen.getByText('Claim Eco-Certificate');
    await act(async () => {
      fireEvent.click(claimBtn);
    });

    // Verify certificate dialog displays
    expect(screen.getByText('Certificate of Excellence')).toBeDefined();
    expect(screen.getAllByText('Test Warrior').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers achievements drawer when Rank & Status widget is clicked', async () => {
    const handleOpenAchievements = vi.fn();
    await act(async () => {
      render(
        <Dashboard
          user={mockUser}
          onProfileUpdate={vi.fn()}
          onOpenAchievements={handleOpenAchievements}
        />
      );
    });

    const rankWidget = screen.getByLabelText(/View achievements milestones/);
    await act(async () => {
      fireEvent.click(rankWidget);
    });

    expect(handleOpenAchievements).toHaveBeenCalled();
  });
});
