import { Router } from 'express'
import { protect } from '../middlewares/authMiddleware'
import { createATweet, getAllTweets } from '../controllers/tweetController'

const router = Router()

router.route("/")
        .get(getAllTweets)
        .post(protect,createATweet)
        
export default router