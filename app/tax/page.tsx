'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';
import { DEFAULT_OUTSIDE_FACTOR, MAX_OUTSIDE_FACTOR } from '../utils/appointments';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Appointment prices, read by the website's booking page and by the calendar:
 * the outside-Lebanon multiplier and the tax percentage (one Tax document).
 */
const ManagePrices = () => {
  const [factor, setFactor] = useState('');
  const [percent, setPercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/tax', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setPercent(String(data.percent ?? 0));
        setFactor(String(data.outsideFactor ?? DEFAULT_OUTSIDE_FACTOR));
      })
      .catch((error) => console.error('Error:', error));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: Number(percent), outsideFactor: Number(factor) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFactor(String(data.outsideFactor ?? factor));
        setMessage('Prices saved. New bookings on the website use them right away.');
      } else {
        setMessage(`Error: ${data.error || 'Could not save the prices'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while saving the prices.');
    } finally {
      setSaving(false);
    }
  };

  const f = Number(factor);
  const factorOk = factor.trim() !== '' && Number.isFinite(f) && f >= 1 && f <= MAX_OUTSIDE_FACTOR;

  return (
    <div className="rd-page rd-page--narrow">
      <PageHeader title="Prices & Tax" subtitle="How appointment prices are worked out on the website and in the calendar." />

      <form onSubmit={handleSubmit}>
        <div className="rd-card rd-form">
          <div>
            <h2 className="rd-card__title">Price outside Lebanon</h2>
            <p className="rd-card__sub">
              Every service booked in another country (KSA, Kuwait…) costs its normal price × this number. Lebanon
              keeps the normal price.
            </p>
          </div>
          <label className="rd-field" style={{ maxWidth: 240 }}>
            <span className="rd-label">Multiply prices by (×)</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              max={MAX_OUTSIDE_FACTOR}
              step="0.1"
              className="rd-input"
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              required
            />
          </label>
          <p className="rd-hint">
            {factorOk
              ? `A $100 service costs $${round2(100 * f)} outside Lebanon (+${round2((f - 1) * 100)}%). `
              : `Enter a number from 1 to ${MAX_OUTSIDE_FACTOR}; 1 means the same price as in Lebanon. `}
            Appointments already booked keep their prices.
          </p>
        </div>

        <div className="rd-card rd-form">
          <div>
            <h2 className="rd-card__title">Tax</h2>
            <p className="rd-card__sub">
              Added to home-service appointments outside Beirut: the rest of Lebanon and the other countries. Salon
              appointments and Beirut are tax free. Set 0 for no tax anywhere.
            </p>
          </div>
          <label className="rd-field" style={{ maxWidth: 240 }}>
            <span className="rd-label">Tax (%)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              className="rd-input"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              required
            />
          </label>
        </div>

        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary" disabled={saving || !factor || !percent}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save prices'}
          </button>
        </div>
      </form>

      <Notice text={message} />
    </div>
  );
};

export default ManagePrices;
