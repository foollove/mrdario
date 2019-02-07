import { flatten, range } from "lodash";

import {
  GameColor,
  GameGrid,
  GameGridRow,
  GridCellLocation,
  GridCellLocationDelta,
  GridCellNeighbors,
  GridDirection,
  GridObject,
  MaybeGridObject
} from "../types";

import {
  hasColor,
  isEmpty,
  isPillBottom,
  isPillHalf,
  isPillLeft,
  isPillRight,
  isPillTop,
  isVirus
} from "./guards";

// these are pure stateless functions which contain the majority of the game logic
// they use Immutable objects to represent the grid and return new objects on 'mutation'

export function getInRow(row: GameGridRow, colIndex: number): MaybeGridObject {
  if (colIndex >= row.length || colIndex < 0) {
    return null;
  }
  return row[colIndex];
}

export function getInGrid(grid: GameGrid, location: GridCellLocation): MaybeGridObject {
  const [rowIndex, colIndex] = location;
  if (rowIndex >= grid.length || rowIndex < 0) {
    return null;
  }
  return getInRow(grid[rowIndex], colIndex);
}

export function hasViruses(grid: GameGrid): boolean {
  return !grid.every(row => row.every(cell => !isVirus(cell)));
}

export function isPillVertical(grid: GameGrid, pillCells: GridCellLocation[]) {
  return isPillTop(getInGrid(grid, pillCells[0]));
}

export function getCellNeighbors(
  grid: GameGrid,
  location: GridCellLocation,
  distance = 1
): GridCellNeighbors {
  const [rowIndex, colIndex] = location;
  // returns the neighbors of the grid cell at [rowIndex, colIndex]
  // some may be undefined if out of bounds
  return {
    [GridDirection.Up]: getInGrid(grid, [rowIndex - distance, colIndex]),
    [GridDirection.Down]: getInGrid(grid, [rowIndex + distance, colIndex]),
    [GridDirection.Left]: getInGrid(grid, [rowIndex, colIndex - distance]),
    [GridDirection.Right]: getInGrid(grid, [rowIndex, colIndex + distance])
  };
}

export function canMoveCell(grid: GameGrid, location: GridCellLocation, direction: GridDirection) {
  return isEmpty(getCellNeighbors(grid, location)[direction]);
}

export function deltaRowCol(direction: GridDirection, distance: number = 1): GridCellLocationDelta {
  // create the [dRow, dCol] needed for a move in given direction and distance eg. up 1 is [-1, 0]
  const dRow = direction === GridDirection.Down ? distance : direction === GridDirection.Up ? -distance : 0;
  const dCol =
    direction === GridDirection.Right ? distance : direction === GridDirection.Left ? -distance : 0;
  if (Math.abs(dRow) + Math.abs(dCol) === 0) {
    throw new Error("invalid direction " + direction);
  }
  return [dRow, dCol];
}

// find same-color lines within a single row or column
export function findLinesIn(row: GameGridRow, lineLength = 4): number[][] {
  let lastColor: GameColor | undefined;
  let curLine: number[] = [];

  return row.reduce((result: number[][], obj: GridObject, colIndex: number) => {
    let color: GameColor | undefined;
    if (hasColor(obj)) {
      color = obj.color;
    }

    if (colIndex > 0 && color !== lastColor) {
      // different color, end the current line and add to result if long enough
      if (curLine.length >= lineLength) {
        result.push(curLine);
      }
      curLine = [];
    }
    // add cell to current line if non-empty
    if (color !== undefined) {
      curLine.push(colIndex);
    }
    // end of row, add last line to result if long enough
    if (colIndex === row.length - 1 && curLine.length >= lineLength) {
      result.push(curLine);
    }

    lastColor = color;
    return result;
  }, []);
}

// the main reconcile function, looks for lines of 4 or more of the same color in the grid
export function findLines(grid: GameGrid, lineLength: number = 4): GridCellLocation[][] {
  const horizontalLines: GridCellLocation[][] = flatten(
    grid.map((row: GameGridRow, rowIndex: number) => {
      const rowLines: number[][] = findLinesIn(row, lineLength);
      return rowLines.map(
        (line: number[]): GridCellLocation[] => {
          return line.map((colIndex: number): GridCellLocation => [rowIndex, colIndex]);
        }
      );
    })
  );

  // reslice grid into [col][row] instead of [row][col] format to check columns
  const gridCols: GameGrid = range(grid[0].length).map(
    (colIndex: number): GameGridRow => {
      return grid.map(row => row[colIndex]);
    }
  );
  const verticalLines: GridCellLocation[][] = flatten(
    gridCols.map((col: GameGridRow, colIndex: number) => {
      const colLines: number[][] = findLinesIn(col, lineLength);
      return colLines.map(
        (line: number[]): GridCellLocation[] =>
          line.map((rowIndex: number): GridCellLocation => [rowIndex, colIndex])
      );
    })
  );

  // console.log('lines:', horizontalLines, verticalLines);
  return horizontalLines.concat(verticalLines);
}

// find "widows", half-pill pieces whose other halves have been destroyed
export function findWidows(grid: GameGrid): GridCellLocation[] {
  return flatten(
    grid.reduce((widows: GridCellLocation[][], row: GameGridRow, rowIndex: number) => {
      widows.push(
        row.reduce((rowWidows: GridCellLocation[], obj: GridObject, colIndex: number) => {
          if (!isPillHalf(obj)) {
            return rowWidows;
          }

          const cell: GridCellLocation = [rowIndex, colIndex];
          const neighbors: GridCellNeighbors = getCellNeighbors(grid, cell);
          const isWidow: boolean =
            (isPillLeft(obj) && !isPillRight(neighbors[GridDirection.Right])) ||
            (isPillRight(obj) && !isPillLeft(neighbors[GridDirection.Left])) ||
            (isPillTop(obj) && !isPillBottom(neighbors[GridDirection.Down])) ||
            (isPillBottom(obj) && !isPillTop(neighbors[GridDirection.Up]));

          if (isWidow) {
            rowWidows.push(cell);
          }
          return rowWidows;
        }, [])
      );
      return widows;
    }, [])
  );
}
