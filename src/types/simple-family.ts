/**
 * Simplified family tree data types for JSON content
 */

export interface SimplePerson {
	id: string;
	firstName: string;
	lastName: string;
	maidenName?: string;
	age: number;
	gender: "male" | "female" | "other";
	dob: string;
	notes?: string;
}

export interface SimpleChild {
	personId: string;
	birthOrder: number;
	ownFamilyId?: string;
}

export interface SimpleCouple {
	id: string;
	person1Id: string;
	person2Id: string | null; // Allow null for single parents
	relationshipType: "married" | "partnership" | "common-law" | "single";
	children?: SimpleChild[];
}

// New interface for the complete data structure
export interface FamilyData {
	people: SimplePerson[];
	couples: SimpleCouple[];
}

export interface SimpleFamilyTree {
	id: string;
	name: string;
	description?: string;
	foundingCoupleId: string;
}

// Populated types with full object references
export interface PopulatedCouple
	extends Omit<SimpleCouple, "person1Id" | "person2Id" | "children"> {
	person1: SimplePerson;
	person2: SimplePerson | null; // Allow null for single parents
	children?: Array<
		Omit<SimpleChild, "personId" | "ownFamilyId"> & {
			person: SimplePerson;
			ownFamily?: PopulatedCouple;
		}
	>;
}

export interface PopulatedFamilyTree
	extends Omit<SimpleFamilyTree, "foundingCoupleId"> {
	foundingCouple: PopulatedCouple;
	allPeople: SimplePerson[];
}
