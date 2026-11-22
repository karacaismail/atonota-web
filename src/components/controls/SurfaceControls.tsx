import { Button as AntButton, Card as AntCard, Typography } from 'antd';
import type { ButtonProps, CardProps } from 'antd';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

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

type LinkProps = ComponentPropsWithoutRef<typeof Typography.Link> & {
  size?: ButtonProps['size'];
};

export const Link = forwardRef<HTMLElement, LinkProps>(function Link(
  { className, size = 'middle', ...props },
  ref,
) {
  return (
    <Typography.Link
      {...props}
      ref={ref}
      className={['tlink', 'atonota-link', className].filter(Boolean).join(' ')}
      data-size={size}
    />
  );
});
