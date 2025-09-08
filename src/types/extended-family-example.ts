/**
 * Extended family example with multiple generations
 */

import type { Person, FamilyTree, Marriage } from "./family";
import { createPerson } from "./family-utils";

// Grandparents generation
const williamSmith: Person = createPerson("william-smith-1", "William", "Smith", {
  birthDate: { year: 1925, month: 5, day: 8 },
  deathDate: { year: 2010, month: 3, day: 15 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  occupation: ["Factory Worker"],
  isLiving: false,
  childrenIds: ["john-smith-1"],
});

const dorothyBrown: Person = createPerson("dorothy-brown-1", "Dorothy", "Smith", {
  birthDate: { year: 1928, month: 11, day: 22 },
  deathDate: { year: 2015, month: 7, day: 8 },
  maidenName: "Brown",
  birthPlace: { city: "Cambridge", state: "Massachusetts", country: "USA" },
  gender: "female",
  occupation: ["Seamstress"],
  isLiving: false,
  spouseIds: ["william-smith-1"],
  childrenIds: ["john-smith-1"],
});

const robertJohnson: Person = createPerson("robert-johnson-1", "Robert", "Johnson", {
  birthDate: { year: 1922, month: 2, day: 14 },
  deathDate: { year: 2008, month: 9, day: 5 },
  birthPlace: { city: "New York", state: "New York", country: "USA" },
  gender: "male",
  occupation: ["Accountant"],
  isLiving: false,
  childrenIds: ["mary-johnson-1"],
});

const helenWilson: Person = createPerson("helen-wilson-1", "Helen", "Johnson", {
  birthDate: { year: 1924, month: 7, day: 30 },
  deathDate: { year: 2012, month: 12, day: 18 },
  maidenName: "Wilson",
  birthPlace: { city: "Brooklyn", state: "New York", country: "USA" },
  gender: "female",
  occupation: ["Teacher"],
  isLiving: false,
  spouseIds: ["robert-johnson-1"],
  childrenIds: ["mary-johnson-1"],
});

// Parents generation
const johnSmith: Person = createPerson("john-smith-1", "John", "Smith", {
  birthDate: { year: 1950, month: 3, day: 15 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  occupation: ["Teacher", "Principal"],
  isLiving: true,
  fatherId: "william-smith-1",
  motherId: "dorothy-brown-1",
  spouseIds: ["mary-johnson-1"],
  childrenIds: ["david-smith-1", "sarah-smith-1"],
});

const maryJohnson: Person = createPerson("mary-johnson-1", "Mary", "Smith", {
  birthDate: { year: 1952, month: 8, day: 22 },
  maidenName: "Johnson",
  birthPlace: { city: "New York", state: "New York", country: "USA" },
  gender: "female",
  occupation: ["Nurse"],
  isLiving: true,
  fatherId: "robert-johnson-1",
  motherId: "helen-wilson-1",
  spouseIds: ["john-smith-1"],
  childrenIds: ["david-smith-1", "sarah-smith-1"],
});

// Children generation
const davidSmith: Person = createPerson("david-smith-1", "David", "Smith", {
  birthDate: { year: 1975, month: 12, day: 5 },
  birthPlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  gender: "male",
  occupation: ["Software Engineer"],
  fatherId: "john-smith-1",
  motherId: "mary-johnson-1",
  isLiving: true,
  siblingIds: ["sarah-smith-1"],
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

// Update relationship references for grandparents
williamSmith.spouseIds = ["dorothy-brown-1"];
dorothyBrown.spouseIds = ["william-smith-1"];
robertJohnson.spouseIds = ["helen-wilson-1"];
helenWilson.spouseIds = ["robert-johnson-1"];

// Marriage records
const williamDorothyMarriage: Marriage = {
  id: "marriage-william-dorothy-1",
  spouseIds: ["william-smith-1", "dorothy-brown-1"],
  marriageDate: { year: 1948, month: 6, day: 12 },
  marriagePlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  childrenIds: ["john-smith-1"],
  isActive: false, // Both deceased
};

const robertHelenMarriage: Marriage = {
  id: "marriage-robert-helen-1",
  spouseIds: ["robert-johnson-1", "helen-wilson-1"],
  marriageDate: { year: 1950, month: 4, day: 25 },
  marriagePlace: { city: "New York", state: "New York", country: "USA" },
  childrenIds: ["mary-johnson-1"],
  isActive: false, // Both deceased
};

const johnMaryMarriage: Marriage = {
  id: "marriage-john-mary-1",
  spouseIds: ["john-smith-1", "mary-johnson-1"],
  marriageDate: { year: 1973, month: 6, day: 20 },
  marriagePlace: { city: "Boston", state: "Massachusetts", country: "USA" },
  childrenIds: ["david-smith-1", "sarah-smith-1"],
  isActive: true,
};

// Extended family tree with 3 generations
const extendedSmithFamilyTree: FamilyTree = {
  id: "extended-smith-family-tree",
  name: "The Smith Family Tree (3 Generations)",
  description: "A multi-generational family tree showing grandparents, parents, and children",
  people: {
    // Grandparents
    "william-smith-1": williamSmith,
    "dorothy-brown-1": dorothyBrown,
    "robert-johnson-1": robertJohnson,
    "helen-wilson-1": helenWilson,
    // Parents
    "john-smith-1": johnSmith,
    "mary-johnson-1": maryJohnson,
    // Children
    "david-smith-1": davidSmith,
    "sarah-smith-1": sarahSmith,
  },
  marriages: {
    "marriage-william-dorothy-1": williamDorothyMarriage,
    "marriage-robert-helen-1": robertHelenMarriage,
    "marriage-john-mary-1": johnMaryMarriage,
  },
  families: {},
  rootPersonId: "john-smith-1", // Middle generation as root
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "family-historian",
  privacySettings: {
    showLivingPeople: true,
    showContactInfo: false,
    publicAccess: false,
  },
};

export { extendedSmithFamilyTree };
export type { Person, FamilyTree, Marriage };