# Roadmap complète — Stage CHU Mohammed VI Agadir (8 semaines)
### Analyse, Prédiction et Aide à la Décision — Module Hospitalisations

---

## Vue d'ensemble du planning

| Semaine | Phase | Livrable clé |
|---|---|---|
| 0 | Setup environnement | Environnement prêt |
| 1 | Génération du dataset | Fichiers CSV bruts (avec anomalies) |
| 2 | Audit & qualité des données | Rapport qualité + dataset nettoyé |
| 3 | Modélisation UML + ETL | Diagrammes UML + scripts ETL |
| 4 | Data Warehouse | Base MySQL/PostgreSQL en schéma étoile |
| 5 | EDA + KPI | Notebook d'analyse + tableau des KPI |
| 6 | Machine Learning | Modèle de prédiction durée de séjour |
| 7 | Power BI | Dashboard 3 pages |
| 8 | Rapport & soutenance | Rapport de stage + slides |

---

## SEMAINE 0 — Préparation de l'environnement

1. **Installer les outils**
   - Python 3.10+ (via Anaconda ou venv)
   - PostgreSQL ou MySQL + un client (DBeaver ou pgAdmin/MySQL Workbench)
   - Power BI Desktop
   - StarUML (pour les diagrammes UML)
   - VS Code ou Jupyter Notebook / JupyterLab
   - Git (pour versionner ton travail — fortement recommandé même en solo)

2. **Créer l'environnement virtuel Python**
   ```bash
   python -m venv venv
   source venv/bin/activate      # ou venv\Scripts\activate sous Windows
   pip install pandas numpy faker sqlalchemy psycopg2-binary mysql-connector-python \
               scikit-learn xgboost matplotlib seaborn jupyter
   ```

3. **Créer l'arborescence du projet**
   ```
   stage_chu_agadir/
   ├── data/
   │   ├── raw/              ← CSV bruts générés
   │   ├── clean/             ← CSV nettoyés
   ├── scripts/
   │   ├── 01_generation.py
   │   ├── 02_audit_qualite.py
   │   ├── 03_etl.py
   │   ├── 04_kpi.py
   │   └── 05_ml_model.py
   ├── notebooks/
   ├── sql/
   │   ├── schema_dwh.sql
   ├── uml/
   ├── powerbi/
   ├── rapports/
   │   ├── rapport_qualite.pdf
   └── README.md
   ```

4. **Créer un dépôt Git** (local suffit) pour sauvegarder ton avancement chaque jour.

---

## SEMAINE 1 — Génération du dataset synthétique

### 1.1 Définir le dictionnaire de données (à faire EN PREMIER, sur papier/Excel)
Décide des tables et champs avant de coder :

- **Patients** : `id_patient`, `nom`, `prenom` (fictifs), `age`, `sexe`, `ville`, `date_naissance`
- **Hospitalisations** : `id_hospitalisation`, `id_patient`, `id_service`, `id_medecin` (optionnel), `date_entree`, `date_sortie`, `type_admission` (urgence/programmée/transfert), `pathologie` (optionnel)
- **Services** : `id_service`, `nom_service`, `categorie` (médecine, chirurgie, pédiatrie, etc.), `capacite_lits`
- **Médecins** (optionnel) : `id_medecin`, `nom`, `id_service`

### 1.2 Écrire le script de génération (`01_generation.py`)
- Utiliser `Faker('fr_FR')` pour noms, villes marocaines (tu peux surcharger avec une liste de villes du Maroc : Agadir, Casablanca, Marrakech, etc.)
- Générer :
  - 8 à 10 services (liste fixe, ex : Cardiologie, Pédiatrie, Chirurgie générale, Urgences, Maternité, Oncologie, Néphrologie, Médecine interne...)
  - 5 000 à 10 000 patients
  - 10 000 à 20 000 hospitalisations (un patient peut avoir plusieurs séjours)
