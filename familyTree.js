// Family tree data (nested JSON)
const familyTree = {
  "navn": "Niels Peter og Dorthea",
  "født": "1919-08-24",
  "børn": [
    { "navn": "Karen og Tomas", "født": "1953-01-09", "børn": [
      { "navn": "Emil", "født": "1990-07-26" },
      { "navn": "Simon og Trine", "født": "1992-09-30" }
    ]},
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

function renderTree(node, container) {
  const div = document.createElement('div');
  div.className = 'node';
  div.innerHTML = `<strong>${node.navn}</strong><br>Født: ${node.født}`;
  container.appendChild(div);
  if (node.børn && node.børn.length > 0) {
    const childrenDiv = document.createElement('div');
    childrenDiv.className = 'level';
    node.børn.forEach(child => renderTree(child, childrenDiv));
    container.appendChild(childrenDiv);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('treeContainer');
  renderTree(familyTree, container);
});
