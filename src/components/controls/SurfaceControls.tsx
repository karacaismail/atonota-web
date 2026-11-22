import { Button as AntButton, Card as AntCard } from 'antd';
import type { ButtonProps, CardProps } from 'antd';
import { forwardRef } from 'react';

import './controls.css';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, ...props },
  ref,
) {
  return (
    <AntButton
      {...props}
      ref={ref}
      className={className ? `atonota-button ${className}` : 'atonota-button'}
    />
  );
});

export function Card({ className, ...props }: CardProps) {
  return (
    <AntCard {...props} className={className ? `atonota-card ${className}` : 'atonota-card'} />
  );
}
