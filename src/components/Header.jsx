// src/components/Header.jsx
import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import "../styles/header.css";

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);

  const cartCount = items?.reduce((sum, it) => sum + (it.qty || 1), 0) || 0;

  return (
    <header className="site-header">
      <div className="header-inner container">
        {/* Brand / Logo */}
        <div className="brand" onClick={() => navigate("/")}>
          <img src="/logo192.png" alt="" className="brand-icon" />
          <span className="brand-name">EssenceAura</span>
        </div>

        {/* Desktop navigation */}
        <nav className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/find-your-scent">Find Your Scent</NavLink>
          <NavLink to="/cart" className="cart-link">
            Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </NavLink>
        </nav>

        {/* Right section (login / profile) */}
        <div className="header-actions">
          {!user ? (
            <button
              className="btn-login"
              onClick={() => navigate("/login")}
            >
              <i className="fa-regular fa-user" aria-hidden="true"></i>
              <span>Login</span>
            </button>
          ) : (
            <div className="user-area">
              <button
                className="avatar-btn"
                onClick={() => setDropdown(!dropdown)}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="avatar" />
                ) : (
                  <div className="avatar initials">
                    {user.displayName
                      ? user.displayName.charAt(0).toUpperCase()
                      : user.email.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {dropdown && (
                <div className="dropdown-menu" onMouseLeave={() => setDropdown(false)}>
                  <div className="user-name">{user.displayName || user.email}</div>
                  <Link to="/orders" onClick={() => setDropdown(false)}>My Orders</Link>
                  <Link to="/account" onClick={() => setDropdown(false)}>Account</Link>
                  <button onClick={() => { logout(); setDropdown(false); }}>Logout</button>
                </div>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <i className="fa-solid fa-bars" />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
        <NavLink to="/shop" onClick={() => setMenuOpen(false)}>Shop</NavLink>
        <NavLink to="/find-your-scent" onClick={() => setMenuOpen(false)}>Find Your Scent</NavLink>
        <NavLink to="/cart" onClick={() => setMenuOpen(false)}>Cart</NavLink>

        {!user ? (
          <button
            className="btn-login mobile"
            onClick={() => {
              navigate("/login");
              setMenuOpen(false);
            }}
          >
            <i className="fa-regular fa-user" />
            <span>Login</span>
          </button>
        ) : (
          <button
            className="btn-login mobile"
            onClick={() => {
              logout();
              setMenuOpen(false);
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
