import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Cashier from "./pages/Cashier";
import Manager from "./pages/Manager";
import Owner from "./pages/Owner";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/cashier" element={<Cashier />} />
      <Route path="/manager" element={<Manager />} />
      <Route path="/owner" element={<Owner />} />
    </Routes>
  );
}