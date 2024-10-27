const createError = require("http-errors");

const { Blog, User } = require("../models");
const { NOTIFICATION_KIND } = require("../constants");
const { createCustomerIONotificationEvent } = require("./users.controller");

const createBlog = async (data) => {
  const blog = await Blog.findOne({ title: data.title });
  if (blog) {
    throw createError(403, "Blog with such title already exists");
  }

  // const allUsers = await User.find({}).select("_id");
  // await Promise.all(
  //   allUsers.map((u) =>
  //     createCustomerIONotificationEvent(
  //       u._id,
  //       NOTIFICATION_KIND.NEW_BLOG_PUBLISHED,
  //       {
  //         blogTitle: data.title,
  //       },
  //       "New Blog Published",
  //       `New blog ${data.title} has been published`
  //     )
  //   )
  // );

  return Blog.create(data);
};

const getAllBlogs = (page = 1, limit = 10, search = "") => {
	const query = {
		$or: [
			{ title: { $regex: search, $options: "i" } },
			{ description: { $regex: search, $options: "i" } },
		],
	};

	return Promise.all([
		Blog.find(query)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit),
		Blog.count(query),
	]);
};

const deleteBlogs = async (blogIds) =>
  Promise.all(blogIds.map((blogId) => Blog.findByIdAndRemove(blogId.trim()))); 


const updateBlog = (blogId, data) =>
	Blog.findByIdAndUpdate(blogId, data, { new: true });

module.exports = {
  createBlog,
  deleteBlogs,
  getAllBlogs,
  updateBlog,
};
