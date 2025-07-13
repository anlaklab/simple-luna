# 🚀 Luna Platform - Deployment Guide

Luna es una plataforma profesional de procesamiento de PowerPoint con capacidades de IA que convierte archivos PPTX a esquema JSON Universal.

## 📋 Opciones de Deployment

### 🔧 Desarrollo Local

Para desarrollo local con hot reload:

```bash
# Opción 1: Docker Compose Simplificado (Recomendado)
docker-compose -f docker-compose.simple.yml up --build

# Opción 2: Solo servidor (si tienes el cliente corriendo separado)
docker build -f Dockerfile.server -t luna-server .
docker run -p 3000:3000 luna-server
```

**URLs de desarrollo:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger: http://localhost:3000/api-docs

### 🚀 Producción con Coolify

#### Configuración en Coolify

1. **Crear nuevo proyecto en Coolify**
2. **Configurar repositorio Git** 
3. **Usar configuración automática:**

```yaml
# Coolify detectará automáticamente el archivo coolify.yml
```

#### Variables de Entorno Requeridas

En Coolify, configura estas variables de entorno:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=tu-proyecto-firebase
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com

# OpenAI Configuration
OPENAI_API_KEY=sk-tu-clave-openai

# Security
JWT_SECRET=tu-secreto-jwt-super-seguro
CORS_ORIGIN=https://tu-dominio.com

# Opcional: Puerto personalizado
APP_PORT=80
```

#### Deploy Manual en Coolify

Si prefieres configuración manual:

1. **Dockerfile:** `Dockerfile.production`
2. **Puerto:** `80`
3. **Health Check:** `/api/v1/health`
4. **Recursos mínimos:**
   - CPU: 1 core
   - RAM: 2GB
   - Almacenamiento: 10GB

### 🐳 Docker Compose Standalone

Para deployment en servidor propio:

```bash
# Producción completa
docker-compose -f docker-compose.production.yml up -d

# Verificar estado
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

## 📁 Archivos de Configuración

### Para Desarrollo
- `docker-compose.simple.yml` - Docker Compose simplificado
- `Dockerfile.server` - Solo servidor
- `client/Dockerfile.dev` - Solo cliente con hot reload

### Para Producción
- `Dockerfile.production` - Imagen completa (cliente + servidor + nginx)
- `docker-compose.production.yml` - Compose de producción
- `coolify.yml` - Configuración específica para Coolify
- `nginx.production.conf` - Configuración nginx
- `start-production.sh` - Script de inicio

## 🔍 Verificación de Deployment

### Health Checks

```bash
# Verificar API
curl http://localhost/api/v1/health

# Verificar conversión PPTX
curl -X POST http://localhost/api/v1/conversion/pptx2json \
  -F "file=@presentation.pptx"
```

### Logs en Producción

```bash
# Logs de la aplicación
docker logs luna-production

# Logs de nginx
docker exec luna-production tail -f /var/log/nginx/access.log
docker exec luna-production tail -f /var/log/nginx/error.log
```

## ⚡ Optimizaciones

### Para Alto Volumen

Si esperas procesar muchos archivos PPTX:

```yaml
# En docker-compose.production.yml o Coolify
deploy:
  resources:
    limits:
      memory: 8G
      cpus: '4'
    reservations:
      memory: 4G
      cpus: '2'
```

### Para Archivos Grandes

```bash
# Variables de entorno adicionales
MAX_FILE_SIZE=524288000  # 500MB
BODY_PARSER_LIMIT=500mb
JAVA_OPTS="-Xmx4g -Xms1g -Djava.awt.headless=true"
```

## 🚨 Troubleshooting

### Problema: Módulo Java no encuentra bindings

```bash
# Verificar Java en contenedor
docker exec -it luna-production java -version
docker exec -it luna-production ls -la /app/node_modules/java/build/
```

### Problema: Aspose.Slides no carga

```bash
# Verificar biblioteca local
docker exec -it luna-production ls -la /app/lib/
docker exec -it luna-production node -e "console.log(require('./lib/aspose.slides.js'))"
```

### Problema: Frontend no carga

```bash
# Verificar nginx
docker exec -it luna-production nginx -t
docker exec -it luna-production ls -la /var/www/html/
```

## 📞 Soporte

- **Frontend:** React + Vite + shadcn/ui
- **Backend:** Node.js 18 + Express + TypeScript
- **Conversión:** Aspose.Slides local (NO cloud API)
- **Base de datos:** Firebase Firestore
- **IA:** OpenAI GPT-4
- **Arquitectura:** Microservicios con esquemas modulares

---

**Importante:** Luna procesa archivos PPTX reales usando la biblioteca local de Aspose.Slides. Nunca utiliza datos mock, APIs cloud o contenido de placeholder. Todos los archivos son procesados completamente sin límite de diapositivas. 