# Hémicycle, veille média France d'octobre 2026

Tableau de bord interactif de **veille média en affaires publiques** sur l'actualité française du 1er au 23 octobre 2026.

> Une bonne veille ne consiste pas à recevoir 200 articles par jour, mais à capter les **signaux** qui anticipent les arbitrages politiques et les positions parlementaires.

**Démo en ligne :** https://sadoukas.github.io/Tp_ecole_f2i/

## Contenu du tableau de bord

Le site est découpé en sept vues, accessibles par les onglets du bandeau : À la une, Parlement, Agenda, Radar, Dossiers, Signaux, Que faire. Chaque vue a sa propre adresse (`#radar`, `#signaux`…). Les longues listes sont repliées derrière un bouton, et le Radar n'affiche qu'un graphique à la fois.

| Section | Ce qu'on y trouve |
|---|---|
| Ouverture | Hémicycle interactif des 577 sièges coloré selon la posture des groupes sur le budget, compte à rebours des délais constitutionnels |
| Fil | Les derniers signaux en défilement |
| Note de tête | Lecture d'ensemble destinée à une direction, points de vigilance |
| Top 10 signaux | Les faits qui pèsent le plus sur les arbitrages à venir |
| Radar | Matrice impact × urgence, carte de chaleur dossier × semaine, chronologie, nature des signaux |
| Rapport de force | Posture et lignes rouges des groupes parlementaires sur le budget |
| Scénarios | Hypothèses d'ici fin 2026, probabilités et déclencheurs |
| Échéances | Frise et agenda jusqu'à la présidentielle |
| Analyse par thème | 16 dossiers : synthèse, signaux, acteurs clés, échéances |
| Explorateur | Recherche plein texte et filtres (thème, type, impact, signaux faibles), sources cliquables |
| Recommandations | Actions opérationnelles et points de vigilance |
| Acteurs | Cartographie triable des acteurs clés |

## Thèmes couverts

Budget et finances publiques · Sécurité sociale et santé · Retraites, travail et social · Vie parlementaire · Exécutif · Présidentielle 2027 et partis · Énergie et climat · Numérique et IA · Agriculture · Sécurité, justice et immigration · Europe et international · Défense · Économie et industrie · Territoires, logement et transports · Éducation, culture et médias · Opinion et climat social.

## Méthode

Dispositif multi-agents en trois étages :

1. **Recherche** : 16 agents analystes, un par thème, interrogent la presse nationale, la presse spécialisée et les sources institutionnelles, puis extraient 6 à 10 signaux structurés (date, acteurs, type, impact, urgence, tonalité, signal faible, anticipation, implications, sources).
2. **Vérification** : 16 agents fact-checkers contrôlent chaque signal (réalité de l'événement, dates, chiffres, acteurs, URL) et suppriment ce qui n'est pas vérifiable.
3. **Synthèse** : un agent produit la lecture stratégique (top signaux, dynamiques transverses, rapport de force, scénarios, calendrier, recommandations).
4. **Réécriture** : 17 rédacteurs reprennent tous les textes selon une charte éditoriale stricte (style dépêche et note de cabinet, liste de tournures proscrites), puis 17 secrétaires de rédaction contrôlent la fidélité aux faits et traquent les tics d'écriture. Un agent relève les effectifs des groupes sur le site de l'Assemblée nationale.

Grille de notation : **impact** (effet attendu sur la décision publique, 1–5) et **urgence** (fenêtre d'action, 1–5). La priorité de tri vaut impact × urgence, majorée pour les signaux faibles.

## Structure

```
index.html          page du tableau de bord
assets/style.css    styles (thème clair / sombre)
assets/app.js       rendu des graphiques SVG et de l'interactivité, sans dépendance
assets/icons.js     pictogrammes Lucide des dossiers
favicon.svg         favicon (pictogramme « landmark » de Lucide)
data/veille.json    données brutes de la veille
data/veille.js      mêmes données, chargeables en file://
scripts/build.py    régénère data/veille.js depuis data/veille.json
```

## Utilisation locale

Ouvrir `index.html` dans un navigateur, sans serveur ni installation. Après modification de `data/veille.json` :

```bash
python scripts/build.py
```

## Avertissement

Les scores d'impact, d'urgence et les probabilités de scénarios sont des appréciations d'analyste. Toujours se reporter aux sources citées avant toute utilisation externe.

## Crédits

Icônes : [Lucide](https://lucide.dev), licence ISC. Polices : Spectral et Familjen Grotesk (Google Fonts, licence OFL).
