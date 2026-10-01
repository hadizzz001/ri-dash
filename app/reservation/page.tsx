"use client";

import { useEffect, useState } from "react";
import {sendEmail} from '../api/sendEmail/sendEmail'
const Page = () => {
  const [allTemp, setTemp] = useState<any[]>([]);
  const [filterClientName, setFilterClientName] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  /* ================================
     Fetch Orders
  ================================= */
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/order");
      if (response.ok) {
        const data = await response.json();
        setTemp(data);
      } else {
        console.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  /* ================================
     Filters
  ================================= */
  const filteredData = allTemp.filter((post) =>
    filterClientName === ""
      ? true
      : post.name?.toLowerCase().includes(filterClientName.toLowerCase())
  );

  /* ================================
     Helpers
  ================================= */
  const getTotalItems = (cart: any[] = []) =>
    cart.reduce((acc, item) => acc + Number(item.qty || 0), 0);

  // Older bookings were made before the salon / home choice existed
  const serviceLabel = (type?: string) =>
    type === "home" ? "Home" : type === "salon" ? "Salon" : "—";

  const toggleExpand = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  /* ================================
     Delete Order
  ================================= */
  const handleDeleteOrder = async (id: string) => {
    try {
      const response = await fetch(`/api/order/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTemp((prev) => prev.filter((order) => order.id !== id));
      } else {
        console.error("Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

const handleMarkAsPaid = async (id: string) => {
  try {
    const response = await fetch(`/api/order/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paid: true }),
    });

    if (response.ok) {
      // Update UI
      setTemp((prev) =>
        prev.map((order) =>
          order.id === id ? { ...order, paid: true } : order
        )
      );

      // 🔹 Get order data by id
      const order = allTemp.find((order) => order.id === id);
      if (!order) return;

      // 🔹 Send only what the email needs
      await sendEmail({
        id: order.id,
        name: order.name,
        email: order.email,
        total: order.total,
        phone: order.phone,
        cart: order.cart,
        date: order.date,
        hour: order.hour,
        country: order.country,
        city: order.city,
      });

    } else {
      console.error("Failed to mark order as paid");
    }
  } catch (error) {
    console.error("Error marking order as paid:", error);
  }
};



  return (
    <>
      {/* Filter */}
      <div className="container mb-4">
        <input
          type="text"
          value={filterClientName}
          onChange={(e) => setFilterClientName(e.target.value)}
          placeholder="Filter by Client Name"
          className="border p-2 w-64"
        />
      </div>

      {/* Table */}
      <table className="table table-striped container w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="border p-2">Client Name</th>
            <th className="border p-2">Email</th>
            <th className="border p-2">Service</th>
            <th className="border p-2">Total Amount</th>
            <th className="border p-2">Total Items</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.length > 0 ? (
            filteredData.map((post) => (
              <>
                {/* Main Row */}
                <tr key={post.id}>
                  <td className="border p-2">{post.name}</td>
                  <td className="border p-2">{post.email}</td>
                  <td className="border p-2">{serviceLabel(post.serviceType)}</td>
                  <td className="border p-2">${post.total}</td>
                  <td className="border p-2">
                    {getTotalItems(post.cart)}
                  </td>
                  <td className="border p-2">
                    {post.date} {post.hour}
                  </td>
<td className="border p-2 flex gap-2">
  <button
    onClick={() => toggleExpand(post.id)}
    className="bg-blue-600 text-white px-3 py-1"
  >
    {expandedOrderId === post.id ? "Hide" : "View"}
  </button>

  <button
    onClick={() => handleMarkAsPaid(post.id)}
    disabled={post.paid}
    className={`px-3 py-1 text-white ${
      post.paid ? "bg-green-600 cursor-not-allowed" : "bg-yellow-500"
    }`}
  >
    {post.paid ? "Paid" : "Mark as Paid"}
  </button>

  <button
    onClick={() => handleDeleteOrder(post.id)}
    className="bg-red-500 text-white px-3 py-1"
  >
    Delete
  </button>
</td>

                </tr>

                {/* Expanded Row */}
                {expandedOrderId === post.id && (
                  <tr>
                    <td colSpan={7} className="bg-gray-100 p-4">
                      <div className="space-y-2">
                        <p><strong>Phone:</strong> {post.phone}</p>
                        <p><strong>Country:</strong> {post.country}</p>
                        <p><strong>City:</strong> {post.city}</p>
                        <p><strong>Service:</strong> {serviceLabel(post.serviceType)}</p>

                        <div className="mt-3">
                          <strong>Details:</strong>
                          <table className="w-full mt-2 border">
                            <thead className="bg-gray-300">
                              <tr>
                                <th className="border p-2">Title</th>
                                <th className="border p-2">Price</th>
                                <th className="border p-2">Qty</th>
                                <th className="border p-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {post.cart.map((item: any, index: number) => (
                                <tr key={index}>
                                  <td className="border p-2">{item.title}</td>
                                  <td className="border p-2">${item.price}</td>
                                  <td className="border p-2">{item.qty}</td>
                                  <td className="border p-2">
                                    ${item.price * item.qty}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {(Number(post.homeFee) > 0 || Number(post.tax) > 0) && (
                          <p className="mt-2">Subtotal: ${post.subtotal}</p>
                        )}
                        {Number(post.homeFee) > 0 && (
                          <p>Home service (×2): ${post.homeFee}</p>
                        )}
                        {Number(post.tax) > 0 && (
                          <p>Tax ({post.taxPercent}%): ${post.tax}</p>
                        )}

                        <p className="font-bold mt-2">
                           Total: ${post.total}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))
          ) : (
            <tr>
              <td colSpan={7} className="text-center p-4">
                No matching records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
};

export default Page;
