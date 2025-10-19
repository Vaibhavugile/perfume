// src/admin/AdminPanel.jsx
import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const AdminOrders = React.lazy(() => import('./AdminOrders'));
const AdminReports = React.lazy(() => import('./AdminReports'));
const AdminProducts = React.lazy(()=> import('../pages/AdminProducts'));

export default function AdminPanel() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // Auth + Role check
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate('/login');
      } else if (!currentUser.isAdmin) {
        navigate('/');
      }
    }
  }, [loading, currentUser, navigate]);

  if (loading)
    return <div style={{ padding: 20, textAlign: 'center' }}>Loading Admin Panel…</div>;
  if (!currentUser?.isAdmin)
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#e53e3e' }}>
        Access denied
      </div>
    );

  return (
    <React.Suspense
      fallback={<div style={{ padding: 20, textAlign: 'center' }}>Loading Admin content…</div>}
    >
      <main
        style={{
          maxWidth: 1300,
          margin: '0 auto',
          padding: '24px 20px',
        }}
      >
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </React.Suspense>
  );
}
