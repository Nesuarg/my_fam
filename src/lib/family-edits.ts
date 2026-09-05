import type { FamilyData, SimplePerson } from "@/types/simple-family";

interface NewPersonInput {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dob: string;
}

export function generatePersonId(firstName: string, data: FamilyData): string {
  if (!firstName.trim()) throw new Error("First name is required");
  const base = firstName.trim().toLowerCase().replace(/\s+/g, "-");
  const existingIds = new Set(data.people.map((p) => p.id));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function cloneData(data: FamilyData): FamilyData {
  return JSON.parse(JSON.stringify(data));
}

function parseDob(dob: string): number {
  const match = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new Error(`Invalid date format "${dob}" — expected M/D/YYYY`);
  const year = parseInt(match[3], 10);
  if (year < 1800 || year > new Date().getFullYear() + 1) {
    throw new Error(`Birth year ${year} is out of range`);
  }
  return year;
}

function computeAge(dob: string): number {
  return new Date().getFullYear() - parseDob(dob);
}

function validateNewPerson(input: NewPersonInput): void {
  if (!input.firstName.trim()) throw new Error("First name is required");
  if (!input.lastName.trim()) throw new Error("Last name is required");
  parseDob(input.dob); // validates format and range
}

export function applyAddChild(
  data: FamilyData,
  coupleId: string,
  child: NewPersonInput,
): FamilyData {
  validateNewPerson(child);
  const result = cloneData(data);
  const couple = result.couples.find((c) => c.id === coupleId);
  if (!couple) throw new Error(`Couple ${coupleId} not found`);

  const personId = generatePersonId(child.firstName, result);
  const newPerson: SimplePerson = {
    id: personId,
    firstName: child.firstName,
    lastName: child.lastName,
    age: computeAge(child.dob),
    gender: child.gender,
    dob: child.dob,
  };
  result.people.push(newPerson);

  if (!couple.children) couple.children = [];
  const maxOrder = couple.children.reduce((max, ch) => Math.max(max, ch.birthOrder), 0);
  couple.children.push({ personId, birthOrder: maxOrder + 1 });

  return result;
}

export function applyAddCouple(
  data: FamilyData,
  personId: string,
  partner: NewPersonInput,
  relationshipType: "married" | "partnership" | "common-law",
): FamilyData {
  validateNewPerson(partner);
  const result = cloneData(data);
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  // Check if person already has a couple
  const existingCouple = result.couples.find(
    (c) => c.person1Id === personId || c.person2Id === personId,
  );
  if (existingCouple) throw new Error(`Person ${personId} already has a partner`);

  const partnerId = generatePersonId(partner.firstName, result);
  const newPartner: SimplePerson = {
    id: partnerId,
    firstName: partner.firstName,
    lastName: partner.lastName,
    age: computeAge(partner.dob),
    gender: partner.gender,
    dob: partner.dob,
  };
  result.people.push(newPartner);

  const coupleId = `${personId}-${partnerId}`;
  result.couples.push({
    id: coupleId,
    person1Id: personId,
    person2Id: partnerId,
    relationshipType,
  });

  for (const couple of result.couples) {
    if (couple.children) {
      const childRef = couple.children.find((ch) => ch.personId === personId);
      if (childRef && !childRef.ownFamilyId) {
        childRef.ownFamilyId = coupleId;
        break;
      }
    }
  }

  return result;
}

export function applyEditPerson(
  data: FamilyData,
  personId: string,
  fields: Partial<Pick<SimplePerson, "firstName" | "lastName" | "dob" | "gender">>,
): FamilyData {
  const result = cloneData(data);
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

  if (fields.firstName !== undefined) {
    if (!fields.firstName.trim()) throw new Error("First name cannot be empty");
    person.firstName = fields.firstName;
  }
  if (fields.lastName !== undefined) {
    if (!fields.lastName.trim()) throw new Error("Last name cannot be empty");
    person.lastName = fields.lastName;
  }
  if (fields.dob !== undefined) {
    parseDob(fields.dob); // validate before applying
    person.dob = fields.dob;
    person.age = computeAge(fields.dob);
  }
  if (fields.gender !== undefined) person.gender = fields.gender;

  return result;
}

/** Suffix wheel-graph gives a child who has no couple of their own. */
const UNCOUPLED_SUFFIX = "-uncoupled";

/**
 * Removes a node and everything below it: the couple, both partners, every
 * descendant couple and their people, and the child entry pointing at it from
 * the parent. The root couple cannot go — it is what the whole tree hangs from.
 */
export function applyDeleteNode(data: FamilyData, nodeId: string): FamilyData {
  const result = cloneData(data);

  // A childless child is only a person; there is no couple to remove.
  if (nodeId.endsWith(UNCOUPLED_SUFFIX)) {
    const personId = nodeId.slice(0, -UNCOUPLED_SUFFIX.length);
    if (!result.people.some((p) => p.id === personId)) {
      throw new Error(`Person ${personId} not found`);
    }
    detachChild(result, personId);
    result.people = result.people.filter((p) => p.id !== personId);
    return result;
  }

  const target = result.couples.find((c) => c.id === nodeId);
  if (!target) throw new Error(`Couple ${nodeId} not found`);

  const isReferencedAsChild = result.couples.some((c) =>
    (c.children ?? []).some((child) => child.ownFamilyId === nodeId),
  );
  if (!isReferencedAsChild) {
    throw new Error("Stamparret kan ikke slettes");
  }

  // Walk down, collecting every couple and person that goes with it.
  const doomedCouples = new Set<string>();
  const doomedPeople = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (doomedCouples.has(currentId)) continue;
    doomedCouples.add(currentId);

    const couple = result.couples.find((c) => c.id === currentId);
    if (!couple) continue;

    doomedPeople.add(couple.person1Id);
    if (couple.person2Id) doomedPeople.add(couple.person2Id);

    for (const child of couple.children ?? []) {
      doomedPeople.add(child.personId);
      if (child.ownFamilyId) queue.push(child.ownFamilyId);
    }
  }

  detachChild(result, target.person1Id);
  result.couples = result.couples.filter((c) => !doomedCouples.has(c.id));
  result.people = result.people.filter((p) => !doomedPeople.has(p.id));

  return result;
}

/** Drops the child entry for a person from whichever couple lists them. */
function detachChild(data: FamilyData, personId: string): void {
  for (const couple of data.couples) {
    if (!couple.children) continue;
    const index = couple.children.findIndex((child) => child.personId === personId);
    if (index !== -1) {
      couple.children.splice(index, 1);
      return;
    }
  }
}

/** How many people a delete would remove — for the confirmation prompt. */
export function countDeletion(data: FamilyData, nodeId: string): number {
  try {
    return data.people.length - applyDeleteNode(data, nodeId).people.length;
  } catch {
    return 0;
  }
}
