'use client';

import { useState, useEffect } from 'react';
import { Pencil, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageNew1 = () => {
  const [editTitle, setEditTitle] = useState('');
  const [editId, setEditId] = useState('');
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/new1');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setEditTitle(item.title);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/new1?id=${encodeURIComponent(editId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle }),
      });
      if (res.ok) {
        setMessage('Updated successfully!');
        setEditId('');
        setEditTitle('');
        fetchItems();
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating.');
    }
  };

  return (
    <div className="rd-page rd-page--narrow">
      <PageHeader title="News Title" subtitle="The short news lines shown on the website." />

      {/* Edit Form */}
      {editId && (
        <form onSubmit={handleUpdate} className="rd-card rd-card--editing rd-form">
          <label className="rd-field">
            <span className="rd-label">Text</span>
            <input
              type="text"
              className="rd-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </label>
          <div className="rd-actions">
            <button type="submit" className="rd-btn rd-btn--primary">
              <Save size={16} /> Update
            </button>
            <button
              type="button"
              onClick={() => { setEditId(''); setEditTitle(''); }}
              className="rd-btn rd-btn--ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <Notice text={message} />

      {/* Items List */}
      <div className="rd-card">
        <div className="rd-list">
          {items.length === 0 && <p className="rd-empty-note">No items yet.</p>}
          {items.map((item: any) => (
            <div key={item.id} className="rd-list__row">
              <span>{item.title}</span>
              <button onClick={() => handleEdit(item)} className="rd-btn rd-btn--ghost rd-btn--sm">
                <Pencil size={14} /> Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageNew1;
