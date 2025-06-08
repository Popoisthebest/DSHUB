import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
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
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek); // 이번 주 일요일로 설정
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
      endOfWeek.setDate(currentWeekStart.getDate() + 6);
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
    for (let i = 0; i < 7; i++) {
      const dayOfWeek = currentDay.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // 일요일(0)과 토요일(6) 제외
        days.push(new Date(currentDay));
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return days;
  };

  const getWeekRangeString = () => {
    const startOfWeek = new Date(currentWeekStart);
    const endOfWeek = new Date(currentWeekStart);
    endOfWeek.setDate(currentWeekStart.getDate() + 6);
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
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ margin: "0", color: "var(--primary-color)" }}>
            {getWeekRangeString()}
          </h3>
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
                      marginBottom: "0.5rem",
                      color: isToday(date)
                        ? "var(--primary-color)"
                        : "var(--text-color)",
                    }}
                  >
                    {date.getDate()} {getDayName(date)}
                  </h4>
                  <div style={{ flexGrow: 1, overflowY: "auto" }}>
                    {dailyReservations.length === 0 ? (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-color-light)",
                        }}
                      >
                        예약 없음
                      </p>
                    ) : (
                      dailyReservations.map((res) => (
                        <div
                          key={res.id}
                          onClick={() => openModal(res)}
                          style={{
                            marginBottom: "0.5rem",
                            padding: "0.5rem",
                            backgroundColor: "white",
                            borderRadius: "4px",
                            boxShadow: "var(--shadow-light)",
                            cursor: "pointer",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: "500",
                              marginBottom: "0.2rem",
                            }}
                          >
                            {res.time === "lunch"
                              ? "점심시간"
                              : res.time === "cip1"
                              ? "CIP1"
                              : res.time === "cip2"
                              ? "CIP2"
                              : res.time === "cip3"
                              ? "CIP3"
                              : res.timeRange}
                          </p>
                          <p
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-color)",
                            }}
                          >
                            {res.room} ({maskName(res.studentName)})
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && selectedReservation && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h3 style={{ marginBottom: "1rem", color: "var(--primary-color)" }}>
              예약 상세 정보
            </h3>
            <p>
              <strong>장소:</strong> {selectedReservation.wing} -{" "}
              {selectedReservation.floor} - {selectedReservation.room}
            </p>
            <p>
              <strong>날짜:</strong>{" "}
              {formatDate(new Date(selectedReservation.date))}
            </p>
            <p>
              <strong>시간:</strong> {selectedReservation.timeRange}
            </p>
            <p>
              <strong>예약자:</strong>{" "}
              {maskName(selectedReservation.studentName)}
            </p>
            {selectedReservation.club && (
              <p>
                <strong>동아리:</strong> {selectedReservation.club}
              </p>
            )}
            <p>
              <strong>이용 사유:</strong> {selectedReservation.reason}
            </p>
            <p>
              <strong>예약일시:</strong>{" "}
              {new Date(
                selectedReservation.createdAt.toDate()
              ).toLocaleString()}
            </p>
            <button onClick={closeModal} style={closeButtonStyle}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 모달 스타일 정의
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
};

const modalContentStyle = {
  backgroundColor: "white",
  padding: "2rem",
  borderRadius: "8px",
  boxShadow: "var(--shadow-lg)",
  maxWidth: "500px",
  width: "90%",
  zIndex: 1001,
  position: "relative",
};

const closeButtonStyle = {
  position: "absolute",
  top: "1rem",
  right: "1rem",
  backgroundColor: "transparent",
  border: "none",
  fontSize: "1.5rem",
  cursor: "pointer",
  color: "var(--text-color-light)",
};

export default Reservations;
