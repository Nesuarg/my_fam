/**
 * Hierarchical Family Tree Data Structure
 * 
 * This approach organizes family data around couples and their children,
 * creating a natural tree structure that supports infinite generations.
 */

import type { FamilyDate, Location, Gender, ContactInfo, LifeEvent } from "./family";

export type PersonId = string;
export type CoupleId = string;
export type FamilyId = string;

// Basic person information (without complex relationships)
export interface Person {
  id: PersonId;
  
  // Personal information
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
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
  lifeEvents?: LifeEvent[];
  
  // Contact (for living relatives)
  contactInfo?: ContactInfo;
  isLiving?: boolean;
  
  // Metadata
  notes?: string;
  sources?: string[];
  photos?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// A couple represents two people in a relationship
export interface Couple {
  id: CoupleId;
  
  // The two people in the relationship
  person1: Person;
  person2: Person;
  
  // Relationship details
  relationshipType: "married" | "partnership" | "common-law" | "unknown";
  startDate?: FamilyDate;  // marriage/partnership date
  endDate?: FamilyDate;    // divorce/separation/death date
  startPlace?: Location;
  endPlace?: Location;
  
  // Their children (who may have their own families)
  children?: Child[];
  
  // Metadata
  notes?: string;
  sources?: string[];
  isActive?: boolean;
}

// A child can either be a single person or part of a couple (if they have their own family)
export interface Child {
  // Basic person info
  person: Person;
  
  // If this child has their own family, this links to it
  ownFamily?: Couple;
  
  // Birth order among siblings
  birthOrder?: number;
}

// Root family tree structure
export interface HierarchicalFamilyTree {
  id: FamilyId;
  name: string;
  description?: string;
  
  // The founding couple that starts this family tree
  foundingCouple: Couple;
  
  // Tree metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Settings
  privacySettings?: {
    showLivingPeople?: boolean;
    showContactInfo?: boolean;
    publicAccess?: boolean;
  };
}

// Utility types for navigation and queries

// For breadcrumb navigation - shows the path from root to current couple
export interface FamilyPath {
  couples: Array<{
    couple: Couple;
    childName?: string; // Which child led to the next couple
  }>;
}

// For search and filtering
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

// Statistics for the entire family tree
export interface HierarchicalFamilyStats {
  totalPeople: number;
  totalCouples: number;
  totalGenerations: number;
  totalMales: number;
  totalFemales: number;
  totalLiving: number;
  totalDeceased: number;
  averageChildrenPerCouple: number;
  oldestPerson?: { person: Person; age: number };
  youngestPerson?: { person: Person; age: number };
  commonSurnames: Array<{ name: string; count: number }>;
}

// Export all types
export type {
  Person,
  Couple,
  Child,
  HierarchicalFamilyTree,
  FamilyPath,
  PersonSearchCriteria,
  HierarchicalFamilyStats,
  PersonId,
  CoupleId,
  FamilyId,
};