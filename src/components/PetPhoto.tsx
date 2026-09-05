/* eslint-disable @next/next/no-img-element */
// Plain <img> rather than next/image: pet photos can come from local disk
// storage OR a Vercel Blob URL depending on STORAGE_PROVIDER (see
// src/lib/storage), and keeping this unoptimized avoids having to maintain a
// remotePatterns allowlist that changes with the storage provider. See
// README "Design decisions" for the tradeoff.
export function PetPhoto({
  src,
  alt,
  className = "",
  priority: _priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={_priority ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
