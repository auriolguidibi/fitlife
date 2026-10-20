import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { ManagedUser } from '@/services/types'
import { roleLabels } from '@/utils/roles'
import { goalLabels, levelLabels } from '@/utils/labels'
import { formatDate } from '@/utils/format'

/**
 * Dossiers des inscrits pour le super admin : fiche membre mise en page (imprimable en PDF)
 * et tableau Excel stylisé de tous les inscrits.
 */

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const sexLabels: Record<string, string> = { male: 'Homme', female: 'Femme', other: 'Autre' }
const equipmentLabels: Record<string, string> = {
  none: 'Aucun',
  dumbbells: 'Haltères',
  bands: 'Élastiques',
  gym: 'Salle de sport',
  mat: 'Tapis',
  pullup_bar: 'Barre de traction',
}

function age(birthDate?: string): string {
  if (!birthDate) return '—'
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return '—'
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) a--
  return `${a} ans`
}

function bmi(u: ManagedUser): string {
  if (!u.height || !u.weight) return '—'
  const v = u.weight / (u.height / 100) ** 2
  return v.toFixed(1).replace('.', ',')
}

const list = (values?: string[], labels?: Record<string, string>) =>
  values && values.length ? values.map((v) => labels?.[v] ?? v).join(', ') : '—'

let logoCache: string | null = null
/** Logo intégré au fichier (le dossier reste lisible hors de l'application). */
async function logoDataUrl(): Promise<string> {
  if (logoCache !== null) return logoCache
  try {
    const blob = await (await fetch(`${import.meta.env.BASE_URL}brand/app-icon-512.png`)).blob()
    logoCache = await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => resolve('')
      r.readAsDataURL(blob)
    })
  } catch {
    logoCache = ''
  }
  return logoCache
}

