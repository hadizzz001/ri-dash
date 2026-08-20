'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';

const ManageAds = () => {
  const [url, setUrl] = useState('');
  const [img, setImg] = useState([]);
  const [ads, setAds] = useState([]);
  const [message, setMessage] = useState('');
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);

  const editMode = Boolean(editId);

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/ads', { method: 'GET' });
      if (res.ok) {
        setAds(await res.json());
      } else {
        console.error('Failed to fetch ads');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const resetForm = () => {
    setUrl('');
    setImg([]);
    setEditId('');
  };

  const handleImgChange = (urls) => {
    if (Array.isArray(urls) && urls.length > 0) {
      setImg(urls);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!img || img.length === 0) {
      setMessage('Error: Please upload an image.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editMode ? `/api/ads?id=${encodeURIComponent(editId)}` : '/api/ads',
        {
          method: editMode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, img }),
        }
      );

      if (res.ok) {
        setMessage(editMode ? 'Ad updated successfully!' : 'Ad added successfully!');
        resetForm();
        window.location.reload();
        return;
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while saving the ad.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ad) => {
    setEditId(ad.id);
    setUrl(ad.url || '');
    setImg(ad.img || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this Ad?')) return;
    try {
      const res = await fetch(`/api/ads?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Ad deleted successfully!');
        if (editId === id) resetForm();
        fetchAds();
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 text-[13px]">
      <h1 className="text-2xl font-bold mb-4">{editMode ? 'Edit Ad Image' : 'Add Ad Image'}</h1>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <input
          type="text"
          placeholder="Redirect URL (e.g. /shop?brnd=Rolex or https://example.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="border p-2 w-full"
        />

        <Upload key={editId || 'new'} onImagesUpload={handleImgChange} />

        {img.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {img.map((src, i) => (
              <img key={i} src={src} alt="" className="w-32 h-20 object-cover rounded border" />
            ))}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? 'Saving...' : editMode ? 'Update Ad' : 'Add Ad'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded ml-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Image</th>
            <th className="border p-2 text-left">Redirect URL</th>
            <th className="border p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id}>
              <td className="border p-2">
                {ad.img?.[0] ? (
                  <img src={ad.img[0]} alt="" className="w-28 h-16 object-cover rounded" />
                ) : (
                  '—'
                )}
              </td>
              <td className="border p-2 break-all">{ad.url}</td>
              <td className="border p-2 whitespace-nowrap">
                <button
                  onClick={() => handleEdit(ad)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ad.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
};

export default ManageAds;
