import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import MyReservations from "./MyReservations";
import MyInquiries from "./MyInquiries";

function MyPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("reservations");

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <div style={{ padding: "2rem" }}>
        <h1 style={{ marginBottom: "2rem" }}>마이페이지</h1>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            borderBottom: "1px solid #e0e0e0",
            paddingBottom: "1rem",
          }}
        >
          <button
            onClick={() => setActiveTab("reservations")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor:
                activeTab === "reservations" ? "#1976d2" : "transparent",
              color: activeTab === "reservations" ? "white" : "#666",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            예약 현황
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "4px",
              backgroundColor:
                activeTab === "inquiries" ? "#1976d2" : "transparent",
              color: activeTab === "inquiries" ? "white" : "#666",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            문의 현황
          </button>
        </div>

        {activeTab === "reservations" ? <MyReservations /> : <MyInquiries />}
      </div>
    </div>
  );
}

export default MyPage;
