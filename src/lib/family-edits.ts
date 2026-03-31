import type { FamilyData, SimplePerson } from "@/types/simple-family";

interface NewPersonInput {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  dob: string;
}

export function generatePersonId(firstName: string, data: FamilyData): string {
  const base = firstName.toLowerCase().replace(/\s+/g, "-");
  const existingIds = new Set(data.people.map((p) => p.id));
  if (!existingIds.has(base)) return base;
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function cloneData(data: FamilyData): FamilyData {
  return JSON.parse(JSON.stringify(data));
}

function computeAge(dob: string): number {
  const parts = dob.split("/");
  const birthYear = parseInt(parts[2], 10);
  return new Date().getFullYear() - birthYear;
}

export function applyAddChild(
  data: FamilyData,
  coupleId: string,
  child: NewPersonInput,
): FamilyData {
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
  const result = cloneData(data);
  const person = result.people.find((p) => p.id === personId);
  if (!person) throw new Error(`Person ${personId} not found`);

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

  if (fields.firstName !== undefined) person.firstName = fields.firstName;
  if (fields.lastName !== undefined) person.lastName = fields.lastName;
  if (fields.dob !== undefined) {
    person.dob = fields.dob;
    person.age = computeAge(fields.dob);
  }
  if (fields.gender !== undefined) person.gender = fields.gender;

  return result;
}
