import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  createReservation,
  getAllReservations,
  getReservationsByDateV2,
  listenToPlaces,
  saveReservationMembers,
} from "../firebase/db";
import "../styles/common.css";
import schoolImage from "../assets/school-image.png"; // 학교 지도 이미지 임포트

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
  // ---------- 상태 ----------
  const [step, setStep] = useState(1);

  // Firestore에서 받은 원본 장소 리스트
  const [places, setPlaces] = useState([]);

  // 층/장소 선택 상태
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null); // { id, name, capacity, teacherOnly, enabled, floor }

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [club, setClub] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [weekReservations, setWeekReservations] = useState({});
  const [loadingWeekReservations, setLoadingWeekReservations] = useState(false);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  // [1] 인원/참가자 상태
  // - student : additionalCount = "본인 제외 인원수"
  // - teacher/admin : additionalCount = "학생 수(명)" (명단 입력 없음)
  const [additionalCount, setAdditionalCount] = useState(1);
  const [participants, setParticipants] = useState([]); // [{studentId, name}]

  // 지도교사 성함 (필수)
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    if (!isMapModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none"; // 모바일 터치 스크롤 차단

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [isMapModalOpen]);

  // ---------- 장소 구독 ----------
  useEffect(() => {
    // 모든 장소 실시간 구독 후 상태 저장
    const unsubscribe = listenToPlaces((items) => {
      setPlaces(items);
    });
    return unsubscribe;
  }, []);

  // 선택된 방/시간/날짜 또는 주간예약이 바뀔 때, 인원수/참가자 입력을 안전하게 보정
  useEffect(() => {
    if (!selectedRoom || !selectedTime || !selectedDate) return;

    // 날짜 키
    const dateKey = formatDateToYYYYMMDD(selectedDate);
    const dayReservations = (weekReservations[dateKey] || []).filter(
      (res) =>
        res.status === "active" &&
        res.time === selectedTime.id &&
        res.roomId === selectedRoom.id
    );

    // 현재 사용 인원 합
    const used = dayReservations.reduce(
      (sum, r) => sum + (Number(r.groupSize) || 1),
      0
    );

    // 정원 계산
    const cap = getCapacity(selectedRoom); // null => 무제한
    const remain = cap == null ? null : Math.max(0, cap - used);

    // 본인 제외 가능한 최대치(학생은 '본인 제외', 교사/관리자는 '학생 수'로 해석)
    const myMaxAdditional = remain == null ? 999 : Math.max(0, remain - 1);

    // 현재 값이 최대를 넘는 경우 보정
    setAdditionalCount((prev) => {
      let v = typeof prev === "number" ? prev : parseInt(prev || "0", 10);
      if (!Number.isFinite(v) || v < 0) v = 0;
      if (v > myMaxAdditional) v = myMaxAdditional;
      return v;
    });

    // 역할 기반 명단 처리
    const role = user?.role || "student";
    const isTeacherOrAdmin = role === "teacher" || role === "admin";

    setParticipants((prev) => {
      if (isTeacherOrAdmin) {
        // 교사/관리자: 학번/이름 명단 입력 안 함
        return [];
      }
      // 학생: 입력 칸 수를 additionalCount에 맞춤
      let v =
        typeof additionalCount === "number"
          ? additionalCount
          : parseInt(additionalCount || "0", 10);
      if (!Number.isFinite(v) || v < 0) v = 0;
      if (v > myMaxAdditional) v = myMaxAdditional;

      const next = prev.slice(0, v);
      while (next.length < v) next.push({ studentId: "", name: "" });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom, selectedTime, selectedDate, weekReservations]);

  // 문자열/배열 어떤 형태든 태그 배열로 정규화
  const toTagsArray = (val) => {
    if (Array.isArray(val)) {
      return val
        .map((t) => String(t).trim())
        .filter(Boolean)
        .filter((t, i, a) => a.indexOf(t) === i);
    }
    if (typeof val === "string") {
      return val
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t, i, a) => a.indexOf(t) === i);
    }
    return [];
  };

  // 층 정렬용 순위 함수
  const floorRank = (label) => {
    const s = String(label ?? "")
      .replace(/\\/g, "")
      .trim();
    const m = s.match(/^(\d+)\s*층$/);
    if (m) return parseInt(m[1], 10);
    const m2 = s.match(/^(\d+)/);
    if (m2) return parseInt(m2[1], 10);
    return Number.POSITIVE_INFINITY;
  };

  // floors → rooms 트리
  const floorTree = useMemo(() => {
    const list = Array.isArray(places) ? places : [];
    const byFloor = list.reduce((acc, p) => {
      const floorKey = p.floor ?? "";
      if (!acc[floorKey]) acc[floorKey] = [];
      acc[floorKey].push(p);
      return acc;
    }, {});
    return Object.entries(byFloor)
      .sort(([fa], [fb]) => floorRank(fa) - floorRank(fb))
      .map(([floor, rooms]) => ({
        name: floor,
        rooms: rooms
          .slice()
          .sort(
            (a, b) =>
              Number(Boolean(b.enabled)) - Number(Boolean(a.enabled)) ||
              String(a.name ?? "").localeCompare(String(b.name ?? ""))
          ),
      }));
  }, [places]);

  // ---------- 날짜/주간 유틸 ----------
  const formatDateToYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    const day = today.getDay(); // 0=Sun .. 6=Sat

    // 이번 주 월요일 계산
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);

    // 주말이면 다음 주 월요일로
    if (day === 6 || day === 0) {
      monday.setDate(monday.getDate() + 7);
    }

    // 월~금 5일 반환
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const formatDate = (date) =>
    date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });

  // 주간 예약 로딩
  useEffect(() => {
    const fetchWeekReservations = async () => {
      if (!selectedDate) {
        setWeekReservations({});
        return;
      }
      setLoadingWeekReservations(true);
      try {
        const base = new Date(selectedDate);
        const day = base.getDay(); // 0=Sun..6=Sat
        const monday = new Date(base);
        monday.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
        monday.setHours(0, 0, 0, 0);

        const dates = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          dates.push(d);
        }
        const startStr = formatDateToYYYYMMDD(dates[0]);
        const endStr = formatDateToYYYYMMDD(dates[dates.length - 1]);

        const data = await getAllReservations(startStr, endStr);
        const grouped = data.reduce((acc, reservation) => {
          const dateKey = reservation.date;
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(reservation);
          return acc;
        }, {});
        setWeekReservations(grouped);
      } catch (err) {
        console.error("주간 예약 데이터 로딩 오류:", err);
        setError("예약 가능 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoadingWeekReservations(false);
      }
    };
    fetchWeekReservations();
  }, [selectedDate]);

  // 참가자(본인 제외) 중복 검사
  const findDuplicateParticipantIndexes = (arr) => {
    const seen = new Map();
    const dupIdx = new Set();
    arr.forEach((p, i) => {
      const id = (p.studentId ?? "").trim();
      const nm = (p.name ?? "").trim();
      if (!id || !nm) return;
      const key = `${id}|${nm}`;
      if (seen.has(key)) {
        dupIdx.add(seen.get(key));
        dupIdx.add(i);
      } else {
        seen.set(key, i);
      }
    });
    return Array.from(dupIdx).sort((a, b) => a - b);
  };

  // 모든 참가자 필수 입력이 채워졌는지?
  const areParticipantsComplete = (additionalCount, participants) => {
    if (additionalCount === 0) return true;
    if (participants.length !== additionalCount) return false;
    return participants.every(
      (p) => (p.studentId ?? "").trim() && (p.name ?? "").trim()
    );
  };

  // ---------- 예약 생성 ----------
  const handleReservation = async () => {
    if (!user) {
      setError("로그인 후 예약해주세요.");
      return;
    }
    if (!selectedTime) {
      setError("예약할 시간을 선택해주세요.");
      return;
    }
    if (!selectedRoom) {
      setError("장소를 선택해주세요.");
      return;
    }

    // role 기반
    const role = user?.role || "student";
    const isTeacherOrAdmin = role === "teacher" || role === "admin";

    // 교사전용 가드
    if (selectedRoom.teacherOnly && !isTeacherOrAdmin) {
      setError(
        "해당 공간은 지도교사(또는 지도교사 임장시)/관리자만 신청 가능합니다."
      );
      return;
    }

    if (!teacherName.trim()) {
      setError("지도교사 성함을 입력해주세요.");
      return;
    }

    if (!reason.trim()) {
      setError("이용 사유를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const dateStr = formatDateToYYYYMMDD(selectedDate);

      // 1) 인원 계산/검증
      const perMin = getPerReservationMin(selectedRoom); // 팀당 최소(학생/관리자 예약 기준: 본인 포함, 교사/관리자 정책상 그대로 사용)
      const capacity = getCapacity(selectedRoom);

      // teacher/admin : groupSize = 학생 수(입력값 그대로)
      // student       : groupSize = 1 + additionalCount(본인 포함)
      const parsedCnt = parseInt(additionalCount, 10);
      const cleanCnt = Number.isFinite(parsedCnt) ? parsedCnt : 0;
      const groupSize = isTeacherOrAdmin ? cleanCnt : 1 + cleanCnt;

      if (groupSize < perMin) {
        setError(`이 공간은 팀당 최소 ${perMin}명부터 예약 가능합니다.`);
        setLoading(false);
        return;
      }

      // 2) 해당 시간대 사용 중 정원 계산
      const existing = await getReservationsByDateV2(
        dateStr,
        selectedRoom.id,
        selectedTime.id
      );
      const used = existing
        .filter((r) => r.status === "active")
        .reduce((sum, r) => sum + (Number(r.groupSize) || 1), 0);

      if (capacity != null && groupSize > Math.max(0, capacity - used)) {
        setError(
          `남은 정원은 ${Math.max(
            0,
            capacity - used
          )}명입니다. 인원을 조정하거나 다른 시간/공간을 선택하세요.`
        );
        setLoading(false);
        return;
      }

      // 3) 참가자(본인 제외) 입력 검증 (student만)
      if (!isTeacherOrAdmin) {
        if (
          participants.length !== groupSize - 1 ||
          participants.some((p) => !p.studentId?.trim() || !p.name?.trim())
        ) {
          setError("참가자 학번/이름을 모두 입력해주세요.");
          setLoading(false);
          return;
        }
      }

      // 4) 예약 데이터 저장 (인원 스냅샷 포함)
      const reservationData = {
        studentId: user?.role === "admin" ? "admin" : user.studentId,
        studentName: user.name || user.displayName || "알 수 없음",
        wing: selectedRoom.wing,
        floor: selectedRoom.floor || "",
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        date: dateStr,
        time: selectedTime.id,
        timeRange: selectedTime.time,
        club: club.trim(),
        teacherName: teacherName.trim(),
        reason: reason.trim(),
        status: "active",
        createdAt: new Date(),

        // 인원 관련
        groupSize, // teacher/admin: 학생 수, student: 본인 포함
        additionalCount: isTeacherOrAdmin ? groupSize : groupSize - 1,
        participants: isTeacherOrAdmin ? [] : participants, // teacher/admin: 명단 저장 X
        perReservationMin: perMin,
        capacity, // null이면 무제한
      };

      // (A) 예약 문서 생성 → id 획득
      const reservationId = await createReservation(reservationData);

      // (B) 멤버 서브컬렉션에 예약자 + 동행자 저장
      await saveReservationMembers(
        reservationId,
        {
          studentId: user?.role === "admin" ? "admin" : user.studentId,
          name: user.name || user.displayName || "알 수 없음",
        },
        isTeacherOrAdmin ? [] : participants
      );

      navigate("/reservations", {
        state: { message: "예약이 완료되었습니다!", type: "success" },
      });
    } catch (error) {
      setError(
        error.message || "예약 중 오류가 발생했습니다. 다시 시도해주세요."
      );
      console.error("예약 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // [2] 헬퍼
  const getPerReservationMin = (room) => {
    const v = Number(room?.perReservationMin);
    return Number.isFinite(v) && v > 0 ? v : 1; // 기본 1명 이상
  };

  const getCapacity = (room) => {
    if (room?.capacity === "" || room?.capacity == null) return null; // null = 무제한
    const v = Number(room.capacity);
    return Number.isFinite(v) && v >= 0 ? v : null;
  };

  // ---------- 층 선택 ----------
  const renderFloorSelection = () => (
    <div>
      <h3 style={{ marginBottom: "1.5rem" }}>예약할 층을 선택해주세요</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {floorTree.map((floor) => (
          <div
            key={floor.name}
            onClick={() => {
              setSelectedFloor(floor);
              setSelectedRoom(null);
              setStep(4);
            }}
            style={{
              padding: "2rem",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              cursor: "pointer",
              background: "white",
            }}
          >
            <h3 style={{ marginBottom: "1rem", color: "var(--primary-color)" }}>
              {(floor.name || "").replace(/\\/g, "")}
            </h3>
            <p style={{ color: "var(--text-color)" }}>
              {(() => {
                const names = floor.rooms.map((room) => room.name);
                const preview = names.slice(0, 3).join(", ");
                return names.length > 3
                  ? `${preview} ...`
                  : preview || "등록된 공간 없음";
              })()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- 장소 선택 ----------
  const renderRoomSelection = () => {
    const dateKey = selectedDate ? formatDateToYYYYMMDD(selectedDate) : null;
    const dayReservations = (dateKey && weekReservations[dateKey]) || [];

    // role
    const role = user?.role || "student";
    const isTeacherOrAdmin = role === "teacher" || role === "admin";

    // 선택된 층의 방을 윙으로 그룹핑
    const roomsInFloor = selectedFloor.rooms;
    const byWing = roomsInFloor.reduce((acc, r) => {
      const wingKey = r.wing ?? "";
      if (!acc[wingKey]) acc[wingKey] = [];
      acc[wingKey].push(r);
      return acc;
    }, {});
    const ZONE_ORDER = ["소그룹 ZONE", "대그룹 ZONE", "별도예약"];
    const zoneSections = ZONE_ORDER.map((zone) => ({
      zone,
      rooms: byWing[zone] || [],
    }));

    const getUsedCapacity = (roomId) =>
      dayReservations
        .filter(
          (res) =>
            res.roomId === roomId &&
            res.time === selectedTime?.id &&
            res.status === "active"
        )
        .reduce((sum, r) => sum + (Number(r.groupSize) || 1), 0);

    // 버튼 활성화 조건: 교사/관리자는 참가자 명단 체크 제외
    const participantsComplete =
      isTeacherOrAdmin ||
      areParticipantsComplete(additionalCount, participants);

    return (
      <div>
        <h3 style={{ marginBottom: "0.75rem" }}>
          {selectedFloor.name}에서 장소를 선택해주세요
        </h3>

        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          선택한 일시: {formatDate(selectedDate)} · {selectedTime?.name} (
          {selectedTime?.time})
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(280px, 1fr))",
            gap: "1.5rem",
            alignItems: "start",
            marginTop: "0.5rem",
          }}
        >
          {zoneSections.map(({ zone, rooms }) => (
            <div
              key={zone}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                padding: "1rem",
                background: "white",
              }}
            >
              <h4
                style={{
                  marginBottom: "1rem",
                  color: "var(--secondary-color)",
                  borderBottom: "1px solid var(--border-color)",
                  paddingBottom: "0.5rem",
                  minHeight: "2rem",
                }}
              >
                {(zone || "").replace(/\\/g, "")}
              </h4>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                {rooms.length === 0 ? (
                  <div
                    style={{
                      padding: "0.75rem",
                      border: "1px dashed #ddd",
                      borderRadius: 8,
                      color: "#888",
                      fontSize: "0.9rem",
                      textAlign: "center",
                    }}
                  >
                    등록된 공간이 없습니다.
                  </div>
                ) : (
                  rooms.map((room) => {
                    const cap = getCapacity(room); // null => 무제한
                    const used = getUsedCapacity(room.id);

                    let blocked, blockMessage;
                    if (cap == null) {
                      const inUse = used > 0;
                      blocked =
                        inUse ||
                        !room.enabled ||
                        (room.teacherOnly && !isTeacherOrAdmin);
                      blockMessage = inUse
                        ? "장소가 이미 예약되었습니다."
                        : room.teacherOnly && !isTeacherOrAdmin
                        ? "*지도교사 신청 및 지도교사 임장시 사용 가능합니다."
                        : !room.enabled
                        ? room.disabledReason || "*신청 불가능한 교실입니다."
                        : "";
                    } else {
                      const atCapacity = used >= cap;
                      blocked =
                        atCapacity ||
                        !room.enabled ||
                        (room.teacherOnly && !isTeacherOrAdmin);
                      blockMessage = atCapacity
                        ? "정원이 가득 찼습니다."
                        : room.teacherOnly && !isTeacherOrAdmin
                        ? "*지도교사 신청 및 지도교사 임장시 사용 가능합니다."
                        : !room.enabled
                        ? room.disabledReason || "*신청 불가능한 교실입니다."
                        : "";
                    }

                    const isSelected = selectedRoom?.id === room.id;

                    return (
                      <div
                        key={room.id}
                        onClick={() => {
                          if (!blocked) {
                            setSelectedRoom({
                              ...room,
                              floor: selectedFloor.name,
                              wing: room.wing ?? "",
                            });
                            setError("");
                          } else {
                            setError(blockMessage.replace(/\.$/, ""));
                          }
                        }}
                        style={{
                          padding: "1.5rem",
                          border: `1px solid ${
                            isSelected
                              ? "var(--primary-color)"
                              : blocked
                              ? "#e0e0e0"
                              : "var(--border-color)"
                          }`,
                          borderRadius: "8px",
                          cursor: blocked ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          backgroundColor: blocked
                            ? "#f5f5f5"
                            : isSelected
                            ? "#f0f8ff"
                            : "white",
                          opacity: blocked ? 0.6 : 1,
                          boxShadow: blocked ? "none" : "var(--shadow)",
                          minHeight: "120px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <h4 style={{ marginBottom: "0.5rem" }}>
                            {room.name.replace(/\\/g, "")}
                          </h4>
                          <p
                            style={{
                              color: "var(--text-color)",
                              fontSize: "0.9rem",
                            }}
                          >
                            수용 인원: {room.capacity || "-"}
                          </p>

                          <p
                            style={{
                              color: "#777",
                              fontSize: 12,
                              marginTop: 6,
                            }}
                          >
                            정원 {cap == null ? "무제한" : `${cap}명`} · 사용{" "}
                            {used}명
                            {cap != null
                              ? ` · 잔여 ${Math.max(0, cap - used)}명`
                              : ""}
                          </p>

                          {(() => {
                            const tags = toTagsArray(room.tags);
                            if (!tags.length) return null;
                            return (
                              <div
                                style={{
                                  marginTop: "8px",
                                  display: "flex",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                {tags.map((t) => (
                                  <span
                                    key={t}
                                    style={{
                                      fontSize: 11,
                                      padding: "0.18rem 0.45rem",
                                      borderRadius: 999,
                                      background: "#f1f3f5",
                                      color: "#495057",
                                      border: "1px solid #e9ecef",
                                    }}
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        {blocked && (
                          <p
                            style={{
                              color: "#dc3545",
                              fontSize: "0.85rem",
                              marginTop: "0.5rem",
                              fontWeight: "500",
                            }}
                          >
                            {blockMessage}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 선택된 방이 있으면 예약 폼/버튼 노출 */}
        {selectedRoom && (
          <div style={{ marginTop: "1.5rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginTop: "1rem",
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

            <div>
              <label
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  fontWeight: "500",
                }}
              >
                지도교사 성함 (해당 장소 사용 허락을 해주신 분){" "}
                <span style={{ color: "#dc3545" }}>(필수)</span>
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="예) 김OO"
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                }}
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  fontWeight: "500",
                }}
              >
                이용 사유 <span style={{ color: "#dc3545" }}>(필수)</span>
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

            {/* 인원수/참가자 입력 */}
            {(() => {
              const roleLocal = user?.role || "student";
              const isTeacherOrAdminLocal =
                roleLocal === "teacher" || roleLocal === "admin";

              const minTeam = getPerReservationMin(selectedRoom);
              const cap = getCapacity(selectedRoom);
              const used = (() => {
                return dayReservations
                  .filter(
                    (res) =>
                      res.roomId === selectedRoom.id &&
                      res.time === selectedTime?.id &&
                      res.status === "active"
                  )
                  .reduce((sum, r) => sum + (Number(r.groupSize) || 1), 0);
              })();
              const remain = cap == null ? null : Math.max(0, cap - used);
              const myMaxAdditional =
                remain == null ? 999 : Math.max(0, remain - 1);

              return (
                <div style={{ marginBottom: "1.5rem" }}>
                  {/* 규칙 안내 */}
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      background: "#f6f9ff",
                      border: "1px solid #dbe7ff",
                      borderRadius: 6,
                      marginBottom: "0.75rem",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                    }}
                  >
                    <div>
                      <strong>이용 규칙</strong>
                    </div>
                    <div>
                      • 팀당 최소 인원: <strong>{minTeam}</strong>명
                    </div>
                    <div>
                      • 총 정원:{" "}
                      <strong>{cap == null ? "무제한" : `${cap}명`}</strong>{" "}
                      (해당 시간 사용 {used}명
                      {cap != null ? ` · 잔여 ${remain}명` : ""})
                    </div>
                  </div>

                  {/* 인원 입력: teacher/admin → "학생 수(명)", student → "본인 제외 인원수" */}
                  <label
                    style={{
                      display: "block",
                      fontWeight: 500,
                      marginBottom: 6,
                    }}
                  >
                    {isTeacherOrAdminLocal ? "학생 수(명)" : "본인 제외 인원수"}
                  </label>
                  <input
                    type="number"
                    min={isTeacherOrAdminLocal ? 1 : 0}
                    max={myMaxAdditional}
                    value={additionalCount}
                    onChange={(e) => {
                      let raw = e.target.value;

                      // 학생: 0 입력 특수 처리(기존 정책 유지)
                      if (!isTeacherOrAdminLocal && raw === "0") {
                        setAdditionalCount(1);
                        setParticipants((prev) => {
                          const next = prev.slice(0, 1);
                          while (next.length < 1)
                            next.push({ studentId: "", name: "" });
                          return next;
                        });
                        return;
                      }

                      // 공백 허용
                      if (raw === "") {
                        setAdditionalCount("");
                        setParticipants([]);
                        return;
                      }

                      let parsed = parseInt(raw, 10);
                      if (!Number.isFinite(parsed))
                        parsed = isTeacherOrAdminLocal ? 1 : 0;

                      const v = Math.max(
                        isTeacherOrAdminLocal ? 1 : 0,
                        Math.min(myMaxAdditional, parsed)
                      );

                      setAdditionalCount(v);

                      // teacher/admin → 명단 비움, student → 길이 맞춤
                      if (isTeacherOrAdminLocal) {
                        setParticipants([]);
                      } else {
                        setParticipants((prev) => {
                          const next = prev.slice(0, v);
                          while (next.length < v)
                            next.push({ studentId: "", name: "" });
                          return next;
                        });
                      }
                    }}
                    style={{
                      width: 160,
                      padding: "0.6rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                    }}
                  />

                  {/* 학번/이름 입력란: teacher/admin은 아예 숨김 */}
                  {(() => {
                    if (isTeacherOrAdminLocal) return null;
                    return (
                      participants.length > 0 && (
                        <div
                          style={{
                            marginTop: "1rem",
                            display: "grid",
                            gap: "0.75rem",
                          }}
                        >
                          {participants.map((p, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "0.5rem",
                              }}
                            >
                              <div>
                                <label style={{ fontSize: 13, color: "#666" }}>
                                  {idx + 1}번 학번
                                </label>
                                <input
                                  type="number"
                                  value={p.studentId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setParticipants((prev) => {
                                      const next = prev.slice();
                                      next[idx] = {
                                        ...next[idx],
                                        studentId: val,
                                      };
                                      return next;
                                    });
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 4,
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 13, color: "#666" }}>
                                  {idx + 1}번 이름
                                </label>
                                <input
                                  type="text"
                                  value={p.name}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setParticipants((prev) => {
                                      const next = prev.slice();
                                      next[idx] = { ...next[idx], name: val };
                                      return next;
                                    });
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "0.6rem",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 4,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    );
                  })()}
                </div>
              );
            })()}

            {error && (
              <div
                style={{
                  padding: "1rem",
                  marginTop: "1rem",
                  marginBottom: "1rem",
                  backgroundColor: "#fee",
                  color: "#c00",
                  borderRadius: "4px",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={() => {
                if (!user) return setError("로그인 후 예약해주세요.");
                if (!reason.trim())
                  return setError("이용 사유를 입력해주세요.");
                if (!teacherName.trim())
                  return setError("지도교사 성함을 입력해주세요.");
                handleReservation();
              }}
              disabled={
                loading ||
                !reason.trim() ||
                !teacherName.trim() ||
                !participantsComplete
              }
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  loading || !reason.trim() || !teacherName.trim()
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  loading || !reason.trim() || !teacherName.trim() ? 0.7 : 1,
                fontSize: "1.1rem",
                fontWeight: "500",
              }}
            >
              예약하기
            </button>
          </div>
        )}
      </div>
    );
  };

  // ---------- 날짜 선택 ----------
  const renderDateSelection = () => {
    const availableDates = getAvailableDates();
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    return (
      <div>
        <h3 style={{ marginBottom: "1.5rem" }}>예약할 날짜를 선택해주세요</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {availableDates.map((date) => {
            const dateStart = new Date(date);
            dateStart.setHours(0, 0, 0, 0);

            const isPastDate = dateStart < todayStart; // 지난 날짜
            const isDisabledDate = isPastDate;

            const disabledReason = isPastDate
              ? "예약 가능 기간이 아닙니다"
              : "";

            return (
              <div
                key={date.toISOString()}
                onClick={() => {
                  if (!isDisabledDate) {
                    setSelectedDate(date);
                    setSelectedTime(null);
                    setSelectedFloor(null);
                    setSelectedRoom(null);
                    setStep(2);
                  }
                }}
                style={{
                  padding: "1.5rem",
                  border: `1px solid ${
                    isDisabledDate ? "#c0c0c0" : "var(--border-color)"
                  }`,
                  borderRadius: "8px",
                  cursor: isDisabledDate ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  backgroundColor: isDisabledDate ? "#e0e0e0" : "white",
                  textAlign: "center",
                  opacity: isDisabledDate ? 0.7 : 1,
                }}
              >
                <p
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "500",
                    color: isDisabledDate ? "#a0a0a0" : "inherit",
                  }}
                >
                  {formatDate(date)}
                </p>
                {isDisabledDate && (
                  <p
                    style={{
                      color: "#dc3545",
                      fontSize: "0.85rem",
                      marginTop: "0.5rem",
                      fontWeight: 500,
                    }}
                  >
                    ({disabledReason})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---------- 시간 선택 ----------
  const renderTimeSelection = () => {
    const now = new Date();
    const isTodaySelected =
      selectedDate &&
      formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(now);

    const role = user?.role || "student";
    const isAdmin = role === "admin";

    const dayOfWeek = selectedDate ? selectedDate.getDay() : -1;
    let filteredTimeSlots = [];
    if (dayOfWeek >= 1 && dayOfWeek <= 4) filteredTimeSlots = TIME_SLOTS;
    else if (dayOfWeek === 5)
      filteredTimeSlots = TIME_SLOTS.filter((s) => s.id === "lunch");

    return (
      <div>
        <h3 style={{ marginBottom: "1.5rem" }}>예약할 시간을 선택해주세요</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredTimeSlots.map((slot) => {
            const slotTime = new Date(selectedDate);
            slotTime.setHours(slot.hour, slot.minute, 0, 0);

            const isDisabledByTime = isTodaySelected && slotTime <= now;
            const finalDisabled = isDisabledByTime && !isAdmin;

            return (
              <button
                key={slot.id}
                onClick={() => {
                  if (!finalDisabled) {
                    setSelectedTime(slot);
                    setSelectedFloor(null);
                    setSelectedRoom(null);
                    setStep(3);
                    setError("");
                  }
                }}
                disabled={finalDisabled}
                style={{
                  padding: "1.5rem",
                  border: `1px solid ${
                    finalDisabled
                      ? "#c0c0c0"
                      : selectedTime?.id === slot.id
                      ? "var(--primary-color)"
                      : "var(--border-color)"
                  }`,
                  borderRadius: "8px",
                  backgroundColor: finalDisabled
                    ? "#e8e8e8"
                    : selectedTime?.id === slot.id
                    ? "var(--primary-color)"
                    : "white",
                  color: finalDisabled
                    ? "#707070"
                    : selectedTime?.id === slot.id
                    ? "white"
                    : "var(--text-color)",
                  cursor: finalDisabled ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                  {slot.name}
                </div>
                <div style={{ marginTop: 6 }}>{slot.time}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 보조 스타일/유틸
  const stepBoxStyle = (active) => ({
    padding: "0.5rem 1rem",
    backgroundColor: active ? "var(--primary-color)" : "var(--border-color)",
    color: "white",
    borderRadius: "4px",
    cursor: active ? "pointer" : "not-allowed",
    opacity: active ? 1 : 0.6,
  });
  const resetError = () => setError("");

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h2 style={{ marginBottom: "1.5rem" }}>공간 예약하기</h2>

      <div
        style={{
          backgroundColor: "#fff3cd",
          color: "#856404",
          padding: "1rem",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          border: "1px solid #ffeeba",
          fontSize: "0.95rem",
        }}
      >
        <strong>안내:</strong> 취소는 당일 오전 8시까지 가능합니다. 그 이후에는
        관리자에게 문의해주세요.
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div
              style={stepBoxStyle(step >= 1)}
              onClick={() => {
                // 맨 앞으로
                resetError();
                setSelectedDate(null);
                setSelectedTime(null);
                setSelectedFloor(null);
                setSelectedRoom(null);
                setWeekReservations({});
                setClub("");
                setReason("");
                setStep(1);
              }}
            >
              1. 날짜 선택
            </div>

            <div
              style={stepBoxStyle(step >= 2)}
              onClick={() => {
                if (step >= 2) {
                  resetError();
                  setSelectedTime(null);
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                  setClub("");
                  setReason("");
                  setStep(2);
                }
              }}
            >
              2. 시간 선택
            </div>

            <div
              style={stepBoxStyle(step >= 3)}
              onClick={() => {
                if (step >= 3) {
                  resetError();
                  setSelectedFloor(null);
                  setSelectedRoom(null);
                  setStep(3);
                }
              }}
            >
              3. 층 선택
            </div>

            <div
              style={stepBoxStyle(step >= 4)}
              onClick={() => {
                if (step >= 4) {
                  resetError();
                  setSelectedRoom(null);
                  setStep(4);
                }
              }}
            >
              4. 장소 선택
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
        {step === 1 && renderDateSelection()}
        {step === 2 && selectedDate && renderTimeSelection()}
        {step === 3 && selectedDate && selectedTime && renderFloorSelection()}
        {step === 4 &&
          selectedDate &&
          selectedTime &&
          selectedFloor &&
          renderRoomSelection()}
        {step > 1 && (
          <button
            onClick={() => {
              resetError();
              if (step === 2) {
                setSelectedTime(null);
                setSelectedFloor(null);
                setSelectedRoom(null);
                setStep(1);
              } else if (step === 3) {
                setSelectedFloor(null);
                setSelectedRoom(null);
                setStep(2);
              } else if (step === 4) {
                setSelectedRoom(null);
                setStep(3);
              }
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
        <div
          style={modalOverlayStyle}
          onClick={() => setIsMapModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="건물 지도"
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <button
              onClick={() => setIsMapModalOpen(false)}
              style={closeButtonStyle}
              aria-label="닫기"
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
  overscrollBehavior: "contain",
  touchAction: "none",
};

const modalContentStyle = {
  backgroundColor: "white",
  padding: "2rem",
  borderRadius: "8px",
  boxShadow: "var(--shadow-lg)",
  maxWidth: "90%",
  maxHeight: "90%",
  overflow: "auto",
  width: "auto",
  zIndex: 1001,
  position: "relative",
  WebkitOverflowScrolling: "touch",
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
