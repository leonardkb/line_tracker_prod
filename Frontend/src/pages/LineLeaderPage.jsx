import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MetaSummary from "../components/MetaSummary";
import Navbar from "../components/Navbar";

export default function LineLeaderPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [payload, setPayload] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return navigate("/", { replace: true });

    const roleNorm = String(user.role || "")
  .toLowerCase()
  .trim()
  .replace(/[\s_-]/g, "");

if (roleNorm !== "lineleader") {
  return navigate("/planner", { replace: true });
}


    const lineNo = user.line_number;
    if (!lineNo) {
      setErrMsg("No line assigned to this user. Please contact admin.");
      setLoading(false);
      return;
    }

    fetchLatestRun(lineNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchLatestRun(lineNo) {
    setLoading(true);
    setErrMsg("");

    try {
      const res = await fetch(
        `http://localhost:5000/api/lineleader/latest-run?line=${encodeURIComponent(
          lineNo
        )}`
      );

      const json = await res.json();
      if (!json.success) {
        setErrMsg(json.error || "Failed to load run for your line.");
        setLoading(false);
        return;
      }

      setPayload(json);
    } catch (e) {
      setErrMsg(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  const header = useMemo(() => {
    const r = payload?.run;
    return {
      line: String(r?.line_no ?? ""),
      date: String(r?.run_date ?? ""),
      style: String(r?.style ?? ""),
      operators: String(r?.operators_count ?? ""),
      sam: String(r?.sam_minutes ?? ""),
      workingHours: String(r?.working_hours ?? ""),
      efficiency: Number(r?.efficiency ?? 0.7),
    };
  }, [payload]);

  const target = useMemo(() => Number(payload?.run?.target_pcs || 0), [payload]);

  const slots = useMemo(() => {
    return (payload?.slots || []).map((s) => ({
      id: s.slot_label,
      label: s.slot_label,
      hours: Number(s.planned_hours || 0),
      startTime: s.slot_start,
      endTime: s.slot_end,
    }));
  }, [payload]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-gray-900">Line Leader</h1>
        <p className="text-sm text-gray-600">
          Showing only your line ({user?.line_number})
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-2xl border bg-white p-5 shadow-sm">Loading…</div>
          ) : errMsg ? (
            <div className="rounded-2xl border bg-white p-5 shadow-sm text-red-600">
              {errMsg}
            </div>
          ) : (
            <MetaSummary header={header} target={target} slots={slots} />
          )}
        </div>
      </div>
    </div>
  );
}
