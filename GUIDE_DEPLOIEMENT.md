# 🚀 Guide de Déploiement - Contact Map

## Option 1 : Déploiement sur Render.com (RECOMMANDÉ)

### Étape 1 : Préparer votre code sur GitHub

1. **Créez un compte GitHub** si vous n'en avez pas : https://github.com
2. **Créez un nouveau repository** :
   - Cliquez sur le "+" en haut à droite → "New repository"
   - Nommez-le (ex: "contact-map")
   - Laissez-le PUBLIC
   - Cliquez "Create repository"

3. **Uploadez vos fichiers** :
   - Sur la page du repo, cliquez "uploading an existing file"
   - Glissez-déposez TOUS les fichiers :
     - index.html
     - server.js
     - package.json
     - package-lock.json
     - departements.geojson
     - .gitignore
   - Cliquez "Commit changes"

### Étape 2 : Déployer sur Render

1. **Créez un compte Render** : https://render.com
   - Cliquez "Get Started for Free"
   - Connectez-vous avec votre compte GitHub

2. **Créez un nouveau Web Service** :
   - Cliquez "New +" → "Web Service"
   - Autorisez Render à accéder à vos repos GitHub
   - Sélectionnez votre repository "contact-map"

3. **Configuration** :
   - **Name** : contact-map (ou autre nom)
   - **Environment** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free

4. **Cliquez "Create Web Service"**

5. **Attendez le déploiement** (2-3 minutes)
   - Vous verrez les logs de déploiement
   - Une fois terminé, votre URL sera affichée (ex: https://contact-map.onrender.com)

### ✅ C'est terminé ! Votre site est en ligne !

**URL de connexion** :
- Username : AzimutTrans
- Password : Azimutt73

---

## Option 2 : Déploiement sur Glitch (PLUS RAPIDE)

### Pour un déploiement immédiat sans GitHub :

1. **Allez sur** : https://glitch.com
2. **Créez un compte** (gratuit)
3. **Cliquez "New Project" → "glitch-hello-node"**
4. **Supprimez les fichiers existants** :
   - Cliquez sur chaque fichier → "Delete"
5. **Uploadez vos fichiers** :
   - Cliquez "Tools" → "Import/Export" → "Upload from Computer"
   - Sélectionnez tous vos fichiers
6. **Votre site est instantanément en ligne !**
   - Cliquez "Show" en haut pour voir votre site
   - L'URL sera : https://votre-projet.glitch.me

---

## Option 3 : Railway.app (PLUS STABLE)

1. **Créez un compte** : https://railway.app
2. **Cliquez "New Project" → "Deploy from GitHub repo"**
3. **Connectez GitHub et sélectionnez votre repo**
4. **Railway détectera automatiquement Node.js**
5. **Cliquez "Deploy"**

**Avantage** : 5$/mois de crédit gratuit, pas de mise en veille

---

## 🔧 Dépannage

### Le site se met en veille (Render)
- C'est normal avec le plan gratuit
- Il redémarre automatiquement à la première visite
- Pour éviter cela, utilisez Railway ou un service de ping (ex: UptimeRobot)

### Erreur de port
- Assurez-vous que server.js utilise `process.env.PORT`
- C'est déjà corrigé dans votre version

### Les contacts ne sont pas sauvegardés
- Sur Render gratuit, le système de fichiers est éphémère
- Pour une vraie persistance, utilisez une base de données (MongoDB gratuit)

---

## 📦 Fichiers modifiés pour le déploiement

- ✅ `server.js` → Port dynamique (process.env.PORT)
- ✅ `server.js` → Chemin statique corrigé (__dirname)
- ✅ `.gitignore` → Ajouté pour ignorer node_modules

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs sur votre plateforme de déploiement
2. Assurez-vous que tous les fichiers sont bien uploadés
3. Vérifiez que package.json contient les bonnes dépendances

---

## 📊 Comparaison des plateformes

| Plateforme | Gratuit | Durabilité | Facilité | Mise en veille | WebSockets |
|------------|---------|------------|----------|----------------|------------|
| **Render** | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Oui (15 min) | ✅ |
| **Glitch** | ✅ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Oui (5 min) | ✅ |
| **Railway** | 5$/mois | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Non | ✅ |

**Recommandation** : Commencez avec **Render** pour la simplicité et la durabilité !
