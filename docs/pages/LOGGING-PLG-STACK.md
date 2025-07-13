# 📊 Luna Platform - PLG Stack Logging System

## 🎯 Overview

Luna Platform now includes a comprehensive **PLG (Prometheus + Loki + Grafana)** monitoring stack that provides:

- **📝 Centralized Logging**: All logs from frontend and backend collected in Loki
- **📊 Real-time Metrics**: System and application metrics in Prometheus
- **📈 Visual Dashboards**: Beautiful Grafana dashboards for monitoring
- **🔍 Log Analysis**: Advanced log querying and filtering capabilities
- **🚨 Alerting**: (Future) Automated alerts based on metrics and log patterns

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Monitoring    │
│   (React)       │    │   (Node.js)     │    │   Stack         │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Logger      │ │    │ │ Winston     │ │    │ │ Loki        │ │
│ │ Service     │ │────┼─▶│ + Loki      │ │────┼─▶│ (Logs)      │ │
│ │             │ │    │ │ Transport   │ │    │ │             │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│                 │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│                 │    │ │ Prometheus  │ │    │ │ Prometheus  │ │
│                 │    │ │ Metrics     │ │────┼─▶│ (Metrics)   │ │
│                 │    │ │             │ │    │ │             │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    │                 │
                                               │ ┌─────────────┐ │
                                               │ │ Grafana     │ │
                                               │ │ (Dashboard) │ │
                                               │ │             │ │
                                               │ └─────────────┘ │
                                               └─────────────────┘
```

## 🚀 Components

### 1. **Loki** - Log Aggregation System
- **Port**: 3100
- **Purpose**: Centralized log storage and querying
- **Features**: 
  - Efficient log indexing by labels
  - LogQL query language
  - Automatic log retention
  - Compression and deduplication

### 2. **Promtail** - Log Collection Agent
- **Purpose**: Collects logs from Docker containers and files
- **Features**:
  - Docker container log discovery
  - Log parsing and labeling
  - Multi-line log support
  - Reliable log shipping

### 3. **Prometheus** - Metrics Collection
- **Port**: 9090
- **Purpose**: Time-series metrics storage
- **Features**:
  - Custom Luna Platform metrics
  - System metrics (CPU, memory, disk)
  - Container metrics via cAdvisor
  - HTTP request metrics

### 4. **Grafana** - Visualization Dashboard
- **Port**: 3001
- **Purpose**: Data visualization and alerting
- **Features**:
  - Pre-configured dashboards
  - Logs and metrics correlation
  - Real-time monitoring
  - Alert management

### 5. **Node Exporter** - System Metrics
- **Port**: 9100
- **Purpose**: System-level metrics collection
- **Features**:
  - CPU, memory, disk metrics
  - Network interface metrics
  - Process metrics

### 6. **cAdvisor** - Container Metrics
- **Port**: 8080
- **Purpose**: Container-level metrics collection
- **Features**:
  - Container resource usage
  - Performance metrics
  - Docker integration

## 📋 Configuration Files

### Docker Compose Services
```yaml
# Main services added to docker-compose.yml
- loki          # Log aggregation
- promtail      # Log collection  
- prometheus    # Metrics collection
- grafana       # Visualization
- node-exporter # System metrics
- cadvisor      # Container metrics
```

### Monitoring Configuration
```
monitoring/
├── loki/
│   └── config.yml              # Loki configuration
├── promtail/
│   └── config.yml              # Log collection config
├── prometheus/
│   └── prometheus.yml          # Metrics scraping config
└── grafana/
    ├── provisioning/
    │   ├── datasources/
    │   │   └── datasources.yml # Auto-configure Prometheus & Loki
    │   └── dashboards/
    │       └── dashboards.yml  # Auto-load dashboards
    └── dashboards/
        ├── luna-platform-overview.json
        └── application/
            └── luna-logs-dashboard.json
```

## 🔧 Backend Integration

### Enhanced Logger (`server/src/utils/logger.ts`)
```typescript
// Winston with Loki transport
import LokiTransport from 'winston-loki';

// Specialized logging methods
logger.aspose('Processing started', { operation: 'pptx2json', slideCount: 10 });
logger.firebase('Document saved', { collection: 'presentations', documentId: 'abc123' });
logger.openai('Translation completed', { model: 'gpt-4', tokens: 1500 });
```

### Prometheus Metrics (`server/src/routes/metrics.routes.ts`)
```typescript
// Custom metrics for Luna Platform
- http_requests_total
- http_request_duration_seconds
- aspose_processing_duration_seconds
- firebase_operation_duration_seconds
- openai_request_duration_seconds
- openai_tokens_used_total
```

### Logs API (`server/src/routes/logs.routes.ts`)
```typescript
// Endpoints for log management
POST /api/v1/logs          # Receive frontend logs
GET  /api/v1/logs/status   # Logging system status
POST /api/v1/logs/flush    # Manual log flush
```

## 🎨 Frontend Integration

### Frontend Logger (`client/src/lib/utils/logger.ts`)
```typescript
// Structured logging with automatic backend forwarding
logger.info('User logged in', { userId: 'user123', action: 'login' });
logger.api('API call completed', { endpoint: '/pptx2json', status: 200, duration: 1500 });
logger.ui('Button clicked', { element: 'convertButton', action: 'click' });
logger.error('Conversion failed', { error: error.message, fileSize: 1024000 });
```

### Performance Monitoring
```typescript
// Automatic performance tracking
setupPerformanceLogging();

