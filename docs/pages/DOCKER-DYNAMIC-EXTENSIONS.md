# 🐳 Luna Dynamic Extensions - Docker Guide

Guía completa para usar el sistema de **Dynamic Component Loading** desde Docker.

## 🚀 Inicio Rápido

### 1. **Ejecutar con docker-start.sh (Recomendado)**

```bash
# Iniciar Luna con Dynamic Extensions
./docker-start.sh

# Output esperado:
# 🌙 Luna Project - Docker Setup with Dynamic Extensions
# ======================================================
# ✅ Luna Server is healthy (http://localhost:3000)
# ✅ Luna Client is running (http://localhost:5173)
# ✅ Dynamic Extensions system is healthy
# ✅ Found 3 dynamic extensions loaded
# 🚀 Loaded extensions: chart,table,video
```

### 2. **Gestionar Extensions con docker-extensions.sh**

```bash
# Modo interactivo (más fácil)
./docker-extensions.sh

# O comandos directos
./docker-extensions.sh list
./docker-extensions.sh health
./docker-extensions.sh test-all
```

## 📋 Métodos de Uso

### **Método 1: Scripts Automatizados (Recomendado)**

#### **A. Iniciar Sistema Completo**
```bash
# Iniciar todo el sistema con Dynamic Extensions
./docker-start.sh

# Para rebuild completo
./docker-start.sh --rebuild
```

#### **B. Gestionar Extensions**
```bash
# Modo interactivo - Menú visual
./docker-extensions.sh

# Comandos específicos
./docker-extensions.sh list              # Listar extensiones
./docker-extensions.sh stats             # Estadísticas
./docker-extensions.sh health            # Health check
./docker-extensions.sh test-all          # Test todas
./docker-extensions.sh test-extension chart  # Test específica
./docker-extensions.sh enable audio      # Habilitar extensión
./docker-extensions.sh disable video     # Deshabilitar extensión
./docker-extensions.sh reload            # Recargar todas
```

### **Método 2: Docker Compose Manual**

#### **A. Iniciar Servicios**
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f luna-server

# Verificar estado
docker-compose ps
```

#### **B. Verificar Dynamic Extensions**
```bash
# Health check
curl http://localhost:3000/api/dynamic-extensions/health

# Listar extensiones
curl http://localhost:3000/api/dynamic-extensions

# Estadísticas completas
curl http://localhost:3000/api/dynamic-extensions/stats
```

### **Método 3: Comandos Docker Directos**

#### **A. Ejecutar en Contenedor**
```bash
# Conectar al contenedor
docker exec -it luna-server bash

# Dentro del contenedor - verificar extensiones
node -e "
const { getDynamicRegistry } = require('./server/src/modules/shared/factories/module.factory');
const registry = getDynamicRegistry();
console.log('Extensions loaded:', Array.from(registry.keys()));
"
```

#### **B. Verificar Estructura de Archivos**
```bash
# Ver extensiones en contenedor
docker exec luna-server ls -la /app/server/src/modules/shared/extensions/

# Ver logs del servidor
docker logs luna-server --tail 50
```

## 🔧 Gestión de Extensions

### **1. Agregar Nueva Extension**

#### **Opción A: Usar Script (Más Fácil)**
```bash
# Crear archivo de extensión localmente
cat > audio-extension.ts << 'EOF'
export default class AudioExtension {
  readonly name = 'audio';
  readonly version = '1.0.0';
  readonly supportedTypes = ['AudioFrame', 'Audio'];

  async extract(shape: any, options?: any): Promise<any> {
    return {
      type: 'audio',
      duration: shape.getDuration ? shape.getDuration() : 0,
      format: shape.getFormat ? shape.getFormat() : 'unknown'
    };
  }
}
EOF

# Agregar al contenedor y habilitar
./docker-extensions.sh add audio-extension.ts audio
```

#### **Opción B: Docker Copy Manual**
```bash
# Copiar archivo al contenedor
docker cp ./my-extension.ts luna-server:/app/server/src/modules/shared/extensions/my-extension.ts

