/**
 * Hierarchical Family Tree Utility Functions
 * 
 * Helper functions for working with the hierarchical family tree structure
 */

import type {
  Person,
  Couple,
  Child,
  HierarchicalFamilyTree,
  FamilyPath,
  PersonId,
  CoupleId,
  HierarchicalFamilyStats,
} from "./hierarchical-family";

import type { FamilyDate } from "./family";

// Re-export utility functions from the original family-utils that we still need
import { calculateAge, formatDate } from "./family-utils";

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
 * Check if a person is living
 */
export function isLiving(person: Person): boolean {
  if (person.isLiving !== undefined) {
    return person.isLiving;
  }
  return !person.deathDate;
}

/**
 * Get couple display name (e.g., "John & Mary Smith")
 */
export function getCoupleDisplayName(couple: Couple): string {
  const name1 = couple.person1.firstName;
  const name2 = couple.person2.firstName;
  
  // Use the last name that's not a maiden name, or the first person's last name
  const lastName = couple.person1.lastName;
  
  return `${name1} & ${name2} ${lastName}`;
}

/**
 * Get all people in a family tree (flattened from the hierarchy)
 */
export function getAllPeople(familyTree: HierarchicalFamilyTree): Person[] {
  const peopleMap = new Map<PersonId, Person>();
  
  function collectPeopleFromCouple(couple: Couple) {
    peopleMap.set(couple.person1.id, couple.person1);
    peopleMap.set(couple.person2.id, couple.person2);
    
    if (couple.children) {
      couple.children.forEach(child => {
        peopleMap.set(child.person.id, child.person);
        if (child.ownFamily) {
          collectPeopleFromCouple(child.ownFamily);
        }
      });
    }
  }
  
  collectPeopleFromCouple(familyTree.foundingCouple);
  return Array.from(peopleMap.values());
}

/**
 * Get all couples in a family tree (flattened from the hierarchy)
 */
export function getAllCouples(familyTree: HierarchicalFamilyTree): Couple[] {
  const couples: Couple[] = [];
  
  function collectCouples(couple: Couple) {
    couples.push(couple);
    
    if (couple.children) {
      couple.children.forEach(child => {
        if (child.ownFamily) {
          collectCouples(child.ownFamily);
        }
      });
    }
  }
  
  collectCouples(familyTree.foundingCouple);
  return couples;
}

/**
 * Find a person by ID anywhere in the family tree
 */
export function findPersonById(familyTree: HierarchicalFamilyTree, personId: PersonId): Person | null {
  function searchInCouple(couple: Couple): Person | null {
    if (couple.person1.id === personId) return couple.person1;
    if (couple.person2.id === personId) return couple.person2;
    
    if (couple.children) {
      for (const child of couple.children) {
        if (child.person.id === personId) return child.person;
        if (child.ownFamily) {
          const found = searchInCouple(child.ownFamily);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInCouple(familyTree.foundingCouple);
}

/**
 * Find a couple by ID anywhere in the family tree
 */
export function findCoupleById(familyTree: HierarchicalFamilyTree, coupleId: CoupleId): Couple | null {
  function searchInCouple(couple: Couple): Couple | null {
    if (couple.id === coupleId) return couple;
    
    if (couple.children) {
      for (const child of couple.children) {
        if (child.ownFamily) {
          const found = searchInCouple(child.ownFamily);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInCouple(familyTree.foundingCouple);
}

/**
 * Find which couple a person belongs to (as a parent, not child)
 */
export function findPersonsCouple(familyTree: HierarchicalFamilyTree, personId: PersonId): Couple | null {
  function searchInCouple(couple: Couple): Couple | null {
    if (couple.person1.id === personId || couple.person2.id === personId) {
      return couple;
    }
    
    if (couple.children) {
      for (const child of couple.children) {
        if (child.ownFamily) {
          const found = searchInCouple(child.ownFamily);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInCouple(familyTree.foundingCouple);
}

/**
 * Get the parents of a person (returns the couple they are a child of)
 */
export function getParentsCouple(familyTree: HierarchicalFamilyTree, personId: PersonId): Couple | null {
  function searchInCouple(couple: Couple): Couple | null {
    if (couple.children) {
      for (const child of couple.children) {
        if (child.person.id === personId) {
          return couple; // This couple are the parents
        }
        if (child.ownFamily) {
          const found = searchInCouple(child.ownFamily);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInCouple(familyTree.foundingCouple);
}

/**
 * Get all children of a person (looks for couples where they are a parent)
 */
export function getChildren(familyTree: HierarchicalFamilyTree, personId: PersonId): Person[] {
  const couple = findPersonsCouple(familyTree, personId);
  if (!couple || !couple.children) return [];
  
  return couple.children.map(child => child.person);
}

/**
 * Get siblings of a person
 */
export function getSiblings(familyTree: HierarchicalFamilyTree, personId: PersonId): Person[] {
  const parentsCouple = getParentsCouple(familyTree, personId);
  if (!parentsCouple || !parentsCouple.children) return [];
  
  return parentsCouple.children
    .map(child => child.person)
    .filter(person => person.id !== personId);
}

/**
 * Get spouse of a person
 */
export function getSpouse(familyTree: HierarchicalFamilyTree, personId: PersonId): Person | null {
  const couple = findPersonsCouple(familyTree, personId);
  if (!couple) return null;
  
  return couple.person1.id === personId ? couple.person2 : couple.person1;
}

/**
 * Calculate generation level relative to the founding couple
 */
export function getGenerationLevel(familyTree: HierarchicalFamilyTree, personId: PersonId): number {
  function searchInCouple(couple: Couple, level: number): number | null {
    // Check if person is one of the parents in this couple
    if (couple.person1.id === personId || couple.person2.id === personId) {
      return level;
    }
    
    // Check if person is a child of this couple
    if (couple.children) {
      for (const child of couple.children) {
        if (child.person.id === personId) {
          return level + 1;
        }
        if (child.ownFamily) {
          const found = searchInCouple(child.ownFamily, level + 1);
          if (found !== null) return found;
        }
      }
    }
    
    return null;
  }
  
  return searchInCouple(familyTree.foundingCouple, 0) ?? 0;
}

/**
 * Get family path from root to a specific person
 */
export function getFamilyPath(familyTree: HierarchicalFamilyTree, personId: PersonId): FamilyPath | null {
  function findPath(couple: Couple, path: FamilyPath): FamilyPath | null {
    // Check if person is one of the parents in this couple
    if (couple.person1.id === personId || couple.person2.id === personId) {
      path.couples.push({ couple });
      return path;
    }
    
    // Check if person is a child of this couple
    if (couple.children) {
      for (const child of couple.children) {
        if (child.person.id === personId) {
          path.couples.push({ couple });
          return path;
        }
        if (child.ownFamily) {
          const childPath = findPath(child.ownFamily, {
            couples: [...path.couples, { couple, childName: getFullName(child.person) }]
          });
          if (childPath) return childPath;
        }
      }
    }
    
    return null;
  }
  
  return findPath(familyTree.foundingCouple, { couples: [] });
}

/**
 * Search for people by name in the family tree
 */
export function searchPeopleByName(familyTree: HierarchicalFamilyTree, query: string): Person[] {
  const searchTerm = query.toLowerCase();
  const allPeople = getAllPeople(familyTree);
  
  return allPeople.filter(person => {
    const fullName = getFullName(person).toLowerCase();
    const displayName = getDisplayName(person).toLowerCase();
    
    return (
      fullName.includes(searchTerm) ||
      displayName.includes(searchTerm) ||
      person.nicknames?.some(nickname => 
        nickname.toLowerCase().includes(searchTerm)
      )
    );
  });
}

/**
 * Calculate family tree statistics
 */
export function calculateFamilyStats(familyTree: HierarchicalFamilyTree): HierarchicalFamilyStats {
  const allPeople = getAllPeople(familyTree);
  const allCouples = getAllCouples(familyTree);
  
  const males = allPeople.filter(p => p.gender === "male").length;
  const females = allPeople.filter(p => p.gender === "female").length;
  const living = allPeople.filter(isLiving).length;
  const deceased = allPeople.length - living;
  
  // Calculate total children across all couples
  const totalChildren = allCouples.reduce((sum, couple) => sum + (couple.children?.length || 0), 0);
  const averageChildren = allCouples.length > 0 ? totalChildren / allCouples.length : 0;
  
  // Find oldest and youngest
  let oldestPerson: { person: Person; age: number } | undefined;
  let youngestPerson: { person: Person; age: number } | undefined;
  
  allPeople.forEach(person => {
    if (person.birthDate) {
      const age = calculateAge(person.birthDate, person.deathDate);
      if (age !== null) {
        if (!oldestPerson || age > oldestPerson.age) {
          oldestPerson = { person, age };
        }
        if (!youngestPerson || age < youngestPerson.age) {
          youngestPerson = { person, age };
        }
      }
    }
  });
  
  // Calculate generation count
  let maxGeneration = 0;
  allPeople.forEach(person => {
    const generation = getGenerationLevel(familyTree, person.id);
    maxGeneration = Math.max(maxGeneration, generation);
  });
  
  // Calculate surname frequency
  const surnameMap = new Map<string, number>();
  allPeople.forEach(person => {
    surnameMap.set(person.lastName, (surnameMap.get(person.lastName) || 0) + 1);
  });
  
  const commonSurnames = Array.from(surnameMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  return {
    totalPeople: allPeople.length,
    totalCouples: allCouples.length,
    totalGenerations: maxGeneration + 1,
    totalMales: males,
    totalFemales: females,
    totalLiving: living,
    totalDeceased: deceased,
    averageChildrenPerCouple: averageChildren,
    oldestPerson,
    youngestPerson,
    commonSurnames
  };
}

/**
 * Helper function to create a basic person
 */
export function createPerson(
  id: PersonId,
  firstName: string,
  lastName: string,
  options: Partial<Omit<Person, "id" | "firstName" | "lastName">> = {}
): Person {
  return {
    id,
    firstName,
    lastName,
    ...options
  };
}

/**
 * Helper function to create a couple
 */
export function createCouple(
  id: CoupleId,
  person1: Person,
  person2: Person,
  options: Partial<Omit<Couple, "id" | "person1" | "person2">> = {}
): Couple {
  return {
    id,
    person1,
    person2,
    relationshipType: "married",
    isActive: true,
    ...options
  };
}

// Re-export needed functions from family-utils
export { calculateAge, formatDate };