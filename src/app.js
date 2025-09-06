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
  // Helper for normalized name
  function norm(str) {
    return (str || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  // Build tree recursively: children added to all persons with matching normalized parent name
  const nameToPersons = {};
  allPeople.forEach(p => {
    const n = norm(p.name);
    if (!nameToPersons[n]) nameToPersons[n] = [];
    nameToPersons[n].push(p);
  });
  allPeople.forEach(person => {
    person.children = [];
  });
  allPeople.forEach(person => {
    person.parents.forEach(parentName => {
      const parentNorm = norm(parentName);
      if (nameToPersons[parentNorm]) {
        nameToPersons[parentNorm].forEach(parent => {
          parent.children.push(person);
        });
      }
    });
  });
  // Find all roots: persons with no parents
  const roots = allPeople.filter(p => p.parents.length === 0);
  // Remove parent references from children
  function clean(node) {
    delete node.parents;
    node.children.forEach(clean);
  }
  roots.forEach(clean);
  return roots;
}

// Render tree as SVG with lines between parent and children
function renderTreeSVG(treeRoots, container) {
  container.innerHTML = '';
  const svgNS = 'http://www.w3.org/2000/svg';
  let width = 1200;
  const levelHeight = 80;
  const nodeWidth = 180;
  const nodeHeight = 40;
  let maxDepth = 0;

  // Calculate positions recursively, with full depth support
  let positions = [];
  function layout(node, depth) {
    node._y = depth * levelHeight + 40;
    node._depth = depth;
    maxDepth = Math.max(maxDepth, depth);
    positions.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => layout(child, depth+1));
    }
  }
  // Layout all roots
  treeRoots.forEach(root => layout(root, 0));
  // Assign x positions based on order in each layer
  let layers = {};
  positions.forEach(node => {
    if (!layers[node._depth]) layers[node._depth] = [];
    layers[node._depth].push(node);
  });
  // Find widest layer
  let maxNodes = 0;
  Object.values(layers).forEach(nodes => {
    if (nodes.length > maxNodes) maxNodes = nodes.length;
  });
  width = Math.max(1200, maxNodes * nodeWidth + 100);
  Object.keys(layers).forEach(depth => {
    const nodes = layers[depth];
    const totalWidth = (nodes.length-1)*nodeWidth;
    nodes.forEach((node, i) => {
      node._x = width/2 - totalWidth/2 + i*nodeWidth;
    });
  });

  // Create SVG
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', (maxDepth+2)*levelHeight);
  svg.style.display = 'block';
  svg.style.margin = '0 auto';

  // Draw lines
  function drawLines(node) {
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', node._x + nodeWidth/2);
        line.setAttribute('y1', node._y + nodeHeight);
        line.setAttribute('x2', child._x + nodeWidth/2);
        line.setAttribute('y2', child._y);
        line.setAttribute('stroke', '#764ba2');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
        drawLines(child);
      });
    }
  }
  treeRoots.forEach(drawLines);

  // Draw nodes
  function drawNodes(node) {
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('transform', `translate(${node._x},${node._y})`);
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('width', nodeWidth);
    rect.setAttribute('height', nodeHeight);
    rect.setAttribute('rx', 12);
    rect.setAttribute('fill', '#f3eaff');
    rect.setAttribute('stroke', '#764ba2');
    rect.setAttribute('stroke-width', '2');
    group.appendChild(rect);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', nodeWidth/2);
    text.setAttribute('y', nodeHeight/2 + 6);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '16');
    text.setAttribute('fill', '#222');
    text.textContent = `${node.name} (${node.birthdate})`;
    group.appendChild(text);
    svg.appendChild(group);
    if (node.children && node.children.length > 0) {
      node.children.forEach(drawNodes);
    }
  }
  treeRoots.forEach(drawNodes);
  container.appendChild(svg);
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
        renderTreeSVG(tree, container);
        // Debug view
        const debugDiv = document.createElement('div');
        debugDiv.style.marginTop = '2rem';
        debugDiv.style.background = '#ffe066';
        debugDiv.style.padding = '1rem';
        debugDiv.style.borderRadius = '8px';
        debugDiv.innerHTML = `<h3 style='color:#764ba2'>Debug: Roots and Children</h3>`;
        tree.forEach(root => {
          debugDiv.innerHTML += `<strong>${root.name}</strong> (${root.birthdate})<ul>`;
          if (root.children.length === 0) {
            debugDiv.innerHTML += '<li><em>No children</em></li>';
          } else {
            root.children.forEach(child => {
              debugDiv.innerHTML += `<li>${child.name} (${child.birthdate})</li>`;
            });
          }
          debugDiv.innerHTML += '</ul>';
        });
        container.appendChild(debugDiv);
      }
    };
    reader.readAsText(file);
  });
};
