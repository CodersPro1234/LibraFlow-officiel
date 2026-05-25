# 📱 Guide d'accès Mobile (Scan QR Code)

Pour utiliser votre téléphone comme simulateur et scanner les QR codes de LibraFlow, suivez ces étapes très importantes.

## 1. Pré-requis
- Votre téléphone et votre ordinateur **doivent** être connectés au **même réseau Wi-Fi**.

## 2. Le problème de Sécurité (HTTPS)
Les navigateurs modernes (Chrome, Safari) **bloquent l'accès à la caméra** sur les sites qui ne sont pas en `https://`. En local, ils n'autorisent que `localhost`.

### 🛠 Solution pour Chrome (Android) :
1. Sur votre **téléphone**, ouvrez Chrome.
2. Tapez cette adresse : `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Cherchez l'option "Insecure origins treated as secure".
4. Sélectionnez **Enabled**.
5. Dans la zone de texte juste en dessous, tapez l'adresse de votre ordinateur :
   `http://192.168.100.86:5173`
6. Cliquez sur le bouton **Relaunch** en bas à droite pour redémarrer Chrome.

### 🍎 Solution pour Safari (iPhone) :
Safari est plus strict. Il est recommandé d'utiliser Chrome sur iPhone et de suivre les instructions si possible, ou de configurer un certificat SSL localement.

## 3. Comment se connecter ?

1. Assurez-vous que l'IP de votre ordi est bien : **`192.168.100.86`**
2. Sur votre téléphone, allez à :
   ```text
   http://192.168.100.86:5173
   ```
3. Connectez-vous, allez dans **Emprunts** ou **Catalogue**, et cliquez sur l'icône 📷.

---
💡 **Diagnostic** : Si vous voyez un message rouge disant "Le navigateur bloque la caméra sur une connexion non-sécurisée", c'est que l'étape du `chrome://flags` ci-dessus n'a pas été faite correctement.
