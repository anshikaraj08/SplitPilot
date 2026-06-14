import { describe, expect, it } from "vitest";
import { calculateBalances } from "./balances.js";

describe("calculateBalances", () => {
  it("produces net balances and simplified settlements", () => {
    const result = calculateBalances([
      {
        id: 1,
        description: "Dinner",
        paidBy: "Aisha",
        amountInrPaise: 40000,
        splits: [
          { person: "Aisha", sharePaise: 10000 },
          { person: "Rohan", sharePaise: 10000 },
          { person: "Priya", sharePaise: 10000 },
          { person: "Meera", sharePaise: 10000 }
        ]
      }
    ]);

    expect(result.people.find((person) => person.person === "Aisha").netPaise).toBe(30000);
    expect(result.settlements).toEqual([
      { from: "Rohan", to: "Aisha", amountPaise: 10000, amount: 100 },
      { from: "Priya", to: "Aisha", amountPaise: 10000, amount: 100 },
      { from: "Meera", to: "Aisha", amountPaise: 10000, amount: 100 }
    ]);
  });
});
