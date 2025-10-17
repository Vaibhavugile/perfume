import { Routes, Route } from "react-router-dom";
import Homepage from "./Homepage";
import ProductsPage from "./ProductsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Homepage />} />
      <Route path="/shop" element={<ProductsPage />} />
    </Routes>
  );
}

export default App;
