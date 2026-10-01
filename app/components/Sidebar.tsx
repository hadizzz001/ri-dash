"use client";

import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  return (
    <div id="sidenavv" style={{ position: "relative" }}>
      {/* Sidebar */}
      <nav
        style={{
          background: "#343a40",
          color: "white",
          height: "100vh",
          position: "fixed",
          width: isOpen ? "280px" : "0",
          left: isOpen ? "0" : "-280px",
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
                All Items
              </a>
            </li>
            <li>
              <a href="/products" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Item
              </a>
            </li>    
            <li>
              <a href="/service" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Service
              </a>
            </li>  
            <li>
              <a href="/servicedata" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Services Data
              </a>
            </li>  
            <li>
              <a href="/cat" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Add Categroy
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
              <a href="/new1" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                News Title
              </a>
            </li>  
            <li>
              <a href="/app1" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Manage Appointments
              </a>
            </li>  
            <li>
              <a href="/reservation" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                View Appointments
              </a>
            </li>
            <li>
              <a href="/tax" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Appointment Tax
              </a>
            </li>

            





            <li  >
              <a href="/dashboard1" style={{ color: "white", textDecoration: "none" }}>
                All Products
              </a>
            </li>
            <li>
              <a href="/products1" style={{ color: "white", textDecoration: "none" }}>
                Add Product
              </a>
            </li>
            <li>
              <a href="/category" style={{ color: "white", textDecoration: "none" }}>
                Add Product Category
              </a>
            </li>
            <li>
              <a href="/sub" style={{ color: "white", textDecoration: "none" }}>
                Add Sub-category
              </a>
            </li>
            <li>
              <a href="/factory" style={{ color: "white", textDecoration: "none" }}>
                Add Brand
              </a>
            </li>

            <li>
              <a href="/offer" style={{ color: "white", textDecoration: "none" }}>
                Add Code
              </a>
            </li>
            <li>
              <a href="/reservation1" style={{ color: "white", textDecoration: "none" }}>
                Orders
              </a>
            </li>
            <li>
              <a href="/reviews" style={{ color: "white", textDecoration: "none" }}>
                Product Reviews
              </a>
            </li>
            <li>
              <a href="/users" style={{ color: "white", textDecoration: "none" }}>
                Customers
              </a>
            </li>
            <li>
              <a href="/ads" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                Ads Images
              </a>
            </li>
            <li>
              <a href="/aboutbanner" style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>
                About Banner
              </a>
            </li>
 
            <li>
              <a
                href="/api/backup"
                style={{ color: "white", textDecoration: "none", whiteSpace: "nowrap" }}
              >
                Backup
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
          position: "fixed",
          top: "20px",
          left: isOpen ? "260px" : "10px",
          background: "#000",
          color: "white",
          border: "none",
          cursor: "pointer",
          padding: "8px 12px",
          fontSize: "18px",
          transition: "left 0.3s ease-in-out",
          borderRadius: "5px",
          zIndex: 1000,
        }}
      >
        {isOpen ? <FaArrowLeft /> : <FaArrowRight />}
      </button>

      <style
  dangerouslySetInnerHTML={{
    __html: "\n  a {\n    color: #fff !important;\n}\n"
  }}
/>

    </div>
  );
}
