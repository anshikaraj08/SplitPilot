import { describe, expect, it } from "vitest";
import { analyzeCsv } from "./importer.js";

const sample = `date,description,paid_by,amount,currency,split_type,split_with,split_details,notes
08-02-2026,Dinner at Marina Bites,Dev,3200,INR,equal,Aisha;Rohan;Priya;Dev,,
08-02-2026,dinner - marina bites,Dev,3200,INR,equal,Aisha;Rohan;Priya;Dev,,
12-03-2026,Parasailing refund,Dev,-30,USD,equal,Aisha;Rohan;Priya;Dev,,one slot got cancelled
Mar-14,Airport cab,rohan ,1100,INR,equal,Aisha;Rohan;Priya;Dev,,
25-02-2026,Rohan paid Aisha back,Rohan,5000,INR,,Aisha,,this is a settlement not an expense??`;

describe("analyzeCsv", () => {
  it("detects assignment anomalies without crashing", () => {
    const rows = analyzeCsv(sample);
    const codes = rows.flatMap((row) => row.anomalies.map((issue) => issue.code));
    expect(codes).toContain("EXACT_DUPLICATE");
    expect(codes).toContain("NEGATIVE_AMOUNT");
    expect(codes).toContain("USD_CONVERSION");
    expect(codes).toContain("AMBIGUOUS_DATE_FORMAT");
    expect(codes).toContain("NAME_NORMALIZED");
    expect(codes).toContain("SETTLEMENT_IN_EXPENSE_EXPORT");
  });
});
