import secrets
import string
import bcrypt
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from database import engine
from auth import require_role

router = APIRouter(prefix="/api/admin", tags=["administration"])

RoleValide = Literal["direction", "chef_service", "analyste", "administrateur"]


# ============================================================
# Schémas de requête
# ============================================================

class UtilisateurCreation(BaseModel):
    username: str
    mot_de_passe: str
    role: RoleValide
    id_service: Optional[int] = None
    nom_complet: Optional[str] = None


class UtilisateurModification(BaseModel):
    username: Optional[str] = None
    role: Optional[RoleValide] = None
    id_service: Optional[int] = None
    nom_complet: Optional[str] = None


class ReinitialisationMotDePasse(BaseModel):
    nouveau_mot_de_passe: Optional[str] = None


# ============================================================
# Utilitaires
# ============================================================

def hacher_mot_de_passe(mot_de_passe_clair: str) -> str:
    return bcrypt.hashpw(mot_de_passe_clair.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def generer_mot_de_passe_temporaire(longueur: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(longueur))


def verifier_service_disponible(conn, id_service: int, id_utilisateur_exclu: Optional[int] = None):
    """Lève une 409 si un AUTRE utilisateur (chef_service) est déjà rattaché à ce service.
    id_utilisateur_exclu permet d'ignorer l'utilisateur en cours d'édition (pour ne pas se
    bloquer lui-même quand on modifie un chef sans changer son service)."""
    requete = """
        SELECT id, username, nom_complet FROM utilisateurs
        WHERE id_service = :id_service AND role = 'chef_service'
    """
    params = {"id_service": id_service}
    if id_utilisateur_exclu is not None:
        requete += " AND id != :id_exclu"
        params["id_exclu"] = id_utilisateur_exclu

    occupant = conn.execute(text(requete), params).fetchone()
    if occupant:
        nom_affiche = occupant[2] or occupant[1]
        raise HTTPException(
            status_code=409,
            detail=f"Ce service a déjà un chef de service assigné : {nom_affiche}. "
                    f"Un service ne peut avoir qu'un seul chef à la fois.",
        )


# ============================================================
# Routes — statistiques
# ============================================================

@router.get("/stats")
def statistiques_utilisateurs(current_user: dict = Depends(require_role("administrateur"))):
    """KPI globaux pour le dashboard admin : effectifs par rôle + couverture des services."""
    with engine.connect() as conn:
        repartition = conn.execute(text("""
            SELECT role, COUNT(*) FROM utilisateurs GROUP BY role
        """)).fetchall()

        nb_total_services = conn.execute(text("SELECT COUNT(*) FROM DimService")).fetchone()[0]

        nb_services_avec_chef = conn.execute(text("""
            SELECT COUNT(DISTINCT id_service) FROM utilisateurs
            WHERE role = 'chef_service' AND id_service IS NOT NULL
        """)).fetchone()[0]

    compteurs = {"direction": 0, "chef_service": 0, "analyste": 0, "administrateur": 0}
    for role, nb in repartition:
        compteurs[role] = nb

    return {
        "nb_total_utilisateurs": sum(compteurs.values()),
        "nb_direction": compteurs["direction"],
        "nb_chef_service": compteurs["chef_service"],
        "nb_analyste": compteurs["analyste"],
        "nb_administrateur": compteurs["administrateur"],
        "nb_total_services": nb_total_services,
        "nb_services_avec_chef": nb_services_avec_chef,
        "nb_services_sans_chef": nb_total_services - nb_services_avec_chef,
    }


@router.get("/services-chefs")
def services_avec_chef(current_user: dict = Depends(require_role("administrateur"))):
    """Liste des services avec, pour chacun, le chef actuellement assigné (ou null).
    Utilisée par le frontend pour désactiver les services déjà pris dans le formulaire."""
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT s.id_service, s.nom_service, u.id, u.nom_complet, u.username
            FROM DimService s
            LEFT JOIN utilisateurs u ON u.id_service = s.id_service AND u.role = 'chef_service'
            ORDER BY s.nom_service
        """)).fetchall()

    return [
        {
            "id_service": l[0],
            "nom_service": l[1],
            "id_chef_actuel": l[2],
            "nom_chef_actuel": l[3] or l[4],
        }
        for l in lignes
    ]


# ============================================================
# Routes — gestion des utilisateurs
# ============================================================

@router.get("/utilisateurs")
def liste_utilisateurs(current_user: dict = Depends(require_role("administrateur"))):
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT u.id, u.username, u.role, u.id_service, s.nom_service, u.nom_complet
            FROM utilisateurs u
            LEFT JOIN DimService s ON u.id_service = s.id_service
            ORDER BY u.id
        """)).fetchall()

    colonnes = ["id", "username", "role", "id_service", "nom_service", "nom_complet"]
    return [dict(zip(colonnes, l)) for l in lignes]


