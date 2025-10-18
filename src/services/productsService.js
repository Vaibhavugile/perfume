// src/services/productsService.js
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
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

/**
 * Firestore structure:
 * collection 'products' documents:
 *  {
 *    name: string,
 *    price: number (paise or cents),
 *    featured: boolean,
 *    tags: array<string>,
 *    imageUrl: string,
 *    description: string,
 *    notes: array<string>,
 *    createdAt: timestamp
 *  }
 */

/* COLLECTION REF */
const productsCol = collection(db, "products");

/* Upload an image file to Firebase Storage and return the public URL */
export async function uploadImageFile(file, filePath = null, onProgress = () => {}) {
  if (!file) return null;
  const id = Date.now().toString();
  const path = filePath || `product-images/${id}-${file.name}`;
  const sRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(sRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(progress));
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}

/* Add product (object fields) */
export async function addProduct(product) {
  // product: { name, price, featured, tags, imageUrl, description, notes }
  const docRef = await addDoc(productsCol, {
    ...product,
    createdAt: new Date(),
  });
  return { id: docRef.id, ...product };
}

/* Update product by id */
export async function updateProduct(id, updates) {
  const d = doc(db, "products", id);
  await updateDoc(d, { ...updates });
  return true;
}

/* Delete product */
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
