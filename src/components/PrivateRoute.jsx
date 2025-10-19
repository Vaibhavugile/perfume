// src/components/PrivateRoute.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PrivateRoute({ children, requireAdmin = false }) {
  // AuthContext now exposes both `user` and `currentUser` for compatibility
  const { user, currentUser, loading } = useAuth();
  const location = useLocation();

  // while loading, render nothing (or a spinner) to avoid premature redirects
  if (loading) return null; // or return <Spinner /> if you have one

  // prefer currentUser (enriched) but fall back to user
  const authUser = currentUser || user;

  // not signed in -> send to login and preserve return path
  if (!authUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // admin-only route check
  if (requireAdmin && !authUser.isAdmin) {
    // Option: send to login or to a 403 page. Here we'll redirect to login to be safe.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // authorized
  return children;
}
