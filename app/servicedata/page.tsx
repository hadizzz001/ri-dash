'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';

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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {editMode ? 'Edit Service Data' : 'Add Service Data'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Service</label>
          <select
            className="border p-2 w-full"
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            required
          >
            <option value="">-- Select a service --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Title</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block mb-1">Description</label>
          <textarea
            className="border p-2 w-full"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>

        <Upload onImagesUpload={(urls) => Array.isArray(urls) && urls.length && setImg(urls)} />

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-500 text-white px-4 py-2">
            {editMode ? 'Update' : 'Add'}
          </button>
          {editMode && (
            <button type="button" onClick={reset} className="bg-gray-400 text-white px-4 py-2">
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && <p className="mt-4">{message}</p>}

      <h2 className="text-xl font-bold mt-8">All Service Data</h2>
      <table className="table-auto border-collapse border border-gray-300 w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Service</th>
            <th className="border border-gray-300 p-2">Title</th>
            <th className="border border-gray-300 p-2">Description</th>
            <th className="border border-gray-300 p-2">Image</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="border border-gray-300 p-2">{serviceTitle(row.serviceId)}</td>
                <td className="border border-gray-300 p-2">{row.title}</td>
                <td className="border border-gray-300 p-2">{row.description}</td>
                <td className="border border-gray-300 p-2">
                  {row.img?.[0] && <img src={row.img[0]} alt={row.title} className="w-24 h-auto" />}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  <button
                    onClick={() => handleEdit(row)}
                    className="bg-yellow-500 text-white px-4 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="bg-red-500 text-white px-4 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="border border-gray-300 p-2 text-center">
                No service data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ManageServiceData;
