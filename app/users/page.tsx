'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

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
    <div className="rd-page">
      <PageHeader title="Customers" subtitle={`${rows.length} registered account${rows.length === 1 ? '' : 's'} on the website.`} />

      <div className="rd-search" style={{ marginBottom: 16 }}>
        <Search size={16} />
        <input className="rd-input" placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th className="is-center">Wishlist</th>
              <th className="is-center">Reviews</th>
              <th>Joined</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td className="rd-cell-title">{u.name}</td>
                <td>{u.email}</td>
                <td className="is-nowrap">{u.phone || '—'}</td>
                <td className="is-center">{u._count?.favorites ?? 0}</td>
                <td className="is-center">{u._count?.reviews ?? 0}</td>
                <td className="is-nowrap is-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="is-actions">
                  <button onClick={() => remove(u.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="rd-empty">
                  {rows.length ? 'No customer matches this search.' : 'No customers yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
