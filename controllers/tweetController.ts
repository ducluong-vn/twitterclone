import { Request, Response, NextFunction } from "express"
import { Types } from "mongoose"
import Tweet, { ITweet } from "../models/tweetModel"
import User, { IUser } from "../models/userModel"

interface IBaseTweet {
	user_id: Types.ObjectId
	link_to_author: string
	username: string
	content: string

	// Only for replies
	user_mention?: {
		user_id: Types.ObjectId
		username: string
	}

	love_count: number
	reply_count: number

	loved?: boolean
	can_be_deleted?: boolean
}

interface PublicRequest extends Request {
	user_id?: Types.ObjectId
}

interface PrivateRequest extends Request {
	user_id: Types.ObjectId
	username: string
}

function frontendTweet(tweet: ITweet, user_id?: Types.ObjectId): IBaseTweet {
	const reducedTweet: IBaseTweet = {
		user_id: tweet.user_id,
		link_to_author: `/users/${tweet.user_id}`,
		username: tweet.username,
		content: tweet.content,
		love_count: tweet.loved_by_users.length,
		reply_count: tweet.comments.length,
	}

	if (user_id) {
		reducedTweet.loved = false
		reducedTweet.can_be_deleted = false

		for (const user_id of tweet.loved_by_users)
			if (user_id.equals(user_id)) reducedTweet.loved = true

		if (tweet.user_id.equals(user_id)) reducedTweet.can_be_deleted = true
	}

	return reducedTweet
}

/**
 * @desc Get all tweets
 * @route GET /api/tweets
 * @access Public
 */
const getAllTweets = async (
	req: PublicRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const pageLimit = 10

		const pageNumber = Number(req.query.page_number) || 1
		const surplus = Math.max(Number(req.query.surplus), 0) || 0
		const totalPage = Math.ceil(
			(await Tweet.estimatedDocumentCount()) / pageLimit
		)

		const tweets = await Tweet.find()
			.sort("-createdAt")
			.limit(pageLimit)
			.skip((pageNumber - 1) * pageLimit + surplus)
			.select("-password")

		const returnTweets: Array<IBaseTweet> = []

		tweets.forEach((tweet) => {
			returnTweets.push(frontendTweet(tweet, req.user_id))
		})

		return res.json({
			page_number: pageNumber,
			total_page: totalPage,
			tweets: returnTweets,
		})
	} catch (err) {
		next(err)
	}
}

/**
 * @desc Get details of a tweet (same as getAllTweets but with 'comments')
 * @route GET /api/tweets/:id
 * @access Public
 */
const getTweetDetails = async (
	req: PublicRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		interface ITweetDetails extends IBaseTweet {
			comments: Array<IBaseTweet>
		}

		const tweet = await Tweet.findById(req.params.id)

		if (!tweet) {
			res.status(404)
			throw new Error("Tweet not found")
		} else {
			// populate 2-level comment
			await tweet
				.populate({
					path: "comments",
					select: "-password",
					populate: {
						path: "comments",
						select: "-password",
					},
				})
				.execPopulate()

			const populatedComments = (tweet.comments as unknown) as Array<
				ITweet
			>

			const comments: Array<ITweetDetails> = []
			for (const comment of populatedComments) {
				const subComments: Array<IBaseTweet> = []

				if (comment.comments && comment.comments.length > 0) {
					const populatedSubComments = (comment.comments as unknown) as Array<
						ITweet
					>

					for (const subComment of populatedSubComments) {
						const pushedSubComment = frontendTweet(
							subComment,
							req.user_id
						)

						if (subComment.user_mention)
							pushedSubComment.user_mention =
								subComment.user_mention

						subComments.push(pushedSubComment)
					}
				}

				comments.push({
					...frontendTweet(comment, req.user_id),
					comments: subComments,
				})
			}

			const returnTweet: ITweetDetails = {
				...frontendTweet(tweet, req.user_id),
				comments: comments,
			}

			res.json(returnTweet)
		}
	} catch (err) {
		next(err)
	}
}

/**
 * @desc Create a tweet
 * @route POST /api/tweets
 * @access Private
 */
const createATweet = async (
	req: PrivateRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const user = (await User.findById(req.user_id)) as IUser

		await user.tweet(req.body.content)

		res.status(201)
		res.json({
			message: "Successfully created a tweet",
		})
	} catch (err) {
		next(err)
	}
}

/**
 * @desc Create a comment
 * @route POST /api/tweets/:id/comments
 * @access Private
 */
const createAComment = async (
	req: PrivateRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		if (!req.body.content) {
			res.status(400)
			throw new Error("Missing content field")
		}

		const tweet = await Tweet.findById(req.params.id)

		if (!tweet) {
			res.status(400)
			throw new Error("Invalid id or tweet not found")
		}

		if (tweet.no_more_comments) {
			res.status(400)
			throw new Error("Only allow 2-level comment")
		}

		const newComment = await Tweet.create({
			user_id: req.user_id,
			username: req.username,
			content: req.body.content,
			is_comment: true,
			no_more_comments: tweet.is_comment ? true : false,

			user_mention: req.body.user_mention
				? {
						user_id: req.body.user_mention.user_id,
						user_name: req.body.user_mention.username,
				  }
				: undefined,
		})

		tweet.comments.push(newComment.id)

		await tweet.save()

		res.status(201)
		res.json({
			message: "Successfully created a comment",
		})
	} catch (err) {
		next(err)
	}
}

/**
 * @desc Love a tweet
 * @route PUT /api/tweets/:id/love
 * @access Private
 */
const loveATweet = async (
	req: PrivateRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const tweet = await Tweet.findById(req.params.id)

		if (!tweet) {
			res.status(400)
			throw new Error("Invalid id or tweet not found")
		}

		const loved: boolean = tweet.loved_by_users.some((user_id) =>
			user_id.equals(req.user_id)
		)

		if (loved)
			tweet.loved_by_users.filter(
				(user_id) => !user_id.equals(req.user_id)
			)
		else tweet.loved_by_users.push(req.user_id)

		await tweet.save()

		res.status(204)
	} catch (err) {
		next(err)
	}
}

/**
 * @desc Delete a tweet and all of its comments
 * @route DELETE /api/tweets/:id/
 * @access Private
 */
const deleteATweet = async (
	req: PrivateRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const tweet = await Tweet.findById(req.params.id)

		if (!tweet) {
			res.status(400)
			throw new Error("Invalid id or tweet not found")
		}

		if (!tweet.user_id.equals(req.user_id)) {
			res.status(401)
			throw new Error("Only the author can delete this tweet")
		}

		await tweet
			.populate({
				path: "comments",
				select: "-password",
			})
			.execPopulate()

		const populatedComments = (tweet.comments as unknown) as Array<ITweet>

		for (const comment of populatedComments) {
			for (const subCommentId of comment.comments)
				await Tweet.deleteOne({ id: subCommentId })

			await Tweet.deleteOne({ id: comment.id })
		}

		await Tweet.deleteOne({ id: tweet.id })

		res.status(200)
	} catch (err) {
		next(err)
	}
}

export {
	getAllTweets,
	getTweetDetails,
	createATweet,
	createAComment,
	loveATweet,
	deleteATweet,
}
