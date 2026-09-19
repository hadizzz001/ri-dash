'use client';

import { useEffect, useState } from 'react';

const Stars = ({ n }: { n: number }) => (
  <span style={{ color: '#111', letterSpacing: 1 }} title={`${n}/5`}>
    {'★'.repeat(n)}<span style={{ color: '#ccc' }}>{'★'.repeat(5 - n)}</span>
  </span>
);

export default function ReviewsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    const res = await fetch('/api/reviews');
    if (res.ok) setRows(await res.json());
  };
  useEffect(() => { load(); }, []);

  const toggle = async (r: any) => {
    await fetch(`/api/reviews?id=${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved: !r.approved }) });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    const res = await fetch(`/api/reviews?id=${id}`, { method: 'DELETE' });
    setMsg(res.ok ? 'Review deleted.' : 'Failed to delete.');
    load();
  };

  const filtered = rows.filter((r) => {
    const s = q.toLowerCase();
    return !s || r.productTitle?.toLowerCase().includes(s) || r.userName?.toLowerCase().includes(s) || r.comment?.toLowerCase().includes(s);
  });

  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(2) : '—';

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Product Reviews</h1>
      <p className="mb-4 text-gray-600">{rows.length} reviews · average rating {avg}</p>
      <input className="border p-2 w-full mb-4" placeholder="Search by product, customer or text…" value={q} onChange={(e) => setQ(e.target.value)} />
      {msg && <p className="mb-2">{msg}</p>}

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Product</th>
            <th className="border border-gray-300 p-2">Customer</th>
            <th className="border border-gray-300 p-2">Rating</th>
            <th className="border border-gray-300 p-2">Review</th>
            <th className="border border-gray-300 p-2">Date</th>
            <th className="border border-gray-300 p-2">Visible</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} style={{ opacity: r.approved ? 1 : 0.55 }}>
              <td className="border border-gray-300 p-2">
                <div className="flex items-center gap-2">
                  {r.productImg && <img src={r.productImg} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} />}
                  <span>{r.productTitle}</span>
                </div>
              </td>
              <td className="border border-gray-300 p-2">{r.userName}{r.verified && <span className="ml-1 text-green-700 text-xs">✓ verified</span>}</td>
              <td className="border border-gray-300 p-2 whitespace-nowrap"><Stars n={r.rating} /></td>
              <td className="border border-gray-300 p-2" style={{ maxWidth: 420 }}>
                {r.title && <b className="block">{r.title}</b>}
                <span className="text-sm">{r.comment}</span>
              </td>
              <td className="border border-gray-300 p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
              <td className="border border-gray-300 p-2 text-center">
                <button onClick={() => toggle(r)} className={`px-2 py-1 text-white ${r.approved ? 'bg-green-600' : 'bg-gray-500'}`}>{r.approved ? 'Shown' : 'Hidden'}</button>
              </td>
              <td className="border border-gray-300 p-2 text-center">
                <button onClick={() => remove(r.id)} className="bg-red-500 text-white px-2 py-1">Delete</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">No reviews yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
