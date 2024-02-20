var mysql = require('mysql');
var connection = mysql.createConnection({
	host: 'db4free.net',
	user: 'jorgehs',
	password: 'password7',
	database: 'basesdaw2'
});

connection.connect(function(error) {
	if (!!error) {
		console.log(error);
	} else {
		console.log('Database Connected Successfully..!!');
	}
});

module.exports = connection;