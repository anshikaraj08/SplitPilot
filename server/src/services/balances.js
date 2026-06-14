import { paiseToRupees } from "./money.js";

export function calculateBalances(expenses, payments = []) {
  const people = new Map();
  const entries = [];

  function touch(person) {
    if (!people.has(person)) people.set(person, { person, paidPaise: 0, owedPaise: 0, netPaise: 0, expenses: [] });
    return people.get(person);
  }

  for (const expense of expenses) {
    const payer = touch(expense.paidBy);
    payer.paidPaise += expense.amountInrPaise;
    payer.expenses.push({ id: expense.id, description: expense.description, effectPaise: expense.amountInrPaise, type: "paid" });

    for (const split of expense.splits) {
      const person = touch(split.person);
      person.owedPaise += split.sharePaise;
      person.expenses.push({ id: expense.id, description: expense.description, effectPaise: -split.sharePaise, type: "owed" });
      entries.push({ expenseId: expense.id, person: split.person, owedPaise: split.sharePaise });
    }
  }

  for (const payment of payments) {
    touch(payment.from).paidPaise += payment.amountInrPaise;
    touch(payment.to).owedPaise += payment.amountInrPaise;
  }

  for (const person of people.values()) {
    person.netPaise = person.paidPaise - person.owedPaise;
    person.paid = paiseToRupees(person.paidPaise);
    person.owed = paiseToRupees(person.owedPaise);
    person.net = paiseToRupees(person.netPaise);
  }

  return {
    people: [...people.values()].sort((a, b) => a.person.localeCompare(b.person)),
    settlements: simplifySettlements([...people.values()]),
    entries
  };
}

export function simplifySettlements(people) {
  const debtors = people
    .filter((person) => person.netPaise < 0)
    .map((person) => ({ person: person.person, amount: -person.netPaise }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = people
    .filter((person) => person.netPaise > 0)
    .map((person) => ({ person: person.person, amount: person.netPaise }))
    .sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0) {
      settlements.push({ from: debtor.person, to: creditor.person, amountPaise: amount, amount: paiseToRupees(amount) });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }
  return settlements;
}
