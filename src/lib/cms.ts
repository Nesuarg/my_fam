/**
 * Git-based CMS utilities for family tree data
 * Handles loading and saving family member and couple data from JSON files
 */

import fs from 'fs';
import path from 'path';
import type { Person, FamilyDate, Location } from '../types/family';
import type { HierarchicalFamilyTree, Couple } from '../types/hierarchical-family';

export interface CoupleData {
  id: string;
  person1Id: string;
  person2Id: string;
  relationshipType: 'married' | 'partner' | 'divorced' | 'separated';
  startDate?: FamilyDate;
  endDate?: FamilyDate;
  startPlace?: Location;
  childrenIds?: string[];
  isFoundingCouple?: boolean;
  createdAt: string;
  updatedAt: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content');
const PEOPLE_DIR = path.join(CONTENT_DIR, 'people');
const COUPLES_DIR = path.join(CONTENT_DIR, 'couples');

// Ensure directories exist
export function ensureDirectories() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
  if (!fs.existsSync(PEOPLE_DIR)) {
    fs.mkdirSync(PEOPLE_DIR, { recursive: true });
  }
  if (!fs.existsSync(COUPLES_DIR)) {
    fs.mkdirSync(COUPLES_DIR, { recursive: true });
  }
}

// Load all people from JSON files
export function loadAllPeople(): Person[] {
  ensureDirectories();
  
  if (!fs.existsSync(PEOPLE_DIR)) {
    return [];
  }

  const files = fs.readdirSync(PEOPLE_DIR).filter(file => file.endsWith('.json'));
  const people: Person[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(PEOPLE_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const person = JSON.parse(content) as Person;
      people.push(person);
    } catch (error) {
      console.error(`Error loading person from ${file}:`, error);
    }
  }

  return people;
}

// Load all couples from JSON files
export function loadAllCouples(): CoupleData[] {
  ensureDirectories();
  
  if (!fs.existsSync(COUPLES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(COUPLES_DIR).filter(file => file.endsWith('.json'));
  const couples: CoupleData[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(COUPLES_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const couple = JSON.parse(content) as CoupleData;
      couples.push(couple);
    } catch (error) {
      console.error(`Error loading couple from ${file}:`, error);
    }
  }

  return couples;
}

// Load a single person by ID
export function loadPersonById(id: string): Person | null {
  try {
    const filePath = path.join(PEOPLE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Person;
  } catch (error) {
    console.error(`Error loading person ${id}:`, error);
    return null;
  }
}

// Save a person to a JSON file
export function savePerson(person: Person): void {
  ensureDirectories();
  
  const filePath = path.join(PEOPLE_DIR, `${person.id}.json`);
  const content = JSON.stringify(person, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Save a couple to a JSON file
export function saveCouple(couple: CoupleData): void {
  ensureDirectories();
  
  const filePath = path.join(COUPLES_DIR, `${couple.id}.json`);
  const content = JSON.stringify(couple, null, 2);
  fs.writeFileSync(filePath, content, 'utf-8');
}

// Build hierarchical family tree from file data
export function buildHierarchicalFamilyTree(): HierarchicalFamilyTree | null {
  const people = loadAllPeople();
  const allCouples = loadAllCouples();
  
  if (people.length === 0) {
    return null;
  }

  // Create person lookup
  const peopleById = new Map(people.map(p => [p.id, p]));
  
  // Find founding couple
  const foundingCoupleData = allCouples.find(c => c.isFoundingCouple);
  if (!foundingCoupleData) {
    return null;
  }

  // Convert couple data to Couple objects
  function buildCouple(coupleData: CoupleData): Couple | null {
    const person1 = peopleById.get(coupleData.person1Id);
    const person2 = peopleById.get(coupleData.person2Id);
    
    if (!person1 || !person2) {
      return null;
    }

    const children = coupleData.childrenIds?.map(childId => {
      const childPerson = peopleById.get(childId);
      if (!childPerson) return null;

      // Look for the child's own family in the allCouples array
      const childCoupleData = allCouples.find(c => 
        (c.person1Id === childId || c.person2Id === childId) && !c.isFoundingCouple
      );
      
      const ownFamily = childCoupleData ? buildCouple(childCoupleData) : undefined;

      return {
        person: childPerson,
        birthOrder: 1, // We'll need to enhance this later
        ownFamily
      };
    }).filter(child => child !== null) || [];

    return {
      id: coupleData.id,
      person1,
      person2,
      relationshipType: coupleData.relationshipType,
      startDate: coupleData.startDate,
      endDate: coupleData.endDate,
      startPlace: coupleData.startPlace,
      children: children as any[], // Type assertion for now
      notes: '',
      createdAt: new Date(coupleData.createdAt),
      updatedAt: new Date(coupleData.updatedAt)
    };
  }

  const foundingCouple = buildCouple(foundingCoupleData);
  if (!foundingCouple) {
    return null;
  }

  return {
    id: 'family-tree-from-cms',
    name: 'Family Tree',
    description: 'Family tree loaded from CMS data',
    foundingCouple,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'cms-system',
    privacySettings: {
      showLivingPeople: true,
      showContactInfo: false,
      publicAccess: false
    }
  };
}

// Generate a unique ID for new people
export function generatePersonId(firstName: string, lastName: string): string {
  const base = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
  const existing = loadAllPeople();
  let counter = 1;
  
  let id = `${base}-${counter}`;
  while (existing.some(p => p.id === id)) {
    counter++;
    id = `${base}-${counter}`;
  }
  
  return id;
}