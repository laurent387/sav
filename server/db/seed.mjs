// ═══════════════════════════════════════════════════════
// LIFT GMAO — Seed script (inserts all reference data)
// Run: node server/db/seed.mjs
// ═══════════════════════════════════════════════════════
import pg from 'pg'
import crypto from 'node:crypto'
const { Pool } = pg

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'lift_gmao',
  user:     process.env.PGUSER     || 'lift',
  password: process.env.PGPASSWORD || 'lift',
})

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex') }

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ─── Users ───
    const users = [
      ['admin',              'admin@lift.fr',        sha256('LiftGmao@2026!'),  'Laurent Stolidi',    'admin'],
      ['jp.bureau@lift.fr',  'jp.bureau@lift.fr',    sha256('Bureau@2026!'),    'Jean-Pierre Bureau', 'bureau-etude'],
      ['m.logistique@lift.fr','m.logistique@lift.fr', sha256('Logistique@2026!'), 'Marie Dupont',      'logistique'],
      ['a.belkacem@lift.fr', 'a.belkacem@lift.fr',   sha256('Tech@2026!'),      'Ahmed Belkacem',     'technicien'],
      ['f.zari@lift.fr',    'f.zari@lift.fr',        sha256('Tech@2026!'),      'Fatima Zari',        'technicien'],
    ]
    for (const u of users) {
      await client.query(
        `INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (username) DO NOTHING`, u)
    }

    // ─── Technicians ───
    const techs = [
      ['TECH-01', 'Ahmed Belkacem',  'Mecanicien',     'Paris',    'en-intervention', 2],
      ['TECH-02', 'Fatima Zari',     'Electricien',     'Paris',    'disponible',      0],
      ['TECH-03', 'Omar Nassif',     "Chef d'equipe",   'Lyon',     'en-intervention', 3],
      ['TECH-04', 'Karim Daoudi',    'Mecanicien',     'Bordeaux', 'disponible',      1],
    ]
    for (const t of techs) {
      await client.query(
        `INSERT INTO technicians (id, name, skill, city, availability, active_ots) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`, t)
    }

    // ─── Lift Units ───
    const units = [
      ['LIFT-001', 'SN-ALST-2019-001', 'ALSTOM', 'Gare du Nord',  'Paris',     'LF001', 'LF001', "E'", 'H',    'en-retrofit',     '2019-04-12', '2025-01-15'],
      ['LIFT-002', 'SN-ALST-2021-002', 'ALSTOM', 'Part-Dieu',     'Lyon',      'LF002', 'LF002', 'G',  null,    'operational',     '2021-06-03', '2025-03-10'],
      ['LIFT-003', 'SN-ALST-2018-003', 'ALSTOM', 'Saint-Jean',    'Bordeaux',  'LF003', 'LF003', "E'", 'H',    'en-retrofit',     '2018-11-20', '2024-12-01'],
      ['LIFT-004', 'SN-ALST-2022-004', 'ALSTOM', 'Saint-Charles', 'Marseille', 'LF004', 'LF004', 'H',  null,    'operational',     '2022-02-14', '2025-05-08'],
      ['LIFT-005', 'SN-ALST-2020-005', 'ALSTOM', 'Matabiau',     'Toulouse',  'LF005', 'LF005', 'F',  null,    'en-maintenance',  '2020-08-30', '2025-04-22'],
      ['LIFT-006', 'SN-ALST-2023-006', 'ALSTOM', 'Perrache',     'Lyon',      'LF006', 'LF006', 'I',  null,    'operational',     '2023-01-17', '2025-06-01'],
      ['TR15',     'SN-ALST-TR15',     'ALSTOM', 'Gare de Belfort','Belfort',  'LF-TR15','LF-TR15',"E'", 'H',   'en-maintenance',  '2019-05-15', '2025-12-10'],
      ['TR18',     'SN-ALST-TR18',     'ALSTOM', 'Gare de Belfort','Belfort',  'LF-TR18','LF-TR18',"E'", 'H',   'en-maintenance',  '2019-09-22', '2025-12-10'],
    ]
    for (const u of units) {
      await client.query(
        `INSERT INTO lift_units (id, serial_number, client, site, city, partie_fixe_id, partie_mobile_id, current_config, target_config, status, install_date, last_service_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING`, u)
    }

    // ─── Retrofit Operations ───
    const ops = [
      ['OP-001', '109414-0003-821',    'Retrofit Demi-Lunes',              0.5, 1, '{Outillage standard,Clé Allen}',                                                '{}',                                            "E'", 'H'],
      ['OP-002', 'ELE016/020A0V3',     'Retrofit Bord Sensible',           0.1, 1, '{Outillage standard}',                                                          '{Stylo à peinture bleue,Rislans}',              "E'", 'H'],
      ['OP-003', '109414-0003-3200',   'Retrofit Motorisation Z',          3,   1, '{Outillage standard,Perceuse Ø5,Taraud M6,Clé dynamo}',                         '{Socopac 65h,Stylo à peinture bleue}',          "E'", 'H'],
      ['OP-004', '109414-0003-313',    'Retrofit Soufflet',                0.5, 1, '{Outillage standard,Clé Allen raccourcie,Clé dynamo}',                           '{Stylo à peinture bleue}',                      "E'", 'H'],
      ['OP-005', '109414-0003-4400',   'Retrofit Ensemble Bord Sensible',  0.7, 1, '{Outillage standard,Clé dynamo}',                                              '{Stylo à peinture bleue}',                      "E'", 'H'],
      ['OP-006', 'RS-DL',             'Retrofit Structure Demi-Lunes',     1.5, 2, '{Outillage standard,Riveteuse pneumatique}',                                    '{}',                                            "E'", 'H'],
      ['OP-007', 'CR-ROT',            'Retrofit Chariot Rotation',         2,   2, '{Outillage standard}',                                                          '{}',                                            "E'", 'H'],
      ['OP-008', 'MOT-R',             'Retrofit Motorisation R',           4,   2, '{Extracteur par inertie,Outillage standard,Clé dynamo}',                         '{Socopac 65h}',                                 "E'", 'H'],
      ['OP-009', 'SRF',               'Retrofit Structure Rivetée Fixe',   1,   1, '{Outillage standard,Perceuse}',                                                 '{}',                                            "E'", 'H'],
      ['OP-010', 'LIN',               'Retrofit Linings',                  2,   2, '{Outillage standard,Perceuse Ø6}',                                              '{Film de protection,Socopac,Stylo à peinture bleue}', "E'", 'H'],
      ['OP-011', 'HAB-REG',           'Réglage des habillages',            1,   1, '{Clé dynamo 2-10 Nm,Feutre écrit métal}',                                       '{}',                                                  "E'", 'H'],
      ['OP-012', 'GOUL-CTRL',         'Vérification hauteur goulotte + mise cale', 0.5, 1, '{Réglet,Clé dynamo 5-25 Nm}',                                           '{Cale}',                                              "E'", 'H'],
      ['OP-013', 'DUB-LIN',           'Modification Dubuis sur lining',    1.5, 1, '{Outillage standard}',                                                          '{}',                                                  "E'", 'H'],
      ['OP-014', 'BPURG',             'Changement cosse bouton BPURG dans pupitre', 0.5, 1, '{Outillage standard}',                                                  '{}',                                                  "E'", 'H'],
      ['OP-015', 'MASSE-LIN',         'Changement cosse tresse de masse lining', 0.5, 1, '{Outillage standard}',                                                     '{}',                                                  "E'", 'H'],
      ['OP-016', 'BAG-MANQ',          'Pose baguettes manquantes',         1,   1, '{Outillage standard}',                                                          '{}',                                                  "E'", 'H'],
      ['OP-017', 'GOUL-CHG',          'Changement goulotte + cale',        1.5, 1, '{Outillage standard}',                                                          '{Ensemble goulotte,Cale,Visserie ISO 10642 M05x12 A4-80}', "E'", 'H'],
      ['OP-018', 'SERR-CPL',          'Serrage au couple pignon/couronne', 1,   1, '{Clé spéciale (à définir)}',                                                    '{}',                                                  "E'", 'H'],
    ]

    // Steps per operation
    const opSteps = {
      'OP-001': [
        'Dévisser les VIS TETE BOMBEE M4X20 fixant la demi-lune sur la structure DL',
        'Basculer la demi-lune pour accéder au connecteur bord sensible et câble de terre',
        "Dévisser l'écrou M6 fixant le câble de terre",
        'Débrancher le connecteur bord sensible vertical',
        'Retirer la demi-lune — rédiger FNC si ancienne référence, mettre en isolement',
        'Installer les nouvelles demi-lunes (nouvelle référence)',
        'Procéder en sens inverse pour le remontage — serrage manuel',
      ],
      'OP-002': [
        'Démonter les demi-lunes si montées',
        'Dévisser les 2 écrous fixant le rail alu du bord sensible sur la demi-lune',
        'Exploser tous les rislans cheminant le câble du bord sensible',
        'Retirer le bord sensible',
        'Installer nouveau bord sensible ELE016/020A0V3/1/265/05/8K',
        'Serrage au couple 8.6 Nm + marquage continu bleu sur assemblage boulonné',
        'Refaire le cheminement câble avec rislans neufs',
      ],
      'OP-003': [
        'Retirer les demi-lunes pour accéder à la zone motorisation',
        'Dévisser les 4 vis M06X016 structure rivetée demi-lune sur plateforme',
        'Dévisser les 2 vis M06X025 fixant sur blocs galet',
        'Démonter pièce rep 3255',
        "Mettre en place pièces X et Y dans l'ordre défini — vérifier plagage et alignement",
        "À l'aide d'un marqueur, localiser les trous sur bâti via pré-perçages",
        'Retirer toutes les pièces — percer à Ø5 les 3 trous — tarauder en M6',
        'Remettre tous les éléments et fixer pièces X et Y (vis hex + tiges filetées)',
        'Régler positionnement : desserrer 3 vis M8×30, faire pivoter LIFT g/d en appuyant motorisation contre crémaillère',
        "Serrer vis butée M6 manuellement, puis desserrer d'1/4 de tour — reculer motorisation en appui",
        'Serrer 3 vis M8×30 au couple, serrer écrou blocage à 6,7 N·m — appliquer Socopac 65h',
      ],
      'OP-004': [
        "Monter le LIFT en position haute à l'aide de la manivelle",
        'Retirer linings extérieurs rep 753 pour accès câble bord sensible',
        'Débrancher bord sensible inférieur (harness W147)',
        'Dévisser 10 écrous M04 fixant bord sensible inférieur sur supérieur',
        'Retirer le bord sensible inférieur',
        'Dévisser 5 VIS TETE H M05X012 support partie haute soufflet',
        'Dévisser 9 VIS FHC M5X016 support partie basse soufflet (clé Allen raccourcie)',
        'Dévisser 2 tiges filetées 3521, retirer le soufflet',
        'Installation en sens inverse du démontage',
        'Partie basse : couple 5 N·m + marquage bleu | Bord sensible : 2.5 N·m + marquage bleu',
      ],
      'OP-005': [
        'Monter LIFT avec manivelle',
        'Retirer linings extérieurs rep 753',
        'Débrancher câbles bords sensibles supérieur (W154) et inférieur (W147)',
        'Desserrer 10 écrous M04 support bord sensible inférieur (accessibilité)',
        'Dévisser 9 écrous support bord sensible supérieur sur plateforme',
        "Retirer l'ensemble bords sensibles",
        'Installer nouvel ensemble bords sensibles',
        'Serrage au couple 2.5 N·m + marquage continu bleu',
      ],
      'OP-006': [
        'Dévisser 4 vis M06X016 structure rivetée demi-lune sur plateforme',
        'Dévisser 2 vis M06X025 fixant sur blocs galet',
        'Exploser les rivets fixant rep A sur rep X',
        'Exploser les rivets fixant rep B sur rep X',
        'Rédiger FNC — mettre pièces A et B en isolement',
        "Riveter pièce A' sur rep X",
        "Riveter pièce B' sur rep X",
        'Remonter structure demi-lune : 4 vis M06X016 + 2 vis M06X025',
      ],
      'OP-007': [
        'Phase 1 — Dégagement : dévisser 4 vis H M6X16 + 2 vis H M6X25, retirer structure rivetée demi-lunes',
        'Phase 2 — Dévisser 5 vis TETE H M8X40 + rondelle cs sur chariot galet',
        'Garder uniquement les galets CF10 — mettre autres pièces en isolement',
        'Rédiger FNC pour chaque pièce isolée',
        'Monter nouveaux chariots de rotation selon gamme de montage',
      ],
      'OP-008': [
        'Dévisser 4 FHC M06X20',
        'Extraire 2 goupilles 06X16 par extracteur à inertie',
        'Retirer pièce rep 3631 puis rep 1086 puis rep 3612',
        'Retirer ensemble X (planétaire + satellite + pignon 1084 + rep 1085 + rondelle igus 1091) — À GARDER',
        'Démonter moteur Dunker : dévisser 4 VIS M04X25',
        'Dégoupiller couronne 1087 — À GARDER — rédiger FNC pour pièces isolées',
        'Remonter motorisation selon gamme de montage nouvelle configuration',
        'Régler position pignon/crémaillère (desserrer 3 vis M8×30, pivoter LIFT g/d)',
        "Serrer vis butée M6 + recul d'appui + serrer 3 vis M8×30 au couple",
        'Protéger boulons avec Socopac 65h',
      ],
      'OP-009': [
        'Démonter ancienne came en dévissant 2 VIS M04X16',
        'Percer le 3e trou aux cotes 39 mm et 41 mm',
        'Remplacer avec nouvelle came ref 4206',
        'Rédiger FNC — mettre ancienne came en isolement',
      ],
      'OP-010': [
        'Équiper zone à percer avec film de protection (scotch)',
        'Localiser les points de perçage selon illustration',
        'Percer les linings (Ø = 6 mm)',
        'Enlever le film de protection',
        'Appliquer Socopac sur les goujons',
        'Monter baguettes rep 3551 sur linings — fixer Rondelle Cs M04 + Écrou M04 à 2.0 N·m',
        'Monter rep 3552 et rep 3553 en séquence — fixer à 2.0 N·m',
        'Marquage continu bleu sur tous les assemblages',
      ],
    }

    for (const o of ops) {
      const stepsArr = opSteps[o[0]] || []
      await client.query(
        `INSERT INTO retrofit_operations (id, code, title, estimated_hours, personnel, tools, consumables, steps, from_config, to_config)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
        [o[0], o[1], o[2], o[3], o[4], o[5], o[6], `{${stepsArr.map(s => '"' + s.replace(/"/g, '\\"') + '"').join(',')}}`, o[7], o[8]]
      )
    }

    // ─── Operation Parts ───
    const opParts = [
      ['OP-001', 'VIS M4X20 NOIR',     6, 'ISO_07380'],
      ['OP-002', 'ECROU M6',           2, 'ISO_04032'],
      ['OP-002', 'Rondelle Cs M6',     1, 'ISO_645156'],
      ['OP-003', 'VIS TETE H M06X30',  4, 'ISO_1234'],
      ['OP-003', 'Tige filetée M6',    2, 'TF_M6'],
      ['OP-003', 'Rondelle Cs M06',    4, 'ISO_645156'],
      ['OP-003', 'Écrou M06',          4, 'ISO_04032'],
      ['OP-004', 'VIS TETE H M05X016', 9, 'ISO_10642'],
      ['OP-004', 'VIS FHC M5X12',      9, 'ISO_10642'],
      ['OP-004', 'ECROU M4',          10, 'ISO_04032'],
      ['OP-005', 'ECROU M4',          19, 'ISO_04032'],
      ['OP-006', 'VIS M06X016',        4, 'ISO_07380'],
      ['OP-006', 'VIS M06X025',        2, 'ISO_07380'],
      ['OP-007', 'VIS TETE H M8X40',   5, 'ISO_10642'],
      ['OP-007', 'RONDELLE CS M08',    5, 'ISO_7094'],
      ['OP-008', 'FHC M06X20',         4, 'ISO_10642'],
      ['OP-008', 'GOUPILLE 03X16',     2, 'ISO_8734'],
      ['OP-009', 'Came ref 4206',      1, '4206'],
      ['OP-009', 'VIS M04X16',         2, 'ISO_07380'],
      ['OP-010', 'Rep 3551',           2, '3551'],
      ['OP-010', 'Rep 3552',           2, '3552'],
      ['OP-010', 'Rep 3553',           2, '3553'],
      ['OP-010', 'Rondelle Cs M04',    8, 'ISO_7094'],
      ['OP-010', 'Écrou M04',          8, 'ISO_04032'],
      ['OP-011', 'Habillages int/ext (paire)', 1, 'HAB-PAIR'],
      ['OP-012', 'Cale',               1, 'CALE-GOUL'],
      ['OP-016', 'Baguette',           2, 'HS00001139767'],
      ['OP-016', 'Baguette',           2, 'HS000011397770'],
      ['OP-017', 'Ensemble goulotte',  1, 'GOUL-ENS'],
      ['OP-017', 'Cale goulotte',      1, 'CALE-GOUL'],
      ['OP-017', 'Visserie ISO 10642 M05x12 A4-80', 10, 'ISO_10642_M05x12'],
    ]
    for (const p of opParts) {
      await client.query(
        `INSERT INTO operation_parts (operation_id, designation, quantity, reference) VALUES ($1,$2,$3,$4)`, p)
    }

    // ─── Work Orders ───
    const workOrders = [
      ['OT-2025-001', 'retrofit',  'en-cours',          'LIFT-001', 'ALSTOM', 'Gare du Nord',  'Paris',     '2025-06-10', '2025-07-01', "E'", 'H', 'haute',    "Retrofit complet CONF E' → CONF H sur LIFT-001. Gamme RETROFIT E'-H MECA phase 1 terminée. Phase motorisation Z en cours.", null],
      ['OT-2025-002', 'retrofit',  'planifie',          'LIFT-003', 'ALSTOM', 'Saint-Jean',    'Bordeaux',  '2025-06-15', '2025-08-05', "E'", 'H', 'haute',    "Retrofit CONF E' → CONF H. Planning définitif à confirmer avec ALSTOM Bordeaux — pièces en commande.", null],
      ['OT-2025-003', 'correctif', 'en-cours',          'LIFT-005', 'ALSTOM', 'Matabiau',      'Toulouse',  '2025-06-22', '2025-06-25', null,  null, 'critique', 'Défaut motorisation Z — vibrations anormales au niveau du tambour. Diagnostic en cours, FNC ouverte.', null],
      ['OT-2025-004', 'preventif', 'planifie',          'LIFT-002', 'ALSTOM', 'Part-Dieu',     'Lyon',      '2025-06-20', '2025-07-15', null,  null, 'normale',  'Maintenance préventive semestrielle LIFT-002 CONF G. Vérification galets, bords sensibles et harnais.', null],
      ['OT-2026-005', 'correctif', 'planifie',          'TR15',     'ALSTOM', 'Gare de Belfort','Belfort',  '2026-03-18', '2026-03-18', "E'", 'H', 'haute',    'Mission Belfort TR15 — 8 opérations : soufflet, bord sensible/demi-lune, habillages, motorisation R, goulotte, Dubuis lining, cosse BPURG, cosse tresse de masse.', 'Mission du 18 au 21 mars 2026.'],
      ['OT-2026-006', 'correctif', 'planifie',          'TR18',     'ALSTOM', 'Gare de Belfort','Belfort',  '2026-03-18', '2026-03-18', "E'", 'H', 'haute',    'Mission Belfort TR18 — 8 opérations : motorisation R, baguettes manquantes, goulotte tordue, habillages, Dubuis lining, cosse BPURG, cosse tresse de masse, serrage au couple.', 'Mission du 18 au 21 mars 2026. Attention outillage spécial pignon/couronne.'],
    ]
    for (const wo of workOrders) {
      await client.query(
        `INSERT INTO work_orders (id, type, status, unit_id, client, site, city, created_date, planned_date, from_config, to_config, priority, description, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`, wo)
    }

    // WO ↔ Technicians
    const woTechs = [
      ['OT-2025-001', 'TECH-01'],
      ['OT-2025-002', 'TECH-04'],
      ['OT-2025-003', 'TECH-01'],
      ['OT-2025-003', 'TECH-02'],
      ['OT-2025-004', 'TECH-03'],
    ]
    for (const wt of woTechs) {
      await client.query(
        `INSERT INTO work_order_technicians (work_order_id, technician_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, wt)
    }

    // ─── WO Operations ───
    // OT-2025-001: all 10 ops
    const ot001Ops = [
      ['OT-2025-001', 'OP-001', 'fait',     null,       '2025-07-01', null],
      ['OT-2025-001', 'OP-002', 'fait',     null,       '2025-07-01', null],
      ['OT-2025-001', 'OP-003', 'en-cours', 'TECH-01',  null,         null],
      ['OT-2025-001', 'OP-004', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-005', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-006', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-007', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-008', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-009', 'attente',  null,        null,         null],
      ['OT-2025-001', 'OP-010', 'attente',  null,        null,         null],
    ]
    // OT-2025-002: all 10 ops (all attente)
    const ot002Ops = Array.from({ length: 10 }, (_, i) =>
      ['OT-2025-002', `OP-${String(i + 1).padStart(3, '0')}`, 'attente', null, null, null]
    )
    // OT-2025-003: 1 op
    const ot003Ops = [
      ['OT-2025-003', 'OP-003', 'en-cours', 'TECH-01', null, 'Vibration anormale détectée sur tambour — attente expertise motorisation Z'],
    ]
    // OT-2026-005: TR15 Belfort (8 ops)
    const otTR15Ops = [
      ['OT-2026-005', 'OP-004', 'attente', null, null, 'Soufflet à finir d\'installer'],
      ['OT-2026-005', 'OP-001', 'attente', null, null, 'Frottement bord sensible avec demi-lune'],
      ['OT-2026-005', 'OP-011', 'attente', null, null, 'Réglage des habillages'],
      ['OT-2026-005', 'OP-008', 'attente', null, null, 'Motorisation R à changer'],
      ['OT-2026-005', 'OP-012', 'attente', null, null, 'Vérification hauteur goulotte + mise cale'],
      ['OT-2026-005', 'OP-013', 'attente', null, null, 'Modification Dubuis sur lining'],
      ['OT-2026-005', 'OP-014', 'attente', null, null, 'Changement cosse bouton BPURG dans pupitre'],
      ['OT-2026-005', 'OP-015', 'attente', null, null, 'Changement cosse tresse de masse lining'],
    ]
    // OT-2026-006: TR18 Belfort (8 ops)
    const otTR18Ops = [
      ['OT-2026-006', 'OP-008', 'attente', null, null, 'Motorisation R à changer'],
      ['OT-2026-006', 'OP-016', 'attente', null, null, 'Manque 4 baguettes — 2x HS00001139767 + 2x HS000011397770'],
      ['OT-2026-006', 'OP-017', 'attente', null, null, 'Changement goulotte + cale — goulotte tordue'],
      ['OT-2026-006', 'OP-011', 'attente', null, null, 'Réglage des habillages'],
      ['OT-2026-006', 'OP-013', 'attente', null, null, 'Modification Dubuis sur lining'],
      ['OT-2026-006', 'OP-014', 'attente', null, null, 'Changement cosse bouton BPURG dans pupitre'],
      ['OT-2026-006', 'OP-015', 'attente', null, null, 'Changement cosse tresse de masse lining'],
      ['OT-2026-006', 'OP-018', 'attente', null, null, 'Serrage au couple — écrou blocage non accessible avec outillage conventionnel'],
    ]

    for (const op of [...ot001Ops, ...ot002Ops, ...ot003Ops, ...otTR15Ops, ...otTR18Ops]) {
      const { rows } = await client.query(
        `INSERT INTO work_order_operations (work_order_id, operation_id, status, technician_id, completed_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, op)

      // FNC link for OT-2025-003 / OP-003
      if (op[0] === 'OT-2025-003' && op[1] === 'OP-003') {
        await client.query(
          `INSERT INTO work_order_operation_fncs (work_order_operation_id, fnc_id) VALUES ($1, $2)`,
          [rows[0].id, 'FNC-2025-001']
        )
      }
    }

    // ─── FNCs ───
    await client.query(
      `INSERT INTO fncs (id, work_order_id, date, part_reference, description, status)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      ['FNC-2025-001', 'OT-2025-003', '2025-06-23', '109414-0003-3200',
       'Vibration anormale tambour motorisation Z — isolement requis, remplacement à planifier', 'ouverte']
    )

    // ─── Parts Alerts ───
    const alerts = [
      ['PA-001', 'Motorisation Z 109414-0003-3200', '109414-0003-3200', 0, 2, 'OT-2025-001', 'Paris'],
      ['PA-002', 'Bord sensible ELE016/020A0V3',    'ELE016/020A0V3',   1, 3, 'OT-2025-002', 'Bordeaux'],
      ['PA-003', 'Chariot rotation CF10',            'CF10',             2, 4, 'OT-2025-001', 'Paris'],
    ]
    for (const a of alerts) {
      await client.query(
        `INSERT INTO parts_alerts (id, designation, reference, stock_actuel, stock_min, linked_ot, site)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, a)
    }

    // ─── Gammes ───
    const gammes = [
      ['PSF000000128', 'PARTIE FIXE LIFT',                   'PARTIE FIXE',   'MECA', '{F}',       'Structure',          'H'],
      ['PSF000000129', 'PARTIE MOBILE LIFT',                 'PARTIE MOBILE', 'MECA', '{F}',       'Structure',          'H'],
      ['PSF000000133', 'HANDRAIL DROIT',                     'PARTIE MOBILE', 'MECA', '{F}',       'Handrail',           'H'],
      ['PSF000000134', 'HANDRAIL GAUCHE',                    'PARTIE MOBILE', 'MECA', '{F}',       'Handrail',           'H'],
      ['PSF000000135', 'MOTORISATION Z',                     'PARTIE MOBILE', 'MECA', '{F}',       'Motorisation',       'H'],
      ['PSF000000137', 'STRUCTURE RIVETEE FIXE',             'PARTIE FIXE',   'MECA', '{F,G}',     'Structure rivetée',  'H'],
      ['PSF000000138', 'STRUCTURE RIVETEE MOBILE ROTATION',  'PARTIE MOBILE', 'MECA', '{F}',       'Structure rivetée',  'H'],
      ['PSF000000139', 'STRUCTURE RIVETEE MOBILE LEVAGE',    'PARTIE MOBILE', 'MECA', '{F}',       'Structure rivetée',  'H'],
      ['PSF000000140', 'STRUCTURE RIVETEE DEMI LUNE',        'PARTIE MOBILE', 'MECA', '{F,G,H}',   'Structure rivetée',  'H'],
      ['PSF000000141', 'LININGS ET DEMI LUNES',              'PARTIE MOBILE', 'MECA', '{F,H}',     'Linings',            'H'],
      ['PSF000000314', 'MOTORISATION ROTATION',              'PARTIE FIXE',   'MECA', '{F,G}',     'Motorisation',       'H'],
      ['PSF000000132', 'COFFRET PUISSANCE',                  'PARTIE FIXE',   'ELEC', '{F}',       'Coffret',            'H'],
      ['PSF000000136', 'COFFRET AUTOMATE',                   'PARTIE FIXE',   'ELEC', '{F}',       'Coffret',            'H'],
      ['PSF000000131', 'COFFRET EMBARQUE',                   'PARTIE MOBILE', 'ELEC', '{F}',       'Coffret',            'H'],
      ['PSF000000434', 'GOULOTTE PARTIE FIXE',               'PARTIE FIXE',   'ELEC', '{F,G}',     'Câblage',            'H'],
      ['PSF000000319', 'BORNIER COFFRET AUTOMATE',           'PARTIE FIXE',   'ELEC', '{F}',       'Câblage',            'H'],
      ['PSF000000320', 'BORNIER COFFRET PUISSANCE',          'PARTIE FIXE',   'ELEC', '{F}',       'Câblage',            'H'],
      ['PSF000000321', 'BORNIER COFFRET EMBARQUE',           'PARTIE MOBILE', 'ELEC', '{F}',       'Câblage',            'H'],
      ['PSF000000329', 'HARNAIS W006',                       'PARTIE FIXE',   'ELEC', '{F}',       'Harnais',            'H'],
      ['PSF000000330', 'HARNAIS W007',                       'PARTIE FIXE',   'ELEC', '{F}',       'Harnais',            'H'],
      ['PSF000000424', 'HARNAIS W001 W002 W004',             'PARTIE FIXE',   'ELEC', '{F}',       'Harnais',            'H'],
      ['PSF000000345', 'HARNAIS PM W105',                    'PARTIE MOBILE', 'ELEC', '{F}',       'Harnais',            'H'],
      ['PSF000000387', 'HARNAIS PM W147',                    'PARTIE MOBILE', 'ELEC', '{F}',       'Harnais',            'H'],
      ['PSF000000432', 'TOLE PUPITRE GAUCHE',                'PARTIE MOBILE', 'ELEC', '{F}',       'Pupitre',            'H'],
      ['PSF000000433', 'TOLE PUPITRE DROIT',                 'PARTIE MOBILE', 'ELEC', '{F}',       'Pupitre',            'H'],
    ]
    for (const g of gammes) {
      await client.query(
        `INSERT INTO gammes (id, title, section, discipline, configs, category, revision)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`, g)
    }

    // Gamme documents
    const gammeDocs = {
      'PSF000000128': ['Gamme assemblage CHASSIS FIXE CONF G.pptx', "Gamme d'assemblage Outillage P.FIXE.pptx", "RETROFIT E' - H  partie fixe.pptx"],
      'PSF000000129': ['GAMME MONTAGE BMP CONF F.pptx', 'GAMME MONTAGE BMP SUR PM CONF G.pptx', 'REGLAGE GALETS PARTIE MOBILE REV 2 CONF F.pptx'],
      'PSF000000133': ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'],
      'PSF000000134': ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'],
      'PSF000000135': ['GAMME MONTAGE  MOTORISATION Z CONF F rev 2.pptx', 'GAMME MONTAGE MOTORISATION Z CONF F rev 0.pptx', 'Powerpoint Gamme-60Z-Assemblage MOTORISATION Z.pptx'],
      'PSF000000137': ["RETROFIT E' - H  partie fixe.pptx"],
      'PSF000000138': ['ALSTOM Gamme-130-Assemblage STRUCTURE RIVETEE ROTATION.pptx', 'Gamme assemblage STRUCTURE RIVETEE ROTATION CONF F.pptx'],
      'PSF000000139': ['ALSTOM Gamme-200-Assemblage STRUCTURE RIVETEE LEVAGE.pptx', 'Gamme assemblage STRUCTURE RIVETEE LEVAGE CONF F.pptx', 'GAMME ASSEMBLAGE STRUCTURE LEVAGE DANS LA ROTATION CONF F.pptx'],
      'PSF000000140': ['GAMME MONTAGE STRUCTURE RIVETEE DEMI LUNES CONF F.pptx'],
      'PSF000000141': ['GAMME PREPARATION LINING  CONF H.pptx', 'GAMME RETROFIT LINING CONF F VERS CONF G.pptx'],
      'PSF000000314': ['GAMME MONTAGE MOTORISATION R CONF F.pptx', 'GAMME MONTAGE MOTORISATION R DANS PARTIE MOBILE CON F.pptx', 'Powerpoint Gamme-60R-ASSEMBLAGE MOTORISATION R.pptx'],
      'PSF000000434': ['MONTAGE Goulotte lift alstom CONF G.pptx'],
      'PSF000000432': ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'],
      'PSF000000433': ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'],
    }
    for (const [gid, docs] of Object.entries(gammeDocs)) {
      for (const doc of docs) {
        await client.query('INSERT INTO gamme_documents (gamme_id, filename) VALUES ($1, $2)', [gid, doc])
      }
    }

    await client.query('COMMIT')
    console.log('[SEED] ✓ All data inserted successfully')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[SEED] ✗ Error:', err.message)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch(() => process.exit(1))
