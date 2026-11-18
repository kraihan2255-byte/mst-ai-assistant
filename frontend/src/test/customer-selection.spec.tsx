import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerSelectionCard } from '../features/assistant/CustomerSelectionCard';
import type { MatchedCustomerSummary } from '../types/api';

describe('CustomerSelectionCard', () => {
  const candidates: MatchedCustomerSummary[] = [
    {
      id: 'cust-1',
      name: 'ABC Catering Manjeri',
      phone: '9840011111',
      area: 'Manjeri',
    },
    {
      id: 'cust-2',
      name: 'ABC Catering Tirur',
      phone: '9840022222',
      area: 'Tirur',
    },
  ];

  it('Scenario 2: Ambiguous customer matching displays candidate selection options', () => {
    const handleSelect = vi.fn();
    render(
      <CustomerSelectionCard candidates={candidates} onSelect={handleSelect} />,
    );

    expect(
      screen.getByText(/Multiple Customers Found — Please Select One/),
    ).toBeInTheDocument();
    expect(screen.getByText('ABC Catering Manjeri')).toBeInTheDocument();
    expect(screen.getByText('ABC Catering Tirur')).toBeInTheDocument();

    const selectButtons = screen.getAllByText('Select');
    expect(selectButtons.length).toBe(2);

    fireEvent.click(selectButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith(candidates[0]);
  });
});
