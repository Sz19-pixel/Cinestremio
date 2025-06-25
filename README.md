# CineStream Stremio Addon

A Stremio addon that provides access to movies and TV series from various streaming providers, excluding torrent and anime sources. The addon extracts m3u8 and mp4 video links for direct streaming.

## Features

- **Movies and TV Series**: Access to a wide variety of content
- **Multiple Providers**: Integrates with VegaMovies, MoviesMode, MoviesDrive, Bollyflix, and MultiMovies
- **Direct Streaming**: Extracts m3u8 and mp4 links for direct playback
- **Search Functionality**: Search for specific content across all providers
- **No Torrents/Anime**: Focuses only on direct streaming sources for movies and TV series

## Supported Providers

- VegaMovies
- MoviesMode  
- MoviesDrive
- Bollyflix
- MultiMovies

## Installation

### For Stremio Users

1. Copy the addon URL: `https://your-vercel-deployment.vercel.app/manifest.json`
2. Open Stremio
3. Go to Addons
4. Click "Add Addon" 
5. Paste the URL and click "Install"

### For Developers

#### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. The addon will be available at `http://localhost:7000/manifest.json`

#### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to deploy your addon

#### Manual Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Vercel
3. Deploy automatically

## Usage

1. Install the addon in Stremio using the manifest URL
2. Browse the catalog or use the search function to find content
3. Click on any movie or TV series to see available streams
4. Select a stream to start watching

## API Endpoints

- `GET /manifest.json` - Addon manifest
- `GET /catalog/{type}/{id}.json` - Content catalog
- `GET /meta/{type}/{id}.json` - Content metadata  
- `GET /stream/{type}/{id}.json` - Available streams

## Configuration

The addon is configured to work with multiple providers. You can modify the `providers.js` file to add or remove providers as needed.

## Technical Details

- **Framework**: Node.js with Stremio Addon SDK
- **Deployment**: Vercel serverless functions
- **Storage**: In-memory storage for URL mappings (suitable for serverless)
- **Video Formats**: Supports m3u8 and mp4 streams
- **CORS**: Enabled for cross-origin requests

## Limitations

- In-memory storage means URL mappings are reset on each deployment
- Some providers may have rate limiting or anti-bot measures
- Video availability depends on the source providers
- No torrent or anime content (by design)

## Legal Notice

This addon only provides links to content that is publicly available on the internet. Users are responsible for ensuring they have the right to access and view the content in their jurisdiction.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on the GitHub repository.

