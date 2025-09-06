// Frontend logic to display the family tree
// Convert CSV to nested JSON (family tree)
function parseParents(parentsRaw) {
  if (!parentsRaw || parentsRaw.trim() === '-' || parentsRaw.trim() === '') return [];
  // Split on comma, 'og', '&', 'and', semicolon
  return parentsRaw.split(/,| og | & | and |;/i).map(s => s.trim()).filter(Boolean);
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
    return (str || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/ og | & /g, ' and ')
      .replace(/\band\b/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Build lookup for all persons by normalized name
  const nameToPersons = {};
  allPeople.forEach(p => {
    const n = norm(p.name);
    if (!nameToPersons[n]) nameToPersons[n] = [];
    nameToPersons[n].push(p);
  });
  // Recursive function to build children tree
  function buildChildren(person) {
    person.children = [];
    allPeople.forEach(candidate => {
      candidate.parents.forEach(parentName => {
        if (norm(parentName) === norm(person.name)) {
          person.children.push(buildChildren(candidate));
        }
      });
    });
    return person;
  }
  // Find all roots: persons with no parents
  let roots = allPeople.filter(p => p.parents.length === 0);
  // Debug: show root count
  if (roots.length === 0) {
    // Fallback: show all persons as roots
    roots = allPeople;
  }
  // Build tree recursively from roots
  const tree = roots.map(root => buildChildren(root));
  // Remove parent references from children
  function clean(node) {
    delete node.parents;
    if (node.children) node.children.forEach(clean);
  }
  tree.forEach(clean);
  return tree;
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
      // Debug: show stats and all persons, and parent matching issues
      const statsDiv = document.createElement('div');
      statsDiv.style.marginTop = '2rem';
      statsDiv.style.background = '#d0f0c0';
      statsDiv.style.padding = '1rem';
      statsDiv.style.borderRadius = '8px';
      statsDiv.innerHTML = `<h3 style='color:#764ba2'>Debug: Statistik</h3>`;
      let allPersons = [];
      tree.forEach(root => {
        function collect(person) {
          allPersons.push(person);
          if (person.children) person.children.forEach(collect);
        }
        collect(root);
      });
      const roots = tree.map(r => r.name);
      statsDiv.innerHTML += `<p>Antal personer: ${allPersons.length}</p>`;
      statsDiv.innerHTML += `<p>Rødder: ${roots.join(', ')}</p>`;
      statsDiv.innerHTML += `<h4>Alle personer og forældre</h4>`;
      statsDiv.innerHTML += `<table style='width:100%;font-size:0.9em;background:#fff;border-collapse:collapse'><tr><th>Navn</th><th>Født</th><th>Forældre (raw)</th><th>Root?</th></tr>`;
      allPersons.forEach(person => {
        statsDiv.innerHTML += `<tr><td>${person.name}</td><td>${person.birthdate}</td><td>${person.parents ? person.parents.join(' | ') : ''}</td><td>${person.parents && person.parents.length === 0 ? 'Ja' : 'Nej'}</td></tr>`;
      });
      statsDiv.innerHTML += `</table>`;
      // Find parents that do not match any person
      const norm = str => (str || '').toLowerCase().replace(/ og | & | and |;/g, ' ').replace(/,/g, '').replace(/\s+/g, ' ').trim();
      let unmatchedParents = [];
      allPersons.forEach(person => {
        person.parents.forEach(parentRaw => {
          const parentNorm = norm(parentRaw);
          if (parentNorm && !allPersons.some(p => norm(p.name) === parentNorm)) {
            unmatchedParents.push({child: person.name, parent: parentRaw});
          }
        });
      });
      if (unmatchedParents.length > 0) {
        statsDiv.innerHTML += `<h4 style='color:#a00'>Advarsel: Forældre der ikke matcher nogen person</h4>`;
        statsDiv.innerHTML += `<table style='width:100%;font-size:0.9em;background:#fff;border-collapse:collapse'><tr><th>Barn</th><th>Forælder (raw)</th></tr>`;
        unmatchedParents.forEach(row => {
          statsDiv.innerHTML += `<tr><td>${row.child}</td><td>${row.parent}</td></tr>`;
        });
        statsDiv.innerHTML += `</table>`;
      }
      container.appendChild(statsDiv);
  // Show JSON output for the tree
  const jsonDiv = document.createElement('div');
  jsonDiv.style.marginTop = '2rem';
  jsonDiv.style.background = '#e0e0e0';
  jsonDiv.style.padding = '1rem';
  jsonDiv.style.borderRadius = '8px';
  jsonDiv.innerHTML = `<h3 style='color:#764ba2'>JSON Output</h3><pre style='font-size:0.9em;max-height:400px;overflow:auto;'>${JSON.stringify(tree, null, 2)}</pre>`;
  container.appendChild(jsonDiv);
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
      if (!tree || tree.length === 0) {
        container.innerHTML = '<div style="background:#ffcccc;padding:1em;border-radius:8px;color:#a00;"><strong>Fejl:</strong> Ingen personer eller rødder fundet i CSV. Tjek at filen er korrekt og at der er data.</div>';
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
              debugDiv.innerHTML += `<li>${child.name} (${child.birthdate})`;
              debugDiv.innerHTML += `<br><small>Parent match: ${child.parents.map(p => norm(p)).join(', ')}</small></li>`;
            });
          }
          debugDiv.innerHTML += '</ul>';
        });
        // Extra debug: show all persons and their parents
        debugDiv.innerHTML += `<h4 style='color:#222'>Alle personer og forældre (raw & normaliseret)</h4>`;
        debugDiv.innerHTML += `<table style='width:100%;font-size:0.9em;background:#fff;border-collapse:collapse'><tr><th>Navn</th><th>Forældre (raw)</th><th>Forældre (norm)</th></tr>`;
        tree.forEach(root => {
          [root, ...root.children].forEach(person => {
            debugDiv.innerHTML += `<tr><td>${person.name}</td><td>${person.parents.join(' | ')}</td><td>${person.parents.map(p => norm(p)).join(' | ')}</td></tr>`;
          });
        });
        debugDiv.innerHTML += `</table>`;
        container.appendChild(debugDiv);
      }
    };
    reader.readAsText(file);
  });
};
