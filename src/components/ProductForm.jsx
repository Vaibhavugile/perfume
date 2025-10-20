// src/components/ProductForm.jsx (UPDATED)
import React, { useEffect, useState } from "react";
import {
  uploadImageFile,
  addProduct,
  updateProduct,
} from "../services/productsService";
import "../styles/productForm.css";

// Helper to safely extract price for a volume
const getPriceForVolume = (product, volume) => {
  const priceObj = product?.prices?.find((p) => p.volume === volume);
  if (priceObj) return (priceObj.price / 100).toFixed(2);
  // fallback for legacy `price` (assume 50ml)
  if (volume === "50ml" && product?.price) return (product.price / 100).toFixed(2);
  return "";
};

export default function ProductForm({ product = null, onSaved = () => {}, onCancel = () => {} }) {
  // volumes we support in the UI — add more volumes here if you want
  const volumes = ["50ml", "100ml"]; // extend this array to add more sizes

  // initialize prices & purchasePrices based on incoming product
  const initialPrices = {};
  const initialPurchases = {};
  volumes.forEach((v) => {
    initialPrices[v] = getPriceForVolume(product, v);
    // if product has `purchasePrices` array use it, else blank
    const pObj = product?.purchasePrices?.find((p) => p.volume === v);
    initialPurchases[v] = pObj ? (pObj.price / 100).toFixed(2) : "";
  });

  const [formData, setFormData] = useState({
    name: product?.name || "",
    // sale prices (string numbers)
    ...initialPrices,
    // purchase rates
    ...Object.fromEntries(volumes.map((v) => [`purchase_${v}`, initialPurchases[v]])),
    featured: product?.featured || false,
    tags: (product?.tags || []).join(", "),
    description: product?.description || "",
    notes: (product?.notes || []).join(", "),
  });

  // images: array of { file?, previewUrl, uploadedUrl }
  const [images, setImages] = useState(() => {
    if (!product?.images) return [];
    return product.images.map((url) => ({ file: null, previewUrl: url, uploadedUrl: url }));
  });

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // revoke object URLs when component unmounts
    return () => {
      images.forEach((img) => {
        if (img.previewUrl && img.file) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, [images]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  // when user selects multiple files
  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    const newImgs = files.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      uploadedUrl: null,
    }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImageAt = (index) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.file && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // 1. upload new image files sequentially (could be parallel but sequential keeps progress simpler)
      const uploadedUrls = [];
      let filesToUpload = images.filter((img) => img.file && !img.uploadedUrl);
      let uploadedCount = 0;

      for (const img of images) {
        if (img.uploadedUrl) {
          uploadedUrls.push(img.uploadedUrl);
          continue;
        }
        if (!img.file) continue;

        // uploadImageFile(file, meta, onProgress) => { url }
        const { url } = await uploadImageFile(img.file, null, (p) => {
          // approximate progress across all files
          const singleFilePercent = Math.round(p || 0);
          const totalFiles = images.length || 1;
          const overall = Math.round(((uploadedCount + singleFilePercent / 100) / totalFiles) * 100);
          setProgress(overall);
        });

        uploadedUrls.push(url);
        uploadedCount += 1;
      }

      // include already uploaded urls (if any)
      const finalImageUrls = images.map((img, idx) => img.uploadedUrl || uploadedUrls.shift()).filter(Boolean);

      // 2. build prices array from sale price fields
      const pricesData = volumes
        .map((v) => ({ volume: v, price: Math.round(parseFloat(formData[v] || 0) * 100) }))
        .filter((p) => p.price > 0);

      // 3. build purchasePrices array from purchase_* fields
      const purchasePricesData = volumes
        .map((v) => ({ volume: v, price: Math.round(parseFloat(formData[`purchase_${v}`] || 0) * 100) }))
        .filter((p) => p.price > 0);

      // pick mainPrice (50ml) for backwards compatibility
      const mainPrice = pricesData.find((p) => p.volume === "50ml")?.price || 0;

      const payload = {
        name: formData.name,
        price: mainPrice,
        prices: pricesData,
        purchasePrices: purchasePricesData,
        featured: !!formData.featured,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: formData.description,
        notes: formData.notes.split(",").map((n) => n.trim()).filter(Boolean),
        images: finalImageUrls,
      };

      if (product?.id) {
        await updateProduct(product.id, payload);
      } else {
        await addProduct(payload);
      }

      alert("✅ Product saved successfully!");
      setUploading(false);
      setProgress(0);
      onSaved();
    } catch (err) {
      console.error(err);
      alert("❌ Error saving product: " + (err.message || err));
      setUploading(false);
    }
  };

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <h2>{product ? "Edit Product" : "Add Product"}</h2>

      <label>
        Name
        <input required name="name" value={formData.name} onChange={handleChange} placeholder="Enter product name" />
      </label>

      {/* Price inputs for every supported volume */}
      <div className="price-inputs-group" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {volumes.map((v) => (
          <label key={v} style={{ minWidth: 160 }}>
            Price - {v} (₹)
            <input required={v === "50ml"} type="number" step="0.01" name={v} value={formData[v] || ""} onChange={handleChange} placeholder="0.00" />
          </label>
        ))}
      </div>

      {/* Purchase rate inputs for every supported volume */}
      <div className="price-inputs-group" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {volumes.map((v) => (
          <label key={"p_" + v} style={{ minWidth: 160 }}>
            Purchase - {v} (₹)
            <input type="number" step="0.01" name={`purchase_${v}`} value={formData[`purchase_${v}`] || ""} onChange={handleChange} placeholder="0.00" />
          </label>
        ))}
      </div>

      <label className="checkbox-field">
        <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} />
        <span>Featured Product</span>
      </label>

      <label>
        Tags (comma separated)
        <input name="tags" value={formData.tags} onChange={handleChange} placeholder="floral, oud, romantic" />
      </label>

      <label>
        Description
        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Short product description" />
      </label>

      <label>
        Notes (comma separated)
        <input name="notes" value={formData.notes} onChange={handleChange} placeholder="Top: Rose, Heart: Oud, Base: Amber" />
      </label>

      <label>
        Images (you can select multiple)
        <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} />
      </label>

      {images.length > 0 && (
        <div className="images-grid">
          {images.map((img, idx) => (
            <div className="image-tile" key={idx}>
              {img.previewUrl ? (
                // previewUrl may be either object URL (new file) or existing uploaded URL
                <img src={img.previewUrl} alt={`preview-${idx}`} />
              ) : (
                <div className="image-placeholder">No preview</div>
              )}
              <div className="tile-actions">
                <button type="button" className="btn ghost small" onClick={() => removeImageAt(idx)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="bar" style={{ width: `${progress}%` }}></div>
          <span>{progress}%</span>
        </div>
      )}

      <div className="form-buttons">
        <button className="btn primary" type="submit" disabled={uploading}>{uploading ? "Saving..." : "Save Product"}</button>
        <button className="btn ghost" type="button" onClick={onCancel} disabled={uploading}>Cancel</button>
      </div>
    </form>
  );
}