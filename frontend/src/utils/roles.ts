import type { User, UserRole } from '@/types'

type WithRole = Pick<User, 'role'> | null | undefined

/** Super administrateur : tous les droits, dont la gestion des comptes. */
export const isSuperAdmin = (u: WithRole) => u?.role === 'superadmin'
/** Administrateur (le super admin en fait partie). */
export const isAdmin = (u: WithRole) => u?.role === 'admin' || u?.role === 'superadmin'
/** Équipe : coachs, administrateurs et super administrateur. */
export const isStaff = (u: WithRole) => u?.role === 'coach' || isAdmin(u)

export const roleLabels: Record<UserRole, string> = {
  user: 'Membre',
  coach: 'Coach',
  admin: 'Administrateur',
  superadmin: 'Super admin',
}
