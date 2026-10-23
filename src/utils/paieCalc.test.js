import test from 'node:test';
import assert from 'node:assert/strict';
import { calcCotisations, calculerIrpp, TAUX } from './paieCalc.js';

test('les taux par défaut correspondent aux valeurs du backend', () => {
  assert.equal(TAUX.cnpsSalariale, 0.044);
  assert.equal(TAUX.pvid, 0.0175);
  assert.equal(TAUX.cfc, 0.0011);
  assert.equal(TAUX.cnpsPlafond, 1500000);
  assert.equal(TAUX.abattementIrpp, 0.2);
});

test('les cotisations respectent le plafond CNPS et le barème IRPP', () => {
  const cotisations = calcCotisations(2000000, 2000000);
  assert.equal(cotisations.cnps, 66000);
  assert.equal(cotisations.pvid, 35000);
  assert.equal(cotisations.cfc, 2200);
  assert.equal(cotisations.irpp, calculerIrpp(2000000));
});

test('les montants nuls ou négatifs restent nuls ou sans IRPP', () => {
  assert.equal(calculerIrpp(0), 0);
  assert.equal(calculerIrpp(-1000), 0);
  assert.deepEqual(calcCotisations(0, 0), {
    cnps: 0, pvid: 0, cfc: 0, irpp: 0,
  });
});
