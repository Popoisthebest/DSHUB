import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createReservation,
  getAllReservations,
  getReservationsByDate,
} from "../firebase/db";
import "../styles/common.css";
import schoolImage from "../assets/school-image.png"; // 학교 지도 이미지 임포트

// 예약 가능한 장소 목록
const ROOMS = {
  leftWing: {
    name: "LEFT WING",
    floors: [
      {
        floor: "1st FLOOR",
        rooms: [
          { id: "maker1", name: "제1 메이커실", capacity: "20인" },
          { id: "maker2", name: "제2 메이커실", capacity: "20인" },
          {
            id: "woodwork",
            name: "목공실",
            capacity: "15인",
            teacherOnly: true,
          },
          {
            id: "laser",
            name: "레이저실",
            capacity: "15인",
            teacherOnly: true,
          },
        ],
      },
      {
        floor: "2nd FLOOR",
        rooms: [
          { id: "lab", name: "실험실", capacity: "30인", teacherOnly: true },
          { id: "fusion1", name: "제1 융합실", capacity: "30인" },
          { id: "fusion2", name: "제2 융합실", capacity: "30인" },
          { id: "fusion3", name: "제3 융합실", capacity: "30인" },
        ],
      },
      {
        floor: "3rd FLOOR",
        rooms: [
          { id: "ai", name: "AI실", capacity: "30인", disabled: true },
          {
            id: "computer",
            name: "컴퓨터실",
            capacity: "30인",
            disabled: true,
          },
        ],
      },
      {
        floor: "4th FLOOR",
        rooms: [
          {
            id: "media",
            name: "미디어실(시청각실)",
            capacity: "50인",
            teacherOnly: true,
          },
          {
            id: "global",
            name: "글로벌 라운지",
            capacity: "40인",
            teacherOnly: true,
          },
        ],
      },
    ],
  },
  oryangHall: {
    name: "ORYANG HALL",
    floors: [
      {
        floor: "2nd FLOOR",
        rooms: [
          {
            id: "aiReading",
            name: "AI 리딩실",
            capacity: "30인",
            disabled: true,
          },
        ],
      },
      {
        floor: "3rd FLOOR",
        rooms: [
          { id: "career", name: "진로실", capacity: "30인", disabled: true },
        ],
      },
      {
        floor: "멀티실",
        rooms: [
          { id: "multi1", name: "제1 멀티실", capacity: "20인" },
          { id: "multi2", name: "제2 멀티실", capacity: "20인" },
          { id: "multi3", name: "제3 멀티실", capacity: "20인" },
          { id: "multi4", name: "제4 멀티실", capacity: "20인" },
        ],
      },
      {
        floor: "4th FLOOR",
        rooms: [
          {
            id: "careerCounseling",
            name: "진로진학상담실",
            capacity: "20인",
            disabled: true,
          },
          { id: "selfStudy4", name: "제4 자주실", capacity: "30인" },
          { id: "selfStudy5", name: "제5 자주실", capacity: "30인" },
          { id: "selfStudy6", name: "제6 자주실", capacity: "30인" },
        ],
      },
    ],
  },
  rightWing: {
    name: "RIGHT WING",
    floors: [
      {
        floor: "STUDY cafe",
        rooms: [
          { id: "group1", name: "제1 그룹실", capacity: "6인" },
          { id: "group2", name: "제2 그룹실", capacity: "6인" },
          { id: "group3", name: "제3 그룹실", capacity: "6인" },
          {
            id: "individual",
            name: "개인석",
            capacity: "선착순 배정",
            note: "지정좌석이 아닌 선착순 배정입니다",
          },
        ],
      },
      {
        floor: "3rd FLOOR Lounge",
        rooms: [
          { id: "smallGroup1_3", name: "제1 소그룹실", capacity: "4인" },
          { id: "smallGroup2_3", name: "제2 소그룹실", capacity: "4인" },
          { id: "smallGroup3_3", name: "제3 소그룹실", capacity: "4인" },
        ],
      },
      {
        floor: "4th FLOOR Lounge",
        rooms: [
          { id: "smallGroup1_4", name: "제1 소그룹실", capacity: "4인" },
          { id: "smallGroup2_4", name: "제2 소그룹실", capacity: "4인" },
          { id: "smallGroup3_4", name: "제3 소그룹실", capacity: "4인" },
        ],
      },
    ],
  },
};

