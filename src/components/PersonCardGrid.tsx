import React from "react";
import PersonCard from "./PersonCard";
import type { Person } from "@/types/family";

interface PersonCardGridProps {
	people: Person[];
	className?: string;
}

export function PersonCardGrid({
	people,
	className = "",
}: PersonCardGridProps) {
	return (
		<div
			className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6 ${className}`}
		>
			{people.map((person) => (
				<PersonCard key={person.id} person={person} />
			))}
		</div>
	);
}

export default PersonCardGrid;
