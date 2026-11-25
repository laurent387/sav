// Tests du module de détection des mesures atypiques (node --test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SEQUENCE, neighborsOf, analyzeScrew, retrospectiveCheck, analyzeControl, summarize, DEFAULT_THRESHOLDS,
} from '../src/geo/analysis.ts'

const T = DEFAULT_THRESHOLDS
const m = (screw, value, extra = {}) => ({ screw, value, alertRaised: false, confirmed: false, vigilance: false, ...extra })

test('ordre d\'acquisition antihoraire 3 → 2 → 1 → 40 → … → 19', () => {
  assert.deepEqual(SEQUENCE.slice(0, 5), [3, 2, 1, 40, 39])
  assert.equal(SEQUENCE.at(-1), 19)
  assert.equal(SEQUENCE.length, 25)
})

test('voisines physiques, extrémités sans voisine extérieure', () => {
  assert.deepEqual(neighborsOf(1), { prev: 2, next: 40 })
  assert.deepEqual(neighborsOf(40), { prev: 1, next: 39 })
  assert.deepEqual(neighborsOf(3), { prev: null, next: 2 })
  assert.deepEqual(neighborsOf(19), { prev: 20, next: null })
  assert.deepEqual(neighborsOf(10), { prev: null, next: null })
})

test('écarts avec la vis précédente et suivante', () => {
  const a = analyzeScrew(39, new Map([[40, 3.80], [39, 4.05], [38, 3.95]]), T)
  assert.equal(a.signedPrev, 0.25)
  assert.equal(a.absPrev, 0.25)
  assert.equal(a.signedNext, 0.1)
  assert.equal(a.neighborMean, 3.875)
  assert.equal(a.meanDev, 0.175)
  assert.equal(a.localExceeded, true)
  assert.equal(a.alert, true)
})

test('pas de comparaison avec une vis non adjacente en cas de mesure manquante', () => {
  // 39 manquante : 38 ne doit pas être comparée à 40.
  const a = analyzeScrew(38, new Map([[40, 3.0], [38, 4.0]]), T)
  assert.equal(a.prevValue, null)
  assert.equal(a.signedPrev, null)
  assert.equal(a.meanDev, null)
  assert.equal(a.alert, false)
})

test('écart égal au seuil : pas d\'alerte (strictement supérieur)', () => {
  const a = analyzeScrew(2, new Map([[3, 3.80], [2, 4.00]]), T)
  assert.equal(a.absPrev, 0.2)
  assert.equal(a.alert, false)
})

test('exemple du cahier des charges : pic isolé détecté rétrospectivement (0,29 mm)', () => {
  // Vis précédente 3,80 → vis contrôlée 4,10 → vis suivante 3,82
  const values = new Map([[40, 3.80], [39, 4.10], [38, 3.82]])
  const r = retrospectiveCheck(38, values, T)
  assert.ok(r)
  assert.equal(r.screw, 39)
  assert.equal(r.neighborMean, 3.81)
  assert.equal(r.meanDev, 0.29)
})

test('statuts et synthèse : correction après nettoyage (exemple rame 1009, vis 30)', () => {
  const measurements = [m(31, 4.00), m(30, 3.99, { alertRaised: true }), m(29, 4.01), m(28, 4.30, { alertRaised: true, confirmed: true, vigilance: true, observation: 'Écart confirmé' })]
  const events = [
    { id: 1, screw: 30, kind: 'mesure', oldValue: null, newValue: 4.07, reason: null, cleaning: [], alertStatus: 'a-verifier', observation: null, technician: 'T', createdAt: '' },
    { id: 2, screw: 30, kind: 'correction', oldValue: 4.07, newValue: 3.99, reason: 'Nettoyage et renouvellement de la mesure', cleaning: ['Nettoyer les dents de la crémaillère'], alertStatus: 'resolu', observation: null, technician: 'T', createdAt: '' },
  ]
  const analysis = analyzeControl(measurements, events, T)
  assert.equal(analysis.status.get(30), 'resolu')
  assert.equal(analysis.status.get(31), 'ok')
  assert.equal(analysis.status.get(28), 'confirme')
  // 29 n'est en écart qu'avec 28, dont l'écart est confirmé : pas d'alerte relancée.
  assert.equal(analysis.status.get(29), 'ok')
  assert.equal(analysis.status.get(10), 'non-mesure')
  assert.equal(analysis.nextToMeasure, 3)

  const s = summarize(measurements, events, analysis)
  assert.equal(s.atypicalDetected, 2)
  assert.equal(s.remeasured, 1)
  assert.equal(s.resolvedAfterCleaning, 1)
  assert.equal(s.confirmed, 1)
  assert.deepEqual(s.attention.map(x => x.screw), [28])
  assert.equal(s.corrections.length, 1)
})

test('un écart non expliqué par une voisine confirmée reste en alerte', () => {
  // 30 dévie fortement de 31 (non confirmée) et de 29 (confirmée) : l'alerte doit rester.
  const measurements = [m(31, 4.00), m(30, 4.40), m(29, 4.70, { confirmed: true, alertRaised: true })]
  const analysis = analyzeControl(measurements, [], T)
  assert.equal(analysis.status.get(30), 'a-verifier')
})
