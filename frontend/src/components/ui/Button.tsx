import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { type ButtonSize, buttonClasses, type ButtonVariant } from './button-classes';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & StyleProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

/** Link com aparência de botão (navegação, não ação). */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
