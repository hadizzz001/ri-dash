'use client';

import { useState, useEffect } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import Upload from '../components/Upload';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

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
    <div className="rd-page">
      <PageHeader title={editMode ? 'Edit Ad Image' : 'Add Ad Image'} subtitle="The ad banners on the website, each opening a page when tapped." />

      <form onSubmit={handleSubmit} className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}>
        <label className="rd-field">
          <span className="rd-label">Redirect URL</span>
          <input
            type="text"
            placeholder="e.g. /shop?brnd=Rolex or https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="rd-input"
          />
        </label>

        <Upload key={editId || 'new'} onImagesUpload={handleImgChange} />

        {img.length > 0 && (
          <div className="rd-thumbs">
            {img.map((src, i) => (
              <img key={i} src={src} alt="" className="rd-thumb rd-thumb--wide" />
            ))}
          </div>
        )}

        <div className="rd-actions">
          <button type="submit" disabled={saving} className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {saving ? 'Saving…' : editMode ? 'Update ad' : 'Add ad'}
          </button>
          {editMode && (
            <button type="button" onClick={resetForm} className="rd-btn rd-btn--ghost">
              Cancel
            </button>
          )}
        </div>
      </form>

      <Notice text={message} />

      <div className="rd-section">
        <span>All ads · {ads.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Redirect URL</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad) => (
              <tr key={ad.id}>
                <td style={{ width: 1 }}>
                  {ad.img?.[0] ? <img src={ad.img[0]} alt="" className="rd-thumb rd-thumb--wide" /> : '—'}
                </td>
                <td className="break-all">{ad.url}</td>
                <td className="is-actions">
                  <div className="rd-row-actions">
                    <button onClick={() => handleEdit(ad)} className="rd-btn rd-btn--ghost rd-btn--sm">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(ad.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ads.length === 0 && (
              <tr>
                <td colSpan={3} className="rd-empty">
                  No ads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageAds;
