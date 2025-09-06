// Simple generic family tree data and renderer
const family = [
  { name: "John", birth: "1950", parents: [] },
  { name: "Mary", birth: "1952", parents: [] },
  { name: "Paul", birth: "1975", parents: ["John", "Mary"] },
  { name: "Anna", birth: "1978", parents: ["John", "Mary"] },
  { name: "Lucas", birth: "2000", parents: ["Paul"] },
  { name: "Emma", birth: "2002", parents: ["Anna"] }
];

function buildTree(people) {
  const nameMap = {};
  people.forEach(p => nameMap[p.name] = { ...p, children: [] });
  people.forEach(p => {
    p.parents.forEach(parent => {
      if (nameMap[parent]) nameMap[parent].children.push(nameMap[p.name]);
    });
  });
  return people.filter(p => p.parents.length === 0).map(p => nameMap[p.name]);
}

function renderTree(tree, container) {
  function renderLevel(nodes, level) {
    const div = document.createElement('div');
    div.className = 'level';
    nodes.forEach(node => {
      const nodeDiv = document.createElement('div');
      nodeDiv.className = 'node';
      nodeDiv.innerHTML = `<strong>${node.name}</strong><br>Born: ${node.birth}`;
      div.appendChild(nodeDiv);
      if (node.children.length > 0) {
        div.appendChild(renderLevel(node.children, level + 1));
      }
    });
    return div;
  }
  container.appendChild(renderLevel(tree, 0));
}

document.addEventListener('DOMContentLoaded', () => {
  const tree = buildTree(family);
  const container = document.getElementById('treeContainer');
  renderTree(tree, container);
});
