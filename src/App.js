// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import Homepage from "./Homepage";
import ProductsPage from "./ProductsPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import AdminProducts from "./pages/AdminProducts";
import FindYourScent from "./FindYourScent";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/shop" element={<ProductsPage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/admin" element={<AdminProducts />} />
      <Route path="/find-your-scent" element={<FindYourScent />} />
      {/* add other routes */}
    </Routes>
  );
}
