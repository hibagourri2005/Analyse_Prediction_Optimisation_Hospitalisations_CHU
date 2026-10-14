import os
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# La clé vient du fichier .env (SECRET_KEY=...). La valeur par défaut ne sert qu'au développement local.
SECRET_KEY = os.getenv("SECRET_KEY", "change_cette_cle_avant_la_mise_en_production_reelle")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 heures, pratique pour une session de travail

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Dépendance FastAPI à utiliser sur toute route protégée.
    Retourne un dict : {"username": ..., "role": ..., "id_service": ..., "nom_complet": ...}
    """
    payload = decode_access_token(token)
    username = payload.get("sub")
    role = payload.get("role")
    id_service = payload.get("id_service")
    nom_complet = payload.get("nom_complet")
    if username is None or role is None:
        raise HTTPException(status_code=401, detail="Token invalide")
    return {"username": username, "role": role, "id_service": id_service, "nom_complet": nom_complet}


def require_role(*roles_autorises: str):
    """Générateur de dépendance : ex. Depends(require_role('direction', 'analyste'))"""
    def verificateur(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in roles_autorises:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Accès refusé : rôle '{current_user['role']}' non autorisé pour cette ressource",
            )
        return current_user
    return verificateur