# Recargar extensiones via API
curl -X POST http://localhost:3000/api/dynamic-extensions/reload \
  -H "Content-Type: application/json" \
  -d '{"enabledExtensions": ["chart", "table", "video", "my"]}'
```

### **2. Configurar Extensions por Defecto**

#### **Modificar docker-compose.yml**
```yaml
environment:
  # Cambiar extensiones por defecto
  - DYNAMIC_EXTENSIONS_DEFAULT=chart,table,video,audio,smartart
  - DYNAMIC_EXTENSIONS_MAX=30
```

#### **Variables de Entorno**
```bash
# Configurar en .env file
DYNAMIC_EXTENSIONS_DEFAULT=chart,table,video,audio
DYNAMIC_EXTENSIONS_MAX=25
DYNAMIC_EXTENSIONS_ENABLED=true
```

### **3. Hot Reload en Desarrollo**

#### **Mount Extensions Directory**
```yaml
# En docker-compose.yml (development only)
volumes:
  - ./server/src/modules/shared/extensions:/app/server/src/modules/shared/extensions
```

```bash
# Reiniciar para aplicar cambios
docker-compose restart luna-server

# Recargar extensions
curl -X POST http://localhost:3000/api/dynamic-extensions/reload
```

## 🧪 Testing y Debugging

### **1. Test Extensions Completo**

```bash
# Via script
./docker-extensions.sh test-all

# Via curl directo
curl -X POST http://localhost:3000/api/dynamic-extensions/test-all \
  -H "Content-Type: application/json" \
  -d '{}'
```

### **2. Test Extension Específica**

```bash
# Via script
./docker-extensions.sh test-extension chart

# Via curl directo  
curl -X POST http://localhost:3000/api/dynamic-extensions/chart/test \
  -H "Content-Type: application/json" \
  -d '{"testData": null, "options": {}}'
```

### **3. Debugging Logs**

```bash
# Ver logs del servidor
./docker-extensions.sh logs

# O directamente
docker logs luna-server --tail 100 -f

# Buscar logs específicos de extensiones
docker logs luna-server 2>&1 | grep -i "extension\|dynamic"
```

### **4. Health Monitoring**

```bash
# Health check completo
./docker-extensions.sh health

# Monitor en tiempo real
watch -n 5 'curl -s http://localhost:3000/api/dynamic-extensions/health | jq .data.status'
```

## 📊 Monitoreo y Estadísticas

### **1. Dashboard de Extensions**

```bash
# Estadísticas completas
./docker-extensions.sh stats

# Información específica via API
curl http://localhost:3000/api/dynamic-extensions/stats | jq '.'
```

### **2. Métricas en Tiempo Real**

```bash
# Monitor de extensiones activas
watch -n 10 './docker-extensions.sh list'

# Monitor de health
watch -n 30 './docker-extensions.sh health'
```

### **3. Performance Monitoring**

```bash
# Ver uso de recursos del contenedor
docker stats luna-server

# Ver logs de performance
docker logs luna-server 2>&1 | grep -i "processing\|extension\|loaded"
```

## 🔒 Configuración de Seguridad

### **1. Production Security Settings**

```yaml
# En docker-compose.yml para production
environment:
  - DYNAMIC_EXTENSIONS_MAX=10           # Límite menor en producción
  - DYNAMIC_EXTENSIONS_SECURITY=strict  # Validación estricta
  - DYNAMIC_EXTENSIONS_SIGNATURE=true   # Verificar firmas
```

### **2. Configuración de Límites**

```yaml
environment:
  - DYNAMIC_EXTENSIONS_TIMEOUT=30000    # 30 segundos timeout
  - DYNAMIC_EXTENSIONS_MEMORY=100MB     # Límite de memoria
  - DYNAMIC_EXTENSIONS_RETRIES=3        # Intentos de retry
