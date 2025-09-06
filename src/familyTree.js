// Data structure and parsing for family tree

// Person class
class Person {
  constructor(name, birth, death, fatherName, motherName) {
    this.name = name;
    this.birth = birth;
    this.death = death;
    this.fatherName = fatherName;
    this.motherName = motherName;
    this.children = [];
  }
}

// FamilyTree class
class FamilyTree {
  constructor() {
    this.people = {};
  }

  addPerson(person) {
    this.people[person.name] = person;
  }

  linkRelations() {
    for (const name in this.people) {
      const p = this.people[name];
      if (p.fatherName && this.people[p.fatherName]) {
        this.people[p.fatherName].children.push(p);
      }
      if (p.motherName && this.people[p.motherName]) {
        this.people[p.motherName].children.push(p);
      }
    }
  }
}

// CSV parser for Danish Google Forms export
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const header = lines[0].split(',');
  // Find column indices
  const idxName = header.findIndex(h => h.trim().toLowerCase().includes('hvem er i'));
  const idxBirth = header.findIndex(h => h.trim().toLowerCase().includes('hvornår er du født'));
  const idxParents = header.findIndex(h => h.trim().toLowerCase().includes('hvem er dine forældre'));
  const tree = new FamilyTree();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const name = row[idxName]?.trim();
    const birth = row[idxBirth]?.trim();
    const parentsRaw = row[idxParents]?.trim();
    let fatherName = '';
    let motherName = '';
    if (parentsRaw) {
      // Split by comma, 'og', or 'and'
      const parts = parentsRaw.split(/,| og | and /i).map(s => s.trim()).filter(Boolean);
      if (parts.length === 2) {
        fatherName = parts[0];
        motherName = parts[1];
      } else if (parts.length === 1) {
        fatherName = parts[0];
      }
    }
    const person = new Person(name, birth, '', fatherName, motherName);
    tree.addPerson(person);
  }
  tree.linkRelations();
  return tree;
}

export { Person, FamilyTree, parseCSV };
