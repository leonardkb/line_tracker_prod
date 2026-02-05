import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function NavAdmin({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Title */}
        <div className="text-2xl font-bold">
          Supervisor Dashboard
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6 font-medium">
          {/* User Info */}
          <div className="text-sm text-gray-200">
            <div className="font-semibold">{user?.full_name || user?.username || "Supervisor"}</div>
            <div className="text-xs text-gray-400">Supervisor</div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/planner")}
              className="px-4 py-2 text-sm font-medium bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go to Planner
            </button>

            

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-2xl cursor-pointer"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="bg-gray-800 md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4 font-medium">
            {/* User Info Mobile */}
            <div className="pb-3 border-b border-gray-700">
              <div className="font-semibold text-white">{user?.full_name || user?.username || "Supervisor"}</div>
              <div className="text-sm text-gray-400">Supervisor</div>
            </div>

            {/* Navigation Buttons Mobile */}
            <button
              onClick={() => {
                navigate("/planner");
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go to Planner
            </button>

           

            <button
              onClick={() => {
                handleLogout();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}