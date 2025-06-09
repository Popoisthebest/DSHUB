import React, { createContext, useState, useContext, useEffect } from "react";
import { auth } from "../firebase/config";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { createUserProfile, getUserProfile } from "../firebase/db";

const AuthContext = createContext(null);

// 임시 선생님 계정
const TEACHER_ACCOUNT = {
  id: "admin",
  password: "1234",
  name: "관리자",
  role: "admin",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 이 리스너는 초기 로드, 로그인, 로그아웃 이벤트를 모두 처리합니다.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setLoading(true); // 로딩 시작

      if (firebaseUser) {
        // Firebase 사용자가 인증됨 (팝업 로그인 또는 영구 세션에서)
        if (firebaseUser.email && firebaseUser.email.endsWith("@dshs.kr")) {
          let userRole = "student";
          if (firebaseUser.email === "admin@dshs.kr") {
            userRole = "admin";
          }

          const userProfile = await getUserProfile(firebaseUser.uid);

          const appUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: userRole,
            isAdmin: userRole === "admin",
            studentId: userProfile?.studentId || null,
            name: userRole === "admin" ? "관리자" : userProfile?.name || null,
            profileComplete: !!(
              userProfile &&
              userProfile.studentId &&
              userProfile.name
            ),
          };
          setUser(appUser);
          localStorage.setItem("user", JSON.stringify(appUser));
          localStorage.removeItem("teacherUser"); // Google 사용자가 로그인하면 선생님 사용자 지우기
        } else {
          // @dshs.kr 이메일이 아님, 로그아웃
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("teacherUser");
          alert("@dshs.kr 도메인 계정만 로그인할 수 있습니다.");
        }
      } else {
        // Firebase 사용자가 없음 (로그아웃되었거나 로그인 실패/시작되지 않음)
        // 대체로 localStorage에서 선생님 사용자 확인
        const savedTeacherUser = localStorage.getItem("teacherUser");
        if (savedTeacherUser) {
          const parsedTeacherUser = JSON.parse(savedTeacherUser);
          setUser(parsedTeacherUser);
          localStorage.removeItem("user"); // 오래된 Google 로그인 정보 지우기
        } else {
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("teacherUser");
        }
      }
      setLoading(false); // 로딩 종료
    });

    return () => unsubscribe(); // 언마운트 시 리스너 정리
  }, []); // 빈 종속성 배열, 마운트 시 한 번 실행

  const googleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google 로그인 오류:", error);
      // 에러 메시지를 더 구체적으로 제공
      let errorMessage = error.message;
      if (error.code === "auth/popup-blocked") {
        errorMessage =
          "팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.";
      } else if (error.code === "auth/popup-closed-by-user") {
        errorMessage = "로그인 팝업이 닫혔습니다.";
      }
      alert(errorMessage);
      setUser(null);
      localStorage.removeItem("user");
      setLoading(false);
    }
  };

  const teacherLogin = async (id, password) => {
    setLoading(true);
    try {
      if (id === TEACHER_ACCOUNT.id && password === TEACHER_ACCOUNT.password) {
        const teacherUser = {
          uid: TEACHER_ACCOUNT.id,
          email: `${TEACHER_ACCOUNT.id}@dshs.kr`,
          displayName: TEACHER_ACCOUNT.name,
          role: TEACHER_ACCOUNT.role,
          isAdmin: true,
          profileComplete: true,
        };
        setUser(teacherUser);
        localStorage.setItem("teacherUser", JSON.stringify(teacherUser));
        localStorage.removeItem("user");
        return teacherUser;
      } else {
        throw new Error("선생님 ID 또는 비밀번호가 올바르지 않습니다.");
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeUserProfile = async (studentId, name) => {
    setLoading(true);
    try {
      if (user && user.uid) {
        await createUserProfile(user.uid, studentId, name);

        const updatedUserProfile = await getUserProfile(user.uid);

        const updatedUser = {
          ...user,
          studentId: updatedUserProfile?.studentId || null,
          name: updatedUserProfile?.name || null,
          profileComplete: !!(
            updatedUserProfile &&
            updatedUserProfile.studentId &&
            updatedUserProfile.name
          ),
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        throw new Error("사용자 정보가 없습니다.");
      }
    } catch (error) {
      console.error("프로필 저장 오류:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("teacherUser"); // 선생님 정보도 로그아웃 시 제거
  };

  const value = {
    user,
    googleLogin,
    teacherLogin,
    logout,
    loading,
    completeUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
