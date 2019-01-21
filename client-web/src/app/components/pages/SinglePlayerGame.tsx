import * as React from 'react';
import * as _ from 'lodash';
import { withRouter, Redirect, RouteComponentProps } from "react-router-dom";
// import * as DeepDiff from 'deep-diff';
// const deepDiff = DeepDiff.diff;
import shallowEqual from '@/app/utils/shallowEqual';

import {DEFAULT_KEYS} from "mrdario-core/lib/constants";
import { GameControllerMode, GameControllerState, PillColors } from "mrdario-core/src/types";

import KeyManager from 'mrdario-core/src/inputs/KeyManager';
// import SwipeManager from 'mrdario-core/src/inputs/SwipeManager';
// import GamepadManager from 'mrdario-core/src/inputs/GamepadManager';
import SingleGameController from 'mrdario-core/src/SingleGameController';
//import SinglePlayerGameController from 'game/SinglePlayerNetworkGameController';

import Playfield from '@/app/components/game/Playfield';
import PillPreviewPanel from '@/app/components/game/PillPreviewPanel';
import WonOverlay from '@/app/components/overlays/WonOverlay';
import LostOverlay from '@/app/components/overlays/LostOverlay';
import responsiveGame from '@/app/components/responsiveGame';
import { SCClientSocket } from "socketcluster-client";
import { GameRouteParams, GameScoreResponse } from "@/app/types";

function getName() {
  return window.localStorage ?
    (window.localStorage.getItem('mrdario-name') || 'Anonymous') : 'Anonymous';
}


export interface SinglePlayerGameProps extends RouteComponentProps<GameRouteParams> {
  cellSize: number;
  heightPercent: number;
  padding: number;
  socket?: SCClientSocket;
  onChangeMode?: (mode: GameControllerMode) => any;
}

export interface SinglePlayerGameState {
  gameState?: GameControllerState;
  highScores?: [string, number][];
  rank?: number;
  pendingMode?: GameControllerMode;
}

class SinglePlayerGame extends React.Component<SinglePlayerGameProps, SinglePlayerGameState> {
  static defaultProps = {
    cellSize: 32,
    heightPercent: .85,
    padding: 15
  };

  state: SinglePlayerGameState = {};

  game?: any;
  keyManager?: KeyManager;

  componentDidMount() {
    // mode means won or lost, no mode = playing
    if(!this.props.match.params.mode) this._initGame(this.props);
  }
  componentWillUnmount() {
    // this.props.socket.off('singleHighScores', this._highScoreHandler);
    if(this.game && this.game.cleanup) this.game.cleanup();
  }

  componentWillReceiveProps(newProps: SinglePlayerGameProps) {
    const params: GameRouteParams = this.props.match.params;
    const nextParams: GameRouteParams = newProps.match.params;

    const shouldInitGame =
      params.level !== nextParams.level || params.speed !== nextParams.speed ||
      (params.mode !== nextParams.mode && !nextParams.mode);

    if(shouldInitGame) this._initGame(newProps);

    if(!params.mode && this.state.pendingMode) {
      this.setState({pendingMode: undefined});
    }
  }

  shouldComponentUpdate(newProps: SinglePlayerGameProps, newState: SinglePlayerGameState) {
    const hasChanged =
      !_.every(newState, (value, key) => shallowEqual(value, this.state[key])) ||
      !shallowEqual(newProps, this.props);

    return hasChanged;
  }

