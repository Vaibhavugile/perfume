import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/header.css";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdown, setDropdown] = useState(false);

  return (
    <header className="transparent-header">
      <div className="header-right">
        {!user ? (
          <button
            className="login-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        ) : (
          <div className="user-area">
            <button
              className="avatar-btn"
              onClick={() => setDropdown(!dropdown)}
              aria-label="User menu"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="avatar"
                />
              ) : (
                <div className="avatar initials">
                  {user.displayName
                    ? user.displayName.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {dropdown && (
              <div
                className="dropdown-menu"
                onMouseLeave={() => setDropdown(false)}
              >
                <div className="user-name">
                  {user.displayName || user.email}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setDropdown(false);
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
