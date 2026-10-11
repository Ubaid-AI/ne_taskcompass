export default function LogoMark({ size = 36, variant = "color", className = "", src }) {
  const url = src || (typeof window !== "undefined" && window.tc_brand && window.tc_brand.logo);
  if (url) {
    return (
      <img
        src={url}
        alt="National Enterprises"
        width={size}
        height={size}
        className={`object-contain ${className}`}
      />
    );
  }

  const main = variant === "white" ? "#ffffff" : "#0f9c86";
  const letter = variant === "white" ? "#0b675a" : "#ffffff";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      role="img"
      aria-label="National Enterprises"
    >
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke={main}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray="42 14.6"
        transform="rotate(26 24 24)"
      />
      <circle cx="24" cy="24" r="9.6" fill={main} />
      <text
        x="24"
        y="24.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={letter}
      >
        e
      </text>
    </svg>
  );
}