// 예약 가능한 시간대 (요일별 제한을 위해 hour, minute 정보 추가)
const TIME_SLOTS = [
  {
    id: "lunch",
    name: "점심시간",
    time: "12:40 - 13:30",
    hour: 12,
    minute: 40,
  },
  { id: "cip1", name: "CIP1", time: "16:50 - 17:40", hour: 16, minute: 50 },
  { id: "cip2", name: "CIP2", time: "18:30 - 20:00", hour: 18, minute: 30 },
  { id: "cip3", name: "CIP3", time: "20:10 - 21:00", hour: 20, minute: 10 },
];

function Reserve() {
  const [step, setStep] = useState(1);
  const [selectedWing, setSelectedWing] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [club, setClub] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weekReservations, setWeekReservations] = useState({}); // 주간 예약 데이터를 저장
  const [loadingWeekReservations, setLoadingWeekReservations] = useState(false); // 주간 예약 로딩 상태
  const [isMapModalOpen, setIsMapModalOpen] = useState(false); // 지도 모달 가시성 상태

  const { user } = useAuth();
  const navigate = useNavigate();

  // 날짜를 YYYY-MM-DD 형식으로 포맷팅 (로컬 시간 기준)
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // 현재 주의 월요일부터 금요일까지의 날짜 생성
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // 이번 주 월요일 날짜 계산
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(
      today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );
    mondayOfCurrentWeek.setHours(0, 0, 0, 0); // 시작 시간을 00:00:00으로 설정

    let currentDay = new Date(mondayOfCurrentWeek);
    for (let i = 0; i < 5; i++) {
      // 월요일부터 금요일까지 5일
      dates.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return dates;
  };

  // 날짜 포맷팅 (UI 표시용)
  const formatDate = (date) => {
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  // 주간 예약 데이터 불러오기
  useEffect(() => {
    const fetchWeekReservations = async () => {
      if (step === 3 && selectedRoom) {
        // 날짜 선택 단계에 진입했고 방이 선택되었을 때만 실행
        setLoadingWeekReservations(true);
        try {
          const availableDates = getAvailableDates(); // 현재 주의 월-금 날짜 가져오기
          if (availableDates.length === 0) {
            setWeekReservations({});
            setLoadingWeekReservations(false);
            return;
          }
          const startOfWeekStr = formatDateToYYYYMMDD(availableDates[0]);
          const endOfWeekStr = formatDateToYYYYMMDD(
            availableDates[availableDates.length - 1]
          );

          const data = await getAllReservations(startOfWeekStr, endOfWeekStr);

          const groupedReservations = data.reduce((acc, reservation) => {
            const dateKey = reservation.date;
            if (!acc[dateKey]) {
              acc[dateKey] = [];
            }
            acc[dateKey].push(reservation);
            return acc;
          }, {});
          setWeekReservations(groupedReservations);
        } catch (err) {
          console.error("주간 예약 데이터 로딩 오류:", err);
          setError("예약 가능 날짜를 불러오는 중 오류가 발생했습니다.");
        } finally {
          setLoadingWeekReservations(false);
        }
      } else if (step === 2 || step === 1) {
        // 방 선택 이전 단계에서는 주간 예약 데이터 초기화
        setWeekReservations({});
      }
    };
    fetchWeekReservations();
  }, [step, selectedRoom]); // selectedRoom을 의존성 배열에 추가

  // 예약 생성 함수
  const handleReservation = async (timeSlot) => {
    if (!user) {
      setError("로그인 후 예약해주세요.");
      return;
    }
    if (!reason.trim()) {
      // 이용 사유만 필수
      setError("이용 사유를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // try 블록 시작
      const reservationData = {
        studentId: user.studentId,
        studentName: user.name,
        wing: selectedWing.name,
        floor: selectedRoom.floor,
        room: selectedRoom.name,
        date: formatDateToYYYYMMDD(selectedDate),
        time: timeSlot.id,
        timeRange: timeSlot.time,
        club: club.trim(), // 동아리 정보 (선택 사항)
        reason: reason.trim(), // 이용 사유 정보 (필수)
        status: "active",
        createdAt: new Date(),
      };

      await createReservation(reservationData);
      navigate("/reservations", {
        state: { message: "예약이 완료되었습니다!", type: "success" },
      });
    } catch (error) {
      // catch 블록 시작
      setError(
        error.message || "예약 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      console.error("예약 오류:", error);
    } finally {
      // finally 블록 시작
      setLoading(false);
    }
  };

  // 구역 선택 화면
  const renderWingSelection = () => (
    <div>
      <h3 style={{ marginBottom: "1.5rem" }}>예약할 구역을 선택해주세요</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {Object.entries(ROOMS).map(([key, wing]) => (
          <div
            key={key}
            onClick={() => {
              setSelectedWing(wing);
              setStep(2); // Next step is now Room Selection
            }}
            style={{
              padding: "2rem",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backgroundColor: "white",
              ":hover": {
                borderColor: "var(--primary-color)",
                boxShadow: "var(--shadow)",
              },
            }}
          >
            <h3 style={{ marginBottom: "1rem", color: "var(--primary-color)" }}>
              {wing.name}
            </h3>
            <p style={{ color: "var(--text-color)" }}>
              {wing.floors.length}개의 층에{" "}
              {wing.floors.reduce((acc, floor) => acc + floor.rooms.length, 0)}
              개의 공간
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // 예약 장소 선택 화면 (refactored to show all rooms in selected wing, grouped by floor)
  const renderRoomSelection = () => (
    <div>
      <h3 style={{ marginBottom: "1.5rem" }}>
        {selectedWing.name} 에서 예약할 장소를 선택해주세요
      </h3>
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
      {selectedWing.floors.map((floor) => (
        <div key={floor.floor} style={{ marginBottom: "2rem" }}>
          <h4
            style={{
              marginBottom: "1rem",
              marginTop: "2rem",
              color: "var(--secondary-color)",
              borderBottom: "1px solid var(--border-color)",
              paddingBottom: "0.5rem",
            }}
          >
            {floor.floor.replace(/\\/g, "")}
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1rem",
            }}
          >
            {floor.rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  if (!room.disabled && (!room.teacherOnly || user.isAdmin)) {
                    setSelectedRoom({ ...room, floor: floor.floor }); // IMPORTANT: add floor info to selectedRoom
                    setStep(3); // Next step is Date Selection
                    setError(""); // Clear error on valid selection
                  } else if (room.teacherOnly && !user.isAdmin) {
                    setError("이 장소는 교사만 신청 가능합니다.");
                  } else if (room.disabled) {
                    setError("이 장소는 현재 신청 불가능합니다.");
                  }
                }}
                style={{
                  padding: "1.5rem",
                  border: `1px solid ${
                    room.disabled || (room.teacherOnly && !user.isAdmin)
                      ? "#e0e0e0"
                      : "var(--border-color)"
                  }`,
                  borderRadius: "8px",
                  cursor:
                    room.disabled || (room.teacherOnly && !user.isAdmin)
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.3s ease",
                  backgroundColor: room.disabled ? "#f5f5f5" : "white",
                  opacity:
                    room.disabled || (room.teacherOnly && !user.isAdmin)
                      ? 0.6
                      : 1,
                  boxShadow:
                    room.disabled || (room.teacherOnly && !user.isAdmin)
                      ? "none"
                      : "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "120px",
                  position: "relative",
                }}
              >
                <div>
                  <h4
                    style={{
                      marginBottom: "0.5rem",
                      color: "var(--text-color)",
                    }}
                  >
                    {room.name.replace(/\\/g, "")}
                  </h4>
                  <p style={{ color: "var(--text-color)", fontSize: "0.9rem" }}>
                    수용 인원: {room.capacity}
                  </p>
                </div>
                {room.teacherOnly && !user.isAdmin && (
                  <p
                    style={{
                      color: "#dc3545",
                      fontSize: "0.85rem",
                      marginTop: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    *교사만 신청 가능합니다
                  </p>
                )}
                {room.disabled && (
                  <p
                    style={{
                      color: "#dc3545",
                      fontSize: "0.85rem",
                      marginTop: "0.5rem",
                      fontWeight: "500",
                    }}
                  >
                    *신청 불가능한 교실입니다.
                  </p>
                )}
                {room.note && !room.disabled && (
                  <p
                    style={{
                      color: "var(--text-color-light)",
                      fontSize: "0.8rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    {room.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // 예약 날짜 선택 화면
  const renderDateSelection = () => {
    const availableDates = getAvailableDates();
    return (
      <div>
        <h3 style={{ marginBottom: "1.5rem" }}>예약할 날짜를 선택해주세요</h3>
        {loadingWeekReservations ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            예약 가능 날짜 확인 중...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            {availableDates.map((date) => {
              const dateKey = formatDateToYYYYMMDD(date);
              const dailyReservations = weekReservations[dateKey] || [];
              const dayOfWeek = date.getDay();

              let relevantTimeSlots = [];
              if (dayOfWeek >= 1 && dayOfWeek <= 4) {
                // 월, 화, 수, 목
                relevantTimeSlots = TIME_SLOTS; // 모든 시간대
              } else if (dayOfWeek === 5) {
                // 금요일
                relevantTimeSlots = TIME_SLOTS.filter(
                  (slot) => slot.id === "lunch"
                ); // 점심시간만
              }

              // 해당 장소와 관련된 예약만 필터링
              const roomSpecificReservations = dailyReservations.filter(
                (res) =>
                  res.roomId === selectedRoom.id && res.status === "active"
              );

              // 현재 선택된 장소에 대해 예약 가능한 시간대가 모두 예약되었는지 확인
              const allRelevantSlotsBooked =
                relevantTimeSlots.length > 0 &&
                relevantTimeSlots.every((slot) =>
                  roomSpecificReservations.some((res) => res.time === slot.id)
                );

              const isDisabledDate = allRelevantSlotsBooked;

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => {
                    if (!isDisabledDate) {
                      setSelectedDate(date);
                      setStep(4); // Next step is Time Selection
                    }
                  }}
                  style={{
                    padding: "1.5rem",
                    border: `1px solid ${
                      isDisabledDate ? "#e0e0e0" : "var(--border-color)"
                    }`,
                    borderRadius: "8px",
                    cursor: isDisabledDate ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    backgroundColor: isDisabledDate ? "#f5f5f5" : "white",
                    textAlign: "center",
                    opacity: isDisabledDate ? 0.6 : 1,
                  }}
                >
                  <p style={{ fontSize: "1.2rem", fontWeight: "500" }}>
                    {formatDate(date)}
                  </p>
                  {isDisabledDate && (
                    <p
                      style={{
                        color: "#dc3545",
                        fontSize: "0.85rem",
                        marginTop: "0.5rem",
                        fontWeight: "500",
                      }}
                    >
                      (예약 불가)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 예약 시간 선택 화면
  const renderTimeSelection = () => {
    const now = new Date();
    const isTodaySelected =
      selectedDate &&
      formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(now);

    const dayOfWeek = selectedDate ? selectedDate.getDay() : -1; // 0 = Sunday, 5 = Friday

    let filteredTimeSlots = [];
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // 월, 화, 수, 목
      filteredTimeSlots = TIME_SLOTS; // 모든 시간대
    } else if (dayOfWeek === 5) {
      // 금요일
      filteredTimeSlots = TIME_SLOTS.filter((slot) => slot.id === "lunch"); // 점심시간만
    }

    const dailyReservationsForRoom =
      weekReservations[formatDateToYYYYMMDD(selectedDate)] || [];

    return (
      <div>
        <h3 style={{ marginBottom: "1.5rem" }}>예약할 시간을 선택해주세요</h3>
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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredTimeSlots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              이 날짜에는 예약 가능한 시간이 없습니다.
            </div>
          ) : (
            filteredTimeSlots.map((slot) => {
              const slotTime = new Date(selectedDate);
              slotTime.setHours(slot.hour, slot.minute, 0, 0);
              const isDisabledByTime = isTodaySelected && slotTime <= now;

              // 이미 예약된 시간인지 확인 (선택된 장소의 예약만)
              const isReserved = dailyReservationsForRoom.some(
                (res) =>
                  res.roomId === selectedRoom.id &&
                  res.time === slot.id &&
                  res.status === "active"
              );

              const isDisabled = isDisabledByTime || isReserved;

              return (
                <div
                  key={slot.id}
                  onClick={() => {
                    if (!loading && !isDisabled) {
                      setSelectedTime(slot);
                    } else if (isDisabledByTime) {
                      setError("현재 시간보다 이전 시간은 예약할 수 없습니다.");
                    } else if (isReserved) {
                      setError("이미 예약된 시간입니다.");
                    }
                  }}
                  style={{
                    padding: "1.5rem",
                    border: `1px solid ${
                      isDisabled ? "#e0e0e0" : "var(--border-color)"
                    }`,
                    borderRadius: "8px",
                    cursor: loading || isDisabled ? "not-allowed" : "pointer",
                    transition: "all 0.3s ease",
                    backgroundColor: isDisabled ? "#f5f5f5" : "white",
                    textAlign: "center",
                    opacity: loading || isDisabled ? 0.7 : 1,
                    borderColor:
                      selectedTime?.id === slot.id
                        ? "var(--primary-color)"
                        : undefined,
                    boxShadow:
                      selectedTime?.id === slot.id
                        ? "0 0 0 2px var(--primary-color)"
                        : undefined,
                  }}
                >
                  <h4 style={{ marginBottom: "0.5rem" }}>{slot.name}</h4>
                  <p style={{ color: "var(--text-color)" }}>{slot.time}</p>
                  {isReserved && (
                    <p
                      style={{
                        color: "#dc3545",
                        fontSize: "0.85rem",
                        marginTop: "0.5rem",
                        fontWeight: "500",
                      }}
                    >
                      (예약 완료)
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginTop: "2rem",
              fontWeight: "500",
            }}
          >
            동아리 (선택 사항)
          </label>
          <input
            type="text"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
            }}
          />
        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "500",
            }}
          >
            이용 사유 (필수)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows="4"
            style={{
              width: "100%",
              padding: "0.8rem",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              resize: "vertical",
            }}
            required
          ></textarea>
        </div>
        <button
          onClick={() => {
            if (!selectedTime) {
              setError("예약할 시간을 선택해주세요.");
              return;
            }
            if (!reason.trim()) {
              setError("이용 사유를 입력해주세요.");
              return;
            }
            handleReservation(selectedTime);
          }}
          disabled={loading || !selectedTime || !reason.trim()}
          style={{
            width: "100%",
            padding: "1rem",
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              loading || !selectedTime || !reason.trim()
                ? "not-allowed"
                : "pointer",
            opacity: loading || !selectedTime || !reason.trim() ? 0.7 : 1,
            fontSize: "1.1rem",
            fontWeight: "500",
          }}
        >
          예약하기
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>공간 예약</h2>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  step >= 1 ? "var(--primary-color)" : "var(--border-color)",
                color: "white",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => {
                setError("");
                setSelectedWing(null);
                setSelectedRoom(null);
                setSelectedDate(null);
                setSelectedTime(null);
                setClub("");
                setReason("");
                setWeekReservations({});
                setStep(1);
              }}
            >
              1. 구역 선택
            </div>
            <div
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  step >= 2 ? "var(--primary-color)" : "var(--border-color)",
                color: "white",
                borderRadius: "4px",
                cursor: step >= 2 ? "pointer" : "not-allowed",
                opacity: step >= 2 ? 1 : 0.6,
              }}
              onClick={() => {
                if (step >= 2) {
                  setError("");
                  setSelectedRoom(null);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setClub("");
                  setReason("");
                  setWeekReservations({});
                  setStep(2);
                }
              }}
            >
              2. 장소 선택
            </div>
            <div
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  step >= 3 ? "var(--primary-color)" : "var(--border-color)",
                color: "white",
                borderRadius: "4px",
                cursor: step >= 3 ? "pointer" : "not-allowed",
                opacity: step >= 3 ? 1 : 0.6,
              }}
              onClick={() => {
                if (step >= 3) {
                  setError("");
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setClub("");
                  setReason("");
                  setWeekReservations({});
                  setStep(3);
                }
              }}
            >
              3. 날짜 선택
            </div>
            <div
              style={{
                padding: "0.5rem 1rem",
                backgroundColor:
                  step >= 4 ? "var(--primary-color)" : "var(--border-color)",
                color: "white",
                borderRadius: "4px",
                cursor: step >= 4 ? "pointer" : "not-allowed",
                opacity: step >= 4 ? 1 : 0.6,
              }}
              onClick={() => {
                if (step >= 4) {
                  setError("");
                  setSelectedTime(null);
                  setClub("");
                  setReason("");
                  setStep(4);
                }
              }}
            >
              4. 시간 선택
            </div>
          </div>
          <button
            onClick={() => setIsMapModalOpen(true)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
              color: "var(--primary-color)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              transition: "background-color 0.3s ease",
              ":hover": {
                backgroundColor: "var(--hover-color)",
              },
            }}
          >
            건물 지도 보기
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "var(--shadow)",
        }}
      >
        {step === 1 && renderWingSelection()}
        {step === 2 && renderRoomSelection()}
        {step === 3 && renderDateSelection()}
        {step === 4 && renderTimeSelection()}

        {step > 1 && (
          <button
            onClick={() => {
              setError(""); // 오류 메시지 초기화
              if (step === 2) {
                // 장소 선택에서 구역 선택으로 돌아갈 때
                setSelectedWing(null);
              } else if (step === 3) {
                // 날짜 선택에서 장소 선택으로 돌아갈 때
                setSelectedRoom(null);
                setWeekReservations({}); // 주간 예약 데이터 초기화
              } else if (step === 4) {
                // 시간 선택에서 날짜 선택으로 돌아갈 때
                setSelectedDate(null);
              }
              setStep(step - 1);
            }}
            disabled={loading}
            style={{
              marginTop: "2rem",
              padding: "0.8rem 1.5rem",
              backgroundColor: "var(--border-color)",
              color: "var(--text-color)",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            이전 단계
          </button>
        )}
      </div>

      {isMapModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <button
              onClick={() => setIsMapModalOpen(false)}
              style={closeButtonStyle}
            >
              &times;
            </button>
            <h3 style={{ marginBottom: "1rem", color: "var(--primary-color)" }}>
              건물 지도
            </h3>
            <img
              src={schoolImage}
              alt="학교 지도"
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
                margin: "0 auto",
              }}
            />
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
  maxWidth: "90%",
  maxHeight: "90%",
  overflow: "auto",
  width: "auto", // 이미지 크기에 맞게 조절
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

export default Reserve;
