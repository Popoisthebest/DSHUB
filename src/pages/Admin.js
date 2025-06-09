import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  listenToAllReservations,
  deleteReservation,
  createNotice,
  deleteNotice,
  getAllNotices,
} from "../firebase/db";
import { formatDateToYYYYMMDD, formatDate } from "../utils/dateUtils";
import "../styles/common.css";

function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, cancelled
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [notices, setNotices] = useState([]);
  const [newNotice, setNewNotice] = useState({ title: "", content: "" });

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate("/");
      return;
    }

    // 실시간 리스너 설정
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
        // 날짜별로 예약 데이터 그룹화
        const groupedData = reservationsData.reduce((acc, reservation) => {
          const dateKey = reservation.date;
          if (!acc[dateKey]) {
            acc[dateKey] = [];
          }
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

    // 공지사항 로드
    const loadNotices = async () => {
      try {
        const noticesData = await getAllNotices();
        setNotices(noticesData);
      } catch (error) {
        console.error("공지사항 로딩 오류:", error);
      }
    };

    loadNotices();

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe();
  }, [user, currentDate, filterStatus]);

  const handleOpenDetailModal = (reservation) => {
    setSelectedReservation(reservation);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedReservation(null);
    setIsDetailModalOpen(false);
  };

  const getStartOfWeek = () => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getEndOfWeek = () => {
    const date = new Date(currentDate);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(date.setDate(diff));
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

  const handleAddNotice = async () => {
    if (!newNotice.title || !newNotice.content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    try {
      await createNotice(newNotice);
      setNewNotice({ title: "", content: "" });
      const noticesData = await getAllNotices();
      setNotices(noticesData);
    } catch (error) {
      console.error("공지사항 추가 오류:", error);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm("이 공지사항을 삭제하시겠습니까?")) {
      try {
        await deleteNotice(noticeId);
        const noticesData = await getAllNotices();
        setNotices(noticesData);
      } catch (error) {
        console.error("공지사항 삭제 오류:", error);
      }
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    // 요일 헤더
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

    // 날짜 그리드
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
                    }}
                  >
                    <div style={{ fontWeight: "500" }}>
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
                      {reservation.studentName} ({reservation.studentId})
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

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>관리자 페이지</h2>
      </div>

      {/* 공지사항 관리 섹션 */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem", color: "var(--primary-color)" }}>
          공지사항 관리
        </h3>
        <div style={{ marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="제목"
            value={newNotice.title}
            onChange={(e) =>
              setNewNotice({ ...newNotice, title: e.target.value })
            }
            style={{ marginBottom: "0.5rem", padding: "0.5rem", width: "100%" }}
          />
          <textarea
            placeholder="내용"
            value={newNotice.content}
            onChange={(e) =>
              setNewNotice({ ...newNotice, content: e.target.value })
            }
            style={{
              marginBottom: "0.5rem",
              padding: "0.5rem",
              width: "100%",
              height: "100px",
            }}
          />
          <button
            onClick={handleAddNotice}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--primary-color)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            공지사항 추가
          </button>
        </div>
        <div style={{ display: "grid", gap: "1rem" }}>
          {notices.map((notice) => (
            <div
              key={notice.id}
              style={{
                padding: "1rem",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
              }}
            >
              <h4 style={{ margin: "0 0 0.5rem 0" }}>{notice.title}</h4>
              <p style={{ margin: "0", color: "var(--text-color-light)" }}>
                {notice.content}
              </p>
              <button
                onClick={() => handleDeleteNotice(notice.id)}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.25rem 0.5rem",
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

      {/* 예약 관리 섹션 */}
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem", color: "var(--primary-color)" }}>
          예약 관리
        </h3>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              이전 달
            </button>
            <h4 style={{ margin: 0 }}>
              {currentDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
              })}
            </h4>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              다음 달
            </button>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "0.5rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
            }}
          >
            <option value="all">전체 예약</option>
            <option value="active">활성 예약</option>
            <option value="cancelled">취소된 예약</option>
          </select>
        </div>

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

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            예약 목록 로딩 중...
          </div>
        ) : reservations.length === 0 &&
          Object.keys(reservations).every(
            (key) => reservations[key].length === 0
          ) ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            해당 달의 예약이 없습니다.
          </div>
        ) : (
          renderCalendar()
        )}
      </div>

      {isDetailModalOpen && selectedReservation && (
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
            zIndex: 2000,
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
              onClick={handleCloseDetailModal}
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
                <strong>예약자:</strong> {selectedReservation.studentName} (
                {selectedReservation.studentId})
              </p>
              <p>
                <strong>장소:</strong> {selectedReservation.wing} -{" "}
                {selectedReservation.floor} - {selectedReservation.room}
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
              <p>
                <strong>이용 사유:</strong> {selectedReservation.reason}
              </p>
              <p>
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
              <div style={{ textAlign: "right", marginTop: "2rem" }}>
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
                    transition: "background-color 0.3s ease",
                    ":hover": { backgroundColor: "#c82333" },
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

export default Admin;
