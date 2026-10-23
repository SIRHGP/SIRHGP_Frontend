// utils/paieCalc.js — Miroir frontend des règles de paie Cameroun (PaieService)
// Taux identiques à application.properties (app.paie.*) — source de vérité : le backend.

const DEFAULT_TAUX = {
  cnpsSalariale: 0.044,   // 4,4 % du brut (plafonnée)
  pvid: 0.0175,           // 1,75 % du brut
  cfc: 0.0011,            // 0,11 % du brut
  cnpsPlafond: 1500000,   // plafond CNPS
  abattementIrpp: 0.20,   // abattement forfaitaire 20 % du brut annuel
};

const configuredRate = (name, fallback) => {
  const value = Number(import.meta.env?.[`VITE_PAIE_${name}`]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

// Valeurs frontend paramétrables et alignées sur les défauts du backend.
export const TAUX = {
  cnpsSalariale: configuredRate('CNPS_SALARIALE', DEFAULT_TAUX.cnpsSalariale),
  pvid: configuredRate('PVID', DEFAULT_TAUX.pvid),
  cfc: configuredRate('CFC', DEFAULT_TAUX.cfc),
  cnpsPlafond: configuredRate('CNPS_PLAFOND', DEFAULT_TAUX.cnpsPlafond),
  abattementIrpp: configuredRate('ABATTEMENT_IRPP', DEFAULT_TAUX.abattementIrpp),
};

/** IRPP : barème progressif annuel camerounais, mensualisé (assiette = salaire brut). */
export function calculerIrpp(salaireBase) {
  if (!salaireBase || Number(salaireBase) <= 0) return 0;
  const brutAnnuel = Number(salaireBase) * 12;
  const imposable = Math.max(0, brutAnnuel * (1 - TAUX.abattementIrpp));
  const tranches = [
    [0, 750000, 0],
    [750000, 1500000, 0.10],
    [1500000, 3000000, 0.15],
    [3000000, 6000000, 0.25],
    [6000000, Infinity, 0.35],
  ];
  let irpp = 0;
  for (const [lo, hi, taux] of tranches) {
    const portion = Math.min(imposable, hi) - lo;
    if (portion > 0) irpp += portion * taux;
    if (imposable <= hi) break;
  }
  return irpp / 12;
}

/** Cotisations salariales (sur le brut) + IRPP (sur le salaire brut). */
export function calcCotisations(brut, salaireBase) {
  const b = Number(brut || 0);
  return {
    cnps: Math.min(b, TAUX.cnpsPlafond) * TAUX.cnpsSalariale,
    pvid: b * TAUX.pvid,
    cfc: b * TAUX.cfc,
    irpp: calculerIrpp(salaireBase),
  };
}
