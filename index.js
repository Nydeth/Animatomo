var createError = require('http-errors');
var express = require('express');
const multer = require('multer');
const fs = require('node:fs');
var path = require('path');
var flash = require('express-flash');
var session = require('express-session');
var router = require('./routes/Animes');
var app = express();
const bodyParser = require('body-parser');
const { client, connectToDatabase } = require('./lib/db'); // Importa el cliente de MongoDB

// Conexión a MongoDB Atlas
connectToDatabase();

// Multer storage para guardar archivos en MongoDB Atlas
const upload = multer({
  storage: multer.memoryStorage(), // Guarda los archivos en la memoria temporalmente
});

// Ruta para subir una sola imagen
app.post('/images/single', upload.single('imagenAnime'), async (req, res) => {
  try {
    const collection = client.db().collection('Anime'); // Obtén la colección de Anime
    const result = await collection.insertOne({
      nombre: req.file.originalname,
      imagen_blob: req.file.buffer, // Guarda el buffer del archivo en la base de datos
    });
    console.log('Imagen guardada en MongoDB Atlas:', result.insertedId);
    res.send('Imagen subida exitosamente');
  } catch (error) {
    console.error('Error al subir la imagen:', error);
    res.status(500).send('Error al subir la imagen');
  }
});

// Configuración de la vista
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Configura la sesión
app.use(session({ 
    cookie: { maxAge: 60000 },
    store: new session.MemoryStore,
    saveUninitialized: true,
    resave: 'true',
    secret: 'secret'
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configura flash para mostrar mensajes entre solicitudes
app.use(flash());

// Usa el enrutador para manejar las rutas relacionadas con los animes
app.use('/Anime', router);

// Definir la ruta raíz que redirige al listado de animes
app.get('/', function(req, res, next) {
  res.redirect('/Anime');
});

// Manejo de errores
app.use(function(req, res, next) {
  next(createError(404)); // Solicitudes a rutas no encontradas
});

// Configura el puerto en el que escucha el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en funcionamiento en el puerto ${PORT}`);
});