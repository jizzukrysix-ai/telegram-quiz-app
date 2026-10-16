const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();

const db = admin.firestore();
const BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"; // Replace with your BotFather token

function verifyTelegramAuth(initData) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");
    urlParams.delete("hash");
    
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => `${key}=${val}`)
        .join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return calculatedHash === hash;
}

exports.updateScore = onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    try {
        const { initData, points } = req.body;

        if (!verifyTelegramAuth(initData)) {
            res.status(403).send({ error: "Invalid Telegram Authentication" });
            return;
        }

        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get("user"));
        const userId = user.id.toString();

        const userRef = db.collection("users").doc(userId);
        await userRef.set({
            username: user.username || "Anonymous",
            score: admin.firestore.FieldValue.increment(points),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        res.status(200).send({ success: true, message: "Score updated successfully" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});
