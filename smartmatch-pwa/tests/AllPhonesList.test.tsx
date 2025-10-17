import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AllPhonesList from '../components/AllPhonesList';
import { Phone } from '../types';
import React from 'react';

const mockPhones: Phone[] = [
  {
    id: 1,
    name: 'Phone A',
    brand: 'Brand A',
    releaseDate: '2023-01-01',
    os: 'iOS',
    scores: { price: 80, performance: 90, camera: 85, battery: 80, design: 90, software: 90 },
    ranking: 8.5,
    pros: ['Pro 1'],
    cons: ['Con 1'],
    summary: 'A great phone.',
    imageUrl: 'https://example.com/phoneA.jpg',
    purchaseUrl: '#',
  },
  {
    id: 2,
    name: 'Phone B',
    brand: 'Brand B',
    releaseDate: '2023-01-01',
    os: 'Android',
    scores: { price: 90, performance: 80, camera: 80, battery: 90, design: 80, software: 80 },
    ranking: 8.3,
    pros: ['Pro 1'],
    cons: ['Con 1'],
    summary: 'Another great phone.',
    imageUrl: 'https://example.com/phoneB.jpg',
    purchaseUrl: '#',
  },
];

describe('AllPhonesList', () => {
  it('should render a list of phones', () => {
    const onSelectPhone = vi.fn();
    const onBack = vi.fn();

    render(<AllPhonesList phones={mockPhones} onSelectPhone={onSelectPhone} onBack={onBack} />);

    expect(screen.getByText('Phone A')).toBeInTheDocument();
    expect(screen.getByText('Phone B')).toBeInTheDocument();
  });

  it('should call onSelectPhone when a phone is clicked', () => {
    const onSelectPhone = vi.fn();
    const onBack = vi.fn();

    render(<AllPhonesList phones={mockPhones} onSelectPhone={onSelectPhone} onBack={onBack} />);

    fireEvent.click(screen.getByText('Phone A').closest('div[role="button"]')!);

    expect(onSelectPhone).toHaveBeenCalledWith(mockPhones[0]);
  });

  it('should render a message when no phones are available', () => {
    const onBack = vi.fn();
    render(<AllPhonesList phones={[]} onSelectPhone={() => {}} onBack={onBack} />);
    
    expect(screen.getByText('No phones match your criteria.')).toBeInTheDocument();
  });
});
