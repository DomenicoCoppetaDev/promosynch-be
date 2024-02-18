import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import promotersRouter from './routes/promotersRouter.js'
import happeningsRouter from './routes/happeningsRouter.js'
import genericError from './middlewares/error.js'
import list from "express-list-endpoints"
import passport from "passport"
import googleStrategy from "./middlewares/oauth/google.js"


const app = express()
const port = process.env.PORT || 3031
app.use(express.json());

const whitelist = [
    "https://promosynch.netlify.app",
    "http://localhost:3000",
]

const corsOptions = {
    origin: function (origin, next) {
        if (whitelist.includes(origin) || !origin) {
            next(null, true)
        } else {
            next(new Error("Not allowed by CORS"))
        }
    },
}

app.use(cors(corsOptions))
passport.use(googleStrategy)


app.use('/promoters', promotersRouter)
app.use('/events', happeningsRouter)
app.use(genericError)

app.get('/ok', (req, res) => {
    res.status(200).send()}
    ); 

mongoose
    .connect
        (process.env.MONGO_URL)
    .then(console.log('Connected to DB'))
    .then(() => {
        app.listen(port, () => {
            console.log('Server listening on port' + port)
            console.table(list(app))
        })
    })
    .catch(() => {
        console.log('DB connection error')
    });


