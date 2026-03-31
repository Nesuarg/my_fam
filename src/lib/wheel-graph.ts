import type { FamilyData, SimpleCouple, SimplePerson } from "@/types/simple-family";

export interface WheelNode {
  coupleId: string;
  generation: number;
  birthYear: number;
  birthOrder: number;
  fabriciusPerson: SimplePerson;
  partnerPerson: SimplePerson | null;
  branchLabel: string;
  isSingle: boolean;
  childCount: number;
  parentCoupleId: string | null;
  // Mutable position for D3 simulation
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface WheelLink {
  source: string;
  target: string;
}

function parseBirthYear(dob: string): number {
  const parts = dob.split("/");
  return parseInt(parts[2], 10);
}

export function buildWheelGraph(
  data: FamilyData,
  rootCoupleId: string,
): { nodes: WheelNode[]; links: WheelLink[] } {
  const personMap = new Map<string, SimplePerson>();
  for (const p of data.people) {
    personMap.set(p.id, p);
  }

  const coupleMap = new Map<string, SimpleCouple>();
  for (const c of data.couples) {
    coupleMap.set(c.id, c);
  }

  const nodes: WheelNode[] = [];
  const links: WheelLink[] = [];

  function walk(
    coupleId: string,
    generation: number,
    birthOrder: number,
    parentCoupleId: string | null,
    fabriciusPersonId: string | null,
  ) {
    const couple = coupleMap.get(coupleId);
    if (!couple) return;

    const person1 = personMap.get(couple.person1Id);
    if (!person1) return;
    const person2 = couple.person2Id ? personMap.get(couple.person2Id) ?? null : null;

    let fabriciusPerson: SimplePerson;
    let partnerPerson: SimplePerson | null;

    if (generation === 0) {
      fabriciusPerson = person1;
      partnerPerson = person2;
    } else if (fabriciusPersonId) {
      if (person1.id === fabriciusPersonId) {
        fabriciusPerson = person1;
        partnerPerson = person2;
      } else if (person2?.id === fabriciusPersonId) {
        fabriciusPerson = person2;
        partnerPerson = person1;
      } else {
        fabriciusPerson = person1;
        partnerPerson = person2;
      }
    } else {
      fabriciusPerson = person1;
      partnerPerson = person2;
    }

    const isSingle = couple.person2Id === null || couple.relationshipType === "single";
    const childCount = couple.children?.length ?? 0;

    nodes.push({
      coupleId,
      generation,
      birthYear: parseBirthYear(fabriciusPerson.dob),
      birthOrder,
      fabriciusPerson,
      partnerPerson,
      branchLabel: fabriciusPerson.lastName,
      isSingle,
      childCount,
      parentCoupleId,
    });

    if (couple.children) {
      for (const child of couple.children) {
        if (child.ownFamilyId) {
          links.push({ source: coupleId, target: child.ownFamilyId });
          walk(child.ownFamilyId, generation + 1, child.birthOrder, coupleId, child.personId);
        } else {
          const childPerson = personMap.get(child.personId);
          if (childPerson) {
            const virtualId = `${child.personId}-uncoupled`;
            nodes.push({
              coupleId: virtualId,
              generation: generation + 1,
              birthYear: parseBirthYear(childPerson.dob),
              birthOrder: child.birthOrder,
              fabriciusPerson: childPerson,
              partnerPerson: null,
              branchLabel: childPerson.lastName,
              isSingle: true,
              childCount: 0,
              parentCoupleId: coupleId,
            });
            links.push({ source: coupleId, target: virtualId });
          }
        }
      }
    }
  }

  walk(rootCoupleId, 0, 0, null, null);

  return { nodes, links };
}
