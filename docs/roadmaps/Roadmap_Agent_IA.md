# Feuille de route — Agent IA d'Aide à la Décision Hospitalière

Adaptée à ta machine (8 Go RAM) : modèle léger, pas de génération SQL libre,
approche "sélection d'outil" plus sûre et plus facile à défendre en soutenance.

---

## PHASE 0 — Installation (avant tout code)

### 0.1 Rediriger le stockage des modèles vers ton disque libre
PowerShell en administrateur :
```powershell
setx OLLAMA_MODELS "D:\ollama_models" /M
```
Redémarre le PC pour que la variable soit prise en compte. Vérifie :
```powershell
echo $env:OLLAMA_MODELS
```

### 0.2 Installer Ollama
Télécharge et installe depuis https://ollama.com/download (Windows).

### 0.3 Télécharger le modèle
```powershell
ollama pull llama3.2:3b
```
Si les réponses en français sont décevantes, teste en alternative :
```powershell
ollama pull phi3:mini
```

### 0.4 Tester en ligne de commande
```powershell
ollama run llama3.2:3b "Réponds en français : qu'est-ce qu'une durée moyenne de séjour hospitalier ?"
```
Le modèle doit répondre correctement, même si un peu lentement (10-20s normal sur 8 Go de RAM).

### 0.5 Vérifier qu'Ollama tourne en API (pas juste en CLI)
Ollama démarre automatiquement un serveur local sur `http://localhost:11434`. Teste avec :
```powershell
curl http://localhost:11434/api/tags
```
Tu dois voir la liste des modèles installés en JSON. Si ça répond, l'API est prête — c'est elle que ton backend FastAPI va appeler.

### 0.6 Dépendances Python
Pas besoin de LangChain pour commencer — juste `requests` (déjà installé normalement) :
```powershell
pip install requests --break-system-packages
```

**Ne passe à la Phase 1 que si 0.4 et 0.5 fonctionnent.**

---

## PHASE 1 — Conception (sur papier avant de coder)

### 1.1 Principe retenu : sélection d'outil, pas de SQL généré
Le LLM ne fait jamais de SQL. Il choisit un outil existant (parmi ceux que tu as déjà codés :
`kpi_global`, `kpi_service`, `repartition_generique`, `volumes_mensuels`, `predict`...) et
propose des paramètres. Le backend appelle la vraie fonction Python, jamais une requête
inventée par le modèle. Le LLM reformule ensuite le résultat en français.

Deux appels au LLM par question :
1. **Sélection** : question → JSON `{outil, parametres}`
2. **Reformulation** : résultat JSON de l'outil → phrase en français

### 1.2 Catalogue des outils disponibles (à adapter/étendre)

| Nom outil | Fonction Python réutilisée | Paramètres |
|---|---|---|
| `kpi_global` | `kpi_global()` (kpi_router.py) | aucun |
| `kpi_service` | `kpi_service(id_service)` | id_service |
| `repartition` | `repartition_generique(champ, id_service?)` | champ, id_service |
| `volumes_mensuels` | `volumes_mensuels(id_service?)` | id_service |
| `predire_duree_sejour` | `/api/predict` (prediction_router.py) | age, sexe, id_service, type_admission, pathologie |
| `top_medecin_service` | déjà dans `kpi_service` | id_service |

### 1.3 Règle de sécurité non négociable
Le rôle et l'`id_service` de l'utilisateur viennent **toujours** du token JWT (`current_user`),
jamais des paramètres proposés par le LLM. Si le LLM propose `id_service: 5` mais que
l'utilisateur connecté est chef du service 2, le backend force `id_service = 2` et ignore
la proposition du modèle. Le LLM peut halluciner ; le backend ne doit jamais lui faire confiance
pour les questions d'autorisation.

---

## PHASE 2 — Backend : le cœur de l'agent

### 2.1 Créer `agent_router.py`
Structure :
1. Fonction `appeler_ollama(prompt, format_json=False)` → requête POST vers Ollama
2. Fonction `choisir_outil(question, role, id_service)` → 1er appel LLM, parse le JSON
3. Fonction `executer_outil(nom_outil, parametres, current_user)` → appelle la vraie fonction Python, applique la sécurité (1.3)
4. Fonction `reformuler(question, resultat)` → 2e appel LLM
5. Endpoint `POST /api/agent/chat` → orchestre les 3 étapes

