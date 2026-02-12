# Contact Map

## Overview
A real-time contact management application with a map visualization. Access is secured via a login firewall. Data is persisted on the server and synced across all clients instantly.

## Architecture
- **Backend**: Node.js/Express server with Socket.IO for real-time bidirectional communication.
- **Frontend**: Single-page application using Leaflet.js for mapping and SheetJS for data handling.
- **Storage**: JSON file-based persistence (`contacts.json`) on the server.
- **Authentication**: Secured with username `AzimutTrans` and password `Azimutt73`.

## Features
- **Real-time Sync**: Any changes (add/edit/delete) are broadcasted to all connected users immediately.
- **Advanced Search**: Filter contacts by name, city, company, or email via a unified search bar.
- **Interactive Stats**: Real-time counters for total contacts and unique cities.
- **Glassmorphism UI**: Modern, sleek sidebar with animations and hover effects.
- **One-click Copy**: Quickly copy all contact emails for external use.
- **Export**: Full project compiled into `project_export.zip` for easy deployment or backup.

## Exporting the Project
1. Download `project_export.zip`.
2. Unzip on any machine with Node.js installed.
3. Run `npm install` followed by `npm start`.
4. Access the app at `http://localhost:5000`.
