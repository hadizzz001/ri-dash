'use client';

import { useState, useEffect } from 'react';

const SERVICE_ID = '696f9177fb28e053631afac3';

const ManageService = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const fetchService = async () => {
    try {
      const res = await fetch(`/api/new1?id=${SERVICE_ID}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || '');
      } else {
        console.error('Failed to fetch service');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchService();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/new1?id=${SERVICE_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        setMessage('Updated successfully!');
      } else {
        const errorData = await res.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while updating.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Service</h1>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block mb-1">Title</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Update
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
};

export default ManageService;
