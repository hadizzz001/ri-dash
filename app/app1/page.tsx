'use client';

import { useEffect, useState } from 'react';

/**
 * Booking schedule. The website opens booking automatically — every country,
 * every day, 08:00 to midnight (my-app/app/lib/bookingOptions.js) — so there
 * are no slots to add here any more: this page shows the rules the website
 * applies and the upcoming appointments that hold a time.
 */

const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const ManageAppointments = () => {
  const [tax, setTax] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/tax')
      .then((res) => res.json())
      .then((data) => setTax(Number(data.percent) || 0))
      .catch(() => setTax(null));
    fetch('/api/order')
      .then((res) => res.json())
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]));
  }, []);

  const today = todayISO();
  const upcoming = (orders || [])
    .filter((o) => o.date >= today && o.status !== 'cancelled')
    .sort((a, b) => `${a.date} ${a.hour}`.localeCompare(`${b.date} ${b.hour}`));

  const rules: [string, React.ReactNode][] = [
    ['Countries', 'Every country. In Lebanon the client picks Beirut or their district; elsewhere they type their city.'],
    ['Days', 'Every day, with no end date.'],
    ['Hours', '08:00 to midnight — a start time every 30 minutes, the last one at 23:30.'],
    ['Taken times', 'A time is taken once a client books it at that place, and free again if the booking is cancelled.'],
    [
      'Tax',
      <>
        Beirut 0% · everywhere else {tax === null ? '…' : `${tax}%`} (<a href="/tax" className="!text-blue-700 underline">change</a>)
      </>,
    ],
    ['Deposit', 'None inside Lebanon · 25% of the total for bookings outside Lebanon.'],
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Booking Schedule</h1>
      <p className="text-gray-600 mb-4">
        Online booking is open automatically, so there are no dates or hours to add.
      </p>

      <div className="border rounded-md p-4 mb-8 bg-gray-50">
        <dl className="grid gap-x-6 gap-y-3 m-0" style={{ gridTemplateColumns: 'max-content 1fr' }}>
          {rules.map(([label, text]) => (
            <div key={label} className="contents">
              <dt className="font-semibold">{label}</dt>
              <dd className="m-0">{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <h2 className="text-xl font-bold mb-2">Upcoming appointments</h2>
      <p className="text-gray-600 mb-3">
        Their times are taken. Payments, cancelled bookings and details are under{' '}
        <a href="/reservation" className="!text-blue-700 underline">View Appointments</a>.
      </p>
      <table className="w-full border border-collapse border-gray-300">
        <thead>
          <tr>
            <th className="border p-2">Date</th>
            <th className="border p-2">Time</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">Client</th>
            <th className="border p-2">Service</th>
            <th className="border p-2">Reference</th>
          </tr>
        </thead>
        <tbody>
          {orders === null ? (
            <tr>
              <td colSpan={6} className="border p-2 text-center">Loading…</td>
            </tr>
          ) : upcoming.length === 0 ? (
            <tr>
              <td colSpan={6} className="border p-2 text-center">No upcoming appointments.</td>
            </tr>
          ) : (
            upcoming.map((o) => (
              <tr key={o.id}>
                <td className="border p-2">{new Date(`${o.date}T00:00:00`).toLocaleDateString()}</td>
                <td className="border p-2">{o.hour}</td>
                <td className="border p-2">{o.city}, {o.country}</td>
                <td className="border p-2">{o.name}</td>
                <td className="border p-2">{o.serviceType === 'home' ? 'Home' : o.serviceType === 'salon' ? 'Salon' : '—'}</td>
                <td className="border p-2">{o.reference || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ManageAppointments;
