from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from database import engine
from auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["dashboard"])

# Champs autorisés pour l'endpoint générique de répartition (sécurité : évite l'injection SQL)
CHAMPS_AUTORISES = {
    "ville": "p.ville",
    "sexe": "p.sexe",
    "tranche_age": "p.tranche_age",
    "couverture_sante": "p.couverture_sante",
    "groupe_sanguin": "p.groupe_sanguin",
    "type_admission": "f.type_admission",
    "mode_sortie": "f.mode_sortie",
    "pathologie": "f.pathologie",
}


def _verifier_acces_service(current_user: dict, id_service: int | None):
    """Un chef_service ne peut voir que son service ; direction voit tout."""
    if current_user["role"] == "chef_service":
        if id_service is not None and id_service != current_user["id_service"]:
            raise HTTPException(status_code=403, detail="Accès refusé à ce service")
        return current_user["id_service"]
    if current_user["role"] == "direction":
        return id_service
    raise HTTPException(status_code=403, detail="Rôle non autorisé")


@router.get("/kpi/volumes-mensuels")
def volumes_mensuels(id_service: int | None = Query(None), current_user: dict = Depends(get_current_user)):
    id_service_filtre = _verifier_acces_service(current_user, id_service)

    requete = """
        SELECT t.annee, t.mois, COUNT(*) AS total
        FROM FactHospitalisation f
        JOIN DimTemps t ON f.id_temps = t.id_temps
        {clause_where}
        GROUP BY t.annee, t.mois
        ORDER BY t.annee, t.mois
    """
    params = {}
    clause_where = ""
    if id_service_filtre is not None:
        clause_where = "WHERE f.id_service = :id_service"
        params["id_service"] = id_service_filtre

    with engine.connect() as conn:
        lignes = conn.execute(text(requete.format(clause_where=clause_where)), params).fetchall()

    return [{"annee": l[0], "mois": l[1], "periode": f"{l[0]}-{str(l[1]).zfill(2)}", "total": l[2]} for l in lignes]


@router.get("/kpi/repartition/{champ}")
def repartition(champ: str, id_service: int | None = Query(None), current_user: dict = Depends(get_current_user)):
    if champ not in CHAMPS_AUTORISES:
        raise HTTPException(status_code=400, detail=f"Champ non autorisé. Valeurs possibles : {list(CHAMPS_AUTORISES.keys())}")

    id_service_filtre = _verifier_acces_service(current_user, id_service)
    colonne_sql = CHAMPS_AUTORISES[champ]

    requete = f"""
        SELECT {colonne_sql} AS label, COUNT(*) AS total
        FROM FactHospitalisation f
        JOIN DimPatient p ON f.id_patient = p.id_patient
        {{clause_where}}
        GROUP BY {colonne_sql}
        ORDER BY total DESC
    """
    params = {}
    clause_where = ""
    if id_service_filtre is not None:
        clause_where = "WHERE f.id_service = :id_service"
        params["id_service"] = id_service_filtre

    with engine.connect() as conn:
        lignes = conn.execute(text(requete.format(clause_where=clause_where)), params).fetchall()

    return [{"label": str(l[0]), "total": l[1]} for l in lignes]


@router.get("/kpi/services-detail")
def services_detail(current_user: dict = Depends(require_role("direction"))):
    """Vue complète par service : volume, durée, taux urgence/décès, occupation, capacité."""
    with engine.connect() as conn:
        periode = conn.execute(text("SELECT DATEDIFF(MAX(date_complete), MIN(date_complete)) FROM DimTemps")).fetchone()[0]

        lignes = conn.execute(text("""
            SELECT
                s.id_service,
                s.nom_service,
                s.capacite_lits,
                COUNT(f.id_fait) AS total_hospitalisations,
                ROUND(AVG(f.duree_sejour), 2) AS duree_moyenne_sejour,
                ROUND(SUM(CASE WHEN f.type_admission = 'Urgence' THEN 1 ELSE 0 END) / COUNT(f.id_fait) * 100, 2) AS taux_urgence_pct,
                ROUND(SUM(CASE WHEN f.mode_sortie = 'Décès' THEN 1 ELSE 0 END) / COUNT(f.id_fait) * 100, 2) AS taux_deces_pct,
                SUM(f.jours_occupation) AS jours_occupation_total
            FROM DimService s
            LEFT JOIN FactHospitalisation f ON s.id_service = f.id_service
            GROUP BY s.id_service, s.nom_service, s.capacite_lits
            ORDER BY total_hospitalisations DESC
        """)).fetchall()

    resultat = []
    for l in lignes:
        jours_occ = l[7] or 0
        capacite = l[2] or 1
        taux_occupation = round((jours_occ / (capacite * periode)) * 100, 2) if periode else 0
        resultat.append({
            "id_service": l[0], "nom_service": l[1], "capacite_lits": l[2],
            "total_hospitalisations": l[3], "duree_moyenne_sejour": float(l[4]) if l[4] else 0,
            "taux_urgence_pct": float(l[5]) if l[5] else 0, "taux_deces_pct": float(l[6]) if l[6] else 0,
            "taux_occupation_pct": taux_occupation,
        })

    return {"jours_periode": periode, "services": resultat}


