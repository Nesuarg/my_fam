/**
 * Utilities for loading and processing simplified family data from JSON
 */

import type { 
  SimplePerson, 
  SimpleCouple, 
  SimpleFamilyTree, 
  PopulatedCouple, 
  PopulatedFamilyTree 
} from './simple-family';

/**
 * Load family data from JSON files (in Astro, we'll need to import them statically)
 */
export async function loadFamilyData(): Promise<PopulatedFamilyTree> {
  // In a real app, these would be loaded from the content folder
  // For now, we'll import them statically since we're in an Astro context
  const { default: people } = await import('../../content/people.json');
  const { default: couples } = await import('../../content/couples.json');
  const { default: familyTree } = await import('../../content/family-tree.json');
  
  return populateFamilyTree(familyTree, people, couples);
}

/**
 * Convert simple data structures to populated ones with full object references
 */
export function populateFamilyTree(
  familyTree: SimpleFamilyTree,
  people: SimplePerson[],
  couples: SimpleCouple[]
): PopulatedFamilyTree {
  // Create a lookup map for people
  const personMap = new Map<string, SimplePerson>();
  people.forEach(person => personMap.set(person.id, person));
  
  // Create a lookup map for couples
  const coupleMap = new Map<string, SimpleCouple>();
  couples.forEach(couple => coupleMap.set(couple.id, couple));
  
  // Function to populate a couple recursively
  const populateCouple = (coupleId: string): PopulatedCouple | undefined => {
    const couple = coupleMap.get(coupleId);
    if (!couple) return undefined;
    
    const person1 = personMap.get(couple.person1Id);
    const person2 = personMap.get(couple.person2Id);
    
    if (!person1 || !person2) return undefined;
    
    const populatedCouple: PopulatedCouple = {
      id: couple.id,
      relationshipType: couple.relationshipType,
      person1,
      person2,
    };
    
    if (couple.children) {
      populatedCouple.children = couple.children.map(child => {
        const person = personMap.get(child.personId);
        if (!person) throw new Error(`Person ${child.personId} not found`);
        
        const result: PopulatedCouple['children'][0] = {
          person,
          birthOrder: child.birthOrder,
        };
        
        if (child.ownFamilyId) {
          result.ownFamily = populateCouple(child.ownFamilyId);
        }
        
        return result;
      });
    }
    
    return populatedCouple;
  };
  
  const foundingCouple = populateCouple(familyTree.foundingCoupleId);
  if (!foundingCouple) {
    throw new Error(`Founding couple ${familyTree.foundingCoupleId} not found`);
  }
  
  return {
    id: familyTree.id,
    name: familyTree.name,
    description: familyTree.description,
    foundingCouple,
    allPeople: people,
  };
}

/**
 * Get all people from a populated family tree (flattened)
 */
export function getAllPeople(familyTree: PopulatedFamilyTree): SimplePerson[] {
  return familyTree.allPeople;
}

/**
 * Calculate the level (generation) of a couple in the family tree
 */
export function calculateCoupleLevel(
  couple: PopulatedCouple, 
  rootCouple: PopulatedCouple
): number {
  if (couple.id === rootCouple.id) {
    return 0;
  }
  
  // Search through all children recursively
  const searchChildren = (searchCouple: PopulatedCouple, currentLevel: number): number | null => {
    if (!searchCouple.children) return null;
    
    for (const child of searchCouple.children) {
      if (child.ownFamily?.id === couple.id) {
        return currentLevel + 1;
      }
      
      if (child.ownFamily) {
        const found = searchChildren(child.ownFamily, currentLevel + 1);
        if (found !== null) return found;
      }
    }
    
    return null;
  };
  
  const level = searchChildren(rootCouple, 0);
  return level !== null ? level : 0;
}

/**
 * Get background color class for a specific level
 */
export function getLevelBackgroundClass(level: number): string {
  const backgrounds = [
    'bg-blue-50',      // Level 0 (founding couple)
    'bg-green-50',     // Level 1 (their children's families)
    'bg-yellow-50',    // Level 2 (grandchildren's families)
    'bg-purple-50',    // Level 3
    'bg-pink-50',      // Level 4
    'bg-indigo-50',    // Level 5
  ];
  
  return backgrounds[level % backgrounds.length] || 'bg-gray-50';
}