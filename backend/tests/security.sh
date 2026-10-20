#!/usr/bin/env bash
# Tests de sécurité de l'API (accès, triche, force brute, saisies malveillantes).
set -euo pipefail
API="${API:-http://127.0.0.1:8080/api}"
fail() { echo "ÉCHEC SÉCURITÉ : $*" >&2; exit 1; }
req() {
  local m=$1 p=$2 t=${3:-} b=${4:-}
  local a=(-s -w '\n%{http_code}' -X "$m" "$API$p" -H 'Content-Type: application/json')
  [ -n "$t" ] && a+=(-H "Authorization: Bearer $t")
  [ -n "$b" ] && a+=(-d "$b")
  curl "${a[@]}"
}
code() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }
expect() { local got; got=$(code "$1"); [ "$got" = "$2" ] || fail "$3 (attendu $2, reçu $got) $(body "$1" | head -c 200)"; }
login() { req POST /auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}" | sed '$d' | jq -r '.token'; }

DEMO=$(login demo@fitlife.app "$SEED_DEMO_PASSWORD")
SUPER=$(login superadmin@fitlife.app "$SEED_SUPERADMIN_PASSWORD")
[ "$DEMO" != null ] && [ "$SUPER" != null ] || fail "connexion des comptes de test"

# 1) Accès sans jeton ou avec un faux jeton
for p in /profile /lives /payments /notifications /community/posts /admin/stats /superadmin/users; do
  expect "$(req GET "$p")" 401 "accès sans connexion à $p"
done
FORGED="$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-').$(echo -n '{"uid":"u_superadmin","role":"superadmin","exp":9999999999}' | base64 | tr -d '=' | tr '/+' '_-').ZmFrZQ"
expect "$(req GET /superadmin/users "$FORGED")" 401 "jeton falsifié accepté"
NONE="$(echo -n '{"alg":"none"}' | base64 | tr -d '=' | tr '/+' '_-').$(echo -n '{"uid":"u_superadmin","exp":9999999999}' | base64 | tr -d '=' | tr '/+' '_-')."
expect "$(req GET /profile "$NONE")" 401 "jeton sans signature accepté"
echo "OK accès protégés et jetons falsifiés refusés"

# 2) Élévation de privilèges : un membre ne peut pas agir en admin
expect "$(req GET /superadmin/users "$DEMO")" 403 "membre sur l'espace super admin"
expect "$(req GET /admin/users "$DEMO")" 403 "membre sur l'espace gestion"
expect "$(req PATCH /superadmin/users/u_charly/role "$DEMO" '{"role":"superadmin"}')" 403 "membre qui se nomme super admin"
expect "$(req PATCH /superadmin/users/u_charly/premium "$DEMO" '{"days":365}')" 403 "membre qui s'offre Premium"
expect "$(req POST /subscription "$DEMO" '{"plan":"premium"}')" 403 "Premium sans payer"
expect "$(req POST /lives "$DEMO" '{"title":"x"}')" 403 "membre qui crée un live"
expect "$(req POST /announcements "$DEMO" '{"title":"x","body":"y"}')" 403 "membre qui publie une annonce"
req PUT /profile "$DEMO" '{"role":"superadmin","isPremium":true}' >/dev/null
req GET /profile "$DEMO" | sed '$d' | jq -e '.role == "user"' >/dev/null || fail "rôle modifiable via le profil"
echo "OK pas d'élévation de privilèges"

# 3) Données d'un autre membre (IDOR)
EMAIL="secu.$RANDOM@exemple.com"
OTHER=$(req POST /auth/register "" "{\"firstName\":\"Autre\",\"email\":\"$EMAIL\",\"password\":\"motdepasse123\"}" | sed '$d' | jq -r '.token')
PAY=$(req POST /payments "$OTHER" '{"plan":"premium","billing":"monthly","method":"card"}' | sed '$d' | jq -r '.id')
expect "$(req GET "/payments/$PAY" "$DEMO")" 404 "lecture du paiement d'un autre membre"
ACT=$(req POST /activity/start "$OTHER" '{"type":"run"}' | sed '$d' | jq -r '.id')
expect "$(req PATCH "/activity/$ACT" "$DEMO" '{"distanceKm":50}')" 404 "modification de l'activité d'un autre"
expect "$(req DELETE "/activity/$ACT" "$DEMO")" 404 "suppression de l'activité d'un autre"
echo "OK données des autres membres protégées"

# 4) Triche : activité terminée non modifiable, statut « finished » interdit hors contrôle
req PATCH "/activity/$ACT" "$OTHER" '{"distanceKm":1.2,"movingSeconds":600,"durationSeconds":620,"maxSpeedKmh":12}' >/dev/null
expect "$(req PATCH "/activity/$ACT" "$OTHER" '{"status":"finished"}')" 400 "fin d'activité sans contrôle anti-triche"
req POST "/activity/$ACT/finish" "$OTHER" >/dev/null
expect "$(req PATCH "/activity/$ACT" "$OTHER" '{"distanceKm":900}')" 409 "distance modifiée après la fin"
expect "$(req POST "/activity/$ACT/finish" "$OTHER")" 409 "activité terminée deux fois"
echo "OK anti-triche des activités"

