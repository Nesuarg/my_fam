/**
 * Hierarchical Family Tree Example Data
 * 
 * This demonstrates the Smith family using the new hierarchical structure
 */

import type { HierarchicalFamilyTree, Person, Couple, Child } from "./hierarchical-family";
import { createPerson, createCouple } from "./hierarchical-family-utils";

// Create all the people first
const johnSmith = createPerson("john-smith-1", "John", "Smith", {
  birthDate: { year: 1950, month: 3, day: 15 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  occupation: ["Teacher", "Principal"],
  isLiving: true,
});

const marySmith = createPerson("mary-johnson-1", "Mary", "Smith", {
  birthDate: { year: 1952, month: 8, day: 22 },
  maidenName: "Johnson",
  birthPlace: { city: "New York", state: "New York", country: "USA" },
  gender: "female",
  occupation: ["Nurse"],
  isLiving: true,
});

const davidSmith = createPerson("david-smith-1", "David", "Smith", {
  birthDate: { year: 1975, month: 12, day: 5 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  occupation: ["Software Engineer"],
  isLiving: true,
});

const emilySmith = createPerson("emily-smith-1", "Emily", "Smith", {
  birthDate: { year: 1980, month: 4, day: 15 },
  maidenName: "Brown",
  birthPlace: { city: "Seattle", state: "Washington", country: "USA" },
  gender: "female",
  occupation: ["Teacher"],
  isLiving: true,
});

const sarahSmith = createPerson("sarah-smith-1", "Sarah", "Smith", {
  birthDate: { year: 1978, month: 6, day: 10 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "female",
  occupation: ["Doctor"],
  isLiving: true,
});

const michaelSmith = createPerson("michael-smith-1", "Michael", "Smith", {
  birthDate: { year: 2005, month: 8, day: 12 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  isLiving: true,
});

const sophiaSmith = createPerson("sophia-smith-1", "Sophia", "Smith", {
  birthDate: { year: 2008, month: 3, day: 20 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "female",
  isLiving: true,
});

// Create David & Emily's couple (with their children)
const davidEmilyCouple: Couple = createCouple("david-emily-couple", davidSmith, emilySmith, {
  relationshipType: "married",
  startDate: { year: 2003, month: 9, day: 15 },
  startPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  children: [
    {
      person: michaelSmith,
      birthOrder: 1,
      // Michael doesn't have his own family yet
    },
    {
      person: sophiaSmith,
      birthOrder: 2,
      // Sophia doesn't have her own family yet
    }
  ]
});

// Create the founding couple (John & Mary) with their children
const johnMaryCouple: Couple = createCouple("john-mary-couple", johnSmith, marySmith, {
  relationshipType: "married",
  startDate: { year: 1973, month: 6, day: 20 },
  startPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  children: [
    {
      person: davidSmith,
      birthOrder: 1,
      ownFamily: davidEmilyCouple, // David has his own family
    },
    {
      person: sarahSmith,
      birthOrder: 2,
      // Sarah doesn't have her own family yet
    }
  ]
});

// Create the complete hierarchical family tree
export const smithFamilyTreeHierarchical: HierarchicalFamilyTree = {
  id: "smith-family-tree-hierarchical",
  name: "Smith Family Tree",
  description: "A hierarchical family tree documenting the Smith family lineage",
  foundingCouple: johnMaryCouple,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "family-historian",
  privacySettings: {
    showLivingPeople: true,
    showContactInfo: false,
    publicAccess: false,
  },
};

// Export individual elements for testing
export {
  johnSmith,
  marySmith,
  davidSmith,
  emilySmith,
  sarahSmith,
  michaelSmith,
  sophiaSmith,
  johnMaryCouple,
  davidEmilyCouple,
};

// Helper function to demonstrate the structure
export function printFamilyStructure(familyTree: HierarchicalFamilyTree): void {
  function printCouple(couple: Couple, indent: string = ""): void {
    console.log(`${indent}👫 ${couple.person1.firstName} & ${couple.person2.firstName} ${couple.person1.lastName}`);
    
    if (couple.children) {
      couple.children.forEach(child => {
        if (child.ownFamily) {
          console.log(`${indent}  👶 ${child.person.firstName} (has own family):`);
          printCouple(child.ownFamily, indent + "    ");
        } else {
          console.log(`${indent}  👶 ${child.person.firstName}`);
        }
      });
    }
  }
  
  console.log(`🏠 ${familyTree.name}`);
  printCouple(familyTree.foundingCouple);
}

// Example usage:
if (import.meta.env?.DEV) {
  printFamilyStructure(smithFamilyTreeHierarchical);
}