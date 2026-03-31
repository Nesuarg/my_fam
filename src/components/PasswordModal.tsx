import { useState } from "react";

interface Props {
  onSuccess: (password: string) => void;
  onCancel: () => void;
  error?: string | null;
}

export default function PasswordModal({ onSuccess, onCancel, error }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    onSuccess(password.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-6 w-80 shadow-xl"
      >
        <h3 className="text-white font-medium mb-3">Enter Family Password</h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="flex-1 px-3 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs bg-[#2a2d3e] text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
