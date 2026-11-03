'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import { redirect } from 'next/navigation';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageService = () => {
  const [formData, setFormData] = useState({ title: '', description: '', img: [] });
  const [editFormData, setEditFormData] = useState({ id: '', title: '', description: '', img: [] });
  const [message, setMessage] = useState('');
  const [services, setServices] = useState([]);
  const [img, setImg] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/service', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      } else {
        console.error('Failed to fetch services');
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
    const res = await fetch('/api/service', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, img }),
    });

    if (res.ok) {
      setMessage('Service added successfully!');
      setFormData({ title: '', description: '', img: [] });
      setImg([]);
      fetchServices();
      window.location.href = '/service';
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
      description: service.description,
      img: service.img,
    });
    setImg(service.img);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/service?id=${encodeURIComponent(editFormData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          img,
        }),
      });

      if (res.ok) {
        window.location.reload();
        setEditFormData({ id: '', title: '', description: '', img: [] });
        setEditMode(false);
        fetchServices();
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating the service.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm(`Are you sure you want to delete this service?`)) {
      try {
        const res = await fetch(`/api/service?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessage('Service deleted successfully!');
          fetchServices();
          redirect('/service');
        } else {
          const errorData = await res.json();
          setMessage(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleImgChange = (urls) => {
    if (Array.isArray(urls) && urls.length > 0) {
      setImg(urls);
    }
  };

  useEffect(() => {
    if (editMode) return; // editing uses `img` directly; keep the Add form clean
    if (Array.isArray(img) && img.length > 0) {
      setFormData((prev) => ({ ...prev, img }));
    }
  }, [img, editMode]);

  return (
    <div className="rd-page">
      <PageHeader title={editMode ? 'Edit Service' : 'Add Service'} subtitle="The services shown on the website’s services page." />
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
        <label className="rd-field">
          <span className="rd-label">Description</span>
          <textarea
            className="rd-input"
            rows={3}
            value={editMode ? editFormData.description : formData.description}
            onChange={(e) =>
              editMode
                ? setEditFormData({ ...editFormData, description: e.target.value })
                : setFormData({ ...formData, description: e.target.value })
            }
            required
          />
        </label>
        <Upload key={editFormData.id || 'new'} onImagesUpload={handleImgChange} />
        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update service' : 'Add service'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setEditFormData({ id: '', title: '', description: '', img: [] });
                setImg([]);
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
        <span>All services · {services.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Description</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.length > 0 ? (
              services.map((service) => {
                const fileUrl = service.img[0];
                const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
                return (
                  <tr key={service.id}>
                    <td style={{ width: 1 }}>
                      {isVideo ? (
                        <video controls className="rd-video">
                          <source src={fileUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img src={fileUrl} alt="Service" className="rd-thumb" />
                      )}
                    </td>
                    <td className="rd-cell-title">{service.title}</td>
                    <td className="is-wrap is-muted">
                      <span className="rd-clamp">{service.description}</span>
                    </td>
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
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="rd-empty">
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .uploadcare--widget {
              background: black;
            }
          `,
        }}
      />
    </div>
  );
};

export default ManageService;
