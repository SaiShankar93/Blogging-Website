const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const mongoose = require('mongoose');
const User = require('./public/js/user.js');
const postsCollection = require("./public/js/posts.js");
const cookieParser = require('cookie-parser');
const session = require('express-session');
mongoose.connect('mongodb+srv://saishankar15052005:sai123@cluster0.yxadvfg.mongodb.net/?retryWrites=true&w=majority')

// mongoose.connect('mongodb+srv://saishankar15052005:sai123@cluster0.yxadvfg.mongodb.net/?retryWrites=true&w=majority')
  .then(() => {
    console.log("connected successfully to mongodb");
  }).catch((e) => {
    console.log("error while connecting to mongodb",e.message);
  })
const app = express();
app.use(cookieParser());
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async function (req, res) {
  if (req.cookies.loggedIn) {
    let allPosts = await postsCollection.find().sort({ createdAt: -1 }).exec();
    let userDetails = await User.findOne({ username: req.cookies.Username });

    res.render("home", {
      posts: allPosts,
      letter:userDetails.username.charAt(0).toUpperCase(),
      username: userDetails.username,
      useremail: userDetails.email
    });
  }
  else {
    res.render("landing");
  }
});
app.get("/signup", async (req, res) => {
  res.render("signup.ejs");
})
app.post("/signup", async (req, res) => {
  try {
    let user = await User.create({
      username: req.body.userName,
      password: await bcrypt.hash(req.body.password, 10),
      email: req.body.email,
      mobile: req.body.mobile
    })
    user.save();
    res.redirect('/signin');
  } catch (error) {
    console.log('Error', error.message);
    res.render('/signup');
  }
})

app.get("/signin", function (req, res) {
  res.render("signin.ejs");
});

app.post("/signin", async (req, res) => {
  try {
    const email = req.body.email;
    const plainPass = req.body.password;
    const user = await User.findOne({ email });

    const hashedPass = user.password;
    // Comparing the entered password with the stored password hash
    bcrypt.compare(plainPass, hashedPass, (err, result) => {
      if (err) {
        console.log("Error while comparing passwords")
        return res.status(500);
      }
      if (result) {
        // Passwords match, user is authenticated
        let username = user.username;
        res.cookie("Username", username, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
        loggedIn = true;
        res.cookie("loggedIn", loggedIn, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });
        res.redirect('/');
      } else {
        // Passwords don't match, login failed
        res.send("Password is incorrect");
      }
    });
  } catch (error) {
    res.status(500).send("<h1>Error finding user: Please First Create Your Account then siginin</h1>" );
  }
});

app.get("/compose", async function (req, res) {
  let Uname = await User.findOne({ username: req.cookies.Username });

  if (req.cookies.loggedIn == "true") {
    res.render("compose", {
      letter: Uname.username.charAt(0).toUpperCase(),
      username: Uname.username,
      useremail: Uname.email
    });
  }
  else {
    res.redirect('/signin');
  }
});
app.post("/compose", async function (req, res) {
  console.log(req.body.postBody)
  try {
    const newBlog = new postsCollection({
      postTitle: req.body.postTitle.trim(),
      postBody: req.body.postBody,
      author: req.cookies.Username
    });

    await newBlog.save();
    console.log("Successfully added the blog to the database.");

    res.redirect("/");
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (e.g., postTitle should be unique)
      console.error("Duplicate key error:", error.message);
      res.status(400).send("<h1>The Blog Title Should be unique from other titles . Please choose another title for the blog.</h1>");
    } else {
      // Handle other errors
      console.error(error.message);
      res.status(500).send("Internal Server Error. Please try again later.");
    }
  }
});
app.get("/myBlogs", async function (req, res) {
  let myblogs = await postsCollection.find({ author: req.cookies.Username }).sort({ _id: -1 });
  let userDetails = await User.findOne({ username: req.cookies.Username });
  res.render("myBlogs", {
    posts: myblogs,
    letter: userDetails.username.charAt(0).toUpperCase(),
    username: userDetails.username,
    useremail: userDetails.email
  })
})
app.get('/logout', (req, res) => {
  res.clearCookie("Username");
  // loggedIn = false;
  res.clearCookie("loggedIn");
  // res.cookie("loggedIn", loggedIn, { expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })
  res.redirect("/");
});
app.get("/posts/:postName", async (req, res) => {
  const reqTitle = req.params.postName;
    let postDetails = await postsCollection.findOne({postTitle:reqTitle}).exec();
  let userDetails = await User.findOne({ username: postDetails.author }).exec();
  try {
    // const postDetails = await postsCollection.findOne({ postTitle: reqTitle }).exec();
    if (postDetails != "") {
      res.render("post", {
        postTitle: postDetails.postTitle,
        postBody: postDetails.postBody,
        letter: userDetails.username.charAt(0).toUpperCase(),
        username: userDetails.username,
        useremail: userDetails.email,
        time: postDetails.createdAt,
        author: postDetails.author
      });
    } else {
      res.status(404).send("Post not found");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
})
app.get('/delete/:title', async (req, res) => {
  const reqTitle = req.params.title;
  // console.log(reqTitle)
  try {
    await postsCollection.deleteOne({postTitle:reqTitle});
    res.redirect('/myBlogs'); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log("Server started on port 3000");
});
