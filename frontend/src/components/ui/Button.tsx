import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { buttonClasses, type ButtonVariant as Variant } from './button-classes';

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

/** Link com aparência de botão (navegação, não ação). */
export function ButtonLink({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
