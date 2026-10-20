#!/usr/bin/env bash
# Test de bout en bout de l'API (lancé par GitHub Actions avec une vraie base MySQL).
# Inscription, notification du super admin, live caméra (diffusion + signalisation),
# dossier membre, suppression de son propre compte.
set -euo pipefail

API="${API:-http://127.0.0.1:8080/api}"
fail() { echo "ÉCHEC : $*" >&2; exit 1; }

req() { # méthode chemin [jeton] [corps]
  local method=$1 path=$2 token=${3:-} body=${4:-}
  local args=(-s -w '\n%{http_code}' -X "$method" "$API$path" -H 'Content-Type: application/json')
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}"
}
status() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }

login() {
  local r; r=$(req POST /auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}")
  [ "$(status "$r")" = 200 ] || fail "connexion $1 ($(status "$r")) $(body "$r")"
  body "$r" | jq -r '.token'
}

COACH=$(login coach@fitlife.app "$SEED_COACH_PASSWORD")
DEMO=$(login demo@fitlife.app "$SEED_DEMO_PASSWORD")
SUPER=$(login superadmin@fitlife.app "$SEED_SUPERADMIN_PASSWORD")
echo "OK connexions"

# Toutes les pages en lecture (membre, puis administration)
TODAY=$(date +%F)
for path in /profile /profile/preferences /program /nutrition /meals /shopping-list "/water?date=$TODAY" /activity /activity/active \
  "/steps?date=$TODAY" /challenges /challenges/participations /badges /badges/earned /community/posts /lives /events /announcements \
  /coach/messages /coach/unread /subscription/plans /subscription /payments /menu /notifications /progress; do
  R=$(req GET "$path" "$DEMO")
  [ "$(status "$R")" = 200 ] || fail "GET $path ($(status "$R")) $(body "$R")"
done
for path in /admin/stats /admin/users /admin/activities/pending /superadmin/users; do
  R=$(req GET "$path" "$SUPER")
  [ "$(status "$R")" = 200 ] || fail "GET $path ($(status "$R")) $(body "$R")"
done
echo "OK toutes les pages en lecture"

# Inscription -> le super admin est notifié
EMAIL="test.$RANDOM@exemple.com"
R=$(req POST /auth/register "" "{\"firstName\":\"Test\",\"lastName\":\"Inscrit\",\"email\":\"$EMAIL\",\"password\":\"motdepasse123\",\"birthDate\":\"1995-04-02\",\"sex\":\"female\",\"height\":165,\"weight\":60,\"phone\":\"+22500000000\"}")
[ "$(status "$R")" = 201 ] || fail "inscription ($(status "$R")) $(body "$R")"
NEW=$(body "$R" | jq -r '.token')
req GET /notifications "$SUPER" | sed '$d' | jq -e '[.[] | select(.title == "Nouvelle inscription")] | length > 0' >/dev/null || fail "notification d'inscription absente"
echo "OK inscription + notification super admin"

# Dossier membre : champs d'inscription présents
req GET /superadmin/users "$SUPER" | sed '$d' | jq -e --arg e "$EMAIL" '.[] | select(.email == $e) | (.birthDate != null and .height == 165 and has("goal"))' >/dev/null || fail "dossier membre incomplet"
echo "OK dossier membre"

