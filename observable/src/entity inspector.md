---
title: Network Analysis
---

<div class="hero">
  <h1 style="font-size: 100%;">Ego Network View</h1>
</div>

---

```js
import * as d3 from "npm:d3";
import * as Inputs from "npm:@observablehq/inputs";

import {
  profileData,
  communicationData,
  riskData
} from "./components/data_load.js";

import {
  drawEntityInspector
} from "./components/ego_network.js";
```

```js
const selectedName = view(
  Inputs.select(Array.from(profileData.keys()), {
    label: "Selecciona un perfil",
    value: "Sam" // Opcional: valor por defecto
  })
);
// console.log(selectedName)

const selectedDepth = view(
  Inputs.range([1, 10], { label: "Profundidad", step: 1, value: 5 })
);
// console.log(selectedDepth)
```

```js
display(
  drawEntityInspector(
    selectedName,
    profileData,
    communicationData,
    riskData,
    selectedDepth
  )
);
```
