// src/components/ProductForm.jsx
import React, { useEffect, useState } from "react";
import {
  uploadImageFile,
  addProduct,
  updateProduct,
} from "../services/productsService";
import "../styles/productForm.css";

export default function ProductForm({ product = null, onSaved = () => {}, onCancel = () => {} }) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price ? (product.price / 100).toFixed(2) : "",
    featured: product?.featured || false,
    tags: (product?.tags || []).join(", "),
    description: product?.description || "",
    notes: (product?.notes || []).join(", "),
    imageUrl: product?.imageUrl || "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        const { url } = await uploadImageFile(imageFile, null, (p) =>
          setProgress(p)
        );
        imageUrl = url;
      }

      const payload = {
        name: formData.name,
        price: Math.round(parseFloat(formData.price) * 100),
        featured: !!formData.featured,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: formData.description,
        notes: formData.notes.split(",").map((n) => n.trim()).filter(Boolean),
        imageUrl,
      };

      if (product?.id) {
        await updateProduct(product.id, payload);
      } else {
        await addProduct(payload);
      }

      alert("✅ Product saved successfully!");
      setUploading(false);
      onSaved();
    } catch (err) {
      console.error(err);
      alert("❌ Error saving product: " + err.message);
      setUploading(false);
    }
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{product ? "Edit Product" : "Add Product"}</h2>

      <label>
        Name
        <input
          required
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      </label>

      <label>
        Price (₹)
        <input
          required
          type="number"
          step="0.01"
          name="price"
          value={formData.price}
          onChange={handleChange}
        />
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          name="featured"
          checked={formData.featured}
          onChange={handleChange}
        />
        <span>Featured Product</span>
      </label>

      <label>
        Tags (comma separated)
        <input
          name="tags"
          value={formData.tags}
          onChange={handleChange}
          placeholder="e.g. floral, oud, romantic"
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
        />
      </label>

      <label>
        Notes (comma separated)
        <input
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Top: Rose, Heart: Oud, Base: Amber"
        />
      </label>

      <label>
        Image
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
      </label>

      {formData.imageUrl && (
        <div className="image-preview">
          <img src={formData.imageUrl} alt="Preview" />
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="bar" style={{ width: `${progress}%` }}></div>
          <span>{progress}%</span>
        </div>
      )}

      <div className="form-buttons">
        <button className="btn primary" type="submit" disabled={uploading}>
          {uploading ? "Saving..." : "Save Product"}
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
