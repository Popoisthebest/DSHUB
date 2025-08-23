import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/common.css";

function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { googleLogin } = useAuth(); // teacherLogin 제거

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await googleLogin();
      navigate("/");
    } catch (err) {
      setError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h2>로그인</h2>
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#fee",
            color: "#c00",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {/* 구글 로그인 박스만 유지 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            flex: 1,
            maxWidth: "420px",
            backgroundColor: "white",
            padding: "2rem",
            borderRadius: "8px",
            boxShadow: "var(--shadow)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            Google 계정으로 로그인합니다.
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "1rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "로그인 중..." : "Google로 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
