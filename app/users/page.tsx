'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');

  const load = async () => {
    const res = await fetch('/api/users');
    if (res.ok) setRows(await res.json());
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Delete this customer account (and their wishlist + reviews)?')) return;
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    load();
  };

  const filtered = rows.filter((u) => {
    const s = q.toLowerCase();
    return !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.phone?.includes(s);
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Customers</h1>
      <p className="mb-4 text-gray-600">{rows.length} registered accounts</p>
      <input className="border p-2 w-full mb-4" placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} />

      <table className="table-auto border-collapse border border-gray-300 w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 p-2">Name</th>
            <th className="border border-gray-300 p-2">Email</th>
            <th className="border border-gray-300 p-2">Phone</th>
            <th className="border border-gray-300 p-2">Wishlist</th>
            <th className="border border-gray-300 p-2">Reviews</th>
            <th className="border border-gray-300 p-2">Joined</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td className="border border-gray-300 p-2">{u.name}</td>
              <td className="border border-gray-300 p-2">{u.email}</td>
              <td className="border border-gray-300 p-2">{u.phone || '—'}</td>
              <td className="border border-gray-300 p-2 text-center">{u._count?.favorites ?? 0}</td>
              <td className="border border-gray-300 p-2 text-center">{u._count?.reviews ?? 0}</td>
              <td className="border border-gray-300 p-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
              <td className="border border-gray-300 p-2 text-center">
                <button onClick={() => remove(u.id)} className="bg-red-500 text-white px-2 py-1">Delete</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">No customers yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
