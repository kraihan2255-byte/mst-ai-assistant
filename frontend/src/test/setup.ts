import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// JSDOM doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// JSDOM doesn't implement ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
});
