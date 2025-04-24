const bcrypt = require("bcryptjs");
const password = "adminpass";
const hashedPassword = bcrypt.hashSync(password, 10);
console.log(hashedPassword); // Outputs something like $2a$10$...
