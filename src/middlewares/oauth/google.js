
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { Promoter } from "../../models/promoters.js"


const googleStrategy = new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_ENDPOINT}/promoters/oauth-callback`,
    },
    async function (_, __, profile, cb) {
        console.log(profile)
        

        let user = await Promoter.findOne({ googleId: profile.id })

        if (!user) {
            user = await Promoter.create({
                googleId: profile.id,
                name: profile.name.givenName,
                surname: profile.name.familyName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value
            })
        }
        console.log(profile.picture) 
        cb(null, user)
        
    }
)

export default googleStrategy