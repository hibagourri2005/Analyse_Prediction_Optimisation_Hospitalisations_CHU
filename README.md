# Analyse, prédiction et optimisation des hospitalisations — CHU Mohammed VI d'Agadir

> Pipeline de données complet (génération → nettoyage → entrepôt MySQL → KPI → prédiction de la durée de séjour) et application web par rôle (Direction, Chef de service, Analyste, Administrateur) avec un assistant IA local.

## Contexte et objectif
- **Contexte** : projet réalisé dans le cadre d'un stage de deux mois (Data Engineering / Data Analysis / Data Science) au CHU Mohammed VI d'Agadir.
- **Problématique** : comment exploiter les données du module *Hospitalisations* pour améliorer leur qualité, analyser l'activité, mesurer la performance des services et anticiper les durées de séjour ?
- **Objectif** : fournir aux décideurs des tableaux de bord, un modèle de prédiction et un assistant IA accessibles via une application web sécurisée.

Le rapport détaillé se trouve dans [`docs/Rapport_Projet_CHU_Agadir_Complet.md`](docs/Rapport_Projet_CHU_Agadir_Complet.md).

## Données
- **Source** : données synthétiques générées par le notebook `01_generation_dataset.ipynb`, avec anomalies injectées volontairement pour tester le nettoyage (aucune donnée patient réelle).
- **Volume** (après nettoyage) : 14 580 hospitalisations, 16 services, 103 médecins actifs.
- **Dictionnaire de données** : [`docs/Dictionnaire_donnees_CHU_Agadir.xlsx`](docs/Dictionnaire_donnees_CHU_Agadir.xlsx).

## Méthodologie
1. **Génération** des données brutes (`data/raw/`)
2. **Audit qualité et nettoyage** (`data/clean/`, rapports de qualité)
3. **ETL vers un entrepôt MySQL** en schéma en étoile (`sql/schema_dwh.sql`)
4. **Analyse exploratoire et KPI** (`data/exports/`)
5. **Modélisation** de la durée de séjour (8 modèles comparés, validation croisée)
6. **Application web** : API FastAPI + interface React, authentification JWT par rôle, assistant IA via Ollama

## Résultats
Comparatif des modèles de prédiction de la durée de séjour (jeu de test) :

| Modèle | MAE (jours) | RMSE | R² |
|--------|------------:|-----:|---:|
| Ridge | 1,19 | 1,62 | 0,838 |
| Régression linéaire | 1,19 | 1,62 | 0,837 |
| XGBoost | 1,20 | 1,64 | 0,835 |
| Gradient Boosting | 1,24 | 1,68 | 0,827 |
| KNN | 1,44 | 1,91 | 0,776 |
| Random Forest | 1,70 | 2,21 | 0,700 |
| Decision Tree | 1,95 | 2,52 | 0,610 |
| Lasso | 2,37 | 2,93 | 0,470 |

Quelques KPI globaux : durée moyenne de séjour 9,24 jours, taux d'admission en urgence 33,3 %, taux de guérison 55,5 %.

## Technologies
- **Données / ML** : Python, Pandas, NumPy, Scikit-learn, XGBoost, Matplotlib, Seaborn, Jupyter
- **Base de données** : MySQL (schéma en étoile), SQLAlchemy
- **Backend** : FastAPI, JWT (python-jose), bcrypt
- **Frontend** : React 19, Vite, React Router, Recharts, Axios
- **IA** : Ollama (modèle `llama3.2:3b`) pour l'assistant conversationnel

## Structure du projet
```
.
├── backend/            API FastAPI (routers : kpi, patients, prédiction, ml, agent IA, admin)
├── frontend/           Application React (Vite)
│   └── src/            api/ · components/ · context/ · pages/ · theme/ · assets/
├── notebooks/          01 génération → 02 audit qualité → 03 ETL → 04 KPI → 05 modèle ML
├── data/
│   ├── raw/            données brutes (anomalies injectées)
│   ├── clean/          données nettoyées + rapports de qualité
│   └── exports/        KPI, prédictions, comparatif des modèles
├── models/             modèle entraîné (modele_duree_sejour.pkl)
├── sql/                schéma de l'entrepôt et table des utilisateurs
├── docs/               rapport, dictionnaire de données, roadmaps, diagrammes UML
├── reports/figures/    graphiques exportés par les notebooks
├── .env.example        modèle de configuration (à copier en .env)
└── requirements.txt
```

## Installation et utilisation

### 1. Récupérer le projet et configurer l'environnement
```bash
git clone https://github.com/<votre-pseudo>/<nom-du-depot>.git
cd <nom-du-depot>

python -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # puis renseignez DB_PASSWORD et SECRET_KEY
```

### 2. Base de données MySQL
1. Créez la base : `CREATE DATABASE chu_dwh CHARACTER SET utf8mb4;`
2. Exécutez le notebook `notebooks/03_etl_chargement_dwh.ipynb` : il crée le schéma (`sql/schema_dwh.sql`) et charge `data/clean/`.
3. Puis créez la table des utilisateurs : `sql/create_users_table.sql` (elle référence `DimService`, donc à lancer **après** l'étape 2).

> Les données de `data/` sont déjà fournies : vous pouvez ignorer les notebooks 01, 02, 04 et 05, ou les rejouer dans l'ordre (**lancez Jupyter depuis le dossier `notebooks/`**, les chemins sont relatifs).

### 3. Créer les comptes
```bash
cd backend
python seed_users.py             # comptes de démonstration (à changer avant tout usage réel)
python creer_premier_admin.py    # premier compte administrateur
```

### 4. Lancer le backend
```bash
cd backend
uvicorn main:app --reload        # http://127.0.0.1:8000  (docs : /docs)
```

### 5. Assistant IA (optionnel)
```bash
ollama pull llama3.2:3b
ollama serve
```

### 6. Lancer le frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

## Rôles de l'application
| Rôle | Accès |
|------|-------|
| Direction | KPI globaux, comparaison des services, liste des patients, assistant IA |
| Chef de service | Vue d'ensemble de son service uniquement, graphiques, patients, prédiction, assistant IA |
| Analyste | Dashboard analytique, prévisions, détails des modèles ML, assistant IA |
| Administrateur | Gestion des utilisateurs et des affectations aux services |

## Sécurité
- Le fichier `.env` (mot de passe MySQL, clé JWT) est ignoré par Git : ne le publiez jamais.
- Les mots de passe de `seed_users.py` sont réservés à la démonstration.

## Auteur
**GOURRI HIBA**

