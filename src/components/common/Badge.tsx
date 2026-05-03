import { HTMLAttributes } from "react";
import "./common.css";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "accent" | "info" | "danger" | "muted" | "success";
};

export function Badge({ tone = "accent", className = "", ...props }: BadgeProps) {
  return <span className={`badge badge--${tone} ${className}`} {...props} />;
}
