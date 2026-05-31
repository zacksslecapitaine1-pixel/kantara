# KANTARA v4 — Logiciel de Gestion de Projets
**Dev.zak | Zackss (Oumate Razakou) | Lomé, Togo**

---

## Nouveautés v4

### Nouveaux modules
- **Équipe (Team)** — Gestion des membres, rôles, départements, performance, charge de travail
- **Documents** — Bibliothèque de fichiers liés aux projets (PDF, images, liens, Excel, Word)

### Tâches améliorées
- Système de **tags / étiquettes** colorés avec saisie intuitive
- **Checklist intelligente** avec barre de progression en temps réel
- **Assignation à un membre** de l'équipe
- **Estimation de temps** en heures
- **Tâches récurrentes** (quotidien, hebdomadaire, mensuel)
- **Vue liste + vue Kanban** commutables
- **Export CSV** filtré

### Projets améliorés
- **Jalons (Milestones)** par projet avec suivi visuel
- **Templates de projets** (Construction, Web, Marketing, Événement, Vide)
- **Duplication** de projets en un clic
- **Archivage / Restauration** de projets
- **Score de santé** de projet (vert / orange / rouge)
- **Export CSV**
- Filtre "Afficher archivés"

### Dashboard enrichi
- **Fil d'activité récente** — toutes les actions de l'équipe
- **Panneau Performance équipe** — classement par efficacité
- Chargement de l'équipe intégré

### UX globale
- **FAB (Floating Action Button)** — création rapide depuis n'importe où
- **Recherche globale live** — projets, tâches, clients en temps réel
- **Export CSV** disponible sur Tâches, Projets, Équipe, Documents
- **ActivityLog** — journal d'activité en localStorage

---

## Migration base de données (Supabase)

Exécutez le SQL contenu dans `js/config/supabase.js` (variable `KANTARA_V4_SQL`)
dans votre tableau de bord Supabase → SQL Editor.

### Nouvelles tables créées
| Table | Description |
|-------|-------------|
| `team_members` | Membres de l'équipe |
| `milestones` | Jalons de projets |
| `subtasks` | Sous-tâches |
| `documents` | Bibliothèque de documents |

### Nouvelles colonnes sur tables existantes
| Table | Colonnes ajoutées |
|-------|-------------------|
| `tasks` | `tags`, `checklist`, `time_estimate`, `assignee_id`, `is_recurring`, `recurring_period` |
| `projects` | `archived`, `priority` |

---

## Structure des fichiers

```
kantara-v4/
├── index.html              — Page d'authentification
├── app.html               — Application principale
├── css/
│   ├── variables.css      — Tokens de design
│   └── app.css            — Styles (enrichis v4)
├── js/
│   ├── config/
│   │   └── supabase.js    — Config + SQL migration
│   ├── modules/
│   │   ├── auth.js        — Authentification
│   │   ├── dashboard.js   — Dashboard (v4)
│   │   ├── projects.js    — Projets (v4)
│   │   ├── tasks.js       — Tâches (v4)
│   │   ├── clients.js     — CRM Clients
│   │   ├── suppliers-expenses.js
│   │   ├── modules-rest.js
│   │   ├── team.js        — NOUVEAU — Équipe
│   │   └── documents.js   — NOUVEAU — Documents
│   ├── utils/
│   │   ├── helpers.js     — Utilitaires + ActivityLog + GlobalSearch
│   │   └── i18n.js        — Traductions FR/EN (enrichies v4)
│   ├── setup/
│   │   └── wizard.js      — Assistant de configuration
│   └── app.js             — Router + modules (v4)
└── README.md
```

---

## Contact
- **Portfolio :** [dev-zak.netlify.app](https://dev-zak.netlify.app)
- **Email :** zacksslecapitaine.1@gmail.com
- **Tél :** +228 92 10 19 69
