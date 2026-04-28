// Streamed instantly when navigating between top-level routes (Today,
// Vault, Tags, Docs list). Without this, Next.js leaves the *current*
// page visible-but-frozen until the destination's Server Component
// finishes — which makes a fast app feel slow on every back/sidebar click.
export default function MainLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      <div className="skeleton h-5 w-24 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton h-12 w-full rounded-[10px]"
            style={{ width: `${100 - (i % 3) * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}
