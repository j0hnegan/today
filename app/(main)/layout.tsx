import { SWRProvider } from "@/components/shared/SWRProvider";
import { MainShell } from "@/components/shared/MainShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <MainShell>{children}</MainShell>
    </SWRProvider>
  );
}
