import React, { useEffect, useMemo, useState } from "react";
import {
  listenToPlaces,
  upsertPlace,
  updatePlace,
  deletePlace,
} from "../firebase/db";

// 프로젝트에서 사용하는 존 이름 고정 목록(Reserve와 동일하게 맞추기)
const ZONES = ["소그룹 ZONE", "대그룹 ZONE", "별도예약"];

function PlaceList() {
  // Firestore 원본 리스트
  const [places, setPlaces] = useState([]);
  // 선택된 존
  const [selectedZone, setSelectedZone] = useState(ZONES[0]);
  // 모달 상태
  const [editing, setEditing] = useState(null); // 편집 중인 장소(수정 모달)
  const [creating, setCreating] = useState(false); // 추가 모달 on/off

  useEffect(() => {
    // 장소 실시간 구독
    const unsub = listenToPlaces(setPlaces);
    return unsub;
  }, []);

  // 현재 선택 윙에 해당하는 장소 목록(윙 기준만 필터, floor는 무시)
  const currentZonePlaces = useMemo(() => {
    return places
      .filter((p) => p.wing === selectedZone)
      .sort(
        (a, b) =>
          (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)
      );
  }, [places, selectedZone]);

  // order 자동 계산(같은 윙 내 마지막 뒤에 붙이기)
  const nextOrder = useMemo(() => {
    const max = currentZonePlaces.reduce(
      (m, p) => Math.max(m, p.order ?? 0),
      0
    );
    return (max || 0) + 10;
  }, [currentZonePlaces]);

  // 장소 삭제
  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제할까요? 되돌릴 수 없습니다.")) return;
    await deletePlace(id);
  };

  // handleCreate, handleUpdate에 floor 저장 + perReservationMax 추가
  const handleCreate = async (form) => {
    if (!form.id || !form.name) {
      alert("ID와 장소명을 입력해주세요.");
      return;
    }

    let disabledReason = form.disabledReason || "";
    if (form.teacherOnly) {
      disabledReason = "*교사만 신청 가능합니다.";
    } else if (!form.enabled && !disabledReason) {
      disabledReason = "*신청 불가능한 교실입니다.";
    }

    const perMin = Number(form.perReservationMin);
    const perMax = Number(form.perReservationMax);
    const cap = Number(form.capacity);

    const hasMin = Number.isFinite(perMin) && perMin > 0;
    const hasMax = Number.isFinite(perMax) && perMax > 0;

    if (hasMin && hasMax && perMax < perMin) {
      alert("팀당 최대 인원수는 최소 인원수 이상이어야 합니다.");
      return;
    }

    await upsertPlace({
      id: form.id,
      name: form.name,
      wing: form.wing || selectedZone,
      floor: form.floor || "", // 층수 저장
      // 비어 있으면 ""로 저장(= 제한 없음 처리)
      perReservationMin: hasMin ? perMin : "",
      perReservationMax: hasMax ? perMax : "",
      capacity:
        form.capacity === "" ? "" : Number.isFinite(cap) && cap >= 0 ? cap : "",
      enabled: !!form.enabled,
      teacherOnly: !!form.teacherOnly,
      order: form.order ?? nextOrder,
      disabledReason,
    });

    setCreating(false);
  };

  const handleUpdate = async (form) => {
    if (!editing) return;

    let disabledReason = form.disabledReason || "";
    if (form.teacherOnly) {
      disabledReason = "*교사만 신청 가능합니다.";
    } else if (!form.enabled && !disabledReason) {
      disabledReason = "*신청 불가능한 교실입니다.";
    }

    const perMin = Number(form.perReservationMin);
    const perMax = Number(form.perReservationMax);
    const cap = Number(form.capacity);

    const hasMin = Number.isFinite(perMin) && perMin > 0;
    const hasMax = Number.isFinite(perMax) && perMax > 0;

    if (hasMin && hasMax && perMax < perMin) {
      alert("팀당 최대 인원수는 최소 인원수 이상이어야 합니다.");
      return;
    }

    await updatePlace(editing.id, {
      name: form.name,
      wing: form.wing || selectedZone,
      floor: form.floor || "", // 층수 저장
      perReservationMin: hasMin ? perMin : "",
      perReservationMax: hasMax ? perMax : "",
      capacity:
        form.capacity === "" ? "" : Number.isFinite(cap) && cap >= 0 ? cap : "",
      enabled: !!form.enabled,
      teacherOnly: !!form.teacherOnly,
      order: form.order ?? 0,
      disabledReason,
    });

    setEditing(null);
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* // 1단계: 날짜 선택 */}
      <h2 style={{ marginBottom: "1rem" }}>장소 관리</h2>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {ZONES.map((w) => (
          <button
            key={w}
            onClick={() => setSelectedZone(w)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: selectedZone === w ? "var(--primary-color)" : "#fff",
              color: selectedZone === w ? "#fff" : "var(--text-color)",
              cursor: "pointer",
            }}
          >
            {w}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setCreating(true)}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 6,
            border: "none",
            background: "#22c55e",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + 장소 추가
        </button>
      </div>

      {/* // 2단계: 시간 선택 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {currentZonePlaces.map((room) => (
          <div
            key={room.id}
            style={{
              padding: "1rem",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
              background: room.enabled ? "#fff" : "#f8f9fa",
              opacity: room.enabled ? 1 : 0.6,
              boxShadow: "var(--shadow)",
              position: "relative",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{room.name}</div>
            <div style={{ fontSize: 14, color: "var(--text-color)" }}>
              <div style={{ fontSize: 14, color: "var(--text-color)" }}>
                {(() => {
                  const minTxt = room.perReservationMin
                    ? `${room.perReservationMin}명↑`
                    : "최소무관";
                  const maxTxt = room.perReservationMax
                    ? `${room.perReservationMax}명↓`
                    : "최대무관";
                  const capTxt =
                    room.capacity === ""
                      ? "정원무제한"
                      : `${room.capacity}명 정원`;
                  return (
                    <small style={{ color: "#666" }}>
                      {minTxt} · {maxTxt} · {capTxt}
                    </small>
                  );
                })()}
              </div>
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  padding: "0.2rem 0.5rem",
                  borderRadius: 4,
                  background: room.enabled ? "#e7f5ff" : "#ffe3e3",
                  color: room.enabled ? "#1971c2" : "#c92a2a",
                }}
              >
                {room.enabled ? "활성화" : "비활성화"}
              </span>
              {room.teacherOnly && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "0.2rem 0.5rem",
                    borderRadius: 4,
                    background: "#fff3bf",
                    color: "#ae8c00",
                  }}
                >
                  교사 전용
                </span>
              )}
              <span style={{ fontSize: 12, color: "#666" }}>
                호실: {room.order ?? 0}
              </span>
            </div>

            {/* // 하단 버튼 */}
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                onClick={() => setEditing(room)}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.6rem",
                  borderRadius: 6,
                  border: "1px solid var(--border-color)",
                  background: "#fff",
                  color: "#000",
                  cursor: "pointer",
                }}
              >
                수정
              </button>
              <button
                onClick={() => handleDelete(room.id)}
                style={{
                  padding: "0.5rem 0.6rem",
                  borderRadius: 6,
                  border: "none",
                  background: "#ef4444",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 추가 모달 */}
      {creating && (
        <PlaceModal
          title="장소 추가"
          initial={{
            id: "",
            name: "",
            wing: selectedZone, // ← 기본 ZONE
            floor: "", // 층수 기본값
            perReservationMin: "",
            perReservationMax: "", // NEW
            capacity: "",
            enabled: true,
            teacherOnly: false,
            order: nextOrder,
            disabledReason: "",
          }}
          onCancel={() => setCreating(false)}
          onSave={handleCreate} // ← 폼값 직접 전달
        />
      )}

      {/* 수정 모달 */}
      {editing && (
        <PlaceModal
          title="장소 수정"
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={handleUpdate} // ← 폼값 직접 전달
        />
      )}
    </div>
  );
}

