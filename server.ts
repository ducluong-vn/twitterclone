import { config } from "dotenv"
config()

import express, { Request, Response, NextFunction } from "express"
import cors from "cors"
import mongoose, { Types } from "mongoose"
import tweetRoutes from "./routes/tweetRoutes"
import path from "path"

// Add custom properties to Request
declare global {
	namespace Express {
		interface Request {
			user_id: Types.ObjectId
			username: string
		}
	}
}

const app = express()

app.use(cors())

mongoose.connect(
	"mongodb://localhost/notReddit",
	{ useNewUrlParser: true, useUnifiedTopology: true },
	() => {
		console.log("Connected to server")
	}
)

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/build")))

	app.get("*", (req: Request, res: Response) => {
		res.sendFile(path.resolve(__dirname, "..", "frontend", "build", "index.html"))
	})
}

app.get("/", (req: Request, res: Response) => {
	res.json({
		message: "Success",
	})
})

app.use("/api/tweets", tweetRoutes)

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	// if statusCode is not defined before throwing an exception then sets it to 500
	const statusCode = res.statusCode === 200 ? 500 : res.statusCode

	res.status(statusCode)
	res.json({
		message: err.message,
		stack: err.stack,
	})
})

app.listen(process.env.PORT, () => {
	console.log(`Server started on port ${process.env.PORT}`)
})
