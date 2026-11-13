import React from 'react';
import clsx from 'clsx';
import './Card.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glass, ...props }) => {
  return (
    <div
      className={clsx(
        'ui-card',
        glass && 'glass-effect',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
