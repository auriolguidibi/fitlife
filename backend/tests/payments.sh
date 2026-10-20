#!/usr/bin/env bash
# Test du paiement FedaPay de bout en bout avec un FAUX serveur FedaPay (aucun argent réel).
set -euo pipefail
API="${API:-http://127.0.0.1:8081/api}"
MOCK="http://127.0.0.1:9090"
fail() { echo "ÉCHEC : $*" >&2; exit 1; }
req() {
  local m=$1 p=$2 t=${3:-} b=${4:-}
  local a=(-s -w '\n%{http_code}' -X "$m" "$API$p" -H 'Content-Type: application/json')
  [ -n "$t" ] && a+=(-H "Authorization: Bearer $t")
  [ -n "$b" ] && a+=(-d "$b")
  curl "${a[@]}"
}
status() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }
txid() { local u; u=$(body "$1" | jq -r '.checkoutUrl'); echo "${u##*tok_}"; }

EMAIL="paie.$RANDOM@exemple.com"
R=$(req POST /auth/register "" "{\"firstName\":\"Awa\",\"lastName\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"motdepasse123\"}")
TOKEN=$(body "$R" | jq -r '.token')

# Prix de l'offre : 4 000 FCFA / mois, 40 000 FCFA / an
req GET /subscription/plans "$TOKEN" | sed '$d' | jq -e '.[] | select(.id == "premium") | .priceMonthly == 4000 and .priceYearly == 40000' >/dev/null || fail "prix Premium différent de 4 000 / 40 000 FCFA"

# 1) Paiement réussi : lien FedaPay, puis statut relu chez FedaPay -> Premium actif
R=$(req POST /payments "$TOKEN" '{"plan":"premium","billing":"monthly","method":"mtn_momo"}')
[ "$(status "$R")" = 201 ] || fail "démarrage du paiement ($(status "$R")) $(body "$R")"
PAY=$(body "$R" | jq -r '.id')
[ "$(body "$R" | jq -r '.amount')" = 4000 ] || fail "montant facturé différent de 4000"
[[ "$(body "$R" | jq -r '.checkoutUrl')" == https://process.fedapay.com/* ]] || fail "lien de paiement FedaPay absent"
TX=$(txid "$R")
req GET "/payments/$PAY" "$TOKEN" | sed '$d' | jq -e '.status == "pending"' >/dev/null || fail "devrait être en attente"
curl -s "$MOCK/__set/$TX/approved" >/dev/null
req GET "/payments/$PAY" "$TOKEN" | sed '$d' | jq -e '.status == "succeeded"' >/dev/null || fail "paiement approuvé non confirmé"
req GET /profile "$TOKEN" | sed '$d' | jq -e '.isPremium == true' >/dev/null || fail "Premium non activé après paiement"
echo "OK paiement réussi -> Premium activé"

# 2) Paiement refusé
R=$(req POST /payments "$TOKEN" '{"plan":"premium","billing":"monthly","method":"orange_money"}')
PAY=$(body "$R" | jq -r '.id'); TX=$(txid "$R")
curl -s "$MOCK/__set/$TX/declined" >/dev/null
req GET "/payments/$PAY" "$TOKEN" | sed '$d' | jq -e '.status == "failed"' >/dev/null || fail "paiement refusé non marqué en échec"
echo "OK paiement refusé"

# 3) Montant trafiqué (1 000 au lieu de 4 000) : rien n'est activé
EMAIL2="paie2.$RANDOM@exemple.com"
R=$(req POST /auth/register "" "{\"firstName\":\"Koffi\",\"lastName\":\"Test\",\"email\":\"$EMAIL2\",\"password\":\"motdepasse123\"}")
T2=$(body "$R" | jq -r '.token')
R=$(req POST /payments "$T2" '{"plan":"premium","billing":"monthly","method":"wave"}')
PAY=$(body "$R" | jq -r '.id'); TX=$(txid "$R")
curl -s "$MOCK/__set/$TX/approved/1000" >/dev/null
req GET "/payments/$PAY" "$T2" | sed '$d' | jq -e '.status == "failed"' >/dev/null || fail "un montant trop faible a été accepté"
req GET /profile "$T2" | sed '$d' | jq -e '.isPremium == false' >/dev/null || fail "Premium activé malgré un montant trop faible"
echo "OK montant trafiqué refusé"

# 4) Webhook : la notification déclenche la vérification chez FedaPay
R=$(req POST /payments "$T2" '{"plan":"premium","billing":"yearly","method":"card"}')
PAY=$(body "$R" | jq -r '.id'); TX=$(txid "$R")
body "$R" | jq -e '.amount == 40000' >/dev/null || fail "prix annuel différent de 40 000 FCFA"
curl -s "$MOCK/__set/$TX/approved" >/dev/null
curl -s -X POST "$API/payments/webhook" -H 'Content-Type: application/json' -d "{\"name\":\"transaction.approved\",\"entity\":{\"id\":$TX,\"status\":\"approved\"}}" >/dev/null
req GET /payments "$T2" | sed '$d' | jq -e --arg p "$PAY" '.[] | select(.id == $p) | .status == "succeeded"' >/dev/null || fail "webhook non pris en compte"
# Un faux webhook « approuvé » sur une transaction non payée n'active rien
R=$(req POST /payments "$T2" '{"plan":"premium","billing":"monthly","method":"card"}')
PAY=$(body "$R" | jq -r '.id'); TX=$(txid "$R")
curl -s -X POST "$API/payments/webhook" -H 'Content-Type: application/json' -d "{\"name\":\"transaction.approved\",\"entity\":{\"id\":$TX,\"status\":\"approved\"}}" >/dev/null
req GET /payments "$T2" | sed '$d' | jq -e --arg p "$PAY" '.[] | select(.id == $p) | .status == "pending"' >/dev/null || fail "un faux webhook a validé un paiement"
echo "OK webhook (vrai pris en compte, faux ignoré)"
echo "TOUS LES TESTS DE PAIEMENT SONT PASSÉS"
