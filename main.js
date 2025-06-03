const map = L.map('map').setView([43.6, -79.6], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; CartoDB'
}).addTo(map);

const csvSources = [
  {
    name: "1 Week Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSZ1kJEo0ZljAhlg4Lnr_Shz3-OJnV6uehE8vCA8280L4aCfNoWE85WEJnOG2jzL2jE-o0PWTMRZiFu/pub?output=csv"
  },
  {
    name: "2 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkTCHp6iaWJBboax7x-Ic8kmX6jlYkTzJhnCnv2WfPtmo70hXPijk0p1JI03vBQTPuyPuDVWzxbavP/pub?output=csv"
  },
  {
    name: "3 Weeks Out",
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vS2LfOVQyErcTtEMSwS1ch4GfUlcpXnNfih841L1Vms0B-9pNMSh9vW5k0TNrXDoQgv2-lgDnYWdzgM/pub?output=csv"
  }
];

const layerGroupMap = new Map();
const eventMap = new Map();
let totalCount = 0;

function getRandomColor() {
  const colors = ['#ff6f61', '#42a5f5', '#ab47bc', '#26a69a', '#ef5350', '#fdd835', '#7e57c2', '#66bb6a'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function updateEventCounts() {
  const list = document.getElementById("event-counts");
  list.innerHTML = '';
  const sorted = [...eventMap.entries()].sort((a, b) => b[1] - a[1]);
  sorted.forEach(([name, count]) => {
    const li = document.createElement("li");
    li.textContent = `${name}: ${count}`;
    list.appendChild(li);
  });
  document.getElementById("total-count").textContent = `Total Count: ${totalCount}`;
}

function toggleLayer(name, checked) {
  const group = layerGroupMap.get(name);
  if (group) {
    if (checked) {
      group.addTo(map);
    } else {
      group.remove();
    }
  }
}

csvSources.forEach(source => {
  const color = getRandomColor();
  const group = L.layerGroup();
  layerGroupMap.set(source.name, group);
  group.addTo(map);

  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = true;
  checkbox.onchange = () => toggleLayer(source.name, checkbox.checked);
  label.appendChild(checkbox);

  const colorDot = document.createElement('span');
  colorDot.className = 'legend-color';
  colorDot.style.backgroundColor = color;
  label.appendChild(colorDot);

  label.appendChild(document.createTextNode(source.name));
  document.getElementById('layer-toggles').appendChild(label);

  Papa.parse(source.url, {
    download: true,
    header: true,
    complete: function(results) {
      results.data.forEach(row => {
        const lat = parseFloat(row.lat);
        const lon = parseFloat(row.long);
        const name = row.FundraiserName?.trim();
        const id = row.id?.trim();

        if (!isNaN(lat) && !isNaN(lon) && name && id) {
          const marker = L.circleMarker([lat, lon], {
            radius: 7,
            fillColor: color,
            color: "#333",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });

          marker.bindPopup(`<strong>${name}</strong><br>ID: ${id}`);
          group.addLayer(marker);

          eventMap.set(name, (eventMap.get(name) || 0) + 1);
          totalCount++;
        }
      });
      updateEventCounts();
    }
  });
});
