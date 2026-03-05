import { CSSProperties } from "react";
import logoSrc from "@/assets/logo.png";

/**
 * Renders the logo tinted to the current accent color using CSS mask.
 * The logo image is used as a mask shape and the background is filled
 * with hsl(var(--accent-color)), giving pixel-perfect color matching
 * for any chosen accent color.
 *
 * Usage: <AccentLogo className="h-6 w-6" />
 */
export default function AccentLogo({
  className = "h-6 w-6",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-block ${className}`}
      aria-hidden="true"
      style={{
        backgroundColor: "hsl(var(--accent-color, 265 70% 60%))",
        WebkitMaskImage: `url(${logoSrc})`,
        maskImage: `url(${logoSrc})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        transition: "background-color 0.3s ease",
        ...style,
      }}
    />
  );
}
