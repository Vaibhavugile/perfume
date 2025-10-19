// src/contexts/CartContext.jsx
import React, { createContext, useContext, useEffect, useReducer } from "react";

// ---------------- Reducer & Context ----------------
const CartContext = createContext();

const initialState = {
  items: [], // each item: { id, uniqueId, name, imageUrl, volume, price, qty }
  isMiniOpen: false,
};

function calcTotals(items) {
  const totalQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);
  const subtotal = items.reduce((sum, it) => sum + (it.price * (it.qty || 1)), 0);
  return { totalQty, subtotal };
}

function reducer(state, action) {
  switch (action.type) {
    case "LOAD_FROM_STORAGE":
      return { ...state, items: action.payload || [] };

    case "ADD_ITEM": {
      const variant = action.payload;
      const uid = variant.uniqueId || `${variant.id}-${variant.volume || "50ml"}`;
      const existing = state.items.find((i) => i.uniqueId === uid);

      let newItems;
      if (existing) {
        newItems = state.items.map((i) =>
          i.uniqueId === uid ? { ...i, qty: i.qty + (variant.qty || 1) } : i
        );
      } else {
        newItems = [...state.items, { ...variant, qty: variant.qty || 1 }];
      }
      return { ...state, items: newItems, isMiniOpen: true }; // open mini-cart automatically
    }

    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.uniqueId !== action.payload) };

    case "UPDATE_QTY":
      return {
        ...state,
        items: state.items.map((i) =>
          i.uniqueId === action.payload.uniqueId
            ? { ...i, qty: Math.max(1, action.payload.qty) }
            : i
        ),
      };

    case "CLEAR_CART":
      return { ...state, items: [] };

    case "OPEN_MINI":
      return { ...state, isMiniOpen: true };
    case "CLOSE_MINI":
      return { ...state, isMiniOpen: false };
    case "TOGGLE_MINI":
      return { ...state, isMiniOpen: !state.isMiniOpen };

    default:
      return state;
  }
}

// ---------------- Provider ----------------
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load items on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cartItems");
      if (stored) dispatch({ type: "LOAD_FROM_STORAGE", payload: JSON.parse(stored) });
    } catch (err) {
      console.warn("Cart load failed", err);
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(state.items));
    } catch (err) {
      console.warn("Cart save failed", err);
    }
  }, [state.items]);

  // Actions
  const addToCart = (variant, qty = 1) =>
    dispatch({ type: "ADD_ITEM", payload: { ...variant, qty } });

  const removeFromCart = (uniqueId) => dispatch({ type: "REMOVE_ITEM", payload: uniqueId });

  const updateQty = (uniqueId, qty) =>
    dispatch({ type: "UPDATE_QTY", payload: { uniqueId, qty } });

  const clearCart = () => dispatch({ type: "CLEAR_CART" });

  const openMini = () => dispatch({ type: "OPEN_MINI" });
  const closeMini = () => dispatch({ type: "CLOSE_MINI" });
  const toggleMini = () => dispatch({ type: "TOGGLE_MINI" });

  const { subtotal, totalQty } = calcTotals(state.items);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        subtotal,
        totalQty,
        isMiniOpen: state.isMiniOpen,
        openMini,
        closeMini,
        toggleMini,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
