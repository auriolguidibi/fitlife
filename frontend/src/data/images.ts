import type { Meal, Workout } from '@/types'

/**
 * Registre central des visuels de l'app (photos Unsplash, licence libre).
 * Les images sont résolues au rendu à partir des noms / types : aucune donnée
 * persistée (localStorage ou API) n'a besoin de stocker d'URL.
 */
const unsplash = (id: string, w = 800, h?: number, faces = false) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=75&w=${w}${h ? `&h=${h}` : ''}${faces ? '&crop=faces' : ''}`

export const img = (id: string, w = 800, h?: number) => unsplash(id, w, h)

/* ---------- Portraits (coachs & membres) ---------- */

const portraitIds: Record<string, string> = {
  // Coachs
  'coach awa': 'photo-1590955256762-e60f6e08122a',
  'coach amina': 'photo-1573497161161-c3e73707e25c',
  'coach koffi': 'photo-1783012039560-5690190a9b9b',
  'coach david': 'photo-1595211877493-41a4e5f236b3',
  // Membres
  charly: 'photo-1612213993024-b0ed04dfb248',
  amina: 'photo-1508002366005-75a695ee2d17',
  koffi: 'photo-1659422440915-d516c6dc932e',
  fatou: 'photo-1668752741330-8adc5cef7485',
  yawa: 'photo-1668752515680-075bf648d8fa',
  moussa: 'photo-1625181796571-7f0d4571ab12',
  grace: 'photo-1648557649474-3fa0d0c63bd5',
  ibrahim: 'photo-1659422440143-9329dd06298c',
  nadia: 'photo-1632765854612-9b02b6ec2b15',
  serge: 'photo-1612720572242-fefde96650f6',
  linda: 'photo-1606914707708-5180546f153d',
  paul: 'photo-1614807536394-cd67bd4a634b',
  esther: 'photo-1593351799227-75df2026356b',
  eric: 'photo-1562173650-f61426fbe683',
  sarah: 'photo-1723922967349-d54aabf4084d',
}

/** Portrait associé à un nom (« Coach Awa », « Charly DIALLO », « Fatou »…). */
export function portraitFor(name?: string, size = 160): string | undefined {
  if (!name) return undefined
  const full = name.trim().toLowerCase()
  const first = full.replace(/^coach\s+/, '').split(/\s+/)[0]
  const id = portraitIds[full] ?? portraitIds[full.split(/\s+/).slice(0, 2).join(' ')] ?? portraitIds[first]
  return id ? unsplash(id, size, size, true) : undefined
}

/* ---------- Séances ---------- */

const workoutIds: Record<Workout['type'], string> = {
  full_body: 'photo-1646938863839-4d49ded55765',
  cardio: 'photo-1631899560971-394ded28a80f',
  legs: 'photo-1599238432775-93c2e6661b46',
  abs: 'photo-1635863870541-286925d89030',
  upper_body: 'photo-1616803689943-5601631c7fec',
  mobility: 'photo-1649888639789-b611bc359d9b',
}

export const workoutImage = (type: Workout['type'], w = 800) => unsplash(workoutIds[type], w, Math.round(w * 0.6))

/* ---------- Repas ---------- */

const mealIdsByName: [RegExp, string][] = [
  [/omelette/i, 'photo-1668283653825-37b80f055b05'],
  [/bouillie|mil/i, 'photo-1633800184562-06505a999552'],
  [/avocat/i, 'photo-1687102624999-2615998b3ee5'],
  [/riz \+ poisson/i, 'photo-1611695500858-e6ac19b1ca55'],
  [/atti[ée]k[ée]/i, 'photo-1772693471187-6e7d364f99ee'],
  [/haricots|plantain/i, 'photo-1583851935475-97f6924ae98b'],
  [/patate/i, 'photo-1775039983749-aa6003c8ecf9'],
  [/poisson grill/i, 'photo-1665401015549-712c0dc5ef85'],
  [/soupe/i, 'photo-1612108438004-257c47560118'],
  [/arachide|banane/i, 'photo-1575399872095-9363bf262e64'],
  [/yaourt/i, 'photo-1530259152377-3a014e1092e0'],
  [/œufs durs|oeufs durs/i, 'photo-1614775888408-a46dfe477eb6'],
]

const mealIdsByType: Record<Meal['type'], string> = {
  breakfast: 'photo-1650330144131-84c9ba7661f4',
  lunch: 'photo-1599354607448-8ad6e92b027a',
  snack: 'photo-1550594645-25c5bd703258',
  dinner: 'photo-1598511796432-32663d0875bd',
}

export function mealImage(meal: Pick<Meal, 'name' | 'type' | 'imageUrl'>, w = 300): string {
  if (meal.imageUrl) return meal.imageUrl
  const id = mealIdsByName.find(([re]) => re.test(meal.name))?.[1] ?? mealIdsByType[meal.type]
  return unsplash(id, w, w)
}

/* ---------- Lives ---------- */

const liveIds: [RegExp, string][] = [
  [/yoga|r[ée]cup/i, 'photo-1649888639789-b611bc359d9b'],
  [/hiit|br[ûu]le/i, 'photo-1596079306903-9164c205f400'],
  [/halt[èe]res|haut du corps/i, 'photo-1583454110551-21f2fa2afe61'],
  [/abdo|gainage/i, 'photo-1635863870541-286925d89030'],
  [/dance|danse/i, 'photo-1635863872991-040c52b4cfbe'],
  [/nutrition|manger/i, 'photo-1665400808116-f0e6339b7e9a'],
  [/cardio|course|run/i, 'photo-1631899477678-9d3c5aeded2d'],
]

export function liveImage(title: string, w = 800): string {
  const id = liveIds.find(([re]) => re.test(title))?.[1] ?? 'photo-1646938863839-4d49ded55765'
  return unsplash(id, w, Math.round(w * 0.56))
}

/* ---------- Défis ---------- */

const challengeIds: Record<string, string> = {
  ch_5km: 'photo-1631899560971-394ded28a80f',
  ch_10000_steps: 'photo-1542291026-7eec264c27ff',
  ch_100km: 'photo-1590333748338-d629e4564ad9',
  ch_30_days: 'photo-1631899477678-9d3c5aeded2d',
  ch_20_sessions: 'photo-1616804167821-55eb1fab5b5d',
}

export const challengeImage = (id: string, w = 600) =>
  unsplash(challengeIds[id] ?? 'photo-1597347409198-f190c008a3bd', w, Math.round(w * 0.5))

/* ---------- Visuels de mise en page ---------- */

export const heroImages = {
  auth: unsplash('photo-1631899477678-9d3c5aeded2d', 1400),
  authMobile: unsplash('photo-1631899477678-9d3c5aeded2d', 800, 600),
  home: unsplash('photo-1649888471945-b96947250299', 1400, 700),
  nutrition: unsplash('photo-1665332111329-dd9d7fa46c74', 1400, 600),
  gym: unsplash('photo-1672344048213-76b6e77304bd', 1400, 700),
  community: unsplash('photo-1597347409198-f190c008a3bd', 1400, 600),
}

/** Bandeaux photo des en-têtes de page (voir PageHero). */
export const pageHeroes = {
  program: unsplash('photo-1646938863839-4d49ded55765', 1400, 560),
  activity: unsplash('photo-1631899560971-394ded28a80f', 1400, 560),
  leaderboard: unsplash('photo-1755877956621-5fac2eae4ebb', 1400, 560),
  challenges: unsplash('photo-1590333748338-d629e4564ad9', 1400, 560),
  badges: unsplash('photo-1635863807845-add1be925a2f', 1400, 560),
  lives: unsplash('photo-1649888137201-491856105a1a', 1400, 560),
  community: unsplash('photo-1597347409198-f190c008a3bd', 1400, 560),
  coachAi: unsplash('photo-1580983693000-5654250f64d1', 1400, 560),
  coachSpace: unsplash('photo-1583454110551-21f2fa2afe61', 1400, 560),
  help: unsplash('photo-1571935538821-8ecb6b4dea17', 1400, 560),
  notifications: unsplash('photo-1672344048213-76b6e77304bd', 1400, 560),
  hydration: unsplash('photo-1730140495525-947b3de5f405', 1400, 560),
  shopping: unsplash('photo-1552710218-bd32b0c98626', 1400, 560),
  progress: unsplash('photo-1599238432775-93c2e6661b46', 1400, 560),
  premium: unsplash('photo-1605296867304-46d5465a13f1', 1400, 700),
  admin: unsplash('photo-1645458314292-af7e370a9b52', 1400, 560),
  profile: unsplash('photo-1631899477678-9d3c5aeded2d', 1400, 500),
}
