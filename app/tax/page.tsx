'use client';

import { useState, useEffect } from 'react';

const ManageTax = () => {
  const [percent, setPercent] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/tax')
      .then((res) => res.json())
      .then((data) => setPercent(String(data.percent ?? 0)))
      .catch((error) => console.error('Error:', error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: Number(percent) }),
      });
      if (res.ok) {
        setMessage('Tax saved successfully!');
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while saving the tax.');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Appointment Tax</h1>
      <p className="text-gray-600 mb-4">
        Added to the total of every appointment outside Beirut — the rest of Lebanon, KSA and
        Kuwait — for both salon and home service. Appointments in Beirut are tax free (0%).
        Set 0 for no tax anywhere.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Tax (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="border p-2 w-full"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2">
          Save Tax
        </button>
      </form>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
};

export default ManageTax;
