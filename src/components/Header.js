import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Logo from "./Logo";
import "../styles/common.css";

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
                  color:
                    location.pathname === "/"
                      ? "var(--primary-color)"
                      : "var(--text-color)",
                  fontWeight: location.pathname === "/" ? "700" : "500",
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
                  color:
                    location.pathname === "/reserve"
                      ? "var(--primary-color)"
                      : "var(--text-color)",
                  fontWeight: location.pathname === "/reserve" ? "700" : "500",
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
                  color:
                    location.pathname === "/reservations"
                      ? "var(--primary-color)"
                      : "var(--text-color)",
                  fontWeight:
                    location.pathname === "/reservations" ? "700" : "500",
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
                  color:
                    location.pathname === "/mypage"
                      ? "var(--primary-color)"
                      : "var(--text-color)",
                  fontWeight: location.pathname === "/mypage" ? "700" : "500",
                }}
              >
                마이페이지
              </Link>
            </li>
            {user?.isAdmin && (
              <li>
                <Link
                  to="/admin"
                  style={{
                    textDecoration: "none",
                    color:
                      location.pathname === "/admin"
                        ? "var(--primary-color)"
                        : "var(--text-color)",
                    fontWeight: location.pathname === "/admin" ? "700" : "500",
                  }}
                >
                  관리자
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Right: Login/Logout Button */}
        <div>
          {user ? (
            <button
              onClick={handleLogout}
              style={{
                padding: "0.6rem 1.2rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: "500",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                ":hover": {
                  backgroundColor: "#c82333",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                },
                ":active": {
                  transform: "translateY(0)",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <span>로그아웃</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "0.6rem 1.2rem",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: "500",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                ":hover": {
                  backgroundColor: "var(--primary-color-dark)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                },
                ":active": {
                  transform: "translateY(0)",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              <span>로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
