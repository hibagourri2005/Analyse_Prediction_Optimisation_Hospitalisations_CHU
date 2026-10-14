# Rapport de projet — Analyse, Prédiction et Aide à la Décision pour l'Optimisation des Hospitalisations au CHU Mohammed VI d'Agadir

---

## Table des matières

1. Contexte
2. Problématique
3. Objectifs du projet
4. Méthodologie et architecture globale
5. Environnement technique et outils
6. Réalisation détaillée, étape par étape
7. Difficultés rencontrées et solutions apportées
8. Fichiers principaux du projet
9. Résultats et livrables
10. Conclusion et perspectives

---

## 1. Contexte

Le Centre Hospitalo-Universitaire Mohammed VI d'Agadir dispose d'un Système d'Information Hospitalier (SIH) intégrant plusieurs modules métiers : gestion des patients, consultations, rendez-vous, hospitalisations, blocs opératoires, etc.

Le module **Hospitalisations** enregistre quotidiennement les admissions, les séjours, les transferts entre services et les sorties des patients. Ces données constituent une source stratégique pour évaluer l'activité hospitalière, optimiser la gestion des ressources et soutenir la prise de décision, mais elles restaient jusqu'ici sous-exploitées à des fins analytiques et prédictives.

Ce projet a été réalisé dans le cadre d'un stage de deux mois, orienté Data Engineering / Data Analysis / Data Science, avec pour ambition de transformer ces données brutes en un véritable écosystème d'aide à la décision : de la génération et du nettoyage des données jusqu'à une application web complète, sécurisée par rôle, avec moteur de prédiction et **agent conversationnel intelligent** intégrés.

---

## 2. Problématique

Comment exploiter efficacement les données du module Hospitalisations afin de :
- améliorer la qualité des données ;
- analyser l'activité hospitalière ;
- mesurer les performances des services ;
- prédire la durée de séjour des patients ;
- faciliter la prise de décision à travers des tableaux de bord et une application accessible aux différents acteurs de l'hôpital (Direction, chefs de service, analyste data, administrateur système) — y compris via une interface conversationnelle en langage naturel ?

---

## 3. Objectifs du projet

### Objectif général
Concevoir une chaîne de traitement analytique et décisionnelle (Data Pipeline) permettant d'exploiter les données du module Hospitalisations du SIH, de l'audit qualité jusqu'à une application décisionnelle interactive et sécurisée, en passant par un Data Warehouse, un modèle prédictif de durée de séjour et un agent conversationnel d'aide à la décision.

### Objectifs spécifiques
- Génération d'un dataset synthétique réaliste (patients, hospitalisations, services, médecins) avec Python/Faker, sans utiliser aucune donnée réelle de patient
- Audit et amélioration de la qualité des données (complétude, doublons, cohérence)
- Modélisation UML et mise en place d'un ETL
- Data Warehouse en schéma étoile
- Analyse exploratoire des données (EDA) et calcul des KPI clés
- Modèle de Machine Learning pour la prédiction de la durée d'hospitalisation, comparant plusieurs algorithmes
- Tableau de bord Power BI multi-pages
- **Extension du périmètre initial** : application web complète (React + FastAPI), avec gestion des rôles, moteur de prédiction intégré, interface d'administration, et **agent IA conversationnel exécuté 100% en local**

---

## 4. Méthodologie et architecture globale

Le projet a suivi une chaîne de traitement linéaire, entièrement réalisée avec des outils open-source, avant d'être prolongée par une application web complète intégrant un agent conversationnel :

```
Génération du dataset (Python/Faker)
        ↓
Audit qualité + nettoyage (Python/Pandas)
        ↓
ETL (Python/SQLAlchemy) → MySQL
        ↓
Data Warehouse (schéma étoile)
        ↓
Analyse exploratoire + KPI (Python/SQL)
        ↓
Modèle prédictif (Scikit-Learn/XGBoost)
        ↓
Tableau de bord Power BI
        ↓
Application Web (React + FastAPI)
   ├── Interfaces par rôle (Direction, Chef de service, Analyste, Administrateur)
   ├── Moteur de prédiction intégré
   └── Agent IA conversationnel (Ollama, 100% local)
```

---

## 5. Environnement technique et outils

| Domaine | Outils utilisés |
|---|---|
| Langage principal | Python 3.11 (environnement virtuel dédié) |
| Génération de données | Faker |
| Manipulation de données | Pandas, NumPy |
| Base de données | MySQL Server 9.1 |
| Connexion base de données | SQLAlchemy, mysql-connector-python |
| Machine Learning | Scikit-Learn, XGBoost, joblib |
| Visualisation / BI | Power BI Desktop |
| IDE | Visual Studio Code, extension SQLTools, Jupyter Notebook |
| Backend application web | FastAPI, python-jose (JWT), bcrypt |
| Frontend application web | React (Vite), React Router, Axios, Recharts, lucide-react |
| Intelligence artificielle conversationnelle | Ollama (exécution locale), modèle `llama3.2:3b` (avec option allégée `llama3.2:1b`) |

