'use client';

import { useState, useEffect } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import Upload from '../components/Upload';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const empty = { id: '', serviceId: '', title: '', description: '' };

const ManageServiceData = () => {
  const [form, setForm] = useState(empty);
  const [img, setImg] = useState([]);
  const [rows, setRows] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');

  const editMode = Boolean(form.id);

  const fetchAll = async () => {
    try {
      const [sdRes, sRes] = await Promise.all([
        fetch('/api/servicedata'),
        fetch('/api/service'),
      ]);
      setRows(sdRes.ok ? await sdRes.json() : []);
      setServices(sRes.ok ? await sRes.json() : []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const reset = () => {
    setForm(empty);
    setImg([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = editMode
      ? `/api/servicedata?id=${encodeURIComponent(form.id)}`
      : '/api/servicedata';

    try {
      const res = await fetch(url, {
        method: editMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: form.serviceId,
          title: form.title,
          description: form.description,
          img,
        }),
      });

      if (res.ok) {
        setMessage(editMode ? 'Updated successfully!' : 'Added successfully!');
        window.location.href = '/servicedata';
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error: request failed, please try again.');
    }
  };

  const handleEdit = (row) => {
    setForm({
      id: row.id,
      serviceId: row.serviceId,
      title: row.title,
      description: row.description,
    });
    setImg(row.img || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service data?')) return;
    try {
      const res = await fetch(`/api/servicedata?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage('Deleted successfully!');
        window.location.href = '/servicedata';
      } else {
        const errorData = await res.json().catch(() => ({}));
        setMessage(`Error: ${errorData.error || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error: request failed, please try again.');
    }
  };

  const serviceTitle = (id) =>
    services.find((s) => s.id === id)?.title || id;

  return (
    <div className="rd-page">
      <PageHeader
        title={editMode ? 'Edit Service Data' : 'Add Service Data'}
        subtitle="Extra details and photos shown on a service’s own page."
      />

      <form onSubmit={handleSubmit} className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}>
        <div className="rd-grid">
          <label className="rd-field">
            <span className="rd-label">Service</span>
            <select
              className="rd-input"
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              required
            >
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <label className="rd-field">
            <span className="rd-label">Title</span>
            <input
              type="text"
              className="rd-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
        </div>

        <label className="rd-field">
          <span className="rd-label">Description</span>
          <textarea
            className="rd-input"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </label>

        <Upload onImagesUpload={(urls) => Array.isArray(urls) && urls.length && setImg(urls)} />

        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update' : 'Add'}
          </button>
          {editMode && (
            <button type="button" onClick={reset} className="rd-btn rd-btn--ghost">
              Cancel
            </button>
          )}
        </div>
      </form>

      <Notice text={message} />

      <div className="rd-section">
        <span>All service data · {rows.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Service</th>
              <th>Title</th>
              <th>Description</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ width: 1 }}>
                    {row.img?.[0] && <img src={row.img[0]} alt={row.title} className="rd-thumb" />}
                  </td>
                  <td>
                    <span className="rd-badge rd-badge--accent">{serviceTitle(row.serviceId)}</span>
                  </td>
                  <td className="rd-cell-title">{row.title}</td>
                  <td className="is-wrap is-muted">
                    <span className="rd-clamp">{row.description}</span>
                  </td>
                  <td className="is-actions">
                    <div className="rd-row-actions">
                      <button onClick={() => handleEdit(row)} className="rd-btn rd-btn--ghost rd-btn--sm">
                        <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="rd-empty">
                  No service data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageServiceData;
