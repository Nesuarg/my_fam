// Family tree data (nested JSON)
const familyTree = { /* ...samme data som før... */
  "navn": "Niels Peter og Dorthea",
  "født": "1919-08-24",
  "børn": [
    // ...samme børn som før...
    { "navn": "Karen og Tomas", "født": "1953-01-09", "børn": [
      { "navn": "Emil", "født": "1990-07-26" },
      { "navn": "Simon og Trine", "født": "1992-09-30" }
    ]},
    // ... resten uændret ...
    { "navn": "Ruth og Jesper", "født": "1957-01-14", "børn": [
      { "navn": "Ejgil", "født": "1989-07-08" },
      { "navn": "Alfred", "født": "1991-08-19" }
    ]},
    { "navn": "Bodil og Carl", "født": "1958-07-23", "børn": [
      { "navn": "Mads og Mette", "født": "1985-03-28", "børn": [
        { "navn": "Iben", "født": "2013-08-11" },
        { "navn": "Kirsten", "født": "2016-03-30" }
      ]},
      { "navn": "Thea og Andreas", "født": "1990-05-12", "børn": [
        { "navn": "Ole", "født": "2022-07-27" }
      ]},
      { "navn": "Selma og Jens", "født": "1992-05-20" }
    ]},
    { "navn": "Paul Erik og Ulla", "født": "1963-01-25", "børn": [
      { "navn": "Asta", "født": "1994-05-08" }
    ]},
    { "navn": "Grete og Paul Arne", "født": "1943-04-04", "børn": [
      { "navn": "Bo og Akannguaq", "født": "1966-04-02" },
      { "navn": "Peter og Camilla", "født": "1968-04-07" },
      { "navn": "Helle og Preben", "født": "1968-01-31" }
    ]},
    { "navn": "Birthe og Jens", "født": "1946-01-30", "børn": [
      { "navn": "Rene og Christina", "født": "1968-01-12" }
    ]},
    { "navn": "Johannes og Lene", "født": "1944-05-23", "børn": [
      { "navn": "Mette og Christian", "født": "1973-07-19" },
      { "navn": "Hans og Marta", "født": "1975-04-08" },
      { "navn": "Niels og Ingvild", "født": "1979-02-13" }
    ]},
    { "navn": "Thomas", "født": "1948-07-13", "børn": [
      { "navn": "Sophus", "født": "1997-02-05" }
    ]},
    { "navn": "Ingemai og Carsten", "født": "1960-10-13", "børn": [
      { "navn": "Kamille og Christian", "født": "1986-04-15" },
      { "navn": "Mikkel Asbjørn og Mathilde", "født": "1990-05-05" },
      { "navn": "Ida Marie og Martin", "født": "1994-10-09" }
    ]},
    { "navn": "Jens og Rita", "født": "1955-03-23", "børn": [
      { "navn": "Sidsel og Jon", "født": "1986-10-12" },
      { "navn": "Signe og Kasper", "født": "1988-09-21" },
      { "navn": "Bjørn og Anne", "født": "1984-10-16" }
    ]},
    { "navn": "Ninna & Jesper", "født": "1991-07-22", "forældre": "Anna Lisbeth & Jan", "børn": [
      { "navn": "Theo", "født": "2018-07-24" },
      { "navn": "Emma", "født": "2022-02-06" }
    ]}
  ]
};

// SVG flowchart renderer
function layoutTree(node, depth = 0, x = 0, positions = [], siblings = 1, index = 0) {
  // Calculate position for this node
  node._x = x;
  node._y = depth * 120 + 40;
  positions.push(node);
  if (node.børn && node.børn.length > 0) {
    let childX = x - ((node.børn.length-1)*180)/2;
    node.børn.forEach((child, i) => {
      layoutTree(child, depth+1, childX + i*180, positions, node.børn.length, i);
    });
  }
  return positions;
}

function renderTreeSVG(root, container) {
  container.innerHTML = '';
  const positions = layoutTree(root);
  const width = 180 * Math.max(positions.length, 5);
  const height = Math.max(...positions.map(n => n._y)) + 160;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.display = 'block';
  svg.style.margin = '0 auto';
  // Draw arrows (lines)
  positions.forEach(node => {
    if (node.børn && node.børn.length > 0) {
      node.børn.forEach(child => {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', node._x + 90);
        line.setAttribute('y1', node._y + 60);
        line.setAttribute('x2', child._x + 90);
        line.setAttribute('y2', child._y);
        line.setAttribute('stroke', '#4e2e8e');
        line.setAttribute('stroke-width', '4');
        line.setAttribute('opacity', '0.85');
        line.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(line);
      });
    }
  });
  // Arrowhead marker
  const marker = document.createElementNS(svgNS, 'marker');
  marker.setAttribute('id', 'arrowhead');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '5');
  marker.setAttribute('refY', '3.5');
  marker.setAttribute('orient', 'auto');
  marker.setAttribute('markerUnits', 'strokeWidth');
  const arrowPath = document.createElementNS(svgNS, 'path');
  arrowPath.setAttribute('d', 'M0,0 L10,3.5 L0,7 Z');
  arrowPath.setAttribute('fill', '#764ba2');
  marker.appendChild(arrowPath);
  const defs = document.createElementNS(svgNS, 'defs');
  defs.appendChild(marker);
  svg.appendChild(defs);
  // Draw nodes
  positions.forEach(node => {
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('transform', `translate(${node._x},${node._y})`);
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('width', 180);
    rect.setAttribute('height', 60);
    rect.setAttribute('rx', 18);
    rect.setAttribute('fill', '#fff');
    rect.setAttribute('stroke', '#764ba2');
    rect.setAttribute('stroke-width', '3');
    rect.setAttribute('filter', 'url(#shadow)');
    group.appendChild(rect);
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', 90);
    text.setAttribute('y', 28);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '18');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('fill', '#4e2e8e');
    text.textContent = node.navn;
    group.appendChild(text);
    const birthText = document.createElementNS(svgNS, 'text');
    birthText.setAttribute('x', 90);
    birthText.setAttribute('y', 48);
    birthText.setAttribute('text-anchor', 'middle');
    birthText.setAttribute('font-size', '14');
    birthText.setAttribute('fill', '#222');
    birthText.textContent = `Født: ${node.født}`;
    group.appendChild(birthText);
    svg.appendChild(group);
  });
  // Shadow filter
  const filter = document.createElementNS(svgNS, 'filter');
  filter.setAttribute('id', 'shadow');
  filter.innerHTML = '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#764ba2" flood-opacity="0.12"/>';
  svg.appendChild(filter);
  container.appendChild(svg);
}


document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('treeContainer');
  renderTreeSVG(familyTree, container);
  // Zoom & pan
  const svg = container.querySelector('svg');
  let scale = 1;
  let panX = 0, panY = 0;
  let isDragging = false, dragStart = null;
  svg.style.cursor = 'grab';
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= delta;
    svg.setAttribute('transform', `scale(${scale}) translate(${panX},${panY})`);
  });
  svg.addEventListener('mousedown', e => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    svg.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    panX += (e.clientX - dragStart.x) / scale;
    panY += (e.clientY - dragStart.y) / scale;
    dragStart = { x: e.clientX, y: e.clientY };
    svg.setAttribute('transform', `scale(${scale}) translate(${panX},${panY})`);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false;
    svg.style.cursor = 'grab';
  });
});
