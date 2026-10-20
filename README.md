# FitLife — Fitness & Nutrition

**Site et application web :** https://auriolguidibi.github.io/fitlife/ — le bouton « Télécharger l’application » donne le dernier APK Android.

Application full-stack de fitness, nutrition et coaching (Réalités connectées). Frontend
React/TypeScript/Tailwind + backend PHP/MySQL.

## Structure

```
fitlife/
├─ frontend/          # React 18 + Vite + Tailwind (SPA)
│  └─ src/
│     ├─ types/       # Modèles TypeScript (miroir du contrat API)
│     ├─ data/        # Librairies (exercices, repas, badges, défis, lives…)
│     ├─ utils/       # Calculs fitness, anti-triche, générateurs
│     ├─ services/    # mockAdapter (localStorage) | restAdapter (API PHP)
│     ├─ context/     # Auth + Session GPS
│     ├─ components/  # design system + layout + domain
│     └─ pages/       # toutes les pages (auth, programme, activité, social…)
├─ backend/           # API REST PHP 8
│  ├─ public/         # index.php (front controller) + .htaccess
│  └─ src/            # config, db, JWT, helpers, controllers
│     └─ bin/seed.php # installe le schéma + données de démo
└─ database/schema.sql# Schéma MySQL
```

## Démarrage rapide — Frontend (mode démo, aucune base requise)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Comptes de démonstration (mode mock) : emails `demo@`, `coach@`, `admin@`, `superadmin@fitlife.app`.
Les mots de passe ne sont pas publiés ici : voir le fichier local `IDENTIFIANTS-DEMO.md` (non versionné).

Le mode mock persiste toutes les données dans le `localStorage`. L'anti-triche est
reproduit : les sessions suspectes (vitesse incohérente, saut GPS, doublon) restent `pending`
et n'atteignent pas le classement.

## Démarrage — Backend PHP + MySQL

Prérequis : PHP ≥ 8.1 (pdo_mysql), MySQL/MariaDB.

1. Créer la base et les tables :

   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. Installer les données de démo (badges, défis, offres, lives, communauté, comptes,
   activités, poids, pas, eau, notifications) :

   ```bash
   php backend/bin/seed.php
   ```

   Variable d'env si besoin : `DB_HOST`, `DB_NAME` (par défaut `fitlife`), `DB_USER`, `DB_PASS`,
   `JWT_SECRET`.

3. Lancer le serveur PHP :

   ```bash
   php -S localhost:8000 -t backend/public
   ```

4. Basculer le frontend sur l'API réelle :

   ```bash
   cd frontend
   $env:VITE_DATA_MODE="api"      # PowerShell
   # ou : set VITE_DATA_MODE=api   (cmd)
   npm run dev
   ```

   Le proxy Vite redirige `/api/*` vers `http://localhost:8000`. Le backend valide les
   tokens JWT (Bearer) ; l'expiration des abonnements est gérée à chaque requête.

Comptes (seedés) : mêmes emails. Mots de passe définis par `SEED_DEMO_PASSWORD`, `SEED_COACH_PASSWORD`,
`SEED_ADMIN_PASSWORD`, `SEED_SUPERADMIN_PASSWORD` (en production, aléatoires si non définis).

Si on sert le build frontend depuis le même serveur PHP :
`FRONTEND_INDEX=C:/.../frontend/dist/index.html php -S ...` (le router sert le SPA).

## Contrat API

