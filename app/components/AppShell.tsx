"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

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
