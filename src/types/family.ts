/** A single person in the heritage tree. */
export interface PersonNode {
  /** Stable unique id for refs/links */
  id: string;

  /** Display name */
  name: string;

  /** ISO date (YYYY-MM-DD) or year (YYYY) */
  birthDate?: string;
  /** ISO date or year */
  deathDate?: string;

  /** Optional short description or notes */
  note?: string;

  /** Image URL (relative to /public or absolute) */
  photoUrl?: string;

  /** Additional labels/tags (e.g., "Immigrated 1952") */
  tags?: string[];

  /**
   * Children are direct descendants of this person.
   * Recursive by design to support nested trees.
   */
  children?: PersonNode[];

  /**
   * Optional spouse/partner names or ids for display-only purposes.
   * Keep simple for this app; actual graph edges are not required.
   */
  partners?: PartnerRef[];
}

/** Reference to a partner/spouse for display. */
export interface PartnerRef {
  /** If partner exists in tree, reference by id */
  id?: string;
  /** Or just a free-text name */
  name?: string;
}

/** Root document shape loaded from /public/family.json */
export interface FamilyDocument {
  /** Versioned schema if you need to evolve later */
  schemaVersion: "1.0";
  /** The top-most ancestor(s). Allow multiple roots. */
  roots: PersonNode[];
}

/** Extended node type for d3-hierarchy with layout information */
export interface TreeNodeDatum extends PersonNode {
  x: number;
  y: number;
  isExpanded?: boolean;
}