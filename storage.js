// Simple in-memory storage for URL mappings
// In a production environment, you'd use a database like Redis or MongoDB

class URLStorage {
    constructor() {
        this.storage = new Map();
        this.reverseStorage = new Map();
    }
    
    // Store URL with generated ID
    store(url, provider, title) {
        const id = this.generateId(provider, url, title);
        this.storage.set(id, {
            url: url,
            provider: provider,
            title: title,
            timestamp: Date.now()
        });
        this.reverseStorage.set(url, id);
        return id;
    }
    
    // Get URL by ID
    get(id) {
        const data = this.storage.get(id);
        return data ? data.url : null;
    }
    
    // Get full data by ID
    getData(id) {
        return this.storage.get(id);
    }
    
    // Get ID by URL
    getIdByUrl(url) {
        return this.reverseStorage.get(url);
    }
    
    // Generate unique ID
    generateId(provider, url, title) {
        const hash = Buffer.from(`${provider}_${url}_${title}`).toString('base64').slice(0, 16);
        return `${provider.toLowerCase().replace(/\s+/g, '')}_${hash}`;
    }
    
    // Clean old entries (optional, for memory management)
    cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
        const now = Date.now();
        for (const [id, data] of this.storage.entries()) {
            if (now - data.timestamp > maxAge) {
                this.storage.delete(id);
                this.reverseStorage.delete(data.url);
            }
        }
    }
    
    // Get all stored items (for debugging)
    getAll() {
        return Array.from(this.storage.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
    }
    
    // Clear all storage
    clear() {
        this.storage.clear();
        this.reverseStorage.clear();
    }
    
    // Get storage size
    size() {
        return this.storage.size;
    }
}

// Export singleton instance
const urlStorage = new URLStorage();

module.exports = {
    URLStorage,
    urlStorage
};

