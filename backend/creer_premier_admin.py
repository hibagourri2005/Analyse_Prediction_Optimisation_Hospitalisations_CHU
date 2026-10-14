"""
Script à exécuter UNE SEULE FOIS, depuis le dossier backend/, pour créer le premier
compte administrateur. Ensuite, tous les autres comptes (y compris d'autres admins)
se créent depuis l'interface admin de l'application.

Usage :
    python creer_premier_admin.py
"""
import bcrypt
from sqlalchemy import text
from database import engine

print("=== Création du premier compte administrateur ===")
username = input("Nom d'utilisateur (ex: admin) : ").strip()
mot_de_passe = input("Mot de passe : ").strip()
nom_complet = input("Nom complet (ex: Admin Système) : ").strip()

if not username or not mot_de_passe:
    print("Nom d'utilisateur et mot de passe obligatoires. Arrêt.")
    exit(1)

hash_bcrypt = bcrypt.hashpw(mot_de_passe.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

with engine.connect() as conn:
    existe = conn.execute(
        text("SELECT id FROM utilisateurs WHERE username = :u"), {"u": username}
    ).fetchone()

    if existe:
        print(f"Un utilisateur '{username}' existe déjà. Arrêt, rien n'a été modifié.")
        exit(1)

    conn.execute(
        text("""
            INSERT INTO utilisateurs (username, password_hash, role, id_service, nom_complet)
            VALUES (:username, :password_hash, 'administrateur', NULL, :nom_complet)
        """),
        {"username": username, "password_hash": hash_bcrypt, "nom_complet": nom_complet},
    )
    conn.commit()

print(f"\n Compte administrateur '{username}' créé avec succès.")
print("Tu peux maintenant te connecter avec ce compte sur la page de login habituelle.")