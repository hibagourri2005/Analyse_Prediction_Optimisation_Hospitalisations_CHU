"""
Script à exécuter UNE FOIS pour créer les utilisateurs de test dans la base chu_dwh.
Lance-le depuis le dossier backend/ : python seed_users.py
"""
import bcrypt
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "chu_dwh")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD")

engine = create_engine(f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}")


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# --- Utilisateurs de test ---
# ATTENTION : mots de passe simples pour la démo/soutenance uniquement.
# Ne jamais utiliser des mots de passe aussi simples dans un vrai déploiement CHU.
utilisateurs_test = [
    {"username": "direction", "password": "direction123", "role": "direction", "id_service": None, "nom_complet": "Dr. Directrice Générale"},
    {"username": "chef.cardio", "password": "chef123", "role": "chef_service", "id_service": 1, "nom_complet": "Dr. Chef Cardiologie"},
    {"username": "chef.urgences", "password": "chef123", "role": "chef_service", "id_service": 4, "nom_complet": "Dr. Chef Urgences"},
    {"username": "analyste", "password": "analyste123", "role": "analyste", "id_service": None, "nom_complet": "Data Analyst"},
]

with engine.begin() as conn:
    for u in utilisateurs_test:
        hashed = hash_password(u["password"])
        conn.execute(
            text("""
                INSERT INTO utilisateurs (username, password_hash, role, id_service, nom_complet)
                VALUES (:username, :password_hash, :role, :id_service, :nom_complet)
                ON DUPLICATE KEY UPDATE password_hash = :password_hash
            """),
            {
                "username": u["username"],
                "password_hash": hashed,
                "role": u["role"],
                "id_service": u["id_service"],
                "nom_complet": u["nom_complet"],
            },
        )

print("Utilisateurs créés avec succès :")
for u in utilisateurs_test:
    print(f"  - {u['username']} / {u['password']} (rôle: {u['role']})")