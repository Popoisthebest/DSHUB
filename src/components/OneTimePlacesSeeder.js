// OneTimePlacesSeeder.js
// // 목적: 기존 ROOMS 데이터를 Firestore /places 컬렉션에 1회 업로드
// // 사용법:
// // 1) 이 파일 생성 후 Admin 페이지에서 <OneTimePlacesSeeder /> 임시 렌더
// // 2) "장소 데이터 업로드" 클릭 (한 번만)
// // 3) 완료 로그 확인 후 컴포넌트 제거

import React, { useState } from "react";
import { upsertPlace } from "../firebase/db";

// // Reserve.js의 ROOMS 상수를 그대로 아래에 복붙하세요.
// // (또는 Reserve.js에서 export로 잠시 빼서 import 해도 됩니다.)
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

export default function OneTimePlacesSeeder() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // // 로그 편의
  const log = (m) => setLogs((prev) => [...prev, m]);

  // // 같은 floor 내에서 10, 20, 30 식으로 부여(중간 삽입 대비)
  const orderOf = (idx) => (idx + 1) * 10;

  const handleSeed = async () => {
    if (loading) return;
    setLoading(true);
    setLogs([]);

    try {
      // // 윙 loop
      for (const [, wing] of Object.entries(ROOMS)) {
        const wingName = wing.name;

        // // 층 loop
        for (const floorObj of wing.floors) {
          const floorName = floorObj.floor;

          // // 장소 loop
          for (let i = 0; i < floorObj.rooms.length; i++) {
            const r = floorObj.rooms[i];

            // // 스키마 매핑
            const enabled = r.disabled ? false : true;

            // disabledReason 자동 설정 로직
            let disabledReason = "";
            if (!enabled) {
              disabledReason = "*신청 불가능한 교실입니다.";
            }
            if (r.teacherOnly) {
              disabledReason = "*교사만 신청 가능합니다.";
            }

            const docData = {
              id: r.id, // 문서 ID와 동일 권장
              name: r.name, // 장소명
              wing: wingName, // 윙
              floor: floorName, // 층
              capacity: r.capacity || "", // 수용 인원
              enabled, // 예약 가능 여부
              teacherOnly: !!r.teacherOnly, // 교사 전용 여부
              order: orderOf(i), // 표시 순서
              disabledReason, // 비활성 사유 (자동 설정됨)
            };

            await upsertPlace(docData);
            log(`OK: ${docData.wing} / ${docData.floor} / ${docData.name}`);
          }
        }
      }

      log("완료: 모든 장소가 /places 컬렉션에 업로드되었습니다.");
    } catch (e) {
      console.error(e);
      log(`오류: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
      <h3 style={{ marginTop: 0 }}>초기 장소 데이터 업로드</h3>
      <p style={{ marginTop: 0, color: "#666" }}>
        한 번만 실행하세요. 완료 후 이 컴포넌트는 삭제해도 됩니다.
      </p>
      <button
        onClick={handleSeed}
        disabled={loading}
        style={{
          padding: "0.6rem 1rem",
          border: "none",
          borderRadius: 6,
          background: "var(--primary-color)",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "업로드 중..." : "장소 데이터 업로드"}
      </button>

      <div
        style={{
          marginTop: 12,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
        }}
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
