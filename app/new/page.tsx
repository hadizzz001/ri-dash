'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; 

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const ManageService = () => {
  const [formData, setFormData] = useState({ title: '', description: '', img: [] });
  const [editFormData, setEditFormData] = useState({ id: '', title: '', description: '', img: [] });
  const [message, setMessage] = useState('');
  const [services, setServices] = useState([]);
  const [img, setImg] = useState([]);
  const [editMode, setEditMode] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/new', { method: 'GET' });
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
    const res = await fetch('/api/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setMessage(' added successfully!');
      setFormData({ title: '', description: '', img: [] });
      fetchServices();
      window.location.href = '/new';
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
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/new?id=${encodeURIComponent(editFormData.id)}`, {
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
        window.location.reload();
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      window.location.reload();
      console.error('Error:', error);
      setMessage('An error occurred while updating.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm(`Are you sure you want to delete this?`)) {
      try {
        const res = await fetch(`/api/new?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMessage('deleted successfully!');
          fetchServices();
          redirect('/new');
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
      setImg(url);
    }
  };

  useEffect(() => {
    if (!img.includes('')) {
      setFormData((prev) => ({ ...prev, img }));
    }
  }, [img]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{editMode ? 'Edit ' : 'Add '}</h1>
      <form onSubmit={editMode ? handleEditSubmit : handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Title</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={editMode ? editFormData.title : formData.title}
            onChange={(e) =>
              editMode
                ? setEditFormData({ ...editFormData, title: e.target.value })
                : setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div> 
<div>
  <label className="block mb-1">Description</label>
  <ReactQuill
    theme="snow"
    value={editMode ? editFormData.description : formData.description}
    onChange={(value) =>
      editMode
        ? setEditFormData({ ...editFormData, description: value })
        : setFormData({ ...formData, description: value })
    }
    style={{ backgroundColor: 'white' }}
  />
</div> 
        <Upload onImagesUpload={handleImgChange} />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          {editMode ? 'Update ' : 'Add '}
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}

      <h2 className="text-xl font-bold mt-8">All News</h2>
      <table className="table-auto border-collapse border border-gray-300 w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2">Title</th>
            <th className="border border-gray-300 p-2">Description</th>
            <th className="border border-gray-300 p-2">Image</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.length > 0 ? (
            services.map((service) => {
              const fileUrl = service.img[0];
              const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
              return (
                <tr key={service.id}>
                  <td className="border border-gray-300 p-2">{service.title}</td>
                  <td className="border border-gray-300 p-2">{service.description}</td>
                  <td className="border border-gray-300 p-2">
                    {isVideo ? (
                      <video controls className="w-24 h-auto">
                        <source src={fileUrl} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img src={fileUrl} alt="Service" className="w-24 h-auto" />
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">
                    <button
                      onClick={() => handleEdit(service)}
                      className="bg-yellow-500 text-white px-4 py-1 rounded mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="bg-red-500 text-white px-4 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} className="border border-gray-300 p-2 text-center">
                No data found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
