import json
import re
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from database import engine as engine_principal
from auth import get_current_user

# Import des fonctions déjà existantes dans ton projet, qu'on réutilise telles quelles.
# Adapte ces imports si tes fonctions ne sont pas exactement sous ces noms/fichiers.
from kpi_router import kpi_global as _kpi_global
from kpi_router import kpi_service as _kpi_service
from kpi_router import repartition_generique as _repartition_generique
from kpi_router import volumes_mensuels as _volumes_mensuels

router = APIRouter(prefix="/api/agent", tags=["agent_ia"])

OLLAMA_URL = "http://localhost:11434/api/generate"
MODELE = "llama3.2:3b"

# ============================================================
# Requête SQL libre, réservée à Direction et Analyste
# ============================================================

# ⚠️ Remplace l'utilisateur/mot de passe/base par ceux créés à l'étape 1 (utilisateur MySQL en lecture seule).
ENGINE_LECTURE_SEULE = create_engine(
    "mysql+mysqlconnector://agent_lecture:HIBAGOURRI20@localhost/chu_dwh"
)

SCHEMA_BASE = """
Tables disponibles (base en étoile) :

FactHospitalisation (f) : id_fait, id_patient, id_service, id_medecin, id_temps, duree_sejour, type_admission, pathologie, mode_sortie, jours_occupation
DimPatient (p) : id_patient, age, sexe, ville, tranche_age, couverture_sante, groupe_sanguin
DimService (s) : id_service, nom_service, categorie, capacite_lits
DimMedecin (m) : id_medecin, prenom, nom, specialite
DimTemps (t) : id_temps, date_complete, annee, mois, trimestre

Jointures : FactHospitalisation.id_patient = DimPatient.id_patient
            FactHospitalisation.id_service = DimService.id_service
            FactHospitalisation.id_medecin = DimMedecin.id_medecin
            FactHospitalisation.id_temps = DimTemps.id_temps
"""

MOTS_INTERDITS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "EXEC", "EXECUTE", "ATTACH", "PRAGMA", "REPLACE",
]


def generer_sql(question: str) -> str:
    """Demande au LLM d'écrire UNE requête SELECT à partir d'une question en langage naturel."""
    prompt = f"""Tu es un générateur de requêtes SQL MySQL en lecture seule.

{SCHEMA_BASE}

Question de l'utilisateur : "{question}"

Écris UNE SEULE requête SQL commençant par SELECT qui répond à cette question.

CONSIGNE IMPORTANTE : si la question porte sur une liste de patients ou d'hospitalisations,
inclus TOUTES les colonnes descriptives utiles disponibles via les jointures nécessaires
(âge, sexe, ville, tranche_age, groupe_sanguin, couverture_sante, nom_service, pathologie,
type_admission, mode_sortie, nom du médecin) — pas seulement l'identifiant et la valeur demandée.
Ne te limite au strict minimum que si la question demande explicitement un simple total ou une moyenne isolée.

Réponds UNIQUEMENT avec la requête SQL, rien d'autre, pas d'explication, pas de balises de code."""
    brut = appeler_ollama(prompt, max_tokens=350)
    sql = re.sub(r"^```sql|```$|^```", "", brut.strip(), flags=re.MULTILINE).strip()
    return sql


def valider_sql_securise(sql: str) -> str:
    """Valide qu'une requête est bien un SELECT unique, sans mot-clé dangereux. Lève une exception sinon.
    Ajoute une LIMIT si absente. Renvoie la requête validée (éventuellement corrigée)."""
    sql_nettoye = sql.strip().rstrip(";").strip()

    if not sql_nettoye.upper().startswith("SELECT"):
        raise HTTPException(status_code=400, detail="La requête générée n'est pas une lecture (SELECT) valide.")

    if ";" in sql_nettoye:
        raise HTTPException(status_code=400, detail="Plusieurs instructions détectées, refusé par sécurité.")

    sql_majuscule = sql_nettoye.upper()
    for mot in MOTS_INTERDITS:
        if mot in sql_majuscule:
            raise HTTPException(status_code=400, detail=f"Requête refusée : mot-clé interdit détecté ({mot}).")

    if "LIMIT" not in sql_majuscule:
        sql_nettoye += " LIMIT 100"

    return sql_nettoye


def executer_sql_securise(sql: str) -> list[dict]:
    """Exécute la requête validée via le compte MySQL en lecture seule."""
    try:
        with ENGINE_LECTURE_SEULE.connect() as conn:
            resultat = conn.execute(text(sql))
            colonnes = list(resultat.keys())
            lignes = resultat.fetchall()
        return [dict(zip(colonnes, ligne)) for ligne in lignes]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'exécution de la requête : {str(e)}")


