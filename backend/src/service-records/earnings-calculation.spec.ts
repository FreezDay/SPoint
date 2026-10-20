import { calculateEarningsSplit } from './earnings-calculation';

describe('calculateEarningsSplit', () => {
  it('shows the full charge and complementary staff/admin shares for snapshot rates', () => {
    expect(calculateEarningsSplit({ amount: 100, keepPercent: 40 }, 0)).toEqual({
      grossAmount: 100,
      staffPercent: 40,
      staffAmount: 40,
      studioPercent: 60,
      studioAmount: 60,
    });
  });

  it('converts legacy admin commission rates to the staff share', () => {
    expect(calculateEarningsSplit({ amount: 100, keepPercent: null }, 40)).toEqual({
      grossAmount: 100,
      staffPercent: 60,
      staffAmount: 60,
      studioPercent: 40,
      studioAmount: 40,
    });
  });

  it('assigns admin-performed services fully to the admin', () => {
    expect(calculateEarningsSplit({ amount: 100, keepPercent: 40, isAdminArtist: true }, 40)).toEqual({
      grossAmount: 100,
      staffPercent: 0,
      staffAmount: 0,
      studioPercent: 100,
      studioAmount: 100,
    });
  });
});