### 2.2 Gestion des erreurs à prévoir
- Ollama indisponible (serveur pas lancé) → message clair à l'utilisateur, pas de crash
- JSON mal formé renvoyé par le LLM → réessayer une fois, sinon réponse de repli ("je n'ai pas compris, peux-tu reformuler ?")
- Outil demandé qui n'existe pas dans le catalogue → même repli
- Timeout (modèle trop lent) → mettre un timeout raisonnable (30-45s) côté requête HTTP

### 2.3 Mémoire de conversation
Pour rester simple avec un petit modèle : garder les 3-4 derniers échanges (question + réponse)
et les repasser dans le prompt à chaque nouvel appel, plutôt qu'un système de mémoire complexe.

---

## PHASE 3 — Brancher les outils un par un

Ordre recommandé (du plus simple au plus complexe) :
1. `kpi_global` / `kpi_service` — pas de paramètres à extraire du texte, juste identifier le bon outil
2. `repartition` — extraire le champ demandé (sexe, pathologie, ville...) depuis la question
3. `volumes_mensuels` — idem
4. `predire_duree_sejour` — le plus complexe : il faut extraire âge, sexe, pathologie de la question. **Si une info manque, l'agent doit demander à l'utilisateur de la préciser plutôt que d'inventer une valeur.** Teste ce cas explicitement.

Ne branche l'outil suivant qu'une fois le précédent fiable sur plusieurs questions test.

---

## PHASE 4 — Sécurité par rôle (à valider avant la démo)

Checklist à tester manuellement :
- [ ] Un chef de service qui demande "montre-moi les données du service Pédiatrie" (qui n'est pas le sien) doit être refusé ou automatiquement recentré sur son propre service
- [ ] Un analyste ne doit pas pouvoir déclencher `predire_duree_sejour` pour un vrai patient si ce n'est pas prévu dans son rôle (à décider selon ton cahier des charges)
- [ ] Aucune requête SQL n'est jamais construite à partir du texte libre de l'utilisateur

---

## PHASE 5 — Frontend : interface de chat

### 5.1 Composants
- `ChatMessage.jsx` : une bulle de message (utilisateur à droite, agent à gauche)
- `AgentChat.jsx` : la page complète (historique + zone de saisie + indicateur "en train d'écrire...")

### 5.2 Intégration
- Ajouter un lien "Assistant IA" dans chaque sidebar (chef service, direction, analyste)
- Route protégée comme les autres pages, accessible aux 3 rôles

### 5.3 Affichage enrichi (optionnel mais valorisant)
Si la réponse de l'agent contient des données chiffrées, afficher un petit tableau ou une carte
KPI en plus du texte, pas seulement une phrase — plus impressionnant pour la soutenance.

---

## PHASE 6 — Tests

Teste dans cet ordre, note ce qui échoue :
1. Questions KPI simples ("combien d'hospitalisations ce mois-ci ?")
2. Questions de répartition ("répartition par sexe dans mon service")
3. Question de prédiction complète (toutes les infos données d'un coup)
4. Question de prédiction incomplète (l'agent doit demander les infos manquantes)
5. Question hors périmètre du chef de service (doit être bloquée)
6. Question hors sujet ("quelle est la capitale du Maroc ?") — l'agent doit répondre qu'il ne peut aider que sur les données hospitalières, pas inventer un outil

Si le modèle se trompe souvent d'outil, resserre le prompt système (exemples plus précis,
format de sortie plus strict) avant d'ajouter de nouveaux outils.

---

## PHASE 7 — Finitions (si le temps le permet, en fin de stage)

- Détection d'anomalies simple : comparer un chiffre à la moyenne historique, signaler un écart > seuil
- Génération de synthèse/rapport résumé sur demande
- Mémoire de conversation plus robuste

Ne commence pas la Phase 7 tant que les Phases 0 à 6 ne sont pas stables — c'est la partie
"bonus", pas le cœur attendu du livrable.
