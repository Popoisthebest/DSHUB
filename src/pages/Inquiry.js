import React from "react";
import InquiryForm from "../components/InquiryForm";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

function Inquiry() {
  const { user } = useAuth();

  // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <InquiryForm />
    </div>
  );
}

export default Inquiry;
