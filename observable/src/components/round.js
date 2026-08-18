import * as d3 from "npm:d3";

export function drawSimilarityRound (data, width, height) {
  const radius = Math.min(width, height) / 2;
  const labelMargin = 20;

  const svg = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

  const g = svg.append('g')
    .attr('transform', `translate(${width / 2}, ${height / 2})`);

  const colorScale = d3.scaleOrdinal()
      .domain(['Person', 'Vessel', 'Location', 'Organization', 'Group'])
      .range(['#4A81BA', '#E78523', '#5E9F37', '#C0392B', '#8E44AD']); 

  
  // Agrupamos los nodos por tipo
  const nested = d3.group(data.nodes, d => d.type);
  
  // Creamos la jerarquía
  const root = d3.hierarchy({
    children: Array.from(nested, ([key, value]) => ({name: key, children: value}))
  });
  
  // El cluster calcula ángulos (0-360) y radios
  const cluster = d3.cluster()
      .size([360, radius * 0.82]);
  
  cluster(root);

  // Lineas
  
  const lineGen = d3.lineRadial()
      .angle(d => d.x * Math.PI / 180) // Convierte grados a radianes
      .radius(d => d.y)               // La distancia al centro
      .curve(d3.curveBundle.beta(0.1)); // Qué tan "curva" es la conexión?

  // Mapeo
  const idToNode = new Map(root.leaves().map(d => [d.data.id, d]));
  const priority = {
    Low: 0,
    Medium: 1,
    High: 2
  };

  const sortedLinks = [...data.links].sort(
    (a, b) => priority[a.similarity] - priority[b.similarity]
  );
  g.append('g')
    .selectAll('path')
    .data(sortedLinks)
    .join('path')
      .attr('d', d => {
        const start = idToNode.get(d.source);
        const end = idToNode.get(d.target);
        // .path(end) genera los puntos intermedios para que se vea más como el paper
        return lineGen(start.path(end));
      })
      .attr('fill', 'none')
      .attr('stroke', d => {
        const similarity = d.similarity;
        if (similarity == 'High') return '#810f7c';
        if (similarity == 'Medium') return '#9ebcda';
        return '#8c96c6'
      })
      .attr('stroke-width',  d => {
        const similarity = d.similarity;
        if (similarity == 'High') return 1;
        if (similarity == 'Medium') return 1;
        return 0.05
      })
      .attr('stroke-opacity', 1);
  
  const nodeGroups = g.append('g')
    .selectAll('g')
    .data(root.leaves())
    .join('g')
      // Para rotar cada grupo según su ángulo y lo moverlo hacia afuera
      .attr('transform', d => `rotate(${d.x - 90}) translate(${d.y},0)`);

  nodeGroups.append('path')
      .attr('d', d3.symbol()
          //.type(d => d.data.is_pseudonym ? d3.symbolStar : d3.symbolCircle)
          .size(50)) // Tamaño un poco más grande
      .attr('fill', d => colorScale(d.data.type)) // Usamos la escala de colores
      .attr('stroke', '#333')
      .attr('stroke-width', 1.5);
  
  // Texto
  nodeGroups.append('text')
      .attr('dy', '0.31em')
    //.attr('x', d => d.x < 180 ? 6 : -6)
      .attr('x', d => d.x < 180 ? 12 : -12)
      .attr('text-anchor', d => d.x < 180 ? 'start' : 'end')  // ifs con "?"
      .attr('transform', d => d.x >= 180 ? 'rotate(180)' : null)
      .text(d => d.data.id)
    //.attr('font-size', '10px')
      .attr('font-size', '8px')
      .attr('font-family', 'sans-serif');

  
  let currentSelection = ["Nadia Conti"];
  
  // 1. Asignamos el valor inicial al nodo SVG para que Observable lo lea
  svg.node().value = currentSelection;

  // ... (tu código para dibujar links y nodos) ...
  const node = svg.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      // ... tus atributos normales (r, fill, etc.)

  // 2. Función auxiliar para resaltar los nodos seleccionados
  function updateSelectionVisuals() {
    node
      .attr("stroke", d => currentSelection.includes(d.id) ? "#0f172a" : "none") // Borde oscuro si está seleccionado
      .attr("stroke-width", d => currentSelection.includes(d.id) ? 3 : 0)
      .style("cursor", "pointer");
  }

  // Llamada inicial para pintar "Mako"
  updateSelectionVisuals();

  // 3. Lógica de Interacción Directa
  node.on("click", function(event, d) {
    const index = currentSelection.indexOf(d.id);
    
    // Toggle: Si ya está, lo quitamos. Si no está, lo agregamos.
    if (index > -1) {
      currentSelection.splice(index, 1);
    } else {
      currentSelection.push(d.id);
    }

    // Actualizamos los bordes en el grafo
    updateSelectionVisuals();

    // 4. MAGIA OBSERVABLE: Actualizamos el valor del SVG y disparamos el evento
    svg.node().value = currentSelection;
    svg.node().dispatchEvent(new Event("input", { bubbles: true }));
  });

  return svg.node();
}