#!/bin/bash
# ══════════════════════════════════════════════════════════
#  MARACUMANGO – Script de inicio completo con ngrok
#  Uso: bash start.sh
# ══════════════════════════════════════════════════════════

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}🥤 ════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   MARACUMANGO – Iniciando sistema MVP${NC}"
echo -e "${YELLOW}🥤 ════════════════════════════════════════════${NC}"
echo ""

# ── Verificar Node.js ──────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}❌ Node.js no está instalado. Instálalo desde https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Node.js$(node -v)${NC}"

# ── Verificar PostgreSQL ────────────────────────────────────
if ! command -v psql &>/dev/null; then
  echo -e "${RED}❌ PostgreSQL no está instalado o no está en PATH${NC}"
  exit 1
fi
echo -e "${GREEN}✅ PostgreSQL disponible${NC}"

# ── Configurar .env del backend ────────────────────────────
if [ ! -f backend/.env ]; then
  echo ""
  echo -e "${YELLOW}⚙️  Configurando base de datos...${NC}"
  read -p "   Host PostgreSQL [localhost]: " DB_HOST
  DB_HOST=${DB_HOST:-localhost}
  read -p "   Puerto PostgreSQL [5432]: " DB_PORT
  DB_PORT=${DB_PORT:-5432}
  read -p "   Nombre de la BD [maracumango]: " DB_NAME
  DB_NAME=${DB_NAME:-maracumango}
  read -p "   Usuario PostgreSQL [postgres]: " DB_USER
  DB_USER=${DB_USER:-postgres}
  read -s -p "   Contraseña PostgreSQL: " DB_PASSWORD
  echo ""

  cat > backend/.env <<EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
PORT=3001
NODE_ENV=development
JWT_SECRET=maracumango_jwt_secret_2025
FRONTEND_URL=http://localhost:3000
EOF
  echo -e "${GREEN}✅ Archivo .env creado${NC}"
fi

# Crear la BD si no existe
source backend/.env
echo ""
echo -e "${CYAN}🗄️  Verificando base de datos '$DB_NAME'...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}   Creando base de datos '$DB_NAME'...${NC}"
  PGPASSWORD=$DB_PASSWORD createdb -h $DB_HOST -U $DB_USER $DB_NAME 2>/dev/null && \
    echo -e "${GREEN}   ✅ BD creada${NC}" || \
    echo -e "${RED}   ❌ Error creando BD. Créala manualmente: createdb $DB_NAME${NC}"
else
  echo -e "${GREEN}   ✅ BD '$DB_NAME' existe${NC}"
fi

# ── Instalar dependencias backend ─────────────────────────
echo ""
echo -e "${CYAN}📦 Instalando dependencias del backend...${NC}"
cd backend && npm install --silent && cd ..
echo -e "${GREEN}✅ Backend listo${NC}"

# ── Migrar y seed ─────────────────────────────────────────
echo ""
echo -e "${CYAN}🚀 Ejecutando migraciones...${NC}"
cd backend && node src/db/migrate.js 2>/dev/null; cd ..

echo -e "${CYAN}🌱 Insertando datos iniciales...${NC}"
cd backend && node src/db/seed.js 2>/dev/null; cd ..

# ── Instalar dependencias frontend ────────────────────────
echo ""
echo -e "${CYAN}📦 Instalando dependencias del frontend...${NC}"
cd frontend && npm install --silent && cd ..
echo -e "${GREEN}✅ Frontend listo${NC}"

# ── Verificar/instalar ngrok ──────────────────────────────
echo ""
if ! command -v ngrok &>/dev/null; then
  echo -e "${YELLOW}⬇️  ngrok no encontrado. Descargándolo...${NC}"
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -s https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz | tar xz
    sudo mv ngrok /usr/local/bin/
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    brew install ngrok 2>/dev/null || curl -s https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip -o ngrok.zip && unzip -q ngrok.zip && sudo mv ngrok /usr/local/bin/
  else
    echo -e "${RED}Instala ngrok manualmente desde https://ngrok.com/download${NC}"
  fi
fi

if command -v ngrok &>/dev/null; then
  echo -e "${GREEN}✅ ngrok disponible${NC}"
  # Verificar token de ngrok
  if [ ! -f ~/.config/ngrok/ngrok.yml ] && [ -z "$NGROK_AUTHTOKEN" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  ngrok necesita un token de autenticación.${NC}"
    echo -e "   Regístrate gratis en ${CYAN}https://ngrok.com${NC}"
    echo -e "   Luego pega tu token aquí:"
    read -p "   Token de ngrok: " NGROK_TOKEN
    if [ -n "$NGROK_TOKEN" ]; then
      ngrok config add-authtoken "$NGROK_TOKEN"
    fi
  fi
fi

# ── Iniciar servicios ─────────────────────────────────────
echo ""
echo -e "${YELLOW}🚀 Iniciando servicios...${NC}"
echo ""

# Backend en background
cd backend && npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

# Frontend en background
mkdir -p logs
cd frontend && BROWSER=none npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 5

# ngrok tunnel para el backend
if command -v ngrok &>/dev/null; then
  ngrok http 3001 > logs/ngrok.log 2>&1 &
  NGROK_PID=$!
  sleep 3

  # Obtener URL pública de ngrok
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'])" 2>/dev/null)

  if [ -n "$NGROK_URL" ]; then
    # Actualizar .env del frontend con la URL de ngrok
    echo "REACT_APP_API_URL=$NGROK_URL" > frontend/.env
    echo -e "${GREEN}✅ Túnel ngrok activo${NC}"
  fi
fi

# ── Mostrar URLs ──────────────────────────────────────────
echo ""
echo -e "${YELLOW}🥤 ════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   MARACUMANGO MVP – ACTIVO${NC}"
echo -e "${YELLOW}🥤 ════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📱 Frontend (local):${NC}     http://localhost:3000"
echo -e "${GREEN}⚙️  Backend API (local):${NC}  http://localhost:3001"
echo -e "${GREEN}🔍 Health check:${NC}          http://localhost:3001/api/health"
echo ""
if [ -n "$NGROK_URL" ]; then
echo -e "${CYAN}🌐 URL PÚBLICA (ngrok):${NC}"
echo -e "   ${CYAN}API:     $NGROK_URL${NC}"
echo -e "   ${CYAN}Panel:   http://localhost:4040${NC}"
echo ""
echo -e "${YELLOW}   ⚠️  Comparte esta URL para acceder desde otras redes:${NC}"
echo -e "   ${CYAN}$NGROK_URL${NC}"
fi
echo ""
echo -e "${GREEN}🔐 Credenciales de prueba:${NC}"
echo -e "   Admin:   admin@maracumango.com / maracumango2025"
echo -e "   Mesera:  mesera1@maracumango.com / maracumango2025"
echo ""
echo -e "${GREEN}📂 Rutas disponibles:${NC}"
echo -e "   /           → Menú principal"
echo -e "   /chatbot    → Chatbot de pedidos (clientes)"
echo -e "   /pos        → POS presencial (mesera)"
echo -e "   /cocina     → Pantalla cocina (cocinero)"
echo -e "   /dashboard  → Dashboard admin (dueña)"
echo ""
echo -e "${RED}   Para detener todo: Ctrl+C${NC}"
echo ""

# Cleanup al salir
trap "echo ''; echo 'Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID $NGROK_PID 2>/dev/null; exit" SIGINT SIGTERM

# Mantener script activo
wait
