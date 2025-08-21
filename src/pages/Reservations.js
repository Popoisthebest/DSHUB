import React, { useState, useEffect } from "react";
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

function Reservations() {
  const [reservations, setReservations] = useState({}); // 날짜별로 그룹화된 예약을 저장
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null); // 선택된 예약을 저장
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 가시성 상태
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const start = new Date(today);
    // 이번 주 월요일로 설정 (일요일인 경우 6일 전, 다른 요일은 해당 요일의 인덱스만큼 이전)
    start.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    start.setHours(0, 0, 0, 0); // 시간 초기화
    return start;
  });
  const location = useLocation();
  const message = location.state?.message;
  const messageType = location.state?.type;

  useEffect(() => {
    loadReservations();
  }, [currentWeekStart]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError("");

      const startOfWeekStr = formatDateToYYYYMMDD(currentWeekStart);
      const endOfWeek = new Date(currentWeekStart);
      endOfWeek.setDate(currentWeekStart.getDate() + 4); // 월요일부터 금요일까지 5일
      const endOfWeekStr = formatDateToYYYYMMDD(endOfWeek);

      const data = await getAllReservations(startOfWeekStr, endOfWeekStr);

      const groupedReservations = data.reduce((acc, reservation) => {
        const dateKey = reservation.date; // YYYY-MM-DD 형식
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(reservation);
        return acc;
      }, {});
      setReservations(groupedReservations);
    } catch (error) {
      setError("예약 목록을 불러오는 중 오류가 발생했습니다.");
      console.error("예약 목록 로딩 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    let currentDay = new Date(currentWeekStart);
    for (let i = 0; i < 5; i++) {
      // 월요일부터 금요일까지 5일
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  };

  const getWeekRangeString = () => {
    const startOfWeek = new Date(currentWeekStart);
    const endOfWeek = new Date(currentWeekStart);
    endOfWeek.setDate(currentWeekStart.getDate() + 4); // 월요일부터 금요일까지 5일
    return `
      ${formatDate(startOfWeek)} 
      - 
      ${formatDate(endOfWeek)}
    `;
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

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>전체 예약 현황 (주중)</h2>
        {message && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              backgroundColor: messageType === "success" ? "#e6ffe6" : "#fee",
              color: messageType === "success" ? "#0a0" : "#c00",
              borderRadius: "4px",
            }}
          >
            {message}
          </div>
        )}
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
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={goToPreviousWeek}
            style={{
              background: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            이전 주
          </button>
          <h3 style={{ margin: "0", color: "var(--primary-color)" }}>
            {getWeekRangeString()}
          </h3>
          <button
            onClick={goToNextWeek}
            style={{
              background: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            다음 주
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>로딩 중...</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "10px",
            }}
          >
            {getWeekDays().map((date) => {
              const dateKey = formatDateToYYYYMMDD(date);
              const dailyReservations = reservations[dateKey] || [];
              return (
                <div
                  key={dateKey}
                  style={{
                    border: `1px solid ${
                      isToday(date)
                        ? "var(--primary-color)"
                        : "var(--border-color)"
                    }`,
                    borderRadius: "8px",
                    padding: "1rem",
                    backgroundColor: isToday(date) ? "#e6f7ff" : "#f9f9f9",
                    minHeight: "150px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 0.5rem 0",
                      textAlign: "center",
                      color: isToday(date)
                        ? "var(--primary-color)"
                        : "var(--text-color)",
                    }}
                  >
                    {getDayName(date)} ({date.getMonth() + 1}/{date.getDate()})
                  </h4>
                  {dailyReservations.length === 0 ? (
                    <div style={{ color: "var(--text-color-light)" }}>
                      예약 없음
                    </div>
                  ) : (
                    <div style={{ flexGrow: 1, overflowY: "auto" }}>
                      {dailyReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          onClick={() => openModal(reservation)}
                          style={{
                            backgroundColor:
                              reservation.status === "active"
                                ? "#e8f5e9"
                                : "#ffebee",
                            padding: "0.5rem",
                            borderRadius: "4px",
                            marginBottom: "0.5rem",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: "500" }}>
                            {reservation.time === "lunch"
                              ? "점심시간"
                              : reservation.time === "cip1"
                              ? "CIP1"
                              : reservation.time === "cip2"
                              ? "CIP2"
                              : reservation.time === "cip3"
                              ? "CIP3"
                              : reservation.timeRange}
                          </p>
                          <p
                            style={{
                              margin: "0.2rem 0",
                              fontSize: "0.9rem",
                              color: "var(--text-color)",
                            }}
                          >
                            장소: {reservation.roomName}
                          </p>
                          <p
                            style={{
                              color: "var(--text-color)",
                              marginBottom: "0.5rem",
                            }}
                          >
                            예약자:{" "}
                            {reservation.studentId === "admin"
                              ? "관리자"
                              : maskName(reservation.studentName)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && selectedReservation && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "var(--shadow)",
              maxWidth: "500px",
              width: "90%",
              position: "relative",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--text-color-light)",
              }}
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
                <strong>예약자:</strong>{" "}
                {selectedReservation.studentId === "admin"
                  ? "관리자"
                  : maskName(selectedReservation.studentName)}
              </p>
              <p>
                <strong>장소:</strong> {selectedReservation.roomName}
              </p>
              <p>
                <strong>날짜:</strong> {selectedReservation.date}
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

export default Reservations;
