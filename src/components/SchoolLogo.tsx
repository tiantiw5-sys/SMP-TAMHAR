import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number | string;
}

export default function SchoolLogo({ className = '', size }: SchoolLogoProps) {
  return (
    <img
      src="https://lh3.googleusercontent.com/d/1L3fcyxjBaY4CfjW5-sLkGrge85Ixh5kA"
      alt="SMP Taman Harapan Logo"
      style={size ? { width: size, height: size } : undefined}
      className={`object-contain select-none ${className}`}
      referrerPolicy="no-referrer"
    />
  );
}
