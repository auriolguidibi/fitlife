import { exerciseLibrary } from './exerciseLibrary'
import type { ExerciseTemplate } from './exerciseLibrary'

/**
 * Vidéos de démonstration (YouTube) de chaque exercice : en français par défaut,
 * en anglais au choix. Chaque langue a une vidéo principale et une de secours ;
 * toutes ont été vérifiées comme existantes et intégrables (oEmbed YouTube 200).
 */
export type VideoLang = 'fr' | 'en'
export type VideoSet = Record<VideoLang, [string, string]>

const videoIds: Record<string, VideoSet> = {
  ex_squat: { fr: ['OMNnle4yTT8', 'Ipd9a5VjBLw'], en: ['CKcDiJnLaLY', 'ZLJBfYF_oO0'] },
  ex_pushup: { fr: ['50Yr6Mm78u0', 'hR6_6IdiYv4'], en: ['s1X8e4JFdbE', 'zF0jbubK_jU'] },
  ex_lunge: { fr: ['fn-0MDDI-84', 'ngQwoow31KY'], en: ['WzONHuAe6BY', 'ASdqJoDPMHA'] },
  ex_plank: { fr: ['qRUioGwKRCY', '_YHkhPaXyZc'], en: ['6LqqeBtFn9M', 'ASdvN_XEl_c'] },
  ex_crunch: { fr: ['CdDGyI9l0R0', 'LEb7Juw9tMo'], en: ['GWIEON0VSaY', '2R93PU2IM-Y'] },
  ex_burpee: { fr: ['pUlEXvanmA4', '4YPWd8z090A'], en: ['qLBImHhCXSw', 'wGvBfVeCNko'] },
  ex_jumping_jack: { fr: ['wCATrhQjlNA', 'sQQKlnXfYZo'], en: ['nGaXj3kkmrU', 'Q4QnlZs9PqI'] },
  ex_mountain_climber: { fr: ['5G---k3et1k', 'UNBiOYnQLRo'], en: ['gW-q50V6Z_0', 'De3Gl-nC7IQ'] },
  ex_dumbbell_row: { fr: ['2P2TyrYyTmU', 'VLzDhlGdpS0'], en: ['PgpQ4-jHiq4', 'dtNu762e_BA'] },
  ex_shoulder_press: { fr: ['CE9KiCPFw0E', 'Ap7texwO3Nk'], en: ['6eDlfTDb7Po', 'bmy7tIopNt4'] },
  ex_glute_bridge: { fr: ['9Wma4mC8wpw', 'erKxfURfkmo'], en: ['wQQ6N5piDG0', 'Q_Bpj91Yiis'] },
  ex_band_squat: { fr: ['q6TkDwxAcuQ', 'dbOHuhtZ1nQ'], en: ['5l8bDoRIyxc', 'duP-UZsfOaQ'] },
  ex_band_pull: { fr: ['t4YKfH5s6Uk', 'v8ui8vwKyI0'], en: ['LSkyinhmA8k', 'ysAjxPSFC7M'] },
  ex_machine_press: { fr: ['WkOQLZ45v54', 'rAyf09C6rkQ'], en: ['90NY9tka1TQ', 'tg-jOYwhI5w'] },
  ex_lat_pulldown: { fr: ['dOukQ7QBSQs', 'KRBVQD6VXfs'], en: ['AKl1em_pH_c', 'SALxEARiMkw'] },
  ex_stretch: { fr: ['8JqOy80iH7o', 'NiGrtQTwatU'], en: ['COO2S7lPBzA', '1zuMEJzPVW4'] },
  ex_high_knees: { fr: ['RsVbI852C-o', 'gXW4c0eM8t0'], en: ['D0GwAezTvtg', 'WofWmk-4qU4'] },
  ex_russian_twist: { fr: ['oAHOt2Kuazc', 'ENvBFiUSqOk'], en: ['DF0sPfwys_g', 'jjyR6Z1U4dA'] },
}

export interface ExerciseVideo {
  exercise: ExerciseTemplate
  /** Vidéos par langue (principale puis secours). */
  ids: VideoSet
}

export const exerciseVideos: ExerciseVideo[] = exerciseLibrary
  .filter((e) => videoIds[e.id])
  .map((exercise) => ({ exercise, ids: videoIds[exercise.id] }))

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** Vidéos d'un exercice de séance (les exercices générés ont leur propre id : on compare les noms). */
export function videoForExercise(name: string): VideoSet | null {
  const n = normalize(name)
  const match = exerciseLibrary.find((e) => normalize(e.name) === n)
  return match ? (videoIds[match.id] ?? null) : null
}

export const bodyPartLabels: Record<string, string> = {
  lower: 'Bas du corps',
  upper: 'Haut du corps',
  core: 'Abdos & gainage',
  cardio: 'Cardio',
  mobility: 'Mobilité',
  full: 'Corps entier',
}
