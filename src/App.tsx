import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { DataProvider } from "./context/DataContext";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import Locations from "./pages/Locations";
import { Purchases } from "./pages/Purchases";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Vendors from "./pages/Vendors";

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          {/* Consumables is now the Inventory page's "Consumables" type filter. */}
          <Route path="/consumables" element={<Navigate to="/inventory?type=consumable" replace />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}
