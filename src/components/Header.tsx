import { Search, Bell, CircleHelp, ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/assets": "Assets",
  "/inventory": "Inventory",
  "/consumables": "Consumables",
  "/software": "Software",
  "/purchases": "Purchases",
  "/vendors": "Vendors",
  "/users": "Users",
  "/locations": "Locations",
  "/reports": "Reports",
  "/lifecycle": "Lifecycle",
  "/settings": "Settings",
};

export default function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "IT Asset Manager";
  const notificationCount = 5;
  return (
    <header className="flex h-20 items-center justify-between border-b bg-white px-8">

      {/* Page title */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {title}
        </h1>
      </div>


      {/* Right side */}
      <div className="flex items-center gap-6">

        {/* Search */}
        <div className="flex h-10 w-96 items-center gap-3 rounded-lg border border-slate-200 bg-white px-4">

          <Search
            size={18}
            className="text-slate-500"
          />

          <input
            type="text"
            placeholder="Search assets, inventory, users, or anything..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />

        </div>


        {/* Notifications */}
        <button className="relative text-slate-600 hover:text-slate-900">

          <Bell size={21} />

          {notificationCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {notificationCount}
            </span>
          )}

        </button>


        {/* Help */}
        <button className="text-slate-600 hover:text-slate-900">
          <CircleHelp size={21} />
        </button>


        {/* User */}
        {/* <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-sm font-medium text-white">
            EM
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Esther Mukuye
            </p>

            <p className="text-xs text-slate-500">
              IT Administrator
            </p>
          </div>

          <ChevronDown
            size={16}
            className="text-slate-500"
          />

        </div> */}

      </div>

    </header>
  );
}