@router.get("/kpi/pathologie-dominante")
def pathologie_dominante(current_user: dict = Depends(require_role("direction"))):
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT s.nom_service, f.pathologie, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimService s ON f.id_service = s.id_service
            GROUP BY s.nom_service, f.pathologie
        """)).fetchall()

    par_service = {}
    for nom_service, pathologie, nb in lignes:
        if nom_service not in par_service or nb > par_service[nom_service]["nb"]:
            par_service[nom_service] = {"pathologie": pathologie, "nb": nb}

    return [{"nom_service": k, "pathologie_dominante": v["pathologie"], "nb": v["nb"]} for k, v in par_service.items()]


@router.get("/kpi/top-medecins")
def top_medecins(current_user: dict = Depends(require_role("direction"))):
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT s.nom_service, CONCAT(m.prenom, ' ', m.nom) AS medecin, COUNT(*) AS nb
            FROM FactHospitalisation f
            JOIN DimService s ON f.id_service = s.id_service
            JOIN DimMedecin m ON f.id_medecin = m.id_medecin
            GROUP BY s.nom_service, m.id_medecin, m.prenom, m.nom
        """)).fetchall()

    par_service = {}
    for nom_service, medecin, nb in lignes:
        if nom_service not in par_service or nb > par_service[nom_service]["nb"]:
            par_service[nom_service] = {"medecin": medecin, "nb": nb}

    return [{"nom_service": k, "medecin": v["medecin"], "nb_patients": v["nb"]} for k, v in par_service.items()]


@router.get("/predictions/stats")
def predictions_stats(current_user: dict = Depends(require_role("analyste"))):
    with engine.connect() as conn:
        ecart_par_service = conn.execute(text("""
            SELECT nom_service, ROUND(AVG(ecart_abs), 2) AS ecart_moyen
            FROM predictions_duree_sejour
            GROUP BY nom_service
            ORDER BY ecart_moyen ASC
        """)).fetchall()

        distribution = conn.execute(text("""
            SELECT FLOOR(ecart_abs) AS tranche, COUNT(*) AS nb
            FROM predictions_duree_sejour
            GROUP BY FLOOR(ecart_abs)
            ORDER BY tranche
        """)).fetchall()

        nuage_points = conn.execute(text("""
            SELECT duree_sejour, duree_predite, nom_service
            FROM predictions_duree_sejour
            ORDER BY RAND()
            LIMIT 300
        """)).fetchall()

        charge_service = conn.execute(text("""
            SELECT nom_service, nb_patients, duree_reelle_moyenne, duree_predite_moyenne
            FROM charge_estimee_par_service
        """)).fetchall()

        ecart_moyen_global = conn.execute(text("SELECT ROUND(AVG(ecart_abs), 2) FROM predictions_duree_sejour")).fetchone()[0]

    return {
        # Métriques du modèle retenu (Ridge) - figées, issues du notebook 05
        "metriques_modele": {"MAE": 1.19, "RMSE": 1.62, "R2": 0.84, "modele": "Ridge"},
        "ecart_moyen_global": float(ecart_moyen_global) if ecart_moyen_global else 0,
        "ecart_par_service": [{"nom_service": l[0], "ecart_moyen": float(l[1])} for l in ecart_par_service],
        "distribution_ecarts": [{"tranche": int(l[0]), "nb": l[1]} for l in distribution],
        "nuage_points": [{"reel": l[0], "predit": float(l[1]), "nom_service": l[2]} for l in nuage_points],
        "charge_par_service": [
            {"nom_service": l[0], "nb_patients": l[1], "duree_reelle": float(l[2]), "duree_predite": float(l[3])}
            for l in charge_service
        ],
    }