-- =========================================================
-- Schéma étoile - CHU Mohammed VI Agadir - Module Hospitalisations
-- =========================================================

DROP TABLE IF EXISTS FactHospitalisation;
DROP TABLE IF EXISTS DimMedecin;
DROP TABLE IF EXISTS DimPatient;
DROP TABLE IF EXISTS DimTemps;
DROP TABLE IF EXISTS DimService;

CREATE TABLE DimPatient (
    id_patient      INT PRIMARY KEY,
    age             INT,
    tranche_age     VARCHAR(20),
    sexe            VARCHAR(10),
    ville           VARCHAR(50),
    groupe_sanguin  VARCHAR(5),
    couverture_sante VARCHAR(30)
) ENGINE=InnoDB;

CREATE TABLE DimTemps (
    id_temps        INT PRIMARY KEY,       -- format AAAAMMJJ, ex: 20260315
    date_complete   DATE,
    jour            INT,
    mois            INT,
    trimestre       INT,
    annee           INT,
    jour_semaine    VARCHAR(15)
) ENGINE=InnoDB;

CREATE TABLE DimService (
    id_service      INT PRIMARY KEY,
    nom_service     VARCHAR(100),
    categorie       VARCHAR(50),
    capacite_lits   INT,
    etage           INT
) ENGINE=InnoDB;

CREATE TABLE DimMedecin (
    id_medecin          INT PRIMARY KEY,
    nom                 VARCHAR(100),
    prenom              VARCHAR(100),
    specialite          VARCHAR(100),
    id_service          INT,
    annees_experience   INT,
    FOREIGN KEY (id_service) REFERENCES DimService(id_service)
) ENGINE=InnoDB;

CREATE TABLE FactHospitalisation (
    id_fait             INT PRIMARY KEY AUTO_INCREMENT,
    id_patient          INT,
    id_temps            INT,
    id_service          INT,
    id_medecin          INT,
    duree_sejour        INT,
    jours_occupation    INT,
    type_admission       VARCHAR(30),
    pathologie           VARCHAR(150),
    mode_sortie           VARCHAR(50),
    FOREIGN KEY (id_patient) REFERENCES DimPatient(id_patient),
    FOREIGN KEY (id_temps) REFERENCES DimTemps(id_temps),
    FOREIGN KEY (id_service) REFERENCES DimService(id_service),
    FOREIGN KEY (id_medecin) REFERENCES DimMedecin(id_medecin)
) ENGINE=InnoDB;