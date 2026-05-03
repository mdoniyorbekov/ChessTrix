import { HTMLAttributes } from "react";
import "../common/common.css";
import "./layout.css";

export function SidePanel({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <aside className={`side-panel ${className}`} {...props} />;
}
