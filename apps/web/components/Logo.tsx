import Image from "next/image";

export function Logo({ variant = "full", size = 48 }: { variant?: "full" | "icon"; size?: number }) {
  return (
    <Image
      src={variant === "full" ? "/logo-full.png" : "/logo-icon.png"}
      alt="M.Double E Engineering Co.,Ltd."
      width={size}
      height={size}
      className="brand-logo"
      priority
    />
  );
}
