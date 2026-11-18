import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { authApi } from '../lib/api-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage(initialMode: 'pin' | 'password' = 'pin') {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage initialMode={initialMode} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new Error('Unauthenticated'));
  });

  it('renders mobile PIN lock screen by default with keypad and quick unlock button', async () => {
    renderLoginPage('pin');

    expect(await screen.findByText(/Enter 4-digit Passcode/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡ One-Tap Quick Unlock/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Admin Password Instead/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('performs one-tap quick unlock successfully', async () => {
    const quickUnlockSpy = vi.spyOn(authApi, 'quickUnlock').mockResolvedValueOnce({
      success: true,
      user: {
        id: 'admin-id-1',
        username: 'raihan',
        role: 'ADMIN',
      },
      token: 'jwt-token-quick',
    });

    renderLoginPage('pin');

    const quickUnlockBtn = await screen.findByText(/⚡ One-Tap Quick Unlock/i);
    fireEvent.click(quickUnlockBtn);

    await waitFor(() => {
      expect(quickUnlockSpy).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('switches between PIN mode and Password mode smoothly', async () => {
    renderLoginPage('pin');

    const switchToPasswordBtn = await screen.findByText(/Use Admin Password Instead/i);
    fireEvent.click(switchToPasswordBtn);

    expect(await screen.findByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();

    const switchToPinBtn = screen.getByText(/Switch to Quick Mobile PIN \/ Passcode/i);
    fireEvent.click(switchToPinBtn);

    expect(await screen.findByText(/Enter 4-digit Passcode/i)).toBeInTheDocument();
  });

  it('renders password login form with inputs and submits valid credentials', async () => {
    const loginSpy = vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      success: true,
      user: {
        id: 'admin-id-1',
        username: 'mstadmin',
        role: 'ADMIN',
      },
    });

    renderLoginPage('password');

    const usernameInput = await screen.findByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    fireEvent.change(usernameInput, { target: { value: 'mstadmin' } });
    fireEvent.change(passwordInput, { target: { value: 'SecretPass123!' } });

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('mstadmin', 'SecretPass123!');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('validates empty inputs on password form submit', async () => {
    renderLoginPage('password');

    const submitBtn = await screen.findByRole('button', { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter your username/i)).toBeInTheDocument();
  });
});
