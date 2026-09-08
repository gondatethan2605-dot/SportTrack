# SportTrack — Votre Carnet Sport & Musculation

Application **100 % locale** de suivi sportif : programmes, séances guidées (moteur
vocal/audio/vibration), statistiques, objectifs, mesures corporelles, échauffement et
séances rapides. **Aucun compte, aucun serveur, aucune donnée quitte l'appareil** :
tout est stocké dans IndexedDB (base de données locale) sur votre appareil.

- PWA installable, fonctionne **hors ligne** (service worker + précache de l'ensemble des chunks).
- Aucune clé API, aucun backend, aucune base de données distante.

## Exécuter en local

**Prérequis :** Node.js 20+ (natif `node_modules` opérationnel).

```sh
npm install
npm run dev        # http://localhost:3000
```

## Vérification

```sh
npm run lint       # tsc --noEmit
npm run build      # vite build + précache PWA des chunks hashed
npm run preview    # sert dist/ en local
```

## Mise en ligne gratuite — GitHub Pages

L'application étant entièrement statique (côté client), elle est déployable
**gratuitement sur GitHub Pages** via le workflow déjà fourni
(`.github/workflows/deploy.yml`). Aucun secret à configurer.

### Étapes (une seule fois)

1. **Créer le dépôt GitHub** (nom par exemple `sporttrack`, en public ou privé —
   Pages nécessite un compte gratuit ; le site statique public est gratuit).
2. **Initialiser et pousser le code** depuis le dossier du projet :
   ```sh
   git init
   git add .
   git commit -m "SportTrack - lots 1 a 10"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/sporttrack.git
   git push -u origin main
   ```
3. **Activer GitHub Pages** : dans le dépôt, *Settings → Pages → Source : GitHub
   Actions*, puis *Save*. Le workflow `Deploy SportTrack to GitHub Pages` se lance
   alors automatiquement à chaque push sur `main`.
4. **Récupérer l'adresse** : dans *Settings → Pages*, l'URL affichée est de la forme
   `https://<votre-compte>.github.io/sporttrack/`. Le service worker s'enregistre
   avec le bon sous-chemin calculé automatiquement (aucune configuration requise).

> Le build dérive automatiquement l'URL de base du slug du dépôt via la variable
> d'environnement `GITHUB_REPOSITORY` (fournie par GitHub Actions) — aucun compte
> ni nom de dépôt n'est codé en dur dans le code source.

### Mise à jour après un changement

```sh
git add .
git commit -m "amelioration"
git push
```
Le workflow rebuild, re-précache et redéploie. Les visiteurs déjà en ligne
reçoivent la nouvelle version au prochain chargement (cache `sporttrack-cache-v7`).

## Mode Répétitions / Timer (v7.4)

Les exercices d'un programme peuvent être configurés en mode Répétitions ou Timer.
Une cadence de référence par exercice estime automatiquement l'équivalence
temps/répétitions. En séance, le mode Timer lance un compte à rebours par série et
valide automatiquement la série à la fin.