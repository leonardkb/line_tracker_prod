import { useMemo } from "react";
import { calcTargetFromSAM, safeNum } from "../utils/calc";
import { STYLE_EFFICIENCY_PRESETS } from "../utils/efficiency";

export default function HeaderForm({ value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });

  const target = useMemo(() => {
    return calcTargetFromSAM(
      value.operators,
      value.workingHours,
      value.sam,
      value.efficiency
    );
  }, [value.operators, value.workingHours, value.sam, value.efficiency]);

  const targetPerHour = useMemo(() => {
    const wh = safeNum(value.workingHours);
    return wh > 0 ? target / wh : 0;
  }, [target, value.workingHours]);

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-900">Step 1 — Line Inputs</h2>
        <p className="text-sm text-gray-600">
          Fill these first. Target will be calculated automatically using SAM and selected efficiency.
        </p>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field
          label="Line"
          placeholder="e.g., Line 12"
          value={value.line}
          onChange={(v) => set("line", v)}
        />

        <Field
          label="Date"
          type="date"
          value={value.date}
          onChange={(v) => set("date", v)}
        />

        <Field
          label="Style"
          placeholder="e.g., POLO-2026"
          value={value.style}
          onChange={(v) => set("style", v)}
        />

        <Field
          label="Operators (count)"
          placeholder="e.g., 25"
          value={value.operators}
          onChange={(v) => set("operators", v)}
        />

        <Field
          label="Working Hours"
          placeholder="e.g., 8.85"
          value={value.workingHours}
          onChange={(v) => set("workingHours", v)}
        />

        <Field
          label="SAM (minutes/piece)"
          placeholder="e.g., 18.5"
          value={value.sam}
          onChange={(v) => set("sam", v)}
        />

        {/* ✅ Efficiency selector */}
        <label className="block">
          <div className="text-sm font-medium text-gray-800 mb-1">Efficiency</div>
          <select
            value={value.efficiency ?? 0.7}
            onChange={(e) => set("efficiency", Number(e.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm
                       outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
          >
            {STYLE_EFFICIENCY_PRESETS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500 mt-1">
            Select based on style complexity / line capability.
          </div>
        </label>

        {/* ✅ Results */}
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Metric label="Target (pieces)" value={target} />
          <Metric label="Target / hour (pieces)" value={targetPerHour} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-gray-800 mb-1">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm
                   outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300"
      />
    </label>
  );
}

function Metric({ label, value }) {
  const n = Number(value);
  return (
    <div className="rounded-xl border bg-gray-50 p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">
        {Number.isFinite(n) ? n.toFixed(2) : "0.00"}
      </div>
    </div>
  );
}
