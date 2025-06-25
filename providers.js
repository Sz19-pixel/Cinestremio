const axios = require('axios');
const cheerio = require('cheerio');

// Helper function to make HTTP requests with proper headers
async function makeRequest(url, options = {}) {
    try {
        const response = await axios({
            url,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Referer': new URL(url).origin,
                ...options.headers
            },
            timeout: 15000,
            maxRedirects: 5,
            ...options
        });
        return response;
    } catch (error) {
        console.error(`Request failed for ${url}:`, error.message);
        throw error;
    }
}

// Helper function to create slug from title
function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

// Helper function to extract video URLs from various formats
function extractVideoUrls(html, baseUrl) {
    const $ = cheerio.load(html);
    const urls = [];
    
    // Look for iframe sources
    $('iframe').each((i, elem) => {
        const src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src) {
            const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
            urls.push({
                url: fullUrl,
                type: 'iframe',
                quality: 'Unknown'
            });
        }
    });
    
    // Look for direct video links
    $('video source, a[href*=".mp4"], a[href*=".m3u8"]').each((i, elem) => {
        const href = $(elem).attr('href') || $(elem).attr('src');
        if (href && (href.includes('.mp4') || href.includes('.m3u8'))) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
            urls.push({
                url: fullUrl,
                type: href.includes('.m3u8') ? 'm3u8' : 'mp4',
                quality: '720p'
            });
        }
    });
    
    // Look for embedded players
    $('div[data-src], div[data-url]').each((i, elem) => {
        const src = $(elem).attr('data-src') || $(elem).attr('data-url');
        if (src) {
            const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
            urls.push({
                url: fullUrl,
                type: 'embed',
                quality: 'Unknown'
            });
        }
    });
    
    return urls;
}

// VegaMovies Provider
class VegaMoviesProvider {
    constructor() {
        this.baseUrl = 'https://vegamovies.nl';
        this.name = 'VegaMovies';
    }
    
    async search(query, type = 'movie') {
        try {
            const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const response = await makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            const results = [];
            
            $('.post-item, .movie-item').each((i, elem) => {
                const $elem = $(elem);
                const title = $elem.find('h2 a, .title a').first().text().trim();
                const link = $elem.find('a').first().attr('href');
                const poster = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
                
                if (title && link) {
                    results.push({
                        id: `vegamovies_${Buffer.from(link).toString('base64').slice(0, 10)}`,
                        type: type,
                        name: title,
                        poster: poster || 'https://via.placeholder.com/300x450/000000/FFFFFF?text=No+Image',
                        provider: this.name,
                        url: link
                    });
                }
            });
            
            return results.slice(0, 10);
        } catch (error) {
            console.error(`VegaMovies search error:`, error.message);
            return [];
        }
    }
    
    async getStreams(url) {
        try {
            const response = await makeRequest(url);
            const videoUrls = extractVideoUrls(response.data, this.baseUrl);
            const streams = [];
            
            for (const videoUrl of videoUrls) {
                if (videoUrl.type === 'iframe') {
                    // Try to extract from iframe
                    try {
                        const iframeResponse = await makeRequest(videoUrl.url);
                        const iframeUrls = extractVideoUrls(iframeResponse.data, videoUrl.url);
                        
                        for (const iframeUrl of iframeUrls) {
                            if (iframeUrl.type === 'mp4' || iframeUrl.type === 'm3u8') {
                                streams.push({
                                    url: iframeUrl.url,
                                    quality: iframeUrl.quality,
                                    title: `${this.name} - ${iframeUrl.type.toUpperCase()}`,
                                    name: `${this.name} - ${iframeUrl.quality}`
                                });
                            }
                        }
                    } catch (iframeError) {
                        console.error('Error extracting from iframe:', iframeError.message);
                    }
                } else if (videoUrl.type === 'mp4' || videoUrl.type === 'm3u8') {
                    streams.push({
                        url: videoUrl.url,
                        quality: videoUrl.quality,
                        title: `${this.name} - ${videoUrl.type.toUpperCase()}`,
                        name: `${this.name} - ${videoUrl.quality}`
                    });
                }
            }
            
            return streams;
        } catch (error) {
            console.error(`VegaMovies stream extraction error:`, error.message);
            return [];
        }
    }
}

