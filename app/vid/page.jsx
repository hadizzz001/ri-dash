'use client';

import { useState, useEffect } from 'react';
import Upload1 from '../components/Upload1';
import { redirect, useRouter } from 'next/navigation';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageCategory = () => {
  const [formData, setFormData] = useState({   img: [] });
  const [editFormData, setEditFormData] = useState({ id: '',  img: [] });
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState([]);
  const [img, setImg] = useState([]); // Store images in an array
  const [editMode, setEditMode] = useState(false);
  const router = useRouter();
  // Fetch all categories
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/video', { method: 'GET' });
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
 
  

  // Add video
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch('/api/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
 
    

    if (res.ok) {
      setMessage('category added successfully!');
      setFormData({   img: [] });
      fetchCategories();
      window.location.href = '/vid';
      
    } else {
      const errorData = await res.json();
      setMessage(`Error: ${errorData.error}`);
    }
  };

  // Edit category
  const handleEdit = (category) => {
    setEditMode(true);
    setEditFormData({
      id: category.id, 
      img: category.img,
    });
    setImg(category.img); // Populate img state with existing images for editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/video?id=${encodeURIComponent(editFormData.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          img: img, // Ensure the updated image state is sent
        }),
      });

      if (res.ok) {
        window.location.reload(); 
        setEditFormData({ id: '' , img: [] });
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

  // Delete category
  const handleDelete = async (id) => {
    if (confirm(`Are you sure you want to delete this category?`)) {
      try {
        const res = await fetch(`/api/video?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessage('category deleted successfully!');
          fetchCategories();
          redirect('/vid');
        } else {
          const errorData = await res.json();
          setMessage(`Error: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleImgChange = (url) => {
    if (url) {
      setImg(url); // Update img state with new image URL
    }
  };

  useEffect(() => {
    if (editMode) return; // editing uses `img` directly; keep the Add form clean
    if (!img.includes('')) {
      setFormData((prevState) => ({ ...prevState, img }));
    }
  }, [img, editMode]);

  return (
    <div className="rd-page">
      <PageHeader title={editMode ? 'Edit Video' : 'Add Video'} subtitle="The videos played on the website." />
      <form
        onSubmit={editMode ? handleEditSubmit : handleSubmit}
        className={`rd-card rd-form ${editMode ? 'rd-card--editing' : ''}`}
      >
        <Upload1 key={editFormData.id || 'new'} onFilesUpload={handleImgChange} />
        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            {editMode ? <Save size={16} /> : <Plus size={16} />}
            {editMode ? 'Update video' : 'Add video'}
          </button>
          {editMode && (
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setEditFormData({ id: '',  img: [] });
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
        <span>All videos · {categories.length}</span>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Video</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length > 0 ? (
              categories.map((category) => {
                const fileUrl = category.img[0];
                const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
                return (
                  <tr key={category.id}>
                    <td>
                      {isVideo ? (
                        <video controls className="rd-video">
                          <source src={fileUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img src={fileUrl} alt="Product Image" className="rd-thumb" />
                      )}
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
                );
              })
            ) : (
              <tr>
                <td colSpan={2} className="rd-empty">
                  No videos yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style
          dangerouslySetInnerHTML={{
            __html:
              "\n  .uploadcare--widget {\n    background:black;\n  }\n  ",
          }}
        />
    </div>
  );
};

export default ManageCategory;