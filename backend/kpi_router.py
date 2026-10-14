from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from database import engine
from auth import get_current_user, require_role
import csv
import io

router = APIRouter(prefix="/api", tags=["kpi"])


@router.get("/kpi/global")
def kpi_global(current_user: dict = Depends(require_role("direction"))):
    """Vue KPI globale - réservée à la Direction."""
    with engine.connect() as conn:
        resultat = conn.execute(text("""
            SELECT
                COUNT(*) AS total_hospitalisations,
                COUNT(DISTINCT id_patient) AS nb_patients_uniques,
                COUNT(DISTINCT id_service) AS nb_services,
                COUNT(DISTINCT id_medecin) AS nb_medecins,
                ROUND(AVG(duree_sejour), 2) AS duree_moyenne_sejour,
                SUM(CASE WHEN type_admission = 'Urgence' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_urgence_pct,
                SUM(CASE WHEN mode_sortie = 'Décès' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_deces_pct,
                SUM(CASE WHEN mode_sortie = 'Guéri' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_guerison_pct
            FROM FactHospitalisation
        """)).fetchone()

        age_moyen = conn.execute(text("SELECT ROUND(AVG(age), 1) FROM DimPatient")).fetchone()[0]
        nombre_total_lits = conn.execute(text("SELECT SUM(capacite_lits) FROM DimService")).fetchone()[0]

    return {
        "total_hospitalisations": resultat[0],
        "nb_patients_uniques": resultat[1],
        "nb_services": resultat[2],
        "nb_medecins": resultat[3],
        "duree_moyenne_sejour": float(resultat[4]) if resultat[4] else None,
        "taux_urgence_pct": round(float(resultat[5]), 2) if resultat[5] else 0,
        "taux_deces_pct": round(float(resultat[6]), 2) if resultat[6] else 0,
        "taux_guerison_pct": round(float(resultat[7]), 2) if resultat[7] else 0,
        "age_moyen": float(age_moyen) if age_moyen else 0,
        "nombre_total_lits": int(nombre_total_lits) if nombre_total_lits else 0,
    }