# Live lancé maintenant -> tous les membres notifiés
R=$(req POST /lives "$COACH" '{"title":"Test direct CI","status":"live","durationMinutes":20}')
[ "$(status "$R")" = 201 ] || fail "création live ($(status "$R")) $(body "$R")"
LIVE=$(body "$R" | jq -r '.id')
[ ${#LIVE} -le 20 ] || fail "identifiant de live trop long : $LIVE"
req GET /notifications "$DEMO" | sed '$d' | jq -e '[.[] | select(.type == "live")] | length > 0' >/dev/null || fail "notification de live absente"
echo "OK live + notification"

# Caméra de l'hôte + signalisation WebRTC
R=$(req PUT "/lives/$LIVE/broadcast" "$COACH" '{"cameraOn":true,"micOn":true}')
[ "$(status "$R")" = 200 ] || fail "diffusion ($(status "$R")) $(body "$R")"
HOST=$(body "$R" | jq -r '.hostUserId')
[ "$HOST" = u_coach ] || fail "hôte inattendu : $HOST"
R=$(req POST "/lives/$LIVE/signals" "$DEMO" "{\"to\":\"$HOST\",\"kind\":\"join\"}")
[ "$(status "$R")" = 201 ] || fail "signal join ($(status "$R")) $(body "$R")"
req GET "/lives/$LIVE/signals" "$COACH" | sed '$d' | jq -e 'length == 1 and .[0].kind == "join" and .[0].from == "u_charly"' >/dev/null || fail "signal non reçu par l'hôte"
req GET "/lives/$LIVE/signals" "$COACH" | sed '$d' | jq -e 'length == 0' >/dev/null || fail "signal non consommé"
R=$(req POST "/lives/$LIVE/signals" "$DEMO" '{"to":"u_superadmin","kind":"join"}')
[ "$(status "$R")" = 403 ] || fail "un membre ne doit écrire qu'à l'hôte ($(status "$R"))"
req PUT "/lives/$LIVE/broadcast" "$COACH" '{"cameraOn":false,"micOn":true}' >/dev/null
req GET "/lives/$LIVE" "$DEMO" | sed '$d' | jq -e '.cameraOn == false' >/dev/null || fail "état caméra non transmis"
R=$(req PATCH "/lives/$LIVE/status" "$COACH" '{"status":"ended"}')
[ "$(status "$R")" = 200 ] || fail "fin du live ($(status "$R")) $(body "$R")"
echo "OK caméra + signalisation"

# Passer en direct un live programmé -> notification
R=$(req POST /lives "$COACH" '{"title":"Programmé CI","scheduledAt":"2030-01-01T10:00:00Z"}')
LIVE2=$(body "$R" | jq -r '.id')
BEFORE=$(req GET /notifications "$DEMO" | sed '$d' | jq '[.[] | select(.type == "live")] | length')
req PATCH "/lives/$LIVE2/status" "$COACH" '{"status":"live"}' >/dev/null
AFTER=$(req GET /notifications "$DEMO" | sed '$d' | jq '[.[] | select(.type == "live")] | length')
[ "$AFTER" -gt "$BEFORE" ] || fail "pas de notification au passage en direct"
echo "OK passage en direct notifié"

# Parcours d'un nouveau membre : questionnaire, programme, alimentation, profil
R=$(req PUT /profile/preferences "$NEW" '{"goal":"weight_loss","level":"beginner","daysPerWeek":3,"sessionMinutes":30,"equipment":["none"],"allergies":[],"onboarded":true}')
[ "$(status "$R")" = 200 ] || fail "questionnaire ($(status "$R")) $(body "$R")"
for path in /profile /program /nutrition /notifications /lives /events /announcements; do
  R=$(req GET "$path" "$NEW")
  [ "$(status "$R")" = 200 ] || fail "GET $path ($(status "$R")) $(body "$R")"
done
R=$(req PUT /profile "$NEW" '{"weight":59.5,"height":166}')
[ "$(status "$R")" = 200 ] || fail "mise à jour du profil ($(status "$R")) $(body "$R")"
echo "OK parcours nouveau membre"

# Défi : rejoindre puis quitter (bouton « Quitter le défi »)
CH=$(req GET /challenges "$NEW" | sed '$d' | jq -r '.[0].id')
R=$(req POST "/challenges/$CH/join" "$NEW"); [ "$(status "$R")" = 200 ] || [ "$(status "$R")" = 201 ] || fail "rejoindre le défi ($(status "$R")) $(body "$R")"
R=$(req DELETE "/challenges/$CH/join" "$NEW"); [ "$(status "$R")" = 200 ] || fail "quitter le défi ($(status "$R")) $(body "$R")"
req GET /challenges/participations "$NEW" | sed '$d' | jq -e --arg c "$CH" '[.[] | select(.challengeId == $c)] | length == 0' >/dev/null || fail "participation encore présente"
# Eau : ajouter puis retirer un verre
req POST /water "$NEW" '{"ml":250}' >/dev/null
R=$(req POST /water "$NEW" '{"ml":-250}'); case "$(status "$R")" in 200|201) ;; *) fail "retirer un verre ($(status "$R"))" ;; esac
body "$R" | jq -e '.ml == 0' >/dev/null || fail "eau non retirée : $(body "$R")"
echo "OK quitter un défi + retirer un verre"

