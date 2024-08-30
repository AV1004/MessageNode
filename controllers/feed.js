const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const Post = require("../models/post");
const User = require("../models/user");
// importing socket for fetching socket that we initialized in app.js
const io = require("../socket");

// So after Node js getting updated you can use await at top level like this without async and this await is called as top level await!
// Though in functions you have to use async as mention below
// const something = await Post;

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;

  // Converting then/catch to async/await
  try {
    const totalItems = await Post.find().countDocuments();
    // One Important thing that all mongoose opeartions does not return exact promise to conver it to exact promise you can do this!
    // const totalItems = await Post.find().countDocuments().exec();
    // Though it is working here as it is not matter here
    const posts = await Post.find()
      .populate("creator")
      // Here we are sorting post in latest post first manner!
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts fetched sucessfully",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      // Not found
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Status code 422 => Unprocessable Entity
    const error = new Error("Validation failed , entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  if (!req.file) {
    const error = new Error("No image provided.");
    // No data provided!
    error.statusCode = 422;
    throw error;
  }

  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\", "/");

  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });

  try {
    const result = await post.save();

    const user = await User.findById(req.userId);
    creator = user;
    user.posts.push(post);

    const result1 = await user.save();

    // Here before sending res we will use socket.io to push data to all users
    // here on fetched socket.io we can apply many methods but here we use emit means send data to all users , there is also broadcast method which is use to send data to all user expect the user that is sending this req
    io.getIo().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { id: req.userId, name: user.name } },
    });

    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("Could not find post!");
      // Not found!
      error.statusCode = 404;
      // So you might be confuse that we are in async code(i.e in then block) so why don't we call next because here we throw error and that error will execute catch block!
      throw error;
    }

    res.status(200).json({ message: "Post fetched.", post: post });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Status code 422 => Unprocessable Entity
    const error = new Error("Validation failed , entered data is incorrect.");
    error.statusCode = 422;
    throw error;
  }

  try {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
    }
    if (!imageUrl) {
      const error = new Error("No file picked!");
      // No data provided!
      error.statusCode = 422;
      throw error;
    }

    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("Could not find post!");
      error.statusCode = 404;
      throw error;
    }

    //Authenticating that if user has created this post or not!
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not Authorized!");
      // Not authorized!
      error.statusCode = 403;
      throw error;
    }

    if (imageUrl !== post.imageUrl) {
      clearIamge(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();

    // Here also using socket for update of post!
    io.getIo().emit("posts", { action: "update", post: result });

    // Success
    res.status(200).json({ message: "Post Edited Successfully", post: result });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Could not find post!");
      // Not Found
      error.statusCode = 404;
      throw error;
    }

    //Authenticating that if user has created this post or not!
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not Authorized!");
      // Not authorized!
      error.statusCode = 403;
      throw error;
    }
    clearIamge(post.imageUrl);
    const result = await Post.findByIdAndDelete(postId);

    console.log(result);
    const user = await User.findById(req.userId);

    // to delete post from posts in user in db!
    user.posts.pull(postId);
    const result2 = await user.save();

    // Here also implementing socket.io
    io.getIo().emit("posts", { action: "delete", postId: postId });

    // Success
    res.status(200).json({ message: "Post Deleted!" });
  } catch (err) {
    if (!err.statusCode) {
      // Server side error
      err.statusCode = 500;
    }
    next(err);
  }
};

// Method to remove the image from localdisk storage!
const clearIamge = (filePath) => {
  const imagePath = path.join(__dirname, "..", filePath);
  fs.unlink(imagePath, (err) => console.log(err));
};
