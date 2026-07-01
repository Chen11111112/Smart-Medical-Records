import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function getDbPool() {
  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool({
      host: getRequiredEnv("DB_HOST"),
      port: Number(process.env.DB_PORT || 3306),
      user: getRequiredEnv("DB_USER"),
      password: getRequiredEnv("DB_PASSWORD"),
      database: getRequiredEnv("DB_NAME"),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }

  return global.__mysqlPool;
}
