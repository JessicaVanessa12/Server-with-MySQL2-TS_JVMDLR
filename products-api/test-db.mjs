import "dotenv/config";
import mysql from "mysql2/promise";

console.log("Host:", process.env.DB_HOST);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("Database:", process.env.DB_NAME);
console.log("Password loaded:", Boolean(process.env.DB_PASSWORD));

try {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [rows] = await connection.query("SELECT COUNT(*) AS total FROM products");
  console.log("CONNECTION OK:", rows);
  await connection.end();
} catch (error) {
  console.log("ERROR CODE:", error.code);
  console.log("ERROR MESSAGE:", error.message);
}
