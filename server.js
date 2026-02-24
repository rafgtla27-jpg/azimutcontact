const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const fs         = require('fs');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ── CONFIG ──
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET  = process.env.JWT_SECRET || 'azimut_jwt_secret_change_in_prod';
const JWT_EXPIRY  = '24h';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connecté'))
    .catch(err => console.error('Erreur MongoDB:', err));

// ── SCHEMAS ──
const contactSchema  = new mongoose.Schema({}, { strict: false });
const Contact        = mongoose.model('Contact', contactSchema);

const geocacheSchema = new mongoose.Schema({ city: String, lat: Number, lon: Number, fullName: String }, { strict: false });
const Geocache       = mongoose.model('Geocache', geocacheSchema);

const backupSchema   = new mongoose.Schema({ createdAt: Date, contacts: Array }, { strict: false });
const Backup         = mongoose.model('Backup', backupSchema);

const userSchema = new mongoose.Schema({
    username:  { type: String, required: true, unique: true, trim: true },
    password:  { type: String, required: true },   // bcrypt hash
    role:      { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});
const User = mongoose.model('User', userSchema);

// ── INIT : créer admin par défaut si aucun user ──
mongoose.connection.once('open', async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        const hash = await bcrypt.hash('Azimutt73', 12);
        await User.create({ username: 'AzimutTrans', password: hash, role: 'admin' });
        console.log('Admin par défaut créé : AzimutTrans / Azimutt73');
    }
    setTimeout(runBackup, 5000);
});

// ── AUTO-BACKUP ──
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

// ── MIDDLEWARE AUTH ──
function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
        next();
    });
}

// ── LOGIN ──
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Champs manquants' });
    try {
        const user = await User.findOne({ username: username.trim() });
        if (!user) return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
        await User.updateOne({ _id: user._id }, { lastLogin: new Date() });
        const token = jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        res.json({ success: true, token, username: user.username, role: user.role });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

// ── USER MANAGEMENT (admin only) ──
app.get('/api/users', requireAdmin, async (req, res) => {
    const users = await User.find({}, { password: 0, __v: 0 }).lean();
    res.json(users);
});

app.post('/api/users', requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username et password requis' });
    try {
        const hash = await bcrypt.hash(password, 12);
        const user = await User.create({ username: username.trim(), password: hash, role: role || 'user' });
        res.json({ success: true, id: user._id, username: user.username, role: user.role });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Nom d\'utilisateur déjà pris' });
        res.status(500).json({ error: 'Erreur création' });
    }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    // Empêcher de supprimer le dernier admin
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (targetUser.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) return res.status(400).json({ error: 'Impossible de supprimer le dernier admin' });
    }
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas vous supprimer vous-même' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.put('/api/users/:id/password', requireAuth, async (req, res) => {
    // Un user peut changer son propre mdp; un admin peut changer n'importe lequel
    if (req.params.id !== req.user.id && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Non autorisé' });
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 car. min)' });
    const hash = await bcrypt.hash(password, 12);
    await User.findByIdAndUpdate(req.params.id, { password: hash });
    res.json({ success: true });
});

// ── TEMPLATE ──
app.get('/api/template', requireAuth, (req, res) => {
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
app.get('/api/contacts', requireAuth, async (req, res) => {
    try {
        const contacts = await Contact.find({}, { _id: 0, __v: 0 }).lean();
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── SAVE CONTACTS ──
app.post('/api/contacts', requireAuth, async (req, res) => {
    try {
        const contacts = req.body;
        await Contact.deleteMany({});
        if (contacts.length > 0) await Contact.insertMany(contacts);
        io.emit('contactsUpdated', contacts);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ── GEOCACHE ──
app.get('/api/geocache', requireAuth, async (req, res) => {
    try {
        const entries = await Geocache.find({}, { _id: 0, __v: 0 }).lean();
        res.json(entries);
    } catch (err) { res.status(500).json({ error: 'Erreur geocache' }); }
});

app.post('/api/geocache', requireAuth, async (req, res) => {
    try {
        const entries = req.body;
        for (const e of entries) {
            await Geocache.updateOne({ city: e.city }, { $set: e }, { upsert: true });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Erreur geocache save' }); }
});

// ── BACKUPS ──
app.get('/api/backups', requireAuth, async (req, res) => {
    try {
        const backups = await Backup.find({}, { contacts: 0 }).sort({ createdAt: -1 }).lean();
        res.json(backups);
    } catch (err) { res.status(500).json({ error: 'Erreur backups' }); }
});

app.post('/api/backups/restore/:id', requireAdmin, async (req, res) => {
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
