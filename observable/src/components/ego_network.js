import * as d3 from "npm:d3";

const NODE_COLOR = {
  Person:       "#4A81BA",
  Vessel:       "#E78523",
  Location:     "#5E9F37",
  Organization: "#C0392B",
  Group:        "#8E44AD",
};

export function drawEntityInspector(entityId, profileMap, communicationData, riskData, depth_limit = 2) {
  // 1. Validación básica
  // console.log(entityId)
  if (!entityId || !communicationData) return null;

  const edges = communicationData.edges;
  
  // --- Lógica de filtrado BFS ---
  const queue = [entityId];
  const visited = new Set([entityId]);
  const distance = new Map([[entityId, 0]]);
  const edges_path = [];

  while (queue.length > 0) {
    const currentNode = queue.shift();
    const currentDist = distance.get(currentNode);
    if (currentDist >= depth_limit) continue;

    const neighbors = edges.get ? edges.get(currentNode) : edges[currentNode] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        distance.set(neighbor, currentDist + 1);
        queue.push(neighbor);
        edges_path.push({ source: currentNode, target: neighbor });
      }
    }
  }

  const nodes = Array.from(visited).map(name => ({
    id: name,
    sub_type: profileMap?.[name]?.sub_type ?? "Unknown",
  }));
  const links = edges_path.map(l => {
    const riskInfo = riskData?.[l.source]?.[l.target];
    return {
      ...l,
      risk_score: riskInfo?.risk_score ?? 0,
      risk_content: riskInfo?.text ?? ""
    };
  });

  const maxRisk = d3.max(links, d => d.risk_score) ?? 1;

  const riskColor = d3.scaleLinear()
    .domain([0, maxRisk])
    .range(["#cbd5e1", "#dc2626"]);

  const riskWidth = d3.scaleLinear()
    .domain([0, maxRisk])
    .range([2.5, 6]); // Aumenté un poco el grosor mínimo para facilitar el clic

  const width = 400;
  const height = 450;

  /*
  --------------------------------------------------
  NUEVO: CONTENEDOR Y TOOLTIP
  --------------------------------------------------
  */
  // Div contenedor principal
  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.width = width + "px";
  container.style.height = height + "px";

  // Div para el popup (oculto por defecto)
  const tooltip = d3.select(container)
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #cbd5e1")
    .style("border-radius", "6px")
    .style("padding", "10px")
    .style("font-size", "12px")
    .style("color", "#334155")
    .style("box-shadow", "0 4px 6px -1px rgb(0 0 0 / 0.1)")
    .style("z-index", "100")
    .style("max-width", "250px")
    .style("pointer-events", "none"); // Evita que el tooltip bloquee clics en el gráfico

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", () => {
      // Ocultar el popup si el usuario hace clic en el fondo vacío del SVG
      tooltip.style("visibility", "hidden");
    });

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(60))
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(width / 2, height / 2));

  /*
  --------------------------------------------------
  ARISTAS (LINKS) CON EVENTO CLICK
  --------------------------------------------------
  */
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", d => riskColor(d.risk_score))
    .attr("stroke-opacity", 0.85)
    .attr("stroke-width", d => riskWidth(d.risk_score))
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      event.stopPropagation(); // Evita que el clic llegue al fondo del SVG y lo oculte

      // Obtenemos coordenadas relativas al contenedor
      const [mx, my] = d3.pointer(event, container);

      const sourceId = d.source.id ?? d.source;
      const targetId = d.target.id ?? d.target;

      // Mostrar el tooltip con la información
      tooltip.style("visibility", "visible")
        .style("left", (mx + 10) + "px")
        .style("top", (my + 10) + "px")
        .html(`
          <strong style="color: #0f172a; display: block; margin-bottom: 6px;">
            ${sourceId} &rarr; ${targetId}
          </strong>
          <div style="margin-bottom: 4px;">
            <strong>Risk Score:</strong> ${parseFloat(d.risk_score).toFixed(2)}
          </div>
          <div style="color: #64748b; font-size: 11px;">
            ${d.risk_content || "No risk content available."}
          </div>
        `);
    });

  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", d => d.id === entityId ? 8 : 5)
    .attr("fill", d => NODE_COLOR[d.sub_type] ?? "#94a3b8")
    .attr("stroke", d => d.id === entityId ? "#1e293b" : "#fff")
    .attr("stroke-width", d => d.id === entityId ? 2.5 : 1.5)
    .call(drag(simulation))
    .on("click", (event) => {
       // Opcional: También ocultamos el popup de la arista si hacen click en un nodo
       event.stopPropagation();
       tooltip.style("visibility", "hidden");
    });

  const labels = svg.append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("dx", 10)
    .attr("dy", 4)
    .attr("fill", "#475569")
    .text(d => d.id);

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    labels
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  function drag(simulation) {
    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  /*
  ------------------------------------------
  Legend
  ------------------------------------------
  */
  const legendWidth = 180;
  const legendHeight = 12;
  const legendX = 50  ;
  const legendY = height - 50;

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "risk-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", riskColor(t * maxRisk));
  }

  const legend = svg.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("font-size", 11)
    .attr("font-weight", 600)
    .attr("fill", "#334155")
    .text("Risk Score");

  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 3)
    .attr("fill", "url(#risk-gradient)")
    .attr("stroke", "#cbd5e1");

  const legendScale = d3.scaleLinear()
    .domain([0, maxRisk])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(4)
    .tickSize(4);

  legend.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis)
    .call(g => g.select(".domain").remove())
    .call(g =>
      g.selectAll("text")
        .attr("font-size", 9)
        .attr("fill", "#475569")
    );

  // En lugar de retornar el SVG, añadimos el SVG al contenedor y retornamos el contenedor.
  container.appendChild(svg.node());
  return container;
}