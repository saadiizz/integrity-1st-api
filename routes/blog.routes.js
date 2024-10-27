const express = require("express");
const Joi = require("joi");

const { blogController } = require("../controllers");
const { auth, validate } = require("../middlewares");

const router = express.Router();

router.post(
  "/",
  auth.verifyToken,
  validate({
    body: Joi.object({
      title: Joi.string().required(),
      imageURL: Joi.string(),
      ctaKind: Joi.string(),
      ctaValue: Joi.string(),
      description: Joi.string(),
      discountPercentage: Joi.number(),
    }),
  }),
  async (req, res, next) => {
    try {
      const blog = await blogController.createBlog(req.body);
      res.status(200).json(blog);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
	"/",
	auth.verifyToken,
	validate({
		query: Joi.object({
			page: Joi.number(),
			limit: Joi.number(),
			search: Joi.string(),
		}),
	}),
	async (req, res, next) => {
		try {
			const { page, limit, search } = req.query;
			const [blogs, total] = await blogController.getAllBlogs(
				parseInt(page),
				parseInt(limit),
				search
			);
			res.status(200).json({ blogs, total });
		} catch (error) {
			next(error);
		}
	}
);

router.patch("/:blogId", auth.verifyToken, async (req, res, next) => {
	try {
		const { blogId } = req.params;
		const updatedBlog = await blogController.updateBlog(blogId, req.body);
		res.status(200).json({ message: "Blog updated successfully", updatedBlog });
	} catch (error) {
		next(error);
	}
});

router.delete("/:blogIds", auth.verifyToken, async (req, res, next) => {
  try {
    const { blogIds } = req.params;

    await blogController.deleteBlogs(blogIds.split(','));
    res.status(200).json({ message: "Blog removed successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
