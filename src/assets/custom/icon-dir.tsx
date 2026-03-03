import type { SVGProps } from "react";

type IconDirProps = SVGProps<SVGSVGElement> & {
  dir?: "ltr" | "rtl";
};

export function IconDir({ dir = "ltr", style, ...props }: IconDirProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      style={{
        ...style,
        transform: dir === "rtl" ? "scaleX(-1)" : undefined,
        transformOrigin: "center",
      }}
      {...props}
    >
      <path d="M4 12h16" />
      <path d="M12 4v16" />
    </svg>
  );
}
