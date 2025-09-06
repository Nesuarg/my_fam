// Frontend logic to display the family tree
// Convert CSV to nested JSON (family tree)
function parseParents(parentsRaw) {
  if (!parentsRaw || parentsRaw.trim() === '-' || parentsRaw.trim() === '') return [];
  return parentsRaw.split(/,| og | and /i).map(s => s.trim()).filter(Boolean);
}

function csvToFamilyTree(csvText) {
  const lines = csvText.trim().split('\n');
  const header = lines[0].split(',');
  const idxName = header.findIndex(h => h.toLowerCase().includes('hvem er i'));
  const idxBirth = header.findIndex(h => h.toLowerCase().includes('hvornår er du født'));
  const idxParents = header.findIndex(h => h.toLowerCase().includes('hvem er dine forældre'));
  // Support multiple people with same name
  const peopleByName = {};
  const allPeople = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const name = row[idxName]?.trim();
    const birthdate = row[idxBirth]?.trim();
    const parents = parseParents(row[idxParents]);
    const person = { name, birthdate, parents, children: [] };
    if (!peopleByName[name]) peopleByName[name] = [];
    peopleByName[name].push(person);
    allPeople.push(person);
  }
  // Build parent-child relations
  for (const person of allPeople) {
    for (const parentName of person.parents) {
      if (peopleByName[parentName] && peopleByName[parentName].length > 0) {
        // Always add child to the first occurrence of parent
        peopleByName[parentName][0].children.push(person);
      }
    }
  }
  // Find the true root: first person with no parents and who is parent to others
  let root = null;
  for (const person of allPeople) {
    if (person.parents.length === 0 && person.children.length > 0) {
      root = person;
      break;
    }
  }
  // Remove parent references from children
  function clean(node) {
    delete node.parents;
    node.children.forEach(clean);
  }
  if (root) {
    clean(root);
    return [root];
  } else {
    // fallback: show all with no parents
    const roots = allPeople.filter(p => p.parents.length === 0);
    roots.forEach(clean);
    return roots;
  }
}

// Render tree from JSON
function renderTreeJSON(node, container) {
  const el = document.createElement('div');
  el.className = 'person';
  el.innerHTML = `<strong>${node.name}</strong> (${node.birthdate})`;
  container.appendChild(el);
  if (node.children && node.children.length > 0) {
    const childrenEl = document.createElement('div');
    childrenEl.className = 'children';
    for (const child of node.children) {
      renderTreeJSON(child, childrenEl);
    }
    container.appendChild(childrenEl);
  }
}

// Handle CSV upload
window.onload = function() {
  const input = document.getElementById('csvInput');
  input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const csvText = evt.target.result;
      const tree = csvToFamilyTree(csvText);
      const container = document.getElementById('treeContainer');
      container.innerHTML = '';
      if (tree.length === 0) {
        container.innerHTML = '<p>No root found (no person without parents)</p>';
      } else {
        for (const root of tree) {
          renderTreeJSON(root, container);
        }
      }
    };
    reader.readAsText(file);
  });
};
