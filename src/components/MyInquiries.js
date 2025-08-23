import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDate } from "../utils/dateUtils";

function MyInquiries() {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "inquiries"),
      where("studentId", "==", user.studentId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const inquiryData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt,
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
  }, [user]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>내 문의 내역</h2>

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

      {inquiries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          문의 내역이 없습니다.
        </div>
      ) : (
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
                        inquiry.status === "pending"
                          ? "#fff3e0"
                          : inquiry.status === "in_progress"
                          ? "#e3f2fd"
                          : "#e8f5e9",
                      color:
                        inquiry.status === "pending"
                          ? "#e65100"
                          : inquiry.status === "in_progress"
                          ? "#1565c0"
                          : "#2e7d32",
                      fontSize: "0.875rem",
                    }}
                  >
                    {inquiry.status === "pending"
                      ? "대기중"
                      : inquiry.status === "in_progress"
                      ? "처리중"
                      : "완료"}
                  </span>
                </div>
                <div style={{ color: "#666", fontSize: "0.875rem" }}>
                  문의일: {formatDate(new Date(inquiry.createdAt))}
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
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0" }}>답변</h4>
                  <div
                    style={{
                      padding: "1rem",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "4px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {inquiry.reply}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyInquiries;
