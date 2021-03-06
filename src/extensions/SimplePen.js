/** Created by ge on 9/12/16. */
import Color from 'color';
import {limit, rangedTaper} from "./utils";
export const STROKE_WIDTHS = [0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.2, 1.4, 1.6, 1.8,
  2, 2.2, 2.4, 2.6, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35];
const DEFAULT_FORCE = 0.5;
const DEFAULT_TILT = 1;
export default class SimplePen {
  static type = "SimplePen";

  constructor(config) {
    if (config) this.config = config;
  }

  set config(configuration) {
    const {
      type, color, strokeWidth = 1,
      strokeFloor = 0.9, strokeCeiling = 2, strokeScale = 3,
      alphaFloor = 0.9, alphaCeiling = 2, alphaScale = 3,
    } = configuration;
    if (!configuration) throw Error("configuration options is " + (typeof configuration));
    if (configuration.type !== SimplePen.type) throw Error('configuration is for a different pen ' + configuration.type);
    this._config = {
      type, color, strokeWidth,
      strokeFloor, strokeCeiling, strokeScale,
      alphaFloor, alphaCeiling, alphaScale,
    };
  }

  get config() {
    return this._config
  }

  _getWidth(force, renderRatio) {
    return this.config.strokeWidth * renderRatio * rangedTaper(
        this.config.strokeFloor, this.config.strokeCeiling, this.config.strokeScale,
        force);
  }

  _getColor(force) {
    return Color(this.config.color).alpha(limit(0, 1, rangedTaper(this.config.alphaFloor, this.config.alphaCeiling, this.config.alphaScale, force))).hslaString();
  }

  draw(context, {config, x, y, force = DEFAULT_FORCE, tilt = DEFAULT_TILT, data:{xs, ys, configs, forces, tilts}}, options = {active: false}) {

    if (!xs || xs.length == 0) return;
    const renderRatio = context.renderRatio;

    const oldComposition = context.globalCompositeOperation;
    // kind of a dicey implementation.
    context.globalCompositeOperation = "source-over";

    context.beginPath();
    context.lineCap = 'round';

    this.config = config;
    if (options.active) {
      xs = xs.slice(-1);
      ys = ys.slice(-1);
      if (configs) configs = configs.slice(-1);
      if (forces) forces = forces.slice(-1);
      if (tilts) tilts = tilts.slice(-1);
    } else {
      // context.lineCap = 'butt';
      context.lineCap = 'round';
      if (xs.length == 1) {

        let halfWidth = this._getWidth(forces ? forces[0] : DEFAULT_FORCE, renderRatio) / 4;
        x = xs[0] - halfWidth, xs = [xs[0] + halfWidth];
        y = ys[0] - halfWidth, ys = [ys[0] + halfWidth];
        if (configs) config = configs[0], configs = configs.slice(-1);
        if (forces) force = forces[0], forces = forces.slice(-1);
        if (tilts) tilt = tilts[0], tilts = tilts.slice(-1);
      }
    }

    for (let i = xs.length - 1; i >= 0; i--) {
      // reconfig the pen, in case the config changes.
      if (configs) this.config = configs[i];
      if (forces) force -= forces[i];
      if (tilts) tilt -= tilts[i];

      //todo: **not trivial** use more sophisticated drawing algorithm
      context.lineWidth = this._getWidth(force, renderRatio);
      context.strokeStyle = this._getColor(force);

      context.beginPath();
      context.moveTo(x, y);
      // now finish the stroke
      x -= xs[i];
      y -= ys[i];
      context.lineTo(x, y);
      //resolved: this is needed for the stroke to have variable width.
      context.stroke();
      context.closePath();
    }
    context.globalCompositionOperation = oldComposition;
  }
}
