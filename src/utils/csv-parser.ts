/**
 * CSV Parser Utility for Family Tree Data
 * 
 * Converts CSV data to Person objects compatible with the family tree system.
 * Handles Danish CSV format with couples and parent relationships.
 */

import type { Person, FamilyDate } from '@/types/family';

export interface CsvRow {
	timestamp: string;
	names: string;
	birthDate: string;
	parents: string;
}

/**
 * Parse a date string in MM/DD/YYYY format to FamilyDate
 */
export function parseDateString(dateStr: string): FamilyDate | undefined {
	if (!dateStr || dateStr.trim() === '' || dateStr === '-') {
		return undefined;
	}

	const parts = dateStr.trim().split('/');
	if (parts.length !== 3) {
		return undefined;
	}

	const month = parseInt(parts[0], 10);
	const day = parseInt(parts[1], 10);
	const year = parseInt(parts[2], 10);

	if (isNaN(month) || isNaN(day) || isNaN(year)) {
		return undefined;
	}

	return { year, month, day };
}

/**
 * Parse names string to extract individual names
 * Handles formats like "Person1 og Person2", "Person1 & Person2", or single names
 */
export function parseNames(namesStr: string): string[] {
	if (!namesStr || namesStr.trim() === '') {
		return [];
	}

	// Split on common Danish conjunctions and ampersand
	const names = namesStr
		.split(/\s+og\s+|\s+&\s+/)
		.map(name => name.trim())
		.filter(name => name.length > 0);

	return names;
}

/**
 * Generate a unique ID from a name
 */
export function generatePersonId(name: string): string {
	return name
		.toLowerCase()
		.replace(/[æøå]/g, (match) => {
			const replacements: { [key: string]: string } = { 'æ': 'ae', 'ø': 'oe', 'å': 'aa' };
			return replacements[match] || match;
		})
		.replace(/[^a-z0-9]/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Parse a full name into firstName and lastName
 */
export function parseFullName(fullName: string): { firstName: string; lastName: string } {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) {
		return { firstName: parts[0], lastName: '' };
	}
	
	const firstName = parts.slice(0, -1).join(' ');
	const lastName = parts[parts.length - 1];
	
	return { firstName, lastName };
}

/**
 * Parse CSV content into Person objects
 */
export function parseCsvToPersons(csvContent: string): Person[] {
	const lines = csvContent.trim().split('\n');
	if (lines.length <= 1) {
		return [];
	}

	// Skip header line
	const dataLines = lines.slice(1);
	const persons: Person[] = [];
	const parentChildRelations: Array<{ childId: string; parentNames: string[] }> = [];

	dataLines.forEach((line, index) => {
		// Parse CSV line - handle quoted fields
		const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));
		
		if (fields.length < 4) {
			console.warn(`Skipping malformed CSV line ${index + 2}: ${line}`);
			return;
		}

		const [timestamp, namesStr, birthDateStr, parentsStr] = fields;
		
		const names = parseNames(namesStr);
		const birthDate = parseDateString(birthDateStr);
		const parentNames = parentsStr !== '-' ? parseNames(parentsStr) : [];

		names.forEach((fullName, nameIndex) => {
			const { firstName, lastName } = parseFullName(fullName);
			const personId = generatePersonId(fullName);
			
			// Check if person already exists (avoid duplicates)
			if (persons.some(p => p.id === personId)) {
				return;
			}

			const person: Person = {
				id: personId,
				firstName,
				lastName,
				birthDate,
				birthPlace: { country: 'Denmark' },
				isLiving: !birthDate || birthDate.year > 1950, // Rough estimate
			};

			// If this is part of a couple, set up spouse relationship
			if (names.length === 2) {
				const otherName = names[1 - nameIndex];
				const spouseId = generatePersonId(otherName);
				person.spouseIds = [spouseId];
			}

			persons.push(person);

			// Store parent-child relationship for later processing
			if (parentNames.length > 0) {
				parentChildRelations.push({
					childId: personId,
					parentNames,
				});
			}
		});
	});

	// Process parent-child relationships
	parentChildRelations.forEach(({ childId, parentNames }) => {
		const child = persons.find(p => p.id === childId);
		if (!child) return;

		parentNames.forEach((parentName, index) => {
			const parentId = generatePersonId(parentName);
			const parent = persons.find(p => p.id === parentId);
			
			if (parent) {
				// Assign parent based on typical gender patterns in names
				// This is a rough heuristic - in a real system you'd want more sophisticated logic
				if (index === 0) {
					// First parent is typically the mother in this dataset
					child.motherId = parentId;
				} else {
					// Second parent is typically the father
					child.fatherId = parentId;
				}

				// Add child to parent's children list
				if (!parent.childrenIds) {
					parent.childrenIds = [];
				}
				if (!parent.childrenIds.includes(childId)) {
					parent.childrenIds.push(childId);
				}
			}
		});
	});

	return persons;
}