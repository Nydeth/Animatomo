const { MongoClient } = require('mongodb');

// Cadena de conexión proporcionada por MongoDB Atlas
const uri = 'mongodb+srv://admin:password7@animatomo.xtjevrj.mongodb.net/?retryWrites=true&w=majority';

// Crea un nuevo cliente de MongoDB
const client = new MongoClient(uri);

// Función para conectar al cliente de MongoDB
async function connectToDatabase() {
    try {
        // Conecta al cliente de MongoDB
        await client.connect();
        console.log('Conexión a MongoDB Atlas exitosa');
    } catch (error) {
        console.error('Error al conectar a MongoDB Atlas:', error);
    }
}

// Exporta el cliente y la función de conexión para que puedan ser utilizados en otros archivos de tu aplicación
module.exports = { client, connectToDatabase };