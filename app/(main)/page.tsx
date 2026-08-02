import { redirect } from "next/navigation";

// The Day doc is the Today view now. The classic two-panel page lives on at
// /classic, unlinked.
export default function Home() {
  redirect("/day");
}
