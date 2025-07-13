#!/bin/bash

# SSL Certificate Renewal Script for LunaSlides.com

echo "[$(date)] Starting SSL certificate renewal..."

cd /home/deploy/lunaslides

# Run renewal
docker-compose -f docker-compose.hostinger.yml run --rm certbot renew

# Reload nginx to use new certificates
docker-compose -f docker-compose.hostinger.yml exec luna-nginx nginx -s reload

echo "[$(date)] SSL certificate renewal complete"