---
title: Intelligence Coordination Dashboard
---

<div class="hero">
  <h1 style="font-size: 120%;">
    Illegal Coordination Network Analysis
  </h1>
</div>

---

```js
import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";

import {
  aliasData,
  profileData,
  communicationData,
  riskData,
  timelineData,
  timelineEntitiesData
} from "./components/data_load.js";

import {
  drawSimilarityRound
} from "./components/round.js";

import {
  drawEntityInspector
} from "./components/ego_network.js";

import {
  drawSimilarityNetwork
} from "./components/similarity_network.js";

import {
  drawTemporalActivity
} from "./components/timeline.js";
```

```js
/*
====================================================
GLOBAL INVESTIGATION STATE (CORREGIDO)
====================================================
*/
// const allEntities = aliasData.nodes.map(d => d.id);
const allEntities = aliasData.nodes.map(d => d.id).sort();

// 1. Declaramos el input (pero NO usamos Generators.input manualmente aquí)
// const i_entities = Inputs.text({ 
//   label: "Investigation Target", 
//   datalist: aliasData.nodes.map(d => d.id), 
//   value: "Mako" 
// });
const i_entities = Inputs.select(allEntities, {
  // label: "Investigation Targets",
  multiple: true,
  value: ["Nadia Conti", "Mako", "Oceanus City Council", "Green Guardians", "Remora"],
  size: 12 // Esto define la altura de la "bandeja"
});

const ego_entity = Inputs.text(allEntities, {
  label: "Focus on",
  datalist: aliasData.nodes.map(d => d.id), 
  value: "Nadia Conti",
  size: 12 // Esto define la altura de la "bandeja"
});


// const i_depth = Inputs.range([1, 6], { label: "Ego Network Depth", step: 1, value: 2 });
const i_depth = Inputs.range([1, 6], { 
  label: "Ego Network Depth", 
  step: 1, 
  value: 2 
});
const selectedEgoEntities = Generators.input(ego_entity);
const selectedEntities = Generators.input(i_entities);
const selectedDepth = Generators.input(i_depth);

// 3. Ahora selectedEntities contendrá ["Mako"] (un array de strings)
// y no un array de generadores.
// const selectedEntities = targetEntity ? [targetEntity] : [];
```

```js
/*
====================================================
FILTERED DATA
====================================================
*/
const filteredAliasData = aliasData;
```

```js
// const selectedEntities = targetEntity ? [targetEntity] : [];
display(html`
<div class="layout-container">
  
  <!-- COLUMNA PRINCIPAL: VISUALIZACIONES -->
  <div class="main-content">
    <div class="dashboard-grid">
      
      <!-- TOPOLOGY -->
      <section class="panel topology-panel">
        <div class="panel-header">Coordination Topology Overview</div>
        ${drawSimilarityRound(filteredAliasData, 900, 500)}
      </section>

      <!-- EGO NETWORK -->
      <section class="panel ego-panel">
        <div class="panel-header">Operational Ego Expansion</div>
        ${drawEntityInspector(selectedEgoEntities, profileData, communicationData, riskData, selectedDepth)}
      </section>

      <!-- ALIAS NETWORK -->
      <section class="panel similarity-panel">
        <div class="panel-header">Alias Corroboration Network</div>
        ${drawSimilarityNetwork(filteredAliasData, 400, 450)}
      </section>

      <!-- TIMELINE -->
      <section class="panel timeline-panel">
        <div class="panel-header">Temporal Coordination Analysis</div>
        ${selectedEntities.length > 0
          ? drawTemporalActivity(selectedEntities, timelineData, timelineEntitiesData)
          : html`<div class="empty-state">Select entities in the sidebar</div>`
        }
      </section>
    </div>
  </div>

  <!-- COLUMNA LATERAL: CONTROLES -->
  <aside class="sidebar">
    <section class="panel sticky-panel">
      <div class="panel-header">Control Center</div>

      <div class="compact-legend-vertical">
        <span class="legend-title">Entity Types</span>
        <div class="legend-item"><span class="dot person"></span>Person</div>
        <div class="legend-item"><span class="dot vessel"></span>Vessel</div>
        <div class="legend-item"><span class="dot location"></span>Location</div>
        <div class="legend-item"><span class="dot organization"></span>Organization</div>
        <div class="legend-item"><span class="dot group"></span>Group</div>
      </div>     
      <div class="control-group">
        <div class="filter-wrapper">${i_entities}</div>
      </div>
      <div class="control-group">
      
        <span class="legend-title">Focus Target</span>
        <div class="filter-wrapper">${ego_entity}</div>
        <div class="filter-wrapper">${i_depth}</div>
        
        <span class="legend-title">Investigation Targets</span>
        <div class="filter-wrapper">${i_entities}</div>
      </div>

      

    </section>
  </aside>

