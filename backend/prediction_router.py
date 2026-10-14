from pathlib import Path

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from database import engine
from auth import get_current_user

router = APIRouter(prefix="/api", tags=["prediction"])

# Chargement du modèle une seule fois, au démarrage du serveur (pas à chaque requête)
MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "modele_duree_sejour.pkl"
try:
    modele = joblib.load(MODEL_PATH)
    print(f"Modèle de prédiction chargé avec succès depuis {MODEL_PATH}")
except FileNotFoundError:
    modele = None
    print(f"⚠️  ATTENTION : modèle introuvable à {MODEL_PATH} — l'endpoint /api/predict échouera")


class PatientFeatures(BaseModel):
    age: int = Field(..., ge=0, le=120, description="Âge du patient")
    sexe: str = Field(..., pattern="^(M|F)$", description="'M' ou 'F'")
    id_service: int = Field(..., description="Identifiant du service d'hospitalisation")
    type_admission: str = Field(..., description="Urgence / Programmée / Transfert")
    pathologie: str = Field(..., description="Pathologie diagnostiquée")
    tranche_age: str = Field(..., description="0-18 / 19-40 / 41-60 / 60+")


@router.post("/predict")
def predire_duree_sejour(patient: PatientFeatures, current_user: dict = Depends(get_current_user)):
    if modele is None:
        raise HTTPException(status_code=503, detail="Le modèle de prédiction n'est pas disponible sur le serveur")

    # Récupère le nom du service à partir de son id (le modèle a été entraîné sur nom_service, pas id_service)
    with engine.connect() as conn:
        service_row = conn.execute(
            text("SELECT nom_service FROM DimService WHERE id_service = :id_service"),
            {"id_service": patient.id_service},
        ).fetchone()

    if service_row is None:
        raise HTTPException(status_code=404, detail="Service introuvable")

    nom_service = service_row[0]

    # Un chef de service ne peut prédire que pour SON service
    if current_user["role"] == "chef_service" and current_user["id_service"] != patient.id_service:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé : vous ne pouvez faire des prédictions que pour votre propre service",
        )

    # Construit une ligne au format attendu par le pipeline entraîné (mêmes noms de colonnes que le notebook 05)
    donnees_entree = pd.DataFrame([{
        "sexe": patient.sexe,
        "nom_service": nom_service,
        "type_admission": patient.type_admission,
        "pathologie": patient.pathologie,
        "tranche_age": patient.tranche_age,
        "age": patient.age,
    }])

    try:
        prediction = modele.predict(donnees_entree)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la prédiction : {str(e)}")

    return {
        "nom_service": nom_service,
        "duree_predite_jours": round(float(prediction), 1),
        "parametres_utilises": patient.dict(),
    }