'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

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
    <div className="rd-page">
      <PageHeader title="Product Reviews" subtitle={`${rows.length} review${rows.length === 1 ? '' : 's'} · average rating ${avg}`} />

      <div className="rd-search" style={{ marginBottom: 16 }}>
        <Search size={16} />
        <input className="rd-input" placeholder="Search by product, customer or text…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Notice text={msg} />

      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Date</th>
              <th>Visible</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.approved ? '' : 'is-faded'}>
                <td>
                  <div className="flex items-center gap-2">
                    {r.productImg && <img src={r.productImg} alt="" className="rd-thumb" style={{ width: 40, height: 40 }} />}
                    <span className="rd-cell-title">{r.productTitle}</span>
                  </div>
                </td>
                <td>
                  {r.userName}
                  {r.verified && <span className="rd-cell-sub" style={{ color: '#067647' }}>✓ verified buyer</span>}
                </td>
                <td className="is-nowrap"><Stars n={r.rating} /></td>
                <td className="is-wrap">
                  {r.title && <span className="rd-cell-title" style={{ display: 'block' }}>{r.title}</span>}
                  <span className="is-muted">{r.comment}</span>
                </td>
                <td className="is-nowrap is-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => toggle(r)}
                    className={`rd-btn rd-btn--sm ${r.approved ? 'rd-btn--ghost' : 'rd-btn--quiet'}`}
                    title={r.approved ? 'Shown on the website — click to hide' : 'Hidden — click to show'}
                  >
                    {r.approved ? <Eye size={14} /> : <EyeOff size={14} />}
                    {r.approved ? 'Shown' : 'Hidden'}
                  </button>
                </td>
                <td className="is-actions">
                  <button onClick={() => remove(r.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="rd-empty">
                  {rows.length ? 'No review matches this search.' : 'No reviews yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
