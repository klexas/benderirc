import { render, screen } from '@testing-library/react';
import LeftPanel from './LeftPanel'; // Adjust path as necessary
import React from 'react';

describe('LeftPanel Component', () => {
  test('renders channels and DMs headers', () => {
    render(<LeftPanel />);
    expect(screen.getByText('Channels')).toBeInTheDocument();
    expect(screen.getByText('Direct Messages')).toBeInTheDocument();
  });

  test('renders mock channel names', () => {
    render(<LeftPanel />);
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
    expect(screen.getByText('dev-talk')).toBeInTheDocument();
  });

  test('renders mock DM names', () => {
    render(<LeftPanel />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  test('renders server icons placeholders', () => {
    render(<LeftPanel />);
    // Check for the presence of server icons by their placeholder text/role
    // This is a simple check; more robust checks might involve ARIA roles or specific class names
    expect(screen.getByText('G')).toBeInTheDocument(); // Example Guild Icon
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('DM')).toBeInTheDocument(); // Example DM Icon
  });
});
