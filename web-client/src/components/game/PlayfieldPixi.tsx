// import * as _ from "lodash";
import * as React from "react";
import { GameGrid } from "mrdario-core/src/game/types";
import * as Pixi from "pixi.js";
import * as particles from "pixi-particles";
// import * as filters from "pixi-filters";

import * as virusOrange from "@/svg2/virus_orange.svg";
import * as virusPurple from "@/svg2/virus_purple.svg";
import * as virusGreen from "@/svg2/virus_green.svg";
import * as pillHalfOrange from "@/svg2/pill_half_orange.svg";
import * as pillHalfPurple from "@/svg2/pill_half_purple.svg";
import * as pillHalfGreen from "@/svg2/pill_half_green.svg";
import * as pillSegmentOrange from "@/svg2/pill_segment_orange.svg";
import * as pillSegmentPurple from "@/svg2/pill_segment_purple.svg";
import * as pillSegmentGreen from "@/svg2/pill_segment_green.svg";
import * as destroyed from "@/svg2/destroyed.svg";
import * as particle from "@/img/Pixel25px.png";

import { GameGridRow, GridObjectPillHalfType, GridObjectType, MaybeGridObject } from "mrdario-core";
import { hasColor, isDestroyed, isPillHalf } from "mrdario-core/lib/game/utils";
// import makeReactSvg from "@/utils/makeReactSvg";

// import PillPart from "./PillPart";
// import * as destroyed from "!raw-loader!@/svg2/destroyed.svg";

type SpriteGrid = (Pixi.Sprite | null)[][];

const pillHalves = [pillHalfOrange, pillHalfPurple, pillHalfGreen];
const pillSegments = [pillSegmentOrange, pillSegmentPurple, pillSegmentGreen];
const viruses = [virusOrange, virusPurple, virusGreen];

const oranges = ["#BE1E2D", "#F05A28", "#F6921E"];
const greens = ["#009345", "#006838", "#8BC53F", "#37B34A"];
const purples = ["#5251A1", "#A376CD", "#744B9D", "#7A6ED4"];
const colorGroups = [oranges, purples, greens];

const pillHalfRotations: { [P in GridObjectPillHalfType]: number } = {
  [GridObjectType.PillTop]: 0,
  [GridObjectType.PillRight]: Math.PI / 2,
  [GridObjectType.PillBottom]: Math.PI,
  [GridObjectType.PillLeft]: (3 * Math.PI) / 2
};

const particlesConfig = {
  "alpha": {
    "start": 1,
    "end": 1
  },
  "scale": {
    "start": 1.3,
    "end": 0.001,
    "minimumScaleMultiplier": .3
  },
  "color": {
    "start": "#d44646",
    "end": "#d44646"
    // "end": "#ffffff"
  },
  "speed": {
    "start": 1800,
    "end": 1200,
    "minimumSpeedMultiplier": 0.25
  },
  "acceleration": {
    "x": 0,
    "y": 1000
  },
  "maxSpeed": 3000,
  "startRotation": {
    "min": 0,
    "max": 360
  },
  "noRotation": true,
  "rotationSpeed": {
    "min": 0,
    "max": 0
  },
  "lifetime": {
    "min": 1,
    "max": 1.5
  },
  "blendMode": "normal",
  "frequency": 0.001,
  "emitterLifetime": 0.1,
  "maxParticles": 40,
  "pos": {
    "x": 0,
    "y": 0
  },
  "addAtBack": true,
  "spawnType": "burst",
  "particlesPerWave": 5,
  "particleSpacing": 0,
  "angleStart": 0
};

export interface PlayfieldProps {
  cellSize: number;
  grid: GameGrid;
}
export default class Playfield extends React.Component<PlayfieldProps> {
  static defaultProps = {
    cellSize: 36
  };

  protected canvasRef: React.RefObject<HTMLCanvasElement>;
  protected virusTextures: Pixi.Texture[];
  protected pillHalfTextures: Pixi.Texture[];
  protected pillSegmentTextures: Pixi.Texture[];
  protected destroyedTexture: Pixi.Texture;
  protected pixiApp?: Pixi.Application;
  protected lastGrid?: GameGrid;
  protected spriteGrid?: SpriteGrid;

  constructor(props: PlayfieldProps) {
    super(props);
    this.canvasRef = React.createRef();
    this.virusTextures = viruses.map(v => Pixi.Texture.from(v));
    this.pillHalfTextures = pillHalves.map(v => Pixi.Texture.from(v));
    this.pillSegmentTextures = pillSegments.map(v => Pixi.Texture.from(v));
    this.destroyedTexture = Pixi.Texture.from(destroyed);
  }

