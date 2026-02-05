import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NavAdmin from "../components/NavAdmin";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function toYMD(d) {
  if (!d) return "";
  // Handles Date object or ISO string ("2026-02-04T00:00:00.000Z")
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toISOString().slice(0, 10);
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [lines, setLines] = useState([]);
  const [selectedLine, setSelectedLine] = useState("");

  // ✅ calendar date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState("");

  const [runData, setRunData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [operatorDetails, setOperatorDetails] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Generate line options 1-26
  const generateLineOptions = () => {
    const arr = [];
    for (let i = 1; i <= 26; i++) arr.push(String(i));
    return arr;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    const roleNorm = String(storedUser?.role || "")
      .toLowerCase()
      .trim()
      .replace(/[\s_-]/g, "");

    if (roleNorm !== "supervisor") {
      navigate("/planner", { replace: true });
      return;
    }

    setUser(storedUser);
    setLines(generateLineOptions());

    // ✅ default date = today (optional)
    const today = new Date();
    setSelectedDate(today.toISOString().slice(0, 10));

    setLoading(false);
  }, [navigate]);

  const fetchProductionData = async () => {
    if (!selectedLine || !selectedDate) {
      alert("Please select both line and date");
      return;
    }

    setLoadingData(true);

    try {
      const token = localStorage.getItem("token");

      // ✅ get all runs for this line
      const runsResponse = await axios.get(
        `${API_BASE}/api/line-runs/${selectedLine}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!runsResponse.data?.success || !Array.isArray(runsResponse.data?.runs)) {
        throw new Error("No runs returned from server");
      }

      // ✅ normalize and match by YYYY-MM-DD
      const selectedRun = runsResponse.data.runs.find((run) => {
        return toYMD(run.run_date) === selectedDate;
      });

      if (!selectedRun) {
        setRunData(null);
        setSummary(null);
        setOperatorDetails([]);
        alert(`No production data found for Line ${selectedLine} on ${selectedDate}`);
        return;
      }

      // ✅ fetch detailed run data
      const runDetailResponse = await axios.get(
        `${API_BASE}/api/get-run-data/${selectedRun.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!runDetailResponse.data?.success) {
        throw new Error(runDetailResponse.data?.error || "Failed to fetch run details");
      }

      const data = runDetailResponse.data;
      setRunData(data);

      // -------- summary + operator details (same logic as yours) --------
      const operatorsCount = data.operators?.length || 0;
      const targetPcs = Number(data.run?.target_pcs || 0);

      let totalSewed = 0;
      const operatorData = [];

      (data.operations || []).forEach((operatorGroup) => {
        const operator = operatorGroup.operator;

        (operatorGroup.operations || []).forEach((operation) => {
          const sewedData = operation.sewed_data || {};
          let operationSewed = 0;
          Object.values(sewedData).forEach((qty) => {
            operationSewed += parseFloat(qty) || 0;
          });

          totalSewed += operationSewed;

          const stitchedData = operation.stitched_data || {};
          let operationPlanned = 0;
          Object.values(stitchedData).forEach((qty) => {
            operationPlanned += parseFloat(qty) || 0;
          });

          const capacityPerHour = Number(operation.capacity_per_hour || 0);

          operatorData.push({
            operatorNo: operator.operator_no,
            operatorName: operator.operator_name || `Operator ${operator.operator_no}`,
            operationName: operation.operation_name,
            style: data.run.style,
            totalSewed: operationSewed,
            plannedQty: operationPlanned,
            capacityPerHour,
            efficiency: capacityPerHour > 0 ? (operationSewed / capacityPerHour).toFixed(2) : "0",
          });
        });
      });

      setOperatorDetails(operatorData);

      setSummary({
        line: data.run.line_no,
        date: toYMD(data.run.run_date),
        style: data.run.style,
        operatorsCount,
        totalTarget: targetPcs,
        totalSewed,
        workingHours: data.run.working_hours,
        sam: data.run.sam_minutes,
        efficiency: Number(data.run.efficiency || 0) * 100,
        achievement: targetPcs > 0 ? ((totalSewed / targetPcs) * 100).toFixed(2) + "%" : "0%",
      });
      // ----------------------------------------------------------------

    } catch (error) {
      console.error("Error fetching production data:", error);
      alert(error.response?.data?.error || error.message || "Failed to load production data");
      setRunData(null);
      setSummary(null);
      setOperatorDetails([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
     <NavAdmin user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Line and Date Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Select Production Line and Date
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Line
              </label>
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              >
                <option value="">Select Line</option>
                {lines.map((line) => (
                  <option key={line} value={line}>
                    Line {line}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>

              {/* ✅ calendar date picker */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />

              {selectedDate ? (
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(selectedDate)}
                </div>
              ) : null}
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchProductionData}
                disabled={loadingData || !selectedLine || !selectedDate}
                className="w-full px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingData ? "Loading..." : "Load Data"}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ the rest of your UI stays the same */}
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Target</div>
              <div className="text-2xl font-bold text-gray-900">
                {Number(summary.totalTarget || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">Pieces</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="text-sm font-medium text-gray-500 mb-2">Total Sewed</div>
              <div className="text-2xl font-bold text-gray-900">
                {Number(summary.totalSewed || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-1">Pieces</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="text-sm font-medium text-gray-500 mb-2">Operators</div>
              <div className="text-2xl font-bold text-gray-900">{summary.operatorsCount}</div>
              <div className="text-sm text-gray-500 mt-1">On Line</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="text-sm font-medium text-gray-500 mb-2">Achievement</div>
              <div className="text-2xl font-bold text-gray-900">{summary.achievement}</div>
              <div className="text-sm text-gray-500 mt-1">
                Line {summary.line} - {summary.style}
              </div>
            </div>
          </div>
        )}

        {/* Production Details Table */}
        {/* (keep your existing table code here unchanged) */}
        {operatorDetails.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Operator Production Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Line {summary?.line} - {summary?.date} - {summary?.style}
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Style
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Planned Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sewed Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Capacity/hr
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Efficiency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operatorDetails.map((operator, index) => {
                    const variance = operator.totalSewed - operator.plannedQty;
                    const varianceClass = variance >= 0 
                      ? "text-green-600 bg-green-50" 
                      : "text-red-600 bg-red-50";
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">
                            {operator.operatorNo}
                          </div>
                          <div className="text-sm text-gray-500">
                            {operator.operatorName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{operator.operationName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {operator.style}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.plannedQty.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {operator.totalSewed.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {operator.capacityPerHour.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            parseFloat(operator.efficiency) >= 1 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {operator.efficiency}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${varianceClass}`}>
                            {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {summary && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                        Totals:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {operatorDetails.reduce((sum, op) => sum + op.plannedQty, 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {operatorDetails.reduce((sum, op) => sum + op.totalSewed, 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {operatorDetails.reduce((sum, op) => sum + op.capacityPerHour, 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {operatorDetails.reduce((sum, op) => sum + (op.totalSewed - op.plannedQty), 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {selectedLine && selectedDate && !loadingData && !runData && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Data Found</h3>
            <p className="text-gray-600">
              No production data found for Line {selectedLine} on {formatDate(selectedDate)}.
            </p>
          </div>
        )}

        {/* Instructions */}
        {!selectedLine && !selectedDate && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Line and Date</h3>
            <p className="text-gray-600">Please select a production line and date to view production data.</p>
          </div>
        )}
      </main>

      <footer className="mt-8 py-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Production Monitoring System • Supervisor Dashboard
        </div>
      </footer>
    </div>
  );
}