  _initGame(props: SinglePlayerGameProps) {
    if(this.game && this.game.cleanup) this.game.cleanup();

    const {socket} = props;
    const {params} = props.match;
    const level = parseInt(params.level) || 0;
    const speed = parseInt(params.speed) || 15;

    if(socket) {
      socket.emit('infoStartGame', [getName(), level, speed], _.noop);
    }

    // input managers controlling keyboard and touch events
    this.keyManager = new KeyManager(DEFAULT_KEYS);
    // this.touchManager = new SwipeManager();
    // this.gamepadManager = new GamepadManager();

    // create new game controller that will run the game
    // and update component state whenever game state changes to re-render
    this.game = new SingleGameController({
      level, speed,
      // inputManagers: [this.keyManager, this.touchManager, this.gamepadManager],
      inputManagers: [this.keyManager],
      render: (gameState: GameControllerState) => this.setState({gameState}),
      onChangeMode: (transition, lastMode: GameControllerMode, nextMode: GameControllerMode) => {
        console.log('onchangemode', transition, lastMode, nextMode);
        if(_.includes([GameControllerMode.Lost, GameControllerMode.Won], nextMode)) {
          this.setState({pendingMode: nextMode});
          if(nextMode === GameControllerMode.Won) this._handleWin();
          if(nextMode === GameControllerMode.Lost) this._handleLose();
        }
        if(this.props.onChangeMode) this.props.onChangeMode(nextMode);
      }
    });
    this.game.play();
  }

  _handleWin = () => {
    if(this.state.gameState && this.props.socket) {
      const score = this.state.gameState.score;
      const level = parseInt(this.props.match.params.level);
      const name = getName();

      if(_.isFinite(level) && _.isFinite(score) && this.props.socket.state) {
        console.log('socket is open, sending score');
        this.props.socket.emit('singleGameScore', [level, name, score], (err, data) => {
          if(err) throw err;
          const scoreResponse = data as GameScoreResponse;
          const {scores, rank} = scoreResponse;
          console.log('high scores received!', scores, rank);
          this.setState({highScores: scores, rank: rank});
        });
      }
    }
  }

  _handleLose() {
    if(this.state.gameState && this.props.socket) {
      const level = parseInt(this.props.match.params.level);
      const speed = parseInt(this.props.match.params.speed);
      const score = this.state.gameState.score;

      this.props.socket.emit('infoLostGame', [getName(), level, speed, score], _.noop);
    }
  }

  render() {
    const {gameState, highScores, rank, pendingMode} = this.state;

    // if(!hasGrid) return <div>loading</div>;

    const {cellSize, padding: paddingProp} = this.props;
    const {params} = this.props.match;

    // pass fractional padding to set padding to a fraction of cell size
    const padding: number = (paddingProp > 0 && paddingProp < 1) ? paddingProp * cellSize : paddingProp;
    const numRows: number = gameState ? gameState.grid.length : 17;
    const numCols: number = gameState ? gameState.grid[0].length : 8;
    const width: number = (numCols * cellSize) + (padding * 2);
    // make shorter by one row to account for special unplayable top row
    const height: number = ((numRows - 1) * cellSize) + (padding * 2);
    const style = {position: 'relative' as 'relative', width, height, padding};
    const overlayStyle = {position: 'absolute' as 'absolute', width, height, padding, left: 0};
    const lostOverlayStyle = {...overlayStyle, top: (params.mode === "lost") ? 0 : height};
    const wonOverlayStyle = {...overlayStyle, top: (params.mode === "won") ? 0 : height};
    
    let nextPill: PillColors | undefined;
    if(gameState && gameState.pillSequence && _.isFinite(gameState.pillCount)) {
      const pillIndex = gameState.pillCount % gameState.pillSequence.length;
      nextPill = gameState.pillSequence[pillIndex];
    }

    return <div className="game-playfield-container">
      {(pendingMode && pendingMode !== params.mode) ?
        // if game has been won or lost, redirect to the proper URL
        <Redirect push to={`/game/level/${params.level}/speed/${params.speed}/${pendingMode}`}/> :
        null
      }
      <div style={style} {...{className: 'game-playfield'}}>
        <WonOverlay
          gameState={gameState}
          highScores={highScores}
          rank={rank}
          params={params}
          style={wonOverlayStyle}
        />
        <LostOverlay
          params={params}
          style={lostOverlayStyle}
        />
        {gameState ?
          <Playfield grid={gameState.grid} cellSize={cellSize} />
          : ''}
      </div>
      
      {gameState ?
        <div className="score-panel">
          <h5>SCORE</h5>
          {gameState.score}
        </div>
        : null
      }
      
      {nextPill ?
        <PillPreviewPanel {...{cellSize, pill: nextPill}} />
        : null
      }
    </div>;
  }
}

export default withRouter(responsiveGame(SinglePlayerGame));