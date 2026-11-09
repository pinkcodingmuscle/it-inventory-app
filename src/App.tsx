import {Routes, Route} from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import Layout from "./components/Layout";
import {Dashboard} from "./pages/Dashboard";
import {Inventory} from "./pages/Inventory";
import {Consumables} from "./pages/Consumables";
import { Purchases } from "./pages/Purchases";
import Vendors from "./pages/Vendors";
import Locations from "./pages/Locations";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />}/>
          <Route path="/inventory" element={<Inventory />}/>
          <Route path="/consumables" element={<Consumables />}/>
          <Route path="/purchases" element={<Purchases />}/>
          <Route path="/vendors" element={<Vendors />}/>
          <Route path="/locations" element={<Locations />}/>
          <Route path="/reports" element={<Reports />}/>
          <Route path="/settings" element={<Settings />}/>
        </Route>
      </Routes>
    </DataProvider>
  )
}

