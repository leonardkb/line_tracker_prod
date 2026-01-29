
import { useEffect, useMemo, useState } from "react";
import { safeNum, calcCapacityPerHourFromTimes, calcCapacityPerHourForMultipleOperations } from "../utils/calc";
import HourlyGrid from "./HourlyGrid";

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `row_${Date.now()}_${Math.random().toString(16).slice(2)}`
  );
}

function newRow(slots, operatorNo = "") {
  const id = makeId();
  const stitched = {};
  (slots || []).forEach((s) => (stitched[s.id] = ""));

  return {
    id,
    operatorNo: operatorNo ? String(operatorNo) : "",
    operatorName: "",
    operation: "",
    t1: "",
    t2: "",
    t3: "",
    t4: "",
    t5: "",
    stitched,
  };
}

function ensureRowHasAllSlotKeys(row, slots) {
  const next = { ...row, stitched: { ...(row.stitched || {}) } };
  (slots || []).forEach((s) => {
    if (!(s.id in next.stitched)) next.stitched[s.id] = "";
  });
  return next;
}

function normalizeNo(v) {
  const s = String(v ?? "").trim();
  return s === "" ? "" : s;
}

function sumStitchedForRow(row, slots) {
  let sum = 0;
  (slots || []).forEach((s) => {
    const v = Number(row.stitched?.[s.id]);
    if (Number.isFinite(v)) sum += v;
  });
  return sum;
}

function sumStitchedForRowAtSlot(row, slotId) {
  const v = Number(row.stitched?.[slotId]);
  return Number.isFinite(v) ? v : 0;
}

