/**
 * Family Tree Utility Functions
 *
 * Helper functions for working with family tree data structures
 */

import type {
	Person,
	PersonId,
	FamilyTree,
	Relationship,
	RelationshipType,
	FamilyDate,
} from "./family";

/**
 * Calculate age from birth date (handles partial dates)
 */
export function calculateAge(
	birthDate: FamilyDate,
	deathDate?: FamilyDate,
): number | null {
	if (!birthDate.year) return null;

	const endDate = deathDate || {
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
		day: new Date().getDate(),
	};

	if (!endDate.year) return null;

	let age = endDate.year - birthDate.year;

	// Adjust for month/day if available
	if (birthDate.month && endDate.month) {
		if (
			endDate.month < birthDate.month ||
			(endDate.month === birthDate.month &&
				birthDate.day &&
				endDate.day &&
				endDate.day < birthDate.day)
		) {
			age--;
		}
	}

	return age;
}

/**
 * Get full name of a person
 */
export function getFullName(person: Person): string {
	const parts = [person.firstName];
	if (person.middleName) parts.push(person.middleName);
	parts.push(person.lastName);
	return parts.join(" ");
}

/**
 * Get display name with maiden name if applicable
 */
export function getDisplayName(person: Person): string {
	const fullName = getFullName(person);
	if (person.maidenName && person.maidenName !== person.lastName) {
		return `${fullName} (née ${person.maidenName})`;
	}
	return fullName;
}

/**
 * Find all children of a person
 */
export function getChildren(
	personId: PersonId,
	familyTree: FamilyTree,
): Person[] {
	const person = familyTree.people[personId];
	if (!person?.childrenIds) return [];

	return person.childrenIds
		.map((id) => familyTree.people[id])
		.filter((child) => child);
}

/**
 * Find all siblings of a person
 */
export function getSiblings(
	personId: PersonId,
	familyTree: FamilyTree,
): Person[] {
	const person = familyTree.people[personId];
	if (!person) return [];

	const siblings: Person[] = [];
	const siblingIds = new Set<PersonId>();

	// Add direct sibling references
	if (person.siblingIds) {
		person.siblingIds.forEach((id) => siblingIds.add(id));
	}

	// Find siblings through parents
	if (person.fatherId || person.motherId) {
		Object.values(familyTree.people).forEach((otherPerson) => {
			if (otherPerson.id === personId) return; // Skip self

			// Check if they share a parent
			if (
				(person.fatherId && otherPerson.fatherId === person.fatherId) ||
				(person.motherId && otherPerson.motherId === person.motherId)
			) {
				siblingIds.add(otherPerson.id);
			}
		});
	}

	// Convert IDs to Person objects
	siblingIds.forEach((id) => {
		const sibling = familyTree.people[id];
		if (sibling) siblings.push(sibling);
	});

	return siblings;
}

/**
 * Find all spouses of a person
 */
export function getSpouses(
	personId: PersonId,
	familyTree: FamilyTree,
): Person[] {
	const person = familyTree.people[personId];
	if (!person?.spouseIds) return [];

	return person.spouseIds
		.map((id) => familyTree.people[id])
		.filter((spouse) => spouse);
}

/**
 * Find parents of a person
 */
export function getParents(
	personId: PersonId,
	familyTree: FamilyTree,
): Person[] {
	const person = familyTree.people[personId];
	if (!person) return [];

	const parents: Person[] = [];

	if (person.fatherId && familyTree.people[person.fatherId]) {
		parents.push(familyTree.people[person.fatherId]);
	}

	if (person.motherId && familyTree.people[person.motherId]) {
		parents.push(familyTree.people[person.motherId]);
	}

	return parents;
}

/**
 * Check if a person is living (no death date and not explicitly marked as deceased)
 */
export function isLiving(person: Person): boolean {
	if (person.isLiving !== undefined) {
		return person.isLiving;
	}
	return !person.deathDate;
}

/**
 * Format a FamilyDate for display
 */
export function formatDate(date: FamilyDate): string {
	if (!date.year) return "Unknown";

	let formatted = date.year.toString();

	if (date.month) {
		const monthNames = [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec",
		];
		formatted = `${monthNames[date.month - 1]} ${formatted}`;

		if (date.day) {
			formatted = `${date.day} ${formatted}`;
		}
	}

	if (date.estimated) {
		formatted = `~${formatted}`;
	} else if (date.circa) {
		formatted = `c. ${formatted}`;
	}

	return formatted;
}

/**
 * Get generation level relative to root person (0 = root, -1 = parents, +1 = children)
 */
export function getGenerationLevel(
	personId: PersonId,
	rootPersonId: PersonId,
	familyTree: FamilyTree,
): number {
	if (personId === rootPersonId) return 0;

	// Use BFS to find shortest path
	const visited = new Set<PersonId>();
	const queue: Array<{ id: PersonId; level: number }> = [
		{ id: rootPersonId, level: 0 },
	];

	while (queue.length > 0) {
		const { id, level } = queue.shift()!;
		if (visited.has(id)) continue;
		visited.add(id);

		if (id === personId) return level;

		const person = familyTree.people[id];
		if (!person) continue;

		// Check parents (go up one generation)
		if (person.fatherId && !visited.has(person.fatherId)) {
			queue.push({ id: person.fatherId, level: level - 1 });
		}
		if (person.motherId && !visited.has(person.motherId)) {
			queue.push({ id: person.motherId, level: level - 1 });
		}

		// Check children (go down one generation)
		if (person.childrenIds) {
			person.childrenIds.forEach((childId) => {
				if (!visited.has(childId)) {
					queue.push({ id: childId, level: level + 1 });
				}
			});
		}
	}

	return 0; // Default if not found
}

/**
 * Search for people by name
 */
export function searchPeopleByName(
	query: string,
	familyTree: FamilyTree,
): Person[] {
	const searchTerm = query.toLowerCase();

	return Object.values(familyTree.people).filter((person) => {
		const fullName = getFullName(person).toLowerCase();
		const displayName = getDisplayName(person).toLowerCase();

		return (
			fullName.includes(searchTerm) ||
			displayName.includes(searchTerm) ||
			person.nicknames?.some((nickname) =>
				nickname.toLowerCase().includes(searchTerm),
			)
		);
	});
}

/**
 * Create a basic person object with required fields
 */
export function createPerson(
	id: PersonId,
	firstName: string,
	lastName: string,
	options: Partial<Omit<Person, "id" | "firstName" | "lastName">> = {},
): Person {
	return {
		id,
		firstName,
		lastName,
		...options,
	};
}

/**
 * Validate person relationships for data integrity
 */
export function validatePersonRelationships(
	person: Person,
	familyTree: FamilyTree,
): string[] {
	const errors: string[] = [];

	// Check if referenced people exist
	if (person.fatherId && !familyTree.people[person.fatherId]) {
		errors.push(`Father with ID ${person.fatherId} not found`);
	}

	if (person.motherId && !familyTree.people[person.motherId]) {
		errors.push(`Mother with ID ${person.motherId} not found`);
	}

	if (person.spouseIds) {
		person.spouseIds.forEach((spouseId) => {
			if (!familyTree.people[spouseId]) {
				errors.push(`Spouse with ID ${spouseId} not found`);
			}
		});
	}

	if (person.childrenIds) {
		person.childrenIds.forEach((childId) => {
			if (!familyTree.people[childId]) {
				errors.push(`Child with ID ${childId} not found`);
			}
		});
	}

	return errors;
}
