// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";

// Core pages
import Homepage from "./Homepage";
import ProductsPage from "./ProductsPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import AdminProducts from "./pages/AdminProducts";
import FindYourScent from "./FindYourScent";
import CheckoutPage from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import Login from "./pages/Login";

// Context providers
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";

// Components
import Header from "./components/Header";
import MiniCart from "./components/MiniCart";
import PrivateRoute from "./components/PrivateRoute";

// Admin area - updated to use AdminPanel instead of AdminLayout
import AdminPanel from "./admin/AdminPanel"; // <-- new panel that mounts dashboard/orders/reports

// Optional user pages
import OrdersPage from "./pages/Orders"; // user order history

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        {/* Global header (shows login/avatar & cart) */}
        <Header />

        {/* App routes */}
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/shop" element={<ProductsPage />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/find-your-scent" element={<FindYourScent />} />
          <Route path="/login" element={<Login />} />

          {/* User pages */}
          <Route path="/orders" element={OrdersPage ? <OrdersPage /> : <div />} />

          {/* Admin area (protected) */}
          <Route
            path="/admin/*"
            element={
              <PrivateRoute>
                <AdminPanel />
              </PrivateRoute>
            }
          />

          {/* Protected checkout and confirmation routes */}
          <Route
            path="/checkout"
            element={
              <PrivateRoute>
                <CheckoutPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/order-confirmation"
            element={
              <PrivateRoute>
                <OrderConfirmation />
              </PrivateRoute>
            }
          />

          {/* Fallbacks / add other routes as needed */}
        </Routes>

        {/* Mini cart overlay mounted at the app root */}
        <MiniCart />
      </CartProvider>
    </AuthProvider>
  );
}
