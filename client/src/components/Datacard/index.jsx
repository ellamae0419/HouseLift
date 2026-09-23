import "./index.css";
function DataCard({
  title = "Label",
  value,
  unit,
  main,
  footer = "No description",
  showDot = true,
  variant,
  className = "",
  style = {},
}) {
  const variantClass = variant ? `data-card--${variant}` : "";

  return (
    <div className={`data-card ${variantClass} ${className}`} style={style}>
      
      <p className="data-card__title">{title}</p>

      
      {main ? (
        <div className="data-card__main-custom">{main}</div>
      ) : (
        <div className="data-card__main">
          <span className="data-card__value">{value ?? "—"}</span>
          {unit && <span className="data-card__unit">{unit}</span>}
        </div>
      )}

      
      <div className="data-card__footer">
        <span>{footer}</span>
      </div>
    </div>
  );
}

export { DataCard };
export default DataCard;
