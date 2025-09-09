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
      <div className={`p-2 sm:p-3 rounded-lg ${levelBgClass} border border-gray-200 relative`}>
        <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-5xl mx-auto">
          <div className="flex-1 min-w-0">
            <CompactPersonCard 
              person={couple.person1} 
              enableNavigation={enableNavigation} 
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <CompactPersonCard 
              person={couple.person2} 
              enableNavigation={enableNavigation} 
            />
          </div>
        </div>
        
        {/* Absolute positioned couple connection indicator - just a circle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
            <span className="text-white text-sm">💕</span>
          </div>
        </div>
        
        {/* Relationship info below the cards */}
        <div className="text-center mt-2 space-y-1">
          <div className="text-xs text-red-600 font-medium capitalize">
            {couple.relationshipType}
          </div>
          {couple.children && couple.children.length > 0 && (
            <div className="text-xs text-gray-600 font-medium">
              {couple.children.length} {couple.children.length === 1 ? 'child' : 'children'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompactCoupleCard;