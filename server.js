const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

const CONTACTS_FILE = 'contacts.json';
let contacts = [];

if (fs.existsSync(CONTACTS_FILE)) {
    try {
        contacts = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
    } catch (e) {
        console.error("Error reading contacts file", e);
    }
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'AzimutTrans' && password === 'Azimutt73') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
});

app.get('/api/contacts', (req, res) => {
    res.json(contacts);
});

app.post('/api/contacts', (req, res) => {
    contacts = req.body;
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
    io.emit('contactsUpdated', contacts);
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
