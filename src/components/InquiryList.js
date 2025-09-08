import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { deleteInquiry } from "../firebase/db";

function InquiryList() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState({});

  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const inquiryData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setInquiries(inquiryData);
        setLoading(false);
      },
      (error) => {
        console.error("문의 목록 조회 오류:", error);
        setError("문의 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleReply = async (inquiryId) => {
    try {
      if (!reply[inquiryId] || !reply[inquiryId].trim()) {
        throw new Error("답변 내용을 입력해주세요.");
      }

      const inquiryRef = doc(db, "inquiries", inquiryId);
      await updateDoc(inquiryRef, {
        reply: reply[inquiryId].trim(),
        replyDate: new Date(),
        status: "answered",
      });

      setReply((prev) => ({ ...prev, [inquiryId]: "" }));
    } catch (error) {
      console.error("답변 등록 오류:", error);
      setError(error.message);
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>문의 관리</h2>

      <div style={{ display: "grid", gap: "1rem" }}>
        {inquiries.map((inquiry) => (
          <div
            key={inquiry.id}
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <h3 style={{ margin: 0 }}>{inquiry.title}</h3>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
                    backgroundColor:
                      inquiry.status === "answered" ? "#e8f5e9" : "#fff3e0",
                    color:
                      inquiry.status === "answered" ? "#2e7d32" : "#ef6c00",
                    fontSize: "0.875rem",
                  }}
                >
                  {inquiry.status === "answered" ? "답변완료" : "답변대기"}
                </span>
              </div>
              <div
                style={{
                  color: "#666",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                작성자: {inquiry.studentName} ({inquiry.studentId})
              </div>
              <div style={{ color: "#666", fontSize: "0.875rem" }}>
                작성일: {inquiry.createdAt?.toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem 0" }}>문의 내용</h4>
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {inquiry.content}
              </div>
            </div>

            {inquiry.reply && (
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>답변</h4>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#e8f5e9",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {inquiry.reply}
                </div>
                <div
                  style={{
                    color: "#666",
                    fontSize: "0.875rem",
                    marginTop: "0.5rem",
                  }}
                >
                  답변일: {inquiry.replyDate?.toDate().toLocaleString()}
                </div>

                {/* 🔹답변 완료 시 삭제 버튼 */}
                <button
                  onClick={() => deleteInquiry(inquiry.id)}
                  style={{
                    marginTop: "1rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  삭제
                </button>
              </div>
            )}

            {!inquiry.reply && (
              <div>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>답변 작성</h4>
                <textarea
                  value={reply[inquiry.id] || ""}
                  onChange={(e) =>
                    setReply((prev) => ({
                      ...prev,
                      [inquiry.id]: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    minHeight: "100px",
                    marginBottom: "1rem",
                    resize: "vertical",
                  }}
                  placeholder="답변 내용을 입력하세요"
                />
                <button
                  onClick={() => handleReply(inquiry.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "var(--primary-color)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  답변 등록
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InquiryList;
