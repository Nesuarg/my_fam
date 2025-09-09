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
  person2Id: string;
  relationshipType: "married" | "partnership" | "common-law";
  children?: SimpleChild[];
}

export interface SimpleFamilyTree {
  id: string;
  name: string;
  description?: string;
  foundingCoupleId: string;
}

// Populated types with full object references
export interface PopulatedCouple extends Omit<SimpleCouple, 'person1Id' | 'person2Id' | 'children'> {
  person1: SimplePerson;
  person2: SimplePerson;
  children?: Array<Omit<SimpleChild, 'personId' | 'ownFamilyId'> & {
    person: SimplePerson;
    ownFamily?: PopulatedCouple;
  }>;
}

export interface PopulatedFamilyTree extends Omit<SimpleFamilyTree, 'foundingCoupleId'> {
  foundingCouple: PopulatedCouple;
  allPeople: SimplePerson[];
}