@router.get("/kpi/service/{id_service}")
def kpi_service(id_service: int, current_user: dict = Depends(get_current_user)):
    """Vue KPI enrichie d'un service précis.
    - direction : peut consulter n'importe quel service
    - chef_service : UNIQUEMENT son propre service (vérifié via le token, pas via l'URL)
    """
    if current_user["role"] == "chef_service" and current_user["id_service"] != id_service:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé : vous ne pouvez consulter que les données de votre propre service",
        )
    if current_user["role"] not in ("direction", "chef_service"):
        raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")

    with engine.connect() as conn:
        service_info = conn.execute(
            text("SELECT nom_service, capacite_lits FROM DimService WHERE id_service = :id_service"),
            {"id_service": id_service},
        ).fetchone()

        if service_info is None:
            raise HTTPException(status_code=404, detail="Service introuvable")

        stats = conn.execute(
            text("""
                SELECT
                    COUNT(*) AS total_hospitalisations,
                    ROUND(AVG(duree_sejour), 2) AS duree_moyenne_sejour,
                    SUM(CASE WHEN type_admission = 'Urgence' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_urgence_pct,
                    SUM(CASE WHEN mode_sortie = 'Décès' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_deces_pct,
                    SUM(CASE WHEN mode_sortie = 'Guéri' THEN 1 ELSE 0 END) / COUNT(*) * 100 AS taux_guerison_pct,
                    SUM(jours_occupation) AS jours_occupation_total
                FROM FactHospitalisation
                WHERE id_service = :id_service
            """),
            {"id_service": id_service},
        ).fetchone()

        age_moyen = conn.execute(
            text("""
                SELECT ROUND(AVG(p.age), 1)
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                WHERE f.id_service = :id_service
            """),
            {"id_service": id_service},
        ).fetchone()[0]

        # Moyenne globale (tous services confondus) pour comparaison
        moyenne_globale = conn.execute(
            text("SELECT ROUND(AVG(duree_sejour), 2) FROM FactHospitalisation")
        ).fetchone()[0]

        # Classement du service parmi tous les services (par volume d'activité)
        classement = conn.execute(text("""
            SELECT nom_service, total FROM (
                SELECT s.id_service, s.nom_service, COUNT(f.id_fait) AS total
                FROM DimService s
                LEFT JOIN FactHospitalisation f ON s.id_service = f.id_service
                GROUP BY s.id_service, s.nom_service
            ) AS t
            ORDER BY total DESC
        """)).fetchall()
        rang = next((i + 1 for i, (nom, _) in enumerate(classement) if nom == service_info[0]), None)
        nb_services_total = len(classement)

        # Top pathologie du service
        top_pathologie = conn.execute(text("""
            SELECT pathologie, COUNT(*) AS nb
            FROM FactHospitalisation
            WHERE id_service = :id_service
            GROUP BY pathologie
            ORDER BY nb DESC
            LIMIT 1
        """), {"id_service": id_service}).fetchone()

        # Médecin le plus actif du service
        top_medecin = conn.execute(text("""
            SELECT CONCAT(m.prenom, ' ', m.nom) AS medecin, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimMedecin m ON f.id_medecin = m.id_medecin
            WHERE f.id_service = :id_service
            GROUP BY m.id_medecin, m.prenom, m.nom
            ORDER BY nb DESC
            LIMIT 1
        """), {"id_service": id_service}).fetchone()

        # Période de référence pour le taux d'occupation
        periode = conn.execute(text("SELECT DATEDIFF(MAX(date_complete), MIN(date_complete)) FROM DimTemps")).fetchone()[0]

    duree_moyenne = float(stats[1]) if stats[1] else 0
    moyenne_glob = float(moyenne_globale) if moyenne_globale else 0
    capacite = service_info[1] or 1
    jours_occ = stats[5] or 0
    taux_occupation = round((jours_occ / (capacite * periode)) * 100, 2) if periode else 0

    return {
        "id_service": id_service,
        "nom_service": service_info[0],
        "capacite_lits": service_info[1],
        "total_hospitalisations": stats[0],
        "duree_moyenne_sejour": duree_moyenne,
        "taux_urgence_pct": round(float(stats[2]), 2) if stats[2] else 0,
        "taux_deces_pct": round(float(stats[3]), 2) if stats[3] else 0,
        "taux_guerison_pct": round(float(stats[4]), 2) if stats[4] else 0,
        "taux_occupation_pct": taux_occupation,
        "moyenne_globale_duree_sejour": moyenne_glob,
        "ecart_vs_moyenne_globale": round(duree_moyenne - moyenne_glob, 2),
        "rang_activite": rang,
        "nb_services_total": nb_services_total,
        "top_pathologie": top_pathologie[0] if top_pathologie else None,
        "top_pathologie_nb": top_pathologie[1] if top_pathologie else 0,
        "top_medecin": top_medecin[0] if top_medecin else None,
        "top_medecin_nb": top_medecin[1] if top_medecin else 0,
        "age_moyen": float(age_moyen) if age_moyen else 0,
    }


# ============================================================
# Données brutes (Analyste) : liste paginée/filtrée/triée + export CSV
# ============================================================

COLONNES_TRI_HOSPITALISATIONS = {
    "id_fait": "f.id_fait",
    "duree_sejour": "f.duree_sejour",
    "age": "p.age",
    "date_entree": "t.date_complete",
}


def _construire_conditions_hospitalisations(recherche, id_service, sexe, type_admission, mode_sortie, pathologie):
    """Construit les conditions WHERE et les paramètres, partagés entre la liste paginée et l'export CSV."""
    conditions = ["1=1"]
    params = {}

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

    return " AND ".join(conditions), params