---

## 6. Réalisation détaillée, étape par étape

### 6.1 Génération du dataset synthétique

Aucune donnée réelle de patients n'a été utilisée, conformément au cahier des charges : l'ensemble du jeu de données a été généré synthétiquement dès le début du stage avec la librairie **Faker**, ce qui a permis d'éviter tout blocage lié aux autorisations d'accès et d'y injecter volontairement des anomalies pour illustrer la partie qualité des données.

**Version initiale** : génération de 3 tables (patients, services, hospitalisations), avec une durée de séjour tirée aléatoirement (loi exponentielle).

**Version enrichie**, développée en itérations successives :
- Ajout d'une table **médecins**, rattachés à un service, avec spécialité et ancienneté (3 à 8 médecins par service)
- Extension des services de 9 à **16 services** (Cardiologie, Pédiatrie, Chirurgie générale, Urgences, Maternité, Oncologie, Néphrologie, Médecine interne, Orthopédie, Pneumologie, Gastro-entérologie, Urologie, Neurologie, Réanimation, Dermatologie, ORL)
- Enrichissement des patients : numéro de dossier, téléphone, groupe sanguin (distribution pondérée réaliste), couverture santé (CNSS/CNOPS/RAMED/assurance privée/sans couverture)
- Enrichissement des hospitalisations : médecin référent, pathologie cohérente avec le service (5 pathologies typiques par service), mode de sortie, numéro de chambre
- Volumes portés à **8 000 patients / 15 000 hospitalisations**, pour un total après nettoyage d'environ 14 580 hospitalisations exploitables

Des anomalies ont été injectées volontairement et documentées, avec des taux précis : valeurs manquantes (4%), doublons (2%), incohérences de dates (1,5%), âges invalides (1%).

