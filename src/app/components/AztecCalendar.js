import _ from 'lodash';
import React from 'react';

import aztecCalendar from 'app/img/aztec_small.svg';

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD",  "#744B9D", "#7A6ED4"];
const colorGroups = [null, oranges, greens, purples];

const AztecCalendar = React.createClass({
  getDefaultProps() {
    return {
      width: 600,
      height: 600,
      shouldAnimate: true,
      cycleTime: 2000
    }
  },
  componentDidMount() {
    let svgEl = this.refs.svg;
    svgEl.addEventListener('load', () => {
      let svg = svgEl.contentDocument;
      let paths = svg ? svg.getElementsByTagName('path') : [];
      if(paths.length) {
        let circles = svg.getElementsByTagName('circle') || [];
        paths = Array.prototype.slice.call(paths);
        circles = Array.prototype.slice.call(circles);
        this.onLoadedSvg(paths.concat(circles));
      }
    });
  },
  componentWillReceiveProps(newProps) {
    if(newProps.shouldAnimate === false && this.changeTimer) {
      clearTimeout(this.changeTimer);
      delete this.changeTimer;
    } else if(newProps.shouldAnimate === true && !this.animation && !this.changeTimer)
      this.changeTimer = setTimeout(this.changeAnimation, this.props.cycleTime);
  },
  componentWillUnmount() {
    if(this.changeTimer) clearTimeout(this.changeTimer);
    if(this.animation) clearInterval(this.animation);
  },

  onLoadedSvg(paths) {
    this.paths = paths;

    let bgPaths = [];
    let bgColors = [];
    let borderPaths = [];
    _.each(paths, path => {
      let fill = path.getAttribute('fill');
      if(!fill || !fill.length) borderPaths.push(path); // return;
      else {
        bgPaths.push(path);
        bgColors.push(fill);
      }
    });
    //console.log(_.uniq(bgColors));
    //console.log(bgPaths.length, 'paths');
    //borderPaths.forEach(path => path.setAttribute('fill', 'transparent'));

    _.assign(this, {bgPaths, bgColors, borderPaths});

    this.colorGroupIndex = 0;
    if(this.props.shouldAnimate) this.changeTimer = setTimeout(this.changeAnimation, this.props.cycleTime / 2);
  },

  changeAnimation() {
    this.animIndex = 0;
    this.colorGroupIndex = (this.colorGroupIndex + 1) % colorGroups.length;
    this.colorGroup = colorGroups[this.colorGroupIndex];

    let {bgPaths, bgColors, colorGroup} = this;
    let pathIndexChunks = _.chunk(_.shuffle(_.range(bgPaths.length)), 3);

    this.animation = setInterval(() => {
      let {animIndex} = this;
      if(animIndex >= pathIndexChunks.length) {
        clearInterval(this.animation);
        delete this.animation;
        if(this.props.shouldAnimate) this.changeTimer = setTimeout(this.changeAnimation, this.props.cycleTime);
      } else {
        if(!colorGroup) {
          // animate to original colors
          const pathIndices = pathIndexChunks[animIndex];
          pathIndices.forEach(i => bgPaths[i].setAttribute('fill', bgColors[i]));
        } else {
          const pathIndices = pathIndexChunks[animIndex];
          pathIndices.forEach(i => {
            const trueColor = bgColors[i];
            const useTrueColor = _.includes(colorGroup.concat(['#FFF', '#FFFFFF']), trueColor);
            const newColor = useTrueColor ? trueColor : _.sample(colorGroup);
            bgPaths[i].setAttribute('fill', newColor);
          });
        }
      }
      this.animIndex += 1;
    }, 1);
  },


  render() {
    return <div className="aztec-calendar">
      <object type="image/svg+xml"
              ref="svg"
              width={this.props.width}
              height={this.props.height}
              data={aztecCalendar}>
      </object>
    </div>;
  }
});

export default AztecCalendar;