// MoviesMode Provider
class MoviesModProvider {
    constructor() {
        this.baseUrl = 'https://moviesmod.net';
        this.name = 'MoviesMode';
    }
    
    async search(query, type = 'movie') {
        try {
            const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const response = await makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            const results = [];
            
            $('.post-item, .movie-item, .item').each((i, elem) => {
                const $elem = $(elem);
                const title = $elem.find('h2 a, .title a, h3 a').first().text().trim();
                const link = $elem.find('a').first().attr('href');
                const poster = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
                
                if (title && link) {
                    results.push({
                        id: `moviesmod_${Buffer.from(link).toString('base64').slice(0, 10)}`,
                        type: type,
                        name: title,
                        poster: poster || 'https://via.placeholder.com/300x450/000000/FFFFFF?text=No+Image',
                        provider: this.name,
                        url: link
                    });
                }
            });
            
            return results.slice(0, 10);
        } catch (error) {
            console.error(`MoviesMode search error:`, error.message);
            return [];
        }
    }
    
    async getStreams(url) {
        try {
            const response = await makeRequest(url);
            const videoUrls = extractVideoUrls(response.data, this.baseUrl);
            const streams = [];
            
            for (const videoUrl of videoUrls) {
                if (videoUrl.type === 'iframe') {
                    try {
                        const iframeResponse = await makeRequest(videoUrl.url);
                        const iframeUrls = extractVideoUrls(iframeResponse.data, videoUrl.url);
                        
                        for (const iframeUrl of iframeUrls) {
                            if (iframeUrl.type === 'mp4' || iframeUrl.type === 'm3u8') {
                                streams.push({
                                    url: iframeUrl.url,
                                    quality: iframeUrl.quality,
                                    title: `${this.name} - ${iframeUrl.type.toUpperCase()}`,
                                    name: `${this.name} - ${iframeUrl.quality}`
                                });
                            }
                        }
                    } catch (iframeError) {
                        console.error('Error extracting from iframe:', iframeError.message);
                    }
                } else if (videoUrl.type === 'mp4' || videoUrl.type === 'm3u8') {
                    streams.push({
                        url: videoUrl.url,
                        quality: videoUrl.quality,
                        title: `${this.name} - ${videoUrl.type.toUpperCase()}`,
                        name: `${this.name} - ${videoUrl.quality}`
                    });
                }
            }
            
            return streams;
        } catch (error) {
            console.error(`MoviesMode stream extraction error:`, error.message);
            return [];
        }
    }
}

// MoviesDrive Provider
class MoviesDriveProvider {
    constructor() {
        this.baseUrl = 'https://moviesdrive.net';
        this.name = 'MoviesDrive';
    }
    
    async search(query, type = 'movie') {
        try {
            const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const response = await makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            const results = [];
            
            $('.post-item, .movie-item, .item').each((i, elem) => {
                const $elem = $(elem);
                const title = $elem.find('h2 a, .title a, h3 a').first().text().trim();
                const link = $elem.find('a').first().attr('href');
                const poster = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
                
                if (title && link) {
                    results.push({
                        id: `moviesdrive_${Buffer.from(link).toString('base64').slice(0, 10)}`,
                        type: type,
                        name: title,
                        poster: poster || 'https://via.placeholder.com/300x450/000000/FFFFFF?text=No+Image',
                        provider: this.name,
                        url: link
                    });
                }
            });
            
            return results.slice(0, 10);
        } catch (error) {
            console.error(`MoviesDrive search error:`, error.message);
            return [];
        }
    }
    
