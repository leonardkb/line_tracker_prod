


import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import LoginPage from "./components/LoginPage";



export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/planner" element={<PlannerPage />} /> {/* changed from /home */}
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

