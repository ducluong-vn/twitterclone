import mongoose from "mongoose"
import {
	getAllTweets,
	getTweetDetails,
	createATweet,
	createAComment,
	loveATweet,
	deleteATweet,
} from "../tweetController"

beforeAll((done) => {
	mongoose.connect(
		"mongodb://localhost/notReddit",
		{ useNewUrlParser: true, useUnifiedTopology: true },
		() => {
			done()
		}
	)
})

afterAll((done) => {
	mongoose.connection.db.dropDatabase((err) => {
		if (err) done(err)

		mongoose.connection.close(() => done())
	})
})


