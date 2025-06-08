import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "./Logo";
import "../styles/common.css";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header
      style={{
        backgroundColor: "white",
        boxShadow: "var(--shadow)",
        padding: "1rem 2rem",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left: Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>

        {/* Center: Navigation Links */}
        <nav
          style={{
            flexGrow: 1 /* Allow nav to take up available space */,
            display: "flex",
            justifyContent: "center" /* Center the nav items */,
          }}
        >
          <ul
            style={{
              display: "flex",
              gap: "2rem",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            <li>
              <Link
                to="/"
                style={{
                  textDecoration: "none",
                  color: "var(--text-color)",
                  fontWeight: "500",
                }}
              >
                홈
              </Link>
            </li>
            <li>
              <Link
                to="/reserve"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault(); // Prevent default link behavior
                    navigate("/login");
                  }
                }}
                style={{
                  textDecoration: "none",
                  color: "var(--text-color)",
                  fontWeight: "500",
                }}
              >
                예약하기
              </Link>
            </li>
            <li>
              <Link
                to="/reservations"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    navigate("/login");
                  }
                }}
                style={{
                  textDecoration: "none",
                  color: "var(--text-color)",
                  fontWeight: "500",
                }}
              >
                예약현황
              </Link>
            </li>
            <li>
              <Link
                to="/mypage"
                onClick={(e) => {
                  if (!user) {
                    e.preventDefault();
                    navigate("/login");
                  }
                }}
                style={{
                  textDecoration: "none",
                  color: "var(--text-color)",
                  fontWeight: "500",
                }}
              >
                마이페이지
              </Link>
            </li>
          </ul>
        </nav>

        {/* Right: Login/Logout Button */}
        <div>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-color)",
                fontWeight: "500",
                cursor: "pointer",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                transition: "background-color 0.3s ease",
                ":hover": {
                  backgroundColor: "var(--hover-color)",
                },
              }}
            >
              로그아웃
            </button>
          ) : (
            <Link
              to="/login"
              style={{
                textDecoration: "none",
                color: "var(--text-color)",
                fontWeight: "500",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                transition: "background-color 0.3s ease",
                ":hover": {
                  backgroundColor: "var(--hover-color)",
                },
              }}
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
