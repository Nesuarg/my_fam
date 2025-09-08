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
      <div className={`p-4 rounded-lg ${levelBgClass} border border-gray-200`}>
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
          <CompactPersonCard 
            person={couple.person1} 
            enableNavigation={enableNavigation} 
          />
          
          {/* Enhanced couple connection indicator */}
          <div className="flex flex-col items-center lg:mx-4">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-red-400"></div>
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mx-1 shadow-sm">
                <span className="text-white text-xs font-bold">💕</span>
              </div>
              <div className="w-8 h-0.5 bg-red-400"></div>
            </div>
            <div className="text-xs text-red-600 font-medium mt-1 capitalize">
              {couple.relationshipType}
            </div>
          </div>
          
          <CompactPersonCard 
            person={couple.person2} 
            enableNavigation={enableNavigation} 
          />
        </div>
        
        {/* Children indicator */}
        {couple.children && couple.children.length > 0 && (
          <div className="text-center mt-3">
            <div className="text-xs text-gray-600 font-medium">
              {couple.children.length} {couple.children.length === 1 ? 'Child' : 'Children'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompactCoupleCard;