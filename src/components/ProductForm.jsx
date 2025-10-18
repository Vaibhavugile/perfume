// src/components/ProductForm.jsx
import React, { useEffect, useState } from "react";
import {
  uploadImageFile,
  addProduct,
  updateProduct,
} from "../services/productsService";
import "../styles/productForm.css";

// Helper function to safely extract a price for a specific volume from the 'prices' array
// This function is defined here, local to ProductForm, which fixes the import error.
const getPriceForVolume = (product, volume) => {
  // 1. Check the new 'prices' array
  const priceObj = product?.prices?.find((p) => p.volume === volume);
  if (priceObj) {
    return (priceObj.price / 100).toFixed(2);
  }
  // 2. Fallback for the old single 'price' field (only for 50ml)
  if (volume === "50ml" && product?.price) {
    return (product.price / 100).toFixed(2);
  }
  return "";
};

export default function ProductForm({ product = null, onSaved = () => {}, onCancel = () => {} }) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    // Initialize price fields using the helper function
    price50ml: getPriceForVolume(product, "50ml"),
    price100ml: getPriceForVolume(product, "100ml"),
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

      // --- NEW PRICE ARRAY CREATION LOGIC ---
      const pricesData = [
        {
          volume: "50ml",
          price: Math.round(parseFloat(formData.price50ml || 0) * 100),
        },
        {
          volume: "100ml",
          price: Math.round(parseFloat(formData.price100ml || 0) * 100),
        },
      ].filter((p) => p.price > 0); // Only save volumes with a price

      // Set the 50ml price as the main 'price' for easy display/sorting, as requested
      const mainPrice = pricesData.find((p) => p.volume === "50ml")?.price || 0;
      // --------------------------------------

      const payload = {
        name: formData.name,
        // Save the main 50ml price here
        price: mainPrice, 
        // Save the array of all prices
        prices: pricesData,
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
          placeholder="Enter perfume name"
        />
      </label>

      {/* --- NEW PRICE INPUTS --- */}
      <div className="price-inputs-group" style={{ display: 'flex', gap: '10px' }}>
        <label>
          Price - 50ml (₹)
          <input
            required
            type="number"
            step="0.01"
            name="price50ml"
            value={formData.price50ml}
            onChange={handleChange}
            placeholder="499.00"
          />
        </label>
        <label>
          Price - 100ml (₹)
          <input
            type="number"
            step="0.01"
            name="price100ml"
            value={formData.price100ml}
            onChange={handleChange}
            placeholder="899.00"
          />
        </label>
      </div>
      {/* ------------------------ */}

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
          placeholder="floral, oud, romantic"
        />
      </label>

      <label>
        Description
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="3"
          placeholder="Short product description"
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