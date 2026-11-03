'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageService = () => {
  const [formData, setFormData] = useState({ title: '' });
  const [editFormData, setEditFormData] = useState({ id: '', title: '' });
  const [message, setMessage] = useState('');
  const [services, setServices] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/cat', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      } else {
        console.error('Failed to fetch Category');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/cat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage('Category added successfully!');
      setFormData({ title: '' });
      fetchServices();
      window.location.href = '/cat';
    } else {
      const errorData = await res.json();
      setMessage(`Error: ${errorData.error}`);
    }
  };

  const handleEdit = (service) => {
    setEditMode(true);
    setEditFormData({
      id: service.id,
      title: service.title,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `/api/cat?id=${encodeURIComponent(editFormData.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: editFormData.title,
          }),
        }
      );

      if (res.ok) {
        window.location.reload();
        setEditFormData({ id: '', title: '' });
        setEditMode(false);
        fetchServices();
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating the Category.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this Category?')) {
      try {
        const res = await fetch(
          `/api/cat?id=${encodeURIComponent(id)}`,
          { method: 'DELETE' }
        );
        if (res.ok) {
          setMessage('Category deleted successfully!');
          fetchServices();
          redirect('/cat');
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
    <div className="rd-page">
      <PageHeader title={editMode ? 'Edit Category' : 'Add Category'} subtitle="The service categories clients choose from when booking." />

      <form
        onSubmit={editMode ? handleEditSubmit : handleSubmit}
        className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}
      >
        <label className="rd-field">
          <span className="rd-label">Title</span>
          <input
            type="text"
            className="rd-input"
            value={editMode ? editFormData.title : formData.title}
            onChange={(e) =>
              editMode
                ? setEditFormData({ ...editFormData, title: e.target.value })
                : setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </label>

        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update category' : 'Add category'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setEditFormData({ id: '', title: '' });
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
        <span>All categories · {services.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Title</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length > 0 ? (
              services.map((service) => (
                <tr key={service.id}>
                  <td className="rd-cell-title">{service.title}</td>
                  <td className="is-actions">
                    <div className="rd-row-actions">
                      <button onClick={() => handleEdit(service)} className="rd-btn rd-btn--ghost rd-btn--sm">
                        <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(service.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="rd-empty">
                  No categories yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageService;
