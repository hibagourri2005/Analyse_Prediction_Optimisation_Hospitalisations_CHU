# Roadmap — Application Web CHU Agadir
### React (frontend) + FastAPI (backend) + MySQL (chu_dwh existant) + Modèle ML

---

## Architecture générale

```
┌─────────────────┐      HTTP/JSON       ┌──────────────────┐      SQLAlchemy      ┌─────────────┐
│   React (Vite)   │  ─────────────────►  │     FastAPI       │  ──────────────────► │  MySQL       │
│  localhost:5173  │  ◄─────────────────  │  localhost:8000   │  ◄────────────────── │  chu_dwh     │
└─────────────────┘                       └──────────────────┘                       └─────────────┘
                                                    │
                                                    ▼
                                          modele_duree_sejour.pkl
                                             (déjà entraîné)
```

## Rôles et permissions (repris du cahier des charges, section 7.8)

| Rôle | Accès |
|---|---|
| **Direction** | Vue globale, tous les KPI, tous les services, export |
| **Chef de service** | KPI et prédictions limités à SON service uniquement |
| **Analyste Data** | Accès complet aux données brutes du DWH + modèle de prédiction |

---

## ÉTAPE 0 — Préparation de l'environnement

1. Installer **Node.js** (LTS) si pas déjà fait : https://nodejs.org
2. Vérifier : `node --version` et `npm --version`
3. Dans le venv Python existant, installer les librairies backend :
```bash
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
```

## ÉTAPE 1 — Base de données : table des utilisateurs

Créer une table `utilisateurs` dans `chu_dwh` (id, username, mot de passe haché, rôle, service rattaché si Chef de service).

## ÉTAPE 2 — Backend FastAPI : authentification

- Endpoint `POST /auth/login` → vérifie identifiants, retourne un token JWT contenant le rôle et le service de l'utilisateur
- Middleware de vérification du token sur chaque route protégée

## ÉTAPE 3 — Backend FastAPI : endpoints de données

- `GET /api/kpi/global` → réservé Direction
- `GET /api/kpi/service/{id_service}` → Chef de service limité à son id_service (vérifié via le token), Direction illimité
- `GET /api/hospitalisations` → réservé Analyste, données paginées
- `GET /api/services` → liste des services (pour les filtres)

## ÉTAPE 4 — Backend FastAPI : moteur de prédiction

- Charger `modele_duree_sejour.pkl` au démarrage du serveur
- `POST /api/predict` → reçoit les caractéristiques d'un patient (âge, sexe, service, pathologie...), retourne la durée prédite

## ÉTAPE 5 — Frontend React : scaffolding

- Créer le projet avec Vite
- Structure des pages : Login, DashboardDirection, DashboardChefService, DashboardAnalyste, Prediction
- Routage protégé selon le rôle (React Router)

## ÉTAPE 6 — Frontend React : dashboards par rôle

- Graphiques avec **Recharts**
- Appels API avec `fetch` ou `axios`
- Réutiliser la logique déjà validée dans Power BI (mêmes KPI, juste réimplémentés en React)

## ÉTAPE 7 — Frontend React : page de prédiction

- Formulaire (âge, sexe, service, pathologie, type d'admission)
- Appelle `/api/predict`, affiche la durée prédite

## ÉTAPE 8 — Tests de bout en bout

- Se connecter avec chacun des 3 rôles, vérifier les permissions
- Vérifier qu'un Chef de service ne peut PAS voir un autre service (même en trafiquant l'URL)

## ÉTAPE 9 — Mise en production (à voir en fin de parcours)

- Hébergement possible : serveur interne du CHU, ou solution simple (IIS Windows, Docker)
- Ce point sera abordé une fois l'application fonctionnelle en local
