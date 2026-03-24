import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { getAllNotices } from "../firebase/db";
import "../styles/common.css";

const NOTICE_PREVIEW_LENGTH = 140;

function Home() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [expandedNotices, setExpandedNotices] = useState({});

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const noticesData = await getAllNotices();
        setNotices(noticesData);
      } catch (error) {
        console.error("공지사항 로딩 오류:", error);
      }
    };
    fetchNotices();
  }, []);

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
      <p style={{ margin: "0 0 0.6rem 0", lineHeight: 1.65 }}>{children}</p>
    ),
    ul: ({ children }) => (
      <ul style={{ margin: "0 0 0.6rem 1.2rem", lineHeight: 1.65 }}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol style={{ margin: "0 0 0.6rem 1.2rem", lineHeight: 1.65 }}>
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ marginBottom: "0.2rem" }}>{children}</li>
    ),
    h1: ({ children }) => (
      <h1 style={{ margin: "0 0 0.6rem 0", fontSize: "1.25rem" }}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ margin: "0 0 0.6rem 0", fontSize: "1.15rem" }}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ margin: "0 0 0.6rem 0", fontSize: "1.05rem" }}>
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote
        style={{
          margin: "0 0 0.6rem 0",
          padding: "0.6rem 0.9rem",
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
            padding: "0.12rem 0.3rem",
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
            padding: "0.9rem",
            borderRadius: "8px",
            overflowX: "auto",
            marginBottom: "0.6rem",
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

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* 메인 섹션 */}
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          marginBottom: "3rem",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: "1.5rem",
            color: "var(--secondary-color)",
          }}
        >
          DSHUB
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            marginBottom: "2rem",
            color: "var(--text-color)",
          }}
        >
          활동을 위한 공간 예약 서비스에 오신 것을 환영합니다.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/reserve")}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
          >
            예약하기
          </button>
          <button
            onClick={() => navigate("/reservations")}
            style={{
              padding: "1rem 2rem",
              fontSize: "1.1rem",
              backgroundColor: "white",
              color: "var(--primary-color)",
              border: "1px solid var(--primary-color)",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
          >
            예약 현황 보기
          </button>
        </div>
      </div>

      {/* 경고 박스 */}
      <div
        style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "1rem",
          border: "1px solid #ffeeba",
          borderRadius: "4px",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        ⚠️ 이 사이트는 <strong>가로 화면</strong> 사용을 권장합니다.
      </div>

      {/* 공지사항 섹션 */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "var(--primary-color)" }}>
          공지사항
        </h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          {notices.length > 0 ? (
            notices.map((notice) => {
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
                    padding: "1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.75rem 0" }}>{notice.title}</h3>

                  <div style={{ color: "var(--text-color-light)" }}>
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
                        marginTop: "0.25rem",
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
                </div>
              );
            })
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "1rem",
                color: "var(--text-color-light)",
              }}
            >
              공지사항이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 이용 안내 섹션 */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "var(--primary-color)" }}>
          이용 안내
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
          }}
        >
          <div>
            <h3 style={{ marginBottom: "1rem" }}>예약 방법</h3>
            <ol
              style={{
                paddingLeft: "1.5rem",
                margin: "0",
                color: "var(--text-color)",
              }}
            >
              <li>원하는 날짜와 시간을 선택합니다.</li>
              <li>이용할 공간을 선택합니다.</li>
              <li>이용 사유를 입력합니다.</li>
              <li>예약을 확정합니다.</li>
            </ol>
          </div>
          <div>
            <h3 style={{ marginBottom: "1rem" }}>이용 시간</h3>
            <ul
              style={{
                paddingLeft: "1.5rem",
                margin: "0",
                color: "var(--text-color)",
              }}
            >
              <li>점심시간: 12:40 ~ 13:30</li>
              <li>CIP 1: 16:50 ~ 17:40</li>
              <li>CIP 2: 18:30 ~ 20:00</li>
              <li>CIP 3: 20:10 ~ 21:00</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: "1rem" }}>문의하기</h3>
            <p style={{ margin: "0", color: "var(--text-color)" }}>
              예약 관련 문의사항은 관리자에게 연락해주세요.
            </p>
          </div>
        </div>
      </div>

      {/* 기능 설명 섹션 */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        <h2 style={{ marginBottom: "1.5rem", color: "var(--primary-color)" }}>
          주요 기능
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
          }}
        >
          <div
            onClick={() => navigate("/reserve")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/reserve");
            }}
            style={{
              padding: "1.5rem",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              cursor: "pointer",
              outline: "none",
              transition: "transform 0.06s ease, box-shadow 0.2s ease",
              boxShadow: "none",
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.99)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>
              실시간 예약
            </h3>
            <p style={{ margin: "0", color: "var(--text-color)" }}>
              원하는 시간과 장소를 실시간으로 확인하고 예약할 수 있습니다.
            </p>
            <div style={{ marginTop: "1rem", fontSize: "2rem" }}>🕒</div>
          </div>

          <div
            onClick={() => navigate("/reservations")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") navigate("/reservations");
            }}
            style={{
              padding: "1.5rem",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
              cursor: "pointer",
              outline: "none",
              transition: "transform 0.06s ease, box-shadow 0.2s ease",
              boxShadow: "none",
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.99)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>
              예약 관리
            </h3>
            <p style={{ margin: "0", color: "var(--text-color)" }}>
              예약 현황을 한눈에 확인하고 필요한 경우 취소할 수 있습니다.
            </p>
            <div style={{ marginTop: "1rem", fontSize: "2rem" }}>📋</div>
          </div>

          <div
            style={{
              padding: "1.5rem",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              backgroundColor: "#f8f9fa",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>
              편리한 이용
            </h3>
            <p style={{ margin: "0", color: "var(--text-color)" }}>
              패드에서도 쉽게 이용할 수 있는 반응형 디자인을 제공합니다.
            </p>
            <div style={{ marginTop: "1rem", fontSize: "2rem" }}>📱</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
