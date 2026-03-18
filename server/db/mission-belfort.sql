-- ═══════════════════════════════════════════════════════
-- Mission Belfort TR15 & TR18 — 18-21 mars 2026
-- ═══════════════════════════════════════════════════════

-- ─── Lift Units TR15 & TR18 ───
INSERT INTO lift_units (id, serial_number, client, site, city, partie_fixe_id, partie_mobile_id, current_config, target_config, status, install_date, last_service_date)
VALUES
  ('TR15', 'SN-ALST-TR15', 'ALSTOM', 'Gare de Belfort', 'Belfort', 'LF-TR15', 'LF-TR15', 'E''', 'H', 'en-maintenance', '2019-05-15', '2025-12-10'),
  ('TR18', 'SN-ALST-TR18', 'ALSTOM', 'Gare de Belfort', 'Belfort', 'LF-TR18', 'LF-TR18', 'E''', 'H', 'en-maintenance', '2019-09-22', '2025-12-10')
ON CONFLICT (id) DO NOTHING;

-- ─── New Retrofit Operations (mission-specific) ───
INSERT INTO retrofit_operations (id, code, title, estimated_hours, personnel, tools, consumables, steps, from_config, to_config)
VALUES
  ('OP-011', 'HAB-REG',  'Réglage des habillages',                    1.0, 1,
   '{"Clé dynamo 2-10 Nm","Feutre écrit métal"}', '{}',
   '{"Déposer les habillages intérieurs/extérieurs","Vérifier alignement et jeux","Repositionner et fixer les habillages neufs","Serrage au couple + marquage bleu"}',
   'E''', 'H'),
  ('OP-012', 'GOUL-CTRL', 'Vérification hauteur goulotte + mise cale', 0.5, 1,
   '{"Réglet","Clé dynamo 5-25 Nm"}', '{"Cale"}',
   '{"Mesurer la hauteur de goulotte avec réglet","Comparer à la cote nominale","Mettre en place cale si nécessaire","Resserrer la fixation au couple"}',
   'E''', 'H'),
  ('OP-013', 'DUB-LIN',  'Modification Dubuis sur lining',            1.5, 1,
   '{"Outillage standard"}', '{}',
   '{"Appliquer la modification Dubuis selon instruction technique","Vérifier conformité"}',
   'E''', 'H'),
  ('OP-014', 'BPURG',    'Changement cosse bouton BPURG dans pupitre', 0.5, 1,
   '{"Outillage standard"}', '{}',
   '{"Ouvrir le pupitre de commande","Identifier le bouton BPURG","Déconnecter et remplacer la cosse","Vérifier la continuité électrique","Refermer le pupitre"}',
   'E''', 'H'),
  ('OP-015', 'MASSE-LIN', 'Changement cosse tresse de masse lining',  0.5, 1,
   '{"Outillage standard"}', '{}',
   '{"Identifier la tresse de masse sur le lining","Déconnecter l ancienne cosse","Sertir et installer la nouvelle cosse","Vérifier la continuité de mise à la terre"}',
   'E''', 'H'),
  ('OP-016', 'BAG-MANQ', 'Pose baguettes manquantes',                 1.0, 1,
   '{"Outillage standard"}', '{}',
   '{"Identifier les emplacements des 4 baguettes manquantes","Poser 2x REF HS00001139767 et 2x REF HS000011397770","Fixer et vérifier le maintien"}',
   'E''', 'H'),
  ('OP-017', 'GOUL-CHG', 'Changement goulotte + cale (goulotte tordue)', 1.5, 1,
   '{"Outillage standard"}', '{"Ensemble goulotte","Cale","Visserie ISO 10642 M05x12 A4-80"}',
   '{"Démonter la goulotte tordue existante","Installer la nouvelle goulotte avec cale","Fixer avec visserie ISO 10642 M05x12 A4-80","Vérifier l alignement"}',
   'E''', 'H'),
  ('OP-018', 'SERR-CPL', 'Serrage au couple (écrou blocage pignon/couronne)', 1.0, 1,
   '{"Clé spéciale (à définir)"}', '{}',
   '{"Accéder à l écrou de blocage sur la vis de réglage d engrènement pignon/couronne","Effectuer le serrage au couple requis","Note: l écrou n est pas accessible avec outillage conventionnel — outil spécial nécessaire"}',
   'E''', 'H')
ON CONFLICT (id) DO NOTHING;

