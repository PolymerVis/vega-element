import vegaEmbed, {
  Actions,
  Config,
  EmbedOptions,
  Mode,
  VisualizationSpec
} from 'vega-embed';
import {Options as TooltipOptions} from 'vega-tooltip';
import {
  Loader,
  LoaderOptions,
  Renderers,
  Spec as VgSpec,
  TooltipHandler,
  View
} from 'vega-typings';

import {html, LitElement, property, PropertyValues} from '@polymer/lit-element';

import {microTask} from '@polymer/polymer/lib/utils/async.js';
import {Debouncer} from '@polymer/polymer/lib/utils/debounce.js';

// default style for vega-embed
const embedStyle = `.vega-embed {
  position: relative;
  display: inline-block;
  padding-right: 38px;
}

.vega-embed .vega-actions-wrapper {
  display: inline-flex;
  position: absolute;
  top: 0;
  right: 0;
  padding: 6px;
  z-index: 1000;

  opacity: 0.2;
  background: white;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
  color: #1b1e23;
  border: 1px solid #aaa;
  border-radius: 999px;
  transition: opacity 0.4s ease-in;
}

.vega-embed:hover .vega-actions-wrapper {
  transition: opacity 0.2s ease;
  opacity: 1;
}

.vega-embed .vega-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: none;
  flex-direction: column;

  padding-bottom: 8px;
  padding-top: 8px;
  border-radius: 4px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.2);
  border: 1px solid #d9d9d9;
  background: white;
}

.vega-embed .vega-actions-wrapper:hover {
  background: transparent;
  color: transparent;
  border: none;
  box-shadow: none;
}

.vega-embed .vega-actions-wrapper:hover .vega-actions {
  display: flex;
}

.vega-embed .vega-actions a {
  padding: 8px 16px;
  font-family: sans-serif;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  color: #434a56;
  text-decoration: none;
}

.vega-embed .vega-actions a:hover {
  background-color: #f7f7f9;
  color: #1b1e23;
}`;

// check if vegaEmbed is already loaded
export const embed = !!(window as any).vegaEmbed
  ? (window as any).vegaEmbed
  : vegaEmbed;

// vega-embed did not export this constant
const I18N = {
  COMPILED_ACTION: 'View Vega',
  EDITOR_ACTION: 'Open in Vega Editor',
  PNG_ACTION: 'Save as PNG',
  SOURCE_ACTION: 'View Source',
  SVG_ACTION: 'Save as SVG'
};

// tslint:disable-next-line:no-any
export type SafeAny = any;

/** Cast any value into a boolean if appropriate, else return a string. */
export function asBoolOrGeneric(value: any) {
  if (typeof value === 'boolean') return value;
  const v = value
    .toString()
    .trim()
    .toLowerCase();
  if (v == '' || v == '1' || v == 'true') return true;
  if (v == '0' || v == 'false') return false;
  return value;
}

function asObjectOrGeneric(value: any) {
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value) as Object;
  } catch (error) {
    return value;
  }
}

function asArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return (value as string).split(/[;, |]/gim).map(str => str.trim());
}

const IGNORED = new Set([
  'showExport',
  'showSource',
  'showCompiled',
  'showEditor',
  'spec',
  'opts',
  'defaultStyle',
  'ele',
  'view',
  'embedStyle',
  'observeState',
  'observeData',
  'dataHandler',
  'dataListeners',
  'debouncer'
]);

/** 
`vega-embed` is a custom element that wraps around the [VegaEmbed](https://github.com/vega/vega-embed) micro-lib
to visualize `[Vega](https://vega.github.io/vega)` and `[Vega-Lite](https://vega.github.io/vega-lite)` views.

## Usage
### Installing the npm package
```bash
npm i @polymer-vis/vega-elements --save
```

### Usage in html
```html
<vega-embed spec="/path/to/some/vega/spec.json"></vega-embed>
```

### Usage in online code sharing hosts (e.g. jsfiddle, gist, etc)
```html
<!-- Import Vega 4 & Vega-Lite 2 -->
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


@element vega-embed
@demo index.html Examples
 */
export class VegaEmbed extends LitElement {
  /**
   * A JSON object or url to the Vega or Vega-Lite specification.
   * @type {String|VgSpec}
   */
  @property({attribute: 'spec', type: asObjectOrGeneric})
  spec?: string | VgSpec;