**Correction majeure apportée en cours de projet** : dans la version initiale, la durée de séjour était générée **indépendamment** des caractéristiques du patient (âge, pathologie, type d'admission), ce qui rendait le futur modèle de Machine Learning quasiment incapable d'apprendre une relation exploitable. La génération a été revue pour introduire une **relation causale réaliste** : durée de base par pathologie (ex. 14 jours pour une leucémie, 2 jours pour une amygdalite), effet de l'âge (+1 jour par décennie au-delà de 50 ans), effet du type d'admission (urgence et transfert allongent le séjour), plus une composante de bruit aléatoire pour la variabilité individuelle.

### 6.2 Audit et qualité des données

Un audit complet a été réalisé, avant et après nettoyage :
- **Complétude** : taux de valeurs manquantes par colonne, pour chaque table
- **Doublons** : détection sur clé métier (id_patient, id_hospitalisation, id_medecin)
- **Cohérence** : `date_sortie ≥ date_entree`, âge entre 0 et 120, clés étrangères valides (id_service, id_medecin, id_patient), cohérence entre le médecin référent et son service de rattachement

Une stratégie de traitement différenciée a été appliquée et documentée colonne par colonne :
- Imputation par la médiane pour l'âge
- Valeur `"Non renseigné"` pour les champs non structurants (téléphone, pathologie manquante)
- Suppression pour les clés étrangères invalides et les dates incohérentes (non récupérables sans introduire de biais)
- Correction (réaffectation) pour les incohérences médecin/service, plutôt que suppression

Un rapport qualité avec tableaux et graphiques comparatifs avant/après nettoyage a été produit (taux de complétude, nombre de doublons, anomalies de cohérence, volume de lignes conservées/supprimées).

### 6.3 Modélisation UML et ETL

Le flux Extract-Transform-Load a été construit en Python (Pandas + SQLAlchemy) :
- **Extract** : lecture des CSV nettoyés
- **Transform** : standardisation des formats (casse, espaces), calcul des indicateurs dérivés (`duree_sejour`, `tranche_age` en 4 tranches : 0-18, 19-40, 41-60, 60+), harmonisation des libellés de services
- **Load** : chargement dans des tables de staging MySQL, avant modélisation en schéma étoile

### 6.4 Data Warehouse

Un schéma étoile a été conçu et implémenté dans MySQL :
- **Table de faits** : `FactHospitalisation` (durée de séjour, jours d'occupation, type d'admission, pathologie, mode de sortie)
- **Dimensions** : `DimPatient` (âge, tranche d'âge, sexe, ville, groupe sanguin, couverture santé), `DimTemps` (jour, mois, trimestre, année, jour de la semaine), `DimService` (nom, catégorie, capacité en lits), `DimMedecin` (nom, spécialité, service de rattachement, ancienneté)

Le script SQL de création (`schema_dwh.sql`) et le peuplement automatisé depuis Python ont permis d'obtenir un Data Warehouse entièrement fonctionnel, requêtable en SQL et validé par des requêtes de jointure complètes.

### 6.5 Analyse exploratoire et KPI

Une analyse approfondie a été menée, couvrant :
- **Volumes** : admissions par mois, par année, par jour de semaine, par type d'admission
- **Démographie** : pyramide des âges, répartition par sexe, top des villes, couverture santé, groupe sanguin
- **Services** : classement d'activité, durée moyenne de séjour, taux d'occupation des lits (calculé sur la période complète du dataset)
- **Séjours** : distribution des durées, par service, par tranche d'âge, par type d'admission
- **Pathologies** : top pathologies globales et par service
- **Médecins** : charge de travail par médecin
- **Mode de sortie** : taux de guérison, de décès, de transfert

Un tableau de KPI consolidés (global et détaillé par service) a été calculé et exporté (Excel multi-onglets + CSV) pour alimenter Power BI et l'application web.

### 6.6 Machine Learning — prédiction de la durée de séjour

Huit modèles de régression ont été entraînés et comparés, avec un pipeline de préprocessing commun (encodage One-Hot pour les variables catégorielles, standardisation pour l'âge) et une validation croisée à 5 plis :

| Modèle | Famille |
|---|---|
| Régression Linéaire | Linéaire (baseline) |
| Ridge | Linéaire régularisé (L2) |
| Lasso | Linéaire régularisé (L1) |
| K-Nearest Neighbors | Basé sur la proximité |
| Decision Tree | Arbre unique |
| Random Forest | Ensemble d'arbres (bagging) |
| Gradient Boosting | Ensemble d'arbres (boosting) |
| XGBoost | Ensemble d'arbres (boosting optimisé) |

Le modèle **Ridge** a été retenu comme meilleur compromis performance/simplicité :

| Métrique | Valeur |
|---|---|
| MAE | 1,19 jour |
| RMSE | 1,62 jour |
| R² | 0,84 |

L'analyse de l'importance des variables a confirmé que la **pathologie** et l'**âge** sont les facteurs les plus déterminants, cohérents avec la logique de génération. Le modèle a été sauvegardé (`joblib`) et une table de prédictions a été générée et chargée dans le Data Warehouse, pour alimenter à la fois Power BI et l'application web.

### 6.7 Tableau de bord Power BI

Un tableau de bord en 3 pages a été construit, connecté directement au Data Warehouse MySQL :
- **Page Exécutive** : cartes KPI globales, courbe d'évolution mensuelle avec prévision automatique, segments de filtrage (service, période), répartitions démographiques
- **Page Services** : classement d'activité, taux d'occupation, taux de décès, treemap des pathologies dominantes, jauge d'occupation globale, tableau KPI complet par service, médecin le plus actif par service
- **Page Prévisionnelle** : métriques du modèle ML, comparaison réel/prédit par service, nuage de points de précision, écarts de prédiction par service, arbre de décomposition interactif, analyse des facteurs clés (Key Influencers)

### 6.8 Application web — extension majeure du projet

À la demande du maître de stage, le projet a été étendu à une **application web complète**, afin d'illustrer concrètement les cas d'usage définis dans le cahier des charges (acteurs et cas d'utilisation).

#### 6.8.1 Architecture technique
- **Frontend** : React (Vite), avec React Router pour la navigation, Axios pour les appels API, Recharts pour les visualisations
- **Backend** : FastAPI (Python), connecté au même Data Warehouse MySQL et au modèle ML entraîné
- **Authentification** : JWT (JSON Web Token), mots de passe hachés avec bcrypt

#### 6.8.2 Évolution de la navigation — d'une page unique à une architecture multi-pages

Les premières versions des dashboards (Chef de service, Direction, Analyste) tenaient sur une seule page chacune, mélangeant KPI, graphiques et listes sans navigation claire. Cette architecture a été revue en profondeur pour passer à une **navigation en sidebar**, avec une page dédiée par fonction. Chaque rôle dispose désormais de son propre `Layout` et de sa propre `Sidebar` (ex. `LayoutChefService`/`SidebarChefService`, `LayoutAnalyste`/`SidebarAnalyste`, `LayoutAdmin`/`SidebarAdmin`), suivant un modèle homogène réutilisé d'un rôle à l'autre.

#### 6.8.3 Interface Chef de service

Restructurée en **5 pages dédiées** :

| Page | Contenu |
|---|---|
| Vue d'ensemble | KPI principaux, comparaison à la moyenne du CHU, classement parmi les services, pathologie dominante, médecin le plus actif, raccourcis |
| Graphiques détaillés | 8 répartitions (sexe, pathologie, ville, tranche d'âge, couverture santé, groupe sanguin, type d'admission, mode de sortie) |
| Liste des patients | Table paginée, **recherche libre** (pathologie, ville, médecin) et **4 filtres combinables** (sexe, type d'admission, mode de sortie, pathologie), tri interactif par colonne |
| Prédiction durée de séjour | Formulaire connecté au modèle ML, service pré-verrouillé sur le sien |
| Paramètres | Informations du compte |

Nouveaux endpoints backend associés à cette restructuration :
- `GET /api/kpi/repartition/{champ}` — endpoint générique paramétrable (un seul endpoint pour tous les graphiques de répartition, au lieu d'un endpoint dédié par graphique)
- `GET /api/kpi/volumes-mensuels`
- `GET /api/service/{id_service}/pathologies-disponibles`
- Filtres et recherche ajoutés à `GET /api/service/{id_service}/patients`
- Enrichissement de `GET /api/kpi/service/{id_service}` avec `patients_uniques`, `age_moyen`, `taux_guerison_pct`

#### 6.8.4 Interface Direction

- Vue exécutive globale et page Services (tous services confondus)
- **Liste des patients tous services confondus**, avec filtre par service (`GET /api/patients`)
- **Médecin le plus actif par service**, affiché dans le tableau comparatif de la Vue Services
- La page Prévisionnelle (basée sur le modèle ML), initialement prévue côté Direction, a finalement été **déplacée exclusivement vers l'Analyste**, jugée plus pertinente pour ce rôle d'exploration technique des données

#### 6.8.5 Interface Analyste Data

- Page **Données brutes** enrichie : recherche et 5 filtres combinables, tri cliquable, affichage de noms lisibles (service, médecin) plutôt que de simples identifiants, **export CSV** du jeu de données filtré
- Page **Modèle & Données** : tableau comparatif des 8 modèles de Machine Learning testés (lu dynamiquement depuis le CSV exporté par le notebook d'entraînement), détails du modèle retenu, schéma en étoile de la base
- Page **Prévisionnelle** : métriques du modèle ML, comparaison réel/prédit, écarts de prédiction

#### 6.8.6 Interface Administrateur — gestion des utilisateurs

Rôle ajouté en cours de projet, à la demande explicite de l'encadrant, pour la gestion complète des comptes utilisateurs de l'application.

**Point de vigilance technique traité en amont** : le hachage des mots de passe créés depuis l'interface d'administration devait être strictement compatible avec le système d'authentification existant (`bcrypt`, via `auth.py`), sous peine de créer des comptes ne pouvant jamais se connecter — toutes les fonctions d'écriture de mot de passe réutilisent donc exactement la même méthode de hachage.

**Amorçage du premier compte** : problème classique de type "œuf et poule" — il faut un administrateur pour créer des comptes via l'interface, mais aucun n'existe au départ. Résolu par un script à exécuter une seule fois en ligne de commande (`creer_premier_admin.py`), qui hache le mot de passe avec la même méthode que le reste de l'application avant insertion directe en base.

**Fonctionnalités livrées** :
- `GET /api/admin/utilisateurs` — liste complète (le mot de passe, même haché, n'est jamais exposé)
- `POST /api/admin/utilisateurs` — création
- `PUT /api/admin/utilisateurs/{id}` — modification
- `DELETE /api/admin/utilisateurs/{id}` — suppression, avec deux garde-fous : impossible de se supprimer soi-même, impossible de supprimer le dernier compte administrateur restant
- `POST /api/admin/utilisateurs/{id}/reinitialiser-mot-de-passe` — génère un mot de passe temporaire (ou en accepte un fourni), affiché **une seule fois** à l'écran, puisque seul son hash est conservé en base
- `GET /api/admin/stats` — KPI globaux : total utilisateurs, répartition par rôle (direction/chef_service/analyste/administrateur), nombre de services avec/sans chef assigné
- `GET /api/admin/services-chefs` — liste des services avec le chef actuellement assigné, utilisée pour piloter le formulaire

**Règle métier ajoutée à la demande du développeur** : *un service ne peut avoir qu'un seul chef de service à la fois.* Implémentée à deux niveaux :
- **Backend** (la garantie réelle) : vérification systématique avant toute création ou modification, sur l'état *final* du compte et non seulement sur ce qui change, avec exclusion de l'utilisateur en cours d'édition pour lui permettre de conserver son propre service — toute violation renvoie une erreur **409**
- **Frontend** (confort d'usage) : les services déjà attribués apparaissent grisés et désactivés dans le menu déroulant, avec le nom du chef actuel affiché

**Interface** : page unique combinant cartes KPI (effectifs par rôle, couverture des services), formulaire de création/édition, et tableau de gestion avec actions rapides (modifier, réinitialiser le mot de passe, supprimer), suivant la charte graphique déjà en place dans l'application.

#### 6.8.7 Sécurité, transversale à toute l'application

Chaque endpoint de l'API vérifie systématiquement le rôle de l'utilisateur — extrait du token JWT, jamais d'un paramètre envoyé par le client — et, pour un chef de service, son appartenance au bon service. Cette sécurité a été testée explicitement :
- Tentative d'accès aux données d'un autre service → erreur 403
- Tentative de prédiction pour un service qui n'est pas le sien → erreur 403
- Suppression du dernier compte administrateur → refusée
- Auto-suppression d'un compte administrateur → refusée
- Double affectation d'un chef à un service déjà occupé → refusée (409)

#### 6.8.8 Moteur de prédiction intégré

Un formulaire connecté directement au modèle ML sauvegardé permet d'estimer la durée de séjour d'un nouveau patient (âge, sexe, service, type d'admission, pathologie), avec une liste de pathologies dynamiquement filtrée selon le service sélectionné, et un service pré-verrouillé pour un chef de service.

### 6.9 Agent IA conversationnel d'aide à la décision

Le chantier le plus long et le plus itératif du projet, du fait des contraintes matérielles et des limites inhérentes à un petit modèle de langage exécuté en local.

#### 6.9.1 Contraintes de départ
- Budget nul : aucune API payante envisageable
- Matériel limité : 8 Go de RAM, disque système (C:) presque saturé
- Exigence de fonctionnement **100% local**, sans dépendance cloud, pour des raisons de coût et de confidentialité des données hospitalières

#### 6.9.2 Choix technologique
**Ollama** (exécution locale, gratuite et open-source) a été retenu, avec le modèle **`llama3.2:3b`**. Le stockage des modèles a été redirigé vers un second disque via la variable d'environnement `OLLAMA_MODELS`, pour contourner le manque d'espace sur le disque système.

#### 6.9.3 Décision d'architecture clé : sélection d'outils plutôt que SQL libre

Deux approches étaient possibles : (A) laisser le modèle écrire librement du SQL, ou (B) le laisser choisir parmi un catalogue d'outils Python déjà codés et sécurisés. **L'option (B) a été retenue en premier**, pour une raison de fiabilité : avec un modèle de seulement 3 milliards de paramètres, le risque d'erreur SQL générée librement était jugé trop élevé. L'option (A) a été ajoutée **dans un second temps**, à la demande explicite du développeur, sous forme d'un outil `requete_sql_libre` fortement encadré.

#### 6.9.4 Architecture technique retenue
1. **Sélection d'outil** via l'API native de *tool calling* d'Ollama (plus fiable qu'une extraction manuelle de JSON en texte libre)
2. **Exécution sécurisée** : le backend exécute la fonction Python correspondante, avec les restrictions de rôle systématiquement forcées
3. **Reformulation** : un second appel au modèle transforme le résultat brut en réponse en français, encadré par des règles strictes anti-hallucination

#### 6.9.5 Sécurité par rôle
Principe non négociable : **le rôle et le service de l'utilisateur proviennent toujours du token d'authentification, jamais de ce que le modèle propose.** L'outil `requete_sql_libre` est rendu **structurellement inaccessible** au chef de service : la liste d'outils envoyée au modèle est filtrée par rôle *avant* l'appel — l'outil n'existe tout simplement pas dans les choix possibles pour ce rôle, plutôt que de compter sur une simple instruction textuelle (jugée insuffisamment fiable après plusieurs tests).

#### 6.9.6 L'outil de requête SQL libre — garde-fous mis en place
- Utilisateur MySQL dédié, **lecture seule uniquement** (`GRANT SELECT`, aucun droit d'écriture)
- Validation post-génération : rejet de tout ce qui n'est pas un `SELECT` unique, ou qui contient un mot-clé dangereux (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`...)
- Ajout automatique d'une clause `LIMIT` si absente
- Schéma exact des tables fourni au modèle pour limiter les hallucinations de noms de colonnes
- Réservé à Direction et Analyste, jamais au chef de service (double verrouillage : filtrage de la liste d'outils + vérification explicite côté code)

#### 6.9.7 Génération de recommandations
Un outil `generer_recommandations` a été ajouté, conçu pour éviter le piège de l'hallucination : les conseils générés se basent **exclusivement sur des KPI déjà agrégés** (`kpi_global` / `kpi_service`), jamais sur des données patient individuelles. Le périmètre s'adapte au rôle (hôpital entier pour la Direction, service uniquement pour le chef de service, vue globale pour l'Analyste).

#### 6.9.8 Diagnostic matériel approfondi (contrainte RAM)
Une part importante du dépannage a porté sur la RAM disponible en temps réel, au-delà du simple total de 8 Go :
- Identification de plusieurs consommateurs cachés : VS Code (jusqu'à ~960 Mo répartis sur une vingtaine de processus), le navigateur, et surtout **3 processus "SQL Server Windows NT"** tournant en arrière-plan sans lien avec le projet (qui utilise MySQL, pas SQL Server) — recommandation de les désactiver via `services.msc`
- Mise en place d'un **workflow de lancement en terminaux externes** (backend et frontend lancés depuis PowerShell indépendant de VS Code), permettant de fermer complètement l'éditeur pendant l'utilisation de l'agent — pertinent en particulier pour le jour de la soutenance, où la RAM disponible doit être maximale

#### 6.9.9 Fonctionnalités finales de l'agent
- KPI globaux (Direction) et par service (tous rôles concernés)
- Répartitions par sexe, pathologie, ville, type d'admission, mode de sortie, tranche d'âge
- Évolution mensuelle des admissions, avec résumé fiable (tendance, mois extrêmes) calculé en Python plutôt que confié directement au modèle
- Génération de recommandations basées uniquement sur des indicateurs agrégés réels, adaptées au rôle
- Analyse ad hoc via génération de requêtes SQL en langage naturel, encadrée par des garde-fous stricts, réservée à Direction et Analyste
- Sécurité par rôle garantie structurellement
- Interface de chat (`AgentChat.jsx`) intégrée aux trois layouts existants (Direction, Chef de service, Analyste), avec affichage automatique d'un tableau quand la réponse contient des données structurées

---

## 7. Difficultés rencontrées et solutions apportées

### 7.1 Difficultés générales (données, base de données, Power BI, application web)

| Difficulté rencontrée | Solution apportée |
|---|---|
| Service MySQL non enregistré comme service Windows (installation faite hors installeur officiel) | Enregistrement manuel du service via `mysqld --install`, pointage vers le `my.ini` existant |
| Conflit entre le MySQL de WampServer et l'instance MySQL 9.1 standalone (même port 3306) | Désactivation du démarrage automatique du service WampServer |
| Erreur `DROP TABLE` bloquée par une contrainte de clé étrangère (`DimMedecin` référence `DimService`) | Réorganisation de l'ordre des suppressions dans le script SQL (table enfant avant table parente) |
| Modèle de Machine Learning peu performant (R² proche de 0) | Diagnostic : la durée de séjour était générée indépendamment des caractéristiques du patient. Correction : injection d'une relation causale réaliste dans le générateur de données, portant le R² à 0,84 |
| Incompatibilité `passlib` / versions récentes de `bcrypt` | Utilisation directe de la librairie `bcrypt`, sans passer par `passlib` |
| Filtre Power BI bloqué sur une valeur "(Vide)" malgré des données propres en base | Identifié comme un problème de cache Power BI (sélection de filtre restée active sans indication visuelle claire) ; résolu en effaçant explicitement la sélection du segment |
| Double multiplication par 100 sur les mesures de pourcentage DAX (le format "Pourcentage" de Power BI multiplie déjà par 100) | Suppression du `* 100` dans les formules DAX, le format d'affichage s'en chargeant seul |
| Page blanche côté application React sans message d'erreur visible | Diagnostic via la console navigateur (F12) : caractère parasite (`S`) introduit lors d'une copie manuelle de code, cassant la syntaxe JavaScript |
| Import de fichier manquant (`LayoutAnalyste.jsx`) après réorganisation de la navigation par rôle | Renvoi direct des fichiers manquants en téléchargement, pour éviter les erreurs de copie manuelle |
| Confusion initiale sur le connecteur MySQL pour Power BI (page de téléchargement ne proposant qu'une version "32-bit") | Clarifié : les binaires "Any CPU" fonctionnent aussi bien sur systèmes 64-bit ; installation en mode "Complete" recommandée |
| Imports manquants dans `App.jsx` après ajout des nouvelles pages de la navigation multi-pages | Routes plantant au chargement ; imports corrigés systématiquement |
| Endpoint `/api/kpi/volumes-mensuels` appelé par le frontend mais totalement absent du backend | Chargement bloqué indéfiniment ; endpoint créé |
| `ROW_NUMBER() OVER (PARTITION BY ...)` non supporté par les versions de MySQL antérieures à 8.0 | Remplacé par un calcul équivalent réalisé en Python |
| Bug de déconnexion : sidebars appelant une fonction `deconnexion()` inexistante au lieu de `logout()` | Bouton silencieusement inopérant ; nom de fonction corrigé |
| Absence de `try/catch/finally` autour de certains appels `Promise.allSettled` | État de chargement bloqué sans message d'erreur en cas d'exception imprévue ; gestion d'erreur ajoutée systématiquement |
| `DashboardServices.jsx` appelant 3 endpoints inexistants (`services-detail`, `pathologie-dominante`, `top-medecins`) | Création des 3 fonctions backend correspondantes |
| Après ajout du rôle administrateur, redirection automatique vers `/login` au lieu du tableau de bord | La logique de redirection ne gérait pas ce nouveau rôle ; ajout de la condition manquante dans le composant de redirection |
| Risque qu'un même service se voie attribuer deux chefs différents | Mise en place d'une vérification côté serveur (409) avant toute création/modification, en plus d'un filtrage visuel côté frontend |

### 7.2 Difficultés spécifiques à l'agent IA conversationnel

| # | Problème observé | Cause | Correction |
|---|---|---|---|
| 1 | Timeout (504) sur la première question | Chargement à froid du modèle en mémoire | Augmentation du délai d'attente, message explicatif |
| 2 | Le modèle "bavarde" au lieu de répondre en JSON strict | Absence de contrainte de format | Passage au format JSON forcé, puis migration vers l'API native de *tool calling* |
| 3 | Texte reformulé mensonger sur le nom du service consulté (ex. "Pédiatrie" affiché alors que les vraies données sont "Cardiologie") | Le modèle ignore le champ réel des données et recopie le nom mentionné dans la question | Message de sécurité construit en Python déterministe, puis (le problème ayant persisté) filet de sécurité automatique : tout nom de service incorrect détecté dans le texte final est corrigé par recherche/remplacement en Python |
| 4 | Invention de chiffres et de dates sur l'évolution mensuelle | Le modèle est peu fiable pour analyser une longue liste de valeurs | Calcul d'un résumé fiable en Python (moyenne, min, max, tendance) fourni au modèle, au lieu de la liste brute |
| 5 | Mauvaise sélection d'outil (`kpi_global` au lieu de `volumes_mensuels`) | Descriptions d'outils insuffisamment différenciées | Réécriture des descriptions avec exemples de formulations déclenchantes |
| 6 | RAM saturée (94%) et stockage sur disque lent → nouveaux timeouts | Contrainte matérielle réelle | Libération de RAM (fermeture VS Code, navigateur, désactivation de services Windows inutilisés type SQL Server), option de modèle plus léger (`llama3.2:1b`) |
| 7 | Invention d'un nom de patient complet n'existant dans aucune donnée | Absence de garde-fou explicite contre l'invention d'identités | Interdiction stricte et explicite dans le prompt de reformulation |
| 8 | Questions hors sujet mal orientées vers un outil technique au lieu d'être refusées poliment | `requete_sql_libre` puis `generer_recommandations` servaient de "fourre-tout" par défaut | Tentative d'un filtre de pertinence binaire en amont — cette correction a elle-même introduit un bug plus grave (voir #10) |
| 9 | "Analyse SQL libre réservée à la Direction" affichée à un chef de service pour une question hors sujet | L'outil restait sélectionnable malgré les instructions textuelles | Filtrage structurel de la liste d'outils par rôle |
| 10 | Le filtre de pertinence (#8) bloquait TOUTES les questions, y compris légitimes | `max_tokens` trop court pour laisser au modèle la place d'écrire "OUI" proprement → réponse tronquée systématiquement interprétée comme refus | Filtre corrigé une première fois, puis retiré entièrement — les deux autres couches de protection (choix d'outil + descriptions resserrées) suffisent, au prix d'un risque résiduel mineur et non sécuritaire |
| 11 | Invention d'une liste de faux patients (identifiants à consonance suspecte) quand la question demandait un niveau de détail que l'outil disponible ne pouvait pas fournir | Le modèle préfère halluciner une réponse plaisante plutôt que d'admettre une limite | Instruction explicite : si les données ne permettent pas de répondre au niveau de détail demandé, le dire honnêtement plutôt que d'inventer |
| 12 | Erreur de connexion MySQL (`Access denied`) sur l'outil SQL libre | Les identifiants du compte lecture seule avaient été écrasés par des valeurs placeholder lors d'une réécriture complète du fichier | Ré-application des vrais identifiants, vigilance accrue lors des réécritures complètes de fichier |
| 13 | Timeout systématique spécifiquement sur les recommandations | Génération plus longue (jusqu'à 700 tokens) dépassant le délai fixe | Délai d'attente augmenté globalement pour absorber ce cas |
| 14 | Fonction de correction du nom de service écrite mais jamais réellement appelée | Oubli d'intégration lors de l'ajout de la fonction | Branchement effectif dans le point d'entrée principal de l'agent |

---

## 8. Fichiers principaux du projet

**Frontend (React) :**
`App.jsx`, `AuthContext.jsx`, `axiosConfig.js` — cœur applicatif
`VueEnsembleChefService.jsx`, `GraphiquesChefService.jsx`, `ListePatientsChefService.jsx`, `ParametresChefService.jsx`, `Prediction.jsx`, `SidebarChefService.jsx`, `LayoutChefService.jsx` — espace Chef de service
`DashboardDirection.jsx`, `DashboardServices.jsx`, `ListePatientsDirection.jsx`, `SidebarDirection.jsx`, `LayoutDirection.jsx` — espace Direction
`DashboardAnalyste.jsx`, `DashboardPrevision.jsx`, `DetailsModeleAnalyste.jsx`, `SidebarAnalyste.jsx`, `LayoutAnalyste.jsx` — espace Analyste
`GestionUtilisateursAdmin.jsx`, `SidebarAdmin.jsx`, `LayoutAdmin.jsx` — espace Administrateur
`AgentChat.jsx`, `AgentChatChefService.jsx`, `AgentChatDirection.jsx`, `AgentChatAnalyste.jsx` — agent conversationnel

**Backend (FastAPI) :**
`main.py` (point d'entrée, enregistrement des routers), `database.py`, `auth.py` — socle applicatif
`kpi_router.py`, `dashboard_router.py`, `patients_router.py`, `prediction_router.py` — endpoints métier
`admin_router.py`, `creer_premier_admin.py` — gestion des utilisateurs
`agent_router.py` — cœur de l'agent IA (sélection d'outils, exécution, reformulation)
`seed_users.py` — création des utilisateurs de test
`schema_dwh.sql`, `create_users_table.sql` — scripts SQL

**Data Engineering (notebooks Jupyter) :**
`01_generation_dataset.ipynb`, `02_audit_qualite_donnees.ipynb`, `03_etl_chargement_dwh.ipynb`, `04_analyse_exploratoire_kpi.ipynb`, `05_modele_prediction_duree_sejour.ipynb`

---

## 9. Résultats et livrables

- Dataset synthétique documenté (dictionnaire de données Excel, 6 onglets)
- Rapport d'audit et de qualité des données (avant/après, graphiques comparatifs)
- Scripts ETL et schéma du Data Warehouse (notebooks Jupyter + script SQL)
- Notebook d'analyse exploratoire et tableau des KPI
- Modèle de prédiction de la durée de séjour (Ridge, R² = 0,84), comparé à 7 autres modèles
- Tableau de bord Power BI (3 pages, avec visuels avancés : arbre de décomposition, influenceurs clés, prévision automatique)
- **Application web complète** (React + FastAPI) :
  - Authentification sécurisée par rôle (JWT)
  - 4 interfaces dédiées en navigation multi-pages (Direction, Chef de service, Analyste, Administrateur)
  - Moteur de prédiction intégré
  - Interface d'administration avec gestion des utilisateurs et règles métier appliquées côté serveur
  - **Agent IA conversationnel 100% local et gratuit** (Ollama/llama3.2), avec sécurité par rôle structurelle, garde-fous anti-hallucination, et outil de requête SQL libre encadré pour Direction et Analyste

---

## 10. Conclusion et perspectives

Ce projet a permis de couvrir l'ensemble de la chaîne de valeur de la donnée hospitalière : de la génération et du nettoyage des données brutes jusqu'à une application décisionnelle interactive et sécurisée par rôle, en passant par la modélisation en Data Warehouse, l'analyse exploratoire, le Machine Learning, la visualisation avancée avec Power BI, et un agent conversationnel intelligent exécuté entièrement en local.

Au-delà du périmètre initial du cahier des charges, le projet a été considérablement étendu — application web complète, puis agent IA — démontrant la faisabilité technique d'une plateforme réellement utilisable par les différents acteurs de l'hôpital, avec une architecture de sécurité robuste (vérifications systématiquement effectuées côté serveur, jamais uniquement côté interface ou confiées au modèle de langage).

### Perspectives d'amélioration

- Remplacement des données synthétiques par des données réelles anonymisées, dans le respect de la réglementation sur les données de santé
- Ajout d'autres cas d'usage de Machine Learning (prédiction de réadmission, détection d'anomalies de facturation, etc.)
- Déploiement de l'application web sur une infrastructure de production (serveur interne du CHU)
- Mise en place d'une actualisation automatique et planifiée du pipeline de données (orchestration)
- Ajout de journaux d'audit (qui a consulté quoi, qui a modifié quel compte) pour renforcer la traçabilité de l'application d'administration
- Branchement de l'outil de prédiction de durée de séjour à l'agent conversationnel (extraction des paramètres patient depuis une question en langage naturel) — prévu mais non réalisé faute de temps
- Enrichissement de la mémoire de conversation de l'agent, au-delà des derniers échanges transmis à chaque requête
- Test complet de l'application (agent inclus) en conditions réelles de présentation (RAM libérée, éditeur fermé) avant toute soutenance, pour éviter toute mauvaise surprise en direct
