const jwt = require('jsonwebtoken')


exports.authToken = async (req, res, next) => {
  const { token } = req.cookies;

  try {
    if
      (!token) {
      res.status(401);
      res.json({ 'success': 'false', 'message': 'Token not Found!' });

    }
    let validated_token;
    if (!token) {
      throw new Error("Token not found!");
    }
    validated_token = jwt.verify(token, process.env.SECRET_KEY);
    //		Manual Code for req.cc
    req.CC = validated_token.CC;
    req.sUserGUID = validated_token.sUserGUID;

    next();

  } catch (err) {
  }




}




