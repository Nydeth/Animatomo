var createError = require('http-errors');
var express = require('express');
const multer = require('multer');
const fs = require('node:fs');
var path = require('path');
var flash = require('express-flash');
var session = require('express-session');
var mysql = require('mysql');
var conexion  = require('./lib/db');
var router = require('./routes/Animes');
var app = express();
const upload = multer({ dest: 'uploads/'});
const bodyParser = require('body-parser');

app.post('/images/single', upload.single('imagenAnime'), (req, res) => {
  console.log(req.file);
  saveImage(req.file);
res.send('Termina');
});

app.post('/images/multi', upload.array('photos', 10), (req, res) => {
  req.files.map(saveImage);
  res.send('Termina multi');
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
app.listen(3000);