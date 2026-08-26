import {Routes, Route} from "react-router-dom";
import Layout from "./components/Layout";
import {Dashboard} from "./pages/Dashboard";
import {Inventory} from "./pages/Inventory";
import {Consumables} from "./pages/Consumables";
import {Assets} from "./pages/Assets";
import {Software} from "./pages/Software";
import { Purchases } from "./pages/Purchases";
import Vendors from "./pages/Vendors";
import Users from "./pages/Users";
import Locations from "./pages/Locations";
import Reports from "./pages/Reports";
import Lifecycle from "./pages/Lifecycle";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />}/>
        <Route path="/inventory" element={<Inventory />}/>
        <Route path="/assets" element={<Assets />}/>
        <Route path="/consumables" element={<Consumables />}/>
        <Route path="/software" element={<Software />}/>
        <Route path="/purchases" element={<Purchases />}/>
        <Route path="/vendors" element={<Vendors />}/>
        <Route path="/users" element={<Users />}/>
        <Route path="/locations" element={<Locations />}/>
        <Route path="/reports" element={<Reports />}/>
        <Route path="/lifecycle" element={<Lifecycle />}/>
        <Route path="/settings" element={<Settings />}/>
      </Route>
    </Routes>
  )
}

