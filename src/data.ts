// ─────────────────────────────────────────────────────────────
// DOMAINE : LIFT – Plateforme élévatrice industrielle (LIFT ALSTOM)
// Configurations produit : CONF E' → F → G → H → I
// Sections : PARTIE FIXE | PARTIE MOBILE  ×  MECA | ELEC
// ─────────────────────────────────────────────────────────────

export type Configuration = "E'" | 'F' | 'G' | 'H' | 'I'
export type Section = 'PARTIE FIXE' | 'PARTIE MOBILE'
export type Discipline = 'MECA' | 'ELEC'
export type UnitStatus = 'operational' | 'en-retrofit' | 'en-maintenance' | 'bloque'
export type OTStatus = 'planifie' | 'en-cours' | 'en-attente-pieces' | 'termine' | 'annule'
export type OTType = 'retrofit' | 'correctif' | 'preventif' | 'inspection'
export type OpStatus = 'attente' | 'en-cours' | 'fait' | 'bloque'
export type TechSkill = 'Mecanicien' | 'Electricien' | "Chef d'equipe"
export type TechAvailability = 'disponible' | 'en-intervention' | 'indisponible'
export type OTPriority = 'basse' | 'normale' | 'haute' | 'critique'

export interface LiftUnit {
  id: string
  serialNumber: string
  client: string
  site: string
  city: string
  currentConfig: Configuration
  targetConfig?: Configuration
  status: UnitStatus
  installDate: string
  lastServiceDate: string
}

export interface PartReq {
  designation: string
  quantity: number
  reference: string
}

export interface RetrofitOperation {
  id: string
  code: string
  title: string
  estimatedHours: number
  personnel: number
  tools: string[]
  parts: PartReq[]
  consumables: string[]
  steps: string[]
  fromConfig: Configuration
  toConfig: Configuration
}

export interface WorkOrderOperation {
  operationId: string
  status: OpStatus
  technicianId?: string
  completedAt?: string
  fncs: string[]
  notes?: string
}

export interface WorkOrder {
  id: string
  type: OTType
  status: OTStatus
  unitId: string
  client: string
  site: string
  city: string
  createdDate: string
  plannedDate: string
  completedDate?: string
  fromConfig?: Configuration
  toConfig?: Configuration
  operations: WorkOrderOperation[]
  technicianIds: string[]
  priority: OTPriority
  description: string
  notes?: string
}

export interface Technician {
  id: string
  name: string
  skill: TechSkill
  city: string
  availability: TechAvailability
  activeOTs: number
}

export interface GammeAssemblage {
  id: string
  title: string
  section: Section
  discipline: Discipline
  configs: Configuration[]
  category: string
  revision: string
  documents?: string[]
}

export interface PartAlert {
  id: string
  designation: string
  reference: string
  stockActuel: number
  stockMin: number
  linkedOT: string
  site: string
}

export interface FNC {
  id: string
  workOrderId: string
  date: string
  partReference: string
  description: string
  status: 'ouverte' | 'traitee' | 'cloturee'
}

// ─────────────────────────────────────────────────────────────
// DONNÉES DE RÉFÉRENCE
// ─────────────────────────────────────────────────────────────

