const mysql = require("mysql")
var colors = require("colors")
require("dotenv").config()

const dbConnection = mysql.createConnection({
  host : process.env.DB_HOST,
  user : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME
})

dbConnection.connect(function(err){
  if(!err){
    console.log("Connected to the MySQL server".underline.cyan)
  } else {
    console.error("Error connecting: " + err.stack)
  }
})

module.exports = {dbConnection}