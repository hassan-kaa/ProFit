import Image from "next/image";

/** Full ProFit lockup (mark + wordmark) — save the brand asset to public/logo.png. */
export default function Logo({
  heightClass = "h-9",
  className = "",
}: {
  heightClass?: string;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="ProFit"
      width={160}
      height={160}
      priority
      className={`w-auto ${heightClass} ${className}`}
    />
  );
}