    async getStreams(url) {
        try {
            const response = await makeRequest(url);
            const videoUrls = extractVideoUrls(response.data, this.baseUrl);
            const streams = [];
            
            for (const videoUrl of videoUrls) {
                if (videoUrl.type === 'iframe') {
                    try {
                        const iframeResponse = await makeRequest(videoUrl.url);
                        const iframeUrls = extractVideoUrls(iframeResponse.data, videoUrl.url);
                        
                        for (const iframeUrl of iframeUrls) {
                            if (iframeUrl.type === 'mp4' || iframeUrl.type === 'm3u8') {
                                streams.push({
                                    url: iframeUrl.url,
                                    quality: iframeUrl.quality,
                                    title: `${this.name} - ${iframeUrl.type.toUpperCase()}`,
                                    name: `${this.name} - ${iframeUrl.quality}`
                                });
                            }
                        }
                    } catch (iframeError) {
                        console.error('Error extracting from iframe:', iframeError.message);
                    }
                } else if (videoUrl.type === 'mp4' || videoUrl.type === 'm3u8') {
                    streams.push({
                        url: videoUrl.url,
                        quality: videoUrl.quality,
                        title: `${this.name} - ${videoUrl.type.toUpperCase()}`,
                        name: `${this.name} - ${videoUrl.quality}`
                    });
                }
            }
            
            return streams;
        } catch (error) {
            console.error(`MoviesDrive stream extraction error:`, error.message);
            return [];
        }
    }
}

// Bollyflix Provider
class BollyfixProvider {
    constructor() {
        this.baseUrl = 'https://bollyflix.net';
        this.name = 'Bollyflix';
    }
    
    async search(query, type = 'movie') {
        try {
            const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const response = await makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            const results = [];
            
            $('.post-item, .movie-item, .item').each((i, elem) => {
                const $elem = $(elem);
                const title = $elem.find('h2 a, .title a, h3 a').first().text().trim();
                const link = $elem.find('a').first().attr('href');
                const poster = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
                
                if (title && link) {
                    results.push({
                        id: `bollyflix_${Buffer.from(link).toString('base64').slice(0, 10)}`,
                        type: type,
                        name: title,
                        poster: poster || 'https://via.placeholder.com/300x450/000000/FFFFFF?text=No+Image',
                        provider: this.name,
                        url: link
                    });
                }
            });
            
            return results.slice(0, 10);
        } catch (error) {
            console.error(`Bollyflix search error:`, error.message);
            return [];
        }
    }
    
    async getStreams(url) {
        try {
            const response = await makeRequest(url);
            const videoUrls = extractVideoUrls(response.data, this.baseUrl);
            const streams = [];
            
            for (const videoUrl of videoUrls) {
                if (videoUrl.type === 'iframe') {
                    try {
                        const iframeResponse = await makeRequest(videoUrl.url);
                        const iframeUrls = extractVideoUrls(iframeResponse.data, videoUrl.url);
                        
                        for (const iframeUrl of iframeUrls) {
                            if (iframeUrl.type === 'mp4' || iframeUrl.type === 'm3u8') {
                                streams.push({
                                    url: iframeUrl.url,
                                    quality: iframeUrl.quality,
                                    title: `${this.name} - ${iframeUrl.type.toUpperCase()}`,
                                    name: `${this.name} - ${iframeUrl.quality}`
                                });
                            }
                        }
                    } catch (iframeError) {
                        console.error('Error extracting from iframe:', iframeError.message);
                    }
                } else if (videoUrl.type === 'mp4' || videoUrl.type === 'm3u8') {
                    streams.push({
                        url: videoUrl.url,
                        quality: videoUrl.quality,
                        title: `${this.name} - ${videoUrl.type.toUpperCase()}`,
                        name: `${this.name} - ${videoUrl.quality}`
                    });
                }
            }
            
            return streams;
        } catch (error) {
            console.error(`Bollyflix stream extraction error:`, error.message);
            return [];
        }
    }
}

// MultiMovies Provider
class MultiMoviesProvider {
    constructor() {
        this.baseUrl = 'https://multimovies.net';
        this.name = 'MultiMovies';
    }
    
