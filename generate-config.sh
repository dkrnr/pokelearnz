#!/bin/bash
cat > config.js << EOF
const CONFIG = {
  VALSEA_KEY: "${VALSEA_KEY}",
  OPENAI_KEY: "${OPENAI_KEY}"
}
EOF