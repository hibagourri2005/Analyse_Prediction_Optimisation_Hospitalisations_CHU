-- Table des utilisateurs de l'application web (rôles : direction, chef_service, analyste)

DROP TABLE IF EXISTS utilisateurs;

CREATE TABLE utilisateurs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,       -- 'direction', 'chef_service', 'analyste'
    id_service INT NULL,             -- rempli uniquement si role = 'chef_service'
    nom_complet VARCHAR(100),
    FOREIGN KEY (id_service) REFERENCES DimService(id_service)
) ENGINE=InnoDB;
DESCRIBE utilisateurs;