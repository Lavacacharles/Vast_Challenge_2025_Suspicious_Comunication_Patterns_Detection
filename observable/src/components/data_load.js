import * as d3 from "npm:d3";
import {FileAttachment} from "observablehq:stdlib";
// Esta función centraliza la lógica de procesamiento
export const aliasData = await FileAttachment("../data/alias_similarity_graph.json").json()
export const lowSimilarityLinks = aliasData.links.filter(link => link.similarity === "Low");
export const mediumSimilarityLinks = aliasData.links.filter(link => link.similarity === "Medium");
export const highSimilarityLinks = aliasData.links.filter(link => link.similarity === "High");

export const heatmapData = await FileAttachment("../data/temporal_heatmap.json").json()
// export const timelineData = await FileAttachment("../data/communication_timeline.json").json()
export const coordinationData = await FileAttachment("../data/temporal_coordination.json").json()
export const sequenceData = await FileAttachment("../data/communication_sequences.json").json()
export const profileData = await new Map( await FileAttachment("../data/behavior_profiles.json").json())
export const semanticData = await FileAttachment("../data/semantic_projection.json").json()
export const node_attributes = await FileAttachment("../data/nodes_attributes.json").json()
export const communicationData = await FileAttachment("../data/communication_graph.json").json()
export const timelineData = await FileAttachment("../data/timeline.json").json()
export const timelineEntitiesData = await FileAttachment("../data/timeline_entities.json").json()
export const riskData = await FileAttachment("../data/risk_score_graph.json").json()

export function getNeighbors (entityId, links) {
  if (!entityId) return new Set();
  const neighbors = new Set();
  links.forEach(l => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;
    if (sourceId === entityId) neighbors.add(targetId);
    if (targetId === entityId) neighbors.add(sourceId);
  });
  neighbors.add(entityId); // Include self
  return neighbors;
}

export function temporalClusteredEntities () {
  const entityProfiles = d3.rollups(
    heatmapData,
    v => {
      const maxActivity = d3.max(v, d => d.activity);
      const peakHourObj = v.find(d => d.activity === maxActivity);
      return peakHourObj ? peakHourObj.hour : 0;
    },
    d => d.entity
  );
  
  // Sort by peak hour, then alphabetically as fallback
  return entityProfiles
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(d => d[0]);
}