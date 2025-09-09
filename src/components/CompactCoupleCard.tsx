import React from "react";
import CompactPersonCard from "./CompactPersonCard";
import type { PopulatedCouple } from "@/types/simple-family";
import { getLevelBackgroundClass } from "@/types/simple-family-utils";

interface CompactCoupleCardProps {
  couple: PopulatedCouple;
  level?: number;
  className?: string;
  enableNavigation?: boolean;
}

export function CompactCoupleCard({ 
  couple, 
  level = 0, 
  className = "", 
  enableNavigation = true 
}: CompactCoupleCardProps) {
  const levelBgClass = getLevelBackgroundClass(level);
  
  return (
    <div className={`mb-6 ${className}`}>
      <div className={`p-3 rounded-lg ${levelBgClass} border border-gray-200`}>
        <div className="flex items-center justify-center gap-3 max-w-5xl mx-auto">
          <CompactPersonCard 
            person={couple.person1} 
            enableNavigation={enableNavigation} 
          />
          
          {/* Enhanced couple connection indicator - always horizontal */}
          <div className="flex flex-col items-center mx-2 flex-shrink-0">
            <div className="flex items-center">
              <div className="w-6 h-0.5 bg-red-400"></div>
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mx-1 shadow-sm">
                <span className="text-white text-xs">💕</span>
              </div>
              <div className="w-6 h-0.5 bg-red-400"></div>
            </div>
            <div className="text-xs text-red-600 font-medium mt-1 capitalize whitespace-nowrap">
              {couple.relationshipType}
            </div>
            {/* Children indicator moved here for compactness */}
            {couple.children && couple.children.length > 0 && (
              <div className="text-xs text-gray-600 font-medium mt-1">
                {couple.children.length} {couple.children.length === 1 ? 'child' : 'children'}
              </div>
            )}
          </div>
          
          <CompactPersonCard 
            person={couple.person2} 
            enableNavigation={enableNavigation} 
          />
        </div>
      </div>
    </div>
  );
}

export default CompactCoupleCard;