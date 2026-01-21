// Helper for serving images with resize and fallback support
async function serveImageWithFallback(req, res, next) {
    const { testId, filename } = req.params;
    const { width } = req.query;
    const testDir = path.join(process.cwd(), 'data', 'generated-images', testId);
    let targetPath = path.join(testDir, filename);
    let fileFound = false;

    try {
        await fs.access(targetPath);
        fileFound = true;
    } catch {
        // Smart Fallback: Search for file starting with UUID in directory
        try {
            await fs.access(testDir);
            const files = await fs.readdir(testDir);
            const cleanId = filename.includes('.') ? filename.split('.')[0] : filename;
            const match = files.find(f => f.startsWith(cleanId) && f.endsWith('.png'));
            if (match) {
                targetPath = path.join(testDir, match);
                fileFound = true;
            }
        } catch (e) { }
    }

    if (!fileFound) {
        if (req.path.startsWith('/candidates/')) return res.status(404).send('Not Found');
        return next();
    }

    // Serve with resize if requested
    try {
        if (width) {
            const size = parseInt(width);
            if (!isNaN(size) && size > 0 && size <= 2000) {
                const sharp = (await import('sharp')).default;
                const buffer = await sharp(targetPath)
                    .resize(size)
                    .png({ quality: 80 })
                    .toBuffer();

                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=31536000');
                return res.send(buffer);
            }
        }
        res.sendFile(targetPath);
    } catch (e) {
        console.error('[Image Serve Error]', e);
        res.sendFile(targetPath, (err) => { if (err && !res.headersSent) next(); });
    }
}

app.get('/generated-images/:testId/:filename', serveImageWithFallback);
app.get('/candidates/:testId/:filename', serveImageWithFallback);
