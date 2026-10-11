import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.static(__dirname));

// Endpoint para guardar la imagen del menú si el usuario la selecciona
app.post('/api/save-menu-image', (req, res) => {
  try {
    const { base64Data } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No data provided' });
    }
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Guardar en la raíz y en la carpeta images/
    const targetRoot = path.join(__dirname, 'Main_Menu.jfif');
    const targetImages = path.join(__dirname, 'images', 'Main_Menu.jfif');
    
    fs.writeFileSync(targetRoot, buffer);
    fs.writeFileSync(targetImages, buffer);
    
    console.log('Main_Menu.jfif guardado correctamente en el servidor');
    return res.json({ success: true, path: '/Main_Menu.jfif' });
  } catch (err) {
    console.error('Error guardando Main_Menu.jfif:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

