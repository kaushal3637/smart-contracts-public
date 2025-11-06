/**
 * PM2 Ecosystem Configuration for Ostium Automation
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 */

module.exports = {
    apps: [
        {
            name: 'ostium-automation',
            script: './index.js',
            cwd: __dirname,

            // Instances
            instances: 1,
            exec_mode: 'fork',

            // Auto-restart
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 5000,

            // Resource limits
            max_memory_restart: '1G',

            // Logs
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            log_type: 'json',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                LOG_LEVEL: 'debug'
            },
            env_production: {
                NODE_ENV: 'production',
                LOG_LEVEL: 'info'
            },

            // Watch (disabled for production)
            watch: false,
            ignore_watch: ['node_modules', 'logs', 'data'],

            // Graceful shutdown
            kill_timeout: 30000,
            listen_timeout: 10000,

            // Health check
            health_check: {
                enable: true,
                endpoint: 'http://localhost:8080/health',
                interval: 30000,
                timeout: 5000,
                unhealthy_threshold: 3
            }
        }
    ],

    // Deployment configuration (optional)
    deploy: {
        production: {
            user: 'ostium',
            host: 'production-server.com',
            ref: 'origin/main',
            repo: 'git@github.com:your-org/smart-contracts-public.git',
            path: '/opt/ostium/automation',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            'pre-deploy-local': 'git push origin main'
        },
        staging: {
            user: 'ostium',
            host: 'staging-server.com',
            ref: 'origin/develop',
            repo: 'git@github.com:your-org/smart-contracts-public.git',
            path: '/opt/ostium/automation-staging',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
        }
    }
};
