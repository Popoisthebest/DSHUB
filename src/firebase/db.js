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
  onSnapshot,
  setDoc,
  serverTimestamp,
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

// 모든 예약 조회 (지정된 주 또는 현재 주의 모든 예약) - 스냅샷 리스너
export const listenToAllReservations = (
  callback,
  startOfWeekStr,
  endOfWeekStr
) => {
  let q = query(
    collection(db, "reservations"),
    where("date", ">=", startOfWeekStr),
    where("date", "<=", endOfWeekStr),
    orderBy("date", "asc"), // 날짜 기준 오름차순 정렬
    orderBy("time", "asc") // 시간 기준 오름차순 정렬
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const reservationsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(reservationsData);
    },
    (error) => {
      console.error("Error listening to all reservations:", error);
      // 에러 처리 로직 추가 가능
    }
  );

  return unsubscribe;
};

// 특정 사용자 예약 조회 - 스냅샷 리스너
export const listenToUserReservations = (callback, userId) => {
  const q = query(
    collection(db, "reservations"),
    where("studentId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    q,
    (querySnapshot) => {
      const reservationsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      callback(reservationsData);
    },
    (error) => {
      console.error("Error listening to user reservations:", error);
    }
  );

  return unsubscribe;
};

// 특정 날짜, 방, 시간의 예약 조회 (실시간 리스너는 아님, 일회성 조회)
export const getReservationsByDate = async (
  date,
  roomName = null,
  timeId = null
) => {
  try {
    let q = query(
      collection(db, "reservations"),
      where("date", "==", date),
      orderBy("time", "asc")
    );

    if (roomName) {
      q = query(q, where("room", "==", roomName));
    }
    if (timeId) {
      q = query(q, where("time", "==", timeId));
    }

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

// 모든 예약 데이터 가져오기
export const getAllReservations = async (startDate, endDate) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const q = query(
      reservationsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all reservations:", error);
    throw error;
  }
};

// 특정 사용자의 예약 데이터 가져오기
export const getUserReservations = async (studentId) => {
  try {
    const reservationsRef = collection(db, "reservations");
    const q = query(
      reservationsRef,
      where("studentId", "==", studentId),
      where("status", "==", "active")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting user reservations:", error);
    throw error;
  }
};

// 공지사항 생성
export const createNotice = async (noticeData) => {
  try {
    const docRef = await addDoc(collection(db, "notices"), {
      ...noticeData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// 공지사항 삭제
export const deleteNotice = async (noticeId) => {
  try {
    const noticeRef = doc(db, "notices", noticeId);
    await deleteDoc(noticeRef);
  } catch (error) {
    throw error;
  }
};

// 모든 공지사항 조회
export const getAllNotices = async () => {
  try {
    const noticesRef = collection(db, "notices");
    const q = query(noticesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error getting all notices:", error);
    throw error;
  }
};

// 사용자 프로필 생성 또는 업데이트
export const createUserProfile = async (uid, studentId, name) => {
  try {
    await setDoc(
      doc(db, "userProfiles", uid),
      {
        // userProfiles 컬렉션에 UID를 문서 ID로 사용
        studentId: studentId,
        name: name,
        createdAt: new Date(),
      },
      { merge: true }
    ); // 기존 문서가 있으면 업데이트, 없으면 생성
  } catch (error) {
    throw error;
  }
};

// 사용자 프로필 조회
export const getUserProfile = async (uid) => {
  try {
    const docRef = doc(db, "userProfiles", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null; // 프로필이 없는 경우
    }
  } catch (error) {
    throw error;
  }
};

// 문의 추가
export const addInquiry = async (inquiryData) => {
  try {
    const inquiryRef = collection(db, "inquiries");
    await addDoc(inquiryRef, {
      ...inquiryData,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("문의 추가 오류:", error);
    throw error;
  }
};

// 문의 목록 조회
export const getInquiries = async (studentId) => {
  try {
    const inquiriesRef = collection(db, "inquiries");
    const q = query(
      inquiriesRef,
      where("studentId", "==", studentId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("문의 목록 조회 오류:", error);
    throw error;
  }
};
