import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, or } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import './admin-dashboard.css';

const toDate = (v) => (v?.toDate ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let dead = false;
    const run = async () => {
      setLoading(true);
      setErr('');
      try {
        // Simple example: fetch recent orders (you can replace query to suit your schema)
        const qRef = query(collection(db, 'orders'), );
        const snap = await getDocs(qRef);
        if (dead) return;
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data(), timestamps: d.data().timestamps || {}, bookingDetails: d.data().bookingDetails || {}, lab: d.data().lab || {} })));
      } catch (e) {
        if (!dead) setErr(e.message || 'Failed to load admin dashboard.');
      } finally {
        if (!dead) setLoading(false);
      }
    };
    run();
    return () => { dead = true; };
  }, []);

  const kpis = useMemo(() => {
    let totalOrders = orders.length;
    let revenue = 0;
    let pending = 0;
    let delivered = 0;
    for (const o of orders) {
      revenue += (o.total || o.subtotal || 0);
      const s = (o.status || '').toLowerCase();
      if (s === 'pending' || s === 'authorized') pending++;
      if (s === 'delivered') delivered++;
    }
    return { totalOrders, revenue, pending, delivered };
  }, [orders]);

  return (
    <div className="adminDash-wrap">
      <header className="adminDash-header">
        <div>
          <h1>🪄 Admin Dashboard</h1>
          <p>Welcome, <strong>{currentUser?.fullName || currentUser?.displayName || 'Admin'}</strong></p>
        </div>
        <div className="adminDash-actions">
          <button className="admin-btn" onClick={() => navigate('/admin/orders')}>Manage Orders</button>
          <button className="admin-btn ghost" onClick={() => navigate('/admin/reports')}>Reports</button>
        </div>
      </header>

      {err && <div className="adminDash-error">{err}</div>}

      <section className="adminDash-kpis">
        <div className="kpi"><div className="kpi-label">Total orders</div><div className="kpi-value">{kpis.totalOrders}</div></div>
        <div className="kpi"><div className="kpi-label">Revenue</div><div className="kpi-value">{Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(kpis.revenue / 100)}</div></div>
        <div className="kpi"><div className="kpi-label">Pending</div><div className="kpi-value">{kpis.pending}</div></div>
        <div className="kpi"><div className="kpi-label">Delivered</div><div className="kpi-value">{kpis.delivered}</div></div>
      </section>

      <section className="adminDash-quick">
        <button className="tile" onClick={() => navigate('/admin/orders')}>
          <div className="tile-ico">🧾</div>
          <div className="tile-title">Orders</div>
          <div className="tile-sub">View & manage orders</div>
        </button>

        <button className="tile" onClick={() => navigate('/admin/reports')}>
          <div className="tile-ico">📊</div>
          <div className="tile-title">Analytics</div>
          <div className="tile-sub">Sales & products</div>
        </button>

        <button className="tile" onClick={() => navigate('/admin/products')}>
          <div className="tile-ico">🧴</div>
          <div className="tile-title">Products</div>
          <div className="tile-sub">Manage catalog</div>
        </button>

        <button className="tile" onClick={() => navigate('/')}>
          <div className="tile-ico">🏠</div>
          <div className="tile-title">Public site</div>
          <div className="tile-sub">Open storefront</div>
        </button>
      </section>

      <section className="adminDash-card">
        <h2>Quick workflow</h2>
        <ol className="admin-steps">
          <li>Open Orders to review recent orders and update statuses.</li>
          <li>Use Reports for sales breakdown and top products.</li>
          <li>Manage Products to edit fragrance SKUs and inventory.</li>
        </ol>
      </section>

      {loading && <div className="adminDash-loading">Loading…</div>}
    </div>
  );
}
