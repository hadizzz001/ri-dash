"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

// The login screen fills the window on its own: no sidebar, no side margin
const BARE_PATHS = ["/", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  if (BARE_PATHS.includes(pathname)) return <>{children}</>;

  return (
    <>
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content - squeezes/shifts when sidebar is open */}
      <main
        className="flex-grow-1"
        style={{
          padding: "20px",
          width: "100%",
          marginLeft: isOpen ? "280px" : "0",
          transition: "margin-left 0.3s ease-in-out",
        }}
      >
        {children}
      </main>
    </>
  );
}
