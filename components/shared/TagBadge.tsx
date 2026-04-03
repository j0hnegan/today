import { Badge } from "@/components/ui/badge";
import type { Tag } from "@/lib/types";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <Badge
      variant="secondary"
      className="text-[10px] font-mono border-0"
      style={{
        backgroundColor: hexToRgba(tag.color, 0.15),
        color: tag.color,
      }}
    >
      {tag.name}
    </Badge>
  );
}
