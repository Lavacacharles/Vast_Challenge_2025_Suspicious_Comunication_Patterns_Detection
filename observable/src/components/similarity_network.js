import * as d3 from "npm:d3";

const NODE_COLOR = {
  Person:       "#4A81BA",
  Vessel:       "#E78523",
  Location:     "#5E9F37",
  Organization: "#C0392B",
  Group:        "#8E44AD",
};

const LINK_STYLE = {
  High:   { stroke: "#810f7c", width: 3.0, opacity: 0.9 },
  Medium: { stroke: "#9ebcda", width: 1.5, opacity: 0.6 },
  Low:    { stroke: "#e0e4f0", width: 0.5, opacity: 0.1 }, // Drastically reduced visibility
};

export function drawSimilarityNetwork(graph, width = 900, height = 700) {
  const nodes = graph.nodes.map(d => ({ ...d }));
  const links = graph.links.map(d => ({ ...d }));

  // Pre-calculate adjacency for O(1) lookups during interactions
  const linkedByIndex = new Set();
  links.forEach(d => {
    linkedByIndex.add(`${d.source.id ?? d.source},${d.target.id ?? d.target}`);
    linkedByIndex.add(`${d.target.id ?? d.target},${d.source.id ?? d.source}`);
  });

  const isConnected = (a, b) => 
    a.id === b.id || linkedByIndex.has(`${a.id},${b.id}`);

  // Sort so high similarity is drawn on top
  const TIER_ORDER = ["Low", "Medium", "High"];
  links.sort((a, b) => TIER_ORDER.indexOf(a.similarity) - TIER_ORDER.indexOf(b.similarity));

  const nodeRadius = d3.scaleSqrt()
    .domain([0, d3.max(nodes, d => d.pagerank)])
    .range([5, 18]); // Slightly larger nodes for easier interaction

  // 1. STRATEGIC FORCES: Pull aliases tightly, push everything else apart
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links)
      .id(d => d.id)
      .distance(d => d.similarity === "High" ? 15 : d.similarity === "Medium" ? 80 : 300)
      // High links act like rigid rods, Low links act like weak rubber bands
      .strength(d => d.similarity === "High" ? 1.5 : d.similarity === "Medium" ? 0.3 : 0.01)
    )
    .force("charge", d3.forceManyBody().strength(-200)) // Stronger repulsion for clarity
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => nodeRadius(d.pagerank) + 8).iterations(3));

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("font-family", "sans-serif")
    .style("font-size", 10);

  // Arrow markers strictly for High/Medium (Low is too cluttered)
  svg.append("defs").selectAll("marker")
    .data(["High", "Medium"])
    .join("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 22) // Adjusted to prevent arrows drawing *inside* the node circle
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", d => LINK_STYLE[d].stroke);

  const zoomGroup = svg.append("g");

  svg.call(d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", ({ transform }) => zoomGroup.attr("transform", transform)));

  // Links
  const linkGroup = zoomGroup.append("g");
  const link = linkGroup.selectAll("line")
    .data(links)
    .join("line")
      .attr("stroke", d => LINK_STYLE[d.similarity].stroke)
      .attr("stroke-width", d => LINK_STYLE[d.similarity].width)
      .attr("stroke-opacity", d => LINK_STYLE[d.similarity].opacity)
      .attr("marker-end", d => (d.similarity !== "Low") ? `url(#arrow-${d.similarity})` : null);

  // Advanced Tooltip Data
  link.append("title")
    .text(d => `${d.source.id ?? d.source} ↔ ${d.target.id ?? d.target}\nSimilarity: ${d.similarity} | Weight: ${d.weight.toFixed(2)}\nStruc: ${d.structural.toFixed(2)} | Sem: ${d.semantic.toFixed(2)}`);

  // Nodes
  const nodeGroup = zoomGroup.append("g");
  const node = nodeGroup.selectAll("g")
    .data(nodes)
    .join("g")
      .attr("cursor", "grab");

  const circles = node.append("circle")
    .attr("r", d => nodeRadius(d.pagerank))
    .attr("fill", d => NODE_COLOR[d.type] ?? "#999")
    .attr("stroke", d => d3.color(NODE_COLOR[d.type] ?? "#999").darker(1))
    .attr("stroke-width", 2);

  node.append("text")
    .attr("dy", d => nodeRadius(d.pagerank) + 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#222")
    .attr("pointer-events", "none")
    .style("text-shadow", "2px 2px 3px rgba(255,255,255,0.8), -2px -2px 3px rgba(255,255,255,0.8)")
    .text(d => d.id);

  node.append("title")
    .text(d => `${d.id} (${d.type})\nPageRank: ${d.pagerank.toFixed(4)}\nCluster: ${d.cluster}`);

  // 2. FOCUS + CONTEXT INTERACTIONS
  node.on("mouseover", function(event, d) {
    // Dim unrelated nodes
    node.style("opacity", o => isConnected(d, o) ? 1 : 0.1);
    
    // Highlight relevant links, hide the rest
    link
      .style("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.02)
      .style("stroke-width", l => (l.source.id === d.id || l.target.id === d.id) ? LINK_STYLE[l.similarity].width * 1.5 : LINK_STYLE[l.similarity].width);
  })
  .on("mouseout", function() {
    // Restore default states
    node.style("opacity", 1);
    link
      .style("stroke-opacity", l => LINK_STYLE[l.similarity].opacity)
      .style("stroke-width", l => LINK_STYLE[l.similarity].width);
  });

  // Drag Behaviors
  node.call(d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    })
  );

  // 3. PROPER WARM-UP RENDERING
  // Run simulation invisibly to near-equilibrium before the first paint
  for (let i = 0; i < 150; i++) {
    simulation.tick();
  }

  // Set initial coordinates based on the warm-up
  link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);
  
  node.attr("transform", d => `translate(${d.x},${d.y})`);

  // Allow the simulation to continue subtly for smooth drag interactions
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // Generate Legends (omitted for brevity, your previous logic was perfectly fine here)
  // const legendGroup = svg.append("g")
  //   .attr("transform", "translate(20, 20)");

  // // Optional: Add a subtle background plate for readability
  // // We'll calculate the rough height based on the number of items
  // const legendHeight = (Object.keys(NODE_COLOR).length * 20) + (Object.keys(LINK_STYLE).length * 20) + 80;
  // legendGroup.append("rect")
  //   .attr("x", -10)
  //   .attr("y", -10)
  //   .attr("width", 140)
  //   .attr("height", legendHeight)
  //   .attr("fill", "rgba(255, 255, 255, 0.85)")
  //   .attr("stroke", "#e0e0e0")
  //   .attr("rx", 6); // Rounded corners

  // // --- Node Type Legend ---
  // legendGroup.append("text")
  //   .attr("x", 0)
  //   .attr("y", 10)
  //   .attr("font-weight", "bold")
  //   .attr("fill", "#333")
  //   .text("Entity Type");

  // const nodeLegend = legendGroup.selectAll(".node-legend")
  //   .data(Object.entries(NODE_COLOR))
  //   .join("g")
  //     .attr("class", "node-legend")
  //     .attr("transform", (d, i) => `translate(0, ${30 + i * 20})`);

  // nodeLegend.append("circle")
  //   .attr("r", 6)
  //   .attr("cx", 6)
  //   .attr("cy", 0)
  //   .attr("fill", d => d[1])
  //   .attr("stroke", d => d3.color(d[1]).darker(1))
  //   .attr("stroke-width", 1.5);

  // nodeLegend.append("text")
  //   .attr("x", 20)
  //   .attr("y", 4)
  //   .attr("fill", "#444")
  //   .text(d => d[0]);

  // // --- Similarity Tier Legend ---
  // const linkLegendOffset = 30 + (Object.keys(NODE_COLOR).length * 20) + 20;

  // legendGroup.append("text")
  //   .attr("x", 0)
  //   .attr("y", linkLegendOffset)
  //   .attr("font-weight", "bold")
  //   .attr("fill", "#333")
  //   .text("Similarity Link");

  // // Reverse the link styles so "High" appears at the top of the legend
  // const linkLegend = legendGroup.selectAll(".link-legend")
  //   .data(Object.entries(LINK_STYLE).reverse()) 
  //   .join("g")
  //     .attr("class", "link-legend")
  //     .attr("transform", (d, i) => `translate(0, ${linkLegendOffset + 20 + i * 20})`);

  // linkLegend.append("line")
  //   .attr("x1", 0)
  //   .attr("x2", 15)
  //   .attr("y1", 0)
  //   .attr("y2", 0)
  //   .attr("stroke", d => d[1].stroke)
  //   .attr("stroke-width", d => Math.max(d[1].width, 2)) // Ensure even "Low" is visible in the legend
  //   .attr("stroke-opacity", d => d[1].opacity > 0.3 ? d[1].opacity : 0.6); // Boost legend visibility

  // linkLegend.append("text")
  //   .attr("x", 25)
  //   .attr("y", 4)
  //   .attr("fill", "#444")
  //   .text(d => d[0]);
  return svg.node();
}