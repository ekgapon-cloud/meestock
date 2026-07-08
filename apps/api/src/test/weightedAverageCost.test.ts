import { describe, expect, it } from "vitest";
import { replayWeightedAverageCost } from "../services/reportingService.js";

describe("replayWeightedAverageCost", () => {
  it("takes the unit cost of a single receive", () => {
    const result = replayWeightedAverageCost([{ quantityChange: 100, unitCost: 10 }]);
    expect(result).toEqual({ balance: 100, avgCost: 10 });
  });

  it("does not change avgCost on issue, only balance", () => {
    const result = replayWeightedAverageCost([
      { quantityChange: 100, unitCost: 10 },
      { quantityChange: -50, unitCost: 10 },
    ]);
    expect(result).toEqual({ balance: 50, avgCost: 10 });
  });

  it("recomputes avgCost as a weighted average on a second receive at a different cost", () => {
    const result = replayWeightedAverageCost([
      { quantityChange: 100, unitCost: 10 },
      { quantityChange: -50, unitCost: 10 },
      { quantityChange: 100, unitCost: 20 },
    ]);
    // (50 * 10 + 100 * 20) / 150 = 16.666...
    expect(result.balance).toBe(150);
    expect(result.avgCost).toBeCloseTo(16.6667, 4);
  });

  it("is not the same as naively averaging all inbound costs when an issue happens in between", () => {
    const replayed = replayWeightedAverageCost([
      { quantityChange: 100, unitCost: 10 },
      { quantityChange: -50, unitCost: 10 },
      { quantityChange: 100, unitCost: 20 },
    ]);
    const naiveAverage = (100 * 10 + 100 * 20) / (100 + 100); // = 15
    expect(replayed.avgCost).not.toBeCloseTo(naiveAverage, 2);
  });

  it("returns zero balance and avgCost for no transactions", () => {
    expect(replayWeightedAverageCost([])).toEqual({ balance: 0, avgCost: 0 });
  });
});
