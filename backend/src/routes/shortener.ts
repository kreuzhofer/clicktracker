import { Router, Request, Response } from 'express';
import { validateParams } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { shortCodeParamsSchema } from '../schemas/campaignLink';
import { URLShortenerService } from '../services/URLShortenerService';

const router = Router();
const urlShortenerService = new URLShortenerService();

// Redirect shortened URL and track click
router.get('/:shortCode',
  validateParams(shortCodeParamsSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    
    // Extract tracking data from request
    const trackingData = {
      ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer as string
    };

    try {
      // Handle click and get redirect information
      const redirectInfo = await urlShortenerService.handleClick(shortCode, trackingData);
      
      // Perform redirect with 302 status for tracking
      res.redirect(302, redirectInfo.landingPageUrl);
    } catch (error) {
      // If short URL not found, show user-friendly 404 page
      if (error instanceof Error && error.message === 'Short URL not found') {
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Link Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background-color: #f5f5f5; 
              }
              .container { 
                max-width: 500px; 
                margin: 0 auto; 
                background: white; 
                padding: 40px; 
                border-radius: 8px; 
                box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
              }
              h1 { color: #e74c3c; }
              p { color: #666; line-height: 1.6; }
              .back-link { 
                display: inline-block; 
                margin-top: 20px; 
                padding: 10px 20px; 
                background-color: #3498db; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
              }
              .back-link:hover { background-color: #2980b9; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Link Not Found</h1>
              <p>Sorry, the link you're looking for doesn't exist or has been removed.</p>
              <p>Please check the URL and try again, or contact the person who shared this link with you.</p>
              <a href="/" class="back-link">Go to Homepage</a>
            </div>
          </body>
          </html>
        `);
      } else {
        // For other errors, return JSON error response
        res.status(500).json({ 
          error: 'Internal server error',
          message: 'Unable to process redirect request'
        });
      }
    }
  })
);

export default router;