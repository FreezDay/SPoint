export type EarningsSplitInput = {
  amount: unknown;
  keepPercent?: unknown;
  isAdminArtist?: boolean;
};

export const calculateEarningsSplit = (record: EarningsSplitInput, adminCommissionPercent: number) => {
  const grossAmount = Number(record.amount);
  const rawStaffPercent = record.isAdminArtist
    ? 0
    : record.keepPercent !== null && record.keepPercent !== undefined
    ? Number(record.keepPercent)
    : 100 - adminCommissionPercent;
  const staffPercent = Number.isFinite(rawStaffPercent) ? Math.min(100, Math.max(0, rawStaffPercent)) : 100;
  const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const staffAmount = roundMoney(grossAmount * staffPercent / 100);
  const studioPercent = 100 - staffPercent;
  const studioAmount = roundMoney(grossAmount - staffAmount);

  return { grossAmount, staffPercent, staffAmount, studioPercent, studioAmount };
};