import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "line12" && password === "line12") {
      setError("");
      navigate("/planner", { replace: true }); // ✅ go to homepage
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          Line Login
        </h1>
        <p className="text-sm text-gray-600 text-center mt-1">
          Enter line credentials to continue
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-xl border border-gray-300 px-4 py-2
                         focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-xl border border-gray-300 px-4 py-2
                         focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 text-white py-2.5
                       font-medium hover:bg-gray-800 active:bg-gray-900"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500 text-center">
          Authorized users only
        </div>
      </div>
    </div>
  );
}