# 5) Paiement : offre gratuite ou inconnue refusée
expect "$(req POST /payments "$OTHER" '{"plan":"free","billing":"monthly","method":"card"}')" 400 "paiement d'une offre gratuite"
expect "$(req POST /payments "$OTHER" '{"plan":"premium","billing":"monthly","method":"bitcoin"}')" 400 "moyen de paiement inconnu"
expect "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/payments/webhook" -H 'Content-Type: application/json' -d '{"reference":"x","status":"succeeded"}' | sed 's/^/\n/')" 401 "webhook non signé accepté"
echo "OK paiement"

# 6) Saisies malveillantes
expect "$(req PUT /profile "$OTHER" '{"avatarUrl":"javascript:alert(1)"}')" 400 "lien de photo arbitraire"
expect "$(req PUT /profile "$OTHER" '{"birthDate":"pas-une-date"}')" 400 "date de naissance invalide"
R=$(req PUT /profile "$OTHER" "{\"firstName\":\"$(printf 'A%.0s' {1..300})\"}")
body "$R" | jq -e '(.firstName | length) <= 60' >/dev/null || fail "prénom non borné"
R=$(req GET "/meals?date=2024-01-01'%20OR%201=1--" "$OTHER")
[ "$(code "$R")" != 500 ] || fail "injection SQL provoque une erreur serveur"
expect "$(req POST /auth/register "" '{"firstName":"X","email":"pas-un-email","password":"motdepasse123"}')" 400 "email invalide accepté"
expect "$(req POST /auth/register "" "{\"firstName\":\"X\",\"email\":\"court.$RANDOM@exemple.com\",\"password\":\"court\"}")" 400 "mot de passe trop court accepté"
expect "$(req POST /auth/register "" "{\"firstName\":\"X\",\"email\":\"$EMAIL\",\"password\":\"motdepasse123\"}")" 409 "email en double accepté"
echo "OK saisies malveillantes refusées"

# 7) Force brute sur la connexion : bloquée après 8 échecs
for i in $(seq 1 8); do req POST /auth/login "" "{\"email\":\"$EMAIL\",\"password\":\"mauvais$i\"}" >/dev/null; done
expect "$(req POST /auth/login "" "{\"email\":\"$EMAIL\",\"password\":\"motdepasse123\"}")" 429 "force brute non bloquée"
echo "OK force brute bloquée"

# 8) En-têtes de sécurité
H=$(curl -s -D - -o /dev/null "$API/subscription/plans")
grep -qi '^x-content-type-options: nosniff' <<<"$H" || fail "en-tête nosniff absent"
grep -qi '^x-frame-options: deny' <<<"$H" || fail "en-tête anti-clickjacking absent"
echo "OK en-têtes de sécurité"

# 9) Changement de mot de passe
PW_EMAIL="mdp.$RANDOM@exemple.com"
R=$(req POST /auth/register "" "{\"firstName\":\"Mdp\",\"email\":\"$PW_EMAIL\",\"password\":\"ancienmotdepasse\"}")
OLD=$(body "$R" | jq -r '.token')
expect "$(req PUT /profile/password "$OLD" '{"currentPassword":"mauvais","newPassword":"nouveaumotdepasse"}')" 400 "changement avec un mauvais mot de passe actuel"
expect "$(req PUT /profile/password "$OLD" '{"currentPassword":"ancienmotdepasse","newPassword":"court"}')" 400 "nouveau mot de passe trop court accepté"
expect "$(req PUT /profile/password "" '{"currentPassword":"ancienmotdepasse","newPassword":"nouveaumotdepasse"}')" 401 "changement sans connexion"
R=$(req PUT /profile/password "$OLD" '{"currentPassword":"ancienmotdepasse","newPassword":"nouveaumotdepasse"}')
expect "$R" 200 "changement du mot de passe"
NEW=$(body "$R" | jq -r '.token')
expect "$(req GET /profile "$NEW")" 200 "nouvelle session après changement"
expect "$(req GET /profile "$OLD")" 401 "ancienne session encore ouverte après changement"
expect "$(req POST /auth/login "" "{\"email\":\"$PW_EMAIL\",\"password\":\"ancienmotdepasse\"}")" 401 "ancien mot de passe encore accepté"
expect "$(req POST /auth/login "" "{\"email\":\"$PW_EMAIL\",\"password\":\"nouveaumotdepasse\"}")" 200 "nouveau mot de passe refusé"
# Chaque rôle peut changer le sien (coach, admin, super admin) puis le remettre
for acct in "coach@fitlife.app:$SEED_COACH_PASSWORD" "admin@fitlife.app:$SEED_ADMIN_PASSWORD" "superadmin@fitlife.app:$SEED_SUPERADMIN_PASSWORD"; do
  E=${acct%%:*}; P=${acct#*:}
  T=$(login "$E" "$P")
  T2=$(req PUT /profile/password "$T" "{\"currentPassword\":\"$P\",\"newPassword\":\"temporaire-$P\"}" | sed '$d' | jq -r '.token')
  [ "$T2" != null ] || fail "changement de mot de passe pour $E"
  req PUT /profile/password "$T2" "{\"currentPassword\":\"temporaire-$P\",\"newPassword\":\"$P\"}" | sed '$d' | jq -e '.token' >/dev/null || fail "remise du mot de passe pour $E"
done
echo "OK changement de mot de passe (tous les rôles, anciennes sessions fermées)"

# 10) Suppression de compte : le jeton ne fonctionne plus
expect "$(req DELETE /profile "$OTHER")" 200 "suppression du compte"
expect "$(req GET /profile "$OTHER")" 401 "jeton encore valide après suppression"
echo "OK jeton invalidé après suppression"
echo "TOUS LES TESTS DE SÉCURITÉ SONT PASSÉS"
