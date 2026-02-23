const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ── MONGODB ──
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connecté'))
    .catch(err => console.error('Erreur MongoDB:', err));

const contactSchema  = new mongoose.Schema({}, { strict: false });
const Contact        = mongoose.model('Contact', contactSchema);

const geocacheSchema = new mongoose.Schema({ city: String, lat: Number, lon: Number, fullName: String }, { strict: false });
const Geocache       = mongoose.model('Geocache', geocacheSchema);

const backupSchema   = new mongoose.Schema({ createdAt: Date, contacts: Array }, { strict: false });
const Backup         = mongoose.model('Backup', backupSchema);

// ── AUTO-BACKUP toutes les 24h (garde les 7 derniers) ──
async function runBackup() {
    try {
        const all = await Contact.find({}, { _id: 0, __v: 0 }).lean();
        if (all.length === 0) return;
        await Backup.create({ createdAt: new Date(), contacts: all });
        const backups = await Backup.find({}).sort({ createdAt: 1 }).select('_id');
        if (backups.length > 7) {
            const toDelete = backups.slice(0, backups.length - 7).map(b => b._id);
            await Backup.deleteMany({ _id: { $in: toDelete } });
        }
        console.log('Backup auto OK - ' + all.length + ' contacts');
    } catch (e) { console.error('Erreur backup:', e); }
}
setInterval(runBackup, 24 * 60 * 60 * 1000);
mongoose.connection.once('open', () => setTimeout(runBackup, 5000));

// ── LOGIN ──
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'AzimutTrans' && password === 'Azimutt73') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
});

// ── TEMPLATE ──
app.get('/api/template', (req, res) => {
    const templatePath = path.join(__dirname, 'template_contacts.xlsx');
    if (fs.existsSync(templatePath)) {
        res.setHeader('Content-Disposition', 'attachment; filename="modele_contacts.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.sendFile(templatePath);
    } else {
        res.status(404).json({ error: 'Template non trouvé' });
    }
});

// ── GET CONTACTS ──
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find({}, { _id: 0, __v: 0 }).lean();
        res.json(contacts);
    } catch (err) {
        console.error('Erreur GET contacts:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── SAVE CONTACTS ──
app.post('/api/contacts', async (req, res) => {
    try {
        const contacts = req.body;
        await Contact.deleteMany({});
        if (contacts.length > 0) await Contact.insertMany(contacts);
        io.emit('contactsUpdated', contacts);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur POST contacts:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── GEOCACHE ──
app.get('/api/geocache', async (req, res) => {
    try {
        const entries = await Geocache.find({}, { _id: 0, __v: 0 }).lean();
        res.json(entries);
    } catch (err) { res.status(500).json({ error: 'Erreur geocache' }); }
});

app.post('/api/geocache', async (req, res) => {
    try {
        const entries = req.body; // [{ city, lat, lon, fullName }]
        for (const e of entries) {
            await Geocache.updateOne({ city: e.city }, { $set: e }, { upsert: true });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erreur geocache save' }); }
});

// ── BACKUPS ──
app.get('/api/backups', async (req, res) => {
    try {
        const backups = await Backup.find({}, { contacts: 0 }).sort({ createdAt: -1 }).lean();
        res.json(backups);
    } catch (err) { res.status(500).json({ error: 'Erreur backups' }); }
});

app.post('/api/backups/restore/:id', async (req, res) => {
    try {
        const backup = await Backup.findById(req.params.id).lean();
        if (!backup) return res.status(404).json({ error: 'Backup introuvable' });
        await Contact.deleteMany({});
        if (backup.contacts.length > 0) await Contact.insertMany(backup.contacts);
        io.emit('contactsUpdated', backup.contacts);
        res.json({ success: true, count: backup.contacts.length });
    } catch (err) { res.status(500).json({ error: 'Erreur restauration' }); }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
