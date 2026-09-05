import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

const variants = {
  primary: "bg-coral text-white shadow-pop hover:bg-coral-deep",
  secondary: "bg-ink text-white hover:bg-ink/90",
  outline: "border-2 border-ink text-ink hover:bg-ink hover:text-white",
  ghost: "text-ink hover:bg-cream-deep",
  success: "bg-mint text-white hover:bg-mint-deep",
} as const;

const sizes = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
  sm: "px-3.5 py-2 text-xs",
} as const;

interface CommonProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </Link>
  );
}