@router.get("/hospitalisations")
def liste_hospitalisations(
    page: int = Query(1, ge=1),
    taille_page: int = Query(50, ge=1, le=500),
    tri_par: str = Query("id_fait"),
    ordre: str = Query("asc", pattern="^(asc|desc)$"),
    recherche: str | None = Query(None, description="Recherche texte libre : pathologie, ville ou médecin"),
    id_service: int | None = Query(None),
    sexe: str | None = Query(None, pattern="^(M|F)$"),
    type_admission: str | None = Query(None),
    mode_sortie: str | None = Query(None),
    pathologie: str | None = Query(None),
    current_user: dict = Depends(require_role("analyste")),
):
    """Accès aux données brutes, paginé, filtrable et triable - réservé à l'Analyste Data.
    Affiche des noms lisibles (service, médecin, ville) plutôt que de simples IDs.
    """
    colonne_tri = COLONNES_TRI_HOSPITALISATIONS.get(tri_par, "f.id_fait")
    offset = (page - 1) * taille_page

    clause_where, params = _construire_conditions_hospitalisations(
        recherche, id_service, sexe, type_admission, mode_sortie, pathologie
    )
    params["limite"] = taille_page
    params["offset"] = offset

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
                    f.id_fait, f.id_patient, s.nom_service, CONCAT(m.prenom, ' ', m.nom) AS medecin,
                    p.age, p.sexe, p.ville, t.date_complete AS date_entree,
                    f.duree_sejour, f.type_admission, f.pathologie, f.mode_sortie
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                JOIN DimService s ON f.id_service = s.id_service
                JOIN DimTemps t ON f.id_temps = t.id_temps
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
                ORDER BY {colonne_tri} {ordre.upper()}
                LIMIT :limite OFFSET :offset
            """),
            params,
        ).fetchall()

    colonnes = ["id_fait", "id_patient", "nom_service", "medecin", "age", "sexe", "ville",
                "date_entree", "duree_sejour", "type_admission", "pathologie", "mode_sortie"]

    return {
        "page": page,
        "taille_page": taille_page,
        "total_lignes": total,
        "donnees": [dict(zip(colonnes, l)) for l in lignes],
    }


@router.get("/hospitalisations/export")
def export_hospitalisations(
    recherche: str | None = Query(None),
    id_service: int | None = Query(None),
    sexe: str | None = Query(None, pattern="^(M|F)$"),
    type_admission: str | None = Query(None),
    mode_sortie: str | None = Query(None),
    pathologie: str | None = Query(None),
    current_user: dict = Depends(require_role("analyste")),
):
    """Exporte en CSV toutes les lignes correspondant aux filtres actifs (pas de pagination,
    limité à 20 000 lignes par sécurité). Réservé à l'Analyste Data."""
    clause_where, params = _construire_conditions_hospitalisations(
        recherche, id_service, sexe, type_admission, mode_sortie, pathologie
    )

    with engine.connect() as conn:
        lignes = conn.execute(
            text(f"""
                SELECT
                    f.id_fait, f.id_patient, s.nom_service, CONCAT(m.prenom, ' ', m.nom) AS medecin,
                    p.age, p.sexe, p.ville, t.date_complete AS date_entree,
                    f.duree_sejour, f.type_admission, f.pathologie, f.mode_sortie
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                JOIN DimService s ON f.id_service = s.id_service
                JOIN DimTemps t ON f.id_temps = t.id_temps
                LEFT JOIN DimMedecin m ON f.id_medecin = m.id_medecin
                WHERE {clause_where}
                ORDER BY f.id_fait
                LIMIT 20000
            """),
            params,
        ).fetchall()

    colonnes = ["id_fait", "id_patient", "nom_service", "medecin", "age", "sexe", "ville",
                "date_entree", "duree_sejour", "type_admission", "pathologie", "mode_sortie"]

    tampon = io.StringIO()
    writer = csv.writer(tampon, delimiter=";")
    writer.writerow(colonnes)
    for ligne in lignes:
        writer.writerow(ligne)

    tampon.seek(0)
    return StreamingResponse(
        iter([tampon.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export_hospitalisations.csv"},
    )


# ============================================================
# Vue Services (Direction)
# ============================================================

@router.get("/kpi/services")
def kpi_tous_services(current_user: dict = Depends(require_role("direction"))):
    """KPI de TOUS les services en une seule requête - réservé à la Direction (pour les graphiques comparatifs).

    Le médecin le plus actif par service est calculé côté Python (pas de ROW_NUMBER() SQL)
    pour rester compatible avec toutes les versions de MySQL/PostgreSQL, y compris les plus anciennes.
    """
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT
                s.id_service,
                s.nom_service,
                COUNT(f.id_fait) AS total_hospitalisations,
                ROUND(AVG(f.duree_sejour), 2) AS duree_moyenne_sejour
            FROM DimService s
            LEFT JOIN FactHospitalisation f ON s.id_service = f.id_service
            GROUP BY s.id_service, s.nom_service
            ORDER BY total_hospitalisations DESC
        """)).fetchall()

        tous_medecins = conn.execute(text("""
            SELECT f.id_service, CONCAT(m.prenom, ' ', m.nom) AS medecin, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimMedecin m ON f.id_medecin = m.id_medecin
            GROUP BY f.id_service, m.id_medecin, m.prenom, m.nom
        """)).fetchall()

    top_medecin_par_service = {}
    for id_service_m, medecin, nb in tous_medecins:
        meilleur_actuel = top_medecin_par_service.get(id_service_m)
        if meilleur_actuel is None or nb > meilleur_actuel[1]:
            top_medecin_par_service[id_service_m] = (medecin, nb)

    return [
        {
            "id_service": ligne[0],
            "nom_service": ligne[1],
            "total_hospitalisations": ligne[2],
            "duree_moyenne_sejour": float(ligne[3]) if ligne[3] else 0,
            "top_medecin": top_medecin_par_service.get(ligne[0], (None, 0))[0],
            "top_medecin_nb": top_medecin_par_service.get(ligne[0], (None, 0))[1],
        }
        for ligne in lignes
    ]


@router.get("/kpi/services-detail")
def kpi_services_detail(current_user: dict = Depends(require_role("direction"))):
    """KPI détaillés de chaque service (hospitalisations, DMS, taux urgence/décès/occupation).
    Renvoie {"services": [...]}, format attendu par DashboardServices.jsx.
    """
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT
                s.id_service,
                s.nom_service,
                s.capacite_lits,
                COUNT(f.id_fait) AS total_hospitalisations,
                ROUND(AVG(f.duree_sejour), 2) AS duree_moyenne_sejour,
                SUM(CASE WHEN f.type_admission = 'Urgence' THEN 1 ELSE 0 END) / NULLIF(COUNT(f.id_fait), 0) * 100 AS taux_urgence_pct,
                SUM(CASE WHEN f.mode_sortie = 'Décès' THEN 1 ELSE 0 END) / NULLIF(COUNT(f.id_fait), 0) * 100 AS taux_deces_pct,
                SUM(f.jours_occupation) AS jours_occupation_total
            FROM DimService s
            LEFT JOIN FactHospitalisation f ON s.id_service = f.id_service
            GROUP BY s.id_service, s.nom_service, s.capacite_lits
        """)).fetchall()

        periode = conn.execute(text("SELECT DATEDIFF(MAX(date_complete), MIN(date_complete)) FROM DimTemps")).fetchone()[0]

    services = []
    for id_service, nom_service, capacite_lits, total, duree, urgence, deces, jours_occ in lignes:
        capacite = capacite_lits or 1
        jours = jours_occ or 0
        taux_occupation = round((jours / (capacite * periode)) * 100, 2) if periode else 0
        services.append({
            "id_service": id_service,
            "nom_service": nom_service,
            "total_hospitalisations": total or 0,
            "duree_moyenne_sejour": float(duree) if duree else 0,
            "taux_urgence_pct": round(float(urgence), 2) if urgence else 0,
            "taux_deces_pct": round(float(deces), 2) if deces else 0,
            "taux_occupation_pct": taux_occupation,
        })

    return {"services": services}


