import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}

/**
 * Server-compatible Button component
 * Can be used in both Server and Client components
 */
export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded transition-colors';

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800 disabled:opacity-50',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 disabled:opacity-50',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
