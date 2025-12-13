
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AllPhonesList from '../components/AllPhonesList';
import { Phone } from '../types';
import React from 'react';

const phonesDB: Phone[] = [
  {
    id: 1,
    name: 'Phone A',
    brand: 'Brand A',
    os: 'iOS',
    scores: { price: 80, performance: 90, camera: 85, battery: 80, design: 90, software: 90 },
    ranking: 85,
    summary: 'A great phone.',
    imageUrl: 'https://example.com/phoneA.jpg',
  },
  {
    id: 2,
    name: 'Phone B',
    brand: 'Brand B',
    os: 'Android',
    scores: { price: 90, performance: 80, camera: 80, battery: 90, design: 80, software: 80 },
    ranking: 83,
    summary: 'Another great phone.',
    imageUrl: 'https://example.com/phoneB.jpg',
  },
];

describe('AllPhonesList', () => {
  it('should render a list of phones', () => {
    const onBack = vi.fn();
    const onPhoneSelect = vi.fn();

    render(<AllPhonesList phones={phonesDB} onBack={onBack} onPhoneSelect={onPhoneSelect} />);

    expect(screen.getByText('Phone A')).toBeInTheDocument();
    expect(screen.getByText('Phone B')).toBeInTheDocument();
  });

  it('should call onPhoneSelect when a phone is clicked', () => {
    const onBack = vi.fn();
    const onPhoneSelect = vi.fn();

    render(<AllPhonesList phones={phonesDB} onBack={onBack} onPhoneSelect={onPhoneSelect} />);

    fireEvent.click(screen.getByText('Phone A'));

    expect(onPhoneSelect).toHaveBeenCalledWith(phonesDB[0]);
  });
});
