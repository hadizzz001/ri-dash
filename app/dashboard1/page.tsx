'use client';

import { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import ExportToExcel from '../components/ExportToExcel';
import BarcodeInput from '../components/BarcodeInput';
import { Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const barcodeKey = (v) => String(v ?? '').replace(/[\s-]+/g, '').toLowerCase();
const sameBarcode = (a, b) => !!a && !!b && barcodeKey(a) === barcodeKey(b);

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function ProductTable() {
  const [products, setProducts] = useState([]);
  const [products1, setProducts1] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');


  // Fetch products and categories on load
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);



  const fetchProducts = async () => {
    const response = await fetch('/api/productsz');
    if (response.ok) {
      const data = await response.json();
      setProducts(data);
    } else {
      console.error('Failed to fetch products');
    }
  };

  const fetchCategories = async () => {
    const response = await fetch('/api/category');
    if (response.ok) {
      const data = await response.json();
      setCategories(data);
    } else {
      console.error('Failed to fetch categories');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/productsz/${id}`, {
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
      const response = await fetch(`/api/productsz/${updatedProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct),
      });

      if (response.ok) {
        alert('Product updated successfully');
        setEditingProduct(null);
        fetchProducts();
      } else {
        const { error } = await response.json().catch(() => ({}));
        alert(error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Filter products by search query (title or barcode)
  const filterBySearch = (product) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      product.title.toLowerCase().includes(query) ||
      barcodeKey(product.barcode).includes(barcodeKey(query))
    );
  };

  // A scanned / entered barcode that matches exactly opens that product
  const openByBarcode = (code) => {
    const match = products.find((p) => sameBarcode(p.barcode, code));
    if (match) handleEdit(match);
  };

  // Filter products by selected category
  const filterByCategory = (product) => {
    const isFilteredByCategory = selectedCategory ? product.category === selectedCategory : true;

    return isFilteredByCategory;
  };

  // Apply both search and category filters
  const filteredProducts = products.filter((product) => {
    return filterBySearch(product) && filterByCategory(product);
  });



 




  return (
    <div className="rd-page rd-page--wide">
      <PageHeader
        title="All Products"
        subtitle="The products of the online shop. Type a title or scan a barcode — an exact barcode opens the product."
        actions={
          <>
            <ExportToExcel products={products} />
            <a href="/products1" className="rd-btn rd-btn--primary">
              <Plus size={16} /> Add product
            </a>
          </>
        }
      />
      {editingProduct && (
        <EditProductForm
          key={editingProduct.id}
          product={editingProduct}
          onCancel={() => setEditingProduct(null)}
          onSave={handleUpdate}
        />
      )}

      {/* Search (type a title, type/scan a barcode) + category filter */}
      <div className="rd-toolbar">
        <div className="rd-search" style={{ flexGrow: 2 }}>
          <Search size={16} />
          <BarcodeInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={openByBarcode}
            placeholder="Search by title or barcode…"
            inputClassName=""
            autoFocus
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rd-input"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="rd-table-wrap">
      <table className="rd-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Barcode</th>
            {/* <th>Pic</th> */}
            <th className="is-num">Price (USD)</th>
            <th>Category</th>
            <th>Type</th>
            <th className="is-num">Stock</th>
            {/* <th>Colors & Qty</th>  */}
            <th className="is-actions">Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredProducts.map((product) => {
            const fileUrl = product.img[0];
            const isVideo = /\.(mp4|webm|ogg)$/i.test(fileUrl);
            const isCollection = product.type === "collection";
            const isSingle = product.type === "single";

            // Stock Calculation Logic
            const isOutOfStockSingle = isSingle && (product.stock === "0" || product.stock === 0 || product.stock === null);

            const allColorsQtyZero = isCollection &&
              product.color &&
              product.color.length > 0 &&
              product.color.every(c => !c.sizes && parseInt(c.qty) === 0);

            const allSizesQtyZero = isCollection &&
              product.color &&
              product.color.length > 0 &&
              product.color.every(c =>
                Array.isArray(c.sizes) &&
                c.sizes.length > 0 &&
                c.sizes.every(s => parseInt(s.qty || 0) === 0)
              );

            let totalStock = 0;
            if (isSingle) {
              totalStock = parseInt(product.stock || 0);
            } else if (product.color && product.color.length > 0) {
              product.color.forEach(c => {
                if (Array.isArray(c.sizes) && c.sizes.length > 0) {
                  totalStock += c.sizes.reduce((sum, s) => sum + parseInt(s.qty || 0), 0);
                } else {
                  totalStock += parseInt(c.qty || 0);
                }
              });
            }

            const isLowStock = totalStock > 0 && totalStock < 3;

            let rowClass = "";
            if (isOutOfStockSingle || allColorsQtyZero || allSizesQtyZero) {
              rowClass = "is-danger";
            } else if (isLowStock) {
              rowClass = "is-warn";
            }





            return (
              <tr key={product.id} className={rowClass}>

                <td className="rd-cell-title">{product.title}</td>
                <td className="rd-mono is-muted is-nowrap">{product.barcode || '—'}</td>
                {/* <td className="border p-2">
                  {isVideo ? (
                    <video controls className="w-24 h-auto">
                      <source src={fileUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <img src={fileUrl} alt="Product" className="w-24 h-auto" />
                  )}
                </td> */}
<td className="is-num">
  {product.sale === "yes" && product.price && product.price !== product.discount ? (
    <span>
      <span className="is-muted" style={{ textDecoration: 'line-through', marginRight: 6 }}>${product.price}</span>
      <span style={{ fontWeight: 600, color: '#067647' }}>${product.discount}</span>
    </span>
  ) : (
    `$${product.discount || product.price}`
  )}
</td>



                <td>{product.category}</td>
                <td className="is-muted">{product.type}</td>

                <td className="is-num">
                  {rowClass === 'is-danger' && <span className="rd-badge rd-badge--danger" style={{ marginRight: 6 }}>Out of stock</span>}
                  {rowClass === 'is-warn' && <span className="rd-badge rd-badge--warn" style={{ marginRight: 6 }}>Low</span>}
                  {product.type === 'single' && product.stock}

                  {product.type === 'collection' && product.color && !product.color[0]?.sizes &&
                    product.color.reduce((sum, c) => sum + (c.qty || 0), 0)
                  }

                  {product.type === 'collection' && product.color && product.color[0]?.sizes &&
                    product.color.reduce(
                      (colorSum, color) =>
                        colorSum +
                        (color.sizes
                          ? color.sizes.reduce((sizeSum, s) => sizeSum + (s.qty || 0), 0)
                          : 0),
                      0
                    )
                  }
                </td>

                {/* <td className="border p-2">
                  {!isSingle && product.color && product.color.length > 0 ? (
                    <ul className="space-y-1">
                      {product.color.map((c, index) => (
                        <li key={index}>
                          <span className="font-semibold">{c.color}</span>
                          {c.sizes && Array.isArray(c.sizes) ? (
                            <ul className="ml-4 space-y-1 list-disc">
                              {c.sizes.map((s, idx) => (
                                <li key={idx}>
                                  <span className="italic">{s.size}</span>: {s.qty}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <>: {c.qty}</>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    isCollection ? 'No colors' : '—'
                  )}
                </td> */}

 




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
            );
          })}
          {products.length > 0 && filteredProducts.length === 0 && (
            <tr>
              <td colSpan={7} className="rd-empty">
                No products match “{searchQuery.trim()}”.
              </td>
            </tr>
          )}
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="rd-empty">
                No products yet.
              </td>
            </tr>
          )}
        </tbody>

      </table>
      </div>


    </div>
  );
}




 
 
 function EditProductForm({ product, onCancel, onSave }) {
const [title, setTitle] = useState(product?.title || "");
const [barcode, setBarcode] = useState(product?.barcode || "");
const [description, setDescription] = useState(product?.description || "");
const [price, setPrice] = useState(product?.price || 0);
const [discountPrice, setDiscountPrice] = useState(product?.discount || "");
const [type, setType] = useState(product?.type || "single");
const [stock, setStock] = useState(product?.stock || "");
const [img, setImg] = useState(product?.img || []);
const [arrival, setArrival] = useState(product?.arrival || "no");
const [sale, setSale] = useState(product?.sale || "no");

const [selectedCategory, setSelectedCategory] = useState(product?.category || "");
const [selectedSub, setSelectedSub] = useState(product?.sub || "");
const [selectedFactory, setSelectedFactory] = useState(product?.factory || "");


  const [categories, setCategories] = useState([]);

  const [subCategories, setSubCategories] = useState([]);

  const [factories, setFactories] = useState([]);

  // ✅ NEW (fetch from API)
  const [colorOptions, setColorOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);

  // ✅ NEW DATA STRUCTURE: { colorId: [ { size, qty, price } ] }
  const [colorSizeData, setColorSizeData] = useState({});

  /** ✅ Pre-fill existing product color/sizes */
  useEffect(() => {
    if (Array.isArray(product.color)) {
      const prepared = {};

      // Only collection colors carry { id, sizes }; simple { name, hex }
      // swatches have no sizes and must not crash the form.
      product.color.forEach((c) => {
        if (!c?.id || !Array.isArray(c.sizes)) return;
        prepared[c.id] = c.sizes.map((s) => ({
          size: s.size,
          qty: s.qty,
        }));
      });

      setColorSizeData(prepared);
    }
  }, [product]);

  /** ✅ Fetch Category / Sub / Factory (+ Colors & Sizes for collections) */
  useEffect(() => {
    fetchList("/api/category", setCategories);
    fetchList("/api/sub", setSubCategories);
    fetchList("/api/factory", setFactories);
    fetchList("/api/color", setColorOptions);
    fetchList("/api/size", setSizeOptions);
  }, []);

  const fetchList = async (url, setter) => {
    try {
      const res = await fetch(url);
      if (res.ok) setter(await res.json());
    } catch (err) {
      console.error(`Failed to load ${url}`, err);
    }
  };

  // Keep the product's saved value selectable even if it's no longer in the
  // list (renamed/deleted), so the dropdown still shows what's stored.
  const withCurrent = (list, current) => {
    const names = list.map((c) => c.name);
    return current && !names.includes(current) ? [...names, current] : names;
  };

  /** ✅ Select / remove color */
  const handleColorToggle = (colorId) => {
    setColorSizeData((prev) => {
      const updated = { ...prev };

      if (updated[colorId]) {
        delete updated[colorId];
      } else {
        updated[colorId] = sizeOptions.map((s) => ({
          size: s.title,
          qty: "",
        }));
      }
      return updated;
    });
  };

  /** ✅ Save */
const handleSubmit = (e) => {
  e.preventDefault();

 


  // ✅ calculate final price after discount
  // When no sale: price = discountPrice, discount = discountPrice (same value)
  // When sale: price = original price, discount = discounted price
const finalPrice = sale === "yes" ? String(price) : String(discountPrice);
const discountedPrice = Number(discountPrice).toFixed(2);


  const payload = {
    ...product,

    title,
    barcode,
    description,

    // ORIGINAL PRICE (or same as discount when no sale)
    price: finalPrice,

    // EFFECTIVE/FINAL PRICE (always populated)
    discount: discountedPrice,

    img,
    category: selectedCategory,
    sub: selectedSub,
    factory: selectedFactory,
    type,
    arrival,
    sale,

    ...(type === "single" && { stock }),

    ...(type === "collection" && {
      color: Object.entries(colorSizeData).map(([colorId, sizes]) => {
        const colorObj = colorOptions.find((c) => c.id === colorId);

        return {
          id: colorObj.id,
          title: colorObj.title,
          code: colorObj.code,
          sizes: sizes
            .filter((s) => s.qty > 0)
            .map((s) => ({
              size: s.size,
              qty: Number(s.qty),
            })),
        };
      }),
    }),
  };

  onSave(payload);
};


  return (
    <form onSubmit={handleSubmit} className="rd-card rd-card--editing rd-form">
      <div className="rd-card__head" style={{ marginBottom: 0 }}>
        <div>
          <h2 className="rd-card__title">Edit product</h2>
          <p className="rd-card__sub">{product.title}</p>
        </div>
        <button type="button" onClick={onCancel} className="rd-btn rd-btn--quiet rd-btn--sm rd-btn--icon" aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="rd-grid">
        <label className="rd-field">
          <span className="rd-label">Title</span>
          <input className="rd-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <div className="rd-field">
          <span className="rd-label">Barcode</span>
          <BarcodeInput value={barcode} onChange={setBarcode} />
        </div>
      </div>

      {/* CATEGORY / SUB-CATEGORY / BRAND */}
      <div className="rd-grid">
        <label className="rd-field">
          <span className="rd-label">Category</span>
          <select className="rd-input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="">Select category</option>
            {withCurrent(categories, product.category).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="rd-field">
          <span className="rd-label">Sub-category</span>
          <select className="rd-input" value={selectedSub} onChange={(e) => setSelectedSub(e.target.value)}>
            <option value="">Select sub-category</option>
            {withCurrent(subCategories, product.sub).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label className="rd-field">
          <span className="rd-label">Brand</span>
          <select className="rd-input" value={selectedFactory} onChange={(e) => setSelectedFactory(e.target.value)}>
            <option value="">Select brand</option>
            {withCurrent(factories, product.factory).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {/* TYPE + SALE */}
      <div className="rd-options">
        <label className="rd-check">
          <input type="radio" checked={type === "single"} onChange={() => setType("single")} /> Single
        </label>
        {/* <label><input type="radio" checked={type === "collection"} onChange={() => setType("collection")} /> Collection</label> */}
        <label className="rd-check">
          <input type="checkbox" checked={sale === "yes"} onChange={(e) => setSale(e.target.checked ? "yes" : "no")} />
          On sale
        </label>
      </div>

      {/* STOCK + PRICES */}
      <div className="rd-grid">
        {type === "single" && (
          <label className="rd-field">
            <span className="rd-label">Stock</span>
            <input type="number" placeholder="Stock" className="rd-input" value={stock} onChange={(e) => setStock(e.target.value)} />
          </label>
        )}
        {sale === "yes" && (
          <label className="rd-field">
            <span className="rd-label">Original price</span>
            <input type="number" placeholder="Price" className="rd-input" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        )}
        <label className="rd-field">
          <span className="rd-label">{sale === "yes" ? "Sale price" : "Price"}</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            className="rd-input"
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
          />
        </label>
      </div>

      {/* ✅ COLORS + SIZES */}
      {type === "collection" && (
        <div className="mb-6">
          <label className="font-bold text-lg">Colors</label>

          <div className="flex flex-wrap gap-3 mt-3">
            {colorOptions.map((c) => (
              <div key={c.id} onClick={() => handleColorToggle(c.id)}
                   className={`p-2 cursor-pointer rounded-md border w-24 text-center ${
                     colorSizeData[c.id] ? "ring-2 ring-green-500" : ""
                   }`}
              >
                <div className="w-7 h-7 rounded-full mx-auto border mb-1" style={{ backgroundColor: c.code }}></div>
                {c.title}
              </div>
            ))}
          </div>

          {Object.keys(colorSizeData).map((colorId) => {
            const colorObj = colorOptions.find((c) => c.id === colorId);

            return (
              <div key={colorId} className="border p-4 bg-gray-50 rounded mt-4">
                <h3 className="font-bold flex items-center gap-2">
                 <div
  className="w-5 h-5 rounded-full"
  style={{ backgroundColor: colorObj?.code || '#ccc' }}
></div>

                {colorObj?.title || "Unknown Color"}

                </h3>

                {colorSizeData[colorId].map((item, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2 my-2">
                    <span>{item.size}</span>

                    <input type="number" className="border p-1"
                           value={item.qty}
                           placeholder="Qty"
                           onChange={(e) => {
                             const updated = [...colorSizeData[colorId]];
                             updated[idx].qty = e.target.value;
                             setColorSizeData({ ...colorSizeData, [colorId]: updated });
                           }}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="rd-field">
        <span className="rd-label">Description</span>
        <ReactQuill value={description} onChange={setDescription} className="rd-quill" />
      </div>

      {/* Current Images */}
      <div className="rd-field">
        <span className="rd-label">Current images</span>
        <div className="rd-thumbs">
          {img && img.length > 0 ? (
            img.map((imgUrl, index) => (
              <div key={index} className="rd-imgx">
                <img src={imgUrl} alt={`Product ${index}`} className="rd-thumb" />
                <button type="button" onClick={() => setImg(img.filter((_, i) => i !== index))} aria-label="Remove this image" title="Remove this image">
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="rd-hint">No images uploaded</p>
          )}
        </div>
      </div>

      <Upload onImagesUpload={(newUrls) => setImg([...img, ...newUrls])} />

      <div className="rd-actions">
        <button type="submit" className="rd-btn rd-btn--primary">
          <Save size={16} /> Save product
        </button>
        <button type="button" onClick={onCancel} className="rd-btn rd-btn--ghost">
          Cancel
        </button>
      </div>
    </form>
  );
}

 