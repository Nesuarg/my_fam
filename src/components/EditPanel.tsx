import { useState } from "react";
import type { WheelNode } from "@/lib/wheel-graph";

type EditView = "details" | "addChild" | "addPartner";

interface Props {
  node: WheelNode;
  x: number;
  y: number;
  onEditPerson: (personId: string, fields: Record<string, string>) => void;
  onAddChild: (coupleId: string, child: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }) => void;
  onAddCouple: (personId: string, partner: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relationshipType: string) => void;
  onClose: () => void;
}

function PersonFields({
  label,
  firstName,
  lastName,
  dob,
  onSave,
}: {
  label: string;
  firstName: string;
  lastName: string;
  dob: string;
  onSave: (fields: { firstName: string; lastName: string; dob: string }) => void;
}) {
  const [fn, setFn] = useState(firstName);
  const [ln, setLn] = useState(lastName);
  const [d, setD] = useState(dob);
  const changed = fn !== firstName || ln !== lastName || d !== dob;

  return (
    <div className="mb-3">
      <div className="text-gray-500 text-xs mb-1">{label}</div>
      <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="Fornavn" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={ln} onChange={(e) => setLn(e.target.value)} placeholder="Efternavn" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={d} onChange={(e) => setD(e.target.value)} placeholder="Fødselsdato (M/D/ÅÅÅÅ)" className="w-full px-2 py-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      {changed && (
        <button onClick={() => onSave({ firstName: fn, lastName: ln, dob: d })} className="mt-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
          Gem
        </button>
      )}
    </div>
  );
}

function NewPersonForm({
  onSave,
  onCancel,
  showRelType,
}: {
  onSave: (person: { firstName: string; lastName: string; gender: "male" | "female" | "other"; dob: string }, relType?: string) => void;
  onCancel: () => void;
  showRelType?: boolean;
}) {
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [gender, setGender] = useState<"male" | "female">("female");
  const [dob, setDob] = useState("");
  const [relType, setRelType] = useState("married");

  return (
    <div className="mt-2 border-t border-[#2a2d3e] pt-2">
      <input value={fn} onChange={(e) => setFn(e.target.value)} placeholder="Fornavn" autoFocus className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={ln} onChange={(e) => setLn(e.target.value)} placeholder="Efternavn" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="Fødselsdato (M/D/ÅÅÅÅ)" className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs focus:outline-none focus:border-blue-500" />
      <div className="flex gap-2 mb-1">
        <button onClick={() => setGender("male")} className={`px-2 py-1 text-xs rounded ${gender === "male" ? "bg-blue-600 text-white" : "bg-[#2a2d3e] text-gray-400"}`}>M</button>
        <button onClick={() => setGender("female")} className={`px-2 py-1 text-xs rounded ${gender === "female" ? "bg-pink-600 text-white" : "bg-[#2a2d3e] text-gray-400"}`}>F</button>
      </div>
      {showRelType && (
        <select value={relType} onChange={(e) => setRelType(e.target.value)} className="w-full px-2 py-1 mb-1 bg-[#0f1117] border border-[#2a2d3e] rounded text-white text-xs">
          <option value="married">Gift</option>
          <option value="partnership">Partnerskab</option>
          <option value="common-law">Samlevende</option>
        </select>
      )}
      <div className="flex gap-2 mt-1">
        <button
          onClick={() => { if (fn && ln && dob) onSave({ firstName: fn, lastName: ln, gender, dob }, relType); }}
          disabled={!fn || !ln || !dob}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Gem
        </button>
        <button onClick={onCancel} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-400 rounded hover:text-white">Annuller</button>
      </div>
    </div>
  );
}

export default function EditPanel({ node, x, y, onEditPerson, onAddChild, onAddCouple, onClose }: Props) {
  const [view, setView] = useState<EditView>("details");

  return (
    <div
      className="absolute z-30 bg-[#1e2030] border border-[#2a2d3e] rounded-lg p-3 shadow-xl"
      style={{ left: x + 20, top: y - 20, width: 260 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-white text-sm font-medium">Rediger</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs">X</button>
      </div>

      {view === "details" && (
        <>
          <PersonFields
            label="Fabricius"
            firstName={node.fabriciusPerson.firstName}
            lastName={node.fabriciusPerson.lastName}
            dob={node.fabriciusPerson.dob}
            onSave={(fields) => onEditPerson(node.fabriciusPerson.id, fields)}
          />
          {node.partnerPerson && (
            <PersonFields
              label="Partner"
              firstName={node.partnerPerson.firstName}
              lastName={node.partnerPerson.lastName}
              dob={node.partnerPerson.dob}
              onSave={(fields) => onEditPerson(node.partnerPerson!.id, fields)}
            />
          )}
          <div className="flex gap-2 mt-2 border-t border-[#2a2d3e] pt-2">
            {!node.isSingle && (
              <button onClick={() => setView("addChild")} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-300 rounded hover:text-white">+ Barn</button>
            )}
            {node.isSingle && !node.partnerPerson && (
              <button onClick={() => setView("addPartner")} className="px-2 py-1 text-xs bg-[#2a2d3e] text-gray-300 rounded hover:text-white">+ Partner</button>
            )}
          </div>
        </>
      )}

      {view === "addChild" && (
        <>
          <div className="text-gray-400 text-xs mb-1">Tilføj barn</div>
          <NewPersonForm
            onSave={(child) => { onAddChild(node.coupleId, child); onClose(); }}
            onCancel={() => setView("details")}
          />
        </>
      )}

      {view === "addPartner" && (
        <>
          <div className="text-gray-400 text-xs mb-1">Tilføj partner for {node.fabriciusPerson.firstName}</div>
          <NewPersonForm
            showRelType
            onSave={(partner, relType) => { onAddCouple(node.fabriciusPerson.id, partner, relType ?? "married"); onClose(); }}
            onCancel={() => setView("details")}
          />
        </>
      )}
    </div>
  );
}
