"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import Upload from '../components/Upload';
import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function AddProduct() {
  const [title, setTitle] = useState(''); 
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
const [categoryId, setCategoryId] = useState('');


useEffect(() => {
  const fetchCategories = async () => {
    try {
      // Categories list + categories already used by items (see the edit form).
      const [catRes, itemRes] = await Promise.all([fetch('/api/cat'), fetch('/api/products')]);
      const cats = catRes.ok ? await catRes.json() : [];
      const items = itemRes.ok ? await itemRes.json() : [];
      setCategories(
        Array.from(new Set([...cats.map((c) => c.title), ...items.map((i) => i.cat)])).filter(Boolean)
      );
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  fetchCategories();
}, []);


 

 


  const handleSubmit = async (e) => {
    e.preventDefault();
 

    const payload = {
      title, 
      price,
      cat: categoryId,
      description,
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert('Product added successfully!');
      window.location.href = '/dashboard';
    } else {
      alert('Failed to add product');
    }
  };

 

  return (
    <div className="rd-page rd-page--narrow">
      <PageHeader title="Add Item" subtitle="A new service clients can book on the website." />
      <form onSubmit={handleSubmit} className="rd-card rd-form">
        <label className="rd-field">
          <span className="rd-label">Title</span>
          <input
            type="text"
            placeholder="e.g. Hair Repair Treatment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rd-input"
            required
          />
        </label>

        <div className="rd-grid">
          <label className="rd-field">
            <span className="rd-label">Price (USD)</span>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rd-input"
              required
            />
          </label>

          <label className="rd-field">
            <span className="rd-label">Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rd-input" required>
              <option value="">Select category</option>
              {categories.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="rd-field">
          <span className="rd-label">Description <small>(optional)</small></span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rd-input"
          />
          <span className="rd-hint">
            Shown under the service name on the website&apos;s booking page. Leave empty to show none.
          </span>
        </label>

        <div className="rd-actions">
          <button type="submit" className="rd-btn rd-btn--primary">
            <Plus size={16} /> Save item
          </button>
        </div>
      </form>
    </div>
  );
}
