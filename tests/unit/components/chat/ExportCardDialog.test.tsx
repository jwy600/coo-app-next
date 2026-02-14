import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportCardDialog } from '@/components/chat/ExportCardDialog';

describe('ExportCardDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    selectedBlockCount: 3,
    defaultTitle: 'Test Card',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog content when open', () => {
    render(<ExportCardDialog {...defaultProps} />);
    expect(screen.getByText('Export Card')).toBeTruthy();
  });

  it('does not render dialog content when closed', () => {
    render(<ExportCardDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Export Card')).toBeNull();
  });

  it('shows plural block count in description', () => {
    render(<ExportCardDialog {...defaultProps} selectedBlockCount={3} />);
    expect(screen.getByText(/3 selected blocks/)).toBeTruthy();
  });

  it('shows singular block count in description', () => {
    render(<ExportCardDialog {...defaultProps} selectedBlockCount={1} />);
    expect(screen.getByText(/1 selected block(?!s)/)).toBeTruthy();
  });

  it('initializes title input with defaultTitle', () => {
    render(<ExportCardDialog {...defaultProps} defaultTitle="My Title" />);
    const input = screen.getByPlaceholderText('Enter card title') as HTMLInputElement;
    expect(input.value).toBe('My Title');
  });

  it('calls onConfirm with trimmed title on Export click', () => {
    render(<ExportCardDialog {...defaultProps} defaultTitle="  Trimmed  " />);
    fireEvent.click(screen.getByText('Export'));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('Trimmed');
  });

  it('calls onConfirm on Enter key in input', () => {
    render(<ExportCardDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Enter card title');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onConfirm).toHaveBeenCalledWith('Test Card');
  });

  it('disables Export button when title is empty', () => {
    render(<ExportCardDialog {...defaultProps} defaultTitle="" />);
    const exportBtn = screen.getByText('Export').closest('button') as HTMLButtonElement;
    expect(exportBtn.disabled).toBe(true);
  });

  it('calls onOpenChange(false) on Cancel click', () => {
    render(<ExportCardDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
