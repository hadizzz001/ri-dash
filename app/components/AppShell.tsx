"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// The login screen fills the window on its own: no sidebar, no side margin
const BARE_PATHS = ["/", "/login"];

/**
 * Sidebar + page. The menu starts closed on every page and closes as soon as
 * a page is picked from it, so each page opens at full width; the floating
 * button at the top left opens it again.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Going to another page (also without a full reload) closes the menu
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Esc closes it too
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  if (BARE_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <>
      <Sidebar
        isOpen={isOpen}
        toggleSidebar={() => setIsOpen((prev) => !prev)}
        onNavigate={() => setIsOpen(false)}
      />

      {/* Main content - squeezes/shifts while the sidebar is open */}
      <main className={`flex-grow-1 rd-main ${isOpen ? "is-shifted" : ""}`}>{children}</main>
    </>
  );
}
