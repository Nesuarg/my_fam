// Frontend logic to display the family tree
// Convert CSV to nested JSON (family tree)
function parseParents(parentsRaw) {
  if (!parentsRaw || parentsRaw.trim() === '-' || parentsRaw.trim() === '') return [];
  // Split on comma, 'og', '&', 'and', semicolon
  return parentsRaw.split(/,| og | & | and |;/i).map(s => s.trim()).filter(Boolean);
}

function csvToFamilyTree(csvText) {
  // --- NY ROBUST ALGORITME ---
  const lines = csvText.trim().split('\n');
  const header = lines[0].split(',');
  const idxName = header.findIndex(h => h.toLowerCase().includes('hvem er i'));
  const idxBirth = header.findIndex(h => h.toLowerCase().includes('hvornår er du født'));
  const idxParents = header.findIndex(h => h.toLowerCase().includes('hvem er dine forældre'));
  // Tolerant normalisering
  function norm(str) {
    return (str || '').toLowerCase().replace(/ og | & | and |;/g, ' ').replace(/,/g, '').replace(/\s+/g, ' ').trim();
  }
  // 1. Byg person-objekter
  const allPeople = [];
  const nameMap = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',');
    const name = row[idxName]?.trim();
    const birthdate = row[idxBirth]?.trim();
    const parents = parseParents(row[idxParents]);
    const person = { name, birthdate, parents, children: [], _norm: norm(name) };
    allPeople.push(person);
    nameMap[person._norm] = person;
  }
  // 2. Tilføj børn til forældre
  let unmatchedParents = [];
  allPeople.forEach(child => {
    child.parents.forEach(parentRaw => {
      const parentNorm = norm(parentRaw);
      if (parentNorm && nameMap[parentNorm]) {
        nameMap[parentNorm].children.push(child);
      } else if (parentNorm) {
        unmatchedParents.push({child: child.name, parent: parentRaw});
      }
    });
  });
  // 3. Find rødder (ingen forældre eller forældre ikke i listen)
  let roots = allPeople.filter(p => p.parents.length === 0 || p.parents.every(parentRaw => !nameMap[norm(parentRaw)]));
  // 4. Debug: cirkulære relationer
  let circular = [];
  allPeople.forEach(p => {
    if (p.parents.some(parentRaw => norm(parentRaw) === p._norm)) {
      circular.push(p.name);
    }
  });
  // 5. Fjern interne felter
  function clean(node) {
    delete node._norm;
    // Fjern evt. duplikerede børn
    if (node.children && node.children.length > 0) {
      let seen = new Set();
      node.children = node.children.filter(c => {
        if (seen.has(c._norm)) return false;
        seen.add(c._norm);
        return true;
      });
      node.children.forEach(clean);
    }
  }
  roots.forEach(clean);
  // 6. Debug-output
  window._fam_debug = {
    allPeople,
    roots,
    unmatchedParents,
    circular
  };
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
        debugDiv.innerHTML = `<h3 style='color:#764ba2'>Debug: Roots og manglende forældre</h3>`;
        debugDiv.innerHTML += `<p>Antal personer: ${window._fam_debug.allPeople.length}</p>`;
        debugDiv.innerHTML += `<p>Rødder: ${window._fam_debug.roots.map(r => r.name).join(', ')}</p>`;
        if (window._fam_debug.unmatchedParents.length > 0) {
          debugDiv.innerHTML += `<h4 style='color:#a00'>Forældre der ikke matcher nogen person</h4>`;
          debugDiv.innerHTML += `<table style='width:100%;font-size:0.9em;background:#fff;border-collapse:collapse'><tr><th>Barn</th><th>Forælder (raw)</th></tr>`;
          window._fam_debug.unmatchedParents.forEach(row => {
            debugDiv.innerHTML += `<tr><td>${row.child}</td><td>${row.parent}</td></tr>`;
          });
          debugDiv.innerHTML += `</table>`;
        }
        container.appendChild(debugDiv);
      }
    };
    reader.readAsText(file);
  });
};
