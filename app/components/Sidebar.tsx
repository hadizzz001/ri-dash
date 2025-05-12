"use client";

import { useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div id="sidenavv" style={{ position: "relative" }}>
      {/* Sidebar */}
      <nav
        style={{
          background: "#343a40",
          color: "white",
          height: "100vh",
          position: "fixed",
          width: isOpen ? "200px" : "0",
          left: isOpen ? "0" : "-200px",
          overflow: "hidden",
          transition: "left 0.3s ease-in-out",
          padding: isOpen ? "16px" : "0",
        }}
      >
        <div>
          <h3 style={{ textAlign: "center" }}>Dashboard</h3>
          <ul style={{ padding: 0, marginTop: "20px", listStyle: "none" }}>
            <li style={{ marginBottom: "15px" }}>
              <a href="/dashboard" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                All Products
              </a>
            </li>
            <li>
              <a href="/products" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Product
              </a>
            </li>    
            <li>
              <a href="/service" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Service
              </a>
            </li>  
            <li>
              <a href="/ext" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Extension
              </a>
            </li>  
            <li>
              <a href="/vid" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Video
              </a>
            </li>  
            <li>
              <a href="/new" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add News
              </a>
            </li>  
            <li>
              <a href="/app1" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Manage Appointments
              </a>
            </li>  
            <li>
              <a href="/app2" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                View Appointments
              </a>
            </li>  
            <li>
              <a href="/reservation" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Orders
              </a>
            </li> 
            <li>
              <a href="/" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Logout
              </a>
            </li>
          </ul>
        </div>
      </nav>

      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        style={{
          position: "absolute",
          top: "20px",
          left: isOpen ? "200px" : "10px",
          background: "#000",
          color: "white",
          border: "none",
          cursor: "pointer",
          padding: "8px 12px",
          fontSize: "18px",
          transition: "left 0.3s ease-in-out",
          borderRadius: "5px",
        }}
      >
        {isOpen ? <FaArrowLeft /> : <FaArrowRight />}
      </button>

      {/* Spacer to push content */}
      <div style={{ marginLeft: isOpen ? "200px" : "0", transition: "margin-left 0.3s ease-in-out" }} />
      <style
  dangerouslySetInnerHTML={{
    __html: "\n  a {\n    color: #fff !important;\n}\n"
  }}
/>

    </div>
  );
}
