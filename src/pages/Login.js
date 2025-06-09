import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/common.css";

function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const navigate = useNavigate();
  const { googleLogin, teacherLogin } = useAuth();

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await googleLogin();
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await teacherLogin(teacherId, teacherPassword);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h2>로그인</h2>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
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

        <div
          style={{
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {/* 학생 로그인 박스 */}
          <div
            style={{
              flex: 1,
              minWidth: "300px",
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
            <h3>학생 로그인</h3>
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

          {/* 선생님 로그인 박스 */}
          <div
            style={{
              flex: 1,
              minWidth: "300px",
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "var(--shadow)",
            }}
          >
            <h3>선생님 로그인</h3>
            <form onSubmit={handleTeacherSubmit}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                  }}
                >
                  아이디
                </label>
                <input
                  type="text"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                  }}
                >
                  비밀번호
                </label>
                <input
                  type="password"
                  value={teacherPassword}
                  onChange={(e) => setTeacherPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
