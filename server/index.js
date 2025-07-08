/**
 * Luna Server - Entry Point
 * 
 * Minimal entry point that just starts the server
 */

const app = require('./server');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🌙 Luna Server started with Clean Architecture!');
  console.log(`📍 Port: ${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log(`   📖 Documentation: http://localhost:${PORT}/api/v1/docs`);
  console.log(`   📄 Swagger JSON: http://localhost:${PORT}/api/v1/swagger.json`);
  console.log(`   🏥 Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`   📊 Presentations: http://localhost:${PORT}/api/v1/presentations`);
  console.log(`   🤖 AI Generate: http://localhost:${PORT}/api/v1/ai/generate-presentation`);
  console.log(`   ✅ Validate Schema: http://localhost:${PORT}/api/v1/validate-schema`);
  console.log(`   🔧 Validate & Fix: http://localhost:${PORT}/api/v1/validate-and-fix`);
  console.log(`   📋 Schema Info: http://localhost:${PORT}/api/v1/schema-info`);
  console.log(`   🏠 Root: http://localhost:${PORT}/`);
  console.log('✅ Server ready!');
  console.log('🏗️ Architecture: Clean/Screaming Architecture');
  console.log('📖 Interactive API Documentation (SwaggerUI) - ENABLED');
}); 