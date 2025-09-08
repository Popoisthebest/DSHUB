// Reservations.js
import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { getAllReservations } from "../firebase/db";
import { formatDateToYYYYMMDD, formatDate } from "../utils/dateUtils";
import "../styles/common.css";

const maskName = (name) => {
  if (!name) return "";
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  const firstChar = name[0];
  const lastChar = name[name.length - 1];
  const middleMask = "*".repeat(name.length - 2);
  return firstChar + middleMask + lastChar;
};

const TIME_LABEL = (r) => {
  if (r.time === "lunch") return "점심시간";
  if (r.time === "cip1") return "CIP1";
  if (r.time === "cip2") return "CIP2";
  if (r.time === "cip3") return "CIP3";
  return r.timeRange || "기타";
};

function Reservations() {
  const [reservations, setReservations] = useState({}); // 날짜별 그룹
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 주 시작(월요일)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun ... 6=Sat
    const start = new Date(today);
    start.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    start.setHours(0, 0, 0, 0);

    // 토(6) 또는 일(0) → 다음 주 월요일
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      start.setDate(start.getDate() + 7);
    }
    return start;
  });

  // 탭: 선택된 날짜
  const [activeDateKey, setActiveDateKey] = useState("");

  const location = useLocation();
  const message = location.state?.message;
  const messageType = location.state?.type;

  useEffect(() => {
    loadReservations();
  }, [currentWeekStart]);

  // 모달 열렸을 때: 배경 스크롤/터치 차단 + ESC 닫기
  useEffect(() => {
    if (!isModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isModalOpen]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const startOfWeekStr = formatDateToYYYYMMDD(currentWeekStart);
      const endOfWeek = new Date(currentWeekStart);
      endOfWeek.setDate(currentWeekStart.getDate() + 4); // 월~금
      const endOfWeekStr = formatDateToYYYYMMDD(endOfWeek);

      const data = await getAllReservations(startOfWeekStr, endOfWeekStr);

      const grouped = data.reduce((acc, r) => {
        const dateKey = r.date; // YYYY-MM-DD
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(r);
        return acc;
      }, {});
      setReservations(grouped);

      // 기본 활성 탭: 오늘이 이번 주에 있으면 오늘, 아니면 월요일
      const weekDays = getWeekDays(currentWeekStart);
      const todayKey = formatDateToYYYYMMDD(new Date());
      const keys = weekDays.map((d) => formatDateToYYYYMMDD(d));
      if (keys.includes(todayKey)) {
        setActiveDateKey(todayKey);
      } else {
        setActiveDateKey(keys[0]);
      }
    } catch (error) {
      setError("예약 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("예약 목록 로딩 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = (start) => {
    const days = [];
    let currentDay = new Date(start);
    for (let i = 0; i < 5; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  };

  const getWeekRangeString = () => {
    const startOfWeek = new Date(currentWeekStart);
    const endOfWeek = new Date(currentWeekStart);
    endOfWeek.setDate(currentWeekStart.getDate() + 4); // 월~금
    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
  };

  const getDayName = (date) => {
    const options = { weekday: "short" };
    return date.toLocaleDateString("ko-KR", options);
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const openModal = (reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setSelectedReservation(null);
    setIsModalOpen(false);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 7);
      return newDate;
    });
  };
  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 7);
      return newDate;
    });
  };

  // 탭에 쓸 주간 날짜/키
  const weekDays = useMemo(
    () => getWeekDays(currentWeekStart),
    [currentWeekStart]
  );
  const weekKeys = useMemo(
    () => weekDays.map((d) => formatDateToYYYYMMDD(d)),
    [weekDays]
  );

  // 아코디언: 시간대별 그룹
  const groupedByTime = useMemo(() => {
    const list = reservations[activeDateKey] || [];
    // 정렬(시간대 우선순위: lunch, cip1, cip2, cip3, 기타)
    const order = { lunch: 1, cip1: 2, cip2: 3, cip3: 4 };
    const sorted = [...list].sort((a, b) => {
      const oa = order[a.time] || 99;
      const ob = order[b.time] || 99;
      if (oa !== ob) return oa - ob;
      // 같은 시간대면 roomName, studentName으로 보조 정렬
      const rn = (a.roomName || "").localeCompare(b.roomName || "");
      if (rn !== 0) return rn;
      return (a.studentName || "").localeCompare(b.studentName || "");
    });

    return sorted.reduce((acc, r) => {
      const key = TIME_LABEL(r);
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {});
  }, [reservations, activeDateKey]);

  // 아코디언 오픈 상태
  const [openPanels, setOpenPanels] = useState({});
  useEffect(() => {
    // 탭 바뀔 때, 해당 탭의 모든 패널 기본 오픈(선호에 따라 닫힘으로 바꿔도 OK)
    const initial = {};
    Object.keys(groupedByTime).forEach((k) => (initial[k] = true));
    setOpenPanels(initial);
  }, [activeDateKey, JSON.stringify(groupedByTime)]);

  const togglePanel = (key) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const badgeCount = (dateKey) => reservations[dateKey]?.length || 0;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ marginBottom: "0.75rem" }}>전체 예약 현황 (주중)</h2>
        {message && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "0.75rem",
              backgroundColor: messageType === "success" ? "#e6ffe6" : "#fee",
              color: messageType === "success" ? "#0a0" : "#c00",
              borderRadius: "6px",
            }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "0.75rem",
              backgroundColor: "#fee",
              color: "#c00",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "1.25rem",
          borderRadius: "10px",
          boxShadow: "var(--shadow)",
        }}
      >
        {/* 주간 내비게이션 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <button onClick={goToPreviousWeek} style={navBtnStyle}>
            이전 주
          </button>
          <h3 style={{ margin: 0, color: "var(--primary-color)" }}>
            {getWeekRangeString()}
          </h3>
          <button onClick={goToNextWeek} style={navBtnStyle}>
            다음 주
          </button>
        </div>

        {/* 요일 탭 */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "1rem",
          }}
        >
          {weekDays.map((date, idx) => {
            const key = weekKeys[idx];
            const active = key === activeDateKey;
            const todayMark = isToday(date);
            return (
              <button
                key={key}
                onClick={() => setActiveDateKey(key)}
                style={{
                  whiteSpace: "nowrap",
                  padding: "0.6rem 0.9rem",
                  borderRadius: "999px",
                  border: active
                    ? "1px solid var(--primary-color)"
                    : "1px solid var(--border-color)",
                  background: active ? "var(--primary-color)" : "#fff",
                  color: active
                    ? "#fff"
                    : todayMark
                    ? "var(--primary-color)"
                    : "var(--text-color)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
                aria-pressed={active}
              >
                {getDayName(date)}{" "}
                {`(${date.getMonth() + 1}/${date.getDate()})`}
                <span
                  style={{
                    display: "inline-block",
                    minWidth: "1.5rem",
                    textAlign: "center",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "999px",
                    background: active ? "rgba(255,255,255,0.25)" : "#f1f3f5",
                    color: active ? "#fff" : "#555",
                    fontSize: "0.85rem",
                  }}
                  aria-label="예약 수"
                >
                  {badgeCount(key)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 선택된 날짜의 아코디언(시간대별) */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>로딩 중...</div>
        ) : (
          <div>
            {Object.keys(groupedByTime).length === 0 ? (
              <div
                style={{ color: "var(--text-color-light)", padding: "1rem" }}
              >
                예약 없음
              </div>
            ) : (
              Object.entries(groupedByTime).map(([panelKey, items]) => (
                <div key={panelKey} style={accordionSectionStyle}>
                  <button
                    onClick={() => togglePanel(panelKey)}
                    style={{
                      ...accordionHeaderStyle,
                      background: openPanels[panelKey] ? "#f6f9ff" : "#fff",
                      borderColor: openPanels[panelKey]
                        ? "var(--primary-color)"
                        : "var(--border-color)",
                    }}
                    aria-expanded={!!openPanels[panelKey]}
                  >
                    <span style={{ color: "#000", fontWeight: 600 }}>
                      {panelKey}
                    </span>
                    <span style={badgeStyle}>{items.length}</span>
                  </button>

                  {openPanels[panelKey] && (
                    <div style={accordionBodyStyle}>
                      {items.map((reservation) => (
                        <div
                          key={reservation.id}
                          onClick={() => openModal(reservation)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) =>
                            e.key === "Enter" && openModal(reservation)
                          }
                          style={{
                            ...cardStyle,
                            backgroundColor:
                              reservation.status === "active"
                                ? "#e8f5e9"
                                : "#ffebee",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.75rem",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{ fontSize: "0.95rem", fontWeight: 600 }}
                              >
                                {reservation.roomName}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  color: "var(--text-color)",
                                }}
                              >
                                예약자: {maskName(reservation.studentName)}
                              </div>
                              {reservation.club && (
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#6b7280",
                                  }}
                                >
                                  동아리: {reservation.club}
                                </div>
                              )}
                            </div>
                            <div
                              style={{ textAlign: "right", minWidth: "90px" }}
                            >
                              <div style={statusPill(reservation.status)}>
                                {reservation.status === "active"
                                  ? "확정"
                                  : "취소"}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.8rem",
                                  color: "#6b7280",
                                  marginTop: "0.35rem",
                                }}
                              >
                                {reservation.timeRange && panelKey === "기타"
                                  ? reservation.timeRange
                                  : ""}
                              </div>
                            </div>
                          </div>
                          {reservation.reason && (
                            <div
                              style={{
                                marginTop: "0.4rem",
                                fontSize: "0.88rem",
                                color: "#374151",
                              }}
                            >
                              사유:{" "}
                              {reservation.reason.length > 60
                                ? reservation.reason.slice(0, 60) + "…"
                                : reservation.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 모달 */}
      {isModalOpen && selectedReservation && (
        <div
          style={modalOverlayStyle}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label="예약 상세 정보"
          tabIndex={-1}
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <button
              onClick={closeModal}
              style={modalCloseButtonStyle}
              aria-label="닫기"
            >
              &times;
            </button>
            <h3
              style={{ marginBottom: "1.2rem", color: "var(--primary-color)" }}
            >
              예약 상세 정보
            </h3>
            <div style={{ lineHeight: "1.8" }}>
              <p>
                <strong>예약자:</strong>{" "}
                {maskName(selectedReservation.studentName)}
              </p>
              <p>
                <strong>지도교사:</strong>{" "}
                {selectedReservation.teacherName || "미입력"}
              </p>
              <p>
                <strong>장소:</strong> {selectedReservation.roomName}
              </p>
              <p>
                <strong>날짜:</strong> {selectedReservation.date}
              </p>
              <p>
                <strong>시간:</strong> {TIME_LABEL(selectedReservation)}
              </p>
              {selectedReservation.club && (
                <p>
                  <strong>동아리:</strong> {selectedReservation.club}
                </p>
              )}
              <p>
                <strong>이용 사유:</strong> {selectedReservation.reason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 스타일 ===== */
const navBtnStyle = {
  background: "var(--primary-color)",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "0.5rem 1rem",
  cursor: "pointer",
  fontSize: "1rem",
};

const accordionSectionStyle = {
  border: "1px solid var(--border-color)",
  borderRadius: "10px",
  marginBottom: "0.75rem",
};

const accordionHeaderStyle = {
  width: "100%",
  textAlign: "left",
  padding: "0.9rem 1rem",
  cursor: "pointer",
  borderBottom: "1px solid var(--border-color)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  fontSize: "1rem",
  background: "#fff",
  border: "1px solid var(--border-color)",
};

const badgeStyle = {
  display: "inline-block",
  minWidth: "1.5rem",
  textAlign: "center",
  padding: "0.15rem 0.45rem",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#4f46e5",
  fontSize: "0.85rem",
  fontWeight: 600,
};

const accordionBodyStyle = {
  padding: "0.75rem",
  background: "#fafafa",
};

const cardStyle = {
  padding: "0.75rem",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  marginBottom: "0.6rem",
  cursor: "pointer",
  boxShadow: "var(--shadow-xs)",
};

const statusPill = (status) => ({
  display: "inline-block",
  padding: "0.2rem 0.55rem",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 700,
  background: status === "active" ? "#d1fae5" : "#fee2e2",
  color: status === "active" ? "#065f46" : "#991b1b",
});

/* ===== 모달 ===== */
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  overscrollBehavior: "contain",
  touchAction: "none",
};

const modalContentStyle = {
  backgroundColor: "white",
  padding: "2rem",
  borderRadius: "8px",
  boxShadow: "var(--shadow-lg)",
  maxWidth: "500px",
  width: "90%",
  maxHeight: "90%",
  overflow: "auto",
  position: "relative",
  zIndex: 1001,
  WebkitOverflowScrolling: "touch",
};

const modalCloseButtonStyle = {
  position: "absolute",
  top: "1rem",
  right: "1rem",
  background: "none",
  border: "none",
  fontSize: "1.5rem",
  cursor: "pointer",
  color: "var(--text-color-light)",
};

export default Reservations;
