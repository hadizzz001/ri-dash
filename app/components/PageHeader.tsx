"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./Sidebar";

/**
 * A page's title row, in the sidebar's style: the icon of the page's menu
 * link, the title, one line of help, and the page's main buttons on the right.
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  icon?: any;
}) {
  const pathname = usePathname();
  const Icon = icon || NAV_ITEMS.find((i) => i.href === pathname)?.icon;

  return (
    <header className="rd-head">
      <div className="rd-head__main">
        {Icon && (
          <span className="rd-head__icon" aria-hidden="true">
            <Icon size={21} strokeWidth={1.8} />
          </span>
        )}
        <div>
          <h1 className="rd-head__title">{title}</h1>
          {subtitle && <p className="rd-head__sub">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="rd-head__actions">{actions}</div>}
    </header>
  );
}
