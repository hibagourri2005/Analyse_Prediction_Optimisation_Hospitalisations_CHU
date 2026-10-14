from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from database import engine
from auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["patients"])

COLONNES_TRI_AUTORISEES = {
    "duree_sejour": "f.duree_sejour",
    "age": "p.age",
    "date_entree": "t.date_complete",
}


@router.get("/service/{id_service}/patients")
def liste_patients_service(
    id_service: int,
    page: int = Query(1, ge=1),
    taille_page: int = Query(15, ge=1, le=100),
    tri_par: str = Query("duree_sejour"),
    ordre: str = Query("desc", pattern="^(asc|desc)$"),
    recherche: str | None = Query(None, description="Recherche texte libre : pathologie, ville ou médecin"),
    sexe: str | None = Query(None, pattern="^(M|F)$"),
    type_admission: str | None = Query(None),
    mode_sortie: str | None = Query(None),
    pathologie: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Liste paginée, triable, filtrable des patients hospitalisés dans un service.
    - chef_service : uniquement SON service
    - direction : n'importe quel service
    """
    if current_user["role"] == "chef_service" and current_user["id_service"] != id_service:
        raise HTTPException(status_code=403, detail="Accès refusé à ce service")
    if current_user["role"] not in ("direction", "chef_service"):
        raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")

    colonne_tri = COLONNES_TRI_AUTORISEES.get(tri_par, "f.duree_sejour")
    offset = (page - 1) * taille_page

    conditions = ["f.id_service = :id_service"]
    params = {"id_service": id_service, "limite": taille_page, "offset": offset}

    if recherche:
        conditions.append("(f.pathologie LIKE :recherche OR p.ville LIKE :recherche OR CONCAT(m.prenom, ' ', m.nom) LIKE :recherche)")
        params["recherche"] = f"%{recherche}%"

    if sexe:
        conditions.append("p.sexe = :sexe")
        params["sexe"] = sexe

    if type_admission:
        conditions.append("f.type_admission = :type_admission")
        params["type_admission"] = type_admission

    if mode_sortie:
        conditions.append("f.mode_sortie = :mode_sortie")
        params["mode_sortie"] = mode_sortie

    if pathologie:
        conditions.append("f.pathologie = :pathologie")
        params["pathologie"] = pathologie

    clause_where = " AND ".join(conditions)

    with engine.connect() as conn:
        total = conn.execute(
            text(f"""
                SELECT COUNT(*)
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
            """),
            params,
        ).fetchone()[0]

        lignes = conn.execute(
            text(f"""
                SELECT
                    f.id_fait, f.id_patient, p.age, p.sexe, p.ville,
                    t.date_complete, f.duree_sejour, f.type_admission,
                    f.pathologie, f.mode_sortie, CONCAT(m.prenom, ' ', m.nom) AS medecin
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                JOIN DimTemps t ON f.id_temps = t.id_temps
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
                ORDER BY {colonne_tri} {ordre.upper()}
                LIMIT :limite OFFSET :offset
            """),
            params,
        ).fetchall()

    colonnes = ["id_fait", "id_patient", "age", "sexe", "ville", "date_entree",
                "duree_sejour", "type_admission", "pathologie", "mode_sortie", "medecin"]

    return {
        "page": page,
        "taille_page": taille_page,
        "total_lignes": total,
        "donnees": [dict(zip(colonnes, l)) for l in lignes],
    }


@router.get("/service/{id_service}/pathologies-disponibles")
def pathologies_disponibles(id_service: int, current_user: dict = Depends(get_current_user)):
    """Liste des pathologies distinctes présentes dans ce service, pour peupler le filtre."""
    if current_user["role"] == "chef_service" and current_user["id_service"] != id_service:
        raise HTTPException(status_code=403, detail="Accès refusé à ce service")

    with engine.connect() as conn:
        lignes = conn.execute(
            text("SELECT DISTINCT pathologie FROM FactHospitalisation WHERE id_service = :id_service ORDER BY pathologie"),
            {"id_service": id_service},
        ).fetchall()

    return [l[0] for l in lignes]


# ============================================================
# NOUVEAU — routes Direction : tous services confondus
# ============================================================

@router.get("/patients")
def liste_patients_direction(
    page: int = Query(1, ge=1),
    taille_page: int = Query(15, ge=1, le=100),
    tri_par: str = Query("duree_sejour"),
    ordre: str = Query("desc", pattern="^(asc|desc)$"),
    recherche: str | None = Query(None, description="Recherche texte libre : pathologie, ville ou médecin"),
    id_service: int | None = Query(None, description="Filtrer par service précis, ou vide pour tous les services"),
    sexe: str | None = Query(None, pattern="^(M|F)$"),
    type_admission: str | None = Query(None),
    mode_sortie: str | None = Query(None),
    pathologie: str | None = Query(None),
    current_user: dict = Depends(require_role("direction")),
):
    """Liste paginée, triable, filtrable des patients — TOUS SERVICES confondus.
    Réservée à la Direction (le chef de service utilise /service/{id_service}/patients).
    """
    colonne_tri = COLONNES_TRI_AUTORISEES.get(tri_par, "f.duree_sejour")
    offset = (page - 1) * taille_page

    conditions = ["1=1"]
    params = {"limite": taille_page, "offset": offset}

    if id_service is not None:
        conditions.append("f.id_service = :id_service")
        params["id_service"] = id_service

    if recherche:
        conditions.append("(f.pathologie LIKE :recherche OR p.ville LIKE :recherche OR CONCAT(m.prenom, ' ', m.nom) LIKE :recherche)")
        params["recherche"] = f"%{recherche}%"

    if sexe:
        conditions.append("p.sexe = :sexe")
        params["sexe"] = sexe

    if type_admission:
        conditions.append("f.type_admission = :type_admission")
        params["type_admission"] = type_admission

    if mode_sortie:
        conditions.append("f.mode_sortie = :mode_sortie")
        params["mode_sortie"] = mode_sortie

    if pathologie:
        conditions.append("f.pathologie = :pathologie")
        params["pathologie"] = pathologie

    clause_where = " AND ".join(conditions)

    with engine.connect() as conn:
        total = conn.execute(
            text(f"""
                SELECT COUNT(*)
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
            """),
            params,
        ).fetchone()[0]

        lignes = conn.execute(
            text(f"""
                SELECT
                    f.id_fait, f.id_patient, p.age, p.sexe, p.ville,
                    t.date_complete, f.duree_sejour, f.type_admission,
                    f.pathologie, f.mode_sortie, CONCAT(m.prenom, ' ', m.nom) AS medecin,
                    s.nom_service
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                JOIN DimTemps t ON f.id_temps = t.id_temps
                JOIN DimService s ON f.id_service = s.id_service
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
                ORDER BY {colonne_tri} {ordre.upper()}
                LIMIT :limite OFFSET :offset
            """),
            params,
        ).fetchall()

    colonnes = ["id_fait", "id_patient", "age", "sexe", "ville", "date_entree",
                "duree_sejour", "type_admission", "pathologie", "mode_sortie", "medecin", "nom_service"]

    return {
        "page": page,
        "taille_page": taille_page,
        "total_lignes": total,
        "donnees": [dict(zip(colonnes, l)) for l in lignes],
    }


@router.get("/pathologies-disponibles")
def pathologies_disponibles_globales(current_user: dict = Depends(get_current_user)):
    """Liste des pathologies distinctes, toutes services confondus (pour le filtre Direction et Analyste)."""
    if current_user["role"] not in ("direction", "analyste"):
        raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")

    with engine.connect() as conn:
        lignes = conn.execute(
            text("SELECT DISTINCT pathologie FROM FactHospitalisation ORDER BY pathologie"),
        ).fetchall()

    return [l[0] for l in lignes]