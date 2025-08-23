import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

function MyReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "reservations"),
      where("studentId", "==", user.studentId),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const reservationData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date,
        }));
        setReservations(reservationData);
        setLoading(false);
      },
      (error) => {
        console.error("예약 목록 조회 오류:", error);
        setError("예약 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const formatDate = (date) => {
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "2rem" }}>내 예약 내역</h2>

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

      {reservations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          예약 내역이 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "8px",
                boxShadow: "var(--shadow)",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    {reservation.wing} - {reservation.floor} -{" "}
                    {reservation.room}
                  </h3>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      backgroundColor:
                        reservation.status === "active" ? "#e8f5e9" : "#ffebee",
                      color:
                        reservation.status === "active" ? "#2e7d32" : "#c62828",
                      fontSize: "0.875rem",
                    }}
                  >
                    {reservation.status === "active" ? "활성" : "취소됨"}
                  </span>
                </div>
                <div style={{ color: "#666", fontSize: "0.875rem" }}>
                  예약일: {formatDate(new Date(reservation.date))}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>예약 시간</h4>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                  }}
                >
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
              </div>

              <div>
                <h4 style={{ margin: "0 0 0.5rem 0" }}>이용 사유</h4>
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {reservation.reason}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyReservations;
