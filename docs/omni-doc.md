# 🗺️ Spécifications Techniques & Ressources de Recherche — SnapMind / ShotFinder

Ce document regroupe les spécifications techniques requises pour une application Expo/NativeWind avec recherche sémantique locale, les ressources de développement actuelles et l'inspiration UI basée sur l'effet de flou et le minimalisme de la galerie iOS.

---

## 🛠️ 1. Spécifications Techniques (Stack Expo + NativeWind)

Pour faire tourner un modèle d'IA local (CLIP) et une galerie fluide, l'application doit exploiter les modules natifs via l'architecture moderne d'Expo.

### Architecture des Modules (On-Device)

- **Core & Routing :** `Expo v51+` avec `Expo Router` (Fichiers basés sur la structure de fichiers pour une navigation fluide).
- **Interface (UI) :** `NativeWind v4` (Support natif de Tailwind CSS v4 avec gestion simplifiée du mode sombre via la classe `dark:`).
- **Accès Médias :** `expo-media-library` pour récupérer le flux de photos local et cibler l'album système des captures d'écran.
- **Optimisation RAM :** `expo-image-manipulator` pour redimensionner les captures en $224 \times 224 \text{ px}$ avant de les envoyer au modèle d'IA.
- **Moteur d'IA (Vecteurs) :** `react-native-executorch` (par Software Mansion) pour exécuter le modèle compressé _MobileCLIP_ directement sur le GPU/NPU du téléphone.
- **Base de Données Vectorielle :** `expo-sqlite` utilisant l'extension vectorielle ou un stockage clé-valeur ultra-rapide comme `react-native-mmkv` pour stocker et comparer les tableaux de vecteurs (embeddings) en moins de 100ms.

---

## 🎨 2. Inspiration Interface : Style "iOS Gallery & Blur Effect"

L'interface doit s'inspirer du minimalisme de l'application Photos d'Apple, en mettant l'accent sur la profondeur visuelle et l'accessibilité à une seule main.

### Éléments UI à reproduire avec NativeWind :

1.  **La barre de recherche flottante (Blurs & Glassmorphism) :**
    - Placée en haut ou sous forme de pilule en bas.
    - Utilisation de la propriété de flou d'arrière-plan de NativeWind : `bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-white/20`. Cela donne cet effet de "verre dépoli" transparent propre à iOS lorsque les images défilent derrière.
2.  **Navigation en "Tabs" Flottants :**
    - Au lieu d'une barre d'onglets classique bloquée en bas, utiliser une structure suspendue : `absolute bottom-6 left-6 right-6 h-16 rounded-full bg-black/80 dark:bg-zinc-900/80 backdrop-blur-lg`.
3.  **Transitions d'images fluides (Shared Elements) :**
    - Lors du clic sur une miniature de la grille, l'image doit s'agrandir vers la vue plein écran sans coupure, en utilisant l'API `Shared Element Transitions` native de _React Native Reanimated_.

---

## 📚 3. Sources & Ressources pour le Projet

Voici les liens et ressources de documentation pour implémenter chaque brique technique du projet.

### Développement & IA Locale (Moteur)

- **Software Mansion - ExecuTorch React Native :** Kit d'outils officiel pour faire tourner les modèles PyTorch sur mobile.
    - _Source :_ [github.com/software-mansion-labs/react-native-executorch](https://github.com/software-mansion-labs/react-native-executorch)
- **PyTorch ExecuTorch Documentation :** Documentation globale pour la conversion et la quantification des modèles IA comme CLIP pour les architectures mobiles (Android NNAPI / Apple CoreML).
    - _Source :_ [pytorch.org/executorch](https://pytorch.org/docs)
- **MobileCLIP (Apple-backed Lightweight Embeddings) :** Modèles CLIP optimisés spécifiquement pour s'exécuter localement sur des appareils mobiles avec une consommation de RAM minimale.
    - _Source :_ [github.com/apple/ml-mobileclip](https://github.com/apple/ml-mobileclip)

### Framework, Base de données & UI

- **Expo SQLite v2 Documentation :** Utilisation de l'API moderne d'Expo pour gérer les requêtes locales et le stockage asynchrone des métadonnées.
    - _Source :_ [docs.expo.dev/versions/latest/sdk/sqlite/](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- **NativeWind v4 (Tailwind for React Native) :** Guide d'intégration complet pour compiler le CSS en composants natifs performants sans perte de frame rate.
    - _Source :_ [www.nativewind.dev](https://www.nativewind.dev)
- **React Native MMKV :** Pour le stockage ultra-rapide des vecteurs de recherche si tu préfères une alternative Key-Value à SQLite.
    - _Source :_ [github.com/mrousavy/react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)

### Inspiration UI & Design Systems

- **Apple Human Interface Guidelines (Photos & Blurs) :** Règles officielles d'Apple sur l'utilisation des matériaux translucides, du "Vibrancy" et des flous pour hiérarchiser l'information.
    - _Source :_ [developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines)
- **Ente Photos (UI Showcase) :** Code source et design d'une application de galerie moderne, axée sur la vie privée, intégrant de l'indexation locale.
    - _Source :_ [github.com/ente-io/ente](https://github.com/ente-io/ente)
