import { EventEmitter } from "events";
import * as Hammer from "hammerjs";

import { GameControllerMode, GameInput, InputEventType, InputManager } from "../../types";

export class SwipeManager extends EventEmitter implements InputManager {
  public mode?: GameControllerMode;
  private mc: HammerManager;
  private downInputs: Set<GameInput>;

  constructor() {
    super();
    this.mc = new Hammer.Manager(document.body);
    this.registerControls();
    this.downInputs = new Set();
  }


  registerControls() {
    this.mc.add([
      // new Hammer.Swipe({direction: Hammer.DIRECTION_ALL}),
      new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 35 }),
      new Hammer.Tap({ event: "singletap" })
    ]);

    // this.mc.on('swipeup', this.triggerKeyInputs.bind(this, INPUTS.UP));
    // this.mc.on('swipeleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    // this.mc.on('swiperight', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    // this.mc.on('swipedown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));

    // this.mc.on('panup', () => console.log('panup'));
    // this.mc.on('panleft', () => console.log('panleft'));
    // this.mc.on('panright', () => console.log('panright'));
    // this.mc.on('pandown', () => console.log('pandown'));
    // this.mc.on('panleft', this.triggerKeyInputs.bind(this, INPUTS.LEFT));
    // this.mc.on('panright', this.triggerKeyInputs.bind(this, INPUTS.RIGHT));
    // this.mc.on('pandown', this.triggerKeyInputs.bind(this, INPUTS.DOWN));

    // this.mc.on('panstart', (a, b, c) => console.log('panstart', [a, b, c]));

    this.downInputs = new Set();

    this.mc.on("panstart", (e: HammerInput) => {
      console.log("panstart", e.type);
      this.endPanInputs();
      switch (e.type) {
        case "panup":
          this.handleInput(GameInput.Up, InputEventType.KeyDown);
          this.downInputs.add(GameInput.Up);
          break;
        case "pandown":
          this.handleInput(GameInput.Down, InputEventType.KeyDown);
          this.downInputs.add(GameInput.Down);
          break;
        case "panleft":
          this.handleInput(GameInput.Left, InputEventType.KeyDown);
          this.downInputs.add(GameInput.Left);
          break;
        case "panright":
          this.handleInput(GameInput.Right, InputEventType.KeyDown);
          this.downInputs.add(GameInput.Right);
          break;
      }
    });

    this.mc.on("panend", this.endPanInputs);

    this.mc.on("singletap", this.triggerKeyInputs.bind(this, GameInput.RotateCW));
  }
  endPanInputs = () => {
    for (const inputType of this.downInputs) {
      this.handleInput(inputType, InputEventType.KeyUp);
      this.downInputs.delete(inputType);
    }
  };

  triggerKeyInputs(inputType: GameInput) {
    this.handleInput(inputType, InputEventType.KeyDown);
    setTimeout(() => {
      this.handleInput(inputType, InputEventType.KeyUp);
    }, 10);
  }
  handleInput(input: GameInput, eventType: InputEventType) {
    super.emit(input, eventType);
  }

  setMode(mode: GameControllerMode) {
    // todo implement setMode correctly
    this.mode = mode;
  }
}