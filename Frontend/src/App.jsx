


import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PlannerPage from "./pages/PlannerPage";
import LoginPage from "./components/LoginPage";
import LineInfo from "./pages/LineInfo";



export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/planner" element={<PlannerPage />} /> {/* changed from /home */}
        <Route path="/line_info" element={<LineInfo />} />
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

