import { parse } from "csv-parse/sync";
import { config } from "../config.js";
import { allocateRemainder, rupeesToPaise } from "./money.js";
import { normalizePersonName, splitPeople } from "./namePolicy.js";

const DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;
const MONTH_PATTERN = /^([A-Za-z]{3})-(\d{1,2})$/;
const VALID_SPLITS = new Set(["equal", "unequal", "percentage", "share"]);

const monthNumbers = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12"
};

const membership = {
  Aisha: ["2026-02-01", null],
  Rohan: ["2026-02-01", null],
  Priya: ["2026-02-01", null],
  Meera: ["2026-02-01", "2026-03-31"],
  Dev: ["2026-02-08", "2026-03-14"],
  Sam: ["2026-04-10", null],
  Kabir: ["2026-03-11", "2026-03-11"]
};

function anomaly(rowNumber, code, severity, message, policy, action) {
  return { rowNumber, code, severity, message, policy, action };
}

function parseDate(value, rowNumber, anomalies) {
  const raw = String(value || "").trim();
  const match = raw.match(DATE_PATTERN);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  const monthMatch = raw.match(MONTH_PATTERN);
  if (monthMatch) {
    const month = monthNumbers[monthMatch[1].toLowerCase()];
    const day = monthMatch[2].padStart(2, "0");
    anomalies.push(anomaly(
      rowNumber,
      "AMBIGUOUS_DATE_FORMAT",
      "warning",
      `Date "${raw}" is not in DD-MM-YYYY format.`,
      "Interpret named month dates as 2026 dates because the export covers February-April 2026.",
      `Normalized to 2026-${month}-${day}.`
    ));
    return `2026-${month}-${day}`;
  }

  anomalies.push(anomaly(
    rowNumber,
    "INVALID_DATE",
    "error",
    `Date "${raw}" could not be parsed.`,
    "Rows with invalid dates are held for review.",
    "Skipped row."
  ));
  return null;
}

function parseAmount(value, rowNumber, anomalies) {
  const raw = String(value || "").trim();
  const cleaned = raw.replace(/,/g, "");
  if (raw.includes(",")) {
    anomalies.push(anomaly(
      rowNumber,
      "FORMATTED_AMOUNT",
      "info",
      `Amount "${raw}" contains a comma.`,
      "Remove grouping commas before numeric parsing.",
      `Parsed as ${cleaned}.`
    ));
  }
  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) {
    anomalies.push(anomaly(
      rowNumber,
      "INVALID_AMOUNT",
      "error",
      `Amount "${raw}" is not numeric.`,
      "Rows with invalid amounts are held for review.",
      "Skipped row."
    ));
    return null;
  }
  if (amount === 0) {
    anomalies.push(anomaly(
      rowNumber,
      "ZERO_AMOUNT",
      "warning",
      "Amount is zero.",
      "Zero amount rows are retained in the report but not posted as expenses.",
      "Skipped row."
    ));
  }
  if (amount < 0) {
    anomalies.push(anomaly(
      rowNumber,
      "NEGATIVE_AMOUNT",
      "warning",
      "Amount is negative.",
      "Treat negative rows as refunds that reduce the matching expense participants' balances.",
      "Posted as negative expense/refund."
    ));
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    anomalies.push(anomaly(
      rowNumber,
      "SUB_PAISE_AMOUNT",
      "warning",
      `Amount ${amount} has more than two decimal places.`,
      "Round to nearest paise after currency conversion.",
      `Rounded to ${Math.round(amount * 100) / 100}.`
    ));
  }
  return amount;
}

function convertToInrPaise(amount, currency, rowNumber, anomalies) {
  const normalizedCurrency = String(currency || "").trim().toUpperCase();
  if (!normalizedCurrency) {
    anomalies.push(anomaly(
      rowNumber,
      "MISSING_CURRENCY",
      "warning",
      "Currency is missing.",
      "Default missing currency to INR because all non-trip recurring flat expenses are INR.",
      "Currency set to INR."
    ));
    return { currency: "INR", amountInrPaise: rupeesToPaise(amount) };
  }
  if (normalizedCurrency === "INR") {
    return { currency: "INR", amountInrPaise: rupeesToPaise(amount) };
  }
  if (normalizedCurrency === "USD") {
    anomalies.push(anomaly(
      rowNumber,
      "USD_CONVERSION",
      "info",
      "Expense is in USD.",
      `Convert USD to INR using fixed documented assignment rate of ${config.usdToInrRate}.`,
      `Converted ${amount} USD to INR.`
    ));
    return { currency: "USD", amountInrPaise: rupeesToPaise(amount * config.usdToInrRate) };
  }
  anomalies.push(anomaly(
    rowNumber,
    "UNSUPPORTED_CURRENCY",
    "error",
    `Currency "${normalizedCurrency}" is not supported.`,
    "Only INR and USD are supported for this assignment.",
    "Skipped row."
  ));
  return { currency: normalizedCurrency, amountInrPaise: null };
}

