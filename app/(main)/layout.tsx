import { SWRProvider } from "@/components/shared/SWRProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      {children}
    </SWRProvider>
  );
}