const STYLE = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #eef2ea; }
  .page { max-width: 820px; margin: 24px auto; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,.08); page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .head { display: flex; align-items: center; gap: 18px; padding: 26px 30px; background: linear-gradient(120deg, #052e16, #14532d 60%, #65a30d); color: #fff; }
  .head img.logo { width: 54px; height: 54px; border-radius: 14px; background: #000503; }
  .head .brand { font-size: 12px; letter-spacing: .25em; text-transform: uppercase; opacity: .8; }
  .head h1 { margin: 2px 0 0; font-size: 26px; }
  .head .meta { margin-left: auto; text-align: right; font-size: 12px; opacity: .85; }
  .id { display: flex; gap: 18px; align-items: center; padding: 22px 30px; border-bottom: 1px solid #e5e7eb; }
  .avatar { width: 74px; height: 74px; border-radius: 50%; object-fit: cover; background: #d9f99d; display: grid; place-items: center; font-weight: 800; font-size: 26px; color: #14532d; }
  .id h2 { margin: 0; font-size: 22px; }
  .id p { margin: 3px 0 0; color: #475569; font-size: 14px; }
  .pill { display: inline-block; margin: 8px 6px 0 0; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #ecfccb; color: #3f6212; }
  .pill.gold { background: #fef3c7; color: #92400e; }
  .pill.role { background: #e0e7ff; color: #3730a3; }
  section { padding: 18px 30px 6px; }
  section h3 { margin: 0 0 10px; font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: #65a30d; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .cell { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; }
  .cell span { display: block; font-size: 11px; color: #64748b; }
  .cell b { display: block; margin-top: 2px; font-size: 15px; }
  .wide { grid-column: span 3; }
  .foot { padding: 16px 30px 22px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { background: #fff; } .page { margin: 0; box-shadow: none; border-radius: 0; } }
  @media (max-width: 600px) { .grid { grid-template-columns: repeat(2, 1fr); } .wide { grid-column: span 2; } .head .meta { display: none; } }
`

function memberPage(u: ManagedUser, logo: string): string {
  const name = `${u.firstName} ${u.lastName}`.trim()
  const initials = `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase()
  const cell = (label: string, value: unknown, wide = false) =>
    `<div class="cell${wide ? ' wide' : ''}"><span>${esc(label)}</span><b>${esc(value || '—')}</b></div>`
  const avatar = u.avatarUrl && /^https?:|^data:/.test(u.avatarUrl)
    ? `<img class="avatar" src="${esc(u.avatarUrl)}" alt="" />`
    : `<div class="avatar">${esc(initials)}</div>`
  return `
  <div class="page">
    <div class="head">
      ${logo ? `<img class="logo" src="${logo}" alt="FitLife" />` : ''}
      <div><div class="brand">FitLife · Dossier membre</div><h1>${esc(name)}</h1></div>
      <div class="meta">Édité le ${esc(formatDate(new Date().toISOString()))}<br />Réf. ${esc(u.id)}</div>
    </div>
    <div class="id">
      ${avatar}
      <div>
        <h2>${esc(name)}</h2>
        <p>${esc(u.email)}${u.phone ? ` · ${esc(u.phone)}` : ''}</p>
        <span class="pill role">${esc(roleLabels[u.role])}</span>
        ${u.isPremium ? `<span class="pill gold">Premium${u.premiumUntil ? ` jusqu’au ${esc(formatDate(u.premiumUntil))}` : ''}</span>` : '<span class="pill">Version gratuite</span>'}
      </div>
    </div>
    <section>
      <h3>Identité & inscription</h3>
      <div class="grid">
        ${cell('Prénom', u.firstName)}${cell('Nom', u.lastName)}${cell('Sexe', u.sex ? sexLabels[u.sex] : '')}
        ${cell('Date de naissance', u.birthDate ? formatDate(u.birthDate) : '')}${cell('Âge', age(u.birthDate))}${cell('Inscrit le', formatDate(u.createdAt))}
        ${cell('E-mail', u.email, true)}
        ${cell('Téléphone', u.phone)}${cell('Ville', u.city)}${cell('Rôle', roleLabels[u.role])}
      </div>
    </section>
    <section>
      <h3>Profil physique</h3>
      <div class="grid">
        ${cell('Taille', u.height ? `${u.height} cm` : '')}${cell('Poids', u.weight ? `${String(u.weight).replace('.', ',')} kg` : '')}${cell('IMC', bmi(u))}
      </div>
    </section>
    <section>
      <h3>Objectifs & questionnaire</h3>
      <div class="grid">
        ${cell('Objectif', u.goal ? goalLabels[u.goal] : '')}${cell('Niveau', u.level ? levelLabels[u.level] : '')}${cell('Séances / semaine', u.daysPerWeek ?? '')}
        ${cell('Durée des séances', u.sessionMinutes ? `${u.sessionMinutes} min` : '')}${cell('Équipement', list(u.equipment, equipmentLabels))}${cell('Régime', list(u.dietRestrictions))}
        ${cell('Allergies', list(u.allergies), true)}
      </div>
    </section>
    <section>
      <h3>Activité & abonnement</h3>
      <div class="grid">
        ${cell('Activités terminées', u.activities)}${cell('Distance totale', `${String(u.totalKm).replace('.', ',')} km`)}${cell('Dernière activité', u.lastActivityAt ? formatDate(u.lastActivityAt) : '')}
        ${cell('Abonnement', u.isPremium ? 'Premium' : 'Gratuit')}${cell('Premium jusqu’au', u.premiumUntil ? formatDate(u.premiumUntil) : '')}${cell('Identifiant', u.id)}
      </div>
    </section>
    <div class="foot"><span>Document confidentiel · usage interne FitLife</span><span>${esc(name)}</span></div>
  </div>`
}

export async function dossierHtml(users: ManagedUser[]): Promise<string> {
  const logo = await logoDataUrl()
  const title = users.length === 1 ? `Dossier ${users[0].firstName} ${users[0].lastName}` : `Dossiers FitLife (${users.length})`
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${esc(title)}</title><style>${STYLE}</style></head><body>${users.map((u) => memberPage(u, logo)).join('')}</body></html>`
}

/** Tableau Excel (.xls) avec en-tête aux couleurs FitLife : s'ouvre dans Excel, Google Sheets, LibreOffice. */
export function excelFile(users: ManagedUser[]): string {
  const cols: [string, (u: ManagedUser) => unknown][] = [
    ['Prénom', (u) => u.firstName],
    ['Nom', (u) => u.lastName],
    ['E-mail', (u) => u.email],
    ['Téléphone', (u) => u.phone],
    ['Sexe', (u) => (u.sex ? sexLabels[u.sex] : '')],
    ['Date de naissance', (u) => (u.birthDate ? formatDate(u.birthDate) : '')],
    ['Âge', (u) => age(u.birthDate)],
    ['Taille (cm)', (u) => u.height],
    ['Poids (kg)', (u) => (u.weight ? String(u.weight).replace('.', ',') : '')],
    ['IMC', (u) => bmi(u)],
    ['Objectif', (u) => (u.goal ? goalLabels[u.goal] : '')],
    ['Niveau', (u) => (u.level ? levelLabels[u.level] : '')],
    ['Séances / sem.', (u) => u.daysPerWeek],
    ['Allergies', (u) => list(u.allergies)],
    ['Rôle', (u) => roleLabels[u.role]],
    ['Premium', (u) => (u.isPremium ? 'Oui' : 'Non')],
    ['Premium jusqu’au', (u) => (u.premiumUntil ? formatDate(u.premiumUntil) : '')],
    ['Inscrit le', (u) => formatDate(u.createdAt)],
    ['Activités', (u) => u.activities],
    ['Km', (u) => String(u.totalKm).replace('.', ',')],
  ]
  const head = cols.map(([h]) => `<th>${esc(h)}</th>`).join('')
  const rows = users
    .map((u, i) => `<tr class="${i % 2 ? 'odd' : ''}">${cols.map(([, f]) => `<td>${esc(f(u) ?? '')}</td>`).join('')}</tr>`)
    .join('')
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Inscrits</x:Name><x:WorksheetOptions><x:FreezePanes/><x:FrozenNoSplit/><x:SplitHorizontal>2</x:SplitHorizontal><x:TopRowBottomPane>2</x:TopRowBottomPane></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  .title td { background: #14532d; color: #ffffff; font-size: 15pt; font-weight: bold; padding: 10px; }
  th { background: #65a30d; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #4d7c0f; text-align: left; }
  td { padding: 6px 10px; border: 1px solid #d9e2cf; mso-number-format: "\\@"; }
  tr.odd td { background: #f3f8ec; }
</style></head><body><table>
<tr class="title"><td colspan="${cols.length}">FitLife · Inscrits au ${esc(formatDate(new Date().toISOString()))} (${users.length})</td></tr>
<tr>${head}</tr>${rows}</table></body></html>`
}

/**
 * Enregistre / partage un fichier. Sur téléphone : enregistré puis proposé au partage
 * (Drive, WhatsApp, e-mail…). Sur ordinateur : téléchargement classique.
 */
export async function saveFile(name: string, content: string, mime: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: name, url: res.uri, dialogTitle: 'Enregistrer ou envoyer le dossier' })
    return
  }
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Ouvre l'impression (« Enregistrer en PDF ») ; sur téléphone, le dossier est partagé. */
export async function printOrShare(name: string, html: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return saveFile(name, html, 'text/html')
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  await new Promise((r) => window.setTimeout(r, 400))
  frame.contentWindow?.focus()
  frame.contentWindow?.print()
  window.setTimeout(() => frame.remove(), 60000)
}

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