Endpoint de base : `POST/GET/PATCH/DELETE /api/...`. Corps et réponses en JSON (`{ "message": … }`
en cas d'erreur avec le code HTTP correspondant). Auth : `Authorization: Bearer <token>`.

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Compte & session (JWT) |
| GET/PUT | `/profile`, `/profile/preferences` | Profil & préférences (onboarding) |
| GET | `/program` | Programme de 8 semaines personnalisé |
| POST | `/workouts/complete` | Marque une séance terminée |
| GET | `/nutrition` | Plan alimentaire (kcal, macros, menu 7 jours) |
| GET/POST/DELETE | `/meals`, `/meals/{id}` | Journal des repas par date |
| GET/POST/PATCH | `/shopping-list`, `/shopping-list/{id}`, `/shopping-list/regenerate` | Liste de courses |
| GET/POST | `/water`, `/steps` | Hydratation & pas par jour |
| POST | `/activity/start` | Démarre une session GPS |
| PATCH | `/activity/{id}` | Met à jour la session en direct |
| POST | `/activity/{id}/finish` | Termine + passe l'anti-triche |
| GET | `/activity`, `/activity/active` | Historique & session en cours |
| GET | `/leaderboard/{daily\|weekly\|monthly\|allTime}` | Classements |
| GET/POST | `/challenges`, `/challenges/participations`, `/challenges/{id}/join` | Défis |
| GET | `/badges`, `/badges/earned` | Badges (toutes / gagnés) |
| GET/POST | `/community/posts`, `/posts/{id}/like`, `/posts/{id}/comments` | Communauté |
| GET/POST | `/lives`, `/lives/{id}`, `/lives/{id}/messages`, `/lives/{id}/status` | Lives |
| GET/POST | `/ai/conversation`, `/ai/messages` | Coach IA (réponses simulées) |
| GET/DELETE | `/subscription`, `/subscription/plans` | Abonnement Premium (DELETE = résilier, accès conservé jusqu’à l’échéance) |
| POST | `/subscription/resume` | Réactiver le renouvellement |
| POST | `/subscription` | Activation sans paiement (admin uniquement) |
| POST/GET | `/payments`, `/payments/{id}` | Démarrer un paiement / suivre son statut |
| POST | `/payments/webhook` | Notification signée du prestataire de paiement |
| GET/POST/PATCH/DELETE | `/menu?from=&to=`, `/menu/{id}` | Menu du jour (écriture : coach, admin) |
| GET/PATCH | `/notifications`, `/notifications/{id}/read`, `/notifications/read-all` | Notifications |
| GET/POST | `/progress`, `/progress/weight` | Tendance poids/activité |
| GET | `/admin/stats`, `/admin/users` | Dashboard admin |
| PATCH/DELETE | `/lives/{id}` | Modifier / supprimer un live (coach, admin) |
| GET/POST/PATCH/DELETE | `/events`, `/events/{id}` | Événements (écriture : coach, admin) |
| POST | `/events/{id}/attend` | S’inscrire / se désinscrire d’un événement |
| GET/POST/PATCH/DELETE | `/announcements`, `/announcements/{id}` | Annonces (`?all=1` = expirées incluses ; écriture : coach, admin) |
| PATCH | `/admin/activities/{id}/review` | Validation/rejet d'une session |
| GET/PATCH/DELETE | `/superadmin/users`, `/superadmin/users/{id}/role`, `/superadmin/users/{id}/premium`, `/superadmin/users/{id}` | Gestion des comptes (super admin) |

## Espace Super admin

Accessible via `/super-admin` (barre latérale, menu Profil, ou bouton « Super admin » dans l’Espace Gestion)
avec le rôle `superadmin`. Le super admin a tous les droits des coachs et des administrateurs, et en plus :

- la liste de **tous les inscrits** (recherche, filtres par rôle / Premium, tri, export CSV) ;
- le changement de rôle (membre, coach, administrateur, super admin) ;
- Premium offert (30 jours, 1 an) ou retiré ;
- la **suppression d’un compte** et de toutes ses données (confirmation « SUPPRIMER »).

Garde-fous : impossible de se supprimer soi-même, de retirer son propre rôle ou de supprimer le dernier
super admin. Côté API, le rôle est relu en base à chaque requête (un compte rétrogradé ou supprimé perd
ses droits immédiatement). Base existante : migration `database/migrations/2026-10-13_superadmin.sql`
(elle indique aussi comment promouvoir un compte existant).

## Espace Gestion (coachs & administrateurs)

Accessible via `/gestion` (bouton « Gestion » en haut sur mobile, « Espace Gestion » dans la barre latérale)
avec les comptes `coach@fitlife.app` ou `admin@fitlife.app`. On y trouve :

- **Lives** : passer en direct immédiatement, programmer, modifier, démarrer, terminer, supprimer ;
- **Événements** : créer / modifier / supprimer (date, lieu ou en ligne, nombre de places, visuel) ;
  les membres s’inscrivent depuis la page `/events` ;
- **Annonces** : publier une information (priorité, épinglage, date de fin d’affichage) et l’actualiser ;
  elles s’affichent sur l’accueil des membres.

Chaque publication (live, événement, annonce) envoie une notification à tous les membres.
Les routes d’écriture sont protégées côté API (`require_staff()` : rôle `coach` ou `admin`).

- **Alimentation** : publier les aliments / repas de chaque jour avec leur description et leurs apports ;
  ils apparaissent dans « Le menu de tes coachs » (page Nutrition). Gratuit : menu du jour ; Premium : la semaine.

Base existante : appliquer les migrations `database/migrations/2026-10-12_events_announcements.sql`
puis `database/migrations/2026-10-12_menu_payments.sql` et `database/migrations/2026-10-13_live_stream_url.sql`.

Les photos de profil (`POST /profile/avatar`) sont enregistrées dans `backend/public/uploads/avatars/`.

## Abonnement Premium & paiement

Offre unique Premium (mensuel / annuel), conforme au comparatif « Gratuit vs Premium ».
Moyens de paiement : Orange Money, MTN MoMo, Moov Money, Wave et carte bancaire.

- Page `/premium` : souscription, abonnement en cours, historique et reçus, résiliation / réactivation.
- Les pages marquées « Non disponible » en gratuit (programme, Coach IA, liste de courses, classement,
  défis, badges) affichent une invitation à passer Premium. Coachs et admins y ont toujours accès.
- Prestataire : `PAYMENT_PROVIDER=simulation` par défaut (paiement confirmé automatiquement après
  quelques secondes ; un numéro finissant par `00` simule un refus). Pour un vrai agrégateur
  (CinetPay, FedaPay…), implémenter `PaymentGateway::initiate()` et déclarer
  `POST /api/payments/webhook` (signature HMAC-SHA256 dans l’en-tête `X-Signature`,
  secret `PAYMENT_WEBHOOK_SECRET`).

## Scripts utiles

```bash
cd frontend
npm run build       # tsc -b + vite build
npm run typecheck   # tsc -b
```

## Notes

- Le mode `mock` ne nécessite aucun serveur ; le mode `api` utilise l'adaptateur REST qui
  implémente exactement le même contrat (`DataService` dans `services/types.ts`).
- La génération du programme et du plan nutrition est déterministe côté
  serveur (`backend/src/resources.php`), calée sur le profil et les préférences.
- Les totaux admin/badges intègrent des valeurs de démonstration pour un tableau de bord
  vivant, comme dans le mock.