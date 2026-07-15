import LenisProvider from "@/components/providers/LenisProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LenisProvider>
      <main>{children}</main>
    </LenisProvider>
  );
}