export const retrofitOperations: RetrofitOperation[] = [
  {
    id: 'OP-001',
    code: '109414-0003-821',
    title: 'Retrofit Demi-Lunes',
    estimatedHours: 0.5,
    personnel: 1,
    tools: ['Outillage standard', 'Clé Allen'],
    parts: [{ designation: 'VIS M4X20 NOIR', quantity: 6, reference: 'ISO_07380' }],
    consumables: [],
    steps: [
      'Dévisser les VIS TETE BOMBEE M4X20 fixant la demi-lune sur la structure DL',
      'Basculer la demi-lune pour accéder au connecteur bord sensible et câble de terre',
      "Dévisser l'écrou M6 fixant le câble de terre",
      'Débrancher le connecteur bord sensible vertical',
      'Retirer la demi-lune — rédiger FNC si ancienne référence, mettre en isolement',
      'Installer les nouvelles demi-lunes (nouvelle référence)',
      'Procéder en sens inverse pour le remontage — serrage manuel',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-002',
    code: 'ELE016/020A0V3',
    title: 'Retrofit Bord Sensible',
    estimatedHours: 0.1,
    personnel: 1,
    tools: ['Outillage standard'],
    parts: [
      { designation: 'ECROU M6', quantity: 2, reference: 'ISO_04032' },
      { designation: 'Rondelle Cs M6', quantity: 1, reference: 'ISO_645156' },
    ],
    consumables: ['Stylo à peinture bleue', 'Rislans'],
    steps: [
      'Démonter les demi-lunes si montées',
      'Dévisser les 2 écrous fixant le rail alu du bord sensible sur la demi-lune',
      'Exploser tous les rislans cheminant le câble du bord sensible',
      'Retirer le bord sensible',
      'Installer nouveau bord sensible ELE016/020A0V3/1/265/05/8K',
      'Serrage au couple 8.6 Nm + marquage continu bleu sur assemblage boulonné',
      'Refaire le cheminement câble avec rislans neufs',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-003',
    code: '109414-0003-3200',
    title: 'Retrofit Motorisation Z',
    estimatedHours: 3,
    personnel: 1,
    tools: ['Outillage standard', 'Perceuse Ø5', 'Taraud M6', 'Clé dynamo'],
    parts: [
      { designation: 'VIS TETE H M06X30', quantity: 4, reference: 'ISO_1234' },
      { designation: 'Tige filetée M6', quantity: 2, reference: 'TF_M6' },
      { designation: 'Rondelle Cs M06', quantity: 4, reference: 'ISO_645156' },
      { designation: 'Écrou M06', quantity: 4, reference: 'ISO_04032' },
    ],
    consumables: ['Socopac 65h', 'Stylo à peinture bleue'],
    steps: [
      'Retirer les demi-lunes pour accéder à la zone motorisation',
      'Dévisser les 4 vis M06X016 structure rivetée demi-lune sur plateforme',
      'Dévisser les 2 vis M06X025 fixant sur blocs galet',
      'Démonter pièce rep 3255',
      'Mettre en place pièces X et Y dans l\'ordre défini — vérifier plagage et alignement',
      'À l\'aide d\'un marqueur, localiser les trous sur bâti via pré-perçages',
      'Retirer toutes les pièces — percer à Ø5 les 3 trous — tarauder en M6',
      'Remettre tous les éléments et fixer pièces X et Y (vis hex + tiges filetées)',
      'Régler positionnement : desserrer 3 vis M8×30, faire pivoter LIFT g/d en appuyant motorisation contre crémaillère',
      'Serrer vis butée M6 manuellement, puis desserrer d\'1/4 de tour — reculer motorisation en appui',
      'Serrer 3 vis M8×30 au couple, serrer écrou blocage à 6,7 N·m — appliquer Socopac 65h',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-004',
    code: '109414-0003-313',
    title: 'Retrofit Soufflet',
    estimatedHours: 0.5,
    personnel: 1,
    tools: ['Outillage standard', 'Clé Allen raccourcie', 'Clé dynamo'],
    parts: [
      { designation: 'VIS TETE H M05X016', quantity: 9, reference: 'ISO_10642' },
      { designation: 'VIS FHC M5X12', quantity: 9, reference: 'ISO_10642' },
      { designation: 'ECROU M4', quantity: 10, reference: 'ISO_04032' },
    ],
    consumables: ['Stylo à peinture bleue'],
    steps: [
      'Monter le LIFT en position haute à l\'aide de la manivelle',
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
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-005',
    code: '109414-0003-4400',
    title: 'Retrofit Ensemble Bord Sensible',
    estimatedHours: 0.7,
    personnel: 1,
    tools: ['Outillage standard', 'Clé dynamo'],
    parts: [{ designation: 'ECROU M4', quantity: 19, reference: 'ISO_04032' }],
    consumables: ['Stylo à peinture bleue'],
    steps: [
      'Monter LIFT avec manivelle',
      'Retirer linings extérieurs rep 753',
      'Débrancher câbles bords sensibles supérieur (W154) et inférieur (W147)',
      'Desserrer 10 écrous M04 support bord sensible inférieur (accessibilité)',
      'Dévisser 9 écrous support bord sensible supérieur sur plateforme',
      'Retirer l\'ensemble bords sensibles',
      'Installer nouvel ensemble bords sensibles',
      'Serrage au couple 2.5 N·m + marquage continu bleu',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-006',
    code: 'RS-DL',
    title: 'Retrofit Structure Demi-Lunes',
    estimatedHours: 1.5,
    personnel: 2,
    tools: ['Outillage standard', 'Riveteuse pneumatique'],
    parts: [
      { designation: 'VIS M06X016', quantity: 4, reference: 'ISO_07380' },
      { designation: 'VIS M06X025', quantity: 2, reference: 'ISO_07380' },
    ],
    consumables: [],
    steps: [
      'Dévisser 4 vis M06X016 structure rivetée demi-lune sur plateforme',
      'Dévisser 2 vis M06X025 fixant sur blocs galet',
      'Exploser les rivets fixant rep A sur rep X',
      'Exploser les rivets fixant rep B sur rep X',
      'Rédiger FNC — mettre pièces A et B en isolement',
      'Riveter pièce A\' sur rep X',
      'Riveter pièce B\' sur rep X',
      'Remonter structure demi-lune : 4 vis M06X016 + 2 vis M06X025',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-007',
    code: 'CR-ROT',
    title: 'Retrofit Chariot Rotation',
    estimatedHours: 2,
    personnel: 2,
    tools: ['Outillage standard'],
    parts: [
      { designation: 'VIS TETE H M8X40', quantity: 5, reference: 'ISO_10642' },
      { designation: 'RONDELLE CS M08', quantity: 5, reference: 'ISO_7094' },
    ],
    consumables: [],
    steps: [
      'Phase 1 — Dégagement : dévisser 4 vis H M6X16 + 2 vis H M6X25, retirer structure rivetée demi-lunes',
      'Phase 2 — Dévisser 5 vis TETE H M8X40 + rondelle cs sur chariot galet',
      'Garder uniquement les galets CF10 — mettre autres pièces en isolement',
      'Rédiger FNC pour chaque pièce isolée',
      'Monter nouveaux chariots de rotation selon gamme de montage',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-008',
    code: 'MOT-R',
    title: 'Retrofit Motorisation R',
    estimatedHours: 4,
    personnel: 2,
    tools: ['Extracteur par inertie', 'Outillage standard', 'Clé dynamo'],
    parts: [
      { designation: 'FHC M06X20', quantity: 4, reference: 'ISO_10642' },
      { designation: 'GOUPILLE 03X16', quantity: 2, reference: 'ISO_8734' },
    ],
    consumables: ['Socopac 65h'],
    steps: [
      'Dévisser 4 FHC M06X20',
      'Extraire 2 goupilles 06X16 par extracteur à inertie',
      'Retirer pièce rep 3631 puis rep 1086 puis rep 3612',
      'Retirer ensemble X (planétaire + satellite + pignon 1084 + rep 1085 + rondelle igus 1091) — À GARDER',
      'Démonter moteur Dunker : dévisser 4 VIS M04X25',
      'Dégoupiller couronne 1087 — À GARDER — rédiger FNC pour pièces isolées',
      'Remonter motorisation selon gamme de montage nouvelle configuration',
      'Régler position pignon/crémaillère (desserrer 3 vis M8×30, pivoter LIFT g/d)',
      'Serrer vis butée M6 + recul d\'appui + serrer 3 vis M8×30 au couple',
      'Protéger boulons avec Socopac 65h',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-009',
    code: 'SRF',
    title: 'Retrofit Structure Rivetée Fixe',
    estimatedHours: 1,
    personnel: 1,
    tools: ['Outillage standard', 'Perceuse'],
    parts: [
      { designation: 'Came ref 4206', quantity: 1, reference: '4206' },
      { designation: 'VIS M04X16', quantity: 2, reference: 'ISO_07380' },
    ],
    consumables: [],
    steps: [
      'Démonter ancienne came en dévissant 2 VIS M04X16',
      'Percer le 3e trou aux cotes 39 mm et 41 mm',
      'Remplacer avec nouvelle came ref 4206',
      'Rédiger FNC — mettre ancienne came en isolement',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
  {
    id: 'OP-010',
    code: 'LIN',
    title: 'Retrofit Linings',
    estimatedHours: 2,
    personnel: 2,
    tools: ['Outillage standard', 'Perceuse Ø6'],
    parts: [
      { designation: 'Rep 3551', quantity: 2, reference: '3551' },
      { designation: 'Rep 3552', quantity: 2, reference: '3552' },
      { designation: 'Rep 3553', quantity: 2, reference: '3553' },
      { designation: 'Rondelle Cs M04', quantity: 8, reference: 'ISO_7094' },
      { designation: 'Écrou M04', quantity: 8, reference: 'ISO_04032' },
    ],
    consumables: ['Film de protection', 'Socopac', 'Stylo à peinture bleue'],
    steps: [
      'Équiper zone à percer avec film de protection (scotch)',
      'Localiser les points de perçage selon illustration',
      'Percer les linings (Ø = 6 mm)',
      'Enlever le film de protection',
      'Appliquer Socopac sur les goujons',
      'Monter baguettes rep 3551 sur linings — fixer Rondelle Cs M04 + Écrou M04 à 2.0 N·m',
      'Monter rep 3552 et rep 3553 en séquence — fixer à 2.0 N·m',
      'Marquage continu bleu sur tous les assemblages',
    ],
    fromConfig: "E'",
    toConfig: 'H',
  },
]

export const technicians: Technician[] = [
  { id: 'TECH-01', name: 'Ahmed Belkacem', skill: 'Mecanicien', city: 'Paris', availability: 'en-intervention', activeOTs: 2 },
  { id: 'TECH-02', name: 'Fatima Zari', skill: 'Electricien', city: 'Paris', availability: 'disponible', activeOTs: 0 },
  { id: 'TECH-03', name: "Omar Nassif", skill: "Chef d'equipe", city: 'Lyon', availability: 'en-intervention', activeOTs: 3 },
  { id: 'TECH-04', name: 'Karim Daoudi', skill: 'Mecanicien', city: 'Bordeaux', availability: 'disponible', activeOTs: 1 },
]

export const liftUnits: LiftUnit[] = [
  {
    id: 'LIFT-001', serialNumber: 'SN-ALST-2019-001',
    client: 'ALSTOM', site: 'Gare du Nord', city: 'Paris',
    currentConfig: "E'", targetConfig: 'H', status: 'en-retrofit',
    installDate: '2019-04-12', lastServiceDate: '2025-01-15',
  },
  {
    id: 'LIFT-002', serialNumber: 'SN-ALST-2021-002',
    client: 'ALSTOM', site: 'Part-Dieu', city: 'Lyon',
    currentConfig: 'G', status: 'operational',
    installDate: '2021-06-03', lastServiceDate: '2025-03-10',
  },
  {
    id: 'LIFT-003', serialNumber: 'SN-ALST-2018-003',
    client: 'ALSTOM', site: 'Saint-Jean', city: 'Bordeaux',
    currentConfig: "E'", targetConfig: 'H', status: 'en-retrofit',
    installDate: '2018-11-20', lastServiceDate: '2024-12-01',
  },
  {
    id: 'LIFT-004', serialNumber: 'SN-ALST-2022-004',
    client: 'ALSTOM', site: 'Saint-Charles', city: 'Marseille',
    currentConfig: 'H', status: 'operational',
    installDate: '2022-02-14', lastServiceDate: '2025-05-08',
  },
  {
    id: 'LIFT-005', serialNumber: 'SN-ALST-2020-005',
    client: 'ALSTOM', site: 'Matabiau', city: 'Toulouse',
    currentConfig: 'F', status: 'en-maintenance',
    installDate: '2020-08-30', lastServiceDate: '2025-04-22',
  },
  {
    id: 'LIFT-006', serialNumber: 'SN-ALST-2023-006',
    client: 'ALSTOM', site: 'Perrache', city: 'Lyon',
    currentConfig: 'I', status: 'operational',
    installDate: '2023-01-17', lastServiceDate: '2025-06-01',
  },
]

export const workOrders: WorkOrder[] = [
  {
    id: 'OT-2025-001', type: 'retrofit', status: 'en-cours',
    unitId: 'LIFT-001', client: 'ALSTOM', site: 'Gare du Nord', city: 'Paris',
    createdDate: '2025-06-10', plannedDate: '2025-07-01',
    fromConfig: "E'", toConfig: 'H',
    technicianIds: ['TECH-01'],
    priority: 'haute',
    description: "Retrofit complet CONF E' → CONF H sur LIFT-001. Gamme RETROFIT E'-H MECA phase 1 terminée. Phase motorisation Z en cours.",
    operations: [
      { operationId: 'OP-001', status: 'fait', fncs: [], completedAt: '2025-07-01' },
      { operationId: 'OP-002', status: 'fait', fncs: [], completedAt: '2025-07-01' },
      { operationId: 'OP-003', status: 'en-cours', fncs: [], technicianId: 'TECH-01' },
      { operationId: 'OP-004', status: 'attente', fncs: [] },
      { operationId: 'OP-005', status: 'attente', fncs: [] },
      { operationId: 'OP-006', status: 'attente', fncs: [] },
      { operationId: 'OP-007', status: 'attente', fncs: [] },
      { operationId: 'OP-008', status: 'attente', fncs: [] },
      { operationId: 'OP-009', status: 'attente', fncs: [] },
      { operationId: 'OP-010', status: 'attente', fncs: [] },
    ],
  },
  {
    id: 'OT-2025-002', type: 'retrofit', status: 'planifie',
    unitId: 'LIFT-003', client: 'ALSTOM', site: 'Saint-Jean', city: 'Bordeaux',
    createdDate: '2025-06-15', plannedDate: '2025-08-05',
    fromConfig: "E'", toConfig: 'H',
    technicianIds: ['TECH-04'],
    priority: 'haute',
    description: "Retrofit CONF E' → CONF H. Planning définitif à confirmer avec ALSTOM Bordeaux — pièces en commande.",
    operations: retrofitOperations.map((op) => ({
      operationId: op.id,
      status: 'attente' as OpStatus,
      fncs: [],
    })),
  },
  {
    id: 'OT-2025-003', type: 'correctif', status: 'en-cours',
    unitId: 'LIFT-005', client: 'ALSTOM', site: 'Matabiau', city: 'Toulouse',
    createdDate: '2025-06-22', plannedDate: '2025-06-25',
    technicianIds: ['TECH-01', 'TECH-02'],
    priority: 'critique',
    description: 'Défaut motorisation Z — vibrations anormales au niveau du tambour. Diagnostic en cours, FNC ouverte.',
    operations: [
      {
        operationId: 'OP-003', status: 'en-cours',
        fncs: ['FNC-2025-001'], technicianId: 'TECH-01',
        notes: 'Vibration anormale détectée sur tambour — attente expertise motorisation Z',
      },
    ],
  },
  {
    id: 'OT-2025-004', type: 'preventif', status: 'planifie',
    unitId: 'LIFT-002', client: 'ALSTOM', site: 'Part-Dieu', city: 'Lyon',
    createdDate: '2025-06-20', plannedDate: '2025-07-15',
    technicianIds: ['TECH-03'],
    priority: 'normale',
    description: 'Maintenance préventive semestrielle LIFT-002 CONF G. Vérification galets, bords sensibles et harnais.',
    operations: [],
  },
]

export const gammes: GammeAssemblage[] = [
  { id: 'PSF000000128', title: 'PARTIE FIXE LIFT', section: 'PARTIE FIXE', discipline: 'MECA', configs: ['F'], category: 'Structure', revision: 'H', documents: ['Gamme assemblage CHASSIS FIXE CONF G.pptx', "Gamme d'assemblage Outillage P.FIXE.pptx", "RETROFIT E' - H  partie fixe.pptx"] },
  { id: 'PSF000000129', title: 'PARTIE MOBILE LIFT', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Structure', revision: 'H', documents: ['GAMME MONTAGE BMP CONF F.pptx', 'GAMME MONTAGE BMP SUR PM CONF G.pptx', 'REGLAGE GALETS PARTIE MOBILE REV 2 CONF F.pptx'] },
  { id: 'PSF000000133', title: 'HANDRAIL DROIT', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Handrail', revision: 'H', documents: ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'] },
  { id: 'PSF000000134', title: 'HANDRAIL GAUCHE', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Handrail', revision: 'H', documents: ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'] },
  { id: 'PSF000000135', title: 'MOTORISATION Z', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Motorisation', revision: 'H', documents: ['GAMME MONTAGE  MOTORISATION Z CONF F rev 2.pptx', 'GAMME MONTAGE MOTORISATION Z CONF F rev 0.pptx', 'Powerpoint Gamme-60Z-Assemblage MOTORISATION Z.pptx'] },
  { id: 'PSF000000137', title: 'STRUCTURE RIVETEE FIXE', section: 'PARTIE FIXE', discipline: 'MECA', configs: ['F', 'G'], category: 'Structure rivetée', revision: 'H', documents: ["RETROFIT E' - H  partie fixe.pptx"] },
  { id: 'PSF000000138', title: 'STRUCTURE RIVETEE MOBILE ROTATION', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Structure rivetée', revision: 'H', documents: ['ALSTOM Gamme-130-Assemblage STRUCTURE RIVETEE ROTATION.pptx', 'Gamme assemblage STRUCTURE RIVETEE ROTATION CONF F.pptx'] },
  { id: 'PSF000000139', title: 'STRUCTURE RIVETEE MOBILE LEVAGE', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F'], category: 'Structure rivetée', revision: 'H', documents: ['ALSTOM Gamme-200-Assemblage STRUCTURE RIVETEE LEVAGE.pptx', 'Gamme assemblage STRUCTURE RIVETEE LEVAGE CONF F.pptx', 'GAMME ASSEMBLAGE STRUCTURE LEVAGE DANS LA ROTATION CONF F.pptx'] },
  { id: 'PSF000000140', title: 'STRUCTURE RIVETEE DEMI LUNE', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F', 'G', 'H'], category: 'Structure rivetée', revision: 'H', documents: ['GAMME MONTAGE STRUCTURE RIVETEE DEMI LUNES CONF F.pptx'] },
  { id: 'PSF000000141', title: 'LININGS ET DEMI LUNES', section: 'PARTIE MOBILE', discipline: 'MECA', configs: ['F', 'H'], category: 'Linings', revision: 'H', documents: ['GAMME PREPARATION LINING  CONF H.pptx', 'GAMME RETROFIT LINING CONF F VERS CONF G.pptx'] },
  { id: 'PSF000000314', title: 'MOTORISATION ROTATION', section: 'PARTIE FIXE', discipline: 'MECA', configs: ['F', 'G'], category: 'Motorisation', revision: 'H', documents: ['GAMME MONTAGE MOTORISATION R CONF F.pptx', 'GAMME MONTAGE MOTORISATION R DANS PARTIE MOBILE CON F.pptx', 'Powerpoint Gamme-60R-ASSEMBLAGE MOTORISATION R.pptx'] },
  { id: 'PSF000000132', title: 'COFFRET PUISSANCE', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Coffret', revision: 'H' },
  { id: 'PSF000000136', title: 'COFFRET AUTOMATE', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Coffret', revision: 'H' },
  { id: 'PSF000000131', title: 'COFFRET EMBARQUE', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Coffret', revision: 'H' },
  { id: 'PSF000000434', title: 'GOULOTTE PARTIE FIXE', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F', 'G'], category: 'Câblage', revision: 'H', documents: ['MONTAGE Goulotte lift alstom CONF G.pptx'] },
  { id: 'PSF000000319', title: 'BORNIER COFFRET AUTOMATE', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Câblage', revision: 'H' },
  { id: 'PSF000000320', title: 'BORNIER COFFRET PUISSANCE', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Câblage', revision: 'H' },
  { id: 'PSF000000321', title: 'BORNIER COFFRET EMBARQUE', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Câblage', revision: 'H' },
  { id: 'PSF000000329', title: 'HARNAIS W006', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Harnais', revision: 'H' },
  { id: 'PSF000000330', title: 'HARNAIS W007', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Harnais', revision: 'H' },
  { id: 'PSF000000424', title: 'HARNAIS W001 W002 W004', section: 'PARTIE FIXE', discipline: 'ELEC', configs: ['F'], category: 'Harnais', revision: 'H' },
  { id: 'PSF000000345', title: 'HARNAIS PM W105', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Harnais', revision: 'H' },
  { id: 'PSF000000387', title: 'HARNAIS PM W147', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Harnais', revision: 'H' },
  { id: 'PSF000000432', title: 'TOLE PUPITRE GAUCHE', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Pupitre', revision: 'H', documents: ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'] },
  { id: 'PSF000000433', title: 'TOLE PUPITRE DROIT', section: 'PARTIE MOBILE', discipline: 'ELEC', configs: ['F'], category: 'Pupitre', revision: 'H', documents: ['GAMME MONTAGE  HANDRAIL +Pupitre CONF F.pptx'] },
]

export const partsAlerts: PartAlert[] = [
  { id: 'PA-001', designation: 'Motorisation Z 109414-0003-3200', reference: '109414-0003-3200', stockActuel: 0, stockMin: 2, linkedOT: 'OT-2025-001', site: 'Paris' },
  { id: 'PA-002', designation: 'Bord sensible ELE016/020A0V3', reference: 'ELE016/020A0V3', stockActuel: 1, stockMin: 3, linkedOT: 'OT-2025-002', site: 'Bordeaux' },
  { id: 'PA-003', designation: 'Chariot rotation CF10', reference: 'CF10', stockActuel: 2, stockMin: 4, linkedOT: 'OT-2025-001', site: 'Paris' },
]

export const fncs: FNC[] = [
  {
    id: 'FNC-2025-001', workOrderId: 'OT-2025-003', date: '2025-06-23',
    partReference: '109414-0003-3200',
    description: 'Vibration anormale tambour motorisation Z — isolement requis, remplacement à planifier',
    status: 'ouverte',
  },
]