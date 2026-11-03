'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageCategory = () => {
  const [formData, setFormData] = useState({ name: '', img: [] });
  const [editFormData, setEditFormData] = useState({ id: '', name: '', img: [] });
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [img, setImg] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const router = useRouter();

  // ✅ Fetch all factories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/factory', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        console.error('Failed to fetch factories');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ✅ Add factory
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/factory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage('Factory added successfully!');
      setFormData({ name: '', img: [] });
      fetchCategories();
       window.location.replace("/factory");
    } else {
      const errorData = await res.json();
      setMessage(`Error: ${errorData.error}`);
    }
  };

  // ✅ Edit factory
  const handleEdit = (category) => {
    setEditMode(true);
    setEditFormData({
      id: category.id,
      name: category.name,
      img: category.img,
    });
    setImg(category.img);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/factory?id=${encodeURIComponent(editFormData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name,
          img: img,
        }),
      });

      if (res.ok) {
        setEditFormData({ id: '', name: '', img: [] });
        setEditMode(false);
        fetchCategories();
         window.location.replace("/factory");
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating the Factory.');
    }
  };

  // ✅ Delete factory
  const handleDelete = async (id) => {
    if (confirm(`Are you sure you want to delete this Factory?`)) {
      try {
        const res = await fetch(`/api/factory?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessage('Factory deleted successfully!');
          fetchCategories();
           window.location.replace("/factory");
        } else {
          const errorData = await res.json();
          setMessage(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  // ✅ Handle image upload
  const handleImgChange = (urls) => {
    if (Array.isArray(urls) && urls.length > 0) {
      setImg(urls);
    }
  };

  useEffect(() => {
    if (editMode) return; // editing uses `img` directly; keep the Add form clean
    if (Array.isArray(img) && img.length > 0) {
      setFormData((prevState) => ({ ...prevState, img }));
    }
  }, [img, editMode]);

 
  return (
    <div className="rd-page">
      <PageHeader title={editMode ? 'Edit Brand' : 'Add Brand'} subtitle="The product brands of the online shop." />

      {/* ADD / EDIT FORM */}
      <form
        onSubmit={editMode ? handleEditSubmit : handleSubmit}
        className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}
      >
        <label className="rd-field">
          <span className="rd-label">Name</span>
          <input
            type="text"
            placeholder="Brand name"
            value={editMode ? editFormData.name : formData.name}
            onChange={(e) =>
              editMode
                ? setEditFormData({ ...editFormData, name: e.target.value })
                : setFormData({ ...formData, name: e.target.value })
            }
            required
            className="rd-input"
          />
        </label>

        <Upload key={editFormData.id || 'new'} onImagesUpload={handleImgChange} />

        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update brand' : 'Add brand'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setEditFormData({ id: '', name: '', img: [] });
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

      {/* TABLE */}
      <div className="rd-section">
        <span>All brands · {categories.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const fileUrl = category.img?.[0];
              const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
              return (
              <tr key={category.id}>
                <td style={{ width: 1 }}>
                  {fileUrl ? (
                    isVideo ? (
                      <video controls className="rd-video">
                        <source src={fileUrl} type="video/mp4" />
                      </video>
                    ) : (
                      <img src={fileUrl} alt={category.name} className="rd-thumb" />
                    )
                  ) : (
                    '—'
                  )}
                </td>
                <td className="rd-cell-title">{category.name}</td>
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
            );
            })}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="rd-empty">
                  No brands yet.
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
