"use client"; // Required for Next.js App Router

import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const ExportToExcel = ({ allTemp }) => {
  const handleExport = () => {
    let formattedData = [];

    // Loop through all orders
    allTemp.forEach((order, orderIndex) => {
      // Loop through products in userInfo
      order.userInfo.forEach((product) => {
        formattedData.push({
          ReceiptNumber: order.num, // Order Number 
          Code: order.code, // New field
          Email: order.cartItems.email, // New field
          Phone: order.cartItems.phone, // New field
          Delivery$: order.delivery, // New field 
          Paid: order.paid, // Paid status (true/false)
          Product: product.title,
          UnitPrice$: product.discount,
          Quantity: product.quantity,
          TotalAmount$: order.total, // Total outside userInfo
          Date: order.date, // Date moved to the last column
        });
      });
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Convert to binary and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "Orders.xlsx");
  };

  return (
    <button type="button" onClick={handleExport} className="rd-btn rd-btn--ghost">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </svg>
      Export to Excel
    </button>
  );
};

export default ExportToExcel;