-- ─── Parts for new operations ───
INSERT INTO operation_parts (operation_id, designation, quantity, reference) VALUES
  ('OP-011', 'Habillages int/ext (paire)', 1, 'HAB-PAIR'),
  ('OP-012', 'Cale', 1, 'CALE-GOUL'),
  ('OP-016', 'Baguette REF HS00001139767', 2, 'HS00001139767'),
  ('OP-016', 'Baguette REF HS000011397770', 2, 'HS000011397770'),
  ('OP-017', 'Ensemble goulotte', 1, 'GOUL-ENS'),
  ('OP-017', 'Cale goulotte', 1, 'CALE-GOUL'),
  ('OP-017', 'Visserie ISO 10642 M05x12 A4-80', 10, 'ISO_10642_M05x12');

-- ─── Work Order TR15 ───
INSERT INTO work_orders (id, type, status, unit_id, client, site, city, created_date, planned_date, from_config, to_config, priority, description, notes)
VALUES (
  'OT-2026-005', 'correctif', 'planifie', 'TR15', 'ALSTOM', 'Gare de Belfort', 'Belfort',
  '2026-03-18', '2026-03-18', 'E''', 'H', 'haute',
  'Mission Belfort TR15 — 8 opérations : soufflet à finir, frottement bord sensible/demi-lune, réglage habillages, motorisation R, vérif goulotte, modif Dubuis lining, cosse BPURG, cosse tresse de masse.',
  'Mission du 18 au 21 mars 2026. Outillage spécifique : clé Allen coupée, clé dynamo 2-10 Nm et 5-25 Nm, réglet, feutre écrit métal.'
) ON CONFLICT (id) DO NOTHING;

-- ─── Work Order TR18 ───
INSERT INTO work_orders (id, type, status, unit_id, client, site, city, created_date, planned_date, from_config, to_config, priority, description, notes)
VALUES (
  'OT-2026-006', 'correctif', 'planifie', 'TR18', 'ALSTOM', 'Gare de Belfort', 'Belfort',
  '2026-03-18', '2026-03-18', 'E''', 'H', 'haute',
  'Mission Belfort TR18 — 8 opérations : motorisation R, baguettes manquantes, changement goulotte tordue + cale, réglage habillages, modif Dubuis lining, cosse BPURG, cosse tresse de masse, serrage au couple pignon/couronne.',
  'Mission du 18 au 21 mars 2026. Attention : écrou blocage pignon/couronne non accessible avec outillage conventionnel (clé spéciale à prévoir).'
) ON CONFLICT (id) DO NOTHING;

-- ─── TR15 Operations (8) ───
INSERT INTO work_order_operations (work_order_id, operation_id, status, technician_id, completed_at, notes) VALUES
  ('OT-2026-005', 'OP-004', 'attente', NULL, NULL, 'Soufflet à finir d installer — 12 écrous cage, 12 rondelles Misumi, 12 vis M5x16'),
  ('OT-2026-005', 'OP-001', 'attente', NULL, NULL, 'Frottement bord sensible avec demi-lune — une paire de demi-lune'),
  ('OT-2026-005', 'OP-011', 'attente', NULL, NULL, 'Réglage des habillages — une paire habillages int/ext'),
  ('OT-2026-005', 'OP-008', 'attente', NULL, NULL, 'Motorisation R à changer'),
  ('OT-2026-005', 'OP-012', 'attente', NULL, NULL, 'Vérification hauteur goulotte + mise cale si nécessaire'),
  ('OT-2026-005', 'OP-013', 'attente', NULL, NULL, 'Modification Dubuis sur lining'),
  ('OT-2026-005', 'OP-014', 'attente', NULL, NULL, 'Changement cosse bouton BPURG dans pupitre'),
  ('OT-2026-005', 'OP-015', 'attente', NULL, NULL, 'Changement cosse tresse de masse lining');

-- ─── TR18 Operations (8) ───
INSERT INTO work_order_operations (work_order_id, operation_id, status, technician_id, completed_at, notes) VALUES
  ('OT-2026-006', 'OP-008', 'attente', NULL, NULL, 'Motorisation R à changer'),
  ('OT-2026-006', 'OP-016', 'attente', NULL, NULL, 'Manque 4 baguettes — 2x HS00001139767 + 2x HS000011397770'),
  ('OT-2026-006', 'OP-017', 'attente', NULL, NULL, 'Changement goulotte + cale — goulotte tordue'),
  ('OT-2026-006', 'OP-011', 'attente', NULL, NULL, 'Réglage des habillages — une paire habillages int/ext'),
  ('OT-2026-006', 'OP-013', 'attente', NULL, NULL, 'Modification Dubuis sur lining'),
  ('OT-2026-006', 'OP-014', 'attente', NULL, NULL, 'Changement cosse bouton BPURG dans pupitre'),
  ('OT-2026-006', 'OP-015', 'attente', NULL, NULL, 'Changement cosse tresse de masse lining'),
  ('OT-2026-006', 'OP-018', 'attente', NULL, NULL, 'Serrage au couple — ATTENTION: écrou blocage non accessible avec outillage conventionnel');
