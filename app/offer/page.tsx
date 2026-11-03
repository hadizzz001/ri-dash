'use client';

import { useState, useEffect } from 'react';
import { redirect, useRouter } from 'next/navigation';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageCategory = () => {
  const [formData, setFormData] = useState({ code: '', per: 0 });
  const [editFormData, setEditFormData] = useState({ id: '', code: '', per: 0 });
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const router = useRouter();

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/offer', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        console.error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage('Category added successfully!');
      setFormData({ code: '', per: 0 });
      fetchCategories();
      router.push('/offer');
    } else {
      const errorData = await res.json();
      setMessage(`Error: ${errorData.error}`);
    }
  };

  const handleEdit = (category) => {
    setEditMode(true);
    setEditFormData({
      id: category.id,
      code: category.code,
      per: category.per,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/offer?id=${encodeURIComponent(editFormData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        setEditFormData({ id: '', code: '', per: 0 });
        setEditMode(false);
        fetchCategories();
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating the category.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this category?')) {
      try {
        const res = await fetch(`/api/offer?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessage('Category deleted successfully!');
          fetchCategories();
          redirect('/offer');
        } else {
          const errorData = await res.json();
          setMessage(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  return (
    <div className="rd-page rd-page--narrow">
      <PageHeader title={editMode ? 'Edit Code' : 'Add Code'} subtitle="Discount codes clients can use at the shop checkout." />
      <form
        onSubmit={editMode ? handleEditSubmit : handleSubmit}
        className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}
      >
        <div className="rd-grid">
          <label className="rd-field">
            <span className="rd-label">Code</span>
            <input
              type="text"
              className="rd-input rd-mono"
              value={editMode ? editFormData.code : formData.code}
              onChange={(e) =>
                editMode
                  ? setEditFormData({ ...editFormData, code: e.target.value })
                  : setFormData({ ...formData, code: e.target.value })
              }
              required
            />
          </label>
          <label className="rd-field">
            <span className="rd-label">Percentage</span>
            <input
              type="number"
              className="rd-input"
              value={editMode ? editFormData.per : formData.per}
              onChange={(e) =>
                editMode
                  ? setEditFormData({ ...editFormData, per: parseInt(e.target.value) })
                  : setFormData({ ...formData, per: parseInt(e.target.value) })
              }
              required
            />
          </label>
        </div>
        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update code' : 'Add code'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setEditFormData({ id: '', code: '', per: 0 });
              }}
              className="rd-btn rd-btn--ghost"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <Notice text={message} />

      <div className="rd-section">
        <span>All codes · {categories.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Percentage</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length > 0 ? (
              categories.map((category) => (
                <tr key={category.id}>
                  <td className="rd-mono rd-cell-title">{category.code}</td>
                  <td>
                    <span className="rd-badge rd-badge--accent">{category.per}%</span>
                  </td>
                  <td className="is-actions">
                    <div className="rd-row-actions">
                      <button onClick={() => handleEdit(category)} className="rd-btn rd-btn--ghost rd-btn--sm">
                        <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(category.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="rd-empty">
                  No codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageCategory;