/**
 * Migration utility to convert flat family tree to hierarchical structure
 */

import type { FamilyTree, Person as FlatPerson } from "./family";
import type { 
  HierarchicalFamilyTree, 
  Person as HierarchicalPerson, 
  Couple, 
  Child 
} from "./hierarchical-family";
import { createPerson, createCouple } from "./hierarchical-family-utils";

/**
 * Convert a flat Person to a hierarchical Person
 */
function convertPerson(flatPerson: FlatPerson): HierarchicalPerson {
  return createPerson(flatPerson.id, flatPerson.firstName, flatPerson.lastName, {
    middleName: flatPerson.middleName,
    maidenName: flatPerson.maidenName,
    nicknames: flatPerson.nicknames,
    gender: flatPerson.gender,
    birthDate: flatPerson.birthDate,
    deathDate: flatPerson.deathDate,
    birthPlace: flatPerson.birthPlace,
    deathPlace: flatPerson.deathPlace,
    occupation: flatPerson.occupation,
    education: flatPerson.education,
    lifeEvents: flatPerson.lifeEvents,
    contactInfo: flatPerson.contactInfo,
    isLiving: flatPerson.isLiving,
    notes: flatPerson.notes,
    sources: flatPerson.sources,
    photos: flatPerson.photos,
    createdAt: flatPerson.createdAt,
    updatedAt: flatPerson.updatedAt,
  });
}

/**
 * Find couples in the flat structure by looking for people with spouse relationships
 */
function findCouples(flatTree: FamilyTree): Array<{ 
  person1: FlatPerson; 
  person2: FlatPerson; 
  children: FlatPerson[] 
}> {
  const couples: Array<{ person1: FlatPerson; person2: FlatPerson; children: FlatPerson[] }> = [];
  const processedPeople = new Set<string>();

  Object.values(flatTree.people).forEach(person => {
    if (processedPeople.has(person.id)) return;

    // Find their spouse(s) - for now we'll handle the first spouse
    const spouseId = person.spouseIds?.[0];
    if (!spouseId) return;

    const spouse = flatTree.people[spouseId];
    if (!spouse || processedPeople.has(spouse.id)) return;

    // Find their children
    const children: FlatPerson[] = [];
    if (person.childrenIds) {
      person.childrenIds.forEach(childId => {
        const child = flatTree.people[childId];
        if (child) {
          children.push(child);
        }
      });
    }

    couples.push({
      person1: person,
      person2: spouse,
      children
    });

    processedPeople.add(person.id);
    processedPeople.add(spouse.id);
  });

  return couples;
}

/**
 * Build the hierarchical structure recursively
 */
function buildHierarchicalStructure(
  flatTree: FamilyTree,
  rootCouple: { person1: FlatPerson; person2: FlatPerson; children: FlatPerson[] },
  allCouples: Array<{ person1: FlatPerson; person2: FlatPerson; children: FlatPerson[] }>
): Couple {
  const hierarchicalCouple: Couple = createCouple(
    `${rootCouple.person1.id}-${rootCouple.person2.id}`,
    convertPerson(rootCouple.person1),
    convertPerson(rootCouple.person2),
    {
      relationshipType: "married",
      isActive: true,
    }
  );

  // Process children
  if (rootCouple.children.length > 0) {
    const children: Child[] = [];

    rootCouple.children.forEach((childPerson, index) => {
      // Check if this child has their own family (is part of a couple as an adult)
      const childCouple = allCouples.find(couple => 
        couple.person1.id === childPerson.id || couple.person2.id === childPerson.id
      );

      const child: Child = {
        person: convertPerson(childPerson),
        birthOrder: index + 1,
      };

      if (childCouple) {
        // This child has their own family - build it recursively
        child.ownFamily = buildHierarchicalStructure(flatTree, childCouple, allCouples);
      }

      children.push(child);
    });

    hierarchicalCouple.children = children;
  }

  return hierarchicalCouple;
}

/**
 * Convert a flat family tree to hierarchical structure
 */
export function migrateToHierarchical(flatTree: FamilyTree): HierarchicalFamilyTree {
  // Find all couples in the flat structure
  const couples = findCouples(flatTree);

  if (couples.length === 0) {
    throw new Error("No couples found in the family tree. Cannot create hierarchical structure.");
  }

  // Find the root couple (the one specified as root or the oldest couple)
  let rootCouple = couples[0]; // Default to first couple

  if (flatTree.rootPersonId) {
    const foundRootCouple = couples.find(couple => 
      couple.person1.id === flatTree.rootPersonId || couple.person2.id === flatTree.rootPersonId
    );
    if (foundRootCouple) {
      rootCouple = foundRootCouple;
    }
  }

  // Build the hierarchical structure starting from the root couple
  const foundingCouple = buildHierarchicalStructure(flatTree, rootCouple, couples);

  // Create the hierarchical family tree
  const hierarchicalTree: HierarchicalFamilyTree = {
    id: `${flatTree.id}-hierarchical`,
    name: flatTree.name,
    description: flatTree.description,
    foundingCouple,
    createdAt: flatTree.createdAt,
    updatedAt: flatTree.updatedAt,
    createdBy: flatTree.createdBy,
    privacySettings: flatTree.privacySettings,
  };

  return hierarchicalTree;
}

/**
 * Helper function to validate the migration
 */
export function validateMigration(
  originalTree: FamilyTree,
  hierarchicalTree: HierarchicalFamilyTree
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Get all people from both structures
  const originalPeople = Object.values(originalTree.people);
  const hierarchicalPeople = getAllPeopleFromHierarchical(hierarchicalTree);

  // Check if all people were migrated
  const originalIds = new Set(originalPeople.map(p => p.id));
  const hierarchicalIds = new Set(hierarchicalPeople.map(p => p.id));

  originalIds.forEach(id => {
    if (!hierarchicalIds.has(id)) {
      errors.push(`Person with ID ${id} was not migrated`);
    }
  });

  // Check for extra people in hierarchical
  hierarchicalIds.forEach(id => {
    if (!originalIds.has(id)) {
      errors.push(`Person with ID ${id} appears in hierarchical but not in original`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper to get all people from hierarchical structure (for validation)
 */
function getAllPeopleFromHierarchical(tree: HierarchicalFamilyTree): HierarchicalPerson[] {
  const people: HierarchicalPerson[] = [];
  
  function collectFromCouple(couple: Couple) {
    people.push(couple.person1, couple.person2);
    
    if (couple.children) {
      couple.children.forEach(child => {
        people.push(child.person);
        if (child.ownFamily) {
          collectFromCouple(child.ownFamily);
        }
      });
    }
  }
  
  collectFromCouple(tree.foundingCouple);
  return people;
}