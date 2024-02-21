var express = require('express');
var router = express.Router();
const { client } = require('../lib/db');
const multer = require('multer');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const upload = multer({ dest: 'uploads/' });
const bodyParser = require('body-parser');
const database = client.db('basesdaw2'); // Seleccionar la base de datos
const collection = database.collection('Animatomo'); // Seleccionar la colección

// Mostrar página raíz
router.get('/', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB

        // Obtener datos de la tabla 'Anime'
        const animeResult = await collection.findOne({ type: "table", name: "Anime" });
        const animeData = animeResult.data; // Extraer los datos de anime del documento

        // Obtener datos de la tabla 'Categoria'
        const categoriaResult = await collection.findOne({ type: "table", name: "Categoria" });
        const categorias = categoriaResult.data; // Extraer los datos de la tabla Categoria

        // Mapear los IDs de categoría a los nombres de categoría
        const categoriaMap = new Map();
        categorias.forEach(categoria => {
            categoriaMap.set(categoria.id, categoria.nombre);
        });

        // Modificar animeData para incluir el nombre de la categoría en lugar del ID
        animeData.forEach(anime => {
            anime.categoria_nombre = categoriaMap.get(anime.categoria_id) || "Categoría no encontrada";
        });

        res.render('index', { data: animeData }); // Renderizar la vista con los datos modificados
    } catch (error) {
        req.flash('error', error.message);
        res.render('index', { data: [] }); // Renderizar la vista con un array vacío si hay un error
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Mostrar la página de añadir
router.get('/add', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const categoriaResult = await collection.findOne({ type: "table", name: "Categoria" });
        const categorias = categoriaResult.data; // Extraer los datos de la tabla Categoria

        // Mapear los IDs de categoría a los nombres de categoría
        const categoriaMap = new Map();
        categorias.forEach(categoria => {
            categoriaMap.set(categoria.id, categoria.nombre);
        });
        
        res.render('add', { 
            nombre: '',
            sinopsis: '',
            categoria_id: '',
            categorias: categorias
        }); // Renderizar la vista con las categorías
    } catch (error) {
        req.flash('error', error.message);
        res.render('add', { 
            nombre: '',
            sinopsis: '',
            categoria_id: '',
            categorias: []
        }); // Renderizar la vista con un array vacío si hay un error
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Añadir nuevo anime
router.post('/add', upload.single('imagenAnime'), async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        let nombre = req.body.nombre;
        let sinopsis = req.body.sinopsis;
        let categoria_id = req.body.categoria_id;
        let imagen = req.file;
        let errors = false;

        if (nombre === '' || sinopsis === '' || categoria_id === '' || !imagen) {
            errors = true;
            req.flash('error', "Por favor, introduce nombre, sinopsis, categoría y una imagen");
            res.redirect('/Anime/add');
        }

        if (!errors) {
            // Obtener el último ID
            const lastAnime = await collection.findOne({ type: "table", name: "Anime" }, { sort: { _id: -1 } });
            let lastId = 0;
            if (lastAnime && lastAnime.data && lastAnime.data.length > 0) {
                lastId = parseInt(lastAnime.data[lastAnime.data.length - 1].id) + 1; // Incrementar el último ID en 1
            }

            let imagenBuffer = fs.readFileSync(imagen.path);
            let currentDate = new Date();

            var animeDocument = {
                id: lastId.toString(), // Convertir el ID a cadena
                nombre: nombre,
                sinopsis: sinopsis,
                categoria_id: categoria_id,
                imagen_nombre: imagen.originalname,
                fecha_creacion: currentDate,
                fecha_modificacion: currentDate,
                imagen_blob: imagenBuffer
            };

            // Actualizar la tabla Anime con el nuevo anime
            await collection.updateOne({ type: "table", name: "Anime" }, { $push: { data: animeDocument } });

            req.flash('success', '¡Anime añadido con éxito!');
            res.redirect('/Anime');
        }
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/Anime/add');
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Editar anime(s)
router.get('/edit/:id', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const id = req.params.id; // Obtener el ID del anime de la URL
        const anime = await collection.findOne({ type: "table", name: "Anime", "data.id": id }); // Buscar el anime por su ID
        if (!anime) {
            req.flash('error', 'Anime no encontrado');
            res.redirect('/Anime');
            return;
        }

        // Obtener las categorías para el selector
        const categoriaResult = await collection.findOne({ type: "table", name: "Categoria" });
        const categorias = categoriaResult.data;

        res.render('edit', { 
            title: 'Editar Anime', 
            id: id,
            nombre: anime.nombre,
            sinopsis: anime.sinopsis,
            categoria_id: anime.categoria_id, // Asegúrate de que anime.categoria_id sea correcto
            imagen_blob: anime.imagen_blob,
            imagen_nombre: anime.imagen_nombre,
            categorias: categorias // Pasar las categorías a la vista
        });
        
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/Anime');
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Actualizar datos de anime(s)
router.post('/update/:id', upload.single('imagenAnime'), async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const id = req.params.id;
        const nombre = req.body.nombre;
        const sinopsis = req.body.sinopsis;
        const categoria_id = req.body.categoria_id; // Corregido para obtener directamente el ID de la categoría
        const imagen = req.file;
        const currentDate = new Date();

        var form_data = {
            nombre: nombre,
            sinopsis: sinopsis,
            categoria_id: categoria_id,
            fecha_modificacion: currentDate
        };

        if (imagen) {
            form_data.imagen_nombre = imagen.originalname;
            form_data.imagen_blob = fs.readFileSync(imagen.path);
        }

        await collection.updateOne(
            { 
                type: "table", 
                name: "Anime", 
                "data.id": id 
            }, 
            { 
                $set: {
                    "data.$.nombre": form_data.nombre,
                    "data.$.sinopsis": form_data.sinopsis,
                    "data.$.categoria_id": form_data.categoria_id,
                    "data.$.fecha_modificacion": form_data.fecha_modificacion,
                    "data.$.imagen_nombre": form_data.imagen_nombre,
                    "data.$.imagen_blob": form_data.imagen_blob
                } 
            }
        );

        req.flash('success', '¡Anime actualizado con éxito!');
        res.redirect('/Anime');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/Anime/edit/' + req.params.id);
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Eliminar anime(s)
router.get('/delete/:id', async function(req, res, next) {
    try {
        const id = req.params.id;
        await client.connect(); // Conectar al cliente de MongoDB
        await collection.updateOne(
            { 
                type: "table", 
                name: "Anime" 
            },
            {
                $pull: { "data": { "id": id } } // Eliminar el elemento del array que coincide con el ID
            }
        );
        req.flash('success', '¡Anime eliminado con éxito! ID = ' + id);
        res.redirect('/Anime');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/Anime');
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});


// Obtener un anime por su ID
router.get('/:id', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const id = req.params.id;

        // Obtener el anime por su ID
        const animeResult = await collection.findOne({ type: "table", name: "Anime", "data.id": id });

        if (!animeResult || !animeResult.data || animeResult.data.length === 0) {
            req.flash('error', 'Anime no encontrado');
            res.redirect('/Anime');
            return;
        }

        const anime = animeResult.data.find(item => item.id === id); // Extraer el anime del documento

        if (!anime) {
            req.flash('error', 'Anime no encontrado');
            res.redirect('/Anime');
            return;
        }

        // Obtener la categoría del anime
        const categoriaResult = await collection.findOne({ type: "table", name: "Categoria", "data.id": anime.categoria_id });

        if (!categoriaResult || !categoriaResult.data || categoriaResult.data.length === 0) {
            req.flash('error', 'Categoría no encontrada');
            res.redirect('/Anime');
            return;
        }

        const categoria = categoriaResult.data.find(item => item.id === anime.categoria_id); // Encontrar la categoría correcta

        if (!categoria) {
            req.flash('error', 'Categoría no encontrada');
            res.redirect('/Anime');
            return;
        }

        const categoria_nombre = categoria.nombre;

        // Modificar el anime para incluir el nombre de la categoría en lugar del ID
        anime.categoria_nombre = categoria_nombre;

        res.render('anime', { anime: anime });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/Anime');
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Ordenar animes por criterio
router.get('/sort/:criterio', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const criterio = req.params.criterio; // Obtener el criterio de ordenación de la URL

        // Obtener datos de la tabla 'Anime'
        const animeResult = await collection.findOne({ type: "table", name: "Anime" });
        const animeData = animeResult.data; // Extraer los datos de anime del documento

        // Verificar si el criterio es válido
        if (criterio !== 'nombre' && criterio !== 'fecha_creacion' && criterio !== 'fecha_modificacion') {
            req.flash('error', 'Criterio de ordenación no válido');
            res.redirect('/Anime');
            return;
        }

        // Ordenar los datos de anime según el criterio
        animeData.sort((a, b) => {
            if (a[criterio] < b[criterio]) return -1;
            if (a[criterio] > b[criterio]) return 1;
            return 0;
        });

        // Obtener datos de la tabla 'Categoria'
        const categoriaResult = await collection.findOne({ type: "table", name: "Categoria" });
        const categorias = categoriaResult.data; // Extraer los datos de la tabla Categoria

        // Mapear los IDs de categoría a los nombres de categoría
        const categoriaMap = new Map();
        categorias.forEach(categoria => {
            categoriaMap.set(categoria.id, categoria.nombre);
        });

        // Modificar animeData para incluir el nombre de la categoría en lugar del ID
        animeData.forEach(anime => {
            anime.categoria_nombre = categoriaMap.get(anime.categoria_id) || "Categoría no encontrada";
        });

        res.render('index', { data: animeData }); // Renderizar la vista con los datos modificados
    } catch (error) {
        req.flash('error', error.message);
        res.render('index', { data: [] }); // Renderizar la vista con un array vacío si hay un error
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Listar animes por categoría
router.get('/listar/categorias', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB

        // Obtener animes y categorías por separado
        const animes = await collection.findOne({ type: "table", name: "Anime" });
        const categorias = await collection.findOne({ type: "table", name: "Categoria" });

        // Verificar si se encontraron datos
        if (!animes || !animes.data || !categorias || !categorias.data) {
            throw new Error('No se encontraron animes o categorías');
        }

        // Agrupar animes por categoría
        let animesPorCategoria = {};
        categorias.data.forEach(categoria => {
            const animesCategoria = animes.data.filter(anime => String(anime.categoria_id) === String(categoria.id));
            animesPorCategoria[categoria.nombre] = animesCategoria;
        });

        res.render('AnimePorCategoria', { data: animesPorCategoria });
    } catch (error) {
        req.flash('error', error.message);
        res.render('error');
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

// Mostrar datos en formato HTML
router.get('/html/view', async function(req, res, next) {
    try {
        await client.connect(); // Conectar al cliente de MongoDB
        const animeData = await collection.findOne({ type: "table", name: "Anime" }); // Consultar documentos en la colección Anime
        if (!animeData || !animeData.data) {
            req.flash('error', 'No se encontraron datos de anime');
            res.render('error'); // Renderizar una vista de error si no se encuentran datos
            return;
        }
        // Obtener datos de la tabla 'Categoria'
        const categoriaData = await collection.findOne({ type: "table", name: "Categoria" });
        if (!categoriaData || !categoriaData.data) {
            req.flash('error', 'No se encontraron datos de categoría');
            res.render('error'); // Renderizar una vista de error si no se encuentran datos
            return;
        }
        const categorias = categoriaData.data; // Extraer los datos de la tabla Categoria

        // Modificar los datos para incluir el nombre de la categoría en lugar del ID
        animeData.data.forEach(anime => {
            const categoria = categorias.find(c => c.id === anime.categoria_id);
            anime.categoria_nombre = categoria ? categoria.nombre : "Categoría no encontrada";
        });
        res.render('AnimeHTMLView', { data: animeData.data }); // Renderiza una vista HTML con los datos
    } catch (error) {
        req.flash('error', error.message);
        res.render('error'); //Si hay un error, se renderiza una vista de error.
    } finally {
        await client.close(); // Cerrar la conexión al cliente de MongoDB
    }
});

module.exports = router;