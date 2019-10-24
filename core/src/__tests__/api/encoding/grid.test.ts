import { flatten, sample, times } from "lodash";

import { decodeGrid, encodeGrid, getGridEncodingDictionary, tGridObjectCodec } from "../../../api/encoding";
import { GameColor, GameGrid, GridObject, GridObjectType } from "../../../game/types";

describe("Grid Encoding", () => {
  test("encode and decode grid", () => {
    const grid: GameGrid = [
      [
        { type: GridObjectType.Empty },
        { type: GridObjectType.Virus, color: GameColor.Color2 },
        { type: GridObjectType.PillTop, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.Virus, color: GameColor.Color1 },
        { type: GridObjectType.Destroyed },
        { type: GridObjectType.PillBottom, color: GameColor.Color3 }
      ],
      [
        { type: GridObjectType.PillSegment, color: GameColor.Color2 },
        { type: GridObjectType.Empty },
        { type: GridObjectType.PillSegment, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.PillLeft, color: GameColor.Color3 },
        { type: GridObjectType.PillRight, color: GameColor.Color2 },
        { type: GridObjectType.Destroyed }
      ]
    ];
    // check that decode(encode(obj)) deep equals original obj
    flatten(grid).forEach((gridObj: GridObject) => {
      const encoded = tGridObjectCodec.encode(gridObj);
      expect(typeof encoded).toEqual("string");
      const decoded = tGridObjectCodec.decode(encoded);
      expect(decoded.isRight()).toBeTruthy();
      expect(decoded.value).toEqual(gridObj);
    });
    const encoded = encodeGrid(grid);
    expect(typeof encoded).toBe("string");
    expect(decodeGrid(encoded)).toEqual(grid);
  });

  test("encode and decode long grid", () => {
    const grid: GameGrid = times(40, () => {
      return times(80, () => {
        return {
          type: sample([GridObjectType.Virus, GridObjectType.PillSegment]),
          color: sample([GameColor.Color1, GameColor.Color2, GameColor.Color3])
        };
      });
    }) as GameGrid;
    expect(decodeGrid(encodeGrid(grid))).toEqual(grid);
  });

  test("allows linebreaks + spaces in grid", () => {
    const gridStr = `g4,3:
      XVO
      NYE
      SXK
      DRY`;

    getGridEncodingDictionary();

    expect(decodeGrid(gridStr)).toEqual([
      [
        { type: GridObjectType.Empty },
        { type: GridObjectType.Virus, color: GameColor.Color2 },
        { type: GridObjectType.PillTop, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.Virus, color: GameColor.Color1 },
        { type: GridObjectType.Destroyed },
        { type: GridObjectType.PillBottom, color: GameColor.Color3 }
      ],
      [
        { type: GridObjectType.PillSegment, color: GameColor.Color2 },
        { type: GridObjectType.Empty },
        { type: GridObjectType.PillSegment, color: GameColor.Color1 }
      ],
      [
        { type: GridObjectType.PillLeft, color: GameColor.Color3 },
        { type: GridObjectType.PillRight, color: GameColor.Color2 },
        { type: GridObjectType.Destroyed }
      ]
    ]);
  });
});