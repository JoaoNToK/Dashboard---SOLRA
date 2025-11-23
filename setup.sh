#!/bin/bash
echo "🚀 Configurando Sistema de Doações de Alimentos..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor, instale Node.js primeiro."
    exit 1
fi

# Verificar se Docker está instalado (opcional)
if command -v docker &> /dev/null; then
    echo "🐳 Iniciando PostgreSQL via Docker..."
    docker run --name postgres-doacao -e POSTGRES_PASSWORD=password -e POSTGRES_DB=doacao_alimentos -p 5432:5432 -d postgres:13
    sleep 10 # Aguardar o PostgreSQL inicializar
else
    echo "ℹ️  Docker não encontrado. Certifique-se de ter o PostgreSQL instalado e rodando na porta 5432."
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Inicializar banco de dados
echo "🗄️ Inicializando banco de dados..."
npm run init-db

echo "✅ Configuração concluída!"
echo "🎯 Para iniciar o sistema: npm start"
echo "🌐 Acesse: http://localhost:3000"