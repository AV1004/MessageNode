const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
// In REST API jsonwebtoken(JWT) is use for authentication!
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors);
    const error = new Error("Validation Failed!");
    // Unprocessable Entity!
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  try {
    const hashedPW = await bcrypt.hash(password, 12);

    const user = new User();
    user.email = email;
    user.name = name;
    user.password = hashedPW;
    const userDoc = await user.save();

    // Created!
    res.status(201).json({ message: "User Created!", userId: userDoc._id });
  } catch (err) {
    if (!err.statusCode) {
      // Not found
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error("User does not exist!");
      // Not authneticated
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;
    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error("Incorrect password!");
      // Not authenticated!
      error.statusCode = 401;
      throw error;
    }

    //   Here we set JWT token in our server that we can use for authentication!
    const token = jwt.sign(
      {
        email: loadedUser.email,
        userId: loadedUser._id.toString(),
        // You can't set password because it will be set in localstorage of browser!
      },
      // Here we are setting a secret key that can be used by server to authenticate the user!
      "somesupersecretsecret",
      // here we must set the expiresIn time as any one can copy credential and try to login on same browser so after 1h it will be automatically loggedout!
      { expiresIn: "1h" }
    );

    //   Success!
    res.status(200).json({ token: token, userId: loadedUser._id.toString() });
  } catch (err) {
    if (!err.statusCode) {
      // Not found
      err.statusCode = 500;
    }
    next(err);
  }
};

// to Fetch status
exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User does not exist!");
      // Not found!
      error.statusCode = 404;
      throw error;
    }
    // Success
    res.status(200).json({ message: "Status Fetched!", status: user.status });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};

// To update status
exports.postStatus = async (req, res, next) => {
  const newStatus = req.body.status;

  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User does not exist!");
      // Not found!
      error.statusCode = 404;
      throw error;
    }

    user.status = newStatus;
    const result = await user.save();

    // Success
    res
      .status(200)
      .json({ message: "Status updated successfully!", result: result });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};
