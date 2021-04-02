import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { Types } from "mongoose"

/**
 * @desc Get all tweets
 * @route GET /api/tweets
 * @access Public
 */
const extractAuthToken = (
	req: Request & { user_id: Types.ObjectId; username: string },
	res: Response,
	next: NextFunction
) => {
	if (
		req.headers["authorization"] &&
		req.headers["authorization"].startsWith("Bearer")
	) {
		const bearerToken = req.headers["authorization"].split(" ")[1]
	}
}

const protect = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	if (req.user_id) {
		next()
	} else {
		res.status(401)
		throw new Error("User is not authorized")
	}
}

export { protect }
