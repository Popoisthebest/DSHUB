import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/common.css";

function CompleteProfile() {
  const { user, completeUserProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.profileComplete) {
      // 프로필이 이미 완성된 경우 홈으로 리다이렉트
      navigate("/");
    } else if (!user && !loading) {
      // 로그인되지 않은 상태면 로그인 페이지로 리다이렉트
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!studentId || !name) {
      setError("학번과 이름을 모두 입력해주세요.");
      return;
    }
    try {
      await completeUserProfile(studentId, name);
      navigate("/"); // 프로필 완성 후 홈으로 이동
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || !user || user.profileComplete) {
    return <div>로딩 중...</div>; // 로딩 중이거나 이미 프로필이 완성된 경우 잠시 표시
  }

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h2>정보 입력</h2>
        <p>Google 계정으로 로그인했습니다. 학번과 이름을 입력해주세요.</p>
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
              }}
            >
              학번
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
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
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "저장 중..." : "정보 저장"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfile;
