import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./config";

// 예약 생성
export const createReservation = async (reservationData) => {
  try {
    const docRef = await addDoc(collection(db, "reservations"), {
      ...reservationData,
      createdAt: new Date(),
      status: "active", // active, cancelled
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// 예약 수정
export const updateReservation = async (reservationId, updateData) => {
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await updateDoc(reservationRef, updateData);
  } catch (error) {
    throw error;
  }
};

// 예약 삭제
export const deleteReservation = async (reservationId) => {
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    await deleteDoc(reservationRef);
  } catch (error) {
    throw error;
  }
};

// 모든 예약 조회 (지정된 주 또는 현재 주의 모든 예약)
export const getAllReservations = async (
  startOfWeekStr = null,
  endOfWeekStr = null
) => {
  try {
    const formatDateToYYYYMMDD = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    let currentStartOfWeekStr = startOfWeekStr;
    let currentEndOfWeekStr = endOfWeekStr;

    if (!currentStartOfWeekStr || !currentEndOfWeekStr) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - dayOfWeek); // 이번 주 일요일
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(today);
      endDate.setDate(today.getDate() + (6 - dayOfWeek)); // 이번 주 토요일
      endDate.setHours(23, 59, 59, 999);

      currentStartOfWeekStr = formatDateToYYYYMMDD(startDate);
      currentEndOfWeekStr = formatDateToYYYYMMDD(endDate);
    }

    const q = query(
      collection(db, "reservations"),
      where("date", ">=", currentStartOfWeekStr),
      where("date", "<=", currentEndOfWeekStr),
      orderBy("date", "asc"), // 날짜 기준 오름차순 정렬
      orderBy("time", "asc") // 시간 기준 오름차순 정렬
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

// 특정 사용자 예약 조회
export const getUserReservations = async (userId) => {
  try {
    const q = query(
      collection(db, "reservations"),
      where("studentId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

// 특정 날짜의 예약 조회
export const getReservationsByDate = async (date) => {
  try {
    const q = query(
      collection(db, "reservations"),
      where("date", "==", date),
      orderBy("time", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    throw error;
  }
};

// 특정 예약 상세 조회
export const getReservation = async (reservationId) => {
  try {
    const docRef = doc(db, "reservations", reservationId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  } catch (error) {
    throw error;
  }
};
