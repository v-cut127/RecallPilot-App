import Image from "next/image";
import Link from "next/link";
import { cn } from "@recallpilot/ui";

export function Brand({
  href = "/",
  variant = "light",
  className,
}: {
  href?: string;
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)} aria-label="RecallPilot home">
      <Image
        src={variant === "dark" ? "/brand/logo-white.png" : "/brand/logo-black.png"}
        alt="RecallPilot"
        width={160}
        height={34}
        className="h-8 w-auto"
        priority
      />
    </Link>
  );
}