  /**
   * Show the control to export SVG/PNG.
   * @type {Boolean}
   */
  @property({attribute: 'show-export', type: Boolean})
  showExport: boolean = false;

  /**
   * Show the control to display the source specification.
   * @type {Boolean}
   */
  @property({attribute: 'show-source', type: Boolean})
  showSource: boolean = false;

  /**
   * Show the control to display the compiled vega specification (for vega-lite source).
   * @type {Boolean}
   */
  @property({attribute: 'show-compiled', type: Boolean})
  showCompiled: boolean = false;

  /**
   * Show the control to display the specification in an editor at
   * https://vega.github.io/editor
   * @type {Boolean}
   */
  @property({attribute: 'show-editor', type: Boolean})
  showEditor: boolean = false;

  /**
   * Whether to parse the specification as `vega` or `vega-lite`.
   * If not provided, `vega-embed` will try to infer from the `$schema` field,
   * otherwise it will default to `vega`.
   * @type {String}
   */
  @property({attribute: true, type: String})
  mode?: Mode;

  /**
   * The theme to apply: `excel` | `ggplot2` | `quartz` | `vox` | `dark`.
   */
  @property({attribute: true, type: String})
  theme?: 'excel' | 'ggplot2' | 'quartz' | 'vox' | 'dark';

  /**
   * Whether to show a tooltip (with the corresponding `tooltip` field).
   * Alternatively, you can pass in a `TooltipOptions` or a custom `TooltipHandler`.
   *
   * See [vega-tooltip](https://github.com/vega/vega-tooltip) for more details.
   * @type {Boolean|Object}
   */
  @property({attribute: true, type: asBoolOrGeneric})
  tooltip: TooltipHandler | TooltipOptions | boolean = false;

  /**
   * Whether to apply the default style for the controls. Alternatively, you can pass in the
   * style directly. Default to `true`.
   * @type {Boolean|String}
   */
  @property({attribute: 'default-style', type: asBoolOrGeneric})
  defaultStyle?: boolean | string = true;

  /**
   * Set `true` to show all actions: `export`, `source`, `compiled`, and `editor.
   * Defaults to `true`.
   * Set `false` to hide all actions.
   * Otherwise, you can also pass in an Object with a boolean for each of the following
   * available actions.
   *
   * @example
   * ```html
   * <vega-embed actions='{"export": true, "source": false}'></vega-embed>
   * ```
   *
   */
  @property({attribute: true, type: asBoolOrGeneric})
  actions?: boolean | Actions = {
    export: true,
    source: true,
    compiled: true,
    editor: true
  };

  /**
   * Sets the current log level. See [Vega docs](https://vega.github.io/vega/docs/api/view/#view_logLevel) for details.
   * (0: None, 1: Error, 2: Warn, 3: Info, 4: Debug)
   *
   * @type {Number}
   */
  @property({attribute: 'log-level', type: Number})
  logLevel: number = 0;

  /**
   * Sets a custom Vega `loader` or `loader` options.
   * See [Vega docs](https://vega.github.io/vega/docs/api/view/#view) for details.
   *
   * @type {Object}
   */
  @property({attribute: true, type: asObjectOrGeneric})
  loader?: Loader | LoaderOptions;

  /**
   * The renderer to use for the view. One of `canvas` (default) or `svg`.
   *
   * @type {String}
   */
  @property({attribute: true, type: String})
  renderer: Renderers = 'canvas';

  /**
   * A callback function that can modify an input specification before it is parsed.
   *
   * @type {Function}
   */
  @property({attribute: 'on-before-parse', type: Function})
  onBeforeParse?: (spec: VisualizationSpec) => VisualizationSpec;

  /**
   * Sets the view width in pixels. Note that Vega-Lite overrides this option.
   *
   * @type {Number}
   */
  @property({attribute: true, type: Number})
  width?: number;

  /**
   * Sets the view height in pixels. Note that Vega-Lite overrides this option.
   *
   * @type {Number}
   */
  @property({attribute: true, type: Number})
  height?: number;

