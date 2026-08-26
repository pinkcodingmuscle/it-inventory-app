import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, CircleHelp } from "lucide-react";
import {
  LayoutDashboard,
  Laptop,
  Package,
  Trash2,
  Monitor,
  ShoppingCart,
  Building2,
  Users,
  MapPin,
  BarChart3,
  Recycle,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Dashboard",   path: "/",           icon: LayoutDashboard },
  { name: "Assets",      path: "/assets",      icon: Laptop          },
  { name: "Inventory",   path: "/inventory",   icon: Package         },
  { name: "Consumables", path: "/consumables", icon: Trash2          },
  { name: "Software",    path: "/software",    icon: Monitor         },
  { name: "Purchases",   path: "/purchases",   icon: ShoppingCart    },
  { name: "Vendors",     path: "/vendors",     icon: Building2       },
  { name: "Users",       path: "/users",       icon: Users           },
  { name: "Locations",   path: "/locations",   icon: MapPin          },
  { name: "Reports",     path: "/reports",     icon: BarChart3       },
  { name: "Lifecycle",   path: "/lifecycle",   icon: Recycle, badge: "NEW" },
  { name: "Settings",    path: "/settings",    icon: Settings        },
];

export default function Sidebar() {
  // Controls whether the sidebar shows labels or icons only
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={`
        sticky top-0
        h-screen
        shrink-0
        overflow-y-auto
        bg-[#2B2B2B]
        text-white
        transition-all duration-300
        ${collapsed ? "w-24" : "w-56"}
      `}
    >
      {/* Header */}
      <div className="flex h-24 items-center justify-between px-6">

        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-400">
            IT
          </div>

          {/* App name */}
          {/* * Hidden when collapsed so the toggle button stays aligned right */}
          {!collapsed && (
            <span className="text-xl font-semibold"> IT Asset Manager </span>
          )}
        </div>

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-2 text-gray-400 hover:bg-[#383838] hover:text-white"
        >
          <Menu size={24} />
        </button>
      </div>


      {/* Search
      <div className="px-5">

        {collapsed ? (
          <button className="flex h-12 w-full items-center justify-center rounded-lg bg-[#343434] text-gray-300">
            <Search size={22} />
          </button>
        ) : (
          <div className="flex h-12 items-center gap-3 rounded-lg bg-[#343434] px-4">
            <Search size={21} className="text-gray-300" />

            <input
              type="text"
              placeholder="Search"
              className="w-full bg-transparent text-white outline-none placeholder:text-gray-400"
            />
          </div>
        )}

      </div> */}


      {/* Main navigation */}
      <nav className="mt-8 px-4">

        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `
                mb-2 flex h-12 items-center rounded-lg
                transition-colors
                ${
                  isActive
                    ? "bg-[#3A3A3A] text-white"
                    : "text-gray-400 hover:bg-[#343434] hover:text-white"
                }
                ${collapsed ? "justify-center" : "gap-4 px-4"}
                `
              }
            >
              <Icon size={22} />

              {!collapsed && (
                <span className="flex flex-1 items-center justify-between">
                  <span className="text-base">{item.name}</span>
                  {/* Badge is type-safe via the navigation array */}
                  {"badge" in item && item.badge && (
                    <span className="rounded bg-purple-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}

      </nav>


      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 w-full px-4 pb-5">

        {/* Notifications
        <NavLink
          to="/notifications"
          className={`
            mb-2 flex h-12 items-center rounded-lg
            text-gray-400 hover:bg-[#343434] hover:text-white
            ${collapsed ? "justify-center" : "gap-4 px-4"}
          `}
        >
          <Bell size={22} />

          {!collapsed && (
            <>
              <span className="flex-1">
                Notifications
              </span>

              <span className="rounded bg-purple-300 px-2 py-1 text-xs text-gray-800">
                5
              </span>
            </>
          )}
        </NavLink> */}


        {/* Need Help card */}
        {!collapsed ? (
          <div className="mb-3 rounded-lg bg-[#343434] p-3">
            <p className="text-sm font-semibold text-white">Need Help?</p>
            <p className="mt-1 text-xs text-gray-400">Submit a request or contact support.</p>
            <button className="mt-3 w-full rounded-md bg-[#2B2B2B] py-1.5 text-xs font-medium text-white hover:bg-[#3A3A3A]">
              Contact Support
            </button>
          </div>
        ) : (
          <div className="mb-3 flex justify-center rounded-lg bg-[#343434] p-3">
            <CircleHelp size={20} className="text-gray-400" />
          </div>
        )}


        {/* Settings
        <NavLink
          to="/settings"
          className={`
            mb-5 flex h-12 items-center rounded-lg
            text-gray-400 hover:bg-[#343434] hover:text-white
            ${collapsed ? "justify-center" : "gap-4 px-4"}
          `}
        >
          <Settings size={22} />

          {!collapsed && (
            <span>
              Settings
            </span>
          )}
        </NavLink> */}


        {/* User profile */}
        <div className="rounded-lg bg-[#343434] p-3">

          <div className="flex items-center gap-3">

            {/* Avatar */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-400 text-sm font-semibold">
              EM

              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-300 ring-2 ring-[#343434]" />
            </div>


            {/* User information */}
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  Esther Mukuye
                </p>

                <p className="truncate text-xs text-gray-400">
                  IT Administrator
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

    </aside>
  );
}