@router.get("/kpi/pathologie-dominante")
def kpi_pathologie_dominante(current_user: dict = Depends(require_role("direction"))):
    """Pathologie la plus fréquente pour chaque service."""
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT s.nom_service, f.pathologie, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimService s ON f.id_service = s.id_service
            GROUP BY s.nom_service, f.pathologie
        """)).fetchall()

    meilleur_par_service = {}
    for nom_service, pathologie, nb in lignes:
        actuel = meilleur_par_service.get(nom_service)
        if actuel is None or nb > actuel[1]:
            meilleur_par_service[nom_service] = (pathologie, nb)

    return [
        {"nom_service": nom_service, "pathologie_dominante": infos[0]}
        for nom_service, infos in meilleur_par_service.items()
    ]


@router.get("/kpi/top-medecins")
def kpi_top_medecins(current_user: dict = Depends(require_role("direction"))):
    """Médecin le plus actif pour chaque service."""
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT s.nom_service, CONCAT(m.prenom, ' ', m.nom) AS medecin, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimService s ON f.id_service = s.id_service
            JOIN DimMedecin m ON f.id_medecin = m.id_medecin
            GROUP BY s.nom_service, m.id_medecin, m.prenom, m.nom
        """)).fetchall()

    meilleur_par_service = {}
    for nom_service, medecin, nb in lignes:
        actuel = meilleur_par_service.get(nom_service)
        if actuel is None or nb > actuel[1]:
            meilleur_par_service[nom_service] = (medecin, nb)

    return [
        {"nom_service": nom_service, "medecin": infos[0]}
        for nom_service, infos in meilleur_par_service.items()
    ]


