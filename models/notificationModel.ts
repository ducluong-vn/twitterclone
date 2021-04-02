import mongoose, { Document, Model } from "mongoose"

interface INotification extends Document {
	user_name: string
	link: string
	action:
		| "made a new tweet"
		| "like your tweet"
		| "is following you"
		| "commented on your tweet"
		| "replied to your comment"
}

const notificationSchema = new mongoose.Schema<INotification>({
	user_name: {
		type: String,
		required: true,
	},
	action: {
		type: String,
		enum: [
			"made a new tweet",
			"like your tweet",
			"is following you",
			"commented on your tweet",
			"replied to your comment",
		],
		required: true,
	},
	link: {
		type: String,
		required: true,
	},
})

const Notification: Model<INotification> = mongoose.model(
	"Notification",
	notificationSchema
)
export default Notification
