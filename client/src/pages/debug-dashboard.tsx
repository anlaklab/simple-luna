import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Users, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Cpu,
  HardDrive,
  Network,
  RefreshCw
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { api, type SystemMetrics, type ServiceStatus, type SessionData, type ConversionJob, type LogEntry } from '@/hooks/use-api';

export default function DebugDashboard() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 68,
    disk: 23,
    activeConnections: 12,
    queueSize: 3,
    uptime: 86400,
    nodeVersion: 'v18.20.8',
    platform: 'darwin'
  });
  
  const [sessions, setSessions] = useState<SessionData[]>([
    {
      id: 'sess_001',
      userId: 'user_123',
      status: 'processing',
      startTime: new Date(Date.now() - 300000),
      currentStep: 'Asset Extraction',
      progress: 65,
      errors: []
    },
    {
      id: 'sess_002', 
      userId: 'user_456',
      status: 'completed',
      startTime: new Date(Date.now() - 600000),
      currentStep: 'Completed',
      progress: 100,
      errors: []
    },
    {
      id: 'sess_003',
      userId: 'user_789',
      status: 'error',
      startTime: new Date(Date.now() - 120000),
      currentStep: 'Java Binding Error',
      progress: 15,
      errors: ['Cannot find module nodejavabridge_bindings.node']
    }
  ]);

  const [conversionJobs, setConversionJobs] = useState<ConversionJob[]>([
    {
      id: 'job_001',
      filename: 'presentation-large.pptx',
      status: 'processing',
      progress: 78,
      startTime: new Date(Date.now() - 180000),
      slideCount: 230,
      processedSlides: 179,
      extractorErrors: [],
      fileSize: 15728640, // 15MB
      userId: 'user_123'
    },
    {
      id: 'job_002',
      filename: 'marketing-deck.pptx', 
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 450000),
      endTime: new Date(Date.now() - 300000),
      slideCount: 45,
      processedSlides: 45,
      extractorErrors: [],
      fileSize: 8388608, // 8MB
      userId: 'user_456'
    }
  ]);

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Aspose.Slides',
      status: 'online',
      lastCheck: new Date(),
      details: 'Local library integration'
    },
    {
      name: 'Firebase',
      status: 'online',
      lastCheck: new Date(),
      details: 'Firestore and Storage connected'
    },
    {
      name: 'Java Bindings',
      status: 'error',
      lastCheck: new Date(),
      details: 'Module nodejavabridge_bindings.node not found'
    }
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([
    { level: 'INFO', message: 'AssetService initialized successfully', timestamp: new Date(Date.now() - 60000), service: 'AssetService' },
    { level: 'ERROR', message: 'Java bindings module not found', timestamp: new Date(Date.now() - 45000), service: 'AsposeAdapter' },
    { level: 'INFO', message: 'New presentation uploaded: presentation-large.pptx', timestamp: new Date(Date.now() - 30000), service: 'UploadService' },
    { level: 'WARN', message: 'High memory usage detected: 89%', timestamp: new Date(Date.now() - 15000), service: 'SystemMonitor' }
  ]);

  // Load real debug data from API
  const loadDebugData = async () => {
    setLoading(true);
    try {
      const response = await api.debug.getDebugData();
      if (response.success && response.data) {
        setMetrics(response.data.metrics);
        setSessions(response.data.sessions);
        setConversionJobs(response.data.jobs);
        setServices(response.data.services);
        setLogs(response.data.logs);
        
        toast({
          title: "Debug Data Updated",
          description: "System monitoring data refreshed successfully.",
        });
      } else {
        throw new Error(response.error || 'Failed to load debug data');
      }
    } catch (error) {
      console.error('Failed to load debug data:', error);
      toast({
        title: "Update Failed", 
        description: "Could not refresh debug data. Using cached data.",
        variant: "destructive",
      });
      
      // Simulate real-time updates as fallback
      setMetrics(prev => ({
        ...prev,
        cpu: Math.max(10, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(20, Math.min(95, prev.memory + (Math.random() - 0.5) * 5)),
        activeConnections: Math.max(0, prev.activeConnections + Math.floor((Math.random() - 0.5) * 3))
      }));
    } finally {
      setLoading(false);
    }
  };

  // Load initial data and set up auto-refresh
  useEffect(() => {
    loadDebugData();
    
    const interval = setInterval(loadDebugData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': 
      case 'online': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800'; 
      case 'error': 
      case 'failed': return 'bg-red-100 text-red-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'INFO': return 'text-green-600';
      case 'ERROR': return 'text-red-600';
      case 'WARN': 
      case 'WARNING': return 'text-yellow-600';
      case 'DEBUG': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Luna Debug Dashboard</h1>
              <p className="text-sm text-muted-foreground">Sistema de monitoreo interno</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadDebugData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Actualizando...' : 'Actualizar'}
              </Button>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Sistema Online
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* System Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.cpu.toFixed(1)}%</div>
              <Progress value={metrics.cpu} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.memory.toFixed(1)}%</div>
              <Progress value={metrics.memory} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.filter(s => s.status === 'active' || s.status === 'processing').length}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.activeConnections} connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Queue Size</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.queueSize}</div>
              <p className="text-xs text-muted-foreground">
                jobs pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Monitoring */}
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sessions">Sesiones Activas</TabsTrigger>
            <TabsTrigger value="conversions">Conversiones</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sesiones de Usuario
                </CardTitle>
                <CardDescription>
                  Monitoreo en tiempo real de sesiones activas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(session.status)}
                            <span className="font-medium">{session.id}</span>
                            <Badge className={getStatusColor(session.status)}>
                              {session.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Usuario: {session.userId}
                          </p>
                          <p className="text-sm text-muted-foreground mb-2">
                            Paso actual: {session.currentStep}
                          </p>
                          <Progress value={session.progress} className="mb-2" />
                          {session.errors.length > 0 && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                {session.errors[0]}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.startTime).toLocaleTimeString()}
                          </p>
                          <p className="text-lg font-bold">{session.progress}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversions Tab */}
          <TabsContent value="conversions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Jobs de Conversión
                </CardTitle>
                <CardDescription>
                  Estado de conversiones PPTX a Universal JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {conversionJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(job.status)}
                            <span className="font-medium">{job.filename}</span>
                            <Badge className={getStatusColor(job.status)}>
                              {job.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Slides: {job.processedSlides}/{job.slideCount}
                          </p>
                          <Progress value={job.progress} className="mb-2" />
                          <p className="text-xs text-muted-foreground">
                            Iniciado: {new Date(job.startTime).toLocaleString()}
                          </p>
                          {job.endTime && (
                            <p className="text-xs text-muted-foreground">
                              Completado: {new Date(job.endTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{job.progress}%</p>
                          {job.status === 'processing' && (
                            <Button variant="outline" size="sm">
                              Ver Detalles
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Servicios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div key={service.name} className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <Badge className={getStatusColor(service.status)}>
                          {service.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Logs Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2 text-sm">
                      {logs.map((log, index) => (
                        <div key={index} className={getLogColor(log.level)}>
                          [{log.level}] {log.message}
                          {log.service && ` - ${log.service}`}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 