- Logique de génération d'une hospitalisation :
  - `date_entree` aléatoire sur 2-3 ans (pour avoir de la saisonnalité pour les KPI)
  - `date_sortie` = `date_entree` + durée aléatoire (loi normale ou exponentielle tronquée, ex. moyenne 5-7 jours)
  - Lier à un patient et un service existants

### 1.3 Injecter volontairement des anomalies (obligatoire, prévu au cahier des charges)
Crée une fonction dédiée qui, sur un échantillon aléatoire des lignes :
- Supprime certaines valeurs (âge, service, date de sortie) → `NaN` (~3-5%)
- Duplique certaines lignes (hospitalisations et patients) (~2%)
- Inverse certaines dates (`date_sortie < date_entree`) (~1-2%)
- Insère des âges invalides (négatifs ou > 120) (~1%)
- Documente **précisément** le taux d'anomalies injecté par type — tu en auras besoin pour comparer "avant/après" dans le rapport qualité.

### 1.4 Exporter en CSV bruts
```python
df_patients.to_csv("data/raw/patients.csv", index=False)
df_hospitalisations.to_csv("data/raw/hospitalisations.csv", index=False)
df_services.to_csv("data/raw/services.csv", index=False)
```

**Livrable fin semaine 1** : 3-4 fichiers CSV bruts + dictionnaire de données (Excel ou Markdown) décrivant chaque champ, son type, ses valeurs possibles.

---

## SEMAINE 2 — Audit et qualité des données

### 2.1 Script d'audit (`02_audit_qualite.py`)
Pour chaque table, calcule et stocke dans un rapport :
- **Complétude** : `% valeurs manquantes par colonne`
- **Doublons** : `df.duplicated().sum()` (global et sur clé métier)
- **Cohérence** :
  - `date_sortie >= date_entree` → sinon flag anomalie
  - `age` entre 0 et 120
  - `id_service` existe bien dans la table services
  - `id_patient` existe bien dans la table patients

### 2.2 Nettoyage
- Corriger ou supprimer les doublons
- Traiter les valeurs manquantes (suppression justifiée, ou imputation simple selon le champ — documente ton choix)
- Corriger/supprimer les incohérences de dates
- Exporter le dataset propre dans `data/clean/`

