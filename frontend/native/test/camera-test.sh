#!/usr/bin/env bash
# Test caméra sur émulateur Android (GitHub Actions) :
# 1) installe l'APK, 2) demande les autorisations comme un utilisateur (appui sur « Autoriser »),
# 3) ouvre la caméra dans la WebView de l'application, 4) capture l'écran comme preuve.
set -uo pipefail
APK="$1"
OUT="${2:-camera-test}"
PKG=com.fitlife.app
mkdir -p "$OUT"

adb install -r "$APK" || exit 1
adb shell am start -n "$PKG/.MainActivity"
sleep 20

# Accès au débogueur de la WebView (APK de débogage).
PID=$(adb shell pidof "$PKG" | tr -d '\r')
[ -n "$PID" ] || { echo "ÉCHEC : application non démarrée"; exit 1; }
SOCK=$(adb shell cat /proc/net/unix | grep -o "webview_devtools_remote_[0-9]*" | head -n1 | tr -d '\r')
[ -n "$SOCK" ] || { echo "ÉCHEC : WebView non débogable"; exit 1; }
adb forward tcp:9222 "localabstract:$SOCK"
sleep 1

# Appuie sur le bouton « Autoriser » des fenêtres d'autorisation Android (plusieurs fois si besoin).
tap_allow() {
  for i in $(seq 1 12); do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    adb pull /sdcard/ui.xml "$OUT/ui.xml" >/dev/null 2>&1 || { sleep 1; continue; }
    BOUNDS=$(grep -oE 'text="(While using the app|Only this time|Allow|ALLOW|Autoriser|Lorsque l.application est utilis[^"]*)"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' "$OUT/ui.xml" | head -n1 | grep -oE '\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]')
    if [ -n "$BOUNDS" ]; then
      read -r X1 Y1 X2 Y2 <<<"$(echo "$BOUNDS" | tr '[],' '   ')"
      adb shell input tap $(( (X1 + X2) / 2 )) $(( (Y1 + Y2) / 2 ))
      echo "Autorisation accordée (appui sur « Autoriser »)"
      sleep 2
    else
      sleep 1
    fi
  done
}

# La section « Télécharger l'application » est réservée au site web : absente de l'APK.
node frontend/native/test/cdp.mjs nodownload > "$OUT/nodownload.json"
echo "Bouton de téléchargement dans l'APK : $(cat "$OUT/nodownload.json")"
grep -q '"ok":true' "$OUT/nodownload.json" || { echo "ÉCHEC : la section Télécharger l'application apparaît dans l'APK"; exit 1; }
grep -q '"onLogin":true' "$OUT/nodownload.json" || { echo "ÉCHEC : page de connexion non affichée"; exit 1; }
echo "OK : pas de section de téléchargement sur l'écran de connexion"

# Lance la demande d'autorisation (module natif) puis appuie sur « Autoriser ».
node frontend/native/test/cdp.mjs request > "$OUT/request.json" &
REQ=$!
sleep 3
tap_allow
wait $REQ
echo "Réponse du module d'autorisations : $(cat "$OUT/request.json")"

# Ouvre la caméra dans la WebView et l'affiche en plein écran.
node frontend/native/test/cdp.mjs camera > "$OUT/camera.json"
echo "Résultat caméra : $(cat "$OUT/camera.json")"
sleep 3
adb exec-out screencap -p > "$OUT/camera.png"

grep -q '"ok":true' "$OUT/camera.json" || { echo "ÉCHEC : la caméra ne s'ouvre pas dans l'application"; exit 1; }
grep -q '"video:live"' "$OUT/camera.json" || { echo "ÉCHEC : pas de piste vidéo active"; exit 1; }
echo "CAMÉRA OK DANS L'APPLICATION"

# Connecté (accueil, profil, abonnement) : toujours aucun bouton de téléchargement.
# (Après la caméra : une fois connecté, l'app demande l'autorisation « Activité physique ».)
node frontend/native/test/cdp.mjs signin > /dev/null
sleep 8
node frontend/native/test/cdp.mjs nodownloadIn > "$OUT/nodownload-in.json"
echo "Connecté (accueil, profil, abonnement) : $(cat "$OUT/nodownload-in.json")"
grep -q '"ok":true' "$OUT/nodownload-in.json" || { echo "ÉCHEC : section ou bouton Télécharger visible une fois connecté dans l'APK"; exit 1; }
echo "OK : pas de section de téléchargement dans l'application"
