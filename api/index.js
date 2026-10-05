const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const allowedOrigin = 'https://hjh-universaldownloader.vercel.app';
  
  // Extract request headers for domain validation
  const origin = req.headers['origin'] || '';
  const referer = req.headers['referer'] || '';

  const cleanOrigin = origin.replace(/\/$/, '');
  const cleanReferer = referer.replace(/\/$/, '');

  const isAllowedOrigin = cleanOrigin === allowedOrigin;
  const isAllowedReferer = cleanReferer === allowedOrigin || cleanReferer.startsWith(`${allowedOrigin}/`);

  // Allow local testing or direct requests
  const isLocal = !origin && !referer;

  if (!isAllowedOrigin && !isAllowedReferer && !isLocal) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(403).send(
      JSON.stringify({
        status: "error",
        message: "ACCESS DENIED",
        notice: "CONTACT TO BUY API : 03266571331 HJH OFFICIAL"
      }, null, 2)
    );
  }

  // Set CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- FEATURE 2: PROXY FILE DOWNLOADER WITH SIZE & CUSTOM NAME ---
  const { dl, filename, ext } = req.query;

  if (dl) {
    try {
      const fileResponse = await fetch(dl);
      if (!fileResponse.ok) {
        return res.status(fileResponse.status).send('Failed to fetch media file');
      }

      // Headers Forwarding
      const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
      const contentLength = fileResponse.headers.get('content-length');

      // Filename Cleaning & Prefixing with savebyHJH_
      let cleanTitle = (filename || 'video').trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
      cleanTitle = cleanTitle.replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
      
      if (!cleanTitle) cleanTitle = 'video';

      const finalFilename = `savebyHJH_${cleanTitle}`;
      const fileExtension = ext || 'mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${finalFilename}.${fileExtension}"`);
      
      // Pass Content-Length header so Download Managers show the REAL file size!
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Stream media file to client
      fileResponse.body.pipe(res);
      return;
    } catch (err) {
      return res.status(500).send('Error streaming media file: ' + err.message);
    }
  }

  // --- FEATURE 1: METADATA FETCHING ---
  const { url } = req.query;

  if (!url) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).send(
      JSON.stringify({
        status: "error",
        message: "Missing required 'url' or 'dl' parameter"
      }, null, 2)
    );
  }

  try {
    const targetUrl = `https://multidownapi.vercel.app/?url=${encodeURIComponent(url)}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(response.status).send(
        JSON.stringify({
          status: "error",
          message: "Failed to fetch data from upstream API"
        }, null, 2)
      );
    }

    const data = await response.json();

    const host = req.headers.host || 'hjh-universaldownloader.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}/api`;

    let formats = [];
    if (data.video_info && Array.isArray(data.video_info.available_formats)) {
      formats = data.video_info.available_formats.map(fmt => {
        const videoTitle = data.video_info.title || 'video';
        const proxiedDownloadUrl = `${baseUrl}?dl=${encodeURIComponent(fmt.download_url)}&filename=${encodeURIComponent(videoTitle)}&ext=${fmt.extension || 'mp4'}`;
        
        return {
          quality: fmt.quality,
          type: fmt.type,
          extension: fmt.extension,
          download_url: proxiedDownloadUrl
        };
      });
    }

    const transformedData = {
      status: data.status,
      developer: "HJH",
      website: "https://hjh-digital-store.iceiy.com",
      brand: "HJH | HJH TOOLS",
      video_info: {
        title: data.video_info?.title || '',
        thumbnail: data.video_info?.thumbnail || '',
        uploader: data.video_info?.uploader || '',
        original_url: data.video_info?.original_url || '',
        available_formats: formats
      }
    };

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(transformedData, null, 2));

  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(
      JSON.stringify({
        status: "error",
        message: "Internal Server Error",
        error: error.message
      }, null, 2)
    );
  }
};
