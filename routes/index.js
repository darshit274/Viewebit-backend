const express = require("express");
const router = express.Router();

const UserRoutes = require("./AuthRoutes/authRoutes");

router.use("/users", UserRoutes);


module.exports = router;