    async search(query, type = 'movie') {
        try {
            const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
            const response = await makeRequest(searchUrl);
            const $ = cheerio.load(response.data);
            const results = [];
            
            $('.post-item, .movie-item, .item').each((i, elem) => {
                const $elem = $(elem);
                const title = $elem.find('h2 a, .title a, h3 a').first().text().trim();
                const link = $elem.find('a').first().attr('href');
                const poster = $elem.find('img').first().attr('src') || $elem.find('img').first().attr('data-src');
                
                if (title && link) {
                    results.push({
                        id: `multimovies_${Buffer.from(link).toString('base64').slice(0, 10)}`,
                        type: type,
                        name: title,
                        poster: poster || 'https://via.placeholder.com/300x450/000000/FFFFFF?text=No+Image',
                        provider: this.name,
                        url: link
                    });
                }
            });
            
            return results.slice(0, 10);
        } catch (error) {
            console.error(`MultiMovies search error:`, error.message);
            return [];
        }
    }
    
    async getStreams(url) {
        try {
            const response = await makeRequest(url);
            const videoUrls = extractVideoUrls(response.data, this.baseUrl);
            const streams = [];
            
            for (const videoUrl of videoUrls) {
                if (videoUrl.type === 'iframe') {
                    try {
                        const iframeResponse = await makeRequest(videoUrl.url);
                        const iframeUrls = extractVideoUrls(iframeResponse.data, videoUrl.url);
                        
                        for (const iframeUrl of iframeUrls) {
                            if (iframeUrl.type === 'mp4' || iframeUrl.type === 'm3u8') {
                                streams.push({
                                    url: iframeUrl.url,
                                    quality: iframeUrl.quality,
                                    title: `${this.name} - ${iframeUrl.type.toUpperCase()}`,
                                    name: `${this.name} - ${iframeUrl.quality}`
                                });
                            }
                        }
                    } catch (iframeError) {
                        console.error('Error extracting from iframe:', iframeError.message);
                    }
                } else if (videoUrl.type === 'mp4' || videoUrl.type === 'm3u8') {
                    streams.push({
                        url: videoUrl.url,
                        quality: videoUrl.quality,
                        title: `${this.name} - ${videoUrl.type.toUpperCase()}`,
                        name: `${this.name} - ${videoUrl.quality}`
                    });
                }
            }
            
            return streams;
        } catch (error) {
            console.error(`MultiMovies stream extraction error:`, error.message);
            return [];
        }
    }
}

// Provider Manager
class ProviderManager {
    constructor() {
        this.providers = [
            new VegaMoviesProvider(),
            new MoviesModProvider(),
            new MoviesDriveProvider(),
            new BollyfixProvider(),
            new MultiMoviesProvider()
        ];
    }
    
    async searchAll(query, type = 'movie') {
        const allResults = [];
        
        for (const provider of this.providers) {
            try {
                const results = await provider.search(query, type);
                allResults.push(...results);
            } catch (error) {
                console.error(`Error searching with ${provider.name}:`, error.message);
            }
        }
        
        return allResults.slice(0, 20); // Limit total results
    }
    
    async getStreamsById(id) {
        // Parse provider from ID
        const parts = id.split('_');
        if (parts.length < 2) {
            return [];
        }
        
        const providerName = parts[0];
        const provider = this.providers.find(p => p.name.toLowerCase().replace(/\s+/g, '') === providerName);
        
        if (!provider) {
            return [];
        }
        
        // For now, we'll need to implement a way to get the URL from the ID
        // This is a simplified approach - in a real implementation, you'd store the URL mapping
        try {
            // This would need to be implemented based on how you store the URL mapping
            const url = this.getUrlFromId(id);
            if (url) {
                return await provider.getStreams(url);
            }
        } catch (error) {
            console.error(`Error getting streams for ${id}:`, error.message);
        }
        
        return [];
    }
    
    getUrlFromId(id) {
        // This is a placeholder - you'd need to implement proper URL storage/retrieval
        // For now, return null to indicate URL not found
        return null;
    }
}

module.exports = {
    ProviderManager,
    VegaMoviesProvider,
    MoviesModProvider,
    MoviesDriveProvider,
    BollyfixProvider,
    MultiMoviesProvider
};

