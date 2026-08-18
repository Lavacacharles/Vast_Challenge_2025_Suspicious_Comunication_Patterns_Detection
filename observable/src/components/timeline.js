import * as d3 from "npm:d3";

const EVENT_COLORS = {
  Monitoring: "#2563eb",
  VesselMovement: "#16a34a",
  Collaborate: "#ea580c",
  Assessment: "#9333ea",
  TourActivity: "#dc2626"
};

const COMM_COLOR = "#0f172a";

export function drawTemporalActivity(
  selectedNodes,
  activityData,
  communicationData
) {
  if (!selectedNodes?.length) return null;

  /*
  --------------------------------------------------
  1. STATE
  --------------------------------------------------
  */
  let showEvents = true;
  let showCommunications = true;

  /*
  --------------------------------------------------
  2. CONTAINER
  --------------------------------------------------
  */
  const root = document.createElement("div");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "10px";
  root.style.width = "100%";
  root.style.position = "relative"; // Necesario para posicionar el tooltip relativo al contenedor

  /*
  --------------------------------------------------
  3. CONTROLS
  --------------------------------------------------
  */
  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "10px";
  controls.style.alignItems = "center";

  const eventBtn = document.createElement("button");
  eventBtn.textContent = "Toggle Events";

  const commBtn = document.createElement("button");
  commBtn.textContent = "Toggle Communications";

  [eventBtn, commBtn].forEach(btn => {
    btn.style.padding = "6px 12px";
    btn.style.border = "1px solid #cbd5e1";
    btn.style.borderRadius = "6px";
    btn.style.background = "white";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "500";
  });

  controls.appendChild(eventBtn);
  controls.appendChild(commBtn);
  root.appendChild(controls);

  /*
  --------------------------------------------------
  4. SPLIT LAYOUT CONTAINER
  --------------------------------------------------
  */
  const layoutWrapper = document.createElement("div");
  layoutWrapper.style.display = "flex";
  layoutWrapper.style.width = "100%";
  layoutWrapper.style.border = "1px solid #cbd5e1";
  layoutWrapper.style.borderRadius = "8px";
  layoutWrapper.style.overflow = "hidden";

  const leftPanel = document.createElement("div");
  leftPanel.style.flexShrink = "0";
  leftPanel.style.width = "160px";
  leftPanel.style.background = "#f8fafc";
  leftPanel.style.borderRight = "1px solid #e2e8f0";

  const rightPanel = document.createElement("div");
  rightPanel.style.flexGrow = "1";
  rightPanel.style.overflowX = "auto";
  rightPanel.style.overflowY = "hidden";
  rightPanel.style.background = "white";

  layoutWrapper.appendChild(leftPanel);
  layoutWrapper.appendChild(rightPanel);
  root.appendChild(layoutWrapper);

  /*
  --------------------------------------------------
  5. TOOLTIP COMPONENT
  --------------------------------------------------
  */
  // Creamos un div para el tooltip y lo añadimos a "root"
  const tooltip = d3.select(root)
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "white")
    .style("border", "1px solid #cbd5e1")
    .style("border-radius", "6px")
    .style("padding", "10px")
    .style("font-size", "12px")
    .style("color", "#334155")
    .style("box-shadow", "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)")
    .style("pointer-events", "none") // Para que no interfiera con el mouse
    .style("z-index", "100")
    .style("max-width", "280px")
    .style("line-height", "1.4");

  /*
  --------------------------------------------------
  6. GLOBAL EVENT TYPES
  --------------------------------------------------
  */
  const allEvents = Array.from(
    new Set(
      Object.values(activityData || {})
        .flat()
        .flatMap(d => d[1])
    )
  );

  const color = d3.scaleOrdinal()
    .domain(allEvents)
    .range(allEvents.map((_, i) => d3.interpolateTurbo(i / (allEvents.length - 1))));

  /*
  --------------------------------------------------
  7. RENDER FUNCTION
  --------------------------------------------------
  */
  function render() {
    leftPanel.innerHTML = "";
    rightPanel.innerHTML = "";

    const eventRows = [];
    if (showEvents) {
      for (const node of selectedNodes) {
        const records = activityData?.[node] || [];
        for (const [time, events] of records) {
          eventRows.push({ entity: node, day: time.day, hour: time.hour, events });
        }
      }
    }

    const communicationRows = [];
    if (showCommunications) {
      for (const node of selectedNodes) {
        const records = communicationData?.[node] || [];
        for (const [meta, messages] of records) {
          communicationRows.push({ entity: node, target: meta.target, day: meta.day, hour: meta.hour, messages });
        }
      }
    }

    const DAYS = 14;
    const HOURS_PER_DAY = 24;

    const margin = { top: 60, right: 20, bottom: 40, left: 10 }; 
    const cellWidth = 22;
    const rowHeight = 36;
    const totalHours = DAYS * HOURS_PER_DAY;
    
    const innerWidth = totalHours * cellWidth;
    const chartWidth = margin.left + innerWidth + margin.right;
    const chartHeight = margin.top + selectedNodes.length * rowHeight + margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, totalHours])
      .range([margin.left, chartWidth - margin.right]);

    const y = d3.scaleBand()
      .domain(selectedNodes)
      .range([margin.top, chartHeight - margin.bottom])
      .padding(0.15);

    /*
    ==============================================
    SVG IZQUIERDO: ETIQUETAS FIJAS
    ==============================================
    */
    const leftSvg = d3.create("svg")
      .attr("width", 160)
      .attr("height", chartHeight);

    leftSvg.append("text")
      .attr("x", 150)
      .attr("y", margin.top - 20)
      .attr("text-anchor", "end")
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#0f172a")
      .text("Entities");

    leftSvg.append("g")
      .selectAll("text")
      .data(selectedNodes)
      .join("text")
      .attr("x", 150)
      .attr("y", d => y(d) + y.bandwidth()/2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#334155")
      .text(d => d);

    leftPanel.appendChild(leftSvg.node());

    /*
    ==============================================
    SVG DERECHO: LÍNEA DE TIEMPO CON SCROLL
    ==============================================
    */
    const rightSvg = d3.create("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight);

    rightSvg.append("g")
      .selectAll("rect")
      .data(d3.range(DAYS))
      .join("rect")
      .attr("x", d => x(d * 24))
      .attr("y", margin.top)
      .attr("width", cellWidth * 24)
      .attr("height", chartHeight - margin.top - margin.bottom)
      .attr("fill", d => d % 2 === 0 ? "#f8fafc" : "#ffffff");

    rightSvg.append("g")
      .selectAll("line")
      .data(d3.range(totalHours + 1))
      .join("line")
      .attr("x1", d => x(d))
      .attr("x2", d => x(d))
      .attr("y1", margin.top)
      .attr("y2", chartHeight - margin.bottom)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", d => d % 24 === 0 ? 1.5 : 0.5);

    // Eventos
    if (showEvents) {
      eventRows.forEach(row => {
        const t = row.day * 24 + row.hour;
        const x0 = x(t);
        const y0 = y(row.entity);
        const stackHeight = y.bandwidth() / row.events.length;

        row.events.forEach((event, i) => {
          rightSvg.append("rect")
            .attr("x", x0 + 1)
            .attr("y", y0 + i * stackHeight)
            .attr("width", cellWidth - 2)
            .attr("height", stackHeight - 1)
            .attr("rx", 2)
            .attr("fill", color(event))
            .style("cursor", "pointer")
            .on("mouseover", function(e) {
              // Resaltar barra
              d3.select(this).attr("stroke", "#000").attr("stroke-width", 1);
              // Mostrar tooltip
              tooltip.style("visibility", "visible")
                .html(`
                  <strong style="color: #0f172a; display: block; margin-bottom: 4px;">${row.entity}</strong>
                  <div style="margin-bottom: 6px; font-weight: 500;">
                    <span style="color: ${color(event)};">&#9632;</span> ${event}
                  </div>
                  <div style="color: #64748b; font-size: 11px;">Día ${row.day} &bull; Hora ${row.hour}</div>
                `);
            })
            .on("mousemove", function(e) {
              // Posicionar tooltip con base en el mouse
              const [mx, my] = d3.pointer(e, root);
              tooltip.style("left", (mx + 15) + "px")
                     .style("top", (my + 15) + "px");
            })
            .on("mouseout", function(e) {
              // Quitar resalte y ocultar tooltip
              d3.select(this).attr("stroke", "none");
              tooltip.style("visibility", "hidden");
            });
        });
      });
    }

    // Comunicaciones
    if (showCommunications) {
      communicationRows.forEach(row => {
        const t = row.day * 24 + row.hour;
        const cx = x(t) + cellWidth / 2;
        const cy = y(row.entity) + y.bandwidth() / 2;

        rightSvg.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 5)
          .attr("fill", COMM_COLOR)
          .attr("stroke", "white")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseover", function(e) {
            // Resaltar círculo
            d3.select(this).attr("r", 7).attr("stroke", "#ea580c").attr("stroke-width", 2);
            
            // Formatear mensajes
            const formattedMessages = row.messages.map(m => `&bull; <em>"${m}"</em>`).join("<br>");
            
            tooltip.style("visibility", "visible")
              .html(`
                <strong style="color: #0f172a;">${row.entity} &rarr; ${row.target}</strong>
                <div style="color: #64748b; font-size: 11px; margin-top: 4px; margin-bottom: 8px;">
                  Día ${row.day} &bull; Hora ${row.hour}
                </div>
                <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; max-height: 120px; overflow-y: auto;">
                  ${formattedMessages}
                </div>
              `);
          })
          .on("mousemove", function(e) {
            const [mx, my] = d3.pointer(e, root);
            tooltip.style("left", (mx + 15) + "px")
                   .style("top", (my + 15) + "px");
          })
          .on("mouseout", function(e) {
            // Volver círculo a la normalidad y ocultar tooltip
            d3.select(this).attr("r", 5).attr("stroke", "white").attr("stroke-width", 1.5);
            tooltip.style("visibility", "hidden");
          });
      });
    }

    rightSvg.append("g")
      .selectAll("text")
      .data(d3.range(DAYS))
      .join("text")
      .attr("x", d => x(d * 24 + 12))
      .attr("y", chartHeight - margin.bottom + 12)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 600)
      .attr("fill", "#0f172a")
      .text(d => `Day ${d}`);

    const legend = rightSvg.append("g")
      .attr("transform", `translate(${margin.left},20)`);

    let offset = 0;

    if (showEvents) {
      allEvents.forEach(event => {
        const g = legend.append("g")
          .attr("transform", `translate(${offset},0)`);

        g.append("rect")
          .attr("width", 12)
          .attr("height", 12)
          .attr("rx", 2)
          .attr("fill", color(event));

        g.append("text")
          .attr("x", 18)
          .attr("y", 10)
          .attr("font-size", 10)
          .attr("fill", "#334155")
          .text(event);

        offset += 140;
      });
    }

    if (showCommunications) {
      const g = legend.append("g")
        .attr("transform", `translate(${offset},0)`);

      g.append("circle")
        .attr("cx", 6)
        .attr("cy", 6)
        .attr("r", 5)
        .attr("fill", COMM_COLOR);

      g.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("font-size", 10)
        .attr("fill", "#334155")
        .text("Communications");
    }

    rightPanel.appendChild(rightSvg.node());
  }

  /*
  --------------------------------------------------
  8. BUTTON EVENTS
  --------------------------------------------------
  */
  eventBtn.onclick = () => {
    showEvents = !showEvents;
    eventBtn.style.opacity = showEvents ? "1" : "0.5";
    render();
  };

  commBtn.onclick = () => {
    showCommunications = !showCommunications;
    commBtn.style.opacity = showCommunications ? "1" : "0.5";
    render();
  };

  /*
  --------------------------------------------------
  9. INITIAL RENDER
  --------------------------------------------------
  */
  render();

  return root;
}