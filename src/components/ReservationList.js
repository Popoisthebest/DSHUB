// ReservationList.js
import React, { useState, useEffect } from "react";
import { formatDateToYYYYMMDD, formatDate } from "../utils/dateUtils";
import { listenToAllReservations, deleteReservation } from "../firebase/db";

function ReservationList() {
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState("all");

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // ▼ 모달 내 "참여자 목록" 토글
  const [isMembersOpen, setIsMembersOpen] = useState(false);

  // ▼ 인원수/명단 유틸
  const getGroupSize = (res) =>
    Number(res?.groupSize) ||
    1 + (Array.isArray(res?.participants) ? res.participants.length : 0);

  const getMemberList = (res) => {
    const owner = {
      studentId: res?.studentId || "",
      name: res?.studentName || "",
      role: "owner",
    };
    const members = Array.isArray(res?.participants)
      ? res.participants.map((p) => ({ ...p, role: "member" }))
      : [];
    return [owner, ...members];
  };

  // 🔒 모달 열릴 때 배경 스크롤/터치 차단 + ESC로 닫기
  useEffect(() => {
    if (!isDetailModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKeyDown = (e) => {
      if (e.key === "Escape") handleCloseDetailModal();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isDetailModalOpen]);

  useEffect(() => {
    const startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const startOfWeekStr = formatDateToYYYYMMDD(startDate);
    const endOfWeekStr = formatDateToYYYYMMDD(endDate);

    const unsubscribe = listenToAllReservations(
      (reservationsData) => {
        const groupedData = reservationsData.reduce((acc, reservation) => {
          const dateKey = reservation.date;
          if (!acc[dateKey]) acc[dateKey] = [];
          if (filterStatus === "all" || reservation.status === filterStatus) {
            acc[dateKey].push(reservation);
          }
          return acc;
        }, {});
        setReservations(groupedData);
        setLoading(false);
      },
      startOfWeekStr,
      endOfWeekStr
    );

    return () => unsubscribe();
  }, [currentDate, filterStatus]);

  const handleOpenDetailModal = (reservation) => {
    setSelectedReservation(reservation);
    setIsMembersOpen(false);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedReservation(null);
    setIsDetailModalOpen(false);
    setIsMembersOpen(false);
  };

  const handleCancel = async (reservationId) => {
    if (window.confirm("이 예약을 취소하시겠습니까?")) {
      try {
        await deleteReservation(reservationId);
        handleCloseDetailModal();
      } catch (error) {
        setError("예약 취소 중 오류가 발생했습니다.");
        console.error("예약 취소 오류:", error);
      }
    }
  };

  const getDaysInMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    const weekdayHeader = (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        {weekdays.map((day, index) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontWeight: "500",
              color:
                index === 0
                  ? "#dc3545"
                  : index === 6
                  ? "#0d6efd"
                  : "var(--text-color)",
              padding: "0.5rem",
            }}
          >
            {day}
          </div>
        ))}
      </div>
    );

    let dayCount = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          week.push(<div key={`empty-${j}`} />);
        } else if (dayCount <= daysInMonth) {
          const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            dayCount
          );
          const dateKey = formatDateToYYYYMMDD(date);
          const dayReservations = reservations[dateKey] || [];

          week.push(
            <div
              key={dayCount}
              style={{
                minHeight: "120px",
                padding: "0.5rem",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                backgroundColor: "white",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  color:
                    j === 0
                      ? "#dc3545"
                      : j === 6
                      ? "#0d6efd"
                      : "var(--text-color)",
                  fontWeight: "500",
                }}
              >
                {dayCount}
              </div>
              <div style={{ marginTop: "2rem" }}>
                {dayReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    onClick={() => handleOpenDetailModal(reservation)}
                    style={{
                      padding: "0.5rem",
                      marginBottom: "0.5rem",
                      backgroundColor:
                        reservation.status === "active" ? "#e8f5e9" : "#ffebee",
                      borderRadius: "4px",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      border: "1px solid transparent",
                      boxShadow: "var(--shadow-small)",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontWeight: "500" }}>
                      {reservation.roomName || reservation.room || "장소 미정"}
                    </div>

                    {/* ▼ 인원 수 배지 */}
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        fontSize: "0.75rem",
                        background: "#eef3ff",
                        color: "#2b4cbf",
                        padding: "2px 6px",
                        borderRadius: 999,
                        border: "1px solid #d8e1ff",
                      }}
                      title="참여 인원 수"
                    >
                      {getGroupSize(reservation)}명
                    </div>

                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-color-light)",
                      }}
                    >
                      {reservation.room}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-color-light)",
                      }}
                    >
                      {reservation.time === "lunch"
                        ? "점심시간"
                        : reservation.time === "cip1"
                        ? "CIP1"
                        : reservation.time === "cip2"
                        ? "CIP2"
                        : reservation.time === "cip3"
                        ? "CIP3"
                        : reservation.timeRange}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          dayCount++;
        } else {
          week.push(<div key={`empty-end-${j}`} />);
        }
      }
      days.push(
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "0.5rem",
          }}
        >
          {week}
        </div>
      );
    }

    return (
      <div>
        {weekdayHeader}
        {days}
      </div>
    );
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>예약 관리</h2>

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

      {/* ... 상단 컨트롤 / 달력 렌더링 ... */}
      {Object.keys(reservations).length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          해당 달의 예약이 없습니다.
        </div>
      ) : (
        renderCalendar()
      )}

      {/* === 모달 === */}
      {isDetailModalOpen && selectedReservation && (
        <div
          style={modalOverlayStyle}
          onClick={handleCloseDetailModal} // 오버레이 클릭 시 닫기
          role="dialog"
          aria-modal="true"
          aria-label="예약 상세 정보"
          tabIndex={-1}
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()} // 콘텐츠 클릭은 전파 막기
            role="document"
          >
            <button
              onClick={handleCloseDetailModal}
              style={modalCloseButtonStyle}
              aria-label="닫기"
            >
              &times;
            </button>
            <h3
              style={{
                marginBottom: "1.5rem",
                color: "var(--primary-color)",
              }}
            >
              예약 상세 정보
            </h3>
            <div style={{ lineHeight: "1.8" }}>
              <p>
                <strong>예약자:</strong> {selectedReservation.studentName} (
                {selectedReservation.studentId})
              </p>
              <p>
                <strong>지도교사:</strong>{" "}
                {selectedReservation.teacherName || "미입력"}
              </p>
              <p>
                <strong>장소:</strong> {selectedReservation.wing} -{" "}
                {selectedReservation.floor} - {selectedReservation.roomName}
              </p>
              <p>
                <strong>날짜:</strong>{" "}
                {formatDate(new Date(selectedReservation.date))}
              </p>
              <p>
                <strong>시간:</strong>{" "}
                {selectedReservation.time === "lunch"
                  ? "점심시간"
                  : selectedReservation.time === "cip1"
                  ? "CIP1"
                  : selectedReservation.time === "cip2"
                  ? "CIP2"
                  : selectedReservation.time === "cip3"
                  ? "CIP3"
                  : selectedReservation.timeRange}
              </p>

              {/* ▼ 참여 인원/명단 토글 */}
              <div
                style={{
                  marginTop: "1rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-color)",
                }}
              >
                <p style={{ marginBottom: "0.5rem" }}>
                  <strong>참여 인원:</strong>{" "}
                  {getGroupSize(selectedReservation)}명
                </p>
                <button
                  onClick={() => setIsMembersOpen((v) => !v)}
                  style={{
                    color: "black",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "4px",
                    border: "1px solid var(--border-color)",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {isMembersOpen ? "참여자 목록 접기" : "참여자 목록 보기"}
                </button>

                {isMembersOpen && (
                  <ul
                    style={{
                      marginTop: "0.75rem",
                      background: "#fafafa",
                      border: "1px solid #eee",
                      borderRadius: 6,
                      padding: "0.75rem 0.9rem",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {getMemberList(selectedReservation).map((m, idx) => (
                      <li
                        key={`${m.studentId}-${idx}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.25rem 0",
                          borderBottom:
                            idx ===
                            getMemberList(selectedReservation).length - 1
                              ? "none"
                              : "1px dashed #eee",
                          fontSize: "0.95rem",
                        }}
                      >
                        <span>
                          {m.name} ({m.studentId})
                        </span>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: m.role === "owner" ? "#2e7d32" : "#666",
                          }}
                        >
                          {m.role === "owner" ? "예약자" : "참여자"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p style={{ marginTop: "0.75rem" }}>
                <strong>상태:</strong>{" "}
                <span
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor:
                      selectedReservation.status === "active"
                        ? "#e8f5e9"
                        : "#ffebee",
                    color:
                      selectedReservation.status === "active"
                        ? "#2e7d32"
                        : "#c62828",
                  }}
                >
                  {selectedReservation.status === "active" ? "활성" : "취소됨"}
                </span>
              </p>
            </div>

            {selectedReservation.status === "active" && (
              <div style={{ textAlign: "right", marginTop: "1.5rem" }}>
                <button
                  onClick={() => handleCancel(selectedReservation.id)}
                  style={{
                    padding: "0.7rem 1.5rem",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "500",
                  }}
                >
                  예약 취소
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 모달 스타일 공통 ===== */
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
  zIndex: 2000,
  // 배경 스크롤/바운스 방지
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
  zIndex: 2001,
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

export default ReservationList;