// // 간단한 모달 컴포넌트(추가/수정 공용)
function PlaceModal({ title, initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial);
  const floorOptions = ["1층", "2층", "3층", "4층"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          minWidth: 360,
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        {/* ID */}
        <label style={{ fontSize: 13 }}>ID</label>
        <input
          type="text"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          disabled={!!initial?.id}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {/* 장소명 */}
        <label style={{ fontSize: 13 }}>장소명</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        {/* 층수 선택 */}
        <label style={{ fontSize: 13 }}>층수</label>
        <select
          value={form.floor || ""}
          onChange={(e) => setForm({ ...form, floor: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          <option value="">선택하세요</option>
          {floorOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {/* ZONE 선택 */}
        <label style={{ fontSize: 13 }}>ZONE</label>
        <select
          value={form.wing || ZONES[0]}
          onChange={(e) => setForm({ ...form, wing: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>

        {/* 이용 인원 규칙 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            margin: "4px 0 10px",
          }}
        >
          <div>
            <label style={{ fontSize: 13 }}>팀당 최소 인원수</label>
            <input
              type="number"
              min={1}
              value={form.perReservationMin ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  perReservationMin:
                    e.target.value === ""
                      ? ""
                      : Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              placeholder="예: 3"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13 }}>팀당 최대 인원수</label>
            <input
              type="number"
              min={1}
              value={form.perReservationMax ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  perReservationMax:
                    e.target.value === ""
                      ? ""
                      : Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              placeholder="예: 6 (비우면 제한 없음)"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ fontSize: 13 }}>수용 가능한 인원수(총 정원)</label>
            <input
              type="number"
              min={0}
              value={form.capacity ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  // 빈 값("") 허용 → 예약 화면에서 '정원 제한 없음'으로 처리 가능
                  capacity:
                    e.target.value === ""
                      ? ""
                      : Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              placeholder="예: 45 (비우면 제한 없음)"
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </div>
        </div>

        {/* 미리보기/가이드 */}
        {(() => {
          const minTeam = Number(form.perReservationMin);
          const maxTeam = Number(form.perReservationMax);
          const cap = Number(form.capacity);
          const hasMin = Number.isFinite(minTeam) && minTeam > 0;
          const hasMax = Number.isFinite(maxTeam) && maxTeam > 0;
          const hasCap = Number.isFinite(cap) && cap >= 0;

          return (
            <div
              style={{
                fontSize: 13,
                color: "#444",
                marginBottom: 10,
                lineHeight: 1.5,
              }}
            >
              <div>
                • 팀당 최소 인원:{" "}
                <strong>{hasMin ? `${minTeam}명` : "미설정"}</strong>
              </div>
              <div>
                • 팀당 최대 인원:{" "}
                <strong>{hasMax ? `${maxTeam}명` : "제한 없음"}</strong>
              </div>
              <div>
                • 총 정원:{" "}
                <strong>
                  {hasCap ? (cap === 0 ? "0명" : `${cap}명`) : "제한 없음"}
                </strong>
              </div>
              <div style={{ color: "#666" }}>
                ※ 예약 시 팀당 최소/최대 인원 제한과 남은 총 정원을 함께
                고려합니다.
              </div>
            </div>
          );
        })()}
        {/* 상태 */}
        <div style={{ display: "flex", gap: 12, margin: "6px 0 10px" }}>
          <label>
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              style={{ marginRight: 6 }}
            />
            활성화
          </label>
          <label>
            <input
              type="checkbox"
              checked={!!form.teacherOnly}
              onChange={(e) =>
                setForm({ ...form, teacherOnly: e.target.checked })
              }
              style={{ marginRight: 6 }}
            />
            교사 전용
          </label>
        </div>

        {/* 비활성 사유 */}
        <label style={{ fontSize: 13 }}>비활성 사유</label>
        <input
          type="text"
          value={form.disabledReason || ""}
          onChange={(e) => setForm({ ...form, disabledReason: e.target.value })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />

        {/* 호실 */}
        <label style={{ fontSize: 13 }}>호실</label>
        <input
          type="number"
          value={form.order ?? 0}
          onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          style={{
            width: "100%",
            padding: 8,
            margin: "4px 0 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: "#fff",
              color: "#000",
            }}
          >
            취소
          </button>
          <button
            onClick={() => onSave(form)}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: 6,
              border: "none",
              background: "var(--primary-color)",
              color: "#fff",
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlaceList;
