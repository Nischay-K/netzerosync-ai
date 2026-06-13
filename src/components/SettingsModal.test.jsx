import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars
import React from 'react';
import SettingsModal from './SettingsModal';

// Mock the modules
vi.mock('../utils/firebase', () => ({
  isFirebaseConnected: false,
}));

vi.mock('../utils/gemini', () => ({
  isGeminiConfigured: () => false,
}));

describe('SettingsModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    // Stub window.location.reload
    vi.stubGlobal('location', {
      reload: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when open', () => {
    render(<SettingsModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Integrations & Settings')).toBeDefined();
    expect(screen.getByLabelText('Gemini API Key')).toBeDefined();
  });

  it('does not render when closed', () => {
    const { container } = render(<SettingsModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('allows entering and saving configuration', async () => {
    const reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });

    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    const geminiInput = screen.getByLabelText('Gemini API Key');
    const fbApiKeyInput = screen.getByLabelText('API Key');
    const fbProjectIdInput = screen.getByLabelText('Project ID');
    const saveButton = screen.getByText('Save & Reload');

    fireEvent.change(geminiInput, { target: { value: 'test-gemini-key' } });
    fireEvent.change(fbApiKeyInput, { target: { value: 'test-fb-api-key' } });
    fireEvent.change(fbProjectIdInput, { target: { value: 'test-fb-project-id' } });

    fireEvent.click(saveButton);

    expect(localStorage.getItem('ecoSphere_geminiApiKey')).toBe('test-gemini-key');
    const storedFb = JSON.parse(localStorage.getItem('ecoSphere_firebaseConfig'));
    expect(storedFb.apiKey).toBe('test-fb-api-key');
    expect(storedFb.projectId).toBe('test-fb-project-id');

    await waitFor(() => {
      expect(reloadMock).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('allows resetting config', () => {
    const reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });

    localStorage.setItem('ecoSphere_geminiApiKey', 'old-key');
    localStorage.setItem('ecoSphere_firebaseConfig', JSON.stringify({ apiKey: 'old' }));

    render(<SettingsModal isOpen={true} onClose={() => {}} />);

    const resetButton = screen.getByText('Reset All configs');
    fireEvent.click(resetButton);

    expect(localStorage.getItem('ecoSphere_geminiApiKey')).toBeNull();
    expect(localStorage.getItem('ecoSphere_firebaseConfig')).toBeNull();
    expect(reloadMock).toHaveBeenCalled();
  });
});