function parseSplitDetails(details) {
  if (!details) return new Map();
  return new Map(String(details).split(";").map((part) => {
    const cleaned = part.trim();
    const match = cleaned.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)%?$/);
    if (!match) return [normalizePersonName(cleaned), null];
    return [normalizePersonName(match[1]), Number(match[2])];
  }));
}

function isActive(person, date) {
  const dates = membership[person];
  if (!dates) return false;
  const [joined, left] = dates;
  return date >= joined && (!left || date <= left);
}

function buildSplits(row, normalized, rowNumber, anomalies) {
  const participants = splitPeople(row.split_with);
  const details = parseSplitDetails(row.split_details);
  const splitType = String(row.split_type || "").trim().toLowerCase();

  if (!VALID_SPLITS.has(splitType)) {
    anomalies.push(anomaly(
      rowNumber,
      "MISSING_OR_INVALID_SPLIT_TYPE",
      "error",
      `Split type "${row.split_type || ""}" is not usable.`,
      "Rows without a valid split type are held unless they are settlement rows.",
      "Skipped row."
    ));
    return [];
  }

  const unknown = participants.filter((person) => !membership[person]);
  for (const person of unknown) {
    anomalies.push(anomaly(
      rowNumber,
      "UNKNOWN_PERSON",
      "warning",
      `${person} is not a standard flat member.`,
      "Known guest aliases are normalized; otherwise the row is held for review.",
      membership[person] ? "Normalized guest participant." : "Requires review."
    ));
  }

  for (const person of participants) {
    if (!isActive(person, normalized.date)) {
      anomalies.push(anomaly(
        rowNumber,
        "INACTIVE_MEMBER_ON_DATE",
        "warning",
        `${person} was not active in the group on ${normalized.date}.`,
        "Keep the participant if explicitly listed, but surface the membership conflict.",
        "Included because the CSV explicitly listed them."
      ));
    }
  }

  if (splitType === "equal" && details.size > 0) {
    anomalies.push(anomaly(
      rowNumber,
      "SPLIT_DETAILS_IGNORED_FOR_EQUAL",
      "warning",
      "Equal split row contains split details.",
      "For equal split type, details are informational unless the type is corrected by review.",
      "Used equal split."
    ));
  }

  let weights = [];
  if (splitType === "equal") {
    weights = participants.map((person) => ({ person, weight: 1, basis: "equal", basisValue: 1 }));
  }
  if (splitType === "share") {
    weights = participants.map((person) => ({
      person,
      weight: details.get(person) || 0,
      basis: "share",
      basisValue: details.get(person) || 0
    }));
  }
  if (splitType === "percentage") {
    const total = [...details.values()].reduce((sum, value) => sum + Number(value || 0), 0);
    if (Math.abs(total - 100) > 0.001) {
      anomalies.push(anomaly(
        rowNumber,
        "PERCENTAGE_TOTAL_NOT_100",
        "warning",
        `Percentage split totals ${total}%.`,
        "Normalize stated percentages to 100 instead of silently failing.",
        "Normalized percentages proportionally."
      ));
    }
    weights = participants.map((person) => ({
      person,
      weight: details.get(person) || 0,
      basis: "percentage",
      basisValue: details.get(person) || 0
    }));
  }
  if (splitType === "unequal") {
    const total = [...details.values()].reduce((sum, value) => sum + Number(value || 0), 0);
    if (Math.abs(total * 100 - Math.abs(normalized.amountInrPaise)) > 1 && normalized.currency === "INR") {
      anomalies.push(anomaly(
        rowNumber,
        "UNEQUAL_TOTAL_MISMATCH",
        "warning",
        "Unequal split details do not exactly match the row amount.",
        "Use stated split amounts as weights so every listed person keeps their intended relative share.",
        "Normalized unequal values across total amount."
      ));
    }
    weights = participants.map((person) => ({
      person,
      weight: details.get(person) || 0,
      basis: "unequal",
      basisValue: details.get(person) || 0
    }));
  }

  if (weights.some((item) => item.weight <= 0)) {
    anomalies.push(anomaly(
      rowNumber,
      "MISSING_SPLIT_DETAIL",
      "error",
      "At least one participant has no positive split detail.",
      "Rows needing detailed split values are held for review.",
      "Skipped row."
    ));
    return [];
  }

  return allocateRemainder(normalized.amountInrPaise, weights);
}

function looksLikeSettlement(row) {
  const text = `${row.description || ""} ${row.notes || ""}`.toLowerCase();
  return text.includes("paid") || text.includes("settlement") || text.includes("paid aisha back") || text.includes("deposit");
}

