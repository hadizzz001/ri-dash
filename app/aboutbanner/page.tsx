'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';

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
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">About Page Banner</h1>
      <p className="text-gray-600 mb-6">
        Shown full width at the top of the About page. Use a wide landscape image (about 1920 × 600);
        the sides are trimmed a little on phones.
      </p>

      <h2 className="text-lg font-bold mb-2">Current banner</h2>
      {current ? (
        <>
          {/* same proportions as the banner on a desktop screen */}
          <img src={current} alt="" className="w-full aspect-[10/3] object-cover rounded border mb-3" />
          <button onClick={handleRemove} className="bg-red-500 text-white px-4 py-2 rounded mb-8">
            Remove Banner
          </button>
        </>
      ) : (
        <p className="text-gray-500 mb-8">No banner yet. The About page shows without one.</p>
      )}

      <h2 className="text-lg font-bold mb-2">{current ? 'Replace banner' : 'Add banner'}</h2>
      <Upload key={uploadKey} onImagesUpload={handleImgChange} />

      {img && (
        <>
          <p className="font-bold mb-2">New banner (not saved yet)</p>
          <img src={img} alt="" className="w-full aspect-[10/3] object-cover rounded border mb-3" />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Banner'}
          </button>
        </>
      )}

      {message && <p className="mt-4 text-green-600">{message}</p>}
    </div>
  );
};

export default ManageAboutBanner;
