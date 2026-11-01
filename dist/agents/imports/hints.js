/** How to fix each finding type. */
export function getHint(finding) {
    const name = /^"([^"]+)"/.exec(finding.message)?.[1];
    switch (finding.rule) {
        case "missing-file":
            return "Corrige le chemin de l'import ou crée le fichier manquant.";
        case "missing-dependency":
            return name
                ? `Installe le paquet : pnpm add ${name}`
                : "Ajoute le paquet à package.json.";
        case "esm-extension":
            return "Écris l'extension complète dans l'import (ex. ./fichier.js).";
        case "unknown-builtin":
            return "Utilise le préfixe node: (ex. node:test) ou vérifie le nom du module.";
        case "import-cycle":
            return "Extrais le code partagé dans un troisième fichier pour casser le cycle.";
        case "no-package-json":
            return "Aucun package.json au-dessus de ce fichier : vérifie la racine du projet.";
        default:
            return "";
    }
}
//# sourceMappingURL=hints.js.map