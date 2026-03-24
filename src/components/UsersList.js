// UsersList.js
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

// 역할 옵션 (DB에는 문자열 하나로 저장됨)
const ROLE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "student", label: "학생" },
  { value: "teacher", label: "교사" },
  { value: "admin", label: "관리자" },
];

// 삭제 전용 역할 탭
const DELETE_ROLE_TABS = [
  { value: "student", label: "학생" },
  { value: "teacher", label: "교사" },
  { value: "admin", label: "관리자" },
];

export default function UsersList() {
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [qText, setQText] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState(null); // {id, name, studentId}

  // 삭제 관련 상태
  const [deleteRoleTab, setDeleteRoleTab] = useState("student");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    // ✅ userProfiles 컬렉션에서 createdAt 기준 최신순 정렬
    const qRef = query(
      collection(db, "userProfiles"),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr("인원 목록을 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    return users.filter((u) => {
      const role = u.role || "student"; // 기본값 student
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (!t) return true;
      const key = `${u.name ?? ""} ${u.studentId ?? ""}`.toLowerCase();
      return key.includes(t);
    });
  }, [users, qText, roleFilter]);

  // 삭제 탭에서 선택된 역할군 전체
  const roleSelectedUsers = useMemo(() => {
    return users.filter((u) => (u.role || "student") === deleteRoleTab);
  }, [users, deleteRoleTab]);

  // 현재 로그인한 본인 계정은 삭제 제외
  const deletableRoleUsers = useMemo(() => {
    return roleSelectedUsers.filter((u) => u.id !== user?.uid);
  }, [roleSelectedUsers, user?.uid]);

  // ✅ 권한 변경
  const changeRole = async (userId, nextRole) => {
    try {
      setErr("");
      setSuccessMsg("");
      await updateDoc(doc(db, "userProfiles", userId), { role: nextRole });
    } catch (e) {
      console.error(e);
      setErr("권한 변경 중 오류가 발생했습니다.");
    }
  };

  const openEdit = (u) =>
    setEditing({ id: u.id, name: u.name ?? "", studentId: u.studentId ?? "" });

  const saveEdit = async () => {
    try {
      setErr("");
      setSuccessMsg("");

      if (!editing?.name?.trim() || !editing?.studentId?.trim()) {
        setErr("이름과 학번을 모두 입력하세요.");
        return;
      }

      await updateDoc(doc(db, "userProfiles", editing.id), {
        name: editing.name.trim(),
        studentId: editing.studentId.trim(),
      });
      setEditing(null);
      setSuccessMsg("정보가 수정되었습니다.");
    } catch (e) {
      console.error(e);
      setErr("정보 수정 중 오류가 발생했습니다.");
    }
  };

  // 역할군 전체 삭제
  const deleteUsersByRoleTab = async () => {
    try {
      setErr("");
      setSuccessMsg("");

      const roleLabel =
        DELETE_ROLE_TABS.find((r) => r.value === deleteRoleTab)?.label ||
        deleteRoleTab;

      const totalCount = roleSelectedUsers.length;
      const actualDeleteCount = deletableRoleUsers.length;
      const excludedSelfCount = totalCount - actualDeleteCount;

      if (actualDeleteCount <= 0) {
        setErr(
          excludedSelfCount > 0
            ? `${roleLabel} 계정은 본인 계정만 있어서 삭제할 수 없습니다.`
            : `삭제할 ${roleLabel} 계정이 없습니다.`,
        );
        return;
      }

      const ok = window.confirm(
        `[${roleLabel}] 역할 계정 ${actualDeleteCount}개를 전체 삭제하시겠습니까?\n\n` +
          (excludedSelfCount > 0
            ? `현재 로그인한 본인 계정 ${excludedSelfCount}개는 제외됩니다.\n\n`
            : "") +
          `이 작업은 되돌릴 수 없습니다.`,
      );
      if (!ok) return;

      setDeleting(true);

      const ids = deletableRoleUsers.map((u) => u.id);

      // Firestore batch 삭제
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((id) => {
          batch.delete(doc(db, "userProfiles", id));
        });

        await batch.commit();
      }

      setSuccessMsg(
        `${roleLabel} 계정 ${actualDeleteCount}개를 삭제했습니다.` +
          (excludedSelfCount > 0
            ? ` (본인 계정 ${excludedSelfCount}개 제외)`
            : ""),
      );
    } catch (e) {
      console.error(e);
      setErr("역할군 전체 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>인원 관리</h2>

      {err && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#fee",
            color: "#c00",
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: "#eefbf3",
            color: "#1f7a45",
            borderRadius: 6,
            border: "1px solid #cfead8",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* 삭제 전용 역할 탭 */}
      <div
        style={{
          marginBottom: "1.25rem",
          padding: "1rem",
          border: "1px solid #ffd8d8",
          borderRadius: 10,
          background: "#fff5f5",
        }}
      >
        <div
          style={{ marginBottom: "0.75rem", fontWeight: 700, color: "#c92a2a" }}
        >
          역할군 전체 삭제
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {DELETE_ROLE_TABS.map((tab) => {
            const active = deleteRoleTab === tab.value;
            const count = users.filter(
              (u) => (u.role || "student") === tab.value,
            ).length;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  setDeleteRoleTab(tab.value);
                  setErr("");
                  setSuccessMsg("");
                }}
                style={{
                  padding: "0.65rem 1rem",
                  borderRadius: 8,
                  border: active ? "1px solid #c92a2a" : "1px solid #ddd",
                  background: active ? "#c92a2a" : "#fff",
                  color: active ? "#fff" : "#333",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}

          <div style={{ marginLeft: "auto", color: "#666", fontSize: 14 }}>
            선택된 역할:{" "}
            <strong>
              {DELETE_ROLE_TABS.find((r) => r.value === deleteRoleTab)?.label}
            </strong>{" "}
            / 삭제 대상 <strong>{deletableRoleUsers.length}명</strong>
          </div>
        </div>

        <div
          style={{
            marginTop: "0.9rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#666", fontSize: 14, lineHeight: 1.5 }}>
            탭을 누르면 해당 역할군 전체가 선택됩니다.
            <br />
            현재 로그인한 본인 계정은 삭제 대상에서 자동 제외됩니다.
          </div>

          <button
            onClick={deleteUsersByRoleTab}
            disabled={deleting || deletableRoleUsers.length === 0}
            style={{
              padding: "0.8rem 1.1rem",
              border: "none",
              borderRadius: 8,
              background:
                deleting || deletableRoleUsers.length === 0
                  ? "#f1aeb5"
                  : "#e03131",
              color: "#fff",
              cursor:
                deleting || deletableRoleUsers.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontWeight: 700,
            }}
          >
            {deleting
              ? "삭제 중..."
              : `${
                  DELETE_ROLE_TABS.find((r) => r.value === deleteRoleTab)?.label
                } 전체 삭제`}
          </button>
        </div>
      </div>

      {/* 검색/필터 */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <input
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          placeholder="이름/학번 검색"
          style={{
            flex: "1 1 260px",
            minWidth: 220,
            padding: "0.6rem 0.8rem",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "0.6rem 0.8rem",
            border: "1px solid var(--border-color)",
            borderRadius: 6,
          }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <div style={{ color: "#666", fontSize: 14 }}>
          총 {filtered.length}명
        </div>
      </div>

      {/* 목록 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}
      >
        {filtered.map((u) => {
          const role = u.role || "student";
          const roleLabel =
            ROLE_OPTIONS.find((r) => r.value === role)?.label || "학생";

          const badgeStyle = {
            background:
              role === "admin"
                ? "#ffe8cc"
                : role === "teacher"
                  ? "#e7f5ff"
                  : "#f1f3f5",
            color:
              role === "admin"
                ? "#d9480f"
                : role === "teacher"
                  ? "#1971c2"
                  : "#495057",
            padding: "0.2rem 0.5rem",
            borderRadius: 4,
            fontSize: 12,
          };

          return (
            <div
              key={u.id}
              style={{
                background: "#fff",
                border: "1px solid var(--border-color)",
                borderRadius: 8,
                padding: "0.9rem 1rem",
                boxShadow: "var(--shadow-small)",
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr auto",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{u.name ?? "(이름 없음)"}</div>
                <div style={{ color: "#666", fontSize: 13 }}>
                  학번: {u.studentId ?? "-"}
                </div>
              </div>

              <div style={{ fontSize: 14 }}>
                <span style={badgeStyle}>{roleLabel}</span>
              </div>

              <div>
                <select
                  value={role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  style={{
                    padding: "0.4rem 0.6rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: 6,
                  }}
                >
                  {ROLE_OPTIONS.filter((r) => r.value !== "all").map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => openEdit(u)}
                  style={{
                    padding: "0.45rem 0.7rem",
                    border: "1px solid var(--border-color)",
                    color: "#000",
                    background: "#fff",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  정보 수정
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 수정 모달 */}
      {editing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setEditing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              background: "#fff",
              padding: "1.2rem",
              borderRadius: 8,
              width: "min(520px, 92vw)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
            role="document"
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>정보 수정</h3>
            <label style={{ fontSize: 13 }}>이름</label>
            <input
              value={editing.name}
              onChange={(e) =>
                setEditing((p) => ({ ...p, name: e.target.value }))
              }
              style={{
                width: "100%",
                padding: 10,
                margin: "6px 0 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
            <label style={{ fontSize: 13 }}>학번</label>
            <input
              value={editing.studentId}
              onChange={(e) =>
                setEditing((p) => ({ ...p, studentId: e.target.value }))
              }
              style={{
                width: "100%",
                padding: 10,
                margin: "6px 0 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
            <div
              style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
            >
              <button
                onClick={() => setEditing(null)}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "#fff",
                  color: "#000",
                }}
              >
                취소
              </button>
              <button
                onClick={saveEdit}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: 6,
                  border: "none",
                  background: "var(--primary-color)",
                  color: "#fff",
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
