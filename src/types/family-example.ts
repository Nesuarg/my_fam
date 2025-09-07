/**
 * Example usage of Family Tree types
 *
 * This file demonstrates how to create and work with family tree data
 */

import type { Person, FamilyTree, Marriage } from "./family";
import {
	createPerson,
	getFullName,
	calculateAge,
	getChildren,
} from "./family-utils";

// Example: Creating a simple family tree

// Create some people
const johnSmith: Person = createPerson("john-smith-1", "John", "Smith", {
	birthDate: { year: 1950, month: 3, day: 15 },
	birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
	gender: "male",
	occupation: ["Teacher", "Principal"],
	isLiving: true,
});

const maryJohnson: Person = createPerson("mary-johnson-1", "Mary", "Smith", {
	birthDate: { year: 1952, month: 8, day: 22 },
	maidenName: "Johnson",
	birthPlace: { city: "New York", state: "New York", country: "USA" },
	gender: "female",
	occupation: ["Nurse"],
	isLiving: true,
});

const davidSmith: Person = createPerson("david-smith-1", "David", "Smith", {
	birthDate: { year: 1975, month: 12, day: 5 },
	birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
	gender: "male",
	occupation: ["Software Engineer"],
	fatherId: "john-smith-1",
	motherId: "mary-johnson-1",
	isLiving: true,
});

const sarahSmith: Person = createPerson("sarah-smith-1", "Sarah", "Smith", {
	birthDate: { year: 1978, month: 6, day: 10 },
	birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
	gender: "female",
	occupation: ["Doctor"],
	fatherId: "john-smith-1",
	motherId: "mary-johnson-1",
	siblingIds: ["david-smith-1"],
	isLiving: true,
});

// Update relationships
johnSmith.spouseIds = ["mary-johnson-1"];
johnSmith.childrenIds = ["david-smith-1", "sarah-smith-1"];

maryJohnson.spouseIds = ["john-smith-1"];
maryJohnson.childrenIds = ["david-smith-1", "sarah-smith-1"];

davidSmith.siblingIds = ["sarah-smith-1"];

// Create a marriage record
const johnMaryMarriage: Marriage = {
	id: "marriage-john-mary-1",
	spouseIds: ["john-smith-1", "mary-johnson-1"],
	marriageDate: { year: 1973, month: 6, day: 20 },
	marriagePlace: { city: "Boston", state: "Massachusetts", country: "USA" },
	childrenIds: ["david-smith-1", "sarah-smith-1"],
	isActive: true,
};

// Create the complete family tree
const smithFamilyTree: FamilyTree = {
	id: "smith-family-tree",
	name: "The Smith Family Tree",
	description: "A family tree documenting the Smith family lineage",
	people: {
		"john-smith-1": johnSmith,
		"mary-johnson-1": maryJohnson,
		"david-smith-1": davidSmith,
		"sarah-smith-1": sarahSmith,
	},
	marriages: {
		"marriage-john-mary-1": johnMaryMarriage,
	},
	families: {},
	rootPersonId: "john-smith-1",
	createdAt: new Date(),
	updatedAt: new Date(),
	createdBy: "family-historian",
	privacySettings: {
		showLivingPeople: true,
		showContactInfo: false,
		publicAccess: false,
	},
};

// Example usage of utility functions
export function demonstrateUsage() {
	// Get full names
	console.log("Family Members:");
	Object.values(smithFamilyTree.people).forEach((person) => {
		console.log(`- ${getFullName(person)}`);
	});

	// Find children of John
	const johnsChildren = getChildren("john-smith-1", smithFamilyTree);
	console.log("\nJohn's children:");
	johnsChildren.forEach((child) => {
		console.log(`- ${getFullName(child)}`);
	});

	// Calculate ages
	console.log("\nAges:");
	Object.values(smithFamilyTree.people).forEach((person) => {
		if (person.birthDate) {
			const age = calculateAge(person.birthDate);
			console.log(`- ${getFullName(person)}: ${age} years old`);
		}
	});
}

// Export the example family tree for testing
export { smithFamilyTree };
export type { Person, FamilyTree, Marriage };
