import React from "react";
import PersonCard from "./PersonCard";
import SpouseConnection from "./SpouseConnection";
import type { Person } from "@/types/family";

interface PersonCardGridProps {
	people: Person[];
	className?: string;
}

export function PersonCardGrid({
	people,
	className = "",
}: PersonCardGridProps) {
	// Create a map for quick person lookup
	const personMap = new Map(people.map(person => [person.id, person]));
	
	// Group people into couples and singles
	const processedPeople = new Set<string>();
	const couples: Array<[Person, Person]> = [];
	const singles: Person[] = [];

	people.forEach(person => {
		if (processedPeople.has(person.id)) return;

		// Check if this person has a spouse
		const spouseId = person.spouseIds?.[0];
		const spouse = spouseId ? personMap.get(spouseId) : null;

		if (spouse && !processedPeople.has(spouse.id)) {
			// Found a couple
			couples.push([person, spouse]);
			processedPeople.add(person.id);
			processedPeople.add(spouse.id);
		} else {
			// Single person or spouse not in current list
			singles.push(person);
			processedPeople.add(person.id);
		}
	});

	return (
		<div className={`p-6 ${className}`}>
			{/* Render couples with connections */}
			{couples.map(([person1, person2]) => (
				<div key={`couple-${person1.id}-${person2.id}`} className="mb-8">
					<div className="flex flex-col lg:flex-row items-center justify-center gap-4 max-w-6xl mx-auto">
						<PersonCard person={person1} />
						<div className="lg:mx-4">
							<SpouseConnection />
						</div>
						<PersonCard person={person2} />
					</div>
				</div>
			))}
			
			{/* Render singles in a grid */}
			{singles.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
					{singles.map((person) => (
						<PersonCard key={person.id} person={person} />
					))}
				</div>
			)}
		</div>
	);
}

export default PersonCardGrid;
