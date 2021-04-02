import mongoose, { Document, Model, Types } from "mongoose"

export interface ITweet extends Document {
	user_id: Types.ObjectId
	username: string
	content: string

	user_mention?: {
		user_id: Types.ObjectId
		username: string
	}

	comments: Array<Types.ObjectId>
	is_comment: boolean
	no_more_comments: boolean

	loved_by_users: Array<Types.ObjectId>
}

const tweetSchema = new mongoose.Schema<ITweet>(
	{
		user_id: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
		},
		username: {
			type: String,
			required: true,
		},
		content: {
			type: String,
			maxLength: 280,
			required: true,
		},

		// Only for replies
		user_mention: {
			user_id: {
				type: mongoose.Schema.Types.ObjectId,
			},
			username: {
				type: String,
			},
		},

		comments: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],
			default: undefined,
		},
		is_comment: {
			type: Boolean,
			default: false,
		},
		no_more_comments: {
			type: Boolean,
			default: false,
		},

		loved_by_user: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
	},
	{ timestamps: true }
)

const Tweet: Model<ITweet> = mongoose.model("Tweet", tweetSchema)
export default Tweet
