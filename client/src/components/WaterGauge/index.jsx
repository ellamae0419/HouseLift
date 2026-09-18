import "./index.css";
 
export default function WaterGauge({ label, min = 0, max = 100, value = 0, unit = "" }) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const pct = Math.round(Math.max(0, Math.min(1, max === min ? 0 : (safeValue - min) / (max - min))) * 100);
  const u = unit ? ` ${unit}` : "";
  const dv = Number.isInteger(safeValue) ? safeValue : +safeValue.toFixed(2);
 
  return (
    <div className="gauge">
      <span className="gauge__label">{label}</span>
 
      <div className="gauge__tube-wrapper">
        <div className="gauge__tube">
          <div className="gauge__fill" style={{ height: `${pct}%` }} />
          <span className="gauge__value-badge" style={{ bottom: `calc(${pct}% + 6px)` }}>
            {dv}{u}
          </span>
        </div>
        <span className="gauge__tick gauge__tick--max">{max}{u}</span>
        <span className="gauge__tick gauge__tick--min">{min}{u}</span>
      </div>
 
      <span className="gauge__pct">{pct}%</span>
    </div>
  );
}
 