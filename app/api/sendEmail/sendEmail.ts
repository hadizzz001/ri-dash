"use server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailPayload = {
    orderId: string; // booking reference (or the order id for older bookings)
    name: string;
    email: string;
    phone: string;
    total: number; // full order total
    date: string;
    hour: string;
    country: string;
    city: string;
};

export const sendEmail = async (data: EmailPayload) => {
    const {
        orderId,
        name,
        email,
        phone,
        total,
        date,
        hour,
        country,
        city,
    } = data;

    // Bookings outside Lebanon are confirmed with a 25% down payment;
    // inside Lebanon there is no deposit, so the payment is the full total
    const isDeposit = country !== "Lebanon";
    const amount = Number((Number(total) * (isDeposit ? 0.25 : 1)).toFixed(2));
    const amountLabel = isDeposit ? "Amount Paid (25% Down Payment)" : "Amount Paid";

    await resend.emails.send({
        from: "noreply@rafidaham.com",
        to: email,
        subject: `Payment Receipt From Rafi Daham`,
        text: `
Thank you for your payment!

Order ID: ${orderId}
Customer: ${name}
Email: ${email}
Phone: ${phone}
Appointment Date: ${date} - ${hour}

${amountLabel}: $${amount}

Rafi Daham
        `,
        html: `
<div style="font-family: Arial, sans-serif; background:#f6f6f6; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; padding:30px; border-radius:6px;">
    <h2 style="text-align:center;">Payment Receipt</h2>

    <p>Thank you <strong>${name}</strong>, your payment was successful.</p>

    <hr />

    <p><strong>Order ID:</strong> ${orderId}</p>
    <p><strong>Appointment Date:</strong> ${date} - ${hour}</p>
    <p><strong>Appointment Location:</strong> ${country} - ${city}</p>

    <h3>Customer Info</h3>
    <p>${name}</p>
    <p>${email}</p>
    <p>${phone}</p>

    <h3>${amountLabel}</h3>
    <p style="font-size:18px;"><strong>$${amount}</strong></p>

    <p style="margin-top:30px;">— Rafi Daham</p>
  </div>
</div>
        `,
    });
};
