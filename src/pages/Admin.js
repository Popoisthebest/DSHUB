// Admin.js
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import NoticeList from "../components/NoticeList";
import InquiryList from "../components/InquiryList";
import ReservationList from "../components/ReservationList";
import PlaceList from "../components/PlaceList";
import UsersList from "../components/UsersList";

function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("notices");

  if (!user || !user.isAdmin) {
    return <Navigate to="/" />;
  }

  const tabBtn = (key, label) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        padding: "0.8rem 1.5rem",
        border: "none",
        backgroundColor: "transparent",
        color: activeTab === key ? "var(--primary-color)" : "var(--text-color)",
        borderBottom:
          activeTab === key ? "2px solid var(--primary-color)" : "none",
        cursor: "pointer",
        fontWeight: activeTab === key ? "600" : "400",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>
        관리자 페이지
      </h1>

      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            borderBottom: "1px solid var(--border-color)",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {tabBtn("notices", "공지사항 관리")}
          {tabBtn("inquiries", "문의 관리")}
          {tabBtn("reservations", "예약 관리")}
          {tabBtn("places", "장소 관리")}
          {tabBtn("users", "인원 관리")}
        </div>

        {activeTab === "notices" && <NoticeList />}
        {activeTab === "inquiries" && <InquiryList />}
        {activeTab === "reservations" && <ReservationList />}
        {activeTab === "places" && <PlaceList />}
        {activeTab === "users" && <UsersList />}
      </div>
    </div>
  );
}

export default Admin;
