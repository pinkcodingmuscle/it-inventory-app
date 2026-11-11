import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  // Below the lg breakpoint the sidebar is a slide-over drawer opened from the header.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar drawerOpen={drawerOpen} onCloseDrawer={() => setDrawerOpen(false)} />
      <main className="min-w-0 flex-1">
        <Header onOpenMenu={() => setDrawerOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}
