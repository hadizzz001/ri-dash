'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import { Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="rd-page">
      <PageHeader
        title="All Items"
        subtitle="The services clients book on the website, with their prices."
        actions={
          <a href="/products" className="rd-btn rd-btn--primary">
            <Plus size={16} /> Add item
          </a>
        }
      />
      {editingProduct && (
        <EditProductForm
          key={editingProduct.id}
          product={editingProduct}
          usedCategories={products.map((p) => p.cat)}
          onCancel={() => setEditingProduct(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Search Input */}
      <div className="rd-search" style={{ marginBottom: 16 }}>
        <Search size={16} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rd-input"
          placeholder="Search by title…"
        />
      </div>

      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th className="is-num">Price (USD)</th>
              <th className="is-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className={product.stock === '0' ? 'is-danger' : ''}>
                <td className="rd-cell-title">{product.title}</td>
                <td className="is-muted">{product.cat}</td>
                <td className="is-num">{product.price}</td>
                <td className="is-actions">
                  <div className="rd-row-actions">
                    <button onClick={() => handleEdit(product)} className="rd-btn rd-btn--ghost rd-btn--sm">
                      <Pencil size={14} /> Edit
                    </button>
                    <button onClick={() => handleDelete(product.id)} className="rd-btn rd-btn--danger rd-btn--sm">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="rd-empty">
                  {products.length ? 'No item matches this search.' : 'No items yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

 
function EditProductForm({ product, usedCategories, onCancel, onSave }) {
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(product.price); 

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(product.cat || "");

  // Items can carry a category that isn't in the Categories list (e.g. the
  // seeded service menu), so offer those too — otherwise the item's own
  // category has no matching option and the dropdown can't pre-select it.
  const categoryOptions = Array.from(
    new Set([...categories.map((c) => c.title), ...usedCategories, product.cat])
  ).filter(Boolean);

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
    <form onSubmit={handleSubmit} className="rd-card rd-card--editing rd-form">
      <div className="rd-card__head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="rd-card__title">Edit item</h2>
          <p className="rd-card__sub">{product.title}</p>
        </div>
      </div>

      {/* Title */}
      <label className="rd-field">
        <span className="rd-label">Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="rd-input" required />
      </label>

      <div className="rd-grid">
        {/* Category Dropdown */}
        <label className="rd-field">
          <span className="rd-label">Category</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rd-input" required>
            <option value="">Select category</option>
            {categoryOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </label>

        {/* Price */}
        <label className="rd-field">
          <span className="rd-label">Price (USD)</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="rd-input" required />
        </label>
      </div>

      {/* Actions */}
      <div className="rd-actions">
        <button type="submit" className="rd-btn rd-btn--primary">
          <Save size={16} /> Save
        </button>
        <button type="button" onClick={onCancel} className="rd-btn rd-btn--ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

 