import type { ComponentType, ReactNode } from "react";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { cn } from "@/lib/utils";

export function TikTokBrandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function InlineBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export const platformMeta = {
  twitter: {
    Icon: Twitter,
    iconClassName: "text-sky-500",
    badgeClassName: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    label: "X",
  },
  instagram: {
    Icon: Instagram,
    iconClassName: "text-pink-600",
    badgeClassName: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
    label: "Instagram",
  },
  facebook: {
    Icon: Facebook,
    iconClassName: "text-blue-600",
    badgeClassName: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    label: "Facebook",
  },
  tiktok: {
    Icon: TikTokBrandIcon,
    iconClassName: "text-foreground",
    badgeClassName: "bg-foreground/10 text-foreground",
    label: "TikTok",
  },
} as const;

type PlatformKey = keyof typeof platformMeta;

export function PlatformPill({
  platform,
  children,
  inactive = false,
  compact = false,
}: {
  platform: PlatformKey;
  children?: ReactNode;
  inactive?: boolean;
  compact?: boolean;
}) {
  const meta = platformMeta[platform];
  const Icon = meta.Icon as ComponentType<{ className?: string }>;
  return (
    <InlineBadge
      className={cn(
        compact ? "px-1.5 py-0 text-[10px]" : undefined,
        inactive ? "bg-muted text-muted-foreground" : meta.badgeClassName,
      )}
    >
      <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", inactive ? "text-muted-foreground/55" : meta.iconClassName)} aria-hidden />
      {children}
    </InlineBadge>
  );
}