  /**
   * Sets the view padding in pixels.
   * See [Vega docs](https://vega.github.io/vega/docs/api/view/#view_padding) for details.
   *
   * @type {Number|{left?: Number, right?: Number, top?: Number, bottom?: Number}}
   */
  @property({attribute: true, type: asObjectOrGeneric})
  padding?:
    | number
    | {left?: number; right?: number; top?: number; bottom?: number};

  /**
   * The number by which to multiply the width and height (default 1) of an exported PNG or SVG image.
   *
   * @type {Number}
   */
  @property({attribute: 'scale-factor', type: Number})
  scaleFactor: number = 1;

  /**
   * Either a URL string from which to load a [Vega](https://vega.github.io/vega/docs/config/)/Vega-Lite
   * or [Vega-Lite](https://vega.github.io/vega-lite/docs/config.html) configuration file, or
   * a JSON object to override the default configuration options.
   *
   * @type {String|Object}
   */
  @property({attribute: true})
  config?: string | Config;

  /**
   * HTML to inject into the `` tag of the page generated by the "View Source" and "View Vega" action link.
   * For example, this can be used to add code for syntax highlighting.
   *
   * @type {String}
   */
  @property({attribute: 'source-header', type: String})
  sourceHeader?: string;

  /**
   * HTML to inject into the end of the page generated by the "View Source" and "View Vega" action link.
   * The text will be added immediately before the closing `` tag.
   *
   * @type {String}
   */
  @property({attribute: 'source-footer', type: String})
  sourceFooter?: string;

  /**
   * The URL at which to open embedded Vega specs in a Vega editor.
   * Defaults to "http://vega.github.io/editor/".
   * Internally, Vega-Embed uses HTML5 postMessage to pass the specification information to the editor.
   *
   * @type {String}
   */
  @property({attribute: 'editor-url', type: String})
  editorUrl?: string;

  /**
   * Enable `hover` event processing. `Hover` event processing is enabled on Vega by default.
   * Alternatively, you can provide an Object with keys (`hoverSet` and/or `updateSet`) to specify which named
   * encoding sets to invoke upon mouseover and mouseout.
   *
   * @type {Boolean|{hoverSet?: String; updateSet?: String}}
   */
  @property({attribute: true, type: asBoolOrGeneric})
  hover: boolean | {hoverSet?: string; updateSet?: string} = true;

  /**
   * Use [runAsync](https://vega.github.io/vega/docs/api/view/#view_runAsync) instead of [run](https://vega.github.io/vega/docs/api/view/#view_run).
   *
   * @type {Boolean}
   */
  @property({attribute: 'run-async', type: Boolean})
  runAsync?: boolean = false;

  /**
   * This property maps keys (`COMPILED_ACTION`, `EDITOR_ACTION`, `PNG_ACTION`, `SOURCE_ACTION`, `SVG_ACTION`)
   * to string values for the action's text. By default, the text is in English.
   *
   * @type {{COMPILED_ACTION: String, EDITOR_ACTION: String, PNG_ACTION: String, SOURCE_ACTION: String, SVG_ACTION: String}}
   */
  @property({attribute: true, type: asObjectOrGeneric})
  i18n?: Partial<typeof I18N>;

  /**
   * Instead of configuring `vega-embed` through its properties or attributes,
   * you can also pass in the entire configuration Object directly.
   * See [Vega-Embed docs](https://github.com/vega/vega-embed#options) for more details.
   *
   * @type {Object}
   */
  @property({attribute: true, type: asObjectOrGeneric})
  opts: EmbedOptions = {};

  /**
   * The default style for the `vega-embed` actions. Do not modify unless you know
   * what you are doing.
   *
   * @type {String}
   */
  @property({attribute: 'embed-style', type: String})
  embedStyle: string = embedStyle;

  /**
   * A list of dataset to observe. Will fire event `data` with the arguments
   * `{name, value}`, where `name` is the name of the observed dataset, and
   * `value` is the observed dataset.
   *
   * Only available for `vega@4`.
   *
   * @type {String[]}
   */
  @property({attribute: 'observe-data', type: asArray})
  observeData?: string[];

  /**
   * Set `observe-state` flag for the element to dispatch custom event
   * `state` whenever the view is updated.
   *
   * @type {Boolean}
   */
  @property({attribute: 'observe-state', type: Boolean})
  observeState: boolean = false;

  /**
   * Promise to current [Vega view](https://github.com/vega/vega-view#vega-view) object.
   * @type {View}
   */
  public view?: View;