  protected getSpriteForGridObject(obj: MaybeGridObject, rowIndex: number, colIndex: number): Pixi.Sprite | null {
    if (!obj || obj.type === GridObjectType.Empty) return null;
    const { cellSize } = this.props;
    let sprite = null;
    if (hasColor) {
      if (obj.type === GridObjectType.Virus) {
        sprite = new Pixi.Sprite(this.virusTextures[obj.color]);
      } else if (obj.type === GridObjectType.PillSegment) {
        sprite = new Pixi.Sprite(this.pillSegmentTextures[obj.color]);
      } else if (isPillHalf(obj)) {
        sprite = new Pixi.Sprite(this.pillHalfTextures[obj.color]);
      } else if(isDestroyed(obj)) {
        sprite = new Pixi.Sprite(this.destroyedTexture);
      }
    }
    if (sprite) {
      sprite.width = cellSize;
      sprite.height = cellSize;
      sprite.anchor.x = 0.5;
      sprite.anchor.y = 0.5;
      sprite.position.x = Math.floor(colIndex * this.props.cellSize + cellSize * 0.5);
      sprite.position.y = Math.floor(rowIndex * this.props.cellSize + cellSize * 0.5);

      if (isPillHalf(obj)) {
        sprite.rotation = pillHalfRotations[obj.type];
      }
    }
    return sprite;
  }

  componentWillReceiveProps(nextProps: PlayfieldProps) {
    const { pixiApp } = this;
    const { grid } = nextProps;
    // let spriteGrid: Pixi.Sprite[][];

    if (!pixiApp) return;

    if (!this.spriteGrid || !this.lastGrid) {
      pixiApp.stage.removeChildren();
      this.lastGrid = grid;
      this.spriteGrid = grid.map((row: GameGridRow, rowIndex: number) => {
        return row.map((obj: MaybeGridObject, colIndex) => {
          const sprite = this.getSpriteForGridObject(obj, rowIndex, colIndex);
          if (sprite) {
            pixiApp.stage.addChild(sprite);
          }
          return sprite;
        });
      });
      pixiApp.render();
    } else if (grid !== this.lastGrid) {
      let colorGroupIndex = 0;
      for (let rowIndex = 0, gridLen = grid.length; rowIndex < gridLen; rowIndex++) {
        const row = grid[rowIndex];
        const lastGridRow = this.lastGrid[rowIndex];
        if (row === lastGridRow) continue;
        for (let colIndex = 0, rowLen = row.length; colIndex < rowLen; colIndex++) {
          const gridObj = row[colIndex];
          const lastGridObj = lastGridRow[colIndex];
          if (gridObj === lastGridRow[colIndex]) continue;
          const lastSprite = this.spriteGrid[rowIndex][colIndex];
          if (lastSprite) lastSprite.destroy();
          const sprite = this.getSpriteForGridObject(gridObj, rowIndex, colIndex);
          if (sprite) {
            pixiApp.stage.addChild(sprite);
          }
          this.spriteGrid[rowIndex][colIndex] = sprite;


          if(isDestroyed(gridObj) && sprite) {
            const colorCode = hasColor(lastGridObj) ? lastGridObj.color : 0;
            const colorGroup = colorGroups[colorCode];
            const color = colorGroup[colorGroupIndex % colorGroup.length];

            colorGroupIndex += 1;

            var emitter = new particles.Emitter(
              pixiApp.stage,
              [
                PIXI.Texture.fromImage(particle)
              ],
              // Emitter configuration, edit this to change the look
              // of the emitter
              {
                ...particlesConfig,
                pos: {
                  x: sprite.position.x,
                  y: sprite.position.y
                },
                color: {
                  start: color,
                  end: color,
                }
              }
            );
            emitter.playOnceAndDestroy();
          }
        }
      }
      this.lastGrid = grid;
      pixiApp.render();
    }

    // if(!this.lastGrid || grid !== this.lastGrid) {
    //   for(var v of this.virusTextures) {
    //     const s = new Pixi.Sprite(v);
    //     s.position.x = Math.random() * 300;
    //     s.position.y = Math.random() * 300;
    //     if(this.pixiApp)
    //       this.pixiApp.stage.addChild(s);
    //   }
    // }
  }
  componentDidUpdate() {}

  shouldComponentUpdate() {
    return false;
  }
  // shouldComponentUpdate(newProps: PlayfieldProps) {
  //   return !shallowEqual(newProps, this.props);
  // }

  componentDidMount() {
    const canvas = this.canvasRef.current;
    if (canvas) {
      const { width, height } = this._getSize();

      const app = new Pixi.Application({
        view: canvas,
        width,
        height,
        // transparent: true,
        resolution: 2,
        backgroundColor: 0xD2CFCA
      });
      this.pixiApp = app;

      // app.stage.filters = [
      //   new filters.ShockwaveFilter()
      // ];
      app.render();

    }
  }
  updateEmitter = () => {
    requestAnimationFrame(this.updateEmitter);
  };

  _getSize = () => {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;
    return { width, height };
  };

  render() {
    const grid = this.props.grid;
    // first row of grid is "true" top row which is out of play and should be rendered above the playfield

    const numRows = grid.length;
    const numCols = grid[0].length;
    const cellSize = this.props.cellSize;
    const width = numCols * cellSize;
    const height = numRows * cellSize;

    // translate svg up by one row to account for out-of-sight true top row
    // const style = { width, height, transform: `translate(0, ${-cellSize}px)` };
    const style = {
      width,
      height
    } as React.CSSProperties;

    return <canvas className="playfield-pixi" width={width} height={height} style={style} ref={this.canvasRef} />;
  }
}
