/**
 * Family Tree TypeScript Definitions
 *
 * This file contains comprehensive type definitions for modeling a family tree
 * with support for all major family relationships and genealogical data.
 */

// Base types for identifiers and dates
export type PersonId = string;
export type FamilyId = string;

// Gender options with flexibility for modern family structures
export type Gender = "male" | "female" | "non-binary" | "other" | "unknown";

// Relationship status options
export type MaritalStatus =
	| "single"
	| "married"
	| "divorced"
	| "widowed"
	| "separated"
	| "partner"
	| "unknown";

// Date representation - can be partial (year only, year-month, etc.)
export interface FamilyDate {
	year?: number;
	month?: number; // 1-12
	day?: number; // 1-31
	estimated?: boolean; // true if date is estimated/approximate
	circa?: boolean; // true if date is "circa" or around this time
}

// Location information
export interface Location {
	city?: string;
	state?: string;
	country?: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	};
}

// Contact information
export interface ContactInfo {
	email?: string;
	phone?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		postalCode?: string;
	};
}

// Life events (births, deaths, marriages, etc.)
export interface LifeEvent {
	id: string;
	type:
		| "birth"
		| "death"
		| "marriage"
		| "divorce"
		| "baptism"
		| "graduation"
		| "employment"
		| "military"
		| "other";
	date?: FamilyDate;
	location?: Location;
	description?: string;
	sources?: string[]; // References to sources/documentation
}

// Core Person interface
export interface Person {
	// Basic identification
	id: PersonId;

	// Personal information
	firstName: string;
	middleName?: string;
	lastName: string;
	maidenName?: string; // For tracking maiden names
	nicknames?: string[];

	// Biographical data
	gender?: Gender;
	birthDate?: FamilyDate;
	deathDate?: FamilyDate;
	birthPlace?: Location;
	deathPlace?: Location;

	// Life details
	occupation?: string[];
	education?: string[];
	maritalStatus?: MaritalStatus;
	lifeEvents?: LifeEvent[];

	// Contact (for living relatives)
	contactInfo?: ContactInfo;
	isLiving?: boolean;

	// Family relationships (all optional to handle incomplete data)
	// Direct family
	fatherId?: PersonId;
	motherId?: PersonId;
	spouseIds?: PersonId[]; // Array to handle multiple marriages
	childrenIds?: PersonId[];

	// Extended family
	siblingIds?: PersonId[];

	// Genealogical data
	notes?: string;
	sources?: string[]; // Citations, documents, etc.
	photos?: string[]; // URLs or file paths to photos

	// Metadata
	createdAt?: Date;
	updatedAt?: Date;
	createdBy?: string; // Who added this person to the tree
}

// Marriage/Partnership record
export interface Marriage {
	id: FamilyId;
	spouseIds: [PersonId, PersonId]; // Always exactly two people
	marriageDate?: FamilyDate;
	marriagePlace?: Location;
	divorceDate?: FamilyDate;
	divorcePlace?: Location;
	childrenIds?: PersonId[];
	notes?: string;
	sources?: string[];
	isActive?: boolean; // false if divorced/ended
}

// Family unit (can represent nuclear families, households, etc.)
export interface FamilyUnit {
	id: FamilyId;
	name?: string; // e.g., "The Smith Family"
	parents?: PersonId[]; // Can be 1-2 parents
	children?: PersonId[];
	homeLocation?: Location;
	timeframe?: {
		start?: FamilyDate;
		end?: FamilyDate;
	};
	notes?: string;
}

// Complete family tree structure
export interface FamilyTree {
	id: string;
	name: string;
	description?: string;

	// Core data
	people: Record<PersonId, Person>;
	marriages: Record<FamilyId, Marriage>;
	families: Record<FamilyId, FamilyUnit>;

	// Tree metadata
	rootPersonId?: PersonId; // The "main" person the tree is built around
	createdAt: Date;
	updatedAt: Date;
	createdBy: string;

	// Settings and preferences
	privacySettings?: {
		showLivingPeople?: boolean;
		showContactInfo?: boolean;
		publicAccess?: boolean;
	};
}

// Utility types for relationships and queries

// Relationship types for family connections
export type RelationshipType =
	| "parent"
	| "child"
	| "spouse"
	| "sibling"
	| "grandparent"
	| "grandchild"
	| "aunt"
	| "uncle"
	| "niece"
	| "nephew"
	| "cousin"
	| "in-law"
	| "great-grandparent"
	| "great-grandchild"
	| "step-parent"
	| "step-child"
	| "step-sibling"
	| "half-sibling"
	| "adopted-parent"
	| "adopted-child";

// For representing discovered relationships
export interface Relationship {
	fromPersonId: PersonId;
	toPersonId: PersonId;
	relationshipType: RelationshipType;
	degree?: number; // How many generations removed (for cousins, etc.)
	throughPersonId?: PersonId; // If relationship is through another person
}

// Search and filter types
export interface PersonSearchCriteria {
	name?: string;
	birthYear?: number;
	birthYearRange?: [number, number];
	location?: string;
	gender?: Gender;
	isLiving?: boolean;
	hasChildren?: boolean;
	occupation?: string;
}

// Statistical information about the family tree
export interface FamilyTreeStats {
	totalPeople: number;
	totalMales: number;
	totalFemales: number;
	totalLiving: number;
	totalDeceased: number;
	totalMarriages: number;
	generationsCount: number;
	oldestPerson?: {
		person: Person;
		age: number;
	};
	youngestPerson?: {
		person: Person;
		age: number;
	};
	averageChildrenPerFamily: number;
	commonSurnames: Array<{ name: string; count: number }>;
}

// Helper types for API responses and data transfer
export interface PersonWithRelationships extends Person {
	father?: Person;
	mother?: Person;
	spouses?: Person[];
	children?: Person[];
	siblings?: Person[];
}

// For partial updates
export type PersonUpdate = Partial<Omit<Person, "id" | "createdAt">> & {
	updatedAt: Date;
};

export type MarriageUpdate = Partial<Omit<Marriage, "id">> & {
	updatedAt?: Date;
};

// All types are already exported above with their definitions
