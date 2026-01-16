import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge Component', () => {
  it('should render with children', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeDefined();
  });

  it('should apply correct styling classes', () => {
    const { container } = render(<Badge>Styled</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('bg-gray-100');
    expect(badge?.className).toContain('rounded-full');
  });

  it('should accept custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('custom-class');
  });
});
