import { Almarai, Cairo, Poppins } from "next/font/google";
import localFont from "next/font/local";

// Font rules (docs/SPEC.md section 2):
//   English: Lora headings and numbers, Poppins body.
//   Arabic:  Almarai headings, Cairo body, Lora numbers.
export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

export const lora = localFont({
  src: "./fonts/Lora-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-lora",
  display: "swap",
  // No generated fallback face: in the Arabic number stack it would sit before Cairo and
  // take the Arabic letters. Georgia is the fallback, set in app.css.
  adjustFontFallback: false,
});

// The same Lora file limited to digits and the ¼ ½ ¾ fractions. Put first in the Arabic
// font stacks, it makes every number render in Lora while Arabic letters fall through to
// Cairo or Almarai. No generated fallback face: it would have no unicode-range and would
// capture the Arabic text.
export const loraDigits = localFont({
  src: "./fonts/Lora-latin-wght.woff2",
  weight: "400 700",
  variable: "--font-lora-digits",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0030-0039, U+00BC-00BE" }],
});

export const fontVariables = [poppins, cairo, almarai, lora, loraDigits]
  .map((f) => f.variable)
  .join(" ");
