import mongoose, { Document, Model, Types } from "mongoose"
import Tweet from "./tweetModel"
import Notification from "./notificationModel"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
	username: string
	password: string
	tweets: Array<any>

	following_count: number
	followers: Array<Types.ObjectId>

	new_notification_count: number
	notifications: Array<Types.ObjectId>

	follow(userID: string): Promise<void>
	tweet(content: string): Promise<void>
	matchPassword(comparedPassword: string): Promise<boolean>

	// Extra fields to be added to support Frontend
	tweet_count?: number
	follower_count?: number
	is_following?: boolean
}

const userSchema = new mongoose.Schema<IUser>({
	username: {
		type: String,
		// regex is from the top ans
		// https://stackoverflow.com/questions/12018245/regular-expression-to-validate-username/12019115
		validate: {
			validator: function (value: string) {
				return /^(?=.{4,15}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/.test(
					value
				)
			},

			message: "Invalid username",
		},
		required: [true, "username cannot be empty"],
		unique: true,
	},
	password: {
		type: String,
		required: [true, "password cannot be empty"],
		min: 6,
	},

	tweets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tweet" }],

	following_count: {
		type: Number,
		default: 0,
	},
	followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

	new_notification_count: {
		type: Number,
		default: 0,
	},
	notifications: [
		{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" },
	],
})

// CAUTION: never use arrow function because it prevents *this from modification
userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) {
		next()
	}

	this.password = await bcrypt.hash(this.password, 10)

	next()
})

userSchema.methods.follow = async function (user_id: string) {
	try {
		const followedUser = await User.findById(user_id)

		if (!followedUser) throw "Invalid user ID or user not found"

		const isFollowing = followedUser.followers.some((userID) =>
			userID.equals(this.id)
		)

		if (isFollowing) {
			--this.following_count
			followedUser.followers.filter((userID) => !userID.equals(this.id))
		} else {
			++this.following_count
			followedUser.followers.push(this.id)
		}

		await followedUser.save()
	} catch (err) {
		throw err
	}
}

userSchema.methods.tweet = async function (content: string) {
	const newTweet = await Tweet.create({
		user_id: this.id,
		username: this.username,
		content,
	})

	this.tweets.push(newTweet.id)

	const populatedThis = await this.populate({
		path: "followers",
		select: "username new_notification_count notifications",
	}).execPopulate()

	const followers = (populatedThis.followers as unknown) as Array<IUser>
	
	for (const user of followers) {
		const newNotification = await Notification.create({
			user_name: user.username,
			link: `/tweets/${newTweet.id}`,
			action: "made a new tweet",
		})

		user.new_notification_count++
		user.notifications.push(newNotification.id)

		await user.save()
	}
}

userSchema.methods.addExtraFields = function (userID: string) {
	this.tweet_count = this.tweets.length
	this.follower_count = this.followers.length
}

userSchema.methods.matchPassword = async function (comparedPassword) {
	return await bcrypt.compare(comparedPassword, this.password)
}

const User: Model<IUser> = mongoose.model("User", userSchema)

export default User
