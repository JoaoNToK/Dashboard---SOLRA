const http = require('http');

class ESP32Simulator {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.isRunning = false;
    this.interval = null;
  }

  // Simular leitura de temperatura (entre 15°C e 35°C)
  simularTemperatura() {
    return (15 + Math.random() * 20).toFixed(2);
  }

  // Simular leitura de umidade (entre 30% e 80%)
  simularUmidade() {
    return (30 + Math.random() * 50).toFixed(2);
  }

  async enviarDados() {
    const dados = {
      temperatura: parseFloat(this.simularTemperatura()),
      umidade: parseFloat(this.simularUmidade()),
      dispositivo: "ESP32-Simulador",
      localizacao: "Area-de-Teste"
    };

    try {
      const data = JSON.stringify(dados);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/sensores',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 201) {
            console.log(`✅ Dados enviados: ${dados.temperatura}°C, ${dados.umidade}%`);
          } else {
            console.log(`❌ Erro ${res.statusCode}: ${responseData}`);
          }
        });
      });

      req.on('error', (err) => {
        console.log(`💥 Erro de conexão: ${err.message}`);
      });

      req.write(data);
      req.end();

    } catch (error) {
      console.log(`❌ Erro ao enviar dados: ${error.message}`);
    }
  }

  iniciar(intervalo = 10000) { // 10 segundos
    if (this.isRunning) {
      console.log('⏹️ Simulador já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Iniciando simulador do ESP32...');
    console.log(`📡 Enviando dados para: ${this.serverUrl}`);
    console.log(`⏰ Intervalo: ${intervalo/1000} segundos`);
    console.log('─────────────────────────────────────');

    // Enviar primeiro dado imediatamente
    this.enviarDados();

    // Configurar intervalo para envio periódico
    this.interval = setInterval(() => {
      this.enviarDados();
    }, intervalo);
  }

  parar() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Simulador do ESP32 parado');
  }
}

// Uso do simulador
const simulador = new ESP32Simulator('http://localhost:3000');

// Iniciar simulador (envia dados a cada 10 segundos)
simulador.iniciar(10000);

// Parar o simulador após 10 minutos (para testes longos)
setTimeout(() => {
  simulador.parar();
  console.log('⏰ Simulador parado automaticamente após 10 minutos');
  process.exit(0);
}, 10 * 60 * 1000);

// Manipulação para parar com Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Parando simulador...');
  simulador.parar();
  process.exit(0);
});

console.log('💡 Pressione Ctrl+C para parar o simulador');
