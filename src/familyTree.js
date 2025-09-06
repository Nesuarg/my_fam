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

// CSV parser
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const header = lines[0].split(',');
  const tree = new FamilyTree();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const person = new Person(
      row[0], // name
      row[1], // birth
      row[2], // death
      row[3], // fatherName
      row[4]  // motherName
    );
    tree.addPerson(person);
  }
  tree.linkRelations();
  return tree;
}

export { Person, FamilyTree, parseCSV };
