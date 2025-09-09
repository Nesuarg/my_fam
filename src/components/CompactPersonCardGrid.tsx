import React from "react";
import CompactPersonCard from "./CompactPersonCard";
import type { SimplePerson } from "@/types/simple-family";

interface CompactPersonCardGridProps {
  people: SimplePerson[];
  className?: string;
  enableNavigation?: boolean;
  onPersonClick?: (person: SimplePerson) => void;
}

export function CompactPersonCardGrid({ 
  people, 
  className = "", 
  enableNavigation = true, 
  onPersonClick 
}: CompactPersonCardGridProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 justify-items-center ${className}`}>
      {people.map((person) => (
        <CompactPersonCard
          key={person.id}
          person={person}
          enableNavigation={enableNavigation}
          onPersonClick={onPersonClick}
        />
      ))}
    </div>
  );
}

export default CompactPersonCardGrid;