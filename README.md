@polymer-vis/vega-elements
[![GitHub release](https://img.shields.io/github/release/PolymerVis/vega-element.svg)](https://github.com/PolymerVis/vega-element/releases)
[![Published on webcomponents.org](https://img.shields.io/badge/webcomponents.org-published-blue.svg)](https://www.webcomponents.org/element/@polymer-vis/vega-elements)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Typescript](https://img.shields.io/badge/typescript-3.1-ff69b4.svg)](https://github.com/Microsoft/TypeScript)
==========

`@polymer-vis/vega-elements` is a suite of custom elements to render and interact with `[Vega](https://vega.github.io/vega)` and `[Vega-Lite](https://vega.github.io/vega-lite)` specifications and views.

More API documentation and Demos can be found on [the web components page for vega-elements](https://www.webcomponents.org/element/@polymer-vis/vega-elements).
More examples can also be found in the [Github page](https://polymervis.github.io/vega-element/).

**Versions details**  
v3 is a breaking change, where the components are moved to `npm`, and developed in typescript and inherits from `lit-element` instead of `polymer-element`.

- [**v3**](https://github.com/PolymerVis/vega-element/) Build with Typescript and inherits from Lit-Element (instead of Polymer-Element).
- [**v2**](https://github.com/PolymerVis/vega-element/tree/polymer2) Supports Polymer 2.0, Vega 3.0, and Vega-Lite 2.0
- [**v1**](https://github.com/PolymerVis/vega-element/tree/polymer1) Supports Polymer 1.0 and Vega 2.0

## Components

Currently, only `vega-embed` is available.

**`@polymer-vis/vega-elements/vega-embed.js`**  
`vega-embed` is a custom element that wraps around the [vega-embed](https://github.com/vega/vega-embed) micro-lib.

## Usage

### Installation

```bash
npm i @polymer-vis/vega-elements --save
```

### Usage in html

```html
<vega-embed spec="/path/to/some/vega/spec.json"></vega-embed>
```

### Usage in online code sharing hosts (e.g. jsfiddle, gist, etc)

```html
<!-- Import Vega 4 & Vega-Lite 2 (as needed) -->
<script src="https://cdn.jsdelivr.net/npm/vega@[VERSION]"></script>
<script src="https://cdn.jsdelivr.net/npm/vega-lite@[VERSION]"></script>

<!-- Load a bundled version of vega-embed custom element with jsdelivr -->
<script src="https://cdn.jsdelivr.net/npm/@polymer-vis/vega-elements/dist/vega-embed.bundled.min.js"></script>

<vega-embed spec="/path/to/some/vega/spec.json"></vega-embed>

<script>
// create a new vega-embed element programmatically
const ele = new VegaElements.VegaEmbed();
// set attribute
ele.setAttribute("show-export", true);
// set property
ele.showSource = true;
// set some spec
ele.spec = {...};
// attach to DOM
document.body.appendChild(ele);
</script>
```

### Usage with [`lit-html`](https://github.com/Polymer/lit-html)

```js
// import lit-html
import {render, html} from "lit-html";

// import the vega-embed element
import "./node_modules/vega-elements/vega-embed.js";

// vega-lite specification
conse scatterplot = {
  "$schema": "https://vega.github.io/schema/vega-lite/v2.json",
  "description": "A scatterplot showing horsepower and miles per gallons for various cars.",
  "data": {"url": "data/cars.json"},
  "mark": {"type": "point", "tooltip": {"content": "data"}},
  "encoding": {
    "x": {"field": "Horsepower", "type": "quantitative"},
    "y": {"field": "Miles_per_Gallon", "type": "quantitative"},
    "tooltip": [
      {"field": "Horsepower", "type": "quantitative"},
      {"field": "Miles_per_Gallon", "type": "quantitative"}
    ]
  }
};

// create the factory method to create a html template result
const embedTmpl = (spec, opts) => html`<vega-embed spec=${spec} opts=${opts}></vega-embed>`;

// render the template result to document body
render(embedTmpl(scatterplot, {tooltip: true, renderer: "canvas"}), document.body);
```

## UMD bundles

`vega-elements` provides 2 pre-build UMD distributions (under the named scope `VegaElements`) for `vega-embed` custom element.

- `./dist/vega-embed.min.js`: Minimal bundle with only [`@polymer/lit-element`](https://github.com/Polymer/lit-element) and `@polymer-vis/vega-elements`.
  Vega, Vega-Lite, and [`vega-embed`](https://github.com/vega/vega-embed) should be imported separately.

- `./dist/vega-embed.bundled.min.js`: Bundle with [`@polymer/lit-element`](https://github.com/Polymer/lit-element),
  [`vega-embed`](https://github.com/vega/vega-embed), and `@polymer-vis/vega-elements`. Vega or/and Vega-Lite should be
  imported separately.

## Disclaimer

PolymerVis is a personal project and is NOT in any way affliated with Vega, Vega-Lite, Polymer or Google.
