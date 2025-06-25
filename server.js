#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require('stremio-addon-sdk');
const addonInterface = require('./addon');

const port = process.env.PORT || 7000;

// Serve the addon
serveHTTP(addonInterface, { port })
    .then(() => {
        console.log(`CineStream Stremio Addon is running on port ${port}`);
        console.log(`Addon URL: http://localhost:${port}/manifest.json`);
        console.log(`Install URL: stremio://localhost:${port}/manifest.json`);
    })
    .catch(err => {
        console.error('Error starting server:', err);
        process.exit(1);
    });

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down CineStream Stremio Addon...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down CineStream Stremio Addon...');
    process.exit(0);
});

