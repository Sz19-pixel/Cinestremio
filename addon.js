const { addonBuilder } = require('stremio-addon-sdk');
const { ProviderManager } = require('./providers');
const { urlStorage } = require('./storage');

// Define the addon manifest
const manifest = {
    id: 'org.cinestream.addon',
    version: '1.0.0',
    name: 'CineStream Addon',
    description: 'Stremio addon for CineStream providers - Movies and TV Series (No Torrents/Anime)',
    logo: 'https://via.placeholder.com/256x256/1a1a1a/ffffff?text=CS',
    background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=CineStream',
    types: ['movie', 'series'],
    catalogs: [
        {
            type: 'movie',
            id: 'cinestream-movies',
            name: 'CineStream Movies',
            extra: [
                {
                    name: 'search',
                    isRequired: false
                },
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        },
        {
            type: 'series',
            id: 'cinestream-series',
            name: 'CineStream TV Series',
            extra: [
                {
                    name: 'search',
                    isRequired: false
                },
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        }
    ],
    resources: [
        'catalog',
        'meta',
        'stream'
    ],
    idPrefixes: ['tt', 'cs']
};

// Create the addon builder
const builder = new addonBuilder(manifest);

// Initialize provider manager
const providerManager = new ProviderManager();

// Helper function to clean up old storage entries periodically
setInterval(() => {
    urlStorage.cleanup();
}, 60 * 60 * 1000); // Clean up every hour

// Define catalog handler
builder.defineCatalogHandler(({ type, id, extra }) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Catalog request: type=${type}, id=${id}, extra=${JSON.stringify(extra)}`);
            
            let metas = [];
            
            if (extra && extra.search) {
                // Search functionality
                console.log(`Searching for: ${extra.search}`);
                const searchResults = await providerManager.searchAll(extra.search, type);
                
                metas = searchResults.map(result => {
                    // Store URL in storage and get ID
                    const storedId = urlStorage.store(result.url, result.provider, result.name);
                    
                    return {
                        id: storedId,
                        type: result.type,
                        name: result.name,
                        poster: result.poster,
                        year: new Date().getFullYear(), // Default year
                        description: `From ${result.provider}`,
                        genres: ['Action', 'Drama'] // Default genres
                    };
                });
            } else {
                // Default catalog - show some popular content
                // For demo purposes, we'll show some sample content
                if (type === 'movie') {
                    metas = [
                        {
                            id: 'cs_sample_movie_1',
                            type: 'movie',
                            name: 'Popular Movie 1',
                            poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Movie+1',
                            year: 2023,
                            description: 'Search for movies using the search function',
                            genres: ['Action', 'Drama']
                        },
                        {
                            id: 'cs_sample_movie_2',
                            type: 'movie',
                            name: 'Popular Movie 2',
                            poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Movie+2',
                            year: 2023,
                            description: 'Search for movies using the search function',
                            genres: ['Comedy', 'Romance']
                        }
                    ];
                } else if (type === 'series') {
                    metas = [
                        {
                            id: 'cs_sample_series_1',
                            type: 'series',
                            name: 'Popular Series 1',
                            poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Series+1',
                            year: 2023,
                            description: 'Search for TV series using the search function',
                            genres: ['Drama', 'Thriller']
                        },
                        {
                            id: 'cs_sample_series_2',
                            type: 'series',
                            name: 'Popular Series 2',
                            poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Series+2',
                            year: 2023,
                            description: 'Search for TV series using the search function',
                            genres: ['Comedy', 'Family']
                        }
                    ];
                }
            }
            
            console.log(`Returning ${metas.length} catalog items`);
            resolve({ metas });
        } catch (error) {
            console.error('Catalog error:', error);
            reject(error);
        }
    });
});

// Define meta handler
builder.defineMetaHandler(({ type, id }) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Meta request: type=${type}, id=${id}`);
            
            // Get stored data
            const storedData = urlStorage.getData(id);
            
            let meta;
            if (storedData) {
                meta = {
                    id: id,
                    type: type,
                    name: storedData.title,
                    poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=' + encodeURIComponent(storedData.title),
                    background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=' + encodeURIComponent(storedData.title),
                    description: `Content from ${storedData.provider}. Click on "Streams" to watch.`,
                    year: new Date().getFullYear(),
                    genres: ['Action', 'Drama'],
                    director: ['Unknown'],
                    cast: ['Unknown'],
                    runtime: '120 min',
                    language: 'English'
                };
            } else {
                // Default meta for sample content
                meta = {
                    id: id,
                    type: type,
                    name: 'CineStream Content',
                    poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=CineStream',
                    background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=CineStream',
                    description: 'Content from CineStream providers. Use search to find specific movies or TV series.',
                    year: 2023,
                    genres: ['Action', 'Drama'],
                    director: ['Unknown'],
                    cast: ['Unknown'],
                    runtime: '120 min',
                    language: 'English'
                };
            }
            
            console.log(`Returning meta for: ${meta.name}`);
            resolve({ meta });
        } catch (error) {
            console.error('Meta error:', error);
            reject(error);
        }
    });
});

// Define stream handler
builder.defineStreamHandler(({ type, id }) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`Stream request: type=${type}, id=${id}`);
            
            let streams = [];
            
            // Get URL from storage
            const url = urlStorage.get(id);
            const storedData = urlStorage.getData(id);
            
            if (url && storedData) {
                console.log(`Getting streams from ${storedData.provider} for: ${url}`);
                
                // Find the provider
                const provider = providerManager.providers.find(p => 
                    p.name.toLowerCase() === storedData.provider.toLowerCase()
                );
                
                if (provider) {
                    try {
                        const providerStreams = await provider.getStreams(url);
                        streams = providerStreams;
                        console.log(`Found ${streams.length} streams from ${provider.name}`);
                    } catch (error) {
                        console.error(`Error getting streams from ${provider.name}:`, error.message);
                    }
                }
            }
            
            // If no streams found, add a placeholder
            if (streams.length === 0) {
                streams.push({
                    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    quality: '720p',
                    title: 'Sample Video (No streams found)',
                    name: 'Sample - 720p'
                });
            }
            
            console.log(`Returning ${streams.length} streams`);
            resolve({ streams });
        } catch (error) {
            console.error('Stream error:', error);
            reject(error);
        }
    });
});

module.exports = builder.getInterface();

