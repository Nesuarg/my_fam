import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SimplePerson } from "@/types/simple-family";

interface CompactPersonCardProps {
  person: SimplePerson;
  className?: string;
  onPersonClick?: (person: SimplePerson) => void;
  enableNavigation?: boolean;
}

export function CompactPersonCard({ 
  person, 
  className = "", 
  onPersonClick, 
  enableNavigation = true 
}: CompactPersonCardProps) {
  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case "male":
        return "bg-blue-100 border-blue-300 text-blue-900";
      case "female":
        return "bg-pink-100 border-pink-300 text-pink-900";
      default:
        return "bg-gray-100 border-gray-300 text-gray-900";
    }
  };

  const handleClick = () => {
    if (onPersonClick) {
      onPersonClick(person);
    } else if (enableNavigation) {
      // Default navigation to children page
      window.location.href = `/person/${person.id}/children`;
    }
  };

  const cardContent = (
    <>
      <CardHeader className="p-3 pb-1">
        {/* Person Photo Placeholder */}
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center border-2 border-white shadow-sm">
          <span className="text-sm font-bold text-slate-600">
            {person.firstName.charAt(0)}
            {person.lastName.charAt(0)}
          </span>
        </div>

        {/* Name */}
        <div className="text-center">
          <h3 className="font-bold text-sm leading-tight mb-0.5">
            {person.firstName} {person.lastName}
          </h3>
          {person.maidenName && person.maidenName !== person.lastName && (
            <p className="text-xs text-gray-600 italic">
              (née {person.maidenName})
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-1 flex-1">
        <div className="space-y-1.5">
          {/* Age and Gender */}
          <div className="flex justify-between items-center py-1 px-2 bg-white/70 rounded-sm">
            <span className="text-xs font-medium text-gray-700">Age</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">{person.age}y</span>
              <Badge variant="outline" className="text-xs px-1 py-0.5 h-auto">
                {person.gender}
              </Badge>
            </div>
          </div>

          {/* Notes */}
          {person.notes && (
            <div className="py-1 px-2 bg-white/70 rounded-sm">
              <span className="text-xs text-gray-600 italic" title={person.notes}>
                {person.notes.length > 30 ? `${person.notes.slice(0, 30)}...` : person.notes}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </>
  );

  if (enableNavigation && !onPersonClick) {
    return (
      <a href={`/person/${person.id}/children`} className="block">
        <Card
          className={`w-full max-w-48 min-h-48 ${getGenderColor(person.gender)} border-2 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer ${className}`}
        >
          {cardContent}
        </Card>
      </a>
    );
  }

  return (
    <Card
      className={`w-full max-w-48 min-h-48 ${getGenderColor(person.gender)} border-2 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden ${enableNavigation ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      {cardContent}
    </Card>
  );
}

export default CompactPersonCard;