```

## 🚨 Troubleshooting

### **Problema 1: Extensions No Cargan**

```bash
# 1. Verificar contenedor corriendo
docker ps | grep luna-server

# 2. Verificar logs de startup
docker logs luna-server | grep -i "dynamic\|extension"

# 3. Test conectividad API
curl http://localhost:3000/api/dynamic-extensions/health

# 4. Verificar archivos en contenedor
docker exec luna-server ls -la /app/server/src/modules/shared/extensions/
```

### **Problema 2: Extension Test Falla**

```bash
# 1. Test individual
./docker-extensions.sh test-extension chart

# 2. Ver detalles del error
docker logs luna-server --tail 20

# 3. Verificar sintaxis de extension
docker exec luna-server node -e "
try { 
  require('/app/server/src/modules/shared/extensions/chart-extension.ts');
  console.log('Extension syntax OK');
} catch(e) { 
  console.error('Syntax error:', e.message);
}"
```

### **Problema 3: Performance Issues**

```bash
# 1. Ver recursos del contenedor
docker stats luna-server

# 2. Verificar número de extensiones
./docker-extensions.sh stats

# 3. Reducir extensiones activas
./docker-extensions.sh reload '["chart", "table"]'  # Solo las esenciales
```

## 🎯 Ejemplos de Uso Práctico

### **1. Setup Completo para Desarrollo**

```bash
# 1. Clonar proyecto y navegar
cd aspose-slides-25.6-nodejs

# 2. Configurar .env file
cp .env.example .env
# Editar .env con tus credenciales

# 3. Iniciar con Dynamic Extensions
./docker-start.sh

# 4. Verificar extensions
./docker-extensions.sh list

# 5. Test funcionalidad
./docker-extensions.sh test-all

# 6. Usar en frontend: http://localhost:5173
# 7. API disponible en: http://localhost:3000
```

### **2. Agregar Extension Personalizada**

```bash
# 1. Crear extension para SmartArt
cat > smartart-extension.ts << 'EOF'
export default class SmartArtExtension {
  readonly name = 'smartart';
  readonly version = '1.0.0';
  readonly supportedTypes = ['SmartArt', 'SmartArtShape'];

  async extract(shape: any, options?: any): Promise<any> {
    return {
      type: 'smartart',
      layout: shape.getLayout ? shape.getLayout().toString() : 'unknown',
      nodeCount: shape.getAllNodes ? shape.getAllNodes().getCount() : 0,
      style: shape.getQuickStyle ? shape.getQuickStyle().toString() : 'default'
    };
  }
}
EOF

# 2. Agregar al contenedor
./docker-extensions.sh add smartart-extension.ts smartart

# 3. Verificar que se cargó
./docker-extensions.sh list

# 4. Test la nueva extension
./docker-extensions.sh test-extension smartart
```

### **3. Production Deployment**

```bash
# 1. Build para production
docker-compose build --no-cache

# 2. Configurar variables de seguridad
export DYNAMIC_EXTENSIONS_MAX=10
export DYNAMIC_EXTENSIONS_SECURITY=strict

# 3. Iniciar servicios
docker-compose up -d

# 4. Verificar health
./docker-extensions.sh health

# 5. Setup monitoring
watch -n 60 './docker-extensions.sh health'
```

---

## 🎉 **Resultado Final**

Con esta configuración tienes **Dynamic Component Loading completo en Docker** con:

- ✅ **Zero-Config Scaling**: Agregar extensions sin rebuild
- ✅ **Hot Reload**: Cambios en tiempo real durante desarrollo  
- ✅ **Security-First**: Validación multicapa de extensiones
- ✅ **Production Ready**: Configuración robusta para production
- ✅ **Easy Management**: Scripts automatizados para gestión
- ✅ **Full Monitoring**: Health checks y estadísticas en tiempo real

**¡El sistema está listo para escalabilidad ilimitada desde Docker!** 🚀 