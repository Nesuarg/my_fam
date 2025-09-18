/**
 * Utilities for loading and processing simplified family data from JSON
 */

import type {
	FamilyData,
	PopulatedCouple,
	PopulatedFamilyTree,
	SimpleCouple,
	SimplePerson,
} from "./simple-family";

/**
 * Load family data from the couples.json file
 */
export async function loadFamilyData(): Promise<PopulatedFamilyTree> {
	// Import the couples.json file which contains both people and couples
	const { default: familyData } = await import("../../content/couples.json");

	return populateFamilyTree(familyData as FamilyData, "niels-peter-dorthea");
}

/**
 * Load raw family data from the couples.json file
 */
export async function loadRawFamilyData(): Promise<FamilyData> {
	// Import the couples.json file which contains both people and couples
	const { default: familyData } = await import("../../content/couples.json");
	return familyData as FamilyData;
}

/**
 * Find a couple by ID and return its populated data
 */
export async function loadCoupleData(
	coupleId: string,
): Promise<PopulatedCouple | null> {
	const { default: familyData } = await import("../../content/couples.json");
	return populateCouple(familyData as FamilyData, coupleId);
}

/**
 * Populate a single couple with its data
 */
export function populateCouple(
	familyData: FamilyData,
	coupleId: string,
): PopulatedCouple | null {
	// Create a lookup map for people
	const personMap = new Map<string, SimplePerson>();
	for (const person of familyData.people) {
		personMap.set(person.id, person);
	}

	// Create a lookup map for couples
	const coupleMap = new Map<string, SimpleCouple>();
	for (const couple of familyData.couples) {
		coupleMap.set(couple.id, couple);
	}

	// Find and populate the specific couple
	const couple = coupleMap.get(coupleId);
	if (!couple) return null;

	const person1 = personMap.get(couple.person1Id);
	const person2 = couple.person2Id
		? (personMap.get(couple.person2Id) ?? null)
		: null;

	if (!person1) return null;

	// Populate children if they exist
	const populatedChildren = couple.children
		?.map((child) => {
			const person = personMap.get(child.personId);
			if (!person) return null;

			const result: NonNullable<PopulatedCouple["children"]>[0] = {
				person,
				birthOrder: child.birthOrder,
				ownFamily: child.ownFamilyId
					? (populateCouple(familyData, child.ownFamilyId) ?? undefined)
					: undefined,
			};
			return result;
		})
		.filter(Boolean) as NonNullable<PopulatedCouple["children"]>;

	return {
		id: couple.id,
		relationshipType: couple.relationshipType,
		person1,
		person2,
		children: populatedChildren,
	};
}

/**
 * Convert simple data structures to populated ones with full object references
 */
export function populateFamilyTree(
	familyData: FamilyData,
	foundingCoupleId: string,
): PopulatedFamilyTree {
	const foundingCouple = populateCouple(familyData, foundingCoupleId);
	if (!foundingCouple) {
		throw new Error(`Founding couple ${foundingCoupleId} not found`);
	}

	return {
		id: "hansen-family-tree",
		name: "Hansen Family Tree",
		description:
			"Complete Hansen family tree starting from Niels Peter and Dorthea",
		foundingCouple,
		allPeople: familyData.people,
	};
}

/**
 * Find all people who are children of the given couple
 */
export function getChildrenOfCouple(
	familyData: FamilyData,
	coupleId: string,
): SimplePerson[] {
	const couple = familyData.couples.find((c) => c.id === coupleId);
	if (!couple || !couple.children) return [];

	const personMap = new Map<string, SimplePerson>();
	for (const person of familyData.people) {
		personMap.set(person.id, person);
	}

	return couple.children
		.map((child) => personMap.get(child.personId))
		.filter(Boolean) as SimplePerson[];
}

/**
 * Find a person by ID
 */
export function findPerson(
	familyData: FamilyData,
	personId: string,
): SimplePerson | null {
	return familyData.people.find((person) => person.id === personId) || null;
}

/**
 * Get CSS class for background color based on generation level
 */
export function getLevelBackgroundClass(level: number): string {
	const backgroundClasses = [
		"bg-blue-50", // Level 0 - founding generation
		"bg-green-50", // Level 1 - first generation
		"bg-yellow-50", // Level 2 - second generation
		"bg-purple-50", // Level 3 - third generation
		"bg-pink-50", // Level 4 - fourth generation
		"bg-indigo-50", // Level 5 - fifth generation
	];

	return backgroundClasses[level % backgroundClasses.length] || "bg-gray-50";
}
