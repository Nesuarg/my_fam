import fs from 'fs';

function parseParents(parentsRaw) {
  if (!parentsRaw || parentsRaw.trim() === '-' || parentsRaw.trim() === '') return [];
  return parentsRaw.split(/,| og | and /i).map(s => s.trim()).filter(Boolean);
}

function readCSV(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const idxName = header.findIndex(h => h.toLowerCase().includes('hvem er i'));
  const idxBirth = header.findIndex(h => h.toLowerCase().includes('hvornår er du født'));
  const idxParents = header.findIndex(h => h.toLowerCase().includes('hvem er dine forældre'));
  const people = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const name = row[idxName]?.trim();
    const birthdate = row[idxBirth]?.trim();
    const parents = parseParents(row[idxParents]);
    people[name] = { name, birthdate, parents, children: [] };
  }
  return people;
}

function buildTree(people) {
  const roots = [];
  for (const person of Object.values(people)) {
    if (person.parents.length === 0) {
      roots.push(person);
    } else {
      for (const parentName of person.parents) {
        if (people[parentName]) {
          people[parentName].children.push(person);
        }
      }
    }
  }
  // Remove parent references from children
  function clean(node) {
    delete node.parents;
    node.children.forEach(clean);
  }
  roots.forEach(clean);
  return roots;
}

const inputFile = process.argv[2];
const outputFile = process.argv[3];
if (!inputFile || !outputFile) {
  console.error('Usage: node csv_to_familytree_json.js input.csv output.json');
  process.exit(1);
}

const people = readCSV(inputFile);
const tree = buildTree(people);
fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2), 'utf8');
console.log('Family tree JSON written to', outputFile);
