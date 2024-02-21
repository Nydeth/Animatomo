var createError = require('http-errors');
var express = require('express');
const multer = require('multer');
const fs = require('fs');
var path = require('path');
var flash = require('express-flash');
var session = require('express-session');
var mysql = require('mysql');
var conexion = require('./lib/db');
var router = require('./routes/Animes');
var app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/images/single', upload.single('imagenAnime'), (req, res) => {
  console.log(req.file);
  saveImage(req.file);
  res.send('Termina');
});

app.post('/images/multi', upload.array('photos', 10), (req, res) => {
  req.files.map(saveImage);
  res.send('Termina multi');
});

const { client } = require('./lib/db');

async function saveImage(file) {
  if (!file) return null;

  try {
    // Conecta a la base de datos
    await client.connect();
    console.log('Conexión a MongoDB Atlas exitosa');

    // Obtiene la base de datos y la colección
    const database = client.db("basesdaw2"); // Seleccionar la base de datos
    const collection = database.collection("Anime"); // Seleccionar la colección

    // Obtener datos de la tabla 'Anime'
    const animeResult = await collection.findOne({
      type: "table",
      name: "Anime",
    });
    const animeData = animeResult.data; // Extraer los datos de anime del documento

    // Lee los datos binarios del archivo
    const imageData = fs.readFileSync(file.buffer);

    // Actualiza el documento en la colección con los datos de la imagen
    const updateResult = await collection.updateOne(
      { _id: ObjectId(req.params.id) }, // Ajusta esta consulta según tu estructura de datos
      { $set: { imagen_blob: imageData } }
    );

    console.log('Imagen actualizada en MongoDB Atlas:', updateResult);
  } catch (error) {
    console.error('Error al actualizar la imagen en MongoDB Atlas:', error);
  } finally {
    // Cierra la conexión a la base de datos
    await client.close();
  }

  return file.originalname;
}

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
}));

// Configura flash para mostrar mensajes entre solicitudes
app.use(flash());

// Usa el enrutador para manejar las rutas relacionadas con los animes
app.use('/Anime', router);

// Definir la ruta raíz que redirige al listado de animes
app.get('/', function (req, res, next) {
  res.redirect('/Anime');
});

// Manejo de errores
app.use(function (req, res, next) {
  next(createError(404)); // Solicitudes a rutas no encontradas
});

// Configura el puerto en el que escucha el servidor
app.listen(3000);