@router.post("/utilisateurs", status_code=201)
def creer_utilisateur(payload: UtilisateurCreation, current_user: dict = Depends(require_role("administrateur"))):
    if payload.role == "chef_service" and payload.id_service is None:
        raise HTTPException(status_code=400, detail="Un chef de service doit être rattaché à un service (id_service).")

    id_service_final = payload.id_service if payload.role == "chef_service" else None

    with engine.connect() as conn:
        existe = conn.execute(
            text("SELECT id FROM utilisateurs WHERE username = :u"), {"u": payload.username}
        ).fetchone()
        if existe:
            raise HTTPException(status_code=409, detail="Ce nom d'utilisateur existe déjà.")

        # --- Règle métier : un service ne peut avoir qu'un seul chef ---
        if payload.role == "chef_service":
            verifier_service_disponible(conn, id_service_final)

        conn.execute(
            text("""
                INSERT INTO utilisateurs (username, password_hash, role, id_service, nom_complet)
                VALUES (:username, :password_hash, :role, :id_service, :nom_complet)
            """),
            {
                "username": payload.username,
                "password_hash": hacher_mot_de_passe(payload.mot_de_passe),
                "role": payload.role,
                "id_service": id_service_final,
                "nom_complet": payload.nom_complet,
            },
        )
        conn.commit()

    return {"message": "Utilisateur créé avec succès."}


@router.put("/utilisateurs/{id_utilisateur}")
def modifier_utilisateur(
    id_utilisateur: int,
    payload: UtilisateurModification,
    current_user: dict = Depends(require_role("administrateur")),
):
    with engine.connect() as conn:
        existant = conn.execute(
            text("SELECT username, role, id_service FROM utilisateurs WHERE id = :id"), {"id": id_utilisateur}
        ).fetchone()
        if not existant:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

        role_final = payload.role if payload.role is not None else existant[1]
        id_service_final = payload.id_service if payload.id_service is not None else existant[2]

        # --- Règle métier : un service ne peut avoir qu'un seul chef ---
        # On vérifie dès que le résultat final serait "chef_service" rattaché à un service,
        # en excluant l'utilisateur courant lui-même de la vérification.
        if role_final == "chef_service":
            if id_service_final is None:
                raise HTTPException(status_code=400, detail="Un chef de service doit être rattaché à un service (id_service).")
            verifier_service_disponible(conn, id_service_final, id_utilisateur_exclu=id_utilisateur)

        champs = []
        params = {"id": id_utilisateur}

        if payload.username is not None:
            champs.append("username = :username")
            params["username"] = payload.username

        if payload.role is not None:
            champs.append("role = :role")
            params["role"] = payload.role
            if payload.role != "chef_service" and payload.id_service is None:
                champs.append("id_service = NULL")

        if payload.id_service is not None:
            champs.append("id_service = :id_service")
            params["id_service"] = payload.id_service

        if payload.nom_complet is not None:
            champs.append("nom_complet = :nom_complet")
            params["nom_complet"] = payload.nom_complet

        if not champs:
            raise HTTPException(status_code=400, detail="Aucune modification fournie.")

        conn.execute(text(f"UPDATE utilisateurs SET {', '.join(champs)} WHERE id = :id"), params)
        conn.commit()

    return {"message": "Utilisateur modifié avec succès."}


@router.delete("/utilisateurs/{id_utilisateur}")
def supprimer_utilisateur(id_utilisateur: int, current_user: dict = Depends(require_role("administrateur"))):
    with engine.connect() as conn:
        cible = conn.execute(
            text("SELECT username, role FROM utilisateurs WHERE id = :id"), {"id": id_utilisateur}
        ).fetchone()
        if not cible:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

        if cible[0] == current_user["username"]:
            raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte.")

        if cible[1] == "administrateur":
            nb_admins = conn.execute(
                text("SELECT COUNT(*) FROM utilisateurs WHERE role = 'administrateur'")
            ).fetchone()[0]
            if nb_admins <= 1:
                raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier compte administrateur.")

        conn.execute(text("DELETE FROM utilisateurs WHERE id = :id"), {"id": id_utilisateur})
        conn.commit()

    return {"message": "Utilisateur supprimé avec succès."}


@router.post("/utilisateurs/{id_utilisateur}/reinitialiser-mot-de-passe")
def reinitialiser_mot_de_passe(
    id_utilisateur: int,
    payload: ReinitialisationMotDePasse,
    current_user: dict = Depends(require_role("administrateur")),
):
    with engine.connect() as conn:
        existant = conn.execute(
            text("SELECT id FROM utilisateurs WHERE id = :id"), {"id": id_utilisateur}
        ).fetchone()
        if not existant:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

        nouveau_mdp = payload.nouveau_mot_de_passe or generer_mot_de_passe_temporaire()

        conn.execute(
            text("UPDATE utilisateurs SET password_hash = :hash WHERE id = :id"),
            {"hash": hacher_mot_de_passe(nouveau_mdp), "id": id_utilisateur},
        )
        conn.commit()

    return {"message": "Mot de passe réinitialisé avec succès.", "nouveau_mot_de_passe": nouveau_mdp}