### 2.3 Rapport qualité (livrable officiel)
Document (Word/PDF ou notebook) avec :
- Tableau récapitulatif **avant/après** nettoyage (taux de complétude, taux de doublons, taux d'erreurs)
- Graphiques simples (barres) illustrant les taux d'anomalies par type
- Méthodologie de nettoyage appliquée

**Livrable fin semaine 2** : Rapport qualité (PDF) + CSV nettoyés dans `data/clean/`

---

## SEMAINE 3 — Modélisation UML et ETL

### 3.1 Diagrammes UML (StarUML)
- **Diagramme de cas d'utilisation** : reprends le tableau des acteurs/cas d'utilisation déjà présent dans le cahier des charges (section 7.8) et formalise-le visuellement (acteurs : Direction, Chef de service, Analyste Data ; cas d'utilisation UC1 à UC6)
- **Diagramme de séquence** (optionnel mais valorisant) : flux ETL — de la génération des CSV jusqu'au chargement dans le Data Warehouse
- Exporter en `.png` et sauvegarder les fichiers `.mdj` (StarUML) dans `/uml`

### 3.2 Script ETL (`03_etl.py`)
- **Extract** : lire les CSV nettoyés (`data/clean/`)
- **Transform** :
  - Standardiser les formats (dates, majuscules/minuscules, encodage)
  - Calculer les indicateurs dérivés : `duree_sejour = date_sortie - date_entree`, `tranche_age` (0-18, 19-40, 41-60, 60+)
  - Harmoniser les libellés de services
- **Load** :
  - Connexion à MySQL/PostgreSQL via SQLAlchemy
  - Charger dans des tables intermédiaires (staging)

```python
from sqlalchemy import create_engine
engine = create_engine("mysql+mysqlconnector://user:password@localhost/chu_dwh")
df_clean.to_sql("staging_hospitalisations", engine, if_exists="replace", index=False)
```

**Livrable fin semaine 3** : Diagrammes UML exportés + script ETL fonctionnel + données chargées en staging.

---

## SEMAINE 4 — Data Warehouse (schéma étoile)

### 4.1 Concevoir le schéma (sur papier d'abord)
- **FactHospitalisation** (table de faits) : `id_fait`, `id_patient (FK)`, `id_temps (FK)`, `id_service (FK)`, `duree_sejour`, `nb_hospitalisations` (=1 par ligne, agrégé ensuite), `jours_occupation`
- **DimPatient** : `id_patient`, `age`, `tranche_age`, `sexe`, `ville`
- **DimTemps** : `id_temps`, `jour`, `mois`, `trimestre`, `annee`, `jour_semaine`
- **DimService** : `id_service`, `nom_service`, `categorie`

### 4.2 Créer le schéma SQL (`sql/schema_dwh.sql`)
```sql
CREATE TABLE DimPatient (
  id_patient INT PRIMARY KEY,
  age INT,
  tranche_age VARCHAR(20),
  sexe VARCHAR(10),
  ville VARCHAR(50)
);

CREATE TABLE DimTemps (
  id_temps INT PRIMARY KEY,
  jour DATE,
  mois INT,
  trimestre INT,
  annee INT,
  jour_semaine VARCHAR(15)
);

CREATE TABLE DimService (
  id_service INT PRIMARY KEY,
  nom_service VARCHAR(100),
  categorie VARCHAR(50)
);

CREATE TABLE FactHospitalisation (
  id_fait INT PRIMARY KEY AUTO_INCREMENT,
  id_patient INT,
  id_temps INT,
  id_service INT,
  duree_sejour INT,
  jours_occupation INT,
  FOREIGN KEY (id_patient) REFERENCES DimPatient(id_patient),
  FOREIGN KEY (id_temps) REFERENCES DimTemps(id_temps),
  FOREIGN KEY (id_service) REFERENCES DimService(id_service)
);
```

### 4.3 Peupler le DWH depuis le staging
- Script Python qui lit `staging_hospitalisations` et alimente `DimPatient`, `DimTemps`, `DimService`, puis `FactHospitalisation` (génère la table `DimTemps` automatiquement à partir de la plage de dates du dataset).

**Livrable fin semaine 4** : Base de données DWH fonctionnelle avec les 4 tables peuplées, requêtable en SQL.

---

## SEMAINE 5 — Analyse exploratoire (EDA) et KPI

### 5.1 Notebook EDA (`notebooks/eda.ipynb`)
Requêtes SQL ou Pandas pour produire :
- Volumes : admissions/sorties par mois, par année
- Démographie : pyramide des âges, répartition sexe, top villes
- Services : classement par nombre d'hospitalisations, durée moyenne par service
- Séjours : durée moyenne, min, max, distribution (histogramme)

### 5.2 Tableau des KPI consolidés
Calcule et documente (dans un tableau final, réutilisable pour Power BI) :
- Total hospitalisations
- Nombre d'admissions / sorties sur la période
- Durée moyenne de séjour globale et par service
- Taux d'occupation des lits (`jours_occupation / (capacite_lits × jours_periode)`)
- Répartition démographique (âge, sexe, ville)

**Livrable fin semaine 5** : Notebook EDA complet avec visualisations + tableau des KPI exporté (CSV/Excel).

---

## SEMAINE 6 — Machine Learning : prédiction de la durée de séjour

### 6.1 Préparation des données
- Sélectionner les features : `age`, `sexe`, `service`, `type_admission`, `pathologie` (si dispo), `tranche_age`
- Encoder les variables catégorielles (One-Hot Encoding ou Target Encoding)
- Split train/test (80/20), éventuellement validation croisée (k-fold)

### 6.2 Modélisation
- **Baseline** : Régression Linéaire (référence rapide)
- **Modèles principaux** : `RandomForestRegressor` et `XGBRegressor`
```python
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)
preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)
rmse = mean_squared_error(y_test, preds, squared=False)
r2 = r2_score(y_test, preds)
```

### 6.3 Évaluation comparative
- Tableau comparatif : Régression Linéaire vs Random Forest vs XGBoost (MAE, RMSE, R²)
- Analyse de l'importance des variables (`feature_importances_`)
- Choisir le meilleur modèle et le sauvegarder (`joblib.dump`)

### 6.4 Génération des prédictions pour Power BI
- Appliquer le modèle sur un jeu de données représentatif
- Exporter une table `predictions_duree_sejour` (avec `id_patient`, `service`, `duree_predite`) vers le DWH — c'est cette table qui alimentera la page "Prévisionnelle" de Power BI.

**Livrable fin semaine 6** : Notebook ML complet + tableau comparatif des modèles + table de prédictions chargée dans la base.

---

## SEMAINE 7 — Tableau de bord Power BI

### 7.1 Connexion aux données
- Power BI Desktop → Obtenir des données → Base de données MySQL/PostgreSQL
- Importer les tables du DWH (`FactHospitalisation`, `DimPatient`, `DimTemps`, `DimService`, `predictions_duree_sejour`)
- Vérifier/créer les relations entre les tables (modèle en étoile doit apparaître automatiquement si les clés sont bien définies)

### 7.2 Page Exécutive
- Cartes KPI : total hospitalisations, admissions, sorties, durée moyenne de séjour
- Courbe temporelle : évolution mensuelle des admissions/sorties
- Filtres (slicers) : période, service

### 7.3 Page Services
- Graphique en barres : nombre de patients par service
- Durée moyenne de séjour par service
- Classement des services (table ou treemap)

### 7.4 Page Prévisionnelle
- Durée de séjour prédite (issue du modèle ML) vs réelle
- Tendance de charge estimée par service
- Indicateur de charge future

### 7.5 Finitions
- Thème visuel cohérent (couleurs CHU), titres clairs
- Boutons de navigation entre pages
- Vérifier la mise à jour des données (actualisation)

**Livrable fin semaine 7** : Fichier `.pbix` avec les 3 pages finalisées.

---

## SEMAINE 8 — Rapport de stage et soutenance

### 8.1 Rédaction du rapport de stage
Structure classique à adapter :
1. Introduction / contexte (CHU, SIH, problématique)
2. Méthodologie et architecture (reprendre section 6 du cahier des charges)
3. Génération et qualité des données
4. Modélisation UML et ETL
5. Data Warehouse
6. Analyse et KPI
7. Machine Learning (résultats comparatifs)
8. Dashboard Power BI (captures d'écran commentées)
9. Difficultés rencontrées et solutions
10. Conclusion et perspectives (ex. ajout DimMedecin, autres cas d'usage ML)

### 8.2 Support de soutenance
- Slides synthétiques (10-15 slides max) reprenant les points clés + captures du dashboard
- Prévoir une démo live ou une vidéo de secours du dashboard Power BI

### 8.3 Vérification finale des livrables
- [ ] Dataset synthétique + dictionnaire de données
- [ ] Rapport d'audit qualité
- [ ] Scripts ETL + schéma DWH
- [ ] Notebook EDA + tableau KPI
- [ ] Modèle ML + évaluation comparative
- [ ] Dashboard Power BI (3 pages)
- [ ] Rapport de stage complet
- [ ] Support de soutenance

---

## Conseils pratiques pour bien démarrer dès demain

1. **Ne code rien avant d'avoir figé le dictionnaire de données** (semaine 1, étape 1.1) — c'est ce qui évite de tout refaire plus tard.
2. Travaille avec des **volumes réduits d'abord** (500 patients, 1000 hospitalisations) pour tester rapidement tes scripts, puis passe à l'échelle complète une fois que tout fonctionne.
3. **Documente au fur et à mesure** (pas à la fin) : garde un fichier `journal_stage.md` où tu notes chaque jour ce que tu as fait — ça te fera gagner énormément de temps pour le rapport final.
4. Commence par un **MVP de bout en bout** (génération → CSV → DWH minimal → un seul KPI → un graphique Power BI) avant d'enrichir, plutôt que de vouloir tout perfectionner étape par étape.

