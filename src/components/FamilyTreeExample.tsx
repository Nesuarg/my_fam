/**
 * Example usage of the FamilyTreeView component
 * 
 * This demonstrates how to integrate the family tree visualization
 * into your own application with proper data structure.
 */

import React from "react";
import FamilyTreeView from "./FamilyTreeView";
import type { FamilyTree } from "@/types/family";

interface FamilyTreeExampleProps {
  familyTree: FamilyTree;
}

export function FamilyTreeExample({ familyTree }: FamilyTreeExampleProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {familyTree.name}
        </h2>
        {familyTree.description && (
          <p className="text-gray-600 max-w-2xl mx-auto">
            {familyTree.description}
          </p>
        )}
      </div>
      
      <FamilyTreeView 
        familyTree={familyTree}
        className="shadow-lg"
      />
      
      {/* Optional: Tree statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Family Tree Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">
              {Object.keys(familyTree.people).length}
            </div>
            <div className="text-gray-600">People</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-pink-600">
              {Object.keys(familyTree.marriages).length}
            </div>
            <div className="text-gray-600">Marriages</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">
              {Object.values(familyTree.people).filter(p => p.isLiving).length}
            </div>
            <div className="text-gray-600">Living</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-600">
              {Object.values(familyTree.people).filter(p => p.isLiving === false).length}
            </div>
            <div className="text-gray-600">Deceased</div>
          </div>
        </div>
      </div>
      
      {/* Usage instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-blue-900 mb-2">How to Use:</h4>
        <ul className="text-blue-800 space-y-1">
          <li>• <strong>Zoom:</strong> Use the zoom buttons to get a closer or wider view</li>
          <li>• <strong>Pan:</strong> Click and drag to move around the tree</li>
          <li>• <strong>Collapse/Expand:</strong> Click union nodes (❤️) to show/hide couple details</li>
          <li>• <strong>Tooltips:</strong> Hover over person cards for quick information</li>
        </ul>
      </div>
    </div>
  );
}

export default FamilyTreeExample;