export default function OperationPlanner({
  target,
  slots,
  selectedOperatorNo = "ALL",
  onOperatorNosChange,
  currentRunId, // ✅ Added: receive current run ID from parent
}) {
  const [rows, setRows] = useState(() => [newRow(slots || [])]);
  const [searchText, setSearchText] = useState("");
  const [operatorFilterNo, setOperatorFilterNo] = useState("ALL");
  const [savingOperations, setSavingOperations] = useState(false);
  const [savingHourly, setSavingHourly] = useState(false);
  const [saveOpsMessage, setSaveOpsMessage] = useState("");
  const [saveHourlyMessage, setSaveHourlyMessage] = useState("");

  useEffect(() => {
    setRows((prev) => prev.map((r) => ensureRowHasAllSlotKeys(r, slots)));
  }, [slots]);

  // ✅ send operator numbers up (for quick buttons)
  useEffect(() => {
    const nos = rows
      .map((r) => normalizeNo(r.operatorNo))
      .filter(Boolean);
    onOperatorNosChange?.(nos);
  }, [rows, onOperatorNosChange]);

  const hasReady = safeNum(target) > 0 && (slots?.length || 0) > 0;

  const computedRows = useMemo(() => {
    // Group rows by operator to check for multiple operations
    const rowsByOperator = {};
    
    rows.forEach((row) => {
      const operatorNo = normalizeNo(row.operatorNo);
      if (!operatorNo) return;
      
      if (!rowsByOperator[operatorNo]) {
        rowsByOperator[operatorNo] = [];
      }
      rowsByOperator[operatorNo].push(row);
    });
    
    return rows.map((row) => {
      const operatorNo = normalizeNo(row.operatorNo);
      let capPerOperator = 0;
      
      if (operatorNo && rowsByOperator[operatorNo]) {
        // Calculate capacity for this operator (handles both single and multiple operations)
        capPerOperator = calcCapacityPerHourForMultipleOperations(rowsByOperator[operatorNo]);
      } else {
        // Unassigned operator - use single operation calculation
        capPerOperator = calcCapacityPerHourFromTimes(
          row.t1,
          row.t2,
          row.t3,
          row.t4,
          row.t5
        );
      }
      
      return { ...row, capPerOperator };
    });
  }, [rows]);

  // ✅ Operator No options for dropdown
  const operatorNoOptions = useMemo(() => {
    const set = new Set();
    computedRows.forEach((r) => {
      const no = normalizeNo(r.operatorNo);
      if (no) set.add(no);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [computedRows]);

  // ✅ combine parent filter + local dropdown + search
  const visibleRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    return computedRows.filter((r) => {
      const opNo = normalizeNo(r.operatorNo);

      const parentOk =
        selectedOperatorNo === "ALL" ? true : opNo === String(selectedOperatorNo);

      const dropdownOk =
        operatorFilterNo === "ALL" ? true : opNo === String(operatorFilterNo);

      const searchOk =
        !q ||
        (r.operation || "").toLowerCase().includes(q) ||
        (r.operatorName || "").toLowerCase().includes(q) ||
        opNo.toLowerCase().includes(q);

      return parentOk && dropdownOk && searchOk;
    });
  }, [computedRows, selectedOperatorNo, operatorFilterNo, searchText]);

  // ✅ align dropdown to parent quick buttons
  useEffect(() => {
    if (selectedOperatorNo === "ALL") return;
    setOperatorFilterNo(String(selectedOperatorNo));
  }, [selectedOperatorNo]);

  // ✅ group visible rows by operator no
  const groups = useMemo(() => {
    const map = new Map();
    visibleRows.forEach((r) => {
      const no = normalizeNo(r.operatorNo) || "UNASSIGNED";
      if (!map.has(no)) map.set(no, []);
      map.get(no).push(r);
    });

    // sort groups numeric, but keep UNASSIGNED last
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "UNASSIGNED") return 1;
      if (b === "UNASSIGNED") return -1;
      return Number(a) - Number(b);
    });

    return keys.map((k) => ({ operatorNo: k, rows: map.get(k) }));
  }, [visibleRows]);

  const updateRow = (id, patch) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const merged = { ...r, ...patch };
        // normalize operator no
        if ("operatorNo" in patch) merged.operatorNo = normalizeNo(patch.operatorNo);
        return ensureRowHasAllSlotKeys(merged, slots);
      })
    );
  };

  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id));

  // ✅ add operation under a specific operator
  const addOperationForOperator = (operatorNo) => {
    setRows((prev) => [...prev, newRow(slots || [], operatorNo)]);
  };

  // ✅ add new operator group (empty operator no will be filled)
  const addNewOperator = () => {
    setRows((prev) => [...prev, newRow(slots || [])]);
  };

  const resetFilters = () => {
    setOperatorFilterNo("ALL");
    setSearchText("");
  };

  // ✅ SAVE OPERATORS & OPERATIONS (Step 2 data)
  const handleSaveOperations = async () => {
    if (!currentRunId) {
      setSaveOpsMessage("❌ Please save Line Inputs (Step 1) first to get a Run ID");
      return;
    }

    if (computedRows.length === 0) {
      setSaveOpsMessage("❌ No operation data to save");
      return;
    }

    setSavingOperations(true);
    setSaveOpsMessage("");

    try {
      // Calculate slot targets based on current data
      const wh = (slots || []).reduce((a, s) => a + safeNum(s.hours), 0);
      const t = safeNum(target);
      const targetPerHour = wh > 0 ? t / wh : 0;
      
      const slotTargets = (slots || []).map((s) => 
        Number((targetPerHour * safeNum(s.hours)).toFixed(2))
      );
      
      const cumulativeTargets = slotTargets.map((_, i) => {
        const cum = slotTargets.slice(0, i + 1).reduce((a, b) => a + b, 0);
        return Number(Math.min(t, cum).toFixed(2));
      });

      // Prepare operations data WITHOUT stitched quantities
      const operations = computedRows.map(row => ({
        operatorNo: row.operatorNo,
        operatorName: row.operatorName,
        operation: row.operation,
        t1: row.t1,
        t2: row.t2,
        t3: row.t3,
        t4: row.t4,
        t5: row.t5,
        capacityPerHour: row.capPerOperator || 0
        // Note: NOT including stitched data here
      }));

      const payload = {
        runId: currentRunId,
        operations,
        slotTargets,
        cumulativeTargets
      };

      const response = await fetch("http://localhost:5000/api/save-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSaveOpsMessage(`✅ Saved ${data.operationsCount || operations.length} operations! Slot targets saved.`);
      } else {
        setSaveOpsMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setSaveOpsMessage(`❌ Failed to save operations: ${err.message}`);
    } finally {
      setSavingOperations(false);
    }
  };

  // ✅ SAVE HOURLY STITCHED DATA (Separate function)
  const handleSaveHourlyData = async () => {
    if (!currentRunId) {
      setSaveHourlyMessage("❌ Please save operations first");
      return;
    }

    setSavingHourly(true);
    setSaveHourlyMessage("");

    try {
      // Prepare hourly data for all operations
      const hourlyPayloads = [];
      
      computedRows.forEach(row => {
        if (row.stitched && row.operatorNo && row.operation) {
          // Find the slot labels from slots array
          (slots || []).forEach((slot, index) => {
            const stitchedQty = row.stitched[slot.id];
            if (stitchedQty !== "" && stitchedQty !== null && stitchedQty !== undefined) {
              hourlyPayloads.push({
                runId: currentRunId,
                operatorNo: row.operatorNo,
                operationName: row.operation,
                slotLabel: slot.label,  // Use slot.label not slot.id
                stitchedQty: parseFloat(stitchedQty) || 0
              });
            }
          });
        }
      });

      if (hourlyPayloads.length === 0) {
        setSaveHourlyMessage("⚠️ No hourly data to save");
        setSavingHourly(false);
        return;
      }

      console.log(`📤 Saving ${hourlyPayloads.length} hourly entries...`);
      
      // Save all hourly entries
      const response = await fetch("http://localhost:5000/api/save-hourly-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: hourlyPayloads })
      });

      const data = await response.json();

      if (data.success) {
        setSaveHourlyMessage(`✅ Saved ${data.savedCount} hourly entries${data.skippedCount ? ` (${data.skippedCount} skipped)` : ''}`);
      } else {
        setSaveHourlyMessage(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setSaveHourlyMessage(`❌ Failed to save hourly data: ${err.message}`);
    } finally {
      setSavingHourly(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Step 2 — Operators & Operations (Multi-Operation)</h2>
          <p className="text-sm text-gray-600">
            One operator can have multiple operations. Track per-operation output and view operator totals.
          </p>
        </div>

        <button
          onClick={addNewOperator}
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium
                     bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!hasReady}
          title={!hasReady ? "Enter working hours + SAM + operators first" : "Add operator group"}
        >
          + Add Operator
        </button>
      </div>

      {!hasReady ? (
        <div className="p-5 text-sm text-gray-600">
          Please complete Step 1 (Operators, SAM, Working Hours). Then operations tracking will unlock.
        </div>
      ) : (
        <>
          {/* FILTER BAR */}
          <div className="px-5 py-4 border-b bg-white">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="w-full sm:w-72">
                  <div className="text-xs font-medium text-gray-600 mb-1">Search</div>
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search operator no / name / operation..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm
                               outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                  />
                </div>

                <div className="w-full sm:w-60">
                  <div className="text-xs font-medium text-gray-600 mb-1">Operator No</div>
                  <select
                    value={operatorFilterNo}
                    onChange={(e) => setOperatorFilterNo(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm
                               outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
                  >
                    <option value="ALL">All operators</option>
                    {operatorNoOptions.map((no) => (
                      <option key={no} value={no}>
                        Operator {no}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={resetFilters}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium
                             hover:bg-gray-50 active:bg-gray-100"
                >
                  Reset
                </button>
              </div>

              <div className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-gray-900">{visibleRows.length}</span> of{" "}
                <span className="font-semibold text-gray-900">{computedRows.length}</span> operation rows
              </div>
            </div>

            {selectedOperatorNo !== "ALL" ? (
              <div className="mt-3 text-xs text-gray-600">
                Quick filter active:{" "}
                <span className="font-semibold text-gray-900">Operator {selectedOperatorNo}</span>
              </div>
            ) : null}
          </div>

          {/* SAVE BUTTONS SECTION */}
          <div className="px-5 py-4 border-b bg-gray-50">
            <div className="flex flex-col gap-4">
              {/* Save Operations Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Save Operators & Operations</div>
                  <div className="text-xs text-gray-600">
                    Save operator details, operations, and hourly targets.
                    {!currentRunId && " (Save Step 1 first to get Run ID)"}
                  </div>
                </div>
                
                <button
                  onClick={handleSaveOperations}
                  disabled={savingOperations || !currentRunId || computedRows.length === 0}
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium
                             bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingOperations ? "Saving..." : "💾 Save Step 2 Data"}
                </button>
              </div>
              
              {saveOpsMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  saveOpsMessage.includes("✅") 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : saveOpsMessage.includes("⚠️")
                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {saveOpsMessage}
                </div>
              )}
              
              {/* Save Hourly Data Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Save Hourly Stitched Data</div>
                  <div className="text-xs text-gray-600">
                    Save actual stitched quantities for each hourly slot.
                    {!currentRunId && " (Save Step 1 & 2 first)"}
                  </div>
                </div>
                
                <button
                  onClick={handleSaveHourlyData}
                  disabled={savingHourly || !currentRunId || computedRows.length === 0}
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium
                             bg-green-600 text-white hover:bg-green-700 active:bg-green-800 
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingHourly ? "Saving..." : "📊 Save Hourly Output"}
                </button>
              </div>
              
              {saveHourlyMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  saveHourlyMessage.includes("✅") 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : saveHourlyMessage.includes("⚠️")
                    ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {saveHourlyMessage}
                </div>
              )}
            </div>
          </div>

          {/* GROUPS */}
          <div className="p-5 space-y-6">
            {groups.length === 0 ? (
              <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
                No matching rows. Try changing filter or search.
              </div>
            ) : (
              groups.map((g) => {
                const opNoLabel =
                  g.operatorNo === "UNASSIGNED" ? "Unassigned" : `Operator ${g.operatorNo}`;

                // operator totals across all its operations
                const operatorTotal = g.rows.reduce((acc, r) => acc + sumStitchedForRow(r, slots), 0);

                // operator per-hour totals (sum across operations for that slot)
                const perHourTotals = (slots || []).map((s) =>
                  g.rows.reduce((acc, r) => acc + sumStitchedForRowAtSlot(r, s.id), 0)
                );

                return (
                  <div key={g.operatorNo} className="rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Operator header */}
                    <div className="px-4 sm:px-5 py-4 bg-gray-50 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{opNoLabel}</div>
                          <div className="text-xs text-gray-600">
                            Total stitched (all operations):{" "}
                            <span className="font-semibold text-gray-900">{operatorTotal}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => addOperationForOperator(g.operatorNo === "UNASSIGNED" ? "" : g.operatorNo)}
                          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium
                                     bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100"
                        >
                          + Add Operation for {opNoLabel}
                        </button>
                      </div>

                      {/* optional: show per-hour totals */}
                      {slots?.length ? (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                          {slots.map((s, i) => (
                            <div
                              key={s.id}
                              className="rounded-lg border bg-white px-2.5 py-2 text-xs flex items-center justify-between"
                              title={`Total for ${s.label}`}
                            >
                              <span className="text-gray-600">{s.label}</span>
                              <span className="font-semibold text-gray-900">{perHourTotals[i]}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Operation cards for this operator */}
                    <div className="p-4 sm:p-5 space-y-5">
                      {g.rows.map((row, idx) => (
                        <div key={row.id} className="rounded-2xl border border-gray-200 overflow-hidden">
                          <div className="p-4 bg-white border-b">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">
                                Operation {idx + 1}
                              </div>
                              <button
                                onClick={() => removeRow(row.id)}
                                className="text-sm font-medium text-gray-700 hover:text-gray-900"
                                disabled={rows.length === 1}
                                title={rows.length === 1 ? "At least one row required" : "Remove operation row"}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                              <Field
                                label="Operator No"
                                placeholder="e.g., 1"
                                value={row.operatorNo}
                                onChange={(v) => updateRow(row.id, { operatorNo: v })}
                              />

                              <Field
                                label="Operator Name (optional)"
                                placeholder="e.g., Juan / Maria"
                                value={row.operatorName}
                                onChange={(v) => updateRow(row.id, { operatorName: v })}
                              />

                              <Field
                                label="Operation"
                                placeholder="e.g., Attach collar"
                                value={row.operation}
                                onChange={(v) => updateRow(row.id, { operation: v })}
                              />

                              <div className="rounded-xl border bg-gray-50 p-3">
                                <div className="text-xs text-gray-500">Capacity / Hour</div>
                                <div className="text-lg font-semibold text-gray-900">
                                  {row.capPerOperator ? row.capPerOperator.toFixed(2) : "0.00"}
                                </div>
                                <div className="text-xs text-gray-500">Per operator</div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <Field label="t1 (sec)" value={row.t1} onChange={(v) => updateRow(row.id, { t1: v })} />
                              <Field label="t2 (sec)" value={row.t2} onChange={(v) => updateRow(row.id, { t2: v })} />
                              <Field label="t3 (sec)" value={row.t3} onChange={(v) => updateRow(row.id, { t3: v })} />
                              <Field label="t4 (sec)" value={row.t4} onChange={(v) => updateRow(row.id, { t4: v })} />
                              <Field label="t5 (sec)" value={row.t5} onChange={(v) => updateRow(row.id, { t5: v })} />
                            </div>
                          </div>

                          <div className="p-4 sm:p-5">
                            <HourlyGrid
                              target={target}
                              slots={slots}
                              stitched={row.stitched}
                              onChangeStitched={(slotId, v) => {
                                updateRow(row.id, {
                                  stitched: { ...row.stitched, [slotId]: v },
                                });
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-800 mb-1">{label}</div>
      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm
                   outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
      />
    </label>
  );
}
