"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import Upload from '../components/Upload';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function AddProduct() {
  const [title, setTitle] = useState(''); 
  const [price, setPrice] = useState(''); 
  const [categories, setCategories] = useState([]);
const [categoryId, setCategoryId] = useState('');


useEffect(() => {
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/cat');
      const data = await res.json();
      setCategories(data);
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
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Add New Item</h1>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-2 mb-4"
        required
      /> 
 

      <input
        type="number"
        step="0.01"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="w-full border p-2 mb-4"
        required
      />

 
 <select
  value={categoryId}
  onChange={(e) => setCategoryId(e.target.value)}
  className="w-full border p-2 mb-4"
  required
>
  <option value="">Select Category</option>
  {categories.map((cat) => (
    <option key={cat.id} value={cat.title}>
      {cat.title}
    </option>
  ))}
</select>


 

      
 

      <button type="submit" className="bg-green-500 text-white px-4 py-2">
        Save Item
      </button>
    </form>
  );
}
