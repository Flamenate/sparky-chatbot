import {
  MONO,
  PALIERS_ENERGIE,
  TARIF_FTE,
  TARIF_PUISSANCE,
  TAXE_MUNICIPALE,
  TRI,
  TVA_ENERGIE,
} from "./sparky.js";

interface EnergyCandidate {
  kwh: number;
  distance: number;
  minimum: number;
  maximum: number;
}

interface MonthlyEstimate {
  kwh_month: number;
  power_kva: number;
  power_fee_ht: number;
  power_fee_ttc: number;
  total_power_fee_ttc: number;
  bill_without_debt: number;
  monthly_bill: number;
  exact: boolean;
}

/** Returns the subscribed power in kVA for a given wire configuration and breaker rating. */
function getSubscribedPower(wires: number, breaker: number): number {
  const rates = wires === 2 ? MONO : wires === 4 ? TRI : undefined;

  if (rates && breaker in rates) {
    return rates[breaker];
  }

  throw new Error("Calibre du disjoncteur non reconnu.");
}

/** Calculates the pre-tax and tax-inclusive power subscription fee for a given power level. */
function calculatePowerFee(
  powerKva: number,
): [powerFeeHt: number, powerFeeTtc: number] {
  const powerFeeHt = powerKva * TARIF_PUISSANCE;
  const powerFeeTtc = powerFeeHt * (1 + TVA_ENERGIE);

  return [powerFeeHt, powerFeeTtc];
}

/** Calculates the total electricity bill for a given energy consumption in kWh. */
export function calculateEnergyBill(kwh: number): number {
  let price: number;
  let tva: number;

  if (kwh <= 50) {
    price = PALIERS_ENERGIE[0].price;
    tva = PALIERS_ENERGIE[0].tva;
  } else if (kwh <= 100) {
    price = PALIERS_ENERGIE[1].price;
    tva = PALIERS_ENERGIE[1].tva;
  } else if (kwh <= 200) {
    price = PALIERS_ENERGIE[2].price;
    tva = PALIERS_ENERGIE[2].tva;
  } else if (kwh <= 300) {
    price = PALIERS_ENERGIE[3].price;
    tva = PALIERS_ENERGIE[3].tva;
  } else if (kwh <= 500) {
    price = PALIERS_ENERGIE[4].price;
    tva = PALIERS_ENERGIE[4].tva;
  } else {
    price = PALIERS_ENERGIE[5].price;
    tva = PALIERS_ENERGIE[5].tva;
  }

  const energy = kwh * price;
  const municipalTax = kwh * TAXE_MUNICIPALE;
  const fte = kwh > 100 ? kwh * TARIF_FTE : 0;
  const tvaEnergy = energy * tva;

  return energy + municipalTax + fte + tvaEnergy;
}

const round = (value: number, decimals: number): number =>
  Number(value.toFixed(decimals));

/** Estimates monthly electricity consumption from the invoice amount, debt, billing period, wiring, and breaker rating. */
export function estimateMonthlyKwh(
  billAmount: number,
  months: number,
  wires: number = 2,
  breaker: number,
): MonthlyEstimate {
  if (billAmount <= 0) {
    throw new Error("Le montant de la facture doit être positif.");
  }

  if (months <= 0) {
    throw new Error("Le nombre de mois doit être positif.");
  }

  const billWithoutDebt = billAmount;
  const powerKva = getSubscribedPower(wires, breaker);
  const [powerFeeHt, powerFeeTtc] = calculatePowerFee(powerKva);

  const numberOfBillingPeriods = months / 2;
  const totalPowerFeeTtc = powerFeeTtc * numberOfBillingPeriods;

  const energyBillTotal = billWithoutDebt - totalPowerFeeTtc;

  if (energyBillTotal <= 0) {
    throw new Error("Le montant restant après la redevance est insuffisant.");
  }

  const monthlyEnergyBill = energyBillTotal / months;

  const candidates: EnergyCandidate[] = PALIERS_ENERGIE.map(
    ({ minimum, maximum, price, tva }) => {
      const fteRate = minimum > 100 ? TARIF_FTE : 0;

      const costPerKwh = price + TAXE_MUNICIPALE + fteRate + price * tva;

      const kwh = monthlyEnergyBill / costPerKwh;

      let distance: number;

      if (kwh < minimum) {
        distance = minimum - kwh;
      } else if (kwh > maximum) {
        distance = kwh - maximum;
      } else {
        distance = 0;
      }

      return {
        kwh,
        distance,
        minimum,
        maximum,
      };
    },
  );

  const valid = candidates.filter((candidate) => candidate.distance === 0);

  const best =
    valid.length > 0
      ? valid[0]
      : candidates.reduce((closest, candidate) =>
          candidate.distance < closest.distance ? candidate : closest,
        );

  const exact = valid.length > 0;

  const resultKwh = Math.min(Math.max(best.kwh, best.minimum), best.maximum);

  return {
    kwh_month: round(resultKwh, 2),
    power_kva: powerKva,
    power_fee_ht: round(powerFeeHt, 3),
    power_fee_ttc: round(powerFeeTtc, 3),
    total_power_fee_ttc: round(totalPowerFeeTtc, 3),
    bill_without_debt: round(billWithoutDebt, 3),
    monthly_bill: round(billWithoutDebt / months, 3),
    exact,
  };
}
