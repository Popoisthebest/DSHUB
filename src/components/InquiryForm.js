import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { addInquiry } from "../firebase/db";

function InquiryForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      if (!title.trim() || !content.trim()) {
        throw new Error("제목과 내용을 모두 입력해주세요.");
      }

      if (!user || !user.studentId || !user.name) {
        throw new Error(
          "사용자 정보가 올바르지 않습니다. 마이페이지에서 프로필을 완성해주세요."
        );
      }

      await addInquiry({
        title: title.trim(),
        content: content.trim(),
        studentId: user.studentId,
        studentName: user.name,
        createdAt: new Date(),
        status: "pending",
      });

      setTitle("");
      setContent("");
      setSuccess(true);
    } catch (error) {
      console.error("문의 등록 오류:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem", textAlign: "center" }}>문의하기</h2>

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

      {success && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#efe",
            color: "#0c0",
            borderRadius: "4px",
          }}
        >
          문의가 성공적으로 등록되었습니다.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
            }}
            placeholder="문의 제목을 입력하세요"
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
            내용
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              minHeight: "200px",
              resize: "vertical",
            }}
            placeholder="문의 내용을 입력하세요"
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
          {loading ? "등록 중..." : "문의하기"}
        </button>
      </form>
    </div>
  );
}

export default InquiryForm;
