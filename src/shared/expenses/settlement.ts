import type { ParticipantId, Transfer } from './types.js';

/**
 * Payments that bring every net balance to zero.
 *
 * First, a debtor and a creditor whose amounts match exactly cancel each other
 * in one payment; then the biggest debtor pays the biggest creditor until
 * nobody owes anything. That is at most `people with a balance - 1` payments
 * and usually the fewest possible; the true minimum is a hard combinatorial
 * problem and not worth a surprising answer for a group of friends.
 *
 * `nets` must add up to zero. Order never depends on input order: ties are
 * broken by participant id, so the same group always gets the same plan.
 */
export function planTransfers(
  nets: { participant: ParticipantId; net: number }[],
): Transfer[] {
  const debtors = nets
    .filter(({ net }) => net < 0)
    .map(({ participant, net }) => ({ participant, amount: -net }));
  const creditors = nets
    .filter(({ net }) => net > 0)
    .map(({ participant, net }) => ({ participant, amount: net }));

  const transfers: Transfer[] = [];

  // 1. Exact matches.
  for (const debtor of debtors) {
    const match = creditors.find(
      (creditor) => creditor.amount > 0 && creditor.amount === debtor.amount,
    );
    if (match && debtor.amount > 0) {
      transfers.push({
        from: debtor.participant,
        to: match.participant,
        amount: debtor.amount,
      });
      debtor.amount = 0;
      match.amount = 0;
    }
  }

  // 2. Biggest debtor pays the biggest creditor.
  const biggest = (people: { participant: ParticipantId; amount: number }[]) =>
    people
      .filter(({ amount }) => amount > 0)
      .sort(
        (a, b) =>
          b.amount - a.amount || a.participant.localeCompare(b.participant),
      )[0];

  for (;;) {
    const debtor = biggest(debtors);
    const creditor = biggest(creditors);
    if (!debtor || !creditor) break;

    const amount = Math.min(debtor.amount, creditor.amount);
    transfers.push({
      from: debtor.participant,
      to: creditor.participant,
      amount,
    });
    debtor.amount -= amount;
    creditor.amount -= amount;
  }

  return transfers.sort(
    (a, b) =>
      b.amount - a.amount ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  );
}
