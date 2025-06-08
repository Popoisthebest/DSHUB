import React from "react";
import "../styles/common.css";

function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "white",
        padding: "3rem 2rem",
        boxShadow: "0 -2px 4px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "2rem",
        }}
      >
        <div>
          <h3 style={{ marginBottom: "1rem", color: "var(--secondary-color)" }}>
            DAESHILL
          </h3>
          <p style={{ color: "var(--text-color)" }}>
            동아리 활동을 위한 공간 예약 서비스
          </p>
        </div>
        <div>
          <h3 style={{ marginBottom: "1rem", color: "var(--secondary-color)" }}>
            제작자
          </h3>
          <p style={{ color: "var(--text-color)" }}>
            <a
              href="https://github.com/Popoisthebest"
              target="_blank"
              rel="noopener noreferrer"
            >
              #Popoisthebest
            </a>
          </p>
          <p style={{ color: "var(--text-color)" }}>
            <a
              href="https://github.com/CloudR1ng"
              target="_blank"
              rel="noopener noreferrer"
            >
              #CloudR1ng
            </a>
          </p>
          <p style={{ color: "var(--text-color)" }}>
            <a
              href="https://github.com/UntameDuck"
              target="_blank"
              rel="noopener noreferrer"
            >
              #UntameDuck
            </a>
          </p>
        </div>
        <div>
          <h3 style={{ marginBottom: "1rem", color: "var(--secondary-color)" }}>
            예약 시간
          </h3>
          <p style={{ color: "var(--text-color)" }}>
            예약 간격은 한 주 단위이며,
          </p>
          <p style={{ color: "var(--text-color)" }}>
            취소는 당일 오전 8시까지 가능합니다.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