function duplicateKey(normalized) {
  return `${normalized.date}|${normalized.paidBy}|${Math.abs(normalized.amountInrPaise)}|${normalized.participants.join(",")}`;
}

function descriptionKey(description) {
  const words = String(description || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(at|the|order)\b/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort();
  return [...new Set(words)].join(" ");
}

export function analyzeCsv(csvText) {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: false,
    bom: true
  });
  const seen = new Map();
  const descriptionSeen = new Map();

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const anomalies = [];
    const date = parseDate(row.date, rowNumber, anomalies);
    const amount = parseAmount(row.amount, rowNumber, anomalies);
    const paidBy = normalizePersonName(row.paid_by);
    const participants = splitPeople(row.split_with);

    if (!row.paid_by && !looksLikeSettlement(row)) {
      anomalies.push(anomaly(
        rowNumber,
        "MISSING_PAYER",
        "error",
        "Paid by is empty.",
        "Rows without a payer cannot be posted automatically.",
        "Skipped row."
      ));
    }
    if (row.paid_by && paidBy !== String(row.paid_by).trim()) {
      anomalies.push(anomaly(
        rowNumber,
        "NAME_NORMALIZED",
        "info",
        `Name "${row.paid_by}" normalized to "${paidBy}".`,
        "Trim whitespace, case-fold known people, and map documented aliases.",
        `Used ${paidBy}.`
      ));
    }
    for (const rawPerson of String(row.split_with || "").split(";").filter(Boolean)) {
      const normalizedName = normalizePersonName(rawPerson);
      if (normalizedName !== rawPerson.trim()) {
        anomalies.push(anomaly(
          rowNumber,
          "NAME_NORMALIZED",
          "info",
          `Participant "${rawPerson}" normalized to "${normalizedName}".`,
          "Trim whitespace, case-fold known people, and map documented aliases.",
          `Used ${normalizedName}.`
        ));
      }
    }

    const conversion = amount === null ? { currency: String(row.currency || "").trim(), amountInrPaise: null } : convertToInrPaise(amount, row.currency, rowNumber, anomalies);
    const normalized = {
      date,
      description: String(row.description || "").trim(),
      paidBy,
      originalAmount: amount,
      currency: conversion.currency,
      amountInrPaise: conversion.amountInrPaise,
      splitType: String(row.split_type || "").trim().toLowerCase(),
      participants,
      notes: String(row.notes || "").trim()
    };

    const isSettlement = looksLikeSettlement(row) && (!normalized.splitType || participants.length <= 1);
    if (isSettlement) {
      anomalies.push(anomaly(
        rowNumber,
        "SETTLEMENT_IN_EXPENSE_EXPORT",
        "warning",
        "Row appears to be a payment/settlement rather than a shared expense.",
        "Record settlement rows as payments, not expenses.",
        "Classified as payment."
      ));
    }

    let splits = [];
    if (!isSettlement && date && amount !== null && conversion.amountInrPaise !== null && amount !== 0) {
      splits = buildSplits(row, normalized, rowNumber, anomalies);
    }

    if (!isSettlement && splits.length > 0) {
      const key = duplicateKey(normalized);
      const previous = seen.get(key);
      if (previous) {
        anomalies.push(anomaly(
          rowNumber,
          "EXACT_DUPLICATE",
          "warning",
          `Looks like a duplicate of row ${previous}.`,
          "Keep the first exact duplicate and require approval before dropping the later row.",
          "Skipped as duplicate candidate."
        ));
      } else {
        seen.set(key, rowNumber);
      }

      const descKey = descriptionKey(normalized.description);
      const fuzzyPrevious = descriptionSeen.get(`${normalized.date}|${descKey}`);
      if (fuzzyPrevious && fuzzyPrevious.amountInrPaise !== normalized.amountInrPaise) {
        anomalies.push(anomaly(
          rowNumber,
          "POSSIBLE_DUPLICATE_DIFFERENT_AMOUNT",
          "warning",
          `Description resembles row ${fuzzyPrevious.rowNumber}, but amount differs.`,
          "Keep both out of automatic posting review when amounts differ.",
          "Requires approval."
        ));
      }
      descriptionSeen.set(`${normalized.date}|${descKey}`, { rowNumber, amountInrPaise: normalized.amountInrPaise });
    }

    const hasBlockingError = anomalies.some((item) => item.severity === "error");
    const hasReviewDuplicate = anomalies.some((item) => ["EXACT_DUPLICATE", "POSSIBLE_DUPLICATE_DIFFERENT_AMOUNT"].includes(item.code));
    let action = "posted_expense";
    if (isSettlement) action = "posted_payment";
    if (normalized.originalAmount === 0 || hasBlockingError || hasReviewDuplicate) action = "review_required";

    return { rowNumber, raw: row, normalized, splits, anomalies, action, isSettlement };
  });
}
