/**
 * Health Check Endpoint
 *
 * Simple health check to verify the Vercel deployment is working
 */

module.exports = async (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Aviation Knowledge Bot',
    platform: 'Vercel Serverless',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      webhook: true,
      cron: true,
      database: !!process.env.DB_HOST
    }
  });
};
