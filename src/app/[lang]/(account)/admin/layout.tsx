// The admin's charts and tables use the whole window: data-wide lifts the
// account pages' width cap ((account)/layout.tsx) for everything under /admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-wide>{children}</div>;
}
