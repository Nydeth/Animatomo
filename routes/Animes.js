var express = require('express');
var router = express.Router();
var dbConn  = require('../lib/db');
const multer = require('multer');
const fs = require('node:fs');
const upload = multer({ dest: 'uploads/'});
const bodyParser = require('body-parser');
 
// Mostrar página raíz
router.get('/', function(req, res, next) {      
    dbConn.query('SELECT a.*, c.nombre AS categoria_nombre FROM Anime a JOIN Categoria c ON a.categoria_id = c.id ORDER BY a.id ASC', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('index', { data: '' });   
        } else {
            res.render('index', { data: rows });
        }
    });
});


// Mostrar la página de añadir
router.get('/add', function(req, res, next) {
    dbConn.query('SELECT * FROM Categoria', function(err, categorias) {
        if(err) {
            req.flash('error', err);
            res.render('add', {
                nombre: '',
                sinopsis: '',
                categoria_id: '',
                categorias: []
            });
        } else {
            res.render('add', {
                nombre: '',
                sinopsis: '',
                categoria_id: '',
                categorias: categorias
            });
        }
    });
});


// Añadir nuevo(s) anime(s)
router.post('/add', upload.single('imagenAnime'), function(req, res, next) {    
    let nombre = req.body.nombre;
    let sinopsis = req.body.sinopsis;
    let categoria_id = req.body.categoria_id;
    let imagen = req.file;
    let errors = false;

    if (nombre === '' || sinopsis === '' || categoria_id === '' || !imagen) {
        errors = true;

        req.flash('error', "Por favor, introduce nombre, sinopsis, categoría y una imagen");
        res.render('add', {
            nombre: nombre,
            sinopsis: sinopsis,
            categoria_id: categoria_id
        });
    }

    if (!errors) {
        let imagenBuffer = fs.readFileSync(imagen.path);

        var form_data = {
            nombre: nombre,
            sinopsis: sinopsis,
            categoria_id: categoria_id,
            imagen_nombre: imagen.originalname,
            fecha_creacion: new Date(),
            fecha_modificacion: new Date(),
            imagen_blob: imagenBuffer
        };
        
        dbConn.query('INSERT INTO Anime SET ?', form_data, function(err, result) {
            if (err) {
                req.flash('error', err);
                res.render('add', {
                    nombre: form_data.nombre,
                    sinopsis: form_data.sinopsis,
                    categoria_id: form_data.categoria_id,
                    imagen_blob: form_data.imagen_blob,
                    imagen_nombre: form_data.imagen_nombre,
                    fecha_creacion: form_data.fecha_creacion,
                    fecha_modificacion: form_data.fecha_modificacion

                });
            } else {                
                req.flash('success', '¡Anime añadido con éxito!');
                res.redirect('/Anime');
            }
        });
    }
});

// Editar anime(s)
router.get('/edit/:id', function(req, res, next) {
    let id = req.params.id;
   
    dbConn.query('SELECT * FROM Anime WHERE id = ?', id, function(err, rows, fields) {
        if(err || rows.length === 0) {
            req.flash('error', 'Anime no encontrado');
            res.redirect('/Anime');
        } else {
            var anime = rows[0]; // Obtener el primer anime de los resultados

            // Obtener todas las categorías disponibles
            dbConn.query('SELECT * FROM Categoria', function(err, categorias) {
                if(err) {
                    req.flash('error', err);
                    res.render('edit', {
                        title: 'Editar Anime', 
                        id: id,
                        nombre: anime.nombre,
                        sinopsis: anime.sinopsis,
                        categoria_id: anime.categoria_id,
                        imagen_blob: anime.imagen_blob,
                        imagen_nombre: anime.imagen_nombre,
                        categorias: []
                    });
                } else {
                    res.render('edit', {
                        title: 'Editar Anime', 
                        id: id,
                        nombre: anime.nombre,
                        sinopsis: anime.sinopsis,
                        categoria_id: anime.categoria_id,
                        imagen_blob: anime.imagen_blob,
                        imagen_nombre: anime.imagen_nombre,
                        categorias: categorias
                    });
                }
            });
        }
    });
});

