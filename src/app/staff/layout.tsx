import { StaffBottomNav } from "@/components/layout/staff-bottom-nav";
import { StaffHeader } from "@/components/layout/staff-header";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-black">
      <StaffHeader />
      <main className="px-8 pb-28 pt-4">{children}</main>
      <StaffBottomNav />
    </div>
  );
}
