/**
 * Mots de passe des comptes de démonstration (mode démo, données sur l'appareil).
 * Seule l'empreinte SHA-256 est stockée ici : les mots de passe eux-mêmes sont dans
 * IDENTIFIANTS-DEMO.md, à la racine du projet (fichier non publié sur GitHub).
 */
export const PASSWORD_SALT = 'fitlife-demo-v1:'

export const seededPasswordHashes: Record<string, string> = {
  u_charly: '14e25b74d9bee25c6cbc7ad35b74ba4b52e90361031bda4ae7b689e97432c531',
  u_coach: '8cc7b94ee6560d136c0cbf990227499623477087bb5e7615a2655cb0274175bd',
  u_admin: '20d07c9320be7c8e4d6979d03758ddb5bdbaac77ae1579500534e9db04c4fbee',
  u_superadmin: 'ae4117b44165328e5ac47ba6e23c87efbe6f80bcf16f90b9022f2abba239eb0c',
}