class MessageChat(BaseModel):
    message: str
    historique: list[dict] = []  # [{"role": "user"|"agent", "contenu": "..."}]


def appeler_ollama(prompt: str, format_json: bool = False, max_tokens: int = 300) -> str:
    """Appelle Ollama en local et renvoie le texte généré.
    format_json=True force une sortie JSON valide (plus rapide et plus fiable pour la sélection d'outil).
    """
    payload = {
        "model": MODELE,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": max_tokens, "temperature": 0},
    }
    if format_json:
        payload["format"] = "json"

    try:
        reponse = requests.post(OLLAMA_URL, json=payload, timeout=150)
        reponse.raise_for_status()
        return reponse.json()["response"]
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Impossible de contacter Ollama. Vérifie qu'il tourne bien (commande : ollama serve, ou l'app est lancée).",
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Le modèle a mis trop de temps à répondre. Si c'est la toute première question depuis le démarrage du backend, réessaie — le modèle doit se charger en mémoire une seule fois, les questions suivantes sont plus rapides.",
        )


OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"

OUTILS_FORMAT_NATIF = [
    {
        "type": "function",
        "function": {
            "name": "kpi_global",
            "description": "Indicateurs globaux de TOUT l'hôpital en un instantané (total hospitalisations, âge moyen, taux de décès...). Réservé à la Direction. Pas d'évolution dans le temps.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "kpi_service",
            "description": "Indicateurs GLOBAUX et déjà calculés d'UN service précis (durée moyenne de séjour, taux d'occupation, top pathologie, top médecin de ce service). Utiliser UNIQUEMENT pour une question sur un service dans son ensemble. NE PAS utiliser pour une liste de patients individuels, un classement de patients, ou un filtre spécifique — dans ce cas utiliser requete_sql_libre.",
            "parameters": {
                "type": "object",
                "properties": {"id_service": {"type": "integer", "description": "Identifiant du service concerné"}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "repartition",
            "description": "Répartition d'un champ en catégories : sexe, pathologie, ville, type_admission, mode_sortie, ou tranche_age.",
            "parameters": {
                "type": "object",
                "properties": {
                    "champ": {
                        "type": "string",
                        "enum": ["sexe", "pathologie", "ville", "type_admission", "mode_sortie", "tranche_age"],
                    },
                    "id_service": {"type": "integer", "description": "Optionnel, un service précis"},
                },
                "required": ["champ"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "volumes_mensuels",
            "description": "Évolution DANS LE TEMPS du nombre d'hospitalisations, mois par mois. Utiliser dès que la question parle de tendance, évolution, progression, 'ces derniers mois'.",
            "parameters": {
                "type": "object",
                "properties": {"id_service": {"type": "integer", "description": "Optionnel, un service précis"}},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generer_recommandations",
            "description": "Recommandations et conseils pour améliorer la performance de l'hôpital ou d'un service, basés sur les vrais indicateurs déjà calculés. Utiliser pour toute question du type 'recommandation', 'conseil', 'comment améliorer', 'que faire pour...'. Accessible à tous les rôles : direction (hôpital entier), chef_service (uniquement son propre service), analyste (vue globale).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "requete_sql_libre",
            "description": "Analyse ad hoc de DONNÉES FACTUELLES sur les hospitalisations : listes de patients, classements ('les X patients avec...', 'top N'), filtres combinés. Exemples valides : 'quels sont les 5 patients avec la plus longue durée de séjour ?', 'liste des patients de plus de 80 ans'. NE JAMAIS utiliser pour : des questions de culture générale sans lien avec l'hôpital, des demandes d'avis/opinion/recommandation/conseil, des salutations, ou toute question qui ne demande pas explicitement une donnée chiffrée ou une liste précise. Dans tous ces cas, ne choisis AUCUN outil. Réservé aux rôles direction et analyste — ne jamais proposer cet outil pour un rôle chef_service, quelle que soit la question.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


def outils_autorises_pour_role(role: str) -> list[dict]:
    """Filtre la liste d'outils selon le rôle AVANT de l'envoyer au modèle.
    Plus fiable qu'une simple instruction textuelle : un outil absent de la liste
    ne peut physiquement pas être choisi, même si le modèle se trompe.
    """
    if role == "chef_service":
        return [o for o in OUTILS_FORMAT_NATIF if o["function"]["name"] != "requete_sql_libre"]
    return OUTILS_FORMAT_NATIF


def choisir_outil_natif(question: str, role: str, id_service: int | None) -> dict:
    """Sélection d'outil via l'API native de tool calling d'Ollama (plus fiable que du JSON en texte libre)."""
    contexte = f"Contexte : l'utilisateur connecté a le rôle '{role}'" + (f", service id={id_service}" if id_service else "") + "."
    if role == "chef_service":
        contexte += " IMPORTANT : ce rôle n'a JAMAIS accès à l'outil requete_sql_libre, quelle que soit la question — ne le propose jamais pour ce rôle. Ce rôle n'a accès à AUCUN outil capable de lister des patients individuels (seulement des statistiques globales via kpi_service). Si la question demande une liste de patients précis, choisis quand même kpi_service (le plus proche disponible) plutôt que rien, la réponse expliquera honnêtement la limite."
    contexte += " Si la question ne demande pas explicitement une donnée factuelle sur les hospitalisations (pas de culture générale, pas d'avis, pas de conseil, pas de recommandation), ne choisis aucun outil."

    try:
        reponse = requests.post(
            OLLAMA_CHAT_URL,
            json={
                "model": MODELE,
                "messages": [
                    {"role": "system", "content": f"Tu choisis l'outil le plus pertinent pour répondre à la question de l'utilisateur. {contexte}"},
                    {"role": "user", "content": question},
                ],
                "tools": outils_autorises_pour_role(role),
                "options": {"temperature": 0},
                "stream": False,
            },
            timeout=90,
        )
        reponse.raise_for_status()
        message = reponse.json().get("message", {})
        appels = message.get("tool_calls", [])

        if not appels:
            return {"outil": "aucun", "parametres": {}}

        premier_appel = appels[0]["function"]
        return {"outil": premier_appel["name"], "parametres": premier_appel.get("arguments", {})}

    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="Impossible de contacter Ollama.")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Le modèle a mis trop de temps à répondre.")


def resumer_serie_temporelle(donnees: list) -> dict:
    """Calcule un résumé fiable d'une série mensuelle (volumes_mensuels), en Python pur,
    pour éviter que le LLM n'invente des chiffres en essayant d'analyser une longue liste.
    """
    if not donnees:
        return {"resume": "Aucune donnée disponible."}

    totaux = [d["total"] for d in donnees]
    maximum = max(donnees, key=lambda d: d["total"])
    minimum = min(donnees, key=lambda d: d["total"])
    moyenne = round(sum(totaux) / len(totaux), 1)
    dernier = donnees[-1]
    avant_dernier = donnees[-2] if len(donnees) >= 2 else None

    tendance = None
    if avant_dernier:
        if dernier["total"] > avant_dernier["total"]:
            tendance = f"en hausse ({avant_dernier['total']} → {dernier['total']} entre {avant_dernier['periode']} et {dernier['periode']})"
        elif dernier["total"] < avant_dernier["total"]:
            tendance = f"en baisse ({avant_dernier['total']} → {dernier['total']} entre {avant_dernier['periode']} et {dernier['periode']})"
        else:
            tendance = "stable sur les deux derniers mois"

    return {
        "nombre_de_mois": len(donnees),
        "periode_couverte": f"{donnees[0]['periode']} à {donnees[-1]['periode']}",
        "moyenne_mensuelle": moyenne,
        "mois_le_plus_actif": f"{maximum['periode']} avec {maximum['total']} admissions",
        "mois_le_moins_actif": f"{minimum['periode']} avec {minimum['total']} admissions",
        "dernier_mois": f"{dernier['periode']} avec {dernier['total']} admissions",
        "tendance_recente": tendance,
    }


def generer_recommandations(role: str, current_user: dict) -> tuple[str, dict]:
    """Génère des recommandations concrètes, basées UNIQUEMENT sur des KPI agrégés déjà calculés
    (jamais sur des données patient individuelles, pour éviter tout risque d'invention d'identité).
    Le périmètre s'adapte au rôle : Direction = hôpital entier, chef de service = son service, analyste = vue globale.
    """
    if role == "direction":
        donnees = _kpi_global(current_user=current_user)
        contexte_role = "Tu conseilles la Direction de l'hôpital, sur l'ensemble de l'établissement."
    elif role == "chef_service":
        donnees = _kpi_service(id_service=current_user["id_service"], current_user=current_user)
        contexte_role = f"Tu conseilles un chef de service, uniquement sur SON service ({donnees.get('nom_service', '')})."
    else:  # analyste
        donnees = _kpi_global(current_user={**current_user, "role": "direction"})
        contexte_role = "Tu conseilles un analyste de données sur l'activité globale de l'hôpital."

    prompt = f"""{contexte_role}

Voici les indicateurs réels disponibles :
{json.dumps(donnees, ensure_ascii=False, default=str)}

Rédige 3 à 5 recommandations concrètes et actionnables pour améliorer la performance, UNIQUEMENT basées sur ces chiffres.

RÈGLES STRICTES :
- N'invente AUCUN chiffre, AUCUNE date qui n'est pas dans les indicateurs ci-dessus.
- Ne mentionne AUCUN patient individuel, aucun nom, aucune identité — ces données sont uniquement des statistiques globales.
- Chaque recommandation doit s'appuyer explicitement sur un chiffre précis cité ci-dessus.
- Réponds en français, sous forme de liste à puces claire et concise.
"""
    texte = appeler_ollama(prompt, max_tokens=700).strip()
    return texte, donnees


def executer_outil(nom_outil: str, parametres: dict, current_user: dict, question: str = ""):
    """Exécute la vraie fonction Python correspondante.
    RÈGLE DE SÉCURITÉ : l'id_service vient TOUJOURS de current_user pour un chef_service,
    jamais de ce que le LLM a proposé.
    """
    role = current_user["role"]
    note_redirection = None

    id_service_demande = parametres.get("id_service")
    if role == "chef_service":
        id_service_final = current_user["id_service"]
        if nom_outil in ("kpi_service", "repartition", "volumes_mensuels"):
            note_redirection = "toujours_le_service_de_l_utilisateur"
    else:
        id_service_final = id_service_demande

    if nom_outil == "kpi_global":
        if role != "direction":
            raise HTTPException(status_code=403, detail="Cette information est réservée à la Direction.")
        return _kpi_global(current_user=current_user), note_redirection

    if nom_outil == "kpi_service":
        if id_service_final is None:
            raise HTTPException(status_code=400, detail="Il faut préciser un service pour cette question.")
        return _kpi_service(id_service=id_service_final, current_user=current_user), note_redirection

    if nom_outil == "repartition":
        champ = parametres.get("champ")
        if champ is None:
            raise HTTPException(status_code=400, detail="Le champ à répartir n'a pas été identifié.")
        return _repartition_generique(champ=champ, id_service=id_service_final, limite=20, current_user=current_user), note_redirection

    if nom_outil == "volumes_mensuels":
        return _volumes_mensuels(id_service=id_service_final, current_user=current_user), note_redirection

    if nom_outil == "requete_sql_libre":
        if role not in ("direction", "analyste"):
            raise HTTPException(status_code=403, detail="L'analyse SQL libre est réservée à la Direction et à l'Analyste.")
        sql_genere = generer_sql(question)
        sql_valide = valider_sql_securise(sql_genere)
        lignes = executer_sql_securise(sql_valide)
        return {"sql_execute": sql_valide, "resultats": lignes}, note_redirection

    return None, None


def reformuler(question: str, resultat, ne_pas_nommer_service: bool = False) -> str:
    """2e appel LLM : transforme le résultat JSON brut en réponse en français, naturelle et concise."""
    consigne_service = (
        "\nIMPORTANT : ne mentionne AUCUN nom de service dans ta réponse, il a déjà été précisé à l'utilisateur juste avant. "
        "Contente-toi de décrire les chiffres.\n"
        if ne_pas_nommer_service else ""
    )
    prompt = f"""Voici une question posée par un utilisateur d'un hôpital, et le résultat brut obtenu depuis la base de données.
Reformule ce résultat en une réponse claire et concise en français, sans mentionner de JSON ni de code.

RÈGLES STRICTES :
- N'utilise QUE les chiffres et informations présents dans le résultat brut ci-dessous.
- N'invente AUCUNE date, AUCUN mois, AUCUNE comparaison, AUCUN chiffre qui n'apparaît pas explicitement dans le résultat brut.
- N'invente JAMAIS de nom, prénom ou identité de patient. Les patients sont identifiés UNIQUEMENT par un numéro (id_patient) dans ce système, ils n'ont pas de nom enregistré. Si le résultat brut ne contient pas de nom, n'en mentionne aucun, utilise le numéro de patient.
- N'INVENTE JAMAIS de liste de patients individuels (avec des id_patient ou des durées de séjour) si le résultat brut ne contient PAS une telle liste. Si la question demandait une liste précise de patients mais que le résultat brut ne contient que des statistiques globales (comme une moyenne ou un total), dis-le honnêtement : explique que ce niveau de détail n'est pas disponible avec les données fournies, au lieu d'inventer des exemples.
- Ne fais aucun calcul ni conversion d'unité (pas de conversion jours → heures/minutes par exemple).
- Reprends les nombres exactement tels qu'ils apparaissent, sans les arrondir ni les transformer.
- Si une information n'est pas dans le résultat brut, ne la mentionne pas du tout — n'essaie pas de la deviner.
{consigne_service}
Question : "{question}"
Résultat brut : {json.dumps(resultat, ensure_ascii=False, default=str)}

Réponse :"""
    return appeler_ollama(prompt).strip()


def question_dans_perimetre(question: str) -> bool:
    """Vérifie, par une question binaire simple, si la question concerne bien l'hôpital.
    Filtre en amont, avant même de proposer des outils au modèle — plus fiable que de
    compter sur le modèle pour refuser correctement au milieu d'une liste d'outils.

    IMPORTANT (correction) : on ne bloque que si le modèle a clairement répondu NON.
    Avec max_tokens=5 (version précédente), la réponse était souvent tronquée avant même
    de contenir "OUI" ou "NON" correctement, ce qui bloquait TOUTES les questions par erreur,
    y compris les questions légitimes. On laisse maintenant plus de place à la réponse, et
    on ne bloque que sur un NON explicite — en cas de doute, on laisse passer la question.
    """
    prompt = f"""Réponds uniquement par le mot OUI ou par le mot NON, rien d'autre, aucune explication.

Cette question concerne-t-elle les hospitalisations, les patients, les services de santé,
les indicateurs (KPI) d'un hôpital, des prédictions médicales, ou des recommandations
pour améliorer la performance d'un hôpital ou d'un service hospitalier ?

Question : "{question}"

Réponds uniquement par OUI ou NON."""
    reponse = appeler_ollama(prompt, max_tokens=10).strip().upper()
    return not reponse.startswith("NON")


def corriger_noms_services_incorrects(texte: str, vrai_nom_service: str) -> str:
    """Filet de sécurité en Python pur : remplace tout nom de service incorrect mentionné
    par erreur dans le texte généré par le vrai nom. Plus fiable qu'une simple instruction
    au modèle, qui s'est révélée insuffisante à elle seule sur certains cas.
    """
    with engine_principal.connect() as conn:
        tous_les_noms = [l[0] for l in conn.execute(text("SELECT nom_service FROM DimService")).fetchall()]

    for nom in tous_les_noms:
        if nom and nom != vrai_nom_service and nom.lower() in texte.lower():
            texte = re.sub(re.escape(nom), vrai_nom_service, texte, flags=re.IGNORECASE)

    return texte


@router.post("/chat")
def chat_agent(payload: MessageChat, current_user: dict = Depends(get_current_user)):
    """Point d'entrée principal de l'agent conversationnel."""
    decision = choisir_outil_natif(
        question=payload.message,
        role=current_user["role"],
        id_service=current_user.get("id_service"),
    )

    nom_outil = decision.get("outil", "aucun")

    if nom_outil == "aucun":
        return {
            "reponse": "Je ne peux répondre qu'aux questions concernant les hospitalisations, les KPI, les prédictions de durée de séjour, ou des demandes de recommandations sur la performance de l'hôpital/du service. Peux-tu reformuler ta question dans ce cadre ?",
            "donnees": None,
        }

    if nom_outil == "generer_recommandations":
        texte_reco, donnees_kpi = generer_recommandations(current_user["role"], current_user)
        return {"reponse": texte_reco, "donnees": donnees_kpi}

    resultat, note_redirection = executer_outil(nom_outil, decision.get("parametres", {}), current_user, question=payload.message)

    donnees_pour_reformulation = resultat
    if nom_outil == "volumes_mensuels" and isinstance(resultat, list):
        donnees_pour_reformulation = resumer_serie_temporelle(resultat)

    reponse_texte = reformuler(payload.message, donnees_pour_reformulation, ne_pas_nommer_service=(note_redirection is not None))

    if note_redirection is not None and isinstance(resultat, dict) and "nom_service" in resultat:
        # Filet de sécurité : corrige tout nom de service incorrect que le modèle
        # aurait pu mentionner dans le corps du texte, malgré la consigne.
        reponse_texte = corriger_noms_services_incorrects(reponse_texte, resultat["nom_service"])

        prefixe_securite = (
            f"⚠️ Vous n'avez accès qu'aux données de votre propre service ({resultat['nom_service']}). "
            f"Voici ce que je peux te montrer :\n\n"
        )
        reponse_texte = prefixe_securite + reponse_texte

    return {
        "reponse": reponse_texte,
        "donnees": resultat,
    }