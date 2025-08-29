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

  // [1] 상태 추가 (컴포넌트 상단의 useState 구역)
  const [additionalCount, setAdditionalCount] = useState(1); // 본인 제외 인원수
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

    // 본인 제외 가능한 최대치
    const myMaxAdditional = remain == null ? 999 : Math.max(0, remain - 1);

    // 현재 값이 최대를 넘는 경우 보정
    setAdditionalCount((prev) => {
      // 허용 범위 [0, myMaxAdditional] 로 클램프
      let v = typeof prev === "number" ? prev : parseInt(prev || "0", 10);
      if (!Number.isFinite(v) || v < 0) v = 0;
      if (v > myMaxAdditional) v = myMaxAdditional;
      return v;
    });

    // participants 배열 길이도 additionalCount에 맞추어 보정
    setParticipants((prev) => {
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

  // 층 정렬용 순위 함수: "1층" → 1, "2층" → 2, 그 외는 맨 뒤로
  const floorRank = (label) => {
    const s = String(label ?? "")
      .replace(/\\/g, "")
      .trim();
    const m = s.match(/^(\d+)\s*층$/); // "1층", "2층" ...
    if (m) return parseInt(m[1], 10);

    // 혹시 남아있을 수 있는 "1st FLOOR" 같은 것까지 느슨하게 케어
    const m2 = s.match(/^(\d+)/);
    if (m2) return parseInt(m2[1], 10);

    return Number.POSITIVE_INFINITY; // 숫자 못 뽑으면 뒤로
  };

  // NEW: floors 중심 트리
  const floorTree = useMemo(() => {
    const list = Array.isArray(places) ? places : [];

    // 1) 층 → 방들
    const byFloor = list.reduce((acc, p) => {
      const floorKey = p.floor ?? "";
      if (!acc[floorKey]) acc[floorKey] = [];
      acc[floorKey].push(p);
      return acc;
    }, {});

    // 2) 정렬 포함(활성 우선 → 이름순)
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

  // ---------- 날짜 포맷/주간생성 유틸(기존 그대로) ----------
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

    // 토(6) 또는 일(0)이라면 기준을 다음 주 월요일로 이동
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

  // 교체: 주간 예약 로딩 useEffect
  useEffect(() => {
    const fetchWeekReservations = async () => {
      if (!selectedDate) {
        setWeekReservations({});
        return;
      }
      setLoadingWeekReservations(true);
      try {
        // 선택한 날짜가 속한 주(월~금)로 범위 계산
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

  // 참가자(본인 제외) 중복 검사: 학번과 이름이 모두 동일하면 동일인으로 간주
  const findDuplicateParticipantIndexes = (arr) => {
    const seen = new Map(); // key: "studentId|name" (trim)
    const dupIdx = new Set(); // 중복 인덱스 모음
    arr.forEach((p, i) => {
      const id = (p.studentId ?? "").trim();
      const nm = (p.name ?? "").trim();
      if (!id || !nm) return; // 비어있으면 중복 판단 제외
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

    // ✅ role 기반 교사전용 가드 (추가)
    const role = user?.role || "student";
    const isTeacherOrAdmin = role === "teacher" || role === "admin";
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
      const perMin = getPerReservationMin(selectedRoom); // 팀당 최소(본인 포함)
      const capacity = getCapacity(selectedRoom); // 총 정원(null=무제한)
      const groupSize = 1 + (parseInt(additionalCount, 10) || 0); // 본인 포함 총 인원

      if (groupSize < perMin) {
        setError(`이 공간은 팀당 최소 ${perMin}명부터 예약 가능합니다.`);
        setLoading(false);
        return;
      }

      // 2) 해당 시간대 사용 중 정원 계산 (여러 팀 허용)
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

      // 3) 참가자(본인 제외) 입력 검증
      if (
        participants.length !== groupSize - 1 ||
        participants.some((p) => !p.studentId?.trim() || !p.name?.trim())
      ) {
        setError("참가자 학번/이름을 모두 입력해주세요.");
        setLoading(false);
        return;
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
        teacherName: teacherName.trim(), // ✅ 추가
        reason: reason.trim(),
        status: "active",
        createdAt: new Date(),

        // 인원 관련
        groupSize, // 본인 포함 총 인원
        additionalCount: groupSize - 1, // 본인 제외 인원
        participants, // [{studentId, name}]
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
        participants // [{ studentId, name }]
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

  // [2] 헬퍼 추가 (컴포넌트 내부 공용 함수 영역)
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
                const preview = names.slice(0, 3).join(", "); // 처음 3개만 표시
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

  // 변경: renderRoomSelection
  const renderRoomSelection = () => {
    const dateKey = selectedDate ? formatDateToYYYYMMDD(selectedDate) : null;
    const dayReservations = (dateKey && weekReservations[dateKey]) || [];

    // ✅ 사용자 role 기반 접근 권한
    const role = user?.role || "student";
    const isTeacherOrAdmin = role === "teacher" || role === "admin";

    // 헬퍼: 특정 방이 이미 예약됐는지
    const isRoomBooked = (roomId) =>
      dayReservations.some(
        (res) =>
          res.roomId === roomId &&
          res.time === selectedTime?.id &&
          res.status === "active"
      );

    // 선택된 층의 모든 방을 윙으로 그룹핑
    const roomsInFloor = selectedFloor.rooms;

    const byWing = roomsInFloor.reduce((acc, r) => {
      const wingKey = r.wing ?? "";
      if (!acc[wingKey]) acc[wingKey] = [];
      acc[wingKey].push(r);
      return acc;
    }, {});

    // 원하는 표시 순서
    const ZONE_ORDER = ["소그룹 ZONE", "대그룹 ZONE", "별도예약"];

    // byWing 객체 기준으로, 세 ZONE을 고정 순서로 배열화 (없는 ZONE은 빈 배열)
    const zoneSections = ZONE_ORDER.map((zone) => ({
      zone,
      rooms: byWing[zone] || [],
    }));

    // [3] renderRoomSelection 내부: (선택된 날짜/시간/층 계산 이후) 보조 함수들
    const getUsedCapacity = (roomId) =>
      dayReservations
        .filter(
          (res) =>
            res.roomId === roomId &&
            res.time === selectedTime?.id &&
            res.status === "active"
        )
        .reduce((sum, r) => sum + (Number(r.groupSize) || 1), 0);

    const participantsComplete = areParticipantsComplete(
      additionalCount,
      participants
    );

    return (
      <div>
        <h3 style={{ marginBottom: "0.75rem" }}>
          {selectedFloor.name}에서 장소를 선택해주세요
        </h3>

        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          선택한 일시: {formatDate(selectedDate)} · {selectedTime?.name} (
          {selectedTime?.time})
        </p>

        {/* ZONE들을 가로로 3열 배치 */}
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
              {/* 섹션 헤더 (ZONE명) */}
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

              {/* ZONE 내 방 카드들 */}
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
                    // 총 정원(숫자면 제한, null이면 무제한)과 현재 사용 인원 합계를 계산
                    const cap = getCapacity(room); // null => 무제한
                    const used = getUsedCapacity(room.id); // 활성 예약들의 groupSize 합(없으면 1로 가정)

                    // "예약 1건이라도 있으면 비활성화"는 '무제한(cap == null)'에만 적용
                    // '최대 인원(cap 숫자)'이 있는 방은 기존 방식대로 used >= cap 일 때만 비활성화
                    let blocked, blockMessage;

                    if (cap == null) {
                      // 무제한: 한 팀만 허용 → 사용 인원이 1명 이상이면 이미 사용 중
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
                      // 제한 있음: 정원이 찼을 때만 비활성화
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

            {/* [인원수/참가자 입력] — club / reason 위에 추가 */}
            {(() => {
              const minTeam = getPerReservationMin(selectedRoom); // 팀당 최소 인원(본인 포함)
              const cap = getCapacity(selectedRoom); // 총 정원(null=무제한)
              const used = (() => {
                // renderRoomSelection 상단에 있는 getUsedCapacity(roomId) 활용
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

                  {/* 본인 제외 인원수 */}
                  <label
                    style={{
                      display: "block",
                      fontWeight: 500,
                      marginBottom: 6,
                    }}
                  >
                    본인 제외 인원수
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={myMaxAdditional}
                    value={additionalCount}
                    onChange={(e) => {
                      let raw = e.target.value;

                      // 0을 입력했을 때는 강제로 1로 교체
                      if (raw === "0") {
                        setAdditionalCount(1);
                        setParticipants((prev) => {
                          const next = prev.slice(0, 1);
                          while (next.length < 1)
                            next.push({ studentId: "", name: "" });
                          return next;
                        });
                        return;
                      }

                      // 빈 문자열은 그대로 허용 (지우는 중일 때)
                      if (raw === "") {
                        setAdditionalCount("");
                        setParticipants([]);
                        return;
                      }

                      // 숫자 파싱 후 범위 제한
                      let parsed = parseInt(raw, 10);
                      if (!Number.isFinite(parsed)) parsed = 1;

                      const v = Math.max(0, Math.min(myMaxAdditional, parsed));

                      setAdditionalCount(v);
                      setParticipants((prev) => {
                        const next = prev.slice(0, v);
                        while (next.length < v)
                          next.push({ studentId: "", name: "" });
                        return next;
                      });
                    }}
                    style={{
                      width: 120,
                      padding: "0.6rem",
                      border: "1px solid var(--border-color)",
                      borderRadius: 4,
                    }}
                  />

                  {/* 참가자(본인 제외) 입력 */}
                  {participants.length > 0 && (
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
                              type="text"
                              value={p.studentId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setParticipants((prev) => {
                                  const next = prev.slice();
                                  next[idx] = { ...next[idx], studentId: val };
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
                  )}
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

  // 변경: renderDateSelection (방 의존 제거, 클릭 시 step=2로)
  const renderDateSelection = () => {
    const availableDates = getAvailableDates();
    const now = new Date();

    // 오늘 00:00, 오늘 08:00 기준 시각 계산
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
            const isToday = dateStart.getTime() === todayStart.getTime();
            const isDisabledDate = isPastDate;

            // 안내 문구 (선택)
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

  // 변경: renderTimeSelection (예약됨/방 상태 판단 제거, 클릭 시 step=3로)
  // 2) 시간 선택
  const renderTimeSelection = () => {
    const now = new Date();
    const isTodaySelected =
      selectedDate &&
      formatDateToYYYYMMDD(selectedDate) === formatDateToYYYYMMDD(now);

    // ✅ admin이면 시간 제약 무시
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
            // ✅ admin이면 지난 시간도 선택 가능
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

  // 보조 스타일/유틸 (파일 상단 근처에 추가)
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
        <strong>안내:</strong> 취소는 당일 오후 13시 40분까지 가능합니다. 그
        이후에는 관리자에게 문의해주세요.
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
            // 변경: 이전 단계 버튼 로직
            onClick={() => {
              resetError();
              if (step === 2) {
                // 시간 선택으로 가기 전
                setSelectedTime(null);
                setSelectedFloor(null);
                setSelectedRoom(null);
                setStep(1);
              } else if (step === 3) {
                // 층 선택으로 가기 전
                setSelectedFloor(null);
                setSelectedRoom(null);
                setStep(2);
              } else if (step === 4) {
                // 장소 선택으로 가기 전
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
          onClick={() => setIsMapModalOpen(false)} // 오버레이 클릭 시 닫기
          role="dialog"
          aria-modal="true"
          aria-label="건물 지도"
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()} // 콘텐츠 클릭은 이벤트 전파 막기
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
  // ✨ 추가
  overscrollBehavior: "contain", // 바운스 방지
  touchAction: "none", // 터치 제스처 비활성화
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
  // 내부 스크롤은 허용 (이미 overflow:auto)
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
