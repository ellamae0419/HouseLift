const mariadb = require('mariadb');
require('dotenv').config()

const db = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 5,
    // MySQL 8's default auth plugin (caching_sha2_password) needs to fetch the
    // server's RSA public key over an unencrypted local connection; without this
    // the driver refuses the handshake with ER_CANNOT_RETRIEVE_RSA_KEY.
    allowPublicKeyRetrieval: true,
})

db.getConnection()
.then((conn) => { conn.release(); console.log("\x1b[32m%s\x1b[0m", `MariaDB is successfully connected on '${process.env.DB_DATABASE}'`); })
.catch(err => { console.log("\x1b[31m%s\x1b[0m", `[db] Could not reach the database: ${err.message}`) });

// Without this, an internal pool error (e.g. MySQL becomes unreachable) is an
// unhandled 'error' event, which crashes the whole Node process instead of
// just failing the in-flight queries.
db.on('error', (err) => {
    console.log("\x1b[31m%s\x1b[0m", `[db] Pool error: ${err.message}`);
});

module.exports = db;