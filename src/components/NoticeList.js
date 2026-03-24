import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../contexts/AuthContext";
import {
  getAllNotices,
  createNotice,
  deleteNotice,
  updateNotice,
} from "../firebase/db";

const NOTICE_PREVIEW_LENGTH = 180;

function NoticeList() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newNotice, setNewNotice] = useState({ title: "", content: "" });
  const [editingNotice, setEditingNotice] = useState(null);
  const [expandedNotices, setExpandedNotices] = useState({});

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
      setError("");
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
      setError("");
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
      setError("");
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

  const toggleExpanded = (noticeId) => {
    setExpandedNotices((prev) => ({
      ...prev,
      [noticeId]: !prev[noticeId],
    }));
  };

  const getPreviewContent = (content = "") => {
    if (content.length <= NOTICE_PREVIEW_LENGTH) return content;
    return `${content.slice(0, NOTICE_PREVIEW_LENGTH)}...`;
  };

  const isLongNotice = (content = "") => content.length > NOTICE_PREVIEW_LENGTH;

  const markdownComponents = {
    p: ({ children }) => (
      <p style={{ margin: "0 0 0.75rem 0", lineHeight: 1.7 }}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: "0 0 0.75rem 1.25rem", lineHeight: 1.7 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: "0 0 0.75rem 1.25rem", lineHeight: 1.7 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ marginBottom: "0.25rem" }}>{children}</li>
    ),
    h1: ({ children }) => (
      <h1 style={{ margin: "0 0 0.75rem 0", fontSize: "1.5rem" }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ margin: "0 0 0.75rem 0", fontSize: "1.3rem" }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1.15rem" }}>
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: "0 0 0.75rem 0",
          padding: "0.75rem 1rem",
          borderLeft: "4px solid #ccc",
          backgroundColor: "#f8f9fa",
          color: "#555",
        }}
      >
        {children}
      </blockquote>
    ),
    code: ({ inline, children }) =>
      inline ? (
        <code
          style={{
            backgroundColor: "#f1f3f5",
            padding: "0.15rem 0.35rem",
            borderRadius: "4px",
            fontSize: "0.9em",
          }}
        >
          {children}
        </code>
      ) : (
        <pre
          style={{
            backgroundColor: "#f8f9fa",
            padding: "1rem",
            borderRadius: "8px",
            overflowX: "auto",
            marginBottom: "0.75rem",
          }}
        >
          <code>{children}</code>
        </pre>
      ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{ color: "var(--primary-color)" }}
      >
        {children}
      </a>
    ),
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
              placeholder={
                "# 제목\n\n- 목록 1\n- 목록 2\n\n**굵게** 또는 `코드`도 가능합니다."
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "4px",
                border: "1px solid #ddd",
                minHeight: "180px",
                resize: "vertical",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                lineHeight: 1.6,
              }}
            />
            <p
              style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}
            >
              Markdown 문법을 사용할 수 있습니다. 예: 제목(#), 목록(-),
              굵게(**텍스트**), 링크([이름](주소))
            </p>
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
            {notices.map((notice) => {
              const expanded = !!expandedNotices[notice.id];
              const longNotice = isLongNotice(notice.content);
              const visibleContent =
                longNotice && !expanded
                  ? getPreviewContent(notice.content)
                  : notice.content;

              return (
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
                            padding: "0.75rem",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                            minHeight: "180px",
                            resize: "vertical",
                            fontFamily:
                              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                            lineHeight: 1.6,
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
                      <h4 style={{ margin: "0 0 0.75rem 0" }}>
                        {notice.title}
                      </h4>

                      <div
                        style={{
                          color: "#444",
                          fontSize: "0.95rem",
                          marginBottom: "0.75rem",
                          overflow: "hidden",
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {visibleContent}
                        </ReactMarkdown>
                      </div>

                      {longNotice && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(notice.id)}
                          style={{
                            marginBottom: "1rem",
                            padding: "0.45rem 0.8rem",
                            backgroundColor: "#f1f3f5",
                            color: "#333",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          {expanded ? "접기" : "자세히 보기"}
                        </button>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <p
                          style={{
                            color: "#666",
                            fontSize: "0.9rem",
                            margin: 0,
                          }}
                        >
                          작성일:{" "}
                          {notice.createdAt
                            ? new Date(
                                notice.createdAt.toDate(),
                              ).toLocaleString()
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoticeList;
