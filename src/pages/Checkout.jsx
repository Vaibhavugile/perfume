// src/pages/Checkout.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { formatPrice } from "../services/productsService";
import "../styles/checkout.css";
import { motion, AnimatePresence } from "framer-motion";

// Firestore
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const DRAFT_KEY = "checkoutFormDraft";
const LAST_ORDER_ID_KEY = "lastOrderId";

export default function CheckoutPage() {
  const { items, subtotal, totalQty, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postal: "",
    country: "India",
    shippingMethod: "standard",
    billingSame: true,
    cardName: "",
    cardNumber: "",
    cardExp: "",
    cardCvv: "",
    paymentMethod: "cod", // cod | card
  });

  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // load draft on mount (if exists)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm((f) => ({ ...f, ...parsed }));
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // autosave: debounce writes to localStorage
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const toSave = {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          address1: form.address1,
          address2: form.address2,
          city: form.city,
          state: form.state,
          postal: form.postal,
          country: form.country,
          shippingMethod: form.shippingMethod,
          paymentMethod: form.paymentMethod,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
      } catch (err) {
        console.warn("Could not save draft", err);
      }
    }, 600); // 600ms debounce

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    form.fullName,
    form.email,
    form.phone,
    form.address1,
    form.address2,
    form.city,
    form.state,
    form.postal,
    form.country,
    form.shippingMethod,
    form.paymentMethod,
  ]);

  if (!items || items.length === 0) {
    return (
      <main className="checkout container">
        <div className="empty">
          <h2>Your cart is empty.</h2>
          <p className="muted">Add items to your cart before checking out.</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={() => navigate("/shop")}>
              Shop perfumes
            </button>
          </div>
        </div>
      </main>
    );
  }

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: null }));
  }

  function validate() {
    const err = {};
    if (!form.fullName.trim()) err.fullName = "Full name is required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) err.email = "Valid email required";
    if (!form.phone.trim() || form.phone.trim().length < 7) err.phone = "Valid phone number required";
    if (!form.address1.trim()) err.address1 = "Address is required";
    if (!form.city.trim()) err.city = "City is required";
    if (!form.postal.trim()) err.postal = "Postal code is required";

    if (form.paymentMethod === "card") {
      if (!form.cardName.trim()) err.cardName = "Name on card required";
      if (!/^\d{12,19}$/.test(form.cardNumber.replace(/\s+/g, ""))) err.cardNumber = "Card number looks invalid";
      if (!/^\d{2}\/\d{2}$/.test(form.cardExp)) err.cardExp = "Expiry must be MM/YY";
      if (!/^\d{3,4}$/.test(form.cardCvv)) err.cardCvv = "CVV is required";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  }

  async function placeOrder(e) {
    e.preventDefault();
    setErrorMessage("");
    if (!validate()) return;
    setProcessing(true);

    // Build order payload
    const shippingCost = form.shippingMethod === "express" ? 19900 : 0;
    const total = subtotal + shippingCost;

    const orderPayload = {
      // store monetary values in smallest currency unit (e.g., paise) consistent with your service
      subtotal,
      shipping: shippingCost,
      tax: 0,
      total,
      totalItems: totalQty,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price || 0,
        qty: it.qty || 1,
        volume: it.volume || null,
        imageUrl: it.imageUrl || null,
        uniqueId: it.uniqueId || null,
      })),
      customer: {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        address1: form.address1,
        address2: form.address2,
        city: form.city,
        state: form.state,
        postal: form.postal,
        country: form.country,
      },
      payment: {
        method: form.paymentMethod,
        status: form.paymentMethod === "cod" ? "pending" : "authorized", // placeholder
      },
      meta: {
        createdAt: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    };

    try {
      // Save to Firestore orders collection
      const uid = auth?.currentUser?.uid || null;
      const ordersCol = collection(db, "orders");

      const created = await addDoc(ordersCol, {
        ...orderPayload,
        userId: uid,
        createdAt: serverTimestamp(),
      });

      // Also add lightweight doc under users/{uid}/orders/{orderId} for quick user history
      if (uid) {
        try {
          const userOrderRef = doc(db, "users", uid, "orders", created.id);
          await setDoc(userOrderRef, {
            orderId: created.id,
            createdAt: serverTimestamp(),
            subtotal: orderPayload.subtotal,
            total: orderPayload.total,
            totalItems: orderPayload.totalItems,
            status: orderPayload.payment.status,
          });
        } catch (userOrdersErr) {
          console.warn("Failed to write user order history:", userOrdersErr);
        }
      }

      // Persist a last-order id for confirmation page to fetch
      try {
        localStorage.setItem(LAST_ORDER_ID_KEY, created.id);
        // also save a local fallback snapshot in case Firestore fetch fails later
        localStorage.setItem("lastOrder", JSON.stringify({ id: created.id, ...orderPayload }));
      } catch (err) {
        // ignore localstorage errors
      }

      // cleanup
      localStorage.removeItem(DRAFT_KEY);
      clearCart();

      // navigate to confirmation
      navigate("/order-confirmation");
    } catch (err) {
      console.error("Order placement failed (Firestore):", err);
      setErrorMessage("Something went wrong while saving your order. Please try again.");
    } finally {
      setProcessing(false);
    }
  }

  const steps = [
    { id: 1, label: "Contact" },
    { id: 2, label: "Shipping" },
    { id: 3, label: "Payment" },
  ];
  const activeStep = form.paymentMethod === "card" ? 3 : form.address1 ? 2 : 1;

  return (
    <main className="checkout container">
      <h1>Checkout</h1>
      <div className="checkout-progress" role="navigation" aria-label="Checkout progress">
        {steps.map((s) => (
          <div key={s.id} className={`step ${s.id === activeStep ? "active" : ""}`}>
            <div className="dot" aria-hidden />
            <div>{s.label}</div>
          </div>
        ))}
      </div>
      <p className="lead">Complete your order — we’ll only use this info to fulfill your shipment.</p>

      <div className="checkout-grid">
        <form className="checkout-form card" onSubmit={placeOrder} noValidate>
          <section>
            <h2>Contact & Shipping</h2>

            <label>
              <div className="label">Full name</div>
              <input type="text" value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="Your full name" />
              {errors.fullName && <div className="error">{errors.fullName}</div>}
            </label>

            <label>
              <div className="label">Email</div>
              <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@example.com" />
              {errors.email && <div className="error">{errors.email}</div>}
            </label>

            <label>
              <div className="label">Phone</div>
              <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+91 98765 43210" />
              {errors.phone && <div className="error">{errors.phone}</div>}
            </label>

            <label>
              <div className="label">Address line 1</div>
              <input type="text" value={form.address1} onChange={(e) => updateField("address1", e.target.value)} placeholder="Street, building, suite" />
              {errors.address1 && <div className="error">{errors.address1}</div>}
            </label>

            <label>
              <div className="label">Address line 2 <span className="muted">(optional)</span></div>
              <input type="text" value={form.address2} onChange={(e) => updateField("address2", e.target.value)} placeholder="Apartment, floor, landmark" />
            </label>

            <div className="two-col" style={{ marginTop: 4 }}>
              <label>
                <div className="label">City</div>
                <input type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                {errors.city && <div className="error">{errors.city}</div>}
              </label>

              <label>
                <div className="label">State / Region</div>
                <input  type="text"value={form.state} onChange={(e) => updateField("state", e.target.value)} />
              </label>
            </div>

            <div className="two-col" style={{ marginTop: 6 }}>
              <label>
                <div className="label">Postal code</div>
                <input  type="text" value={form.postal} onChange={(e) => updateField("postal", e.target.value)} />
                {errors.postal && <div className="error">{errors.postal}</div>}
              </label>

              <label>
                <div className="label">Country</div>
                <input  type="text" value={form.country} onChange={(e) => updateField("country", e.target.value)} />
              </label>
            </div>
          </section>

          <section style={{ marginTop: 12 }}>
            <h2>Shipping & Payment</h2>

            <div className="shipping-row">
              <label>
                <input type="radio" name="shipping" checked={form.shippingMethod === "standard"} onChange={() => updateField("shippingMethod", "standard")} />
                <span className="label">Standard shipping (free)</span>
              </label>

              <label>
                <input type="radio" name="shipping" checked={form.shippingMethod === "express"} onChange={() => updateField("shippingMethod", "express")} />
                <span className="label">Express shipping ({formatPrice(19900)})</span>
              </label>
            </div>

            <div className="payment-row" style={{ marginTop: 12 }}>
              <label>
                <input type="radio" name="payment" checked={form.paymentMethod === "cod"} onChange={() => updateField("paymentMethod", "cod")} />
                <span className="label">Cash on Delivery</span>
              </label>

              <label>
                <input type="radio" name="payment" checked={form.paymentMethod === "card"} onChange={() => updateField("paymentMethod", "card")} />
                <span className="label">Card (test)</span>
              </label>
            </div>

            {form.paymentMethod === "card" && (
              <div className="card-fields" style={{ marginTop: 10 }}>
                <label>
                  <div className="label">Name on card</div>
                  <input value={form.cardName} onChange={(e) => updateField("cardName", e.target.value)} placeholder="Name on card" />
                  {errors.cardName && <div className="error">{errors.cardName}</div>}
                </label>

                <label>
                  <div className="label">Card number</div>
                  <input placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={(e) => updateField("cardNumber", e.target.value)} />
                  {errors.cardNumber && <div className="error">{errors.cardNumber}</div>}
                </label>

                <div className="two-col" style={{ marginTop: 6 }}>
                  <label>
                    <div className="label">Expiry (MM/YY)</div>
                    <input value={form.cardExp} onChange={(e) => updateField("cardExp", e.target.value)} />
                    {errors.cardExp && <div className="error">{errors.cardExp}</div>}
                  </label>

                  <label>
                    <div className="label">CVV</div>
                    <input value={form.cardCvv} onChange={(e) => updateField("cardCvv", e.target.value)} />
                    {errors.cardCvv && <div className="error">{errors.cardCvv}</div>}
                  </label>
                </div>
              </div>
            )}
          </section>

          {errorMessage && <div className="error" style={{ marginTop: 8 }}>{errorMessage}</div>}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn ghost" type="button" onClick={() => navigate(-1)} disabled={processing}>
              Back
            </button>
            <button className="btn primary" type="submit" disabled={processing}>
              {processing ? "Processing…" : `Place order • ${formatPrice(subtotal + (form.shippingMethod === "express" ? 19900 : 0))}`}
            </button>
          </div>
        </form>

        <aside className="order-summary card">
          <h2>Order summary</h2>

          <div className="summary-items" aria-live="polite">
            <AnimatePresence initial={false}>
              {items.map((it) => {
                const uid = it.uniqueId || `${it.id}-${it.volume || "50ml"}`;
                const qty = it.qty || 1;
                const unitPrice = typeof it.price === "number" ? it.price : 0;
                const lineTotal = unitPrice * qty;

                return (
                  <motion.div
                    key={uid + "-" + qty}
                    initial={{ opacity: 0, x: 8, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="summary-row"
                  >
                    <div className="s-left">
                      <img src={it.imageUrl || "/smoke-fallback.jpg"} alt={it.name} />
                      <div style={{ minWidth: 0 }}>
                        <div className="s-name">{it.name}</div>
                        <div className="s-meta">{it.volume || "50ml"} × {qty}</div>
                      </div>
                    </div>

                    <div className="s-right">{formatPrice(lineTotal)}</div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="summary-line">
            <div>Subtotal</div>
            <div>{formatPrice(subtotal)}</div>
          </div>
          <div className="summary-line">
            <div>Shipping</div>
            <div>{formatPrice(form.shippingMethod === "express" ? 19900 : 0)}</div>
          </div>
          <div className="summary-line total">
            <div>Total</div>
            <div className="big">{formatPrice(subtotal + (form.shippingMethod === "express" ? 19900 : 0))}</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
