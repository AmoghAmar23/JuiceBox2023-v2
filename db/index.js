// inside db/index.js
const { Client } = require('pg'); // imports the pg module

// supply the db name and location of the database
const client = new Client({
    host: '3.141.45.14',
    port: 5432,
    database: 'juicebox-dev',
    user: 'postgres',
    password: 'Albino778899',
  })
module.exports = {
  client,
} 


async function getAllUsers() {
    const { rows } = await client.query(
      `SELECT id, username, name, location, active
      FROM users;
    `);

    return rows;
  }
  
  

  async function createUser({ username, password, name, location }) {
    try {
      const { rows: [ user ] } = await client.query(`
        INSERT INTO users(username, password, name, location)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO NOTHING
        RETURNING *;
      `, [username, password, name, location]);
  
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function updateUser(id, fields = {}) {
    // build the set string
    const setString = Object.keys(fields).map(
      (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
  
    // return early if this is called without fields
    if (setString.length === 0) {
      return;
    }
  
    try {
      const { rows: [ user ] } = await client.query(`
        UPDATE users
        SET ${ setString }
        WHERE id=${id}
        RETURNING *;
      `, Object.values(fields));
  
      return user;
    } catch (error) {
      throw error;
    }
  }

  // async function createTags(tagList) {
  //   if (tagList.length === 0) { 
  //     return; 
  //   }
  
  //   // need something like: $1), ($2), ($3 
  //   const insertValues = tagList.map(
  //     (_, index) => `$${index + 1}`).join('), (');
  //   // then we can use: (${ insertValues }) in our string template
  
  //   // need something like $1, $2, $3
  //   const selectValues = tagList.map(
  //     (_, index) => `$${index + 1}`).join(', ');
  //   // then we can use (${ selectValues }) in our string template
  
  //   try {
  //     // insert the tags, doing nothing on conflict
  //     // returning nothing, we'll query after
  
  //     // select all tags where the name is in our taglist
  //     // return the rows from the query
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async function createTags(tagList) {
    if (tagList.length === 0) { 
      return; 
    }
  
    const insertValues = tagList.map((_, index) => `$${index + 1}`).join('), (');
    const selectValues = tagList.map((_, index) => `$${index + 1}`).join(', ');
  
    try {
      const insertStatement = `INSERT INTO tags (name) VALUES (${insertValues}) ON CONFLICT DO NOTHING;`;
      await client.query(insertStatement, tagList);
      console.log('Tags inserted successfully!');

      const selectStatement = `SELECT * FROM tags WHERE name IN (${selectValues});`;
       const result = await client.query(selectStatement, tagList);
        const rows = result.rows;
        return rows;
      
    } catch (error) {
      throw error;
    }
  }

  async function createPostTag(postId, tagId) {
    try {
      await client.query(`
        INSERT INTO post_tags("postId", "tagId")
        VALUES ($1, $2)
        ON CONFLICT ("postId", "tagId") DO NOTHING;
      `, [postId, tagId]);
    } catch (error) {
      throw error;
    }
  }

  async function addTagsToPost(postId, tagList) {
    try {
      const createPostTagPromises = tagList.map(
        tag => createPostTag(postId, tag.id)
      );
  
      await Promise.all(createPostTagPromises);
  
      return await getPostById(postId);
    } catch (error) {
      throw error;
    }
  }

  async function getPostById(postId) {
    try {
      const { rows: [ post ]  } = await client.query(`
        SELECT *
        FROM posts
        WHERE id=$1;
      `, [postId]);
  
      if (!post) {
        throw {
          name: "PostNotFoundError",
          message: "Could not find a post with that postId"
        };
      }

      const { rows: tags } = await client.query(`
        SELECT tags.name
        FROM tags
        JOIN post_tags ON tags.id=post_tags."tagId"
        WHERE post_tags."postId"=$1;
      `, [postId])
  
      const { rows: [author] } = await client.query(`
        SELECT id, username, name, location
        FROM users
        WHERE id=$1;
      `, [post.authorid])


      post.tags = tags;
      post.author = author;
  
      delete post.authorid;
      
      console.log(post);

      return post;
    } catch (error) {
      throw error;
    }
  }
  

  async function createPost ({ authorId, title, content, tags = [] }) {
    try {
      const { rows: [ posts ] } = await client.query(`
        INSERT INTO posts(authorId, title, content)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [authorId, title, content]);

      const tagList = await createTags(tags);
  
      return await addTagsToPost(posts.id, tagList);
    } catch (error) {
      throw error;
    }
  }

  // db/index.js

async function getUserByUsername(username) {
  try {
    const { rows: [user] } = await client.query(`
      SELECT *
      FROM users
      WHERE username=$1;
    `, [username]);

    return user;
  } catch (error) {
    throw error;
  }
}


  // async function updatePost(id, fields = {}) {
  //   // build the set string
  //   const setString = Object.keys(fields).map(
  //     (key, index) => `"${ key }"=$${ index + 1 }`
  //   ).join(', ');
  
  //   // return early if this is called without fields
  //   if (setString.length === 0) {
  //     return;
  //   }
  
  //   try {
  //     const { rows: [ posts ] } = await client.query(`
  //       UPDATE posts
  //       SET ${ setString }
  //       WHERE id=${id}
  //       RETURNING *;
  //     `, Object.values(fields));
  
  //     return posts;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async function updatePost(postId, fields = {}) {
    // read off the tags & remove that field 
    const { tags } = fields; // might be undefined
    delete fields.tags;
  
    // build the set string
    const setString = Object.keys(fields).map(
      (key, index) => `"${ key }"=$${ index + 1 }`
    ).join(', ');
      console.log(setString);
    try {
      // update any fields that need to be updated
      if (setString.length > 0) {
        console.log(Object.values(fields))
        await client.query(`
          UPDATE posts
          SET ${ setString }
          WHERE id=${ postId }
          RETURNING *;
        `, Object.values(fields));
        console.log("updatedPost");
      }
      
      // return early if there's no tags to update
      if (tags === undefined) {
        return await getPostById(postId);
      }
  
      // make any new tags that need to be made
      const tagList = await createTags(tags);
      const tagListIdString = tagList.map(
        tag => `${ tag.id }`
      ).join(', ');
  
      // delete any post_tags from the database which aren't in that tagList
      await client.query(`
        DELETE FROM post_tags
        WHERE "tagId"
        NOT IN (${ tagListIdString })
        AND "postId"=$1;
      `, [postId]);
  
      // and create post_tags as necessary
      await addTagsToPost(postId, tagList);
  
      return await getPostById(postId);
    } catch (error) {
      throw error;
    }
  }


  async function getAllPosts() {
    try {
      const { rows: postIds } = await client.query(`
        SELECT id
        FROM posts;
      `);
  
      const posts = await Promise.all(postIds.map(
        post => getPostById( post.id )
      ));
  
      return posts;
    } catch (error) {
      throw error;
    }
  }

  async function getUserById(userId) {
    // first get the user (NOTE: Remember the query returns 
      // (1) an object that contains 
      // (2) a `rows` array that (in this case) will contain 
      // (3) one object, which is our user.
    // if it doesn't exist (if there are no `rows` or `rows.length`), return null
  
    // if it does:
    // delete the 'password' key from the returned object
    // get their posts (use getPostsByUser)
    // then add the posts to the user object with key 'posts'
    // return the user object

    try {
        const { rows: [ user ] } = await client.query(`
        SELECT id, username, name, location, active
        FROM users WHERE id = $1;
        
        `, [userId]);
        if (user) {
            const { rows: [ posts ] } = await client.query(`
            SELECT authorId, title, content
            FROM posts WHERE authorId = $1;
            `, [userId]);
            user["posts"]=posts
            return user;
        } 
        return null;

    } catch (error) {
        throw error;
      }

  }

  async function getPostsByUser(userId) {
    try {
      const { rows: postIds } = await client.query(`
        SELECT id 
        FROM posts 
        WHERE authorId=$1;
      `, [userId]);
  
      const posts = await Promise.all(postIds.map(
        post => getPostById( post.id )
      ));
  
      return posts;
    } catch (error) {
      throw error;
    }
  }

  async function getPostsByTagName(tagName) {
    try {
      const { rows: postIds } = await client.query(`
        SELECT posts.id
        FROM posts
        JOIN post_tags ON posts.id=post_tags."postId"
        JOIN tags ON tags.id=post_tags."tagId"
        WHERE tags.name=$1;
      `, [tagName]);
  
      return await Promise.all(postIds.map(
        post => getPostById(post.id)
      ));
    } catch (error) {
      throw error;
    }
  } 


  // and export them
  module.exports = {
    client,
    getAllUsers,
    createUser,
    updateUser,
    createPost,
    updatePost,
    getAllPosts,
    getUserById,
    createTags,
    createPostTag,
    addTagsToPost,
    getPostById,
    getPostsByUser,
    getPostsByTagName,
    getUserByUsername
  }