const { spawn } = require('child_process');
const { networkInterfaces } = require('os');

console.log('🚀 Iniciando Sistema Completo de Doações...\n');

// Mostrar IPs disponíveis
const nets = networkInterfaces();
console.log('🌐 IPs disponíveis:');
Object.keys(nets).forEach(interfaceName => {
  nets[interfaceName].forEach(net => {
    if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
      console.log(`   ${interfaceName}: http://${net.address}:3000`);
    }
  });
});

console.log('\n📋 Iniciando servidor...\n');

// Iniciar servidor
const server = spawn('node', ['server/server.js'], { stdio: 'inherit' });

// Aguardar servidor iniciar
setTimeout(() => {
  console.log('\n🎯 Servidor iniciado! Iniciando simulador ESP32...\n');
  
  // Iniciar simulador - CORRIGIDO: caminho correto
  const simulator = spawn('node', ['iot/esp32-simulator.js'], { stdio: 'inherit' });
  
  // Manipulação de Ctrl+C para parar ambos
  process.on('SIGINT', () => {
    console.log('\n🛑 Parando sistema...');
    simulator.kill();
    server.kill();
    process.exit(0);
  });
  
}, 3000);

console.log('💡 Pressione Ctrl+C para parar o sistema');
