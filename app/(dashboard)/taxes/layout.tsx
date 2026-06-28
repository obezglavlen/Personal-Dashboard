import { TaxSidebar } from "./tax-sidebar";

export default function TaxesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">{children}</div>
      <aside className="hidden w-72 shrink-0 lg:block">
        <TaxSidebar />
      </aside>
    </div>
  );
}