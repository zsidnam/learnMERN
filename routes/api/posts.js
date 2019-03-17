const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

const Post = require('../../models/Post');
const validatePostInput = require('../../validation/post');

// @route GET api/posts/test
// @desc Tests posts route
// @access Public
router.get('/test', (req, res) => res.json({ msg: 'Posts Works' }));

// @route GET api/posts
// @desc Get all posts
// @access Public
router.get('/', (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(500).json(err));
});

// @route GET api/posts/:id
// @desc Get post by id
// @access Public
router.get('/:id', (req, res) => {
  Post.findById(req.params.id)
    .then(post => {
      if (!post) {
        return res.status(404).json({ result: 'Not found' });
      } else {
        res.json(post);
      }
    })
    .catch(err => res.status(500).json(err));
});

// @route POST api/posts
// @desc Create post
// @access Private
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    if (!isValid) return res.status(400).json(errors);

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost
      .save()
      .then(post => res.json(post))
      .catch(err => res.status(500).json(err));
  }
);

// @route POST api/posts/like/:id
// @desc Like post
// @access Private
router.post(
  '/like/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        if (!post) return res.status(404).json({ result: 'Post not found' });

        const likesFromUser = post.likes.filter(
          like => like.user.toString() === req.user.id
        );
        if (likesFromUser.length > 0) {
          return res
            .status(400)
            .json({ result: 'User already liked this post' });
        }

        // Add user id to likes array
        post.likes.unshift({ user: req.user.id });
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(500).json(err));
  }
);

// @route POST api/posts/unlike/:id
// @desc Unlike post
// @access Private
router.post(
  '/unlike/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        if (!post) return res.status(404).json({ result: 'Post not found' });

        const likesFromUser = post.likes.filter(
          like => like.user.toString() === req.user.id
        );
        if (likesFromUser.length === 0) {
          return res
            .status(400)
            .json({ result: 'User has not yet liked this post' });
        }

        // Remove user id from likes array
        const removeIndex = post.likes
          .map(x => x.user.toString())
          .indexOf(req.user.id);

        post.likes.splice(removeIndex, 1);
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(500).json(err));
  }
);

// @route POST api/posts/comment/:id
// @desc Add comment to post
// @access Private
router.post(
  '/comment/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    if (!isValid) return res.status(400).json(errors);

    Post.findById(req.params.id)
      .then(post => {
        if (!post) return res.status(404).json({ result: 'Post not found' });

        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };

        // Add to comments array
        post.comments.unshift(newComment);
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(500).json(err));
  }
);

// @route DELETE api/posts/comment/:id/:comment_id
// @desc Remove comment from post
// @access Private
router.delete(
  '/comment/:id/:comment_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        if (!post) return res.status(404).json({ result: 'Post not found' });

        // Check if comment exists
        if (
          !post.comments.find(x => x._id.toString() === req.params.comment_id)
        ) {
          return res.status(404).json({ result: 'Comment not found' });
        }

        post.comments = post.comments.filter(
          x => x._id.toString() !== req.params.comment_id
        );

        post.save().then(post => res.status(204).json({ success: true }));
      })
      .catch(err => res.status(500).json(err));
  }
);

// @route DELETE api/posts/:id
// @desc Delete post
// @access Private
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        // Check for post owner
        if (post.user.toString() !== req.user.id) {
          return res.status(401).json({ result: 'User not authorized' });
        }

        post.remove().then(() => res.status(204).json({ success: true }));
      })
      .catch(err => res.status(500).json(err));
  }
);

module.exports = router;
