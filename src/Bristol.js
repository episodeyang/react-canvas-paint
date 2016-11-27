import React, {Component, PropTypes} from 'react';
import autobind from 'autobind-decorator';
import Canvas from './Canvas';
// import DotTest from './extensions/dotTest';
// const pen = DotTest({color: '#003bff'});
import SimplePen from './extensions/simplePen';
const pen = SimplePen({color: '#003BFF', strokeWidth: 2});
// import CalligraphyPen from './extensions/calligraphyPen';
// const pen = CalligraphyPen({color: 'blue', strokeWidth: 10, angle: -45, epsilon: 0.1, blur: 1});


var {number, func, bool, string, oneOf} = PropTypes;
/**
 * description of the component
 */
export default class HappySandwichMaker extends Component {

  static propTypes = {
    width: number,
    height: number,
    renderRatio: number,
    onImageUpdate: func,
    interpolation: bool
  };

  static defaultProps = {
    renderRatio: 3,
    interpolation: true
  };

  componentWillMount() {
    this._activePaths = {};
    this._paintStack = [];
  }

  componentDidMount() {
    this.active = this.refs['active'];
    this.inactive = this.refs['inactive'];
    this.updatePaintStack()
  }

  @autobind
  genericHandler(event) {
    event.preventDefault();
    const {type, changedTouches} = event;
    // strokeChange
    if (changedTouches && changedTouches.length >= 1 && typeof changedTouches[0].force !== 'undefined') {
      Array.from(changedTouches)
        .forEach(
          ({identifier, pageX, pageY, force, tilt}) =>
            this.recordTouch({eventType: type, id: identifier, pageX, pageY, force, tilt})
        );
    } else if (type.match(/^mouse/)) {
      let {pageX, pageY} = event;
      this.recordTouch({eventType: type, id: 'mouse', pageX, pageY});
    }
  }


  recordTouch({eventType, id, pageX, pageY, force, tilt}) {
    let x, y;
    switch (eventType) {
      case 'mousedown':
      case 'touchstart':
        ({x, y} = this.getDressedCursorPosition(pageX, pageY, true));
        this.startPath({id, x, y, force, tilt});
        this.drawActivePaths();
        break;
      case 'mousemove':
      case 'touchmove':
        if (!this.getActivePath(id)) return;
        ({x, y} = this.getDressedCursorPosition(pageX, pageY));
        this.appendPathPoint({id, x, y, force, tilt});
        this.drawActivePaths();
        break;
      case 'mouseup':
      case 'touchend':
        ({x, y} = this.getDressedCursorPosition(pageX, pageY));
        const path = this.completePath({id});
        setTimeout(() => {
          this.drawActivePaths(true);
          this.patchPaintStack(path);
        }, 16);
        break;
    }
  }

  getDressedCursorPosition(pageX, pageY, refreshOffset = false) {
    if (refreshOffset) this.active.clearPageOffset();
    const {renderRatio} =  this.props;
    const pos = {
      x: (pageX - this.active.pageOffset.left
        - (this.active.pageOffset.width - this.props.width) / 2
      ) * renderRatio,
      y: (pageY - this.active.pageOffset.top
        - (this.active.pageOffset.height - this.props.height) / 2
      ) * renderRatio
    };
    return pos;
  }

  startPath({id, x, y, force, tilt}) {
    this._activePaths[id] = {
      pressureSensitive: !!force, // 0 => false, undefined => false, 0.20 => true
      data: []
    };
    this.appendPathPoint({id, x, y, force, tilt});
  }

  getActivePath(id) {
    return this._activePaths[id];
  }

  appendPathPoint({id, x, y, force, tilt}) {
    const path = this.getActivePath(id);
    if (!path) return;
    if (!path.pressureSensitive) force = 1;
    path.data.push({x, y, force, tilt});
  }

  completePath({id}) {
    let path = this._activePaths[id];
    this._paintStack.push(path);
    delete this._activePaths[id];
    return path;
  }

  patchPaintStack(newPath, save = true) {
    pen(this.inactive.context, newPath.data);
    if (save) this.inactive.saveImage();
    const {onImageUpdate} = this.props;
    if (onImageUpdate) onImageUpdate(this.inactive.image);
  }

  updatePaintStack() {
    // this.putImage();
    this.inactive.clear();
    this._paintStack.forEach(
      ({data}) => {
        // todo: get pen info from path meta data next time.
        pen(this.inactive.context, data);
      });
    this.inactive.saveImage();
  }

  drawActivePaths(clearFirst = false) {
    if (clearFirst) this.active.clear();
    for (let key in this._activePaths) {
      const pathData = this._activePaths[key].data;
      pen(this.active.context, pathData, {active: true})
    }
  }

  render() {
    const {width, height, renderRatio, onImageUpdate, interpolation, scale, offset, style, ..._props} = this.props;
    const canvasStyle = {
      position: 'absolute',
      top: 0, left: 0,
      transform: `scale(${1 / renderRatio}, ${1 / renderRatio})` +
      `translate(${-width * (renderRatio - 1) * renderRatio / 2}px, ${-height * (renderRatio - 1) * renderRatio / 2}px)`
    };
    console.log(-width, renderRatio, -width * renderRatio);
    return (
      <div style={{width, height, position: 'relative', ...style}}>
        <Canvas ref="active"
                style={canvasStyle}
                width={width * renderRatio}
          // always interpolate for otherwise won't show on mobile safari.
                height={height * renderRatio}
                onMouseDown={this.genericHandler}
                onMouseMove={this.genericHandler}
                onMouseUp={this.genericHandler}
                onTouchStart={this.genericHandler}
                onTouchMove={this.genericHandler}
                onTouchEnd={this.genericHandler}
                onTouchCancel={this.genericHandler}
                {..._props}/>
        <Canvas ref="inactive"
                style={{...canvasStyle, zIndex: -1}}
                width={width * renderRatio}
                height={height * renderRatio}
                interpolation={interpolation}
                {..._props}/>
      </div>
    );
  }
}