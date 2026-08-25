// const bcrypt = require('bcryptjs');
import bcrypt from "bcryptjs"
const hashedPassword = await bcrypt.hash('viewebit.academy@admin.com', 10);

console.log(hashedPassword);
