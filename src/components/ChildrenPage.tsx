import React from "react";
import PersonCard from "./PersonCard";
import PersonCardGrid from "./PersonCardGrid";
import type { HierarchicalFamilyTree } from "@/types/hierarchical-family";
import { 
	getChildren, 
	getFullName, 
	getDisplayName, 
	findPersonById,
	findPersonsCouple,
	getCoupleDisplayName 
} from "@/types/hierarchical-family-utils";

interface ChildrenPageProps {
	personId: string;
	familyTree: HierarchicalFamilyTree;
}

export function ChildrenPage({ personId, familyTree }: ChildrenPageProps) {
	// Get the person from the family tree
	const person = findPersonById(familyTree, personId);
	
	if (!person) {
		return (
			<div className="py-8 text-center">
				<h2 className="text-2xl font-semibold text-gray-800 mb-4">
					Person ikke fundet
				</h2>
				<p className="text-gray-600">
					Kunne ikke finde en person med ID: {personId}
				</p>
				<a href="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
					Tilbage til familietræet
				</a>
			</div>
		);
	}

	// Get children using the hierarchical utility function
	const children = getChildren(familyTree, personId);
	
	// Find the couple this person belongs to (if any)
	const couple = findPersonsCouple(familyTree, personId);
	
	const getParentNames = () => {
		if (couple) {
			return getCoupleDisplayName(couple);
		}
		return getDisplayName(person);
	};

	const getParentCards = () => {
		if (couple) {
			return [couple.person1, couple.person2];
		}
		return [person];
	};

	return (
		<section className="py-8">
			{/* Parent Information */}
			<div className="text-center mb-8">
				<h2 className="text-3xl font-bold text-gray-800 mb-2">
					{getParentNames()}
				</h2>
				<p className="text-lg text-gray-600 mb-6">
					{children.length === 0 ? "Ingen registrerede børn" : 
					 children.length === 1 ? "1 registreret barn" : 
					 `${children.length} registrerede børn`}
				</p>
				
				{/* Parent Cards */}
				<div className="flex flex-wrap justify-center gap-4 mb-8">
					{getParentCards().map(parentPerson => (
						<PersonCard key={parentPerson.id} person={parentPerson} enableNavigation={false} />
					))}
				</div>
			</div>

			{/* Children Section */}
			{children.length > 0 ? (
				<div>
					<h3 className="text-2xl font-semibold text-center text-gray-800 mb-6">
						Børn
					</h3>
					<PersonCardGrid people={children} />
				</div>
			) : (
				<div className="text-center py-12">
					<div className="text-6xl text-gray-300 mb-4">👶</div>
					<h3 className="text-xl font-semibold text-gray-600 mb-2">
						Ingen børn registreret
					</h3>
					<p className="text-gray-500">
						Der er endnu ikke registreret nogen børn for {getParentNames()}.
					</p>
				</div>
			)}
		</section>
	);
}

export default ChildrenPage;