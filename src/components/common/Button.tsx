import { ButtonHTMLAttributes, ReactNode } from "react";
import "./common.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

export function Button({ variant = "primary", icon, children, className = "", ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {icon && <span className="button__icon" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}
