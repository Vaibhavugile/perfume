import { Routes, Route } from "react-router-dom";
import Homepage from "./Homepage";
import ProductsPage from "./ProductsPage";
import AdminProducts from "./pages/AdminProducts";
import "./App.css";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/shop" element={<ProductsPage />} />
      <Route path="/admin" element={<AdminProducts />} />
    </Routes>
  );
}

export default App;
