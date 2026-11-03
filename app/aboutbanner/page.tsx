'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import Upload from '../components/Upload';
import PageHeader from '../components/PageHeader';
import Notice from '../components/Notice';

const ManageAboutBanner = () => {
  const [current, setCurrent] = useState<string | null>(null); // banner shown on the site
  const [img, setImg] = useState(''); // just uploaded, not saved yet
  const [uploadKey, setUploadKey] = useState(0); // remounts Upload to clear its previews
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/aboutbanner')
      .then((res) => res.json())
      .then((data) => setCurrent(data.img ?? null))
      .catch((error) => console.error('Error:', error));
  }, []);

  const handleImgChange = (urls: string[]) => {
    if (Array.isArray(urls) && urls.length > 0) {
      setImg(urls[0]);
      setMessage('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/aboutbanner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ img }),
      });
      if (res.ok) {
        setCurrent(img);
        setImg('');
        setUploadKey((k) => k + 1);
        setMessage('Banner saved successfully!');
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('An error occurred while saving the banner.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Remove the About page banner?')) return;
    try {
      const res = await fetch('/api/aboutbanner', { method: 'DELETE' });
      if (res.ok) {
        setCurrent(null);
        setMessage('Banner removed.');
      } else {
        const err = await res.json();
        setMessage(`Error: ${err.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="rd-page rd-page--narrow">
      <PageHeader
        title="About Banner"
        subtitle="Shown full width at the top of the About page. Use a wide landscape image (about 1920 × 600); the sides are trimmed a little on phones."
      />

      <Notice text={message} />

      <section className="rd-card">
        <div className="rd-card__head">
          <h2 className="rd-card__title">Current banner</h2>
          {current && (
            <button onClick={handleRemove} className="rd-btn rd-btn--danger rd-btn--sm">
              <Trash2 size={14} /> Remove banner
            </button>
          )}
        </div>
        {current ? (
          // same proportions as the banner on a desktop screen
          <img src={current} alt="" className="w-full aspect-[10/3] object-cover rounded-lg border" />
        ) : (
          <p className="rd-empty-note">No banner yet. The About page shows without one.</p>
        )}
      </section>

      <section className="rd-card rd-form">
        <h2 className="rd-card__title">{current ? 'Replace banner' : 'Add banner'}</h2>
        <Upload key={uploadKey} onImagesUpload={handleImgChange} />

        {img && (
          <>
            <p className="rd-label">New banner (not saved yet)</p>
            <img src={img} alt="" className="w-full aspect-[10/3] object-cover rounded-lg border" />
            <div className="rd-actions">
              <button onClick={handleSave} disabled={saving} className="rd-btn rd-btn--primary">
                <Save size={16} /> {saving ? 'Saving…' : 'Save banner'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default ManageAboutBanner;
