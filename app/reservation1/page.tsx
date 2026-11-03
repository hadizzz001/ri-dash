
"use client"
import Link from "next/link";
import ExportButton from "../components/ExportExcel";
import { Check, Eye, Search, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useState, useEffect } from "react";
import { redirect, useRouter } from 'next/navigation';





const page = () => {
  const [allTemp, setTemp] = useState<any>()
  const [updatedNums, setUpdatedNums] = useState({});
  const [submittedPosts, setSubmittedPosts] = useState({});
  const [filterClientName, setFilterClientName] = useState("");
  const [filterReceiptNum, setFilterReceiptNum] = useState("");
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [totals, setTotals] = useState({});


  const filteredData = allTemp?.filter((post) => {
    const clientMatch = filterClientName
      ? post.cartItems?.fname?.toLowerCase().includes(filterClientName.toLowerCase())
      : true;

    const receiptMatch = filterReceiptNum
      ? post.num?.toLowerCase().includes(filterReceiptNum.toLowerCase())
      : true;

    const postDate = new Date(post.date);
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;

    const dateInRange =
      (!from || postDate >= from) &&
      (!to || postDate <= to);

    return clientMatch && receiptMatch && dateInRange;
  });



  console.log("filteredData", filteredData);



  // Load submitted state from localStorage on mount
  useEffect(() => {
    const storedSubmittedPosts = JSON.parse(localStorage.getItem("submittedPosts")) || {};
    setSubmittedPosts(storedSubmittedPosts);
  }, []);

  const handleInputChange = (id, value) => {
    setUpdatedNums((prev) => ({ ...prev, [id]: value }));
  };

  const handleUpdate = async (id) => {
    const numToUpdate = updatedNums[id]; // Get the updated number

    if (!numToUpdate) return; // Prevent empty submission

    try {
      const response = await fetch(`/api/order1z/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ num: numToUpdate }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("Receipt number updated:", result);

        // Update state and save to localStorage
        setSubmittedPosts((prev) => {
          const updatedState = { ...prev, [id]: true };
          localStorage.setItem("submittedPosts", JSON.stringify(updatedState));
          return updatedState;
        });
      } else {
        console.error("Failed to update receipt number:", result);
      }
    } catch (error) {
      console.error("Error updating receipt number:", error);
    }
  };





  // Fetch products and categories on load
  useEffect(() => {
    fetchProducts();
  }, []);

const fetchProducts = async () => {
  try {
    const response = await fetch('/api/orderz');
    if (response.ok) {
      const data = await response.json();

      // Filter out deleted items
      const filteredData = data.filter(item => item.delete !== true);

      setTemp(filteredData);
    } else {
      console.error('Failed to fetch products');
    }
  } catch (error) {
    console.error('Error fetching products', error);
  }
};





  const handlePaymentUpdate = async (id) => {
    try {
      const response = await fetch(`/api/orderz/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      });

      if (response.ok) {
        setTemp((prevOrders) =>
          prevOrders.map((order) =>
            order.id === id ? { ...order, paid: true } : order
          )
        );
      } else {
        console.error("Failed to update payment status.");
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };

  const handlePaymentUpdate1 = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus; // Toggle fulfillment status

      const response = await fetch(`/api/orderz/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillment: newStatus }),
      });

      if (response.ok) {
        setTemp((prevOrders) =>
          prevOrders.map((order) =>
            order.id === id ? { ...order, fulfillment: newStatus } : order
          )
        );
      } else {
        console.error("Failed to update fulfillment status.");
      }
    } catch (error) {
      console.error("Error updating order:", error);
    }
  };







  const handleDeleteOrder = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this order?");
    if (!confirmDelete) return; // If user clicks Cancel, stop the function

    let data

    try {
      const response = await fetch(`/api/orderz/${id}`, {
        method: "GET",
      });

      if (response.ok) {
        data = await response.json(); // Parse the response JSON
        console.log("Order data:", data);   // Log the data
      } else {
        console.error("Failed to get order");
      }
    } catch (error) {
      console.error("Error get order:", error);
    }







    if (Array.isArray(data.userInfo)) {
      for (const item of data.userInfo) {


        if (item.type === "single") {
          // Case 1: Single product, no colors or sizes
          await fetch(`api/stock3`, {
            method: "PATCH",
            headers: {
              'Content-Type': 'text/plain',
            },
            body: `${item._id || item.id},${item.quantity}`,
          });

        } else if (item.type === "collection") {
          const hasSizes = item.selectedSize && item.selectedSize.length > 0;

          if (hasSizes) {
            // Case 3: Collection with color and sizes
            const payload = `${item._id || item.id},${item.quantity},${item.selectedColor},${item.selectedSize}`;
            console.log('PATCH to api/stock5 with payload:', payload);

            await fetch(`api/stock5`, {
              method: "PATCH",
              headers: {
                'Content-Type': 'application/json',
              },
              body: payload,
            });
          } else {
            // Case 2: Collection with color only (no sizes)
            const payload = `${item._id || item.id},${item.quantity},${item.selectedColor}`;
            console.log('PATCH to api/stock4 with payload:', payload);

            await fetch(`api/stock4`, {
              method: "PATCH",
              headers: {
                'Content-Type': 'application/json',
              },
              body: payload,
            });
          }


        }


      }

    }

try {
  const response = await fetch(`/api/orderz/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ delete: true }),
  });

  if (response.ok) {
    console.log("Order marked as deleted");
    // Refresh orders after update
    window.location.replace("/reservation1");
  } else {
    console.error("Failed to mark order as deleted");
  }
} catch (error) {
  console.error("Error updating order:", error);
}

  };









  const calculateOrderTotal = async (order) => {
    let orderTotal = 0;

    for (const item of order.userInfo) {
      let price = 0;

      if (item.type === "single" || (item.type === "collection" && !item.selectedSize)) {
        // Single type or collection without size (flat price)
        price = parseFloat(item.discount || "0");
      } else if (item.type === "collection" && item.selectedColor && item.selectedSize) {
        // Collection with size: find price based on selectedColor and selectedSize
        // Fix: match color by title, NOT by c.color
        const selectedColorObj = item.color?.find(
          (c) => c.title.toLowerCase() === item.selectedColor.toLowerCase()
        );
        const selectedSizeObj = selectedColorObj?.sizes?.find(s => s.size === item.selectedSize);
        price = parseFloat(selectedSizeObj?.price || "0");
      }

      const qty = parseInt(item.quantity || 1, 10);
      orderTotal += price * qty;
    }

    const delivery = parseFloat(order.delivery || "0");
    orderTotal += delivery;

    let discountPercent = 0;

    if (order.code) {
      try {
        const res = await fetch(`/api/offer/${order.code}`);
        if (res.ok) {
          const data = await res.json();
          discountPercent = data?.per || 0;
        }
      } catch (err) {
        console.error("Discount API failed", err);
      }
    }

    const discountAmount = (orderTotal * discountPercent) / 100;
    return (orderTotal - discountAmount).toFixed(2);
  };



  useEffect(() => {
    const fetchTotals = async () => {
      if (!Array.isArray(allTemp)) return;
      const result = {};
      for (const order of allTemp) {
        const total = await calculateOrderTotal(order);
        result[order.oid] = total;
      }
      setTotals(result);
    };

    fetchTotals();
  }, [allTemp]);


  return (
    <div className="rd-page rd-page--wide">
      <PageHeader
        title="Orders"
        subtitle="Shop orders from the website. Enter the receipt number first, then mark the order paid and fulfilled."
        actions={<ExportButton allTemp={allTemp} />}
      />

      <div className="rd-toolbar">
        <div className="rd-search">
          <Search size={16} />
          <input
            type="text"
            value={filterClientName}
            onChange={(e) => setFilterClientName(e.target.value)}
            placeholder="Client name"
            className="rd-input"
          />
        </div>
        <input
          type="text"
          value={filterReceiptNum}
          onChange={(e) => setFilterReceiptNum(e.target.value)}
          placeholder="Receipt #"
          className="rd-input"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rd-input"
          aria-label="From date"
          title="From date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rd-input"
          aria-label="To date"
          title="To date"
        />
      </div>

      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Receipt #</th>
              <th>Image</th>
              <th>Client</th>
              <th className="is-num">Total</th>
              <th className="is-num">Items</th>
              <th>Code</th>
              <th>Date</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData?.length > 0 ? (
              filteredData.map((post) => (
                <tr key={post.id}>
                  <td className="rd-cell-title">{post.oid}</td>
                  <td>
                    {submittedPosts[post.id] ? (
                      <span className="rd-mono">{updatedNums[post.id] || post.num}</span>
                    ) : (
                      <div className="rd-actions" style={{ flexWrap: "nowrap" }}>
                        <input
                          type="text"
                          value={updatedNums[post.id] || post.num || ""}
                          onChange={(e) => handleInputChange(post.id, e.target.value)}
                          placeholder="Receipt number"
                          className="rd-input rd-input--sm"
                          style={{ width: 150 }}
                        />
                        <button onClick={() => handleUpdate(post.id)} className="rd-btn rd-btn--ghost rd-btn--sm">
                          Submit
                        </button>
                      </div>
                    )}
                  </td>

                  <td>
                    <img src={post.userInfo[0].img[0]} width={40} height={40} className="rd-thumb" style={{ width: 40, height: 40 }} />
                  </td>
                  <td>{post.cartItems.fname}</td>
                  <td className="is-num">${totals[post.oid] ?? post.total}</td>
                  <td className="is-num">
                    {post.userInfo?.reduce(
                      (acc, item) =>
                        acc + (isNaN(item.quantity) ? 0 : Number(item.quantity)),
                      0
                    )}
                  </td>
                  <td className="rd-mono is-muted">{post.code}</td>
                  <td className="is-nowrap is-muted">{post.date}</td>
                  <td className="is-actions">
                    <div className="rd-row-actions">
                      <a className="rd-btn rd-btn--ghost rd-btn--sm" href={`/order1?id=${post.id}`}>
                        <Eye size={14} /> View
                      </a>
                      <button
                        className={`rd-btn rd-btn--sm ${post.paid ? "rd-btn--done" : "rd-btn--primary"}`}
                        onClick={() => !post.paid && handlePaymentUpdate(post.id)}
                        disabled={
                          !((updatedNums[post.id] || post.num) && submittedPosts[post.id]) || post.paid
                        } // Disable if no receipt or not submitted
                        title={post.paid ? "Paid" : "Mark as paid (needs the receipt number)"}
                      >
                        {post.paid ? <><Check size={14} /> Paid</> : "Unpaid"}
                      </button>
                      <button
                        className={`rd-btn rd-btn--sm ${post.fulfillment ? "rd-btn--done" : "rd-btn--primary"}`}
                        onClick={() => handlePaymentUpdate1(post.id, post.fulfillment)}
                        disabled={
                          !((updatedNums[post.id] || post.num) && submittedPosts[post.id])
                        } // Disable if no receipt or not submitted
                        title={post.fulfillment ? "Fulfilled — click to undo" : "Mark as fulfilled (needs the receipt number)"}
                      >
                        {post.fulfillment ? <><Check size={14} /> Fulfilled</> : "Unfulfilled"}
                      </button>
                      <button onClick={() => handleDeleteOrder(post.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="rd-empty">
                  {allTemp ? "No matching records found." : "Loading…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default page