import qrcode from "qrcode-generator";

/**
 * A QR code drawn on the server as one SVG path (PG-14): nothing is fetched and no script runs in
 * the browser. `label` names it for a screen reader; the quiet zone is the four modules the
 * standard asks for.
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) if (qr.isDark(row, col)) d += `M${col + 4} ${row + 4}h1v1h-1z`;
  return (
    <svg viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#0E1B32" />
    </svg>
  );
}