</div>
`)
```

--- 
<style>

:root {
  --bg: #f8fafc;
  --panel: white;
  --border: #e2e8f0;
  --text: #0f172a;
  --muted: #64748b;
}

/* ==================================================== */
/* PAGE */
/* ==================================================== */

body {
  background: var(--bg);
  width: 100vw;
  margin: 0;
}

/* ==================================================== */
/* GRID */
/* ==================================================== */

.dashboard-grid {

  display: grid;

  grid-template-columns:
    1fr 1fr;

  grid-template-rows:
    auto auto auto;

  gap: 18px;

  align-items: start;
}

/* ==================================================== */
/* PANELS */
/* ==================================================== */

.panel {

  background: var(--panel);

  border: 1px solid var(--border);

  border-radius: 14px;

  padding: 14px;

  box-shadow:
    0 1px 2px rgba(0,0,0,0.04);

  overflow: hidden;
}

.topology-panel {
  grid-column: 1 / span 2;
}

.timeline-panel {
  grid-column: 1 / span 2;
}

/* ==================================================== */
/* TYPOGRAPHY */
/* ==================================================== */

.panel-header {

  font-size: 16px;

  font-weight: 700;

  color: var(--text);

  margin-bottom: 4px;
}

.panel-description {

  font-size: 12px;

  color: var(--muted);

  margin-bottom: 10px;
}

/* ==================================================== */
/* LEGEND */
/* ==================================================== */
.control-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 18px;
}

.filters-grid {
  display: grid;
  /* Auto-fit asegura que si la pantalla se achica, pasen a la siguiente línea suavemente */
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  align-items: end; /* Alinea los inputs independientemente del tamaño de sus labels */
}



.compact-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between; /* Separa los nodos de la similitud */
  gap: 24px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.legend-group {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.legend-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
}

.dot {

  width: 10px;
  height: 10px;

  border-radius: 50%;
}

.person { background: #4A81BA; }
.vessel { background: #E78523; }
.location { background: #5E9F37; }
.organization { background: #C0392B; }
.group { background: #8E44AD; }

.line {
  width: 24px;
  height: 3px;
  display: inline-block;
}

.high {
  background: #810f7c;
}

.medium {
  background: #9ebcda;
}

.low {
  background: #8c96c6;
}

/* ==================================================== */
/* EMPTY STATE */
/* ==================================================== */

.empty-state {

  display: flex;

  align-items: center;

  justify-content: center;

  height: 400px;

  color: #94a3b8;

  font-size: 14px;
}
.layout-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.main-content {
  flex: 1; /* Toma todo el espacio restante */
}

.sidebar {
  width: 280px;
  position: sticky;
  top: 20px;
}

.sticky-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.control-group {
  border-bottom: 1px solid var(--border);
  padding-bottom: 15px;
}

.helper-text {
  font-size: 10px;
  color: var(--muted);
  margin-top: 5px;
}

.compact-legend-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Ajuste para que el input de selección múltiple use el ancho completo */
.filter-wrapper select {
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 8px;
  font-family: inherit;
  font-size: 12px;
}

.filter-wrapper label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
}
</style>