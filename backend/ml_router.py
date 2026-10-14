import os
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from auth import require_role

router = APIRouter(prefix="/api/ml", tags=["machine_learning"])

# Chemin absolu calculé depuis l'emplacement de ce fichier (indépendant du dossier de lancement).
# Le notebook 05 exporte ce fichier avec : df_resultats.to_csv(f"{EXPORT_DIR}/comparatif_modeles_ml.csv")
CHEMIN_COMPARATIF = str(Path(__file__).resolve().parent.parent / "data" / "exports" / "comparatif_modeles_ml.csv")


def _charger_comparatif() -> pd.DataFrame:
    if not os.path.exists(CHEMIN_COMPARATIF):
        raise HTTPException(
            status_code=404,
            detail=f"Fichier introuvable : {CHEMIN_COMPARATIF}. "
                   f"Vérifie que le notebook 05 a bien été exécuté et exporté ce fichier.",
        )
    return pd.read_csv(CHEMIN_COMPARATIF).sort_values("RMSE").reset_index(drop=True)


@router.get("/comparatif-modeles")
def comparatif_modeles(current_user: dict = Depends(require_role("analyste"))):
    """Tableau comparatif des modèles testés (lu depuis le CSV exporté par le notebook 05),
    trié par RMSE croissant (meilleur en premier)."""
    df = _charger_comparatif()
    return df.to_dict(orient="records")


@router.get("/modele-retenu")
def modele_retenu(current_user: dict = Depends(require_role("analyste"))):
    """Détails du modèle retenu (le meilleur du comparatif) + description du pipeline
    et des features utilisées (fixe, car ça décrit la méthodologie, pas des données qui varient)."""
    df = _charger_comparatif()
    meilleur = df.iloc[0].to_dict()

    return {
        "nom_modele": meilleur["modele"],
        "MAE": meilleur["MAE"],
        "RMSE": meilleur["RMSE"],
        "R2": meilleur["R2"],
        "RMSE_cv_moyen": meilleur.get("RMSE_cv_moyen"),
        "RMSE_cv_std": meilleur.get("RMSE_cv_std"),
        "cible": "duree_sejour (en jours)",
        "nb_modeles_compares": len(df),
        "split": "80% entraînement / 20% test",
        "validation": "Validation croisée 5-fold (stabilité vérifiée sur le jeu d'entraînement)",
        "features_utilisees": [
            {"nom": "age", "type": "Numérique", "traitement": "StandardScaler"},
            {"nom": "sexe", "type": "Catégorielle", "traitement": "One-Hot Encoding"},
            {"nom": "nom_service", "type": "Catégorielle", "traitement": "One-Hot Encoding"},
            {"nom": "type_admission", "type": "Catégorielle", "traitement": "One-Hot Encoding"},
            {"nom": "pathologie", "type": "Catégorielle", "traitement": "One-Hot Encoding"},
            {"nom": "tranche_age", "type": "Catégorielle", "traitement": "One-Hot Encoding"},
        ],
    }