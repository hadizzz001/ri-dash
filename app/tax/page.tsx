'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

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
    <div className="rd-page rd-page--narrow">
      <PageHeader title="Appointment Tax" subtitle="One percentage, added to appointment totals outside Beirut." />

      <form onSubmit={handleSubmit} className="rd-card rd-form">
        <p className="rd-hint">
          Added to the total of every appointment outside Beirut — the rest of Lebanon, KSA and Kuwait — for both
          salon and home service. Appointments in Beirut are tax free (0%). Set 0 for no tax anywhere.
        </p>
        <label className="rd-field" style={{ maxWidth: 240 }}>
          <span className="rd-label">Tax (%)</span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className="rd-input"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            required
          />
        </label>
        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            <Save size={16} /> Save tax
          </button>
        </div>
      </form>

      <Notice text={message} />
    </div>
  );
};

export default ManageTax;
