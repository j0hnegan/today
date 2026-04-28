// Streamed instantly when the user navigates to /docs/[id], so the click
// has visual feedback while the Server Component runs its Supabase queries.
// Next.js swaps this for the real page once the server response lands.
export default function DocLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-[80px] pb-8">
      <div className="skeleton h-5 w-16 mb-6" />
      <div className="skeleton h-8 w-2/3 mb-4" />
      <div className="skeleton h-7 w-48 mb-6" />
      <div className="skeleton h-64 w-full rounded-[10px]" />
    </div>
  );
}