// Error boundary integration
logErrorBoundary(error, errorInfo);
```

## 📊 Dashboards

### 1. **Luna Platform Overview**
- System health status
- CPU, memory, disk usage
- HTTP request metrics
- Response times
- Application logs
- Container resource usage

### 2. **Luna Logs Dashboard**
- Log volume over time
- Error rate monitoring
- Log levels distribution
- Component activity
- Frontend/backend error logs
- Aspose processing logs
- API request logs
- Session activity

## 🚀 Deployment

### Option 1: Using PLG Deployment Script
```bash
# Deploy with full PLG stack
sudo ./scripts/deploy-with-plg.sh deploy

# Deploy with SSL
sudo ./scripts/deploy-with-plg.sh deploy --ssl

# Check status
sudo ./scripts/deploy-with-plg.sh status

# View logs
sudo ./scripts/deploy-with-plg.sh logs grafana
```

### Option 2: Manual Docker Compose
```bash
# Start all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f loki
docker-compose logs -f grafana
```

## 🔍 Usage Guide

### Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | `http://localhost:3001` | admin / luna-admin-2024 |
| **Prometheus** | `http://localhost:9090` | None |
| **Loki** | `http://localhost:3100` | None |

### Log Querying with LogQL

```logql
# All Luna server logs
{service="luna-server"}

# Error logs only
{service="luna-server", level="ERROR"}

# Aspose processing logs
{service="luna-server", type="aspose_processing"}

# Frontend errors
{service="luna-client", level="ERROR"}

# API request logs
{service="luna-server", type="http_request"}

# Rate queries
rate({service="luna-server"}[5m])
```

### Prometheus Metrics

```promql
# HTTP request rate
rate(http_requests_total[5m])

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Aspose processing time
aspose_processing_duration_seconds

# Memory usage
nodejs_memory_usage_bytes
```

## 🛠️ Troubleshooting

### Common Issues

1. **Loki not receiving logs**
   ```bash
   # Check Loki health
   curl http://localhost:3100/ready
   
   # Check log transport
   docker-compose logs luna-server | grep -i loki
   ```

2. **Prometheus not scraping metrics**
   ```bash
   # Check Prometheus targets
   curl http://localhost:9090/api/v1/targets
   
   # Check metrics endpoint
   curl http://localhost:3000/api/v1/metrics
   ```

3. **Grafana dashboards not loading**
   ```bash
   # Check Grafana logs
   docker-compose logs grafana
   
   # Verify datasource configuration
   curl http://localhost:3001/api/datasources
   ```

### Log Levels
- **DEBUG**: Detailed debugging information
- **INFO**: General operational messages
- **WARN**: Warning conditions
- **ERROR**: Error conditions that need attention

### Environment Variables
```env
# Logging configuration
LOG_LEVEL=info
LOKI_URL=http://loki:3100
ENABLE_LOKI_LOGGING=true
```

## 🔐 Security Considerations

1. **Grafana Security**
   - Change default password
   - Enable authentication
   - Use HTTPS in production

2. **Metrics Endpoint**
   - Restrict access to metrics endpoint
   - Use authentication for sensitive metrics

3. **Log Privacy**
   - Avoid logging sensitive data
   - Use log sanitization for PII
   - Implement log retention policies

## 📈 Monitoring Best Practices

1. **Set up alerts** for critical metrics
2. **Use log correlation** to trace issues
3. **Monitor resource usage** of monitoring stack
4. **Regular dashboard reviews** and updates
5. **Log rotation** and retention policies

## 🎯 Next Steps

1. **Implement Alerting**
   - Configure Grafana alerts
   - Set up notification channels
   - Define SLOs and SLIs

2. **Advanced Dashboards**
   - Business metrics dashboards
   - User behavior analytics
   - Performance trends

3. **Log Analysis**
   - Automated log parsing
   - Anomaly detection
   - Pattern recognition

4. **Distributed Tracing**
   - OpenTelemetry integration
   - Request tracing
   - Performance profiling

---

## 📚 Additional Resources

- [Loki Documentation](https://grafana.com/docs/loki/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/)
- [LogQL Tutorial](https://grafana.com/docs/loki/latest/logql/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)

---

**🚀 Happy Monitoring!** Your Luna Platform now has enterprise-grade observability with the PLG stack! 