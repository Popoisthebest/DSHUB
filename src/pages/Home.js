import React from "react";
import "../styles/common.css";

function Home() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h1
        style={{
          fontSize: "2.5rem",
          marginBottom: "1.5rem",
          color: "var(--secondary-color)",
        }}
      >
        DAESHILL
      </h1>
      <p
        style={{
          fontSize: "1.2rem",
          marginBottom: "2rem",
          color: "var(--text-color)",
        }}
      >
        동아리 활동을 위한 공간 예약 서비스에 오신 것을 환영합니다.
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button
          onClick={() => (window.location.href = "/reserve")}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.1rem",
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
        >
          예약하기
        </button>
        <button
          onClick={() => (window.location.href = "/reservations")}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.1rem",
            backgroundColor: "white",
            color: "var(--primary-color)",
            border: "1px solid var(--primary-color)",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "background-color 0.3s ease",
          }}
        >
          예약 현황 보기
        </button>
      </div>
    </div>
  );
}

export default Home;
