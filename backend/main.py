from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
import os

from database import engine
from auth import verify_password, create_access_token, get_current_user
from kpi_router import router as kpi_router
from prediction_router import router as prediction_router
from dashboard_router import router as dashboard_router
from patients_router import router as patients_router
from ml_router import router as ml_router
from agent_router import router as agent_router
from admin_router import router as admin_router

app = FastAPI(title="API CHU Mohammed VI Agadir - Hospitalisations")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kpi_router)
app.include_router(prediction_router)
app.include_router(dashboard_router)
app.include_router(patients_router)
app.include_router(ml_router)
app.include_router(agent_router)
app.include_router(admin_router)

@app.get("/")
def racine():
    return {"message": "API CHU Agadir opérationnelle"}


@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    with engine.connect() as conn:
        resultat = conn.execute(
            text("SELECT username, password_hash, role, id_service, nom_complet FROM utilisateurs WHERE username = :username"),
            {"username": form_data.username},
        ).fetchone()

    if resultat is None:
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")

    username, password_hash, role, id_service, nom_complet = resultat

    if not verify_password(form_data.password, password_hash):
        raise HTTPException(status_code=401, detail="Nom d'utilisateur ou mot de passe incorrect")

    token = create_access_token(data={
        "sub": username, "role": role, "id_service": id_service, "nom_complet": nom_complet,
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "id_service": id_service,
        "nom_complet": nom_complet,
    }


@app.get("/api/me")
def get_me(current_user: dict = Depends(get_current_user)):
    """Endpoint de test : retourne les infos de l'utilisateur connecté à partir de son token."""
    return current_user