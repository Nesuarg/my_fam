// Frontend logic to display the family tree
import { parseCSV } from './familyTree.js';

function renderTree(tree, rootName, container) {
  const person = tree.people[rootName];
  if (!person) return;
  const el = document.createElement('div');
  el.className = 'person';
  el.innerHTML = `<strong>${person.name}</strong> (${person.birth}${person.death ? ' - ' + person.death : ''})`;
  container.appendChild(el);
  if (person.children.length > 0) {
    const childrenEl = document.createElement('div');
    childrenEl.className = 'children';
    for (const child of person.children) {
      renderTree(tree, child.name, childrenEl);
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
      const tree = parseCSV(csvText);
      const container = document.getElementById('treeContainer');
      container.innerHTML = '';
      // Visualize only from root nodes (no parents)
      const roots = Object.values(tree.people).filter(p => !p.fatherName && !p.motherName);
      if (roots.length === 0) {
        container.innerHTML = '<p>No root found (no person without parents)</p>';
      } else {
        for (const root of roots) {
          renderTree(tree, root.name, container);
        }
      }
    };
    reader.readAsText(file);
  });
};