# Messagerie avec le vrai coach
R=$(req POST /coach/messages "$NEW" '{"text":"Bonjour coach, je débute : par quoi commencer ?"}')
[ "$(status "$R")" = 201 ] || fail "message au coach ($(status "$R")) $(body "$R")"
NEWID=$(req GET /profile "$NEW" | sed '$d' | jq -r '.id')
req GET /notifications "$COACH" | sed '$d' | jq -e '[.[] | select(.title | startswith("Message de"))] | length > 0' >/dev/null || fail "coach non prévenu du message"
req GET /coach/inbox "$COACH" | sed '$d' | jq -e --arg m "$NEWID" '.[] | select(.memberId == $m) | .unread == 1' >/dev/null || fail "conversation absente de la boîte du coach"
R=$(req POST "/coach/inbox/$NEWID" "$COACH" '{"text":"Bienvenue ! Commence par 3 séances de 20 minutes par semaine."}')
[ "$(status "$R")" = 201 ] || fail "réponse du coach ($(status "$R")) $(body "$R")"
req GET /coach/unread "$NEW" | sed '$d' | jq -e '.unread == 1' >/dev/null || fail "réponse du coach non signalée"
req GET /coach/messages "$NEW" | sed '$d' | jq -e 'length == 2 and .[1].fromCoach == true' >/dev/null || fail "réponse du coach absente"
req GET /coach/unread "$NEW" | sed '$d' | jq -e '.unread == 0' >/dev/null || fail "réponse non marquée lue"
R=$(req GET /coach/inbox "$NEW"); [ "$(status "$R")" = 403 ] || fail "un membre lit la boîte des coachs ($(status "$R"))"
echo "OK messagerie membre <-> coach"

# Codes promo : créés par un coach, utilisés par un membre
R=$(req POST /promo-codes "$COACH" '{"days":15,"maxUses":1,"note":"Test CI"}')
[ "$(status "$R")" = 201 ] || fail "création code promo ($(status "$R")) $(body "$R")"
CODE=$(body "$R" | jq -r '.code')
req GET /profile "$NEW" | sed '$d' | jq -e '.isPremium == false' >/dev/null || fail "membre déjà Premium"
R=$(req POST /promo/redeem "$NEW" "{\"code\":\"$(tr 'A-Z' 'a-z' <<<"$CODE")\"}")
[ "$(status "$R")" = 200 ] || fail "utilisation du code ($(status "$R")) $(body "$R")"
body "$R" | jq -e '.days == 15 and .user.isPremium == true' >/dev/null || fail "Premium non activé par le code"
R=$(req POST /promo/redeem "$NEW" "{\"code\":\"$CODE\"}"); [ "$(status "$R")" = 400 ] || fail "code utilisé deux fois ($(status "$R"))"
R=$(req POST /promo/redeem "$DEMO" "{\"code\":\"$CODE\"}"); [ "$(status "$R")" = 400 ] || fail "code à usage unique réutilisé ($(status "$R"))"
R=$(req POST /promo/redeem "$DEMO" '{"code":"FAUX-CODE"}'); [ "$(status "$R")" = 400 ] || fail "faux code accepté ($(status "$R"))"
R=$(req POST /promo-codes "$DEMO" '{"days":30}'); [ "$(status "$R")" = 403 ] || fail "un membre crée un code ($(status "$R"))"
R=$(req POST /promo-codes "$SUPER" '{"code":"BIENVENUE-CI","days":7}'); [ "$(status "$R")" = 201 ] || fail "code personnalisé ($(status "$R"))"
req PATCH /promo-codes/BIENVENUE-CI "$SUPER" '{"active":false}' >/dev/null
R=$(req POST /promo/redeem "$DEMO" '{"code":"BIENVENUE-CI"}'); [ "$(status "$R")" = 400 ] || fail "code désactivé accepté ($(status "$R"))"
req GET /promo-codes "$COACH" | sed '$d' | jq -e --arg c "$CODE" '.[] | select(.code == $c) | .uses == 1' >/dev/null || fail "compteur d'utilisations"
echo "OK codes promo"

# Suppression de son propre compte
R=$(req DELETE /profile "$NEW")
[ "$(status "$R")" = 200 ] || fail "suppression du compte ($(status "$R")) $(body "$R")"
R=$(req POST /auth/login "" "{\"email\":\"$EMAIL\",\"password\":\"motdepasse123\"}")
[ "$(status "$R")" = 401 ] || fail "le compte supprimé peut encore se connecter ($(status "$R"))"
echo "OK suppression de compte"

echo "TOUS LES TESTS API SONT PASSÉS"
