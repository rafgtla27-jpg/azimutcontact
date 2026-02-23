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

const contactSchema = new mongoose.Schema({}, { strict: false });
const Contact = mongoose.model('Contact', contactSchema);

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
        if (contacts.length > 0) {
            await Contact.insertMany(contacts);
        }
        io.emit('contactsUpdated', contacts);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur POST contacts:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
