import React from "react";
import PersonCard from "./PersonCard";
import SpouseConnection from "./SpouseConnection";
import type { Person } from "@/types/hierarchical-family";

interface PersonCardGridProps {
	people: Person[];
	className?: string;
}

export function PersonCardGrid({
	people,
	className = "",
}: PersonCardGridProps) {
	// For the hierarchical structure, we don't need to group by couples
	// since children are individual people, and couples are handled separately
	// We'll display all people in a simple grid
	return (
		<div className={`p-6 ${className}`}>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{people.map((person) => (
					<PersonCard key={person.id} person={person} />
				))}
			</div>
		</div>
	);
}

export default PersonCardGrid;