// Actualizar datos de anime(s)
router.post('/update/:id', upload.single('imagenAnime'), function(req, res, next) {
    let id = req.params.id;
    let nombre = req.body.nombre;
    let sinopsis = req.body.sinopsis;
    let categoria_id = req.body.categoria_id;
    let imagen = req.file;

    // Construir el objeto con los datos actualizados
    var form_data = {
        nombre: nombre,
        sinopsis: sinopsis,
        categoria_id: categoria_id,
    };

    // Si se cargó una nueva imagen, actualizar los campos correspondientes
    if (imagen) {
        form_data.imagen_nombre = imagen.originalname;
        form_data.imagen_blob = fs.readFileSync(imagen.path);
    }

    // Realizar la actualización en la base de datos
    dbConn.query('UPDATE Anime SET ? WHERE id = ?', [form_data, id], function(err, result) {
        if (err) {
            req.flash('error', err);
            res.redirect('/Anime/edit/' + id); // Redirigir de vuelta al formulario de edición en caso de error
        } else {
            req.flash('success', '¡Anime actualizado con éxito!');
            res.redirect('/Anime');
        }
    });
});




// Eliminar anime(s)
router.get('/delete/:id', function(req, res, next) {
    let id = req.params.id;
     
    dbConn.query('DELETE FROM Anime WHERE id = ?', id, function(err, result) {
        if (err) {
            return res.redirect('/Anime');
        } else {
            req.flash('success', '¡Anime eliminado con éxito! ID = ' + id);
            return res.redirect('/Anime');
        }
    });
});

// Obtener un anime por su ID
router.get('/:id', function(req, res, next) {
    let id = req.params.id;

    dbConn.query('SELECT a.*, c.nombre AS categoria_nombre FROM Anime a JOIN Categoria c ON a.categoria_id = c.id WHERE a.id = ?', id, function(err, rows, fields) {
        if(err || rows.length === 0) {
            req.flash('error', 'Anime no encontrado');
            res.redirect('/Anime');
        } else {
            var anime = rows[0]; // Obtener el primer anime de los resultados
            res.render('anime', { anime: anime }); // Renderizar la vista del anime individual
        }
    });
});


// Ordenar datos por algún criterio
router.get('/sort/:criterio', function(req, res, next) {
    let criterio = req.params.criterio;
    let orderBy = '';

    switch(criterio) {
        case 'fecha_creacion':
            orderBy = 'fecha_creacion';
            break;
        case 'nombre':
            orderBy = 'nombre';
            break;
        case 'fecha_modificacion':
            orderBy = 'fecha_modificacion';
            break;
        default:
            orderBy = 'id'; // Ordenar por defecto por ID si el criterio no se especifica correctamente
            break;
    }

    dbConn.query('SELECT * FROM Anime ORDER BY ' + orderBy, function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('index', { data: '' });
        } else {
            res.render('index', { data: rows });
        }
    });
});

// Listar animes por categoría
router.get('/listarPorCategoria', function(req, res, next) {
    dbConn.query('SELECT c.nombre AS categoria_nombre, a.* FROM Anime a JOIN Categoria c ON a.categoria_id = c.id ORDER BY a.categoria_id', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('error'); //Si hay un error, se renderiza una vista de error.
        } else {
            // Agrupar animes por categoría
            let animesPorCategoria = rows.reduce((acc, row) => {
                if (!acc[row.categoria_id]) {
                    acc[row.categoria_id] = { categoria_nombre: row.categoria_nombre, animes: [] };
                }
                acc[row.categoria_id].animes.push(row);
                return acc;
            }, {});
            // Convertir objeto en array
            let animesPorCategoriaArray = Object.values(animesPorCategoria);
            res.render('AnimePorCategoria', { data: animesPorCategoriaArray });
        }
    });
});

// Mostrar datos en formato HTML
router.get('/htmlView', function(req, res, next) {
    dbConn.query('SELECT * FROM Anime', function(err, rows) {
        if(err) {
            req.flash('error', err);
            res.render('error'); //Si hay un error, se renderiza una vista de error.
        } else {
            res.render('AnimeHTMLView', { data: rows }); // Renderiza una vista HTML con los datos
        }
    });
});

module.exports = router;
