const express = require('express');
const { getPostsByTagName } = require('../db');

const tagsRouter = express.Router();

tagsRouter.use((req, res, next) => {
  console.log("A request is being made to /tags");

  next(); // THIS IS DIFFERENT
});

tagsRouter.get('/', (req, res) => {
  res.send({
    tags: []
  });
});

tagsRouter.get('/:tagName/posts', async (req, res, next) => {
  // read the tagname from the params
  const tagName = req.params.tagName;

  try {
    // use our method to get posts by tag name from the db
    const allPosts = await getPostsByTagName(tagName)
    
    const posts = allPosts.filter(post => {
      // keep a post if it is either active, or if it belongs to the current user
      if (post.active == true) {
        return true;
      }
      else if (req.user && post.author.id === req.user.id) {
        return true;
      }
      else {
        return false;
      }
    });
    // send out an object to the client { posts: // the posts }
    res.send({posts: posts })
  } catch ({ name, message }) {
    // forward the name and message to the error handler
    next({ name, message })
  }
});

module.exports = tagsRouter;

