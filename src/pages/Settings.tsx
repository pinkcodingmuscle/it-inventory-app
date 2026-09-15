import { useMemo, useState } from "react";
import { DataState } from "../components/DataState";
import { useData } from "../context/useData";
import { appData } from "../data/store";

export default function Settings() {
  const { revision } = useData();
  const [organizationName, setOrganizationName] = useState(
    "Kayaku Advanced Materials"
  );

  const [defaultLocation, setDefaultLocation] = useState("IT Storage");
  const [currency, setCurrency] = useState("USD");

  const [laptopCycle, setLaptopCycle] = useState(3);
  const [desktopCycle, setDesktopCycle] = useState(3);
  const [lifecycleWarning, setLifecycleWarning] = useState(90);

  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(3);

  const [expirationAlerts, setExpirationAlerts] = useState(true);
  const [expirationWarning, setExpirationWarning] = useState(30);

  const categories = useMemo(
    () => Array.from(new Set(Object.values(appData.catalogItems).map((c) => c.category))),
    [revision]
  );

  const locations = useMemo(
    () => Object.values(appData.locations).map((l) => l.name),
    [revision]
  );

  function handleSave() {
    console.log({
      organizationName,
      defaultLocation,
      currency,
      laptopCycle,
      desktopCycle,
      lifecycleWarning,
      lowStockAlerts,
      lowStockThreshold,
      expirationAlerts,
      expirationWarning,
    });
  }

  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">
          Manage inventory preferences, lifecycle rules, and notifications.
        </p>
      </div>

    
      <div className="space-y-6">
        {/* General */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">General</h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Organization Name
              </label>

              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Default Location
              </label>

              <select
                value={defaultLocation}
                onChange={(e) => setDefaultLocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              >
                <option>IT Storage</option>
                <option>Help Desk</option>
                <option>Office</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Default Currency
              </label>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500"
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </section>

        {/* Asset Lifecycle */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Asset Lifecycle
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Laptop replacement cycle
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={laptopCycle}
                  onChange={(e) => setLaptopCycle(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />

                <span className="text-sm text-gray-500">years</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Desktop replacement cycle
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={desktopCycle}
                  onChange={(e) => setDesktopCycle(Number(e.target.value))}
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />

                <span className="text-sm text-gray-500">years</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Lifecycle warning
              </label>

              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Notify when asset is within
                </span>

                <input
                  type="number"
                  value={lifecycleWarning}
                  onChange={(e) =>
                    setLifecycleWarning(Number(e.target.value))
                  }
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />

                <span className="text-sm text-gray-500">
                  days of replacement
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Inventory Alerts */}
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Inventory Alerts
          </h2>

          <div className="mt-6 space-y-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={lowStockAlerts}
                onChange={(e) => setLowStockAlerts(e.target.checked)}
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-gray-700">
                Enable low-stock alerts
              </span>
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Default low-stock threshold
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={lowStockThreshold}
                  onChange={(e) =>
                    setLowStockThreshold(Number(e.target.value))
                  }
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />

                <span className="text-sm text-gray-500">units</span>
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={expirationAlerts}
                onChange={(e) => setExpirationAlerts(e.target.checked)}
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-gray-700">
                Enable expiration alerts
              </span>
            </label>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Expiration warning
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={expirationWarning}
                  onChange={(e) =>
                    setExpirationWarning(Number(e.target.value))
                  }
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5"
                />

                <span className="text-sm text-gray-500">
                  days before expiration
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-6">
          {/* Categories */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Categories</h2>

              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
                + Add Category
              </button>
            </div>

            <div className="mt-5 divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category} className="py-3 text-sm text-gray-700">
                  {category}
                </div>
              ))}
            </div>
          </section>

          {/* Locations */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Locations</h2>

              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
                + Add Location
              </button>
            </div>

            <div className="mt-5 divide-y divide-gray-100">
              {locations.map((location) => (
                <div key={location} className="py-3 text-sm text-gray-700">
                  {location}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Save */}
        <div className="flex justify-end pb-10">
          <button
            onClick={handleSave}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
    </DataState>
  );
}