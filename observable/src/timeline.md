---
title: Communications TimeLine
---
<div class="hero">
  <h1 style="font-size: 100%;">Events Timeline</h1>
</div>

---


```js
import * as d3 from "npm:d3";

import {timelineData, timelineEntitiesData} from './components/data_load.js'
import {drawTemporalActivity} from  './components/timeline.js'
const selectedNodes = [
  "Mako",
  "Oceanus City Council",
  "Green Guardians",
  "Nadia Conti"
];
display(
  drawTemporalActivity(
    selectedNodes,
    timelineData,
    timelineEntitiesData
  )
)
```