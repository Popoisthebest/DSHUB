import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllNotices,
  createNotice,
  deleteNotice,
  updateNotice,
} from "../firebase/db";

function NoticeList() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newNotice, setNewNotice] = useState({ title: "", content: "" });
  const [editingNotice, setEditingNotice] = useState(null);

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const noticesData = await getAllNotices();
      setNotices(noticesData);
    } catch (error) {
      setError("공지사항을 불러오는 중 오류가 발생했습니다.");
      console.error("공지사항 로딩 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await createNotice(newNotice);
      setNewNotice({ title: "", content: "" });
      await loadNotices();
    } catch (error) {
      setError("공지사항 작성 중 오류가 발생했습니다.");
      console.error("공지사항 작성 오류:", error);
    }
  };

  const handleDelete = async (noticeId) => {
    if (!window.confirm("이 공지사항을 삭제하시겠습니까?")) return;

    try {
      await deleteNotice(noticeId);
      await loadNotices();
    } catch (error) {
      setError("공지사항 삭제 중 오류가 발생했습니다.");
      console.error("공지사항 삭제 오류:", error);
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingNotice.title || !editingNotice.content) {
      setError("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await updateNotice(editingNotice.id, {
        title: editingNotice.title,
        content: editingNotice.content,
      });
      setEditingNotice(null);
      await loadNotices();
    } catch (error) {
      setError("공지사항 수정 중 오류가 발생했습니다.");
      console.error("공지사항 수정 오류:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotice(null);
  };

  if (!user?.isAdmin) {
    return <div>접근 권한이 없습니다.</div>;
  }

  return (
    <div>
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
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <div>
            <label
              htmlFor="title"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              제목
            </label>
            <input
              type="text"
              id="title"
              value={newNotice.title}
              onChange={(e) =>
                setNewNotice({ ...newNotice, title: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ddd",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="content"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              내용
            </label>
            <textarea
              id="content"
              value={newNotice.content}
              onChange={(e) =>
                setNewNotice({ ...newNotice, content: e.target.value })
              }
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ddd",
                minHeight: "150px",
                resize: "vertical",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "0.8rem 1.5rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            공지사항 작성
          </button>
        </form>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem" }}>공지사항 목록</h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>로딩 중...</div>
        ) : notices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {notices.map((notice) => (
              <div
                key={notice.id}
                style={{
                  padding: "1.5rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                }}
              >
                {editingNotice?.id === notice.id ? (
                  <form
                    onSubmit={handleUpdate}
                    style={{ display: "grid", gap: "1rem" }}
                  >
                    <div>
                      <label
                        htmlFor={`edit-title-${notice.id}`}
                        style={{ display: "block", marginBottom: "0.5rem" }}
                      >
                        제목
                      </label>
                      <input
                        type="text"
                        id={`edit-title-${notice.id}`}
                        value={editingNotice.title}
                        onChange={(e) =>
                          setEditingNotice({
                            ...editingNotice,
                            title: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`edit-content-${notice.id}`}
                        style={{ display: "block", marginBottom: "0.5rem" }}
                      >
                        내용
                      </label>
                      <textarea
                        id={`edit-content-${notice.id}`}
                        value={editingNotice.content}
                        onChange={(e) =>
                          setEditingNotice({
                            ...editingNotice,
                            content: e.target.value,
                          })
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          minHeight: "150px",
                          resize: "vertical",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button
                        type="submit"
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "var(--primary-color)",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        수정 완료
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#ddd",
                          color: "#666",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>{notice.title}</h4>
                    <p
                      style={{
                        color: "#666",
                        fontSize: "0.9rem",
                        marginBottom: "1rem",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {notice.content}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <p style={{ color: "#666", fontSize: "0.9rem" }}>
                        작성일:{" "}
                        {notice.createdAt
                          ? new Date(notice.createdAt.toDate()).toLocaleString()
                          : "날짜 정보 없음"}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleEdit(notice)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#eef",
                            color: "var(--primary-color)",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(notice.id)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#fee",
                            color: "#c00",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoticeList;