  /**
   * The current state of signals and data sets in this view’s backing dataflow graph. Available only if `observe-state` attribute is set.
   *
   * @type {data: Object, signals: Object}
   */
  public state?: any;

  /**
   * HTMLElement containing the embedded view.
   * @type {HTMLElement}
   */
  public ele?: HTMLElement;

  /**
   * List of dataset that has a listener.
   *
   * @type String[]
   */
  protected dataListeners: string[] = [];

  /**
   * Debouncer
   */
  protected debouncer: Debouncer | null = null;

  /**
   * Fired when `observe-data` is set.
   *
   * @event data
   * @param {{name: String, value: Array}} dataset.
   */
  /**
   * Default dataHandler.
   */
  protected dataHandler = (name: string, value: any) => {
    this.dispatchEvent(new CustomEvent('data', {detail: {name, value}}));
  };

  static get properties() {
    return {};
  }

  protected firstUpdated() {
    this.ele = (this.renderRoot as Element).querySelector(
      '#vis'
    ) as HTMLElement;
  }

  protected update(changedProperties: PropertyValues) {
    super.update(changedProperties);
    const opts = {...this.opts};
    const {actions, showCompiled, showEditor, showExport, showSource} = this;
    const actionsOpt =
      typeof actions === 'boolean'
        ? actions
        : {
            ...actions,
            compiled: showCompiled,
            editor: showEditor,
            export: showExport,
            source: showSource
          };
    this.actions = actionsOpt;
    for (let [key] of changedProperties) {
      // do not add these properties
      if (IGNORED.has(key as string)) continue;
      opts[key] = (this as any)[key];
    }
    this.opts = opts;

    this.debouncer = Debouncer.debounce(
      this.debouncer,
      microTask,
      this.updateEmbed.bind(this)
    );
  }

  protected finalizeView(view: View) {
    this.unregisterDataListeners(view);
    view.finalize();
  }

  /**
   * Fired when the view is updated.
   *
   * @event view
   * @param {View} Vega view object.
   */
  /**
   * Update the view and register data and register data listeners.
   * @param {View} Vega view object.
   */
  protected updateView(view: View) {
    this.updateState(view);
    this.registerDataListeners(view);
    // dispatch event
    this.dispatchEvent(new CustomEvent('view', {detail: view}));
  }

  protected async updateEmbed() {
    const {spec, opts} = this;

    // do nothing if no spec is provided
    if (!spec) return;

    // clean up old view
    this.view && this.finalizeView(this.view);

    // update view
    this.view = await this.getView(spec, opts);
    this.view && this.updateView(this.view);
  }

  /**
   * Fired when error is encountered parsing or rendering the view.
   *
   * @event error
   * @param {Error} error object from Vega.
   */
  protected async getView(spec: string | VgSpec, opts: EmbedOptions) {
    // update
    try {
      const result = await vegaEmbed(this.ele as HTMLElement, spec, opts);
      return result.view;
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', {detail: error}));
      return undefined;
    }
  }

  protected unregisterDataListeners(view: View) {
    // unregister old data listeners
    this.dataListeners.forEach(name => {
      try {
        (view as any).removeDataListener(name, this.dataHandler);
      } catch (error) {
        this.dispatchEvent(new CustomEvent('error', {detail: error}));
      }
    });
  }

  protected registerDataListeners(view: View) {
    if (!this.observeData) return;
    this.dataListeners = this.observeData.map(name => {
      try {
        (view as any).addDataListener(name, this.dataHandler);
      } catch (error) {
        this.dispatchEvent(new CustomEvent('error', {detail: error}));
      }
      return name;
    });
  }

  protected updateState(view: View) {
    if (!this.observeState) return;
    this.state = view.getState();
    this.dispatchEvent(new CustomEvent('state', {detail: this.state}));
  }

  protected render() {
    const {defaultStyle, embedStyle} = this;
    const style =
      typeof defaultStyle === 'string'
        ? `<style>${defaultStyle}</style>`
        : embedStyle;
    return html`
      <style>
        :host {
          display: block;
        }
        ${!!defaultStyle ? style : ''}
      </style>
      <div id="vis"></div>`;
  }
}

customElements.define('vega-embed', VegaEmbed);

export default VegaEmbed;
