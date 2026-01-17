'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; 

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function ProductTable() {
  const [products, setProducts] = useState([]); 
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); 
 

  // Fetch products and categories on load
  useEffect(() => {
    fetchProducts(); 
  }, []);

  const fetchProducts = async () => {
    const response = await fetch('/api/products');
    if (response.ok) {
      const data = await response.json();
      setProducts(data);
    } else {
      console.error('Failed to fetch products');
    }
  };
 

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          alert('Product deleted successfully');
          fetchProducts();
        } else {
          console.error('Failed to delete product');
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  const handleUpdate = async (updatedProduct) => {
    try {
      const response = await fetch(`/api/products/${updatedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });

      if (response.ok) {
        alert('Product updated successfully');
        setEditingProduct(null);
        fetchProducts();
      } else {
        console.error('Failed to update product');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Filter products by search query
  const filterBySearch = (product) => {
    return product.title.toLowerCase().includes(searchQuery.toLowerCase());
  };

 

  // Apply both search and category filters
  const filteredProducts = products.filter((product) => {
    return filterBySearch(product)  
  });

 
 

  return (
    <div className="max-w-6xl mx-auto p-4">
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSave={handleUpdate}
        />
      )}
      <h1 className="text-2xl font-bold mb-4">Product List</h1>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border p-2"
          placeholder="Search by title..."
        />
      </div>

 

      <table className="table-auto w-full border-collapse border border-gray-200 mb-4">
  <thead>
    <tr className="bg-gray-100">
      <th className="border p-2">Title</th> 
      <th className="border p-2">Price (USD)</th> 
      <th className="border p-2">Actions</th>
    </tr>
  </thead>
  <tbody>
    {filteredProducts.map((product) => {
      
      return (
<tr
  key={product.id}
  className={` ${product.stock === "0" ? 'bg-red-500' : ''}`}
>
  <td className="border p-2">{product.title}</td>
 
  <td className="border p-2">{product.price}</td> 
  <td className="border p-2">
    <button
      onClick={() => handleEdit(product)}
      className="bg-yellow-500 text-white px-2 py-1 mr-2"
    >
      Edit
    </button>
    <button
      onClick={() => handleDelete(product.id)}
      className="bg-red-500 text-white px-2 py-1"
    >
      Delete
    </button>
  </td>
</tr>

      );
    })}
  </tbody>
</table>


    </div>
  );
}

 
function EditProductForm({ product, onCancel, onSave }) {
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price); 

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(product.cat || "");

  // Fetch categories
  useEffect(() => {
    fetch("/api/cat")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave({
      ...product,
      title, 
      price,
      cat:categoryId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 bg-gray-100 rounded">
      <h2 className="text-xl font-bold mb-4">Edit Product</h2>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border p-2"
          required
        />
      </div>

      {/* Category Dropdown */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border p-2"
          required
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.title}>
              {cat.title}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Price</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full border p-2"
          required
        />
      </div>

 

      {/* Actions */}
      <div className="flex gap-2">
        <button type="submit" className="bg-green-500 text-white px-4 py-2">
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 text-white px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

 