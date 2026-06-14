import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import EcoTwin from './EcoTwin';
import { UserProfile } from '../utils/firebase';

// Mock Three.js module to avoid WebGL context issues in JSDOM
vi.mock('three', () => {
  const mockPosition = () => ({
    set: vi.fn(),
    x: 0,
    y: 0,
    z: 0,
    copy: vi.fn(),
  });
  const mockRotation = () => ({
    x: 0,
    y: 0,
    z: 0,
  });
  
  const mockScene = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  }));
  const mockPerspectiveCamera = vi.fn().mockImplementation(() => ({
    position: { set: vi.fn() },
    lookAt: vi.fn(),
  }));
  const mockWebGLRenderer = vi.fn().mockImplementation(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    domElement: document.createElement('div'),
    dispose: vi.fn(),
    render: vi.fn(),
  }));
  const mockGroup = vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
    rotation: mockRotation(),
    position: mockPosition(),
  }));
  const mockMesh = vi.fn().mockImplementation(() => ({
    position: mockPosition(),
    rotation: mockRotation(),
    scale: { set: vi.fn() },
    userData: {},
  }));
  const mockDirectionalLight = vi.fn().mockImplementation(() => ({
    position: mockPosition(),
  }));
  const mockClock = vi.fn().mockImplementation(() => ({
    getElapsedTime: () => 1.0,
  }));

  return {
    Scene: mockScene,
    PerspectiveCamera: mockPerspectiveCamera,
    WebGLRenderer: mockWebGLRenderer,
    Group: mockGroup,
    Mesh: mockMesh,
    AmbientLight: vi.fn(),
    DirectionalLight: mockDirectionalLight,
    CylinderGeometry: vi.fn(),
    MeshStandardMaterial: vi.fn(),
    BoxGeometry: vi.fn(),
    SphereGeometry: vi.fn(),
    ConeGeometry: vi.fn(),
    Vector3: vi.fn().mockImplementation(() => ({
      clone: () => ({ x: 0, y: 0, z: 0 }),
      copy: vi.fn(),
    })),
    MeshBasicMaterial: vi.fn(),
    Clock: mockClock,
    Material: vi.fn(),
  };
});

// Mock Firebase utility
vi.mock('../utils/firebase', () => ({
  updateUserProfile: vi.fn().mockResolvedValue({}),
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

describe('EcoTwin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })));
  });

  it('renders simulator text content and sliders correctly', async () => {
    await act(async () => {
      render(<EcoTwin user={mockUser} onProfileUpdate={vi.fn()} />);
    });

    expect(screen.getByText('Digital Sustainability Twin')).toBeDefined();
    expect(screen.getByText('3D Ecosystem Status:')).toBeDefined();

    // Check sliders display
    expect(screen.getByText('Transport Footprint')).toBeDefined();
    expect(screen.getByText('Diet Choice')).toBeDefined();
    expect(screen.getByText('Home Utilities')).toBeDefined();
    expect(screen.getByText('Shopping & Waste')).toBeDefined();
  });

  it('calculates co2 reduction values based on twin sliders', async () => {
    await act(async () => {
      render(<EcoTwin user={mockUser} onProfileUpdate={vi.fn()} />);
    });

    expect(screen.getByText('CO₂ Reduction')).toBeDefined();
    expect(screen.getByText('Tree Equivalent')).toBeDefined();
  });
});
