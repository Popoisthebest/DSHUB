import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase/config";

function NoticeList() {
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const noticeData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        }));
        setNotices(noticeData);
        setLoading(false);
      },
      (error) => {
        console.error("공지사항 목록 조회 오류:", error);
        setError("공지사항 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddNotice = async () => {
    try {
      if (!newNotice.title.trim() || !newNotice.content.trim()) {
        throw new Error("제목과 내용을 모두 입력해주세요.");
      }

      await addDoc(collection(db, "notices"), {
        title: newNotice.title.trim(),
        content: newNotice.content.trim(),
        createdAt: new Date(),
      });

      setNewNotice({ title: "", content: "" });
    } catch (error) {
      console.error("공지사항 추가 오류:", error);
      setError(error.message);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm("이 공지사항을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "notices", noticeId));
      } catch (error) {
        console.error("공지사항 삭제 오류:", error);
        setError("공지사항 삭제 중 오류가 발생했습니다.");
      }
    }
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>공지사항 관리</h2>

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
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem" }}>새 공지사항 작성</h3>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            value={newNotice.title}
            onChange={(e) =>
              setNewNotice({ ...newNotice, title: e.target.value })
            }
            placeholder="제목"
            style={{
              width: "100%",
              padding: "0.8rem",
              marginBottom: "1rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
            }}
          />
          <textarea
            value={newNotice.content}
            onChange={(e) =>
              setNewNotice({ ...newNotice, content: e.target.value })
            }
            placeholder="내용"
            style={{
              width: "100%",
              padding: "0.8rem",
              marginBottom: "1rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              minHeight: "150px",
              resize: "vertical",
            }}
          />
          <button
            onClick={handleAddNotice}
            style={{
              padding: "0.8rem 1.5rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            공지사항 등록
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        {notices.map((notice) => (
          <div
            key={notice.id}
            style={{
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>{notice.title}</h3>
              <div style={{ color: "#666", fontSize: "0.875rem" }}>
                작성일: {notice.createdAt?.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                whiteSpace: "pre-wrap",
                marginBottom: "1rem",
              }}
            >
              {notice.content}
            </div>
            <button
              onClick={() => handleDeleteNotice(notice.id)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NoticeList;
