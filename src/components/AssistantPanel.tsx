import { useState } from "react";
import { askAssistant, type AssistantProposal } from "@/lib/family-api";

interface Props {
  password: string;
  large?: boolean;
  /** Called once the user confirms a proposal; the panel never edits directly. */
  onApply: (
    coupleId: string,
    child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string },
  ) => void;
  onClose: () => void;
}

type Turn = { role: "user" | "assistant"; content: string };

export default function AssistantPanel({ password, large = false, onApply, onClose }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);

  const text = large ? "text-base" : "text-xs";
  const field = large
    ? "w-full px-3 py-2 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-base placeholder-gray-600 focus:outline-none focus:border-blue-500"
    : "w-full px-2 py-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500";
  const button = large ? "px-4 py-2 text-base rounded" : "px-2 py-1 text-xs rounded";

  const send = async () => {
    const message = input.trim();
    if (!message || pending) return;

    const next: Turn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setInput("");
    setProposal(null);
    setError(null);
    setPending(true);

    const res = await askAssistant(password, next);
    setPending(false);

    if (!res.ok) {
      setError(res.message);
      return;
    }
    if (res.reply.type === "question") {
      setTurns([...next, { role: "assistant", content: res.reply.question }]);
      return;
    }
    setProposal(res.reply);
    setTurns([...next, { role: "assistant", content: res.reply.summary }]);
  };

  return (
    <div
      className={`mt-2 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 shadow-xl ${large ? "w-[460px]" : "w-[320px]"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className={`text-white font-medium ${large ? "text-lg" : "text-sm"}`}>
          Tilføj med ord
        </span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">
          X
        </button>
      </div>

      {turns.length === 0 && (
        <p className={`text-gray-500 mb-2 ${text}`}>
          Fx: tilføj barn til Mette og Mads, Iben der er født 11. august 2013
        </p>
      )}

      {turns.length > 0 && (
        <div className={`mb-2 max-h-56 overflow-y-auto flex flex-col gap-1.5 ${text}`}>
          {turns.map((turn, i) => (
            <div
              key={i}
              className={turn.role === "user" ? "text-gray-300" : "text-blue-300"}
            >
              {turn.content}
            </div>
          ))}
        </div>
      )}

      {pending && <div className={`text-gray-500 mb-2 ${text}`}>Tænker...</div>}
      {error && <div className={`text-red-400 mb-2 ${text}`}>{error}</div>}

      {proposal ? (
        <div className="flex gap-2">
          <button
            onClick={() => {
              onApply(proposal.coupleId, proposal.child);
              setProposal(null);
              setTurns([]);
            }}
            className={`${button} bg-green-600 text-white hover:bg-green-700`}
          >
            Tilføj {proposal.child.firstName}
          </button>
          <button
            onClick={() => setProposal(null)}
            className={`${button} bg-[#2a2d3e] text-gray-400 hover:text-white`}
          >
            Fortryd
          </button>
        </div>
      ) : (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          disabled={pending}
          placeholder={turns.length === 0 ? "Skriv hvem der skal tilføjes" : "Svar..."}
          autoFocus
          className={field}
        />
      )}
    </div>
  );
}