# ============================================================
# Répartitions génériques (Direction, Chef de service, Analyste)
# ============================================================

# Mapping "nom du champ envoyé par le frontend" -> "colonne SQL réelle"
CHAMPS_REPARTITION_AUTORISES = {
    "pathologie": "f.pathologie",
    "mode_sortie": "f.mode_sortie",
    "type_admission": "f.type_admission",
    "sexe": "p.sexe",
    "tranche_age": "p.tranche_age",
    "ville": "p.ville",
    "couverture_sante": "p.couverture_sante",
    "groupe_sanguin": "p.groupe_sanguin",
}


@router.get("/kpi/repartition/{champ}")
def repartition_generique(
    champ: str,
    id_service: int | None = Query(None),
    limite: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    """Retourne la répartition (label, total) d'un champ donné.
    - Sans id_service : toutes les hospitalisations confondues (Direction).
    - Avec id_service : uniquement celles du service demandé (Chef de service).
    """
    if id_service is not None and current_user["role"] == "chef_service" and current_user["id_service"] != id_service:
        raise HTTPException(status_code=403, detail="Accès refusé à ce service")
    if id_service is None and current_user["role"] not in ("direction", "analyste"):
        raise HTTPException(status_code=403, detail="Accès refusé pour une vue non filtrée par service")

    colonne = CHAMPS_REPARTITION_AUTORISES.get(champ)
    if colonne is None:
        raise HTTPException(
            status_code=400,
            detail=f"Champ '{champ}' non autorisé. Champs valides : {list(CHAMPS_REPARTITION_AUTORISES.keys())}",
        )

    condition_service = "AND f.id_service = :id_service" if id_service is not None else ""
    params = {"limite": limite}
    if id_service is not None:
        params["id_service"] = id_service

    with engine.connect() as conn:
        lignes = conn.execute(
            text(f"""
                SELECT {colonne} AS label, COUNT(*) AS total
                FROM FactHospitalisation f
                JOIN DimPatient p ON f.id_patient = p.id_patient
                WHERE {colonne} IS NOT NULL {condition_service}
                GROUP BY {colonne}
                ORDER BY total DESC
                LIMIT :limite
            """),
            params,
        ).fetchall()

    return [{"label": l[0], "total": l[1]} for l in lignes]


@router.get("/kpi/volumes-mensuels")
def volumes_mensuels(
    id_service: int | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Évolution mensuelle du nombre d'hospitalisations.
    - Sans id_service : toutes confondues (Direction).
    - Avec id_service : filtré par service (Chef de service).
    """
    if id_service is not None and current_user["role"] == "chef_service" and current_user["id_service"] != id_service:
        raise HTTPException(status_code=403, detail="Accès refusé à ce service")

    condition = "WHERE f.id_service = :id_service" if id_service is not None else ""
    params = {"id_service": id_service} if id_service is not None else {}

    with engine.connect() as conn:
        lignes = conn.execute(
            text(f"""
                SELECT
                    CONCAT(t.annee, '-', LPAD(t.mois, 2, '0')) AS periode,
                    COUNT(*) AS total
                FROM FactHospitalisation f
                JOIN DimTemps t ON f.id_temps = t.id_temps
                {condition}
                GROUP BY t.annee, t.mois
                ORDER BY t.annee, t.mois
            """),
            params,
        ).fetchall()

    return [{"periode": l[0], "total": l[1]} for l in lignes]


@router.get("/services")
def liste_services(current_user: dict = Depends(get_current_user)):
    """Liste des services - accessible à tous les rôles connectés (utile pour les filtres)."""
    with engine.connect() as conn:
        lignes = conn.execute(text("SELECT id_service, nom_service, categorie, capacite_lits FROM DimService")).fetchall()

    return [dict(zip(["id_service", "nom_service", "categorie", "capacite_lits"], ligne)) for ligne in lignes]