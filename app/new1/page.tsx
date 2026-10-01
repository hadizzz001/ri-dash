'use client';

import { useState, useEffect } from 'react';

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
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Manage New1</h1>

      {/* Edit Form */}
      {editId && (
        <form onSubmit={handleUpdate} className="flex gap-2 mb-6 bg-yellow-50 p-3 rounded border border-yellow-300">
          <input
            type="text"
            className="border p-2 flex-1"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Update
          </button>
          <button
            type="button"
            onClick={() => { setEditId(''); setEditTitle(''); }}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </form>
      )}

      {message && <p className="mb-4 text-green-600">{message}</p>}

      {/* Items List */}
      <div className="space-y-2">
        {items.length === 0 && <p className="text-gray-500">No items yet.</p>}
        {items.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between border p-3 rounded">
            <span>{item.title}</span>
            <button
              onClick={() => handleEdit(item)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageNew1;
