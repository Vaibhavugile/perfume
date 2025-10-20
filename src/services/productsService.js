// src/services/productsService.js (UPDATED)
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  where,
  getDoc,
  limit,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../firebase";

/* COLLECTION REF */
const productsCol = collection(db, "products");

/* Upload a single image file to Firebase Storage and return the public URL + path */
export async function uploadImageFile(file, filePath = null, onProgress = () => {}) {
  if (!file) return null;
  const id = Date.now().toString() + "-" + Math.floor(Math.random() * 10000);
  const path = filePath || `product-images/${id}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const sRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(sRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        try {
          onProgress(Math.round(progress));
        } catch (e) {
          // ignore onProgress errors
        }
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

/* Upload multiple image files in parallel with aggregated progress callback
   files: array of File
   onProgress: (overallPercent:number) => void
   Returns: [{url, path}, ...]
*/
export async function uploadMultipleImages(files = [], onProgress = () => {}) {
  if (!Array.isArray(files) || files.length === 0) return [];

  // track per-file progress
  const progresses = new Array(files.length).fill(0);

  const updateOverall = () => {
    const sum = progresses.reduce((s, p) => s + p, 0);
    const overall = Math.round(sum / progresses.length);
    try {
      onProgress(overall);
    } catch (e) {
      // ignore
    }
  };

  const uploadPromises = files.map((file, idx) =>
    uploadImageFile(file, null, (p) => {
      progresses[idx] = p || 0;
      updateOverall();
    })
  );

  // run uploads in parallel
  const results = await Promise.all(uploadPromises);
  // ensure progress reports 100% at end
  try {
    onProgress(100);
  } catch (e) {}
  return results; // array of {url, path}
}

/* Delete a file from Firebase Storage by its storage path */
export async function deleteImageByPath(path) {
  if (!path) return false;
  try {
    const dRef = storageRef(storage, path);
    await deleteObject(dRef);
    return true;
  } catch (err) {
    // could be 'object-not-found' or permission error; return false but don't throw
    console.warn("Failed to delete image at path:", path, err?.code || err?.message || err);
    return false;
  }
}

/* Add product (object fields). Accepts images: [url,...], prices: [{volume,price}], purchasePrices: [{volume,price}] */
export async function addProduct(product) {
  // product: { name, price, prices, purchasePrices, featured, tags, images, description, notes }
  const payload = {
    ...product,
    createdAt: new Date(),
  };

  const docRef = await addDoc(productsCol, payload);
  return { id: docRef.id, ...payload };
}

/* Update product by id. Prefer passing only fields to update. This will set updatedAt automatically. */
export async function updateProduct(id, updates) {
  if (!id) throw new Error("Missing product id");
  const d = doc(db, "products", id);
  await updateDoc(d, { ...updates, updatedAt: new Date() });
  return true;
}

/* Delete product document by id (does NOT automatically delete storage images) */
export async function deleteProduct(id) {
  const d = doc(db, "products", id);
  await deleteDoc(d);
  return true;
}

/* Get products once (no realtime) with optional limit & tag */
export async function getProductsOnce({ tag = null, limitNum = 100 } = {}) {
  let q = query(productsCol, orderBy("createdAt", "desc"));
  if (tag) q = query(productsCol, where("tags", "array-contains", tag), orderBy("createdAt", "desc"));
  if (limitNum) q = query(q, limit(limitNum));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* Real-time listener returns unsubscribe function */
export function getProductsRealtime(callback, { tag = null } = {}) {
  let q = query(productsCol, orderBy("createdAt", "desc"));
  if (tag) q = query(productsCol, where("tags", "array-contains", tag), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snapshot) => {
    const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(arr);
  });
  return unsub;
}

/* Real-time listener for featured products only */
export function getFeaturedProductsRealtime(callback) {
  const q = query(productsCol, where("featured", "==", true), orderBy("createdAt", "desc"));
  const unsub = onSnapshot(q, (snapshot) => {
    const arr = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(arr);
  });
  return unsub;
}

/* get single product by id */
export async function getProductById(id) {
  const d = doc(db, "products", id);
  const snap = await getDoc(d);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/* Utility: format price (in paise -> rupees) */
export function formatPrice(n) {
  if (typeof n !== "number") return "";
  return `₹${(n / 100).toFixed(2)}`;
}
